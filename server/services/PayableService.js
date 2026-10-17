import db from '../db.js';

/**
 * Extracts normalized YYYY-MM-DD date from text / description (e.g., '10/8/2026', 'OCTOBER 1, 2026', '2026-10-09')
 */
export function extractDateFromText(text) {
  if (!text || typeof text !== 'string') return null;
  // 1. YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  // 2. MM/DD/YYYY or M/D/YYYY
  const slashMatch = text.match(/\b(0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])[-/.](20\d{2})\b/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[1].padStart(2, '0')}-${slashMatch[2].padStart(2, '0')}`;
  // 3. Month Name DD, YYYY
  const monthNames = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
  const namedMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+([0-2]?\d|3[01])(?:st|nd|rd|th)?,?\s+(20\d{2})\b/i);
  if (namedMatch) {
    const m = monthNames[namedMatch[1].toLowerCase().slice(0, 3)] || '01';
    return `${namedMatch[3]}-${m}-${namedMatch[2].padStart(2, '0')}`;
  }
  return null;
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
    (p.comments && (p.comments.includes('pc.nkbmanufacturing.com') || p.comments.toLowerCase().includes('petty cash'))) ||
    (p.remarks && p.remarks.toLowerCase().includes('petty cash')) ||
    (p.requested_by_name && (p.requested_by_name.includes('pc.nkbmanufacturing.com') || p.requested_by_name.toLowerCase().includes('petty cash'))) ||
    (p.created_by && p.created_by.toLowerCase().includes('petty'))
  );

  const sourcePortal = isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com';
  const defaultCompany = isPc ? 'NKB Petty Cash (pc.nkbmanufacturing.com)' : 'NKB Manufacturing Corporation';
  const defaultCompanyCode = isPc ? 'NKB-PC' : 'NKB';

  const reqNo = p.requisition_no || p.request_number || p.req_cheque_no || p.cheque_number || p.payable_number || p.req_number || p.control_number || (isPc ? `PC-${p.id}` : `PB-${p.id}`);
  const dateVal = p.cheque_date || p.date || p.date_created || p.invoice_date || (p.created_at ? p.created_at.toString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const payeeVal = p.supplier_name || p.payee_name || p.payee_beneficiary || p.payee || p.beneficiary || p.vendor || p.company_name || p.company || (isPc ? 'Petty Cash Custodian' : 'NKB Entity');
  const categoryVal = p.payable_category || p.category || (p.items && p.items[0]?.expense_category) || (isPc ? 'Petty Cash Replenishment' : 'Accrued expenses');
  const bankVal = p.bank_name || p.bank_account || p.bank || (String(payeeVal).includes('BDO') ? 'BDO: NKB Manufacturing Corporation' : 'BDO - 0080-5801-0547');
  const purposeVal = p.purpose || p.purpose_usage || p.usage || p.description || p.remarks || (p.items && p.items[0]?.description) || (isPc ? 'Petty Cash Disbursement' : 'Disbursement');
  const amountVal = parseFloat(p.gross_amount || p.amount || p.net_amount || p.total || p.amount_due || 0);

  // Attachments: normalize to secure HTTPS and absolute portal URL
  let attachmentVal = p.attachment_url || p.attachment || (p.files && p.files.length ? p.files[0] : null);
  if (attachmentVal && typeof attachmentVal === 'string') {
    if (attachmentVal.startsWith('http://')) {
      attachmentVal = attachmentVal.replace('http://', 'https://');
    } else if (attachmentVal.startsWith('/')) {
      attachmentVal = `https://${sourcePortal}${attachmentVal}`;
    } else if (!attachmentVal.startsWith('https://') && !attachmentVal.startsWith('data:')) {
      attachmentVal = `https://${sourcePortal}/${attachmentVal.replace(/^\/+/, '')}`;
    }
  }

  let filesList = [];
  if (Array.isArray(p.files) && p.files.length > 0) {
    filesList = p.files.map(f => {
      if (typeof f !== 'string') return f;
      if (f.startsWith('http://')) return f.replace('http://', 'https://');
      if (f.startsWith('/')) return `https://${sourcePortal}${f}`;
      if (!f.startsWith('https://')) return `https://${sourcePortal}/${f.replace(/^\/+/, '')}`;
      return f;
    });
  } else if (attachmentVal) {
    filesList = [attachmentVal];
  }

  const rawStatus = (p.status || p.coo_approval || 'PENDING_COO_APPROVAL').toString().trim();
  let approvalVal = rawStatus;
  const upperStatus = rawStatus.toUpperCase();
  if (upperStatus === 'SUBMITTED FOR APPROVAL' || upperStatus === 'PENDING APPROVAL' || upperStatus === 'PENDING' || upperStatus === 'PENDING_COO_APPROVAL') {
    approvalVal = 'PENDING_COO_APPROVAL';
  } else if (upperStatus === 'APPROVED' || upperStatus === 'CONFIRMED' || upperStatus === 'PAID') {
    approvalVal = 'CONFIRMED';
  } else if (upperStatus === 'REJECTED' || upperStatus === 'DISAPPROVED') {
    approvalVal = 'REJECTED';
  }

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

  // Extract Date Cheque Issued from Description, Purpose, Comments, Remarks, or Line Items
  let extractedChequeDate = extractDateFromText(p.description) ||
    extractDateFromText(p.purpose_usage) ||
    extractDateFromText(p.purpose) ||
    extractDateFromText(p.comments) ||
    extractDateFromText(p.remarks);

  // Tag line items with individual extracted dates if present
  for (const itm of itemsList) {
    const lineDate = extractDateFromText(itm.description);
    if (lineDate) {
      itm.date = lineDate;
      itm.date_cheque_issued = lineDate;
      if (!extractedChequeDate) extractedChequeDate = lineDate;
    }
  }

  // Prioritize date found in Description, falling back to cheque_date or date
  const dateChequeIssued = extractedChequeDate || p.date_cheque_issued || p.cheque_date || p.check_date || p.cheque_issued_date || (p.cheque_number ? dateVal : '') || dateVal;
  const datePrepared = p.date_prepared || p.prepared_date || p.date_created || p.created_at || dateVal;

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
    date_cheque_issued: dateChequeIssued,
    date_cheque_issued_from_desc: extractedChequeDate || null,
    date_prepared: datePrepared,
    cheque_date: dateChequeIssued,
    prepared_date: datePrepared,
    cheque_number: p.cheque_number || p.check_number || p.check_no || '',
    prepared_by: p.prepared_by || p.requested_by_name || p.requestor_name || p.created_by || (isPc ? 'pc.nkbmanufacturing.com' : 'my.nkbmanufacturing.com'),
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
    files: filesList,
    status: approvalVal,
    coo_approval: approvalVal,
    created_by: p.requested_by_name || p.requestor_name || p.created_by || (isPc ? 'pc.nkbmanufacturing.com (Petty Cash)' : 'my.nkbmanufacturing.com'),
    term: p.terms || p.term || 'Net 30',
    comments: p.comments || p.coo_notes || '',
    items: itemsList
  };
}

