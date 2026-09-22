import React, { useEffect, useState, useRef } from 'react';
import {
  Calculator,
  Printer,
  DollarSign,
  Search,
  ChevronDown,
  Check,
  X,
  Play,
  Scale,
  FlaskConical,
  Droplet,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { printProductionSheet } from '../utils/printProductionSheet';
import ExcelProductionSheetTable from '../components/ExcelProductionSheetTable';

// Standard Perfume Formulations Ratios (Presets)
const PERFUME_PRESETS = [
  {
    id: 'preset_brand-without-water',
    code: 'PRF-BRAND-NOWATER',
    name: 'Perfume Brand — Without Water (Concentrated 80% Base)',
    category: 'Perfume Brand',
    waterType: 'Without Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '80.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', unit_cost_g: '0.12' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', unit_cost_g: '0.25' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', unit_cost_g: '1.85' },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', unit_cost_g: '0.45' },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', unit_cost_g: '0.95' },
    ]
  },
  {
    id: 'preset_brand-with-water',
    code: 'PRF-BRAND-WATER',
    name: 'Perfume Brand — With Water (Hydrated 68% Base)',
    category: 'Perfume Brand',
    waterType: 'With Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '68.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', unit_cost_g: '0.12' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', unit_cost_g: '0.25' },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: '12.00', phase_name: 'Phase A - Solvents & Base', role: 'Diluent', unit_cost_g: '0.01' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', unit_cost_g: '1.85' },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', unit_cost_g: '0.45' },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', unit_cost_g: '0.95' },
    ]
  },
  {
    id: 'preset_nobrand-without-water',
    code: 'PRF-NOBRAND-NOWATER',
    name: 'Perfume No-Brand — Without Water (Concentrated 85% Base)',
    category: 'Perfume No-Brand',
    waterType: 'Without Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '85.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', unit_cost_g: '0.12' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', unit_cost_g: '0.25' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '9.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', unit_cost_g: '1.85' },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', unit_cost_g: '0.45' },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', unit_cost_g: '0.95' },
    ]
  },
  {
    id: 'preset_nobrand-with-water',
    code: 'PRF-NOBRAND-WATER',
    name: 'Perfume No-Brand — With Water (Hydrated 68% Base)',
    category: 'Perfume No-Brand',
    waterType: 'With Water',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '68.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', unit_cost_g: '0.12' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant / Fixative', unit_cost_g: '0.25' },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: '12.00', phase_name: 'Phase A - Solvents & Base', role: 'Diluent', unit_cost_g: '0.01' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', unit_cost_g: '1.85' },
      { name: 'Peg-40 Hydrogenated Castor Oil', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', unit_cost_g: '0.45' },
      { name: 'Fixative (Glucam P-20 / Musk)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', unit_cost_g: '0.95' },
    ]
  }
];

