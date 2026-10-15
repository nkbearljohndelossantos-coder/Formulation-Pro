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
});
