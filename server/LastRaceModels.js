/**
 * Data models for API responses (WA1 style — constructor functions).
 * DAOs map SQL rows to these objects before sending JSON.
 */

function User(id, username) {
  this.id = id;
  this.username = username;
}

function Station(id, name, isInterchange) {
  this.id = id;
  this.name = name;
  this.isInterchange = !!isInterchange;
}

function Segment(fromId, toId, fromName, toName) {
  this.fromId = fromId;
  this.toId = toId;
  this.from = fromName;
  this.to = toName;
}

function Line(id, name, stations) {
  this.id = id;
  this.name = name;
  this.stations = stations ?? [];
}

// One hop of the journey after a valid submit — React shows these from steps[] one by one.
// event is just { description, effect } (no separate Event model; client never lists all events).
function GameStep(order, fromStationId, toStationId, fromName, toName, event, coinsAfter) {
  this.order = order;
  this.fromStationId = fromStationId;
  this.toStationId = toStationId;
  this.from = fromName;
  this.to = toName;
  this.event = event;
  this.coinsAfter = coinsAfter;
}

// What GET/POST game endpoints return. During setup/planning, coins is always 20.
// After completion, responses use finalScore instead (see gameDao.getGame).
function Game(
  id,
  status,
  coins,
  startStationId,
  destinationStationId,
  startName,
  destinationName,
  planningDeadline
) {
  this.id = id;
  this.status = status;
  this.coins = coins;
  this.startStationId = startStationId;
  this.destinationStationId = destinationStationId;
  this.start = startName;
  this.destination = destinationName;
  this.planningDeadline = planningDeadline ?? null;
}

export { User, Station, Segment, Line, GameStep, Game };
