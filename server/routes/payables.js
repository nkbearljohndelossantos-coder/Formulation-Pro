import http from 'http';
import crypto from 'crypto';
import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

export const DEFAULT_API_KEY = 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943';
const NKB_API_HOST = 'my.nkbmanufacturing.com';
const NKB_API_PORT = 80;
const NKB_API_PREFIX = '/api/v1';

/**
 * Robust HTTP client using Node's native http module to avoid undici/fetch IPv6/timeout issues
 */
export function nkbApiRequest(method, endpointPath, apiKey, bodyData = null) {
  return new Promise((resolve, reject) => {
    const fullPath = `${NKB_API_PREFIX}${endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath}`;
    const headers = {
      'x-api-key': apiKey || DEFAULT_API_KEY,
      'Accept': 'application/json',
      'User-Agent': 'Formulation-Pro/1.0.0 (Node.js)'
    };

    let postPayload = null;
    if (bodyData) {
      postPayload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postPayload);
    }

    const req = http.request({
      hostname: NKB_API_HOST,
      port: NKB_API_PORT,
      path: fullPath,
      method: method,
      headers: headers,
      timeout: 10000
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed });
        } catch (_) {
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: raw });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout connecting to ${NKB_API_HOST}`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postPayload) {
      req.write(postPayload);
    }
    req.end();
  });
}

/**
 * Authentication Middleware:
 * Supports external webapps using multiple registered API Keys via:
 * - Header 'x-api-key'
 * - Header 'x-nkb-api-key'
 * - Header 'x-api-token'
 * - Header 'Authorization: Bearer <key>'
 * - Query parameter '?api_key=<key>'
 *
 * If no API key is provided, falls back to standard user session authentication (authenticateToken)
 * so logged-in web app users continue working seamlessly.
 */
export async function authenticatePayablesAccess(req, res, next) {
  try {
    const headerKey = req.headers['x-api-key'] || req.headers['x-nkb-api-key'] || req.headers['x-api-token'];
    const authHeader = req.headers['authorization'];
    const bearerKey = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : null;
    const queryKey = req.query.api_key;

    // A JWT usually has two dots (xxx.yyy.zzz). If bearer is an API key without dots, consider it an API key.
    const candidateApiKey = headerKey || (bearerKey && !bearerKey.includes('.') ? bearerKey : null) || queryKey;
    const passedKey = candidateApiKey ? candidateApiKey.trim() : null;

    if (passedKey) {
      // Check database api_keys table
      const keyRecord = await db('api_keys').where({ api_key: passedKey }).first();

      if (!keyRecord) {
        return res.status(401).json({
          success: false,
          message: 'Invalid x-api-key provided. Authentication failed.'
        });
      }

      if (!keyRecord.is_active) {
        return res.status(403).json({
          success: false,
          message: `API Key '${keyRecord.key_name}' is currently revoked or inactive.`
        });
      }

      // Asynchronously update last_used_at timestamp
      db('api_keys').where({ id: keyRecord.id }).update({ last_used_at: db.fn.now() }).catch(() => {});

      req.apiAuthType = 'API_KEY';
      req.apiKeyRecord = keyRecord;
      req.clientApp = keyRecord.client_app;
      return next();
    }

    // Fallback to internal user JWT token / session authentication
    return authenticateToken(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
}

/**
 * Normalizes payable items from my.nkbmanufacturing.com into standard COO approval structure
 */
export function formatPayableItem(p) {
  if (!p) return null;

  const reqNo = p.request_number || p.req_cheque_no || p.cheque_number || p.payable_number || p.req_number || p.control_number || `PB-${p.id}`;
  const dateVal = p.cheque_date || p.date || p.date_created || p.invoice_date || new Date().toISOString().slice(0, 10);
  const payeeVal = p.payee_name || p.payee_beneficiary || p.payee || p.beneficiary || p.vendor || p.company_name || p.company || 'NKB Entity';
  const categoryVal = p.category || p.payable_category || (p.items && p.items[0]?.expense_category) || 'Accrued expenses';
  const bankVal = p.bank_name || p.bank_account || p.bank || (String(payeeVal).includes('BDO') ? 'BDO: NKB Manufacturing Corporation' : 'BDO - 0080-5801-0547');
  const purposeVal = p.purpose || p.purpose_usage || p.usage || p.description || (p.items && p.items[0]?.description) || 'Disbursement';
  const amountVal = parseFloat(p.amount || p.total || p.amount_due || 0);

  // Attachments: if relative URL, prepend with http://my.nkbmanufacturing.com
  let attachmentVal = p.attachment_url || p.attachment || (p.files && p.files.length ? p.files[0] : null);
  if (attachmentVal && attachmentVal.startsWith('/')) {
    attachmentVal = `http://${NKB_API_HOST}${attachmentVal}`;
  }

  const approvalVal = p.status || p.coo_approval || 'PENDING_COO_APPROVAL';

  // Parse line_items if passed as JSON string
  let itemsList = [];
  if (Array.isArray(p.items)) {
    itemsList = p.items;
  } else if (typeof p.line_items === 'string') {
    try {
      itemsList = JSON.parse(p.line_items);
    } catch (_) {}
  } else if (Array.isArray(p.line_items)) {
    itemsList = p.line_items;
  }

  if (itemsList.length === 0) {
    itemsList = [
      {
        description: purposeVal,
        expense_category: categoryVal,
        quantity: 1.00,
        cost: amountVal,
        subtotal: amountVal,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: amountVal
      }
    ];
  }

  return {
    ...p,
    id: p.id,
    payable_number: reqNo,
    req_cheque_no: reqNo,
    company: p.company_name || p.company || 'NKB Manufacturing Corporation',
    company_code: p.company_code || 'NKB',
    invoice_number: p.invoice_number || p.invoice_reference || '',
    invoice_date: p.invoice_date || dateVal,
    date: dateVal,
    date_created: p.created_at || dateVal,
    due_date: p.due_date || dateVal,
    control_number: p.control_number || '',
    payee_beneficiary: payeeVal,
    vendor: payeeVal,
    category: categoryVal,
    bank_account: bankVal,
    purpose_usage: purposeVal,
    description: purposeVal,
    amount: amountVal,
    total: amountVal,
    amount_due: amountVal,
    subtotal: amountVal,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    attachment: attachmentVal,
    attachment_url: attachmentVal,
    files: attachmentVal ? [attachmentVal] : (p.files || []),
    status: approvalVal,
    coo_approval: approvalVal,
    created_by: p.requested_by_name || p.requestor_name || p.created_by || 'Executive Admin',
    term: p.terms || p.term || 'Net 30',
    comments: p.comments || p.coo_notes || '',
    items: itemsList
  };
}

