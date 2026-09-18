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
  Sparkles,
  Droplet,
  Wand2,
  CheckCircle2,
  ShieldAlert,
  Thermometer,
  Layers,
  X,
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

// Standard Perfume Formula Presets
const PERFUME_PRESETS = [
  {
    id: 'brand-without-water',
    name: 'Perfume Brand (Without Water)',
    category: 'Perfume Brand',
    brandType: 'Brand Core',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '80.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost: '0.12' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost: '1.85' },
      { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost: '0.45' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant', cost: '0.25' },
      { name: 'Fixative (Glucam P-20)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost: '0.95' },
    ],
  },
  {
    id: 'brand-with-water',
    name: 'Perfume Brand (With Water)',
    category: 'Perfume Brand',
    brandType: 'Brand Core',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '68.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost: '0.12' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost: '1.85' },
      { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost: '0.45' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant', cost: '0.25' },
      { name: 'Fixative (Glucam P-20)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost: '0.95' },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: '12.00', phase_name: 'Phase A - Solvents & Base', role: 'Diluent / Solvent', cost: '0.01' },
    ],
  },
  {
    id: 'nobrand-without-water',
    name: 'Perfume No-Brand (Without Water)',
    category: 'Perfume No-Brand',
    brandType: 'No Brand',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '85.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost: '0.12' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '9.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost: '1.85' },
      { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost: '0.45' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant', cost: '0.25' },
      { name: 'Fixative (Glucam P-20)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost_g: 0.95 },
    ],
  },
  {
    id: 'nobrand-with-water',
    name: 'Perfume No-Brand (With Water)',
    category: 'Perfume No-Brand',
    brandType: 'No Brand',
    items: [
      { name: 'Ethyl Alcohol', code: 'MAT-ETHYL', percentage: '68.00', phase_name: 'Phase A - Solvents & Base', role: 'Solvent / Base', cost: '0.12' },
      { name: 'Parfum / Fragrance Oil', code: 'MAT-PARFUM', percentage: '14.00', phase_name: 'Phase B - Fragrance Premix', role: 'Fragrance Concentrate', cost: '1.85' },
      { name: 'Peg-40', code: 'MAT-PEG40', percentage: '1.00', phase_name: 'Phase B - Fragrance Premix', role: 'Solubilizer', cost: '0.45' },
      { name: 'Procol (Propylene Glycol)', code: 'MAT-PROCOL', percentage: '3.00', phase_name: 'Phase A - Solvents & Base', role: 'Humectant', cost: '0.25' },
      { name: 'Fixative (Glucam P-20)', code: 'MAT-FIXATIVE', percentage: '2.00', phase_name: 'Phase C - Fixative & Aging', role: 'Odor Fixative', cost: '0.95' },
      { name: 'Deionized Water', code: 'MAT-WATER', percentage: '12.00', phase_name: 'Phase A - Solvents & Base', role: 'Diluent / Solvent', cost: '0.01' },
    ],
  },
];

export function PerfumeFormulatorPage({ setCurrentPage, initialVersionId, defaultBrandFilter = 'ALL' }) {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [activeVersion, setActiveVersion] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [activeTab, setActiveTab] = useState('APPROVED'); // 'APPROVED' | 'DRAFT'
  const [brandFilter, setBrandFilter] = useState(defaultBrandFilter); // 'ALL' | 'Perfume Brand' | 'Perfume No-Brand'
  const [viewMode, setViewMode] = useState(initialVersionId ? 'editor' : 'list'); // 'list' | 'editor'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rename Modal State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMajorVer, setEditMajorVer] = useState(1);
  const [editMinorVer, setEditMinorVer] = useState(0);
  const [editReason, setEditReason] = useState('');

  // Create Formula Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormulaData, setNewFormulaData] = useState({
    name: '',
    category: 'Perfume Brand',
    product_subcategory: 'Eau de Parfum (Concentrated)',
    targetBatchSize: '100.00',
    targetBatchUom: 'kg',
  });

  // Perfume Quality & Aging Details State (Matches Cosmetic Details Card)
  const [perfumeDetails, setPerfumeDetails] = useState({
    odor_profile: 'Citrus bergamot top, floral heart, warm musk dry-down',
    chilling_temp_c: '4°C',
    chilling_hours: '24',
    maceration_days: '14',
    filtration_status: 'COMPLETED',
    appearance: 'Clear, transparent liquid',
    color: 'Pale light amber',
    target_ph: '5.8 - 6.2',
    remarks: 'Store in airtight stainless steel container during 14-day aging.',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAvailableMaterials();
    fetchFormulas();
    if (initialVersionId) {
      loadVersion(initialVersionId);
      setViewMode('editor');
    }
  }, [initialVersionId]);

  const fetchAvailableMaterials = () => {
    apiFetch('/api/v1/materials')
      .then(res => res.json())
      .then(d => {
        if (d.success) setAvailableMaterials(d.data || []);
      })
      .catch(() => {});
  };

  const fetchFormulas = () => {
    apiFetch('/api/v1/formulas')
      .then(res => res.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          // Filter perfume formulas (both Brand and No-Brand)
          const perf = d.data.filter(f => {
            const cat = (f.product_category || '').toLowerCase();
            const type = (f.formula_type || '').toLowerCase();
            const name = (f.name || '').toLowerCase();
            return cat.includes('perfume') || type.includes('perfume') || name.includes('perfume');
          });
          setFormulas(perf);
        }
      })
      .catch(() => {});
  };

  const getFilteredDropdownVersions = () => {
    const list = [];
    formulas.forEach(f => {
      // Brand filter
      if (brandFilter !== 'ALL') {
        const catMatch = (f.product_category || '').toLowerCase().includes(brandFilter.toLowerCase());
        const brandMatch = (f.brand_type || '').toLowerCase().includes(brandFilter.toLowerCase());
        if (!catMatch && !brandMatch) return;
      }

      const targetVersions = (f.versions || []).filter(v =>
        activeTab === 'APPROVED' ? v.version_status === 'APPROVED' : v.version_status !== 'APPROVED'
      );

      targetVersions.forEach(v => {
        const text = `${f.code || ''} ${f.name || ''} ${f.product_category || ''} ${f.product_subcategory || ''} V${v.major_version}.${v.minor_version} ${v.version_status}`.toLowerCase();
        if (!searchQuery || text.includes(searchQuery.toLowerCase().trim())) {
          list.push({
            versionId: v.id,
            formulaId: f.id,
            formulaCode: f.code,
            formulaName: f.name,
            product_category: f.product_category || 'Perfume',
            product_subcategory: f.product_subcategory || 'Eau de Parfum',
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
    fetchFormulas();
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
            brand_type: f.brand_type || 'Perfume Core',
          });

          const normalizePhase = (pName, idx) => {
            if (!pName) return 'Phase A - Solvents & Base';
            const lower = String(pName).toLowerCase();
            if (lower.includes('water') || lower.includes('alcohol') || lower.includes('phase a') || lower.includes('solvent')) {
              return 'Phase A - Solvents & Base';
            }
            if (lower.includes('fragrance') || lower.includes('parfum') || lower.includes('oil') || lower.includes('phase b')) {
              return 'Phase B - Fragrance Premix';
            }
            if (lower.includes('fixative') || lower.includes('aging') || lower.includes('phase c')) {
              return 'Phase C - Fixative & Aging';
            }
            return pName;
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
              material_code_snapshot: m.material_code || m.material_code_snapshot,
              material_name_snapshot: m.material_name || m.material_name_snapshot,
              uom_snapshot: 'g',
              raw_uom: m.material_uom || m.uom || 'g',
              percentage: String(m.percentage || '0.00'),
              function_name: m.role || m.function_name || 'Ingredient',
              phase_name: pName,
              cost: m.cost || '0.00',
              addition_order: loadedMats.length + 1,
            });
          });

          // Fallback to standard preset if empty
          if (loadedMats.length === 0) {
            setMaterials(PERFUME_PRESETS[0].items.map((it, idx) => ({
              material_id: idx + 1,
              material_code_snapshot: it.code,
              material_name_snapshot: it.name,
              uom_snapshot: 'g',
              raw_uom: 'g',
              percentage: it.percentage,
              function_name: it.role,
              phase_name: it.phase_name,
              cost: it.cost,
              addition_order: idx + 1,
            })));
          } else {
            setMaterials(loadedMats);
          }

          if (d.data.categoryDetails) {
            setPerfumeDetails(prev => ({ ...prev, ...d.data.categoryDetails }));
          }
        }
      });
  };

  const getCostPerGram = (m) => {
    const c = parseFloat(m.cost || 0);
    const u = String(m.raw_uom || m.uom || 'g').trim().toLowerCase();
    if (u === 'kg') return c / 1000;
    return c;
  };

  const rawTotalPct = materials.reduce((acc, m) => {
    const val = parseFloat(m.percentage);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);
  const totalPctNum = Math.round((rawTotalPct + Number.EPSILON) * 100) / 100;
  const totalPct = totalPctNum.toFixed(2);
  const isValidPct = Math.abs(totalPctNum - 100) <= 0.01;

  const isReadOnly = activeVersion && (activeVersion.version_status === 'APPROVED' || activeVersion.version_status === 'SUPERSEDED' || activeVersion.version_status === 'LOCKED');

  const addLine = (phaseName = 'Phase A - Solvents & Base') => {
    const mat = availableMaterials[0] || { id: 1, code: 'MAT-NEW', name: 'Raw Material', uom: 'g', cost: '0.00' };
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

  const removeLine = (idx) => {
    if (materials.length <= 1) {
      alert('A formulation must contain at least 1 ingredient.');
      return;
    }
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

  // Auto-Balance to 100.00% by adjusting Ethyl Alcohol or Water
  const handleAutoBalance = () => {
    const diff = 100 - totalPctNum;
    if (Math.abs(diff) < 0.0001) return;

    const next = [...materials];
    let solventIdx = next.findIndex(m => (m.material_name_snapshot || '').toLowerCase().includes('ethyl'));
    if (solventIdx === -1) {
      solventIdx = next.findIndex(m => (m.material_name_snapshot || '').toLowerCase().includes('water'));
    }
    if (solventIdx === -1) solventIdx = 0;

    const currentVal = parseFloat(next[solventIdx].percentage) || 0;
    const newVal = Math.max(0, currentVal + diff);
    next[solventIdx].percentage = newVal.toFixed(2);
    setMaterials(next);
  };

  // Quick load template preset
  const handleLoadPresetTemplate = (presetId) => {
    const preset = PERFUME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const loaded = preset.items.map((it, idx) => {
      let matchedMat = availableMaterials.find(m =>
        m.code.toLowerCase() === it.code.toLowerCase() ||
        m.name.toLowerCase().includes(it.name.toLowerCase().split(' ')[0])
      );

      return {
        material_id: matchedMat?.id || idx + 1,
        material_code_snapshot: matchedMat?.code || it.code,
        material_name_snapshot: matchedMat?.name || it.name,
        uom_snapshot: 'g',
        raw_uom: matchedMat?.uom || 'g',
        percentage: it.percentage,
        function_name: it.role,
        phase_name: it.phase_name,
        cost: matchedMat?.cost || it.cost || '0.00',
        addition_order: idx + 1,
      };
    });

    setMaterials(loaded);
  };

  const saveDraft = () => {
    if (!selectedVersionId || saving) return Promise.resolve(false);
    setSaving(true);
    return apiFetch(`/api/v1/formulas/versions/${selectedVersionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        lockVersion: activeVersion.lock_version,
        targetBatchSize: activeVersion.target_batch_size,
        targetBatchUom: activeVersion.target_batch_uom || 'kg',
        materials,
        categoryDetails: perfumeDetails,
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
        alert(`New perfume draft version ${d.data?.version || 'V2.0'} created successfully!`);
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
    const confirmed = window.confirm(`Are you sure you want to delete Perfume Formula ${activeVersion.formula_code} (${activeVersion.formula_name})?\n\nThis will permanently delete the formula and all its versions.`);
    if (!confirmed) return;

    try {
      const res = await apiFetch(`/api/v1/formulas/${activeVersion.formula_id}`, {
        method: 'DELETE',
      });
      const d = await res.json();
      if (d.success) {
        alert(`Perfume formula ${activeVersion.formula_code} deleted successfully.`);
        handleBackToList();
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
      if (editName && editName.trim() !== activeVersion.formula_name) {
        const res1 = await apiFetch(`/api/v1/formulas/${activeVersion.formula_id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: editName.trim() }),
        });
        const d1 = await res1.json();
        if (!d1.success) throw new Error(d1.message);
      }

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

      alert('Perfume formula name and version updated successfully!');
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
        alert('Workflow Submission Blocked: Please add perfume composition materials summing to 100.00%.');
        return;
      }
      if (!isValidPct) {
        alert(`Workflow Submission Blocked: Total formula percentage is ${totalPct}%. Total must equal 100.00% before approval.`);
        return;
      }

      setSaving(true);
      try {
        const saveRes = await apiFetch(`/api/v1/formulas/versions/${selectedVersionId}`, {
          method: 'PUT',
          body: JSON.stringify({
            lockVersion: activeVersion.lock_version,
            targetBatchSize: activeVersion.target_batch_size,
            targetBatchUom: activeVersion.target_batch_uom || 'kg',
            materials,
            categoryDetails: perfumeDetails,
          }),
        });
        const saveData = await saveRes.json();
        setSaving(false);
        if (!saveRes.ok || !saveData.success) {
          alert(`Auto-Save Error: ${saveData.message}`);
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
        alert(`Workflow Warning: ${d.message || 'Operation failed'}`);
      }
    } catch (err) {
      alert(`Workflow Error: ${err.message}`);
    }
  };

  // Create New Formula
  const handleCreateNewFormula = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res1 = await apiFetch('/api/v1/formulas', {
        method: 'POST',
        body: JSON.stringify({
          name: newFormulaData.name,
          category: newFormulaData.category,
          product_category: newFormulaData.category,
          product_subcategory: newFormulaData.product_subcategory,
          brand_type: newFormulaData.category.includes('No-Brand') ? 'No Brand' : 'Perfume Brand',
          reference_batch_size: newFormulaData.targetBatchSize,
          reference_batch_uom: newFormulaData.targetBatchUom,
          revision_reason: 'Initial Perfume Formulation',
        }),
      });
      const data1 = await res1.json();
      if (!res1.ok || !data1.success) {
        throw new Error(data1.message || 'Failed to create formula master.');
      }

      const versionId = data1.versionId || data1.data?.version_id;
      const isNoBrand = (newFormulaData.category || '').toLowerCase().includes('no-brand');
      const preset = PERFUME_PRESETS.find(p => p.id === (isNoBrand ? 'nobrand-without-water' : 'brand-without-water')) || PERFUME_PRESETS[0];

      const initialMaterials = preset.items.map((it, idx) => ({
        material_id: idx + 1,
        material_code_snapshot: it.code,
        material_name_snapshot: it.name,
        percentage: it.percentage,
        addition_order: idx + 1,
        phase_name: it.phase_name,
        role: it.role,
      }));

      await apiFetch(`/api/v1/formulas/versions/${versionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          materials: initialMaterials,
          targetBatchSize: newFormulaData.targetBatchSize,
          targetBatchUom: newFormulaData.targetBatchUom,
          categoryDetails: perfumeDetails,
        }),
      });

      setIsCreateModalOpen(false);
      await fetchFormulas();
      await loadVersion(versionId);
      setViewMode('editor');
    } catch (err) {
      alert(`Error creating perfume formula: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans text-slate-900">
      {/* Top Header (Matches Cosmetic Workspace Header) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Perfume Formulation Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phase-based perfume formulation editor (Phase A: Base/Solvents, Phase B: Fragrance Premix, Phase C: Fixatives), Maceration & Aging specs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'editor' && activeVersion ? (
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-2 border border-slate-300 shadow-xs"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>← Back to Formula List</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Perfume Formula</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: Master Perfume Formulation Directory List */}
      {(viewMode === 'list' || !activeVersion) ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
          {/* Directory Header & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-amber-600" />
                Perfume Master Formulation Directory
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any perfume formulation below to open and edit its workspace.
              </p>
            </div>

            {/* Approved vs Draft Tabs */}
            <div className="flex items-center gap-3">
              {/* Brand vs No-Brand Sub-filter */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setBrandFilter('ALL')}
                  className={`px-3 py-1 rounded-lg transition ${brandFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All Perfumes
                </button>
                <button
                  onClick={() => setBrandFilter('Perfume Brand')}
                  className={`px-3 py-1 rounded-lg transition ${brandFilter === 'Perfume Brand' ? 'bg-white text-amber-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Brand
                </button>
                <button
                  onClick={() => setBrandFilter('Perfume No-Brand')}
                  className={`px-3 py-1 rounded-lg transition ${brandFilter === 'Perfume No-Brand' ? 'bg-white text-purple-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  No-Brand
                </button>
              </div>

              {/* Status Tab Group */}
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
                  <span>Approved Perfumes</span>
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
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search perfume formula by name, code, or brand..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-amber-600 focus:outline-none shadow-xs"
            />
          </div>

          {/* Perfume List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Code</th>
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
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      No perfume formulations found matching this filter. Click <strong>"+ Create New Perfume Formula"</strong> to start formulating!
                    </td>
                  </tr>
                ) : (
                  getFilteredDropdownVersions().map(item => (
                    <tr
                      key={item.versionId}
                      onClick={() => handleSelectFormula(item.versionId)}
                      className="hover:bg-amber-50/60 cursor-pointer transition-colors group"
                    >
                      <td className="p-3.5 font-mono font-bold text-amber-700">{item.formulaCode}</td>
                      <td className="p-3.5 font-bold text-slate-900 group-hover:text-amber-800">
                        {item.formulaName}
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold mr-1.5">
                          {item.product_category}
                        </span>
                        {item.product_subcategory}
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
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs"
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
        /* VIEW MODE 2: Opened Perfume Formulation Editor Workspace (Matches Cosmetics) */
        <>
          {/* Selected Formula Master Details Banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    {activeVersion.formula_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {activeVersion.product_category || 'Perfume'} {activeVersion.product_subcategory ? `• ${activeVersion.product_subcategory}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-mono shadow-xs" title="Unique Compounding Control Code">
                  {activeVersion.compounding_code || 'CP-PRF-0001'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  V{activeVersion.major_version}.{activeVersion.minor_version}
                </span>
                <StatusBadge status={activeVersion.version_status} />
                <button
                  onClick={handleOpenRenameModal}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-md text-xs font-bold flex items-center gap-1 border border-amber-200 transition shadow-xs"
                  title="Rename Formula & Version"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Rename / Edit</span>
                </button>
                <button
                  onClick={handleDeleteFormula}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md text-xs font-bold flex items-center gap-1 border border-rose-200 transition shadow-xs"
                  title="Delete Formula"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
              <div>
                <span className="text-slate-500 block font-medium">Brand Classification</span>
                <span className="font-semibold text-slate-900">{activeVersion.brand_type || 'Perfume Core'}</span>
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
                      className="w-28 bg-white border border-amber-400 rounded px-2 py-1 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-amber-600 shadow-xs"
                      title="Edit Target Batch Size"
                    />
                    <span className="font-mono font-bold text-slate-700 text-xs">{activeVersion.target_batch_uom || 'kg'}</span>
                  </div>
                ) : (
                  <span className="font-mono font-bold text-slate-900">{Number(activeVersion.target_batch_size || 100).toFixed(1)} {activeVersion.target_batch_uom || 'kg'}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Change Type</span>
                <span className="font-semibold text-slate-900">{activeVersion.change_type || 'INITIAL'}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Revision Reason</span>
                <span className="text-slate-700 truncate block" title={activeVersion.revision_reason}>{activeVersion.revision_reason || 'Initial perfume formula creation'}</span>
              </div>
            </div>
          </div>

          {/* Percentage Counter Indicator Banner */}
          <div className="bg-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl font-bold font-mono text-sm flex items-center gap-2 ${isValidPct ? 'bg-emerald-50 text-emerald-900 border border-emerald-300' : 'bg-rose-50 text-rose-900 border border-rose-300'}`}>
                {isValidPct ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <ShieldAlert className="w-4 h-4 text-rose-600" />}
                Total: {totalPct}%
              </div>
              <span className="text-xs text-slate-700 font-medium">
                {isValidPct ? '✅ Formula total equals 100.00% within tolerance.' : `⚠️ Imbalanced by ${(100 - totalPctNum).toFixed(2)}%. Must equal 100.00% before approval.`}
              </span>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAutoBalance}
                  title="Automatically adjust Ethyl Alcohol/Water percentage to sum to 100.00%"
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-600" /> Auto-Balance 100%
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {activeVersion.version_status === 'DRAFT' && (
                <>
                  {/* Quick Preset Ratios Dropdown */}
                  <div className="relative">
                    <select
                      onChange={e => e.target.value && handleLoadPresetTemplate(e.target.value)}
                      defaultValue=""
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 shadow-2xs"
                    >
                      <option value="" disabled>Load Standard Template...</option>
                      <option value="brand-without-water">Brand (Without Water: 80% Ethyl)</option>
                      <option value="brand-with-water">Brand (With Water: 68% Ethyl, 12% Water)</option>
                      <option value="nobrand-without-water">No-Brand (Without Water: 85% Ethyl)</option>
                      <option value="nobrand-with-water">No-Brand (With Water: 68% Ethyl, 12% Water)</option>
                    </select>
                  </div>

                  <button onClick={async () => { const ok = await saveDraft(); if (ok) alert('Perfume draft saved successfully!'); }} disabled={saving} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-300">
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
                    onClick={() => printProductionSheet({ version: activeVersion, formula: { code: activeVersion.formula_code, name: activeVersion.formula_name }, materials, categoryDetails: perfumeDetails, user })}
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
                This perfume formulation is <strong>{activeVersion.version_status}</strong> (read-only immutable). To edit or adjust percentages, click <strong>Create New Revision (Draft)</strong> above.
              </span>
            </div>
          )}

          {/* Phase-Based Perfume Composition Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Phase-Based Perfume Composition Table</h3>
                <p className="text-xs text-slate-500">Categorized by Phase A (Solvents & Base), Phase B (Fragrance Premix), Phase C (Fixative & Aging).</p>
              </div>
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <button onClick={() => addLine('Phase A - Solvents & Base')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300">
                    + Phase A Line
                  </button>
                  <button onClick={() => addLine('Phase B - Fragrance Premix')} className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-bold border border-purple-200">
                    + Phase B Line
                  </button>
                  <button onClick={() => addLine('Phase C - Fixative & Aging')} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-200">
                    + Phase C Line
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase">
                  <tr>
                    <th className="p-3">Phase</th>
                    <th className="p-3">Material / Ingredient</th>
                    <th className="p-3 text-right">Unit Cost (PHP/g)</th>
                    <th className="p-3 text-right">Line Cost (PHP)</th>
                    <th className="p-3 w-32">Percentage (%)</th>
                    <th className="p-3 text-right">Req. Weight</th>
                    <th className="p-3">UOM</th>
                    {!isReadOnly && <th className="p-3 text-center">Remove</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materials.map((m, idx) => {
                    const unitCostG = getCostPerGram(m);
                    const batchSize = parseFloat(activeVersion?.target_batch_size || 100);
                    const batchUom = activeVersion?.target_batch_uom || 'kg';
                    const pct = parseFloat(m.percentage || 0);
                    const reqWeight = (pct / 100) * batchSize;
                    const reqWeightGrams = batchUom === 'kg' ? reqWeight * 1000 : reqWeight;
                    const lineCost = reqWeightGrams * unitCostG;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">
                          {!isReadOnly ? (
                            <select
                              value={m.phase_name}
                              onChange={e => handleMaterialChange(idx, 'phase_name', e.target.value)}
                              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-600 shadow-2xs"
                            >
                              <option value="Phase A - Solvents & Base">Phase A - Solvents & Base</option>
                              <option value="Phase B - Fragrance Premix">Phase B - Fragrance Premix</option>
                              <option value="Phase C - Fixative & Aging">Phase C - Fixative & Aging</option>
                            </select>
                          ) : (
                            <span>{m.phase_name}</span>
                          )}
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {!isReadOnly ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={m.material_name_snapshot}
                                onChange={e => handleMaterialChange(idx, 'material_name_snapshot', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                                placeholder="Material Name"
                              />
                              {availableMaterials.length > 0 && (
                                <select
                                  value={m.material_id || ''}
                                  onChange={e => handleMaterialChange(idx, 'material_id', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600"
                                >
                                  <option value="">-- Link from Inventory Master --</option>
                                  {availableMaterials.map(mat => (
                                    <option key={mat.id} value={mat.id}>
                                      {mat.code} — {mat.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-900">{m.material_name_snapshot}</div>
                              <div className="text-[10px] font-mono text-slate-500">{m.material_code_snapshot}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          PHP {unitCostG.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-800">
                          PHP {lineCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="p-3">
                          {!isReadOnly ? (
                            <div className="relative inline-block w-24">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                value={m.percentage}
                                onChange={e => handleMaterialChange(idx, 'percentage', e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-mono text-right font-bold text-indigo-700 text-xs focus:outline-none focus:border-amber-600 pr-5 shadow-2xs"
                              />
                              <span className="absolute right-1.5 top-1 text-slate-400 font-bold text-[10px]">%</span>
                            </div>
                          ) : (
                            <span className="font-mono font-bold text-indigo-700">{pct.toFixed(2)}%</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {reqWeight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {batchUom}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {batchUom}
                        </td>
                        {!isReadOnly && (
                          <td className="p-3 text-center">
                            <button
                              onClick={() => removeLine(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition rounded"
                              title="Remove Line"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Total Percentage & Costing Summary Row (tfoot) */}
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900 text-xs">
                  <tr>
                    <td colSpan={3} className="p-3 uppercase tracking-wider text-slate-700 font-bold">
                      Total Formulation Summary:
                    </td>
                    <td className="p-3 text-right font-mono text-blue-900 font-extrabold text-sm">
                      PHP {materials.reduce((acc, m) => {
                        const uCost = getCostPerGram(m);
                        const bSize = parseFloat(activeVersion?.target_batch_size || 100);
                        const bUom = activeVersion?.target_batch_uom || 'kg';
                        const p = parseFloat(m.percentage || 0);
                        const rW = (p / 100) * bSize;
                        const rWG = bUom === 'kg' ? rW * 1000 : rW;
                        return acc + (rWG * uCost);
                      }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block font-mono text-xs px-2 py-0.5 rounded font-extrabold ${isValidPct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {totalPct}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-900 font-extrabold text-sm">
                      {Number(activeVersion?.target_batch_size || 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} {activeVersion?.target_batch_uom || 'kg'}
                    </td>
                    <td colSpan={!isReadOnly ? 2 : 1} className="p-3 text-slate-500 font-medium">
                      {isValidPct ? 'Balanced (100.00%)' : 'Imbalanced'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Perfume Quality & Aging Specs (Matches Cosmetic Details Card) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-600" />
              Perfume Quality Parameters & Aging Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Target pH Range</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.target_ph}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, target_ph: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 font-semibold disabled:bg-slate-100"
                  placeholder="e.g. 5.8 - 6.2"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Chilling Temperature (°C)</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.chilling_temp_c}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, chilling_temp_c: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-blue-800 font-bold disabled:bg-slate-100"
                  placeholder="e.g. 4°C"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Maceration Aging Duration (Days)</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.maceration_days}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, maceration_days: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-emerald-800 font-bold disabled:bg-slate-100"
                  placeholder="e.g. 14 Days"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Odor Profile / Olfactory Notes</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.odor_profile}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, odor_profile: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 disabled:bg-slate-100"
                  placeholder="e.g. Fresh citrus bergamot with warm vanilla musk"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Appearance & Clarity</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.appearance}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, appearance: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 disabled:bg-slate-100"
                  placeholder="e.g. Clear, transparent liquid without precipitation"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Filtration Status</label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={perfumeDetails.filtration_status}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, filtration_status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-emerald-800 font-semibold disabled:bg-slate-100"
                  placeholder="e.g. Filtered (0.2 micron filter)"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-slate-600 font-semibold mb-1">Compounding Instructions / Remarks</label>
                <textarea
                  rows={2}
                  disabled={isReadOnly}
                  value={perfumeDetails.remarks}
                  onChange={e => setPerfumeDetails({ ...perfumeDetails, remarks: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 disabled:bg-slate-100"
                  placeholder="e.g. Charge Ethyl Alcohol into vessel, premix Parfum with Peg-40, then add Fixative. Chill at 4°C for 24h before filtering."
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rename Formula Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" /> Rename Perfume Formula
              </h3>
              <button onClick={() => setIsRenameModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Formula Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:bg-white focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Major Version</label>
                  <input
                    type="number"
                    min="1"
                    value={editMajorVer}
                    onChange={e => setEditMajorVer(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Minor Version</label>
                  <input
                    type="number"
                    min="0"
                    value={editMinorVer}
                    onChange={e => setEditMinorVer(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Revision Reason</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={e => setEditReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900"
                  placeholder="e.g. Formula ratio adjustment"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRename}
                disabled={saving}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-bold shadow-xs"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Perfume Formula Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateNewFormula} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> Create New Perfume Formulation
              </h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Perfume Formula Name *</label>
                <input
                  type="text"
                  required
                  value={newFormulaData.name}
                  onChange={e => setNewFormulaData({ ...newFormulaData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 font-bold focus:bg-white focus:border-amber-600"
                  placeholder="e.g. Perfume Brand - Rose Oud"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category / Brand Type *</label>
                  <select
                    value={newFormulaData.category}
                    onChange={e => setNewFormulaData({ ...newFormulaData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-bold"
                  >
                    <option value="Perfume Brand">Perfume Brand</option>
                    <option value="Perfume No-Brand">Perfume No-Brand</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Subcategory</label>
                  <select
                    value={newFormulaData.product_subcategory}
                    onChange={e => setNewFormulaData({ ...newFormulaData, product_subcategory: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 font-semibold"
                  >
                    <option value="Eau de Parfum (Concentrated)">Eau de Parfum (Concentrated)</option>
                    <option value="Eau de Parfum (Hydrated)">Eau de Parfum (Hydrated)</option>
                    <option value="Eau de Toilette">Eau de Toilette</option>
                    <option value="Body Mist / Cologne">Body Mist / Cologne</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Target Batch Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newFormulaData.targetBatchSize}
                    onChange={e => setNewFormulaData({ ...newFormulaData, targetBatchSize: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Unit of Measure</label>
                  <select
                    value={newFormulaData.targetBatchUom}
                    onChange={e => setNewFormulaData({ ...newFormulaData, targetBatchUom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-900"
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {saving ? 'Creating...' : 'Create & Open Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
