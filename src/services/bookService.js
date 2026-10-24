// Business-logic layer for books: validation, duplicate checks, delete rules.
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');
const { isBlank, normaliseIsbn, parseId, throwIfErrors } = require('../utils/validators');

module.exports = ({ bookRepo, borrowingRepo }) => {
  function validate(body = {}) {
    const errors = [];
    const out = {};
    for (const f of ['title', 'author', 'category']) {
      if (isBlank(body[f])) errors.push({ field: f, message: `${f[0].toUpperCase() + f.slice(1)} is required.` });
      else if (String(body[f]).trim().length > 150) errors.push({ field: f, message: `${f[0].toUpperCase() + f.slice(1)} must be 150 characters or fewer.` });
      else out[f] = String(body[f]).trim();
    }
    if (isBlank(body.isbn)) errors.push({ field: 'isbn', message: 'ISBN is required.' });
    else {
      const isbn = normaliseIsbn(body.isbn);
      if (!isbn) errors.push({ field: 'isbn', message: 'ISBN must be 10 or 13 digits (hyphens allowed; the last digit of a 10-digit ISBN may be X).' });
      else out.isbn = isbn;
    }
    const year = Number(body.publicationYear);
    const thisYear = new Date().getFullYear();
    if (isBlank(body.publicationYear)) errors.push({ field: 'publicationYear', message: 'Publication year is required.' });
    else if (!Number.isInteger(year) || year < 1000 || year > thisYear)
      errors.push({ field: 'publicationYear', message: `Publication year must be a whole number between 1000 and ${thisYear}.` });
    else out.publicationYear = year;
    throwIfErrors(errors);
    return out;
  }

  function requireBook(id) {
    const book = bookRepo.findById(id);
    if (!book) throw new NotFoundError(`Book with id ${id} was not found.`);
    return book;
  }

  function duplicateIsbn(isbn) {
    return new ConflictError(`A book with ISBN ${isbn} already exists.`, [{ field: 'isbn', message: 'This ISBN is already registered.' }]);
  }

  return {
    list(query = {}) {
      const available = query.available === 'true' ? true : query.available === 'false' ? false : undefined;
      return bookRepo.findAll({
        search: query.search ? String(query.search).trim() : undefined,
        category: query.category ? String(query.category).trim() : undefined,
        available,
      });
    },
    categories() { return bookRepo.categories(); },
    get(id) { return requireBook(id); },
    create(body) {
      const data = validate(body);
      if (bookRepo.findByIsbn(data.isbn)) throw duplicateIsbn(data.isbn);
      return bookRepo.create(data);
    },
    update(id, body) {
      requireBook(id);
      const data = validate(body);
      const clash = bookRepo.findByIsbn(data.isbn);
      if (clash && clash.id !== id) throw duplicateIsbn(data.isbn);
      return bookRepo.update(id, data);
    },
    remove(id) {
      const book = requireBook(id);
      if (!book.isAvailable)
        throw new ConflictError(`"${book.title}" is currently on loan and cannot be deleted. Return it first.`);
      if (borrowingRepo.countForBook(id) > 0)
        throw new ConflictError(`"${book.title}" has borrowing history and cannot be deleted.`);
      bookRepo.remove(id);
    },
    parseId,
  };
};
