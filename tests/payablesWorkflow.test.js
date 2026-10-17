import { describe, it, expect, beforeAll } from 'vitest';
import db from '../server/db.js';
import { PayableService, formatPayableItem } from '../server/services/PayableService.js';

describe('Payables External Integration and Approval Queue Tests', () => {
  beforeAll(async () => {
    await PayableService.ensurePayablesTables();
  });

  it('normalizes external portal payloads correctly preserving requisition_no, supplier, and amounts', () => {
    const rawPcItem = {
      id: 9991,
      requisition_no: 'PB-202610-9991',
      supplier_name: 'Alpha Chemical Logistics Corp',
      gross_amount: '48200.50',
      net_amount: '48200.50',
      status: 'Submitted For Approval',
      payable_category: 'Direct Raw Materials',
      remarks: 'Bulk Ethanol 96% Supply Batch',
      source_portal: 'pc.nkbmanufacturing.com'
    };

    const formatted = formatPayableItem(rawPcItem);
    expect(formatted).toBeDefined();
    expect(formatted.req_cheque_no).toBe('PB-202610-9991');
    expect(formatted.payee_beneficiary).toBe('Alpha Chemical Logistics Corp');
    expect(formatted.amount).toBe(48200.50);
    expect(formatted.category).toBe('Direct Raw Materials');
    expect(formatted.status).toBe('PENDING_COO_APPROVAL');
    expect(formatted.source_portal).toBe('pc.nkbmanufacturing.com');
  });

  it('creates payables with idempotency and prevents duplicates', async () => {
    const testPayload = {
      requisition_no: 'PB-TEST-IDEM-001',
      supplier_name: 'Idempotent Testing Vendor Inc',
      amount: 15750.00,
      status: 'PENDING_COO_APPROVAL',
      purpose: 'Verification of idempotency logic',
      source_portal: 'pc.nkbmanufacturing.com'
    };

    // First submission
    const res1 = await PayableService.createPayable(testPayload);
    expect(res1.isDuplicate).toBe(false);
    expect(res1.record.payable_number).toBe('PB-TEST-IDEM-001');

    // Second submission with exact same requisition_no
    const res2 = await PayableService.createPayable(testPayload);
    expect(res2.isDuplicate).toBe(true);
    expect(res2.record.payable_number).toBe('PB-TEST-IDEM-001');
  });

  it('preserves approved status for historical imported records without resetting to pending', async () => {
    const approvedPayload = {
      requisition_no: 'PB-TEST-HIST-002',
      supplier_name: 'Historical Approved Supplier Corp',
      amount: 92400.00,
      status: 'Approved',
      coo_approval: 'CONFIRMED',
      cheque_number: 'CHK-991284',
      purpose: 'Historical audited payable'
    };

    const res = await PayableService.createPayable(approvedPayload);
    expect(res.isDuplicate).toBe(false);
    expect(res.record.status).toBe('CONFIRMED');

    // Verify stored in DB
    const inDb = await db('payables').where({ payable_number: 'PB-TEST-HIST-002' }).first();
    expect(inDb.status).toBe('Approved');
    expect(inDb.coo_approval).toBe('CONFIRMED');
    expect(inDb.cheque_number).toBe('CHK-991284');
  });

  it('filters payables correctly by PENDING, CONFIRMED, and ALL', async () => {
    const all = await PayableService.getPayables({ status: 'ALL' });
    expect(all.length).toBeGreaterThanOrEqual(2);

    const pending = await PayableService.getPayables({ status: 'PENDING' });
    expect(pending.every(p => p.status?.includes('PENDING') || p.status?.includes('Submitted') || p.coo_approval?.includes('PENDING'))).toBe(true);

    const confirmed = await PayableService.getPayables({ status: 'CONFIRMED' });
    expect(confirmed.every(p => p.status?.includes('Approved') || p.status?.includes('CONFIRM') || p.coo_approval?.includes('CONFIRM'))).toBe(true);
  });

  it('correctly ingests genuine PO payable from my.nkbmanufacturing.com with line items into payable_items', async () => {
    const myNkbPayload = {
      id: 88101,
      requisition_no: 'PO-NKB-2026-0881',
      supplier_name: 'ChemSource Philippines Industrial Inc',
      amount: 145000.00,
      payable_category: 'Raw Materials - Chemical Surfactants',
      purpose: 'Batch 4001 Surfactant Precursors',
      source_portal: 'my.nkbmanufacturing.com',
      source_system: 'https://my.nkbmanufacturing.com/',
      line_items: [
        {
          description: 'Sodium Laureth Sulfate 70% 200kg Drum',
          expense_category: 'Direct Raw Materials',
          quantity: 10,
          cost: 9500.00,
          subtotal: 95000.00,
          total: 95000.00
        },
        {
          description: 'Cocamidopropyl Betaine 30% 200kg Drum',
          expense_category: 'Direct Raw Materials',
          quantity: 10,
          cost: 5000.00,
          subtotal: 50000.00,
          total: 50000.00
        }
      ]
    };

    const res = await PayableService.createPayable(myNkbPayload);
    expect(res.isDuplicate).toBe(false);
    expect(res.record.payable_number).toBe('PO-NKB-2026-0881');
    expect(res.record.source_portal).toBe('my.nkbmanufacturing.com');
    expect(res.record.company_code).toBe('NKB');
    expect(res.record.amount).toBe(145000.00);

    // Verify child items inserted into payable_items table
    const childItems = await db('payable_items').where({ payable_number: 'PO-NKB-2026-0881' });
    expect(childItems.length).toBe(2);
    expect(childItems[0].description).toBe('Sodium Laureth Sulfate 70% 200kg Drum');
    expect(childItems[0].subtotal).toBe(95000.00);
    expect(childItems[1].description).toBe('Cocamidopropyl Betaine 30% 200kg Drum');
    expect(childItems[1].subtotal).toBe(50000.00);

    // Idempotent retry test
    const retryRes = await PayableService.createPayable(myNkbPayload);
    expect(retryRes.isDuplicate).toBe(true);
    expect(retryRes.record.payable_number).toBe('PO-NKB-2026-0881');
  });

  it('correctly ingests genuine Petty Cash payable from pc.nkbmanufacturing.com with NKB-PC tags', async () => {
    const pcNkbPayload = {
      id: 99202,
      requisition_no: 'PC-MNL-2026-0992',
      supplier_name: 'Metro Manila Branch Petty Cash Custodian',
      amount: 18750.25,
      payable_category: 'Petty Cash Replenishment',
      purpose: 'Branch Logistics & Factory Floor Incidentals',
      source_portal: 'pc.nkbmanufacturing.com',
      source_system: 'https://pc.nkbmanufacturing.com/',
      line_items: [
        {
          description: 'Emergency Laboratory Reagents and Distilled Water',
          expense_category: 'Lab Supplies',
          quantity: 1,
          cost: 8250.25,
          subtotal: 8250.25,
          total: 8250.25
        },
        {
          description: 'Local Delivery Couriers and Transport Tokens',
          expense_category: 'Transportation',
          quantity: 1,
          cost: 10500.00,
          subtotal: 10500.00,
          total: 10500.00
        }
      ]
    };

    const res = await PayableService.createPayable(pcNkbPayload);
    expect(res.isDuplicate).toBe(false);
    expect(res.record.payable_number).toBe('PC-MNL-2026-0992');
    expect(res.record.source_portal).toBe('pc.nkbmanufacturing.com');
    expect(res.record.source_badge).toBe('pc.nkb');
    expect(res.record.company_code).toBe('NKB-PC');
    expect(res.record.amount).toBe(18750.25);

    // Verify child items inserted into payable_items table
    const childItems = await db('payable_items').where({ payable_number: 'PC-MNL-2026-0992' });
    expect(childItems.length).toBe(2);
    expect(childItems[0].expense_category).toBe('Lab Supplies');
    expect(childItems[1].expense_category).toBe('Transportation');

    // Idempotent retry test
    const retryRes = await PayableService.createPayable(pcNkbPayload);
    expect(retryRes.isDuplicate).toBe(true);
    expect(retryRes.record.payable_number).toBe('PC-MNL-2026-0992');
  });

  it('guarantees portal isolation: a malformed or failing payload from one portal does not break the other', async () => {
    // Malformed payload from one portal (missing supplier name and 0 amount)
    const malformedMyPayload = {
      requisition_no: 'PO-FAIL-001',
      supplier_name: '',
      amount: 0,
      source_portal: 'my.nkbmanufacturing.com'
    };

    // Valid payload from pc portal
    const validPcPayload = {
      requisition_no: 'PC-OK-2026-001',
      supplier_name: 'Cavite Plant Petty Cash Fund',
      amount: 12400.00,
      purpose: 'Plant maintenance emergency consumables',
      source_portal: 'pc.nkbmanufacturing.com'
    };

    // First, verify malformed payload fails with validation error as expected
    let myErrorCaught = false;
    try {
      await PayableService.createPayable(malformedMyPayload);
    } catch (err) {
      myErrorCaught = true;
      expect(err.message).toContain('required');
    }
    expect(myErrorCaught).toBe(true);

    // Second, verify that subsequent pc portal transaction succeeds completely independently
    const pcRes = await PayableService.createPayable(validPcPayload);
    expect(pcRes.isDuplicate).toBe(false);
    expect(pcRes.record.payable_number).toBe('PC-OK-2026-001');
    expect(pcRes.record.source_portal).toBe('pc.nkbmanufacturing.com');
    expect(pcRes.record.amount).toBe(12400.00);
  });

  it('executes COO confirmation workflow setting status, cheque_number, and coo_confirmed_at', async () => {
    // Create a pending payable
    const pendingItem = {
      requisition_no: 'PB-COO-WORKFLOW-01',
      supplier_name: 'Packaging Solutions Hub Inc',
      amount: 67300.00,
      status: 'PENDING_COO_APPROVAL',
      purpose: 'Amber glass bottle batch'
    };

    const created = await PayableService.createPayable(pendingItem);
    expect(created.record.status).toBe('PENDING_COO_APPROVAL');

    // Perform COO confirmation
    const confirmed = await PayableService.confirmPayable(created.record.id, {
      decision: 'CONFIRMED',
      cheque_number: 'CHK-2026-88771',
      notes: 'Approved for disbursement after QA release',
      confirmed_by: 'Norvin Bella (COO)'
    });

    expect(confirmed).toBeDefined();
    expect(confirmed.status).toBe('CONFIRMED');
    expect(confirmed.coo_approval).toBe('CONFIRMED');
    expect(confirmed.cheque_number).toBe('CHK-2026-88771');
    expect(confirmed.comments).toContain('Approved for disbursement after QA release');

    // Verify persisted directly in database
    const dbRow = await db('payables').where({ id: created.record.id }).first();
    expect(dbRow.status).toBe('Approved');
    expect(dbRow.coo_approval).toBe('CONFIRMED');
    expect(dbRow.cheque_number).toBe('CHK-2026-88771');
    expect(dbRow.coo_confirmed_at).not.toBeNull();

    // Verify retry of confirmed record does not revert it to pending
    const retryOfConfirmed = await PayableService.createPayable(pendingItem);
    expect(retryOfConfirmed.isDuplicate).toBe(true);
    const dbRowAfterRetry = await db('payables').where({ id: created.record.id }).first();
    expect(dbRowAfterRetry.status).toBe('Approved');
    expect(dbRowAfterRetry.coo_approval).toBe('CONFIRMED');
    expect(dbRowAfterRetry.cheque_number).toBe('CHK-2026-88771');
  });

  it('guarantees genuine PB-202610- records from Petty Cash backend are visible and NOT filtered out as synthetic probes', async () => {
    // Simulating exact payload sent by Petty-Cash-main/backend/src/services/fmsService.js
    const realPcPayload = {
      id: 'PB-42',
      request_number: 'PB-202610-0042',
      req_cheque_no: 'PB-202610-0042',
      company_name: 'NKB Manufacturing Corporation',
      company_code: 'NKB',
      payee_name: 'National Logistics Express Delivery Services',
      category: 'Transportation and Delivery',
      amount: 4650.00,
      total: 4650.00,
      bank_name: 'BDO - 0080-5801-0547',
      purpose: 'Urgent warehouse-to-plant transfer of raw materials',
      invoice_number: 'INV-2026-9812',
      control_number: 'CTRL-PC-0042',
      due_date: '2026-10-25',
      terms: 'Net 30',
      status: 'PENDING_COO_APPROVAL',
      coo_approval: 'PENDING_COO_APPROVAL',
      requested_by_name: 'Petty Cash System',
      comments: 'Submitted from Petty Cash System',
      items: [
        {
          description: 'Special courier dispatch Cavite to Manila',
          expense_category: 'Transportation',
          quantity: 1,
          cost: 4650.00,
          subtotal: 4650.00
        }
      ]
    };

    const res = await PayableService.createPayable(realPcPayload);
    expect(res.isDuplicate).toBe(false);
    expect(res.record.payable_number).toBe('PB-202610-0042');
    expect(res.record.source_portal).toBe('pc.nkbmanufacturing.com');
    expect(res.record.source_badge).toBe('pc.nkb');

    // Also insert a known synthetic test probe to verify that ONLY the probe is filtered out
    await db('payables').insert({
      payable_number: 'PB-202610-5099',
      req_cheque_no: 'PB-202610-5099',
      company: 'NKB Manufacturing Corporation',
      payee_beneficiary: 'FMS SYNC TEST CHEMICAL CORP',
      amount: 75500.00,
      total: 75500.00,
      status: 'PENDING_COO_APPROVAL',
      purpose_usage: 'Test FMS Bi-directional Sync Integration probe',
      source_portal: 'pc.nkbmanufacturing.com',
      date: '2026-10-15',
      date_prepared: '2026-10-15',
      created_at: new Date(),
      updated_at: new Date()
    }).catch(() => {});

    // Query list through PayableService.getPayables
    const visibleList = await PayableService.getPayables({ portal: 'pc' });

    // The genuine PB-202610-0042 MUST be present
    const foundReal = visibleList.find(p => p.payable_number === 'PB-202610-0042');
    expect(foundReal).toBeDefined();
    expect(foundReal.payee_beneficiary).toBe('National Logistics Express Delivery Services');
    expect(foundReal.source_portal).toBe('pc.nkbmanufacturing.com');

    // The synthetic probe PB-202610-5099 MUST be excluded
    const foundProbe = visibleList.find(p => p.payee_beneficiary?.includes('FMS SYNC TEST'));
    expect(foundProbe).toBeUndefined();
  });
});


