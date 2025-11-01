const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    influencer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
    amount: { type: Number, default: 0 },
    totalPayout: { type: Number, default: 0 },
    paymentType: { type: String }, // e.g., partial, on_place, on_completion, full
    // snapshot of campaign payout release timing (for dashboard/processing)
    payoutRelease: { type: String },
    status: { type: String, default: "pending" }, // pending/paid/failed
    metadata: { type: Object },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
