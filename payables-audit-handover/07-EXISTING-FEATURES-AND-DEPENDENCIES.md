# 07 — EXISTING FEATURES & DEPENDENCY AUDIT

**System**: NKB Enterprise Formulation Management System (FMS)  
**Scope**: Module Features, Libraries, Hardware & Network Dependencies  
**Audit Standard**: Verified from `package.json`, Source Code & Configuration  

---

## 1. Complete Feature Inventory

### Feature 1: Dual-Portal Support (my.nkb & pc.nkb) [VERIFIED]
- **Implementation**: `NKB_PORTALS` constant and dynamic portal key handlers in `server/routes/payables.js`.
- **Capability**: Connects simultaneously to `my.nkbmanufacturing.com` (Commercial Cheque Disbursements) and `pc.nkbmanufacturing.com` (Petty Cash Replenishments).
- **UI Element**: Visual portal badges (`my.nkb` in blue, `pc.nkb` in purple) and a portal filter dropdown (`ALL`, `my.nkb`, `pc.nkb`).

### Feature 2: Multi-API Key Manager for External WebApps [VERIFIED]
- **Implementation**: Routes `/api/v1/payables/api-keys*`, table `api_keys`, modal in `PayableApprovalsPage.jsx`.
- **Capabilities**:
  - Lists registered API keys with masked tokens (`nkb_live_...`).
  - Generates new scoped API keys for external applications (e-commerce, logistics, branch apps).
  - Scope assignment: `payables:read`, `payables:create`, `payables:confirm`, or wildcard `*`.
  - Instant Revoke / Enable toggle (`PATCH /api/v1/payables/api-keys/:id/toggle`).
  - Interactive Documentation Tab with copyable cURL and Node.js fetch code snippets.

### Feature 3: Executive Cheque Confirmation & Decision Engine [VERIFIED]
- **Implementation**: `POST /api/v1/payables/:id/confirm`, `PayableService.confirmPayable()`.
- **Capabilities**:
  - Two UI entry points: Quick Action modal from table row or Full Voucher screen.
  - Strict validation: Cheque Number is mandatory for approval.
  - Records approver name (`checked_by`), approval timestamp (`coo_confirmed_at`), and appends audit remarks (`comments`).
  - Outbound webhook/API notification transmitted to the external source portal.

### Feature 4: Expandable Nested Line Items [VERIFIED]
- **Implementation**: Table row expansion (`expandedRows` state) in `PayableApprovalsPage.jsx`.
- **Capabilities**:
  - Allows clicking chevron to reveal line item details without leaving the table.
  - Displays description, expense category, quantity, unit cost, subtotal, and individual item dates.
  - Features `Expand All` and `Collapse All` batch controls.

### Feature 5: Intelligent Cheque Date Extraction [VERIFIED]
- **Implementation**: `extractDateFromText()` in `PayableService.js` and `PayableApprovalsPage.jsx`.
- **Capabilities**:
  - Scans freeform description, comments, or line items for embedded dates (e.g. `'OCTOBER 1, 2026'`, `'10/8/2026'`, `'2026-10-09'`).
  - Prioritizes extracted dates for the `Date Cheque Issued` column so accounting schedules match actual cheque dates.
  - Displays an info badge when a date was intelligently extracted from text.

### Feature 6: Interactive Attachment Viewer & Streaming Proxy [VERIFIED]
- **Implementation**: `/api/v1/payables/attachment-proxy` and modal in `PayableApprovalsPage.jsx`.
- **Capabilities**:
  - Securely streams PDF invoices and image vouchers inline.
  - Solves CORS and hotlinking restrictions across corporate domains.
  - Domain-restricted to `*.nkbmanufacturing.com` for security.

### Feature 7: Printable Cheque Disbursement Voucher [VERIFIED]
- **Implementation**: `Printer` button invoking `window.print()` in `PayableApprovalsPage.jsx`.
- **Capabilities**:
  - Print-optimized CSS layout for physical archiving and hardcopy sign-off.
  - Itemized cost schedule, tax breakdown, and signature blocks.

### Feature 8: Automatic Real-Time Polling & Non-Blocking Refresh [VERIFIED]
- **Implementation**: 30-second interval polling (`autoSync` state) with `isBackgroundRefreshing`.
- **Capabilities**:
  - Refreshes approval queue in background without clearing the table or showing full-page skeleton loaders.
  - Toggleable switch in header allows disabling auto-sync when reviewing static data.

---

## 2. Package & Runtime Dependencies

### Production Dependencies (`package.json` lines 14-38) [VERIFIED]
- `express` (v4.21.2) — Core web server and routing.
- `knex` (v3.1.0) — SQL query builder and migration engine.
- `sqlite3` (v5.1.7) — Embedded database driver for development.
- `mysql2` (v3.12.0) — High-performance MySQL/MariaDB driver for production.
- `bcryptjs` (v2.4.3) — User password hashing.
- `jsonwebtoken` (v9.0.2) — JWT creation and authentication.
- `helmet` (v7.1.0) — HTTP response security headers.
- `cors` (v2.8.5) — Cross-origin resource sharing.
- `express-rate-limit` (v7.1.5) — Rate limiting protection.
- `dotenv` (v16.4.5) — Environment variable management.
- `lucide-react` (v0.344.0) — SVG icon library.

### Development Dependencies (`package.json` lines 39-51) [VERIFIED]
- `vite` (v5.4.21) — Modern frontend build tool and dev server.
- `@vitejs/plugin-react` (v4.3.1) — Vite React plugin with Fast Refresh.
- `tailwindcss` (v3.4.11) — Utility-first CSS framework.
- `vitest` (v1.6.1) — Unit and integration test runner.

---

## 3. Environment Variables & System Settings

The application reads configurations from `.env`, `.env.production`, and database table `system_settings`:

| Key / Variable | Source | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment | `'production'` or `'development'` |
| `DB_CLIENT` | Environment | `'mysql2'` or `'sqlite3'` |
| `DB_HOST` | Environment | Hostinger database host (default `127.0.0.1`) |
| `DB_PORT` | Environment | Database port (default `3306`) |
| `DB_USER` | Environment | MySQL database user |
| `DB_PASSWORD` | Environment | MySQL database password |
| `DB_NAME` | Environment | MySQL database name (`u335953510_fms_db`) |
| `JWT_ACCESS_SECRET` | Environment | Secret for signing access tokens |
| `nkb_payables_my_api_key` | `system_settings` | Active API key for `my.nkbmanufacturing.com` |
| `nkb_payables_pc_api_key` | `system_settings` | Active API key for `pc.nkbmanufacturing.com` |
| `nkb_payables_my_api_url` | `system_settings` | Target URL for Main Portal API |
| `nkb_payables_pc_api_url` | `system_settings` | Target URL for Petty Cash API |
