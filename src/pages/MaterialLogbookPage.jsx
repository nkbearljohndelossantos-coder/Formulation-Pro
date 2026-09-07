import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
  Search,
  Calendar,
  Building2,
  Building,
  ArrowUpDown,
  Download,
  Printer,
  RefreshCw,
  Clock,
  User,
  Tag,
  Boxes,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export function MaterialLogbookPage() {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ totalMovements: 0, inCount: 0, outCount: 0, totalInQty: 0, totalOutQty: 0 });
  const [companies, setCompanies] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [direction, setDirection] = useState('ALL'); // ALL, IN, OUT, ADJUSTMENT, TRANSFER
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [companyId, setCompanyId] = useState('All');
  const [vendorId, setVendorId] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc'); // date_desc, date_asc, alpha_asc, alpha_desc, company_asc

  const fetchLogbook = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (direction && direction !== 'ALL') queryParams.append('direction', direction);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (companyId && companyId !== 'All') queryParams.append('companyId', companyId);
      if (vendorId && vendorId !== 'All') queryParams.append('vendorId', vendorId);
      if (search) queryParams.append('search', search);
      if (sort) queryParams.append('sort', sort);

      const res = await apiFetch(`/api/v1/inventory/logbook?${queryParams.toString()}`);
      const result = await res.json();

      if (res.ok && result.success) {
        setLogs(result.data || []);
        setSummary(result.summary || { totalMovements: 0, inCount: 0, outCount: 0, totalInQty: 0, totalOutQty: 0 });
        if (result.companies) setCompanies(result.companies);
        if (result.vendors) setVendors(result.vendors);
      } else {
        setError(result.message || 'Failed to load logbook entries.');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch material logbook.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogbook();
  }, [direction, startDate, endDate, companyId, vendorId, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogbook();
  };

  const setDatePreset = (preset) => {
    const now = new Date();
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Txn Code', 'Date & Time', 'Type', 'Material Code', 'Material Name', 'Company', 'Vendor', 'Lot No', 'Qty', 'UOM', 'Prev Balance', 'New Balance', 'User', 'Reference / Notes'];
    const rows = logs.map(l => [
      l.transaction_code || '',
      new Date(l.created_at).toLocaleString(),
      l.transaction_type || '',
      l.material_code || '',
      `"${(l.material_name || '').replace(/"/g, '""')}"`,
      `"${(l.company_name || '').replace(/"/g, '""')}"`,
      `"${(l.vendor_name || '').replace(/"/g, '""')}"`,
      l.lot_number || '',
      l.quantity || 0,
      l.uom || '',
      l.previous_balance || 0,
      l.new_balance || 0,
      `"${l.user_first_name || ''} ${l.user_last_name || ''}"`,
      `"${(l.reason || l.reference_number || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Material_Logbook_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getTypeBadge = (type) => {
    if (['STOCK_IN', 'ADJUSTMENT_IN', 'RETURN', 'REUSE', 'RELEASE'].includes(type)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          <span>MATERIAL IN</span>
        </span>
      );
    }
    if (['STOCK_OUT', 'ADJUSTMENT_OUT', 'DISPOSAL', 'CONSUMPTION', 'REJECTION'].includes(type)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          <span>MATERIAL OUT</span>
        </span>
      );
    }
    if (type === 'TRANSFER') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
          <span>TRANSFER</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
        <SlidersHorizontal className="w-3.5 h-3.5 text-purple-600" />
        <span>{type}</span>
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto font-sans">
      {/* 1. Header & Title Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Material In / Out Logbook
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Complete real-time audit ledger of all raw material receipts, issue dispatches, stock adjustments & transfers.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchLogbook}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition border border-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Movements</p>
            <p className="text-2xl font-black text-slate-900">{summary.totalMovements}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materials In</p>
            <p className="text-2xl font-black text-emerald-600">{summary.inCount} <span className="text-xs font-semibold text-slate-400">({summary.totalInQty.toLocaleString()} units)</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Materials Out</p>
            <p className="text-2xl font-black text-amber-600">{summary.outCount} <span className="text-xs font-semibold text-slate-400">({summary.totalOutQty.toLocaleString()} units)</span></p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Companies & Vendors</p>
            <p className="text-2xl font-black text-indigo-600">{companies.length + vendors.length}</p>
          </div>
        </div>
      </div>

      {/* 3. Comprehensive Filters & Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Row 1: Movement Type Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {[
              { key: 'ALL', label: 'All Movements', icon: Boxes },
              { key: 'IN', label: 'Materials In', icon: ArrowDownLeft },
              { key: 'OUT', label: 'Materials Out', icon: ArrowUpRight },
              { key: 'ADJUSTMENT', label: 'Adjustments', icon: SlidersHorizontal },
              { key: 'TRANSFER', label: 'Transfers', icon: ArrowRightLeft },
            ].map(tab => {
              const IconComp = tab.icon;
              const active = direction === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setDirection(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Preset:</span>
            <button type="button" onClick={() => setDatePreset('today')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700">Today</button>
            <button type="button" onClick={() => setDatePreset('7days')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700">7 Days</button>
            <button type="button" onClick={() => setDatePreset('30days')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700">30 Days</button>
            <button type="button" onClick={() => setDatePreset('all')} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-semibold text-slate-700">All Time</button>
          </div>
        </div>

        {/* Row 2: Filter Form Controls */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" /> Start Date & Time
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-blue-500" /> End Date & Time
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Building className="w-3 h-3 text-indigo-500" /> Company Filter
            </label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            >
              <option value="All">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>

          {/* Alphabetical & Custom Sorting Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-purple-500" /> Sort & Order
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
            >
              <option value="date_desc">📅 Date & Time: Newest First</option>
              <option value="date_asc">📅 Date & Time: Oldest First</option>
              <option value="alpha_asc">🔤 Material Name: A – Z</option>
              <option value="alpha_desc">🔤 Material Name: Z – A</option>
              <option value="company_asc">🏢 Company Name: A – Z</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-slate-500" /> Search Keyword
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search code, lot, user..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </form>
      </div>

      {/* 4. Logbook Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading Material Logbook Ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 text-xs font-bold">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No logbook entries found</p>
            <p className="text-xs text-slate-400">Try adjusting your date range, company filter, or movement category.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4">Txn Code</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">Material Code & Name</th>
                  <th className="py-3.5 px-4">Company / Supplier</th>
                  <th className="py-3.5 px-4">Lot Number</th>
                  <th className="py-3.5 px-4 text-right">Quantity</th>
                  <th className="py-3.5 px-4 text-center">Balance (Prev ➔ New)</th>
                  <th className="py-3.5 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  const isStockIn = ['STOCK_IN', 'ADJUSTMENT_IN', 'RETURN', 'REUSE', 'RELEASE'].includes(log.transaction_type);
                  const isStockOut = ['STOCK_OUT', 'ADJUSTMENT_OUT', 'DISPOSAL', 'CONSUMPTION', 'REJECTION'].includes(log.transaction_type);
                  const qtyFormatted = Number(parseFloat(log.quantity || 0).toFixed(2)).toLocaleString();

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      {/* Date & Time */}
                      <td className="py-3 px-4 font-mono text-[11px] font-semibold text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Transaction Code */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                        {log.transaction_code}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getTypeBadge(log.transaction_type)}
                      </td>

                      {/* Material Code & Name */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.material_name || 'Raw Material'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.material_code || 'N/A'}</div>
                      </td>

                      {/* Company / Supplier */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-indigo-900">{log.company_name || log.vendor_name || 'NKB Manufacturing'}</div>
                        {log.company_code && <span className="text-[10px] text-indigo-400 font-mono">[{log.company_code}]</span>}
                      </td>

                      {/* Lot Number */}
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md">
                          {log.lot_number}
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                        <span className={isStockIn ? 'text-emerald-600' : isStockOut ? 'text-amber-600' : 'text-slate-800'}>
                          {isStockIn ? `+${qtyFormatted}` : isStockOut ? `-${qtyFormatted}` : qtyFormatted} {log.uom}
                        </span>
                      </td>

                      {/* Balance Progression */}
                      <td className="py-3 px-4 text-center font-mono text-xs whitespace-nowrap">
                        <span className="text-slate-400">{Number(parseFloat(log.previous_balance || 0).toFixed(1)).toLocaleString()}</span>
                        <span className="mx-1 text-slate-300">➔</span>
                        <span className="font-bold text-slate-900">{Number(parseFloat(log.new_balance || 0).toFixed(1)).toLocaleString()}</span>
                      </td>

                      {/* Performed By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.user_first_name ? `${log.user_first_name} ${log.user_last_name || ''}` : 'System'}</span>
                        </div>
                        {log.reason && <div className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{log.reason}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaterialLogbookPage;