// In-memory local cache / tracking
let localPayableRecords = [];

// Helper to fetch active NKB API Key (checks request header, .env, database, or fallback)
async function getNkbApiKey(req) {
  const headerKey = req.headers['x-nkb-api-key'] || req.headers['x-api-key'];
  if (headerKey && headerKey.trim()) {
    return headerKey.trim();
  }

  const envKey = process.env.NKB_PAYABLES_API_KEY || process.env.NKB_API_KEY;
  if (envKey && envKey.trim()) {
    return envKey.trim();
  }

  try {
    const setting = await db('system_settings').where({ key: 'nkb_payables_api_key' }).first();
    if (setting && setting.value) {
      return setting.value.trim();
    }
  } catch (_) {}

  return DEFAULT_API_KEY;
}

/**
 * GET /api/v1/payables/config
 * Check if API key is configured and verify connectivity
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const apiKey = await getNkbApiKey(req);
    const hasKey = Boolean(apiKey && apiKey.length > 0);
    const maskedKey = hasKey
      ? apiKey.slice(0, 12) + '...' + apiKey.slice(-4)
      : null;

    let apiOnline = false;
    let apiMessage = 'Connecting...';
    let keyMetadata = null;

    if (hasKey) {
      try {
        const pingRes = await nkbApiRequest('GET', '/ping', apiKey);
        if (pingRes.ok && pingRes.data?.status === 'ok') {
          apiOnline = true;
          apiMessage = 'Connected to NKB Developer REST API (my.nkbmanufacturing.com)';
          keyMetadata = pingRes.data?.key || null;
        } else {
          apiMessage = pingRes.data?.message || `API returned status ${pingRes.status}`;
        }
      } catch (netErr) {
        apiMessage = `Cannot reach NKB API: ${netErr.message}`;
      }
    }

    return res.json({
      success: true,
      hasKey,
      maskedKey,
      apiUrl: `http://${NKB_API_HOST}${NKB_API_PREFIX}`,
      apiOnline,
      apiMessage,
      keyMetadata
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/config
 * Save NKB API Key into system_settings
 */
