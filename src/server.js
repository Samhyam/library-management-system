// Entry point: opens the database, creates the app, starts listening.
const { openDatabase, initialise } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const db = openDatabase();
initialise(db);

createApp(db).listen(PORT, () => {
  console.log(`Library Management System running at http://localhost:${PORT}`);
});
