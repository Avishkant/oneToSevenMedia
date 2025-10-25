const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const campaignRoutes = require("./routes/campaigns");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admins");

function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  // health
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV || "development" });
  });

  // mount auth routes
  app.use("/api/auth", authRoutes);
  // mount campaign routes
  app.use("/api/campaigns", campaignRoutes);
  // mount application routes
  app.use("/api/applications", applicationRoutes);
  // mount admin routes
  app.use("/api/admins", adminRoutes);

  return app;
}

module.exports = createApp;
