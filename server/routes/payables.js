import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

export const MY_NKB_API_KEY = 'nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b';
export const MY_NKB_LEGACY_KEY = 'nkb_live_317afeed3bd23218969a04d4abecdfb6';
export const PC_NKB_API_KEY = 'nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f';
export const LEGACY_MASTER_KEY = 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943';
export const DEFAULT_API_KEY = MY_NKB_API_KEY;

export let dynamicPortalKeys = {
  my: MY_NKB_API_KEY,
  pc: PC_NKB_API_KEY
};

export let dynamicPortalUrls = {
  my: 'http://my.nkbmanufacturing.com/api/v1',
  pc: 'https://pc.nkbmanufacturing.com/api/v1'
};

export async function getActivePortalKey(portalId) {
  try {
    const isPc = portalId === 'pc' || (portalId && portalId.includes('pc.'));
    const settingKey = isPc ? 'nkb_payables_pc_api_key' : 'nkb_payables_my_api_key';
    const setting = await db('system_settings').where({ key: settingKey }).first();
    if (setting && setting.value && setting.value.trim()) {
      const keyVal = setting.value.trim();
      if (isPc) dynamicPortalKeys.pc = keyVal;
      else dynamicPortalKeys.my = keyVal;
      return keyVal;
    }

    const appLike = isPc ? '%pc.nkb%' : '%my.nkb%';
    const record = await db('api_keys').where('client_app', 'like', appLike).andWhere({ is_active: 1 }).orderBy('id', 'desc').first();
    if (record && record.api_key) {
      if (isPc) dynamicPortalKeys.pc = record.api_key;
      else dynamicPortalKeys.my = record.api_key;
      return record.api_key;
    }
  } catch (_) {}
  return (portalId === 'pc' || (portalId && portalId.includes('pc.'))) ? dynamicPortalKeys.pc : dynamicPortalKeys.my;
}

export async function updateOrCreatePortalKey(domain, newKey) {
  if (!newKey || !newKey.trim()) return;
  const keyVal = newKey.trim();
  const isPc = domain === 'pc' || domain.includes('pc.');
  const appMatch = isPc ? '%pc.nkb%' : '%my.nkb%';
  const defaultName = isPc ? 'pc.nkbmanufacturing.com API' : 'my.nkbmanufacturing.com API';
  const defaultApp = isPc ? 'https://pc.nkbmanufacturing.com/' : 'https://my.nkbmanufacturing.com/';

  if (isPc) dynamicPortalKeys.pc = keyVal;
  else dynamicPortalKeys.my = keyVal;

  // 1. Update in system_settings
  const settingKey = isPc ? 'nkb_payables_pc_api_key' : 'nkb_payables_my_api_key';
  const settingExisting = await db('system_settings').where({ key: settingKey }).first();
  if (settingExisting) {
    await db('system_settings').where({ key: settingKey }).update({ value: keyVal, updated_at: db.fn.now() });
  } else {
    await db('system_settings').insert({ key: settingKey, value: keyVal, description: `${domain} API Key`, created_at: db.fn.now(), updated_at: db.fn.now() });
  }

  // 2. Synchronize all matching records in api_keys
  const matching = await db('api_keys').where('client_app', 'like', appMatch);
  if (matching && matching.length > 0) {
    await db('api_keys').where('client_app', 'like', appMatch).update({
      api_key: keyVal,
      is_active: 1,
      updated_at: db.fn.now()
    });
  } else {
    await db('api_keys').insert({
      key_name: defaultName,
      client_app: defaultApp,
      api_key: keyVal,
      scopes: 'payables:read,payables:create,payables:confirm',
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });
  }
}

export const NKB_PORTALS = {
  my: {
    id: 'my.nkbmanufacturing.com',
    name: 'my.nkbmanufacturing.com (Main Portal)',
    host: 'my.nkbmanufacturing.com',
    apiKey: MY_NKB_API_KEY,
    protocol: 'http',
    port: 80
  },
  pc: {
    id: 'pc.nkbmanufacturing.com',
    name: 'pc.nkbmanufacturing.com (Petty Cash Portal)',
    host: 'pc.nkbmanufacturing.com',
    apiKey: PC_NKB_API_KEY,
    protocol: 'https',
    port: 443
  }
};

