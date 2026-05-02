const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const { getAllCrypto, getGainers, getNewListings, addCrypto } = require('../controllers/crypto.controller');

const router = express.Router();

router.get('/', getAllCrypto);
router.get('/gainers', getGainers);
router.get('/new', getNewListings);

router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('symbol').trim().notEmpty().withMessage('Symbol is required'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
    body('image').optional().custom((val) => {
      if (val && !/^(https?:\/\/.+|data:image\/.+)/.test(val)) throw new Error('Image must be a valid URL (http/https) or a data: URI');
      return true;
    }),
    body('change24h').optional().isFloat().withMessage('change24h must be a number'),
  ],
  validate,
  addCrypto
);

module.exports = router;
