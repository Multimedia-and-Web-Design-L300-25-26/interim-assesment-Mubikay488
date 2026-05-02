/**
 * ─────────────────────────────────────────────────────────────
 *  Section 3 — Crypto Data Integration
 *   GET  /crypto          (all tradable cryptocurrencies)
 *   GET  /crypto/gainers  (top gainers)
 *   GET  /crypto/new      (new listings)
 *   POST /crypto          (add new cryptocurrency — auth required)
 * ─────────────────────────────────────────────────────────────
 */

process.env.JWT_ACCESS_SECRET = "test-secret-access";
process.env.JWT_REFRESH_SECRET = "test-secret-refresh";
process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../app");
const db = require("./helpers/db");
const Crypto = require("../models/Crypto");

beforeAll(() => db.connect());
afterEach(() => db.clear());
afterAll(() => db.close());

// ─── helpers ────────────────────────────────────────────────
const VALID_USER = {
  name: "Crypto Tester",
  email: "crypto@example.com",
  password: "Password123",
};

const getAuthToken = async () => {
  const User = require("../models/User");

  const regRes = await request(app).post("/register").send(VALID_USER);
  const dbUser = await User.findById(regRes.body.userId);

  await request(app)
    .post("/api/auth/verify-email")
    .send({ userId: regRes.body.userId, otp: dbUser.emailOtp });

  const loginRes = await request(app)
    .post("/login")
    .send({ email: VALID_USER.email, password: VALID_USER.password });

  return loginRes.body.accessToken;
};

/** Seed coins directly into DB (bypasses auth for read-only tests) */
const seedCoins = () =>
  Crypto.insertMany([
    { name: "Bitcoin", symbol: "BTC", price: 60000, change24h: 3.5 },
    { name: "Ethereum", symbol: "ETH", price: 3000, change24h: -1.2 },
    { name: "Solana", symbol: "SOL", price: 140, change24h: 8.0 },
    { name: "Cardano", symbol: "ADA", price: 0.45, change24h: 0 },
  ]);

