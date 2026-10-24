# Library Management System: Project Documentation

> Replace the placeholders in square brackets (name, roll number, course, guide) on the cover page of your report. Everything below describes what was actually built and tested.

## 1. Project title

Library Management System (full-stack web application)

## 2. Problem statement

Small libraries often record books, members and loans on paper or in spreadsheets. This causes duplicate records, books being issued twice, lost track of who holds a book, and no quick way to see which loans are overdue. A simple web application with a proper database is needed so that one librarian can manage all of this reliably.

## 3. Objectives

1. Store books, members and borrowing records in a relational database.
2. Let the librarian add, view, edit, delete and search books and members.
3. Issue and return books while guaranteeing that a book cannot be on loan to two members at once.
4. Show overdue loans and library statistics at a glance.
5. Validate all input on the frontend and the backend and show clear error messages.
6. Test the backend, the database rules and the user interface, and report the results.

## 4. Proposed solution

A three-part web application: a browser interface (HTML/CSS/JavaScript), a REST API (Node.js and Express) and a SQLite database. The browser never touches the database; it only calls the API. The API is split into controller, service and repository layers so each layer has one job. Business rules live in the service layer, and the most important rule (one active loan per book) is also enforced by the database.

## 5. Target users

- **Librarian / library administrator:** the only user type. Uses the system daily to issue and return books and maintain records.
- Secondary audience: students and examiners reading the project as an example of layered full-stack design.

## 6. Features

See the feature list in `README.md`. In summary: dashboard statistics; book CRUD with search and filters; member CRUD with search; issue, return and extend loans; overdue detection; protection of borrowing history; validation and error messages on every form.

## 7. Technologies used

| Technology | Purpose | Why it was chosen |
|---|---|---|
| HTML, CSS, JavaScript (`fetch`) | Frontend | No framework or build tools to learn; every call to the API is visible in `public/js/app.js` |
| Node.js 20+ and Express 5 | Backend REST API | Small, readable, JSON-native; one language on both sides |
| SQLite with better-sqlite3 | Database | A real relational database (keys, constraints, indexes, transactions) with no server to install |
| Jest and Supertest | Backend testing | Standard Node tools; Supertest calls the API without opening a network port |
| Playwright (Python) | Browser test and screenshots | Drives a real browser through the user flows |
| Postman | Manual API testing | Shows each endpoint and its status codes |
| VS Code, DB Browser for SQLite | Development and inspecting the database | Free tools |

Not used (so not claimed): Bootstrap or any CSS framework, an ORM, express-validator, React, authentication libraries. Validation is hand-written in `src/utils/validators.js` and the services.

## 8. System architecture

```
Browser (public/index.html, css/style.css, js/app.js)
      |  HTTP + JSON
      v
Routes (src/routes/index.js)        maps method + URL to a controller function
      v
Controllers (src/controllers/)      read req, call service, send res + status code
      v
Services (src/services/)            validation + business rules + transactions
      v
Repositories (src/repositories/)    all SQL; return model objects
      v
SQLite (database/library.db)
```

| Layer | Role | Must not |
|---|---|---|
| Frontend | Shows data, collects input, validates for quick feedback, calls the API | Talk to the database |
| Routes / Controllers | Translate HTTP into function calls and results into status codes | Contain business rules or SQL |
| Services | Decide what is allowed (book exists? available? duplicate ISBN?) | Know about HTTP or write SQL |
| Repositories | Run SQL queries | Decide business rules |
| Database | Store data; enforce constraints as a last line of defence | |

Supporting files: `src/models/index.js` converts database rows (`publication_year`) to API objects (`publicationYear`); `src/middleware/errorHandler.js` converts errors to JSON; `src/middleware/validateId.js` rejects bad ids; `src/utils/` holds error classes, validators and date helpers.

## 9. Database design

```
books (1) ──< borrowings >── (1) members
```

| Table | Columns |
|---|---|
| `books` | id PK, title, author, isbn UNIQUE, category, publication_year, is_available (0/1) |
| `members` | id PK, name, email UNIQUE, phone, membership_date |
| `borrowings` | id PK, book_id FK, member_id FK, borrow_date, due_date, return_date (NULL until returned), status (BORROWED/RETURNED) |

Constraints and indexes (see `database/schema.sql`):

