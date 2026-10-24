const { setup, makeBook, makeMember } = require('./helpers');

let api, db;
beforeEach(() => { ({ api, db } = setup()); });
afterEach(() => db.close());

describe('Dashboard', () => {
  test('TC-D01: dashboard statistics are correct', async () => {
    const b1 = await makeBook(api); await makeBook(api); await makeBook(api);
    const m = await makeMember(api); await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: b1.id, memberId: m.id });
    const res = await api.get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalBooks: 3, availableBooks: 2, borrowedBooks: 1, totalMembers: 2, activeBorrowings: 1, overdueBorrowings: 0 });
  });
});

describe('Frontend-backend integration', () => {
  test('TC-I01: backend serves the frontend page', async () => {
    const res = await api.get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toMatch(/Library/);
  });

  test('TC-I02: frontend assets are served', async () => {
    expect((await api.get('/js/app.js')).status).toBe(200);
    expect((await api.get('/css/style.css')).status).toBe(200);
  });

  test('TC-I03: unknown API route returns a JSON 404', async () => {
    const res = await api.get('/api/nothing');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.error.status).toBe(404);
  });

  test('TC-I04: malformed JSON body returns 400', async () => {
    const res = await api.post('/api/books').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/JSON/);
  });

  test('TC-I05: all errors use the same JSON shape', async () => {
    const res = await api.get('/api/books/999');
    expect(res.body).toEqual({ error: { status: 404, message: expect.any(String), details: [] } });
  });
});

describe('Database operations', () => {
  test('TC-DB01: issuing a book is saved in the database', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id });
    expect(db.prepare('SELECT is_available FROM books WHERE id = ?').get(b.id).is_available).toBe(0);
    expect(db.prepare("SELECT COUNT(*) n FROM borrowings WHERE book_id = ? AND status = 'BORROWED'").get(b.id).n).toBe(1);
  });

  test('TC-DB02: database rejects a second active loan for one book', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id });
    const dup = () => db.prepare("INSERT INTO borrowings (book_id, member_id, due_date) VALUES (?, ?, '2099-01-01')").run(b.id, m.id);
    expect(dup).toThrow(/UNIQUE/);
  });

  test('TC-DB03: database blocks deleting a book that has borrowings (foreign key)', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id })).body;
    await api.patch(`/api/borrowings/${loan.id}/return`);
    expect(() => db.prepare('DELETE FROM books WHERE id = ?').run(b.id)).toThrow(/FOREIGN KEY/);
  });

  test('TC-DB04: database CHECK rejects inconsistent status/return date', () => {
    expect(() => db.prepare("INSERT INTO books (title, author, isbn, category, publication_year) VALUES ('t','a','9780000000001','c',2000)").run()).not.toThrow();
    expect(() => db.prepare("INSERT INTO members (name, email, phone) VALUES ('n','e@e.com','1234567890')").run()).not.toThrow();
    expect(() => db.prepare("INSERT INTO borrowings (book_id, member_id, due_date, status) VALUES (1, 1, '2099-01-01', 'RETURNED')").run()).toThrow(/CHECK/);
  });

  test('TC-DB05: a failed issue leaves the database unchanged (transaction)', async () => {
    const b = await makeBook(api);
    await api.post('/api/borrowings').send({ bookId: b.id, memberId: 999 });
    expect(db.prepare('SELECT is_available FROM books WHERE id = ?').get(b.id).is_available).toBe(1);
    expect(db.prepare('SELECT COUNT(*) n FROM borrowings').get().n).toBe(0);
  });
});