// ════════════════════════════════════════════════════════════
//  GET /crypto
// ════════════════════════════════════════════════════════════
describe("GET /crypto", () => {
  it("200 — returns an array of all cryptocurrencies", async () => {
    await seedCoins();
    const res = await request(app).get("/crypto");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.coins)).toBe(true);
    expect(res.body.coins).toHaveLength(4);
  });

  it("each coin includes name, symbol, price", async () => {
    await seedCoins();
    const res = await request(app).get("/crypto");
    const coin = res.body.coins[0];
    expect(coin).toHaveProperty("name");
    expect(coin).toHaveProperty("symbol");
    expect(coin).toHaveProperty("price");
  });

  it("200 — returns empty array when no coins exist", async () => {
    const res = await request(app).get("/crypto");
    expect(res.statusCode).toBe(200);
    expect(res.body.coins).toHaveLength(0);
  });

  it("200 — public endpoint requires no authentication", async () => {
    const res = await request(app).get("/crypto");
    expect(res.statusCode).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
//  GET /crypto/gainers
// ════════════════════════════════════════════════════════════
describe("GET /crypto/gainers", () => {
  beforeEach(() => seedCoins());

  it("200 — returns only coins with positive 24h change", async () => {
    const res = await request(app).get("/crypto/gainers");
    expect(res.statusCode).toBe(200);
    const allPositive = res.body.coins.every((c) => c.change24h > 0);
    expect(allPositive).toBe(true);
  });

  it("sorts results highest change first", async () => {
    const res = await request(app).get("/crypto/gainers");
    const changes = res.body.coins.map((c) => c.change24h);
    const sorted = [...changes].sort((a, b) => b - a);
    expect(changes).toEqual(sorted);
  });

  it("does NOT include coins with zero or negative 24h change", async () => {
    const res = await request(app).get("/crypto/gainers");
    const symbols = res.body.coins.map((c) => c.symbol);
    expect(symbols).not.toContain("ETH"); // -1.2
    expect(symbols).not.toContain("ADA"); // 0
  });

  it("200 — public endpoint requires no authentication", async () => {
    const res = await request(app).get("/crypto/gainers");
    expect(res.statusCode).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
//  GET /crypto/new
// ════════════════════════════════════════════════════════════
describe("GET /crypto/new", () => {
  it("200 — returns newly added coins sorted newest first", async () => {
    // Insert with small delay so createdAt differs
    await Crypto.create({
      name: "OldCoin",
      symbol: "OLD",
      price: 1,
      change24h: 0,
    });
    await new Promise((r) => setTimeout(r, 10));
    await Crypto.create({
      name: "NewCoin",
      symbol: "NEW",
      price: 2,
      change24h: 0,
    });
    await new Promise((r) => setTimeout(r, 10));
    await Crypto.create({
      name: "Newest",
      symbol: "NST",
      price: 3,
      change24h: 0,
    });

    const res = await request(app).get("/crypto/new");
    expect(res.statusCode).toBe(200);
    expect(res.body.coins[0].symbol).toBe("NST");
    expect(res.body.coins[res.body.coins.length - 1].symbol).toBe("OLD");
  });

  it("limits response to max 20 coins", async () => {
    const batch = Array.from({ length: 25 }, (_, i) => ({
      name: `Coin${i}`,
      symbol: `C${String(i).padStart(2, "0")}`,
      price: i + 1,
      change24h: 0,
    }));
    await Crypto.insertMany(batch);
    const res = await request(app).get("/crypto/new");
    expect(res.body.coins.length).toBeLessThanOrEqual(20);
  });

  it("200 — public endpoint requires no authentication", async () => {
    const res = await request(app).get("/crypto/new");
    expect(res.statusCode).toBe(200);
  });
});

// ════════════════════════════════════════════════════════════
//  POST /crypto
// ════════════════════════════════════════════════════════════
describe("POST /crypto", () => {
  let token;
  beforeEach(async () => {
    token = await getAuthToken();
  });

  const NEW_COIN = {
    name: "DogeCoin",
    symbol: "DOGE",
    price: 0.12,
    change24h: 5.5,
    image: "https://example.com/doge.png",
  };

  it("201 — creates a new cryptocurrency and stores it in the database", async () => {
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_COIN);

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/added/i);

    const saved = await Crypto.findOne({ symbol: "DOGE" });
    expect(saved).not.toBeNull();
    expect(saved.name).toBe("DogeCoin");
    expect(saved.price).toBe(0.12);
  });

  it("201 — coin symbol is stored uppercased", async () => {
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...NEW_COIN, symbol: "doge" });

    expect(res.statusCode).toBe(201);
    const saved = await Crypto.findOne({ symbol: "DOGE" });
    expect(saved).not.toBeNull();
  });

  it("stores name, symbol, price, image, and change24h", async () => {
    await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_COIN);

    const saved = await Crypto.findOne({ symbol: "DOGE" });
    expect(saved.name).toBe(NEW_COIN.name);
    expect(saved.price).toBe(NEW_COIN.price);
    expect(saved.change24h).toBe(NEW_COIN.change24h);
    expect(saved.image).toBe(NEW_COIN.image);
  });

  it("creates a wallet for the adding user only (isCustom = true)", async () => {
    const Wallet = require("../models/Wallet");
    await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_COIN);

    const wallets = await Wallet.find({ asset: "DOGE" });
    expect(wallets).toHaveLength(1);
    expect(wallets[0].isCustom).toBe(true);
    expect(wallets[0].balance).toBe(0);
  });

  it("409 — rejects adding a symbol the user already has", async () => {
    await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_COIN);

    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(NEW_COIN);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already have/i);
  });

  it("422 — rejects missing name", async () => {
    const { name, ...rest } = NEW_COIN;
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(rest);
    expect(res.statusCode).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it("422 — rejects missing symbol", async () => {
    const { symbol, ...rest } = NEW_COIN;
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(rest);
    expect(res.statusCode).toBe(422);
  });

  it("422 — rejects price of zero", async () => {
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...NEW_COIN, price: 0 });
    expect(res.statusCode).toBe(422);
  });

  it("422 — rejects negative price", async () => {
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...NEW_COIN, price: -5 });
    expect(res.statusCode).toBe(422);
  });

  it("422 — rejects invalid image URL", async () => {
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...NEW_COIN, image: "not-a-url" });
    expect(res.statusCode).toBe(422);
  });

  it("201 — image field is optional", async () => {
    const { image, ...rest } = NEW_COIN;
    const res = await request(app)
      .post("/crypto")
      .set("Authorization", `Bearer ${token}`)
      .send(rest);
    expect(res.statusCode).toBe(201);
  });

  it("401 — rejects unauthenticated requests", async () => {
    const res = await request(app).post("/crypto").send(NEW_COIN);
    expect(res.statusCode).toBe(401);
  });
});