export class PayableService {
  /**
   * Ensures payables and payable_items tables exist and seeds baseline records
   * Works across SQLite (dev) and MySQL (Hostinger production)
   */
  static async ensurePayablesTables() {
    try {
      const hasPayables = await db.schema.hasTable('payables');
      if (!hasPayables) {
        await db.schema.createTable('payables', (table) => {
          table.increments('id').primary();
          table.string('payable_number', 100).notNullable().unique();
          table.string('req_cheque_no', 100).nullable().index();
          table.string('external_reference', 150).nullable().index();
          table.string('idempotency_key', 150).nullable().index();
          table.string('source_portal', 100).defaultTo('my.nkbmanufacturing.com');
          table.string('source_system', 255).nullable();
          table.string('source_badge', 50).defaultTo('my.nkb');
          table.string('company', 255).notNullable();
          table.string('company_code', 50).nullable();
          table.string('payee_beneficiary', 255).notNullable();
          table.string('category', 150).nullable();
          table.string('bank_account', 150).nullable();
          table.text('purpose_usage').nullable();
          table.decimal('amount', 15, 2).notNullable().defaultTo(0.00);
          table.decimal('total', 15, 2).notNullable().defaultTo(0.00);
          table.decimal('amount_due', 15, 2).notNullable().defaultTo(0.00);
          table.decimal('subtotal', 15, 2).defaultTo(0.00);
          table.decimal('vat', 15, 2).defaultTo(0.00);
          table.decimal('vat_zero_rated', 15, 2).defaultTo(0.00);
          table.decimal('non_vat', 15, 2).defaultTo(0.00);
          table.decimal('withheld', 15, 2).defaultTo(0.00);
          table.string('date', 50).nullable();
          table.string('date_prepared', 50).nullable();
          table.string('date_cheque_issued', 50).nullable();
          table.string('cheque_date', 50).nullable();
          table.string('cheque_number', 100).nullable();
          table.string('control_number', 100).nullable();
          table.string('invoice_number', 100).nullable();
          table.string('invoice_date', 50).nullable();
          table.string('due_date', 50).nullable();
          table.string('term', 100).defaultTo('Net 30');
          table.string('status', 50).defaultTo('PENDING_COO_APPROVAL');
          table.string('coo_approval', 50).defaultTo('PENDING_COO_APPROVAL');
          table.string('checked_by', 150).nullable();
          table.string('coo_confirmed_at', 50).nullable().index();
          table.string('prepared_by', 150).nullable();
          table.string('created_by', 150).nullable();
          table.text('attachment_url').nullable();
          table.text('files_json').nullable();
          table.text('items_json').nullable();
          table.text('comments').nullable();
          table.integer('api_key_id').nullable();
          table.text('raw_payload').nullable();
          table.timestamps(true, true);
        });
        console.log('✅ Created table "payables" in database.');
      } else {
        const hasConfirmedAtCol = await db.schema.hasColumn('payables', 'coo_confirmed_at');
        if (!hasConfirmedAtCol) {
          await db.schema.alterTable('payables', (table) => {
            table.string('coo_confirmed_at', 50).nullable().index();
          });
          console.log('✅ Added column "coo_confirmed_at" to existing table "payables".');
        }
      }

      const hasPayableItems = await db.schema.hasTable('payable_items');
      if (!hasPayableItems) {
        await db.schema.createTable('payable_items', (table) => {
          table.increments('id').primary();
          table.integer('payable_id').unsigned().nullable();
          table.string('payable_number', 100).nullable().index();
          table.text('description').nullable();
          table.string('expense_category', 150).nullable();
          table.decimal('quantity', 12, 4).defaultTo(1.0000);
          table.decimal('cost', 15, 2).defaultTo(0.00);
          table.decimal('subtotal', 15, 2).defaultTo(0.00);
          table.decimal('total', 15, 2).defaultTo(0.00);
          table.decimal('vat', 15, 2).defaultTo(0.00);
          table.boolean('inclusive').defaultTo(false);
          table.string('date', 50).nullable();
          table.timestamps(true, true);
        });
        console.log('✅ Created table "payable_items" in database.');
      }

      // Check and seed baseline records if table is empty
      const countRes = await db('payables').count('id as cnt').first();
      const count = countRes ? (countRes.cnt || countRes['count(*)'] || 0) : 0;
      if (Number(count) === 0) {
        await this.seedBaselinePayables();
      }
    } catch (err) {
      console.error('Error ensuring payables tables:', err.message);
    }
  }

