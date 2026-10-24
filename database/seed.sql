-- Library Management System: sample data
INSERT INTO books (title, author, isbn, category, publication_year, is_available) VALUES
('Clean Code',                    'Robert C. Martin',     '9780132350884', 'Programming',      2008, 1),
('The Pragmatic Programmer',      'Andrew Hunt',          '9780135957059', 'Programming',      2019, 0),
('Introduction to Algorithms',    'Thomas H. Cormen',     '9780262046305', 'Computer Science', 2022, 1),
('Database System Concepts',      'Abraham Silberschatz', '9780078022159', 'Databases',        2019, 1),
('Wings of Fire',                 'A. P. J. Abdul Kalam', '9788173711466', 'Biography',        1999, 0),
('The Discovery of India',        'Jawaharlal Nehru',     '9780143031031', 'History',          2004, 1),
('Sapiens',                       'Yuval Noah Harari',    '9780099590088', 'History',          2015, 0),
('Atomic Habits',                 'James Clear',          '9781847941831', 'Self-Help',        2018, 1),
('Operating System Concepts',     'Abraham Silberschatz', '9781119800361', 'Computer Science', 2021, 1),
('The Alchemist',                 'Paulo Coelho',         '9780062315007', 'Fiction',          2014, 1);

INSERT INTO members (name, email, phone, membership_date) VALUES
('Aarav Sharma',   'aarav.sharma@example.com',   '9876543210', '2026-01-10'),
('Priya Nair',     'priya.nair@example.com',     '9845012345', '2026-02-14'),
('Rohan Gowda',    'rohan.gowda@example.com',    '9900112233', '2026-03-05'),
('Ananya Rao',     'ananya.rao@example.com',     '9731234567', '2026-04-18'),
('Karthik Iyer',   'karthik.iyer@example.com',   '9886677889', '2026-06-01'),
('Sneha Patil',    'sneha.patil@example.com',    '9611223344', '2026-08-22');

INSERT INTO borrowings (book_id, member_id, borrow_date, due_date, return_date, status) VALUES
(1, 1, '2026-09-20', '2026-10-04', '2026-10-02', 'RETURNED'),
(3, 2, '2026-09-25', '2026-10-09', '2026-10-08', 'RETURNED'),
(8, 5, '2026-08-20', '2026-09-03', '2026-09-01', 'RETURNED'),
(2, 1, '2026-09-01', '2026-09-15', NULL,         'BORROWED'),
(5, 3, '2026-10-10', '2026-10-24', NULL,         'BORROWED'),
(7, 4, '2026-10-15', '2026-10-29', NULL,         'BORROWED');
