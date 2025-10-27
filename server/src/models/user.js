const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const SALT_ROUNDS = process.env.BCRYPT_ROUNDS
  ? Number(process.env.BCRYPT_ROUNDS)
  : 10;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: "influencer" },
    // Profile fields
    phone: { type: String },
    state: { type: String },
    city: { type: String },
    instagram: { type: String },
    followersCount: { type: Number, default: 0 },
    socialPlatforms: [{ type: String }],
    // map of platform -> url
    socialProfiles: { type: Map, of: String },
    categories: [{ type: String }],
    languages: [{ type: String }],
    collaborationInterests: [{ type: String }],
    gender: { type: String },
    dob: { type: Date },
    employmentStatus: { type: String },
    profession: { type: String },
    // Admin fields
    permissions: [{ type: String }],
    isSuper: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const hash = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.password = hash;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
