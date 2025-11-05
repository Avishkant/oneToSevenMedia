/*
  Usage:
    node scripts/disk_upload_test.js path/to/file.png

  This script uploads a local file to Cloudinary using uploader.upload (disk path).
*/
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  const p = process.argv[2];
  if (!p) {
    console.error("Usage: node scripts/disk_upload_test.js path/to/file");
    process.exit(2);
  }
  const filePath = path.resolve(p);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(2);
  }

  try {
    const r = await cloudinary.uploader.upload(filePath, {
      resource_type: "image",
    });
    console.log("Upload successful", r && r.secure_url);
  } catch (e) {
    console.error("Upload failed:", e && (e.stack || e.message));
  }
}

main();
