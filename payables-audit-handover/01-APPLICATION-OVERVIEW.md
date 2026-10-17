# 01 — APPLICATION OVERVIEW & ARCHITECTURE AUDIT

**System Name**: NKB Enterprise Formulation Management System (FMS) / Formulation-Pro  
**Subsystem Audited**: Payable Approvals & External Portals Ingestion Engine  
**Audit Mode**: READ-ONLY Inspection & Architecture Documentation  
**Audit Date**: October 17, 2026  

---

## 1. System Summary & Purpose

The NKB Formulation Management System (FMS) is a full-stack enterprise web application designed for cosmetic, perfume, and food supplement manufacturing. Within this platform, the **Payable Approvals** module functions as a centralized executive approval queue for cheque disbursements and accounts payable originating from multiple corporate systems:
1. **`my.nkbmanufacturing.com`** (Main corporate operations & inventory portal)
2. **`pc.nkbmanufacturing.com`** (Petty Cash disbursement & branch replenishment portal)
3. **External WebApps & Webhooks** (e-Commerce, logistics, branch portals submitting via Developer REST API / Webhook with scoped API keys)

The Chief Operating Officer (COO) and designated executive reviewers use this module to inspect, verify supporting documents, assign physical or printed cheque numbers, and execute official approval or rejection decisions that sync back to the source systems.

---

## 2. Frontend Framework & Architecture

- **Core Library**: React 18 (`react`, `react-dom`) [VERIFIED: `package.json` line 26]
- **Build Tool / Bundler**: Vite 5 (`vite`, `@vitejs/plugin-react`) [VERIFIED: `package.json` line 44, `vite.config.js`]
- **Styling**: Tailwind CSS 3.4 (`tailwindcss`, `postcss`, `autoprefixer`) [VERIFIED: `tailwind.config.js`]
- **Iconography**: Lucide React (`lucide-react` v0.344.0) [VERIFIED: `package.json` line 25]
- **Routing Pattern**: Single-Page Application (SPA) driven by local state navigation (`currentPage` state in `src/App.jsx`). The routing does not use React Router; instead, page switches occur via state passed through React components [VERIFIED: `src/App.jsx` lines 46-245].
- **HTTP Client**: Custom fetch wrapper `apiFetch` (`src/services/api.js`) which automatically attaches `Authorization: Bearer <token>` from `localStorage` (`nkb_access_token`) and handles silent JWT refresh via `/api/v1/auth/refresh` on 401 Unauthorized [VERIFIED: `src/services/api.js` lines 8-65].

---

## 3. Backend Framework & Architecture

- **Runtime**: Node.js (ES Modules, `type: "module"` in `package.json`) [VERIFIED: `package.json` line 6]
- **Server Framework**: Express.js 4 (`express`) mounted via CJS interop helper `server/cjsRequire.js` [VERIFIED: `server/index.js` lines 4, 42]
- **Database Abstraction**: Knex.js v3 (`knex`) query builder [VERIFIED: `server/db.js`, `server/knexfile.js`]
- **Database Engines Supported**:
  - **SQLite3** (`database/nkb_formulation.sqlite`) — Default in local development (`NODE_ENV=development` without `DB_CLIENT=mysql2`) [VERIFIED: `server/knexfile.js` lines 30-47].
  - **MySQL / MariaDB** (`mysql2` client) — Used in production (`NODE_ENV=production` or `DB_CLIENT=mysql2`) connecting to Hostinger MySQL database (`u335953510_fms_db`) [VERIFIED: `server/knexfile.js` lines 68-87].
- **Security & Infrastructure**:
  - `helmet` (content security policy disabled for inline assets) [VERIFIED: `server/index.js` line 62]
  - `cors` with credentials enabled [VERIFIED: `server/index.js` line 63]
  - `express-rate-limit` (2,000 requests per 15 minutes per IP on `/api/`) [VERIFIED: `server/index.js` lines 69-74]
  - Idempotency middleware (`server/middleware/idempotency.js`) [VERIFIED: `server/index.js` line 66]
  - Structured audit trail logger (`server/middleware/audit.js`) [VERIFIED: `server/routes/payables.js` line 7]

