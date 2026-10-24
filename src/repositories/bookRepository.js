// Data-access layer for books. The ONLY place SQL for the books table is written.
const { toBook } = require('../models');

module.exports = (db) => ({
  findAll({ search, category, available } = {}) {
    const where = []; const params = [];
    if (search) {
      where.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?)');
      const like = `%${search}%`; params.push(like, like, like, like);
    }
    if (category) { where.push('category = ?'); params.push(category); }
    if (available === true)  where.push('is_available = 1');
    if (available === false) where.push('is_available = 0');
    const sql = `SELECT * FROM books ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY title COLLATE NOCASE`;
    return db.prepare(sql).all(...params).map(toBook);
  },
  findById(id) {
    const r = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
    return r ? toBook(r) : null;
  },
  findByIsbn(isbn) {
    const r = db.prepare('SELECT * FROM books WHERE isbn = ?').get(isbn);
    return r ? toBook(r) : null;
  },
  categories() {
    return db.prepare('SELECT DISTINCT category FROM books ORDER BY category COLLATE NOCASE').all().map((r) => r.category);
  },
  create(b) {
    const info = db.prepare(
      'INSERT INTO books (title, author, isbn, category, publication_year) VALUES (?, ?, ?, ?, ?)'
    ).run(b.title, b.author, b.isbn, b.category, b.publicationYear);
    return this.findById(info.lastInsertRowid);
  },
  update(id, b) {
    db.prepare(
      'UPDATE books SET title = ?, author = ?, isbn = ?, category = ?, publication_year = ? WHERE id = ?'
    ).run(b.title, b.author, b.isbn, b.category, b.publicationYear, id);
    return this.findById(id);
  },
  setAvailability(id, isAvailable) {
    db.prepare('UPDATE books SET is_available = ? WHERE id = ?').run(isAvailable ? 1 : 0, id);
  },
  remove(id) {
    return db.prepare('DELETE FROM books WHERE id = ?').run(id).changes;
  },
  counts() {
    return db.prepare(
      'SELECT COUNT(*) AS total, COALESCE(SUM(is_available), 0) AS available FROM books'
    ).get();
  },
});
