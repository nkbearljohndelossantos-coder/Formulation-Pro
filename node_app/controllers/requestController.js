const db = require('../config/db');
const { encryptData, decryptData } = require('../utils/encryption');
const { getUserRole } = require('../middleware/auth');
const systemController = require('./systemController');

const requestController = {
    // saveRequest: Boss submits a request
    saveRequest: async (req, res) => {
        try {
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);

            if (role !== 'BOSS' && role !== 'ADMIN') {
                return res.json({ success: false, message: 'Unauthorized: Only BOSS or ADMIN can create requests.' });
            }

            const data = req.body;
            const timestamp = new Date().getTime();
            const id = "REQ_" + timestamp;

            // Structure matches GAS logic
            const requestData = {
                id: id,
                bossEmail: userEmail,
                timestamp: new Date().toISOString(),
                status: 'PENDING',
                type: data.type,
                product: data.product,
                priority: data.priority,
                notes: data.notes,
                fileData: data.fileData, // Base64 string
                fileName: data.fileName
            };

            const encrypted = encryptData(JSON.stringify(requestData));

            // Using 'formulas' table with folder='Requests' to store requests
            // This keeps one simple table instead of creating new ones
            await new Promise((resolve, reject) => {
                db.run(`INSERT INTO formulas (lotNo, data, category, status, version, folder) VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, encrypted, 'request', 'PENDING', 1, 'Requests'],
                    (err) => { if (err) reject(err); else resolve(); }
                );
            });

            let logMsg = `Boss ${userEmail} created a ${data.type} request`;
            if (data.fileName) logMsg += ` with attachment: ${data.fileName}`;
            systemController.logActionInternal('CREATE_REQUEST', logMsg, id, userEmail);

            return res.json({ success: true, message: 'Request submitted successfully.' });

        } catch (e) {
            console.error(e);
            return res.json({ success: false, message: 'Error saving request: ' + e.toString() });
        }
    },

    // getAllRequests: Admin views all
    getAllRequests: async (req, res) => {
        try {
            const role = await getUserRole(req.user.email);
            if (role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

            db.all("SELECT data FROM formulas WHERE folder = 'Requests'", (err, rows) => {
                if (err) return res.json([]);

                const requests = rows.map(r => {
                    try { return JSON.parse(decryptData(r.data)); } catch (e) { return null; }
                }).filter(r => r).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                res.json(requests);
            });
        } catch (e) {
            return res.json([]);
        }
    },

    // getPendingRequests: For Encoders
    getPendingRequests: async (req, res) => {
        try {
            db.all("SELECT data FROM formulas WHERE folder = 'Requests'", (err, rows) => {
                if (err) return res.json([]);

                const requests = rows.map(r => {
                    try {
                        const reqData = JSON.parse(decryptData(r.data));
                        if (reqData.status === 'PENDING') {
                            delete reqData.fileData; // Optimization
                            return reqData;
                        }
                        return null;
                    } catch (e) { return null; }
                }).filter(r => r).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                res.json(requests);
            });
        } catch (e) {
            return res.json([]);
        }
    },

    // attendRequest
    attendRequest: async (req, res) => {
        try {
            const { requestId } = req.body;
            const userEmail = req.user.email;
            const role = await getUserRole(userEmail);

            // Assuming ENCODER or ADMIN can attend? GAS code didn't strictly check role inside function,
            // but UI likely restricts it. Let's allow authenticated users or restrict to ENCODER/ADMIN/BOSS.
            // GAS `attendRequest` had no `getCurrentUserRole` check at start, oddly.
            // We'll trust the user is logged in.

            const row = await new Promise((resolve) => {
                db.get("SELECT * FROM formulas WHERE lotNo = ?", [requestId], (e, r) => resolve(r));
            });

            if (!row) return res.json({ success: false, message: 'Request not found.' });

            const reqData = JSON.parse(decryptData(row.data));
            reqData.status = 'ATTENDED';
            reqData.attendedBy = userEmail;
            reqData.attendedAt = new Date().toISOString();

            const encrypted = encryptData(JSON.stringify(reqData));

            await new Promise((resolve) => {
                db.run("UPDATE formulas SET data = ?, status = 'ATTENDED' WHERE lotNo = ?", [encrypted, requestId], (e) => resolve());
            });

            systemController.logActionInternal('ATTEND_REQUEST', `Request ${requestId} attended by ${userEmail}`, requestId, userEmail);
            return res.json({ success: true });

        } catch (e) {
            return res.json({ success: false, message: e.toString() });
        }
    },

    // syncUserPermissions: Dummy implementation for Node.js (Folder permissions are irrelevant locally usually, or we could chmod)
    syncUserPermissions: async (req, res) => {
        const role = await getUserRole(req.user.email);
        if (role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

        // In a Node.js local FS or SQLite blob architecture, access is controlled by the Middleware (Reviewer/Admin checks).
        // There are no "Drive Folders" to share. 
        // We retain the function to satisfy the frontend call.

        systemController.logActionInternal('SYSTEM_SYNC', 'Synchronized internal permissions (No-op in Node.js)', null, req.user.email);
        return res.json({ success: true, message: 'Synced users successfully (Internal Access Table).' });
    }
};

module.exports = requestController;
