-- Last Race — seed data (see docs/LAST-RACE-DATABASE.md)
-- Station names inspired by Big Bus Tours London routes (topology unchanged).

INSERT INTO lines (name) VALUES
  ('Red Line'),
  ('Blue Line'),
  ('Green Line'),
  ('Yellow Line');

INSERT INTO stations (name) VALUES
  ('Green Park'),
  ('Regent Street'),
  ('Piccadilly Circus'),
  ('Trafalgar Square'),
  ('Covent Garden'),
  ('Hyde Park Corner'),
  ('Harrods'),
  ('Kensington Palace'),
  ('Notting Hill'),
  ('Lancaster Gate'),
  ('Tower of London'),
  ('Southwark');

-- Red Line (Big Bus Red Route — central sightseeing)
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Green Park'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Regent Street'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Piccadilly Circus'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Trafalgar Square'), 3;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Red Line'), (SELECT id FROM stations WHERE name = 'Covent Garden'), 4;

-- Blue Line (Big Bus Blue Route — west end)
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Green Park'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Hyde Park Corner'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Harrods'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Kensington Palace'), 3;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Blue Line'), (SELECT id FROM stations WHERE name = 'Notting Hill'), 4;

-- Green Line
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Regent Street'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Hyde Park Corner'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Lancaster Gate'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Green Line'), (SELECT id FROM stations WHERE name = 'Tower of London'), 3;

-- Yellow Line (Southwark is Yellow-only so interchange count stays at 6/12)
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Covent Garden'), 0;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Tower of London'), 1;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Southwark'), 2;
INSERT INTO station_lines (line_id, station_id, position)
SELECT (SELECT id FROM lines WHERE name = 'Yellow Line'), (SELECT id FROM stations WHERE name = 'Notting Hill'), 3;

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

-- password = scrypt(plain, salt, 16) as hex (see scripts/generate-user-seed.mjs)
INSERT INTO users (username, password, salt) VALUES
  ('Omar', '0082c7cb58611b309c54e8eed9de140e', '9d4b8f925ca5e3a54440287b2dc0c9bc'),
  ('Paolo', '960f7cfb98d4cee7b3fabdd4bff015fa', '81ecb808cee07c1bfb6e7d93a9071cf3'),
  ('Francesca', '622f4edfdc6d56ed71943213f9e657a5', 'ce9dcd1fbcfa1155c77b312b5089cdc2');

-- Omar: completed games (best score 21)
INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Green Park'),
  (SELECT id FROM stations WHERE name = 'Notting Hill'),
  '[[1,6],[6,7],[7,8],[8,9]]',
  'completed',
  21
FROM users u WHERE u.username = 'Omar';

INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Green Park'),
  (SELECT id FROM stations WHERE name = 'Southwark'),
  '[[1,2],[2,6],[6,10],[10,11],[11,12]]',
  'completed',
  12
FROM users u WHERE u.username = 'Omar';

-- Paolo: completed game (score 22)
INSERT INTO games (user_id, start_station_id, dest_station_id, route_json, status, final_score)
SELECT
  u.id,
  (SELECT id FROM stations WHERE name = 'Covent Garden'),
  (SELECT id FROM stations WHERE name = 'Harrods'),
  '[[5,11],[11,12],[12,9],[9,8],[8,7]]',
  'completed',
  22
FROM users u WHERE u.username = 'Paolo';

-- Execution steps for Omar best game (final_score 21)
INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 1,
  (SELECT id FROM stations WHERE name = 'Green Park'),
  (SELECT id FROM stations WHERE name = 'Hyde Park Corner'),
  (SELECT id FROM events WHERE description = 'Quiet journey'),
  20
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'Omar' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 2,
  (SELECT id FROM stations WHERE name = 'Hyde Park Corner'),
  (SELECT id FROM stations WHERE name = 'Harrods'),
  (SELECT id FROM events WHERE description = 'Kind passenger'),
  21
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'Omar' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 3,
  (SELECT id FROM stations WHERE name = 'Harrods'),
  (SELECT id FROM stations WHERE name = 'Kensington Palace'),
  (SELECT id FROM events WHERE description = 'Wrong platform'),
  19
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'Omar' AND g.final_score = 21;

INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
SELECT
  g.id, 4,
  (SELECT id FROM stations WHERE name = 'Kensington Palace'),
  (SELECT id FROM stations WHERE name = 'Notting Hill'),
  (SELECT id FROM events WHERE description = 'Delay bonus'),
  21
FROM games g
JOIN users u ON u.id = g.user_id
WHERE u.username = 'Omar' AND g.final_score = 21;
