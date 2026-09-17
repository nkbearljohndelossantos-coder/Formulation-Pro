import React, { useState, useEffect, useRef } from 'react';
import {
  Calculator,
  Printer,
  Sparkles,
  Droplet,
  FlaskConical,
  CheckCircle2,
  Play,
  Layers,
  Search,
  ChevronDown,
  X,
  Check,
  DollarSign,
  Scale,
  RefreshCw
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { printProductionSheet } from '../utils/printProductionSheet';

// Perfume Standard Formulation Ratios
const PERFUME_PRESETS = [
  {
    id: 'brand-without-water',
    name: 'Perfume Brand — Without Water (Concentrated 80% Base)',
    category: 'Perfume Brand',
    waterType: 'Without Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: 80.00, phase: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost_g: 0.12 },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: 14.00, phase: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost_g: 1.85 },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: 1.00, phase: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost_g: 0.45 },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: 3.00, phase: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', cost_g: 0.25 },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: 2.00, phase: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost_g: 0.95 },
    ]
  },
  {
    id: 'brand-with-water',
    name: 'Perfume Brand — With Water (Hydrated 68% Base)',
    category: 'Perfume Brand',
    waterType: 'With Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: 68.00, phase: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost_g: 0.12 },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: 14.00, phase: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost_g: 1.85 },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: 1.00, phase: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost_g: 0.45 },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: 3.00, phase: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', cost_g: 0.25 },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: 2.00, phase: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost_g: 0.95 },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: 12.00, phase: 'Phase A - Solvents & Base', role: 'Diluent', cost_g: 0.01 },
    ]
  },
  {
    id: 'nobrand-without-water',
    name: 'Perfume No-Brand — Without Water (Concentrated 85% Base)',
    category: 'Perfume No-Brand',
    waterType: 'Without Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: 85.00, phase: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost_g: 0.12 },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: 9.00, phase: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost_g: 1.85 },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: 1.00, phase: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost_g: 0.45 },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: 3.00, phase: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', cost_g: 0.25 },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: 2.00, phase: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost_g: 0.95 },
    ]
  },
  {
    id: 'nobrand-with-water',
    name: 'Perfume No-Brand — With Water (Hydrated 68% Base)',
    category: 'Perfume No-Brand',
    waterType: 'With Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: 68.00, phase: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost_g: 0.12 },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: 14.00, phase: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost_g: 1.85 },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: 1.00, phase: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost_g: 0.45 },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: 3.00, phase: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', cost_g: 0.25 },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: 2.00, phase: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost_g: 0.95 },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: 12.00, phase: 'Phase A - Solvents & Base', role: 'Diluent', cost_g: 0.01 },
    ]
  }
];

