const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');
const { validateLatLon, validateRadius, validateBbox } = require('../middleware/validate');
const { toFeatureCollection } = require('../utils/geojson');

// GET /api/sightings/radius
// Example: /api/sightings/radius?lat=22.5&lon=38.5&radius=100000
router.get('/radius', [validateLatLon, validateRadius], async (req, res) => {
  const { lat, lon, radius } = req;
  const { species } = req.query;

  try {
    const params = [lon, lat, radius];
    let speciesClause = '';

    if (species) {
      params.push(species);
      speciesClause = `AND LOWER(species) LIKE LOWER($${params.length})`;
    }

    const result = await pool.query(`
      SELECT
        id, species, depth_m, temp_c, event_date,
        ST_AsGeoJSON(geom) AS geometry,
        ROUND(ST_Distance(
          geom::geography,
          ST_MakePoint($1, $2)::geography
        )::numeric, 0) AS distance_m
      FROM fish_sightings
      WHERE ST_DWithin(
        geom::geography,
        ST_MakePoint($1, $2)::geography,
        $3
      )
      ${speciesClause}
      ORDER BY distance_m
      LIMIT 500
    `, params);

    const fc = toFeatureCollection(result.rows);
    fc.features.forEach((f, i) => {
      f.properties.distance_m = result.rows[i].distance_m;
    });

    res.json({
      ...fc,
      meta: {
        center: { lon, lat },
        radius_m: radius,
        count: result.rowCount,
        species_filter: species || null
      }
    });

  } catch (err) {
    console.error('/radius error:', err.message);
    res.status(500).json({ error: 'Query failed', detail: err.message });
  }
});

// GET /api/sightings/bbox
// Example: /api/sightings/bbox?minLon=37&minLat=21&maxLon=40&maxLat=25
router.get('/bbox', validateBbox, async (req, res) => {
  const { minLon, minLat, maxLon, maxLat } = req.bbox;
  const { species } = req.query;

  try {
    const params = [minLon, minLat, maxLon, maxLat];
    let speciesClause = '';

    if (species) {
      params.push(species);
      speciesClause = `AND LOWER(species) LIKE LOWER($${params.length})`;
    }

    const result = await pool.query(`
      SELECT
        id, species, depth_m, temp_c, event_date,
        ST_AsGeoJSON(geom) AS geometry
      FROM fish_sightings
      WHERE ST_Within(
        geom,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )
      ${speciesClause}
      ORDER BY event_date DESC NULLS LAST
      LIMIT 1000
    `, params);

    res.json({
      ...toFeatureCollection(result.rows),
      meta: {
        bbox: { minLon, minLat, maxLon, maxLat },
        count: result.rowCount,
        species_filter: species || null
      }
    });

  } catch (err) {
    console.error('/bbox error:', err.message);
    res.status(500).json({ error: 'Query failed', detail: err.message });
  }
});

// GET /api/sightings/species
// Returns all distinct species for the frontend dropdown
router.get('/species', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT species, COUNT(*) AS sightings
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