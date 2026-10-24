// Frontend logic. Talks to the backend ONLY through the REST API (fetch + JSON).
'use strict';

/* ---------- helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    const err = new Error(e.message || 'Request failed.');
    err.status = res.status; err.details = e.details || [];
    throw err;
  }
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg; t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = ''; }, 3500);
}

/* ---------- form helpers ---------- */
function clearErrors(form) {
  $$('.err, .form-err', form).forEach((e) => { e.textContent = ''; });
  $$('.invalid', form).forEach((e) => e.classList.remove('invalid'));
}
function showErrors(form, errors) { // errors: [{field, message}]
  let first = null;
  for (const { field, message } of errors) {
    const slot = $(`[data-err="${field}"]`, form);
    if (slot) { slot.textContent = message; const input = form.elements[field]; if (input) { input.classList.add('invalid'); first = first || input; } }
    else $('[data-err="_form"]', form).textContent = message;
  }
  if (first) first.focus();
}
function showServerError(form, err) {
  if (err.details && err.details.length) showErrors(form, err.details);
  else $('[data-err="_form"]', form).textContent = err.message;
}
const formData = (form) => Object.fromEntries(new FormData(form).entries());

$$('dialog').forEach((dlg) => $$('[data-close]', dlg).forEach((b) => b.addEventListener('click', () => dlg.close())));

/* ---------- client-side validation (mirrors the backend rules) ---------- */
function validateBook(d) {
  const e = [];
  for (const [f, label] of [['title', 'Title'], ['author', 'Author'], ['category', 'Category']])
    if (!d[f].trim()) e.push({ field: f, message: `${label} is required.` });
  const isbn = d.isbn.replace(/[\s-]/g, '').toUpperCase();
  if (!d.isbn.trim()) e.push({ field: 'isbn', message: 'ISBN is required.' });
  else if (!/^\d{13}$/.test(isbn) && !/^\d{9}[\dX]$/.test(isbn)) e.push({ field: 'isbn', message: 'ISBN must be 10 or 13 digits (hyphens allowed).' });
  const y = Number(d.publicationYear); const max = new Date().getFullYear();
  if (!d.publicationYear.trim()) e.push({ field: 'publicationYear', message: 'Publication year is required.' });
  else if (!Number.isInteger(y) || y < 1000 || y > max) e.push({ field: 'publicationYear', message: `Year must be a whole number between 1000 and ${max}.` });
  return e;
}
function validateMember(d) {
  const e = [];
  if (!d.name.trim()) e.push({ field: 'name', message: 'Name is required.' });
  if (!d.email.trim()) e.push({ field: 'email', message: 'Email is required.' });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.push({ field: 'email', message: 'Enter a valid email address, for example name@example.com.' });
  if (!d.phone.trim()) e.push({ field: 'phone', message: 'Phone is required.' });
  else if (!/^\d{10}$/.test(d.phone.replace(/[\s-]/g, ''))) e.push({ field: 'phone', message: 'Phone must be exactly 10 digits.' });
  if (d.membershipDate && d.membershipDate > isoToday()) e.push({ field: 'membershipDate', message: 'Membership date cannot be in the future.' });
  return e;
}

/* ---------- router ---------- */
const views = ['dashboard', 'books', 'members', 'borrowings'];
const loaders = { dashboard: loadDashboard, books: loadBooks, members: loadMembers, borrowings: loadLoans };

function route() {
  const name = views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  views.forEach((v) => { $(`#view-${v}`).hidden = v !== name; });
  $$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.view === name));
  loaders[name]().catch((e) => toast(e.message, true));
}
window.addEventListener('hashchange', route);

const pill = (cls, text) => `<span class="pill ${cls}">${esc(text)}</span>`;
const statusPill = (s) => pill(s.toLowerCase(), s === 'OVERDUE' ? 'Overdue' : s === 'RETURNED' ? 'Returned' : 'Borrowed');
const emptyRow = (cols, msg) => `<tr><td colspan="${cols}" class="empty">${esc(msg)}</td></tr>`;

