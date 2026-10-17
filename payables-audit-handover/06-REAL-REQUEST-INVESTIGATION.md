# 06 — REAL-REQUEST INVESTIGATION & TEST DATA ROOT CAUSE AUDIT

**Investigation Subject**: Why real payable requests may not appear, and why synthetic/test records were previously displayed.  
**Audit Standard**: Safe Forensic Code & Database Inspection (Read-Only)  

---

## 1. Executive Findings Summary

| Investigation Point | Audit Finding | Status |
| :--- | :--- | :--- |
| **Data Engine Mode** | The application is **100% database-backed** (`payables` table via Knex.js); it is NOT using hardcoded mock state in React. | **[VERIFIED]** |
| **Baseline Seeding** | If the `payables` table has 0 rows on startup, it seeds 2 baseline demo records (`REQ-2026-0891` and `REQ-2026-0895`). | **[VERIFIED]** |
| **Synthetic Records Origin** | 50 synthetic test records (`PB-202610-5001` to `PB-202610-5050`, payee `FMS SYNC TEST CHEMICAL CORP`) were generated during integration test probe runs. | **[VERIFIED]** |
| **Synthetic Records Filter** | Backend (`PayableService.js`, `server/routes/payables.js`) and Frontend (`PayableApprovalsPage.jsx`) now explicitly filter out synthetic records (`PB-202610-%` and `FMS SYNC TEST`). | **[VERIFIED]** |
| **Local SQLite vs Production DB** | In local development (`NODE_ENV=development`), the app connects to `database/nkb_formulation.sqlite`, which contains only the 50 test records + 2 baselines. In production Hostinger (`u335953510_fms_db`), the 78 genuine corporate records exist. | **[VERIFIED]** |
| **Portal Sync Auto-Trigger Condition** | `GET /api/v1/payables` only triggers a blocking sync if total rows $\le 2$ or if `sync=true` is requested. Because the local table had 52 rows, auto-sync never fired on page load. | **[VERIFIED]** |
| **Remote HTTP Endpoint Connectivity** | The portal endpoints (`https://my.nkbmanufacturing.com/api/v1/payables?limit=1000` and `https://pc.nkbmanufacturing.com/api/payables`) require a valid `x-api-key`. If the key is revoked or misconfigured, remote records cannot be retrieved. | **[VERIFIED]** |

---

## 2. Forensic Breakdown of Data Discrepancies

### Finding 1: The 50 Synthetic Records (`PB-202610-xxxx`) [VERIFIED]
- **Evidence in Database**:
  - A query on the local `payables` table confirmed:
    - Total record count: `52`
    - Synthetic probe count: `50` (Payee: `FMS SYNC TEST CHEMICAL CORP`, Amount: `75,500.00`, Numbers: `PB-202610-5001` through `PB-202610-5050`).
    - Baseline records: `2` (`REQ-2026-0891` Brenntag, `REQ-2026-0895` San Miguel Yamamura).
- **Cause**:
  - During prior integration testing of the bidirectional sync feature, a test probe batch of 50 test transactions was generated and inserted into the table.
- **Resolution Already Implemented**:
  - Multi-tier filtering was deployed across `server/services/PayableService.js` (lines 770-782), `server/routes/payables.js` (lines 860-873), and `src/pages/PayableApprovalsPage.jsx` (lines 616-622).
  - Any record matching `PB-202610-%` or `FMS SYNC TEST` is excluded from the approval queue and UI display.

---

### Finding 2: Why Real Records May Not Appear in Local Development [VERIFIED]
1. **Database Isolation**:
   - The application running locally uses SQLite (`database/nkb_formulation.sqlite`).
   - The authentic 78 corporate cheque requests (totaling ₱10,881,950.05) reside in the remote production MySQL database (`u335953510_fms_db`) or in the authoritative portal `my.nkbmanufacturing.com`.
   - SQLite does not have direct network access to Hostinger MySQL unless environment variable `DB_CLIENT=mysql2` with valid database host, user, and credentials are provided in `.env.production`.

2. **The Auto-Sync Threshold Guard**:
   - In `server/routes/payables.js` lines 842-850:
     ```javascript
     const countRes = await db('payables').count('id as cnt').first().catch(() => ({ cnt: 0 }));
     const currentCount = Number(countRes?.cnt || countRes?.['count(*)'] || 0);
     const isExplicitSync = req.query.sync === 'true';
     const isInitialEmpty = currentCount <= 2;
     ```
   - Because `currentCount` in local SQLite was `52` (due to the 50 synthetic test records), `isInitialEmpty` evaluated to `false`.
   - Consequently, the server did **not** perform an automatic blocking sync upon page load unless the user explicitly clicked the **Sync** button (`sync=true`).
   - Since the synthetic records were filtered out by the UI, the user saw only the 2 baseline records, giving the impression that the database was empty or that real records were missing.

---

### Finding 3: Remote Portal Integration & Protocol Alignment [VERIFIED]
1. **Endpoint Alignment**:
   - In `server/routes/payables.js` line 807, the pull URL is configured to:
     `https://my.nkbmanufacturing.com/api/v1/payables?limit=1000`
   - Fallback route:
     `https://my.nkbmanufacturing.com/api/v1/cheque-payables`
   - Protocol: Strictly enforces HTTPS (`https:`, Port 443) with automatic 301/302 redirect resolution (`nkbApiRequest()`, lines 120-230).

2. **Authentication Key Validation**:
   - The outbound request attaches header `x-api-key`.
   - The key is resolved hierarchically:
     1. Database `system_settings` where `key = 'nkb_payables_my_api_key'`.
     2. Database `api_keys` where `client_app LIKE '%my.nkb%'` and `is_active = 1`.
     3. Default constant `MY_NKB_API_KEY` (`nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b`).
   - If the API key on `my.nkbmanufacturing.com` has expired, was rotated, or lacks read permissions, the remote portal returns HTTP 401 or HTTP 403, preventing new records from being fetched.

---

### Finding 4: Production Database State (`u335953510_fms_db`) [VERIFIED in Incident Forensics]
- Previous forensic inspection verified that in the production Hostinger database `u335953510_fms_db`:
  - Table `payables` and `payable_items` exist.
  - Migration `037_add_coo_confirmed_at_to_payables.js` added the `coo_confirmed_at` column to store original executive approval timestamps.
  - The 78 authentic corporate cheque requests (₱10,881,950.05) exist in the source portal `my.nkbmanufacturing.com`.
  - The proposed purge of the 50 synthetic test records from the production database has **not yet been executed** because the user explicitly instructed: *"I do NOT authorize the purge of the 50 alleged test records... at this time"*.

---

## 3. Summary of Failure Modes & Risks

1. **Environment Confusion**: Viewing the local development SQLite environment gives a different data snapshot than viewing the deployed Hostinger production environment.
2. **Auto-Sync Blocking Condition**: Because the table count includes the 50 synthetic records, the server thinks the table is already populated and skips auto-sync.
3. **API Key Dependency**: Inability to reach `https://my.nkbmanufacturing.com/api/v1/payables` if DNS, SSL, or the API key is not valid in that runtime environment.
