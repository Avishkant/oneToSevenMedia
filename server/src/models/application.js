const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
    },
    influencer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [{ question: String, answer: String }],
    sampleMedia: [{ type: String }],
    status: {
      type: String,
      enum: ["applied", "reviewing", "approved", "rejected"],
      default: "applied",
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // order & payout fields
    orderId: { type: String },
    productAmount: { type: Number },
    campaignScreenshot: { type: String },
    payout: {
      amount: { type: Number },
      paid: { type: Boolean, default: false },
      paidAt: { type: Date },
      bankCode: { type: String },
      transactionRef: { type: String },
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
