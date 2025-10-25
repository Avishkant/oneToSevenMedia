const express = require("express");
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Create superadmin: allowed if header X-SUPER-INIT matches env or caller is already superadmin
router.post("/create-super", adminController.createSuperAdmin);

// Superadmin-only endpoints
router.post("/", auth, requireRole("superadmin"), adminController.createAdmin);
router.get("/", auth, requireRole("superadmin"), adminController.listAdmins);
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

module.exports = router;
