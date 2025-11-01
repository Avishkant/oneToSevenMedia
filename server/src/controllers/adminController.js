const User = require("../models/user");
const bcrypt = require("bcrypt");
const Campaign = require("../models/campaign");
const { parse } = require("csv-parse/sync");

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

// Bulk-create campaigns from CSV (uploaded as multipart file field 'file') or JSON array in request body.
async function bulkCreateCampaigns(req, res) {
  try {
    // Input can be JSON array or uploaded CSV file
    let rows = [];
    if (req.is("application/json") && Array.isArray(req.body)) {
      rows = req.body;
    } else if (req.file && req.file.buffer) {
      // Use csv-parse to handle quoted fields and embedded commas
      const raw = req.file.buffer.toString("utf8");
      const text = raw.replace(/^\uFEFF/, ""); // strip BOM if present
      if (!text || !text.trim())
        return res.status(400).json({ error: "empty_file" });
      try {
        // parse into array of objects using header row as keys
        const parsed = parse(text, {
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
          trim: true,
        });
        if (!Array.isArray(parsed) || parsed.length === 0)
          return res.status(400).json({ error: "no_rows" });
        rows = parsed;
      } catch (parseErr) {
        // eslint-disable-next-line no-console
        console.error("csv parse error", parseErr);
        return res
          .status(400)
          .json({ error: "invalid_csv", details: parseErr.message });
      }
    } else {
      return res.status(400).json({ error: "missing_payload" });
    }

    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: "no_rows" });

    // validate and normalize rows
    const cleaned = [];
    const errors = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      const title = (r.title || r.Title || "").trim();
      const brandName = (r.brandName || r.BrandName || r.brand || "").trim();
      const category = (r.category || r.Category || "").trim();
      if (!title || !brandName || !category) {
        errors.push({
          index: i + 1,
          reason: "missing_required_fields",
          row: r,
        });
        continue;
      }
      const doc = {
        title,
        brandName,
        category,
        followersMin: r.followersMin ? Number(r.followersMin) : 0,
        followersMax: r.followersMax ? Number(r.followersMax) : 0,
        location: r.location || r.Location || undefined,
        requirements: r.requirements || r.Requirements || undefined,
        budget: r.budget ? Number(r.budget) : 0,
        deliverables: r.deliverables
          ? String(r.deliverables)
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        timeline: r.timeline || r.Timeline || undefined,
        isPublic:
          typeof r.isPublic !== "undefined"
            ? String(r.isPublic).toLowerCase() === "true"
            : true,
        // optional comments
        influencerComment:
          r.influencerComment ||
          r.InfluencerComment ||
          r.influencer_comment ||
          r.influencer ||
          undefined,
        adminComment:
          r.adminComment || r.AdminComment || r.admin_comment || undefined,
        payoutRelease:
          r.payoutRelease ||
          r.PayoutRelease ||
          r.payout_release ||
          r.payout ||
          undefined,
      };
      cleaned.push({ index: i + 1, doc });
    }

    if (cleaned.length === 0)
      return res.status(400).json({ error: "no_valid_rows", errors });

    // dedupe by title+brandName
    const keyToRow = new Map();
    cleaned.forEach((c) => {
      const key = `${c.doc.title.toLowerCase()}|${c.doc.brandName.toLowerCase()}`;
      if (!keyToRow.has(key)) keyToRow.set(key, c);
    });

    const keys = Array.from(keyToRow.keys());
    const filters = keys.map((k) => {
      const [title, brandName] = k.split("|");
      return {
        title: new RegExp(`^${escapeRegExp(title)}$`, "i"),
        brandName: new RegExp(`^${escapeRegExp(brandName)}$`, "i"),
      };
    });

    // find existing campaigns
    const existing = filters.length
      ? await Campaign.find({ $or: filters }).select("title brandName")
      : [];
    const existingSet = new Set(
      existing.map(
        (c) => `${c.title.toLowerCase()}|${c.brandName.toLowerCase()}`
      )
    );

    const toCreate = [];
    const skipped = [];
    for (const key of keys) {
      if (existingSet.has(key)) {
        skipped.push(key);
        continue;
      }
      const row = keyToRow.get(key);
      toCreate.push(row.doc);
    }

    let created = [];
    try {
      if (toCreate.length > 0) {
        created = await Campaign.insertMany(toCreate, { ordered: false });
      }
    } catch (err) {
      // insertMany may throw BulkWriteError; collect created from err.result if available
      // eslint-disable-next-line no-console
      console.error("bulk insert error", err);
      if (err && err.insertedDocs) created = err.insertedDocs;
    }

    // log summary for debugging: created ids, skipped keys, and any validation errors
    try {
      // eslint-disable-next-line no-console
      console.log("bulkCreateCampaigns summary", {
        toCreateCount: toCreate.length,
        createdCount: (created || []).length,
        createdIds: (created || []).map((c) => c && c._id).slice(0, 50),
        skippedCount: skipped.length,
        skippedKeys: skipped.slice(0, 50),
        errorsCount: errors.length,
      });
    } catch (logErr) {
      // eslint-disable-next-line no-console
      console.warn("failed to log bulkCreate summary", logErr);
    }

    return res.json({
      created: created.length || 0,
      skipped: skipped.length,
      errors,
      details: { createdIds: (created || []).map((c) => c._id) },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: err.message || "server_error" });
  }
}

// simple escaping for RegExp special chars
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  bulkCreateCampaigns,
};
