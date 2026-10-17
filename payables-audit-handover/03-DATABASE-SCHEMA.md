# 03 — DATABASE SCHEMA & ENTITY RELATIONSHIPS AUDIT

**Database Systems**: SQLite 3 (Development) / MariaDB & MySQL 8 (Production Hostinger)  
**Schema Definition**: Managed via Knex.js migrations (`database/migrations/`)  
**Audit Standard**: Code & Schema Verification  

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    payables ||--o{ payable_items : "contains line items"
    api_keys ||--o{ payables : "created via api key (optional)"
    system_settings ||--o{ payables : "configures portal connection"
    audit_logs ||--o{ payables : "records approval actions"

    payables {
        int id PK "auto-increment"
        varchar payable_number UK "Unique requisition / payable number"
        varchar req_cheque_no INDEX "Requisition or cheque number reference"
        varchar external_reference INDEX "Source portal external reference"
        varchar idempotency_key INDEX "Unique request idempotency key"
        varchar source_portal "Source domain (my.nkb... or pc.nkb...)"
        varchar source_system "Full source system URL"
        varchar source_badge "Badge label: 'my.nkb' | 'pc.nkb'"
        varchar company "Paying legal corporate entity"
        varchar company_code "Entity code (NKB, NKB-PC)"
        varchar payee_beneficiary "Vendor / Supplier / Beneficiary"
        varchar category "Expense or payable category"
        varchar bank_account "Disbursing bank account"
        text purpose_usage "Description or usage of disbursement"
        decimal amount "Header total payable amount (15,2)"
        decimal total "Total amount (15,2)"
        decimal amount_due "Amount due for settlement (15,2)"
        decimal subtotal "Subtotal excluding VAT (15,2)"
        decimal vat "VAT amount (15,2)"
        decimal vat_zero_rated "VAT zero-rated amount (15,2)"
        decimal non_vat "Non-VAT amount (15,2)"
        decimal withheld "Withheld tax amount (15,2)"
        varchar date "General transaction date string"
        varchar date_prepared "Date prepared in source portal"
        varchar date_cheque_issued "Date physical cheque was issued"
        varchar cheque_date "Cheque transaction date"
        varchar cheque_number "Physical cheque number"
        varchar control_number "Internal source control number"
        varchar invoice_number "Supplier sales invoice reference"
        varchar invoice_date "Supplier invoice date"
        varchar due_date "Payment due date"
        varchar term "Payment terms (e.g. Net 30)"
        varchar status "Approval status string"
        varchar coo_approval "COO approval status: PENDING_COO_APPROVAL | CONFIRMED | REJECTED"
        varchar checked_by "Name / title of executive reviewer"
        varchar coo_confirmed_at INDEX "Timestamp of COO confirmation (Added in Migration 037)"
        varchar prepared_by "Name of requestor / preparer"
        varchar created_by "Creator name or system identifier"
        text attachment_url "Primary attachment URL"
        text files_json "JSON array of supporting attachment URLs"
        text items_json "JSON array of itemized expense rows"
        text comments "Executive remarks and audit history"
        int api_key_id "Reference to api_keys table"
        text raw_payload "Original untouched JSON payload"
        timestamp created_at "Record creation timestamp"
        timestamp updated_at "Record last update timestamp"
    }

    payable_items {
        int id PK "auto-increment"
        int payable_id FK "FK to payables.id"
        varchar payable_number INDEX "Parent payable number"
        text description "Line item description"
        varchar expense_category "Itemized expense category"
        decimal quantity "Quantity (12,4)"
        decimal cost "Unit cost (15,2)"
        decimal subtotal "Line subtotal (15,2)"
        decimal total "Line total (15,2)"
        decimal vat "VAT portion (15,2)"
        boolean inclusive "Whether cost is VAT-inclusive"
        varchar date "Line item specific date"
        timestamp created_at "Creation timestamp"
        timestamp updated_at "Update timestamp"
    }

    api_keys {
        int id PK "auto-increment"
        varchar key_name "Friendly identifier name"
        varchar client_app "Client domain or application identifier"
        varchar api_key UK "Secret API Key token (e.g. nkb_live_...)"
        varchar scopes "Comma-separated permissions: payables:read,create,confirm"
        tinyint is_active "1 = Active, 0 = Revoked"
        int rate_limit_rpm "Rate limit requests per minute (default 120)"
        timestamp last_used_at "Last authenticated request timestamp"
        timestamp created_at "Creation timestamp"
        timestamp updated_at "Update timestamp"
    }

    system_settings {
        int id PK "auto-increment"
        varchar key UK "Setting key name (e.g. nkb_payables_my_api_key)"
        text value "Configured value (encrypted or plain text)"
        text description "Setting description"
        timestamp created_at "Creation timestamp"
        timestamp updated_at "Update timestamp"
    }
```

---

## 2. Table Schemas & Column Specifications

### Table: `payables` [VERIFIED: Migrations 036 & 037]

| Column Name | Data Type | Nullable | Default | Index / Constraint | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `increments` (INT) | NO | PK | Primary Key | Internal surrogate key |
| `payable_number` | `VARCHAR(100)` | NO | None | UNIQUE | Unique business identifier (e.g. `REQ-2026-0891`, `CHQ-2026-001`) |
| `req_cheque_no` | `VARCHAR(100)` | YES | NULL | INDEX | Cheque or requisition identifier reference |
| `external_reference`| `VARCHAR(150)` | YES | NULL | INDEX | Source portal reference number |
| `idempotency_key` | `VARCHAR(150)` | YES | NULL | INDEX | Client-provided idempotency key |
| `source_portal` | `VARCHAR(100)` | YES | `'my.nkbmanufacturing.com'` | None | Originating portal domain |
| `source_system` | `VARCHAR(255)` | YES | NULL | None | Originating portal URL |
| `source_badge` | `VARCHAR(50)` | YES | `'my.nkb'` | None | Short UI pill badge |
| `company` | `VARCHAR(255)` | NO | None | None | Legal company name |
| `company_code` | `VARCHAR(50)` | YES | NULL | None | Short company code (`NKB`, `NKB-PC`) |
| `payee_beneficiary`| `VARCHAR(255)` | NO | None | None | Beneficiary vendor or entity |
| `category` | `VARCHAR(150)` | YES | NULL | None | Expense category |
| `bank_account` | `VARCHAR(150)` | YES | NULL | None | Bank account for disbursement |
| `purpose_usage` | `TEXT` | YES | NULL | None | Purpose / justification |
| `amount` | `DECIMAL(15,2)` | NO | `0.00` | None | Gross transaction amount |
| `total` | `DECIMAL(15,2)` | NO | `0.00` | None | Total payable amount |
| `amount_due` | `DECIMAL(15,2)` | NO | `0.00` | None | Amount due |
| `subtotal` | `DECIMAL(15,2)` | YES | `0.00` | None | Amount net of VAT |
| `vat` | `DECIMAL(15,2)` | YES | `0.00` | None | VAT value |
| `vat_zero_rated` | `DECIMAL(15,2)` | YES | `0.00` | None | Zero-rated sales portion |
| `non_vat` | `DECIMAL(15,2)` | YES | `0.00` | None | Non-VAT sales portion |
| `withheld` | `DECIMAL(15,2)` | YES | `0.00` | None | Expanded withholding tax |
| `date` | `VARCHAR(50)` | YES | NULL | None | Transaction date |
| `date_prepared` | `VARCHAR(50)` | YES | NULL | None | Preparation date |
| `date_cheque_issued`| `VARCHAR(50)` | YES | NULL | None | Cheque release date |
| `cheque_date` | `VARCHAR(50)` | YES | NULL | None | Date printed on cheque |
| `cheque_number` | `VARCHAR(100)` | YES | NULL | None | Actual cheque number issued |
| `control_number` | `VARCHAR(100)` | YES | NULL | None | Source control number |
| `invoice_number` | `VARCHAR(100)` | YES | NULL | None | Supplier sales invoice number |
| `invoice_date` | `VARCHAR(50)` | YES | NULL | None | Supplier invoice date |
| `due_date` | `VARCHAR(50)` | YES | NULL | None | Settlement due date |
| `term` | `VARCHAR(100)` | YES | `'Net 30'` | None | Credit term |
| `status` | `VARCHAR(50)` | YES | `'PENDING_COO_APPROVAL'` | None | Operational status string |
| `coo_approval` | `VARCHAR(50)` | YES | `'PENDING_COO_APPROVAL'` | None | Normalized executive decision |
| `checked_by` | `VARCHAR(150)` | YES | NULL | None | Approver name |
| `coo_confirmed_at` | `VARCHAR(50)` | YES | NULL | INDEX | Exact timestamp of COO confirmation (Added Migration 037) |
| `prepared_by` | `VARCHAR(150)` | YES | NULL | None | Preparer name |
| `created_by` | `VARCHAR(150)` | YES | NULL | None | Submitter / creator |
| `attachment_url` | `TEXT` | YES | NULL | None | Supporting voucher URL |
| `files_json` | `TEXT` | YES | NULL | None | Array of supporting attachments |
| `items_json` | `TEXT` | YES | NULL | None | Array of item lines |
| `comments` | `TEXT` | YES | NULL | None | Executive notes / audit trail log |
| `api_key_id` | `INT` | YES | NULL | None | Submitting API key ID |
| `raw_payload` | `TEXT` | YES | NULL | None | Verbatim original payload JSON |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Creation timestamp |
| `updated_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Modification timestamp |

---

### Table: `payable_items` [VERIFIED: Migration 036]

| Column Name | Data Type | Nullable | Default | Index / Constraint | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `increments` (INT) | NO | PK | Primary Key | Surrogate item ID |
| `payable_id` | `INT UNSIGNED` | YES | NULL | FK | Foreign key to `payables.id` |
| `payable_number` | `VARCHAR(100)` | YES | NULL | INDEX | Parent payable number reference |
| `description` | `TEXT` | YES | NULL | None | Itemized goods/service description |
| `expense_category`| `VARCHAR(150)` | YES | NULL | None | Expense classification |
| `quantity` | `DECIMAL(12,4)` | YES | `1.0000` | None | Billed quantity |
| `cost` | `DECIMAL(15,2)` | YES | `0.00` | None | Unit price |
| `subtotal` | `DECIMAL(15,2)` | YES | `0.00` | None | Line subtotal before VAT |
| `total` | `DECIMAL(15,2)` | YES | `0.00` | None | Total line item cost |
| `vat` | `DECIMAL(15,2)` | YES | `0.00` | None | VAT amount |
| `inclusive` | `BOOLEAN` | YES | `false` | None | VAT inclusive flag |
| `date` | `VARCHAR(50)` | YES | NULL | None | Line item date |
| `created_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Creation timestamp |
| `updated_at` | `TIMESTAMP` | YES | `CURRENT_TIMESTAMP` | None | Modification timestamp |

---

## 3. Storage Analysis: JSON Fields vs Relational Tables

[VERIFIED] The implementation employs a **hybrid storage pattern**:
1. Relational normalization: Child records are inserted into `payable_items` table (`payable_id` foreign key).
2. Embedded serialization: Child records and file URLs are simultaneously serialized into `payables.items_json` and `payables.files_json`.
3. Audit persistence: Complete incoming payloads are persisted verbatim in `payables.raw_payload` to safeguard against data loss during schema evolutions or field mapping updates.
