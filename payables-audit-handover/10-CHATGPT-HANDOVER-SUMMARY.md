# 10 — CHATGPT HANDOVER SUMMARY & ENGINEERING BRIEF

**Target Audience**: ChatGPT / Future AI Assistant / Engineering Lead  
**Document Purpose**: Definitive technical handover to understand the existing Payables application, its actual business process, database structure, and the exact root causes of data visibility issues, without breaking or redesigning anything.  
**Strict User Rule**: READ-ONLY AUDIT. DO NOT MODIFY CODE, SCHEMAS, OR PRODUCTION DATA WITHOUT EXPLICIT USER AUTHORIZATION.  

---

## 1. What the System Actually Does Today

The Payables module in NKB Formulation Management System (FMS) serves as the **Executive Cheque Disbursement & Accounts Payable Approval Queue**.
- **Role in the Enterprise**:
  It aggregates disbursement requests originating from `my.nkbmanufacturing.com` (Main corporate operations) and `pc.nkbmanufacturing.com` (Petty Cash replenishments), as well as third-party webhooks.
- **Key User Journey**:
  1. The Chief Operating Officer (COO) or executive reviewer opens `Payable Approvals` in the web application (`src/pages/PayableApprovalsPage.jsx`).
  2. The screen loads pending, approved, and historical disbursements from the database.
  3. The reviewer inspects requisition numbers, payee/supplier names, amounts due, itemized line items, and supporting PDF/image invoice vouchers.
  4. To approve a request, the reviewer **must provide a physical Cheque Number** (`cheque_number`).
  5. Submitting approval updates the database status to `CONFIRMED`, records `coo_confirmed_at`, and makes an outbound notification to the originating portal (`POST /payables/:id/confirm`).

---

## 2. Technical Stack & Component Topology

```
+---------------------------------------------------------------------------------+
|                                 FRONTEND (SPA)                                  |
|  React 18 + Vite + Tailwind CSS                                                 |
|  - Page Component: src/pages/PayableApprovalsPage.jsx                           |
|  - Authenticated Fetch Utility: src/services/api.js (apiFetch)                  |
|  - Routing: Local state-driven (src/App.jsx, no React Router)                  |
+---------------------------------------------------------------------------------+
                                       |
                                       | HTTP REST API (/api/v1/payables)
                                       v
+---------------------------------------------------------------------------------+
|                                 BACKEND SERVER                                  |
|  Node.js (ESM) + Express.js                                                     |
|  - Router: server/routes/payables.js                                            |
|  - Service: server/services/PayableService.js                                   |
|  - Auth Middleware: authenticatePayablesAccess (JWT or x-api-key)               |
|  - Query Builder: Knex.js v3                                                    |
+---------------------------------------------------------------------------------+
                                       |
                      +----------------+----------------+
                      |                                 |
                      v                                 v
          [Local Development]                  [Production Hostinger]
          SQLite 3 database                    MariaDB / MySQL 8
          database/nkb_formulation.sqlite      Database: u335953510_fms_db
          (52 records: 50 test, 2 base)        (78 authentic records)
```

---

## 3. Database Schema at a Glance

Managed via Knex migrations `database/migrations/036_create_payables_tables.js` and `037_add_coo_confirmed_at_to_payables.js`:
- **`payables` Table**:
  - `id` (PK, INT AUTO_INCREMENT)
  - `payable_number` (VARCHAR, UNIQUE) — Requisition or cheque identifier (e.g. `REQ-2026-0891`, `CHQ-2026-001`)
  - `req_cheque_no` (VARCHAR, INDEX) — Source cheque number or requisition number
  - `company` & `company_code` (VARCHAR) — Legal entity (`NKB Manufacturing Corporation`, `NKB-PC`)
  - `payee_beneficiary` (VARCHAR) — Supplier, vendor, or custodian
  - `amount`, `total`, `amount_due` (DECIMAL 15,2) — Financial figures
  - `date`, `date_prepared`, `date_cheque_issued` (VARCHAR 50) — Transaction dates
  - `cheque_number` (VARCHAR 100) — Physical cheque number
  - `status` (VARCHAR 50) — Display status (`Approved`, `PENDING_COO_APPROVAL`, `Rejected`)
  - `coo_approval` (VARCHAR 50) — Normalized approval state (`CONFIRMED`, `PENDING_COO_APPROVAL`, `REJECTED`)
  - `checked_by` (VARCHAR 150) — Approver name (`Norvin Bella` / `COO`)
  - `coo_confirmed_at` (VARCHAR 50) — Timestamp when executive approved (added in Migration 037)
  - `attachment_url`, `files_json`, `items_json`, `raw_payload` (TEXT) — Hybrid embedded data and audit trail
