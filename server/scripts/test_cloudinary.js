// Simple test to validate Cloudinary credentials by uploading an example image URL
// Usage: cd server; node scripts/test_cloudinary.js

require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error(
      "Cloudinary environment variables are missing. Check server/.env"
    );
    process.exit(1);
  }

  try {
    console.log("Uploading test image to Cloudinary...");
    // Use a small public image URL to test upload
    const testUrl =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/240px-PNG_transparency_demonstration_1.png";
    const res = await cloudinary.uploader.upload(testUrl, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "test_uploads",
    });
    console.log("Upload successful:", res.secure_url);
  } catch (err) {
    console.error(
      "Cloudinary upload failed:",
      err && err.stack ? err.stack : err
    );
    process.exit(2);
  }
}

main();
