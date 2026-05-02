/**
 * Crypto Seed
 * -----------
 * Seeds the Crypto collection with real-world coins from the Explore page list.
 * Uses cryptocurrency-icons CDN for images.
 * Called once after DB connects — skips any symbol that already exists.
 */

const Crypto = require('../models/Crypto');

const icon = (sym) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color/${sym.toLowerCase()}.png`;

const SEEDS = [
  { name: 'Bitcoin',          symbol: 'BTC',  price: 65000,    change24h:  1.25, image: icon('btc')  },
  { name: 'Ethereum',         symbol: 'ETH',  price: 3200,     change24h:  0.87, image: icon('eth')  },
  { name: 'BNB',              symbol: 'BNB',  price: 580,      change24h: -0.43, image: icon('bnb')  },
  { name: 'Solana',           symbol: 'SOL',  price: 150,      change24h:  2.10, image: icon('sol')  },
  { name: 'XRP',              symbol: 'XRP',  price: 0.54,     change24h:  0.32, image: icon('xrp')  },
  { name: 'Cardano',          symbol: 'ADA',  price: 0.45,     change24h: -0.21, image: icon('ada')  },
  { name: 'Dogecoin',         symbol: 'DOGE', price: 0.12,     change24h:  1.50, image: icon('doge') },
  { name: 'Polkadot',         symbol: 'DOT',  price: 7.2,      change24h: -0.95, image: icon('dot')  },
  { name: 'Litecoin',         symbol: 'LTC',  price: 85,       change24h:  0.62, image: icon('ltc')  },
  { name: 'Avalanche',        symbol: 'AVAX', price: 35,       change24h:  1.80, image: icon('avax') },
  { name: 'Chainlink',        symbol: 'LINK', price: 14,       change24h:  0.45, image: icon('link') },
  { name: 'Uniswap',          symbol: 'UNI',  price: 8,        change24h: -1.10, image: icon('uni')  },
  { name: 'Cosmos',           symbol: 'ATOM', price: 9.5,      change24h:  0.73, image: icon('atom') },
  { name: 'Stellar',          symbol: 'XLM',  price: 0.12,     change24h:  0.28, image: icon('xlm')  },
  { name: 'Ethereum Classic', symbol: 'ETC',  price: 26,       change24h: -0.55, image: icon('etc')  },
  { name: 'Aave',             symbol: 'AAVE', price: 95,       change24h:  1.20, image: icon('aave') },
  { name: 'Algorand',         symbol: 'ALGO', price: 0.18,     change24h: -0.30, image: icon('algo') },
  { name: 'Filecoin',         symbol: 'FIL',  price: 5.5,      change24h:  0.90, image: icon('fil')  },
  { name: 'TRON',             symbol: 'TRX',  price: 0.11,     change24h:  0.15, image: icon('trx')  },
  { name: 'Tezos',            symbol: 'XTZ',  price: 1.0,      change24h: -0.40, image: icon('xtz')  },
  { name: 'Maker',            symbol: 'MKR',  price: 1800,     change24h:  0.60, image: icon('mkr')  },
  { name: 'Compound',         symbol: 'COMP', price: 52,       change24h: -0.75, image: icon('comp') },
  { name: 'Dash',             symbol: 'DASH', price: 30,       change24h:  0.20, image: icon('dash') },
  { name: 'EOS',              symbol: 'EOS',  price: 0.75,     change24h: -0.18, image: icon('eos')  },
  { name: 'Basic Attention',  symbol: 'BAT',  price: 0.22,     change24h:  0.35, image: icon('bat')  },
  { name: 'VeChain',          symbol: 'VET',  price: 0.036,    change24h:  0.50, image: icon('vet')  },
  { name: 'NEO',              symbol: 'NEO',  price: 12,       change24h: -0.22, image: icon('neo')  },
  { name: 'Waves',            symbol: 'WAVES',price: 2.0,      change24h:  0.10, image: icon('waves')},
  { name: 'Shiba Inu',        symbol: 'SHIB', price: 0.0000095,change24h:  2.40, image: icon('shib') },
  { name: 'Polygon',          symbol: 'MATIC',price: 0.7,      change24h:  0.85, image: icon('matic')},
  { name: 'Tether',           symbol: 'USDT', price: 1,        change24h:  0.01, image: icon('usdt') },
];

async function seedCrypto() {
  try {
    const existing = await Crypto.find({}, 'symbol').lean();
    const existingSet = new Set(existing.map((c) => c.symbol));

    const toInsert = SEEDS.filter((s) => !existingSet.has(s.symbol));
    if (toInsert.length === 0) {
      console.log('[SeedCrypto] All coins already exist — skipping.');
      return;
    }

    await Crypto.insertMany(toInsert);
    console.log(`[SeedCrypto] Seeded ${toInsert.length} coins: ${toInsert.map((c) => c.symbol).join(', ')}`);
  } catch (err) {
    console.error('[SeedCrypto] Error:', err.message);
  }
}

module.exports = { seedCrypto };
