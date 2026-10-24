// Data-access layer for members.
const { toMember } = require('../models');

module.exports = (db) => ({
  findAll({ search } = {}) {
    let sql = 'SELECT * FROM members'; const params = [];
    if (search) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?';
      const like = `%${search}%`; params.push(like, like, like);
    }
    sql += ' ORDER BY name COLLATE NOCASE';
    return db.prepare(sql).all(...params).map(toMember);
  },
  findById(id) {
    const r = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
    return r ? toMember(r) : null;
  },
  findByEmail(email) {
    const r = db.prepare('SELECT * FROM members WHERE email = ?').get(email);
    return r ? toMember(r) : null;
  },
  create(m) {
    const info = db.prepare(
      'INSERT INTO members (name, email, phone, membership_date) VALUES (?, ?, ?, ?)'
    ).run(m.name, m.email, m.phone, m.membershipDate);
    return this.findById(info.lastInsertRowid);
  },
  update(id, m) {
    db.prepare('UPDATE members SET name = ?, email = ?, phone = ?, membership_date = ? WHERE id = ?')
      .run(m.name, m.email, m.phone, m.membershipDate, id);
    return this.findById(id);
  },
  remove(id) {
    return db.prepare('DELETE FROM members WHERE id = ?').run(id).changes;
  },
  count() {
    return db.prepare('SELECT COUNT(*) AS n FROM members').get().n;
  },
});
