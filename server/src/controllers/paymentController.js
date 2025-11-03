const Payment = require("../models/payment");
const Application = require("../models/application");
const User = require("../models/user");

const STAGE_ORDER = "order";
const STAGE_PAYMENT = "payment";

function pushAdminCommentToPayment(p, stage, comment, by, byName) {
  if (!comment) return;
  p.adminComments = p.adminComments || [];
  const entry = { stage: stage || STAGE_PAYMENT, comment };
  if (by) entry.by = by;
  if (byName) entry.byName = byName;
  p.adminComments.push(entry);
}

function pushInfluencerCommentToPayment(p, stage, comment, by) {
  if (!comment) return;
  p.influencerComments = p.influencerComments || [];
  p.influencerComments.push({ stage: stage || STAGE_ORDER, comment, by });
}

// Attach commenter display names to payment comment objects when includeNames
// is true. This mirrors the behavior in applicationController.attachCommenterNamesToApps
// and is used to provide admin UIs with readable author names while keeping
// influencer-facing responses free of author names.
async function attachCommenterNamesToPayments(payments, includeNames) {
  if (!Array.isArray(payments) || payments.length === 0) return payments;
  const ids = new Set();
  payments.forEach((p) => {
    (p.adminComments || []).forEach((c) => c.by && ids.add(String(c.by)));
    (p.influencerComments || []).forEach((c) => c.by && ids.add(String(c.by)));
  });
  if (ids.size === 0) return payments;
  const idArr = Array.from(ids);
  const users = await User.find({ _id: { $in: idArr } })
    .select("name")
    .lean();
  const map = {};
  users.forEach((u) => {
    if (u && u._id) map[String(u._id)] = u.name || null;
  });
  payments.forEach((p) => {
    (p.adminComments || []).forEach((c) => {
      const key = String(c.by || "");
      if (includeNames && map[key]) c.byName = map[key];
    });
    (p.influencerComments || []).forEach((c) => {
      const key = String(c.by || "");
      if (includeNames && map[key]) c.byName = map[key];
    });
  });
  return payments;
}

