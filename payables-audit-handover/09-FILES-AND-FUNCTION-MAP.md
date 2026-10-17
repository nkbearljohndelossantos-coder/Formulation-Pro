# 09 — FILES & FUNCTION MAP (PAYABLES SUBSYSTEM)

**Scope**: Exhaustive Reference of Files, Functions, Signatures & Line Ranges  
**Audit Standard**: Codebase Verification  

---

## 1. Backend Core Files & Functions

### `server/services/PayableService.js` [VERIFIED: 936 Lines]

| Function / Method | Line Range | Signature / Parameters | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| `extractDateFromText` | L6–L22 | `(text: string) => string \| null` | Regex-based date parser extracting YYYY-MM-DD from ISO, slash formats, and month names |
| `formatPayableItem` | L27–L189 | `(p: object, defaultSource?: string) => object` | Normalizes heterogeneous portal payloads into standard FMS data model |
| `ensurePayablesTables` | L196–L287 | `() => Promise<void>` | Auto-creates `payables` and `payable_items` tables if missing, adds `coo_confirmed_at` column, and invokes seed if empty |
| `seedBaselinePayables`| L292–L406 | `() => Promise<void>` | Inserts baseline historical payables (`REQ-2026-0891` Brenntag, `REQ-2026-0895` San Miguel) |
| `parseCleanAmount` | L411–L417 | `(val: any) => number` | Robust currency/comma string-to-float parser |
| `normalizeIncomingPayload`| L422–L570 | `(body: object, req?: object) => object` | Prepares incoming JSON for database insertion, mapping payees, amounts, and dates |
| `createPayable` | L575–L720 | `(body: object, req?: object) => Promise<object>` | Validates, deduplicates via idempotency keys, and transactionally inserts into `payables` and `payable_items` |
| `formatDbRow` | L725–L748 | `(row: object) => object` | Parses `items_json` and `files_json` columns from raw SQL row |
| `getPayables` | L753–L868 | `(query?: object) => Promise<Array>` | Multi-criteria query builder filtering status, portal, dates, and search while isolating test probes |
| `getPayableById` | L873–L883 | `(id: string \| number) => Promise<object \| null>` | Fetches single record by ID, `payable_number`, or `req_cheque_no` |
| `confirmPayable` | L888–L917 | `(id: any, { decision, cheque_number, notes, confirmed_by }) => Promise<object>` | Commits executive decision, records cheque number, and sets `coo_confirmed_at` |
| `deletePayable` | L922–L934 | `(id: any) => Promise<boolean>` | Deletes child lines and parent payable record |

---

### `server/routes/payables.js` [VERIFIED: 1157 Lines]

| Function / Handler | Line Range | Route / Signature | Responsibility |
| :--- | :--- | :--- | :--- |
| `getActivePortalKey` | L30–L51 | `(portalId: string) => Promise<string>` | Retrieves current portal API key from `system_settings` or `api_keys` |
| `updateOrCreatePortalKey`| L53–L94 | `(domain: string, newKey: string) => Promise<void>` | Persists updated API key into `system_settings` and `api_keys` |
| `nkbApiRequest` | L120–L230 | `(method, endpointPath, apiKey, bodyData, targetHost, redirectCount) => Promise` | Low-level HTTPS/HTTP client handling 301/302 redirects and auth headers |
| `authenticatePayablesAccess`| L242–L377| `(req, res, next) => void` | Dual middleware checking API keys against `api_keys` table or falling back to user JWT |
| Attachment Proxy | L385–L415 | `GET /api/v1/payables/attachment-proxy` | Streams external PDF/image files inline with domain whitelist check |
| Config GET | L421–L457 | `GET /api/v1/payables/config` | Returns portal URLs and masked API keys |
| Config POST | L463–L528 | `POST /api/v1/payables/config` | Updates portal API keys and endpoint URLs |
| API Keys GET | L540–L564 | `GET /api/v1/payables/api-keys` | Lists all registered external developer API keys |
| API Keys POST | L570–L623 | `POST /api/v1/payables/api-keys` | Generates a new API key with custom scopes |
| API Keys Toggle | L629–L652 | `PATCH /api/v1/payables/api-keys/:id/toggle` | Toggles API key active/revoked status |
| API Keys PUT | L658–L705 | `PUT /api/v1/payables/api-keys/:id` | Modifies API key name, client app, token, or scopes |
| API Keys DELETE | L711–L733 | `DELETE /api/v1/payables/api-keys/:id` | Removes non-master API key |
| `syncExternalPortalsSafe`| L751–L832| `() => Promise<object>` | Ingests records via MySQL cross-query (`u335953510_pc_db`) or HTTP REST APIs |
| Payables List | L838–L891 | `GET /api/v1/payables` | Opportunistic sync + persistent database query |
| Payables Manual Sync | L897–L911 | `POST /api/v1/payables/sync` | Explicit sync route |
| Payables Create | L918–L949 | `POST /api/v1/payables` | Ingestion endpoint for external apps |
| Payables Delete | L955–L969 | `DELETE /api/v1/payables/:id` | Deletion endpoint |
| Payables Get Detail | L975–L1022 | `GET /api/v1/payables/:id` | Single record fetch with remote fallback |
| Payables Confirm | L1028–L1108| `POST /api/v1/payables/:id/confirm` | Executive approval/rejection with cheque # and outbound notification |
| Payables Webhook | L1115–L1154| `POST /api/v1/payables/webhook` | Batch webhook ingestion |

---

## 2. Frontend Core Files & Functions

### `src/pages/PayableApprovalsPage.jsx` [VERIFIED: 3055 Lines]

| Function / Handler | Line Range | Responsibility |
| :--- | :--- | :--- |
| `fetchApiKeysList` | L133–L146 | Loads developer API keys for the API Key Manager modal |
| `handleCreateApiKey` | L154–L184 | Submits form to create a new scoped API key |
| `handleToggleApiKey` | L186–L200 | Toggles active status of an external API key |
| `handleDeleteApiKey` | L202–L219 | Confirms and deletes an external API key |
| `fetchPayables` | L229–L267 | Fetches records from `/api/v1/payables` with non-blocking refresh |
| `fetchConfig` | L269–L283 | Loads active portal settings and URLs |
| `handleSaveApiKey` | L300–L329 | Saves updated portal configurations |
| `handleOpenDetail` | L373–L380 | Opens the full-page payment voucher view |
| `handleConfirmDecision` | L383–L430 | Submits executive decision from the full voucher screen |
| `handleExecuteQuickAction`| L433–L473 | Submits quick decision from table row modal |
| `toggleRow` | L476–L481 | Expands/collapses child lines for a specific payable row |
| `expandAllRows` / `collapseAllRows` | L483–L494 | Batch toggles all rows in the table |
| `clearDateFilters` | L496–L502 | Clears active date filter inputs |
| `applyDatePreset` | L504–L523 | Applies `'today'`, `'last7'`, or `'thisMonth'` date presets |
| `extractDateFromText` | L526–L539 | Client-side copy of intelligent date extractor |
| `getChequeDateInfo` | L542–L557 | Resolves active Date Cheque Issued, prioritizing description dates |
| `resolveAttachmentUrl`| L560–L573 | Normalizes attachment links to HTTPS and absolute URLs |
| `handleOpenAttachment`| L586–L605 | Opens PDF/image in the Interactive Attachment Viewer |
| `filteredPayables` | L610–L694 | Memoized selector applying search, status, portal, and date filters |
| `window.print()` | L762 | Invokes browser print dialog for the voucher |
