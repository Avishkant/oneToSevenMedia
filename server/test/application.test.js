const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const createApp = require("../src/app");
const User = require("../src/models/user");
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
  await User.deleteMany({});
  await Campaign.deleteMany({});
});

describe("applications", () => {
  it("allows influencer to apply to a campaign", async () => {
    const app = createApp();
    // create influencer
    const reg = await request(app).post("/api/auth/register").send({
      name: "Influencer",
      email: "inf@example.com",
      password: "pw123",
      role: "influencer",
    });
    const userId = reg.body.id;
    const influencerToken = reg.body.token;

    // create admin and campaign
    const adminReg = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Admin",
        email: "admin@example.com",
        password: "pw",
        role: "admin",
      });
    const adminToken = adminReg.body.token;
    const campRes = await request(app)
      .post("/api/campaigns")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Camp",
        brandName: "BrandX",
        category: "Tech",
      });
    const campaignId = campRes.body._id;

    // apply as influencer (authenticated)
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${influencerToken}`)
      .send({
        campaignId,
        answers: [{ question: "q1", answer: "a1" }],
        sampleMedia: ["http://example.com/media1.jpg"],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("campaign");
    expect(res.body).toHaveProperty("influencer");
  });
});
