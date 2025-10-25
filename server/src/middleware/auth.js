const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ error: "missing_token" });
  const token = auth.slice(7);
  const secret = process.env.JWT_SECRET || "change-me";
  try {
    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = authMiddleware;
