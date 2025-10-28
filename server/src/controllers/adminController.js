const User = require("../models/user");
const bcrypt = require("bcrypt");

// Helper: require a super-init secret header or existing superadmin
function allowedToCreateSuper(req) {
  const headerSecret = req.headers["x-super-init"];
  if (
    headerSecret &&
    process.env.SUPER_ADMIN_INIT &&
    headerSecret === process.env.SUPER_ADMIN_INIT
  )
    return true;
  // allow if requester is already authenticated superadmin
  if (req.user && req.user.role === "superadmin") return true;
  return false;
}

async function createSuperAdmin(req, res) {
  if (!allowedToCreateSuper(req))
    return res.status(403).json({ error: "forbidden" });
  const { name, email, password, permissions } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "missing_fields" });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "email_in_use" });
    const admin = new User({
      name,
      email,
      password,
      role: "superadmin",
      permissions,
      isSuper: true,
    });
    await admin.save();
    res.status(201).json({ id: admin._id, email: admin.email });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function createAdmin(req, res) {
  // only superadmin allowed (controller route should be protected by auth + requireRole('superadmin'))
  const { name, email, password, permissions } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: "missing_fields" });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "email_in_use" });
    const admin = new User({
      name,
      email,
      password,
      role: "admin",
      permissions,
      isSuper: false,
    });
    await admin.save();
    res.status(201).json({ id: admin._id, email: admin.email });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listAdmins(req, res) {
  try {
    const admins = await User.find({
      role: { $in: ["admin", "superadmin"] },
    }).select("-password");
    res.json(admins);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function listInfluencers(req, res) {
  try {
    const { q, category, minFollowers } = req.query || {};
    const qObj = { role: "influencer" };
    if (typeof minFollowers !== "undefined") {
      qObj.followersCount = { $gte: Number(minFollowers) };
    }
    if (category) {
      qObj.categories = category;
    }
    if (q) {
      // simple text search across name and email
      qObj.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    const users = await User.find(qObj).select("-password");
    res.json(users);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function getAdmin(req, res) {
  try {
    const admin = await User.findById(req.params.id).select("-password");
    if (!admin) return res.status(404).json({ error: "not_found" });
    res.json(admin);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function getMe(req, res) {
  try {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    // req.user comes from auth middleware and has id; fetch fresh record without password
    const me = await User.findById(req.user.id).select("-password");
    if (!me) return res.status(404).json({ error: "not_found" });
    res.json(me);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function updateAdmin(req, res) {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: "not_found" });
    const { name, permissions, password, role, isSuper } = req.body || {};
    if (name) admin.name = name;
    if (permissions) admin.permissions = permissions;
    if (role) admin.role = role;
    if (typeof isSuper !== "undefined") admin.isSuper = !!isSuper;
    if (password) {
      const saltRounds = process.env.BCRYPT_ROUNDS
        ? Number(process.env.BCRYPT_ROUNDS)
        : 10;
      const hash = await bcrypt.hash(password, saltRounds);
      admin.password = hash;
    }
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function deleteAdmin(req, res) {
  try {
    const admin = await User.findById(req.params.id);
    if (!admin) return res.status(404).json({ error: "not_found" });
    // revoke admin by demoting role or deleting
    // we'll demote to 'influencer' to keep historical data
    admin.role = "influencer";
    admin.permissions = [];
    admin.isSuper = false;
    await admin.save();
    res.json({ ok: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

module.exports = {
  createSuperAdmin,
  createAdmin,
  listAdmins,
  listInfluencers,
  getAdmin,
  getMe,
  updateAdmin,
  deleteAdmin,
};
