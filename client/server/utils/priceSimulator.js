/**
 * Price Simulator
 * ---------------
 * Runs a background interval that periodically updates every crypto's
 * price and change24h with a realistic random-walk so the dashboard
 * feels alive without needing an external data feed.
 *
 * Behaviour:
 *  - Every TICK_MS (30 s) each coin gets a small price nudge.
 *  - The nudge is drawn from a normal-ish distribution: ±0.5 % on average,
 *    occasionally up to ±2 % (simulates volatility spikes).
 *  - change24h is updated to reflect the cumulative drift since the last
 *    full 24-hour window (approximated as a rolling weighted average so it
 *    doesn't drift to infinity).
 *  - Price is floored at 0.000001 so it never goes negative.
 */

const Crypto = require('../models/Crypto');

const TICK_MS = 30_000;

function gaussianRandom(mean = 0, std = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

async function tick() {
  try {
    const coins = await Crypto.find({});
    if (!coins.length) return;

    const bulkOps = coins.map((coin) => {
      const pctChange = gaussianRandom(0, 0.6);
      const delta     = coin.price * (pctChange / 100);
      const newPrice  = Math.max(0.000001, coin.price + delta);

      const prevChange = coin.change24h ?? 0;
      const newChange  = parseFloat(
        (prevChange * 0.92 + pctChange * 0.08).toFixed(4)
      );

      return {
        updateOne: {
          filter: { _id: coin._id },
          update: { $set: { price: parseFloat(newPrice.toPrecision(8)), change24h: newChange } },
        },
      };
    });

    await Crypto.bulkWrite(bulkOps);
  } catch (err) {
    console.error('[PriceSimulator] tick error:', err.message);
  }
}

function start() {
  console.log(`[PriceSimulator] started — ticking every ${TICK_MS / 1000}s`);
  tick();
  return setInterval(tick, TICK_MS);
}

module.exports = { start };