- NOT NULL on every required column; CHECK constraints for non-blank text, year range, `is_available` in (0,1), `status` in (BORROWED, RETURNED), `due_date >= borrow_date`, and `status = 'RETURNED'` exactly when `return_date` is set.
- UNIQUE on `books.isbn` and `members.email`.
- Foreign keys `borrowings.book_id → books.id` and `borrowings.member_id → members.id` with `ON DELETE RESTRICT`, so a book or member with history cannot be deleted.
- Partial unique index `uq_one_active_loan_per_book` on `borrowings(book_id) WHERE status = 'BORROWED'`: a book can have only one active loan, enforced by the database.
- Ordinary indexes on title, author, category, member name, and on borrowings' book_id, member_id and status.
- "Overdue" is not stored. It is calculated as `status = 'BORROWED' AND due_date < today`, so it is always correct.
- `books.is_available` duplicates information that could be derived from `borrowings`. It is kept (as the brief requires) and updated in the same transaction as the loan, so the two cannot disagree.

## 10. Entities

**Book:** id, title, author, isbn, category, publicationYear, isAvailable.
**Member:** id, name, email, phone, membershipDate.
**Borrowing:** id, bookId, memberId, borrowDate, dueDate, returnDate, status. When read through the API it also includes bookTitle, bookIsbn, memberName and a calculated displayStatus (BORROWED, OVERDUE or RETURNED).

## 11. Relationships

- One book has many borrowings over time (one-to-many).
- One member has many borrowings (one-to-many).
- Therefore books and members have a many-to-many relationship, resolved by the `borrowings` table.

## 12. CRUD operations

| Operation | Books | Members | Borrowings |
|---|---|---|---|
| Create | `POST /api/books` | `POST /api/members` | `POST /api/borrowings` (issue) |
| Read | `GET /api/books`, `/books/:id` | `GET /api/members`, `/members/:id` | `GET /api/borrowings`, `/borrowings/:id` |
| Update | `PUT /api/books/:id` | `PUT /api/members/:id` | `PATCH /borrowings/:id/return`, `PATCH /borrowings/:id/due-date` |
| Delete | `DELETE /api/books/:id` | `DELETE /api/members/:id` | Not offered: loans are history |

### How each operation travels through the system

**Create a book.** The librarian clicks *Add book*, fills the form and clicks *Save book*. `app.js` runs `validateBook()`; if valid it calls `fetch('POST /api/books')` with JSON. The route in `routes/index.js` calls `bookController.create`, which calls `bookService.create`. The service validates again, checks that the ISBN is not already used (`bookRepo.findByIsbn`), then calls `bookRepo.create`, which runs `INSERT INTO books …`. SQLite returns the new id, the repository reads the row back, and the result travels up: model object, then `res.status(201).json(...)`, then the browser closes the dialog, shows "Book added." and reloads the list.

**Read books.** The Books page calls `GET /api/books?search=…`. The controller passes the query to `bookService.list`, which calls `bookRepo.findAll`, which builds a `SELECT … WHERE title LIKE ? OR …` with bound parameters. Rows become JSON and the browser draws the table (all text is HTML-escaped before display).

**Update a book.** *Edit* fetches `GET /api/books/:id` to fill the form; *Save book* sends `PUT /api/books/:id`. The service checks the book exists (404 if not), validates, checks the ISBN does not belong to a different book (409), and `bookRepo.update` runs `UPDATE books SET … WHERE id = ?`.

**Delete a book.** *Delete* asks for confirmation, then sends `DELETE /api/books/:id`. The service refuses if the book is on loan or has any borrowing history (409 with a clear message); otherwise `bookRepo.remove` runs `DELETE FROM books WHERE id = ?` and the API replies 204. Members work the same way.

**Issue a book.** `POST /api/borrowings` → `borrowingController.issue` → `borrowingService.issue`: validates the ids and due date (400), then inside **one database transaction**: (1) the book exists (404), (2) the member exists (404), (3) the book is available (409), (4) `INSERT INTO borrowings`, (5) `UPDATE books SET is_available = 0`. If any step fails the transaction is rolled back, so nothing is half-saved.

**Return a book.** `PATCH /api/borrowings/:id/return` → `borrowingService.returnBook`, again in one transaction: (1) find the loan (404), reject if already returned (409), (2) set `return_date` to today, (3) set status RETURNED, (4) set the book available again.

## 13. API design

Full endpoint tables, request bodies and status codes are in `README.md` ("API documentation"). Design choices:

- Resources are plural nouns (`/books`, `/members`, `/borrowings`).
- HTTP methods follow their meaning: GET reads, POST creates, PUT replaces an editable record, PATCH changes part of a record (return, due date), DELETE removes.
- Status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request (invalid input or id), 404 Not Found, 409 Conflict (duplicate or rule violated), 500 for unexpected server errors.
- Every error has the same JSON shape: `{ error: { status, message, details: [{ field, message }] } }`, so the frontend can show field-level messages.

