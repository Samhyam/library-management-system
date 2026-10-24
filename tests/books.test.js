const { setup, bookData, makeBook, makeMember } = require('./helpers');

let api, db;
beforeEach(() => { ({ api, db } = setup()); });
afterEach(() => db.close());

describe('Books API', () => {
  test('TC-B01: add a valid book', async () => {
    const res = await api.post('/api/books').send(bookData({ title: 'Clean Code', isbn: '978-0-13-235088-4' }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Clean Code', isbn: '9780132350884', isAvailable: true });
    expect(res.body.id).toBeGreaterThan(0);
  });

  test('TC-B02: view all books', async () => {
    await makeBook(api); await makeBook(api);
    const res = await api.get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('TC-B03: view a specific book', async () => {
    const b = await makeBook(api, { title: 'Sapiens' });
    const res = await api.get(`/api/books/${b.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Sapiens');
  });

  test('TC-B04: edit a book', async () => {
    const b = await makeBook(api);
    const res = await api.put(`/api/books/${b.id}`).send({ ...b, title: 'Updated Title', publicationYear: 2001 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: b.id, title: 'Updated Title', publicationYear: 2001 });
    expect((await api.get(`/api/books/${b.id}`)).body.title).toBe('Updated Title');
  });

  test('TC-B05: delete a book that has no history', async () => {
    const b = await makeBook(api);
    expect((await api.delete(`/api/books/${b.id}`)).status).toBe(204);
    expect((await api.get(`/api/books/${b.id}`)).status).toBe(404);
  });

  test('TC-B06: missing required fields are rejected', async () => {
    const res = await api.post('/api/books').send({ title: '   ' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'author', 'isbn', 'category', 'publicationYear']));
  });

  test('TC-B07: invalid ISBN format is rejected', async () => {
    const res = await api.post('/api/books').send(bookData({ isbn: '12345' }));
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('isbn');
  });

  test('TC-B08: invalid publication year is rejected', async () => {
    const future = new Date().getFullYear() + 1;
    for (const y of ['abc', 999, future, 2020.5]) {
      const res = await api.post('/api/books').send(bookData({ publicationYear: y }));
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('publicationYear');
    }
  });

  test('TC-B09: duplicate ISBN on create is rejected', async () => {
    const b = await makeBook(api);
    const res = await api.post('/api/books').send(bookData({ isbn: b.isbn }));
    expect(res.status).toBe(409);
    expect(res.body.error.details[0].field).toBe('isbn');
  });

  test('TC-B10: duplicate ISBN on edit is rejected', async () => {
    const a = await makeBook(api); const b = await makeBook(api);
    const res = await api.put(`/api/books/${b.id}`).send({ ...b, isbn: a.isbn });
    expect(res.status).toBe(409);
  });

  test('TC-B11: non-numeric id returns 400', async () => {
    for (const bad of ['abc', '-1', '0', '1.5']) {
      expect((await api.get(`/api/books/${bad}`)).status).toBe(400);
    }
  });

  test('TC-B12: id that does not exist returns 404', async () => {
    expect((await api.get('/api/books/999')).status).toBe(404);
    expect((await api.put('/api/books/999').send(bookData())).status).toBe(404);
    expect((await api.delete('/api/books/999')).status).toBe(404);
  });

  test('TC-B13: search and filter books', async () => {
    await makeBook(api, { title: 'Clean Code', author: 'Robert Martin', isbn: '9780132350884', category: 'Programming' });
    const s = await makeBook(api, { title: 'Sapiens', author: 'Yuval Harari', isbn: '9780099590088', category: 'History' });
    const find = async (q) => (await api.get('/api/books').query(q)).body.map((b) => b.title);
    expect(await find({ search: 'clean' })).toEqual(['Clean Code']);
    expect(await find({ search: 'harari' })).toEqual(['Sapiens']);
    expect(await find({ search: '9780099590088' })).toEqual(['Sapiens']);
    expect(await find({ category: 'Programming' })).toEqual(['Clean Code']);
    const m = await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: s.id, memberId: m.id });
    expect(await find({ available: 'false' })).toEqual(['Sapiens']);
    expect(await find({ available: 'true' })).toEqual(['Clean Code']);
  });

  test('TC-B14: cannot delete a book with borrowing history', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id })).body;
    await api.patch(`/api/borrowings/${loan.id}/return`);
    const res = await api.delete(`/api/books/${b.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/history/);
  });

  test('TC-B15: cannot delete a book that is on loan', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id });
    const res = await api.delete(`/api/books/${b.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/on loan/);
  });
});
