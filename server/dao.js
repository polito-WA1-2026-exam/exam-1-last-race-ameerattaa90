import db from './db.js';

/**
 * Promise wrapper for db.get()
 * Used when the query returns one row.
 */
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Promise wrapper for db.all()
 * Used when the query returns multiple rows.
 */
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Promise wrapper for db.run()
 * Used for INSERT, UPDATE, DELETE.
 */
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/* -------------------------------------------------------------------------- */
/* USERS                                                                      */
/* -------------------------------------------------------------------------- */

export async function getUserByEmail(email) {
  return dbGet(
    `
    SELECT id, email, name, salt, hash
    FROM users
    WHERE email = ?
    `,
    [email]
  );
}

export async function getUserById(id) {
  return dbGet(
    `
    SELECT id, email, name
    FROM users
    WHERE id = ?
    `,
    [id]
  );
}

/* -------------------------------------------------------------------------- */
/* NETWORK                                                                    */
/* -------------------------------------------------------------------------- */

export async function getStations() {
  return dbAll(
    `
    SELECT id, name
    FROM stations
    ORDER BY name
    `
  );
}

export async function getLines() {
  return dbAll(
    `
    SELECT id, name, color
    FROM lines
    ORDER BY id
    `
  );
}

export async function getLineStations() {
  return dbAll(
    `
    SELECT 
      ls.line_id,
      l.name AS line_name,
      l.color AS line_color,
      ls.station_id,
      s.name AS station_name,
      ls.position
    FROM line_stations ls
    JOIN lines l ON ls.line_id = l.id
    JOIN stations s ON ls.station_id = s.id
    ORDER BY ls.line_id, ls.position
    `
  );
}

/**
 * Full network for the setup phase.
 * This includes lines and their ordered stations.
 */
export async function getFullNetwork() {
  const stations = await getStations();
  const lines = await getLines();
  const lineStations = await getLineStations();

  const linesWithStations = lines.map((line) => ({
    ...line,
    stations: lineStations
      .filter((ls) => ls.line_id === line.id)
      .map((ls) => ({
        id: ls.station_id,
        name: ls.station_name,
        position: ls.position
      }))
  }));

  return {
    stations,
    lines: linesWithStations
  };
}

/**
 * Planning data.
 * Important: this does NOT expose the line names/colors.
 * During planning, the player should only see station names and segment pairs.
 */
export async function getPlanningNetwork() {
  const stations = await getStations();

  const segments = await dbAll(
    `
    SELECT 
      seg.id,
      seg.station1_id,
      s1.name AS station1_name,
      seg.station2_id,
      s2.name AS station2_name
    FROM segments seg
    JOIN stations s1 ON seg.station1_id = s1.id
    JOIN stations s2 ON seg.station2_id = s2.id
    ORDER BY seg.id
    `
  );

  return {
    stations,
    segments
  };
}

export async function getSegmentById(segmentId) {
  return dbGet(
    `
    SELECT 
      seg.id,
      seg.line_id,
      l.name AS line_name,
      seg.station1_id,
      s1.name AS station1_name,
      seg.station2_id,
      s2.name AS station2_name
    FROM segments seg
    JOIN lines l ON seg.line_id = l.id
    JOIN stations s1 ON seg.station1_id = s1.id
    JOIN stations s2 ON seg.station2_id = s2.id
    WHERE seg.id = ?
    `,
    [segmentId]
  );
}

export async function getAllSegmentsWithLines() {
  return dbAll(
    `
    SELECT 
      seg.id,
      seg.line_id,
      l.name AS line_name,
      seg.station1_id,
      s1.name AS station1_name,
      seg.station2_id,
      s2.name AS station2_name
    FROM segments seg
    JOIN lines l ON seg.line_id = l.id
    JOIN stations s1 ON seg.station1_id = s1.id
    JOIN stations s2 ON seg.station2_id = s2.id
    ORDER BY seg.id
    `
  );
}

export async function isInterchangeStation(stationId) {
  const row = await dbGet(
    `
    SELECT COUNT(*) AS line_count
    FROM line_stations
    WHERE station_id = ?
    `,
    [stationId]
  );

  return row.line_count > 1;
}

/* -------------------------------------------------------------------------- */
/* EVENTS                                                                     */
/* -------------------------------------------------------------------------- */

export async function getEvents() {
  return dbAll(
    `
    SELECT id, description, effect
    FROM events
    ORDER BY id
    `
  );
}

export async function getRandomEvent() {
  return dbGet(
    `
    SELECT id, description, effect
    FROM events
    ORDER BY RANDOM()
    LIMIT 1
    `
  );
}

/* -------------------------------------------------------------------------- */
/* GAMES                                                                      */
/* -------------------------------------------------------------------------- */

export async function createGame(userId, startStationId, destinationStationId) {
  const result = await dbRun(
    `
    INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, status)
    VALUES (?, ?, ?, 20, 'planning')
    `,
    [userId, startStationId, destinationStationId]
  );

  return result.lastID;
}

export async function getGameById(gameId) {
  return dbGet(
    `
    SELECT 
      g.id,
      g.user_id,
      g.start_station_id,
      start_s.name AS start_station_name,
      g.destination_station_id,
      dest_s.name AS destination_station_name,
      g.initial_coins,
      g.final_score,
      g.status,
      g.created_at,
      g.completed_at
    FROM games g
    JOIN stations start_s ON g.start_station_id = start_s.id
    JOIN stations dest_s ON g.destination_station_id = dest_s.id
    WHERE g.id = ?
    `,
    [gameId]
  );
}

export async function updateGameResult(gameId, finalScore, status) {
  return dbRun(
    `
    UPDATE games
    SET final_score = ?,
        status = ?,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = ?
    `,
    [finalScore, status, gameId]
  );
}

export async function saveGameStep(gameId, stepOrder, fromStationId, toStationId, lineId, eventId, coinsAfterStep) {
  return dbRun(
    `
    INSERT INTO game_steps
      (game_id, step_order, from_station_id, to_station_id, line_id, event_id, coins_after_step)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [gameId, stepOrder, fromStationId, toStationId, lineId, eventId, coinsAfterStep]
  );
}

export async function getGameSteps(gameId) {
  return dbAll(
    `
    SELECT
      gs.id,
      gs.step_order,
      gs.from_station_id,
      from_s.name AS from_station_name,
      gs.to_station_id,
      to_s.name AS to_station_name,
      gs.line_id,
      l.name AS line_name,
      gs.event_id,
      e.description AS event_description,
      e.effect AS event_effect,
      gs.coins_after_step
    FROM game_steps gs
    JOIN stations from_s ON gs.from_station_id = from_s.id
    JOIN stations to_s ON gs.to_station_id = to_s.id
    LEFT JOIN lines l ON gs.line_id = l.id
    LEFT JOIN events e ON gs.event_id = e.id
    WHERE gs.game_id = ?
    ORDER BY gs.step_order
    `,
    [gameId]
  );
}

/* -------------------------------------------------------------------------- */
/* RANKING                                                                    */
/* -------------------------------------------------------------------------- */

export async function getRanking() {
  return dbAll(
    `
    SELECT 
      u.id AS user_id,
      u.name,
      u.email,
      MAX(g.final_score) AS best_score
    FROM users u
    JOIN games g ON g.user_id = u.id
    WHERE g.status = 'completed'
    GROUP BY u.id, u.name, u.email
    ORDER BY best_score DESC, u.name ASC
    `
  );
}