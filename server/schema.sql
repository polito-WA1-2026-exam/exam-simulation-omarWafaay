-- Last Race — exam database schema
-- PRAGMA foreign_keys = ON; is set in db.js

CREATE TABLE IF NOT EXISTS users (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lines (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS station_lines (
  line_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  PRIMARY KEY (line_id, station_id),
  FOREIGN KEY (line_id) REFERENCES lines (id) ON DELETE CASCADE,
  FOREIGN KEY (station_id) REFERENCES stations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS segments (
  station_a_id INTEGER NOT NULL,
  station_b_id INTEGER NOT NULL,
  PRIMARY KEY (station_a_id, station_b_id),
  CHECK (station_a_id < station_b_id),
  FOREIGN KEY (station_a_id) REFERENCES stations (id) ON DELETE CASCADE,
  FOREIGN KEY (station_b_id) REFERENCES stations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  effect INTEGER NOT NULL CHECK (effect >= -4 AND effect <= 4)
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  start_station_id INTEGER NOT NULL,
  dest_station_id INTEGER NOT NULL,
  route_json TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('setup', 'planning', 'execution', 'completed')
  ),
  final_score INTEGER CHECK (final_score IS NULL OR final_score >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (start_station_id) REFERENCES stations (id),
  FOREIGN KEY (dest_station_id) REFERENCES stations (id)
);

CREATE TABLE IF NOT EXISTS game_steps (
  game_id INTEGER NOT NULL,
  step_order INTEGER NOT NULL,
  from_station_id INTEGER NOT NULL,
  to_station_id INTEGER NOT NULL,
  event_id INTEGER NOT NULL,
  coins_after INTEGER NOT NULL,
  PRIMARY KEY (game_id, step_order),
  FOREIGN KEY (game_id) REFERENCES games (id) ON DELETE CASCADE,
  FOREIGN KEY (from_station_id) REFERENCES stations (id),
  FOREIGN KEY (to_station_id) REFERENCES stations (id),
  FOREIGN KEY (event_id) REFERENCES events (id)
);
