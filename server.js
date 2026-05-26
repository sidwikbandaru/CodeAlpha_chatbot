// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');   // ✅ FIX 1: require path once, at the top
const fs = require('fs');

const { pool, testConnection } = require('./config/db');

// ── Route imports ─────────────────────────────────────────
const authRoutes = require('./routes/auth');
const routeRoutes = require('./routes/routes');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');

const chatRoutes = require('./routes/chat');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ═══════════════════════════════════════════════════════
//  GLOBAL MIDDLEWARE
// ═══════════════════════════════════════════════════════
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true,
}));

// app.use(cors({
//   origin: ['https://chatbox-codealpha.netlify.app', '*'],
//   credentials: true
// }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve index.html and static files
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use('/api/chat', chatRoutes);


// Rate limiting — 100 requests per 15 minutes per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please slow down.' },
}));

// Stricter limiter for auth routes
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Try again later.' },
}));

// ═══════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'BusPass API is running', time: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ═══════════════════════════════════════════════════════
//  SEED ADMIN USER
// ═══════════════════════════════════════════════════════
async function seedAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@bus.com';
    const pass = process.env.ADMIN_PASSWORD || 'admin123';
    const name = process.env.ADMIN_NAME || 'Admin';
    const phone = process.env.ADMIN_PHONE || '9999999999';

    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length > 0) return; // already exists

    const hashed = await bcrypt.hash(pass, 12);
    await pool.query(
      'INSERT INTO users (id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), name, email, phone, hashed, 'admin']
    );
    console.log(`✅  Admin seeded — ${email} / ${pass}`);
  } catch (err) {
    console.error('Admin seed failed:', err.message);
  }
}

async function seedDatabase() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM routes');
    const count = rows[0].count;
    if (count < 5) {
      console.log('🌱  Database has few/no routes. Running auto-seed...');
      const seedFilePath = path.join(__dirname, 'sql', 'seed.sql');
      if (fs.existsSync(seedFilePath)) {
        const seedSql = fs.readFileSync(seedFilePath, 'utf8');
        const queries = seedSql
          .replace(/--.*$/gm, '')
          .split(';')
          .map(q => q.trim())
          .filter(q => q.length > 0);
        for (let query of queries) {
          if (query.toUpperCase().startsWith('USE ')) continue;
          await pool.query(query);
        }
        console.log('✅  Database routes and timings seeded successfully!');
      } else {
        console.warn('⚠️  seed.sql not found, skipping routes seeding.');
      }
    } else {
      console.log(`📊  Database already contains ${count} routes. Skipping auto-seed.`);
    }
  } catch (err) {
    console.error('❌  Auto-seed failed:', err.message);
  }
}

// ═══════════════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════════════
async function start() {
  await testConnection();
  await seedAdmin();
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`🚌  BusPass API running → http://localhost:${PORT}`);
    console.log(`📋  Endpoints:`);
    console.log(`    POST   /api/auth/register`);
    console.log(`    POST   /api/auth/login`);
    console.log(`    GET    /api/auth/me`);
    console.log(`    GET    /api/routes`);
    console.log(`    GET    /api/routes/cities`);
    console.log(`    GET    /api/routes/:id/timings`);
    console.log(`    POST   /api/tickets`);
    console.log(`    GET    /api/tickets`);
    console.log(`    PATCH  /api/tickets/:id/cancel`);
    console.log(`    GET    /api/admin/stats`);
    console.log(`    GET    /api/admin/users`);
    console.log(`    GET    /api/admin/revenue`);
  });
}

start();
