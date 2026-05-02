const crypto = require("crypto");
const Transaction = require("../models/Transaction");
const Wallet = require("../models/Wallet");
const User = require("../models/User");

const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, asset } = req.query;
    const filter = { userId: req.user._id };
    if (asset) filter.fromAsset = asset.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
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
    const tx = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const sendCrypto = async (req, res) => {
  try {
    const { asset, toAddress, amount, note } = req.body;
    const assetUpper = asset.toUpperCase();
    const sendAmount = parseFloat(amount);
    const FEE_RATE = 0.001;
    const fee = parseFloat((sendAmount * FEE_RATE).toFixed(8));
    const totalDeduct = parseFloat((sendAmount + fee).toFixed(8));

    // --- sender wallet ---
    const senderWallet = await Wallet.findOne({
      userId: req.user._id,
      asset: assetUpper,
    });
    if (!senderWallet) {
      return res
        .status(404)
        .json({ message: `You don't have a ${assetUpper} wallet` });
    }
    if (senderWallet.isCustom) {
      return res
        .status(400)
        .json({
          message: `${assetUpper} is a custom coin and cannot be transferred to other users`,
        });
    }
    if (senderWallet.address === toAddress) {
      return res
        .status(400)
        .json({ message: "Cannot send to your own address" });
    }
    if (senderWallet.balance < totalDeduct) {
      return res
        .status(400)
        .json({
          message: `Insufficient balance. You have ${senderWallet.balance} ${assetUpper}`,
        });
    }

    // --- recipient wallet (look up by wallet address) ---
    const recipientWallet = await Wallet.findOne({
      address: toAddress,
      asset: assetUpper,
    });
    if (!recipientWallet) {
      return res
        .status(404)
        .json({ message: "Recipient address not found for this asset" });
    }

    const txHash = "0x" + crypto.randomBytes(32).toString("hex");

    // debit sender
    senderWallet.balance = parseFloat(
      (senderWallet.balance - totalDeduct).toFixed(8),
    );

    // credit recipient
    recipientWallet.balance = parseFloat(
      (recipientWallet.balance + sendAmount).toFixed(8),
    );

    await Promise.all([senderWallet.save(), recipientWallet.save()]);

    // send transaction (sender's history)
    const sendTx = await Transaction.create({
      userId: req.user._id,
      type: "send",
      fromAsset: assetUpper,
      fromAmount: sendAmount,
      fromAddress: senderWallet.address,
      toAddress,
      txHash,
      fee,
      note,
      status: "confirmed",
    });

    // receive transaction (recipient's history)
    await Transaction.create({
      userId: recipientWallet.userId,
      type: "receive",
      fromAsset: assetUpper,
      toAsset: assetUpper,
      fromAmount: sendAmount,
      toAmount: sendAmount,
      fromAddress: senderWallet.address,
      toAddress,
      txHash,
      fee: 0,
      note,
      status: "confirmed",
    });

    res.status(201).json({
      transaction: sendTx,
      sent: sendAmount,
      fee,
      asset: assetUpper,
      to: toAddress,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getTransactions, getTransactionById, sendCrypto };
