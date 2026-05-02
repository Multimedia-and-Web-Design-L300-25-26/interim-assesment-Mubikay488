const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['send', 'receive', 'swap'],
      required: true,
    },
    fromAsset: { type: String, uppercase: true },
    toAsset: { type: String, uppercase: true },
    fromAmount: { type: Number },
    toAmount: { type: Number },
    fromAddress: { type: String },
    toAddress: { type: String },
    txHash: { type: String },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed'],
      default: 'pending',
    },
    fee: { type: Number, default: 0 },
    note: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
