/**
 * Production Sheet PDF Generator & Native Print Utility
 * Matches the official NKB Manufacturing Corporation Production Sheet document standard.
 */
export function printProductionSheet({ version, formula, materials, categoryDetails, user, copies: requestedCopies }) {
  if (!version) {
    alert('Invalid formula version selected.');
    return;
  }

  let copiesCount = parseInt(requestedCopies, 10);
  if (isNaN(copiesCount) || copiesCount < 1) {
    const inputStr = prompt(
      'Enter total Production Sheet copies to print:\n(Each copy will be assigned a UNIQUE sequential Compounding Code CP-xxxx)',
      '1'
    );
    if (inputStr === null) return; // User cancelled
    copiesCount = parseInt(inputStr, 10);
    if (isNaN(copiesCount) || copiesCount < 1) copiesCount = 1;
  }

  const printWindow = window.open('', '_blank', 'width=950,height=1100');
  if (!printWindow) {
    alert('Popups are blocked by your browser. Please allow popups to generate the Production Sheet PDF.');
    return;
  }

  const details = categoryDetails || version?.categoryDetails || version?.cosmeticDetails || {};
  const targetPh = details.target_ph || details.target_ph_range || '';
  const actualPh = details.actual_ph || '';
  const viscosity = details.viscosity_cp || details.target_viscosity || '';
  const appearance = details.appearance || '';
  const remarks = details.remarks || '';

  const formulaCode = formula?.code || version?.formula_code || '';
  const formulaName = (formula?.name || version?.formula_name || 'Cosmetic Formulation').toUpperCase();
  let versionNum = version?.version || `${version?.major_version || 1}.${version?.minor_version || 0}`;
  if (!String(versionNum).toLowerCase().startsWith('v')) {
    versionNum = `V${versionNum}`;
  }
  const defaultPdfFilename = `${formulaName} ${versionNum}`.trim();

  // Base Compounding Control Number (CP-xxxx format with minimum 4 digits)
  const formatBaseCompoundingNo = () => {
    let raw = version?.compounding_number || version?.compoundingNo || version?.compounding_code;
    if (!raw && version?.batch_number) {
      raw = version.batch_number;
    }

    if (raw) {
      let str = String(raw).trim().toUpperCase();
      str = str.replace(/^(BAT|CP)-?/, '');
      const digits = str.replace(/[^0-9]/g, '');
      if (digits) {
        return {
          baseNum: parseInt(digits, 10) || 1,
          padLen: Math.max(digits.length, 4),
        };
      }
    }

    const codeDigits = (formulaCode || '').replace(/[^0-9]/g, '');
    if (codeDigits) {
      return {
        baseNum: parseInt(codeDigits, 10) || 1,
        padLen: Math.max(codeDigits.length, 4),
      };
    }

    const vId = version?.formula_id || version?.id || formula?.id;
    const idDigits = String(vId || 1).replace(/[^0-9]/g, '');
    return {
      baseNum: parseInt(idDigits, 10) || 1,
      padLen: 4,
    };
  };

  const { baseNum, padLen } = formatBaseCompoundingNo();

  const targetBatchSizeNum = parseFloat(version?.overrideBatchSize || version?.target_batch_size || 100);
  const formattedTargetQty = targetBatchSizeNum.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const batchUom = (version?.target_batch_uom || 'G').toUpperCase();

  const preparedByName = user?.first_name || user?.firstName
    ? `${user.first_name || user.firstName} ${user.last_name || user.lastName || ''}`.trim()
    : 'Norvin Bella';

  const dateStr = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const formatPhaseTitle = (rawName, idx) => {
    if (!rawName) return `Phase ${String.fromCharCode(65 + idx)}`;
    const match = String(rawName).trim().match(/^Phase\s+([A-Za-z0-9]+)/i);
    if (match) return `Phase ${match[1].toUpperCase()}`;
    const lower = String(rawName).toLowerCase();
    if (lower.includes('water')) return 'Phase A';
    if (lower.includes('surfactant') || lower.includes('oil')) return 'Phase B';
    if (lower.includes('active')) return 'Phase C';
    if (lower.includes('cooling')) return 'Phase D';
    if (lower.includes('post')) return 'Phase E';
    return rawName.startsWith('Phase') ? rawName : `Phase ${rawName}`;
  };

  // Group materials by Phase with strict deduplication
  const phaseMap = {};
  if (Array.isArray(materials)) {
    const seenItems = new Set();
    materials.forEach((m, idx) => {
      const pName = formatPhaseTitle(m.phase_name, idx);
      const matId = m.material_id || m.id || m.material_code_snapshot || m.material_name_snapshot || idx;
      const uniqueKey = `${pName}_${matId}`;
      if (seenItems.has(uniqueKey)) return;
      seenItems.add(uniqueKey);

      if (!phaseMap[pName]) {
        phaseMap[pName] = [];
      }
      phaseMap[pName].push(m);
    });
  }

  let tableRowsHtml = '';

  const phaseKeys = Object.keys(phaseMap);
  if (phaseKeys.length === 0) {
    tableRowsHtml = `
      <tr class="phase-header-row"><td colspan="2">Phase A</td></tr>
      <tr class="ingredient-row">
        <td class="qty-col"><span class="checkbox-box">☐</span> ${formattedTargetQty}</td>
        <td class="mat-col">RAW MATERIAL BASE COMPOSITION</td>
      </tr>
    `;
  } else {
    phaseKeys.forEach((pName, pIdx) => {
      const phaseTitle = formatPhaseTitle(pName, pIdx);

      tableRowsHtml += `
        <tr class="phase-header-row">
          <td colspan="2">${phaseTitle}</td>
        </tr>
      `;

      phaseMap[pName].forEach(m => {
        const pct = parseFloat(m.percentage || 0);
        const calcWeight = (pct / 100) * targetBatchSizeNum;
        const formattedQty = calcWeight.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        const matName = (m.material_name_snapshot || m.material_name || m.material_code || m.code || 'RAW MATERIAL').toUpperCase();

        tableRowsHtml += `
          <tr class="ingredient-row">
            <td class="qty-col">
              <span class="checkbox-box">☐</span>
              <span>${formattedQty}</span>
            </td>
            <td class="mat-col">${matName}</td>
          </tr>
        `;
      });
    });
  }
  const totalItemCount = (materials || []).length;

  let pageMargin = '8mm 12mm';
  let bodyPadding = '16px';
  let headerMarginBottom = '14px';
  let metaMarginBottom = '12px';
  let tableMarginBottom = '12px';
  let rowPadding = '5px 10px';
  let rowFontSize = '12px';
  let phasePadding = '4px 10px';
  let notesMarginTop = '12px';
  let notesMarginBottom = '12px';
  let sigMarginTop = '20px';

  if (totalItemCount > 10 && totalItemCount <= 16) {
    pageMargin = '5mm 10mm';
    bodyPadding = '10px';
    headerMarginBottom = '8px';
    metaMarginBottom = '8px';
    tableMarginBottom = '8px';
    rowPadding = '3.5px 8px';
    rowFontSize = '11px';
    phasePadding = '3px 8px';
    notesMarginTop = '8px';
    notesMarginBottom = '8px';
    sigMarginTop = '12px';
  } else if (totalItemCount > 16) {
    pageMargin = '4mm 8mm';
    bodyPadding = '6px';
    headerMarginBottom = '4px';
    metaMarginBottom = '6px';
    tableMarginBottom = '6px';
    rowPadding = '2px 6px';
    rowFontSize = '10px';
    phasePadding = '2px 6px';
    notesMarginTop = '6px';
    notesMarginBottom = '6px';
    sigMarginTop = '8px';
  }

  const selectedFontName = localStorage.getItem('nkb_document_font') || version?.document_font || 'Inter';
  let googleFontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
  let fontFamilyCss = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  if (selectedFontName === 'Roboto') {
    googleFontUrl = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap';
    fontFamilyCss = "'Roboto', system-ui, -apple-system, sans-serif";
  } else if (selectedFontName === 'Outfit') {
    googleFontUrl = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap';
    fontFamilyCss = "'Outfit', system-ui, -apple-system, sans-serif";
  } else if (selectedFontName === 'Segoe UI') {
    googleFontUrl = '';
    fontFamilyCss = '"Segoe UI", Arial, Helvetica, sans-serif';
  } else if (selectedFontName === 'Georgia') {
    googleFontUrl = '';
    fontFamilyCss = 'Georgia, "Times New Roman", Times, serif';
  }

  // Generate HTML Pages for requested copies (Each page gets its UNIQUE CP-xxxx Code)
  let pagesHtml = '';
  for (let i = 0; i < copiesCount; i++) {
    const currentNum = baseNum + i;
    const numStr = String(currentNum).padStart(padLen, '0');
    const copyCompoundingNo = `CP-${numStr}`;
    const copyBatchNo = `BAT-${numStr}`;
    const copyBadgeLabel = copiesCount > 1 ? `<span style="font-size: 11px; color: #475569; font-weight: 600;">(Copy ${i + 1} of ${copiesCount})</span>` : '';

    pagesHtml += `
      <div class="container sheet-page">
        <!-- Header -->
        <div class="doc-header">
          <h1>NKB Manufacturing Corporation</h1>
          <h2>PRODUCTION SHEET ${copyBadgeLabel}</h2>
        </div>

        <!-- Meta Info -->
        <div class="meta-section">
          <div class="meta-col-left">
            <div class="meta-line"><span class="meta-bold">Compounding Code:</span> <span class="num-font" style="color: #0369a1; font-weight: 800;">${copyCompoundingNo}</span></div>
            <div class="meta-line"><span class="meta-bold">Batch Number:</span> <span class="num-font" style="color: #0f172a;">${copyBatchNo}</span></div>
            <div class="meta-line"><span class="meta-bold">Target Quantity:</span> ${formattedTargetQty} ${batchUom}</div>
            <div class="meta-line"><span class="meta-bold">Formulation:</span> ${formulaName}</div>
          </div>
          <div class="meta-col-right">
            <div class="meta-line"><span class="meta-bold">Version:</span> ${versionNum}</div>
            <div class="meta-line"><span class="meta-bold">Date:</span> ${dateStr}</div>
            <div class="meta-line"><span class="meta-bold">Prepared By:</span> ${preparedByName}</div>
          </div>
        </div>

        <!-- Sheet Table -->
        <table class="sheet-table">
          <thead>
            <tr>
              <th class="qty-header">Quantity</th>
              <th class="mat-header">Raw Material</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            <tr class="total-row">
              <td colspan="2">
                <span class="checkbox-box" style="visibility: hidden;">☐</span>
                <span>${formattedTargetQty}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Quality Parameters & Specifications Table -->
        <div style="margin-top: 15px; margin-bottom: 20px;">
          <div style="font-weight: 800; font-size: 12px; margin-bottom: 6px; letter-spacing: 0.3px; color: #000;">
            QUALITY PARAMETERS & SPECIFICATIONS:
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; font-size: 12px;">
            <tbody>
              <tr>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; background-color: #f9fafb; font-weight: 700; width: 25%;">Target pH Range:</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-weight: 700; font-variant-numeric: tabular-nums; width: 25%;">${targetPh}</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; background-color: #f9fafb; font-weight: 700; width: 25%;">Actual pH:</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-weight: 700; font-variant-numeric: tabular-nums; width: 25%;">${actualPh || '[ ________ ]'}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; background-color: #f9fafb; font-weight: 700; width: 25%;">Viscosity (cP):</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; font-weight: 700; font-variant-numeric: tabular-nums; width: 25%;">${viscosity}</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; background-color: #f9fafb; font-weight: 700; width: 25%;">Appearance:</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; width: 25%;">${appearance}</td>
              </tr>
              <tr>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db; background-color: #f9fafb; font-weight: 700;">Remarks:</td>
                <td style="padding: 6px 10px; border: 1px solid #d1d5db;" colspan="3">${remarks}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Notes / Instructions -->
        <div class="notes-container">
          <div class="notes-heading">NOTES / INSTRUCTIONS:</div>
          <div class="notes-bullet"><span class="bullet-icon">◆</span> Follow the step order as indicated</div>
          <div class="notes-bullet"><span class="bullet-icon">◆</span> Verify all quantities before processing</div>
          <div class="notes-bullet"><span class="bullet-icon">◆</span> Record actual quantities used</div>
        </div>

        <!-- Signatures Row -->
        <div class="signatures-row">
          <div class="sig-box">
            <div class="sig-title">Prepared by:</div>
            <div class="sig-name">${preparedByName}</div>
            <div class="sig-line"></div>
            <div class="sig-subtext">Name & Signature</div>
          </div>

          <div class="sig-box">
            <div class="sig-title">Checked by:</div>
            <div class="sig-name">&nbsp;</div>
            <div class="sig-line"></div>
            <div class="sig-subtext">QC Name & Signature</div>
          </div>

          <div class="sig-box">
            <div class="sig-title">Completed by:</div>
            <div class="sig-name">&nbsp;</div>
            <div class="sig-line"></div>
            <div class="sig-subtext">Production Team & Date</div>
          </div>
        </div>

        <!-- Page Printable Footer -->
        <div class="print-page-footer">
          <div>NKB Manufacturing Corporation • Production Sheet (${copyCompoundingNo}) — Batch: ${copyBatchNo}</div>
          <div>Copy ${i + 1} of ${copiesCount}</div>
        </div>
      </div>
    `;
  }

  const htmlDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${defaultPdfFilename} (${copiesCount} Copies)</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      ${googleFontUrl ? `<link href="${googleFontUrl}" rel="stylesheet">` : ''}
      <style>
        @page {
          size: A4 portrait;
          margin: ${pageMargin};
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: ${fontFamilyCss};
          color: #0f172a;
          background-color: #ffffff;
          margin: 0;
          padding: ${bodyPadding};
          font-size: ${rowFontSize};
          line-height: 1.35;
          -webkit-font-smoothing: antialiased;
        }
        .num-font {
          font-family: ${fontFamilyCss};
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        .container {
          max-width: 780px;
          margin: 0 auto;
        }
        .sheet-page {
          page-break-after: always;
          break-after: page;
          padding-bottom: 12px;
        }
        .sheet-page:last-child {
          page-break-after: avoid;
          break-after: avoid;
        }

        /* Top Header */
        .doc-header {
          text-align: center;
          margin-bottom: ${headerMarginBottom};
        }
        .doc-header h1 {
          font-size: ${totalItemCount > 16 ? '17px' : '20px'};
          font-weight: 800;
          margin: 0 0 2px 0;
          letter-spacing: 0.2px;
          color: #000;
        }
        .doc-header h2 {
          font-size: ${totalItemCount > 16 ? '13px' : '14px'};
          font-weight: 800;
          margin: 0;
          letter-spacing: 1px;
          color: #000;
        }
        /* Meta Grid */
        .meta-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: ${metaMarginBottom};
          font-size: ${totalItemCount > 16 ? '11px' : '12.5px'};
        }
        .meta-col-left {
          text-align: left;
        }
        .meta-col-right {
          text-align: right;
        }
        .meta-line {
          margin-bottom: 2px;
        }
        .meta-bold {
          font-weight: 700;
        }
        /* Main Production Table */
        .sheet-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #d1d5db;
          margin-bottom: ${tableMarginBottom};
        }
        .sheet-table th {
          background-color: #ffffff;
          color: #000;
          font-weight: 700;
          font-size: ${rowFontSize};
          padding: ${rowPadding};
          border-bottom: 1px solid #d1d5db;
          text-align: left;
        }
        .sheet-table th.qty-header {
          width: 125px;
          white-space: nowrap;
        }
        .sheet-table th.mat-header {
          padding-left: 10px;
        }
        .phase-header-row td {
          background-color: #e5e7eb;
          font-weight: 800;
          font-size: ${rowFontSize};
          padding: ${phasePadding};
          border-top: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          color: #000;
        }
        .ingredient-row td {
          padding: ${rowPadding};
          border-bottom: 1px solid #f3f4f6;
          font-size: ${rowFontSize};
        }
        .ingredient-row:nth-child(even) td {
          background-color: #f9fafb;
        }
        .checkbox-box {
          display: inline-block;
          font-size: ${totalItemCount > 16 ? '12px' : '14px'};
          margin-right: 5px;
          line-height: 1;
          vertical-align: middle;
        }
        .qty-col {
          width: 125px;
          font-weight: 700;
          font-family: ${fontFamilyCss};
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          padding-right: 10px;
        }
        .mat-col {
          font-weight: 600;
          color: #000;
          padding-left: 10px;
        }
        .total-row td {
          background-color: #e5e7eb;
          font-weight: 800;
          padding: ${rowPadding};
          font-size: ${rowFontSize};
          border-top: 1px solid #9ca3af;
        }

        /* Notes & Instructions */
        .notes-container {
          margin-top: ${notesMarginTop};
          margin-bottom: ${notesMarginBottom};
        }
        .notes-heading {
          font-weight: 800;
          font-size: 11px;
          margin-bottom: 4px;
          letter-spacing: 0.3px;
        }
        .notes-bullet {
          font-size: 10.5px;
          margin-bottom: 2px;
          line-height: 1.3;
        }
        .bullet-icon {
          display: inline-block;
          margin-right: 4px;
          font-size: 9px;
        }

        /* Signatures Footer */
        .signatures-row {
          display: flex;
          justify-content: space-between;
          margin-top: ${sigMarginTop};
        }
        .sig-box {
          width: 30%;
          text-align: center;
        }
        .sig-title {
          text-align: left;
          font-size: 11px;
          font-weight: 500;
          margin-bottom: ${totalItemCount > 16 ? '12px' : '18px'};
        }
        .sig-name {
          font-size: 11px;
          font-weight: 700;
          color: #000000;
          margin-bottom: 2px;
          min-height: 15px;
          text-align: center;
        }
        .sig-line {
          border-bottom: 1.5px solid #000000;
          width: 100%;
          margin-bottom: 3px;
        }
        .sig-subtext {
          font-size: 10px;
          color: #4b5563;
          text-align: center;
        }

        /* Printable Footer & Page Numbers */
        .print-page-footer {
          margin-top: 15px;
          padding-top: 6px;
          border-top: 1px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          font-size: 9.5px;
          color: #475569;
          font-family: ${fontFamilyCss};
        }

        /* Screen Print Bar Controls */
        .no-print-bar {
          background-color: #1e293b;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 10px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .print-btn {
          background-color: #2563eb;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .print-btn:hover {
          background-color: #1d4ed8;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: ${pageMargin};
          }
          html, body {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print-bar {
            display: none !important;
          }
          .container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong style="font-size: 13px; display: block; margin-bottom: 2px;">📄 Production Sheet Batch Copies — ${formulaCode}</strong>
          <div style="font-size: 11px; opacity: 0.9;">💡 <strong>Unique Compounding Codes:</strong> ${copiesCount} copy/ies generated with unique sequential <strong>CP-xxxx</strong> control codes.</div>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px;">
            <label style="font-size: 11px; font-weight: bold; color: #cbd5e1;">Copies:</label>
            <input type="number" id="copyCountInput" min="1" max="50" value="${copiesCount}" style="width: 45px; padding: 4px; border-radius: 4px; border: 1px solid #475569; font-weight: bold; text-align: center; color: #000;" />
            <button class="print-btn" style="background-color: #3b82f6; padding: 5px 10px; font-size: 11px;" onclick="promptUpdateCopies()">
              🔄 Change Copies
            </button>
          </div>
          <button class="print-btn" style="background-color: #059669;" onclick="window.print()">
            💾 Save as PDF / Print
          </button>
          <button class="print-btn" style="background-color: #475569;" onclick="window.close()">
            ✖ Close
          </button>
        </div>
      </div>

      ${pagesHtml}

      <script>
        function promptUpdateCopies() {
          const val = parseInt(document.getElementById('copyCountInput').value, 10);
          if (!isNaN(val) && val >= 1) {
            if (window.opener && typeof window.opener.__PRINT_WITH_COPIES__ === 'function') {
              window.opener.__PRINT_WITH_COPIES__(val);
              window.close();
            } else {
              alert('To change copy quantity, please re-click Print from the main application.');
            }
          }
        }
        document.addEventListener('DOMContentLoaded', function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 300);
        });
      </script>
    </body>
    </html>
  `;

  // Attach global helper to opener for copy count re-generation
  if (typeof window !== 'undefined') {
    window.__PRINT_WITH_COPIES__ = function(newCopies) {
      printProductionSheet({ version, formula, materials, categoryDetails, user, copies: newCopies });
    };
  }

  printWindow.document.open();
  printWindow.document.write(htmlDocument);
  printWindow.document.close();
}
