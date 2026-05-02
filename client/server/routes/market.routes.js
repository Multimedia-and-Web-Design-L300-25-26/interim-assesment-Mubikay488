const express = require('express');
const { getPrices } = require('../controllers/market.controller');

const router = express.Router();

router.get('/prices', getPrices);

module.exports = router;
