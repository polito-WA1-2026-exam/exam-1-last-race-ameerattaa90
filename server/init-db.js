import sqlite3 from 'sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'last_race.sqlite');
const db = new sqlite3.Database(dbPath);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function init() {
  await run('PRAGMA foreign_keys = OFF');

  await run('DROP TABLE IF EXISTS game_steps');
  await run('DROP TABLE IF EXISTS games');
  await run('DROP TABLE IF EXISTS events');
  await run('DROP TABLE IF EXISTS segments');
  await run('DROP TABLE IF EXISTS line_stations');
  await run('DROP TABLE IF EXISTS lines');
  await run('DROP TABLE IF EXISTS stations');
  await run('DROP TABLE IF EXISTS users');

  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE line_stations (
      line_id INTEGER NOT NULL,
      station_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY (line_id, station_id),
      UNIQUE (line_id, position),
      FOREIGN KEY (line_id) REFERENCES lines(id),
      FOREIGN KEY (station_id) REFERENCES stations(id)
    )
  `);

  await run(`
    CREATE TABLE segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      line_id INTEGER NOT NULL,
      station1_id INTEGER NOT NULL,
      station2_id INTEGER NOT NULL,
      FOREIGN KEY (line_id) REFERENCES lines(id),
      FOREIGN KEY (station1_id) REFERENCES stations(id),
      FOREIGN KEY (station2_id) REFERENCES stations(id),
      CHECK (station1_id <> station2_id)
    )
  `);

  await run(`
    CREATE TABLE events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      effect INTEGER NOT NULL CHECK (effect >= -4 AND effect <= 4)
    )
  `);

  await run(`
    CREATE TABLE games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_station_id INTEGER NOT NULL,
      destination_station_id INTEGER NOT NULL,
      initial_coins INTEGER NOT NULL DEFAULT 20,
      final_score INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (start_station_id) REFERENCES stations(id),
      FOREIGN KEY (destination_station_id) REFERENCES stations(id)
    )
  `);

  await run(`
    CREATE TABLE game_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      step_order INTEGER NOT NULL,
      from_station_id INTEGER NOT NULL,
      to_station_id INTEGER NOT NULL,
      line_id INTEGER,
      event_id INTEGER,
      coins_after_step INTEGER,
      FOREIGN KEY (game_id) REFERENCES games(id),
      FOREIGN KEY (from_station_id) REFERENCES stations(id),
      FOREIGN KEY (to_station_id) REFERENCES stations(id),
      FOREIGN KEY (line_id) REFERENCES lines(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);

  const users = [
    { email: 'alice@example.com', name: 'Alice', password: 'alicepwd' },
    { email: 'bob@example.com', name: 'Bob', password: 'bobpwd' },
    { email: 'carol@example.com', name: 'Carol', password: 'carolpwd' }
  ];

  for (const user of users) {
    const { salt, hash } = hashPassword(user.password);
    await run(
      'INSERT INTO users (email, name, salt, hash) VALUES (?, ?, ?, ?)',
      [user.email, user.name, salt, hash]
    );
  }

 const stations = [
  "Stazione Centrale",
  "Porta Nuova",
  "Piazza Castello",
  "Mole Antonelliana",
  "Lingotto",
  "Parco Valentino",
  "Politecnico",
  "Porta Susa",
  "Re Umberto",
  "Mercato Centrale",
  "Museo Egizio",
  "Giardini Reali"
];

  for (const station of stations) {
    await run('INSERT INTO stations (name) VALUES (?)', [station]);
  }

  const lines = [
    { name: 'Red Line', color: 'red' },
    { name: 'Blue Line', color: 'blue' },
    { name: 'Green Line', color: 'green' },
    { name: 'Yellow Line', color: 'yellow' }
  ];

  for (const line of lines) {
    await run('INSERT INTO lines (name, color) VALUES (?, ?)', [line.name, line.color]);
  }

  const lineStations = [
    // Red Line
    [1, 1, 1],
    [1, 2, 2],
    [1, 3, 3],
    [1, 4, 4],
    [1, 10, 5],

    // Blue Line
    [2, 1, 1],
    [2, 5, 2],
    [2, 6, 3],
    [2, 7, 4],
    [2, 11, 5],

    // Green Line
    [3, 2, 1],
    [3, 5, 2],
    [3, 8, 3],
    [3, 9, 4],

   // Yellow Line
[4, 4, 1],
[4, 7, 2],
[4, 8, 3],
[4, 12, 4]
  ];

  for (const [lineId, stationId, position] of lineStations) {
    await run(
      'INSERT INTO line_stations (line_id, station_id, position) VALUES (?, ?, ?)',
      [lineId, stationId, position]
    );
  }

  const segments = [
    // Red Line
    [1, 1, 2],
    [1, 2, 3],
    [1, 3, 4],
    [1, 4, 10],

    // Blue Line
    [2, 1, 5],
    [2, 5, 6],
    [2, 6, 7],
    [2, 7, 11],

    // Green Line
    [3, 2, 5],
    [3, 5, 8],
    [3, 8, 9],

    // Yellow Line
[4, 4, 7],
[4, 7, 8],
[4, 8, 12]
  ];

  for (const [lineId, station1Id, station2Id] of segments) {
    await run(
      'INSERT INTO segments (line_id, station1_id, station2_id) VALUES (?, ?, ?)',
      [lineId, station1Id, station2Id]
    );
  }

  const events = [
    ['Quiet journey', 0],
    ['Kind passenger gives you a tip', 1],
    ['You find coins near the ticket machine', 2],
    ['Fast connection saves time', 3],
    ['Wrong platform', -2],
    ['Minor delay', -1],
    ['Ticket inspection problem', -3],
    ['Lost wallet', -4]
  ];

  for (const [description, effect] of events) {
    await run(
      'INSERT INTO events (description, effect) VALUES (?, ?)',
      [description, effect]
    );
  }

  // Seed already completed games for two registered users.
  await run(`
    INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, status, completed_at)
    VALUES 
      (1, 1, 4, 20, 25, 'completed', CURRENT_TIMESTAMP)
  `);

  await run(`
    INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, status, completed_at)
    VALUES 
      (1, 2, 9, 20, 18, 'completed', CURRENT_TIMESTAMP)
  `);

  await run(`
    INSERT INTO games 
      (user_id, start_station_id, destination_station_id, initial_coins, final_score, status, completed_at)
    VALUES 
      (2, 5, 12, 20, 22, 'completed', CURRENT_TIMESTAMP)
  `);

  console.log('Database created and seeded successfully.');
}

init()
  .catch((err) => {
    console.error('Database initialization failed:', err);
  })
  .finally(() => {
    db.close();
  });