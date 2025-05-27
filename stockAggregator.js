const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const STOCK_API_BASE = 'http://localhost:3000/api/stocks';

const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ4MzI4OTgwLCJpYXQiOjE3NDgzMjg2ODAsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjU3ZTFkYWFmLTVmNjYtNGE0OS05NTNlLWY0N2EwZGRjMDQ5NCIsInN1YiI6IjIyMzExYTEyZjZAaXQuc3JlZW5pZGhpLmV1LmluIn0sImVtYWlsIjoiMjIzMTFhMTJmNkBpdC5zcmVlbmlkaGkuZXUuaW4iLCJuYW1lIjoidmVlcmEgcmFnaGF2YSBzd2FteSIsInJvbGxObyI6IjIyMzExYTEyZjYiLCJhY2Nlc3NDb2RlIjoiUENxQVVLIiwiY2xpZW50SUQiOiI1N2UxZGFhZi01ZjY2LTRhNDktOTUzZS1mNDdhMGRkYzA0OTQiLCJjbGllbnRTZWNyZXQiOiJmQ2JNU3ZhVllhUHdIbXNnIn0.JgYMCH0l1iavIFXBsqUbZVPvFhYkVRwo4t_eFKu-UZ8';

app.get('/api/stocks/:ticker/prices', (req, res) => {
  const { ticker } = req.params;
  const { minutes } = req.query;
  const now = Date.now();

  const prices = Array.from({ length: parseInt(minutes || 1) }, (_, i) => ({
    lastUpdatedAt: new Date(now - i * 60000).toISOString(),
    price: parseFloat((Math.random() * 100 + 100).toFixed(2))
  }));

  res.json(prices.reverse());
});

function calculateAverage(prices) {
  if (!prices.length) return 0;
  const sum = prices.reduce((acc, p) => acc + p.price, 0);
  return parseFloat((sum / prices.length).toFixed(6));
}

function calculateCorrelation(x, y) {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denominator = Math.sqrt(denomX * denomY);
  return denominator === 0 ? 0 : parseFloat((numerator / denominator).toFixed(4));
}

async function fetchStockPrices(ticker, minutes) {
  try {
    const url = `${STOCK_API_BASE}/${ticker}/prices?minutes=${minutes}`;
    const res = await axios.get(url, {
      headers: {
        Authorization: AUTH_TOKEN
      }
    });
    return res.data || [];
  } catch (err) {
    console.error(`Error fetching ${ticker}:`, err.message);
    return [];
  }
}

app.get('/stocks/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { minutes, aggregation } = req.query;

  if (aggregation !== 'average') {
    return res.status(400).json({ error: 'Only average aggregation is supported' });
  }

  const priceHistory = await fetchStockPrices(ticker, minutes);
  const averageStockPrice = calculateAverage(priceHistory);

  res.json({ averageStockPrice, priceHistory });
});

app.get('/stockcorrelation', async (req, res) => {
  const { minutes, ticker } = req.query;
  const tickers = Array.isArray(ticker) ? ticker : [ticker];

  if (tickers.length !== 2) {
    return res.status(400).json({ error: 'Provide exactly two tickers' });
  }

  const [ticker1, ticker2] = tickers;

  const [prices1, prices2] = await Promise.all([
    fetchStockPrices(ticker1, minutes),
    fetchStockPrices(ticker2, minutes)
  ]);

  const timeToPrice1 = Object.fromEntries(prices1.map(p => [p.lastUpdatedAt, p.price]));
  const timeToPrice2 = Object.fromEntries(prices2.map(p => [p.lastUpdatedAt, p.price]));

  const alignedTimes = Object.keys(timeToPrice1).filter(t => t in timeToPrice2);
  const aligned1 = alignedTimes.map(t => timeToPrice1[t]);
  const aligned2 = alignedTimes.map(t => timeToPrice2[t]);

  const correlation = calculateCorrelation(aligned1, aligned2);

  res.json({
    correlation,
    stocks: {
      [ticker1]: {
        averagePrice: calculateAverage(prices1),
        priceHistory: prices1
      },
      [ticker2]: {
        averagePrice: calculateAverage(prices2),
        priceHistory: prices2
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Stock microservice running on http://localhost:${PORT}`);
});
