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
    // snapshot of fulfillment method at approval time ('influencer' or 'brand')
    fulfillmentMethod: {
      type: String,
      enum: ["influencer", "brand"],
    },
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
      orderScreenshot: { type: String }, // main screenshot (required at submission)
      deliveredScreenshot: { type: String },
      orderAmount: { type: Number }, // Request Amount in ₹
      // additional optional analytics/links submitted by influencer
      engagementRate: { type: String },
      impressions: { type: Number },
      postLink: { type: String },
      comments: { type: String },
      reach: { type: Number },
      videoViews: { type: Number },
      reelLink: { type: String },
      storyLink: { type: String },
      feedback: { type: String },
      storyViews: { type: Number },
      storyInteractions: { type: Number },
      storyScreenshots: [{ type: String }],
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
      // optional deliverables analytics/links similar to orderProofs
      engagementRate: { type: String },
      impressions: { type: Number },
      postLink: { type: String },
      comments: { type: String },
      reach: { type: Number },
      videoViews: { type: Number },
      reelLink: { type: String },
      storyLink: { type: String },
      feedback: { type: String },
      storyViews: { type: Number },
      storyInteractions: { type: Number },
      storyScreenshots: [{ type: String }],
    },
    // admin/influencer comment history related to this payment lifecycle
    adminComments: [
      {
        comment: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        byName: { type: String },
        stage: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    influencerComments: [
      {
        comment: { type: String },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        byName: { type: String },
        stage: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