## 14. Frontend design

A single page (`public/index.html`) with a left navigation (Dashboard, Books, Members, Borrowings). Navigation uses the URL hash (`#books`), so no page reloads. Forms open in dialogs; deletes and returns ask for confirmation; results are confirmed with a short message. Status pills use colour and text (Available, On loan, Borrowed, Overdue, Returned) so meaning does not rely on colour alone. The layout adapts to phone width, controls have visible keyboard focus, and animation is minimal and disabled for users who prefer reduced motion. `public/js/app.js` has one `api()` function through which every request to the backend passes.

## 15. Backend design

Express app created in `src/app.js` by plain function calls (repositories → services → controllers → routes), so the wiring can be read top to bottom and tests can create an app with an in-memory database. `src/server.js` opens the real database, creates the tables if needed and starts listening. The same Express app serves the frontend files from `public/`.

## 16. Validation

| Rule | Frontend | Backend |
|---|---|---|
| Title, author, category required (max 150 characters) | Yes | Yes |
| ISBN required; 10 or 13 characters after removing hyphens/spaces (last of 10 may be X) | Yes | Yes |
| Duplicate ISBN rejected | Shown from the server response | Yes (409) and database UNIQUE |
| Publication year: whole number 1000 to current year | Yes | Yes |
| Member name required; email valid; phone exactly 10 digits | Yes | Yes |
| Duplicate email rejected (case-insensitive: emails are stored lower-case) | Shown from the server response | Yes (409) and database UNIQUE |
| Ids in URLs must be positive whole numbers | n/a | Yes (400) |
| Book and member must exist when issuing | Choices come from the database | Yes (404) |
| Unavailable book cannot be issued | Only available books are listed | Yes (409) and database partial unique index |
| Book that is not borrowed cannot be returned | Return button shown only on active loans | Yes (409) |
| Due date valid and not in the past (issue); later than current due date (extend) | Yes | Yes |

The frontend validation gives instant feedback; the backend validation is the one that actually protects the data, because the API can be called by tools other than the web page.

## 17. Error handling

Services throw typed errors (`ValidationError` 400, `NotFoundError` 404, `ConflictError` 409). One handler in `src/middleware/errorHandler.js` converts them to JSON. It also handles malformed JSON (400), unknown API routes (JSON 404), database constraint errors as a safety net (409), and unexpected faults (500, logged on the server without leaking details). The frontend shows field errors beside the field, other errors inside the dialog or as a message at the bottom of the screen.

## 18. Testing

- **52 automated backend tests** (Jest + Supertest) covering books, members, borrowing, dashboard, API-level integration and direct database rules. Each test runs on a fresh in-memory database.
- **28 browser checks** (Playwright) that click through the real UI: lists, search, add with validation errors, duplicate ISBN, edit, delete and blocked delete, member add and search, issue, return, opening the extend-due-date dialog, overdue filter, dashboard counts and a phone-width layout check.
- **Manual API testing** with the Postman collection in `postman/`.

Every test case, with input, expected result, actual result and Pass/Fail, is in `docs/TEST_REPORT.md`. Run `npm test` to repeat them.

## 19. Results

All 52 backend tests and all 28 browser checks passed on the final build. The application starts with `npm start`, creates its database automatically, and supports the complete workflow: add and manage books and members, issue a book, see it marked On loan, return it, and see the dashboard counts update. Attempts to issue an unavailable book, return a returned book, add a duplicate ISBN or email, or delete records with history are rejected with clear messages. Screenshots are in `docs/screenshots/` (see `docs/SCREENSHOT_GUIDE.md`).

## 20. Limitations

- One user type and no login or permissions.
- ISBN check digit is not verified (format only).
- No fines, reservations, renewals limit or email reminders.
- No pagination: lists load all rows, which is fine for hundreds of records but not for very large libraries.
- A member can borrow any number of books at once (no borrowing limit).
- SQLite is suited to one librarian desk, not heavy concurrent use.
- The browser test was run in headless Chromium only; other browsers were not tested.

## 21. Future enhancements

Login and roles (librarian, admin); ISBN check-digit validation; borrowing limits per member; fines for overdue books; reservations for books on loan; email or SMS reminders; pagination and sorting; CSV import of books; moving the database to PostgreSQL or MySQL for multi-user deployment; deploying the app online.
