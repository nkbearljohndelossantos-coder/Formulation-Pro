const db = require('../config/db');
const { encryptData, decryptData } = require('../utils/encryption');
const { getUserRole } = require('../middleware/auth');
const systemController = require('./systemController'); // For logging

const formulaController = {
    // saveFormula (Replaces Code.gs saveFormula)
    saveFormula: async (req, res) => {
        try {
            const data = req.body;
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);

            if (role !== 'BOSS' && role !== 'ENCODER' && role !== 'ADMIN') {
                return res.json({ success: false, message: 'Unauthorized' });
            }

            if (!data || !data.header || !data.header.lotNo) {
                return res.json({ success: false, message: 'Invalid data' });
            }

            const lotNo = data.header.lotNo;

            // Check existing
            const existing = await new Promise((resolve, reject) => {
                db.get('SELECT * FROM formulas WHERE lotNo = ?', [lotNo], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });

            if (existing) {
                const existingData = JSON.parse(decryptData(existing.data));
                if (existingData.header.status === 'LOCKED') {
                    return res.json({ success: false, message: 'Formula is LOCKED' });
                }
            }

            // Metadata updates
            data.header.lastModifiedBy = userEmail;
            data.header.lastModified = new Date().toISOString();
            let version = 1;

            if (!existing) {
                data.header.createdBy = userEmail;
                data.header.createdAt = new Date().toISOString();
                data.header.status = 'PENDING';
            } else {
                const existingData = JSON.parse(decryptData(existing.data));
                version = (existingData.header.versionNumber || 1) + 1;
                // Archive logic could go here (inserting into 'formulas' with different ID)
            }

            data.header.versionNumber = version;
            data.header.version = "v" + version + ".0";

            const encrypted = encryptData(JSON.stringify(data));
            const category = data.header.category || 'cosmetic';
            const status = data.header.status;

            // Upsert
            await new Promise((resolve, reject) => {
                db.run(`INSERT OR REPLACE INTO formulas (lotNo, data, category, status, version, folder) VALUES (?, ?, ?, ?, ?, ?)`,
                    [lotNo, encrypted, category, status, version, 'Formulation'],
                    (err) => { if (err) reject(err); else resolve(); }
                );
            });

            // Log
            const actionType = existing ? 'EDIT_FORMULA' : 'CREATE_FORMULA';
            systemController.logActionInternal(actionType, `Formula ${lotNo} (v${version}) saved by ${userEmail}`, lotNo, userEmail);

            return res.json({
                success: true,
                message: `Formula saved successfully as version ${version}. Storage: SQLite (Encrypted)`,
                version: version
            });

        } catch (e) {
            console.error(e);
            return res.json({ success: false, message: e.toString() });
        }
    },

    // getSavedFormulas
    getSavedFormulas: async (req, res) => {
        try {
            const categoryFilter = req.body.categoryFilter || null; // google.script.run passes args
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);
            if (!role) throw new Error("Unauthorized");

            let query = "SELECT data FROM formulas WHERE folder = 'Formulation'";
            let params = [];
            if (categoryFilter) {
                query += " AND category = ?";
                params.push(categoryFilter);
            }

            const rows = await new Promise((resolve, reject) => {
                db.all(query, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
            });

            const formulas = rows.map(r => {
                try {
                    const decrypted = decryptData(r.data);
                    const json = JSON.parse(decrypted);
                    return json.header;
                } catch (e) { return null; }
            }).filter(f => f).sort((a, b) => new Date(b.date) - new Date(a.date));

            return res.json(formulas);
        } catch (e) {
            return res.status(500).json({ error: e.toString() });
        }
    },

    // getFormulaDetails
    getFormulaDetails: async (req, res) => {
        try {
            const lotNo = req.body.lotNo;
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);
            if (!role) throw new Error("Unauthorized");

            const row = await new Promise((resolve, reject) => {
                db.get('SELECT data FROM formulas WHERE lotNo = ?', [lotNo], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });

            if (!row) return res.json(null); // Or error

            const data = JSON.parse(decryptData(row.data));

            // Masking Logic
            const isLocked = data.header.status === 'LOCKED';
            let shouldMask = false;
            if (role === 'VIEWER') shouldMask = true;
            if (role === 'ENCODER' && isLocked) shouldMask = true;

            if (shouldMask) {
                data.ingredients = data.ingredients.map(ing => ({
                    part: ing.part,
                    ingredient: ing.ingredient,
                    percent: '***',
                    weight: '***',
                    settings: ing.settings
                }));
                data.header.totalPercent = '***';
                data.header.totalWeight = '***';
            }

            systemController.logActionInternal('VIEW_FORMULA', `User ${userEmail} viewed ${lotNo}`, lotNo, userEmail);

            return res.json(data);
        } catch (e) {
            return res.json({ error: e.toString() });
        }
    },

    // updateFormulaStatus
    updateFormulaStatus: async (req, res) => {
        try {
            const { lotNo, newStatus } = req.body;
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);

            if (role !== 'BOSS' && role !== 'ADMIN') {
                throw new Error('Unauthorized');
            }

            const row = await new Promise((resolve) => db.get('SELECT * FROM formulas WHERE lotNo = ?', [lotNo], (e, r) => resolve(r)));
            if (!row) throw new Error('Formula not found');

            const data = JSON.parse(decryptData(row.data));
            const oldStatus = data.header.status;
            data.header.status = newStatus;
            data.header.lastModified = new Date().toISOString();
            data.header.lastModifiedBy = userEmail;

            if (newStatus === 'APPROVED') data.header.approvedBy = userEmail;
            if (newStatus === 'LOCKED') data.header.lockedBy = userEmail;

            const encrypted = encryptData(JSON.stringify(data));

            await new Promise((resolve) => {
                db.run('UPDATE formulas SET data = ?, status = ? WHERE lotNo = ?', [encrypted, newStatus, lotNo], (e) => resolve());
            });

            systemController.logActionInternal('STATUS_CHANGE', `Formula ${lotNo} status changed from ${oldStatus} to ${newStatus}`, lotNo, userEmail);
            return res.json({ success: true, status: newStatus });
        } catch (e) {
            return res.json({ success: false, message: e.toString() });
        }
    },

    // getMultipleFormulas: For Compare feature
    getMultipleFormulas: async (req, res) => {
        try {
            const lotNos = req.body.lotNos; // Expecting array
            if (!lotNos || !Array.isArray(lotNos)) return res.json([]);

            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);
            if (!role) return res.json([]);

            // We can reuse getFormulaDetails logic but in bulk
            // Ideally we query WHERE lotNo IN (...)
            const placeholders = lotNos.map(() => '?').join(',');
            const query = `SELECT data FROM formulas WHERE lotNo IN (${placeholders})`;

            const rows = await new Promise((resolve, reject) => {
                db.all(query, lotNos, (err, rows) => { if (err) reject(err); else resolve(rows); });
            });

            const results = rows.map(r => {
                try {
                    const data = JSON.parse(decryptData(r.data));
                    // Apply same masking logic?
                    // The GAS function calls `getFormulaDetails` which has masking.
                    // So yes.
                    const isLocked = data.header.status === 'LOCKED';
                    let shouldMask = false;
                    if (role === 'VIEWER') shouldMask = true;
                    if (role === 'ENCODER' && isLocked) shouldMask = true;

                    if (shouldMask) {
                        data.ingredients = data.ingredients.map(ing => ({
                            part: ing.part,
                            ingredient: ing.ingredient,
                            percent: '***',
                            weight: '***',
                            settings: ing.settings
                        }));
                        data.header.totalPercent = '***';
                        data.header.totalWeight = '***';
                    }
                    return data;
                } catch (e) { return null; }
            }).filter(d => d);

            return res.json(results);

        } catch (e) {
            console.error(e);
            return res.json([]);
        }
    }
};

module.exports = formulaController;