---

## 4. Authentication & Authorization Hierarchy

The application enforces a dual-track authentication strategy for Payables:

### Track A: User Session Authentication (Internal Web App)
- Users log in via `/api/v1/auth/login` receiving an access JWT (expires in 15m) and a refresh token (expires in 7d).
- Protected API routes call `authenticateToken` (`server/middleware/auth.js`), which verifies the JWT, checks `is_active = 1` in `users`, and loads assigned roles from `user_roles` and `roles`.
- Role-based UI visibility in `src/App.jsx` and `src/components/Sidebar.jsx`:
  - **Super Admin** / **Admin**: Full access to all modules including Payable Approvals.
  - **Purchasing Department**: Restricted navigation allowing `payable-approvals`, `purchasing-tickets`, `inventory`, `materials-list`, `material-logbook`, and `inventory-costing` [VERIFIED: `src/App.jsx` lines 107-115, `src/components/Sidebar.jsx` lines 196-220].
  - **Compounding Operator**, **QC Specialist**, **Requestor**, **Inventory Account**: Blocked from Payable Approvals by navigation guards [VERIFIED: `src/App.jsx` lines 83-122].

### Track B: Multi-API Key Authentication (External Portals & Webhooks)
- External systems accessing `/api/v1/payables` can authenticate using an API key passed in headers (`x-api-key`, `x-nkb-api-key`, `apikey`, `token`) or query parameters [VERIFIED: `server/routes/payables.js` lines 242-260].
- Scopes supported in `api_keys.scopes`:
  - `payables:read` — Authorizes `GET /api/v1/payables` and `GET /api/v1/payables/:id`
  - `payables:create` — Authorizes `POST /api/v1/payables` and `POST /api/v1/payables/webhook`
  - `payables:confirm` — Authorizes `POST /api/v1/payables/:id/confirm`
  - `*` — Wildcard access across all payable operations

---

## 5. Payables Module Source Map

| File Path | Role & Responsibility | Status |
| :--- | :--- | :--- |
| `src/pages/PayableApprovalsPage.jsx` | Main React UI: Master List, Voucher Detail View, Quick Approval Modal, Attachment Viewer, API Key Manager modal | [VERIFIED] |
| `server/routes/payables.js` | Express Router: Endpoints for listing, syncing, creating, confirming, deleting payables, API key CRUD, and attachment proxy | [VERIFIED] |
| `server/services/PayableService.js` | Business Logic: Table creation, baseline seeding, payload normalization, deduplication, SQL queries, status updates | [VERIFIED] |
| `server/scripts/sync_pc_payables.js` | Standalone CLI reconciliation script for pulling records from `u335953510_pc_db` and external APIs | [VERIFIED] |
| `database/migrations/036_create_payables_tables.js` | Knex migration defining `payables` and `payable_items` schemas | [VERIFIED] |
| `database/migrations/037_add_coo_confirmed_at_to_payables.js` | Knex migration adding `coo_confirmed_at` column | [VERIFIED] |
| `server/db.js` & `server/knexfile.js` | Database connection lifecycle, dual SQLite / MySQL client configuration | [VERIFIED] |

---

## 6. External Integrations & Boundary Systems

1. **`https://my.nkbmanufacturing.com`** (Main Portal):
   - Outbound REST pull: `GET /api/v1/payables?limit=1000` or fallback `GET /api/v1/cheque-payables`
   - Outbound decision push: `POST /api/v1/payables/:id/confirm`
   - Default built-in credential: `nkb_inv_live_6ae6***` / `nkb_live_317a***` [VERIFIED: `server/routes/payables.js` lines 14-18]
2. **`https://pc.nkbmanufacturing.com`** (Petty Cash Portal):
   - Outbound REST pull: `GET /api/payables`
   - Cross-database MySQL ingestion: Direct SELECT on `u335953510_pc_db.payables` when co-located on Hostinger [VERIFIED: `server/routes/payables.js` lines 756-780]
   - Outbound decision push: `POST /api/payables/:id/confirm`
   - Default built-in credential: `nkb_live_f1d0***` [VERIFIED: `server/routes/payables.js` line 16]
