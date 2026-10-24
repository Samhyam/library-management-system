// Routes: map HTTP method + URL to a controller function.
const express = require('express');
const validateId = require('../middleware/validateId');

module.exports = ({ book, member, borrowing, dashboard }) => {
  const r = express.Router();

  r.get('/health', (req, res) => res.json({ status: 'ok' }));
  r.get('/dashboard', dashboard.stats);

  r.get('/books',            book.list);
  r.get('/books/categories', book.categories);
  r.get('/books/:id',        validateId, book.get);
  r.post('/books',                       book.create);
  r.put('/books/:id',        validateId, book.update);
  r.delete('/books/:id',     validateId, book.remove);

  r.get('/members',          member.list);
  r.get('/members/:id',      validateId, member.get);
  r.post('/members',                     member.create);
  r.put('/members/:id',      validateId, member.update);
  r.delete('/members/:id',   validateId, member.remove);

  r.get('/borrowings',                   borrowing.list);
  r.get('/borrowings/:id',               validateId, borrowing.get);
  r.post('/borrowings',                  borrowing.issue);
  r.patch('/borrowings/:id/return',      validateId, borrowing.returnBook);
  r.patch('/borrowings/:id/due-date',    validateId, borrowing.extendDueDate);

  return r;
};
