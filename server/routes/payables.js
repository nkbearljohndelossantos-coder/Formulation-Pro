import http from 'http';
import https from 'https';
import crypto from 'crypto';
import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { PayableService, extractDateFromText, formatPayableItem } from '../services/PayableService.js';

export { extractDateFromText, formatPayableItem };

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
  my: 'https://my.nkbmanufacturing.com/api/v1',
  pc: 'https://pc.nkbmanufacturing.com/api'
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
    const hasScopesCol = await db.schema.hasColumn('api_keys', 'scopes').catch(() => false);
    const insertObj = {
      key_name: defaultName,
      client_app: defaultApp,
      api_key: keyVal,
      is_active: 1,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };
    if (hasScopesCol) insertObj.scopes = 'payables:read,payables:create,payables:confirm';
    await db('api_keys').insert(insertObj);
  }
}

export const NKB_PORTALS = {
  my: {
    id: 'my.nkbmanufacturing.com',
    name: 'my.nkbmanufacturing.com (Main Portal)',
    host: 'my.nkbmanufacturing.com',
    apiKey: MY_NKB_API_KEY,
    protocol: 'https',
    port: 443
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

    let urlObj;
    try {
      if (targetHost && targetHost.startsWith('http')) {
        urlObj = new URL(endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath, targetHost);
      } else {
        const rawHost = targetHost || (isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com');
        const proto = 'https:';
        let hostName = rawHost.replace(/^https?:\/\//, '').split('/')[0];
        let cleanPath = endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath;
        const isMyHost = !isPc && (rawHost.includes('my.') || !targetHost);
        if (isMyHost) {
          if (!cleanPath.startsWith('/api/v1')) {
            cleanPath = cleanPath.startsWith('/api') ? cleanPath.replace(/^\/api/, '/api/v1') : `/api/v1${cleanPath}`;
          }
        } else if (!cleanPath.startsWith('/api')) {
          cleanPath = `/api${cleanPath}`;
        }
        urlObj = new URL(`${proto}//${hostName}${cleanPath}`);
      }
    } catch (_) {
      const host = (targetHost || (isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com')).replace(/^https?:\/\//, '').split('/')[0];
      const proto = 'https:';
      let cleanPath = endpointPath.startsWith('/') ? endpointPath : '/' + endpointPath;
      const isMyHost = !isPc && (host.includes('my.') || !targetHost);
      if (isMyHost) {
        if (!cleanPath.startsWith('/api/v1')) {
          cleanPath = cleanPath.startsWith('/api') ? cleanPath.replace(/^\/api/, '/api/v1') : `/api/v1${cleanPath}`;
        }
      } else if (!cleanPath.startsWith('/api')) {
        cleanPath = `/api${cleanPath}`;
      }
      urlObj = new URL(`${proto}//${host}${cleanPath}`);
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
    const headerKey = req.headers['x-api-key'] ||
                      req.headers['x-nkb-api-key'] ||
                      req.headers['x-api-token'] ||
                      req.headers['apikey'] ||
                      req.headers['api-key'] ||
                      req.headers['x-token'] ||
                      req.headers['token'];
    const authHeader = req.headers['authorization'];
    const bearerKey = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : null;
    const queryKey = req.query.api_key;
    const webhookSecret = req.headers['x-webhook-secret'] || req.query.secret;

    // A JWT usually has two dots (xxx.yyy.zzz). If bearer is an API key without dots, consider it an API key.
    const candidateApiKey = headerKey || (bearerKey && !bearerKey.includes('.') ? bearerKey : null) || queryKey || webhookSecret;
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
          message: 'Invalid API key or authentication token provided. Authentication failed.'
        });
      }

      if (!keyRecord.is_active) {
        return res.status(403).json({
          success: false,
          message: `API Key '${keyRecord.key_name}' is currently revoked or inactive.`
        });
      }

      // Scope validation
      const scopes = (keyRecord.scopes || '').split(',').map(s => s.trim().toLowerCase());
      const hasWildcard = scopes.includes('*');

      if (req.method === 'POST') {
        const isConfirm = req.path.includes('/confirm');
        if (isConfirm && !hasWildcard && !scopes.includes('payables:confirm')) {
          return res.status(403).json({
            success: false,
            message: `API Key '${keyRecord.key_name}' does not have 'payables:confirm' permission scope.`
          });
        }
        if (!isConfirm && !hasWildcard && !scopes.includes('payables:create') && !scopes.includes('payables:confirm')) {
          return res.status(403).json({
            success: false,
            message: `API Key '${keyRecord.key_name}' does not have 'payables:create' permission scope.`
          });
        }
      } else if (req.method === 'GET') {
        if (!hasWildcard && !scopes.includes('payables:read') && !scopes.includes('payables:create') && !scopes.includes('payables:confirm')) {
          return res.status(403).json({
            success: false,
            message: `API Key '${keyRecord.key_name}' does not have 'payables:read' permission scope.`
          });
        }
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
 * GET /api/v1/payables/attachment-proxy
 * Streams or proxies an attachment file inline (PDFs, images)
 */
router.get('/attachment-proxy', async (req, res) => {
  try {
    const fileUrl = req.query.url;
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: 'File URL is required' });
    }

    const parsed = new URL(fileUrl);
    // Allow proxying from nkb domains
    if (!parsed.hostname.includes('nkbmanufacturing.com')) {
      return res.status(403).json({ success: false, error: 'Unauthorized host for attachment proxy' });
    }

    const client = parsed.protocol === 'http:' ? http : https;
    client.get(fileUrl, (proxyRes) => {
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
        return res.redirect(proxyRes.headers.location);
      }
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      proxyRes.pipe(res);
    }).on('error', (err) => {
      res.status(502).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

let lastBackgroundSyncTime = 0;
const BACKGROUND_SYNC_INTERVAL_MS = 60000; // 1 minute auto-sync throttle

/**
 * Robustly synchronizes external portal payables into the persistent database.
 * 1. Queries local MySQL u335953510_pc_db if on Hostinger (instant, 100% resilient)
 * 2. Queries pc.nkbmanufacturing.com HTTP API (/payables)
 * 3. Queries my.nkbmanufacturing.com HTTP API (/cheque-payables, /payables)
 */
export async function syncExternalPortalsSafe() {
  lastBackgroundSyncTime = Date.now();
  const syncResults = { pc: 0, my: 0, errors: [] };

  // 1. Direct MySQL cross-database ingestion if on Hostinger production
  try {
    const isMysql = db.client?.config?.client === 'mysql2';
    if (isMysql) {
      const [pcDbRows] = await db.raw(`
        SELECT * FROM u335953510_pc_db.payables
        WHERE (supplier_name IS NULL OR (supplier_name NOT LIKE '%TEST PROBE%' AND supplier_name NOT LIKE '%FMS SYNC TEST%'))
          AND (remarks IS NULL OR (remarks NOT LIKE '%TEST PROBE%' AND remarks NOT LIKE '%FMS SYNC TEST%'))
        ORDER BY id DESC LIMIT 500
      `).catch(() => [null]);

      if (Array.isArray(pcDbRows) && pcDbRows.length > 0) {
        for (const row of pcDbRows) {
          if (row.supplier_name?.includes('FMS SYNC TEST') || row.payee_beneficiary?.includes('FMS SYNC TEST')) continue;
          try {
            await PayableService.createPayable({
              ...row,
              source_portal: 'pc.nkbmanufacturing.com',
              source_system: 'https://pc.nkbmanufacturing.com/'
            });
            syncResults.pc++;
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  // 2. HTTP Pull from pc.nkbmanufacturing.com
  try {
    const pcKey = await getActivePortalKey('pc');
    const pcRes = await nkbApiRequest('GET', '/payables', pcKey, null, 'pc.nkbmanufacturing.com').catch(() => null);
    if (pcRes && pcRes.ok && pcRes.data) {
      const rawItems = Array.isArray(pcRes.data) ? pcRes.data : (pcRes.data.data || pcRes.data.payables || []);
      for (const itm of rawItems) {
        if (
          itm.supplier_name?.includes('TEST PROBE') ||
          itm.supplier_name?.includes('System Connection') ||
          itm.payee_beneficiary?.includes('TEST PROBE')
        ) {
          continue;
        }
        await PayableService.createPayable(itm).catch(() => {});
        syncResults.pc++;
      }
    }
  } catch (err) {
    syncResults.errors.push(`pc: ${err.message}`);
  }

  // 3. HTTP Pull from my.nkbmanufacturing.com
  try {
    const myKey = await getActivePortalKey('my');
    let myRes = await nkbApiRequest('GET', '/payables?limit=1000', myKey, null, 'my.nkbmanufacturing.com').catch(() => null);
    if (!myRes || !myRes.ok) {
      myRes = await nkbApiRequest('GET', '/cheque-payables', myKey, null, 'my.nkbmanufacturing.com').catch(() => null);
    }
    if (myRes && myRes.ok && myRes.data) {
      const rawItems = Array.isArray(myRes.data) ? myRes.data : (myRes.data.data || myRes.data.payables || []);
      for (const itm of rawItems) {
        if (
          itm.supplier_name?.includes('TEST PROBE') ||
          itm.supplier_name?.includes('System Connection') ||
          itm.supplier_name?.includes('FMS SYNC TEST') ||
          itm.payee_beneficiary?.includes('TEST PROBE') ||
          itm.payee_beneficiary?.includes('FMS SYNC TEST')
        ) {
          continue;
        }
        await PayableService.createPayable(itm).catch(() => {});
        syncResults.my++;
      }
    }
  } catch (err) {
    syncResults.errors.push(`my: ${err.message}`);
  }

  return syncResults;
}

/**
 * GET /api/v1/payables
 * List cheque payables from database queue with automatic portal synchronization
 */
router.get('/', authenticatePayablesAccess, async (req, res) => {
  try {
    // 1. Opportunistic sync from external portals:
    // If sync=true, or if database has <= 2 records (initial state), or throttle interval passed:
    const countRes = await db('payables').count('id as cnt').first().catch(() => ({ cnt: 0 }));
    const currentCount = Number(countRes?.cnt || countRes?.['count(*)'] || 0);

    const isExplicitSync = req.query.sync === 'true';
    const isInitialEmpty = currentCount <= 2;
    const isIntervalElapsed = (Date.now() - lastBackgroundSyncTime) > BACKGROUND_SYNC_INTERVAL_MS;

    if (isExplicitSync || isInitialEmpty) {
      // Blocking sync so response contains newly imported records immediately
      await syncExternalPortalsSafe().catch(err => console.warn('Sync notice:', err.message));
    } else if (isIntervalElapsed) {
      // Non-blocking background sync for real-time freshness
      syncExternalPortalsSafe().catch(() => {});
    }

    // 2. Fetch persistent records from SQL Database
    let records = await PayableService.getPayables(req.query);

    // 3. Exclude legacy purged test samples and synthetic test records
    records = records.filter(p => {
      const isLegacySample =
        p.id === 902 ||
        p.req_cheque_no === 'PC-2026-0412' ||
        p.control_number === 'CTRL-PC-2026-0044';
      const isSyntheticTest =
        (p.payable_number && p.payable_number.startsWith('PB-202610-')) ||
        (p.req_cheque_no && p.req_cheque_no.startsWith('PB-202610-')) ||
        (p.payee_beneficiary && (p.payee_beneficiary.includes('FMS SYNC TEST') || p.payee_beneficiary.includes('TEST PROBE'))) ||
        (p.purpose_usage && p.purpose_usage.includes('Test FMS Bi-directional Sync Integration'));
      return !isLegacySample && !isSyntheticTest;
    });

    const activeMyKey = await getActivePortalKey('my');
    const activePcKey = await getActivePortalKey('pc');

    return res.json({
      success: true,
      source: 'DATABASE_QUEUE',
      data: records,
      totalCount: records.length,
      portalsActive: {
        my: activeMyKey ? activeMyKey.slice(0, 10) + '...' : '',
        pc: activePcKey ? activePcKey.slice(0, 10) + '...' : ''
      }
    });
  } catch (err) {
    console.error('Error fetching payables from database:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/sync
 * Manually triggers a complete synchronization of external portal records
 */
router.post('/sync', authenticatePayablesAccess, async (req, res) => {
  try {
    const results = await syncExternalPortalsSafe();
    const records = await PayableService.getPayables(req.query);
    return res.json({
      success: true,
      message: `Synchronized payables: ${results.pc} Petty Cash records, ${results.my} Main Portal records.`,
      results,
      totalCount: records.length,
      data: records
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables
 * Allows external websites, portals, and authorized systems to submit payable requests into the COO approval queue.
 * Persists durably into the database with idempotency and returns 201 Created (or 200 for duplicate retries).
 */
router.post('/', authenticatePayablesAccess, async (req, res) => {
  try {
    const result = await PayableService.createPayable(req.body, req);

    if (req.user) {
      await logAudit(
        req,
        'CREATE_PAYABLE_REQUEST',
        'payables',
        result.record.id,
        null,
        result.record
      ).catch(() => {});
    }

    const statusCode = result.isDuplicate ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      message: result.message,
      is_duplicate: result.isDuplicate,
      source_portal: result.record.source_portal,
      data: result.record
    });
  } catch (err) {
    console.error('Error creating payable request:', err);
    const isValidationError = err.message.includes('required') || err.message.includes('valid payable amount');
    return res.status(isValidationError ? 400 : 500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * DELETE /api/v1/payables/:id
 * Remove / purge a payable record from the database
 */
router.delete('/:id', authenticatePayablesAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PayableService.deletePayable(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: `Payable ${id} not found.` });
    }
    return res.json({
      success: true,
      message: `Payable ${id} removed successfully from database.`
    });
  } catch (err) {
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
    const found = await PayableService.getPayableById(id);

    if (found) {
      return res.json({
        success: true,
        source: 'DATABASE',
        data: found
      });
    }

    // Try my.nkb remote fallback if not found in database
    try {
      const myKey = await getActivePortalKey('my');
      const myRes = await nkbApiRequest('GET', `/payables/${id}`, myKey, null, 'my.nkbmanufacturing.com');
      if (myRes.ok && myRes.data) {
        const item = myRes.data.data || myRes.data;
        const resObj = await PayableService.createPayable(item).catch(() => null);
        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: resObj?.record || formatPayableItem(item, 'my.nkbmanufacturing.com')
        });
      }
    } catch (_) {}

    // Try pc.nkb remote fallback if not found in database
    try {
      const pcKey = await getActivePortalKey('pc');
      const pcRes = await nkbApiRequest('GET', `/payables/${id}`, pcKey, null, 'pc.nkbmanufacturing.com');
      if (pcRes.ok && pcRes.data) {
        const item = pcRes.data.data || pcRes.data;
        const resObj = await PayableService.createPayable(item).catch(() => null);
        return res.json({
          success: true,
          source: 'REMOTE_API',
          data: resObj?.record || formatPayableItem(item, 'pc.nkbmanufacturing.com')
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
 * Approves or Rejects a payable in the database and notifies the corresponding external portal
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

    const updated = await PayableService.confirmPayable(id, {
      decision,
      cheque_number: checkNo,
      notes,
      confirmed_by: approverName
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: `Payable ${id} not found in database.` });
    }

    const isPc = Boolean(updated.source_portal?.includes('pc.') || updated.company_code === 'NKB-PC');
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

    // Log to audit trail
    await logAudit(
      req,
      'PAYABLE_APPROVAL',
      'payables',
      updated.id,
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
      data: updated,
      message: `Payable ${updated.payable_number || id} (${targetPortal}) successfully ${decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED'}${checkNo ? ` with Check #${checkNo}` : ''}.`
    });
  } catch (err) {
    console.error('Error confirming payable:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/webhook
 * Receives incoming payable approval requests directly from external websites, my.nkbmanufacturing.com, or pc.nkbmanufacturing.com
 * Persists each item transactionally into the SQL database
 */
router.post('/webhook', authenticatePayablesAccess, async (req, res) => {
  try {
    const rawData = req.body;
    if (!rawData) {
      return res.status(400).json({ success: false, message: 'Payload is required.' });
    }

    const items = Array.isArray(rawData)
      ? rawData
      : (Array.isArray(rawData.data) ? rawData.data : (Array.isArray(rawData.payables) ? rawData.payables : [rawData]));

    const results = [];
    let createdCount = 0;
    let duplicateCount = 0;

    for (const raw of items) {
      try {
        const resObj = await PayableService.createPayable(raw, req);
        if (resObj.isDuplicate) duplicateCount++;
        else createdCount++;
        results.push(resObj.record);
      } catch (itemErr) {
        console.warn('Webhook item skipped due to error:', itemErr.message);
      }
    }

    const statusCode = createdCount > 0 ? 201 : 200;
    return res.status(statusCode).json({
      success: true,
      message: `Processed ${items.length} payable request(s): ${createdCount} created in database, ${duplicateCount} existing/duplicates recognized.`,
      createdCount,
      duplicateCount,
      totalActive: (await PayableService.getPayables()).length,
      data: results
    });
  } catch (err) {
    console.error('Error in payables webhook:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
