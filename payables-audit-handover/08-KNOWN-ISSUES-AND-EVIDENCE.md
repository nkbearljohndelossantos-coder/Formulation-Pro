# 08 — KNOWN ISSUES, EDGE CASES & EVIDENCE AUDIT

**System**: NKB Enterprise Formulation Management System (FMS)  
**Scope**: Confirmed Operational Bottlenecks, Edge Cases & Structural Limitations  
**Audit Standard**: Code & Runtime Evidence  

---

## 1. Verified Issues Matrix

| # | Issue Classification | Severity | Status | Evidence Location |
| :- | :--- | :--- | :--- | :--- |
| **1** | Local SQLite vs Production MySQL Data Divergence | High | **[VERIFIED]** | `server/knexfile.js`, `database/nkb_formulation.sqlite` |
| **2** | Auto-Sync Bypassed When Count > 2 | Medium | **[VERIFIED]** | `server/routes/payables.js` lines 842-855 |
| **3** | Outbound Portal Decision Failure Is Non-Transactional | Medium | **[VERIFIED]** | `server/routes/payables.js` lines 1068-1082 |
| **4** | Production Synthetic Test Records Purge Awaiting Authorization | High | **[VERIFIED]** | Incident transcript, `server/services/PayableService.js` line 770 |
| **5** | Hardcoded Fallback Keys in Source Code | Low | **[VERIFIED]** | `server/routes/payables.js` lines 14-17 |

---

## 2. In-Depth Analysis of Known Issues

### Issue 1: Local SQLite vs Production MySQL Divergence [VERIFIED]
- **Description**:
  In local development, the backend automatically defaults to `database/nkb_formulation.sqlite`. The 78 authentic corporate cheque requests exist on the production database (`u335953510_fms_db`) or in `https://my.nkbmanufacturing.com/api/v1/payables?limit=1000`. Running the application locally without `.env.production` pointing to the live database will only display local SQLite records (2 baseline records after filtering synthetic test probes).
- **Code Reference**:
  `server/knexfile.js` lines 14-47, `server/db.js` lines 4-11.

---

### Issue 2: Auto-Sync Bypassed When Table Count > 2 [VERIFIED]
- **Description**:
  When `GET /api/v1/payables` is called, it checks:
  ```javascript
  const countRes = await db('payables').count('id as cnt').first().catch(() => ({ cnt: 0 }));
  const currentCount = Number(countRes?.cnt || countRes?.['count(*)'] || 0);
  const isInitialEmpty = currentCount <= 2;
  ```
  If `currentCount > 2`, `isInitialEmpty` evaluates to `false`. Therefore, the server does **not** execute a blocking pull from `my.nkbmanufacturing.com` unless `sync=true` is passed or the 60-second background sync interval has elapsed.
  Since the local database contains 52 rows (50 of which are filtered-out synthetic records), the server considers the table "populated" and skips the initial sync.
- **Code Reference**:
  `server/routes/payables.js` lines 842-855.

---

### Issue 3: Outbound Decision Failure Is Non-Transactional [VERIFIED]
- **Description**:
  When an executive confirms a payable via `POST /api/v1/payables/:id/confirm`:
  1. The local database status is updated to `CONFIRMED` first (`PayableService.confirmPayable()`).
  2. The server attempts an outbound HTTP call to `https://<portal>/api/v1/payables/:id/confirm`.
  3. If the remote portal is down, times out, or rejects the API key, the error is caught with `console.warn` and `remoteSuccess = false`, but the local approval is **not** rolled back.
  4. This can lead to state inconsistency where FMS records the cheque as approved, but the source portal still lists it as pending.
- **Code Reference**:
  `server/routes/payables.js` lines 1050-1082.

---

### Issue 4: Production Purge Awaiting Explicit Authorization [VERIFIED]
- **Description**:
  During earlier troubleshooting, 50 synthetic test records (`PB-202610-5001` through `PB-202610-5050`) were created. While a full purge script was drafted and tested in dry-run, the user explicitly ordered: *"I do NOT authorize the purge of the 50 alleged test records... at this time"*.
  Consequently, code-level isolation filters were implemented in `server/services/PayableService.js`, `server/routes/payables.js`, and `src/pages/PayableApprovalsPage.jsx` to hide them from the queue, while the underlying physical rows remain safely untouched in the database.
- **Evidence**:
  Safe SQLite query confirmed exactly 50 rows matching `PB-202610-%` remain in the database table.

---

### Issue 5: Hardcoded Default Keys in Source Code [VERIFIED]
- **Description**:
  In `server/routes/payables.js` lines 14-17, default API key constants (`MY_NKB_API_KEY`, `PC_NKB_API_KEY`) are defined as fallback values if no key is configured in `system_settings` or `api_keys`.
- **Recommendation for Future Handover**:
  Ensure all production keys are rotated and migrated strictly to environment variables or encrypted `system_settings` rows rather than source file fallbacks.
