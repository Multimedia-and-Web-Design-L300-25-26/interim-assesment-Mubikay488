const Wallet = require("../models/Wallet");
const Crypto = require("../models/Crypto");
const Transaction = require("../models/Transaction");
const { generateMockAddress } = require("../utils/wallet");

const SWAP_FEE_PERCENT = 0.25;

const getPriceMap = async (symbols) => {
  const coins = await Crypto.find({ symbol: { $in: symbols } }, "symbol price");
  return Object.fromEntries(coins.map((c) => [c.symbol, c.price]));
};

const getQuote = async (req, res) => {
  try {
    const { from, to, amount } = req.query;
    if (!from || !to || !amount) {
      return res
        .status(400)
        .json({ message: "from, to, and amount are required" });
    }

    const priceMap = await getPriceMap([from.toUpperCase(), to.toUpperCase()]);
    const fromPrice = priceMap[from.toUpperCase()];
    const toPrice = priceMap[to.toUpperCase()];

    if (!fromPrice || !toPrice) {
      return res.status(400).json({ message: "Unsupported asset pair" });
    }

    const fromAmt = parseFloat(amount);
    const fromUsd = fromAmt * fromPrice;
    const feeUsd = (fromUsd * SWAP_FEE_PERCENT) / 100;
    const toAmount = (fromUsd - feeUsd) / toPrice;

    res.json({
      quote: {
        fromAsset: from.toUpperCase(),
        toAsset: to.toUpperCase(),
        fromAmount: fromAmt,
        toAmount: parseFloat(toAmount.toFixed(8)),
        rate: fromPrice / toPrice,
        feeUsd: parseFloat(feeUsd.toFixed(4)),
        feePercent: SWAP_FEE_PERCENT,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const executeSwap = async (req, res) => {
  try {
    const { fromAsset, toAsset, fromAmount } = req.body;
    const from = fromAsset.toUpperCase();
    const to = toAsset.toUpperCase();
    const amt = parseFloat(fromAmount);

    const priceMap = await getPriceMap([from, to]);
    const fromPrice = priceMap[from];
    const toPrice = priceMap[to];

    if (!fromPrice || !toPrice) {
      return res
        .status(400)
        .json({
          message: "Unsupported asset pair — price not found in database",
        });
    }

    const fromUsd = amt * fromPrice;
    const feeUsd = (fromUsd * SWAP_FEE_PERCENT) / 100;
    const toAmount = parseFloat(((fromUsd - feeUsd) / toPrice).toFixed(8));

    const fromWallet = await Wallet.findOne({
      userId: req.user._id,
      asset: from,
    });
    if (!fromWallet || fromWallet.balance < amt) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    let toWallet = await Wallet.findOne({ userId: req.user._id, asset: to });
    if (!toWallet) {
      toWallet = await Wallet.create({
        userId: req.user._id,
        asset: to,
        balance: 0,
        address: generateMockAddress(to),
      });
    }

    fromWallet.balance = parseFloat((fromWallet.balance - amt).toFixed(8));
    toWallet.balance = parseFloat((toWallet.balance + toAmount).toFixed(8));
    await Promise.all([fromWallet.save(), toWallet.save()]);

    const tx = await Transaction.create({
      userId: req.user._id,
      type: "swap",
      fromAsset: from,
      toAsset: to,
      fromAmount: amt,
      toAmount,
      fee: parseFloat(feeUsd.toFixed(4)),
      status: "confirmed",
    });

    res.status(201).json({
      transaction: tx,
      quote: {
        fromAsset: from,
        toAsset: to,
        fromAmount: amt,
        toAmount,
        rate: fromPrice / toPrice,
        feeUsd: parseFloat(feeUsd.toFixed(4)),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSwapHistory = async (req, res) => {
  try {
    const swaps = await Transaction.find({
      userId: req.user._id,
      type: "swap",
    }).sort({ createdAt: -1 });
    res.json({ swaps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getQuote, executeSwap, getSwapHistory };
