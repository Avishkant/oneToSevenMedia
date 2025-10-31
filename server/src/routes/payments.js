const express = require("express");
const {
  listPayments,
  updatePayment,
  listMyPayments,
} = require("../controllers/paymentController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { requirePermission } = require("../middleware/permissions");

const router = express.Router();

router.get(
  "/",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("payments:view"),
  listPayments
);
router.patch(
  "/:id",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("payments:manage"),
  updatePayment
);
// influencer: list own payments
router.get("/me", auth, requireRole("influencer"), listMyPayments);

module.exports = router;
