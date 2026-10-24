// Database connection + schema setup.
// This is the ONLY file that knows where the database file lives.
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'database');
const DEFAULT_FILE = process.env.DB_FILE || path.join(DB_DIR, 'library.db');

function openDatabase(file = DEFAULT_FILE) {
  const db = new Database(file);
  db.pragma('foreign_keys = ON'); // SQLite enforces foreign keys per connection
  return db;
}

function applySchema(db) {
  db.exec(fs.readFileSync(path.join(DB_DIR, 'schema.sql'), 'utf8'));
}

function applySeed(db) {
  db.exec(fs.readFileSync(path.join(DB_DIR, 'seed.sql'), 'utf8'));
}

// First run: create tables and load sample data if the database is empty.
function initialise(db, { withSeed = true } = {}) {
  applySchema(db);
  const empty = db.prepare('SELECT COUNT(*) AS n FROM books').get().n === 0
    && db.prepare('SELECT COUNT(*) AS n FROM members').get().n === 0;
  if (withSeed && empty) applySeed(db);
}

module.exports = { openDatabase, applySchema, applySeed, initialise };
