import { express } from '../cjsRequire.js';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

const NKB_API_BASE_URL = process.env.NKB_API_BASE_URL || 'http://my.nkbmanufacturing.com/api/v1';

// Seeded fallback payables matching exact Accounting System screenshot
const DEFAULT_PAYABLES = [
  {
    id: 'PB-2127',
    payable_number: 'PB-2127',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1975',
    checked_by: '',
    invoice_number: '239664',
    invoice_date: '09/22/2026',
    date: '09/22/2026',
    due_date: '09/22/2026',
    category: 'Accrued expenses',
    vendor: 'BDO LIFE INC',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'INSURANCE',
    created_by: 'Sharmaine Santos',
    date_created: '09/22/2026',
    total: 100000.00,
    amount_due: 100000.00,
    subtotal: 100000.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'NKB MANUFACTURING CORPORATION\nCHECK DETAILS\nCheck Date: 09/22/2026',
    files: ['Invoice_239664.pdf', 'BDO_Life_Premium_Billing.pdf'],
    items: [
      {
        description: 'INSURANCE PAYMENT - MONEY 8',
        expense_category: 'Insurance - Personal',
        quantity: 1.00,
        cost: 100000.00,
        subtotal: 100000.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 100000.00,
      }
    ]
  },
  {
    id: 'PB-2126',
    payable_number: 'PB-2126',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1974',
    checked_by: '',
    invoice_number: '239662',
    invoice_date: '09/22/2026',
    date: '09/22/2026',
    due_date: '09/22/2026',
    category: 'Office & Admin Expenses',
    vendor: 'PETTY CASH CUSTODIAN',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'PETTY CASH',
    created_by: 'Sharmaine Santos',
    date_created: '09/22/2026',
    total: 100000.00,
    amount_due: 100000.00,
    subtotal: 100000.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'REPLENISHMENT OF PETTY CASH REVOLVING FUND',
    files: ['Petty_Cash_Voucher_1974.pdf'],
    items: [
      {
        description: 'PETTY CASH REPLENISHMENT',
        expense_category: 'Office Supplies & Miscellaneous',
        quantity: 1.00,
        cost: 100000.00,
        subtotal: 100000.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 100000.00,
      }
    ]
  },
  {
    id: 'PB-2125',
    payable_number: 'PB-2125',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1973',
    checked_by: '',
    invoice_number: '239663',
    invoice_date: '09/22/2026',
    date: '09/22/2026',
    due_date: '09/22/2026',
    category: 'Finance Costs',
    vendor: 'INVESTMENT HOLDINGS',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'INVESTMENT PAYOUT',
    created_by: 'Sharmaine Santos',
    date_created: '09/22/2026',
    total: 45000.00,
    amount_due: 45000.00,
    subtotal: 45000.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'SCHEDULED MONTHLY INVESTMENT DIVIDEND PAYOUT',
    files: ['Investment_Statement_1973.pdf'],
    items: [
      {
        description: 'MONTHLY DIVIDEND DISTRIBUTION',
        expense_category: 'Investment Return',
        quantity: 1.00,
        cost: 45000.00,
        subtotal: 45000.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 45000.00,
      }
    ]
  },
  {
    id: 'PB-2118',
    payable_number: 'PB-2118',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1966',
    checked_by: '',
    invoice_number: '239607-2396027',
    invoice_date: '09/19/2026',
    date: '09/19/2026',
    due_date: '10/19/2026',
    category: 'Direct Cost of Sales',
    vendor: 'CHEMSOURCE ASIA CORP',
    term: 'Net 30 Days',
    status: 'Submitted For Approval',
    description: 'RAW MATERIALS',
    created_by: 'Reynold Reyes',
    date_created: '09/19/2026',
    total: 3381090.00,
    amount_due: 3381090.00,
    subtotal: 3381090.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'PURCHASE OF COSMETIC CHEMICAL BASES AND SURFACTANTS',
    files: ['SI_239607_Commercial_Invoice.pdf', 'Delivery_Receipt_DR9812.pdf'],
    items: [
      {
        description: 'BULK SODIUM LAURETH SULFATE (SLES 70%) & COCO BETAINE',
        expense_category: 'Raw Materials - Production',
        quantity: 1.00,
        cost: 3381090.00,
        subtotal: 3381090.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 3381090.00,
      }
    ]
  },
  {
    id: 'PB-2116',
    payable_number: 'PB-2116',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1964',
    checked_by: '',
    invoice_number: '239606',
    invoice_date: '09/18/2026',
    date: '09/18/2026',
    due_date: '09/18/2026',
    category: 'Direct Cost of Sales',
    vendor: 'FRAGRANCE WORLD PH',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'RAW MATERIALS',
    created_by: 'Reynold Reyes',
    date_created: '09/18/2026',
    total: 22066.00,
    amount_due: 22066.00,
    subtotal: 22066.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'ESSENTIAL OILS & SPECIALTY PERFUME FRAGRANCES',
    files: ['Invoice_239606.pdf'],
    items: [
      {
        description: 'PERFUME OIL ESSENCES LOT 2026-A',
        expense_category: 'Raw Materials - Fragrance',
        quantity: 1.00,
        cost: 22066.00,
        subtotal: 22066.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 22066.00,
      }
    ]
  },
  {
    id: 'PB-2101',
    payable_number: 'PB-2101',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1950',
    checked_by: '',
    invoice_number: '235375',
    invoice_date: '09/16/2026',
    date: '09/16/2026',
    due_date: '09/16/2026',
    category: 'Banking & Operational Reserves',
    vendor: 'METROBANK CORP',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'OPENING OF ACCOUNT',
    created_by: 'Sharmaine Santos',
    date_created: '09/16/2026',
    total: 100000.00,
    amount_due: 100000.00,
    subtotal: 100000.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'NEW PAYROLL ACCOUNT INITIAL DEPOSIT',
    files: [],
    items: [
      {
        description: 'ACCOUNT OPENING MINIMUM BALANCE',
        expense_category: 'Bank Deposit',
        quantity: 1.00,
        cost: 100000.00,
        subtotal: 100000.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 100000.00,
      }
    ]
  },
  {
    id: 'PB-2099',
    payable_number: 'PB-2099',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1948',
    checked_by: '',
    invoice_number: '511733',
    invoice_date: '09/16/2026',
    date: '09/16/2026',
    due_date: '09/16/2026',
    category: 'Inter-Company Funding',
    vendor: 'INTER-ENTITY FUNDING',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'TRANSFER OF FUNDS',
    created_by: 'Sharmaine Santos',
    date_created: '09/16/2026',
    total: 49800.00,
    amount_due: 49800.00,
    subtotal: 49800.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'OPERATIONAL WORKING CAPITAL ADVANCE',
    files: [],
    items: [
      {
        description: 'FUND TRANSFER ALLOCATION',
        expense_category: 'Working Capital',
        quantity: 1.00,
        cost: 49800.00,
        subtotal: 49800.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 49800.00,
      }
    ]
  },
  {
    id: 'PB-2095',
    payable_number: 'PB-2095',
    company: 'Valenzuela Oil Products Corp',
    company_code: 'VOPC',
    control_number: '1011',
    checked_by: '',
    invoice_number: '242141',
    invoice_date: '09/15/2026',
    date: '09/15/2026',
    due_date: '09/15/2026',
    category: 'Commercial Contracts',
    vendor: 'EQUIPMENT SERVICES INC',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'PAYMENT',
    created_by: 'Mark Anthony D.',
    date_created: '09/15/2026',
    total: 100000.00,
    amount_due: 100000.00,
    subtotal: 100000.00,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'MONTHLY PREVENTIVE MAINTENANCE BILLING',
    files: [],
    items: [
      {
        description: 'PREVENTIVE MAINTENANCE PAYMENT',
        expense_category: 'Machinery Maintenance',
        quantity: 1.00,
        cost: 100000.00,
        subtotal: 100000.00,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 100000.00,
      }
    ]
  },
  {
    id: 'PB-2094',
    payable_number: 'PB-2094',
    company: 'Valenzuela Oil Products Corp',
    company_code: 'VOPC',
    control_number: '1010',
    checked_by: '',
    invoice_number: '242147',
    invoice_date: '09/15/2026',
    date: '09/15/2026',
    due_date: '09/15/2026',
    category: 'Cooperative Benefits',
    vendor: 'NKB EMPLOYEES COOPERATIVE',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'COOP TRANSFER OF FUNDS',
    created_by: 'Mark Anthony D.',
    date_created: '09/15/2026',
    total: 30189.49,
    amount_due: 30189.49,
    subtotal: 30189.49,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'EMPLOYEES LOAN DEDUCTION REMITTANCE',
    files: [],
    items: [
      {
        description: 'COOP REMITTANCE LOANS & SAVINGS',
        expense_category: 'Employee Benefits',
        quantity: 1.00,
        cost: 30189.49,
        subtotal: 30189.49,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 30189.49,
      }
    ]
  },
  {
    id: 'PB-2093',
    payable_number: 'PB-2093',
    company: 'NKB Manufacturing Corporation',
    company_code: 'NKB',
    control_number: '1946',
    checked_by: '',
    invoice_number: '235370',
    invoice_date: '09/15/2026',
    date: '09/15/2026',
    due_date: '09/15/2026',
    category: 'Cooperative Benefits',
    vendor: 'NKB EMPLOYEES COOPERATIVE',
    term: 'Due on Receipt',
    status: 'Submitted For Approval',
    description: 'COOP TRANSFER OF FUNDS',
    created_by: 'Sharmaine Santos',
    date_created: '09/15/2026',
    total: 321366.58,
    amount_due: 321366.58,
    subtotal: 321366.58,
    vat: 0.00,
    vat_zero_rated: 0.00,
    non_vat: 0.00,
    withheld: 0.00,
    cheque_number: '',
    comments: 'EMPLOYEES SAVINGS & CAPITAL CONTRIBUTION REMITTANCE',
    files: [],
    items: [
      {
        description: 'MONTHLY COOPERATIVE REMITTANCE',
        expense_category: 'Employee Benefits',
        quantity: 1.00,
        cost: 321366.58,
        subtotal: 321366.58,
        inclusive: false,
        vat: 0.00,
        vat_zero_rated: 0.00,
        non_vat: 0.00,
        withheld: 0.00,
        total: 321366.58,
      }
    ]
  }
];