async function listPayments(req, res) {
  try {
    const q = {};
    if (req.query && req.query.campaignId) q.campaign = req.query.campaignId;
    if (req.query && req.query.status) q.status = req.query.status;
    const items = await Payment.find(q)
      .populate("influencer", "name email")
      .populate("campaign", "title brandName budget")
      .populate("application", "status payout");
    // Attach commenter names for admin viewers
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    const objs = (items || []).map((i) => (i && i.toObject ? i.toObject() : i));
    // merge any application-level comments into the payment object so admin
    // dashboard shows the full history (some comments may have been stored
    // on the Application during earlier workflows).
    objs.forEach((p) => {
      try {
        if (p.application) {
          const a = p.application;
          // merge admin comments (payment-level first)
          p.adminComments = (p.adminComments || []).concat(
            a.adminComments || []
          );
          p.influencerComments = (p.influencerComments || []).concat(
            a.influencerComments || []
          );
        }
      } catch (e) {
        // ignore merge errors
      }
    });
    if (isAdmin) await attachCommenterNamesToPayments(objs, true);
    res.json(objs);
  } catch (err) {
    console.error("listPayments error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function updatePayment(req, res) {
  const id = req.params.id;
  const { status, metadata } = req.body || {};
  try {
    const p = await Payment.findById(id);
    if (!p) return res.status(404).json({ error: "not_found" });

    // If admin is attempting to mark payment as PAID, require deliverables proof
    if (typeof status !== "undefined") {
      if (status === "paid") {
        // disallow marking paid unless deliverables proof exists
        if (!p.deliverablesProof || !p.deliverablesProof.submittedAt) {
          return res
            .status(400)
            .json({
              error: "deliverables_missing",
              message: "Cannot mark paid before deliverables are submitted",
            });
        }
      }
      p.status = status;
    }
    if (typeof metadata !== "undefined") p.metadata = metadata;

    await p.save();

    // Ensure returned payment includes campaign budget for admin UI
    await p.populate("campaign", "title brandName budget");

    // If marked paid, also update associated application payout record
    if (p.status === "paid" && p.application) {
      try {
        const app = await Application.findById(p.application);
        if (app) {
          if (!app.payout) app.payout = {};
          app.payout.paid = true;
          app.payout.paidAt = new Date();
          await app.save();
        }
      } catch (e) {
        // log and continue
        // eslint-disable-next-line no-console
        console.warn(
          "updatePayment: failed to update application payout",
          e && e.message
        );
      }
    }

    // attach commenter names when admin is calling
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    let out = p && p.toObject ? p.toObject() : p;
    // merge application-level comments to the returned payment object
    try {
      if (out.application) {
        const a = out.application;
        out.adminComments = (out.adminComments || []).concat(
          a.adminComments || []
        );
        out.influencerComments = (out.influencerComments || []).concat(
          a.influencerComments || []
        );
      }
    } catch (e) {
      // ignore
    }
    if (isAdmin) await attachCommenterNamesToPayments([out], true);
    res.json(out);
  } catch (err) {
    console.error("updatePayment error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listMyPayments(req, res) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(400).json({ error: "missing_user" });
    const items = await Payment.find({ influencer: userId })
      .populate("campaign", "title brandName budget")
      .populate("application", "status payout");
    // For influencer views, only expose admin comment relevant to the
    // payment stage (admins get the full adminComments history from
    // the admin-facing endpoints).
    const out = (items || []).map((p) => {
      const obj = p && p.toObject ? p.toObject() : p;
      const adminComments = obj.adminComments || [];
      const recent = [...adminComments]
        .reverse()
        .find((c) => c.stage === STAGE_PAYMENT);
      obj.adminComment = recent ? recent.comment : obj.adminComment || null;
      obj.influencerComments = obj.influencerComments || [];
      return obj;
    });
    res.json(out);
  } catch (err) {
    console.error("listMyPayments error", err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = {
  listPayments,
  updatePayment,
  listMyPayments,
  submitOrderProof,
  submitDeliverables,
  approvePartial,
  approveRemaining,
};

// --- New handlers for refund_on_delivery flow ---

async function submitOrderProof(req, res) {
  const id = req.params.id;
  const userId = req.user && req.user.id;
  const {
    orderScreenshot,
    deliveredScreenshot,
    orderAmount,
    engagementRate,
    impressions,
    postLink,
    comments,
    reach,
    videoViews,
    reelLink,
    storyLink,
    feedback,
    storyViews,
    storyInteractions,
    storyScreenshots,
    comment,
  } = req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    if (String(p.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });

    // Validate required fields: orderAmount (Request Amount) and orderScreenshot
    if (typeof orderAmount === "undefined" || !orderScreenshot) {
      return res
        .status(400)
        .json({
          error: "missing_required_fields",
          message: "orderAmount and orderScreenshot are required",
        });
    }

    p.orderProofs = p.orderProofs || {};
    p.orderProofs.orderScreenshot = orderScreenshot;
    if (deliveredScreenshot)
      p.orderProofs.deliveredScreenshot = deliveredScreenshot;
    p.orderProofs.orderAmount = Number(orderAmount);
    if (engagementRate) p.orderProofs.engagementRate = String(engagementRate);
    if (typeof impressions !== "undefined")
      p.orderProofs.impressions = Number(impressions);
    if (postLink) p.orderProofs.postLink = postLink;
    if (comments) p.orderProofs.comments = comments;
    if (typeof reach !== "undefined") p.orderProofs.reach = Number(reach);
    if (typeof videoViews !== "undefined")
      p.orderProofs.videoViews = Number(videoViews);
    if (reelLink) p.orderProofs.reelLink = reelLink;
    if (storyLink) p.orderProofs.storyLink = storyLink;
    if (feedback) p.orderProofs.feedback = feedback;
    if (typeof storyViews !== "undefined")
      p.orderProofs.storyViews = Number(storyViews);
    if (typeof storyInteractions !== "undefined")
      p.orderProofs.storyInteractions = Number(storyInteractions);
    // storyScreenshots may be sent as array or comma-separated string
    if (storyScreenshots) {
      if (Array.isArray(storyScreenshots))
        p.orderProofs.storyScreenshots = storyScreenshots;
      else if (typeof storyScreenshots === "string") {
        p.orderProofs.storyScreenshots = storyScreenshots
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    p.orderProofs.submittedAt = new Date();
    if (comment) {
      pushInfluencerCommentToPayment(p, STAGE_ORDER, comment, userId);
      // also record on application-level influencerComments for history
      try {
        if (p.application) {
          const app = await Application.findById(p.application);
          if (app) {
            app.influencerComments = app.influencerComments || [];
            app.influencerComments.push({
              stage: STAGE_ORDER,
              comment,
              by: userId,
              createdAt: new Date(),
            });
            // keep legacy field in sync
            app.applicantComment = comment;
          }
          await app.save();
        }
      } catch (e) {
        // ignore app comment failure
        // eslint-disable-next-line no-console
        console.warn(
          "submitOrderProof: failed to save app influencer comment",
          e && e.message
        );
      }
    }
    // mark as pending proof
    p.status = p.status === "pending" ? "proof_submitted" : p.status;
    // reflect on application status as 'order_submitted' (already set by app)
    try {
      if (p.application) {
        const app = await Application.findById(p.application);
        if (app && app.status !== "order_submitted") {
          app.status = "order_submitted";
          await app.save();
        }
      }
    } catch (err) {
      console.warn(
        "submitOrderProof: failed to update application status",
        err && err.message
      );
    }
    await p.save();
    res.json(p);
  } catch (err) {
    console.error("submitOrderProof error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function submitDeliverables(req, res) {
  const id = req.params.id;
  const userId = req.user && req.user.id;
  const {
    proof,
    comment,
    engagementRate,
    impressions,
    postLink,
    comments,
    reach,
    videoViews,
    reelLink,
    storyLink,
    feedback,
    storyViews,
    storyInteractions,
    storyScreenshots,
  } = req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    if (String(p.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });
    // Require a proof URL and basic info
    if (!proof) {
      return res
        .status(400)
        .json({
          error: "missing_required_fields",
          message: "deliverables proof is required",
        });
    }

    p.deliverablesProof = p.deliverablesProof || {};
    p.deliverablesProof.proof = proof;
    p.deliverablesProof.submittedAt = new Date();
    if (engagementRate)
      p.deliverablesProof.engagementRate = String(engagementRate);
    if (typeof impressions !== "undefined")
      p.deliverablesProof.impressions = Number(impressions);
    if (postLink) p.deliverablesProof.postLink = postLink;
    if (comments) p.deliverablesProof.comments = comments;
    if (typeof reach !== "undefined") p.deliverablesProof.reach = Number(reach);
    if (typeof videoViews !== "undefined")
      p.deliverablesProof.videoViews = Number(videoViews);
    if (reelLink) p.deliverablesProof.reelLink = reelLink;
    if (storyLink) p.deliverablesProof.storyLink = storyLink;
    if (feedback) p.deliverablesProof.feedback = feedback;
    if (typeof storyViews !== "undefined")
      p.deliverablesProof.storyViews = Number(storyViews);
    if (typeof storyInteractions !== "undefined")
      p.deliverablesProof.storyInteractions = Number(storyInteractions);
    if (storyScreenshots) {
      if (Array.isArray(storyScreenshots))
        p.deliverablesProof.storyScreenshots = storyScreenshots;
      else if (typeof storyScreenshots === "string") {
        p.deliverablesProof.storyScreenshots = storyScreenshots
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    if (comment) {
      pushInfluencerCommentToPayment(p, STAGE_PAYMENT, comment, userId);
      try {
        if (p.application) {
          const app = await Application.findById(p.application);
          if (app) {
            app.influencerComments = app.influencerComments || [];
            app.influencerComments.push({
              stage: STAGE_PAYMENT,
              comment,
              by: userId,
              createdAt: new Date(),
            });
            app.applicantComment = comment;
          }
          await app.save();
        }
      } catch (e) {
        // ignore
        // eslint-disable-next-line no-console
        console.warn(
          "submitDeliverables: failed to save app influencer comment",
          e && e.message
        );
      }
    }
    // mark as deliverables submitted
    p.status =
      p.status === "partial_approved" || p.status === "proof_submitted"
        ? "deliverables_submitted"
        : p.status;
    await p.save();
    res.json(p);
  } catch (err) {
    console.error("submitDeliverables error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function approvePartial(req, res) {
  const id = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  const { amount, payNow, comment } = req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    // only allow on refund_on_delivery flows
    if (
      (p.payoutRelease || p.campaign?.payoutRelease) !== "refund_on_delivery"
    ) {
      return res.status(400).json({ error: "invalid_payout_flow" });
    }
    // require influencer to have submitted order proof before admin approves
    if (!p.orderProofs || !p.orderProofs.submittedAt) {
      return res
        .status(400)
        .json({
          error: "order_proof_missing",
          message: "Influencer must submit order proof before approval",
        });
    }
    p.partialApproval = p.partialApproval || {};
    p.partialApproval.amount =
      typeof amount === "number" ? amount : p.partialApproval.amount || 0;
    p.partialApproval.approvedBy = reviewerId;
    p.partialApproval.approvedAt = new Date();
    if (comment) {
      pushAdminCommentToPayment(
        p,
        STAGE_PAYMENT,
        comment,
        reviewerId,
        reviewerName
      );
      try {
        if (p.application) {
          const app = await Application.findById(p.application);
          if (app) {
            app.adminComments = app.adminComments || [];
            const entry = {
              stage: STAGE_PAYMENT,
              comment,
              by: reviewerId,
              createdAt: new Date(),
            };
            if (reviewerName) entry.byName = reviewerName;
            app.adminComments.push(entry);
            app.adminComment = comment;
          }
          await app.save();
        }
      } catch (e) {
        // ignore
        // eslint-disable-next-line no-console
        console.warn(
          "approvePartial: failed to save app admin comment",
          e && e.message
        );
      }
    }
    if (payNow) {
      p.partialApproval.paid = true;
      p.partialApproval.paidAt = new Date();
      // if paying now, update application payout snapshot
      try {
        if (p.application) {
          const app = await Application.findById(p.application);
          if (app) {
            if (!app.payout) app.payout = {};
            // mark partial as paid and keep remaining open
            app.payout.partialPaid = p.partialApproval.amount || 0;
            await app.save();
          }
        }
      } catch (e) {
        console.warn(
          "approvePartial: failed to update application payout",
          e && e.message
        );
      }
    } else {
      p.partialApproval.paid = false;
    }
    p.status = "partial_approved";
    // if payment was executed immediately, reflect on application status
    try {
      if (payNow && p.application) {
        const app = await Application.findById(p.application);
        if (app) {
          app.status = "partial_payment_processed";
          await app.save();
        }
      }
    } catch (err) {
      console.warn(
        "approvePartial: failed to update application status",
        err && err.message
      );
    }
    await p.save();
    // attach commenter names for admin response
    // populate campaign budget for response
    await p.populate("campaign", "title brandName budget");
    let out = p && p.toObject ? p.toObject() : p;
    try {
      if (out.application) {
        const a = out.application;
        out.adminComments = (out.adminComments || []).concat(
          a.adminComments || []
        );
        out.influencerComments = (out.influencerComments || []).concat(
          a.influencerComments || []
        );
      }
    } catch (e) {
      // ignore
    }
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToPayments([out], true);
    res.json(out);
  } catch (err) {
    console.error("approvePartial error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function approveRemaining(req, res) {
  const id = req.params.id;
  const reviewerId = req.user && req.user.id;
  const reviewerName = req.user && req.user.name;
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    const { comment } = req.body || {};
    // require deliverables proof verified or present
    if (!p.deliverablesProof || !p.deliverablesProof.proof) {
      return res.status(400).json({ error: "deliverables_missing" });
    }
    // mark deliverables as verified
    p.deliverablesProof.verified = true;
    p.deliverablesProof.verifiedBy = reviewerId;
    p.deliverablesProof.verifiedAt = new Date();

    if (comment) {
      pushAdminCommentToPayment(
        p,
        STAGE_PAYMENT,
        comment,
        reviewerId,
        reviewerName
      );
      try {
        if (p.application) {
          const app = await Application.findById(p.application);
          if (app) {
            app.adminComments = app.adminComments || [];
            const entry = {
              stage: STAGE_PAYMENT,
              comment,
              by: reviewerId,
              createdAt: new Date(),
            };
            if (reviewerName) entry.byName = reviewerName;
            app.adminComments.push(entry);
            app.adminComment = comment;
          }
          await app.save();
        }
      } catch (e) {
        // ignore
        // eslint-disable-next-line no-console
        console.warn(
          "approveRemaining: failed to save app admin comment",
          e && e.message
        );
      }
    }

    // mark remaining paid
    p.status = "paid";
    // record paid times
    if (
      p.partialApproval &&
      p.partialApproval.amount &&
      !p.partialApproval.paid
    ) {
      p.partialApproval.paid = true;
      p.partialApproval.paidAt = new Date();
    }
    // mark application payout as paid
    try {
      if (p.application) {
        const app = await Application.findById(p.application);
        if (app) {
          if (!app.payout) app.payout = {};
          app.payout.paid = true;
          app.payout.paidAt = new Date();
          // mark application as fully paid
          app.status = "full_payment_processed";
          await app.save();
        }
      }
    } catch (e) {
      console.warn(
        "approveRemaining: failed to update application payout",
        e && e.message
      );
    }

    await p.save();
    // attach commenter names for admin response
    await p.populate("campaign", "title brandName budget");
    let out = p && p.toObject ? p.toObject() : p;
    try {
      if (out.application) {
        const a = out.application;
        out.adminComments = (out.adminComments || []).concat(
          a.adminComments || []
        );
        out.influencerComments = (out.influencerComments || []).concat(
          a.influencerComments || []
        );
      }
    } catch (e) {
      // ignore
    }
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    if (isAdmin) await attachCommenterNamesToPayments([out], true);
    res.json(out);
  } catch (err) {
    console.error("approveRemaining error", err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = {
  listPayments,
  updatePayment,
  listMyPayments,
  submitOrderProof,
  submitDeliverables,
  approvePartial,
  approveRemaining,
};
