const express = require("express");
const {
  apply,
  listByInfluencer,
  listAllApplications,
  approveApplication,
  rejectApplication,
  submitOrder,
  listOrders,
  approveOrder,
  rejectOrder,
} = require("../controllers/applicationController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { requirePermission } = require("../middleware/permissions");

const router = express.Router();

// apply as influencer (auth optional: influencer id may be supplied in body for tests)
router.post("/", auth, requireRole("influencer", "admin", "brand"), apply);
// admin/superadmin: list all applications
router.get(
  "/",
  auth,
  requireRole("admin", "superadmin"),
  (req, res, next) => next(),
  listAllApplications
);
// list by influencer (owner or admin)
router.get(
  "/by-influencer/:userId",
  auth,
  (req, res, next) => {
    // allow owner or admin
    if (
      req.user &&
      (req.user.id === req.params.userId || req.user.role === "admin")
    )
      return next();
    return res.status(403).json({ error: "forbidden" });
  },
  listByInfluencer
);

// admin/superadmin approval endpoints
router.post(
  "/:id/approve",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("applications:review"),
  approveApplication
);
router.post(
  "/:id/reject",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("applications:review"),
  rejectApplication
);

// influencer submits order details for an approved application
router.patch("/:id/order", auth, requireRole("influencer"), submitOrder);

// admin: list submitted orders
router.get(
  "/orders",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("orders:review"),
  listOrders
);

router.post(
  "/:id/order/approve",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("orders:review"),
  approveOrder
);

router.post(
  "/:id/order/reject",
  auth,
  requireRole("admin", "superadmin"),
  requirePermission("orders:review"),
  rejectOrder
);

module.exports = router;
