-- Library Management System: schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS books (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    title            TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    author           TEXT    NOT NULL CHECK (length(trim(author)) > 0),
    isbn             TEXT    NOT NULL UNIQUE,
    category         TEXT    NOT NULL,
    publication_year INTEGER NOT NULL CHECK (publication_year BETWEEN 1000 AND 2100),
    is_available     INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))
);

CREATE TABLE IF NOT EXISTS members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
    email           TEXT NOT NULL UNIQUE,
    phone           TEXT NOT NULL,
    membership_date TEXT NOT NULL DEFAULT (date('now'))   -- YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS borrowings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id     INTEGER NOT NULL,
    member_id   INTEGER NOT NULL,
    borrow_date TEXT    NOT NULL DEFAULT (date('now')),
    due_date    TEXT    NOT NULL,
    return_date TEXT,                                      -- NULL until returned
    status      TEXT    NOT NULL DEFAULT 'BORROWED'
                CHECK (status IN ('BORROWED', 'RETURNED')),
    CHECK (due_date >= borrow_date),
    CHECK (return_date IS NULL OR return_date >= borrow_date),
    CHECK ((status = 'RETURNED') = (return_date IS NOT NULL)),
    FOREIGN KEY (book_id)   REFERENCES books(id)   ON DELETE RESTRICT,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_books_title    ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author   ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
CREATE INDEX IF NOT EXISTS idx_members_name   ON members(name);
CREATE INDEX IF NOT EXISTS idx_borrow_book    ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrow_member  ON borrowings(member_id);
CREATE INDEX IF NOT EXISTS idx_borrow_status  ON borrowings(status);

-- A book can have at most ONE active loan (database-level safety net)
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_loan_per_book
    ON borrowings(book_id) WHERE status = 'BORROWED';
