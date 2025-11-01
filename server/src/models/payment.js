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
    status: {
      type: String,
      enum: [
        "pending",
        "proof_submitted",
        "proof_rejected",
        "deliverables_submitted",
        "partial_approved",
        "paid",
        "failed",
      ],
      default: "pending",
    },
    metadata: { type: Object },
    // proofs and partial payout bookkeeping for refund_on_delivery flow
    orderProofs: {
      orderScreenshot: { type: String },
      deliveredScreenshot: { type: String },
      orderAmount: { type: Number },
      submittedAt: { type: Date },
    },
    partialApproval: {
      amount: { type: Number },
      approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      approvedAt: { type: Date },
      paid: { type: Boolean, default: false },
      paidAt: { type: Date },
    },
    deliverablesProof: {
      proof: { type: String },
      submittedAt: { type: Date },
      verified: { type: Boolean, default: false },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      verifiedAt: { type: Date },
    },
    // admin/influencer comment history related to this payment lifecycle
    adminComments: [
      {
        comment: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        stage: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    influencerComments: [
      {
        comment: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        stage: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
