// Builds docs/TEST_REPORT.md from the REAL results of `npx jest --json` (Pass/Fail is read, not typed).
// Usage: npm run test:report
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsonFile = path.join(root, 'docs', 'jest-results.json');
try { execSync(`npx jest --runInBand --json --outputFile="${jsonFile}"`, { cwd: root, stdio: 'ignore' }); } catch (e) { /* failures are still written to the JSON */ }
const results = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// id -> [input, expected]
const META = {
  'TC-B01': ['POST /api/books {title:"Clean Code", isbn:"978-0-13-235088-4", ...valid}', '201 Created; ISBN stored as 9780132350884; isAvailable = true'],
  'TC-B02': ['GET /api/books after adding 2 books', '200 OK; array of 2 books'],
  'TC-B03': ['GET /api/books/{id}', '200 OK; the matching book'],
  'TC-B04': ['PUT /api/books/{id} with new title and year', '200 OK; changes returned and persisted'],
  'TC-B05': ['DELETE /api/books/{id} (no history), then GET it', '204 No Content; later GET returns 404'],
  'TC-B06': ['POST /api/books {title:"   "}', '400; errors for title, author, isbn, category, publicationYear'],
  'TC-B07': ['POST /api/books with isbn "12345"', '400; error on field isbn'],
  'TC-B08': ['POST /api/books with year "abc", 999, next year, 2020.5', '400 for each; error on field publicationYear'],
  'TC-B09': ['POST /api/books with an ISBN that already exists', '409 Conflict; error on field isbn'],
  'TC-B10': ['PUT /api/books/{id} using another book\'s ISBN', '409 Conflict'],
  'TC-B11': ['GET /api/books/abc, -1, 0, 1.5', '400 Bad Request for each'],
  'TC-B12': ['GET, PUT, DELETE /api/books/999', '404 Not Found for each'],
  'TC-B13': ['GET /api/books?search=clean | harari | ISBN; ?category=; ?available=true/false', 'Only matching books returned for each filter'],
  'TC-B14': ['DELETE a book that was borrowed and returned', '409; message mentions borrowing history'],
  'TC-B15': ['DELETE a book currently on loan', '409; message mentions "on loan"'],
  'TC-M01': ['POST /api/members with valid data', '201 Created; membershipDate defaults to today'],
  'TC-M02': ['GET /api/members; ?search=priya | rohan@ | 990011', 'All members listed; search matches name, email and phone'],
  'TC-M03': ['GET /api/members/{id}', '200 OK; the matching member'],
  'TC-M04': ['PUT /api/members/{id} with new name and phone', '200 OK; changes returned'],
  'TC-M05': ['DELETE /api/members/{id} (no history), then GET it', '204 No Content; later GET returns 404'],
  'TC-M06': ['POST /api/members {name:"", email:"not-an-email", phone:"123"}', '400; errors for name, email, phone'],
  'TC-M07': ['POST /api/members with an existing email (different case)', '409 Conflict; error on field email'],
  'TC-M08': ['DELETE a member who has a borrowing record', '409 Conflict'],
  'TC-M09': ['GET /api/members/abc and /api/members/999', '400 and 404'],
  'TC-M10': ['POST /api/members with email "Mixed.Case@Example.COM"', 'Stored as mixed.case@example.com'],
  'TC-R01': ['POST /api/borrowings {bookId, memberId} for an available book', '201; status BORROWED; book becomes unavailable'],
  'TC-R02': ['Issue a book that is already on loan to another member', '409; "not available"; no second record created'],
  'TC-R03': ['PATCH /api/borrowings/{id}/return', '200; status RETURNED; returnDate = today; book available again'],
  'TC-R04': ['Return the same loan twice', '409; "already returned"'],
  'TC-R05': ['Issue bookId 999', '404; message names the book'],
  'TC-R06': ['Issue to memberId 999', '404; message names the member; book stays available'],
  'TC-R07': ['POST /api/borrowings {bookId:"x"}', '400; errors for bookId and memberId'],
  'TC-R08': ['Issue without dueDate', 'borrowDate = today; dueDate = today + 14 days'],
  'TC-R09': ['GET /api/borrowings?status=active | returned | overdue', 'Only matching records; overdue loan shows displayStatus OVERDUE'],
  'TC-R10': ['GET /api/borrowings?status=banana', '400 Bad Request'],
  'TC-R11': ['PATCH /api/borrowings/{id}/due-date with a later date', '200; dueDate updated'],
  'TC-R12': ['Move due date earlier; edit a returned loan', '400 for earlier date; 409 for returned loan'],
  'TC-R13': ['PATCH /api/borrowings/999/return and /abc/return', '404 and 400'],
  'TC-R14': ['Issue with dueDate yesterday', '400; error on field dueDate'],
  'TC-R15': ['GET /api/borrowings/{id}; GET /api/borrowings/999', '200 with book title and member name; 404'],
  'TC-R16': ['Return a book, then issue it to another member', '201 Created (book is reusable)'],
  'TC-D01': ['GET /api/dashboard with 3 books, 2 members, 1 loan', '{totalBooks 3, availableBooks 2, borrowedBooks 1, totalMembers 2, activeBorrowings 1, overdueBorrowings 0}'],
  'TC-I01': ['GET /', '200; HTML page served by the backend'],
  'TC-I02': ['GET /js/app.js and /css/style.css', '200 for both'],
  'TC-I03': ['GET /api/nothing', '404 with JSON body'],
  'TC-I04': ['POST /api/books with body "{bad json"', '400; message mentions JSON'],
  'TC-I05': ['GET /api/books/999', 'Error body shape { error: { status, message, details } }'],
  'TC-DB01': ['Issue a book, then query the database directly', 'books.is_available = 0 and one BORROWED row exists'],
  'TC-DB02': ['INSERT a second active loan for the same book via SQL', 'UNIQUE constraint failed'],
  'TC-DB03': ['DELETE a book that has borrowings via SQL', 'FOREIGN KEY constraint failed'],
  'TC-DB04': ['INSERT status RETURNED with no return_date via SQL', 'CHECK constraint failed'],
  'TC-DB05': ['Issue a book to a non-existent member', 'Nothing saved: book still available, 0 borrowing rows'],
};

