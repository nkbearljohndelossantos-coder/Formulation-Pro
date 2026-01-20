const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');

console.log('--- DIAGNOSTIC START ---');
console.log('Node Version:', process.version);
console.log('Current Directory:', __dirname);

// 1. Check .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('SUCCESS: .env found');
} else {
    console.error('ERROR: .env NOT found');
}

// 2. Check Database
const dbPath = path.join(__dirname, 'data', 'database.sqlite');
console.log('Checking DB at:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('ERROR: Could not connect to DB:', err.message);
    } else {
        console.log('SUCCESS: Connected to DB');
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (e, r) => {
            if (e) console.error('ERROR: Could not list tables:', e.message);
            else console.log('Tables found:', r);
            db.close();
        });
    }
});

console.log('--- DIAGNOSTIC END ---');
