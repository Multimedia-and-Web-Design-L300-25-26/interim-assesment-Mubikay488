const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { getMe, updateMe } = require('../controllers/user.controller');

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.get('/profile', getMe);

router.patch(
  '/me',
  [
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
  ],
  validate,
  updateMe
);

module.exports = router;