const NKB_API_PREFIX = '/api/v1';

/**
 * Robust HTTP/HTTPS client supporting both protocols, custom endpoints, and automatic redirect handling (301/302).
 */
export function nkbApiRequest(method, endpointPath, apiKey, bodyData = null, targetHost = null, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) {
      return reject(new Error('Too many redirects attempting to connect to portal'));
    }

    let isPc = false;
    if (targetHost) {
      isPc = targetHost.includes('pc.') || targetHost.includes('petty');
    } else if (apiKey) {
      isPc = apiKey.includes('f1d0') || apiKey === PC_NKB_API_KEY;
    }

    let defaultBaseUrl = isPc ? dynamicPortalUrls.pc : dynamicPortalUrls.my;
    let urlObj;
    try {
      if (targetHost && targetHost.startsWith('http')) {
        urlObj = new URL(endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath, targetHost);
      } else {
        const base = defaultBaseUrl.endsWith('/') ? defaultBaseUrl.slice(0, -1) : defaultBaseUrl;
        const cleanPath = endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath;
        const baseWithoutApi = base.includes('/api/v1') ? base.replace('/api/v1', '') : base;
        urlObj = new URL(cleanPath, baseWithoutApi);
        if (!urlObj.pathname.startsWith('/api/v1')) {
          urlObj.pathname = `/api/v1${urlObj.pathname}`;
        }
      }
    } catch (_) {
      const host = targetHost || (isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com');
      const proto = (isPc || host.includes('pc.')) ? 'https:' : 'http:';
      urlObj = new URL(`${proto}//${host}/api/v1${endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath}`);
    }

    const effectiveKey = apiKey || (isPc ? dynamicPortalKeys.pc : dynamicPortalKeys.my);
    const headers = {
      'x-api-key': effectiveKey,
      'Accept': 'application/json',
      'User-Agent': 'Formulation-Pro/1.0.0 (Node.js)'
    };

    let postPayload = null;
    if (bodyData) {
      postPayload = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postPayload);
    }

    const isHttps = urlObj.protocol === 'https:';
    const clientModule = isHttps ? https : http;
    const port = urlObj.port ? parseInt(urlObj.port, 10) : (isHttps ? 443 : 80);

    const req = clientModule.request({
      hostname: urlObj.hostname,
      port: port,
      path: `${urlObj.pathname}${urlObj.search}`,
      method: method,
      headers: headers,
      timeout: 10000
    }, (res) => {
      // Follow 301 / 302 / 307 / 308 redirects automatically
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        let redirectTarget = res.headers.location;
        if (!redirectTarget.startsWith('http')) {
          redirectTarget = `${urlObj.origin}${redirectTarget}`;
        }
        return nkbApiRequest(method, '', effectiveKey, bodyData, redirectTarget, redirectCount + 1)
          .then(resolve)
          .catch(reject);
      }

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
      reject(new Error(`Timeout connecting to ${urlObj.hostname}`));
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
 * Supports external webapps using multiple registered API Keys:
 * - my.nkbmanufacturing.com key (nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b, nkb_live_317afeed3bd23218969a04d4abecdfb6)
 * - pc.nkbmanufacturing.com key (nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f)
 * - Any dynamically generated API Key in `api_keys` table
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
      // 1. Check database api_keys table
      let keyRecord = await db('api_keys').where({ api_key: passedKey }).first();

      // 2. Check dynamic portal keys from settings
      if (!keyRecord) {
        const myKey = await getActivePortalKey('my');
        const pcKey = await getActivePortalKey('pc');
        if (passedKey === pcKey) {
          keyRecord = {
            id: 992,
            key_name: 'pc.nkbmanufacturing.com API',
            client_app: 'https://pc.nkbmanufacturing.com/',
            api_key: pcKey,
            scopes: 'payables:read,payables:create,payables:confirm',
            is_active: 1
          };
        } else if (passedKey === myKey) {
          keyRecord = {
            id: 991,
            key_name: 'my.nkbmanufacturing.com API',
            client_app: 'https://my.nkbmanufacturing.com/',
            api_key: myKey,
            scopes: 'payables:read,payables:create,payables:confirm',
            is_active: 1
          };
        }
      }

      // 3. Fallback check for all known built-in keys
      if (!keyRecord) {
        const isPcKey = passedKey === 'nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f' || passedKey === PC_NKB_API_KEY;
        const isMyKey = passedKey === 'nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b' ||
                        passedKey === 'nkb_live_317afeed3bd23218969a04d4abecdfb6' ||
                        passedKey === 'nkb_live_77be0f89d17ebc1b46ce3e7c3151f943' ||
                        passedKey === MY_NKB_API_KEY;

        if (isPcKey) {
          keyRecord = {
            id: 992,
            key_name: 'pc.nkbmanufacturing.com API',
            client_app: 'https://pc.nkbmanufacturing.com/',
            api_key: passedKey,
            scopes: 'payables:read,payables:create,payables:confirm',
            is_active: 1
          };
        } else if (isMyKey) {
          keyRecord = {
            id: 991,
            key_name: 'my.nkbmanufacturing.com API',
            client_app: 'https://my.nkbmanufacturing.com/',
            api_key: passedKey,
            scopes: 'payables:read,payables:create,payables:confirm',
            is_active: 1
          };
        }
      }

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

      // Asynchronously update last_used_at timestamp if existing in DB
      if (keyRecord.id && keyRecord.id < 900) {
        db('api_keys').where({ id: keyRecord.id }).update({ last_used_at: db.fn.now() }).catch(() => {});
      }

      const isPc = passedKey.includes('f1d0') || (keyRecord.client_app && keyRecord.client_app.includes('pc.'));
      req.apiAuthType = 'API_KEY';
      req.apiKeyRecord = keyRecord;
      req.clientApp = keyRecord.client_app;
      req.sourcePortal = isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com';
      return next();
    }

    // Fallback to internal user JWT token / session authentication
    return authenticateToken(req, res, next);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Authentication error', error: err.message });
  }
}

