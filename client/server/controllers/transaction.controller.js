const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, asset } = req.query;
    const filter = { userId: req.user._id };
    if (asset) filter.fromAsset = asset.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      transactions,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendCrypto = async (req, res) => {
  try {
    const { asset, toAddress, amount } = req.body;
    const assetUpper = asset.toUpperCase();
    const sendAmount = parseFloat(amount);
    const FEE_RATE = 0.001;
    const fee = parseFloat((sendAmount * FEE_RATE).toFixed(8));
    const totalDeduct = sendAmount + fee;

    const wallet = await Wallet.findOne({ userId: req.user._id, asset: assetUpper });
    if (!wallet) return res.status(404).json({ message: `No ${assetUpper} wallet found` });
    if (wallet.balance < totalDeduct) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    wallet.balance = parseFloat((wallet.balance - totalDeduct).toFixed(8));
    await wallet.save();

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');

    const tx = await Transaction.create({
      userId: req.user._id,
      type: 'send',
      fromAsset: assetUpper,
      fromAmount: sendAmount,
      fromAddress: wallet.address,
      toAddress,
      txHash,
      fee,
      status: 'confirmed',
    });

    res.status(201).json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTransactions, getTransactionById, sendCrypto };
