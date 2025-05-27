const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;
const WINDOW_SIZE = 10;
const QUALIFIED_IDS = ['p', 'f', 'e', 'r'];

const windowStates = {
  p: [],
  f: [],
  e: [],
  r: []
};

async function fetchNumbers(numberid) {
  const endpoints = {
    p: 'http://20.244.56.144/evaluation-service/primes',
    f: 'http://20.244.56.144/evaluation-service/fibo',
    e: 'http://20.244.56.144/evaluation-service/even',
    r: 'http://20.244.56.144/evaluation-service/rand'
  };
  try {
    const response = await axios.get(endpoints[numberid], {
      timeout: 500,
      headers: {
       'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ4MzI1NjYwLCJpYXQiOjE3NDgzMjUzNjAsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjU3ZTFkYWFmLTVmNjYtNGE0OS05NTNlLWY0N2EwZGRjMDQ5NCIsInN1YiI6IjIyMzExYTEyZjZAaXQuc3JlZW5pZGhpLmV1LmluIn0sImVtYWlsIjoiMjIzMTFhMTJmNkBpdC5zcmVlbmlkaGkuZXUuaW4iLCJuYW1lIjoidmVlcmEgcmFnaGF2YSBzd2FteSIsInJvbGxObyI6IjIyMzExYTEyZjYiLCJhY2Nlc3NDb2RlIjoiUENxQVVLIiwiY2xpZW50SUQiOiI1N2UxZGFhZi01ZjY2LTRhNDktOTUzZS1mNDdhMGRkYzA0OTQiLCJjbGllbnRTZWNyZXQiOiJmQ2JNU3ZhVllhUHdIbXNnIn0.bhLLWXm6lyF3hjUz4xxiNfgWquKKPcLDgCqJtFLjloA'
      }
    });
    return response.data.numbers || [];
  } catch (err) {
    console.error('Fetch error:', err.message);
    return [];
  }
}
app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;
  if (!QUALIFIED_IDS.includes(numberid)) {
    return res.status(400).json({ error: 'Invalid numberid' });
  }

  const prevState = [...windowStates[numberid]];
  const numbers = await fetchNumbers(numberid);

  numbers.forEach(num => {
    if (!windowStates[numberid].includes(num)) {
      windowStates[numberid].push(num);
    }
  });

  while (windowStates[numberid].length > WINDOW_SIZE) {
    windowStates[numberid].shift();
  }

  const currState = [...windowStates[numberid]];
  const avg =
    currState.length === 0
      ? 0
      : parseFloat(
          (currState.reduce((a, b) => a + b, 0) / currState.length).toFixed(2)
        );

  res.json({
    windowPrevState: prevState,
    windowCurrState: currState,
    numbers: numbers,
    avg: avg
  });
});

app.listen(PORT, () => {
  console.log(`Average Calculator microservice running on port ${PORT}`);
});