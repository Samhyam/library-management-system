// Business-logic layer for the dashboard statistics.
const { today } = require('../utils/dates');

module.exports = ({ bookRepo, memberRepo, borrowingRepo }) => ({
  stats() {
    const books = bookRepo.counts();
    const loans = borrowingRepo.stats(today());
    return {
      totalBooks: books.total,
      availableBooks: books.available,
      borrowedBooks: books.total - books.available,
      totalMembers: memberRepo.count(),
      activeBorrowings: loans.active,
      overdueBorrowings: loans.overdue,
    };
  },
});
