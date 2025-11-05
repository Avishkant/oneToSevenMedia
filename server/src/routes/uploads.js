const express = require("express");
const multer = require("multer");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;

// configure cloudinary from env (server/.env should contain keys)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough } = require("stream");
const router = express.Router();

// POST /api/uploads
// Accept a single file in field 'file' (multipart/form-data). Returns { url, public_id }
router.post("/", upload.single("file"), async (req, res) => {
  try {
    // Log incoming request for debugging (headers and basic file metadata)
    try {
      console.log("uploads: incoming request", {
        contentType: req.get("content-type"),
        authorization: req.get("authorization") ? "present" : "none",
        file: req.file
          ? {
              originalname: req.file.originalname,
              size: req.file.size,
              mimetype: req.file.mimetype,
            }
          : null,
      });
    } catch (e) {
      // ignore logging errors
    }

    // Basic validation
    if (!req.file || !req.file.buffer) {
      console.warn("uploads: missing file in request");
      return res.status(400).json({ error: "missing_file" });
    }

    // extra diagnostics: buffer length and original filename
    try {
      console.log("uploads: file diagnostics", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer ? req.file.buffer.length : 0,
      });
    } catch (e) {
      // ignore diagnostics failures
    }

    // Ensure Cloudinary config is present
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("uploads: Cloudinary credentials missing from environment");
      return res.status(500).json({ error: "cloudinary_not_configured" });
    }

    const buffer = req.file.buffer;

    // upload via upload_stream; if that fails try writing a temp file and uploading
    const streamUpload = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined },
          (error, result) => {
            if (result) return resolve(result);
            return reject(
              error || new Error("upload_stream returned no result")
            );
          }
        );
        // ensure stream errors are caught
        stream.on("error", (e) => {
          // log minimal info before rejecting
          console.warn(
            "uploads: cloudinary stream error event",
            e && e.message
          );
          reject(e);
        });
        try {
          streamifier.createReadStream(buffer).pipe(stream);
        } catch (pipeErr) {
          // streamifier or pipe could throw synchronously
          console.warn(
            "uploads: streamifier.pipe threw",
            pipeErr && pipeErr.message
          );
          return reject(pipeErr);
        }
      });

    let result;
    try {
      result = await streamUpload();
    } catch (errStream) {
      // Log the stream error and attempt a safe fallback: write to temp file and use uploader.upload
      console.warn(
        "uploads: stream upload failed, attempting tmp-file fallback",
        errStream && (errStream.stack || errStream.message)
      );
      const tmpDir = os.tmpdir();
      const tmpName = `upload-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const ext = path.extname(req.file.originalname) || ".bin";
      const tmpPath = path.join(tmpDir, tmpName + ext);
      try {
        await fs.promises.writeFile(tmpPath, buffer);
        try {
          result = await cloudinary.uploader.upload(tmpPath, {
            folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined,
          });
        } catch (uploadTmpErr) {
          console.error(
            "uploads: tmp-file upload failed",
            uploadTmpErr && (uploadTmpErr.stack || uploadTmpErr.message)
          );
          throw uploadTmpErr;
        }
      } finally {
        // best-effort cleanup
        try {
          await fs.promises.unlink(tmpPath);
        } catch (_) {}
      }
    }

    // result.secure_url contains https URL
    return res.json({
      url: result.secure_url,
      public_id: result.public_id,
      raw: result,
    });
  } catch (err) {
    // Log full error for debugging
    console.error("uploads route error", err && err.stack ? err.stack : err);
    const payload = { error: "upload_failed", detail: err && err.message };
    // include stack trace when not in production for faster debugging
    if ((process.env.NODE_ENV || "development") !== "production")
      payload.stack = err && err.stack;
    return res.status(500).json(payload);
  }
});

// POST /api/uploads/base64
// Accept JSON { filename, data } where data is a data URL or base64 string
router.post("/base64", async (req, res) => {
  try {
    const { filename, data } = req.body || {};
    if (!data) return res.status(400).json({ error: "missing_data" });

    // Ensure Cloudinary config is present
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error(
        "uploads.base64: Cloudinary credentials missing from environment"
      );
      return res.status(500).json({ error: "cloudinary_not_configured" });
    }

    // Cloudinary accepts data URLs directly
    const dataUrl = String(data).startsWith("data:")
      ? data
      : `data:application/octet-stream;base64,${data}`;
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined,
      public_id: undefined,
      resource_type: "image",
    });
    return res.json({
      url: result.secure_url,
      public_id: result.public_id,
      raw: result,
    });
  } catch (err) {
    console.error("uploads.base64 error", err && err.stack ? err.stack : err);
    const payload = { error: "upload_failed", detail: err && err.message };
    if ((process.env.NODE_ENV || "development") !== "production")
      payload.stack = err && err.stack;
    return res.status(500).json(payload);
  }
});

module.exports = router;

// Additional disk-backed upload endpoint for robustness (POST /api/uploads/disk)
// This avoids streaming by letting multer write a temp file to disk and then
// calling cloudinary.uploader.upload on that path. Useful as a fallback
// when memory/stream uploads fail in certain environments.
let diskMulter;
try {
  diskMulter = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, os.tmpdir()),
      filename: (req, file, cb) => {
        const name = `upload-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}${path.extname(file.originalname) || ""}`;
        cb(null, name);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  router.post("/disk", diskMulter.single("file"), async (req, res) => {
    try {
      console.log("uploads.disk: incoming request", {
        originalname: req.file && req.file.originalname,
        path: req.file && req.file.path,
        size: req.file && req.file.size,
      });

      if (!req.file || !req.file.path)
        return res.status(400).json({ error: "missing_file" });

      // upload using Cloudinary from disk
      const opts = {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined,
      };
      const result = await cloudinary.uploader.upload(req.file.path, opts);

      // cleanup
      try {
        await fs.promises.unlink(req.file.path);
      } catch (e) {
        console.warn(
          "uploads.disk: failed to cleanup tmp file",
          req.file.path,
          e && e.message
        );
      }

      return res.json({
        url: result.secure_url,
        public_id: result.public_id,
        raw: result,
      });
    } catch (err) {
      console.error("uploads.disk error", err && (err.stack || err.message));
      const payload = { error: "upload_failed", detail: err && err.message };
      if ((process.env.NODE_ENV || "development") !== "production")
        payload.stack = err && err.stack;
      return res.status(500).json(payload);
    }
  });
} catch (e) {
  // ignore any setup errors here but log them
  // eslint-disable-next-line no-console
  console.warn("uploads: failed to setup disk route", e && e.message);
  // fallback to memory-based multer so debug endpoints don't throw
  try {
    diskMulter = multer({ storage: multer.memoryStorage() });
  } catch (inner) {
    console.warn(
      "uploads: failed to create fallback diskMulter",
      inner && inner.message
    );
  }
}

// --- Debug endpoints for step-by-step testing ---
// 1) multipart-inspect: accept multipart file and return metadata + sample bytes
router.post(
  "/debug/multipart-inspect",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer)
        return res.status(400).json({ error: "missing_file" });
      const sample = req.file.buffer.slice(0, 256).toString("base64");
      return res.json({
        ok: true,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer.length,
        sampleBase64: sample,
      });
    } catch (err) {
      console.error(
        "uploads.debug.multipart-inspect error",
        err && (err.stack || err.message)
      );
      return res
        .status(500)
        .json({ error: "failed", detail: err && err.message });
    }
  }
);

// 2) stream-check: ensure streamifier + piping works locally (no Cloudinary call)
router.post("/debug/stream-check", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer)
      return res.status(400).json({ error: "missing_file" });
    const pass = new PassThrough();
    let received = 0;
    pass.on("data", (c) => (received += c.length));
    pass.on("end", () => {
      return res.json({ ok: true, received });
    });
    // pipe buffer into pass-through to simulate streaming consumption
    try {
      streamifier.createReadStream(req.file.buffer).pipe(pass);
    } catch (pipeErr) {
      console.error(
        "uploads.debug.stream-check pipe error",
        pipeErr && (pipeErr.stack || pipeErr.message)
      );
      return res
        .status(500)
        .json({ error: "pipe_failed", detail: pipeErr && pipeErr.message });
    }
  } catch (err) {
    console.error(
      "uploads.debug.stream-check error",
      err && (err.stack || err.message)
    );
    return res
      .status(500)
      .json({ error: "failed", detail: err && err.message });
  }
});

// 3) cloudinary-stream-test: try the Cloudinary upload_stream path and return detailed errors
router.post(
  "/debug/cloudinary-stream-test",
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer)
        return res.status(400).json({ error: "missing_file" });
      const buffer = req.file.buffer;
      const streamUpload = () =>
        new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined,
              resource_type: "image",
            },
            (error, result) => {
              if (result) return resolve(result);
              return reject(
                error || new Error("upload_stream returned no result")
              );
            }
          );
          stream.on("error", (e) => {
            console.warn(
              "uploads.debug.cloudinary-stream-test stream error",
              e && e.message
            );
            reject(e);
          });
          try {
            streamifier.createReadStream(buffer).pipe(stream);
          } catch (pipeErr) {
            console.warn(
              "uploads.debug.cloudinary-stream-test pipeErr",
              pipeErr && pipeErr.message
            );
            return reject(pipeErr);
          }
        });

      try {
        const result = await streamUpload();
        return res.json({ ok: true, result });
      } catch (e) {
        console.error(
          "uploads.debug.cloudinary-stream-test upload error",
          e && (e.stack || e.message)
        );
        return res
          .status(500)
          .json({
            error: "upload_failed",
            detail: e && e.message,
            stack: (e && e.stack) || undefined,
          });
      }
    } catch (err) {
      console.error(
        "uploads.debug.cloudinary-stream-test error",
        err && (err.stack || err.message)
      );
      return res
        .status(500)
        .json({ error: "failed", detail: err && err.message });
    }
  }
);

// 4) cloudinary-disk-test: write file to tmp and call uploader.upload (like /disk but returns diagnostic)
router.post(
  "/debug/cloudinary-disk-test",
  diskMulter.single("file"),
  async (req, res) => {
    try {
      if (!req.file || !req.file.path)
        return res.status(400).json({ error: "missing_file" });
      const tmpPath = req.file.path;
      try {
        const result = await cloudinary.uploader.upload(tmpPath, {
          folder: process.env.CLOUDINARY_UPLOAD_FOLDER || undefined,
          resource_type: "image",
        });
        return res.json({ ok: true, result });
      } catch (uploadErr) {
        console.error(
          "uploads.debug.cloudinary-disk-test uploadErr",
          uploadErr && (uploadErr.stack || uploadErr.message)
        );
        return res
          .status(500)
          .json({
            error: "upload_failed",
            detail: uploadErr && uploadErr.message,
            stack: uploadErr && uploadErr.stack,
          });
      } finally {
        try {
          await fs.promises.unlink(tmpPath);
        } catch (_) {}
      }
    } catch (err) {
      console.error(
        "uploads.debug.cloudinary-disk-test error",
        err && (err.stack || err.message)
      );
      return res
        .status(500)
        .json({ error: "failed", detail: err && err.message });
    }
  }
);
