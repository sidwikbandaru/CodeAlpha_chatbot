// controllers/adminController.js
const { pool } = require('../config/db');

// ── GET /api/admin/stats ──────────────────────────────────
async function getStats(req, res) {
  try {
    const [[users]]   = await pool.query('SELECT COUNT(*) AS total FROM users WHERE role = "user"');
    const [[tickets]] = await pool.query('SELECT COUNT(*) AS total FROM tickets');
    const [[active]]  = await pool.query("SELECT COUNT(*) AS total FROM tickets WHERE status = 'active'");
    const [[revenue]] = await pool.query("SELECT COALESCE(SUM(total_fare),0) AS total FROM tickets WHERE status = 'active'");
    const [[routes]]  = await pool.query("SELECT COUNT(*) AS total FROM routes WHERE status = 'Active'");

    res.json({
      success: true,
      stats: {
        totalUsers:    users.total,
        totalTickets:  tickets.total,
        activeTickets: active.total,
        totalRevenue:  revenue.total,
        activeRoutes:  routes.total,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/admin/users ──────────────────────────────────
async function getUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              COUNT(t.id) AS ticket_count
       FROM users u
       LEFT JOIN tickets t ON t.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, count: rows.length, users: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── DELETE /api/admin/users/:id ───────────────────────────
async function deleteUser(req, res) {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });

    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });

    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/admin/revenue ────────────────────────────────
// Revenue breakdown by route
async function getRevenue(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT r.from_city, r.to_city, r.id AS route_id,
              COUNT(t.id)             AS ticket_count,
              SUM(t.total_fare)       AS total_revenue,
              AVG(t.total_fare)       AS avg_fare
       FROM tickets t
       JOIN routes r ON t.route_id = r.id
       WHERE t.status = 'active'
       GROUP BY r.id
       ORDER BY total_revenue DESC
       LIMIT 20`
    );
    res.json({ success: true, revenue: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getStats, getUsers, deleteUser, getRevenue };