router.post('/config', authenticateToken, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (typeof apiKey !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid apiKey parameter.' });
    }

    const trimmed = apiKey.trim();
    const existing = await db('system_settings').where({ key: 'nkb_payables_api_key' }).first();

    if (existing) {
      await db('system_settings').where({ key: 'nkb_payables_api_key' }).update({
        value: trimmed,
        updated_at: db.fn.now()
      });
    } else {
      await db('system_settings').insert({
        key: 'nkb_payables_api_key',
        value: trimmed,
        description: 'NKB Developer API Key for Payables and COO Approvals'
      });
    }

    return res.json({
      success: true,
      message: 'NKB API Key saved successfully.',
      hasKey: Boolean(trimmed)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ============================================================================
 * MULTI-API KEY MANAGEMENT ROUTES
 * Allows administrators to generate, manage, and revoke API keys for external webapps
 * ============================================================================
 */

/**
 * GET /api/v1/payables/api-keys
 * Returns list of registered API keys for external webapps
 */
router.get('/api-keys', authenticateToken, async (req, res) => {
  try {
    const keys = await db('api_keys').select('*').orderBy('id', 'asc');
    const sanitized = keys.map(k => ({
      id: k.id,
      key_name: k.key_name,
      client_app: k.client_app,
      masked_key: k.api_key ? (k.api_key.slice(0, 10) + '...' + k.api_key.slice(-4)) : '',
      api_key: k.api_key,
      scopes: k.scopes ? k.scopes.split(',') : [],
      is_active: Boolean(k.is_active),
      rate_limit_rpm: k.rate_limit_rpm || 120,
      last_used_at: k.last_used_at,
      created_at: k.created_at,
      is_master: k.api_key === DEFAULT_API_KEY
    }));

    return res.json({
      success: true,
      keys: sanitized
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/api-keys
 * Generates a new API key for an external webapp
 */
router.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    const { key_name, client_app, scopes, custom_key } = req.body;

    if (!key_name || !key_name.trim()) {
      return res.status(400).json({ success: false, message: 'Key Name / Label is required (e.g. "E-Commerce App").' });
    }

    if (!client_app || !client_app.trim()) {
      return res.status(400).json({ success: false, message: 'Client WebApp Identifier is required (e.g. "Shopify Storefront").' });
    }

    const randomSuffix = crypto.randomBytes(16).toString('hex');
    const generatedKey = (custom_key && custom_key.trim()) ? custom_key.trim() : `nkb_live_${randomSuffix}`;

    const existing = await db('api_keys').where({ api_key: generatedKey }).first();
    if (existing) {
      return res.status(409).json({ success: false, message: 'An API key with this token already exists.' });
    }

    const scopesStr = Array.isArray(scopes) ? scopes.join(',') : (scopes || 'payables:read,payables:create');

    const [newId] = await db('api_keys').insert({
      key_name: key_name.trim(),
      client_app: client_app.trim(),
      api_key: generatedKey,
      scopes: scopesStr,
      is_active: 1,
      rate_limit_rpm: 120,
      created_at: new Date(),
      updated_at: new Date()
    });

    const insertedId = typeof newId === 'object' ? newId.id : newId;
    const createdRecord = await db('api_keys').where({ id: insertedId }).first();

    return res.status(201).json({
      success: true,
      message: `API Key '${key_name}' created successfully for ${client_app}.`,
      key: {
        id: createdRecord.id,
        key_name: createdRecord.key_name,
        client_app: createdRecord.client_app,
        api_key: createdRecord.api_key,
        masked_key: createdRecord.api_key.slice(0, 10) + '...' + createdRecord.api_key.slice(-4),
        scopes: createdRecord.scopes ? createdRecord.scopes.split(',') : [],
        is_active: Boolean(createdRecord.is_active),
        rate_limit_rpm: createdRecord.rate_limit_rpm,
        created_at: createdRecord.created_at,
        is_master: false
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH /api/v1/payables/api-keys/:id/toggle
 * Toggles an API key between active and revoked/disabled
 */
router.patch('/api-keys/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('api_keys').where({ id }).first();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    const newStatus = existing.is_active ? 0 : 1;
    await db('api_keys').where({ id }).update({
      is_active: newStatus,
      updated_at: db.fn.now()
    });

    return res.json({
      success: true,
      is_active: Boolean(newStatus),
      message: `API Key '${existing.key_name}' is now ${newStatus ? 'ACTIVE' : 'REVOKED/DISABLED'}.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/v1/payables/api-keys/:id
 * Permanently deletes an API key (prevents deletion of Primary Master Key)
 */
router.delete('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('api_keys').where({ id }).first();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    if (existing.api_key === DEFAULT_API_KEY) {
      return res.status(400).json({ success: false, message: 'Cannot delete the Primary NKB Master Key.' });
    }

    await db('api_keys').where({ id }).del();

    return res.json({
      success: true,
      message: `API Key '${existing.key_name}' has been permanently removed.`
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ============================================================================
 * PAYABLES DATA ENDPOINTS
 * Supports both internal sessions and external webapps with valid `x-api-key`
 * ============================================================================
 */

/**
 * GET /api/v1/payables
 * List cheque payables directly from my.nkbmanufacturing.com (or local cache)
 */
router.get('/', authenticatePayablesAccess, async (req, res) => {
  try {
    const apiKey = await getNkbApiKey(req);
    const { status, category, bank, date_from, date_to, search } = req.query;

    const queryParams = new URLSearchParams();
    if (status && status !== 'ALL') queryParams.set('status', status);
    if (category) queryParams.set('category', category);
    if (bank) queryParams.set('bank', bank);
    if (date_from) queryParams.set('date_from', date_from);
    if (date_to) queryParams.set('date_to', date_to);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    try {
      const response = await nkbApiRequest('GET', `/payables${queryString}`, apiKey);

      if (response.ok) {
        const rawPayload = response.data;
        const rawItems = Array.isArray(rawPayload)
          ? rawPayload
          : (rawPayload.data || rawPayload.payables || []);

        const formatted = rawItems.map(it => formatPayableItem(it));

        // Filter by local search query if provided
        let filtered = formatted;
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          filtered = filtered.filter(p =>
            (p.req_cheque_no || '').toLowerCase().includes(q) ||
            (p.payable_number || '').toLowerCase().includes(q) ||
            (p.payee_beneficiary || '').toLowerCase().includes(q) ||
            (p.company || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q) ||
            (p.bank_account || '').toLowerCase().includes(q) ||
            (p.purpose_usage || '').toLowerCase().includes(q) ||
            (p.control_number || '').toLowerCase().includes(q) ||
            (p.invoice_number || '').toLowerCase().includes(q)
          );
        }

        // Cache latest fetched in memory
        localPayableRecords = formatted;

        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: filtered,
          totalCount: rawPayload.total || filtered.length
        });
      }
    } catch (apiErr) {
      console.warn('Live API request failed, falling back to local memory cache:', apiErr.message);
    }

    // Fallback to local memory cache if remote API is temporarily unreachable
    let fallbackList = localPayableRecords.map(it => formatPayableItem(it));
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      fallbackList = fallbackList.filter(p =>
        (p.coo_approval || '').toUpperCase().includes(s) ||
        (p.status || '').toUpperCase().includes(s)
      );
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      fallbackList = fallbackList.filter(p =>
        (p.req_cheque_no || '').toLowerCase().includes(q) ||
        (p.payable_number || '').toLowerCase().includes(q) ||
        (p.payee_beneficiary || '').toLowerCase().includes(q) ||
        (p.purpose_usage || '').toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      source: 'LOCAL_DATASET',
      data: fallbackList,
      totalCount: fallbackList.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables
 * Allows external webapps (with x-api-key) or internal users to submit a new payable request.
 * Automatically synchronizes with my.nkbmanufacturing.com and queues for COO approval.
 */
router.post('/', authenticatePayablesAccess, async (req, res) => {
  try {
    const body = req.body || {};
    const payeeName = (body.payee_name || body.payee_beneficiary || body.payee || body.vendor || '').trim();
    const amount = parseFloat(body.amount || body.total || body.amount_due || 0);

    if (!payeeName) {
      return res.status(400).json({
        success: false,
        message: 'Payee / Beneficiary name (payee_name or payee_beneficiary) is required.'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid amount (amount or total) greater than 0 is required.'
      });
    }

    // Generate unique request tracking number if not supplied
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const requestNumber = (body.request_number || body.req_cheque_no || `REQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${randomSuffix}`).trim();

    const category = body.category || body.payable_category || 'Operational Expense';
    const bankName = body.bank_name || body.bank_account || 'BDO - 0080-5801-0547';
    const purpose = body.purpose || body.purpose_usage || body.description || 'Payable Disbursement Request';
    const invoiceNo = body.invoice_number || body.invoice_reference || '';
    const dueDate = body.due_date || body.date || new Date().toISOString().slice(0, 10);
    const requestedBy = req.apiKeyRecord
      ? `${req.apiKeyRecord.client_app} (${req.apiKeyRecord.key_name})`
      : (req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : 'External WebApp');

    // Build line items
    let lineItems = body.line_items || body.items || [];
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      lineItems = [
        {
          description: purpose,
          expense_category: category,
          quantity: 1,
          cost: amount,
          subtotal: amount,
          total: amount
        }
      ];
    }

    const newPayableRecord = {
      id: body.id || `PB-${Date.now()}`,
      request_number: requestNumber,
      req_cheque_no: requestNumber,
      payable_number: requestNumber,
      company_name: body.company_name || body.company || 'NKB Manufacturing Corporation',
      company_code: body.company_code || 'NKB',
      payee_name: payeeName,
      payee_beneficiary: payeeName,
      category: category,
      bank_name: bankName,
      bank_account: bankName,
      purpose: purpose,
      purpose_usage: purpose,
      description: purpose,
      amount: amount,
      total: amount,
      invoice_number: invoiceNo,
      date: dueDate,
      cheque_date: dueDate,
      due_date: dueDate,
      status: 'PENDING_COO_APPROVAL',
      coo_approval: 'PENDING_COO_APPROVAL',
      requested_by_name: requestedBy,
      created_by: requestedBy,
      attachment_url: body.attachment_url || body.attachment || null,
      comments: body.comments || body.notes || `Submitted via API by ${req.apiKeyRecord ? req.apiKeyRecord.client_app : 'WebApp'}`,
      line_items: lineItems,
      items: lineItems,
      created_at: new Date().toISOString()
    };

    // Forward to upstream my.nkbmanufacturing.com using master key
    let upstreamSynced = false;
    let upstreamResult = null;
    try {
      const upstreamRes = await nkbApiRequest('POST', '/payables', DEFAULT_API_KEY, newPayableRecord);
      if (upstreamRes.ok && upstreamRes.data) {
        upstreamSynced = true;
        upstreamResult = upstreamRes.data;
        if (upstreamResult.id) newPayableRecord.id = upstreamResult.id;
      }
    } catch (upstreamErr) {
      console.warn('Upstream sync note:', upstreamErr.message);
    }

    // Format item
    const formatted = formatPayableItem(newPayableRecord);

    // Add to local cache at the beginning
    localPayableRecords.unshift(formatted);

    // Log audit if request was authenticated by web user
    if (req.user) {
      await logAudit(
        req,
        'CREATE_PAYABLE_REQUEST',
        'payables',
        formatted.id,
        null,
        formatted
      ).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      message: 'Payable request successfully created and submitted for COO approval.',
      source: upstreamSynced ? 'REMOTE_SYNCED' : 'LOCAL_QUEUED',
      upstream_synced: upstreamSynced,
      data: formatted
    });
  } catch (err) {
    console.error('Error creating payable request:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/payables/:id
 * Get single payable details directly from my.nkbmanufacturing.com or local cache
 */
router.get('/:id', authenticatePayablesAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = await getNkbApiKey(req);

    try {
      const response = await nkbApiRequest('GET', `/payables/${id}`, apiKey);
      if (response.ok && response.data) {
        const item = response.data.data || response.data;
        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: formatPayableItem(item)
        });
      }
    } catch (_) {}

    const found = localPayableRecords.find(p =>
      String(p.id) === String(id) ||
      String(p.payable_number) === String(id) ||
      String(p.req_cheque_no) === String(id)
    );

    if (!found) {
      return res.status(404).json({ success: false, message: `Payable ${id} not found.` });
    }

    return res.json({
      success: true,
      source: 'LOCAL_DATASET',
      data: formatPayableItem(found)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/:id/confirm
 * Approves or Rejects a payable directly on my.nkbmanufacturing.com
 * Protected by authenticateToken (only authenticated internal managers/COO can approve)
 */
router.post('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, cheque_number, notes, confirmed_by } = req.body;

    if (!decision || !['CONFIRMED', 'REJECTED'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid decision. Must be 'CONFIRMED' or 'REJECTED'."
      });
    }

    const checkNo = (cheque_number || '').trim();
    if (decision === 'CONFIRMED' && !checkNo) {
      return res.status(400).json({
        success: false,
        message: "Check Number (cheque_number) is required for approval."
      });
    }

    const approverName = confirmed_by || (req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : 'COO');
    const apiKey = await getNkbApiKey(req);
    let remoteSuccess = false;
    let remoteResponse = null;

    try {
      const response = await nkbApiRequest('POST', `/payables/${id}/confirm`, apiKey, {
        decision,
        cheque_number: checkNo,
        notes: notes || '',
        confirmed_by: approverName
      });

      remoteResponse = response.data;
      if (response.ok) {
        remoteSuccess = true;
      } else {
        console.warn('Remote confirmation returned error:', response.data);
      }
    } catch (apiErr) {
      console.warn('Notice: Remote approval API call failed:', apiErr.message);
    }

    // Update local cache record
    const targetIdx = localPayableRecords.findIndex(p => String(p.id) === String(id) || String(p.req_cheque_no) === String(id));
    if (targetIdx !== -1) {
      localPayableRecords[targetIdx] = {
        ...localPayableRecords[targetIdx],
        status: decision,
        coo_approval: decision,
        cheque_number: checkNo,
        checked_by: approverName,
        comments: `${localPayableRecords[targetIdx].comments || ''}\n[${new Date().toLocaleString()}] ${decision} by ${approverName}. Check #: ${checkNo}. Notes: ${notes || 'None'}`.trim()
      };
    }

    // Log to audit trail
    await logAudit(
      req,
      'PAYABLE_APPROVAL',
      'payables',
      id,
      { decision, cheque_number: checkNo, approver: approverName, remoteSuccess },
      { status: decision }
    ).catch(() => {});

    return res.json({
      success: true,
      decision,
      cheque_number: checkNo,
      remoteSuccess,
      remoteResponse,
      message: `Payable ${id} successfully ${decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED'}${checkNo ? ` with Check #${checkNo}` : ''}.`
    });
  } catch (err) {
    console.error('Error confirming payable:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/webhook
 * Receives incoming payable approval requests directly from my.nkbmanufacturing.com
 */
router.post('/webhook', async (req, res) => {
  try {
    const rawData = req.body;
    if (!rawData) {
      return res.status(400).json({ success: false, message: 'Payload is required' });
    }

    const items = Array.isArray(rawData) ? rawData : (rawData.data || [rawData]);
    let count = 0;

    for (const raw of items) {
      const formatted = formatPayableItem(raw);
      const idx = localPayableRecords.findIndex(p =>
        String(p.id) === String(formatted.id) ||
        String(p.req_cheque_no) === String(formatted.req_cheque_no)
      );

      if (idx !== -1) {
        localPayableRecords[idx] = { ...localPayableRecords[idx], ...formatted };
      } else {
        localPayableRecords.unshift(formatted);
        count++;
      }
    }

    return res.json({
      success: true,
      message: `Received ${count} new approval request(s) via Webhook from my.nkbmanufacturing.com.`,
      totalActive: localPayableRecords.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
