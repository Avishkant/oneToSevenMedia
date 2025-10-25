const User = require('../models/user')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const RefreshToken = require('../models/refreshToken')

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '1h'
const REFRESH_TOKEN_DAYS = process.env.REFRESH_TOKEN_DAYS ? Number(process.env.REFRESH_TOKEN_DAYS) : 7

function issueAccessToken(user) {
  const payload = { id: user._id, role: user.role }
  const secret = process.env.JWT_SECRET || 'change-me'
  const opts = { expiresIn: ACCESS_TOKEN_EXPIRES }
  return jwt.sign(payload, secret, opts)
}

function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex')
}

async function issueRefreshToken(user) {
  const token = generateRefreshTokenString()
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)
  const doc = new RefreshToken({ token, user: user._id, expiresAt })
  await doc.save()
  return token
}

async function register(req, res) {
  const body = req.body || {};
  const {
    name,
    email,
    password,
    role = "influencer",
    phone,
    state,
    city,
    instagram,
    followersCount,
    socialPlatforms,
    categories,
    languages,
    gender,
    dob,
    employmentStatus,
    profession,
  } = body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "missing_fields" });

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "email_in_use" });

    const user = new User({
      name,
      email,
      password,
      role,
      phone,
      state,
      city,
      instagram,
      followersCount,
      socialPlatforms,
      categories,
      languages,
      gender,
      dob,
      employmentStatus,
      profession,
    });
    await user.save();
    const accessToken = issueAccessToken(user)
    const refreshToken = await issueRefreshToken(user)
    // set cookie (httpOnly)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    })
    res.status(201).json({ id: user._id, token: accessToken, refreshToken })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "missing_fields" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "invalid_credentials" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });
    const accessToken = issueAccessToken(user)
    const refreshToken = await issueRefreshToken(user)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    })
    res.json({ id: user._id, token: accessToken, refreshToken })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
}

async function refresh(req, res) {
  const token = req.cookies && req.cookies.refreshToken ? req.cookies.refreshToken : req.body.refreshToken
  if (!token) return res.status(400).json({ error: 'missing_token' })
  try {
    const doc = await RefreshToken.findOne({ token })
    if (!doc || doc.revoked || doc.expiresAt < new Date()) return res.status(401).json({ error: 'invalid_token' })
    const user = await User.findById(doc.user)
    if (!user) return res.status(401).json({ error: 'invalid_token' })
    // rotate: revoke old and issue new
    doc.revoked = true
    await doc.save()
    const newRefresh = await issueRefreshToken(user)
    const accessToken = issueAccessToken(user)
    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    })
    res.json({ token: accessToken, refreshToken: newRefresh })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}

async function logout(req, res) {
  const token = req.cookies && req.cookies.refreshToken ? req.cookies.refreshToken : req.body.refreshToken
  try {
    if (token) {
      await RefreshToken.updateOne({ token }, { revoked: true })
    }
    res.clearCookie('refreshToken')
    res.json({ ok: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err)
    res.status(500).json({ error: 'server_error' })
  }
}

module.exports = { register, login, refresh, logout }
