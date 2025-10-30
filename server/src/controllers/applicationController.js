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
    // record payout as approved (not paid yet)
    if (!app.payout) app.payout = {};
    app.payout.amount = app.payout.amount || 0;
    await app.save();
    res.json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { reason } = req.body || {};
  const { comment } = req.body || {};
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
    // eslint-disable-next-line no-console
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
    // prevent duplicate applications from same influencer to same campaign
    // allow re-apply only if previous application was rejected
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
      // accept 0 as a valid value; only treat null/undefined as missing
      followersAtApply:
        typeof followersCount !== "undefined" && followersCount !== null
          ? Number(followersCount)
          : undefined,
    });
    await app.save();
    res.status(201).json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

// Export applications as CSV for a given campaignId (or all if not provided)
async function exportApplications(req, res) {
  try {
    const { campaignId } = req.query || {};
    const q = {};
    if (campaignId) q.campaign = campaignId;
    const items = await Application.find(q)
      .populate("campaign")
      .populate("influencer", "name email instagram followersCount");

    // CSV headers: applicationId,campaignId,campaignTitle,brandName,influencerId,influencerName,influencerEmail,instagram,followersAtApply,status,adminComment,rejectionReason
    const headers = [
      "applicationId",
      "campaignId",
      "campaignTitle",
      "brandName",
      "influencerId",
      "influencerName",
      "influencerEmail",
      "instagram",
      "followersAtApply",
      "status",
      "adminComment",
      "rejectionReason",
    ];
    const rows = items.map((a) => [
      a._id,
      a.campaign?._id || "",
      a.campaign?.title || "",
      a.campaign?.brandName || "",
      a.influencer?._id || a.influencer,
      a.influencer?.name || "",
      a.influencer?.email || "",
      a.influencer?.instagram || "",
      a.followersAtApply || "",
      a.status || "",
      a.adminComment || "",
      a.rejectionReason || "",
    ]);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="applications-${campaignId || "all"}.csv"`
    );

    // simple CSV quoting
    const esc = (v) => {
      if (v === null || typeof v === "undefined") return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const csv = [headers.map(esc).join(",")]
      .concat(rows.map((r) => r.map(esc).join(",")))
      .join("\n");

    res.send(csv);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("exportApplications error", err);
    res.status(500).json({ error: "server_error" });
  }
}

// Bulk-review: accept JSON array or uploaded CSV with columns influencerEmail|influencerId|applicationId and status (approved/rejected), optional comment/reason
async function bulkReviewApplications(req, res) {
  try {
    let rows = [];
    if (req.is("application/json") && Array.isArray(req.body)) {
      rows = req.body;
    } else if (req.file && req.file.buffer) {
      // CSV parsing via csv-parse if available
      let parseFn;
      try {
        // require here to avoid startup dependency if not installed
        parseFn = require("csv-parse/sync").parse;
      } catch (e) {
        // fallback naive parse
        const text = req.file.buffer.toString("utf8");
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
      if (parseFn) {
        const text = req.file.buffer.toString("utf8");
        const parsed = parseFn(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        rows = parsed;
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
      const status = (r.status || r.Status || "").toLowerCase();
      const appId =
        r.applicationId || r.application_id || r.application || r.appId || null;
      const influencerId =
        r.influencerId || r.influencer_id || r.influencer || null;
      const influencerEmail =
        r.influencerEmail || r.influencer_email || r.email || null;
      const campaignId = r.campaignId || r.campaign_id || r.campaign || null;
      const comment = r.adminComment || r.comment || r.AdminComment || null;
      const reason = r.rejectionReason || r.reason || r.RejectionReason || null;

      try {
        let app = null;
        if (appId) app = await Application.findById(appId);
        else if (influencerId && campaignId)
          app = await Application.findOne({
            influencer: influencerId,
            campaign: campaignId,
          });
        else if (influencerEmail && campaignId) {
          const user = await require("../models/user").findOne({
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

        if (status === "approved" || status === "approve") {
          app.status = "approved";
          app.reviewer = reviewerId;
          if (comment) app.adminComment = comment;
        } else if (status === "rejected" || status === "reject") {
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
        // eslint-disable-next-line no-console
        console.error("bulkReview row error", err);
        results.errors.push({ row: i + 1, reason: err.message || "error" });
      }
    }

    res.json(results);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("bulkReviewApplications failed", err);
    res.status(500).json({ error: "server_error" });
  }
}

// influencer submits order details after application approved
async function submitOrder(req, res) {
  const appId = req.params.id;
  const userId = req.user && req.user.id;
  const { orderId, amount, comment, screenshotUrl } = req.body || {};
  if (!orderId || typeof amount === "undefined")
    return res.status(400).json({ error: "missing_fields" });
  try {
    // debug: log incoming order submission (helps diagnose missing screenshot URL)
    // eslint-disable-next-line no-console
    console.log(
      `submitOrder called: appId=${appId} userId=${userId} orderId=${orderId} amount=${amount} screenshotUrl=${screenshotUrl}`
    );
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    // only the influencer who owns the application can submit order
    if (String(app.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });
    app.orderId = orderId;
    app.campaignScreenshot = screenshotUrl || app.campaignScreenshot;
    if (!app.payout) app.payout = {};
    app.payout.amount = Number(amount);
    app.payout.paid = false;
    app.payout.paidAt = undefined;
    if (comment) app.applicantComment = comment;
    // mark as order submitted for admin review
    app.status = "order_submitted";
    await app.save();
    res.json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

// admin: list submitted orders for review
async function listOrders(req, res) {
  try {
    const items = await Application.find({ status: "order_submitted" })
      .populate("campaign")
      .populate("influencer", "name email phone followersCount");
    res.json(items);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

// admin approves an order (mark payout paid and set paidAt)
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
    // eslint-disable-next-line no-console
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
    app.status = "approved"; // revert to approved so influencer can resubmit
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    if (comment) app.adminComment = comment;
    await app.save();
    res.json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
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
};
