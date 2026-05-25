# 🚌 BusPass — Backend Setup Guide

## Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MySQL 8+
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Security:** Helmet, CORS, Rate Limiting

---

## Project Structure

```
buspass-backend/
├── server.js                  ← Main entry point
├── package.json
├── .env.example               ← Copy to .env and fill in values
├── index.html                 ← Frontend (API-connected)
│
├── config/
│   └── db.js                  ← MySQL connection pool
│
├── middleware/
│   └── auth.js                ← JWT verify + admin guard
│
├── controllers/
│   ├── authController.js      ← Register, Login, Me
│   ├── routesController.js    ← Routes + Timings
│   ├── ticketsController.js   ← Book, List, Cancel
│   └── adminController.js     ← Stats, Users, Revenue
│
├── routes/
│   ├── auth.js
│   ├── routes.js
│   ├── tickets.js
│   └── admin.js
│
└── sql/
    ├── schema.sql             ← Run first — creates all tables
    └── seed.sql               ← Run second — inserts routes & timings
```

---

## Step 1 — MySQL Setup

Open MySQL and run:

```sql
source /path/to/buspass-backend/sql/schema.sql
source /path/to/buspass-backend/sql/seed.sql
```

Or via terminal:
```bash
mysql -u root -p < sql/schema.sql
mysql -u root -p < sql/seed.sql
```

---

## Step 2 — Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=buspass

JWT_SECRET=make_this_long_and_random_abc123xyz
JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@bus.com
ADMIN_PASSWORD=admin123

CLIENT_ORIGIN=http://localhost:3000
```

---

## Step 3 — Install & Run

```bash
npm install

# Development (auto-restart)
npm run dev

# Production
npm start
```

Server starts at: **http://localhost:5000**

---

## Step 4 — Open Frontend

Open `index.html` directly in your browser, or serve it:
```bash
npx serve . -p 3000
```

Then visit **http://localhost:3000**

---

## API Endpoints

### Auth
| Method | Endpoint              | Auth     | Description        |
|--------|-----------------------|----------|--------------------|
| POST   | /api/auth/register    | None     | Create account     |
| POST   | /api/auth/login       | None     | Login → JWT token  |
| GET    | /api/auth/me          | Bearer   | Get current user   |

### Routes
| Method | Endpoint                    | Auth     | Description         |
|--------|-----------------------------|----------|---------------------|
| GET    | /api/routes                 | None     | List all routes     |
| GET    | /api/routes/cities          | None     | All unique cities   |
| GET    | /api/routes/:id             | None     | Single route detail |
| GET    | /api/routes/:id/timings     | None     | Departure timings   |
| PUT    | /api/routes/:id/status      | Admin    | Update route status |

### Tickets
| Method | Endpoint                    | Auth     | Description         |
|--------|-----------------------------|----------|---------------------|
| POST   | /api/tickets                | Bearer   | Book a ticket       |
| GET    | /api/tickets                | Bearer   | List my tickets     |
| GET    | /api/tickets/:id            | Bearer   | Single ticket       |
| PATCH  | /api/tickets/:id/cancel     | Bearer   | Cancel ticket       |

### Admin
| Method | Endpoint                    | Auth     | Description         |
|--------|-----------------------------|----------|---------------------|
| GET    | /api/admin/stats            | Admin    | Dashboard stats     |
| GET    | /api/admin/users            | Admin    | All users           |
| DELETE | /api/admin/users/:id        | Admin    | Delete user         |
| GET    | /api/admin/revenue          | Admin    | Revenue by route    |

### Health
| Method | Endpoint      | Description    |
|--------|---------------|----------------|
| GET    | /api/health   | Server status  |

---

## Default Admin Credentials
```
Email:    admin@bus.com
Password: admin123
```
Change these in `.env` before going to production.

---

## Production Checklist
- [ ] Change `JWT_SECRET` to a long random string
- [ ] Change `ADMIN_PASSWORD` to something strong
- [ ] Set `NODE_ENV=production`
- [ ] Set `CLIENT_ORIGIN` to your actual domain
- [ ] Use HTTPS (SSL certificate)
- [ ] Use PM2 or similar process manager: `pm2 start server.js`
- [ ] Set up MySQL backups