/* ---------- dashboard ---------- */
async function loadDashboard() {
  const s = await api('GET', '/api/dashboard');
  const cards = [
    ['Total books', s.totalBooks], ['Available books', s.availableBooks], ['Borrowed books', s.borrowedBooks],
    ['Total members', s.totalMembers], ['Active borrowings', s.activeBorrowings], ['Overdue', s.overdueBorrowings, s.overdueBorrowings > 0],
  ];
  $('#stats').innerHTML = cards.map(([l, n, flag]) => `<div class="stat${flag ? ' flag' : ''}"><b>${n}</b><span>${l}</span></div>`).join('');
  const active = await api('GET', '/api/borrowings?status=active');
  const rows = active.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  $('#attention').innerHTML = rows.length
    ? rows.map((l) => `<tr><td>${esc(l.bookTitle)}</td><td>${esc(l.memberName)}</td><td class="num">${esc(l.dueDate)}</td><td>${statusPill(l.displayStatus)}</td></tr>`).join('')
    : emptyRow(4, 'No active borrowings.');
}

/* ---------- books ---------- */
let editingBookId = null;

async function loadBooks() {
  const p = new URLSearchParams();
  if ($('#bookSearch').value.trim()) p.set('search', $('#bookSearch').value.trim());
  if ($('#bookCategory').value) p.set('category', $('#bookCategory').value);
  if ($('#bookAvail').value) p.set('available', $('#bookAvail').value);
  const [books, cats] = await Promise.all([api('GET', `/api/books?${p}`), api('GET', '/api/books/categories')]);
  const sel = $('#bookCategory'); const keep = sel.value;
  sel.innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  sel.value = keep;
  $('#categoryList').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');
  $('#bookRows').innerHTML = books.length ? books.map((b) => `
    <tr>
      <td><strong>${esc(b.title)}</strong></td><td>${esc(b.author)}</td><td class="isbn">${esc(b.isbn)}</td>
      <td>${esc(b.category)}</td><td class="num">${b.publicationYear}</td>
      <td>${b.isAvailable ? pill('ok', 'Available') : pill('loan', 'On loan')}</td>
      <td class="actions">
        ${b.isAvailable ? `<button class="btn small" data-act="issue-book" data-id="${b.id}">Issue</button>` : ''}
        <button class="btn small" data-act="edit-book" data-id="${b.id}">Edit</button>
        <button class="btn small" data-act="delete-book" data-id="${b.id}" data-name="${esc(b.title)}">Delete</button>
      </td>
    </tr>`).join('') : emptyRow(7, 'No books match. Change the search or add a book.');
}
['input'].forEach((ev) => $('#bookSearch').addEventListener(ev, debounce(() => loadBooks().catch((e) => toast(e.message, true)))));
['change'].forEach((ev) => { $('#bookCategory').addEventListener(ev, () => loadBooks()); $('#bookAvail').addEventListener(ev, () => loadBooks()); });

function openBookDialog(book) {
  editingBookId = book ? book.id : null;
  const f = $('#bookForm'); f.reset(); clearErrors(f);
  $('#bookDialogTitle').textContent = book ? 'Edit book' : 'Add book';
  if (book) for (const k of ['title', 'author', 'isbn', 'category', 'publicationYear']) f.elements[k].value = book[k];
  $('#bookDialog').showModal(); f.elements.title.focus();
}
$('#addBook').addEventListener('click', () => openBookDialog(null));
$('#bookForm').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target; clearErrors(f);
  const data = formData(f); const errs = validateBook(data);
  if (errs.length) return showErrors(f, errs);
  try {
    if (editingBookId) await api('PUT', `/api/books/${editingBookId}`, data); else await api('POST', '/api/books', data);
    $('#bookDialog').close(); toast(editingBookId ? 'Book saved.' : 'Book added.'); loadBooks();
  } catch (e) { showServerError(f, e); }
});

