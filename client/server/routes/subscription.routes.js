const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { subscribe } = require('../controllers/subscription.controller');

const router = express.Router();

router.post(
  '/',
  [body('email').isEmail().withMessage('Valid email required')],
  validate,
  subscribe
);

module.exports = router;
