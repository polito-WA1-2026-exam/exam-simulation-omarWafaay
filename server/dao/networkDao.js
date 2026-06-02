import { all } from '../db.js';
import { Line, Segment, Station } from '../LastRaceModels.js';

async function getInterchangeIds() {
  const rows = await all(
    `SELECT station_id AS id
     FROM station_lines
     GROUP BY station_id
     HAVING COUNT(DISTINCT line_id) > 1`
  );
  return new Set(rows.map((r) => r.id));
}

/** All segment pairs for the planning list. */
export async function listSegments() {
  const rows = await all(
    `SELECT seg.station_a_id AS fromId,
            seg.station_b_id AS toId,
            sa.name AS fromName,
            sb.name AS toName
     FROM segments seg
     JOIN stations sa ON sa.id = seg.station_a_id
     JOIN stations sb ON sb.id = seg.station_b_id
     ORDER BY seg.station_a_id, seg.station_b_id`
  );
  const segments = rows.map(
    (row) => new Segment(row.fromId, row.toId, row.fromName, row.toName)
  );
  return { segments };
}

/** Setup map: lines with ordered stations plus all segments. */
export async function getNetworkFull() {
  const interchangeIds = await getInterchangeIds();

  const lineRows = await all(
    `SELECT l.id AS lineId, l.name AS lineName,
            s.id AS stationId, s.name AS stationName, sl.position
     FROM lines l
     JOIN station_lines sl ON sl.line_id = l.id
     JOIN stations s ON s.id = sl.station_id
     ORDER BY l.name, sl.position`
  );

  const linesMap = new Map();
  for (const row of lineRows) {
    if (!linesMap.has(row.lineId)) {
      linesMap.set(row.lineId, new Line(row.lineId, row.lineName));
    }
    linesMap.get(row.lineId).stations.push(
      new Station(row.stationId, row.stationName, interchangeIds.has(row.stationId))
    );
  }

  const { segments } = await listSegments();
  return {
    lines: [...linesMap.values()],
    segments,
  };
}

/** Planning map: station names only (no lines). */
export async function getNetworkPlanning() {
  const interchangeIds = await getInterchangeIds();
  const rows = await all('SELECT id, name FROM stations ORDER BY name');
  return {
    stations: rows.map((row) => new Station(row.id, row.name, interchangeIds.has(row.id))),
  };
}
