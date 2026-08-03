import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { printProductionSheet } from '../utils/printProductionSheet';
import {
  FlaskConical,
  Save,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Lock,
  ChevronDown,
  Info,
  Clock,
  GitBranch,
  Printer,
  FileText,
  Search,
  Edit3,
  ArrowLeft,
  FolderOpen,
  List,
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    DRAFT: { label: 'DRAFT', bg: 'bg-slate-100 text-slate-800 border-slate-300' },
    UNDER_REVIEW: { label: 'UNDER REVIEW', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
    FOR_APPROVAL: { label: 'FOR APPROVAL', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
    APPROVED: { label: 'APPROVED', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    REJECTED: { label: 'REJECTED', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
    SUPERSEDED: { label: 'SUPERSEDED', bg: 'bg-slate-200 text-slate-600 border-slate-400' },
  };

  const conf = map[status] || map.DRAFT;
  return (
    <span className={`px-2.5 py-1 text-[11px] font-bold rounded-full border ${conf.bg}`}>
      {conf.label}
    </span>
  );
}

export function CosmeticFormulatorPage() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState('APPROVED'); // 'APPROVED' | 'DRAFT'
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'editor'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMajorVer, setEditMajorVer] = useState(1);
  const [editMinorVer, setEditMinorVer] = useState(0);
  const [editReason, setEditReason] = useState('');
  const [cosmeticDetails, setCosmeticDetails] = useState({
    target_ph: '',
    viscosity_cp: '',
    appearance: '',
    color: '',
    odor: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailableMaterials();
    fetchFormulas();
  }, []);

  const getFilteredDropdownVersions = () => {
    const list = [];
    formulas.forEach(f => {
      const targetVersions = (f.versions || []).filter(v =>
        activeTab === 'APPROVED' ? v.version_status === 'APPROVED' : v.version_status !== 'APPROVED'
      );
      targetVersions.forEach(v => {
        const text = `${f.code || ''} ${f.name || ''} ${f.product_category || ''} ${f.product_subcategory || ''} V${v.major_version}.${v.minor_version} ${v.version_status}`.toLowerCase();
        if (!searchQuery || text.includes(searchQuery.toLowerCase().trim())) {
          list.push({
            versionId: v.id,
            formulaCode: f.code,
            formulaName: f.name,
            product_category: f.product_category,
            product_subcategory: f.product_subcategory,
            versionStr: `V${v.major_version}.${v.minor_version}`,
            status: v.version_status,
          });
        }
      });
    });
    return list;
  };

  const handleSelectFormula = (versionId) => {
    loadVersion(versionId);
    setViewMode('editor');
  };

  const handleBackToList = () => {
    setViewMode('list');
  };

  const fetchAvailableMaterials = () => {
    apiFetch('/api/v1/materials')
      .then(res => res.json())
      .then(d => {
        if (d.success) setAvailableMaterials(d.data || []);
      });
  };

  const fetchFormulas = () => {
    apiFetch('/api/v1/formulas?category=Cosmetic')
      .then(res => res.json())
      .then(d => {
        if (d.success && d.data?.length) {
          setFormulas(d.data);
        }
      });
  };

  const loadVersion = (versionId) => {
    setSelectedVersionId(versionId);
    apiFetch(`/api/v1/formulas/versions/${versionId}`)
      .then(res => res.json())
      .then(d => {
        if (d.success && d.data) {
          const v = d.data.version;
          const f = d.data.formula;
          setActiveVersion({
            ...v,
            formula_id: f.id,
            formula_code: f.code,
            formula_name: f.name,
            product_category: f.product_category,
            product_subcategory: f.product_subcategory,
            brand_type: f.brand_type,
          });

          const normalizePhase = (pName, idx) => {
            if (!pName) return `Phase ${String.fromCharCode(65 + Math.min(idx, 5))}`;
            const match = String(pName).trim().match(/^Phase\s+([A-Za-z0-9]+)/i);
            if (match) {
              const letter = match[1].toUpperCase();
              if (/^[A-F]$/.test(letter)) return `Phase ${letter}`;
            }
            const lower = String(pName).toLowerCase();
            if (lower.includes('water') || lower.includes('phase a')) return 'Phase A';
            if (lower.includes('surfactant') || lower.includes('oil') || lower.includes('phase b')) return 'Phase B';
            if (lower.includes('active') || lower.includes('phase c')) return 'Phase C';
            if (lower.includes('cooling') || lower.includes('phase d')) return 'Phase D';
            if (lower.includes('post') || lower.includes('phase e')) return 'Phase E';
            if (lower.includes('phase f')) return 'Phase F';
            return `Phase ${String.fromCharCode(65 + Math.min(idx, 5))}`;
          };

          const seenLoaded = new Set();
          const loadedMats = [];
          (d.data.materials || []).forEach((m, idx) => {
            const pName = normalizePhase(m.phase_name, idx);
            const mId = m.material_id || m.id || m.material_code;
            const uKey = `${pName}_${mId}`;
            if (seenLoaded.has(uKey)) return;
            seenLoaded.add(uKey);

            loadedMats.push({
              material_id: m.material_id,
              material_code_snapshot: m.material_code,
              material_name_snapshot: m.material_name,
              uom_snapshot: 'g',
              raw_uom: m.material_uom || m.uom || m.default_uom || 'g',
              percentage: String(m.percentage || '0.00'),
              function_name: m.function_name || 'Active',
              phase_name: pName,
              cost: m.cost || '0.00',
              addition_order: loadedMats.length + 1,
            });
          });

          setMaterials(loadedMats);
          if (d.data.categoryDetails) {
            setCosmeticDetails(d.data.categoryDetails);
          }
        }
      });
  };

  const getCostPerGram = (m) => {
    const c = parseFloat(m.cost || 0);
    const u = String(m.raw_uom || m.uom || m.default_uom || 'g').trim().toLowerCase();
    if (u === 'kg') return c / 1000;
    return c;
  };

  const totalPct = materials.reduce((acc, m) => acc + (parseFloat(m.percentage) || 0), 0).toFixed(1);
  const isValidPct = Math.abs(parseFloat(totalPct) - 100) < 0.05;

  const addLine = (phaseName = 'Phase A') => {
    const mat = availableMaterials[0] || { id: 1, code: 'MAT-001', name: 'Material', uom: 'g', cost: '0.00' };
    setMaterials([
      ...materials,
      {
        material_id: mat.id,
        material_code_snapshot: mat.code,
        material_name_snapshot: mat.name,
        uom_snapshot: 'g',
        raw_uom: mat.uom || 'g',
        percentage: '0.00',
        function_name: 'Solvent Base',
        phase_name: phaseName,
        cost: mat.cost || '0.00',
        addition_order: materials.length + 1,
      },
    ]);
  };

  const isReadOnly = activeVersion && (activeVersion.version_status === 'APPROVED' || activeVersion.version_status === 'SUPERSEDED' || activeVersion.version_status === 'LOCKED');

  const removeLine = (idx) => {
    const updated = materials.filter((_, i) => i !== idx);
    setMaterials(updated);
  };

  const handleMaterialChange = (idx, field, val) => {
    const next = [...materials];
    if (field === 'material_id') {
      const mat = availableMaterials.find(m => m.id === Number(val));
      if (mat) {
        next[idx].material_id = mat.id;
        next[idx].material_code_snapshot = mat.code;
        next[idx].material_name_snapshot = mat.name;
        next[idx].uom_snapshot = 'g';
        next[idx].raw_uom = mat.uom || 'g';
        next[idx].cost = mat.cost || '0.00';
      }
    } else {
      next[idx][field] = val;
    }
    setMaterials(next);
  };

  const saveDraft = () => {
    if (!selectedVersionId || saving) return Promise.resolve(false);
    setSaving(true);
    return apiFetch(`/api/v1/formulas/versions/${selectedVersionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        lockVersion: activeVersion.lock_version,
        targetBatchSize: activeVersion.target_batch_size,
        targetBatchUom: activeVersion.target_batch_uom || 'g',
        materials,
        categoryDetails: cosmeticDetails,
      }),
    })
      .then(res => res.json())
      .then(d => {
        setSaving(false);
        if (d.success) {
          loadVersion(selectedVersionId);
          return true;
        } else {
          alert(`Save Error: ${d.message}`);
          return false;
        }
      })
      .catch(err => {
        setSaving(false);
        alert(`Save Error: ${err.message}`);
        return false;
      });
  };

  const handleCreateRevision = async () => {
    if (!activeVersion?.formula_id || saving) return;
    setSaving(true);
    try {
      if (activeVersion.version_status === 'DRAFT') {
        await saveDraft();
      }
      const res = await apiFetch(`/api/v1/formulas/${activeVersion.formula_id}/revisions`, {
        method: 'POST',
        body: JSON.stringify({
          revisionReason: `Draft revision from V${activeVersion.major_version}.${activeVersion.minor_version}`,
          parentVersionId: activeVersion.id,
        }),
      });
      const d = await res.json();
      if (d.success && (d.data?.version_id || d.versionId)) {
        const newVerId = d.data?.version_id || d.versionId;
        alert(`New draft version ${d.data?.version || 'V2.0'} created successfully!`);
        setActiveTab('DRAFT');
        await fetchFormulas();
        await loadVersion(newVerId);
      } else {
        alert(`Revision Error: ${d.message}`);
      }
    } catch (err) {
      alert(`Revision Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFormula = async () => {
    if (!activeVersion?.formula_id) return;
    const confirmed = window.confirm(`Are you sure you want to delete Formula ${activeVersion.formula_code} (${activeVersion.formula_name})?\n\nThis will permanently delete the formula and all its versions. This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/v1/formulas/${activeVersion.formula_id}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        alert(`Formula ${activeVersion.formula_code} deleted successfully.`);
        fetchFormulas();
      } else {
        alert(`Delete Error: ${d.message}`);
      }
    } catch (err) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  const handleOpenRenameModal = () => {
    if (!activeVersion) return;
    setEditName(activeVersion.formula_name || '');
    setEditMajorVer(activeVersion.major_version ?? 1);
    setEditMinorVer(activeVersion.minor_version ?? 0);
    setEditReason(activeVersion.revision_reason || '');
    setIsRenameModalOpen(true);
  };

  const handleSaveRename = async () => {
    if (!activeVersion || saving) return;
    setSaving(true);
    try {
      // 1. Rename formula master name if changed
      if (editName && editName.trim() !== activeVersion.formula_name) {
        const res1 = await apiFetch(`/api/v1/formulas/${activeVersion.formula_id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: editName.trim() }),
        });
        const d1 = await res1.json();
        if (!d1.success) throw new Error(d1.message);
      }

      // 2. Rename version numbers & reason
      const res2 = await apiFetch(`/api/v1/formulas/versions/${activeVersion.id}/rename`, {
        method: 'PUT',
        body: JSON.stringify({
          majorVersion: editMajorVer,
          minorVersion: editMinorVer,
          revisionReason: editReason,
        }),
      });
      const d2 = await res2.json();
      if (!d2.success) throw new Error(d2.message);

      alert('Formula name and version updated successfully!');
      setIsRenameModalOpen(false);
      await fetchFormulas();
      await loadVersion(activeVersion.id);
    } catch (err) {
      alert(`Rename Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleWorkflow = async (action) => {
    if (!selectedVersionId) return;

    if (action === 'SUBMIT' || action === 'ENDORSE' || action === 'APPROVE') {
      if (!materials || materials.length === 0) {
        alert('Workflow Submission Blocked: Please add composition materials summing to 100.00% before submitting for review.');
        return;
      }
      if (!isValidPct) {
        alert(`Workflow Submission Blocked: Total formula percentage is ${totalPct}%. Total must equal 100.00% before submitting for review.`);
        return;
      }

      // Auto-save composition & technical specs to database first before transition
      setSaving(true);
      try {
        const saveRes = await apiFetch(`/api/v1/formulas/versions/${selectedVersionId}`, {
          method: 'PUT',
          body: JSON.stringify({
            lockVersion: activeVersion.lock_version,
            targetBatchSize: activeVersion.target_batch_size,
            targetBatchUom: activeVersion.target_batch_uom || 'g',
            materials,
            categoryDetails: cosmeticDetails,
          }),
        });
        const saveData = await saveRes.json();
        setSaving(false);
        if (!saveRes.ok || !saveData.success) {
          alert(`Auto-Save Error before submission: ${saveData.message}`);
          return;
        }
      } catch (err) {
        setSaving(false);
        alert(`Auto-Save Error: ${err.message}`);
        return;
      }
    }

    try {
      const res = await apiFetch(`/api/v1/formulas/versions/${selectedVersionId}/workflow`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        alert(`Workflow action '${action}' completed! Formula transitioned to ${d.message.split('to ')[1] || 'new state'}.`);
        loadVersion(selectedVersionId);
        fetchFormulas();
      } else {
        alert(`Workflow Policy Warning (HTTP ${res.status}): ${d.message || 'Operation failed'}`);
      }
    } catch (err) {
      alert(`Workflow Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cosmetic Formulation Workspace</h1>
          <p className="text-xs text-slate-500">
            Phase-based formulation editor (Phase A-C, Cooling, Post-Addition), pH & Viscosity specs.
          </p>
        </div>

        {viewMode === 'editor' && activeVersion && (
          <button
            onClick={handleBackToList}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-300 shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>← Back to Formula List</span>
          </button>
        )}
      </div>

      {/* VIEW MODE 1: Master Formulation Directory List */}
      {(viewMode === 'list' || !activeVersion) ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Directory Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-600" />
                Cosmetic Master Formulation Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any formulation below to open and edit its workspace.
              </p>
            </div>

            {/* Approved vs Draft Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-xs">
              <button
                onClick={() => setActiveTab('APPROVED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Approved Formulations</span>
              </button>
              <button
                onClick={() => setActiveTab('DRAFT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'DRAFT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Draft Revisions ({formulas.flatMap(f => (f.versions || []).filter(v => v.version_status !== 'APPROVED')).length})</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search formula by name or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none shadow-xs"
            />
          </div>

          {/* Formula List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Formula Name</th>
                  <th className="p-3.5">Category / Subcategory</th>
                  <th className="p-3.5">Version</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {getFilteredDropdownVersions().length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400 font-semibold">
                      No formulations found in this list.
                    </td>
                  </tr>
                ) : (
                  getFilteredDropdownVersions().map(item => (
                    <tr
                      key={item.versionId}
                      onClick={() => handleSelectFormula(item.versionId)}
                      className="hover:bg-blue-50/70 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 font-bold text-slate-900 group-hover:text-blue-700">
                        {item.formulaName}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {item.product_category || 'Cosmetic'} {item.product_subcategory ? `• ${item.product_subcategory}` : ''}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">
                        {item.versionStr}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectFormula(item.versionId);
                          }}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <span>Open Formulation</span>
                          <span>→</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: Opened Formulation Editor Workspace */
        <>
          {/* Selected Formula Master Details Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{activeVersion.formula_name}</h2>
                  <p className="text-xs text-slate-500">
                    {activeVersion.product_category || 'Cosmetic'} {activeVersion.product_subcategory ? `• ${activeVersion.product_subcategory}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  V{activeVersion.major_version}.{activeVersion.minor_version}
                </span>
                <StatusBadge status={activeVersion.version_status} />
                <button
                  onClick={handleOpenRenameModal}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1 border border-blue-200 transition shadow-xs"
                  title="Rename Formula & Version"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Rename / Edit</span>
                </button>
                <button
                  onClick={handleDeleteFormula}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-bold flex items-center gap-1 border border-rose-200 transition shadow-xs"
                  title="Delete Formula"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Formula</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block font-medium">Brand Type</span>
                <span className="font-semibold text-slate-900">{activeVersion.brand_type || 'NKB Core'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium mb-1">Ref. Batch Size</span>
                {!isReadOnly ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={activeVersion.target_batch_size || '100.00'}
                      onChange={e => {
                        const val = e.target.value;
                        setActiveVersion(prev => ({ ...prev, target_batch_size: val }));
                      }}
                      className="w-28 bg-white border border-blue-400 rounded px-2 py-1 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-600 shadow-xs"
                      title="Edit Target Batch Size"
                    />
                    <span className="font-mono font-bold text-slate-700 text-xs">g</span>
                  </div>
                ) : (
                  <span className="font-mono font-bold text-slate-900">{Number(activeVersion.target_batch_size || 100).toFixed(1)} {activeVersion.target_batch_uom || 'g'}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Change Type</span>
                <span className="font-semibold text-slate-900">{activeVersion.change_type || 'INITIAL'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Revision Reason</span>
                <span className="text-slate-700 truncate block" title={activeVersion.revision_reason}>{activeVersion.revision_reason || 'Initial formula creation'}</span>
              </div>
            </div>
          </div>

          {/* Percentage Counter Indicator Banner */}
          <div className="bg-white p-4 rounded-xl flex items-center justify-between border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl font-bold font-mono text-sm ${isValidPct ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                Total: {totalPct}%
              </div>
              <span className="text-xs text-slate-700 font-medium">
                {isValidPct ? '✅ Formula total equals 100.00% within tolerance.' : '⚠️ Formula must sum to 100.00% before submission.'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {activeVersion.version_status === 'DRAFT' && (
                <>
                  <button onClick={async () => { const ok = await saveDraft(); if (ok) alert('Cosmetic draft saved successfully!'); }} disabled={saving} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300">
                    <Save className="w-3.5 h-3.5 text-slate-600" /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button onClick={() => handleWorkflow('SUBMIT')} disabled={saving} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50">
                    <Send className="w-3.5 h-3.5" /> Submit for Review
                  </button>
                </>
              )}
              {activeVersion.version_status === 'UNDER_REVIEW' && (
                <button onClick={() => handleWorkflow('ENDORSE')} disabled={saving} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                  Endorse for Approval
                </button>
              )}
              {activeVersion.version_status !== 'APPROVED' && activeVersion.version_status !== 'SUPERSEDED' && activeVersion.version_status !== 'LOCKED' && (
                <button onClick={() => handleWorkflow('APPROVE')} disabled={saving} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 transition">
                  <CheckCircle className="w-4 h-4" /> Approve Version
                </button>
              )}
              {isReadOnly && (
                <>
              <button
                onClick={() => printProductionSheet({ version: activeVersion, formula: { code: activeVersion.formula_code, name: activeVersion.formula_name }, materials, categoryDetails: cosmeticDetails, user })}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <Printer className="w-4 h-4" /> Save / Export PDF
              </button>
                  <button
                    onClick={handleCreateRevision}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Create New Revision (Draft)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Read Only Warning Banner for Approved Versions */}
          {isReadOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 font-medium">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                This version is <strong>{activeVersion.version_status}</strong> (read-only immutable). To edit or make changes, click <strong>Create New Revision (Draft)</strong> above.
              </span>
            </div>
          )}

          {/* Composition Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Phase-Based Composition Table</h3>
              {!isReadOnly && (
                <button onClick={() => addLine('Phase A')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200">
                  <Plus className="w-3.5 h-3.5" /> Add Material Line
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3">Phase</th>
                    <th className="p-3">Material</th>
                    <th className="p-3 text-right">Unit Cost (PHP/g)</th>
                    <th className="p-3 text-right">Line Cost (PHP)</th>
                    <th className="p-3">Percentage (%)</th>
                    <th className="p-3 text-right">Req. Weight (g)</th>
                    <th className="p-3">UOM</th>
                    {!isReadOnly && <th className="p-3 text-center">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materials.map((m, idx) => {
                    const unitCostG = getCostPerGram(m);
                    const batchSizeG = parseFloat(activeVersion?.target_batch_size || 100);
                    const pct = parseFloat(m.percentage || 0);
                    const reqWeightGrams = (pct / 100) * batchSizeG;
                    const lineCost = reqWeightGrams * unitCostG;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3">
                          {isReadOnly ? (
                            <span className="font-semibold text-slate-900">{m.phase_name}</span>
                          ) : (
                            <select
                              value={['Phase A', 'Phase B', 'Phase C', 'Phase D', 'Phase E', 'Phase F'].includes(m.phase_name) ? m.phase_name : `Phase ${String.fromCharCode(65 + Math.min(idx, 5))}`}
                              onChange={e => handleMaterialChange(idx, 'phase_name', e.target.value)}
                              className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-blue-600 w-32 shadow-xs"
                            >
                              <option value="Phase A">Phase A</option>
                              <option value="Phase B">Phase B</option>
                              <option value="Phase C">Phase C</option>
                              <option value="Phase D">Phase D</option>
                              <option value="Phase E">Phase E</option>
                              <option value="Phase F">Phase F</option>
                            </select>
                          )}
                        </td>
                        <td className="p-3">
                          {isReadOnly ? (
                            <span className="font-medium text-slate-900">{m.material_name_snapshot}</span>
                          ) : (
                            <select
                              value={m.material_id}
                              onChange={e => handleMaterialChange(idx, 'material_id', e.target.value)}
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-medium w-64"
                            >
                              {availableMaterials.map(mat => (
                                <option key={mat.id} value={mat.id}>{mat.name}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600 font-semibold">
                          PHP {unitCostG.toFixed(1)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-700 font-bold">
                          PHP {lineCost.toFixed(1)}
                        </td>
                        <td className="p-3">
                          {isReadOnly ? (
                            <span className="font-mono font-bold text-slate-900">{Number(m.percentage).toFixed(1)}%</span>
                          ) : (
                            <input
                              type="number"
                              step="0.1"
                              value={m.percentage}
                              onChange={e => handleMaterialChange(idx, 'percentage', e.target.value)}
                              className="w-28 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-900 font-mono font-bold"
                            />
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-800 font-bold">
                          {reqWeightGrams.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g
                        </td>
                        <td className="p-3 font-mono text-slate-700 font-bold">g</td>
                        {!isReadOnly && (
                          <td className="p-3 text-center">
                            <button onClick={() => removeLine(idx)} className="p-1 text-rose-600 hover:bg-rose-50 rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {/* Summary Cost & Percentage Row */}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                    <td className="p-3" colSpan="2">
                      Total Formulation Summary
                    </td>
                    <td className="p-3 text-right font-mono text-slate-500">
                      —
                    </td>
                    <td className="p-3 text-right font-mono text-blue-800 text-sm">
                      PHP {materials.reduce((acc, m) => {
                        const pct = parseFloat(m.percentage) || 0;
                        const unitCostG = getCostPerGram(m);
                        const batchSize = parseFloat(activeVersion?.target_batch_size) || 100;
                        return acc + (pct / 100) * batchSize * unitCostG;
                      }, 0).toFixed(1)}
                    </td>
                    <td className="p-3 font-mono text-indigo-700">
                      {totalPct}%
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-900 font-extrabold text-sm">
                      {parseFloat(activeVersion?.target_batch_size || 100).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} g
                    </td>
                    <td className="p-3" colSpan={isReadOnly ? 1 : 2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cosmetic Technical Specifications */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
              Cosmetic Quality Parameters & Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Target pH Range</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={cosmeticDetails.target_ph || ''}
                  onChange={e => setCosmeticDetails({ ...cosmeticDetails, target_ph: e.target.value })}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="e.g. 5.50 - 6.00"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Actual pH</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={cosmeticDetails.actual_ph || ''}
                  onChange={e => setCosmeticDetails({ ...cosmeticDetails, actual_ph: e.target.value })}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="e.g. 5.75"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Viscosity (cP)</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={cosmeticDetails.viscosity_cp || ''}
                  onChange={e => setCosmeticDetails({ ...cosmeticDetails, viscosity_cp: e.target.value })}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-mono ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="e.g. 4500 - 6000 cP"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Appearance</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={cosmeticDetails.appearance || ''}
                  onChange={e => setCosmeticDetails({ ...cosmeticDetails, appearance: e.target.value })}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="e.g. Clear viscous liquid"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Remarks</label>
                <input
                  type="text"
                  readOnly={isReadOnly}
                  value={cosmeticDetails.remarks || ''}
                  onChange={e => setCosmeticDetails({ ...cosmeticDetails, remarks: e.target.value })}
                  className={`w-full border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 ${isReadOnly ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'}`}
                  placeholder="e.g. Keep container tightly sealed."
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rename Formula & Version Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                Rename Formula & Version
              </h3>
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Formula Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Enter formula name..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Major Version</label>
                  <input
                    type="number"
                    min="1"
                    value={editMajorVer}
                    onChange={e => setEditMajorVer(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Minor Version</label>
                  <input
                    type="number"
                    min="0"
                    value={editMinorVer}
                    onChange={e => setEditMinorVer(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Revision Reason / Remarks</label>
                <textarea
                  rows="2"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  placeholder="Optional revision reason..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveRename}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CosmeticFormulatorPage;
