// controllers/ticketsController.js
const { pool } = require('../config/db');

// ── Fare multipliers ──────────────────────────────────────
const MULTIPLIERS = { general: 1, sleeper: 1.5, ac: 2 };

function calcFare(baseFare, passengers, cls) {
  return Math.round(baseFare * passengers * (MULTIPLIERS[cls] || 1));
}

function generateTicketID() {
  const prefix = 'BP';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

// ── POST /api/tickets ─────────────────────────────────────
async function bookTicket(req, res) {
  try {
    const { routeId, travelDate, departure, passengers, cls } = req.body;
    const userId = req.user.id;

    // Validate body
    if (!routeId || !travelDate || !departure || !passengers || !cls)
      return res.status(400).json({ success: false, message: 'All booking fields required.' });

    if (!['general','sleeper','ac'].includes(cls))
      return res.status(400).json({ success: false, message: 'Invalid class.' });

    const passNum = parseInt(passengers);
    if (isNaN(passNum) || passNum < 1 || passNum > 10)
      return res.status(400).json({ success: false, message: 'Passengers must be 1–10.' });

    // Validate date (not in past)
    const today = new Date(); today.setHours(0,0,0,0);
    const travel = new Date(travelDate);
    if (isNaN(travel.getTime()) || travel < today)
      return res.status(400).json({ success: false, message: 'Travel date must be today or future.' });

    // Get route
    const [routes] = await pool.query(
      "SELECT * FROM routes WHERE id = ? AND status = 'Active'",
      [routeId]
    );
    if (routes.length === 0)
      return res.status(404).json({ success: false, message: 'Route not found or inactive.' });

    const route      = routes[0];
    const baseFare   = route.base_fare;
    const totalFare  = calcFare(baseFare, passNum, cls);
    const ticketId   = generateTicketID();

    await pool.query(
      `INSERT INTO tickets
         (id, user_id, route_id, travel_date, departure, passengers, class, base_fare, total_fare, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [ticketId, userId, routeId, travelDate, departure, passNum, cls, baseFare, totalFare]
    );

    // Return full ticket with route info
    const ticket = {
      id: ticketId,
      userId,
      routeId,
      from:       route.from_city,
      to:         route.to_city,
      distance:   route.distance,
      duration:   route.duration,
      travelDate,
      departure,
      passengers: passNum,
      cls,
      baseFare,
      totalFare,
      status:     'active',
      bookedAt:   new Date().toISOString(),
    };

    res.status(201).json({ success: true, message: 'Ticket booked!', ticket });
  } catch (err) {
    console.error('bookTicket error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/tickets ──────────────────────────────────────
// User sees their own; admin sees all
async function getTickets(req, res) {
  try {
    const isAdmin = req.user.role === 'admin';
    const { status, from, to } = req.query;

    let sql = `
      SELECT t.*, r.from_city, r.to_city, r.distance, r.duration,
             u.name AS user_name, u.email AS user_email
      FROM tickets t
      JOIN routes r ON t.route_id = r.id
      JOIN users  u ON t.user_id  = u.id
      WHERE 1=1
    `;
    const args = [];

    if (!isAdmin) { sql += ' AND t.user_id = ?'; args.push(req.user.id); }
    if (status)   { sql += ' AND t.status = ?';  args.push(status); }
    if (from)     { sql += ' AND r.from_city LIKE ?'; args.push(`%${from}%`); }
    if (to)       { sql += ' AND r.to_city   LIKE ?'; args.push(`%${to}%`);   }

    sql += ' ORDER BY t.booked_at DESC';
    const [rows] = await pool.query(sql, args);

    res.json({ success: true, count: rows.length, tickets: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/tickets/:id ──────────────────────────────────
async function getTicketById(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, r.from_city, r.to_city, r.distance, r.duration,
              u.name AS user_name, u.email AS user_email
       FROM tickets t
       JOIN routes r ON t.route_id = r.id
       JOIN users  u ON t.user_id  = u.id
       WHERE t.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const ticket = rows[0];
    // Users can only view their own tickets
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── PATCH /api/tickets/:id/cancel ────────────────────────
async function cancelTicket(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM tickets WHERE id = ?', [req.params.id]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const ticket = rows[0];

    // Auth check
    if (req.user.role !== 'admin' && ticket.user_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Access denied.' });

    if (ticket.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Ticket already cancelled.' });

    await pool.query(
      "UPDATE tickets SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?",
      [req.params.id]
    );

    res.json({ success: true, message: 'Ticket cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { bookTicket, getTickets, getTicketById, cancelTicket };
