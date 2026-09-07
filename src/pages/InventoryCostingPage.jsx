import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  Package,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Printer,
  RefreshCw,
  PieChart,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { apiFetch } from '../services/api';

export function InventoryCostingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('All');
  const [companies, setCompanies] = useState([]);
  
  const [summary, setSummary] = useState({
    overallCosting: 0,
    activeInventoryValuation: 0,
    rawValuation: 0,
    packagingValuation: 0,
    finishedValuation: 0,
    rejectedValuation: 0,
    rawCount: 0,
    packagingCount: 0,
    finishedCount: 0,
    rejectedCount: 0,
  });

  const [itemsData, setItemsData] = useState({
    rawMaterials: [],
    packaging: [],
    finishedProducts: [],
    rejectedMaterials: [],
  });

  const fetchCostingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (companyId && companyId !== 'All') queryParams.append('companyId', companyId);
      if (search) queryParams.append('search', search);

      const res = await apiFetch(`/api/v1/inventory/costing?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSummary(data.summary);
        setItemsData(data.data);
        if (data.companies) {
          setCompanies(data.companies);
        }
      } else {
        setError(data.message || 'Failed to load inventory costing records.');
      }
    } catch (err) {
      console.error('Error fetching inventory costing data:', err);
      setError(err.message || 'Failed to load inventory costing records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCostingData();
  }, [companyId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCostingData();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const exportCSV = () => {
    let rows = [];
    let headers = [];
    let filename = `Inventory_Costing_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeTab === 'raw') {
      headers = ['Material Code', 'Material Name', 'Lot Number', 'Current Stock', 'UOM', 'Unit Cost (PHP)', 'Line Cost (PHP)', 'Company', 'Vendor'];
      rows = itemsData.rawMaterials.map(i => [
        `"${i.material_code || ''}"`,
        `"${i.material_name || ''}"`,
        `"${i.lot_number || ''}"`,
        i.current_stock,
        `"${i.uom || ''}"`,
        i.unit_cost,
        i.line_cost,
        `"${i.company_name || ''}"`,
        `"${i.vendor_name || ''}"`,
      ]);
    } else if (activeTab === 'packaging') {
      headers = ['Packaging Code', 'Packaging Name', 'Lot Number', 'Current Stock', 'UOM', 'Unit Cost (PHP)', 'Line Cost (PHP)', 'Company', 'Vendor'];
      rows = itemsData.packaging.map(i => [
        `"${i.material_code || ''}"`,
        `"${i.material_name || ''}"`,
        `"${i.lot_number || ''}"`,
        i.current_stock,
        `"${i.uom || ''}"`,
        i.unit_cost,
        i.line_cost,
        `"${i.company_name || ''}"`,
        `"${i.vendor_name || ''}"`,
      ]);
    } else if (activeTab === 'finished') {
      headers = ['Product Code', 'Product Name', 'Lot Number', 'Batch Number', 'Compounding Code', 'Current Stock', 'UOM', 'Unit Cost (PHP)', 'Line Cost (PHP)'];
      rows = itemsData.finishedProducts.map(i => [
        `"${i.product_code || ''}"`,
        `"${i.product_name || ''}"`,
        `"${i.lot_number || ''}"`,
        `"${i.batch_number || ''}"`,
        `"${i.compounding_code || ''}"`,
        i.current_stock,
        `"${i.uom || ''}"`,
        i.unit_cost,
        i.line_cost,
      ]);
    } else if (activeTab === 'rejected') {
      headers = ['Rejection Code', 'Material Code', 'Material Name', 'Type', 'Rejected Qty', 'UOM', 'Unit Cost (PHP)', 'Line Cost (PHP)', 'Company', 'Disposition'];
      rows = itemsData.rejectedMaterials.map(i => [
        `"${i.rejection_code || ''}"`,
        `"${i.material_code || ''}"`,
        `"${i.material_name || ''}"`,
        `"${i.material_type || ''}"`,
        i.rejected_quantity,
        `"${i.uom || ''}"`,
        i.unit_cost,
        i.line_cost,
        `"${i.company_name || ''}"`,
        `"${i.disposition || ''}"`,
      ]);
    } else {
      headers = ['Category', 'Item Count', 'Total Valuation (PHP)', '% of Active Inventory'];
      const activeTotal = summary.activeInventoryValuation || 1;
      rows = [
        ['Raw Materials', summary.rawCount, summary.rawValuation, `${((summary.rawValuation / activeTotal) * 100).toFixed(1)}%`],
        ['Packaging Materials', summary.packagingCount, summary.packagingValuation, `${((summary.packagingValuation / activeTotal) * 100).toFixed(1)}%`],
        ['Finished Products', summary.finishedCount, summary.finishedValuation, `${((summary.finishedValuation / activeTotal) * 100).toFixed(1)}%`],
        ['Total Active Inventory', summary.rawCount + summary.packagingCount + summary.finishedCount, summary.activeInventoryValuation, '100%'],
        ['Rejected Materials', summary.rejectedCount, summary.rejectedValuation, 'N/A'],
        ['OVERALL COSTING TOTAL', summary.rawCount + summary.packagingCount + summary.finishedCount + summary.rejectedCount, summary.overallCosting, 'N/A'],
      ];
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const activeTotalValuation = summary.activeInventoryValuation || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-emerald-600" />
            Inventory Costing & Valuation Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time financial valuation across active stock (Raw Materials, Packaging, Finished Goods) and Rejected Materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-1.5 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 rounded-xl flex items-center gap-1.5 transition active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>

          <button
            onClick={fetchCostingData}
            disabled={loading}
            className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Overall Costing */}
        <div
          onClick={() => setActiveTab('overview')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'overview'
              ? 'bg-slate-900 border-slate-900 text-white ring-2 ring-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTab === 'overview' ? 'text-slate-400' : 'text-slate-500'}`}>
              Overall Costing
            </span>
            <TrendingUp className={`w-4 h-4 ${activeTab === 'overview' ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.overallCosting)}</h2>
            <p className={`text-[10px] mt-0.5 ${activeTab === 'overview' ? 'text-slate-400' : 'text-slate-500'}`}>
              Active + Rejections
            </p>
          </div>
        </div>

        {/* 2. Amount Inside Inventory */}
        <div
          onClick={() => setActiveTab('overview')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'overview'
              ? 'bg-emerald-900 border-emerald-900 text-white'
              : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Inside Inventory
            </span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.activeInventoryValuation)}</h2>
            <p className="text-[10px] text-emerald-600 mt-0.5 font-medium">
              Healthy Active Stock
            </p>
          </div>
        </div>

        {/* 3. Raw Materials */}
        <div
          onClick={() => setActiveTab('raw')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'raw'
              ? 'bg-blue-900 border-blue-900 text-white ring-2 ring-blue-900'
              : 'bg-white border-slate-200 hover:border-blue-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Raw Materials
            </span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.rawValuation)}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {summary.rawCount} active items ({((summary.rawValuation / activeTotalValuation) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* 4. Packaging */}
        <div
          onClick={() => setActiveTab('packaging')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'packaging'
              ? 'bg-purple-900 border-purple-900 text-white ring-2 ring-purple-900'
              : 'bg-white border-slate-200 hover:border-purple-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
              Packaging
            </span>
            <Layers className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.packagingValuation)}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {summary.packagingCount} active items ({((summary.packagingValuation / activeTotalValuation) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* 5. Finished Products */}
        <div
          onClick={() => setActiveTab('finished')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'finished'
              ? 'bg-indigo-900 border-indigo-900 text-white ring-2 ring-indigo-900'
              : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Finished Goods
            </span>
            <CheckCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.finishedValuation)}</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {summary.finishedCount} active items ({((summary.finishedValuation / activeTotalValuation) * 100).toFixed(1)}%)
            </p>
          </div>
        </div>

        {/* 6. Rejected Materials */}
        <div
          onClick={() => setActiveTab('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            activeTab === 'rejected'
              ? 'bg-rose-900 border-rose-900 text-white ring-2 ring-rose-900'
              : 'bg-rose-50/60 border-rose-200 hover:border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
              Rejected Costing
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2">
            <h2 className="text-lg font-black tracking-tight">{formatCurrency(summary.rejectedValuation)}</h2>
            <p className="text-[10px] text-rose-600 mt-0.5 font-medium">
              {summary.rejectedCount} rejected entries
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search code, material, lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </form>

        {/* Company Filter & Search Trigger */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Company:</span>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="All">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchCostingData}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 flex space-x-2 overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
            activeTab === 'overview'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-4 h-4 inline-block mr-1.5" />
          Overview & Breakdown
        </button>

        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
            activeTab === 'raw'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4 inline-block mr-1.5 text-blue-600" />
          Raw Materials ({itemsData.rawMaterials.length})
        </button>

        <button
          onClick={() => setActiveTab('packaging')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
            activeTab === 'packaging'
              ? 'border-purple-600 text-purple-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 inline-block mr-1.5 text-purple-600" />
          Packaging ({itemsData.packaging.length})
        </button>

        <button
          onClick={() => setActiveTab('finished')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
            activeTab === 'finished'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle className="w-4 h-4 inline-block mr-1.5 text-indigo-600" />
          Finished Goods ({itemsData.finishedProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
            activeTab === 'rejected'
              ? 'border-rose-600 text-rose-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline-block mr-1.5 text-rose-600" />
          Rejected Materials ({itemsData.rejectedMaterials.length})
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-medium">Calculating financial valuation and line costs...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* TAB 1: OVERVIEW & FINANCIAL BREAKDOWN */}
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Financial Asset Valuation Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Visual Bar Breakdown */}
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Active Stock Allocation (% of Inside Inventory)
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-blue-700">Raw Materials</span>
                        <span className="text-slate-900">{formatCurrency(summary.rawValuation)} ({((summary.rawValuation / activeTotalValuation) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, (summary.rawValuation / activeTotalValuation) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-purple-700">Packaging Materials</span>
                        <span className="text-slate-900">{formatCurrency(summary.packagingValuation)} ({((summary.packagingValuation / activeTotalValuation) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(100, (summary.packagingValuation / activeTotalValuation) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-indigo-700">Finished Products</span>
                        <span className="text-slate-900">{formatCurrency(summary.finishedValuation)} ({((summary.finishedValuation / activeTotalValuation) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, (summary.finishedValuation / activeTotalValuation) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Summary Card Box */}
                <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl shadow-md flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                      Asset Valuation
                    </span>
                    <h2 className="text-2xl font-black mt-1">{formatCurrency(summary.overallCosting)}</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Total inventory capitalization including quarantine rejections.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-700/80 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Healthy Inventory</span>
                      <span className="font-bold text-emerald-400 text-sm">{formatCurrency(summary.activeInventoryValuation)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Rejected Value</span>
                      <span className="font-bold text-rose-400 text-sm">{formatCurrency(summary.rejectedValuation)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Category Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3">Active Items Count</th>
                      <th className="p-3">Subtotal Valuation (PHP)</th>
                      <th className="p-3">% of Inside Inventory</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-blue-700">Raw Materials</td>
                      <td className="p-3">{summary.rawCount} lots</td>
                      <td className="p-3 font-bold">{formatCurrency(summary.rawValuation)}</td>
                      <td className="p-3">{((summary.rawValuation / activeTotalValuation) * 100).toFixed(1)}%</td>
                      <td className="p-3">
                        <button
                          onClick={() => setActiveTab('raw')}
                          className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                        >
                          View Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-purple-700">Packaging Materials</td>
                      <td className="p-3">{summary.packagingCount} lots</td>
                      <td className="p-3 font-bold">{formatCurrency(summary.packagingValuation)}</td>
                      <td className="p-3">{((summary.packagingValuation / activeTotalValuation) * 100).toFixed(1)}%</td>
                      <td className="p-3">
                        <button
                          onClick={() => setActiveTab('packaging')}
                          className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
                        >
                          View Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-indigo-700">Finished Products</td>
                      <td className="p-3">{summary.finishedCount} batches</td>
                      <td className="p-3 font-bold">{formatCurrency(summary.finishedValuation)}</td>
                      <td className="p-3">{((summary.finishedValuation / activeTotalValuation) * 100).toFixed(1)}%</td>
                      <td className="p-3">
                        <button
                          onClick={() => setActiveTab('finished')}
                          className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          View Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                      <td className="p-3">SUBTOTAL INSIDE INVENTORY</td>
                      <td className="p-3">{summary.rawCount + summary.packagingCount + summary.finishedCount} items</td>
                      <td className="p-3 font-black text-sm">{formatCurrency(summary.activeInventoryValuation)}</td>
                      <td className="p-3">100.0%</td>
                      <td className="p-3">-</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-rose-700">Rejected Materials (Quarantine)</td>
                      <td className="p-3">{summary.rejectedCount} rejections</td>
                      <td className="p-3 font-bold text-rose-700">{formatCurrency(summary.rejectedValuation)}</td>
                      <td className="p-3 text-slate-400">N/A</td>
                      <td className="p-3">
                        <button
                          onClick={() => setActiveTab('rejected')}
                          className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
                        >
                          View Details <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                    <tr className="bg-slate-900 text-white font-black text-sm">
                      <td className="p-3.5">OVERALL COSTING TOTAL</td>
                      <td className="p-3.5">{summary.rawCount + summary.packagingCount + summary.finishedCount + summary.rejectedCount} items</td>
                      <td className="p-3.5 text-emerald-400">{formatCurrency(summary.overallCosting)}</td>
                      <td className="p-3.5 text-slate-400">-</td>
                      <td className="p-3.5">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: RAW MATERIALS TABLE */}
          {activeTab === 'raw' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Material Code</th>
                    <th className="p-3">Material Name</th>
                    <th className="p-3">Lot Number</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3 text-right">Unit Cost (PHP)</th>
                    <th className="p-3 text-right">Line Cost Valuation (PHP)</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemsData.rawMaterials.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400 font-semibold">
                        No raw material inventory records found.
                      </td>
                    </tr>
                  ) : (
                    itemsData.rawMaterials.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-blue-700">{item.material_code || '-'}</td>
                        <td className="p-3 font-bold text-slate-900">{item.material_name || '-'}</td>
                        <td className="p-3 font-mono text-slate-600">{item.lot_number}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{item.current_stock.toLocaleString()}</td>
                        <td className="p-3 text-slate-500 uppercase">{item.uom}</td>
                        <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(item.line_cost)}</td>
                        <td className="p-3 text-slate-600">{item.company_name || '-'}</td>
                        <td className="p-3 text-slate-600">{item.vendor_name || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itemsData.rawMaterials.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan="6" className="p-3 uppercase text-[10px] tracking-wider text-slate-600">Total Raw Material Valuation:</td>
                      <td className="p-3 text-right text-emerald-700 text-sm">{formatCurrency(summary.rawValuation)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* TAB 3: PACKAGING TABLE */}
          {activeTab === 'packaging' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Packaging Code</th>
                    <th className="p-3">Packaging Name</th>
                    <th className="p-3">Lot Number</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3 text-right">Unit Cost (PHP)</th>
                    <th className="p-3 text-right">Line Cost Valuation (PHP)</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemsData.packaging.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400 font-semibold">
                        No packaging material inventory records found.
                      </td>
                    </tr>
                  ) : (
                    itemsData.packaging.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-purple-700">{item.material_code || '-'}</td>
                        <td className="p-3 font-bold text-slate-900">{item.material_name || '-'}</td>
                        <td className="p-3 font-mono text-slate-600">{item.lot_number}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{item.current_stock.toLocaleString()}</td>
                        <td className="p-3 text-slate-500 uppercase">{item.uom}</td>
                        <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(item.line_cost)}</td>
                        <td className="p-3 text-slate-600">{item.company_name || '-'}</td>
                        <td className="p-3 text-slate-600">{item.vendor_name || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itemsData.packaging.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan="6" className="p-3 uppercase text-[10px] tracking-wider text-slate-600">Total Packaging Valuation:</td>
                      <td className="p-3 text-right text-emerald-700 text-sm">{formatCurrency(summary.packagingValuation)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* TAB 4: FINISHED PRODUCTS TABLE */}
          {activeTab === 'finished' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product Code</th>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Lot Number</th>
                    <th className="p-3">Batch Number</th>
                    <th className="p-3">Compounding Code</th>
                    <th className="p-3 text-right">Current Stock</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3 text-right">Unit Cost (PHP)</th>
                    <th className="p-3 text-right">Line Cost Valuation (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemsData.finishedProducts.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400 font-semibold">
                        No finished product inventory records found.
                      </td>
                    </tr>
                  ) : (
                    itemsData.finishedProducts.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-indigo-700">{item.product_code || '-'}</td>
                        <td className="p-3 font-bold text-slate-900">{item.product_name || '-'}</td>
                        <td className="p-3 font-mono text-slate-600">{item.lot_number}</td>
                        <td className="p-3 font-mono text-slate-600">{item.batch_number || '-'}</td>
                        <td className="p-3 font-mono text-slate-600">{item.compounding_code || '-'}</td>
                        <td className="p-3 text-right font-bold text-slate-900">{item.current_stock.toLocaleString()}</td>
                        <td className="p-3 text-slate-500 uppercase">{item.uom}</td>
                        <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 text-right font-bold text-emerald-700">{formatCurrency(item.line_cost)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itemsData.finishedProducts.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan="8" className="p-3 uppercase text-[10px] tracking-wider text-slate-600">Total Finished Products Valuation:</td>
                      <td className="p-3 text-right text-emerald-700 text-sm">{formatCurrency(summary.finishedValuation)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {/* TAB 5: REJECTED MATERIALS TABLE */}
          {activeTab === 'rejected' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Rejection Code</th>
                    <th className="p-3">Material Code</th>
                    <th className="p-3">Material Name</th>
                    <th className="p-3">Category Type</th>
                    <th className="p-3 text-right">Rejected Qty</th>
                    <th className="p-3">UOM</th>
                    <th className="p-3 text-right">Unit Cost (PHP)</th>
                    <th className="p-3 text-right">Line Cost Valuation (PHP)</th>
                    <th className="p-3">Company</th>
                    <th className="p-3">Disposition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {itemsData.rejectedMaterials.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-slate-400 font-semibold">
                        No rejected material records found.
                      </td>
                    </tr>
                  ) : (
                    itemsData.rejectedMaterials.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-rose-700">{item.rejection_code}</td>
                        <td className="p-3 font-mono text-slate-600">{item.material_code}</td>
                        <td className="p-3 font-bold text-slate-900">{item.material_name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {item.material_type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-rose-700">{item.rejected_quantity.toLocaleString()}</td>
                        <td className="p-3 text-slate-500 uppercase">{item.uom}</td>
                        <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_cost)}</td>
                        <td className="p-3 text-right font-bold text-rose-700">{formatCurrency(item.line_cost)}</td>
                        <td className="p-3 text-slate-600">{item.company_name || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {item.disposition}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {itemsData.rejectedMaterials.length > 0 && (
                  <tfoot className="bg-slate-100 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan="7" className="p-3 uppercase text-[10px] tracking-wider text-slate-600">Total Rejected Material Costing:</td>
                      <td className="p-3 text-right text-rose-700 text-sm">{formatCurrency(summary.rejectedValuation)}</td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default InventoryCostingPage;
