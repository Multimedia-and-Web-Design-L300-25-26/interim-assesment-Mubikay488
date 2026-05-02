const KycDocument = require('../models/KycDocument');
const User = require('../models/User');

const getKycStatus = async (req, res) => {
  try {
    const doc = await KycDocument.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      kycStatus: req.user.kycStatus,
      document: doc || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const uploadId = async (req, res) => {
  try {
    const { docType } = req.body;
    const files = req.files;

    if (!files || (!files.front && !files.back)) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const frontImageUrl = files.front ? `/uploads/kyc/${files.front[0].filename}` : undefined;
    const backImageUrl = files.back ? `/uploads/kyc/${files.back[0].filename}` : undefined;

    const doc = await KycDocument.findOneAndUpdate(
      { userId: req.user._id },
      {
        userId: req.user._id,
        docType: docType || 'national_id',
        frontImageUrl,
        backImageUrl,
        status: 'pending',
        submittedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });

    res.status(201).json({ message: 'ID uploaded successfully', document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const uploadAddress = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const addressImageUrl = `/uploads/kyc/${req.file.filename}`;

    const doc = await KycDocument.findOneAndUpdate(
      { userId: req.user._id },
      { addressImageUrl, status: 'pending' },
      { new: true }
    );

    res.json({ message: 'Address document uploaded', document: doc });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const submitKyc = async (req, res) => {
  try {
    const doc = await KycDocument.findOne({ userId: req.user._id });
    if (!doc) return res.status(400).json({ message: 'No KYC documents found. Upload ID first.' });

    doc.status = 'pending';
    doc.submittedAt = new Date();
    await doc.save();

    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });

    res.json({ message: 'KYC submitted for review', kycStatus: 'pending' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getKycStatus, uploadId, uploadAddress, submitKyc };
