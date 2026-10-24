// Builds the Express app. Everything is wired together here (repositories -> services -> controllers -> routes).
const express = require('express');
const path = require('path');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp(db) {
  const bookRepo = require('./repositories/bookRepository')(db);
  const memberRepo = require('./repositories/memberRepository')(db);
  const borrowingRepo = require('./repositories/borrowingRepository')(db);

  const bookService = require('./services/bookService')({ bookRepo, borrowingRepo });
  const memberService = require('./services/memberService')({ memberRepo, borrowingRepo });
  const borrowingService = require('./services/borrowingService')({ db, bookRepo, memberRepo, borrowingRepo });
  const dashboardService = require('./services/dashboardService')({ bookRepo, memberRepo, borrowingRepo });

  const routes = require('./routes')({
    book: require('./controllers/bookController')(bookService),
    member: require('./controllers/memberController')(memberService),
    borrowing: require('./controllers/borrowingController')(borrowingService),
    dashboard: require('./controllers/dashboardController')(dashboardService),
  });

  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use('/api', notFound);                                    // unknown /api/... routes -> JSON 404
  app.use(express.static(path.join(__dirname, '..', 'public'))); // the frontend
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
