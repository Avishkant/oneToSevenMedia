const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    brandName: { type: String, required: true },
    category: { type: String, required: true },
    followersMin: { type: Number, default: 0 },
    followersMax: { type: Number, default: 0 },
    location: { type: String },
    requirements: { type: String },
    budget: { type: Number, default: 0 },
    deliverables: [{ type: String }],
    timeline: { type: String },
    isPublic: { type: Boolean, default: true },
    // fulfillmentMethod controls whether the brand ships the product directly
    // or the influencer must order it themselves. Allowed values:
    // 'influencer' (default) - influencer places order and submits order details
    // 'brand' - brand ships product; influencer only needs to provide shipping address
    fulfillmentMethod: {
      type: String,
      enum: ["influencer", "brand"],
      default: "influencer",
    },
    // optional list of extra order fields admins want to collect for this campaign
    // examples: ['orderId','amount','size','color'] — used for rendering/exporting
    orderFormFields: [{ type: String }],
    // paymentType controls how payments for this campaign are handled
    // values: 'partial' (partial payouts), 'on_place' (when order placed),
    // 'on_completion' (after deliverables completed), 'full' (single full payout)
    paymentType: {
      type: String,
      enum: ["partial", "on_place", "on_completion", "full"],
      default: "full",
    },
    // payoutRelease controls WHEN the payout(s) are released to the influencer.
    // Options (examples):
    // - 'refund_on_delivery': order amount is refunded as order delivers and any remaining amount paid after all deliverables performed
    // - 'pay_after_deliverables': order amount + deliverables amount paid after deliverables performed
    // - 'advance_then_remaining': order amount paid in advance before order and remaining paid after deliverables performed
    payoutRelease: {
      type: String,
      enum: [
        "refund_on_delivery",
        "pay_after_deliverables",
        "advance_then_remaining",
      ],
      default: "pay_after_deliverables",
    },
    // Optional visible note for creators (public message/instructions)
    influencerComment: { type: String },
    // Internal admin-only note (not returned to influencers via UI)
    adminComment: { type: String },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
