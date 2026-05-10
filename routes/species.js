const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /api/species
// Returns all distinct species and their sighting counts
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT species, COUNT(*)::int AS sightings
      FROM fish_sightings
      GROUP BY species
      ORDER BY sightings DESC
    `);
    res.json({ species: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
