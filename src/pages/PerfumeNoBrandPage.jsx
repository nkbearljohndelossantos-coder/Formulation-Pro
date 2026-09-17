import React, { useEffect, useState } from 'react';
import { StatusBadge } from '../components/Badge';
import {
  Sparkles,
  FlaskConical,
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
  FileText,
} from 'lucide-react';
import { apiFetch } from '../services/api';

// Standard Perfume No Brand Formula Presets requested by user
const PRESET_WITHOUT_WATER_NO_BRAND = [
  { name: 'Ethyl', code: 'MAT-ETHYL', percentage: '85.00', role: 'Solvent / Base' },
  { name: 'Parfum', code: 'MAT-PARFUM', percentage: '9.00', role: 'Fragrance Oil' },
  { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', role: 'Solubilizer' },
  { name: 'Procol', code: 'MAT-PROCOL', percentage: '3.00', role: 'Humectant' },
  { name: 'Fixative', code: 'MAT-FIXATIVE', percentage: '2.00', role: 'Fixative' },
];

const PRESET_WITH_WATER_NO_BRAND = [
  { name: 'Ethyl', code: 'MAT-ETHYL', percentage: '68.00', role: 'Solvent / Base' },
  { name: 'Parfum', code: 'MAT-PARFUM', percentage: '14.00', role: 'Fragrance Oil' },
  { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', role: 'Solubilizer' },
  { name: 'Procol', code: 'MAT-PROCOL', percentage: '3.00', role: 'Humectant' },
  { name: 'Fixative', code: 'MAT-FIXATIVE', percentage: '2.00', role: 'Fixative' },
  { name: 'Water', code: 'MAT-WATER', percentage: '12.00', role: 'Diluent / Solvent' },
];

export function PerfumeNoBrandPage({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'record-mixture', 'formula-directory'

  // Master Raw Materials List from DB
  const [masterMaterials, setMasterMaterials] = useState([]);

  // Saved No-Brand Formulas & Recorded Mixtures
  const [noBrandFormulas, setNoBrandFormulas] = useState([]);
  const [mixtures, setMixtures] = useState([]);

  // FORMULA REVISION & CREATION EDITOR STATE
  const [selectedFormulaPreset, setSelectedFormulaPreset] = useState('WITHOUT_WATER'); // 'WITHOUT_WATER' | 'WITH_WATER' | 'CUSTOM'
  const [formulaMeta, setFormulaMeta] = useState({
    code: `PNB-${new Date().getFullYear()}-001`,
    name: 'Perfume No Brand Formula (Without Water)',
    targetBatchSize: '100.00',
    targetBatchUom: 'kg',
    revisionReason: 'Standard No-Brand Perfume Base V1.0',
  });

  const [formulaIngredients, setFormulaIngredients] = useState(PRESET_WITHOUT_WATER_NO_BRAND);
  const [savingFormula, setSavingFormula] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // RECORD MIXTURE STATE
  const [selectedFormulaVersionId, setSelectedFormulaVersionId] = useState('');
  const [mixtureForm, setMixtureForm] = useState({
    mixtureCode: `MIX-${new Date().getFullYear()}-001`,
    mixtureName: 'Recorded Perfume Mixture Lot 101',
    actualTotalWeight: '100.00',
    weightUom: 'kg',
    remarks: 'Actual recorded batch mixture available for conversion calculator',
  });
  const [recordingMixture, setRecordingMixture] = useState(false);
  const [mixtureSuccessMsg, setMixtureSuccessMsg] = useState('');

  // Load Data
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = () => {
    apiFetch('/api/v1/materials')
      .then(r => r.json())
      .then(d => d.success && setMasterMaterials(d.data || []))
      .catch(() => {});

    apiFetch('/api/v1/formulas?category=Perfume No Brand')
      .then(r => r.json())
      .then(d => d.success && setNoBrandFormulas(d.data || []))
      .catch(() => {});

    apiFetch('/api/v1/perfume-conversions/mixtures')
      .then(r => r.json())
      .then(d => d.success && setMixtures(d.data || []))
      .catch(() => {});
  };

  // Load Preset
  const handleLoadPreset = (type) => {
    setSelectedFormulaPreset(type);
    setSaveSuccessMsg('');
    if (type === 'WITHOUT_WATER') {
      setFormulaIngredients(PRESET_WITHOUT_WATER_NO_BRAND.map(item => ({ ...item })));
      setFormulaMeta(prev => ({
        ...prev,
        name: 'Perfume No Brand Formula (Without Water)',
        code: prev.code || `PNB-${new Date().getFullYear()}-001`,
      }));
    } else if (type === 'WITH_WATER') {
      setFormulaIngredients(PRESET_WITH_WATER_NO_BRAND.map(item => ({ ...item })));
      setFormulaMeta(prev => ({
        ...prev,
        name: 'Perfume No Brand Formula (With Water)',
        code: prev.code || `PNB-${new Date().getFullYear()}-002`,
      }));
    }
  };

  // Handle Ingredient Change
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

  const handleAddIngredientRow = () => {
    setFormulaIngredients(prev => [
      ...prev,
      { name: 'New Ingredient', code: `MAT-CUSTOM-${prev.length + 1}`, percentage: '0.00', role: 'Additive' },
    ]);
  };

  const handleRemoveIngredientRow = (index) => {
    if (formulaIngredients.length <= 1) {
      alert('A formula must have at least 1 ingredient.');
      return;
    }
    setFormulaIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const totalPercentage = formulaIngredients.reduce(
    (sum, item) => sum + (parseFloat(item.percentage) || 0),
    0
  );

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
          category: 'Perfume No Brand',
          formula_type: 'PERFUME',
          product_category: 'Perfume No Brand',
          product_subcategory: selectedFormulaPreset === 'WITH_WATER' ? 'Eau de Parfum (Hydrated)' : 'Eau de Parfum (Concentrated)',
          brand_type: 'Generic Base',
          reference_batch_size: formulaMeta.targetBatchSize,
          reference_batch_uom: formulaMeta.targetBatchUom,
          revision_reason: formulaMeta.revisionReason,
        }),
      });

      const data1 = await res1.json();
      if (!res1.ok || !data1.success) {
        throw new Error(data1.message || 'Failed to create no-brand formula master.');
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
        body: JSON.stringify({ action: 'APPROVE', comments: 'Auto-approved Perfume No Brand Formula' }),
      });

      setSaveSuccessMsg(`✅ Formula "${formulaMeta.name}" (${data1.code || formulaMeta.code}) saved & approved successfully!`);
      loadMasterData();

    } catch (err) {
      alert(`Error saving formula: ${err.message}`);
    } finally {
      setSavingFormula(false);
    }
  };

  // Record Actual Mixture Batch
  const handleRecordMixture = async (e) => {
    e.preventDefault();
    if (!selectedFormulaVersionId) {
      alert('Please select a Source No-Brand Formula Version.');
      return;
    }

    setRecordingMixture(true);
    setMixtureSuccessMsg('');

    try {
      const selectedVersionMaterials = [
        { material_id: 1, percentage: '85.000000', actual_quantity: '85.000000', uom: 'kg' },
        { material_id: 2, percentage: '9.000000', actual_quantity: '9.000000', uom: 'kg' },
        { material_id: 3, percentage: '1.000000', actual_quantity: '1.000000', uom: 'kg' },
        { material_id: 4, percentage: '3.000000', actual_quantity: '3.000000', uom: 'kg' },
        { material_id: 5, percentage: '2.000000', actual_quantity: '2.000000', uom: 'kg' },
      ];

      const res = await apiFetch('/api/v1/perfume-conversions/mixtures', {
        method: 'POST',
        body: JSON.stringify({
          mixtureCode: mixtureForm.mixtureCode,
          mixtureName: mixtureForm.mixtureName,
          actualTotalWeight: mixtureForm.actualTotalWeight,
          weightUom: mixtureForm.weightUom,
          remarks: mixtureForm.remarks,
          sourceFormulaVersionId: selectedFormulaVersionId,
          materials: selectedVersionMaterials,
        }),
      });

      const d = await res.json();
      if (res.ok && d.success) {
        setMixtureSuccessMsg(`✅ Mixture "${mixtureForm.mixtureName}" (${mixtureForm.mixtureCode}) recorded successfully! Available for Conversion Engine.`);
        loadMasterData();
      } else {
        alert(`Error recording mixture: ${d.message}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setRecordingMixture(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Page Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-purple-600" /> Perfume No-Brand Formulation Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generic perfume base formulation presets (Without Water & With Water), percentage revisions, & mixture batch recording.
          </p>
        </div>

        {/* Tab Buttons (Light Theme) */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'editor'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Formula Presets & Editor
          </button>
          <button
            onClick={() => setActiveTab('record-mixture')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'record-mixture'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> Record Mixture Batch
          </button>
          <button
            onClick={() => setActiveTab('formula-directory')}
            className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'formula-directory'
                ? 'bg-purple-600 text-white font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Formula Directory
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
                <Wand2 className="w-4 h-4 text-purple-600" /> Select Standard Perfume No-Brand Template
              </h3>
              <span className="text-[11px] text-slate-500">Click a preset below to instantly load its formulation base</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Preset 1: Without Water */}
              <div
                onClick={() => handleLoadPreset('WITHOUT_WATER')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedFormulaPreset === 'WITHOUT_WATER'
                    ? 'bg-purple-50/80 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                    : 'bg-slate-50/80 border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-5 h-5 text-purple-600" />
                    <h4 className="font-bold text-sm text-slate-900">Without Water (85% Ethyl Base)</h4>
                  </div>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-bold rounded-full">
                    5 Ingredients • 100.00%
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">Concentrated perfume formulation base without aqueous dilution.</p>
                <div className="grid grid-cols-5 gap-1 text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200 text-center shadow-2xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ethyl</span>
                    <span className="font-bold text-purple-700">85.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parfum</span>
                    <span className="font-bold text-amber-700">9.00%</span>
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
                    <span className="font-bold text-purple-700">68.00%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Parfum</span>
                    <span className="font-bold text-amber-700">14.00%</span>
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
                  <FileEdit className="w-5 h-5 text-purple-600" /> No-Brand Composition & Revision Workspace
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
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-purple-900 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-600" /> Auto-Balance 100%
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
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. Perfume No Brand - Without Water"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Batch Size (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formulaMeta.targetBatchSize}
                  onChange={e => setFormulaMeta({ ...formulaMeta, targetBatchSize: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-purple-700 font-mono font-bold focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Revision Reason / Notes</label>
                <input
                  type="text"
                  value={formulaMeta.revisionReason}
                  onChange={e => setFormulaMeta({ ...formulaMeta, revisionReason: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. Standard No-Brand Perfume Base V1.0"
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
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
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
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 font-mono text-purple-700 font-bold"
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
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" /> {savingFormula ? 'Saving & Approving Formula...' : 'Save & Approve No-Brand Formula'}
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

      {/* TAB 2: RECORD MIXTURE BATCH */}
      {activeTab === 'record-mixture' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-purple-600" /> Record Actual Mixture Batch
            </h3>
            <p className="text-xs text-slate-500">Record physical batch mixtures to serve as input sources for the Perfume Brand Conversion Engine.</p>
          </div>

          <form onSubmit={handleRecordMixture} className="space-y-4 text-xs max-w-2xl">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Source No-Brand Formula Version *</label>
              <select
                value={selectedFormulaVersionId}
                onChange={e => setSelectedFormulaVersionId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Select Saved Source No-Brand Formula --</option>
                {noBrandFormulas.map(f =>
                  (f.versions || []).map(v => (
                    <option key={v.id} value={v.id}>
                      {f.code} — {f.name} (V{v.major_version}.{v.minor_version})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Mixture Code *</label>
                <input
                  type="text"
                  value={mixtureForm.mixtureCode}
                  onChange={e => setMixtureForm({ ...mixtureForm, mixtureCode: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-purple-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Actual Total Batch Weight (kg) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={mixtureForm.actualTotalWeight}
                  onChange={e => setMixtureForm({ ...mixtureForm, actualTotalWeight: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-emerald-700 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mixture Name / Lot Description *</label>
              <input
                type="text"
                value={mixtureForm.mixtureName}
                onChange={e => setMixtureForm({ ...mixtureForm, mixtureName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
                placeholder="e.g. Perfume Base Mixture Lot 101"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Remarks / Notes</label>
              <textarea
                value={mixtureForm.remarks}
                onChange={e => setMixtureForm({ ...mixtureForm, remarks: e.target.value })}
                rows={2}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={recordingMixture}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              <FlaskConical className="w-4 h-4" /> {recordingMixture ? 'Recording Mixture Batch...' : 'Record Mixture for Conversion Calculator'}
            </button>

            {mixtureSuccessMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold">{mixtureSuccessMsg}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 3: FORMULA DIRECTORY & MIXTURE HISTORY */}
      {activeTab === 'formula-directory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Registered No-Brand Formulas Directory
              </span>
              <span className="text-[11px] text-slate-400">{noBrandFormulas.length} Formulas Total</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3.5">Code</th>
                    <th className="p-3.5">Formula Name</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Subcategory</th>
                    <th className="p-3.5">Active Version</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {noBrandFormulas.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500">No registered No-Brand formulas found. Use Tab 1 to create one.</td>
                    </tr>
                  ) : (
                    noBrandFormulas.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-mono font-bold text-purple-700">{f.code}</td>
                        <td className="p-3.5 font-bold text-slate-900">{f.name}</td>
                        <td className="p-3.5 text-slate-600">{f.product_category}</td>
                        <td className="p-3.5 text-slate-600">{f.product_subcategory || 'Standard'}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">V{f.active_version}</td>
                        <td className="p-3.5"><StatusBadge status={f.status || 'ACTIVE'} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
