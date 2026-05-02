const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { getQuote, executeSwap, getSwapHistory } = require('../controllers/swap.controller');

const router = express.Router();

router.use(protect);

router.get('/quote', getQuote);
router.get('/history', getSwapHistory);

router.post(
  '/execute',
  [
    body('fromAsset').notEmpty().withMessage('fromAsset is required'),
    body('toAsset').notEmpty().withMessage('toAsset is required'),
    body('fromAmount').isFloat({ gt: 0 }).withMessage('fromAmount must be a positive number'),
  ],
  validate,
  executeSwap
);

module.exports = router;
