const express = require("express");
const router = express.Router();
const pool = require("../db/pool");

// GET /api/predict/distribution
// Predicts species distribution based on historical habitat ranges
router.get("/distribution", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        species,
        ST_AsGeoJSON(ST_Centroid(ST_Collect(geom::geometry))) AS predicted_center,
        ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geom::geometry))) AS distribution_area,
        ROUND(AVG(depth_m)::numeric, 2) AS optimal_depth_m,
        ROUND(AVG(temp_c)::numeric, 2) AS optimal_temp_c,
        COUNT(*) as data_points
      FROM fish_sightings
      GROUP BY species
      HAVING COUNT(*) >= 3
    `);

    res.json({
      predicted_distributions: result.rows.map((row) => ({
        ...row,
        predicted_center: row.predicted_center
          ? JSON.parse(row.predicted_center)
          : null,
        distribution_area: row.distribution_area
          ? JSON.parse(row.distribution_area)
          : null,
      })),
    });
  } catch (err) {
    console.error("/predict/distribution error:", err.message);
    res.status(500).json({ error: "Prediction failed", detail: err.message });
  }
});

module.exports = router;
