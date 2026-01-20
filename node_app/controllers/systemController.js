const db = require('../config/db');
const { encryptData, decryptData } = require('../utils/encryption');
const { getUserRole } = require('../middleware/auth');

const systemController = {
    // Helper for internal logging (used by other controllers)
    logActionInternal: (actionType, actionDesc, formulaId, userEmail) => {
        db.run('INSERT INTO audit_logs (user_email, action_type, action_desc, formula_id) VALUES (?, ?, ?, ?)',
            [userEmail, actionType, actionDesc, formulaId],
            (err) => { if (err) console.error('Logging failed', err); }
        );
    },

    // API: logAction
    logAction: (req, res) => {
        const { actionType, actionDesc, formulaId } = req.body;
        systemController.logActionInternal(actionType, actionDesc, formulaId, req.user.email);
        res.json({ success: true });
    },

    getDashboardStats: async (req, res) => {
        try {
            db.all("SELECT data FROM formulas WHERE folder = 'Formulation'", [], (err, rows) => {
                if (err) return res.status(500).json({ error: err.toString() });

                let stats = {
                    total: rows.length,
                    approved: 0,
                    pending: 0,
                    locked: 0,
                    recent: [],
                    pendingApprovals: []
                };

                const formulas = rows.map(r => {
                    try { return JSON.parse(decryptData(r.data)).header; } catch (e) { return null; }
                }).filter(f => f);

                formulas.forEach(f => {
                    let s = (f.status || 'PENDING').toUpperCase();
                    if (s === 'APPROVED') stats.approved++;
                    else if (s === 'PENDING') {
                        stats.pending++;
                        stats.pendingApprovals.push(f);
                    } else if (s === 'LOCKED') stats.locked++;
                });

                stats.recent = formulas.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)).slice(0, 10);
                stats.pendingApprovals = stats.pendingApprovals.slice(0, 10);

                res.json(stats);
            });
        } catch (e) {
            res.status(500).json({ error: e.toString() });
        }
    },

    getSystemSettings: (req, res) => {
        db.all('SELECT * FROM settings', (err, rows) => {
            let settings = {};
            rows.forEach(r => settings[r.key] = r.value);
            res.json(settings);
        });
    },

    saveSystemSetting: async (req, res) => {
        const role = await getUserRole(req.user.email);
        if (role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        const { key, value } = req.body;
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
            if (err) res.json({ success: false, message: err.toString() });
            else res.json({ success: true });
        });
    }
};

module.exports = systemController;
