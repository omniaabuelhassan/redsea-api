function toFeatureCollection(rows) {
  return {
    type: 'FeatureCollection',
    features: rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        id:         row.id,
        species:    row.species,
        depth_m:    row.depth_m,
        temp_c:     row.temp_c,
        event_date: row.event_date,
      }
    }))
  };
}

module.exports = { toFeatureCollection };