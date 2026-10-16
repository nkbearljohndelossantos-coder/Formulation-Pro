/**
 * Official Standard Operating Procedure (SOP) Document Generator & Native Print Utility
 * Matches the official NKB Manufacturing Corporation Controlled Document standard (GMP / FDA Philippines).
 */

export const NKB_SOP_SIGNATURES = {
  kerri: `
    <svg viewBox="0 0 160 50" style="height: 38px; width: auto; max-width: 130px; margin: 0 auto; display: block;" xmlns="http://www.w3.org/2000/svg">
      <path d="M 15 35 Q 25 8 35 20 Q 45 32 30 42 Q 22 47 38 40 Q 55 30 70 34 Q 85 38 100 28 Q 115 18 125 32 Q 135 44 145 30" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 40 18 Q 70 8 130 14" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 25 38 Q 45 44 85 41" fill="none" stroke="#0f172a" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `,
  katherine: `
    <svg viewBox="0 0 160 50" style="height: 38px; width: auto; max-width: 130px; margin: 0 auto; display: block;" xmlns="http://www.w3.org/2000/svg">
      <path d="M 18 12 L 20 44 M 18 28 Q 38 12 50 25 Q 60 38 72 26 Q 85 14 105 32 Q 120 44 140 28" fill="none" stroke="#0f172a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 12 36 Q 40 46 95 43 Q 130 40 148 35" fill="none" stroke="#0f172a" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `,
  norvin: `
    <svg viewBox="0 0 160 50" style="height: 38px; width: auto; max-width: 130px; margin: 0 auto; display: block;" xmlns="http://www.w3.org/2000/svg">
      <path d="M 15 38 Q 28 10 38 25 Q 48 38 58 20 Q 68 12 85 30 Q 98 42 120 22 Q 135 12 145 28" fill="none" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 30 40 Q 65 48 115 42 Q 140 38 150 32" fill="none" stroke="#0f172a" stroke-width="2.0" stroke-linecap="round"/>
    </svg>
  `
};

/**
 * Builds the official 3-box NKB Header Table
 */
