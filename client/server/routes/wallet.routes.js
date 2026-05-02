const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { getBalances, getAddress, getPortfolioSummary } = require('../controllers/wallet.controller');

const router = express.Router();

router.use(protect);

router.get('/balances', getBalances);
router.get('/address/:asset', getAddress);
router.get('/portfolio', getPortfolioSummary);

module.exports = router;
