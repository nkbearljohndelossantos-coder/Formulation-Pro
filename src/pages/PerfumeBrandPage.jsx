import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../components/Badge';
import {
  Sparkles,
  Calculator,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Wand2,
  FileEdit,
  Sliders,
  ShieldAlert,
  Droplet,
  Layers,
} from 'lucide-react';
import { apiFetch } from '../services/api';

// Standard Perfume Brand Formula Presets requested by user
const PRESET_WITHOUT_WATER = [
  { name: 'Ethyl', code: 'MAT-ETHYL', percentage: '80.00', role: 'Solvent / Base' },
  { name: 'Parfum', code: 'MAT-PARFUM', percentage: '14.00', role: 'Fragrance Oil' },
  { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', role: 'Solubilizer' },
  { name: 'Procol', code: 'MAT-PROCOL', percentage: '3.00', role: 'Humectant' },
  { name: 'Fixative', code: 'MAT-FIXATIVE', percentage: '2.00', role: 'Fixative' },
];

const PRESET_WITH_WATER = [
  { name: 'Ethyl', code: 'MAT-ETHYL', percentage: '68.00', role: 'Solvent / Base' },
  { name: 'Parfum', code: 'MAT-PARFUM', percentage: '14.00', role: 'Fragrance Oil' },
  { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', role: 'Solubilizer' },
  { name: 'Procol', code: 'MAT-PROCOL', percentage: '3.00', role: 'Humectant' },
  { name: 'Fixative', code: 'MAT-FIXATIVE', percentage: '2.00', role: 'Fixative' },
  { name: 'Water', code: 'MAT-WATER', percentage: '12.00', role: 'Diluent / Solvent' },
];

export function PerfumeBrandPage({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'convert', 'conversion-history'

  // Master Raw Materials List from DB
  const [masterMaterials, setMasterMaterials] = useState([]);

  // Saved Brand Formulas & Mixtures & History
  const [mixtures, setMixtures] = useState([]);
  const [brandFormulas, setBrandFormulas] = useState([]);
  const [history, setHistory] = useState([]);

  // FORMULA REVISION & CREATION EDITOR STATE
  const [selectedFormulaPreset, setSelectedFormulaPreset] = useState('WITHOUT_WATER'); // 'WITHOUT_WATER' | 'WITH_WATER' | 'CUSTOM'
  const [formulaMeta, setFormulaMeta] = useState({
    code: `PFB-${new Date().getFullYear()}-001`,
    name: 'Perfume Brand Formula (Without Water)',
    targetBatchSize: '100.00',
    targetBatchUom: 'kg',
    revisionReason: 'Standard Perfume Formulation V1.0',
  });

  const [formulaIngredients, setFormulaIngredients] = useState(PRESET_WITHOUT_WATER);
  const [savingFormula, setSavingFormula] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Conversion Wizard State
  const [selectedMixtureId, setSelectedMixtureId] = useState('');
  const [selectedBrandVersionId, setSelectedBrandVersionId] = useState('');
  const [mode, setMode] = useState('FIXED_TARGET_WEIGHT');
  const [specifiedTargetWeight, setSpecifiedTargetWeight] = useState('100.000000');

  const [calcResult, setCalcResult] = useState(null);
  const [savedConversionId, setSavedConversionId] = useState(null);
  const [actualAdditionsInput, setActualAdditionsInput] = useState({});
  const [loading, setLoading] = useState(false);

  // Load Master Data & Existing Formulas
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = () => {
    apiFetch('/api/v1/materials')
      .then(r => r.json())
      .then(d => d.success && setMasterMaterials(d.data || []))
      .catch(() => {});

    apiFetch('/api/v1/perfume-conversions/mixtures')
      .then(r => r.json())
      .then(d => d.success && setMixtures(d.data || []))
      .catch(() => {});

    apiFetch('/api/v1/formulas?category=Perfume Brand')
      .then(r => r.json())
      .then(d => d.success && setBrandFormulas(d.data || []))
      .catch(() => {});

    apiFetch('/api/v1/perfume-conversions')
      .then(r => r.json())
      .then(d => d.success && setHistory(d.data || []))
      .catch(() => {});
  };

  // Switch Presets
  const handleLoadPreset = (type) => {
    setSelectedFormulaPreset(type);
    setSaveSuccessMsg('');
    if (type === 'WITHOUT_WATER') {
      setFormulaIngredients(PRESET_WITHOUT_WATER.map(item => ({ ...item })));
      setFormulaMeta(prev => ({
        ...prev,
        name: 'Perfume Brand Formula (Without Water)',
        code: prev.code || `PFB-${new Date().getFullYear()}-001`,
      }));
    } else if (type === 'WITH_WATER') {
      setFormulaIngredients(PRESET_WITH_WATER.map(item => ({ ...item })));
      setFormulaMeta(prev => ({
        ...prev,
        name: 'Perfume Brand Formula (With Water)',
        code: prev.code || `PFB-${new Date().getFullYear()}-002`,
      }));
    }
  };

  // Ingredient Row Field Change (Name, Percentage, Role)
  const handleIngredientChange = (index, field, value) => {
    setSaveSuccessMsg('');
    const updated = [...formulaIngredients];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'material_id') {
      const selectedMat = masterMaterials.find(m => String(m.id) === String(value));
      if (selectedMat) {
        updated[index].name = selectedMat.name;
        updated[index].code = selectedMat.code;
        updated[index].material_id = selectedMat.id;
      }
    }

    setFormulaIngredients(updated);
  };

  // Add Row
  const handleAddIngredientRow = () => {
    setFormulaIngredients(prev => [
      ...prev,
      { name: 'New Ingredient', code: `MAT-CUSTOM-${prev.length + 1}`, percentage: '0.00', role: 'Additive' },
    ]);
  };

  // Remove Row
  const handleRemoveIngredientRow = (index) => {
    if (formulaIngredients.length <= 1) {
      alert('A formula must have at least 1 ingredient.');
      return;
    }
    setFormulaIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate Total Percentage
  const totalPercentage = formulaIngredients.reduce(
    (sum, item) => sum + (parseFloat(item.percentage) || 0),
    0
  );

  // Auto-Balance to 100% by adjusting Solvent (Ethyl or Water)
  const handleAutoBalance = () => {
    const diff = 100 - totalPercentage;
    if (Math.abs(diff) < 0.0001) return;

    const updated = [...formulaIngredients];
    let solventIdx = updated.findIndex(item => item.name.toLowerCase().includes('ethyl'));
    if (solventIdx === -1) {
      solventIdx = updated.findIndex(item => item.name.toLowerCase().includes('water'));
    }
    if (solventIdx === -1) solventIdx = 0;

    const currentVal = parseFloat(updated[solventIdx].percentage) || 0;
    const newVal = Math.max(0, currentVal + diff);
    updated[solventIdx].percentage = newVal.toFixed(2);
    setFormulaIngredients(updated);
  };

  // Save Brand Formula Revision to Database
  const handleSaveFormula = async () => {
    if (!formulaMeta.name.trim()) {
      alert('Please enter a Formula Name.');
      return;
    }

    if (Math.abs(totalPercentage - 100) > 0.01) {
      if (!confirm(`Warning: Total formula percentage is currently ${totalPercentage.toFixed(2)}% (not 100.00%). Do you still want to save?`)) {
        return;
      }
    }

    setSavingFormula(true);
    setSaveSuccessMsg('');

    try {
      const res1 = await apiFetch('/api/v1/formulas', {
        method: 'POST',
        body: JSON.stringify({
          name: formulaMeta.name,
          category: 'Perfume Brand',
          formula_type: 'PERFUME',
          product_category: 'Perfume Brand',
          product_subcategory: selectedFormulaPreset === 'WITH_WATER' ? 'Eau de Parfum (Hydrated)' : 'Eau de Parfum (Concentrated)',
          brand_type: 'Perfume Brand Core',
          reference_batch_size: formulaMeta.targetBatchSize,
          reference_batch_uom: formulaMeta.targetBatchUom,
          revision_reason: formulaMeta.revisionReason,
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok || !data1.success) {
        throw new Error(data1.message || 'Failed to create brand formula master.');
      }

      const versionId = data1.versionId || data1.data?.version_id;

      const materialsPayload = formulaIngredients.map((item, idx) => {
        let matId = item.material_id;
        if (!matId) {
          const match = masterMaterials.find(m => m.name.toLowerCase() === item.name.toLowerCase() || m.code.toLowerCase() === item.code.toLowerCase());
          if (match) matId = match.id;
        }

        return {
          material_id: matId || 1,
          material_code_snapshot: item.code || `MAT-${idx + 1}`,
          material_name_snapshot: item.name,
          percentage: (parseFloat(item.percentage) || 0).toFixed(6),
          addition_order: idx + 1,
          phase_name: 'Phase A (Mixing)',
          role: item.role || 'Ingredient',
        };
      });

      const res2 = await apiFetch(`/api/v1/formulas/versions/${versionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          materials: materialsPayload,
          targetBatchSize: formulaMeta.targetBatchSize,
          targetBatchUom: formulaMeta.targetBatchUom,
        }),
      });

      const data2 = await res2.json();
      if (!res2.ok || !data2.success) {
        throw new Error(data2.message || 'Failed to save formula version materials.');
      }

      await apiFetch(`/api/v1/formulas/versions/${versionId}/approve`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'APPROVE', comments: 'Auto-approved for Perfume Conversion Engine' }),
      });

      setSaveSuccessMsg(`✅ Formula "${formulaMeta.name}" (${data1.code || formulaMeta.code}) saved & approved successfully!`);
      loadMasterData();

    } catch (err) {
      alert(`Error saving formula: ${err.message}`);
    } finally {
      setSavingFormula(false);
    }
  };

  // Run Conversion Calculator Engine
  const runCalculation = () => {
    if (!selectedMixtureId || !selectedBrandVersionId) {
      alert('Please select both a Source Recorded Mixture and Target Brand Formula.');
      return;
    }

    setLoading(true);
    fetch('/api/v1/perfume-conversions/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('nkb_access_token')}`,
      },
      body: JSON.stringify({
        mixtureId: selectedMixtureId,
        targetBrandVersionId: selectedBrandVersionId,
        mode,
        specifiedTargetWeight,
      }),
    })
      .then(r => r.json())
      .then(d => {
        setLoading(false);
        if (d.success) {
          setCalcResult(d.data);
          const initialAdditions = {};
          d.data.additions.forEach(a => {
            initialAdditions[a.material_id] = a.required_addition;
          });
          setActualAdditionsInput(initialAdditions);
        } else {
          alert(`Calculation Error: ${d.message}`);
        }
      })
      .catch(err => {
        setLoading(false);
        alert(`Error: ${err.message}`);
      });
  };

  const saveConversionRecord = () => {
    if (!calcResult) return;
    fetch('/api/v1/perfume-conversions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('nkb_access_token')}`,
      },
      body: JSON.stringify({
        mixtureId: selectedMixtureId,
        targetBrandVersionId: selectedBrandVersionId,
        mode,
        specifiedTargetWeight,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSavedConversionId(d.conversionId);
          alert(`Conversion calculation record saved with ID ${d.conversionId} (${calcResult.is_feasible ? 'Feasible' : 'INFEASIBLE Analysis Record'})`);
        } else {
          alert(`Save Error: ${d.message}`);
        }
      });
  };

  const completeConversion = () => {
    if (!savedConversionId) {
      alert('Please save the conversion calculation record before marking as COMPLETED.');
      return;
    }

    const payloadAdditions = Object.entries(actualAdditionsInput).map(([matId, actualAdd]) => ({
      material_id: Number(matId),
      actual_addition: actualAdd,
    }));

    fetch(`/api/v1/perfume-conversions/${savedConversionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('nkb_access_token')}`,
      },
      body: JSON.stringify({ actualAdditions: payloadAdditions }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          alert('Perfume conversion successfully COMPLETED!');
          setCalcResult(null);
          setSavedConversionId(null);
          setActiveTab('conversion-history');
          fetch('/api/v1/perfume-conversions')
            .then(r => r.json())
            .then(d => d.success && setHistory(d.data));
        } else {
          alert(`Completion Error: ${d.message}`);
        }
      });
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Header & Sub-Navigation Tabs (Clean Light Theme) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" /> Perfume Brand Formulation & Conversion Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Formulate brand presets (Without Water & With Water), revise ingredient percentages, and run conversion balance.
          </p>
        </div>

        {/* Tab Buttons (Light Theme) */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Formula Presets & Editor
          </button>
          <button
            onClick={() => setActiveTab('convert')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'convert'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" /> Conversion Calculator
          </button>
          <button
            onClick={() => setActiveTab('conversion-history')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'conversion-history'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Conversion History
          </button>
        </div>
      </div>

      {/* TAB 1: FORMULA PRESETS & REVISION EDITOR */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          {/* Preset Selector Cards (Clean Light Theme) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-500" /> Select Standard Perfume Formula Template
              </h3>
              <span className="text-[11px] text-slate-500">Click a preset below to instantly load its formulation base</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preset 1: Without Water */}
              <div
                onClick={() => handleLoadPreset('WITHOUT_WATER')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedFormulaPreset === 'WITHOUT_WATER'
                    ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                    : 'bg-slate-50/80 border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-amber-600" />
                    <h4 className="font-bold text-sm text-slate-900">Without Water (Concentrated 80% Base)</h4>
                  </div>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold rounded-full">
                    5 Ingredients • 100.00%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">Pure anhydrous perfume formulation base without aqueous dilution.</p>
                <div className="grid grid-cols-5 gap-1 text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ethyl</span>
                    <span className="font-bold text-amber-700">80.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parfum</span>
                    <span className="font-bold text-purple-700">14.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Peg-40</span>
                    <span className="font-bold text-blue-700">1.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Procol</span>
                    <span className="font-bold text-emerald-700">3.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Fixative</span>
                    <span className="font-bold text-rose-700">2.00%</span>
                  </div>
                </div>
              </div>

              {/* Preset 2: With Water */}
              <div
                onClick={() => handleLoadPreset('WITH_WATER')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedFormulaPreset === 'WITH_WATER'
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                    : 'bg-slate-50/80 border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-blue-600" />
                    <h4 className="font-bold text-sm text-slate-900">With Water (Hydrated 68% Base)</h4>
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-full">
                    6 Ingredients • 100.00%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">Hydrated perfume formulation base containing 12.00% deionized water.</p>
                <div className="grid grid-cols-6 gap-1 text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ethyl</span>
                    <span className="font-bold text-amber-700">68.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parfum</span>
                    <span className="font-bold text-purple-700">14.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Peg-40</span>
                    <span className="font-bold text-blue-700">1.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Procol</span>
                    <span className="font-bold text-emerald-700">3.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Fixative</span>
                    <span className="font-bold text-rose-700">2.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Water</span>
                    <span className="font-bold text-cyan-700">12.00%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Formula Revision Editor (Light Theme) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <FileEdit className="w-5 h-5 text-amber-500" /> Formula Composition & Revision Workspace
                </h3>
                <p className="text-xs text-slate-500">Modify percentages, swap ingredients, add custom rows, and auto-balance.</p>
              </div>

              {/* Total Percentage Counter & Auto-Balance */}
              <div className="flex items-center gap-3">
                <div
                  className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 ${
                    Math.abs(totalPercentage - 100) < 0.001
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse'
                  }`}
                >
                  {Math.abs(totalPercentage - 100) < 0.001 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                  )}
                  Total: {totalPercentage.toFixed(2)}%
                </div>

                <button
                  type="button"
                  onClick={handleAutoBalance}
                  title="Automatically adjust Ethyl/Water percentage to sum exactly to 100.00%"
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-amber-900 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" /> Auto-Balance 100%
                </button>
              </div>
            </div>

            {/* Formula Meta Information Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Formula Name *</label>
                <input
                  type="text"
                  value={formulaMeta.name}
                  onChange={e => setFormulaMeta({ ...formulaMeta, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Perfume Brand - Without Water"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Batch Size (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formulaMeta.targetBatchSize}
                  onChange={e => setFormulaMeta({ ...formulaMeta, targetBatchSize: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-emerald-700 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Revision Reason / Notes</label>
                <input
                  type="text"
                  value={formulaMeta.revisionReason}
                  onChange={e => setFormulaMeta({ ...formulaMeta, revisionReason: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Revised Parfum concentration to 14.00%"
                />
              </div>
            </div>

            {/* Ingredients Composition Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3 w-12">#</th>
                    <th className="p-3">Ingredient / Raw Material Name</th>
                    <th className="p-3 w-36">Material Code</th>
                    <th className="p-3 w-36 text-right">Percentage (%)</th>
                    <th className="p-3 w-40">Role / Function</th>
                    <th className="p-3 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {formulaIngredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={ing.name}
                            onChange={e => handleIngredientChange(idx, 'name', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                          />
                          {masterMaterials.length > 0 && (
                            <select
                              onChange={e => handleIngredientChange(idx, 'material_id', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-600"
                            >
                              <option value="">-- Or link from Master Materials --</option>
                              {masterMaterials.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.code} — {m.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={ing.code || ''}
                          onChange={e => handleIngredientChange(idx, 'code', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-mono text-amber-700 font-bold"
                        />
                      </td>
                      <td className="p-3 text-right">
                        <div className="relative inline-block w-28">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={ing.percentage}
                            onChange={e => handleIngredientChange(idx, 'percentage', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-right font-extrabold text-emerald-700 pr-6"
                          />
                          <span className="absolute right-2 top-2 text-slate-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={ing.role || ''}
                          onChange={e => handleIngredientChange(idx, 'role', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700"
                          placeholder="e.g. Solvent, Fixative"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Remove Ingredient Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Editor Action Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
              >
                <Plus className="w-4 h-4 text-emerald-600" /> Add Ingredient Row
              </button>

              <button
                type="button"
                onClick={handleSaveFormula}
                disabled={savingFormula}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> {savingFormula ? 'Saving & Approving Formula...' : 'Save & Approve Brand Formula'}
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{saveSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONVERSION CALCULATOR (Clean Light Theme) */}
      {activeTab === 'convert' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-3">
              1. Select Source Recorded Mixture & Target Approved Brand Formula
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Source Recorded Mixture *</label>
                <select
                  value={selectedMixtureId}
                  onChange={e => setSelectedMixtureId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Select Recorded Source Mixture --</option>
                  {mixtures.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.mixture_code} — {m.mixture_name} ({Number(m.actual_total_weight).toFixed(2)} {m.weight_uom})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Target Approved Brand Formula Version *</label>
                <select
                  value={selectedBrandVersionId}
                  onChange={e => setSelectedBrandVersionId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-amber-700 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Select Target Approved Brand Formula --</option>
                  {brandFormulas.map(f =>
                    (f.versions || [])
                      .filter(v => v.version_status === 'APPROVED' || v.version_status === 'DRAFT')
                      .map(v => (
                        <option key={v.id} value={v.id}>
                          {f.code} — {f.name} (V{v.major_version}.{v.minor_version} {v.version_status})
                        </option>
                      ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Conversion Mode</label>
                <select
                  value={mode}
                  onChange={e => setMode(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-amber-500"
                >
                  <option value="FIXED_TARGET_WEIGHT">Mode 1: Fixed Target Batch Weight</option>
                  <option value="AUTO_MINIMUM_FINAL_WEIGHT">Mode 2: Auto-Calculate Minimum Final Batch Weight</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1.5">Target Batch Weight (kg)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={specifiedTargetWeight}
                  onChange={e => setSpecifiedTargetWeight(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-emerald-700 font-mono font-bold focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <button
              onClick={runCalculation}
              disabled={loading}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <Calculator className="w-4 h-4" /> {loading ? 'Calculating Mathematical Balance...' : 'Calculate Brand Additions'}
            </button>
          </div>

          {/* CALCULATION RESULTS PANEL */}
          {calcResult && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              {!calcResult.is_feasible ? (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-rose-700 uppercase tracking-wider">
                    <ShieldAlert className="w-5 h-5 text-rose-600" /> Blocking Warning: Conversion Infeasible by Addition Alone!
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-slate-800">{calcResult.blocking_warning_text}</pre>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-slate-900">Mathematical Balance Feasible!</p>
                    <p className="text-slate-700">
                      Calculated final batch weight: <span className="font-mono font-bold text-emerald-700">{calcResult.final_target_weight} kg</span> (Min feasible weight: {calcResult.min_feasible_weight} kg).
                    </p>
                  </div>
                </div>
              )}

              {/* Additions Breakdown Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-800">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                    <tr>
                      <th className="p-3">Material Code</th>
                      <th className="p-3">Material Name</th>
                      <th className="p-3">Target %</th>
                      <th className="p-3">Existing (kg)</th>
                      <th className="p-3">Target Req (kg)</th>
                      <th className="p-3">Calculated Addition (kg)</th>
                      {calcResult.is_feasible && <th className="p-3">Actual Addition (kg)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {calcResult.additions.map(a => (
                      <tr key={a.material_id} className={a.is_negative ? 'bg-rose-50/60' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-mono font-bold text-amber-700">{a.material_code}</td>
                        <td className="p-3 font-medium text-slate-900">{a.material_name}</td>
                        <td className="p-3 font-mono text-purple-700 font-bold">{Number(a.target_percentage).toFixed(4)}%</td>
                        <td className="p-3 font-mono">{Number(a.existing_amount).toFixed(4)}</td>
                        <td className="p-3 font-mono">{Number(a.target_amount).toFixed(4)}</td>
                        <td className={`p-3 font-mono font-bold ${a.is_negative ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {Number(a.required_addition).toFixed(4)} {a.is_negative && '(EXCESS)'}
                        </td>
                        {calcResult.is_feasible && (
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.0001"
                              value={actualAdditionsInput[a.material_id] || ''}
                              onChange={e =>
                                setActualAdditionsInput({
                                  ...actualAdditionsInput,
                                  [a.material_id]: e.target.value,
                                })
                              }
                              className="w-28 bg-white border border-slate-300 rounded px-2 py-1 font-mono text-xs font-bold text-emerald-700"
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <button
                  onClick={saveConversionRecord}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs"
                >
                  Save Analysis Record ({calcResult.is_feasible ? 'CALCULATED' : 'INFEASIBLE'})
                </button>

                {calcResult.is_feasible && (
                  <button
                    onClick={completeConversion}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2"
                  >
                    Mark Conversion COMPLETED & Save Snapshot
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CONVERSION HISTORY */}
      {activeTab === 'conversion-history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Source Mixture</th>
                  <th className="p-3.5">Target Brand Formula</th>
                  <th className="p-3.5">Mode</th>
                  <th className="p-3.5">Final Weight</th>
                  <th className="p-3.5">Feasible</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">No conversion history records found.</td>
                  </tr>
                ) : (
                  history.map(h => (
                    <tr key={h.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-mono text-slate-500">#{h.id}</td>
                      <td className="p-3.5 font-medium text-slate-900">{h.mixture_code} — {h.mixture_name}</td>
                      <td className="p-3.5 font-semibold text-amber-700">{h.target_brand_formula_code} ({h.target_brand_formula_name})</td>
                      <td className="p-3.5 text-[11px] font-mono text-slate-500">{h.mode}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">{Number(h.final_target_weight).toFixed(2)} kg</td>
                      <td className="p-3.5 font-bold">
                        {h.is_feasible ? <span className="text-emerald-600">Yes</span> : <span className="text-rose-600">INFEASIBLE</span>}
                      </td>
                      <td className="p-3.5"><StatusBadge status={h.conversion_status} /></td>
                      <td className="p-3.5 font-mono text-slate-500">{new Date(h.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
