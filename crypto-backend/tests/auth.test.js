/**
 * ─────────────────────────────────────────────────────────────
 *  Section 1 — Authentication System (JWT-Based)
 *   POST /register
 *   POST /login
 *
 *  Section 2 — Protected User Profile
 *   GET  /profile
 * ─────────────────────────────────────────────────────────────
 */

process.env.JWT_ACCESS_SECRET = "test-secret-access";
process.env.JWT_REFRESH_SECRET = "test-secret-refresh";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("./helpers/db");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.close());

// ─── helpers ────────────────────────────────────────────────
const VALID_USER = {
  name: "Test User",
  email: "test@example.com",
  password: "Password123",
};

/** Register and verify email so the user can log in */
const registerAndVerify = async (user = VALID_USER) => {
  const User = require("../models/User");

  const res = await request(app).post("/register").send(user);
  expect(res.statusCode).toBe(201);

  // Grab the OTP straight from the DB (no email service in tests)
  const dbUser = await User.findById(res.body.userId);
  await request(app)
    .post("/api/auth/verify-email")
    .send({ userId: res.body.userId, otp: dbUser.emailOtp });

  return res.body.userId;
};

const loginAndGetToken = async (user = VALID_USER) => {
  const res = await request(app)
    .post("/login")
    .send({ email: user.email, password: user.password });
  expect(res.statusCode).toBe(200);
  return res.body.accessToken;
};

// ════════════════════════════════════════════════════════════
//  POST /register
// ════════════════════════════════════════════════════════════
describe("POST /register", () => {
  it("201 — creates a user account with name, email, password", async () => {
    const res = await request(app).post("/register").send(VALID_USER);
    expect(res.statusCode).toBe(201);
    expect(res.body).toMatchObject({
      message: expect.stringMatching(/registration successful/i),
      userId: expect.any(String),
    });
  });

  it("stores the user in the database", async () => {
    const User = require("../models/User");
    const res = await request(app).post("/register").send(VALID_USER);
    const user = await User.findById(res.body.userId);
    expect(user).not.toBeNull();
    expect(user.email).toBe(VALID_USER.email);
    expect(user.name).toBe(VALID_USER.name);
  });

  it("does NOT store the plain-text password", async () => {
    const User = require("../models/User");
    const res = await request(app).post("/register").send(VALID_USER);
    const user = await User.findById(res.body.userId);
    expect(user.passwordHash).not.toBe(VALID_USER.password);
    expect(user.passwordHash).toMatch(/^\$2[ab]\$/); // bcrypt hash
  });

  it("409 — rejects duplicate email", async () => {
    await request(app).post("/register").send(VALID_USER);
    const res = await request(app).post("/register").send(VALID_USER);
    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already registered/i);
  });

  it("422 — rejects missing name", async () => {
    const res = await request(app)
      .post("/register")
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("422 — rejects invalid email", async () => {
    const res = await request(app)
      .post("/register")
      .send({ ...VALID_USER, email: "not-an-email" });
    expect(res.statusCode).toBe(422);
  });

  it("422 — rejects password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/register")
      .send({ ...VALID_USER, password: "short" });
    expect(res.statusCode).toBe(422);
  });
});

// ════════════════════════════════════════════════════════════
//  POST /login
// ════════════════════════════════════════════════════════════
describe("POST /login", () => {
  beforeEach(() => registerAndVerify());

  it("200 — returns a JWT access token on valid credentials", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.statusCode).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe("string");
  });

  it("200 — returns user info (no password) alongside the token", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(VALID_USER.email);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("sets an HTTP-only refreshToken cookie", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const cookies = res.headers["set-cookie"] || [];
    const rtCookie = cookies.find((c) => c.startsWith("refreshToken="));
    expect(rtCookie).toBeDefined();
    expect(rtCookie).toMatch(/HttpOnly/i);
  });

  it("401 — rejects wrong password", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: VALID_USER.email, password: "WrongPass99" });
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("401 — rejects unknown email", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "nobody@example.com", password: VALID_USER.password });
    expect(res.statusCode).toBe(401);
  });

  it("403 — rejects login before email is verified", async () => {
    // Register without verifying
    await request(app)
      .post("/register")
      .send({
        name: "Unverified",
        email: "unverified@example.com",
        password: "Password123",
      });

    const res = await request(app)
      .post("/login")
      .send({ email: "unverified@example.com", password: "Password123" });
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/verify your email/i);
  });

  it("422 — rejects missing email field", async () => {
    const res = await request(app)
      .post("/login")
      .send({ password: VALID_USER.password });
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════
//  GET /profile   (protected)
// ════════════════════════════════════════════════════════════
describe("GET /profile", () => {
  let token;

  beforeEach(async () => {
    await registerAndVerify();
    token = await loginAndGetToken();
  });

  it("200 — returns user name and email for an authenticated request", async () => {
    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.name).toBe(VALID_USER.name);
    expect(res.body.user.email).toBe(VALID_USER.email);
  });

  it("200 — response does NOT contain passwordHash or OTP fields", async () => {
    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${token}`);
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.emailOtp).toBeUndefined();
  });

  it("401 — rejects request with no token", async () => {
    const res = await request(app).get("/profile");
    expect(res.statusCode).toBe(401);
  });

  it("401 — rejects request with a tampered token", async () => {
    const res = await request(app)
      .get("/profile")
      .set("Authorization", "Bearer this.is.fake");
    expect(res.statusCode).toBe(401);
  });
});
