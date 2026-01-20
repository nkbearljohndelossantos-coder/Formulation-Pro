const db = require('../config/db');
const { getUserRole } = require('../middleware/auth');
const systemController = require('./systemController');

const authController = {
    getCurrentUserAuth: async (req, res) => {
        if (!req.isAuthenticated()) {
            return res.json({ email: 'NOT_DETECTED', role: null, note: 'Not logged in' });
        }
        const email = req.user.email;
        const role = await getUserRole(email);
        res.json({ email, role, note: '' });
    },

    getAllUserRoles: async (req, res) => {
        const role = await getUserRole(req.user.email);
        if (role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        db.all('SELECT email, role FROM users', (err, rows) => {
            let roles = {};
            rows.forEach(r => roles[r.email] = r.role);
            res.json(roles);
        });
    },

    saveUserRole: async (req, res) => {
        const adminRole = await getUserRole(req.user.email);
        if (adminRole !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        const { email, role } = req.body;
        db.run('INSERT OR REPLACE INTO users (email, role) VALUES (?, ?)', [email, role], (err) => {
            if (err) return res.json({ success: false, message: err.message });
            systemController.logActionInternal('MANAGE_USER', `Updated role for ${email} to ${role}`, null, req.user.email);
            res.json({ success: true });
        });
    },

    deleteUserRole: async (req, res) => {
        const adminRole = await getUserRole(req.user.email);
        if (adminRole !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        const { email } = req.body;
        db.run('DELETE FROM users WHERE email = ?', [email], (err) => {
            if (err) return res.json({ success: false, message: err.message });
            systemController.logActionInternal('MANAGE_USER', `Deleted role for ${email}`, null, req.user.email);
            res.json({ success: true });
        });
    }
};

module.exports = authController;
