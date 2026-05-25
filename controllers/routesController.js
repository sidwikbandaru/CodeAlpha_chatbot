// controllers/routesController.js
const { pool } = require('../config/db');

// ── GET /api/routes ───────────────────────────────────────
// Query params: from, to, status
async function getAllRoutes(req, res) {
  try {
    const { from, to, status } = req.query;
    let sql    = 'SELECT * FROM routes WHERE 1=1';
    const args = [];

    if (from)   { sql += ' AND from_city LIKE ?'; args.push(`%${from}%`); }
    if (to)     { sql += ' AND to_city   LIKE ?'; args.push(`%${to}%`);   }
    if (status) { sql += ' AND status = ?';        args.push(status);       }

    sql += ' ORDER BY id';
    const [rows] = await pool.query(sql, args);
    res.json({ success: true, count: rows.length, routes: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/routes/cities ────────────────────────────────
// Returns sorted unique city list
async function getCities(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT from_city AS city FROM routes WHERE status = 'Active'
       UNION
       SELECT DISTINCT to_city   AS city FROM routes WHERE status = 'Active'
       ORDER BY city`
    );
    res.json({ success: true, cities: rows.map(r => r.city) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/routes/:id ───────────────────────────────────
async function getRouteById(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM routes WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Route not found.' });

    // Attach timings
    const [timings] = await pool.query(
      'SELECT departs_at, label, tag FROM route_timings WHERE route_id = ? ORDER BY departs_at',
      [req.params.id]
    );
    res.json({ success: true, route: { ...rows[0], timings } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/routes/:id/timings ───────────────────────────
async function getRouteTimings(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT departs_at, label, tag FROM route_timings WHERE route_id = ? ORDER BY departs_at',
      [req.params.id]
    );
    // If no DB timings, generate deterministic fallback
    if (rows.length === 0) {
      const seed = req.params.id.split('').reduce((s,c) => s + c.charCodeAt(0), 0);
      const pool2 = [
        { departs_at:'05:30', label:'Early Morning', tag:'First Bus' },
        { departs_at:'06:00', label:'Early Morning', tag:'First Bus' },
        { departs_at:'07:00', label:'Morning',       tag:'Peak Hour' },
        { departs_at:'08:30', label:'Morning',       tag:'Peak Hour' },
        { departs_at:'10:00', label:'Late Morning',  tag:'Comfortable' },
        { departs_at:'12:00', label:'Afternoon',     tag:'Midday' },
        { departs_at:'13:30', label:'Afternoon',     tag:'Midday' },
        { departs_at:'15:00', label:'Evening',       tag:'Popular' },
        { departs_at:'17:30', label:'Evening',       tag:'Peak Hour' },
        { departs_at:'20:00', label:'Night',         tag:'Night Bus' },
        { departs_at:'22:00', label:'Night',         tag:'Night Bus' },
        { departs_at:'23:30', label:'Night',         tag:'Last Bus' },
      ];
      const timings = [
        pool2[seed % 4],
        pool2[4 + (seed * 3 % 4)],
        pool2[8 + (seed * 7 % 4)],
      ];
      return res.json({ success: true, timings, source: 'generated' });
    }
    res.json({ success: true, timings: rows, source: 'database' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── ADMIN: PUT /api/routes/:id/status ─────────────────────
async function updateRouteStatus(req, res) {
  try {
    const { status } = req.body;
    const valid = ['Active', 'Maintenance', 'Suspended'];
    if (!valid.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status.' });

    await pool.query('UPDATE routes SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Route ${req.params.id} set to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getAllRoutes, getCities, getRouteById, getRouteTimings, updateRouteStatus };
