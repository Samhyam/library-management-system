const { setup, makeBook, makeMember } = require('./helpers');
const { today, addDays } = require('../src/utils/dates');

let api, db;
beforeEach(() => { ({ api, db } = setup()); });
afterEach(() => db.close());

const issue = (bookId, memberId, extra = {}) => api.post('/api/borrowings').send({ bookId, memberId, ...extra });

describe('Borrowing API', () => {
  test('TC-R01: issue an available book', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const res = await issue(b.id, m.id);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ bookId: b.id, memberId: m.id, status: 'BORROWED', displayStatus: 'BORROWED', returnDate: null });
    expect((await api.get(`/api/books/${b.id}`)).body.isAvailable).toBe(false);
  });

  test('TC-R02: issuing an unavailable book is rejected', async () => {
    const b = await makeBook(api); const m1 = await makeMember(api); const m2 = await makeMember(api);
    await issue(b.id, m1.id);
    const res = await issue(b.id, m2.id);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/not available/);
    expect((await api.get('/api/borrowings')).body).toHaveLength(1);
  });

  test('TC-R03: return a borrowed book', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await issue(b.id, m.id)).body;
    const res = await api.patch(`/api/borrowings/${loan.id}/return`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'RETURNED', displayStatus: 'RETURNED', returnDate: today() });
    expect((await api.get(`/api/books/${b.id}`)).body.isAvailable).toBe(true);
  });

  test('TC-R04: returning an already returned book is rejected', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await issue(b.id, m.id)).body;
    await api.patch(`/api/borrowings/${loan.id}/return`);
    const res = await api.patch(`/api/borrowings/${loan.id}/return`);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already returned/);
  });

  test('TC-R05: issuing a book that does not exist returns 404', async () => {
    const m = await makeMember(api);
    const res = await issue(999, m.id);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Book/);
  });

  test('TC-R06: issuing to a member that does not exist returns 404', async () => {
    const b = await makeBook(api);
    const res = await issue(b.id, 999);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/Member/);
    expect((await api.get(`/api/books/${b.id}`)).body.isAvailable).toBe(true);
  });

  test('TC-R07: missing or invalid ids return 400', async () => {
    const res = await api.post('/api/borrowings').send({ bookId: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toEqual(['bookId', 'memberId']);
  });

  test('TC-R08: default due date is 14 days from today', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const res = await issue(b.id, m.id);
    expect(res.body.borrowDate).toBe(today());
    expect(res.body.dueDate).toBe(addDays(today(), 14));
  });

  test('TC-R09: filter borrowings by active, returned and overdue', async () => {
    const m = await makeMember(api);
    const [b1, b2, b3] = [await makeBook(api), await makeBook(api), await makeBook(api)];
    const l1 = (await issue(b1.id, m.id)).body;
    await issue(b2.id, m.id);
    const l3 = (await issue(b3.id, m.id)).body;
    await api.patch(`/api/borrowings/${l1.id}/return`);
    // make loan 3 overdue directly in the database (cannot be done through the API)
    db.prepare('UPDATE borrowings SET borrow_date = ?, due_date = ? WHERE id = ?').run('2020-01-01', '2020-01-15', l3.id);
    const ids = async (s) => (await api.get('/api/borrowings').query({ status: s })).body.map((x) => x.id).sort();
    expect(await ids('active')).toEqual([2, 3]);
    expect(await ids('returned')).toEqual([1]);
    expect(await ids('overdue')).toEqual([3]);
    expect((await api.get(`/api/borrowings/${l3.id}`)).body.displayStatus).toBe('OVERDUE');
    expect((await api.get('/api/borrowings')).body).toHaveLength(3);
  });

  test('TC-R10: invalid status filter returns 400', async () => {
    expect((await api.get('/api/borrowings').query({ status: 'banana' })).status).toBe(400);
  });

  test('TC-R11: extend the due date of an active loan', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await issue(b.id, m.id)).body;
    const newDue = addDays(loan.dueDate, 7);
    const res = await api.patch(`/api/borrowings/${loan.id}/due-date`).send({ dueDate: newDue });
    expect(res.status).toBe(200);
    expect(res.body.dueDate).toBe(newDue);
  });

  test('TC-R12: due date cannot be moved earlier, or edited after return', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const loan = (await issue(b.id, m.id)).body;
    const earlier = await api.patch(`/api/borrowings/${loan.id}/due-date`).send({ dueDate: addDays(loan.dueDate, -1) });
    expect(earlier.status).toBe(400);
    await api.patch(`/api/borrowings/${loan.id}/return`);
    const after = await api.patch(`/api/borrowings/${loan.id}/due-date`).send({ dueDate: addDays(loan.dueDate, 5) });
    expect(after.status).toBe(409);
  });

  test('TC-R13: returning a record that does not exist returns 404', async () => {
    expect((await api.patch('/api/borrowings/999/return')).status).toBe(404);
    expect((await api.patch('/api/borrowings/abc/return')).status).toBe(400);
  });

  test('TC-R14: due date in the past is rejected on issue', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    const res = await issue(b.id, m.id, { dueDate: addDays(today(), -1) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('dueDate');
  });

  test('TC-R15: view a specific borrowing with book and member names', async () => {
    const b = await makeBook(api, { title: 'Wings of Fire' }); const m = await makeMember(api, { name: 'Priya Nair' });
    const loan = (await issue(b.id, m.id)).body;
    const res = await api.get(`/api/borrowings/${loan.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ bookTitle: 'Wings of Fire', memberName: 'Priya Nair' });
    expect((await api.get('/api/borrowings/999')).status).toBe(404);
  });

  test('TC-R16: a returned book can be issued again', async () => {
    const b = await makeBook(api); const m1 = await makeMember(api); const m2 = await makeMember(api);
    const l1 = (await issue(b.id, m1.id)).body;
    await api.patch(`/api/borrowings/${l1.id}/return`);
    expect((await issue(b.id, m2.id)).status).toBe(201);
  });
});
