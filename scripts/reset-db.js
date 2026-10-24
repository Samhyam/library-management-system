// Deletes the database file and rebuilds it from schema.sql + seed.sql.
const fs = require('fs');
const path = require('path');
const { openDatabase, initialise } = require('../src/db');

const file = process.env.DB_FILE || path.join(__dirname, '..', 'database', 'library.db');
for (const f of [file, file + '-wal', file + '-shm']) if (fs.existsSync(f)) fs.unlinkSync(f);
const db = openDatabase(file);
initialise(db);
console.log('Database reset:', file);
