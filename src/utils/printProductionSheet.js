/**
 * Production Sheet PDF Generator & Native Print Utility
 * Matches the official NKB Manufacturing Corporation Production Sheet document standard.
 */
export function printProductionSheet({ version, formula, materials, categoryDetails, user }) {
  if (!version) {
    alert('Invalid formula version selected.');
    return;
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

  // Dynamic Compounding Control Number per formula/version/batch
  let compoundingNo = version?.compounding_number || version?.compoundingNo;
  if (!compoundingNo) {
    if (version?.batch_number) {
      compoundingNo = version.batch_number.replace(/^BAT-/, 'CP-');
    } else {
      const codeDigits = formulaCode.replace(/[^0-9]/g, '');
      if (formulaCode.toUpperCase().startsWith('CP-')) {
        compoundingNo = formulaCode.toUpperCase();
      } else if (codeDigits) {
        compoundingNo = `CP-${codeDigits}`;
      } else {
        const vId = version?.formula_id || version?.id || formula?.id;
        compoundingNo = vId ? `CP-${String(Number(vId) + 1000)}` : `CP-${Date.now().toString().slice(-4)}`;
      }
    }
  }

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
  const totalItemCount = materials.length;

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

  const htmlDocument = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${defaultPdfFilename}</title>
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
            height: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
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
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          table, tr, td, th, .notes-container, .signatures-row {
            page-break-inside: avoid !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong style="font-size: 13px; display: block; margin-bottom: 2px;">📄 Formula Production Sheet — ${formulaCode}</strong>
          <div style="font-size: 11px; opacity: 0.9;">💡 <strong>To Save as PDF:</strong> Click <strong>Save as PDF / Print</strong> $\rightarrow$ Select <strong>Save as PDF</strong> under Destination $\rightarrow$ Click <strong>Save</strong>.</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="print-btn" style="background-color: #059669;" onclick="window.print()">
            💾 Save as PDF / Print
          </button>
          <button class="print-btn" style="background-color: #475569;" onclick="window.close()">
            ✖ Close
          </button>
        </div>
      </div>

      <div class="container">
        <!-- Header -->
        <div class="doc-header">
          <h1>NKB Manufacturing Corporation</h1>
          <h2>PRODUCTION SHEET</h2>
        </div>

        <!-- Meta Info -->
        <div class="meta-section">
          <div class="meta-col-left">
            <div class="meta-line"><span class="meta-bold">Compounding Number:</span> ${compoundingNo}</div>
            <div class="meta-line"><span class="meta-bold">Target Quantity:</span> ${formattedTargetQty} ${batchUom}</div>
            <div class="meta-line"><span class="meta-bold">Formulation:</span> ${formulaName}</div>
            <div class="meta-line"><span class="meta-bold">Version:</span> ${versionNum}</div>
          </div>
          <div class="meta-col-right">
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
      </div>

      <script>
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

  printWindow.document.open();
  printWindow.document.write(htmlDocument);
  printWindow.document.close();

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch (e) {
      console.warn('Print focus trigger warning:', e);
    }
  }, 400);
}