// In-memory or database tracking of approvals & check numbers
let localPayableRecords = [...DEFAULT_PAYABLES];

// Helper to fetch active NKB API Key
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

  return null;
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
      ? apiKey.slice(0, 8) + '...' + apiKey.slice(-4)
      : null;

    let apiOnline = false;
    let apiMessage = 'No API key configured';

    if (hasKey) {
      try {
        const pingRes = await fetch(`${NKB_API_BASE_URL}/ping`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (pingRes.ok) {
          apiOnline = true;
          apiMessage = 'Connected to NKB Developer REST API';
        } else {
          const errData = await pingRes.json().catch(() => ({}));
          apiMessage = errData.message || `API returned HTTP ${pingRes.status}`;
        }
      } catch (netErr) {
        apiMessage = `Cannot reach NKB API: ${netErr.message}`;
      }
    }

    return res.json({
      success: true,
      hasKey,
      maskedKey,
      apiUrl: NKB_API_BASE_URL,
      apiOnline,
      apiMessage
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
 * GET /api/v1/payables
 * List cheque payables
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const apiKey = await getNkbApiKey(req);
    const { status, category, bank, date_from, date_to, search } = req.query;

    if (apiKey) {
      try {
        const queryParams = new URLSearchParams();
        if (status) queryParams.set('status', status);
        if (category) queryParams.set('category', category);
        if (bank) queryParams.set('bank', bank);
        if (date_from) queryParams.set('date_from', date_from);
        if (date_to) queryParams.set('date_to', date_to);

        const url = `${NKB_API_BASE_URL}/payables${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const extRes = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(8000)
        });

        if (extRes.ok) {
          const extData = await extRes.json();
          const items = Array.isArray(extData) ? extData : (extData.data || extData.payables || []);
          return res.json({
            success: true,
            source: 'REMOTE_API',
            data: items,
            totalCount: extData.total || items.length
          });
        }
      } catch (err) {
        console.warn('Notice: Remote payables API fetch failed, falling back to local dataset:', err.message);
      }
    }

    // Local / fallback dataset
    let results = [...localPayableRecords];

    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      results = results.filter(p => (p.status || '').toUpperCase().includes(s));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(p =>
        (p.payable_number || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.company_code || '').toLowerCase().includes(q) ||
        (p.control_number || '').toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.vendor || '').toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      source: 'LOCAL_DATASET',
      data: results,
      totalCount: results.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/v1/payables/:id
 * Get single payable details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const apiKey = await getNkbApiKey(req);

    if (apiKey) {
      try {
        const extRes = await fetch(`${NKB_API_BASE_URL}/payables/${id}`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (extRes.ok) {
          const extData = await extRes.json();
          return res.json({
            success: true,
            source: 'REMOTE_API',
            data: extData.data || extData
          });
        }
      } catch (_) {}
    }

    const found = localPayableRecords.find(p => String(p.id) === String(id) || String(p.payable_number) === String(id));
    if (!found) {
      return res.status(404).json({ success: false, message: `Payable ${id} not found.` });
    }

    return res.json({
      success: true,
      source: 'LOCAL_DATASET',
      data: found
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/v1/payables/:id/confirm
 * Approves or Rejects a payable
 * Request Body: { decision: 'CONFIRMED' | 'REJECTED', cheque_number: string, notes: string, confirmed_by: string }
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

    if (apiKey) {
      try {
        const extRes = await fetch(`${NKB_API_BASE_URL}/payables/${id}/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            decision,
            cheque_number: checkNo,
            notes: notes || '',
            confirmed_by: approverName
          }),
          signal: AbortSignal.timeout(10000)
        });

        remoteResponse = await extRes.json().catch(() => ({}));
        if (extRes.ok) {
          remoteSuccess = true;
        } else {
          console.warn('Remote approval API returned non-200:', remoteResponse);
        }
      } catch (apiErr) {
        console.warn('Notice: Remote approval API call failed, recording locally:', apiErr.message);
      }
    }

    // Update local record state
    const targetIdx = localPayableRecords.findIndex(p => String(p.id) === String(id) || String(p.payable_number) === String(id));
    if (targetIdx !== -1) {
      localPayableRecords[targetIdx] = {
        ...localPayableRecords[targetIdx],
        status: decision === 'CONFIRMED' ? 'Approved' : 'Rejected',
        cheque_number: checkNo,
        checked_by: approverName,
        comments: `${localPayableRecords[targetIdx].comments || ''}\n[${new Date().toLocaleString()}] ${decision} by ${approverName}. Check #: ${checkNo || 'N/A'}. Notes: ${notes || 'None'}`.trim(),
        confirmed_at: new Date().toISOString()
      };
    }

    // Log to system audit trail
    await logAudit(
      req,
      'PAYABLE_APPROVAL',
      'payables',
      id,
      { decision, cheque_number: checkNo, approver: approverName, remoteSuccess },
      { status: decision === 'CONFIRMED' ? 'Approved' : 'Rejected' }
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

export default router;
