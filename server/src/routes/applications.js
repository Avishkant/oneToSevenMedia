const express = require("express");
const {
  apply,
  listByInfluencer,
  listAllApplications,
  approveApplication,
  rejectApplication,
} = require("../controllers/applicationController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

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
  approveApplication
);
router.post(
  "/:id/reject",
  auth,
  requireRole("admin", "superadmin"),
  rejectApplication
);

module.exports = router;
