-- Last Race — seed data (see docs/LAST-RACE-DATABASE.md)

INSERT INTO lines (name) VALUES
  ('Red Line'),
  ('Blue Line'),
  ('Green Line'),
  ('Yellow Line');

INSERT INTO stations (name) VALUES
  ('Centrale'),
  ('Porta Velaria'),
  ('Crocevia del Falco'),
  ('Mercato Vecchio'),
  ('Piazza delle Lanterne'),
  ('Fontana Oscura'),
  ('Borgo Sereno'),
  ('Colle Antico'),
  ('Viale dei Mosaici'),
  ('Stazione Lago'),
  ('Torre Cinerea'),
  ('Campo dell''Eco');

-- Red Line
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Centrale'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Porta Velaria'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Crocevia del Falco'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Mercato Vecchio'), 3;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Piazza delle Lanterne'), 4;

-- Blue Line
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Centrale'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Fontana Oscura'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Borgo Sereno'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Colle Antico'), 3;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Viale dei Mosaici'), 4;

-- Green Line
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Porta Velaria'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Fontana Oscura'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Stazione Lago'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Torre Cinerea'), 3;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Campo dell''Eco'), 4;

-- Yellow Line
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Piazza delle Lanterne'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Torre Cinerea'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Viale dei Mosaici'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Campo dell''Eco'), 3;

-- Segments from consecutive stations on each line
INSERT OR IGNORE INTO segments (station_a_id, station_b_id)
SELECT MIN(a.station_id, b.station_id), MAX(a.station_id, b.station_id)
FROM station_lines a
JOIN station_lines b
  ON a.line_id = b.line_id AND b.position = a.position + 1;

INSERT INTO events (description, effect) VALUES
  ('Quiet journey', 0),
  ('Wrong platform', -2),
  ('Kind passenger', 1),
  ('Delay bonus', 2),
  ('Lost ticket', -3),
  ('Tourist tips', 3),
  ('Signal failure', -4),
  ('Lucky find', 4);

INSERT INTO users (username, password_hash) VALUES
  ('player1', '$2b$10$mxrdejPNQjOEVOf5Q0dKe.JtSICQ/s7N3/QRgVQ1t8kKmBve3xsJm'),
  ('player2', '$2b$10$tx5elh4hESKg3s80rsegGOSH1AsMM1w4DgaCBJbSIw57SEf1Ljhy2'),
  ('player3', '$2b$10$Nmm.Q/x5ch.kxH1F16R/d./xyxQ2LJkjrCicq21XDKQ6.OT/vYk5i');

-- player1: completed games (best score 21)
INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Centrale'),
  (SELECT id FROM stations WHERE name = 'Viale dei Mosaici'),
  '[["Centrale","Fontana Oscura"],["Fontana Oscura","Borgo Sereno"],["Borgo Sereno","Colle Antico"],["Colle Antico","Viale dei Mosaici"]]',
  'completed',
  21
FROM users u WHERE u.username = 'player1';

INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Centrale'),
  (SELECT id FROM stations WHERE name = 'Campo dell''Eco'),
  '[["Centrale","Porta Velaria"],["Porta Velaria","Fontana Oscura"],["Fontana Oscura","Stazione Lago"],["Stazione Lago","Torre Cinerea"],["Torre Cinerea","Campo dell''Eco"]]',
  'completed',
  12
FROM users u WHERE u.username = 'player1';

-- player2: completed game (score 22)
INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Piazza delle Lanterne'),
  (SELECT id FROM stations WHERE name = 'Borgo Sereno'),
  '[["Piazza delle Lanterne","Torre Cinerea"],["Torre Cinerea","Viale dei Mosaici"],["Viale dei Mosaici","Colle Antico"],["Colle Antico","Borgo Sereno"]]',
  'completed',
  22
FROM users u WHERE u.username = 'player2';

-- Execution steps for player1 best game (final_score 21)
INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 1,
  (SELECT id FROM stations WHERE name = 'Centrale'),
  (SELECT id FROM stations WHERE name = 'Fontana Oscura'),
  (SELECT id FROM events WHERE description = 'Quiet journey'),
  20
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'player1' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 2,
  (SELECT id FROM stations WHERE name = 'Fontana Oscura'),
  (SELECT id FROM stations WHERE name = 'Borgo Sereno'),
  (SELECT id FROM events WHERE description = 'Kind passenger'),
  21
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'player1' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 3,
  (SELECT id FROM stations WHERE name = 'Borgo Sereno'),
  (SELECT id FROM stations WHERE name = 'Colle Antico'),
  (SELECT id FROM events WHERE description = 'Wrong platform'),
  19
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'player1' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 4,
  (SELECT id FROM stations WHERE name = 'Colle Antico'),
  (SELECT id FROM stations WHERE name = 'Viale dei Mosaici'),
  (SELECT id FROM events WHERE description = 'Delay bonus'),
  21
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'player1' AND g.final_score = 21;
