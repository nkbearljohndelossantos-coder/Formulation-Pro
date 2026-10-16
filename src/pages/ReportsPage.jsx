import React, { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Download, Printer, BookOpen, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../services/api';
import { printSopDocument, printFormulaCompoundingSop } from '../utils/printSopDocument';

export function ReportsPage() {
  const [formulas, setFormulas] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [sopType, setSopType] = useState('SOP-QAD-003');

  useEffect(() => {
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => d.success && setFormulas(d.data));
  }, []);

  const downloadExcelMaster = () => {
    window.open('/api/v1/reports/formulas/excel', '_blank');
  };

  const downloadPdfDetail = () => {
    if (!selectedVersionId) {
      alert('Please select a formula version to export PDF.');
      return;
    }
    window.open(`/api/v1/reports/formulas/${selectedVersionId}/pdf`, '_blank');
  };

  const handlePrintSop = () => {
    if (sopType === 'SOP-QAD-003') {
      printSopDocument();
    } else if (sopType === 'FORMULA_SOP') {
      if (!selectedVersionId) {
        alert('Please select a formula version to generate its Standard Operating Procedure.');
        return;
      }
      let foundFormula = null;
      let foundVersion = null;
      for (const f of formulas) {
        const v = (f.versions || []).find(ver => String(ver.id) === String(selectedVersionId));
        if (v) {
          foundFormula = f;
          foundVersion = v;
          break;
        }
      }
      if (foundFormula && foundVersion) {
        apiFetch(`/api/v1/formulas/versions/${selectedVersionId}`)
          .then(r => r.json())
          .then(d => {
            const materials = d?.data?.materials || [];
            printFormulaCompoundingSop({
              formula: foundFormula,
              version: foundVersion,
              materials,
              isPerfume: foundFormula.product_category === 'Perfume' || foundFormula.name?.toLowerCase().includes('perfume')
            });
          })
          .catch(() => {
            printFormulaCompoundingSop({
              formula: foundFormula,
              version: foundVersion,
              isPerfume: foundFormula.product_category === 'Perfume'
            });
          });
      }
    } else if (sopType === 'SOP-PRD-001') {
      printFormulaCompoundingSop({
        formula: { code: 'PRF-MASTER', name: 'Perfume Compounding Standard Protocol' },
        version: { major_version: 1, minor_version: 0 },
        isPerfume: true
      });
    } else if (sopType === 'SOP-PRD-002') {
      printFormulaCompoundingSop({
        formula: { code: 'CSM-MASTER', name: 'Cosmetic Formulation & Compounding Protocol' },
        version: { major_version: 1, minor_version: 0 },
        isPerfume: false
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-slate-700" /> Reports & Export Hub
        </h1>
        <p className="text-xs text-slate-500">
          Professional PDF, Excel reports, and official NKB Standard Operating Procedure (SOP) Controlled Documents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Excel Master Export Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Formula Master List (Excel)</h3>
                <p className="text-xs text-slate-500">Spreadsheet export containing all active master formulas, categories, and status.</p>
              </div>
            </div>
          </div>
          <button
            onClick={downloadExcelMaster}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download Master List (.xlsx)
          </button>
        </div>

        {/* PDF Detail Sheet Export Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Formula Detail Sheet (PDF)</h3>
                <p className="text-xs text-slate-500">Formatted printable PDF with composition breakdown, phases, and instructions.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select Formula Version</label>
              <select
                value={selectedVersionId}
                onChange={e => setSelectedVersionId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="">-- Select Formula Version --</option>
                {formulas.map(f =>
                  (f.versions || []).map(v => (
                    <option key={v.id} value={v.id}>
                      {f.code} — {f.name} (V{v.major_version}.{v.minor_version} {v.version_status})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <button
            onClick={downloadPdfDetail}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Export / Print PDF Detail Sheet
          </button>
        </div>

        {/* Standard Operating Procedure (SOP) Controlled Document Card */}
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/40 shadow-xs space-y-4 flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/20">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-slate-900 text-base">Standard Operating Procedures</h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">Official</span>
                </div>
                <p className="text-xs text-slate-500">NKB corporate controlled document layout conforming to ASEAN Cosmetic GMP / FDA standard.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Select SOP Document Type</label>
              <select
                value={sopType}
                onChange={e => setSopType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
              >
                <option value="SOP-QAD-003">SOP-QAD-003: Document Numbering System (Master SOP - 6 Pages)</option>
                <option value="SOP-PRD-001">SOP-PRD-001: Perfume Compounding Protocol & Standard Procedure</option>
                <option value="SOP-PRD-002">SOP-PRD-002: Cosmetic Formulation & Compounding Procedure</option>
                <option value="FORMULA_SOP">Formula-Specific Compounding SOP (from selected formula above)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handlePrintSop}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" /> 🖨️ View & Print Official SOP (NKB Standard)
          </button>
        </div>
      </div>
    </div>
  );
}
