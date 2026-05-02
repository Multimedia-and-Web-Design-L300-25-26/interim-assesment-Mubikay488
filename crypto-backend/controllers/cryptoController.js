import Crypto from "../models/Crypto.js";
import Wallet from "../models/Wallet.js";
import { generateMockAddress } from "../utils/wallet.js";

const SEEDED = { createdBy: null };

const getAllCrypto = async (_req, res) => {
  try {
    const coins = await Crypto.find(SEEDED).sort({ createdAt: -1 });
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getGainers = async (_req, res) => {
  try {
    const coins = await Crypto.find({ ...SEEDED, change24h: { $gt: 0 } }).sort({
      change24h: -1,
    });
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNewListings = async (_req, res) => {
  try {
    const coins = await Crypto.find(SEEDED).sort({ createdAt: -1 }).limit(20);
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addCrypto = async (req, res) => {
  try {
    const { name, symbol, price, image, change24h } = req.body;
    const userId = req.user._id;
    const symbolUp = symbol.toUpperCase();

    // Block if the user already has a wallet for this symbol (seeded or custom)
    const userAlreadyHas = await Wallet.findOne({ userId, asset: symbolUp });
    if (userAlreadyHas) {
      return res
        .status(409)
        .json({ message: `You already have a ${symbolUp} wallet` });
    }

    // Create (or reuse) the Crypto market entry scoped to this user
    let coin = await Crypto.findOne({ symbol: symbolUp, createdBy: userId });
    if (!coin) {
      coin = await Crypto.create({
        name,
        symbol: symbolUp,
        price,
        image,
        change24h,
        createdBy: userId,
      });
    }

    // Create a zero-balance custom wallet ONLY for this user
    await Wallet.create({
      userId,
      asset: symbolUp,
      balance: 0,
      address: generateMockAddress(symbolUp),
      isCustom: true,
    });

    res
      .status(201)
      .json({ message: "Cryptocurrency added to your wallet", coin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getAllCrypto, getGainers, getNewListings, addCrypto };
