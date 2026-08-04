import React, { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  GitCompare,
  CheckSquare,
  Square,
  User,
  Calendar,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle,
  X,
  Printer,
  Download,
  AlertCircle,
} from 'lucide-react';
import { apiFetch } from '../services/api';

export function CompoundingLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = (query = searchQuery) => {
    setLoading(true);
    const url = query ? `/api/v1/compounding-codes?search=${encodeURIComponent(query)}` : '/api/v1/compounding-codes';
    apiFetch(url)
      .then((res) => res.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setLogs(d.data);
        }
      })
      .catch((err) => console.error('Error fetching compounding logs:', err))
      .finally(() => setLoading(false));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(searchQuery);
  };

  const toggleSelectCode = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    if (selectedCodes.length === logs.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(logs.map((l) => l.compounding_code));
    }
  };

  const openComparison = () => {
    if (selectedCodes.length < 2) {
      alert('Please select at least 2 compounding codes to compare.');
      return;
    }
    setComparing(true);
    setIsCompareModalOpen(true);
    apiFetch('/api/v1/compounding-codes/compare', {
      method: 'POST',
      body: JSON.stringify({ codes: selectedCodes }),
    })
      .then((res) => res.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          setComparisonData(d.data);
        }
      })
      .catch((err) => console.error('Comparison error:', err))
      .finally(() => setComparing(false));
  };

  const exportToCSV = () => {
    if (!logs.length) return;
    const headers = [
      'Compounding Code',
      'Batch Number',
      'Formula Code',
      'Formula Name',
      'Formula Version',
      'Copy Number',
      'Total Copies',
      'Target Batch Size',
      'Target UOM',
      'Printed By',
      'Date & Time',
    ];
    const rows = logs.map((l) => [
      l.compounding_code,
      l.batch_number || '',
      l.formula_code || '',
      `"${(l.formula_name || '').replace(/"/g, '""')}"`,
      l.formula_version || '',
      l.copy_number || 1,
      l.total_copies || 1,
      l.target_batch_size || '',
      l.target_batch_uom || 'g',
      `"${(l.printed_by_name || '').replace(/"/g, '""')}"`,
      new Date(l.created_at).toLocaleString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `compounding_codes_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-700" />
            Compounding Code Storage & Repository
          </h1>
          <p className="text-xs text-slate-500">
            Registry of all generated unique compounding control codes (<span className="font-mono text-blue-600 font-bold">CP-YYYY-XXXX</span>), print audit trail, and parameter comparison.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCodes.length > 0 && (
            <button
              onClick={openComparison}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition animate-pulse"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare Selected ({selectedCodes.length})</span>
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Compounding Code (CP-...), Batch No, Formula, or User..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition w-full sm:w-auto shrink-0"
        >
          Filter Logs
        </button>
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              fetchLogs('');
            }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0"
          >
            Clear
          </button>
        )}
      </form>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Total Registered Codes</span>
            <span className="text-lg font-black text-slate-900 font-mono">{logs.length}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Guaranteed Uniqueness</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
              100% Collision Free
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Selected for Compare</span>
            <span className="text-lg font-black text-indigo-700 font-mono">{selectedCodes.length} codes</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Latest Sequence</span>
            <span className="text-xs font-extrabold text-amber-900 font-mono block">
              {logs[0]?.compounding_code || 'CP-2026-0001'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1"
            >
              {selectedCodes.length === logs.length && logs.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Select All</span>
            </button>
            <span className="text-slate-500 font-medium">
              Showing {logs.length} compounding log records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">Select</th>
                <th className="p-3.5">Compounding Code</th>
                <th className="p-3.5">Batch Number</th>
                <th className="p-3.5">Formulation</th>
                <th className="p-3.5">Version</th>
                <th className="p-3.5 text-right">Target Weight</th>
                <th className="p-3.5">Copy Info</th>
                <th className="p-3.5">Generated By</th>
                <th className="p-3.5">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-12 text-center text-slate-400 font-semibold">
                    No compounding code logs recorded yet. Generate or print production sheets to automatically populate logs.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isSelected = selectedCodes.includes(log.compounding_code);
                  return (
                    <tr
                      key={log.id || log.compounding_code}
                      onClick={() => toggleSelectCode(log.compounding_code)}
                      className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-bold' : ''
                      }`}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelectCode(log.compounding_code)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-blue-700">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                          {log.compounding_code}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-800 font-bold">
                        {log.batch_number || '—'}
                      </td>
                      <td className="p-3.5 text-slate-900 font-bold">
                        <div>{log.formula_name || 'Cosmetic Formulation'}</div>
                        {log.formula_code && (
                          <span className="text-[10px] text-slate-400 font-mono font-medium block">
                            Code: {log.formula_code}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-semibold text-slate-700">
                        {log.formula_version || 'V1.0'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                        {log.target_batch_size
                          ? `${Number(log.target_batch_size).toLocaleString('en-US', {
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            })} ${log.target_batch_uom || 'g'}`
                          : '—'}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        Copy {log.copy_number || 1} of {log.total_copies || 1}
                      </td>
                      <td className="p-3.5 text-slate-800 font-semibold">
                        {log.printed_by_name || 'System User'}
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-Side Code Comparison Modal */}
      {isCompareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Compounding Code Parameter Comparison
                </h3>
              </div>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-full hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {comparing ? (
                <div className="p-12 text-center text-slate-500 font-semibold animate-pulse">
                  Loading comparison matrix...
                </div>
              ) : comparisonData.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No compounding logs found for comparison.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comparisonData.map((item) => (
                    <div
                      key={item.compounding_code}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 relative shadow-xs hover:border-blue-400 transition"
                    >
                      <div className="border-b border-slate-200 pb-3">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold block">
                          Compounding Code
                        </span>
                        <h4 className="text-lg font-black font-mono text-blue-700">
                          {item.compounding_code}
                        </h4>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          Batch: {item.batch_number || 'N/A'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-slate-500 block font-medium">Formulation Name</span>
                          <span className="font-extrabold text-slate-900">
                            {item.formula_name || 'Standard Formula'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-slate-500 block font-medium">Formula Code</span>
                            <span className="font-mono font-bold text-slate-800">
                              {item.formula_code || '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-medium">Version</span>
                            <span className="font-mono font-bold text-slate-800">
                              {item.formula_version || 'V1.0'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                          <div>
                            <span className="text-slate-500 block font-medium">Target Batch Size</span>
                            <span className="font-mono font-extrabold text-emerald-700">
                              {item.target_batch_size
                                ? `${Number(item.target_batch_size).toFixed(1)} ${item.target_batch_uom || 'g'}`
                                : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block font-medium">Print Copy #</span>
                            <span className="font-semibold text-slate-800">
                              Copy {item.copy_number || 1} of {item.total_copies || 1}
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-200">
                          <span className="text-slate-500 block font-medium">Issued By</span>
                          <span className="font-bold text-slate-900">
                            {item.printed_by_name || 'System Operator'}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-500 block font-medium">Issued Date</span>
                          <span className="font-mono text-[11px] text-slate-600">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
              <span className="text-xs text-slate-500 font-medium">
                Comparing {comparisonData.length} unique compounding log entries
              </span>
              <button
                onClick={() => setIsCompareModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompoundingLogsPage;
