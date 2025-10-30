const express = require("express");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { requirePermission } = require("../middleware/permissions");
const multer = require("multer");

// use memory storage for CSV uploads
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// Create superadmin: allowed if header X-SUPER-INIT matches env or caller is already superadmin
router.post("/create-super", adminController.createSuperAdmin);

// Superadmin-only endpoints
router.post("/", auth, requireRole("superadmin"), adminController.createAdmin);
router.get("/", auth, requireRole("superadmin"), adminController.listAdmins);
router.get(
  "/influencers",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("influencers:view"),
  adminController.listInfluencers
);
// return the authenticated admin's profile (admin or superadmin)
router.get(
  "/me",
  auth,
  requireRole("admin", "superadmin"),
  adminController.getMe
);
router.get("/:id", auth, requireRole("superadmin"), adminController.getAdmin);
router.patch(
  "/:id",
  auth,
  requireRole("superadmin"),
  adminController.updateAdmin
);
router.delete(
  "/:id",
  auth,
  requireRole("superadmin"),
  adminController.deleteAdmin
);

// Bulk create campaigns via CSV upload or JSON array
// Field: file (CSV) OR JSON body [{...}, ...]
router.post(
  "/campaigns/bulk-create",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("campaign:create"),
  upload.single("file"),
  adminController.bulkCreateCampaigns
);

module.exports = router;
