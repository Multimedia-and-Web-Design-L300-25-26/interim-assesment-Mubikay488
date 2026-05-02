const mongoose = require('mongoose');

const kycDocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    docType: {
      type: String,
      enum: ['passport', 'national_id', 'utility_bill', 'bank_statement'],
      required: true,
    },
    frontImageUrl: { type: String },
    backImageUrl: { type: String },
    addressImageUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KycDocument', kycDocumentSchema);
