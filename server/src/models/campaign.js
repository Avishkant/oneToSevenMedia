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
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Campaign || mongoose.model("Campaign", campaignSchema);
