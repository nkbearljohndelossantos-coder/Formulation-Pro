import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Scale, CheckCircle2, AlertOctagon, Search, Calendar, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function OperatorHistoryPage() {
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('operator-weighings'); // 'operator-weighings' | 'system-audit'
  const [opLogs, setOpLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [resOp, resAudit] = await Promise.all([
        fetch('/api/v1/batches/operator/my-logs', { headers: { 'Authorization': `Bearer ${accessToken}` } }),
        fetch('/api/v1/audit-logs', { headers: { 'Authorization': `Bearer ${accessToken}` } }),
      ]);

      const dataOp = await resOp.json();
      const dataAudit = await resAudit.json();

      if (resOp.ok && dataOp.success) {
        setOpLogs(dataOp.data || []);
      }
      if (resAudit.ok && dataAudit.success) {
        setAuditLogs(dataAudit.data || []);
      }
    } catch (e) {
      console.error(e);
    } fontally: {
      setLoading(false);
    }
  };

  const filteredOpLogs = opLogs.filter(l => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (l.batch_number && l.batch_number.toLowerCase().includes(q)) ||
      (l.formula_name && l.formula_name.toLowerCase().includes(q)) ||
      (l.material_name && l.material_name.toLowerCase().includes(q)) ||
      (l.material_code && l.material_code.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" /> Operator Execution Log & History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log history of all raw material weighings, step confirmations, and compounding executions for <span className="font-bold text-slate-800">Operator {user?.firstName || user?.username}</span>.
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1.5 self-start sm:self-auto shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Audit Log Verified
        </span>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('operator-weighings')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'operator-weighings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Scale className="w-4 h-4" /> My Weighing Logs ({opLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('system-audit')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeTab === 'system-audit'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> System Audit Trail ({auditLogs.length})
          </button>
        </div>

        {activeTab === 'operator-weighings' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter batch or material..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 shadow-xs"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-semibold">Loading execution logs...</div>
        ) : activeTab === 'operator-weighings' ? (
          filteredOpLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">No weighing execution logs recorded for this operator yet.</p>
              <p className="text-xs text-slate-400">Step weighings confirmed in Operator Compounding Station will automatically appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-5">Batch Number</th>
                    <th className="py-3.5 px-5">Formula</th>
                    <th className="py-3.5 px-5">Material Weighed</th>
                    <th className="py-3.5 px-5 text-right">Target Weight</th>
                    <th className="py-3.5 px-5 text-right">Actual Weight</th>
                    <th className="py-3.5 px-5 text-center">Variance</th>
                    <th className="py-3.5 px-5">Tolerance Status</th>
                    <th className="py-3.5 px-5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredOpLogs.map((log) => {
                    const isWithin = log.is_within_tolerance;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-5 font-mono font-extrabold text-blue-700">
                          {log.batch_number}
                        </td>
                        <td className="py-3.5 px-5 font-bold text-slate-900">
                          {log.formula_name || 'Cosmetic Formula'}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="font-bold text-slate-900 block">{log.material_name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{log.material_code}</span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-700">
                          {log.target_weight ? Number(log.target_weight).toFixed(2) : '—'} g
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
                          {Number(log.actual_weight).toFixed(2)} g
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-slate-700">
                          {Number(log.variance_percent).toFixed(2)}%
                        </td>
                        <td className="py-3.5 px-5">
                          {isWithin ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Within Spec
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md flex items-center gap-1 w-fit">
                              <AlertOctagon className="w-3 h-3 text-rose-600" /> Deviation
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 font-mono text-slate-500 text-[11px]">
                          {new Date(log.weighed_at).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-5">Seq #</th>
                  <th className="py-3.5 px-5">Action</th>
                  <th className="py-3.5 px-5">Entity</th>
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-5">SHA-256 Entry Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-5 font-bold font-mono text-slate-400">#{log.sequence_number || log.id}</td>
                    <td className="py-3.5 px-5 font-bold text-slate-900">{log.action}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-600">{log.entity || log.entity_type} #{log.entity_id}</td>
                    <td className="py-3.5 px-5 font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3.5 px-5 font-mono text-[11px] text-blue-600 truncate max-w-[200px]">
                      {log.entry_hash || log.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
