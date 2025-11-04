const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const campaignRoutes = require("./routes/campaigns");
const applicationRoutes = require("./routes/applications");
const adminRoutes = require("./routes/admins");
const userRoutes = require("./routes/users");
let uploadRoutes;
try {
  // uploads route is optional in some checkouts (it may be an untracked helper). Try to load it
  // and continue without failing if it's absent.
  uploadRoutes = require("./routes/uploads");
} catch (err) {
  if (err && err.code === "MODULE_NOT_FOUND") {
    // eslint-disable-next-line no-console
    console.warn(
      "Optional route './routes/uploads' not found — continuing without uploads route."
    );
    uploadRoutes = null;
  } else {
    // if it's a different error, rethrow so it's visible during dev
    throw err;
  }
}

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
    // Ensure preflight OPTIONS requests are handled for all routes (important for some hosts/proxies)
    app.options("*", cors({ origin: frontendOrigin, credentials: true }));
  } else {
    // If FRONTEND_URL is not set, fall back to permissive CORS but warn loudly — prefer explicit env in deployments.
    // eslint-disable-next-line no-console
    console.warn(
      "FRONTEND_URL not set in environment; CORS will allow all origins. Set FRONTEND_URL in server/.env to restrict access."
    );
    app.use(cors());
    // Also ensure OPTIONS are accepted when using permissive CORS
    app.options("*", cors());
  }
  // Increase JSON body size to allow base64 upload fallbacks for images
  app.use(express.json({ limit: "10mb" }));

  // health - return 200 only when app is running and (optionally) DB is connected
  app.get("/api/health", (_req, res) => {
    const env = process.env.NODE_ENV || "development";
    // If MONGO_URI is configured, ensure we report DB connectivity.
    if (process.env.MONGO_URI) {
      const state = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
      if (state === 1) {
        return res.json({ status: "ok", env });
      }
      // DB is not connected — surface 503 so load balancers/monitoring see it's unhealthy
      return res.status(503).json({ status: "unavailable", env, db: false });
    }

    // No DB expected in this environment — return ok
    return res.json({ status: "ok", env });
  });

  // mount auth routes
  app.use("/api/auth", authRoutes);
  // mount campaign routes
  app.use("/api/campaigns", campaignRoutes);
  // mount application routes
  app.use("/api/applications", applicationRoutes);
  // mount admin routes
  app.use("/api/admins", adminRoutes);
  // mount payments routes (admin payment dashboard)
  const paymentRoutes = require("./routes/payments");
  app.use("/api/payments", paymentRoutes);
  // mount user routes
  app.use("/api/users", userRoutes);
  // uploads (server-side Cloudinary uploads) — mount only if the route module was loaded
  if (uploadRoutes) {
    app.use("/api/uploads", uploadRoutes);
  }

  // Global error handler to return JSON for common middleware errors (e.g., multer file size limits)
  // This should be the last middleware so it can catch errors from routes/middlewares above.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    try {
      // Multer file size exceed error
      if (err && err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({
            error: "file_too_large",
            detail: "File exceeds maximum allowed size",
          });
      }
      // Other known multer errors
      if (err && err.name === "MulterError") {
        return res
          .status(400)
          .json({ error: "upload_error", detail: err.message });
      }
      // Generic handler
      console.error(
        "Unhandled error in request pipeline",
        err && err.stack ? err.stack : err
      );
      return res
        .status(500)
        .json({
          error: "server_error",
          detail: (err && err.message) || "unexpected error",
        });
    } catch (e) {
      // fallback
      console.error("Error in error handler", e && e.stack ? e.stack : e);
      return res.status(500).json({ error: "server_error" });
    }
  });

  return app;
}

module.exports = createApp;