export function PerfumeBatchCalculator({ setCurrentPage, setSelectedBatchId }) {
  const { user } = useAuth();
  const [selectedPresetId, setSelectedPresetId] = useState('brand-without-water');
  const [dbFormulas, setDbFormulas] = useState([]);
  const [selectedDbVersionId, setSelectedDbVersionId] = useState('');
  
  // Scaling Parameters
  const [targetBatchWeightKg, setTargetBatchWeightKg] = useState('50.00');
  const [processLossPct, setProcessLossPct] = useState('0.50');
  
  const [scaledResult, setScaledResult] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Load backend database approved perfume formulas
  useEffect(() => {
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          const perf = d.data.filter(f =>
            (f.product_category || '').toLowerCase().includes('perfume') ||
            (f.formula_type || '').toLowerCase().includes('perfume') ||
            (f.category || '').toLowerCase().includes('perfume')
          );
          setDbFormulas(perf);
        }
      })
      .catch(() => {});
  }, []);

  // Compute live scaling whenever preset, db formula, weight, or process loss changes
  useEffect(() => {
    calculateScaling();
  }, [selectedPresetId, selectedDbVersionId, targetBatchWeightKg, processLossPct, dbFormulas]);

  const calculateScaling = () => {
    const targetKg = parseFloat(targetBatchWeightKg) || 0;
    const targetGrams = targetKg * 1000;
    const lossMultiplier = 1 + ((parseFloat(processLossPct) || 0) / 100);

    let formulaName = '';
    let formulaCode = '';
    let items = [];

    if (selectedDbVersionId) {
      // Find selected DB formula version
      let foundVersion = null;
      let foundFormula = null;
      for (const f of dbFormulas) {
        for (const v of f.versions || []) {
          if (String(v.id) === String(selectedDbVersionId)) {
            foundVersion = v;
            foundFormula = f;
            break;
          }
        }
        if (foundVersion) break;
      }

      if (foundVersion && foundFormula) {
        formulaName = foundFormula.name;
        formulaCode = foundFormula.code;
        items = (foundVersion.materials || []).map(m => ({
          name: m.material_name_snapshot || m.mat_name || m.name || 'Raw Material',
          code: m.material_code_snapshot || m.mat_code || m.code || 'MAT-000',
          percentage: parseFloat(m.percentage) || 0,
          phase: m.phase_name || 'Phase A - Solvents & Base',
          role: m.role || 'Ingredient',
          cost_g: parseFloat(m.unit_cost_g || m.current_cost || 0)
        }));
      }
    }

    if (items.length === 0) {
      // Fallback to selected preset formula
      const preset = PERFUME_PRESETS.find(p => p.id === selectedPresetId) || PERFUME_PRESETS[0];
      formulaName = preset.name;
      formulaCode = `PRF-${preset.id.toUpperCase()}`;
      items = preset.items;
    }

    // Scale line items
    let totalPct = 0;
    let totalScaledGrams = 0;
    let totalBatchCost = 0;

    const scaledItems = items.map(item => {
      const pct = parseFloat(item.percentage) || 0;
      totalPct += pct;
      
      const scaledGrams = (pct / 100) * targetGrams * lossMultiplier;
      totalScaledGrams += scaledGrams;
      
      const unitCostG = parseFloat(item.cost_g || 0);
      const lineCost = scaledGrams * unitCostG;
      totalBatchCost += lineCost;

      return {
        ...item,
        percentage: pct,
        scaledGrams,
        scaledKg: scaledGrams / 1000,
        unitCostG,
        lineCost
      };
    });

    const cpCode = `CP-PRF-${Math.floor(1000 + Math.random() * 9000)}`;
    const costPerKg = targetKg > 0 ? totalBatchCost / targetKg : 0;
    const costPer100ml = (costPerKg / 1000) * 85; // 85g approx weight per 100ml perfume bottle

    setScaledResult({
      compoundingCode: cpCode,
      formulaName,
      formulaCode,
      targetKg,
      targetGrams,
      lossPct: parseFloat(processLossPct) || 0,
      items: scaledItems,
      totalPct,
      totalScaledGrams,
      totalScaledKg: totalScaledGrams / 1000,
      totalBatchCost,
      costPerKg,
      costPer100ml
    });
  };

  const handlePresetWeightClick = (kgVal) => {
    setTargetBatchWeightKg(kgVal.toString());
  };

  const handlePrintPdf = () => {
    if (!scaledResult) return;
    printProductionSheet({
      version: {
        compounding_code: scaledResult.compoundingCode,
        formula_code: scaledResult.formulaCode,
        formula_name: scaledResult.formulaName,
        major_version: 1,
        minor_version: 0,
        target_batch_size: scaledResult.targetKg,
        overrideBatchSize: scaledResult.targetKg,
        target_batch_uom: 'kg',
        version_status: 'APPROVED',
      },
      formula: {
        code: scaledResult.formulaCode,
        name: scaledResult.formulaName,
      },
      materials: scaledResult.items.map(i => ({
        material_name_snapshot: i.name,
        material_code_snapshot: i.code,
        phase_name: i.phase,
        percentage: i.percentage,
        supplier: 'NKB Approved Supplier'
      })),
      user
    });
  };

  const handleDispatchToOperator = async () => {
    if (!scaledResult) return;
    setIsCalculating(true);
    try {
      const res = await apiFetch('/api/v1/batch-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: selectedDbVersionId || 1,
          targetBatchQty: scaledResult.targetKg,
          targetUom: 'kg',
          processLossPct: scaledResult.lossPct
        })
      });
      const data = await res.json();
      setIsCalculating(false);

      if (data.success) {
        alert(`✅ Compounding Batch ${scaledResult.compoundingCode} successfully dispatched to MES Operator Station!`);
        if (data.productionBatchId && typeof setSelectedBatchId === 'function') {
          setSelectedBatchId(data.productionBatchId);
          if (typeof setCurrentPage === 'function') {
            setCurrentPage('operator-compounding-screen');
          }
        }
      } else {
        alert(`Notice: ${data.message || 'Batch sheet generated locally.'}`);
      }
    } catch (e) {
      setIsCalculating(false);
      alert(`Local batch scaling ready for printing.`);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Module Title Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4 text-emerald-600" /> Dedicated Perfume Compounding Module
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            🧮 Perfume Batch Weight Scaling & Compounding Calculator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Scale Perfume Brand and Perfume No-Brand formulas into exact raw material addition weights (kg / grams) with process loss accounting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrintPdf}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
          >
            <Printer className="w-4 h-4 text-amber-400" /> Print Production Sheet
          </button>
          <button
            type="button"
            onClick={handleDispatchToOperator}
            disabled={isCalculating}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition"
          >
            <Play className="w-4 h-4" /> Dispatch to Operator
          </button>
        </div>
      </div>

      {/* Control Panel & Target Batch Setup */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> 1. Select Perfume Formula & Target Batch Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Preset Standard Formula Dropdown */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Standard Perfume Preset Formula *</label>
            <select
              value={selectedDbVersionId ? '' : selectedPresetId}
              onChange={e => {
                setSelectedPresetId(e.target.value);
                setSelectedDbVersionId('');
              }}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {PERFUME_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">Includes standard Ethyl, Parfum, Peg-40, Procol, Fixative & Water ratios.</span>
          </div>

          {/* DB Approved Formulas (If any) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Or Select Approved DB Perfume Formula</label>
            <select
              value={selectedDbVersionId}
              onChange={e => setSelectedDbVersionId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-emerald-800 font-bold focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="">-- Use Standard Preset Above --</option>
              {dbFormulas.map(f =>
                (f.versions || [])
                  .filter(v => (v.version_status || '').toUpperCase() === 'APPROVED')
                  .map(v => (
                    <option key={v.id} value={v.id}>
                      {f.code} — {f.name} (V{v.major_version}.{v.minor_version} APPROVED)
                    </option>
                  ))
              )}
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">Lists custom saved and approved perfume formulas in system DB.</span>
          </div>

          {/* Target Batch Size & Loss */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Target Batch Weight (kg) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={targetBatchWeightKg}
                  onChange={e => setTargetBatchWeightKg(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-emerald-800 font-mono font-extrabold text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Process Loss Allowance (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={processLossPct}
                  onChange={e => setProcessLossPct(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-amber-800 font-mono font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Quick Weight Preset Buttons */}
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block mb-1.5">Quick Target Weight Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[1, 5, 10, 25, 50, 100, 250, 500, 1000].map(kg => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => handlePresetWeightClick(kg)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                      parseFloat(targetBatchWeightKg) === kg
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {kg} kg
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Scaled Results & Financial Summary */}
      {scaledResult && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Batch Weight</span>
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {scaledResult.targetKg.toLocaleString('en-US', { minimumFractionDigits: 2 })} kg
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">({scaledResult.targetGrams.toLocaleString('en-US')} grams)</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Estimated Batch Cost</span>
                <span className="font-mono text-base font-extrabold text-blue-900">
                  PHP {scaledResult.totalBatchCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-blue-600 block font-mono">Total Material Line Costs</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Unit Cost / Kilogram</span>
                <span className="font-mono text-base font-extrabold text-amber-900">
                  PHP {scaledResult.costPerKg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg
                </span>
                <span className="text-[10px] text-amber-700 block font-mono">Compounding Unit Rate</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-700 rounded-xl border border-purple-100">
                <Droplet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Cost / 100ml Bottle</span>
                <span className="font-mono text-base font-extrabold text-purple-900">
                  PHP {scaledResult.costPer100ml.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-purple-600 block font-mono">Raw Liquid Cost / Unit</span>
              </div>
            </div>
          </div>

          {/* Scaled Material Addition Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" /> Scaled Raw Material Additions & Compounding Ratios
                </h3>
                <p className="text-xs text-slate-500">
                  Compounding Batch Code: <span className="font-mono font-bold text-emerald-800">{scaledResult.compoundingCode}</span> | Formula: <span className="font-bold text-slate-800">{scaledResult.formulaName}</span>
                </p>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold font-mono">
                Process Loss: {scaledResult.lossPct.toFixed(2)}%
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3">Phase / Addition Step</th>
                    <th className="p-3">Material Code</th>
                    <th className="p-3">Raw Material Name</th>
                    <th className="p-3 w-28 text-right">Formula %</th>
                    <th className="p-3 text-right">Addition Weight (kg)</th>
                    <th className="p-3 text-right">Addition Weight (g)</th>
                    <th className="p-3 text-right">Unit Cost (PHP/g)</th>
                    <th className="p-3 text-right">Scaled Cost (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {scaledResult.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-800">{item.phase}</td>
                      <td className="p-3 font-mono font-bold text-amber-700">{item.code}</td>
                      <td className="p-3 font-bold text-slate-900">{item.name}</td>
                      <td className="p-3 text-right font-mono font-bold text-indigo-700">{item.percentage.toFixed(2)}%</td>
                      <td className="p-3 text-right font-mono font-extrabold text-emerald-800 bg-emerald-50/40">
                        {item.scaledKg.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {item.scaledGrams.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600">
                        PHP {item.unitCostG.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-extrabold text-blue-900">
                        PHP {item.lineCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs text-slate-900">
                  <tr>
                    <td colSpan="3" className="p-3 uppercase tracking-wider text-slate-800 font-black">
                      Total Compounding Batch Requirement:
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-indigo-900 text-sm">
                      {scaledResult.totalPct.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right font-mono font-black text-emerald-900 text-sm bg-emerald-100/50">
                      {scaledResult.totalScaledKg.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg
                    </td>
                    <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                      {scaledResult.totalScaledGrams.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g
                    </td>
                    <td className="p-3 text-right font-mono text-slate-600">---</td>
                    <td className="p-3 text-right font-mono font-black text-blue-950 text-sm">
                      PHP {scaledResult.totalBatchCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Perfume Compounding Instructions Protocol Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Droplet className="w-4 h-4 text-blue-600" /> Standard Operating Procedure (Perfume Compounding Protocol)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-amber-800 block text-[11px] mb-1">Step 1: Solvents & Base (Phase A)</span>
                  <p className="text-slate-600 text-[11px]">Charge Ethyl Alcohol and Procol into mixing vessel. Agitate slowly at 120 RPM for 5 minutes.</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-purple-800 block text-[11px] mb-1">Step 2: Fragrance Premix (Phase B)</span>
                  <p className="text-slate-600 text-[11px]">Premix Parfum oil with Peg-40 solubilizer in premix tank until clear. Slowly incorporate into Phase A.</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-800 block text-[11px] mb-1">Step 3: Fixative & Chilling (Phase C)</span>
                  <p className="text-slate-600 text-[11px]">Add Fixative. Mix for 15 minutes. Chill at 4°C for 24-48h prior to fine filtration & maceration.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
