function validateLatLon(req, res, next) {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);

  if (isNaN(lat) || lat < -90 || lat > 90)
    return res.status(400).json({ error: 'lat must be a number between -90 and 90' });
  if (isNaN(lon) || lon < -180 || lon > 180)
    return res.status(400).json({ error: 'lon must be a number between -180 and 180' });

  req.lat = lat;
  req.lon = lon;
  next();
}

function validateRadius(req, res, next) {
  const radius = parseFloat(req.query.radius);
  if (isNaN(radius) || radius <= 0 || radius > 500000)
    return res.status(400).json({ error: 'radius must be between 1 and 500000 metres' });

  req.radius = radius;
  next();
}

function validateBbox(req, res, next) {
  const minLon = parseFloat(req.query.minLon);
  const minLat = parseFloat(req.query.minLat);
  const maxLon = parseFloat(req.query.maxLon);
  const maxLat = parseFloat(req.query.maxLat);

  if ([minLon, minLat, maxLon, maxLat].some(isNaN))
    return res.status(400).json({ error: 'bbox needs minLon, minLat, maxLon, maxLat as numbers' });
  if (minLon >= maxLon)
    return res.status(400).json({ error: 'minLon must be less than maxLon' });
  if (minLat >= maxLat)
    return res.status(400).json({ error: 'minLat must be less than maxLat' });

  req.bbox = { minLon, minLat, maxLon, maxLat };
  next();
}

module.exports = { validateLatLon, validateRadius, validateBbox };