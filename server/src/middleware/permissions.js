const User = require("../models/user");

function requirePermission(...perms) {
  return async (req, res, next) => {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: "missing_user" });
    // superadmin bypass
    if (userInfo.role === "superadmin") return next();

    try {
      const user = await User.findById(userInfo.id).select("permissions role");
      if (!user) return res.status(401).json({ error: "missing_user" });
      // If user is brand, don't enforce admin permissions here
      if (user.role === "brand") return next();
      const haveAny = perms.some((p) => (user.permissions || []).includes(p));
      if (!haveAny) return res.status(403).json({ error: "forbidden" });
      return next();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: "server_error" });
    }
  };
}

module.exports = { requirePermission };
