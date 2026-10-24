const { openDatabase, applySchema } = require('../src/db');
const { createApp } = require('../src/app');
const request = require('supertest');

// A brand-new empty in-memory database for every test: tests never affect each other
// and never touch database/library.db.
function setup() {
  const db = openDatabase(':memory:');
  applySchema(db);
  const app = createApp(db);
  return { db, app, api: request(app) };
}

let n = 0;
const bookData = (o = {}) => {
  n += 1;
  return { title: `Test Book ${n}`, author: 'Test Author', isbn: String(9780000000000 + n), category: 'Testing', publicationYear: 2020, ...o };
};
const memberData = (o = {}) => {
  n += 1;
  return { name: `Test Member ${n}`, email: `member${n}@example.com`, phone: '9876543210', ...o };
};

async function makeBook(api, o) { return (await api.post('/api/books').send(bookData(o))).body; }
async function makeMember(api, o) { return (await api.post('/api/members').send(memberData(o))).body; }

module.exports = { setup, bookData, memberData, makeBook, makeMember };