const rows = [];
for (const suite of results.testResults)
  for (const t of suite.assertionResults) {
    const [id, ...rest] = t.title.split(': ');
    const [input, expected] = META[id] || ['', ''];
    const pass = t.status === 'passed';
    const actual = pass ? 'Matched expected result' : 'FAILED: ' + (t.failureMessages[0] || '').split('\n')[0];
    rows.push({ id, name: rest.join(': '), input, expected, actual, pass });
  }
rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const section = (title, prefix) => {
  const r = rows.filter((x) => x.id.startsWith(prefix));
  return `## ${title}\n\n| ID | Test case | Input | Expected result | Actual result | Pass/Fail |\n|---|---|---|---|---|---|\n` +
    r.map((x) => `| ${x.id} | ${esc(x.name)} | ${esc(x.input)} | ${esc(x.expected)} | ${esc(x.actual)} | ${x.pass ? 'Pass' : '**Fail**'} |`).join('\n') + '\n';
};

let ui = '';
const uiFile = path.join(root, 'docs', 'ui-test-results.txt');
let uiPass = 0, uiTotal = 0;
if (fs.existsSync(uiFile)) {
  const lines = fs.readFileSync(uiFile, 'utf8').split('\n').filter((l) => /^(PASS|FAIL) /.test(l));
  uiTotal = lines.length; uiPass = lines.filter((l) => l.startsWith('PASS')).length;
  ui = `## Frontend-backend (browser) tests\n\nThese run the real application in a headless Chromium browser (\`tests/ui_e2e.py\`, Playwright). Each step clicks through the UI, which calls the REST API, which reads/writes the SQLite database.\n\n| Check | Result |\n|---|---|\n` +
    lines.map((l) => `| ${esc(l.slice(5))} | ${l.startsWith('PASS') ? 'Pass' : '**Fail**'} |`).join('\n') + '\n';
}

const passed = rows.filter((r) => r.pass).length;
const md = `# Test Report

Generated by \`npm run test:report\` on ${new Date().toISOString().slice(0, 10)}. Pass/Fail values come from the actual Jest run; the "Actual result" column says "Matched expected result" when every assertion in the test passed, and shows the first failure message otherwise.

**Backend (Jest + Supertest): ${passed} of ${rows.length} passed.**${uiTotal ? `  **Browser UI: ${uiPass} of ${uiTotal} checks passed.**` : ''}

Each backend test starts with a brand-new empty in-memory SQLite database, so tests never affect each other or \`database/library.db\`.

${section('Books', 'TC-B')}
${section('Members', 'TC-M')}
${section('Borrowing', 'TC-R')}
${section('Dashboard', 'TC-D0')}
${section('Frontend-backend integration (API level)', 'TC-I')}
${section('Database operations', 'TC-DB')}
${ui}`;
fs.writeFileSync(path.join(root, 'docs', 'TEST_REPORT.md'), md);
console.log(`Backend: ${passed}/${rows.length} passed. Wrote docs/TEST_REPORT.md`);
process.exit(passed === rows.length ? 0 : 1);
