const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { getTransactions, getTransactionById, sendCrypto } = require('../controllers/transaction.controller');

const router = express.Router();

router.use(protect);

router.get('/', getTransactions);
router.get('/:id', getTransactionById);

router.post(
  '/send',
  [
    body('asset').notEmpty().withMessage('Asset is required'),
    body('toAddress').notEmpty().withMessage('Destination address is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  ],
  validate,
  sendCrypto
);

module.exports = router;
