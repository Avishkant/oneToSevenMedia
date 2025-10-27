const express = require("express");
const Campaign = require("../models/campaign");
const Application = require("../models/application");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Create a campaign (only brand, admin or superadmin)
// allow superadmin here so platform owners can create campaigns too
router.post(
  "/",
  auth,
  requireRole("admin", "brand", "superadmin"),
  async (req, res) => {
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
  }
);

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

// Update a campaign (admin/brand/superadmin)
router.patch(
  "/:id",
  auth,
  requireRole("admin", "brand", "superadmin"),
  async (req, res) => {
    try {
      const updates = req.body || {};
      // Only allow updating known fields
      const allowed = [
        "title",
        "brandName",
        "category",
        "followersMin",
        "followersMax",
        "location",
        "requirements",
        "budget",
        "deliverables",
        "timeline",
        "questions",
        "isPublic",
      ];
      const patch = {};
      allowed.forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(updates, k))
          patch[k] = updates[k];
      });
      const updated = await Campaign.findByIdAndUpdate(req.params.id, patch, {
        new: true,
      });
      if (!updated) return res.status(404).json({ error: "not_found" });
      res.json(updated);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).json({ error: "server_error" });
    }
  }
);

// Delete a campaign (only superadmin)
router.delete("/:id", auth, requireRole("superadmin"), async (req, res) => {
  try {
    const deleted = await Campaign.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "not_found" });
    // cascade delete related applications
    try {
      const result = await Application.deleteMany({ campaign: deleted._id });
      // eslint-disable-next-line no-console
      console.log(
        `Cascade-deleted ${
          result.deletedCount || 0
        } applications for campaign ${deleted._id}`
      );
    } catch (e) {
      // log but don't fail the overall operation
      // eslint-disable-next-line no-console
      console.warn(
        "Failed to cascade-delete applications for campaign",
        req.params.id,
        e
      );
    }
    res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

module.exports = router;