  /**
   * Seeds baseline approved/pending company payables so existing operational history is preserved
   */
  static async seedBaselinePayables() {
    const baselines = [
      {
        payable_number: 'REQ-2026-0891',
        req_cheque_no: 'REQ-2026-0891',
        external_reference: 'CTRL-NKB-2026-0189',
        cheque_number: 'CHK-881920',
        date_prepared: '2026-10-01',
        date_cheque_issued: '2026-10-04',
        date: '2026-10-01',
        payee_beneficiary: 'Brenntag Ingredients Philippines Inc.',
        company: 'NKB Manufacturing Corporation',
        company_code: 'NKB',
        category: 'Raw Materials & Fragrance Oils',
        bank_account: 'BDO - 0080-5801-0547',
        purpose_usage: 'Q4 Compounding Aroma Raw Materials Supply (Fragrance Concentrate + Ethanol 96%)',
        amount: 145850.00,
        total: 145850.00,
        amount_due: 145850.00,
        status: 'Approved',
        coo_approval: 'CONFIRMED',
        checked_by: 'COO / Executive Approver',
        source_portal: 'my.nkbmanufacturing.com',
        source_system: 'https://my.nkbmanufacturing.com/',
        source_badge: 'my.nkb',
        control_number: 'CTRL-NKB-2026-0189',
        invoice_number: 'INV-BRN-7892',
        prepared_by: 'Sharmaine Santos',
        items_json: JSON.stringify([
          {
            description: 'Perfume Grade Pure Denatured Ethyl Alcohol 96% (200L Drum)',
            expense_category: 'Direct Materials',
            quantity: 5,
            cost: 12500.00,
            subtotal: 62500.00,
            vat: 0.00,
            total: 62500.00
          },
          {
            description: 'French Lavender Essential Oil High Grade (25kg Pail)',
            expense_category: 'Fragrance Concentrate',
            quantity: 2,
            cost: 24500.00,
            subtotal: 49000.00,
            vat: 0.00,
            total: 49000.00
          },
          {
            description: 'Iso E Super Fixative & Modifier (10kg Container)',
            expense_category: 'Chemical Additives',
            quantity: 1,
            cost: 34350.00,
            subtotal: 34350.00,
            vat: 0.00,
            total: 34350.00
          }
        ]),
        created_at: new Date('2026-10-01T08:00:00Z'),
        updated_at: new Date('2026-10-04T10:00:00Z')
      },
      {
        payable_number: 'REQ-2026-0895',
        req_cheque_no: 'REQ-2026-0895',
        external_reference: 'CTRL-NKB-2026-0195',
        cheque_number: 'CHK-881930',
        date_prepared: '2026-10-04',
        date_cheque_issued: '2026-10-06',
        date: '2026-10-04',
        payee_beneficiary: 'San Miguel Yamamura Packaging Corp.',
        company: 'NKB Manufacturing Corporation',
        company_code: 'NKB',
        category: 'Packaging Materials',
        bank_account: 'Metrobank - 0291-8841-22',
        purpose_usage: '50ml Amber Glass Perfume Bottles with Black Mist Sprayers (Batch #B2026-09)',
        amount: 86500.00,
        total: 86500.00,
        amount_due: 86500.00,
        status: 'PENDING_COO_APPROVAL',
        coo_approval: 'PENDING_COO_APPROVAL',
        source_portal: 'my.nkbmanufacturing.com',
        source_system: 'https://my.nkbmanufacturing.com/',
        source_badge: 'my.nkb',
        control_number: 'CTRL-NKB-2026-0195',
        invoice_number: 'INV-SMY-44819',
        prepared_by: 'Jessica Tan',
        items_json: JSON.stringify([
          {
            description: '50ml Amber Glass Perfume Bottles Crimp Neck FEA15',
            expense_category: 'Primary Packaging',
            quantity: 5000,
            cost: 12.50,
            subtotal: 62500.00,
            vat: 0.00,
            total: 62500.00
          },
          {
            description: 'Fine Mist Black Aluminum Actuator Sprayers 18/415 with Dip Tube',
            expense_category: 'Closure Components',
            quantity: 5000,
            cost: 4.80,
            subtotal: 24000.00,
            vat: 0.00,
            total: 24000.00
          }
        ]),
        created_at: new Date('2026-10-04T09:00:00Z'),
        updated_at: new Date('2026-10-04T09:00:00Z')
      }
    ];

    for (const b of baselines) {
      await db('payables').insert(b).catch(() => {});
    }
    console.log('✅ Seeded baseline payables in database.');
  }

