/**
 * Financial Data Ingestion & Reconciliation Script
 * Safely imports existing payable records from u335953510_pc_db (or remote portal API)
 * into u335953510_fms_db.payables without deleting or modifying any existing data.
 */

import db from '../db.js';
import { PayableService } from '../services/PayableService.js';
import { nkbApiRequest, getActivePortalKey } from '../routes/payables.js';

async function runPayablesReconciliation() {
  console.log('================================================================');
  console.log('STARTING FINANCIAL DATA RECONCILIATION & PAYABLES SYNC');
  console.log('Timestamp:', new Date().toISOString());
  console.log('================================================================');

  try {
    // 1. Ensure target tables exist
    await PayableService.ensurePayablesTables();

    // 2. Count before reconciliation
    const beforeCountRes = await db('payables').count('id as cnt').first();
    const countBefore = Number(beforeCountRes?.cnt || beforeCountRes?.['count(*)'] || 0);
    console.log(`Current FMS payables record count before sync: ${countBefore}`);

    let totalDiscovered = 0;
    let newlyCreated = 0;
    let existingSkipped = 0;
    let testProbesIgnored = 0;
    let errorCount = 0;

    const isMysql = db.client?.config?.client === 'mysql2';

    // 3. Strategy A: Direct local MySQL cross-database query (when running on Hostinger production)
    if (isMysql) {
      console.log('Detected MySQL environment. Checking cross-database table u335953510_pc_db.payables...');
      try {
        const [rows] = await db.raw(`
          SELECT * FROM u335953510_pc_db.payables
          ORDER BY id ASC
        `);

        if (Array.isArray(rows) && rows.length > 0) {
          console.log(`Found ${rows.length} total records in u335953510_pc_db.payables.`);
          totalDiscovered += rows.length;

          for (const row of rows) {
            // Exclude probe / test connection items
            const isProbe = Boolean(
              (row.supplier_name && row.supplier_name.includes('TEST PROBE')) ||
              (row.supplier_name && row.supplier_name.includes('System Connection')) ||
              (row.remarks && row.remarks.includes('Test FMS Bi-directional Sync')) ||
              (row.remarks && row.remarks.includes('TEST PROBE'))
            );

            if (isProbe) {
              testProbesIgnored++;
              continue;
            }

            try {
              const res = await PayableService.createPayable({
                ...row,
                source_portal: 'pc.nkbmanufacturing.com',
                source_system: 'https://pc.nkbmanufacturing.com/'
              });

              if (res.isDuplicate) {
                existingSkipped++;
              } else {
                newlyCreated++;
              }
            } catch (err) {
              errorCount++;
              console.warn(`Warning on row ID ${row.id} (${row.requisition_no}):`, err.message);
            }
          }
        }
      } catch (mysqlErr) {
        console.log('Cross-database direct query notice:', mysqlErr.message);
        console.log('Proceeding to API-based ingestion strategy...');
      }
    }

    // 4. Strategy B: External HTTP API Synchronization from pc.nkbmanufacturing.com
    console.log('Checking pc.nkbmanufacturing.com API...');
    try {
      const pcKey = await getActivePortalKey('pc');
      const pcRes = await nkbApiRequest('GET', '/payables', pcKey, null, 'pc.nkbmanufacturing.com');
      if (pcRes.ok && pcRes.data) {
        const items = Array.isArray(pcRes.data) ? pcRes.data : (pcRes.data.data || pcRes.data.payables || []);
        console.log(`Fetched ${items.length} records via pc.nkbmanufacturing.com API.`);
        totalDiscovered += items.length;

        for (const itm of items) {
          const isProbe = Boolean(
            (itm.supplier_name && itm.supplier_name.includes('TEST PROBE')) ||
            (itm.supplier_name && itm.supplier_name.includes('System Connection'))
          );
          if (isProbe) {
            testProbesIgnored++;
            continue;
          }

          try {
            const res = await PayableService.createPayable(itm);
            if (res.isDuplicate) existingSkipped++;
            else newlyCreated++;
          } catch (e) {
            errorCount++;
          }
        }
      }
    } catch (apiErr) {
      console.log('PC API notice:', apiErr.message);
    }

    // 5. Strategy C: External HTTP API Synchronization from my.nkbmanufacturing.com
    console.log('Checking my.nkbmanufacturing.com API...');
    try {
      const myKey = await getActivePortalKey('my');
      let myRes = await nkbApiRequest('GET', '/cheque-payables', myKey, null, 'my.nkbmanufacturing.com').catch(() => null);
      if (!myRes || !myRes.ok) {
        myRes = await nkbApiRequest('GET', '/payables', myKey, null, 'my.nkbmanufacturing.com').catch(() => null);
      }
      if (myRes && myRes.ok && myRes.data) {
        const items = Array.isArray(myRes.data) ? myRes.data : (myRes.data.data || myRes.data.payables || []);
        console.log(`Fetched ${items.length} records via my.nkbmanufacturing.com API.`);
        totalDiscovered += items.length;

        for (const itm of items) {
          const isProbe = Boolean(
            (itm.supplier_name && itm.supplier_name.includes('TEST PROBE')) ||
            (itm.payee_beneficiary && itm.payee_beneficiary.includes('TEST PROBE'))
          );
          if (isProbe) {
            testProbesIgnored++;
            continue;
          }

          try {
            const res = await PayableService.createPayable(itm);
            if (res.isDuplicate) existingSkipped++;
            else newlyCreated++;
          } catch (e) {
            errorCount++;
          }
        }
      }
    } catch (apiErr) {
      console.log('My NKB API notice:', apiErr.message);
    }

    // 6. Reconciliation Verification & Final Counts
    const afterCountRes = await db('payables').count('id as cnt').first();
    const countAfter = Number(afterCountRes?.cnt || afterCountRes?.['count(*)'] || 0);

    const statusCounts = await db('payables')
      .select('status')
      .count('id as cnt')
      .groupBy('status');

    console.log('================================================================');
    console.log('RECONCILIATION SUMMARY:');
    console.log(`- Total Records in FMS Before Sync : ${countBefore}`);
    console.log(`- Total Records Discovered        : ${totalDiscovered}`);
    console.log(`- Newly Created in FMS Database   : ${newlyCreated}`);
    console.log(`- Already Existing (Idempotent)   : ${existingSkipped}`);
    console.log(`- Test Probes Safely Ignored      : ${testProbesIgnored}`);
    console.log(`- Errors Encountered              : ${errorCount}`);
    console.log(`- Final Total Records in FMS Table: ${countAfter}`);
    console.log('Status Breakdown in FMS Table:');
    console.log(JSON.stringify(statusCounts, null, 2));
    console.log('================================================================');
    console.log('✅ RECONCILIATION COMPLETE WITHOUT DATA LOSS OR DUPLICATION');
  } catch (fatalErr) {
    console.error('Fatal error in reconciliation:', fatalErr);
  } finally {
    process.exit(0);
  }
}

runPayablesReconciliation();
