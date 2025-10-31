const Application = require("../models/application");
const Campaign = require("../models/campaign");
const User = require("../models/user");

// admin actions
async function approveApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "approved";
    app.reviewer = reviewerId;
    if (comment) app.adminComment = comment;
    // snapshot campaign delivery settings so the application carries the
    // fulfillment method and any per-campaign order fields at the time of
    // approval. This lets the frontend show the correct form (address vs
    // order fields) without relying on a live campaign lookup.
    try {
      const campaign = await Campaign.findById(app.campaign);
      if (campaign) {
        if (campaign.fulfillmentMethod)
          app.fulfillmentMethod = campaign.fulfillmentMethod;
        if (campaign.orderFormFields)
          app.orderFormFields = campaign.orderFormFields;
      }
    } catch (e) {
      // don't fail approval if snapshotting fails
      // eslint-disable-next-line no-console
      console.warn(
        "approveApplication: failed to snapshot campaign",
        e && e.message
      );
    }
    if (!app.payout) app.payout = {};
    app.payout.amount = app.payout.amount || 0;
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { reason, comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "rejected";
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    if (comment) app.adminComment = comment;
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function apply(req, res) {
  const userId = req.body.influencer || (req.user && req.user.id);
  const { campaignId, answers, sampleMedia, followersCount, comment } =
    req.body || {};
  if (!campaignId || !userId)
    return res.status(400).json({ error: "missing_fields" });
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign_not_found" });
    const influencer = await User.findById(userId);
    if (!influencer) return res.status(404).json({ error: "user_not_found" });

    const existing = await Application.findOne({
      campaign: campaignId,
      influencer: userId,
    });
    if (existing && existing.status !== "rejected")
      return res.status(409).json({ error: "already_applied" });

    const app = new Application({
      campaign: campaignId,
      influencer: userId,
      answers,
      sampleMedia,
      applicantComment: comment,
      followersAtApply:
        typeof followersCount !== "undefined" && followersCount !== null
          ? Number(followersCount)
          : undefined,
    });
    await app.save();
    res.status(201).json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listByInfluencer(req, res) {
  const userId = req.params.userId || (req.user && req.user.id);
  if (!userId) return res.status(400).json({ error: "missing_user" });
  try {
    const items = await Application.find({ influencer: userId }).populate(
      "campaign"
    );
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listAllApplications(req, res) {
  try {
    const items = await Application.find({})
      .populate("campaign")
      .populate("influencer", "name email");
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function exportApplications(req, res) {
  try {
    const { campaignId } = req.query || {};
    const q = {};
    if (campaignId) q.campaign = campaignId;
    const items = await Application.find(q)
      .populate("campaign")
      .populate("influencer", "name email instagram followersCount");

    let fields = null;
    if (req.query && req.query.fields) {
      fields = String(req.query.fields)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!fields || fields.length === 0) {
      fields = [
        "applicationId",
        "influencerName",
        "influencerEmail",
        "instagram",
        "followersAtApply",
        "status",
      ];
    }

    const headers = fields;
    const getNested = (obj, path) => {
      if (!obj || !path) return "";
      const parts = path.split(".");
      let cur = obj;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
        else return "";
      }
      return cur === null || typeof cur === "undefined" ? "" : cur;
    };

    const rows = items.map((a) =>
      fields.map((f) => {
        if (f === "applicationId") return a._id;
        if (f === "campaignId") return a.campaign?._id || "";
        if (f === "campaignTitle") return a.campaign?.title || "";
        if (f === "brandName") return a.campaign?.brandName || "";
        if (f === "influencerId")
          return a.influencer?._id || a.influencer || "";
        if (f === "influencerName") return a.influencer?.name || "";
        if (f === "influencerEmail") return a.influencer?.email || "";
        if (f === "instagram") return a.influencer?.instagram || "";
        if (f === "followersAtApply")
          return typeof a.followersAtApply !== "undefined"
            ? a.followersAtApply
            : "";
        if (f === "status") return a.status || "";
        if (f === "adminComment") return a.adminComment || "";
        if (f === "rejectionReason") return a.rejectionReason || "";
        return getNested(a, f);
      })
    );

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="applications-${campaignId || "all"}.csv"`
    );

    const esc = (v) => {
      if (v === null || typeof v === "undefined") return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const bom = "\uFEFF";
    const csvLines = [headers.map(esc).join(",")].concat(
      rows.map((r) => r.map(esc).join(","))
    );
    const csv = bom + csvLines.join("\r\n");

    res.send(csv);
  } catch (err) {
    console.error("exportApplications error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function bulkReviewApplications(req, res) {
  try {
    let rows = [];
    if (req.is("application/json") && Array.isArray(req.body)) {
      rows = req.body;
    } else if (req.file && req.file.buffer) {
      const text = req.file.buffer.toString("utf8");
      try {
        const parseFn = require("csv-parse/sync").parse;
        rows = parseFn(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const header = lines[0].split(",").map((h) => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          const obj = {};
          for (let j = 0; j < header.length; j++)
            obj[header[j]] = (cols[j] || "").trim();
          rows.push(obj);
        }
      }
    } else {
      return res.status(400).json({ error: "missing_payload" });
    }

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: "no_rows" });

    const results = { updated: 0, notFound: [], errors: [] };
    const reviewerId = req.user && req.user.id;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const rawStatus = String(r.status || r.Status || "")
        .trim()
        .toLowerCase();
      let status = null;
      if (
        ["approved", "approve", "accepted", "accept", "yes", "1"].includes(
          rawStatus
        )
      )
        status = "approved";
      else if (
        ["rejected", "reject", "declined", "decline", "no", "0"].includes(
          rawStatus
        )
      )
        status = "rejected";
      else if (rawStatus) status = rawStatus;

      const appId =
        r.applicationId || r.application_id || r.application || r.appId || null;
      const influencerId =
        r.influencerId || r.influencer_id || r.influencer || null;
      const influencerEmail =
        r.influencerEmail || r.influencer_email || r.email || null;
      const campaignId = r.campaignId || r.campaign_id || r.campaign || null;
      const comment = r.adminComment || r.comment || null;
      const reason = r.rejectionReason || r.reason || null;

      try {
        if (!appId && !(campaignId && (influencerId || influencerEmail))) {
          results.errors.push({
            row: i + 1,
            reason: "missing_identifier",
          });
          continue;
        }

        let app = null;
        if (appId) app = await Application.findById(appId);
        else if (influencerId && campaignId)
          app = await Application.findOne({
            influencer: influencerId,
            campaign: campaignId,
          });
        else if (influencerEmail && campaignId) {
          const user = await User.findOne({
            email: influencerEmail.toLowerCase(),
          });
          if (user)
            app = await Application.findOne({
              influencer: user._id,
              campaign: campaignId,
            });
        }

        if (!app) {
          results.notFound.push({
            row: i + 1,
            reason: "application_not_found",
          });
          continue;
        }

        if (status === "approved") {
          app.status = "approved";
          app.reviewer = reviewerId;
          if (comment) app.adminComment = comment;
          // snapshot campaign settings when applying approval in bulk
          try {
            const campaign = await Campaign.findById(app.campaign);
            if (campaign) {
              if (campaign.fulfillmentMethod)
                app.fulfillmentMethod = campaign.fulfillmentMethod;
              if (campaign.orderFormFields)
                app.orderFormFields = campaign.orderFormFields;
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(
              "bulkReviewApplications: failed to snapshot campaign",
              e && e.message
            );
          }
        } else if (status === "rejected") {
          app.status = "rejected";
          app.reviewer = reviewerId;
          if (comment) app.adminComment = comment;
          if (reason) app.rejectionReason = reason;
        } else {
          results.errors.push({
            row: i + 1,
            reason: "unknown_status",
            value: r.status,
          });
          continue;
        }

        await app.save();
        results.updated += 1;
      } catch (err) {
        console.error("bulkReview row error", err);
        results.errors.push({ row: i + 1, reason: err.message || "error" });
      }
    }

    res.json(results);
  } catch (err) {
    console.error("bulkReviewApplications failed", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function submitOrder(req, res) {
  const appId = req.params.id;
  const userId = req.user && req.user.id;
  const {
    orderId,
    amount,
    comment,
    screenshotUrl,
    shippingAddress,
    orderData,
  } = req.body || {};
  try {
    console.log(
      `submitOrder: appId=${appId}, userId=${userId}, orderId=${orderId}, amount=${amount}`
    );
    const app = await Application.findById(appId).populate("campaign");
    if (!app) return res.status(404).json({ error: "not_found" });
    if (String(app.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });

    const campaign = app.campaign || (await Campaign.findById(app.campaign));
    // prefer a fulfillmentMethod snapshot stored on the application (set at
    // approval) so that the behavior is stable even if campaign settings
    // change later.
    const method =
      app.fulfillmentMethod ||
      (campaign && campaign.fulfillmentMethod) ||
      "influencer";

    if (method === "brand") {
      if (
        !shippingAddress ||
        !shippingAddress.line1 ||
        !shippingAddress.postalCode
      )
        return res.status(400).json({ error: "missing_shipping_address" });
      app.shippingAddress = shippingAddress;
      if (comment) app.applicantComment = comment;
      app.status = "order_submitted";
    } else {
      if (!orderId || typeof amount === "undefined")
        return res.status(400).json({ error: "missing_fields" });
      app.orderId = orderId;
      app.campaignScreenshot = screenshotUrl || app.campaignScreenshot;
      if (!app.payout) app.payout = {};
      app.payout.amount = Number(amount);
      app.payout.paid = false;
      if (comment) app.applicantComment = comment;
      if (orderData && typeof orderData === "object") app.orderData = orderData;
      app.status = "order_submitted";
    }
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listOrders(req, res) {
  try {
    const q = { status: "order_submitted" };
    if (req.query && req.query.campaignId) q.campaign = req.query.campaignId;
    const items = await Application.find(q)
      .populate("campaign")
      .populate("influencer", "name email phone followersCount");
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function approveOrder(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "completed";
    app.reviewer = reviewerId;
    if (!app.payout) app.payout = {};
    app.payout.paid = true;
    app.payout.paidAt = new Date();
    if (comment) app.adminComment = comment;
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectOrder(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { reason, comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "approved"; // revert to approved for resubmission
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    if (comment) app.adminComment = comment;
    await app.save();
    res.json(app);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

// Optional placeholder if your router expects this endpoint
async function listPendingImports(req, res) {
  res.json([]);
}

module.exports = {
  apply,
  listByInfluencer,
  listAllApplications,
  approveApplication,
  rejectApplication,
  submitOrder,
  listOrders,
  approveOrder,
  rejectOrder,
  exportApplications,
  bulkReviewApplications,
  listPendingImports,
};
