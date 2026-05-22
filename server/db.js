import sqlite from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'studyplan.sqlite');

/** @type {import('sqlite3').Database | null} */
let db = null;

/** Wrap db.run — resolves with { lastID, changes } (same as Authentication dao.js). */
export function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/** Wrap db.get — single row or undefined. */
export function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/** Wrap db.all — array of rows. */
export function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const connection = new sqlite.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });
}

async function isDbEmpty() {
  const table = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'courses'"
  );
  if (!table) return true;
  const count = await get('SELECT COUNT(*) AS n FROM courses');
  return count.n === 0;
}

function readSqlFile(filename) {
  return fs.readFileSync(path.join(__dirname, filename), 'utf8');
}

/**
 * Opens SQLite and loads schema + seed when the database is new or has no courses.
 * Uses promise wrappers around sqlite3 callbacks (course async lecture pattern).
 */
export async function initDb() {
  if (db) return db;

  const isNew = !fs.existsSync(DB_PATH);
  db = await openDatabase();
  await run('PRAGMA foreign_keys = ON');

  if (isNew || (await isDbEmpty())) {
    await exec(readSqlFile('schema.sql'));
    await exec(readSqlFile('seed.sql'));
    console.log('Database initialized from schema.sql and seed.sql');
  }

  return db;
}

/** Returns the underlying sqlite3 Database after initDb(). */
export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call await initDb() first.');
  }
  return db;
}

/** Closes the connection (e.g. before deleting the DB file in tests). */
export function closeDb() {
  if (!db) return Promise.resolve();
  return new Promise((resolve, reject) => {
    db.close((err) => {
      db = null;
      if (err) reject(err);
      else resolve();
    });
  });
}
