// Data-access layer for borrowings (joins books and members to return readable rows).
const { toBorrowing } = require('../models');

// The first `?` is today's date, used to calculate is_overdue for every row.
const SELECT = `
  SELECT br.*, b.title AS book_title, b.isbn AS book_isbn, m.name AS member_name,
         (br.status = 'BORROWED' AND br.due_date < ?) AS is_overdue
  FROM borrowings br
  JOIN books b   ON b.id = br.book_id
  JOIN members m ON m.id = br.member_id`;

module.exports = (db) => ({
  // status: 'active' | 'returned' | 'overdue' | undefined (all)
  findAll({ status } = {}, today) {
    const params = [today];
    let where = '';
    if (status === 'active')   where = "WHERE br.status = 'BORROWED'";
    if (status === 'returned') where = "WHERE br.status = 'RETURNED'";
    if (status === 'overdue')  { where = "WHERE br.status = 'BORROWED' AND br.due_date < ?"; params.push(today); }
    return db.prepare(`${SELECT} ${where} ORDER BY br.id DESC`).all(...params).map(toBorrowing);
  },
  findById(id, today) {
    const r = db.prepare(`${SELECT} WHERE br.id = ?`).get(today, id);
    return r ? toBorrowing(r) : null;
  },
  create({ bookId, memberId, borrowDate, dueDate }) {
    return db.prepare(
      "INSERT INTO borrowings (book_id, member_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, 'BORROWED')"
    ).run(bookId, memberId, borrowDate, dueDate).lastInsertRowid;
  },
  markReturned(id, returnDate) {
    db.prepare("UPDATE borrowings SET return_date = ?, status = 'RETURNED' WHERE id = ?").run(returnDate, id);
  },
  updateDueDate(id, dueDate) {
    db.prepare('UPDATE borrowings SET due_date = ? WHERE id = ?').run(dueDate, id);
  },
  countForBook(bookId) {
    return db.prepare('SELECT COUNT(*) AS n FROM borrowings WHERE book_id = ?').get(bookId).n;
  },
  countForMember(memberId) {
    return db.prepare('SELECT COUNT(*) AS n FROM borrowings WHERE member_id = ?').get(memberId).n;
  },
  stats(today) {
    return db.prepare(`
      SELECT
        COALESCE(SUM(status = 'BORROWED'), 0) AS active,
        COALESCE(SUM(status = 'BORROWED' AND due_date < ?), 0) AS overdue
      FROM borrowings`).get(today);
  },
});
