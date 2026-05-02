const MOCK_PRICES_USD = {
  BTC: 65000,
  ETH: 3200,
  SOL: 150,
  USDT: 1,
  BNB: 580,
  ADA: 0.45,
  DOGE: 0.12,
  DOT: 7.2,
  LTC: 85,
  AVAX: 35,
  LINK: 14,
  UNI: 8,
  MATIC: 0.9,
};

const SWAP_FEE_PERCENT = 0.25;

const getSwapQuote = (fromAsset, toAsset, fromAmount) => {
  const fromPrice = MOCK_PRICES_USD[fromAsset.toUpperCase()];
  const toPrice = MOCK_PRICES_USD[toAsset.toUpperCase()];

  if (!fromPrice || !toPrice) return null;

  const fromValueUsd = fromAmount * fromPrice;
  const fee = (fromValueUsd * SWAP_FEE_PERCENT) / 100;
  const netValueUsd = fromValueUsd - fee;
  const toAmount = netValueUsd / toPrice;

  return {
    fromAsset: fromAsset.toUpperCase(),
    toAsset: toAsset.toUpperCase(),
    fromAmount: parseFloat(fromAmount),
    toAmount: parseFloat(toAmount.toFixed(8)),
    rate: fromPrice / toPrice,
    feeUsd: parseFloat(fee.toFixed(4)),
    feePercent: SWAP_FEE_PERCENT,
  };
};

module.exports = { getSwapQuote, MOCK_PRICES_USD };
