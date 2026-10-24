# Screenshot Guide

Screenshots marked **[provided]** already exist in `docs/screenshots/`. They were captured automatically from the running application (headless browser, 1280x800) while the UI test ran. You may use them, but examiners usually prefer screenshots from *your own* machine, so retake them if you can: run the app, then follow the "What should be visible" column. Screenshots marked **[you take]** can only come from your computer.

Report sections refer to `docs/DOCUMENTATION.md`.

| # | Screenshot | What should be visible | Why it is required | Report section |
|---|---|---|---|---|
| 1 | Project structure **[you take]** | VS Code Explorer with folders `database`, `src` (controllers, services, repositories, routes, middleware, models, utils), `public`, `tests`, `docs`, `postman` expanded | Proves the layered architecture exists as real files | 8 System architecture, 13 Project structure |
| 2 | Dashboard **[provided: `01-dashboard.png`, `19-dashboard-final.png`]** | The six statistic cards and the "Needs attention" table, sidebar visible, browser address bar with `localhost:3000` | Shows the home screen and live statistics from the database | 14 Frontend design |
| 3 | Book management / list **[provided: `02-book-list.png`]** | Full books table with Title, Author, ISBN, Category, Year, Status, and Issue/Edit/Delete buttons; search box and filters | Evidence of READ and of search/filter | 12 CRUD (Read), 14 Frontend |
| 4 | Add book **[provided: `03-add-book-validation.png`, `05-book-added.png`]** | Add-book dialog with red validation messages on empty submit; then the list showing the new book and the "Book added." message | Evidence of CREATE and of frontend validation | 12 CRUD (Create), 16 Validation |
| 5 | Duplicate ISBN **[provided: `04-duplicate-isbn.png`]** | Dialog with "This ISBN is already registered." under the ISBN field | Evidence of backend validation reaching the user (HTTP 409) | 16 Validation, 17 Error handling |
| 6 | Edit book **[provided: `06-edit-book.png`]** | Edit dialog pre-filled with the book's current values and a changed title | Evidence of UPDATE | 12 CRUD (Update) |
| 7 | Delete book **[provided: `07-delete-confirm.png`, `08-delete-blocked.png`]** | Confirmation dialog; then the error "is currently on loan and cannot be deleted" | Evidence of DELETE and of business rules protecting data | 12 CRUD (Delete), 17 Error handling |
| 8 | Member management **[provided: `09-member-list.png`, `11-member-added.png`]** | Members table; then search result showing the newly added member | Evidence of member CRUD and search | 12 CRUD, 14 Frontend |
| 9 | Add member validation **[provided: `10-add-member-validation.png`]** | Add-member dialog with email and phone errors | Evidence of member validation | 16 Validation |
| 10 | Borrowing list **[provided: `12-borrowing-list.png`, `13-overdue-filter.png`]** | Borrowings table with Borrowed / Overdue / Returned pills; then the Overdue filter applied | Evidence of borrowing status and filtering | 12 CRUD (Read), 14 Frontend |
| 11 | Issue book **[provided: `14-issue-book.png`, `15-book-issued.png`]** | Issue dialog with book and member chosen; then the new "Borrowed" row | Evidence of borrowing creation | 12 CRUD (Create), 18 Testing |
| 12 | Return book **[provided: `17-return-confirm.png`, `18-book-returned.png`]** | Return confirmation; then the loan showing "Returned" with a return date | Evidence of the return workflow | 12 CRUD (Update), 18 Testing |
| 13 | Extend due date **[provided: `16-extend-due-date.png`]** | Dialog showing the current due date | Evidence of borrowing UPDATE | 12 CRUD (Update) |
| 14 | API testing **[you take]** | Postman (or Thunder Client) with `POST /api/borrowings`, request body, and the `201 Created` response; take a second one showing a `409` response | Proves the REST API works independently of the UI | 13 API design, 18 Testing |
| 15 | Backend running **[you take]** | Terminal after `npm start` showing "Library Management System running at http://localhost:3000" | Proves the backend starts | 15 Backend design |
| 16 | Automated tests **[you take]** | Terminal after `npm test` showing all suites and "Tests: 52 passed, 52 total" | Evidence of backend testing | 18 Testing, 19 Results |
| 17 | Database tables/data **[you take]** | DB Browser for SQLite: (a) Database Structure tab listing books, members, borrowings; (b) Browse Data of each table; (c) the `borrowings` table showing BORROWED and RETURNED rows | Proves the relational database and its data | 9 Database design, 10 Entities |
| 18 | Database constraints **[you take]** | DB Browser Execute SQL: a duplicate ISBN insert failing with "UNIQUE constraint failed: books.isbn" | Proves constraints are enforced by the database itself | 9 Database design, 16 Validation |
| 19 | Mobile view **[provided: `20-mobile-books.png`]** | The books page at phone width | Shows the layout is responsive | 14 Frontend design |
| 20 | Final working application **[you take]** | Browser window with the app open, plus terminal running the server in a split view | Overall proof for the final submission | 19 Results |

Tip: before taking screenshots 2 to 13 on your machine, run `npm run db:reset` so your data matches the examples.
