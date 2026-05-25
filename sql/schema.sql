-- ═══════════════════════════════════════════════════════
--  BUSPASS — MySQL Schema
--  Run this once to initialise the database
-- ═══════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS buspass
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE buspass;

-- ── USERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR(36)   PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  phone       VARCHAR(15)   NOT NULL,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
);

-- ── ROUTES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id          VARCHAR(10)   PRIMARY KEY,
  from_city   VARCHAR(80)   NOT NULL,
  to_city     VARCHAR(80)   NOT NULL,
  distance    VARCHAR(20)   NOT NULL,
  duration    VARCHAR(20)   NOT NULL,
  base_fare   INT           NOT NULL,
  status      ENUM('Active','Maintenance','Suspended') NOT NULL DEFAULT 'Active',
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_from   (from_city),
  INDEX idx_to     (to_city),
  INDEX idx_status (status)
);

-- ── TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id            VARCHAR(20)   PRIMARY KEY,
  user_id       VARCHAR(36)   NOT NULL,
  route_id      VARCHAR(10)   NOT NULL,
  travel_date   DATE          NOT NULL,
  departure     VARCHAR(10)   NOT NULL,
  passengers    TINYINT       NOT NULL DEFAULT 1,
  class         ENUM('general','sleeper','ac') NOT NULL DEFAULT 'general',
  base_fare     INT           NOT NULL,
  total_fare    INT           NOT NULL,
  status        ENUM('active','cancelled') NOT NULL DEFAULT 'active',
  booked_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at  DATETIME      NULL,
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE RESTRICT,
  INDEX idx_user_id    (user_id),
  INDEX idx_travel_date(travel_date),
  INDEX idx_status     (status)
);

-- ── ROUTE TIMINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_timings (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  route_id    VARCHAR(10)   NOT NULL,
  departs_at  VARCHAR(10)   NOT NULL,
  label       VARCHAR(30)   NOT NULL,
  tag         VARCHAR(30)   NOT NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  INDEX idx_route (route_id)
);
