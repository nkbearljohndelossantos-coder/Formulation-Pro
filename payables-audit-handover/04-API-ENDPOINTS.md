# 04 — API ENDPOINTS & INTERFACE SPECIFICATION

**Router Prefix**: Mounted at both `/api/payables` and `/api/v1/payables` in `server/index.js` lines 135-136.  
**Router Source File**: `server/routes/payables.js`  
**Authentication Middleware**: `authenticatePayablesAccess` (Dual JWT or `x-api-key`) and `authenticateToken` (Internal user session).  

---

## 1. Summary of All Endpoints

| HTTP Method | Route | Auth Middleware | Scopes Required | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/payables` | `authenticatePayablesAccess` | `payables:read` | List payables with filtering, search, and automatic portal sync |
| `POST` | `/api/v1/payables` | `authenticatePayablesAccess` | `payables:create` | Ingest single payable into database with deduplication |
| `GET` | `/api/v1/payables/:id` | `authenticatePayablesAccess` | `payables:read` | Retrieve single payable details (with remote fallback) |
| `POST` | `/api/v1/payables/:id/confirm` | `authenticateToken` | User Session | Executive confirmation / rejection with cheque number |
| `DELETE`| `/api/v1/payables/:id` | `authenticatePayablesAccess` | `payables:confirm` / Admin | Delete payable from database |
| `POST` | `/api/v1/payables/sync` | `authenticatePayablesAccess` | `payables:read` / User | Manually force sync from external portals |
| `POST` | `/api/v1/payables/webhook` | `authenticatePayablesAccess` | `payables:create` | Batch ingestion endpoint for external webhooks |
| `GET` | `/api/v1/payables/config` | Public / Session | None | Read active portal URLs and masked API keys |
| `POST` | `/api/v1/payables/config` | `authenticatePayablesAccess` | Admin / User | Update portal API keys or endpoint URLs |
| `GET` | `/api/v1/payables/attachment-proxy`| Open / Internal | None | Stream inline PDF or image attachments |
| `GET` | `/api/v1/payables/api-keys` | `authenticateToken` | User Session | List all registered external API keys |
| `POST` | `/api/v1/payables/api-keys` | `authenticateToken` | User Session | Generate or register new external API key |
| `PUT` | `/api/v1/payables/api-keys/:id` | `authenticateToken` | User Session | Edit API key name, client app, token, or scopes |
| `PATCH`| `/api/v1/payables/api-keys/:id/toggle` | `authenticateToken`| User Session | Toggle API key active/revoked |
| `DELETE`| `/api/v1/payables/api-keys/:id` | `authenticateToken`| User Session | Delete registered external API key |

---

## 2. Detailed Endpoint Specifications

### 2.1 `GET /api/v1/payables`
- **Description**: Returns all payable approval records matching query parameters.
- **Query Parameters**:
  - `status` (string): Filter by approval status (`ALL`, `PENDING`, `CONFIRMED`, `REJECTED`).
  - `portal` (string): Filter by portal domain (`ALL`, `my.nkbmanufacturing.com`, `pc.nkbmanufacturing.com`).
  - `search` (string): Substring search across requisition #, payee, bank, purpose, cheque #, etc.
  - `date_cheque_from` / `date_cheque_to` (YYYY-MM-DD): Filter by cheque date.
  - `date_prepared_from` / `date_prepared_to` (YYYY-MM-DD): Filter by preparation date.
  - `sync` (boolean): If `'true'`, triggers a synchronous portal pull before returning records.
- **Response Format (200 OK)**:
```json
{
  "success": true,
  "source": "DATABASE_QUEUE",
  "totalCount": 2,
  "portalsActive": {
    "my": "nkb_inv_li...",
    "pc": "nkb_live_f..."
  },
  "data": [
    {
      "id": 1,
      "payable_number": "REQ-2026-0891",
      "req_cheque_no": "REQ-2026-0891",
      "company": "NKB Manufacturing Corporation",
      "payee_beneficiary": "Brenntag Ingredients Philippines Inc.",
      "amount": 145850.00,
      "total": 145850.00,
      "status": "Approved",
      "coo_approval": "CONFIRMED",
      "cheque_number": "CHK-881920",
      "source_portal": "my.nkbmanufacturing.com",
      "source_badge": "my.nkb",
      "items": [
        {
          "description": "Perfume Grade Pure Denatured Ethyl Alcohol 96%",
          "quantity": 5,
          "cost": 12500.00,
          "subtotal": 62500.00
        }
      ]
    }
  ]
}
```

---

### 2.2 `POST /api/v1/payables`
- **Description**: Ingests a new payable record from an external portal or integration.
- **Request Headers**:
  - `x-api-key`: Valid API key with `payables:create` scope.
  - `idempotency-key` (optional): Unique key to guarantee single submission.
- **Request Body**:
```json
{
  "payable_number": "REQ-2026-0905",
  "payee_name": "Symrise Philippines Inc.",
  "company_name": "NKB Manufacturing Corporation",
  "category": "Direct Fragrance Materials",
  "amount": 250000.00,
  "purpose": "Odorants & Fragrance Concentrate",
  "bank_name": "BDO - 0080-5801-0547",
  "line_items": [
    {
      "description": "Sensual Amber Aroma Base 25kg",
      "quantity": 1,
      "cost": 250000.00,
      "subtotal": 250000.00
    }
  ]
}
```
- **Response Format (201 Created or 200 Duplicate)**:
```json
{
  "success": true,
  "message": "Payable request REQ-2026-0905 from my.nkbmanufacturing.com successfully submitted for COO approval.",
  "is_duplicate": false,
  "source_portal": "my.nkbmanufacturing.com",
  "data": { "id": 55, "payable_number": "REQ-2026-0905", "status": "PENDING_COO_APPROVAL" }
}
```

---

### 2.3 `POST /api/v1/payables/:id/confirm`
- **Description**: Submits the executive decision (approval or rejection) with a mandatory cheque number for approvals.
- **Request Body**:
```json
{
  "decision": "CONFIRMED",
  "cheque_number": "CHK-0091823",
  "notes": "Verified against delivery invoice and approved by COO.",
  "confirmed_by": "Norvin Bella"
}
```
- **Validation Rules**:
  - `decision` must be either `'CONFIRMED'` or `'REJECTED'`.
  - If `decision === 'CONFIRMED'`, `cheque_number` is required and cannot be empty.
- **Response Format (200 OK)**:
```json
{
  "success": true,
  "decision": "CONFIRMED",
  "cheque_number": "CHK-0091823",
  "portal": "my.nkbmanufacturing.com",
  "remoteSuccess": true,
  "message": "Payable REQ-2026-0905 (my.nkbmanufacturing.com) successfully APPROVED with Check #CHK-0091823.",
  "data": { "id": 55, "status": "CONFIRMED", "cheque_number": "CHK-0091823" }
}
```

---

### 2.4 `POST /api/v1/payables/sync`
- **Description**: Forces immediate synchronization across both portals (`pc.nkbmanufacturing.com` and `my.nkbmanufacturing.com`).
- **Response Format (200 OK)**:
```json
{
  "success": true,
  "message": "Synchronized payables: 0 Petty Cash records, 78 Main Portal records.",
  "results": { "pc": 0, "my": 78, "errors": [] },
  "totalCount": 80,
  "data": [ ... ]
}
```

---

### 2.5 `GET /api/v1/payables/attachment-proxy?url=<url>`
- **Description**: Server-side streaming proxy for external PDFs and images.
- **Security Check**: Enforces domain restriction (`url` must contain `nkbmanufacturing.com`) to prevent open proxy vulnerabilities [VERIFIED: `server/routes/payables.js` line 394].
- **Headers Returned**: `Content-Type: application/pdf` (or image type), `Content-Disposition: inline`.
