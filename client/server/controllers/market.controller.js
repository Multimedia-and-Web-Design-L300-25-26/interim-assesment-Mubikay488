const fetch = require('node-fetch');
const { MOCK_PRICES_USD } = require('../utils/swap');

const COIN_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT',
  'ADAUSDT','DOGEUSDT','DOTUSDT','LTCUSDT','AVAXUSDT',
  'LINKUSDT','UNIUSDT','ATOMUSDT','MATICUSDT','SHIBUSDT',
];

let priceCache = null;
let cacheTime = 0;
const CACHE_TTL_MS = 10 * 1000;

const getPrices = async (_req, res) => {
  try {
    const now = Date.now();

    if (priceCache && now - cacheTime < CACHE_TTL_MS) {
      return res.json({ source: 'cache', prices: priceCache });
    }

    const symbols = encodeURIComponent(JSON.stringify(COIN_SYMBOLS));
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbols}`;

    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) throw new Error(`Binance API returned ${response.status}`);

    const tickers = await response.json();

    const prices = tickers.map((t) => ({
      symbol: t.symbol,
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      volume: parseFloat(t.volume),
      high: parseFloat(t.highPrice),
      low: parseFloat(t.lowPrice),
    }));

    priceCache = prices;
    cacheTime = now;

    res.json({ source: 'live', prices });
  } catch (err) {
    console.warn('[market] Binance fetch failed, using mock prices:', err.message);

    const mockPrices = Object.entries(MOCK_PRICES_USD).map(([symbol, price]) => ({
      symbol: `${symbol}USDT`,
      price,
      change24h: (Math.random() * 6 - 3).toFixed(2),
      volume: 0,
      high: price,
      low: price,
    }));

    res.json({ source: 'mock', prices: mockPrices });
  }
};

module.exports = { getPrices };
