const request = require("supertest");
const createApp = require("../src/app");

describe("health", () => {
  it("returns 200 and status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});
