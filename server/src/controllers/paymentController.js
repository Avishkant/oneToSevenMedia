const Payment = require("../models/payment");
const Application = require("../models/application");
const User = require("../models/user");

async function listPayments(req, res) {
  try {
    const q = {};
    if (req.query && req.query.campaignId) q.campaign = req.query.campaignId;
    if (req.query && req.query.status) q.status = req.query.status;
    const items = await Payment.find(q)
      .populate("influencer", "name email")
      .populate("campaign", "title brandName")
      .populate("application", "status payout");
    res.json(items);
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

    res.json(p);
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
    res.json(items);
  } catch (err) {
    console.error("listMyPayments error", err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = { listPayments, updatePayment, listMyPayments };

// --- New handlers for refund_on_delivery flow ---

async function submitOrderProof(req, res) {
  const id = req.params.id;
  const userId = req.user && req.user.id;
  const { orderScreenshot, deliveredScreenshot, orderAmount } = req.body || {};
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
    // mark as pending proof
    p.status = p.status === "pending" ? "proof_submitted" : p.status;
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
  const { proof } = req.body || {};
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    if (String(p.influencer) !== String(userId))
      return res.status(403).json({ error: "forbidden" });

    p.deliverablesProof = p.deliverablesProof || {};
    if (proof) p.deliverablesProof.proof = proof;
    p.deliverablesProof.submittedAt = new Date();
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
  const { amount, payNow } = req.body || {};
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
    await p.save();
    res.json(p);
  } catch (err) {
    console.error("approvePartial error", err);
    res.status(500).json({ error: "server_error" });
  }
}

async function approveRemaining(req, res) {
  const id = req.params.id;
  const reviewerId = req.user && req.user.id;
  try {
    const p = await Payment.findById(id).populate("application");
    if (!p) return res.status(404).json({ error: "not_found" });
    // require deliverables proof verified or present
    if (!p.deliverablesProof || !p.deliverablesProof.proof) {
      return res.status(400).json({ error: "deliverables_missing" });
    }
    // mark deliverables as verified
    p.deliverablesProof.verified = true;
    p.deliverablesProof.verifiedBy = reviewerId;
    p.deliverablesProof.verifiedAt = new Date();

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
    res.json(p);
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