  /**
   * Robust number parser handling strings with commas, currencies, whitespace
   */
  static parseCleanAmount(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleanStr = String(val).replace(/[^0-9.-]+/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Normalizes any incoming payload from another website into standard payable schema
   */
  static normalizeIncomingPayload(body, req = null) {
    const raw = body || {};

    // 1. Payee / Beneficiary / Supplier (broad field mapping)
    const payeeName = (
      raw.payee_name ||
      raw.payee_beneficiary ||
      raw.payee ||
      raw.beneficiary ||
      raw.beneficiary_name ||
      raw.vendor ||
      raw.vendor_name ||
      raw.supplier ||
      raw.supplier_name ||
      raw.recipient ||
      raw.merchant ||
      raw.company_name ||
      raw.company ||
      ''
    ).toString().trim();

    // 2. Amount parsing
    const amountVal = this.parseCleanAmount(
      raw.amount ||
      raw.total ||
      raw.amount_due ||
      raw.total_amount ||
      raw.grand_total ||
      raw.net_amount ||
      raw.gross_amount ||
      raw.cost ||
      raw.price ||
      0
    );

    // 3. Source Portal & System identification
    const clientApp = req?.clientApp || req?.apiKeyRecord?.client_app || '';
    const keyName = req?.apiKeyRecord?.key_name || '';
    const isPc = Boolean(
      (req?.sourcePortal && req.sourcePortal.includes('pc.')) ||
      (raw.source_portal && raw.source_portal.includes('pc.')) ||
      (raw.source_system && raw.source_system.includes('pc.')) ||
      clientApp.includes('pc.') ||
      clientApp.toLowerCase().includes('petty') ||
      keyName.toLowerCase().includes('petty') ||
      (raw.company && raw.company.toLowerCase().includes('petty')) ||
      (raw.category && raw.category.toLowerCase().includes('petty')) ||
      (raw.comments && raw.comments.toLowerCase().includes('petty cash')) ||
      (raw.remarks && raw.remarks.toLowerCase().includes('petty cash')) ||
      (raw.requested_by_name && raw.requested_by_name.toLowerCase().includes('petty cash'))
    );

    const sourcePortal = isPc ? 'pc.nkbmanufacturing.com' : (req?.sourcePortal || raw.source_portal || 'my.nkbmanufacturing.com');
    const sourceSystem = raw.source_system || clientApp || (isPc ? 'https://pc.nkbmanufacturing.com/' : 'https://my.nkbmanufacturing.com/');
    const sourceBadge = isPc ? 'pc.nkb' : 'my.nkb';

    // 4. External Reference & Idempotency Key
    const headerIdempotencyKey = req?.headers ? (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) : null;
    const externalRef = (
      raw.idempotency_key ||
      headerIdempotencyKey ||
      raw.external_reference ||
      raw.external_ref ||
      raw.external_id ||
      raw.reference_number ||
      raw.reference_no ||
      raw.transaction_reference ||
      raw.transaction_id ||
      raw.order_id ||
      raw.invoice_number ||
      raw.control_number ||
      ''
    ).toString().trim();

    // Unique payable number: preserve caller's number or generate clean standard format
    const callerNumber = (
      raw.requisition_no ||
      raw.payable_number ||
      raw.req_cheque_no ||
      raw.request_number ||
      raw.request_no ||
      raw.req_number ||
      raw.cheque_number ||
      raw.cheque_no ||
      raw.check_no ||
      raw.check_number ||
      raw.invoice_no ||
      (raw.id ? `${defaultPrefix}-${raw.id}` : '') ||
      ''
    ).toString().trim();
    const defaultPrefix = isPc ? 'PC' : 'REQ';
    const generatedNumber = `${defaultPrefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`;
    const payableNumber = callerNumber || externalRef || generatedNumber;

    // 5. Company info
    const company = (raw.company || raw.company_name || (isPc ? 'NKB Petty Cash (pc.nkbmanufacturing.com)' : 'NKB Manufacturing Corporation')).toString().trim();
    const companyCode = (raw.company_code || (isPc ? 'NKB-PC' : 'NKB')).toString().trim();

    // 6. Category & Purpose
    const category = (raw.payable_category || raw.category || raw.expense_category || (isPc ? 'Petty Cash Replenishment' : 'Operational Expense')).toString().trim();
    const purpose = (raw.purpose || raw.purpose_usage || raw.description || raw.particulars || raw.remarks || raw.usage || raw.memo || (isPc ? 'Petty Cash Disbursement Request' : 'Payable Disbursement Request')).toString().trim();
    const bankAccount = (raw.bank_account || raw.bank_name || raw.bank || 'BDO - 0080-5801-0547').toString().trim();

    // 7. Dates
    const today = new Date().toISOString().slice(0, 10);
    const dateVal = raw.date || raw.cheque_date || raw.due_date || raw.invoice_date || today;
    const datePrepared = raw.date_prepared || raw.prepared_date || raw.date_created || raw.created_at || today;

    // 8. Line items parsing
    let lineItems = [];
    if (Array.isArray(raw.line_items)) {
      lineItems = raw.line_items;
    } else if (Array.isArray(raw.items)) {
      lineItems = raw.items;
    } else if (typeof raw.line_items === 'string') {
      try { lineItems = JSON.parse(raw.line_items); } catch (_) {}
    } else if (typeof raw.items === 'string') {
      try { lineItems = JSON.parse(raw.items); } catch (_) {}
    }

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      lineItems = [
        {
          description: purpose,
          expense_category: category,
          quantity: 1,
          cost: amountVal,
          subtotal: amountVal,
          total: amountVal,
          vat: 0.00
        }
      ];
    }

    // 9. Attachments
    let attachmentVal = raw.attachment_url || raw.attachment || raw.file_url || null;
    let filesList = [];
    if (Array.isArray(raw.files)) filesList = raw.files;
    else if (Array.isArray(raw.attachments)) filesList = raw.attachments;
    else if (attachmentVal) filesList = [attachmentVal];

    // 10. Audit / Creator info
    const createdBy = req?.apiKeyRecord
      ? `${req.apiKeyRecord.key_name} (${req.apiKeyRecord.client_app})`
      : (req?.user ? `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() : (raw.prepared_by || raw.requested_by_name || sourcePortal));

    return {
      payeeName,
      amountVal,
      externalRef,
      headerIdempotencyKey,
      payableNumber,
      company,
      companyCode,
      category,
      bankAccount,
      purpose,
      sourcePortal,
      sourceSystem,
      sourceBadge,
      dateVal,
      datePrepared,
      lineItems,
      attachmentVal,
      filesList,
      createdBy,
      raw
    };
  }

  /**
   * Persists incoming payable request into the database with strict deduplication/idempotency
   */
  static async createPayable(body, req = null) {
    const norm = this.normalizeIncomingPayload(body, req);

    if (!norm.payeeName) {
      throw new Error('Payee / Beneficiary / Supplier name is required.');
    }

    if (norm.amountVal <= 0) {
      throw new Error('A valid payable amount greater than 0 is required.');
    }

    // Check for existing record to prevent duplicate submissions (Idempotency)
    let existing = null;
    if (norm.externalRef) {
      existing = await db('payables')
        .where({ external_reference: norm.externalRef })
        .orWhere({ idempotency_key: norm.externalRef })
        .orWhere({ payable_number: norm.externalRef })
        .orWhere({ req_cheque_no: norm.externalRef })
        .first();
    }

    if (!existing && norm.headerIdempotencyKey) {
      existing = await db('payables').where({ idempotency_key: norm.headerIdempotencyKey }).first();
    }

    if (!existing && norm.payableNumber) {
      existing = await db('payables')
        .where({ payable_number: norm.payableNumber })
        .orWhere({ req_cheque_no: norm.payableNumber })
        .first();
    }

    // If already exists, return existing record idempotently
    if (existing) {
      const formattedExisting = formatPayableItem(this.formatDbRow(existing), existing.source_portal);
      return {
        isDuplicate: true,
        record: formattedExisting,
        message: `Payable request already recorded (${existing.payable_number}) and currently has status: ${existing.status || existing.coo_approval}.`
      };
    }

    // Determine true initial status (preserve already-approved or already-rejected records if migrating/syncing)
    let statusToSave = 'PENDING_COO_APPROVAL';
    let cooApprovalToSave = 'PENDING_COO_APPROVAL';
    const rawStatus = (norm.raw.status || norm.raw.coo_approval || '').toString().trim();
    const upper = rawStatus.toUpperCase();
    if (upper === 'APPROVED' || upper === 'CONFIRMED' || upper === 'PAID') {
      statusToSave = 'Approved';
      cooApprovalToSave = 'CONFIRMED';
    } else if (upper === 'REJECTED' || upper === 'DISAPPROVED') {
      statusToSave = 'Rejected';
      cooApprovalToSave = 'REJECTED';
    } else if (upper.includes('SUBMIT') || upper.includes('PENDING')) {
      statusToSave = rawStatus || 'PENDING_COO_APPROVAL';
      cooApprovalToSave = 'PENDING_COO_APPROVAL';
    } else if (rawStatus) {
      statusToSave = rawStatus;
      cooApprovalToSave = rawStatus;
    }

    // Insert new record transactionally
    const insertData = {
      payable_number: norm.payableNumber,
      req_cheque_no: norm.payableNumber,
      external_reference: norm.externalRef || null,
      idempotency_key: norm.headerIdempotencyKey || norm.externalRef || null,
      source_portal: norm.sourcePortal,
      source_system: norm.sourceSystem,
      source_badge: norm.sourceBadge,
      company: norm.company,
      company_code: norm.companyCode,
      payee_beneficiary: norm.payeeName,
      category: norm.category,
      bank_account: norm.bankAccount,
      purpose_usage: norm.purpose,
      amount: norm.amountVal,
      total: norm.amountVal,
      amount_due: norm.amountVal,
      subtotal: norm.amountVal,
      vat: 0.00,
      vat_zero_rated: 0.00,
      non_vat: 0.00,
      withheld: 0.00,
      date: norm.dateVal,
      date_prepared: norm.datePrepared,
      date_cheque_issued: norm.dateVal,
      cheque_date: norm.dateVal,
      cheque_number: norm.raw.cheque_number || '',
      control_number: norm.raw.control_number || '',
      invoice_number: norm.raw.invoice_number || norm.raw.invoice_reference || '',
      invoice_date: norm.raw.invoice_date || norm.dateVal,
      due_date: norm.raw.due_date || norm.dateVal,
      term: norm.raw.term || norm.raw.terms || 'Net 30',
      status: statusToSave,
      coo_approval: cooApprovalToSave,
      checked_by: norm.raw.coo_confirmed_by || norm.raw.checked_by || (statusToSave === 'Approved' ? 'Norvin Bella' : null),
      coo_confirmed_at: norm.raw.coo_confirmed_at || norm.raw.confirmed_at || norm.raw.approved_at || norm.raw.coo_approved_at || norm.raw.date_approved || null,
      prepared_by: norm.raw.prepared_by || norm.createdBy,
      created_by: norm.createdBy,
      attachment_url: norm.attachmentVal,
      files_json: JSON.stringify(norm.filesList),
      items_json: JSON.stringify(norm.lineItems),
      comments: norm.raw.comments || norm.raw.notes || `Submitted via external API integration by ${norm.sourcePortal}`,
      api_key_id: req?.apiKeyRecord?.id || null,
      raw_payload: JSON.stringify(norm.raw),
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    const insertedId = await db.transaction(async (trx) => {
      const res = await trx('payables').insert(insertData);
      const id = Array.isArray(res) ? res[0] : (typeof res === 'object' ? res?.id : res);

      // Insert child line items
      for (const itm of norm.lineItems) {
        await trx('payable_items').insert({
          payable_id: id,
          payable_number: norm.payableNumber,
          description: itm.description || norm.purpose,
          expense_category: itm.expense_category || norm.category,
          quantity: itm.quantity ? parseFloat(itm.quantity) : 1,
          cost: itm.cost ? parseFloat(itm.cost) : norm.amountVal,
          subtotal: itm.subtotal ? parseFloat(itm.subtotal) : norm.amountVal,
          total: itm.total ? parseFloat(itm.total) : norm.amountVal,
          vat: itm.vat ? parseFloat(itm.vat) : 0,
          inclusive: Boolean(itm.inclusive),
          date: itm.date || norm.dateVal,
          created_at: trx.fn.now(),
          updated_at: trx.fn.now()
        }).catch(() => {});
      }

      return id;
    });

    const savedRow = await db('payables').where({ id: insertedId }).first();
    const formatted = formatPayableItem(this.formatDbRow(savedRow), norm.sourcePortal);

    return {
      isDuplicate: false,
      record: formatted,
      message: `Payable request ${norm.payableNumber} from ${norm.sourcePortal} successfully submitted for COO approval.`
    };
  }

  /**
   * Helper to format a database row with parsed JSON fields
   */
  static formatDbRow(row) {
    if (!row) return null;
    let items = [];
    if (row.items_json) {
      try { items = JSON.parse(row.items_json); } catch (_) {}
    }
    let files = [];
    if (row.files_json) {
      try { files = JSON.parse(row.files_json); } catch (_) {}
    }

    return {
      ...row,
      id: row.id,
      payable_number: row.payable_number,
      req_cheque_no: row.req_cheque_no || row.payable_number,
      items,
      files,
      attachment: row.attachment_url,
      total: parseFloat(row.total || row.amount || 0),
      amount: parseFloat(row.amount || 0),
      amount_due: parseFloat(row.amount_due || row.amount || 0)
    };
  }

  /**
   * Retrieves payables list from database matching all query filters
   */
  static async getPayables(query = {}) {
    const {
      status,
      category,
      bank,
      date_from,
      date_to,
      search,
      portal,
      date_cheque_from,
      date_cheque_to,
      date_prepared_from,
      date_prepared_to
    } = query;

    let qb = db('payables').select('*');

    // Exclude synthetic test data unless explicitly requested
    if (query.include_test !== 'true' && query.include_test !== true) {
      qb = qb.where(function () {
        this.whereNull('payee_beneficiary')
          .orWhere(function () {
            this.whereNot('payee_beneficiary', 'like', '%FMS SYNC TEST%')
              .andWhereNot('payee_beneficiary', 'like', '%TEST PROBE%')
              .andWhereNot('payee_beneficiary', 'like', '%System Connection Diagnostic%');
          });
      }).andWhere(function () {
        this.whereNull('purpose_usage')
          .orWhere(function () {
            this.whereNot('purpose_usage', 'like', '%Test FMS Bi-directional Sync%')
              .andWhereNot('purpose_usage', 'like', '%Diagnostic Test%');
          });
      });
    }

    if (portal && portal !== 'ALL') {
      qb = qb.where(function () {
        this.where('source_portal', 'like', `%${portal}%`)
          .orWhere('source_system', 'like', `%${portal}%`);
      });
    }

    if (status && status !== 'ALL') {
      const s = status.toUpperCase();
      qb = qb.where(function () {
        if (s.includes('PENDING') || s.includes('SUBMIT')) {
          this.where('status', 'like', '%PENDING%')
            .orWhere('status', 'like', '%Submitted%')
            .orWhere('coo_approval', 'like', '%PENDING%');
        } else if (s.includes('CONFIRM') || s.includes('APPROV')) {
          this.where('status', 'like', '%CONFIRM%')
            .orWhere('status', 'like', '%Approved%')
            .orWhere('status', 'like', '%Paid%')
            .orWhere('coo_approval', 'like', '%CONFIRM%');
        } else if (s.includes('REJECT')) {
          this.where('status', 'like', '%REJECT%')
            .orWhere('status', 'like', '%Disapproved%')
            .orWhere('coo_approval', 'like', '%REJECT%');
        } else {
          this.where('status', 'like', `%${s}%`)
            .orWhere('coo_approval', 'like', `%${s}%`);
        }
      });
    }

    if (category) {
      qb = qb.where('category', 'like', `%${category}%`);
    }

    if (bank) {
      qb = qb.where('bank_account', 'like', `%${bank}%`);
    }

    if (date_from) {
      qb = qb.where('date', '>=', date_from);
    }
    if (date_to) {
      qb = qb.where('date', '<=', date_to);
    }

    if (date_prepared_from) {
      qb = qb.where('date_prepared', '>=', date_prepared_from);
    }
    if (date_prepared_to) {
      qb = qb.where('date_prepared', '<=', date_prepared_to);
    }

    if (date_cheque_from) {
      qb = qb.where(function () {
        this.where('date_cheque_issued', '>=', date_cheque_from)
          .orWhere('cheque_date', '>=', date_cheque_from);
      });
    }
    if (date_cheque_to) {
      qb = qb.where(function () {
        this.where('date_cheque_issued', '<=', date_cheque_to)
          .orWhere('cheque_date', '<=', date_cheque_to);
      });
    }

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      qb = qb.where(function () {
        this.where('payable_number', 'like', `%${s}%`)
          .orWhere('req_cheque_no', 'like', `%${s}%`)
          .orWhere('payee_beneficiary', 'like', `%${s}%`)
          .orWhere('company', 'like', `%${s}%`)
          .orWhere('purpose_usage', 'like', `%${s}%`)
          .orWhere('cheque_number', 'like', `%${s}%`)
          .orWhere('invoice_number', 'like', `%${s}%`)
          .orWhere('control_number', 'like', `%${s}%`)
          .orWhere('external_reference', 'like', `%${s}%`);
      });
    }

    qb = qb.orderBy('id', 'desc');

    const rows = await qb;
    return rows.map(r => formatPayableItem(this.formatDbRow(r), r.source_portal));
  }

  /**
   * Retrieves single payable by ID, payable_number, or reference
   */
  static async getPayableById(id) {
    const row = await db('payables')
      .where({ id })
      .orWhere({ payable_number: id })
      .orWhere({ req_cheque_no: id })
      .orWhere({ external_reference: id })
      .first();

    if (!row) return null;
    return formatPayableItem(this.formatDbRow(row), row.source_portal);
  }

  /**
   * Approves or rejects a payable record in the database
   */
  static async confirmPayable(id, { decision, cheque_number, notes, confirmed_by }) {
    const row = await db('payables')
      .where({ id })
      .orWhere({ payable_number: id })
      .orWhere({ req_cheque_no: id })
      .first();

    if (!row) return null;

    const approver = confirmed_by || 'COO / Executive Approver';
    const checkNo = (cheque_number || '').trim();
    const existingComments = row.comments || '';
    const newComment = `[${new Date().toLocaleString()}] ${decision} by ${approver}.${checkNo ? ` Check #: ${checkNo}.` : ''}${notes ? ` Notes: ${notes}` : ''}`;
    const updatedComments = existingComments ? `${existingComments}\n${newComment}` : newComment;

    const statusText = decision === 'CONFIRMED' ? 'Approved' : 'Rejected';
    await db('payables')
      .where({ id: row.id })
      .update({
        status: statusText,
        coo_approval: decision,
        cheque_number: checkNo || row.cheque_number,
        checked_by: approver,
        coo_confirmed_at: decision === 'CONFIRMED' ? db.fn.now() : row.coo_confirmed_at,
        comments: updatedComments,
        updated_at: db.fn.now()
      });

    const updated = await db('payables').where({ id: row.id }).first();
    return formatPayableItem(this.formatDbRow(updated), updated.source_portal);
  }

  /**
   * Deletes a payable record from the database
   */
  static async deletePayable(id) {
    const row = await db('payables')
      .where({ id })
      .orWhere({ payable_number: id })
      .orWhere({ req_cheque_no: id })
      .first();

    if (!row) return false;

    await db('payable_items').where({ payable_id: row.id }).del().catch(() => {});
    await db('payables').where({ id: row.id }).del();
    return true;
  }
}
