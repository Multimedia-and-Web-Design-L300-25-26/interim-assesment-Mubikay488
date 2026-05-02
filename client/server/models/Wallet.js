const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    asset: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    address: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

walletSchema.index({ userId: 1, asset: 1 }, { unique: true });

module.exports = mongoose.model('Wallet', walletSchema);
