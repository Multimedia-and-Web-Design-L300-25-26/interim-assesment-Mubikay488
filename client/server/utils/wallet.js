const crypto = require('crypto');

const DEFAULT_ASSETS = ['BTC', 'ETH', 'SOL', 'USDT'];

const MOCK_BALANCES = {
  BTC: 0.05,
  ETH: 1.2,
  SOL: 10,
  USDT: 500,
};

const generateMockAddress = (asset) => {
  const prefixes = { BTC: '1', ETH: '0x', SOL: '', USDT: '0x' };
  const prefix = prefixes[asset] || '';
  const random = crypto.randomBytes(16).toString('hex');
  return `${prefix}${random}`;
};

module.exports = { DEFAULT_ASSETS, MOCK_BALANCES, generateMockAddress };
