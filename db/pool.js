const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }  // required for Supabase
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  client.query('SELECT PostGIS_Version()', (err2, result) => {
    release();
    if (err2) {
      console.error('❌ PostGIS not found:', err2.message);
      process.exit(1);
    }
    console.log('✅ Connected to Supabase + PostGIS:', result.rows[0].postgis_version);
  });
});

module.exports = pool;