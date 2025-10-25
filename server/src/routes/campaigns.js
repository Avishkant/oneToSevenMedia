const express = require("express");
const Campaign = require("../models/campaign");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Create a campaign (only brand or admin)
router.post("/", auth, requireRole("admin", "brand"), async (req, res) => {
  const body = req.body || {};
  const { title, brandName, category } = body;
  if (!title || !brandName || !category) {
    return res.status(400).json({ error: "missing_required_fields" });
  }
  try {
    const camp = new Campaign(body);
    await camp.save();
    res.status(201).json(camp);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// List campaigns with basic filters: category, minFollowers
router.get("/", async (req, res) => {
  try {
    const { category, minFollowers, maxFollowers, brand } = req.query;
    const q = {};
    if (category) q.category = category;
    if (brand) q.brandName = brand;
    if (minFollowers) q.followersMin = { $lte: Number(minFollowers) };
    if (maxFollowers) q.followersMax = { $gte: Number(maxFollowers) };
    const items = await Campaign.find(q).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

// Get by id
router.get("/:id", async (req, res) => {
  try {
    const item = await Campaign.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "not_found" });
    res.json(item);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
