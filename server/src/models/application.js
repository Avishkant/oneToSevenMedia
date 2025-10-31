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
    applicantComment: { type: String },
    followersAtApply: { type: Number },
    status: {
      type: String,
      // include order lifecycle statuses used by the controllers
      enum: [
        "applied",
        "reviewing",
        "approved",
        "rejected",
        "order_submitted",
        "completed",
      ],
      default: "applied",
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // order & payout fields
    orderId: { type: String },
    productAmount: { type: Number },
    campaignScreenshot: { type: String },
    // For brand-delivered campaigns, store the shipping address provided by influencer
    shippingAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String },
      phone: { type: String },
    },
    // snapshot of the campaign's fulfillment method at approval time
    // 'influencer' = influencer orders themselves, 'brand' = brand ships
    fulfillmentMethod: {
      type: String,
      enum: ["influencer", "brand"],
    },
    // snapshot of any per-campaign order fields to validate/order UI
    orderFormFields: [{ type: String }],
    // flexible object to store arbitrary order-related fields (per-campaign)
    orderData: { type: Object },
    payout: {
      amount: { type: Number },
      paid: { type: Boolean, default: false },
      paidAt: { type: Date },
      bankCode: { type: String },
      transactionRef: { type: String },
    },
    rejectionReason: { type: String },
    adminComment: { type: String },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