/* ---------- members ---------- */
let editingMemberId = null;

async function loadMembers() {
  const q = $('#memberSearch').value.trim();
  const members = await api('GET', `/api/members${q ? '?search=' + encodeURIComponent(q) : ''}`);
  $('#memberRows').innerHTML = members.length ? members.map((m) => `
    <tr>
      <td><strong>${esc(m.name)}</strong></td><td>${esc(m.email)}</td><td class="num">${esc(m.phone)}</td><td class="num">${esc(m.membershipDate)}</td>
      <td class="actions">
        <button class="btn small" data-act="edit-member" data-id="${m.id}">Edit</button>
        <button class="btn small" data-act="delete-member" data-id="${m.id}" data-name="${esc(m.name)}">Delete</button>
      </td>
    </tr>`).join('') : emptyRow(5, 'No members match. Change the search or add a member.');
}
$('#memberSearch').addEventListener('input', debounce(() => loadMembers().catch((e) => toast(e.message, true))));

function openMemberDialog(m) {
  editingMemberId = m ? m.id : null;
  const f = $('#memberForm'); f.reset(); clearErrors(f);
  $('#memberDialogTitle').textContent = m ? 'Edit member' : 'Add member';
  if (m) for (const k of ['name', 'email', 'phone', 'membershipDate']) f.elements[k].value = m[k];
  else f.elements.membershipDate.value = isoToday();
  $('#memberDialog').showModal(); f.elements.name.focus();
}
$('#addMember').addEventListener('click', () => openMemberDialog(null));
$('#memberForm').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target; clearErrors(f);
  const data = formData(f); const errs = validateMember(data);
  if (errs.length) return showErrors(f, errs);
  try {
    if (editingMemberId) await api('PUT', `/api/members/${editingMemberId}`, data); else await api('POST', '/api/members', data);
    $('#memberDialog').close(); toast(editingMemberId ? 'Member saved.' : 'Member added.'); loadMembers();
  } catch (e) { showServerError(f, e); }
});

/* ---------- borrowings ---------- */
async function loadLoans() {
  const s = $('#loanFilter').value;
  const loans = await api('GET', `/api/borrowings${s ? '?status=' + s : ''}`);
  $('#loanRows').innerHTML = loans.length ? loans.map((l) => `
    <tr>
      <td class="num">${l.id}</td><td><strong>${esc(l.bookTitle)}</strong></td><td>${esc(l.memberName)}</td>
      <td class="num">${esc(l.borrowDate)}</td><td class="num">${esc(l.dueDate)}</td><td class="num">${esc(l.returnDate || '')}</td>
      <td>${statusPill(l.displayStatus)}</td>
      <td class="actions">${l.status === 'BORROWED' ? `
        <button class="btn small" data-act="extend" data-id="${l.id}" data-due="${esc(l.dueDate)}" data-name="${esc(l.bookTitle)}">Extend</button>
        <button class="btn small primary" data-act="return" data-id="${l.id}" data-name="${esc(l.bookTitle)}">Return</button>` : ''}
      </td>
    </tr>`).join('') : emptyRow(8, 'No borrowing records for this filter.');
}
$('#loanFilter').addEventListener('change', () => loadLoans());

