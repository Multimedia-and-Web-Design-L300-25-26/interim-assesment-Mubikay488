const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { getSwapQuote, MOCK_PRICES_USD } = require('../utils/swap');
const { generateMockAddress } = require('../utils/wallet');

const getQuote = (req, res) => {
  try {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
      return res.status(400).json({ message: 'from, to, and amount are required' });
    }

    const quote = getSwapQuote(from, to, parseFloat(amount));
    if (!quote) {
      return res.status(400).json({ message: 'Unsupported asset pair' });
    }

    res.json({ quote });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const executeSwap = async (req, res) => {
  try {
    const { fromAsset, toAsset, fromAmount } = req.body;

    const quote = getSwapQuote(fromAsset, toAsset, parseFloat(fromAmount));
    if (!quote) {
      return res.status(400).json({ message: 'Unsupported asset pair' });
    }

    const fromWallet = await Wallet.findOne({ userId: req.user._id, asset: quote.fromAsset });
    if (!fromWallet || fromWallet.balance < quote.fromAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    let toWallet = await Wallet.findOne({ userId: req.user._id, asset: quote.toAsset });
    if (!toWallet) {
      toWallet = await Wallet.create({
        userId: req.user._id,
        asset: quote.toAsset,
        balance: 0,
        address: generateMockAddress(quote.toAsset),
      });
    }

    fromWallet.balance = parseFloat((fromWallet.balance - quote.fromAmount).toFixed(8));
    toWallet.balance = parseFloat((toWallet.balance + quote.toAmount).toFixed(8));

    await Promise.all([fromWallet.save(), toWallet.save()]);

    const tx = await Transaction.create({
      userId: req.user._id,
      type: 'swap',
      fromAsset: quote.fromAsset,
      toAsset: quote.toAsset,
      fromAmount: quote.fromAmount,
      toAmount: quote.toAmount,
      fee: quote.feeUsd,
      status: 'confirmed',
    });

    res.status(201).json({ transaction: tx, quote });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSwapHistory = async (req, res) => {
  try {
    const swaps = await Transaction.find({ userId: req.user._id, type: 'swap' }).sort({ createdAt: -1 });
    res.json({ swaps });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getQuote, executeSwap, getSwapHistory };
