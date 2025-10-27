const User = require("../models/user");

async function getMe(req, res) {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ error: "missing_token" });
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json(user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function getById(req, res) {
  try {
    const id = req.params.id;
    const user = await User.findById(id).select("-password");
    if (!user) return res.status(404).json({ error: "not_found" });
    res.json(user);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function updateMe(req, res) {
  try {
    const id = req.user && req.user.id;
    if (!id) return res.status(401).json({ error: "missing_token" });
    const updates = req.body || {};
    // only allow safe fields
    const allowed = [
      "name",
      "phone",
      "state",
      "city",
      "instagram",
      "followersCount",
      "socialPlatforms",
      "socialProfiles",
      "categories",
      "languages",
      "collaborationInterests",
      "gender",
      "dob",
      "employmentStatus",
      "profession",
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(updates, k))
        patch[k] = updates[k];
    });
    const updated = await User.findByIdAndUpdate(id, patch, {
      new: true,
    }).select("-password");
    if (!updated) return res.status(404).json({ error: "not_found" });
    res.json(updated);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = { getMe, getById, updateMe };
