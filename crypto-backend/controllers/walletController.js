const Wallet = require("../models/Wallet");
const Crypto = require("../models/Crypto");
const { generateMockAddress } = require("../utils/wallet");

const syncWalletsForUser = async (userId) => {
  const [seededCoins, existingWallets] = await Promise.all([
    Crypto.find({ createdBy: null }, "symbol").lean(),
    Wallet.find({ userId, isCustom: { $ne: true } }, "asset").lean(),
  ]);
  const existingSet = new Set(existingWallets.map((w) => w.asset));
  const missing = seededCoins.filter((c) => !existingSet.has(c.symbol));
  if (!missing.length) return;

  await Wallet.insertMany(
    missing.map((c) => ({
      userId,
      asset: c.symbol,
      balance: 0,
      address: generateMockAddress(c.symbol),
    })),
    { ordered: false },
  );
};

const getBalances = async (req, res) => {
  try {
    await syncWalletsForUser(req.user._id);

    const wallets = await Wallet.find({ userId: req.user._id });

    const symbols = wallets.map((w) => w.asset);
    const cryptos = await Crypto.find({ symbol: { $in: symbols } });
    const cryptoMap = Object.fromEntries(cryptos.map((c) => [c.symbol, c]));

    const enriched = wallets.map((w) => {
      const meta = cryptoMap[w.asset] || {};
      const price = meta.price ?? 0;
      return {
        _id: w._id,
        symbol: w.asset,
        name: meta.name ?? w.asset,
        image: meta.image ?? "",
        balance: w.balance,
        price,
        usdValue: parseFloat((w.balance * price).toFixed(2)),
        address: w.address,
      };
    });

    res.json({ wallets: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAddress = async (req, res) => {
  try {
    const asset = req.params.asset.toUpperCase();
    let wallet = await Wallet.findOne({ userId: req.user._id, asset });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: req.user._id,
        asset,
        balance: 0,
        address: generateMockAddress(asset),
      });
    }

    res.json({ asset: wallet.asset, address: wallet.address });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPortfolioSummary = async (req, res) => {
  try {
    const wallets = await Wallet.find({ userId: req.user._id });

    const symbols = wallets.map((w) => w.asset);
    const cryptos = await Crypto.find({ symbol: { $in: symbols } });
    const cryptoMap = Object.fromEntries(cryptos.map((c) => [c.symbol, c]));

    let totalBalance = 0;
    let weightedChange = 0;

    const breakdown = wallets.map((w) => {
      const meta = cryptoMap[w.asset] || {};
      const price = meta.price ?? 0;
      const change = meta.change24h ?? 0;
      const valueUsd = w.balance * price;
      totalBalance += valueUsd;
      weightedChange += valueUsd * change;
      return {
        asset: w.asset,
        name: meta.name ?? w.asset,
        image: meta.image ?? "",
        balance: w.balance,
        priceUsd: price,
        change24h: change,
        valueUsd: parseFloat(valueUsd.toFixed(2)),
      };
    });

    const change24h =
      totalBalance > 0
        ? parseFloat((weightedChange / totalBalance).toFixed(4))
        : 0;

    const holdings = breakdown.filter((b) => b.balance > 0);

    res.json({
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      change24h,
      assetCount: holdings.length,
      breakdown: holdings,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getBalances, getAddress, getPortfolioSummary };
