const User = require('../models/User');

const getMe = async (req, res) => {
  try {
    res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateMe = async (req, res) => {
  try {
    const allowed = ['firstName', 'lastName'];
    const updates = {};

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash -emailOtp -emailOtpExpires -passwordResetToken -passwordResetExpires');

    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMe, updateMe };
