const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../data/database.sqlite');
const dbFolder = path.dirname(dbPath);

if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initTables();
    }
});

function initTables() {
    db.serialize(() => {
        // Users (Roles)
        db.run(`CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL
    )`);

        // Formulas (Blob storage)
        db.run(`CREATE TABLE IF NOT EXISTS formulas (
      lotNo TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      category TEXT,
      status TEXT,
      version INTEGER,
      folder TEXT, -- 'Formulation', 'Request', 'Archive'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Audit Logs
        db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_email TEXT,
      action_type TEXT,
      action_desc TEXT,
      formula_id TEXT
    )`);

        // System Settings
        db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);
    });
}

module.exports = db;
