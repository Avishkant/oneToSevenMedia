const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const createApp = require("../src/app");

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
  // clear users and campaigns
  await mongoose.connection.collection("users").deleteMany({});
  await mongoose.connection.collection("campaigns").deleteMany({});
});

describe("auth protection", () => {
  it("rejects unauthenticated campaign creation", async () => {
    const app = createApp();
    const res = await request(app)
      .post("/api/campaigns")
      .send({ title: "x", brandName: "b", category: "c" });
    expect(res.status).toBe(401);
  });

  it("rejects influencer creating campaign", async () => {
    const app = createApp();
    // register influencer
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "I",
        email: "i@example.com",
        password: "pw",
        role: "influencer",
      });
    const token = reg.body.token;
    const res = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "x", brandName: "b", category: "c" });
    expect(res.status).toBe(403);
  });

  it("allows admin to create campaign", async () => {
    const app = createApp();
    const reg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "A",
        email: "a@example.com",
        password: "pw",
        role: "admin",
      });
    const token = reg.body.token;
    const res = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "x", brandName: "b", category: "c" });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
  });
});
