const bcrypt = require('bcryptjs');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const Wallet = require('../models/Wallet');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateOtp,
  generateResetToken,
  REFRESH_COOKIE_OPTIONS,
} = require('../utils/token');
const { DEFAULT_ASSETS, MOCK_BALANCES, generateMockAddress } = require('../utils/wallet');

const createDefaultWallets = async (userId) => {
  const wallets = DEFAULT_ASSETS.map((asset) => ({
    userId,
    asset,
    balance: MOCK_BALANCES[asset] || 0,
    address: generateMockAddress(asset),
  }));
  await Wallet.insertMany(wallets);
};

const register = async (req, res) => {
  try {
    const { name, email, password, accountType } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name,
      email,
      passwordHash,
      accountType: accountType || 'personal',
      emailOtp: otp,
      emailOtpExpires: otpExpires,
    });

    await createDefaultWallets(user._id);

    console.log(`[DEV] OTP for ${email}: ${otp}`);

    res.status(201).json({
      message: 'Registration successful. Check your email for the OTP.',
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (user.emailOtp !== otp || user.emailOtpExpires < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpires = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = generateOtp();
    user.emailOtp = otp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log(`[DEV] Resend OTP for ${user.email}: ${otp}`);
    res.json({ message: 'OTP resent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email first', userId: user._id });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: refreshExpires });

    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      accessToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    const decoded = verifyRefreshToken(token);

    const stored = await RefreshToken.findOne({ token, userId: decoded.id });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token invalid or expired' });
    }

    const newAccessToken = generateAccessToken(decoded.id);
    const newRefreshToken = generateRefreshToken(decoded.id);

    stored.token = newRefreshToken;
    stored.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await stored.save();

    res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await RefreshToken.deleteOne({ token });
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = generateResetToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });
    res.clearCookie('refreshToken');

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
};
