import { Router } from "express";
import { pool } from "../db/pool";

const router = Router();

// GET /api/alerts - Get all forest alerts
router.get("/", async (req, res) => {
  try {
    const { state, severity, startDate, endDate, limit = 100 } = req.query;
    
    let query = `
      SELECT id, state, lat, lon, severity, date, cause, source, confidence, notes, created_at
      FROM forest_alerts
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (state) {
      paramCount++;
      query += ` AND state = $${paramCount}`;
      params.push(state);
    }

    if (severity) {
      paramCount++;
      query += ` AND severity = $${paramCount}`;
      params.push(severity);
    }

    if (startDate) {
      paramCount++;
      query += ` AND date >= $${paramCount}`;
      params.push(startDate);
    }

    if (endDate) {
      paramCount++;
      query += ` AND date <= $${paramCount}`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      count: result.rows.length,
      alerts: result.rows
    });
  } catch (err) {
    console.error("Get alerts error:", err);
    res.status(500).json({ 
      error: "Database error",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// POST /api/alerts - Create a new forest alert
router.post("/", async (req, res) => {
  const { state, lat, lon, severity, cause, source, confidence, notes } = req.body;

  // Input validation
  if (!state || !lat || !lon || !severity || !cause || !source) {
    return res.status(400).json({
      error: "Missing required fields: state, lat, lon, severity, cause, and source are required"
    });
  }

  if (confidence && (confidence < 0 || confidence > 100)) {
    return res.status(400).json({
      error: "Confidence must be between 0 and 100"
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO forest_alerts (state, lat, lon, severity, cause, source, confidence, notes, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *;`,
      [state, lat, lon, severity, cause, source, confidence || 0, notes || '']
    );

    res.status(201).json({
      success: true,
      alert: result.rows[0]
    });
  } catch (err) {
    console.error("Create alert error:", err);
    res.status(500).json({ 
      error: "Database error",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// GET /api/alerts/stats - Get alert statistics
router.get("/stats", async (req, res) => {
  try {
    // Total alerts
    const totalAlerts = await pool.query(`SELECT COUNT(*) FROM forest_alerts;`);

    // Alerts by severity
    const bySeverity = await pool.query(
      `SELECT severity, COUNT(*) as count
       FROM forest_alerts
       GROUP BY severity
       ORDER BY severity;`
    );

    // Alerts by state
    const byState = await pool.query(
      `SELECT state, COUNT(*) as count
       FROM forest_alerts
       GROUP BY state
       ORDER BY count DESC;`
    );

    // Alerts by source
    const bySource = await pool.query(
      `SELECT source, COUNT(*) as count
       FROM forest_alerts
       GROUP BY source
       ORDER BY count DESC;`
    );

    // Recent alerts (last 7 days)
    const recentAlerts = await pool.query(
      `SELECT COUNT(*) as count
       FROM forest_alerts
       WHERE date >= NOW() - INTERVAL '7 days';`
    );

    // Average confidence
    const avgConfidence = await pool.query(
      `SELECT AVG(confidence) as avg_confidence
       FROM forest_alerts
       WHERE confidence > 0;`
    );

    res.json({
      success: true,
      totalAlerts: parseInt(totalAlerts.rows[0].count, 10),
      bySeverity: bySeverity.rows,
      byState: byState.rows,
      bySource: bySource.rows,
      recentAlerts: parseInt(recentAlerts.rows[0].count, 10),
      avgConfidence: parseFloat(avgConfidence.rows[0].avg_confidence || 0)
    });
  } catch (err) {
    console.error("Alert stats error:", err);
    res.status(500).json({ 
      error: "Database error",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

// GET /api/alerts/geojson - Get alerts as GeoJSON
router.get("/geojson", async (req, res) => {
  try {
    const { state, severity, limit = 1000 } = req.query;
    
    let query = `
      SELECT 
        id,
        state,
        lat,
        lon,
        severity,
        date,
        cause,
        source,
        confidence,
        notes
      FROM forest_alerts
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (state) {
      paramCount++;
      query += ` AND state = $${paramCount}`;
      params.push(state);
    }

    if (severity) {
      paramCount++;
      query += ` AND severity = $${paramCount}`;
      params.push(severity);
    }

    query += ` ORDER BY date DESC LIMIT $${++paramCount}`;
    params.push(parseInt(limit as string));

    const result = await pool.query(query, params);

    // Convert to GeoJSON format
    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map(alert => ({
        type: "Feature",
        properties: {
          id: alert.id,
          state: alert.state,
          severity: alert.severity,
          date: alert.date,
          cause: alert.cause,
          source: alert.source,
          confidence: alert.confidence,
          notes: alert.notes
        },
        geometry: {
          type: "Point",
          coordinates: [alert.lon, alert.lat]
        }
      }))
    };

    res.json(geojson);
  } catch (err) {
    console.error("Get alerts GeoJSON error:", err);
    res.status(500).json({ 
      error: "Database error",
      message: err instanceof Error ? err.message : "Unknown error"
    });
  }
});

export default router;
