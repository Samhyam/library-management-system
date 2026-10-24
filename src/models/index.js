// Models: convert database rows (snake_case) into the objects the API returns (camelCase).
function toBook(r) {
  return {
    id: r.id, title: r.title, author: r.author, isbn: r.isbn, category: r.category,
    publicationYear: r.publication_year, isAvailable: r.is_available === 1,
  };
}

function toMember(r) {
  return { id: r.id, name: r.name, email: r.email, phone: r.phone, membershipDate: r.membership_date };
}

// A borrowing row comes from a JOIN, so it also carries the book title and member name.
// displayStatus: BORROWED, OVERDUE (calculated, not stored) or RETURNED.
function toBorrowing(r) {
  return {
    id: r.id, bookId: r.book_id, bookTitle: r.book_title, bookIsbn: r.book_isbn,
    memberId: r.member_id, memberName: r.member_name,
    borrowDate: r.borrow_date, dueDate: r.due_date, returnDate: r.return_date,
    status: r.status,
    displayStatus: r.status === 'RETURNED' ? 'RETURNED' : (r.is_overdue ? 'OVERDUE' : 'BORROWED'),
  };
}

module.exports = { toBook, toMember, toBorrowing };