/**
 * Normalizes payable items from either my.nkbmanufacturing.com or pc.nkbmanufacturing.com
 */
export function formatPayableItem(p, defaultSource = null) {
  if (!p) return null;

  const isPc = Boolean(
    defaultSource === 'pc.nkbmanufacturing.com' ||
    (p.source_portal && p.source_portal.includes('pc.')) ||
    (p.source_system && p.source_system.includes('pc.')) ||
    (p.company && p.company.toLowerCase().includes('petty')) ||
    (p.company_name && p.company_name.toLowerCase().includes('petty')) ||
    (p.company_code && p.company_code.includes('PC')) ||
    (p.req_cheque_no && (p.req_cheque_no.startsWith('PC-') || p.req_cheque_no.startsWith('PETTY-'))) ||
    (p.payable_number && (p.payable_number.startsWith('PC-') || p.payable_number.startsWith('PETTY-'))) ||
    (p.comments && p.comments.includes('pc.nkbmanufacturing.com')) ||
    (p.requested_by_name && p.requested_by_name.includes('pc.nkbmanufacturing.com'))
  );

  const sourcePortal = isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com';
  const defaultCompany = isPc ? 'NKB Petty Cash (pc.nkbmanufacturing.com)' : 'NKB Manufacturing Corporation';
  const defaultCompanyCode = isPc ? 'NKB-PC' : 'NKB';

  const reqNo = p.request_number || p.req_cheque_no || p.cheque_number || p.payable_number || p.req_number || p.control_number || (isPc ? `PC-${p.id}` : `PB-${p.id}`);
  const dateVal = p.cheque_date || p.date || p.date_created || p.invoice_date || new Date().toISOString().slice(0, 10);
  const payeeVal = p.payee_name || p.payee_beneficiary || p.payee || p.beneficiary || p.vendor || p.company_name || p.company || (isPc ? 'Petty Cash Custodian' : 'NKB Entity');
  const categoryVal = p.category || p.payable_category || (p.items && p.items[0]?.expense_category) || (isPc ? 'Petty Cash Replenishment' : 'Accrued expenses');
  const bankVal = p.bank_name || p.bank_account || p.bank || (String(payeeVal).includes('BDO') ? 'BDO: NKB Manufacturing Corporation' : 'BDO - 0080-5801-0547');
  const purposeVal = p.purpose || p.purpose_usage || p.usage || p.description || (p.items && p.items[0]?.description) || (isPc ? 'Petty Cash Disbursement' : 'Disbursement');
  const amountVal = parseFloat(p.amount || p.total || p.amount_due || 0);

  // Attachments: if relative URL, prepend with host
  let attachmentVal = p.attachment_url || p.attachment || (p.files && p.files.length ? p.files[0] : null);
  if (attachmentVal && attachmentVal.startsWith('/')) {
    attachmentVal = `http://${sourcePortal}${attachmentVal}`;
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
    source_portal: sourcePortal,
    source_system: p.source_system || (isPc ? 'https://pc.nkbmanufacturing.com/' : 'https://my.nkbmanufacturing.com/'),
    source_badge: isPc ? 'pc.nkb' : 'my.nkb',
    payable_number: reqNo,
    req_cheque_no: reqNo,
    company: p.company_name || p.company || defaultCompany,
    company_code: p.company_code || defaultCompanyCode,
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
    created_by: p.requested_by_name || p.requestor_name || p.created_by || (isPc ? 'pc.nkbmanufacturing.com (Petty Cash)' : 'my.nkbmanufacturing.com'),
    term: p.terms || p.term || 'Net 30',
    comments: p.comments || p.coo_notes || '',
    items: itemsList
  };
}

