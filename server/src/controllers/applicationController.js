const Application = require("../models/application");
const Campaign = require("../models/campaign");
const User = require("../models/user");
const Payment = require("../models/payment");

// Resolve commenter IDs to display names for admin UIs. If includeNames is
// false, we do not attach the `byName` property (used for influencer views).
async function attachCommenterNamesToApps(apps, includeNames) {
  if (!Array.isArray(apps) || apps.length === 0) return apps;
  const ids = new Set();
  apps.forEach((a) => {
    (a.adminComments || []).forEach((c) => c.by && ids.add(String(c.by)));
    (a.influencerComments || []).forEach((c) => c.by && ids.add(String(c.by)));
  });
  if (ids.size === 0) return apps;
  const idArr = Array.from(ids);
  const users = await User.find({ _id: { $in: idArr } })
    .select("name")
    .lean();
  const map = {};
  users.forEach((u) => {
    if (u && u._id) map[String(u._id)] = u.name || null;
  });
  // attach byName only when includeNames is true
  apps.forEach((a) => {
    (a.adminComments || []).forEach((c) => {
      const key = String(c.by || "");
      if (includeNames && map[key]) c.byName = map[key];
    });
    (a.influencerComments || []).forEach((c) => {
      const key = String(c.by || "");
      if (includeNames && map[key]) c.byName = map[key];
    });
  });
  return apps;
}

// comment stage helpers: stages used to categorize comments
const STAGE_APPLICATION = "application";
const STAGE_ORDER = "order";
const STAGE_PAYMENT = "payment";

function pushAdminCommentToApp(app, stage, comment, by, byName) {
  if (!comment) return;
  app.adminComments = app.adminComments || [];
  const entry = { stage: stage || STAGE_APPLICATION, comment };
  if (by) entry.by = by;
  if (byName) entry.byName = byName;
  app.adminComments.push(entry);
  // keep legacy field in sync (most-recent admin comment)
  app.adminComment = comment;
}

function pushInfluencerCommentToApp(app, stage, comment, by) {
  if (!comment) return;
  app.influencerComments = app.influencerComments || [];
  app.influencerComments.push({
    stage: stage || STAGE_APPLICATION,
    comment,
    by,
  });
  // also keep applicantComment for backward compatibility
  app.applicantComment = comment;
}

function statusToStage(status) {
  if (!status) return STAGE_APPLICATION;
  const s = String(status).toLowerCase();
  if (
    s === "order_submitted" ||
    s === "order_form_approved" ||
    s === "order_form_rejected"
  )
    return STAGE_ORDER;
  if (
    s === "completed" ||
    s === "partial_payment_processed" ||
    s === "full_payment_processed" ||
    s === "paid"
  )
    return STAGE_PAYMENT;
  return STAGE_APPLICATION;
}

// Normalize a status-like string into canonical 'approved'|'rejected' or null
function normalizeStatus(raw) {
  if (!raw && raw !== 0) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // approved-like values
  if (/^(1|yes|y|true|approve|approved|accept|accepted|epproved)$/i.test(s))
    return "approved";
  // rejected-like values
  if (/^(0|no|n|false|reject|rejected|decline|declined)$/i.test(s))
    return "rejected";
  return s;
}

