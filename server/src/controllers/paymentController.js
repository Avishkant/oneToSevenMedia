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
      .populate("campaign", "title brandName")
      .populate("application", "status payout");
    // Attach commenter names for admin viewers
    const isAdmin = req.user && ["admin", "superadmin"].includes(req.user.role);
    const objs = (items || []).map((i) => (i && i.toObject ? i.toObject() : i));
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

    if (typeof status !== "undefined") p.status = status;
    if (typeof metadata !== "undefined") p.metadata = metadata;

    await p.save();

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
    const out = p && p.toObject ? p.toObject() : p;
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
      .populate("campaign", "title brandName")
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
  const { orderScreenshot, deliveredScreenshot, orderAmount, comment } =
    req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    if (String(p.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });

    p.orderProofs = p.orderProofs || {};
    if (orderScreenshot) p.orderProofs.orderScreenshot = orderScreenshot;
    if (deliveredScreenshot)
      p.orderProofs.deliveredScreenshot = deliveredScreenshot;
    if (typeof orderAmount !== "undefined")
      p.orderProofs.orderAmount = Number(orderAmount);
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
  const { proof, comment } = req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    if (String(p.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });

    p.deliverablesProof = p.deliverablesProof || {};
    if (proof) p.deliverablesProof.proof = proof;
    p.deliverablesProof.submittedAt = new Date();
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
    const out = p && p.toObject ? p.toObject() : p;
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
    const out = p && p.toObject ? p.toObject() : p;
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
