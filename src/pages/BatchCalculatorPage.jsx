import React, { useEffect, useState } from 'react';
import { Calculator, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { printProductionSheet } from '../utils/printProductionSheet';

export function BatchCalculatorPage({ setCurrentPage }) {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [targetBatchQty, setTargetBatchQty] = useState('500.00');
  const [targetUom, setTargetUom] = useState('g');
  const [processLossPct, setProcessLossPct] = useState('0.00');

  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setFormulas(d.data);
        }
      });
  }, []);

  const runBatchScaling = (e) => {
    e.preventDefault();
    if (!selectedVersionId) {
      alert('Please select an approved formula version.');
      return;
    }

    setLoading(true);
    apiFetch('/api/v1/batch-calculations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        versionId: selectedVersionId,
        targetBatchQty,
        targetUom,
        processLossPct,
      }),
    })
      .then(r => r.json())
      .then(d => {
        setLoading(false);
        if (d.success) {
          setBatchResult(d.data);
        } else {
          alert(`Batch Scaling Error: ${d.message}`);
        }
      })
      .catch(err => {
        setLoading(false);
        alert(`Error: ${err.message}`);
      });
  };

  const handlePrintPdf = () => {
    if (!batchResult) return;
    printProductionSheet({
      version: {
        formula_code: batchResult.formula_code,
        formula_name: batchResult.formula_name,
        major_version: batchResult.version?.split('.')[0] || 1,
        minor_version: batchResult.version?.split('.')[1] || 0,
        target_batch_size: batchResult.target_batch_qty,
        overrideBatchSize: batchResult.target_batch_qty,
        target_batch_uom: batchResult.target_uom || 'g',
        version_status: 'APPROVED',
      },
      formula: {
        code: batchResult.formula_code,
        name: batchResult.formula_name,
      },
      materials: batchResult.items || [],
      categoryDetails: batchResult.categoryDetails,
      user,
    });
  };

  // Group items by phase for Production Sheet layout
  const phaseMap = {};
  if (batchResult && Array.isArray(batchResult.items)) {
    batchResult.items.forEach(item => {
      const pName = item.phase_name || 'Phase 1';
      if (!phaseMap[pName]) phaseMap[pName] = [];
      phaseMap[pName].push(item);
    });
  }

  const phaseKeys = Object.keys(phaseMap);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-700" /> Production Batch Sheet Calculator
        </h1>
        <p className="text-xs text-slate-500">
          Scale approved formulas to target batch quantities matching the official Production Sheet standard.
        </p>
      </div>

      {/* Scaling Form */}
      <form onSubmit={runBatchScaling} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Select Approved Formula & Target Batch Parameters</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="md:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1.5">Approved Formula Version *</label>
            <select
              value={selectedVersionId}
              onChange={e => setSelectedVersionId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
            >
              <option value="">-- Select Approved Formula Version --</option>
              {formulas.map(f =>
                f.versions.map(v => (
                  <option key={v.id} value={v.id}>
                    {f.code} — {f.name} (V{v.major_version}.{v.minor_version} {v.version_status})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Target Batch Quantity *</label>
            <input
              type="number"
              step="0.01"
              required
              value={targetBatchQty}
              onChange={e => setTargetBatchQty(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Target UOM *</label>
            <select
              value={targetUom}
              onChange={e => setTargetUom(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
            >
              <option value="g">g (Grams)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition"
        >
          <Calculator className="w-4 h-4" /> {loading ? 'Scaling Batch...' : 'Generate Batch Sheet'}
        </button>
      </form>

      {/* Production Sheet Document Preview */}
      {batchResult && (
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-md space-y-6 text-slate-900">
          {/* Header Controls Bar */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 uppercase">
                Official Production Sheet Standard
              </span>
              <h2 className="text-base font-extrabold text-slate-900 mt-1">{batchResult.formula_code} — {batchResult.formula_name}</h2>
            </div>
            <button
              onClick={handlePrintPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition"
            >
              <Printer className="w-4 h-4" /> Print Production Sheet (PDF)
            </button>
          </div>

          {/* PDF Document Box */}
          <div className="border border-slate-300 p-8 rounded-xl bg-white space-y-6 font-sans">
            {/* Document Header */}
            <div className="text-center space-y-1">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">NKB Manufacturing Corporation</h1>
              <h2 className="text-sm font-extrabold tracking-widest text-slate-900 uppercase">PRODUCTION SHEET</h2>
            </div>

            {/* Meta Section */}
            <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div><span className="font-bold text-slate-900">Compounding Number:</span> CP-{batchResult.formula_code?.replace(/[^0-9]/g, '') || '1794'}</div>
                <div><span className="font-bold text-slate-900">Target Quantity:</span> <span className="font-mono font-bold text-blue-700">{Number(batchResult.target_batch_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {batchResult.target_uom?.toUpperCase() || 'G'}</span></div>
                <div><span className="font-bold text-slate-900">Formulation:</span> {batchResult.formula_name?.toUpperCase()} {batchResult.version || '1.0'}</div>
              </div>
              <div className="space-y-1 text-right">
                <div><span className="font-bold text-slate-900">Date:</span> {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}</div>
                <div><span className="font-bold text-slate-900">Prepared By:</span> {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Norvin Bella')}</div>
              </div>
            </div>

            {/* Production Sheet Table */}
            <div className="overflow-x-auto border border-slate-300 rounded">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 w-1/3">Quantity</th>
                    <th className="p-2.5">Raw Material</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {phaseKeys.length === 0 ? (
                    batchResult.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono">
                          <span className="inline-block text-slate-400 mr-2">☐</span>
                          <span className="font-bold text-slate-900">{Number(item.scaled_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td className="p-2.5 font-bold text-slate-900 uppercase">{item.material_name_snapshot}</td>
                      </tr>
                    ))
                  ) : (
                    phaseKeys.map((pName, pIdx) => (
                      <React.Fragment key={pIdx}>
                        <tr className="bg-slate-200 font-extrabold text-slate-900">
                          <td colSpan="2" className="p-2 px-3">
                            {pName.toLowerCase().startsWith('phase') ? pName : `Phase ${pIdx + 1} - ${pName}`}
                          </td>
                        </tr>
                        {phaseMap[pName].map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono">
                              <span className="inline-block text-slate-400 mr-2">☐</span>
                              <span className="font-bold text-slate-900">{Number(item.scaled_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </td>
                            <td className="p-2.5 font-bold text-slate-900 uppercase">{item.material_name_snapshot}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}

                  {/* Total Row */}
                  <tr className="bg-slate-200 font-extrabold text-slate-900 text-sm">
                    <td colSpan="2" className="p-2.5 px-3 font-mono">
                      <span className="invisible mr-2">☐</span>
                      <span>{Number(batchResult.target_batch_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Quality Parameters & Specifications Table */}
            <div className="space-y-1.5 pt-1">
              <div className="font-extrabold text-slate-900 text-xs tracking-wider uppercase">QUALITY PARAMETERS & SPECIFICATIONS:</div>
              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-left text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold text-slate-900 w-1/4">Target pH Range:</td>
                      <td className="p-2 font-mono font-semibold text-slate-900 w-1/4">{batchResult.categoryDetails?.target_ph || ''}</td>
                      <td className="p-2 bg-slate-50 font-bold text-slate-900 w-1/4">Target Viscosity (cP):</td>
                      <td className="p-2 font-mono font-semibold text-slate-900 w-1/4">{batchResult.categoryDetails?.viscosity_cp || ''}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold text-slate-900">Appearance:</td>
                      <td className="p-2 text-slate-900" colSpan="3">{batchResult.categoryDetails?.appearance || ''}</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-50 font-bold text-slate-900">Remarks:</td>
                      <td className="p-2 text-slate-900" colSpan="3">{batchResult.categoryDetails?.remarks || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes Section */}
            <div className="text-xs space-y-1 pt-2">
              <div className="font-extrabold text-slate-900 uppercase">NOTES / INSTRUCTIONS:</div>
              <div className="text-slate-700 flex items-center gap-1.5"><span className="text-[10px]">◆</span> Follow the step order as indicated</div>
              <div className="text-slate-700 flex items-center gap-1.5"><span className="text-[10px]">◆</span> Verify all quantities before processing</div>
              <div className="text-slate-700 flex items-center gap-1.5"><span className="text-[10px]">◆</span> Record actual quantities used</div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-3 gap-6 pt-8 text-xs text-center">
              <div>
                <div className="text-left text-slate-600 mb-6">Prepared by:</div>
                <div className="font-bold text-slate-900 text-xs mb-1">{user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Norvin Bella')}</div>
                <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                <div className="text-[11px] text-slate-500">Name & Signature</div>
              </div>
              <div>
                <div className="text-left text-slate-600 mb-6">Checked by:</div>
                <div className="font-bold text-slate-900 text-xs mb-1">&nbsp;</div>
                <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                <div className="text-[11px] text-slate-500">QC Name & Signature</div>
              </div>
              <div>
                <div className="text-left text-slate-600 mb-6">Completed by:</div>
                <div className="font-bold text-slate-900 text-xs mb-1">&nbsp;</div>
                <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                <div className="text-[11px] text-slate-500">Production Team & Date</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
