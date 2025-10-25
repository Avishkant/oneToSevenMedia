function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "missing_user" });
    if (!roles.includes(user.role))
      return res.status(403).json({ error: "forbidden" });
    return next();
  };
}

module.exports = { requireRole };
