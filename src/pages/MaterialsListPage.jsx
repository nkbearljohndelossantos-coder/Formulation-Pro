import React, { useEffect, useState } from 'react';
import { Search, Plus, Filter, History, CheckCircle2, Download, Upload, FileSpreadsheet, Building2, Building, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';

export function MaterialsListPage({ setCurrentPage }) {
  const { user } = useAuth();
  const isPerfumeUser = user?.username?.toLowerCase().includes('perfume') ||
                        user?.email?.toLowerCase().includes('perfume') ||
                        user?.role?.toLowerCase().includes('perfume');

  const [materials, setMaterials] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState(isPerfumeUser ? 'Perfume' : '');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedCostHistory, setSelectedCostHistory] = useState(null);

  // Edit Material State
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editFormData, setEditFormData] = useState({
    id: '',
    code: '',
    name: '',
    companyId: '',
    vendorId: '',
    uom: 'kg',
    cost: '0.00',
    currencyCode: 'PHP',
    densityKgPerL: '1.00',
    specificGravity: '1.00',
    description: '',
    category: isPerfumeUser ? 'Perfume' : 'Cosmetic',
    isInventoried: false,
    isActive: true,
  });
  const [companies, setCompanies] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchMaterials = () => {
    setLoading(true);
    let url = `/api/v1/materials?search=${encodeURIComponent(search)}`;
    if (categoryFilter) url += `&uomCategory=${categoryFilter}`;
    if (domainFilter) url += `&productCategory=${domainFilter}`;
    else if (isPerfumeUser) url += `&productCategory=Perfume`;

    apiFetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setMaterials(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchCompaniesAndVendors = () => {
    apiFetch('/api/v1/companies')
      .then(res => res.json())
      .then(d => d.success && setCompanies(d.data))
      .catch(() => {});

    apiFetch('/api/v1/vendors')
      .then(res => res.json())
      .then(d => d.success && setVendors(d.data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchMaterials();
    fetchCompaniesAndVendors();
  }, [search, categoryFilter, domainFilter]);

  const openCostHistory = (materialId, materialName) => {
    apiFetch(`/api/v1/materials/${materialId}/cost-history`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSelectedCostHistory({ materialName, history: data.data });
        }
      });
  };

  const handleOpenEditModal = (m) => {
    fetchCompaniesAndVendors();
    setEditError('');
    setEditingMaterial(m);
    setEditFormData({
      id: m.id,
      code: m.code || '',
      name: m.name || '',
      companyId: m.company_id ? String(m.company_id) : '',
      vendorId: m.vendor_id ? String(m.vendor_id) : '',
      uom: m.uom || m.default_uom || 'kg',
      cost: m.cost !== undefined && m.cost !== null ? String(m.cost) : '0.00',
      currencyCode: m.currency_code || 'PHP',
      densityKgPerL: m.density_kg_per_l !== undefined && m.density_kg_per_l !== null ? String(m.density_kg_per_l) : '1.00',
      specificGravity: m.specific_gravity !== undefined && m.specific_gravity !== null ? String(m.specific_gravity) : '1.00',
      description: m.description || '',
      category: m.category || (isPerfumeUser ? 'Perfume' : 'Cosmetic'),
      isInventoried: Boolean(m.is_inventoried),
      isActive: m.is_active !== undefined ? Boolean(m.is_active) : true,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.code.trim() || !editFormData.uom.trim()) {
      setEditError('Material Code, Name, and UOM are required.');
      return;
    }

    setSavingEdit(true);
    setEditError('');

    try {
      const res = await apiFetch(`/api/v1/materials/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editFormData.code.trim(),
          name: editFormData.name.trim(),
          companyId: editFormData.companyId ? Number(editFormData.companyId) : null,
          vendorId: editFormData.vendorId ? Number(editFormData.vendorId) : null,
          uom: editFormData.uom.trim(),
          cost: editFormData.cost,
          currencyCode: editFormData.currencyCode,
          densityKgPerL: editFormData.densityKgPerL,
          specificGravity: editFormData.specificGravity,
          description: editFormData.description,
          category: editFormData.category,
          isInventoried: editFormData.isInventoried,
          isActive: editFormData.isActive,
        }),
      });

      const data = await res.json();
      setSavingEdit(false);

      if (res.ok && data.success) {
        setEditingMaterial(null);
        fetchMaterials();
      } else {
        setEditError(data.message || 'Failed to update material.');
      }
    } catch (err) {
      setSavingEdit(false);
      setEditError(err.message || 'Server error while updating material.');
    }
  };

  // 1. Export Materials to CSV
  const handleExportCSV = () => {
    if (materials.length === 0) {
      alert('No materials to export.');
      return;
    }

    const headers = [
      'code',
      'name',
      'description',
      'uom_category',
      'default_uom',
      'cost',
      'currency_code',
      'density_kg_per_l',
      'specific_gravity',
      'is_active',
    ];

    const csvRows = [headers.join(',')];

    for (const m of materials) {
      const values = headers.map(header => {
        let val = m[header];
        if (val === null || val === undefined) val = '';
        // Escape double quotes and enclose in quotes
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'material_master_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Download Sample CSV Template
  const handleDownloadTemplate = () => {
    const headers = [
      'code',
      'name',
      'description',
      'uom_category',
      'default_uom',
      'cost',
      'currency_code',
      'density_kg_per_l',
      'specific_gravity',
    ];

    const sampleRow = [
      'MAT-WTR-001',
      'Deionized Water',
      'Pure cosmetic grade water base',
      'MASS',
      'g',
      '0.150000',
      'PHP',
      '1.000000',
      '1.000000',
    ];

    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'materials_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Import CSV & Bulk Upload to Backend
  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          alert('CSV file is empty or has invalid headers.');
          setImporting(false);
          return;
        }

        // Send to backend bulk endpoint
        const res = await apiFetch('/api/v1/materials/bulk', {
          method: 'POST',
          body: JSON.stringify({ materials: parsed }),
        });

        const data = await res.json();
        setImporting(false);

        if (res.ok && data.success) {
          alert(`Import Successful!\n\n${data.message}`);
          fetchMaterials();
        } else {
          alert(`Import Error: ${data.message}`);
        }
      } catch (err) {
        setImporting(false);
        alert(`Failed to parse CSV file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  };

  // CSV Parser supporting quotes escaping
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = [];
      let currentVal = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      result.push(obj);
    }
    return result;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Material Master List</h1>
          <p className="text-xs text-slate-500">
            Formulation reference raw materials, default UOMs, densities, and costing data.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Download Template Button */}
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition"
            title="Download blank CSV import template file"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Download CSV Template
          </button>

          {/* Export Materials List */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 flex items-center gap-1.5 transition"
            title="Export filtered material records to CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> Export List
          </button>

          {/* Import/Upload Button */}
          <label className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition">
            <Upload className="w-3.5 h-3.5" />
            <span>{importing ? 'Importing CSV...' : 'Upload / Update List'}</span>
            <input
              type="file"
              accept=".csv"
              disabled={importing}
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>

          {/* Create Vendor */}
          <button
            onClick={() => setCurrentPage('create-vendor')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
          >
            <Building2 className="w-3.5 h-3.5" /> Create Vendor
          </button>

          {/* Create Company */}
          <button
            onClick={() => setCurrentPage('create-company')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
          >
            <Building className="w-3.5 h-3.5" /> Create Company
          </button>

          {/* Create Material manually */}
          <button
            onClick={() => setCurrentPage('create-material')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" /> Create Material
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by code, name, or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={domainFilter}
            onChange={e => setDomainFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
          >
            {!isPerfumeUser && <option value="">All Product Domains (Cosmetics & Perfumes)</option>}
            <option value="Perfume">Perfumes Only</option>
            {!isPerfumeUser && <option value="Cosmetic">Cosmetics Only</option>}
            {!isPerfumeUser && <option value="Supplement">Supplements Only</option>}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          >
            <option value="">All UOMs (MASS / VOLUME / COUNT)</option>
            <option value="MASS">MASS (mg, g, kg)</option>
            <option value="VOLUME">VOLUME (mL, L)</option>
            <option value="COUNT">COUNT (pieces, capsules, tablets)</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Material Name</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">Cost / Unit</th>
                <th className="p-3">Inventoried</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">Loading material master records...</td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">No materials found matching criteria.</td>
                </tr>
              ) : (
                materials.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td
                      onClick={() => handleOpenEditModal(m)}
                      className="p-3 font-mono font-bold text-blue-700 cursor-pointer hover:underline"
                      title="Click to edit material"
                    >
                      {m.code}
                    </td>
                    <td
                      onClick={() => handleOpenEditModal(m)}
                      className="p-3 font-medium text-slate-900 cursor-pointer hover:underline"
                      title="Click to edit material"
                    >
                      {m.name}
                    </td>
                    <td className="p-3 text-slate-600">{m.vendor_name || '-'}</td>
                    <td className="p-3 font-mono text-slate-900 font-bold">
                      {m.currency_code} {Number(m.cost).toFixed(4)}
                    </td>
                    <td className="p-3">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" /> Active Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-slate-50 text-slate-400 px-2 py-0.5 rounded border border-slate-200">
                          Inactive No
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded border border-blue-200 flex items-center gap-1 transition"
                          title="Edit Material Details"
                        >
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => openCostHistory(m.id, m.name)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition"
                          title="View Price History Log"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Material Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 shadow-2xl space-y-5 p-6 my-8">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" /> Edit Material Master Record
                </h3>
                <p className="text-xs text-slate-500">Updating master specification for {editingMaterial.code}</p>
              </div>
              <button
                onClick={() => setEditingMaterial(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Row 1: Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.code}
                    onChange={e => setEditFormData({ ...editFormData, code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Row 2: Category, Company & Vendor */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Product Domain</label>
                  <select
                    value={editFormData.category || 'Cosmetic'}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Perfume">Perfume</option>
                    <option value="Supplement">Supplement</option>
                    <option value="All">All / Shared</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <select
                    value={editFormData.companyId}
                    onChange={e => setEditFormData({ ...editFormData, companyId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Company (Optional) --</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor / Supplier</label>
                  <select
                    value={editFormData.vendorId}
                    onChange={e => setEditFormData({ ...editFormData, vendorId: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="">-- Select Vendor (Optional) --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: UOM, Cost & Currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Default UOM <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.uom}
                    onChange={e => setEditFormData({ ...editFormData, uom: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <optgroup label="Mass Units">
                      <option value="kg">kg (Kilograms)</option>
                      <option value="g">g (Grams)</option>
                      <option value="mg">mg (Milligrams)</option>
                    </optgroup>
                    <optgroup label="Volume Units">
                      <option value="mL">mL (Milliliters)</option>
                      <option value="L">L (Liters)</option>
                    </optgroup>
                    <optgroup label="Discrete Count">
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="capsules">capsules</option>
                      <option value="tablets">tablets</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Per Unit</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={editFormData.cost}
                    onChange={e => setEditFormData({ ...editFormData, cost: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={editFormData.currencyCode}
                    onChange={e => setEditFormData({ ...editFormData, currencyCode: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="PHP">PHP (₱)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              {/* Row 4: Specific Gravity */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Gravity</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={editFormData.specificGravity}
                    onChange={e => setEditFormData({ ...editFormData, specificGravity: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows="2"
                  value={editFormData.description}
                  onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Material specs, CAS numbers, phase usage notes..."
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Checkboxes / Active Status */}
              <div className="flex items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.isInventoried}
                    onChange={e => setEditFormData({ ...editFormData, isInventoried: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  Inventoried Material
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={editFormData.isActive}
                    onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  Active Status
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cost History Modal */}
      {selectedCostHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg border border-slate-200 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-700" /> Price History — {selectedCostHistory.materialName}
              </h3>
              <button onClick={() => setSelectedCostHistory(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {selectedCostHistory.history.length === 0 ? (
                <p className="text-slate-500">No historical price changes recorded.</p>
              ) : (
                selectedCostHistory.history.map(h => (
                  <div key={h.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="text-slate-700 font-medium">
                        {h.old_currency_code} {Number(h.old_cost).toFixed(4)} → <span className="text-blue-700 font-bold">{h.new_currency_code} {Number(h.new_cost).toFixed(4)}</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">Changed by: {h.changed_by_username || 'System'}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setSelectedCostHistory(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaterialsListPage;