async function openIssueDialog(bookId) {
  const f = $('#issueForm'); f.reset(); clearErrors(f);
  const [books, members] = await Promise.all([api('GET', '/api/books?available=true'), api('GET', '/api/members')]);
  f.elements.bookId.innerHTML = '<option value="">Select a book</option>' + books.map((b) => `<option value="${b.id}">${esc(b.title)} (${esc(b.author)})</option>`).join('');
  f.elements.memberId.innerHTML = '<option value="">Select a member</option>' + members.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  if (bookId) f.elements.bookId.value = bookId;
  f.elements.dueDate.min = isoToday();
  $('#issueDialog').showModal();
}
$('#issueBtn').addEventListener('click', () => openIssueDialog(null).catch((e) => toast(e.message, true)));
$('#issueForm').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target; clearErrors(f);
  const d = formData(f); const errs = [];
  if (!d.bookId) errs.push({ field: 'bookId', message: 'Select a book.' });
  if (!d.memberId) errs.push({ field: 'memberId', message: 'Select a member.' });
  if (d.dueDate && d.dueDate < isoToday()) errs.push({ field: 'dueDate', message: 'Due date cannot be in the past.' });
  if (errs.length) return showErrors(f, errs);
  try {
    const body = { bookId: Number(d.bookId), memberId: Number(d.memberId) };
    if (d.dueDate) body.dueDate = d.dueDate;
    await api('POST', '/api/borrowings', body);
    $('#issueDialog').close(); toast('Book issued.');
    if (location.hash === '#borrowings') loadLoans(); else if (location.hash === '#books') loadBooks();
    else location.hash = '#borrowings';
  } catch (e) { showServerError(f, e); }
});

let extendId = null;
$('#dueForm').addEventListener('submit', async (ev) => {
  ev.preventDefault(); const f = ev.target; clearErrors(f);
  const due = f.elements.dueDate.value;
  if (!due) return showErrors(f, [{ field: 'dueDate', message: 'Choose the new due date.' }]);
  try {
    await api('PATCH', `/api/borrowings/${extendId}/due-date`, { dueDate: due });
    $('#dueDialog').close(); toast('Due date saved.'); loadLoans();
  } catch (e) { showServerError(f, e); }
});

/* ---------- confirm dialog (delete / return) ---------- */
let confirmAction = null;
function askConfirm({ title, text, okLabel, danger = true, action }) {
  $('#confirmTitle').textContent = title; $('#confirmText').textContent = text;
  const ok = $('#confirmOk'); ok.textContent = okLabel; ok.className = 'btn ' + (danger ? 'danger' : 'primary');
  clearErrors($('#confirmForm')); confirmAction = action; $('#confirmDialog').showModal();
}
$('#confirmForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  try { await confirmAction(); $('#confirmDialog').close(); }
  catch (e) { showServerError($('#confirmForm'), e); }
});

/* ---------- row actions (event delegation) ---------- */
document.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-act]'); if (!btn) return;
  const id = Number(btn.dataset.id); const name = btn.dataset.name;
  try {
    switch (btn.dataset.act) {
      case 'edit-book': openBookDialog(await api('GET', `/api/books/${id}`)); break;
      case 'issue-book': await openIssueDialog(id); break;
      case 'delete-book':
        askConfirm({ title: 'Delete book', text: `Delete "${name}"? This cannot be undone.`, okLabel: 'Delete book',
          action: async () => { await api('DELETE', `/api/books/${id}`); toast('Book deleted.'); loadBooks(); } });
        break;
      case 'edit-member': openMemberDialog(await api('GET', `/api/members/${id}`)); break;
      case 'delete-member':
        askConfirm({ title: 'Delete member', text: `Delete ${name}? This cannot be undone.`, okLabel: 'Delete member',
          action: async () => { await api('DELETE', `/api/members/${id}`); toast('Member deleted.'); loadMembers(); } });
        break;
      case 'return':
        askConfirm({ title: 'Return book', text: `Mark "${name}" as returned today?`, okLabel: 'Return book', danger: false,
          action: async () => { await api('PATCH', `/api/borrowings/${id}/return`); toast('Book returned.'); loadLoans(); } });
        break;
      case 'extend': {
        extendId = id; const f = $('#dueForm'); f.reset(); clearErrors(f);
        $('#dueInfo').textContent = `"${name}" is currently due on ${btn.dataset.due}.`;
        f.elements.dueDate.min = btn.dataset.due; $('#dueDialog').showModal(); break;
      }
    }
  } catch (e) { toast(e.message, true); }
});

route();
