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
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
