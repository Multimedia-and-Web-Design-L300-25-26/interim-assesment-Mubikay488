const Crypto = require('../models/Crypto');

const getAllCrypto = async (_req, res) => {
  try {
    const coins = await Crypto.find().sort({ createdAt: -1 });
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getGainers = async (_req, res) => {
  try {
    const coins = await Crypto.find({ change24h: { $gt: 0 } }).sort({ change24h: -1 });
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getNewListings = async (_req, res) => {
  try {
    const coins = await Crypto.find().sort({ createdAt: -1 }).limit(20);
    res.json({ coins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addCrypto = async (req, res) => {
  try {
    const { name, symbol, price, image, change24h } = req.body;

    const existing = await Crypto.findOne({ symbol: symbol.toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: `${symbol.toUpperCase()} already exists` });
    }

    const coin = await Crypto.create({ name, symbol, price, image, change24h });
    res.status(201).json({ message: 'Cryptocurrency added successfully', coin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAllCrypto, getGainers, getNewListings, addCrypto };
