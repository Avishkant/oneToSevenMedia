const Application = require("../models/application");
const Campaign = require("../models/campaign");
const User = require("../models/user");

// admin actions
async function approveApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "approved";
    app.reviewer = reviewerId;
    if (comment) app.adminComment = comment;
    // record payout as approved (not paid yet)
    if (!app.payout) app.payout = {};
    app.payout.amount = app.payout.amount || 0;
    await app.save();
    res.json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function rejectApplication(req, res) {
  const appId = req.params.id;
  const reviewerId = req.user && req.user.id;
  const { reason } = req.body || {};
  const { comment } = req.body || {};
  try {
    const app = await Application.findById(appId);
    if (!app) return res.status(404).json({ error: "not_found" });
    app.status = "rejected";
    app.reviewer = reviewerId;
    app.rejectionReason = reason;
    if (comment) app.adminComment = comment;
    await app.save();
    res.json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function apply(req, res) {
  const userId = req.body.influencer || (req.user && req.user.id);
  const { campaignId, answers, sampleMedia, followersCount } = req.body || {};
  if (!campaignId || !userId)
    return res.status(400).json({ error: "missing_fields" });
  try {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) return res.status(404).json({ error: "campaign_not_found" });
    const influencer = await User.findById(userId);
    if (!influencer) return res.status(404).json({ error: "user_not_found" });
    // prevent duplicate applications from same influencer to same campaign
    // allow re-apply only if previous application was rejected
    const existing = await Application.findOne({
      campaign: campaignId,
      influencer: userId,
    });
    if (existing && existing.status !== "rejected")
      return res.status(409).json({ error: "already_applied" });
    const app = new Application({
      campaign: campaignId,
      influencer: userId,
      answers,
      sampleMedia,
      followersAtApply: followersCount ? Number(followersCount) : undefined,
    });
    await app.save();
    res.status(201).json(app);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listByInfluencer(req, res) {
  const userId = req.params.userId || (req.user && req.user.id);
  if (!userId) return res.status(400).json({ error: "missing_user" });
  try {
    const items = await Application.find({ influencer: userId }).populate(
      "campaign"
    );
    res.json(items);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listAllApplications(req, res) {
  try {
    const items = await Application.find({})
      .populate("campaign")
      .populate("influencer", "name email");
    res.json(items);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = {
  apply,
  listByInfluencer,
  listAllApplications,
  approveApplication,
  rejectApplication,
};
