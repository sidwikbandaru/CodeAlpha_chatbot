// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');

// ── Helper: sign JWT ──────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/auth/register ───────────────────────────────
async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;

    // Validate
    if (!name || !email || !phone || !password)
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    if (!/\S+@\S+\.\S+/.test(email))
      return res.status(400).json({ success: false, message: 'Invalid email format.' });

    // Check duplicate
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'Email already registered.' });

    // Hash & insert
    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    await pool.query(
      'INSERT INTO users (id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name.trim(), email.toLowerCase().trim(), phone.trim(), hashed, 'user']
    );

    const user = { id, name: name.trim(), email: email.toLowerCase().trim(), role: 'user' };
    const token = signToken(user);

    res.status(201).json({ success: true, message: 'Account created.', token, user });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── POST /api/auth/login ──────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required.' });

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (rows.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = signToken(user);
    const { password: _, ...safeUser } = user;

    res.json({ success: true, message: 'Login successful.', token, user: safeUser });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/auth/me ──────────────────────────────────────
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found.' });

    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { register, login, me };