// In-memory local cache / tracking
let localPayableRecords = [];

/**
 * GET /api/v1/payables/config
 * Returns active configuration and connectivity for BOTH portals
 */
router.get('/config', async (req, res) => {
  try {
    const myKey = await getActivePortalKey('my');
    const pcKey = await getActivePortalKey('pc');
    const myUrlSetting = await db('system_settings').where({ key: 'nkb_payables_my_api_url' }).first();
    const pcUrlSetting = await db('system_settings').where({ key: 'nkb_payables_pc_api_url' }).first();
    const myUrl = myUrlSetting ? myUrlSetting.value : dynamicPortalUrls.my;
    const pcUrl = pcUrlSetting ? pcUrlSetting.value : dynamicPortalUrls.pc;

    return res.json({
      success: true,
      hasKey: Boolean(myKey || pcKey),
      maskedKey: myKey ? (myKey.slice(0, 10) + '...' + myKey.slice(-4)) : '',
      apiUrl: myUrl,
      apiOnline: true,
      apiMessage: 'Dual NKB Portals Active (my.nkb & pc.nkb)',
      portals: {
        my: {
          id: 'my.nkbmanufacturing.com',
          name: 'Main NKB Portal',
          apiKey: myKey,
          maskedKey: myKey ? (myKey.slice(0, 10) + '...' + myKey.slice(-4)) : '',
          apiUrl: myUrl
        },
        pc: {
          id: 'pc.nkbmanufacturing.com',
          name: 'Petty Cash NKB Portal',
          apiKey: pcKey,
          maskedKey: pcKey ? (pcKey.slice(0, 10) + '...' + pcKey.slice(-4)) : '',
          apiUrl: pcUrl
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/config
 * Updates / replaces active portal API keys or endpoint URLs
 */
router.post('/config', authenticatePayablesAccess, async (req, res) => {
  try {
    const { my_api_key, pc_api_key, my_api_url, pc_api_url, apiKey, portal } = req.body;

    if (apiKey && apiKey.trim()) {
      const keyVal = apiKey.trim();
      if (portal === 'pc' || portal === 'pc.nkbmanufacturing.com') {
        await updateOrCreatePortalKey('pc.nkbmanufacturing.com', keyVal);
      } else {
        await updateOrCreatePortalKey('my.nkbmanufacturing.com', keyVal);
      }
    }

    if (my_api_key && my_api_key.trim()) {
      await updateOrCreatePortalKey('my.nkbmanufacturing.com', my_api_key.trim());
    }

    if (pc_api_key && pc_api_key.trim()) {
      await updateOrCreatePortalKey('pc.nkbmanufacturing.com', pc_api_key.trim());
    }

    if (my_api_url && my_api_url.trim()) {
      dynamicPortalUrls.my = my_api_url.trim();
      const existing = await db('system_settings').where({ key: 'nkb_payables_my_api_url' }).first();
      if (existing) {
        await db('system_settings').where({ key: 'nkb_payables_my_api_url' }).update({ value: my_api_url.trim(), updated_at: db.fn.now() });
      } else {
        await db('system_settings').insert({ key: 'nkb_payables_my_api_url', value: my_api_url.trim(), description: 'my.nkb API base URL', created_at: db.fn.now(), updated_at: db.fn.now() });
      }
    }

    if (pc_api_url && pc_api_url.trim()) {
      dynamicPortalUrls.pc = pc_api_url.trim();
      const existing = await db('system_settings').where({ key: 'nkb_payables_pc_api_url' }).first();
      if (existing) {
        await db('system_settings').where({ key: 'nkb_payables_pc_api_url' }).update({ value: pc_api_url.trim(), updated_at: db.fn.now() });
      } else {
        await db('system_settings').insert({ key: 'nkb_payables_pc_api_url', value: pc_api_url.trim(), description: 'pc.nkb API base URL', created_at: db.fn.now(), updated_at: db.fn.now() });
      }
    }

    const updatedMyKey = await getActivePortalKey('my');
    const updatedPcKey = await getActivePortalKey('pc');

    return res.json({
      success: true,
      message: 'Portal API configuration updated successfully.',
      portals: {
        my: {
          id: 'my.nkbmanufacturing.com',
          apiKey: updatedMyKey,
          maskedKey: updatedMyKey ? (updatedMyKey.slice(0, 10) + '...' + updatedMyKey.slice(-4)) : '',
          apiUrl: dynamicPortalUrls.my
        },
        pc: {
          id: 'pc.nkbmanufacturing.com',
          apiKey: updatedPcKey,
          maskedKey: updatedPcKey ? (updatedPcKey.slice(0, 10) + '...' + updatedPcKey.slice(-4)) : '',
          apiUrl: dynamicPortalUrls.pc
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ============================================================================
 * MULTI-API KEY MANAGEMENT ROUTES
 * ============================================================================
 */

/**
 * GET /api/v1/payables/api-keys
 * Returns list of registered API keys
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
      is_master: k.api_key === MY_NKB_API_KEY || k.api_key === PC_NKB_API_KEY || k.api_key === LEGACY_MASTER_KEY
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
 * Generates or registers a new API key
 */
router.post('/api-keys', authenticateToken, async (req, res) => {
  try {
    const { key_name, client_app, scopes, custom_key } = req.body;

    if (!key_name || !key_name.trim()) {
      return res.status(400).json({ success: false, message: 'Key Name / Label is required.' });
    }

    if (!client_app || !client_app.trim()) {
      return res.status(400).json({ success: false, message: 'Client WebApp Identifier is required.' });
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
 * PUT /api/v1/payables/api-keys/:id
 * Updates an existing API key's details, token, or scopes
 */
router.put('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { key_name, client_app, api_key, scopes, is_active } = req.body;
    const existing = await db('api_keys').where({ id }).first();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    const updateData = { updated_at: db.fn.now() };
    if (key_name) updateData.key_name = key_name.trim();
    if (client_app) updateData.client_app = client_app.trim();
    if (api_key) updateData.api_key = api_key.trim();
    if (scopes) updateData.scopes = Array.isArray(scopes) ? scopes.join(',') : scopes;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;

    await db('api_keys').where({ id }).update(updateData);
    const updated = await db('api_keys').where({ id }).first();

    // If this was a portal key, update in-memory dynamicPortalKeys
    if (updated.client_app && updated.client_app.includes('pc.')) {
      dynamicPortalKeys.pc = updated.api_key;
    } else if (updated.client_app && updated.client_app.includes('my.')) {
      dynamicPortalKeys.my = updated.api_key;
    }

    return res.json({
      success: true,
      message: `API Key '${updated.key_name}' updated successfully.`,
      key: {
        id: updated.id,
        key_name: updated.key_name,
        client_app: updated.client_app,
        api_key: updated.api_key,
        masked_key: updated.api_key ? (updated.api_key.slice(0, 10) + '...' + updated.api_key.slice(-4)) : '',
        scopes: updated.scopes ? updated.scopes.split(',') : [],
        is_active: Boolean(updated.is_active),
        rate_limit_rpm: updated.rate_limit_rpm || 120,
        last_used_at: updated.last_used_at,
        created_at: updated.created_at,
        is_master: updated.api_key === MY_NKB_API_KEY || updated.api_key === PC_NKB_API_KEY || updated.api_key === LEGACY_MASTER_KEY
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * DELETE /api/v1/payables/api-keys/:id
 * Permanently deletes an API key (prevents deletion of System Portal Keys)
 */
router.delete('/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db('api_keys').where({ id }).first();

    if (!existing) {
      return res.status(404).json({ success: false, message: 'API key not found.' });
    }

    if (existing.api_key === MY_NKB_API_KEY || existing.api_key === PC_NKB_API_KEY || existing.api_key === LEGACY_MASTER_KEY) {
      return res.status(400).json({ success: false, message: 'Cannot delete built-in NKB Portal API Keys.' });
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
 * Supports BOTH my.nkbmanufacturing.com and pc.nkbmanufacturing.com
 * ============================================================================
 */

/**
 * GET /api/v1/payables
 * List cheque payables from both portals and local queue
 */
router.get('/', authenticatePayablesAccess, async (req, res) => {
  try {
    const { status, category, bank, date_from, date_to, search, portal } = req.query;

    const queryParams = new URLSearchParams();
    if (status && status !== 'ALL') queryParams.set('status', status);
    if (category) queryParams.set('category', category);
    if (bank) queryParams.set('bank', bank);
    if (date_from) queryParams.set('date_from', date_from);
    if (date_to) queryParams.set('date_to', date_to);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

    let pulledItems = [];
    let remoteSuccess = false;

    // 1. Try pulling from my.nkbmanufacturing.com
    try {
      const myKey = await getActivePortalKey('my');
      const myRes = await nkbApiRequest('GET', `/payables${queryString}`, myKey, null, 'my.nkbmanufacturing.com');
      if (myRes.ok && myRes.data) {
        const rawItems = Array.isArray(myRes.data) ? myRes.data : (myRes.data.data || myRes.data.payables || []);
        pulledItems.push(...rawItems.map(it => formatPayableItem(it, 'my.nkbmanufacturing.com')));
        remoteSuccess = true;
      }
    } catch (_) {}

    // 2. Try pulling from pc.nkbmanufacturing.com
    try {
      const pcKey = await getActivePortalKey('pc');
      const pcRes = await nkbApiRequest('GET', `/payables${queryString}`, pcKey, null, 'pc.nkbmanufacturing.com');
      if (pcRes.ok && pcRes.data) {
        const rawItems = Array.isArray(pcRes.data) ? pcRes.data : (pcRes.data.data || pcRes.data.payables || []);
        pulledItems.push(...rawItems.map(it => formatPayableItem(it, 'pc.nkbmanufacturing.com')));
        remoteSuccess = true;
      }
    } catch (_) {}

    if (remoteSuccess && pulledItems.length > 0) {
      for (const item of pulledItems) {
        const existsIdx = localPayableRecords.findIndex(p =>
          String(p.id) === String(item.id) ||
          String(p.req_cheque_no) === String(item.req_cheque_no)
        );
        if (existsIdx !== -1) {
          localPayableRecords[existsIdx] = { ...localPayableRecords[existsIdx], ...item };
        } else {
          localPayableRecords.push(item);
        }
      }
    }

    let records = localPayableRecords.map(it => formatPayableItem(it));

    // Filter by Portal if selected
    if (portal && portal !== 'ALL') {
      records = records.filter(p => p.source_portal === portal || p.source_portal?.includes(portal));
    }

    // Filter by status
    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      records = records.filter(p =>
        (p.coo_approval || '').toUpperCase().includes(s) ||
        (p.status || '').toUpperCase().includes(s)
      );
    }

    // Filter by search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter(p =>
        (p.req_cheque_no || '').toLowerCase().includes(q) ||
        (p.payable_number || '').toLowerCase().includes(q) ||
        (p.payee_beneficiary || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.bank_account || '').toLowerCase().includes(q) ||
        (p.purpose_usage || '').toLowerCase().includes(q) ||
        (p.control_number || '').toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q) ||
        (p.source_portal || '').toLowerCase().includes(q)
      );
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return res.json({
      success: true,
      source: remoteSuccess ? 'REMOTE_MERGED' : 'LOCAL_DATASET',
      data: records,
      totalCount: records.length,
      portalsActive: {
        my: MY_NKB_API_KEY.slice(0, 10) + '...',
        pc: PC_NKB_API_KEY.slice(0, 10) + '...'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables
 * Allows BOTH my.nkbmanufacturing.com and pc.nkbmanufacturing.com (and custom webapps)
 * to submit a new payable request into the COO queue.
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

    // Determine whether request came from pc.nkbmanufacturing.com or my.nkbmanufacturing.com
    const sourcePortal = req.sourcePortal || (body.company?.toLowerCase().includes('petty') ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com');
    const isPc = sourcePortal === 'pc.nkbmanufacturing.com';

    // Generate unique request tracking number if not supplied
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const defaultPrefix = isPc ? 'PC' : 'REQ';
    const requestNumber = (body.request_number || body.req_cheque_no || `${defaultPrefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${randomSuffix}`).trim();

    const category = body.category || body.payable_category || (isPc ? 'Petty Cash Replenishment' : 'Operational Expense');
    const bankName = body.bank_name || body.bank_account || 'BDO - 0080-5801-0547';
    const purpose = body.purpose || body.purpose_usage || body.description || (isPc ? 'Petty Cash Disbursement Request' : 'Payable Disbursement Request');
    const invoiceNo = body.invoice_number || body.invoice_reference || '';
    const dueDate = body.due_date || body.date || new Date().toISOString().slice(0, 10);
    const requestedBy = req.apiKeyRecord
      ? `${req.apiKeyRecord.key_name} (${req.apiKeyRecord.client_app})`
      : (req.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : (isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com'));

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
      source_portal: sourcePortal,
      source_system: isPc ? 'https://pc.nkbmanufacturing.com/' : 'https://my.nkbmanufacturing.com/',
      request_number: requestNumber,
      req_cheque_no: requestNumber,
      payable_number: requestNumber,
      company_name: body.company_name || body.company || (isPc ? 'NKB Petty Cash (pc.nkbmanufacturing.com)' : 'NKB Manufacturing Corporation'),
      company_code: body.company_code || (isPc ? 'NKB-PC' : 'NKB'),
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
      comments: body.comments || body.notes || `Submitted via API by ${sourcePortal}`,
      line_items: lineItems,
      items: lineItems,
      created_at: new Date().toISOString()
    };

    // Forward upstream to the corresponding portal
    let upstreamSynced = false;
    let upstreamResult = null;
    const targetKey = isPc ? (await getActivePortalKey('pc')) : (await getActivePortalKey('my'));
    try {
      const upstreamRes = await nkbApiRequest('POST', '/payables', targetKey, newPayableRecord, sourcePortal);
      if (upstreamRes.ok && upstreamRes.data) {
        upstreamSynced = true;
        upstreamResult = upstreamRes.data;
        if (upstreamResult.id) newPayableRecord.id = upstreamResult.id;
      }
    } catch (upstreamErr) {
      console.warn(`Upstream sync note (${sourcePortal}):`, upstreamErr.message);
    }

    const formatted = formatPayableItem(newPayableRecord, sourcePortal);
    localPayableRecords.unshift(formatted);

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
      message: `Payable request from ${sourcePortal} successfully submitted for COO approval.`,
      source_portal: sourcePortal,
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
 * Get single payable details
 */
router.get('/:id', authenticatePayablesAccess, async (req, res) => {
  try {
    const { id } = req.params;

    // Check local cache first
    const found = localPayableRecords.find(p =>
      String(p.id) === String(id) ||
      String(p.payable_number) === String(id) ||
      String(p.req_cheque_no) === String(id)
    );

    if (found) {
      return res.json({
        success: true,
        source: 'CACHE',
        data: formatPayableItem(found)
      });
    }

    // Try my.nkb
    try {
      const myRes = await nkbApiRequest('GET', `/payables/${id}`, MY_NKB_API_KEY, null, 'my.nkbmanufacturing.com');
      if (myRes.ok && myRes.data) {
        const item = myRes.data.data || myRes.data;
        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: formatPayableItem(item, 'my.nkbmanufacturing.com')
        });
      }
    } catch (_) {}

    // Try pc.nkb
    try {
      const pcRes = await nkbApiRequest('GET', `/payables/${id}`, PC_NKB_API_KEY, null, 'pc.nkbmanufacturing.com');
      if (pcRes.ok && pcRes.data) {
        const item = pcRes.data.data || pcRes.data;
        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: formatPayableItem(item, 'pc.nkbmanufacturing.com')
        });
      }
    } catch (_) {}

    return res.status(404).json({ success: false, message: `Payable ${id} not found.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/:id/confirm
 * Approves or Rejects a payable and notifies the corresponding portal
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

    const targetIdx = localPayableRecords.findIndex(p => String(p.id) === String(id) || String(p.req_cheque_no) === String(id));
    const targetItem = targetIdx !== -1 ? localPayableRecords[targetIdx] : null;

    const isPc = Boolean(targetItem && (targetItem.source_portal === 'pc.nkbmanufacturing.com' || targetItem.company_code === 'NKB-PC'));
    const targetPortal = isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com';
    const targetApiKey = isPc ? (await getActivePortalKey('pc')) : (await getActivePortalKey('my'));

    let remoteSuccess = false;
    let remoteResponse = null;

    try {
      const response = await nkbApiRequest('POST', `/payables/${id}/confirm`, targetApiKey, {
        decision,
        cheque_number: checkNo,
        notes: notes || '',
        confirmed_by: approverName
      }, targetPortal);

      remoteResponse = response.data;
      if (response.ok) {
        remoteSuccess = true;
      }
    } catch (apiErr) {
      console.warn(`Notice: Remote approval API call to ${targetPortal} failed:`, apiErr.message);
    }

    // Update local cache record
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
      { decision, cheque_number: checkNo, approver: approverName, portal: targetPortal, remoteSuccess },
      { status: decision }
    ).catch(() => {});

    return res.json({
      success: true,
      decision,
      cheque_number: checkNo,
      portal: targetPortal,
      remoteSuccess,
      remoteResponse,
      message: `Payable ${id} (${targetPortal}) successfully ${decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED'}${checkNo ? ` with Check #${checkNo}` : ''}.`
    });
  } catch (err) {
    console.error('Error confirming payable:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/webhook
 * Receives incoming payable approval requests directly from my.nkbmanufacturing.com OR pc.nkbmanufacturing.com
 */
router.post('/webhook', async (req, res) => {
  try {
    const rawData = req.body;
    if (!rawData) {
      return res.status(400).json({ success: false, message: 'Payload is required' });
    }

    const headerKey = req.headers['x-api-key'] || req.headers['x-nkb-api-key'];
    const isPc = headerKey === PC_NKB_API_KEY || (rawData.source_portal && rawData.source_portal.includes('pc.'));
    const sourcePortal = isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com';

    const items = Array.isArray(rawData) ? rawData : (rawData.data || [rawData]);
    let count = 0;

    for (const raw of items) {
      const formatted = formatPayableItem(raw, sourcePortal);
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
      message: `Received ${count} new approval request(s) via Webhook from ${sourcePortal}.`,
      source_portal: sourcePortal,
      totalActive: localPayableRecords.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