- **`payable_items` Table**:
  - `id` (PK), `payable_id` (FK to `payables.id`), `payable_number` (INDEX)
  - `description`, `expense_category`, `quantity`, `cost`, `subtotal`, `total`, `vat`

---

## 4. Why Real Requests Were Missing: The Exact Root Cause

### Finding A: The 50 Synthetic Records
- A previous test probe generated 50 synthetic test records (`PB-202610-5001` through `PB-202610-5050`, payee `FMS SYNC TEST CHEMICAL CORP`) in the database.
- These synthetic records have been code-filtered out from both backend and frontend (`PB-202610-%` and `FMS SYNC TEST`), but the physical rows remain in the table because the user did not authorize their permanent deletion yet.

### Finding B: Local SQLite vs Production Hostinger
- When running locally without connecting to Hostinger MySQL, the application reads `database/nkb_formulation.sqlite`.
- In SQLite, there are only the 50 synthetic records and 2 baseline records (`REQ-2026-0891` and `REQ-2026-0895`).
- The 78 authentic corporate records (totaling ₱10,881,950.05) exist in the remote portal `my.nkbmanufacturing.com` and in production `u335953510_fms_db`.

### Finding C: The Auto-Sync Threshold Bypass
- In `server/routes/payables.js` line 846, the backend checks `isInitialEmpty = currentCount <= 2`.
- Because local SQLite had 52 total rows (due to the 50 synthetic records), `isInitialEmpty` was `false`.
- The server therefore **skipped automatic background sync on page load**. Because the 50 synthetic records were hidden by the filter, the user saw only the 2 baseline records.
- Triggering `POST /api/v1/payables/sync` or clicking **Manual Sync** (`sync=true`) in the UI forces a live pull from `my.nkbmanufacturing.com`.

---

## 5. Strict Guardrails for Future Modifications

When the user authorizes future changes or recovery execution, follow these strict rules:
1. **Never drop, truncate, or reset tables**: All operations must be surgical and non-destructive.
2. **Never expose secrets**: Database passwords, JWT secrets, and API keys must remain masked (`nkb_inv_live_6ae6***`).
3. **Preserve `coo_confirmed_at`**: Original approval timestamps must be written to `payables.coo_confirmed_at`, not just appended to `comments`.
4. **Use HTTPS only**: All outbound portal calls must target `https://my.nkbmanufacturing.com/api/v1/payables?limit=1000` (Port 443).
5. **Wait for explicit user authorization**: Do not run any delete, purge, or data modification until the user explicitly says to proceed.

---

## 6. Handover Documentation Package Location

All audit reports and technical specifications are located in the project directory under:

`payables-audit-handover/`
1. `01-APPLICATION-OVERVIEW.md` — High-level architecture, frameworks, and roles
2. `02-PAYABLES-BUSINESS-PROCESS.md` — End-to-end lifecycle, sequence diagram, and business rules
3. `03-DATABASE-SCHEMA.md` — Entity-relationship diagram, table definitions, and constraints
4. `04-API-ENDPOINTS.md` — Complete HTTP route specification, payloads, and responses
5. `05-FRONTEND-BACKEND-DATA-FLOW.md` — React state flow, polling, and UI components
6. `06-REAL-REQUEST-INVESTIGATION.md` — Root cause forensic analysis of missing real requests
7. `07-EXISTING-FEATURES-AND-DEPENDENCIES.md` — Features inventory, npm packages, and settings
8. `08-KNOWN-ISSUES-AND-EVIDENCE.md` — Confirmed edge cases, bottlenecks, and evidence
9. `09-FILES-AND-FUNCTION-MAP.md` — Exhaustive source code line ranges and method signatures
10. `10-CHATGPT-HANDOVER-SUMMARY.md` — This master executive summary
