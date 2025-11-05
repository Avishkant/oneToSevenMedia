// simple script to list Application documents that have a campaignScreenshot
// Usage: from repository root run (PowerShell):
// cd server; node scripts/check_screenshots.js

require("dotenv").config();
const mongoose = require("mongoose");
const Application = require("../src/models/application");

async function main() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    "mongodb://localhost:27017/oneToSevenMedia";
  console.log("Connecting to", uri);
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  try {
    const docs = await Application.find({
      campaignScreenshot: { $exists: true, $ne: "" },
    })
      .limit(50)
      .select("campaignScreenshot influencer campaign status createdAt")
      .populate("influencer", "name email")
      .populate("campaign", "title");

    if (!docs || docs.length === 0) {
      console.log("No applications with campaignScreenshot found.");
    } else {
      console.log(`Found ${docs.length} applications with campaignScreenshot:`);
      docs.forEach((d) => {
        console.log("---");
        console.log("appId:", d._id.toString());
        console.log(
          "campaign:",
          (d.campaign && d.campaign.title) || d.campaign
        );
        console.log(
          "influencer:",
          (d.influencer && (d.influencer.name || d.influencer.email)) ||
            d.influencer
        );
        console.log("status:", d.status);
        console.log("createdAt:", d.createdAt);
        console.log("screenshot:", d.campaignScreenshot);
      });
    }
  } catch (err) {
    console.error("Error querying applications", err);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