// Map human-friendly CSV header names (e.g. "Application ID", "Influencer Email")
// to canonical internal keys used by bulk import processors.
function mapRowKeys(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  const keyMap = {
    // application identifiers
    "application id": "applicationId",
    applicationid: "applicationId",
    "app id": "applicationId",
    app_id: "applicationId",
    application_id: "applicationId",
    appid: "applicationId",
    application: "applicationId",
    // influencer
    "influencer id": "influencerId",
    influencerid: "influencerId",
    influencer_id: "influencerId",
    "influencer email": "influencerEmail",
    influenceremail: "influencerEmail",
    influencer_email: "influencerEmail",
    email: "influencerEmail",
    // campaign
    "campaign id": "campaignId",
    campaignid: "campaignId",
    campaign_id: "campaignId",
    campaign: "campaignId",
    // status / action
    status: "status",
    state: "status",
    result: "status",
    outcome: "status",
    // comments/reason
    admincomment: "adminComment",
    "admin comment": "adminComment",
    rejectionreason: "rejectionReason",
    "rejection reason": "rejectionReason",
    reason: "rejectionReason",
    comment: "adminComment",
  };

  Object.keys(row).forEach((k) => {
    const nk = String(k || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
    const mapped = keyMap[nk] || keyMap[nk.replace(/ /g, "_")] || null;
    if (mapped) out[mapped] = row[k];
    else out[k] = row[k];
  });
  return out;
}

// admin actions
async function approveApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  const { comment, approvedAmount } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "approved";
    app.reviewer = reviewerId;
    if (comment)
      pushAdminCommentToApp(
        app,
        STAGE_APPLICATION,
        comment,
        reviewerId,
        reviewerName
      );
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
        if (campaign.paymentType) app.paymentType = campaign.paymentType;
        if (campaign.payoutRelease) app.payoutRelease = campaign.payoutRelease;
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
    // DEBUG: log whether a screenshot URL was received and persisted
    try {
      console.log(
        `submitOrder: saved app=${app._id} campaignScreenshot=${app.campaignScreenshot}`
      );
    } catch (e) {
      console.warn("submitOrder: debug log failed", e && e.message);
    }

    const out = app && app.toObject ? app.toObject() : app;
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToApps([out], true);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  const { reason, comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "rejected";
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    if (comment)
      pushAdminCommentToApp(
        app,
        STAGE_APPLICATION,
        comment,
        reviewerId,
        reviewerName
      );
    await app.save();
    const out = app && app.toObject ? app.toObject() : app;
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToApps([out], true);
    res.json(out);
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
    // For influencer views, only expose the admin comment relevant to the
    // application's current stage. Admins (other endpoints) still receive
    // the full `adminComments` history.
    const out = (items || []).map((a) => {
      const obj = a && a.toObject ? a.toObject() : a;
      const stage = statusToStage(obj.status);
      const adminComments = obj.adminComments || [];
      // find most recent admin comment for this stage
      const recent = [...adminComments]
        .reverse()
        .find((c) => c.stage === stage);
      obj.adminComment = recent ? recent.comment : obj.adminComment || null;
      // include influencerComments for influencer to see their own notes
      obj.influencerComments = obj.influencerComments || [];
      return obj;
    });
    res.json(out);
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
    // Admins should see who left each comment; influencers (other callers)
    // should not. Determine caller role and attach names accordingly.
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    const objs = (items || []).map((i) => (i && i.toObject ? i.toObject() : i));
    await attachCommenterNamesToApps(objs, !!isAdmin);
    res.json(objs);
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

    // normalize header keys (map human-friendly CSV headers to canonical keys)
    rows = rows.map(mapRowKeys);

    // If a campaignId was provided via query (client-side export/import),
    // apply it to rows that don't include a campaign column so lookups
    // by influencer+campaign work as expected.
    const defaultCampaign = req.query && req.query.campaignId;
    if (defaultCampaign) {
      rows.forEach((r) => {
        if (!r.campaignId) r.campaignId = defaultCampaign;
      });
    }

    // normalize header keys (map human-friendly CSV headers to canonical keys)
    rows = rows.map(mapRowKeys);

    // apply default campaignId from query if present
    const defaultCampaign2 = req.query && req.query.campaignId;
    if (defaultCampaign2) {
      rows.forEach((r) => {
        if (!r.campaignId) r.campaignId = defaultCampaign2;
      });
    }

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: "no_rows" });

    const results = { updated: 0, notFound: [], errors: [] };
    const reviewerId = req.user && req.user.id;
    const reviewerName = req.user && req.user.name;

    console.log(
      `bulkReviewApplications: received ${rows.length} rows for review (reviewer=${reviewerId})`
    );

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const status = normalizeStatus(r.status || r.Status || "");

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
          if (comment)
            pushAdminCommentToApp(
              app,
              STAGE_APPLICATION,
              comment,
              reviewerId,
              reviewerName
            );
          // snapshot campaign settings when applying approval in bulk
          try {
            const campaign = await Campaign.findById(app.campaign);
            if (campaign) {
              if (campaign.fulfillmentMethod)
                app.fulfillmentMethod = campaign.fulfillmentMethod;
              if (campaign.orderFormFields)
                app.orderFormFields = campaign.orderFormFields;
              if (campaign.paymentType) app.paymentType = campaign.paymentType;
              if (campaign.payoutRelease)
                app.payoutRelease = campaign.payoutRelease;
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
          if (comment)
            pushAdminCommentToApp(
              app,
              STAGE_APPLICATION,
              comment,
              reviewerId,
              reviewerName
            );
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

async function bulkReviewOrders(req, res) {
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
    const reviewerName = req.user && req.user.name;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const status = normalizeStatus(r.status || r.Status || "");

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
          results.errors.push({ row: i + 1, reason: "missing_identifier" });
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

        console.log(
          `bulkReviewOrders: processing row ${i + 1} -> app=${
            app._id
          } currentStatus=${app.status} desired=${status}`
        );

        if (status === "approved") {
          // approveOrder logic: snapshot campaign settings so frontend can
          // present the correct message (order accepted vs order placed)
          try {
            const campaignSnap = await Campaign.findById(app.campaign);
            if (campaignSnap) {
              if (campaignSnap.fulfillmentMethod)
                app.fulfillmentMethod = campaignSnap.fulfillmentMethod;
              if (campaignSnap.orderFormFields)
                app.orderFormFields = campaignSnap.orderFormFields;
              if (campaignSnap.payoutRelease)
                app.payoutRelease = campaignSnap.payoutRelease;
              // Default application payout to campaign budget when not provided
              if (!app.payout) app.payout = {};
              if (
                (typeof app.payout.amount === "undefined" ||
                  app.payout.amount === null) &&
                typeof campaignSnap.budget === "number"
              ) {
                app.payout.amount = campaignSnap.budget;
              }
            }
          } catch (e) {
            // don't fail the whole import for snapshot errors
            console.warn(
              "bulkReviewOrders: failed to snapshot campaign",
              e && e.message
            );
          }

          app.status = "completed";
          app.reviewer = reviewerId;
          if (!app.payout) app.payout = {};
          // mark as approved for payout processing but not yet paid
          app.payout.paid = false;
          app.payout.approvedAt = new Date();
          if (comment)
            pushAdminCommentToApp(
              app,
              STAGE_ORDER,
              comment,
              reviewerId,
              reviewerName
            );
          // create payment record for dashboard
          try {
            const amount =
              app.payout && typeof app.payout.amount === "number"
                ? app.payout.amount
                : 0;
            await Payment.create({
              application: app._id,
              influencer: app.influencer,
              campaign: app.campaign,
              amount,
              totalPayout: amount,
              fulfillmentMethod:
                app.fulfillmentMethod ||
                (campaignSnap && campaignSnap.fulfillmentMethod),
              paymentType: app.paymentType || "full",
              status: "pending",
            });
          } catch (e) {
            // log and continue
            // eslint-disable-next-line no-console
            console.warn(
              "bulkReviewOrders: failed to create payment record",
              e && e.message
            );
          }
        } else if (status === "rejected") {
          // rejectOrder logic: mark rejected and require influencer appeal/resubmit
          app.status = "rejected";
          app.reviewer = reviewerId;
          app.rejectionReason = reason;
          app.needsAppeal = true;
          app.appealFormName = app.appealFormName || "appeal form";
          if (comment)
            pushAdminCommentToApp(
              app,
              STAGE_ORDER,
              comment,
              reviewerId,
              reviewerName
            );
          // clear any submitted order fields so influencer can re-fill
          try {
            app.orderId = undefined;
            app.orderData = undefined;
            app.campaignScreenshot = undefined;
            app.shippingAddress = undefined;
          } catch (e) {
            // ignore
          }
          // push a lightweight in-app notification to the influencer if present
          try {
            const influencerUser = await User.findById(app.influencer);
            const camp = await Campaign.findById(app.campaign);
            if (influencerUser) {
              const message = `Your order for campaign '${
                (camp && camp.title) || "(campaign)"
              }' was rejected${
                reason ? `: ${reason}` : ""
              }. Please resubmit using the appeal form.`;
              await User.updateOne(
                { _id: influencerUser._id },
                {
                  $push: {
                    notifications: {
                      type: "order_rejected",
                      message,
                      application: app._id,
                      read: false,
                      createdAt: new Date(),
                    },
                  },
                }
              );
            }
          } catch (e) {
            // log and continue
            // eslint-disable-next-line no-console
            console.warn(
              "bulkReviewOrders: failed to notify influencer",
              e && e.message
            );
          }
        } else {
          results.errors.push({
            row: i + 1,
            reason: "unknown_status",
            value: r.status,
          });
          continue;
        }

        await app.save();
        console.log(
          `bulkReviewOrders: row ${i + 1} updated app=${app._id} newStatus=${
            app.status
          }`
        );
        results.updated += 1;
      } catch (err) {
        console.error("bulkReviewOrders row error", err);
        results.errors.push({ row: i + 1, reason: err.message || "error" });
      }
    }

    res.json(results);
  } catch (err) {
    console.error("bulkReviewOrders failed", err);
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
      if (comment)
        pushInfluencerCommentToApp(app, STAGE_ORDER, comment, userId);
      app.status = "order_submitted";
    } else {
      if (!orderId || typeof amount === "undefined")
        return res.status(400).json({ error: "missing_fields" });
      app.orderId = orderId;
      app.campaignScreenshot = screenshotUrl || app.campaignScreenshot;
      if (!app.payout) app.payout = {};
      app.payout.amount = Number(amount);
      app.payout.paid = false;
      if (comment)
        pushInfluencerCommentToApp(app, STAGE_ORDER, comment, userId);
      if (orderData && typeof orderData === "object") app.orderData = orderData;
      app.status = "order_submitted";
    }
    await app.save();
    const out = app && app.toObject ? app.toObject() : app;
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToApps([out], true);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listOrders(req, res) {
  try {
    // include order-related statuses so admin can still see records after
    // approval or rejection while the campaign exists
    // Only include applications that have an order form submitted by the
    // influencer. Admin order-review should not include generic approved/rejected
    // applications that never progressed to order submission.
    const q = {
      status: {
        $in: ["order_submitted", "order_form_approved", "order_form_rejected"],
      },
    };
    if (req.query && req.query.campaignId) q.campaign = req.query.campaignId;
    const items = await Application.find(q)
      .populate("campaign")
      .populate("influencer", "name email phone followersCount");
    // filter out applications whose campaign no longer exists (deleted)
    const visible = (items || []).filter((a) => Boolean(a.campaign));
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    const objs = visible.map((i) => (i && i.toObject ? i.toObject() : i));
    // DEBUG: show sample of campaignScreenshot values for admin order list
    try {
      const sample = objs.slice(0, 20).map((o) => ({
        id: o._id,
        campaignScreenshot: o.campaignScreenshot || null,
      }));
      console.log(
        `listOrders: returning ${objs.length} items; sample screenshots:`,
        sample
      );
    } catch (e) {
      console.warn("listOrders: debug log failed", e && e.message);
    }

    await attachCommenterNamesToApps(objs, !!isAdmin);
    res.json(objs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function approveOrder(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  const { comment, approvedAmount } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    // snapshot campaign/payment settings
    let campaign = null;
    try {
      campaign = await Campaign.findById(app.campaign);
      if (campaign) {
        if (campaign.fulfillmentMethod)
          app.fulfillmentMethod = campaign.fulfillmentMethod;
        if (campaign.orderFormFields)
          app.orderFormFields = campaign.orderFormFields;
        if (campaign.paymentType) app.paymentType = campaign.paymentType;
        if (campaign.payoutRelease) app.payoutRelease = campaign.payoutRelease;
        // Default application payout amount to campaign budget when not provided
        if (!app.payout) app.payout = {};
        if (
          (typeof app.payout.amount === "undefined" ||
            app.payout.amount === null) &&
          typeof campaign.budget === "number"
        ) {
          app.payout.amount = campaign.budget;
        }
      }
    } catch (e) {
      console.warn("approveOrder: failed to snapshot campaign", e && e.message);
    }

    // Determine payoutRelease and fulfillment method for validation
    const payoutRelease =
      app.payoutRelease || (campaign && campaign.payoutRelease);
    const method =
      app.fulfillmentMethod ||
      (campaign && campaign.fulfillmentMethod) ||
      "influencer";

    // If admin supplied an approvedAmount, ensure this campaign actually uses
    // refund_on_delivery semantics with influencer-placed orders. Reject otherwise.
    if (
      typeof approvedAmount !== "undefined" &&
      !(payoutRelease === "refund_on_delivery" && method === "influencer")
    ) {
      return res.status(400).json({
        error: "invalid_approved_amount",
        message:
          "approvedAmount may only be supplied for influencer-placed orders using refund_on_delivery payoutRelease",
      });
    }

    app.status = "order_form_approved";
    app.reviewer = reviewerId;
    if (!app.payout) app.payout = {};
    // If admin supplied an approvedAmount (from admin UI), use it as the
    // application payout amount. Otherwise keep any existing value or
    // fallback to campaign budget (handled earlier).
    if (
      typeof approvedAmount !== "undefined" &&
      approvedAmount !== null &&
      !Number.isNaN(Number(approvedAmount))
    ) {
      app.payout.amount = Number(approvedAmount);
    }
    // mark as approved for payout processing; payment will be recorded when processed
    app.payout.paid = false;
    app.payout.approvedAt = new Date();
    if (comment)
      pushAdminCommentToApp(
        app,
        STAGE_ORDER,
        comment,
        reviewerId,
        reviewerName
      );

    // create a Payment record for processing by payments dashboard
    try {
      const amount =
        app.payout && typeof app.payout.amount === "number"
          ? app.payout.amount
          : 0;
      // If this campaign uses refund_on_delivery semantics and the order was
      // placed by the influencer, record the approved order amount as a
      // partialApproval so the payments dashboard can display it in the
      // "partial amount to be paid" column and the payments processor can
      // act on it.
      const paymentPayload = {
        application: app._id,
        influencer: app.influencer,
        campaign: app.campaign,
        amount,
        totalPayout: amount,
        fulfillmentMethod:
          app.fulfillmentMethod || (campaign && campaign.fulfillmentMethod),
        paymentType: app.paymentType || "full",
        payoutRelease: app.payoutRelease || undefined,
        status: "pending",
      };
      // Consider campaign-level payoutRelease as fallback
      const payoutRelease =
        app.payoutRelease || (campaign && campaign.payoutRelease);
      if (payoutRelease === "refund_on_delivery" && amount > 0) {
        paymentPayload.partialApproval = { amount, paid: false };
      }
      await Payment.create(paymentPayload);
    } catch (e) {
      console.warn(
        "approveOrder: failed to create payment record",
        e && e.message
      );
    }

    await app.save();
    const out = app && app.toObject ? app.toObject() : app;
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToApps([out], true);
    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectOrder(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  const { reason, comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    // mark as rejected and require influencer to resubmit an appeal
    // If the application was in an order-submitted state, treat this as an
    // order-form rejection; otherwise treat as full application rejection.
    if (app.status === "order_submitted") app.status = "order_form_rejected";
    else app.status = "rejected";
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    app.needsAppeal = true;
    app.appealFormName = app.appealFormName || "appeal form";
    if (comment)
      pushAdminCommentToApp(
        app,
        STAGE_ORDER,
        comment,
        reviewerId,
        reviewerName
      );
    try {
      app.orderId = undefined;
      app.orderData = undefined;
      app.campaignScreenshot = undefined;
      app.shippingAddress = undefined;
    } catch (e) {
      // ignore
    }

    // push notification to influencer
    try {
      const influencerUser = await User.findById(app.influencer);
      const camp = await Campaign.findById(app.campaign);
      if (influencerUser) {
        const message = `Your order for campaign '${
          (camp && camp.title) || "(campaign)"
        }' was rejected${
          reason ? `: ${reason}` : ""
        }. Please resubmit using the appeal form.`;
        await User.updateOne(
          { _id: influencerUser._id },
          {
            $push: {
              notifications: {
                type: "order_rejected",
                message,
                application: app._id,
                read: false,
                createdAt: new Date(),
              },
            },
          }
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("rejectOrder: failed to notify influencer", e && e.message);
    }

    await app.save();
    const out = app && app.toObject ? app.toObject() : app;
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToApps([out], true);
    res.json(out);
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
  bulkReviewOrders,
  listPendingImports,
};
