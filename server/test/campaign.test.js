const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const createApp = require("../src/app");
const Campaign = require("../src/models/campaign");

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await Campaign.deleteMany({});
});

describe("campaigns", () => {
  it("creates a campaign", async () => {
    const app = createApp();
    // register admin to obtain token
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "pw",
        role: "admin",
      });
    const token = reg.body.token;

    const res = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Test Campaign",
        brandName: "Brand A",
        category: "Fashion",
        followersMin: 1000,
        followersMax: 10000,
        budget: 500,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("title", "Test Campaign");
  });

  it("rejects missing required fields", async () => {
    const app = createApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin2",
        email: "admin2@example.com",
        password: "pw",
        role: "admin",
      });
    const token = reg.body.token;
    const res = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Missing Brand",
      });
    expect(res.status).toBe(400);
  });

  it("lists campaigns and filters by category", async () => {
    const app = createApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin3",
        email: "admin3@example.com",
        password: "pw",
        role: "admin",
      });
    const token = reg.body.token;
    await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "C1",
        brandName: "B1",
        category: "Tech",
      });
    await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "C2",
        brandName: "B2",
        category: "Fashion",
      });
    const res = await request(app)
      .get("/api/campaigns")
      .query({ category: "Fashion" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toHaveProperty("category", "Fashion");
  });
});
