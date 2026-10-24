# Viva Notes

Short answers to questions examiners commonly ask about this project.

**Why Node.js/Express?** One language (JavaScript) for frontend and backend, tiny setup, routes map directly to REST endpoints.

**Why SQLite?** It is a real relational database (primary and foreign keys, constraints, indexes, transactions) stored in a single file, so there is no server to install. The SQL would work in MySQL/PostgreSQL with minor changes (for example AUTOINCREMENT becomes AUTO_INCREMENT).

**Why no framework like React?** To keep every step visible: you can point at the exact `fetch` call that sends a request. A framework would add concepts that are not needed for this scope.

**What is REST?** A style of API design where URLs name resources (`/books/5`) and HTTP methods say the action (GET read, POST create, PUT edit, DELETE remove), and status codes report the result.

**Why layers (controller / service / repository)?** Each file has one job. Controllers handle HTTP, services hold business rules, repositories hold SQL. Rules are written once and are easy to test.

**What is a primary key? foreign key?** Primary key uniquely identifies a row (`id`). A foreign key (`borrowings.book_id`) points to a row in another table and the database refuses values that do not exist.

**Why a separate `borrowings` table?** A book is borrowed many times and a member borrows many books: a many-to-many relationship. The linking table stores each loan plus its dates and status.

**How do you stop a book being issued twice?** Three layers: the UI lists only available books; the service checks `isAvailable` and returns 409; and the database has a partial unique index allowing only one BORROWED row per book.

**What is a transaction and where is it used?** A group of database changes that succeed or fail together. Issuing inserts a loan and marks the book unavailable; returning updates the loan and marks the book available. If either step fails, both are rolled back.

**Why is "overdue" not stored?** It depends on today's date. A stored value would be wrong after midnight; calculating it from `due_date` is always right.

**Why can't I delete a member with history?** The foreign key uses `ON DELETE RESTRICT` and the service checks first, giving a clear 409 message. Loan history is a record that should not be lost.

**Why validate twice?** The frontend gives fast feedback; the backend protects the data from any client, including Postman or a modified page.

**How do you prevent SQL injection?** Every query uses bound parameters (`?`), never string concatenation of user input.

**How do you prevent XSS?** The frontend escapes all data (`esc()`) before inserting it into HTML.

**What are the limitations?** No login, ISBN checksum not verified, no fines, no pagination. These are listed as future work.

**How did you test it?** 52 automated backend tests, 28 browser checks, and manual API calls in Postman. Results are in `docs/TEST_REPORT.md`.
