const Payment = require("../models/payment");
const Application = require("../models/application");

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
