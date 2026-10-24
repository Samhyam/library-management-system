const { setup, memberData, makeBook, makeMember } = require('./helpers');

let api, db;
beforeEach(() => { ({ api, db } = setup()); });
afterEach(() => db.close());

describe('Members API', () => {
  test('TC-M01: add a valid member', async () => {
    const res = await api.post('/api/members').send(memberData({ name: 'Aarav Sharma' }));
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Aarav Sharma');
    expect(res.body.membershipDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('TC-M02: view and search members', async () => {
    await makeMember(api, { name: 'Priya Nair', email: 'priya@example.com', phone: '9845012345' });
    await makeMember(api, { name: 'Rohan Gowda', email: 'rohan@example.com', phone: '9900112233' });
    expect((await api.get('/api/members')).body).toHaveLength(2);
    const find = async (q) => (await api.get('/api/members').query({ search: q })).body.map((m) => m.name);
    expect(await find('priya')).toEqual(['Priya Nair']);
    expect(await find('rohan@')).toEqual(['Rohan Gowda']);
    expect(await find('990011')).toEqual(['Rohan Gowda']);
  });

  test('TC-M03: view a specific member', async () => {
    const m = await makeMember(api);
    const res = await api.get(`/api/members/${m.id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(m.email);
  });

  test('TC-M04: edit a member', async () => {
    const m = await makeMember(api);
    const res = await api.put(`/api/members/${m.id}`).send({ ...m, name: 'New Name', phone: '9111111111' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'New Name', phone: '9111111111' });
  });

  test('TC-M05: delete a member with no history', async () => {
    const m = await makeMember(api);
    expect((await api.delete(`/api/members/${m.id}`)).status).toBe(204);
    expect((await api.get(`/api/members/${m.id}`)).status).toBe(404);
  });

  test('TC-M06: invalid member data is rejected', async () => {
    const res = await api.post('/api/members').send({ name: '', email: 'not-an-email', phone: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual(['email', 'name', 'phone']);
  });

  test('TC-M07: duplicate email is rejected', async () => {
    const m = await makeMember(api);
    const res = await api.post('/api/members').send(memberData({ email: m.email.toUpperCase() }));
    expect(res.status).toBe(409);
    expect(res.body.error.details[0].field).toBe('email');
  });

  test('TC-M08: cannot delete a member with borrowing records', async () => {
    const b = await makeBook(api); const m = await makeMember(api);
    await api.post('/api/borrowings').send({ bookId: b.id, memberId: m.id });
    const res = await api.delete(`/api/members/${m.id}`);
    expect(res.status).toBe(409);
  });

  test('TC-M09: invalid and unknown member ids', async () => {
    expect((await api.get('/api/members/abc')).status).toBe(400);
    expect((await api.get('/api/members/999')).status).toBe(404);
  });

  test('TC-M10: email is stored in lower case', async () => {
    const res = await api.post('/api/members').send(memberData({ email: 'Mixed.Case@Example.COM' }));
    expect(res.body.email).toBe('mixed.case@example.com');
  });
});
