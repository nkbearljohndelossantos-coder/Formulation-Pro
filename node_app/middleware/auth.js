const db = require('../config/db');

module.exports = {
    ensureAuthenticated: function (req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        // If API call, return 401
        if (req.originalUrl.startsWith('/api')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        res.redirect('/');
    },

    // Helper to get role (like getCurrentUserRole in GAS)
    getUserRole: function (email) {
        return new Promise((resolve, reject) => {
            // 1. Emergency Admin (Owner) check - replicated from logic
            if (email === process.env.OWNER_EMAIL) {
                return resolve('ADMIN');
            }

            db.get('SELECT role FROM users WHERE email = ?', [email], (err, row) => {
                if (err) return reject(err);
                resolve(row ? row.role : null);
            });
        });
    }
};
