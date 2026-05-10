const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const {
  validateLatLon,
  validateRadius,
  validateBbox,
} = require("../middleware/validate");
const { toFeatureCollection } = require("../utils/geojson");

// GET /api/sightings/radius
// Example: /api/sightings/radius?lat=22.5&lon=38.5&radius=100000
router.get("/radius", [validateLatLon, validateRadius], async (req, res) => {
  const { lat, lon, radius } = req;
  const { species } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 500, 2000); // Limit max results to 2000
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    const params = [lon, lat, radius];
    let speciesClause = "";

    if (species) {
      params.push(species);
      speciesClause = `AND species ILIKE $${params.length}`;
    }

    params.push(limit, offset);

    const result = await pool.query(
      `
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
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

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
        species_filter: species || null,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error("/radius error:", err.message);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

// GET /api/sightings/bbox
// Example: /api/sightings/bbox?minLon=37&minLat=21&maxLon=40&maxLat=25
router.get("/bbox", validateBbox, async (req, res) => {
  const { minLon, minLat, maxLon, maxLat } = req.bbox;
  const { species } = req.query;
  const limit = Math.min(parseInt(req.query.limit) || 1000, 2000); // Limit max results to 2000
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * limit;

  try {
    const params = [minLon, minLat, maxLon, maxLat];
    let speciesClause = "";

    if (species) {
      params.push(species);
      speciesClause = `AND species ILIKE $${params.length}`;
    }

    params.push(limit, offset);

    const result = await pool.query(
      `
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
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    res.json({
      ...toFeatureCollection(result.rows),
      meta: {
        bbox: { minLon, minLat, maxLon, maxLat },
        count: result.rowCount,
        species_filter: species || null,
        page,
        limit,
      },
    });
  } catch (err) {
    console.error("/bbox error:", err.message);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

// GET /api/sightings/correlate
// Correlates depth and temperature for sightings
router.get("/correlate", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        species,
        CORR(depth_m, temp_c) AS depth_temp_correlation,
        COUNT(*) AS sample_size
      FROM fish_sightings
      GROUP BY species
      HAVING COUNT(*) > 1
      ORDER BY depth_temp_correlation DESC NULLS LAST
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("/correlate error:", err.message);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

// GET /api/sightings/stats
// Species aggregation stats
router.get("/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        species,
        COUNT(*) AS total_sightings,
        ROUND(AVG(depth_m)::numeric, 2) AS avg_depth_m,
        ROUND(MIN(depth_m)::numeric, 2) AS min_depth_m,
        ROUND(MAX(depth_m)::numeric, 2) AS max_depth_m,
        ROUND(AVG(temp_c)::numeric, 2) AS avg_temp_c,
        ROUND(MIN(temp_c)::numeric, 2) AS min_temp_c,
        ROUND(MAX(temp_c)::numeric, 2) AS max_temp_c
      FROM fish_sightings
      GROUP BY species
      ORDER BY total_sightings DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("/stats error:", err.message);
    res.status(500).json({ error: "Query failed", detail: err.message });
  }
});

module.exports = router;
