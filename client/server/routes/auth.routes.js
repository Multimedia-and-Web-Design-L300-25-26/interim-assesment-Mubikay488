const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const {
  register,
  verifyEmail,
  resendOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth.controller');

const router = express.Router();

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('accountType').optional().isIn(['personal', 'business', 'developer']),
];

router.post('/register', registerValidation, validate, register);

router.post(
  '/verify-email',
  [
    body('userId').notEmpty().withMessage('userId required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  verifyEmail
);

router.post(
  '/resend-otp',
  [body('userId').notEmpty()],
  validate,
  resendOtp
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.post('/refresh', refresh);
router.post('/logout', logout);

router.post(
  '/forgot-password',
  [body('email').isEmail()],
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token required'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  resetPassword
);

module.exports = router;
