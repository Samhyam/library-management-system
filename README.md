# Library Management System

A full-stack web application that lets a librarian manage **books**, **members** and **borrowing / returning** of books.

- **Frontend:** HTML, CSS and vanilla JavaScript (no framework, no build step)
- **Backend:** Node.js + Express REST API, layered architecture
- **Database:** SQLite (relational, with foreign keys, constraints and indexes)
- **Testing:** Jest + Supertest (52 automated backend tests) and a browser test (Playwright, 28 checks)

## Objectives

1. Build a working full-stack application with frontend, backend, database and REST API.
2. Demonstrate CRUD on related entities (books, members, borrowings).
3. Enforce business rules: an unavailable book cannot be issued; a book that is not borrowed cannot be returned.
4. Validate data on both the frontend and the backend, with meaningful error messages.
5. Test the system and document the results.

## Features

- Dashboard: total/available/borrowed books, total members, active and overdue borrowings
- Books: add, view, edit, delete; search by title, author, ISBN or category; filter by category and availability
- Members: add, view, edit, delete; search by name, email or phone
- Borrowings: issue a book (default 14 days, or choose a due date), return a book, extend a due date; filter All / Active / Overdue / Returned
- Overdue status is calculated from the due date (never stored, so it cannot go stale)
- Deleting a book or member that has borrowing history is blocked, so history is never lost
- The database itself blocks a second active loan on the same book (partial unique index)

## Architecture

```
Browser (public/: HTML + CSS + JS)
        |  HTTP + JSON  (fetch)
Routes  ->  Controllers   read the request, send the response + status code
                |
            Services      business rules + validation (issue, return, delete rules)
                |
          Repositories    the only layer that writes SQL
                |
        SQLite database   (database/library.db)
```

Errors thrown anywhere (ValidationError 400, NotFoundError 404, ConflictError 409) are turned into a JSON response by one central error handler.

## Project structure

```
library-management/
├── database/
│   ├── schema.sql              tables, constraints, indexes
│   └── seed.sql                sample data (10 books, 6 members, 6 borrowings)
├── src/
│   ├── server.js               entry point: opens DB, starts Express
│   ├── app.js                  wires repositories -> services -> controllers -> routes
│   ├── db.js                   database connection, schema + seed loading
│   ├── routes/index.js         URL -> controller mapping
│   ├── controllers/            HTTP layer (4 files)
│   ├── services/               business logic (4 files)
│   ├── repositories/           SQL queries (3 files)
│   ├── models/index.js         DB row -> API object mappers
│   ├── middleware/             validateId.js, errorHandler.js
│   └── utils/                  errors.js, validators.js, dates.js
├── public/                     frontend (served by Express)
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── tests/                      Jest + Supertest tests, plus ui_e2e.py browser test
├── scripts/                    reset-db.js, test-report.js
├── postman/                    Postman collection for manual API testing
├── docs/                       DOCUMENTATION.md, TEST_REPORT.md, SCREENSHOT_GUIDE.md, VIVA_NOTES.md, screenshots/
└── package.json
```

## Technologies

| Technology | Used for |
|---|---|
| Node.js 20 or newer (22 LTS recommended) | Runs the backend |
| Express 5 | REST routing and static file serving |
| better-sqlite3 | SQLite driver (synchronous, supports transactions) |
| SQLite | Relational database stored in one file |
| HTML/CSS/JavaScript | Frontend (hand-written CSS, no CSS framework) |
| Jest + Supertest | Automated API and database tests |
| Playwright (optional, Python) | Browser end-to-end test and screenshots |
| Postman | Manual API testing |

## Installation

1. Install **Node.js 20 or newer (22 LTS recommended)** from https://nodejs.org. Check with `node -v`.
2. Open a terminal in the project folder and run:

```bash
npm install
```

## Configuration

No configuration is required. Optional environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port the server listens on |
| `DB_FILE` | `database/library.db` | Path of the SQLite database file |

Example (Windows PowerShell): `$env:PORT=4000; npm start`  Example (macOS/Linux): `PORT=4000 npm start`

## Database setup

The database is created **automatically** the first time you run `npm start`: the server runs `database/schema.sql`, then loads `database/seed.sql` if the tables are empty.

