const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/models/user");

let mongod;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("auth register/login", () => {
  it("registers a user and returns token", async () => {
    const app = createApp();
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "t@example.com",
      password: "secret123",
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("token");
  });

  it("prevents duplicate emails", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send({
      name: "A",
      email: "dup@example.com",
      password: "pw",
    });
    const res = await request(app).post("/api/auth/register").send({
      name: "B",
      email: "dup@example.com",
      password: "pw2",
    });
    expect(res.status).toBe(409);
  });

  it("logs in with correct credentials", async () => {
    const app = createApp();
    await request(app).post("/api/auth/register").send({
      name: "Login",
      email: "login@example.com",
      password: "pass123",
    });
    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "pass123",
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("rejects invalid login", async () => {
    const app = createApp();
    const res = await request(app).post("/api/auth/login").send({
      email: "noone@example.com",
      password: "x",
    });
    expect(res.status).toBe(401);
  });

  it('refreshes access token using refresh token', async () => {
    const app = createApp()
    const reg = await request(app).post('/api/auth/register').send({ name: 'Ref', email: 'ref@example.com', password: 'pw' })
    expect(reg.status).toBe(201)
    const refreshToken = reg.body.refreshToken
    // call refresh
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('token')
    expect(res.body).toHaveProperty('refreshToken')
  })

  it('logout revokes refresh token', async () => {
    const app = createApp()
    const reg = await request(app).post('/api/auth/register').send({ name: 'L', email: 'l@example.com', password: 'pw' })
    const refreshToken = reg.body.refreshToken
    const res = await request(app).post('/api/auth/logout').send({ refreshToken })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    // subsequent refresh should fail
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken })
    expect(res2.status).toBe(401)
  })
});
