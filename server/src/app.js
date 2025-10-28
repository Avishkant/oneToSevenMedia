const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/auth");
const campaignRoutes = require("./routes/campaigns");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admins");
const userRoutes = require("./routes/users");

function createApp() {
  const app = express();
  app.use(helmet());
  // Enable CORS and restrict origin to the FRONTEND_URL defined in server/.env
  // Do not hard-code an origin here; require it to be set in environment for explicit control.
  const frontendOrigin = process.env.FRONTEND_URL;
  if (frontendOrigin) {
    app.use(
      cors({
        origin: frontendOrigin,
        credentials: true,
      })
    );
  } else {
    // If FRONTEND_URL is not set, fall back to permissive CORS but warn loudly — prefer explicit env in deployments.
    // eslint-disable-next-line no-console
    console.warn(
      "FRONTEND_URL not set in environment; CORS will allow all origins. Set FRONTEND_URL in server/.env to restrict access."
    );
    app.use(cors());
  }
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
  // mount user routes
  app.use("/api/users", userRoutes);

  return app;
}

module.exports = createApp;
