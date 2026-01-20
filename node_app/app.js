const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const SQLiteStore = require('connect-sqlite3')(session);
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Session Setup (SQLite storage)
app.use(session({
  store: new SQLiteStore({ dir: './data', db: 'sessions.sqlite' }),
  secret: process.env.SESSION_SECRET || 'formulation-pro-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Passport Init
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', require('./routes/index'));
app.use('/api', require('./routes/api'));

// Start Server
app.listen(PORT, () => {
  console.log(`Formulation Pro Node running on http://localhost:${PORT}`);
});