To wipe everything and start again with the sample data:

```bash
npm run db:reset
```

You can open `database/library.db` in **DB Browser for SQLite** to inspect the tables.

## Running the application

```bash
npm start
```

Open **http://localhost:3000** in a browser. The same server provides the web pages and the API under `/api`. For auto-restart while editing code use `npm run dev`.

## API documentation

Base URL: `http://localhost:3000/api`. All request and response bodies are JSON.

**Error format (every error):**

```json
{ "error": { "status": 409, "message": "…", "details": [ { "field": "isbn", "message": "…" } ] } }
```

### Books

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/books` | List books. Optional `?search=` (title, author, ISBN, category), `?category=`, `?available=true\|false` | 200 | |
| GET | `/books/categories` | List distinct categories | 200 | |
| GET | `/books/:id` | One book | 200 | 400 bad id, 404 |
| POST | `/books` | Add a book | 201 | 400 validation, 409 duplicate ISBN |
| PUT | `/books/:id` | Edit a book | 200 | 400, 404, 409 |
| DELETE | `/books/:id` | Delete a book | 204 | 400, 404, 409 on loan or has history |

Book body: `{ "title", "author", "isbn", "category", "publicationYear" }`. Availability is **not** edited directly; it changes only when a book is issued or returned.

### Members

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/members` | List members. Optional `?search=` (name, email, phone) | 200 | |
| GET | `/members/:id` | One member | 200 | 400, 404 |
| POST | `/members` | Add a member | 201 | 400, 409 duplicate email |
| PUT | `/members/:id` | Edit a member | 200 | 400, 404, 409 |
| DELETE | `/members/:id` | Delete a member | 204 | 400, 404, 409 has borrowing records |

Member body: `{ "name", "email", "phone", "membershipDate" (optional, defaults to today) }`.

### Borrowings

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| GET | `/borrowings` | List records. Optional `?status=active\|returned\|overdue` | 200 | 400 bad filter |
| GET | `/borrowings/:id` | One record (includes book title and member name) | 200 | 400, 404 |
| POST | `/borrowings` | Issue a book: `{ "bookId", "memberId", "dueDate"? }` (default due date = today + 14 days) | 201 | 400, 404 book/member missing, 409 book unavailable |
| PATCH | `/borrowings/:id/return` | Return a book | 200 | 400, 404, 409 already returned |
| PATCH | `/borrowings/:id/due-date` | Extend due date: `{ "dueDate" }` (must be later than the current one) | 200 | 400, 404, 409 already returned |

### Other

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Statistics: totalBooks, availableBooks, borrowedBooks, totalMembers, activeBorrowings, overdueBorrowings |
| GET | `/health` | `{ "status": "ok" }` |

Import `postman/library-api.postman_collection.json` into Postman to try every endpoint (the collection variable `baseUrl` is `http://localhost:3000/api`).

## Testing

```bash
npm test                # runs all 52 backend tests
npm run test:report     # re-runs the tests and regenerates docs/TEST_REPORT.md
```

Backend tests use a fresh in-memory database each time; they never touch `database/library.db`.

Optional browser test (needs Python and Playwright: `pip install playwright && playwright install chromium`). Start the server on port 3111 with a throw-away database, then run the script from the project folder:

```bash
# macOS/Linux
DB_FILE=/tmp/ui-test.db PORT=3111 npm start &
python3 tests/ui_e2e.py
```

See `docs/TEST_REPORT.md` for every test case with input, expected result, actual result and Pass/Fail.

## Screenshots

See `docs/SCREENSHOT_GUIDE.md` for exactly which screenshots to take. Automatically captured UI screenshots are in `docs/screenshots/`.

## Limitations

- Single librarian user; there is no login.
- ISBN validation checks the format (10 or 13 characters), not the check digit.
- Fines, reservations and email reminders are not implemented.
- SQLite suits a single library desk; many simultaneous users would need a server database.

## Future improvements

Login with roles, ISBN check-digit validation, fines for overdue books, reservations, pagination for large lists, email reminders, importing books from CSV, and deployment with a server database such as PostgreSQL.
