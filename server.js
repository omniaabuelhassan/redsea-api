require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const sightingsRouter = require('./routes/sightings');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (req, res) => {
  const pool = require('./db/pool');
  try {
    const r = await pool.query('SELECT NOW() AS time');
    res.json({ status: 'ok', time: r.rows[0].time });
  } catch (err) {
    res.status(503).json({ status: 'error', detail: err.message });
  }
});

app.use('/api/sightings', sightingsRouter);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`🐟 Red Sea API running on http://localhost:${PORT}`);
});