export function PerfumeBatchCalculator({ setCurrentPage, setSelectedBatchId, initialVersionId }) {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId ? String(initialVersionId) : '');
  const [targetBatchQty, setTargetBatchQty] = useState('50.00');
  const [targetUom, setTargetUom] = useState('kg');
  const [processLossPct, setProcessLossPct] = useState('0.50');
  const [brandName, setBrandName] = useState('');

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  const [batchResult, setBatchResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [togglingSetting, setTogglingSetting] = useState(false);
  const [currentSheetLayout, setCurrentSheetLayout] = useState(null);

  // SOP Process Step Timestamps
  const [sopTimestamps, setSopTimestamps] = useState({
    step1_start: '',
    step1_end: '',
    step2_start: '',
    step2_end: '',
    step3_start: '',
    step3_end: '',
    step4_start: '',
    step4_end: '',
  });
  const [savingSop, setSavingSop] = useState(false);
  const [sopSaveStatus, setSopSaveStatus] = useState('');

  const handleSopTimestampChange = (field, val) => {
    setSopTimestamps(prev => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleSaveSopTimestamps = async (timestampsToSave = sopTimestamps) => {
    if (!batchResult?.batch_calculation_id) {
      setSopSaveStatus('Saved locally in session.');
      setTimeout(() => setSopSaveStatus(''), 3000);
      return;
    }
    setSavingSop(true);
    try {
      const res = await apiFetch(`/api/v1/batch-calculations/${batchResult.batch_calculation_id}/sop-timestamps`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sopTimestamps: timestampsToSave }),
      });
      const d = await res.json();
      if (d.success) {
        setSopSaveStatus('SOP timestamps saved to database.');
      } else {
        setSopSaveStatus(d.message || 'Error saving timestamps.');
      }
    } catch {
      setSopSaveStatus('Error saving timestamps.');
    } finally {
      setSavingSop(false);
      setTimeout(() => setSopSaveStatus(''), 3500);
    }
  };

  // Sync initialVersionId if provided
  useEffect(() => {
    if (initialVersionId) {
      setSelectedVersionId(String(initialVersionId));
    }
  }, [initialVersionId]);

  useEffect(() => {
    fetchFormulas();
    fetchSettings();
  }, []);

  const fetchFormulas = () => {
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setFormulas(d.data);
        }
      })
      .catch(() => {});
  };

  const fetchSettings = () => {
    apiFetch('/api/v1/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setAutoSendEnabled(d.data.auto_send_to_operator_mes === 'true' || d.data.auto_send_to_operator_mes === '1');
        }
      })
      .catch(() => {});
  };

  const handleToggleAutoSend = (newVal) => {
    setTogglingSetting(true);
    apiFetch('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify({
        settings: { auto_send_to_operator_mes: newVal ? 'true' : 'false' }
      })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setAutoSendEnabled(newVal);
        } else {
          alert(d.message || 'Failed to update setting.');
        }
      })
      .catch(e => alert(e.message || 'Error updating setting.'))
      .finally(() => setTogglingSetting(false));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to check if formula is strictly perfume (excludes cosmetics and supplements)
  const isPerfume = (f) => {
    if (!f) return false;
    const cat = (f.product_category || '').toLowerCase();
    const type = (f.formula_type || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    const cat2 = (f.category || '').toLowerCase();
    const code = (f.code || '').toLowerCase();

    // Explicit exclusions if category or type is cosmetic or supplement
    const isCosmetic = cat.includes('cosmetic') || type.includes('cosmetic') || cat2.includes('cosmetic');
    if (isCosmetic) return false;

    const isSupplement = cat.includes('supplement') || type.includes('supplement') || cat2.includes('supplement');
    if (isSupplement) return false;

    return (
      cat.includes('perfume') ||
      type.includes('perfume') ||
      cat2.includes('perfume') ||
      code.startsWith('prf') ||
      code.includes('-prf-') ||
      name.includes('perfume') ||
      name.includes('eau de parfum') ||
      name.includes('edp') ||
      name.includes('cologne')
    );
  };

  // Build formula options for searchable selection dropdown (STRICTLY Perfumes & APPROVED only)
  const formulaOptions = [];

  // 1. Database Perfume Formulas (STRICTLY APPROVED ONLY)
  const perfumeDbFormulas = formulas.filter(isPerfume);

  perfumeDbFormulas.forEach(f => {
    (f.versions || []).forEach(v => {
      const status = (v.version_status || 'DRAFT').toUpperCase();
      // Strictly APPROVED only!
      if (status !== 'APPROVED') return;

      formulaOptions.push({
        id: String(v.id),
        isPreset: false,
        formulaCode: f.code,
        formulaName: f.name,
        versionStr: `V${v.major_version}.${v.minor_version}`,
        status: 'APPROVED',
        displayText: `${f.code} — ${f.name} (V${v.major_version}.${v.minor_version} APPROVED)`,
        categoryTag: f.product_category || 'Perfume',
        isPerfume: true,
      });
    });
  });

  // 2. Standard Perfume Presets (Standard Approved Formulations)
  PERFUME_PRESETS.forEach(p => {
    formulaOptions.push({
      id: p.id,
      isPreset: true,
      formulaCode: p.code,
      formulaName: p.name,
      versionStr: 'V1.0',
      status: 'APPROVED',
      displayText: `Standard Preset: ${p.name}`,
      categoryTag: p.category,
      isPerfume: true,
    });
  });

  // Set default selection if none selected yet
  useEffect(() => {
    if (!selectedVersionId && formulaOptions.length > 0) {
      const firstPerfumeVer = formulaOptions.find(o => !o.isPreset && o.status === 'APPROVED')
        || formulaOptions.find(o => !o.isPreset)
        || formulaOptions[0];
      if (firstPerfumeVer) {
        setSelectedVersionId(firstPerfumeVer.id);
      }
    }
  }, [formulas]);

  const filteredOptions = formulaOptions.filter(opt => {
    const q = searchQuery.toLowerCase();
    return (
      opt.formulaCode.toLowerCase().includes(q) ||
      opt.formulaName.toLowerCase().includes(q) ||
      opt.versionStr.toLowerCase().includes(q) ||
      opt.displayText.toLowerCase().includes(q) ||
      opt.categoryTag.toLowerCase().includes(q)
    );
  });

  const selectedOption = formulaOptions.find(opt => String(opt.id) === String(selectedVersionId));

  // Helper to rank phases (Phase A = 65, Phase B = 66, Phase C = 67, etc.)
  const getPhaseRank = (phaseStr) => {
    if (!phaseStr) return 99;
    const s = String(phaseStr).trim().toLowerCase();
    const match = s.match(/phase\s+([a-z0-9]+)/i);
    if (match) {
      return match[1].toUpperCase().charCodeAt(0);
    }
    if (s.includes('phase a') || s.includes('solvent') || s.includes('water')) return 65;
    if (s.includes('phase b') || s.includes('fragrance') || s.includes('oil')) return 66;
    if (s.includes('phase c') || s.includes('fixative') || s.includes('aging')) return 67;
    return 99;
  };

  const runBatchScaling = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!selectedVersionId) {
      alert('Please select a perfume formula version or preset.');
      return;
    }

    setLoading(true);

    // Case A: Preset formula selected
    if (String(selectedVersionId).startsWith('preset_')) {
      const preset = PERFUME_PRESETS.find(p => p.id === selectedVersionId) || PERFUME_PRESETS[0];
      const targetQty = parseFloat(targetBatchQty) || 50;
      const lossPct = parseFloat(processLossPct) || 0;
      const lossMultiplier = 1 + (lossPct / 100);

      // Convert targetQty to grams for costing if targetUom is kg
      const isKg = targetUom === 'kg';
      const targetGrams = isKg ? targetQty * 1000 : targetQty;

      let totalBatchCost = 0;
      const items = preset.items.map(m => {
        const pct = parseFloat(m.percentage) || 0;
        const scaledQty = (pct / 100) * targetQty * lossMultiplier;
        const scaledGrams = (pct / 100) * targetGrams * lossMultiplier;
        const unitCostG = parseFloat(m.unit_cost_g) || 0;
        const lineCost = scaledGrams * unitCostG;
        totalBatchCost += lineCost;

        return {
          material_id: null,
          material_code_snapshot: m.code,
          material_name_snapshot: m.name,
          phase_name: m.phase_name,
          percentage: pct.toFixed(2),
          scaled_qty: scaledQty.toFixed(2),
          scaled_uom: targetUom,
          unit_cost_g: unitCostG.toFixed(4),
          line_cost: lineCost.toFixed(2),
          currency_code: 'PHP',
          supplier: 'NKB Approved Supplier'
        };
      });

      items.sort((a, b) => getPhaseRank(a.phase_name) - getPhaseRank(b.phase_name));

      const cpCode = `CP-PRF-${Math.floor(1000 + Math.random() * 9000)}`;
      setBatchResult({
        compounding_code: cpCode,
        batch_number: cpCode.replace('CP-', 'BAT-'),
        formula_code: preset.code,
        formula_name: preset.name,
        brand_name: brandName.trim(),
        version: '1.0',
        target_batch_qty: targetQty.toFixed(2),
        target_uom: targetUom,
        process_loss_pct: lossPct.toFixed(2),
        total_batch_cost: totalBatchCost.toFixed(2),
        items,
        categoryDetails: {
          target_ph: '5.8 - 6.2',
          actual_ph: '[ ________ ]',
          viscosity_cp: 'Liquid (1.2 cP)',
          appearance: 'Clear, transparent liquid',
          remarks: 'Allow to undergo maceration/aging for 24 hours in Drum/Tub.'
        },
        sop_timestamps: sopTimestamps
      });
      setLoading(false);
      return;
    }

    // Case B: Database Formula Version selected -> Call Backend Batch Calculation Engine
    try {
      const res = await apiFetch('/api/v1/batch-calculations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: selectedVersionId,
          targetBatchQty,
          targetUom,
          processLossPct,
          sopTimestamps,
        }),
      });
      const d = await res.json();
      setLoading(false);

      if (d.success && d.data) {
        if (Array.isArray(d.data.items)) {
          d.data.items.sort((a, b) => getPhaseRank(a.phase_name) - getPhaseRank(b.phase_name));
        }
        setBatchResult({
          ...d.data,
          brand_name: brandName.trim(),
          sop_timestamps: d.data.sop_timestamps || sopTimestamps
        });
      } else {
        console.warn('Batch scaling server response:', d.message);
        fallbackScaleFromVersion(selectedVersionId);
      }
    } catch (err) {
      console.warn('Error calling batch calculation API, falling back to version fetch:', err.message);
      fallbackScaleFromVersion(selectedVersionId);
    }
  };

  // Client-side fallback scaling in case version is draft or offline
  const fallbackScaleFromVersion = async (vId) => {
    try {
      const vRes = await apiFetch(`/api/v1/formulas/versions/${vId}`);
      const vData = await vRes.json();
      setLoading(false);

      if (vData.success && vData.data) {
        const formula = vData.data.formula || {};
        const version = vData.data.version || {};
        const materials = vData.data.materials || [];
        const categoryDetails = vData.data.categoryDetails;

        const targetQty = parseFloat(targetBatchQty) || 50;
        const lossPct = parseFloat(processLossPct) || 0;
        const lossMultiplier = 1 + (lossPct / 100);
        const isKg = targetUom === 'kg';
        const targetGrams = isKg ? targetQty * 1000 : targetQty;

        let totalBatchCost = 0;
        const items = materials.map(m => {
          const pct = parseFloat(m.percentage) || 0;
          const scaledQty = (pct / 100) * targetQty * lossMultiplier;
          const scaledGrams = (pct / 100) * targetGrams * lossMultiplier;
          
          const rawCost = parseFloat(m.cost || m.current_cost || m.unit_cost_g || 0);
          const rawUom = String(m.material_uom || m.uom || 'g').trim().toLowerCase();
          const unitCostG = rawUom === 'kg' ? rawCost / 1000 : rawCost;
          const lineCost = scaledGrams * unitCostG;
          totalBatchCost += lineCost;

          return {
            material_id: m.material_id,
            material_code_snapshot: m.material_code_snapshot || m.material_code || m.code || 'MAT-000',
            material_name_snapshot: m.material_name_snapshot || m.material_name || m.name || 'Raw Material',
            phase_name: m.phase_name || 'Phase A - Solvents & Base',
            percentage: pct.toFixed(2),
            scaled_qty: scaledQty.toFixed(2),
            scaled_uom: targetUom,
            unit_cost_g: unitCostG.toFixed(4),
            line_cost: lineCost.toFixed(2),
            currency_code: 'PHP',
            supplier: m.vendor_name || 'NKB Approved Supplier'
          };
        });

        items.sort((a, b) => getPhaseRank(a.phase_name) - getPhaseRank(b.phase_name));

        const cpCode = version.compounding_code || `CP-PRF-${Math.floor(1000 + Math.random() * 9000)}`;
        setBatchResult({
          compounding_code: cpCode,
          batch_number: cpCode.replace('CP-', 'BAT-'),
          formula_code: formula.code || 'PRF-FORM',
          formula_name: formula.name || 'Perfume Formulation',
          brand_name: brandName.trim(),
          version: `${version.major_version ?? 1}.${version.minor_version ?? 0}`,
          target_batch_qty: targetQty.toFixed(2),
          target_uom: targetUom,
          process_loss_pct: lossPct.toFixed(2),
          total_batch_cost: totalBatchCost.toFixed(2),
          items,
          categoryDetails
        });
      } else {
        alert('Could not scale formula: ' + (vData.message || 'Unable to load version materials'));
      }
    } catch (e) {
      setLoading(false);
      alert('Scaling error: ' + e.message);
    }
  };

  const handlePresetWeightClick = (qtyVal, uomVal) => {
    setTargetBatchQty(qtyVal.toString());
    if (uomVal) setTargetUom(uomVal);
  };

  const handlePrintPdf = () => {
    if (!batchResult) return;
    const currentBrand = (brandName || batchResult.brand_name || '').trim();
    printProductionSheet({
      isPerfume: true,
      brandName: currentBrand,
      sopTimestamps,
      version: {
        compounding_code: batchResult.compounding_code,
        formula_code: batchResult.formula_code,
        formula_name: batchResult.formula_name,
        brandName: currentBrand,
        major_version: batchResult.version?.split('.')[0] || 1,
        minor_version: batchResult.version?.split('.')[1] || 0,
        target_batch_size: batchResult.target_batch_qty,
        overrideBatchSize: batchResult.target_batch_qty,
        target_batch_uom: batchResult.target_uom || 'kg',
        version_status: 'APPROVED',
        isPerfume: true,
        sop_timestamps: sopTimestamps,
      },
      formula: {
        code: batchResult.formula_code,
        name: batchResult.formula_name,
        brandName: currentBrand,
        product_category: 'Perfume Brand',
        isPerfume: true,
      },
      materials: (batchResult.items || []).map(i => ({
        material_name_snapshot: i.material_name_snapshot,
        material_code_snapshot: i.material_code_snapshot,
        phase_name: i.phase_name,
        percentage: i.percentage,
        supplier: i.supplier || 'NKB Approved Supplier'
      })),
      categoryDetails: batchResult.categoryDetails,
      user,
      layoutConfig: currentSheetLayout
    });
  };

  // Group items by phase for Production Sheet layout (Phase A, Phase B, Phase C...)
  const phaseMap = {};
  if (batchResult && Array.isArray(batchResult.items)) {
    batchResult.items.forEach(item => {
      const pName = item.phase_name || 'Phase A - Solvents & Base';
      if (!phaseMap[pName]) phaseMap[pName] = [];
      phaseMap[pName].push(item);
    });
  }

  // Sort phase keys in proper alphabetical order
  const phaseKeys = Object.keys(phaseMap).sort((a, b) => getPhaseRank(a) - getPhaseRank(b));

  // Compute metrics for financial KPI cards
  const targetQtyNum = Number(batchResult?.target_batch_qty) || 0;
  const targetUomStr = batchResult?.target_uom || 'kg';
  const totalCostNum = Number(batchResult?.total_batch_cost) || 0;

  // Normalize to Grams and Kilograms
  const totalWeightGrams = targetUomStr === 'kg' ? targetQtyNum * 1000 : targetQtyNum;
  const totalWeightKg = targetUomStr === 'kg' ? targetQtyNum : targetQtyNum / 1000;

  const costPerGram = totalWeightGrams > 0 ? totalCostNum / totalWeightGrams : 0;
  const costPerKg = totalWeightKg > 0 ? totalCostNum / totalWeightKg : 0;
  const costPer100mlBottle = costPerGram * 85; // ~85 grams average perfume liquid weight per 100ml bottle

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
          <Calculator className="w-4 h-4 text-emerald-600" /> Dedicated Perfume Compounding Module
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-700" /> Perfume Production Batch Sheet Calculator
        </h1>
        <p className="text-xs text-slate-500">
          Scale approved perfume formulations (Brand & No-Brand) to target batch quantities matching the official Production Sheet standard.
        </p>
      </div>

      {/* Admin Dispatch Control Banner for Auto-Send to Operator Toggle */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-400">Admin Dispatch Control</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${autoSendEnabled ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
              {autoSendEnabled ? '🟢 ON: Auto-Send Enabled' : '🔴 OFF: Print Only (No Auto-Send)'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {autoSendEnabled
              ? 'AUTOMATIC: Pag nag-calc / generate, AWTOMATIKONG MABABATO sa Operator Station ang active batch.'
              : 'PRINT ONLY: Pag nag-calc / generate, MAG-PRIPRINT AT MAG-LO-LOG LAMANG at HINDI MABABATO sa Operator Station.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => handleToggleAutoSend(false)}
            disabled={togglingSetting}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              !autoSendEnabled ? 'bg-amber-500 text-slate-900 shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            OFF (Print Only)
          </button>
          <button
            type="button"
            onClick={() => handleToggleAutoSend(true)}
            disabled={togglingSetting}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              autoSendEnabled ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            ON (Auto-Send)
          </button>
        </div>
      </div>

      {/* Scaling Form */}
      <form onSubmit={runBatchScaling} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" /> Select Approved Perfume Formula & Target Batch Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Searchable Dropdown for Perfume Formulas & Presets */}
          <div className="lg:col-span-2 md:col-span-2 relative" ref={dropdownRef}>
            <label className="block text-slate-700 font-semibold mb-1.5">Perfume Formulation Version *</label>
            
            {/* Dropdown Trigger Button */}
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-left text-slate-900 font-bold focus:outline-none focus:border-emerald-600 flex justify-between items-center shadow-xs"
            >
              <div className="truncate pr-2">
                {selectedOption ? (
                  <span className="text-slate-900 font-extrabold flex items-center gap-1.5 truncate">
                    <span className="truncate">{selectedOption.formulaName}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded shrink-0 ${
                      selectedOption.isPreset
                        ? 'bg-purple-100 text-purple-800'
                        : selectedOption.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOption.isPreset ? 'PRESET' : `${selectedOption.versionStr} ${selectedOption.status}`}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">-- Select Perfume Formulation Version --</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Interactive Searchable Dropdown Panel */}
            {dropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-slate-300 rounded-xl shadow-xl overflow-hidden p-2 space-y-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="🔍 Search formula code, name, or version..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filtered Options List */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {filteredOptions.length === 0 ? (
                    <div className="p-3.5 text-center text-xs text-slate-400 font-medium">
                      No matching approved perfume formulations found
                    </div>
                  ) : (
                    filteredOptions.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedVersionId(opt.id);
                          setDropdownOpen(false);
                          setSearchQuery('');
                          if (!opt.isPreset && opt.formulaName && !brandName) {
                            setBrandName(opt.formulaName);
                          }
                        }}
                        className={`w-full text-left p-2.5 text-xs flex justify-between items-center transition ${
                          String(selectedVersionId) === String(opt.id)
                            ? 'bg-emerald-50 text-emerald-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-800 font-medium'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold text-slate-900 truncate">{opt.formulaName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-slate-500">{opt.formulaCode}</span>
                            <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                              opt.isPreset
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {opt.isPreset ? 'STANDARD PRESET' : `${opt.versionStr} APPROVED`}
                            </span>
                            <span className="text-[10px] text-slate-400">({opt.categoryTag})</span>
                          </div>
                        </div>
                        {String(selectedVersionId) === String(opt.id) && (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Brand Name Input Field */}
          <div className="lg:col-span-2 md:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1.5 flex items-center justify-between">
              <span>Brand Name / Tatak (Type to Add)</span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Perfume Only • Prints on Sheet
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. MEOW KATY PERRY, Sauvage, Bvlgari, Chanel..."
              value={brandName}
              onChange={e => setBrandName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          {/* Target Batch Quantity */}
          <div className="lg:col-span-2 md:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1.5">Target Batch Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={targetBatchQty}
              onChange={e => setTargetBatchQty(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600 shadow-xs"
            />
          </div>

          {/* Target UOM */}
          <div className="lg:col-span-2 md:col-span-2">
            <label className="block text-slate-700 font-semibold mb-1.5">Target UOM *</label>
            <select
              value={targetUom}
              onChange={e => setTargetUom(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:outline-none focus:border-emerald-600 shadow-xs"
            >
              <option value="kg">kg (Kilograms)</option>
              <option value="g">g (Grams)</option>
            </select>
          </div>
        </div>

        {/* Process Loss Allowance & Quick Presets Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Quick Target Batch Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {[1, 5, 10, 25, 50, 100, 250, 500].map(kg => (
                <button
                  key={kg}
                  type="button"
                  onClick={() => handlePresetWeightClick(kg, 'kg')}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition ${
                    parseFloat(targetBatchQty) === kg && targetUom === 'kg'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {kg} kg
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-semibold whitespace-nowrap">Process Loss Allowance (%):</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={processLossPct}
              onChange={e => setProcessLossPct(e.target.value)}
              className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition"
        >
          <Calculator className="w-4 h-4" /> {loading ? 'Scaling Perfume Batch...' : 'Generate Batch Sheet'}
        </button>
      </form>

      {/* Scaled Batch Costing Breakdown & Document Preview */}
      {batchResult && (
        <div className="space-y-6">
          {/* Scaled Batch Financial & Costing Breakdown Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Scaled Batch Financial & Costing Summary
                </h3>
                <p className="text-xs text-slate-500">
                  Costing calculation for <span className="font-bold text-emerald-700">{Number(batchResult.target_batch_qty).toLocaleString('en-US')} {batchResult.target_uom}</span> target batch
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-right">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Total Batch Cost</span>
                  <span className="font-mono text-base font-extrabold text-emerald-900">
                    PHP {totalCostNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block font-medium">Batch Weight</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {Number(batchResult.target_batch_qty).toLocaleString('en-US')} {batchResult.target_uom}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  ({totalWeightGrams.toLocaleString('en-US')} g)
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block font-medium">Unit Cost (PHP / Gram)</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  PHP {costPerGram.toFixed(4)} / g
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block font-medium">Unit Cost (PHP / Kilogram)</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">
                  PHP {costPerKg.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / kg
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block font-medium">Est. Cost / 100ml Bottle</span>
                <span className="font-mono font-bold text-purple-700 text-sm">
                  PHP {costPer100mlBottle.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-purple-600 block font-mono">
                  (~85g liquid / unit)
                </span>
              </div>
            </div>

            {/* Material Line Costing Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-2.5">Phase</th>
                    <th className="p-2.5">Raw Material</th>
                    <th className="p-2.5 text-right">Unit Cost (PHP/g)</th>
                    <th className="p-2.5">Percentage (%)</th>
                    <th className="p-2.5 text-right">Scaled Weight ({batchResult.target_uom})</th>
                    <th className="p-2.5 text-right">Scaled Line Cost (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(batchResult.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-800">{item.phase_name || 'Phase A - Solvents & Base'}</td>
                      <td className="p-2.5 font-medium text-slate-900">{item.material_name_snapshot}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">PHP {Number(item.unit_cost_g || 0).toFixed(2)}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-700">{Number(item.percentage || 0).toFixed(2)}%</td>
                      <td className="p-2.5 text-right font-mono text-emerald-800 font-bold">
                        {Number(item.scaled_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {batchResult.target_uom}
                      </td>
                      <td className="p-2.5 text-right font-mono text-blue-800 font-bold">
                        PHP {Number(item.line_cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {/* Total Costing Summary Row */}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td colSpan="3" className="p-2.5 uppercase tracking-wider font-extrabold text-slate-800">
                      Total Scaled Batch Costing Summary:
                    </td>
                    <td className="p-2.5 font-mono text-indigo-700 font-black">
                      {(Math.round(((batchResult.items || []).reduce((acc, i) => acc + (parseFloat(i.percentage) || 0), 0) + Number.EPSILON) * 100) / 100).toFixed(2)}%
                    </td>
                    <td className="p-2.5 text-right font-mono text-emerald-900 font-extrabold text-sm">
                      {Number(batchResult.target_batch_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {batchResult.target_uom}
                    </td>
                    <td className="p-2.5 text-right font-mono text-blue-900 font-black text-sm">
                      PHP {totalCostNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Production Sheet Document Preview Box (ExcelProductionSheetTable Standard) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-md space-y-6 text-slate-900">
            {/* Header Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 uppercase">
                  Official Production Sheet Standard
                </span>
                <h2 className="text-base font-extrabold text-slate-900 mt-1 flex flex-wrap items-center gap-2">
                  <span>{batchResult.formula_code} — {batchResult.formula_name}</span>
                  {(brandName || batchResult.brand_name) && (
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">
                      Brand: {brandName || batchResult.brand_name}
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {batchResult.production_batch_id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof setSelectedBatchId === 'function') {
                        setSelectedBatchId(batchResult.production_batch_id);
                      }
                      if (typeof setCurrentPage === 'function') {
                        setCurrentPage('operator-compounding-screen');
                      }
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition"
                    title="Open batch directly in Operator Compounding Station"
                  >
                    <Play className="w-4 h-4" /> Start Compounding Execution
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition"
                >
                  <Printer className="w-4 h-4" /> Save / Export PDF
                </button>
              </div>
            </div>

            {/* PDF Document Box */}
            <div className="border border-slate-300 p-8 rounded-xl bg-white space-y-6 font-sans">
              {/* Document Header */}
              <div className="text-center space-y-1">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">NKB Manufacturing Corporation</h1>
                <h2 className="text-sm font-extrabold tracking-widest text-slate-900 uppercase">PERFUME PRODUCTION SHEET</h2>
                {(brandName || batchResult.brand_name) && (
                  <div className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                    BRAND: {brandName || batchResult.brand_name}
                  </div>
                )}
              </div>

              {/* Meta Section */}
              <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-4">
                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-900">Compounding Number:</span>{' '}
                    <span className="font-mono font-extrabold text-emerald-700">
                      {batchResult.compounding_code || (batchResult.formula_code ? `CP-${batchResult.formula_code.replace(/[^0-9]/g, '')}` : 'CP-0001')}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Target Quantity:</span>{' '}
                    <span className="font-mono font-bold text-emerald-700">
                      {Number(batchResult.target_batch_qty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {batchResult.target_uom?.toUpperCase() || 'KG'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Formulation:</span> {batchResult.formula_name?.toUpperCase()}
                  </div>
                  {(brandName || batchResult.brand_name) && (
                    <div>
                      <span className="font-bold text-slate-900">Brand Name:</span>{' '}
                      <span className="font-extrabold text-emerald-800 uppercase">{brandName || batchResult.brand_name}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-900">Version:</span> V{batchResult.version || '1.0'}
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div>
                    <span className="font-bold text-slate-900">Date:</span>{' '}
                    {new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">Prepared By:</span>{' '}
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Norvin Bella')}
                  </div>
                </div>
              </div>

              {/* Production Sheet Table (Excel-style Editable with Col/Row Resizing & Auto-Save) */}
              <ExcelProductionSheetTable
                compoundingCode={batchResult.compounding_code || (batchResult.formula_code ? `CP-${batchResult.formula_code.replace(/[^0-9]/g, '')}` : 'CP-0001')}
                batchResult={batchResult}
                phaseKeys={phaseKeys}
                phaseMap={phaseMap}
                onLayoutChange={setCurrentSheetLayout}
              />

              {/* Quality Parameters & Specifications Table (Perfume Standard) */}
              <div className="space-y-1.5 pt-1">
                <div className="font-extrabold text-slate-900 text-xs tracking-wider uppercase">QUALITY PARAMETERS & QC EVALUATION REVIEW:</div>
                <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-700">
                        <th className="p-2.5 w-1/4">Quality Parameter</th>
                        <th className="p-2.5 w-1/3">Approved Specification</th>
                        <th className="p-2.5">Actual QC Review / Finding (Chechekan)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Appearance & Clarity</td>
                        <td className="p-2.5 text-slate-600">Clear, transparent, homogeneous liquid</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Clear & Transparent</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Slightly Hazy</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Turbid / Precipitate</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Color</td>
                        <td className="p-2.5 text-slate-600">Conforms to approved standard</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Conforms to Standard</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Off-Color / Discolored</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Odor / Fragrance</td>
                        <td className="p-2.5 text-slate-600">Characteristic fragrance; conforms to approved standard</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Characteristic / Conforms</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Off-Odor</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Weak Scent</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Specific Gravity</td>
                        <td className="p-2.5 text-slate-600">Per approved specification</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Within Spec</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Out of Spec</span>
                            </label>
                            <span className="text-[11px] text-slate-500 font-mono">[ Actual: _________ ]</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Viscosity</td>
                        <td className="p-2.5 text-slate-600">Per approved specification</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Within Spec</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Out of Spec</span>
                            </label>
                            <span className="text-[11px] text-slate-500 font-mono">[ Actual: ____ cP ]</span>
                          </div>
                        </td>
                      </tr>

                      <tr>
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-900">Maceration / Aging</td>
                        <td className="p-2.5 text-slate-600">24 hours in Drum/Tub</td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap items-center gap-4 text-slate-800 font-medium">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Completed (24 Hours)</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <span className="w-3.5 h-3.5 border-2 border-slate-700 rounded-xs inline-block shrink-0"></span>
                              <span>Ongoing Aging</span>
                            </label>
                            <span className="text-[11px] text-slate-500 font-mono">[ Hour: ____ / 24 ]</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-amber-50/40">
                        <td className="p-2.5 bg-amber-100/60 font-black text-slate-900">Final QC Status</td>
                        <td className="p-2.5 font-semibold text-slate-700">Quality Disposition for Release / Filling</td>
                        <td className="p-2.5 font-bold">
                          <div className="flex items-center gap-6">
                            <label className="inline-flex items-center gap-1.5 text-emerald-800 font-extrabold cursor-pointer">
                              <span className="w-4 h-4 border-2 border-emerald-800 rounded-xs inline-block shrink-0"></span>
                              <span>PASS (Approved)</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-rose-800 font-extrabold cursor-pointer">
                              <span className="w-4 h-4 border-2 border-rose-800 rounded-xs inline-block shrink-0"></span>
                              <span>FAIL (Rejected)</span>
                            </label>
                            <label className="inline-flex items-center gap-1.5 text-amber-800 font-bold cursor-pointer">
                              <span className="w-4 h-4 border-2 border-amber-800 rounded-xs inline-block shrink-0"></span>
                              <span>ON HOLD</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Standard Operating Procedure (Perfume Compounding Protocol) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <Droplet className="w-4 h-4 text-emerald-600" /> Standard Operating Procedure (Perfume Compounding Protocol)
                  </div>
                  {batchResult?.batch_calculation_id && (
                    <div className="flex items-center gap-2">
                      {sopSaveStatus && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {sopSaveStatus}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveSopTimestamps()}
                        disabled={savingSop}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" /> {savingSop ? 'Saving...' : 'Save Timestamps'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Step 1 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-amber-800 block text-[11px] mb-1">Step 1: Solvents & Base (Phase A)</span>
                      <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
                        Charge Ethyl Alcohol and Procol into the mixing vessel. Agitate slowly at 120 RPM for 5 minutes.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px]">
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">Start: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step1_start}
                          onChange={e => handleSopTimestampChange('step1_start', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">End: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step1_end}
                          onChange={e => handleSopTimestampChange('step1_end', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-purple-800 block text-[11px] mb-1">Step 2: Fragrance Premix (Phase B)</span>
                      <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
                        Premix Parfum Oil with PEG-40 Solubilizer in the premix tank until clear. Slowly incorporate the fragrance premix into Phase A.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px]">
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">Start: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step2_start}
                          onChange={e => handleSopTimestampChange('step2_start', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">End: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step2_end}
                          onChange={e => handleSopTimestampChange('step2_end', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-emerald-800 block text-[11px] mb-1">Step 3: Fixative & Final Mixing (Phase C)</span>
                      <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
                        Add Fixative to the mixture. Mix for 15 minutes until homogeneous.
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px]">
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">Start: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step3_start}
                          onChange={e => handleSopTimestampChange('step3_start', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">End: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step3_end}
                          onChange={e => handleSopTimestampChange('step3_end', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-blue-800 block text-[11px] mb-1">Step 4: Maceration / Aging</span>
                      <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
                        Transfer the compounded perfume into a Drum/Tub. Allow the product to undergo maceration/aging for 24 hours.
                      </p>
                      <div className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded inline-block mb-1">
                        Required duration: 24 Hours
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[10px]">
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">Start: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step4_start}
                          onChange={e => handleSopTimestampChange('step4_start', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-600 block mb-0.5">End: [ Date / Time ]</label>
                        <input
                          type="datetime-local"
                          value={sopTimestamps.step4_end}
                          onChange={e => handleSopTimestampChange('step4_end', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes / Instructions Section */}
              <div className="text-xs space-y-1 pt-2">
                <div className="font-extrabold text-slate-900 uppercase">NOTES / INSTRUCTIONS:</div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <span className="text-[10px]">◆</span> Follow step order strictly: Phase A (Solvents & Humectants) → Phase B (Fragrance Premix) → Phase C (Fixative & Aging) → Maceration/Aging.
                </div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <span className="text-[10px]">◆</span> Verify all raw material tare and net weights before addition.
                </div>
                <div className="text-slate-700 flex items-center gap-1.5">
                  <span className="text-[10px]">◆</span> Record lot numbers and transfer batch to Drum/Tub for 24-hour maceration/aging prior to final filtration.
                </div>
              </div>

              {/* Signatures Section */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-xs text-center">
                <div>
                  <div className="text-left text-slate-600 mb-6">Prepared by:</div>
                  <div className="font-bold text-slate-900 text-xs mb-1">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (user?.username || 'Norvin Bella')}
                  </div>
                  <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                  <div className="text-[11px] text-slate-500">Formulator Signature</div>
                </div>
                <div>
                  <div className="text-left text-slate-600 mb-6">Checked by:</div>
                  <div className="font-bold text-slate-900 text-xs mb-1">&nbsp;</div>
                  <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                  <div className="text-[11px] text-slate-500">QC Chemist Signature</div>
                </div>
                <div>
                  <div className="text-left text-slate-600 mb-6">Completed by:</div>
                  <div className="font-bold text-slate-900 text-xs mb-1">&nbsp;</div>
                  <div className="border-b-2 border-slate-900 w-full mb-1"></div>
                  <div className="text-[11px] text-slate-500">Production Operator & Date</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerfumeBatchCalculator;
