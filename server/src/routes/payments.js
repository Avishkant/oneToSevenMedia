const express = require("express");
const {
  listPayments,
  updatePayment,
  listMyPayments,
  submitOrderProof,
  submitDeliverables,
  approvePartial,
  approveRemaining,
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

// influencer submits order proof (order ss and delivered ss) for refund_on_delivery flows
router.post(
  "/:id/submit-order-proof",
  auth,
  requireRole("influencer"),
  submitOrderProof
);

// influencer submits deliverables proof after performing deliverables
router.post(
  "/:id/submit-deliverables",
  auth,
  requireRole("influencer"),
  submitDeliverables
);

// admin approves partial payout (for refund_on_delivery)
router.post(
  "/:id/approve-partial",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("payments:manage"),
  approvePartial
);

// admin approves remaining payout after deliverables verification
router.post(
  "/:id/approve-remaining",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("payments:manage"),
  approveRemaining
);

module.exports = router;
