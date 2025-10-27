const express = require("express");
const { getMe, getById, updateMe } = require("../controllers/userController");
const auth = require("../middleware/auth");

const router = express.Router();

// protected: get current user
router.get("/me", auth, getMe);
// update current user
router.patch("/me", auth, updateMe);

// public: get user by id (public profile)
router.get("/:id", getById);

module.exports = router;
