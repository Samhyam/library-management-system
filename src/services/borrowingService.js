// Business-logic layer for borrowing: issue, return, extend due date.
// Issue and return each change TWO tables, so each runs inside one database transaction:
// either both changes are saved or neither is.
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { parseId, throwIfErrors } = require('../utils/validators');
const { today, addDays, isValidISODate } = require('../utils/dates');

const LOAN_DAYS = 14;
const STATUS_FILTERS = ['active', 'returned', 'overdue'];

module.exports = ({ db, bookRepo, memberRepo, borrowingRepo }) => {
  function requireBorrowing(id) {
    const b = borrowingRepo.findById(id, today());
    if (!b) throw new NotFoundError(`Borrowing record with id ${id} was not found.`);
    return b;
  }

  const issueTx = db.transaction((bookId, memberId, dueDate) => {
    const book = bookRepo.findById(bookId);                                             // 1. book exists?
    if (!book) throw new NotFoundError(`Book with id ${bookId} was not found.`);
    const member = memberRepo.findById(memberId);                                       // 2. member exists?
    if (!member) throw new NotFoundError(`Member with id ${memberId} was not found.`);
    if (!book.isAvailable)                                                              // 3. available?
      throw new ConflictError(`"${book.title}" is not available. It is currently issued to another member.`);
    const id = borrowingRepo.create({ bookId, memberId, borrowDate: today(), dueDate }); // 4. create record
    bookRepo.setAvailability(bookId, false);                                            // 5. mark unavailable
    return id;
  });

  const returnTx = db.transaction((id) => {
    const loan = borrowingRepo.findById(id, today());                                   // 1. find record
    if (!loan) throw new NotFoundError(`Borrowing record with id ${id} was not found.`);
    if (loan.status === 'RETURNED')
      throw new ConflictError(`This book was already returned on ${loan.returnDate}.`);
    borrowingRepo.markReturned(id, today());                                            // 2+3. date + status
    bookRepo.setAvailability(loan.bookId, true);                                        // 4. available again
  });

  return {
    list(query = {}) {
      if (query.status && !STATUS_FILTERS.includes(query.status))
        throw new ValidationError(`Invalid status filter. Use one of: ${STATUS_FILTERS.join(', ')}.`);
      return borrowingRepo.findAll({ status: query.status }, today());
    },
    get(id) { return requireBorrowing(id); },

    issue(body = {}) {
      const errors = [];
      const bookId = parseId(body.bookId);
      const memberId = parseId(body.memberId);
      if (!bookId) errors.push({ field: 'bookId', message: 'Select a book (bookId must be a positive whole number).' });
      if (!memberId) errors.push({ field: 'memberId', message: 'Select a member (memberId must be a positive whole number).' });
      let dueDate = body.dueDate;
      if (dueDate === undefined || dueDate === null || dueDate === '') dueDate = addDays(today(), LOAN_DAYS);
      else if (!isValidISODate(dueDate)) errors.push({ field: 'dueDate', message: 'Due date must be a valid date (YYYY-MM-DD).' });
      else if (dueDate < today()) errors.push({ field: 'dueDate', message: 'Due date cannot be in the past.' });
      throwIfErrors(errors);
      const id = issueTx(bookId, memberId, dueDate);
      return requireBorrowing(id);
    },

    returnBook(id) {
      returnTx(id);
      return requireBorrowing(id);
    },

    extendDueDate(id, body = {}) {
      const loan = requireBorrowing(id);
      if (loan.status === 'RETURNED') throw new ConflictError('A returned loan cannot be changed.');
      if (!isValidISODate(body.dueDate))
        throw new ValidationError('Validation failed.', [{ field: 'dueDate', message: 'Due date must be a valid date (YYYY-MM-DD).' }]);
      if (body.dueDate <= loan.dueDate)
        throw new ValidationError('Validation failed.', [{ field: 'dueDate', message: `New due date must be after the current due date (${loan.dueDate}).` }]);
      borrowingRepo.updateDueDate(id, body.dueDate);
      return requireBorrowing(id);
    },
  };
};