export function buildSopHeaderTable({
  docTitle = 'DOCUMENT NUMBERING SYSTEM',
  docNumber = 'SOP-QAD-003',
  revisionNo = '00',
  supersedes = 'nil',
  issueDate = 'July 25, 2026',
  effectiveDate = 'July 25, 2026',
  pageIndex = 1,
  totalPages = 6,
  logoUrl = '/nkb-logo.png'
}) {
  return `
    <table class="sop-header-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 12px; font-family: Arial, sans-serif;">
      <tr>
        <!-- Left: Logo Box -->
        <td rowspan="3" style="width: 18%; border: 1.5px solid #000000; text-align: center; vertical-align: middle; padding: 4px 6px;">
          <img src="${logoUrl}" alt="NKB Logo" style="max-height: 48px; max-width: 100%; object-contain: contain; display: block; margin: 0 auto 2px auto;" onError="this.style.display='none'" />
          <div style="font-size: 7px; font-weight: 800; color: #b45309; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.1;">
            NKB MANUFACTURING CORPORATION
          </div>
        </td>

        <!-- Middle: Title Box -->
        <td rowspan="3" style="width: 48%; border: 1.5px solid #000000; text-align: center; vertical-align: middle; padding: 6px 10px;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; color: #000000; margin-bottom: 3px;">
            STANDARD OPERATING PROCEDURES
          </div>
          <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; color: #000000;">
            ${docTitle}
          </div>
        </td>

        <!-- Right: Metadata Box Row 1 -->
        <td style="width: 17%; border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Document No.:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${docNumber}</span>
        </td>
        <td style="width: 17%; border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Revision No.:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${revisionNo}</span>
        </td>
      </tr>

      <!-- Right: Metadata Box Row 2 -->
      <tr>
        <td style="border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Supersedes:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${supersedes}</span>
        </td>
        <td style="border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Issue Date:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${issueDate}</span>
        </td>
      </tr>

      <!-- Right: Metadata Box Row 3 -->
      <tr>
        <td style="border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Page:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${pageIndex} of ${totalPages}</span>
        </td>
        <td style="border: 1px solid #000000; padding: 2px 5px; font-size: 9px; vertical-align: middle;">
          <strong style="font-size: 8px; color: #334155;">Effective Date:</strong><br />
          <span style="font-weight: 700; font-size: 9px;">${effectiveDate}</span>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Builds the official 3-column NKB Footer Table
 */
export function buildSopFooterTable({
  preparedBy = { name: 'Kerri Marie Boston, RPh', title: 'Regulatory Officer', sigKey: 'kerri' },
  reviewedBy = { name: 'Katherine Bella', title: 'Vice President', sigKey: 'katherine' },
  approvedBy = { name: 'Norvin Bella', title: 'President', sigKey: 'norvin' }
}) {
  const getSigHtml = (sigObj) => {
    if (sigObj?.svg) return sigObj.svg;
    if (sigObj?.sigKey && NKB_SOP_SIGNATURES[sigObj.sigKey]) return NKB_SOP_SIGNATURES[sigObj.sigKey];
    return `
      <div style="height: 38px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 2px;">
        <span style="font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 19px; color: #0f172a; font-weight: bold;">
          ${sigObj?.name || ''}
        </span>
      </div>
    `;
  };

  return `
    <table class="sop-footer-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-top: auto; font-family: Arial, sans-serif;">
      <tr>
        <!-- Prepared by -->
        <td style="width: 33.33%; border: 1.5px solid #000000; padding: 6px 8px; text-align: center; vertical-align: bottom;">
          <div style="font-size: 8.5px; font-weight: 700; color: #334155; text-align: left; margin-bottom: 2px;">Prepared by:</div>
          <div style="margin: 2px auto 4px auto; height: 38px; display: flex; align-items: center; justify-content: center;">
            ${getSigHtml(preparedBy)}
          </div>
          <div style="font-size: 9.5px; font-weight: 800; color: #000000; line-height: 1.2;">${preparedBy.name}</div>
          <div style="font-size: 8px; color: #475569; font-weight: 600;">${preparedBy.title}</div>
        </td>

        <!-- Reviewed by -->
        <td style="width: 33.33%; border: 1.5px solid #000000; padding: 6px 8px; text-align: center; vertical-align: bottom;">
          <div style="font-size: 8.5px; font-weight: 700; color: #334155; text-align: left; margin-bottom: 2px;">Reviewed by:</div>
          <div style="margin: 2px auto 4px auto; height: 38px; display: flex; align-items: center; justify-content: center;">
            ${getSigHtml(reviewedBy)}
          </div>
          <div style="font-size: 9.5px; font-weight: 800; color: #000000; line-height: 1.2;">${reviewedBy.name}</div>
          <div style="font-size: 8px; color: #475569; font-weight: 600;">${reviewedBy.title}</div>
        </td>

        <!-- Approved by -->
        <td style="width: 33.33%; border: 1.5px solid #000000; padding: 6px 8px; text-align: center; vertical-align: bottom;">
          <div style="font-size: 8.5px; font-weight: 700; color: #334155; text-align: left; margin-bottom: 2px;">Approved by:</div>
          <div style="margin: 2px auto 4px auto; height: 38px; display: flex; align-items: center; justify-content: center;">
            ${getSigHtml(approvedBy)}
          </div>
          <div style="font-size: 9.5px; font-weight: 800; color: #000000; line-height: 1.2;">${approvedBy.name}</div>
          <div style="font-size: 8px; color: #475569; font-weight: 600;">${approvedBy.title}</div>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Standard Multi-Page NKB Master SOP: SOP-QAD-003 (Document Numbering System)
 * Exact 6-page official document matching NKB Manufacturing Corporation controlled standard.
 */
export function getMasterDocumentNumberingSopPages() {
  return [
    // Page 1 of 6
    `
      <div class="sop-section">
        <h3 class="sop-heading">1. REVISION HISTORY</h3>
        <table class="sop-data-table" style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 14px; font-size: 9.5px;">
          <thead>
            <tr style="background-color: #f8fafc; font-weight: 800;">
              <th style="border: 1px solid #000000; padding: 5px 8px; text-align: center; width: 25%;">Revision No.</th>
              <th style="border: 1px solid #000000; padding: 5px 8px; text-align: center; width: 45%;">Reason for Revision</th>
              <th style="border: 1px solid #000000; padding: 5px 8px; text-align: center; width: 30%;">Effective Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: 700;">00</td>
              <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center;">Initial issue</td>
              <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center;">July 25, 2026</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">2. OBJECTIVE</h3>
        <p class="sop-p">
          <strong>2.1</strong> To establish a standardized numbering system for all controlled documents generated and maintained by the company to ensure unique identification, traceability, version control, retrieval, and compliance with ASEAN Cosmetic Good Manufacturing Practices (GMP) and applicable Food and Drug Administration (FDA) Philippines regulations.
        </p>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">3. SCOPE</h3>
        <p class="sop-p">
          <strong>3.1</strong> This procedure applies to all controlled documents used within the company including but not limited to:
        </p>
        <ul class="sop-list">
          <li><strong>3.1.1</strong> Standard Operating Procedures (SOPs)</li>
          <li><strong>3.1.2</strong> Work Instructions Procedure (WIPs)</li>
          <li><strong>3.1.3</strong> Quality Manuals</li>
          <li><strong>3.1.4</strong> Policies</li>
          <li><strong>3.1.5</strong> Validation Protocols</li>
          <li><strong>3.1.6</strong> Logbooks</li>
          <li><strong>3.1.7</strong> Other controlled GMP documents</li>
        </ul>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">4. RESPONSIBILITY</h3>
        <p class="sop-p">
          <strong>4.1</strong> Quality Assurance (QA)<br />
          <strong>4.2</strong> Department Heads
        </p>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">5. DEFINITIONS</h3>
        <p class="sop-p" style="margin-bottom: 4px;">
          <strong>5.1 Controlled Document</strong> - document that is approved, periodically reviewed, and managed under document control.
        </p>
      </div>
    `,

    // Page 2 of 6
    `
      <div class="sop-section">
        <p class="sop-p">
          <strong>5.1 Controlled Document</strong> - document that is approved, periodically reviewed, and managed under document control.<br /><br />
          <strong>5.2 Revision</strong> - Any approved or modification made to a controlled document.<br /><br />
          <strong>5.3 Master Document Register</strong> - The official list of all controlled documents and their current revision status.
        </p>
      </div>

      <div class="sop-section" style="margin-top: 14px;">
        <h3 class="sop-heading">6. PROCEDURE</h3>
        <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 6px;">6.1 General Rules</div>
        <ul class="sop-list" style="margin-bottom: 10px;">
          <li>
            <strong>6.1.1 Every document shall have:</strong>
            <ul class="sop-sublist">
              <li>6.1.1.1 Company logo;</li>
              <li>6.1.1.2 A unique document number;</li>
              <li>6.1.1.3 Document title;</li>
              <li>6.1.1.4 Revision number;</li>
              <li>6.1.1.5 Issued and effective date;</li>
              <li>6.1.1.6 Approval signature;</li>
              <li>6.1.1.7 Page numbering</li>
            </ul>
          </li>
          <li style="margin-top: 6px;"><strong>6.1.2</strong> No two documents shall have the same document number.</li>
          <li style="margin-top: 6px;"><strong>6.1.3</strong> Document numbers shall never be reused, even after a document becomes obsolete.</li>
        </ul>

        <div style="font-weight: 800; font-size: 10.5px; margin-top: 12px; margin-bottom: 6px;">6.2 Document Number Format</div>
        <p class="sop-p">
          <strong>6.2.1</strong> The standard format shall be:<br />
          <span style="display: block; padding-left: 18px; margin-top: 4px;">
            <strong>6.2.1.1</strong> Document Type-Department-Sequential No.<br />
            <span style="font-family: monospace; font-size: 11px; font-weight: 800; color: #0284c7; display: block; margin: 4px 0 2px 14px;">Example: SOP-QAD-001</span>
            <span style="display: block; margin-left: 14px; font-size: 9.5px; color: #334155;">
              Where:<br />
              &bull; <strong>SOP</strong> = Document Type<br />
              &bull; <strong>QAD</strong> = Department<br />
              &bull; <strong>001</strong> = Sequential Number
            </span>
          </span>
        </p>
      </div>
    `,

    // Page 3 of 6
    `
      <div class="sop-section">
        <div style="font-weight: 800; font-size: 10.5px; margin-bottom: 6px;">6.3 Department Codes</div>
        <table class="sop-data-table" style="width: 100%; max-width: 360px; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 14px; font-size: 9.5px;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: 800;">
              <th style="border: 1px solid #000000; padding: 4px 8px; text-align: left; width: 70%;">Department</th>
              <th style="border: 1px solid #000000; padding: 4px 8px; text-align: center; width: 30%;">Code</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Quality Assurance</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">QAD</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Quality Control</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">QCD</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Production</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">PRD</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Warehouse</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">WHE</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Purchasing</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">PUR</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Regulatory Affairs</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">RAD</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Research &amp; Development</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">RND</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Human Resources</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">HRD</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Engineering</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">ENG</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Administration</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">ADM</td></tr>
          </tbody>
        </table>

        <div style="font-weight: 800; font-size: 10.5px; margin-top: 10px; margin-bottom: 6px;">6.4 Document Type Codes</div>
        <table class="sop-data-table" style="width: 100%; max-width: 360px; border-collapse: collapse; border: 1.5px solid #000000; font-size: 9.5px;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: 800;">
              <th style="border: 1px solid #000000; padding: 4px 8px; text-align: left; width: 70%;">Document</th>
              <th style="border: 1px solid #000000; padding: 4px 8px; text-align: center; width: 30%;">Code</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Standard Operating Procedure</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">SOP</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Work Instruction Procedure</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">WIP</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Quality Manual</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">QM</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Logbooks</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">LOG</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Validation Protocols</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">VP</td></tr>
          </tbody>
        </table>
      </div>
    `,

    // Page 4 of 6
    `
      <div class="sop-section">
        <table class="sop-data-table" style="width: 100%; max-width: 360px; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 14px; font-size: 9.5px;">
          <tbody>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px; width: 70%;">Calibration Record</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700; width: 30%;">CR</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Preventive Maintenance</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">PM</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Certificate</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">CER</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Checklist</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">CHK</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Policy</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">POL</td></tr>
            <tr><td style="border: 1px solid #000000; padding: 3px 8px;">Form</td><td style="border: 1px solid #000000; padding: 3px 8px; text-align: center; font-weight: 700;">FRM</td></tr>
          </tbody>
        </table>

        <div style="font-weight: 800; font-size: 10.5px; margin-top: 12px; margin-bottom: 6px;">6.5 Number Assignment</div>
        <p class="sop-p">
          <strong>6.5.1</strong> Quality Assurance shall assign the next available sequential number.<br />
          <span style="display: block; padding-left: 18px; margin-top: 4px;">
            Example:<br />
            <span style="font-family: monospace; font-size: 10px; font-weight: 700; color: #1e293b; display: block; margin: 2px 0 2px 14px;">
              SOP-QAD-001<br />
              SOP-QAD-002<br />
              SOP-QAD-003
            </span>
          </span>
          <strong>6.5.2</strong> Numbers shall not be skipped unless reserved by QA.<br />
          <strong>6.5.3</strong> Reserved numbers shall be documented.
        </p>

        <div style="font-weight: 800; font-size: 10.5px; margin-top: 12px; margin-bottom: 6px;">6.6 Revision Numbering</div>
        <p class="sop-p">
          <strong>6.6.1</strong> Initial issue:<br />
          <span style="padding-left: 20px; font-weight: 700; color: #0284c7; display: block; margin-top: 2px;">Revision 000</span>
          <strong>6.6.2</strong> Subsequent revisions:<br />
          <span style="padding-left: 20px; font-weight: 700; display: block; margin-top: 2px;">
            Revision 001<br />
            Revision 002<br />
            Revision 003
          </span>
          <strong>6.6.3</strong> The document number remains unchanged.
        </p>
      </div>
    `,

    // Page 5 of 6
    `
      <div class="sop-section">
        <p class="sop-p">
          Example:<br />
          <span style="font-family: monospace; font-size: 10.5px; font-weight: 800; color: #0284c7; padding-left: 20px; display: block; margin: 3px 0 8px 0;">
            Document number - SOP-QAD-001
          </span>
          <strong>6.6.4 Revision History:</strong><br />
          <span style="display: block; padding-left: 20px; margin-top: 3px;">
            Example:<br />
            <span style="display: block; padding-left: 14px; font-size: 9.5px; line-height: 1.5; color: #1e293b;">
              Rev 000 - Initial issue<br />
              Rev 001 - Added Supplier Qualification Procedure<br />
              Rev 002 - Updated Responsibilities
            </span>
          </span>
        </p>

        <div style="font-weight: 800; font-size: 10.5px; margin-top: 14px; margin-bottom: 6px;">6.7 Obsolete Documents</div>
        <p class="sop-p">
          <strong>6.7.1 When a document is revised:</strong><br />
          <span style="display: block; padding-left: 20px; margin-top: 4px; line-height: 1.5;">
            <strong>6.7.1.1</strong> Previous versions shall be marked "OBSOLETE".<br />
            <strong>6.7.1.2</strong> Obsolete copies shall be removed from points of use.<br />
            <strong>6.7.1.3</strong> Electronic copies shall be archived.<br />
            <strong>6.7.1.4</strong> Historical copies shall be retained according to the Record Retention Procedure.
          </span>
        </p>

        <h3 class="sop-heading" style="margin-top: 16px;">7. MASTER DOCUMENT REGISTER</h3>
        <p class="sop-p">
          <strong>7.1 Quality Assurance shall maintain a Master Document Register containing:</strong><br />
          <span style="display: block; padding-left: 20px; margin-top: 4px; line-height: 1.5;">
            <strong>7.1.1</strong> Document Number<br />
            <strong>7.1.2</strong> Document Title<br />
            <strong>7.1.3</strong> Department<br />
            <strong>7.1.4</strong> Revision Number<br />
            <strong>7.1.5</strong> Effective Date<br />
            <strong>7.1.6</strong> Status (Active/Obsolete)
          </span>
        </p>
      </div>
    `,

    // Page 6 of 6
    `
      <div class="sop-section">
        <p class="sop-p" style="padding-left: 20px; line-height: 1.6; margin-bottom: 16px;">
          <strong>7.1.7</strong> Location<br />
          <strong>7.1.8</strong> Custodian
        </p>

        <h3 class="sop-heading">8. ATTACHMENT(S)</h3>
        <p class="sop-p" style="padding-left: 14px; line-height: 1.7; margin-bottom: 24px;">
          <strong>8.1</strong> Master Document Register<br />
          <strong>8.2</strong> Document Request Form<br />
          <strong>8.3</strong> Revision History Log<br />
          <strong>8.4</strong> Obsolete Document Register
        </p>

        <h3 class="sop-heading" style="text-align: center; border-bottom: 2px solid #000000; padding-bottom: 4px; margin-top: 36px; letter-spacing: 2px;">
          9. END
        </h3>
      </div>
    `
  ];
}

/**
 * Generates and prints any official SOP document in a new window
 */
export function printSopDocument({
  docTitle = 'DOCUMENT NUMBERING SYSTEM',
  docNumber = 'SOP-QAD-003',
  revisionNo = '00',
  supersedes = 'nil',
  issueDate = 'July 25, 2026',
  effectiveDate = 'July 25, 2026',
  pages = null,
  preparedBy,
  reviewedBy,
  approvedBy,
  logoUrl = '/nkb-logo.png'
} = {}) {
  const printWindow = window.open('', '_blank', 'width=980,height=1100');
  if (!printWindow) {
    alert('Pop-up blocker is preventing the SOP document from opening. Please allow pop-ups for this site.');
    return;
  }

  const pagesArray = pages || getMasterDocumentNumberingSopPages();
  const totalPages = pagesArray.length;

  let pagesHtml = '';
  pagesArray.forEach((pageContent, idx) => {
    const pageIndex = idx + 1;
    pagesHtml += `
      <div class="sop-page" style="page-break-after: always;">
        <!-- TOP HEADER TABLE -->
        ${buildSopHeaderTable({
          docTitle,
          docNumber,
          revisionNo,
          supersedes,
          issueDate,
          effectiveDate,
          pageIndex,
          totalPages,
          logoUrl
        })}

        <!-- BODY CONTENT -->
        <div class="sop-body" style="flex: 1; padding: 6px 4px 12px 4px; font-size: 10px; line-height: 1.45; color: #000000;">
          ${pageContent}
        </div>

        <!-- BOTTOM FOOTER TABLE -->
        ${buildSopFooterTable({ preparedBy, reviewedBy, approvedBy })}
      </div>
    `;
  });

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${docNumber} — ${docTitle} | NKB Manufacturing Corporation</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: Arial, Helvetica, 'Segoe UI', sans-serif;
          margin: 0;
          padding: 12px;
          background: #f8fafc;
          color: #000000;
        }
        .no-print-bar {
          background-color: #0f172a;
          color: #ffffff;
          padding: 10px 18px;
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 10px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
          font-family: system-ui, sans-serif;
        }
        .no-print-bar button {
          cursor: pointer;
          font-weight: 800;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          transition: transform 0.1s, opacity 0.1s;
        }
        .no-print-bar button:active {
          transform: scale(0.97);
        }
        .btn-print {
          background-color: #059669;
          color: #ffffff;
        }
        .btn-close {
          background-color: #475569;
          color: #ffffff;
          margin-left: 8px;
        }
        .sop-container {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
        }
        .sop-page {
          background: #ffffff;
          padding: 10px 12px;
          min-height: 275mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          border: 1px solid #cbd5e1;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          position: relative;
        }
        .sop-heading {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.5px;
          color: #000000;
          margin: 8px 0 6px 0;
          text-transform: uppercase;
        }
        .sop-p {
          margin: 0 0 8px 0;
          font-size: 10px;
          line-height: 1.45;
          text-align: justify;
        }
        .sop-list {
          margin: 0 0 8px 0;
          padding-left: 18px;
          list-style: none;
        }
        .sop-list li {
          margin-bottom: 4px;
        }
        .sop-sublist {
          margin: 4px 0 6px 0;
          padding-left: 18px;
          list-style: none;
        }
        .sop-sublist li {
          margin-bottom: 3px;
        }
        @media print {
          .no-print-bar {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .sop-page {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            min-height: 275mm !important;
            height: 275mm !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <span style="font-weight: 800; font-size: 13px; letter-spacing: 0.5px;">📋 NKB OFFICIAL STANDARD OPERATING PROCEDURE</span>
          <span style="font-size: 11px; color: #94a3b8; margin-left: 12px; font-family: monospace;">${docNumber} (Rev ${revisionNo}) — ${totalPages} Pages</span>
        </div>
        <div>
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="btn-close" onclick="window.close()">✖ Close</button>
        </div>
      </div>

      <div class="sop-container">
        ${pagesHtml}
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();
}

/**
 * Generates and prints an official Compounding SOP for a specific Formula
 */
export function printFormulaCompoundingSop({
  formula,
  version,
  materials = [],
  preparedByName = 'Elena Rostova (Chemist)',
  isPerfume = false,
  brandName = ''
}) {
  const formulaCode = formula?.code || version?.formula_code || 'FORM-2026';
  const formulaName = formula?.name || version?.formula_name || 'Standard Formula';
  const docNumber = isPerfume ? 'SOP-PRD-001' : 'SOP-PRD-002';
  const docTitle = isPerfume ? `PERFUME COMPOUNDING PROTOCOL — ${formulaName}` : `COSMETIC COMPOUNDING PROCEDURE — ${formulaName}`;

  // Build materials rows
  const matRows = materials.map((m, idx) => `
    <tr>
      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-weight: 700;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 4px 6px;">${m.phase_name || 'Phase A'}</td>
      <td style="border: 1px solid #000; padding: 4px 6px; font-weight: 700;">${m.material_name_snapshot || m.name}</td>
      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${m.material_code_snapshot || m.code || '-'}</td>
      <td style="border: 1px solid #000; padding: 4px 6px; text-align: right; font-weight: 800;">${Number(m.percentage).toFixed(4)}%</td>
      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${m.function_name || 'Active'}</td>
    </tr>
  `).join('');

  const pages = [
    // Page 1: Objectives, Responsibilities, Specifications
    `
      <div class="sop-section">
        <h3 class="sop-heading">1. OBJECTIVE & PURPOSE</h3>
        <p class="sop-p">
          To provide standard, reproducible manufacturing and compounding operating instructions for <strong>${formulaName} (${formulaCode})</strong>, ensuring strict conformance with ASEAN Cosmetic GMP, batch consistency, quality parameters, and operator safety.
        </p>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">2. SCOPE</h3>
        <p class="sop-p">
          Applies to all compounding operators, chemists, and QA/QC personnel involved in the weighing, batching, mixing, aging, and quality verification of <strong>${formulaName}</strong> at NKB Manufacturing Corporation.
        </p>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">3. GENERAL SAFETY & PPE REQUIREMENTS</h3>
        <ul class="sop-list">
          <li><strong>3.1</strong> Mandatory PPE: Lab gown/suit, hairnet, nitrile gloves, safety goggles, and vapor respirator when handling volatile aromatics/solvents.</li>
          <li><strong>3.2</strong> Grounding & static electricity prevention must be verified before discharging ethanol or flammable liquids.</li>
          <li><strong>3.3</strong> Vessel sanitation: Ensure mixing tanks, agitator impellers, and transfer hoses have passed sanitization and line clearance sign-off.</li>
        </ul>
      </div>

      <div class="sop-section">
        <h3 class="sop-heading">4. APPROVED INGREDIENT COMPOSITION BREAKDOWN</h3>
        <table class="sop-data-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px; margin-top: 4px;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: 800;">
              <th style="border: 1px solid #000; padding: 4px; width: 6%;">#</th>
              <th style="border: 1px solid #000; padding: 4px; width: 16%;">Phase</th>
              <th style="border: 1px solid #000; padding: 4px; width: 34%;">Ingredient Name</th>
              <th style="border: 1px solid #000; padding: 4px; width: 16%;">Code</th>
              <th style="border: 1px solid #000; padding: 4px; width: 14%;">Percentage (%)</th>
              <th style="border: 1px solid #000; padding: 4px; width: 14%;">Function</th>
            </tr>
          </thead>
          <tbody>
            ${matRows || '<tr><td colspan="6" style="text-align: center; padding: 10px;">No ingredients specified</td></tr>'}
          </tbody>
        </table>
      </div>
    `,

    // Page 2: Step-by-Step Compounding Protocol & QC Review
    `
      <div class="sop-section">
        <h3 class="sop-heading">5. STEP-BY-STEP COMPOUNDING EXECUTION PROTOCOL</h3>
        ${isPerfume ? `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #92400e;">Step 1: Solvents & Base (Phase A)</div>
            <p class="sop-p">Charge Ethyl Alcohol and Procol into mixing vessel. Agitate slowly at 120 RPM for 5 minutes. Verify clarity and absence of particulate matter.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #6b21a8;">Step 2: Fragrance Premix (Phase B)</div>
            <p class="sop-p">Premix Parfum Oil with PEG-40 Hydrogenated Castor Oil in premix tank until clear and homogeneous. Slowly incorporate fragrance premix into Phase A under continuous agitation.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #065f46;">Step 3: Fixative & Mixing (Phase C)</div>
            <p class="sop-p">Add fixative agent into mixture. Continue mixing for 15 minutes at 180 RPM until completely clear and uniform.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #1e40af;">Step 4: Maceration & Aging (Drum/Tub)</div>
            <p class="sop-p">Discharge compounded bulk into sealed stainless steel drum or food-grade aging tub. Transfer to maturation storage room for a minimum of <strong>24 hours</strong> prior to final filtration and bottling.</p>
          </div>
        ` : `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #1e293b;">Step 1: Water Phase Preparation (Phase A)</div>
            <p class="sop-p">Charge Deionized Water into main vessel. Add humectants and thickeners under medium shear. Heat to 75°C - 80°C until fully dissolved.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #1e293b;">Step 2: Oil Phase Preparation (Phase B)</div>
            <p class="sop-p">In auxiliary vessel, combine emollient oils, emulsifiers, and fatty alcohols. Heat to 75°C - 80°C until completely molten.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #1e293b;">Step 3: Emulsification & Homogenization</div>
            <p class="sop-p">Add Oil Phase (Phase B) into Water Phase (Phase A) under high-shear homogenization (3000 RPM) for 10 minutes. Cool slowly to 45°C.</p>
          </div>
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 10px; color: #1e293b;">Step 4: Cool-Down Phase & Actives (Phase C)</div>
            <p class="sop-p">At 40°C, incorporate heat-sensitive active ingredients, preservatives, and fragrance. Mix for 15 minutes. Check final pH and viscosity.</p>
          </div>
        `}
      </div>

      <div class="sop-section" style="margin-top: 14px;">
        <h3 class="sop-heading">6. MANDATORY QUALITY CONTROL RELEASE CRITERIA</h3>
        <table class="sop-data-table" style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; font-size: 9px;">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: 800;">
              <th style="border: 1px solid #000; padding: 4px; width: 30%;">Quality Parameter</th>
              <th style="border: 1px solid #000; padding: 4px; width: 40%;">Approved Specification</th>
              <th style="border: 1px solid #000; padding: 4px; width: 30%;">Verification Method</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-weight: 700;">Appearance & Clarity</td>
              <td style="border: 1px solid #000; padding: 4px;">Clear, transparent, homogeneous; conforms to standard</td>
              <td style="border: 1px solid #000; padding: 4px;">Visual Inspection against white/black background</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-weight: 700;">Odor / Fragrance</td>
              <td style="border: 1px solid #000; padding: 4px;">Characteristic olfactory profile; conforms to standard</td>
              <td style="border: 1px solid #000; padding: 4px;">Organoleptic Smelling Strip vs Retained Standard</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-weight: 700;">Specific Gravity / Density</td>
              <td style="border: 1px solid #000; padding: 4px;">0.8300 - 0.8650 g/ml @ 25°C</td>
              <td style="border: 1px solid #000; padding: 4px;">Pycnometer / Digital Density Meter</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 4px; font-weight: 700;">Viscosity / Maturation</td>
              <td style="border: 1px solid #000; padding: 4px;">24 Hours Maceration Completed in Drum/Tub</td>
              <td style="border: 1px solid #000; padding: 4px;">QC Logbook / Brookfield Viscometer</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  ];

  printSopDocument({
    docTitle,
    docNumber,
    revisionNo: version?.major_version ? `0${version.major_version}` : '00',
    supersedes: 'nil',
    issueDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    effectiveDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    pages,
    preparedBy: { name: preparedByName, title: 'Formulator / Chemist', sigKey: 'kerri' },
    reviewedBy: { name: 'Katherine Bella', title: 'Vice President', sigKey: 'katherine' },
    approvedBy: { name: 'Norvin Bella', title: 'President', sigKey: 'norvin' }
  });
}
