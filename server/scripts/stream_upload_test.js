/*
  Usage:
    node scripts/stream_upload_test.js path/to/file.png

  This script reads a local file into a buffer and attempts to upload it to
  Cloudinary using the same upload_stream approach used by the server route.
  It prints detailed errors and success values to the console so you can
  reproduce the failing behavior from the server host.
*/

const fs = require("fs");
const path = require("path");
const streamifier = require("streamifier");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const p = process.argv[2];
  if (!p) {
    console.error("Usage: node scripts/stream_upload_test.js path/to/file");
    process.exit(2);
  }
  const filePath = path.resolve(p);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(2);
  }
  const buffer = fs.readFileSync(filePath);
  console.log("Read file", filePath, "size", buffer.length);

  const streamUpload = () =>
    new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }
      );
      stream.on("error", (e) => reject(e));
      try {
        streamifier.createReadStream(buffer).pipe(stream);
      } catch (e) {
        reject(e);
      }
    });

  try {
    const r = await streamUpload();
    console.log("Upload successful", r && r.secure_url);
  } catch (e) {
    console.error("Upload failed:", e && (e.stack || e.message));
  }
}

main();
