import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Printer,
  FileText,
  Key,
  RefreshCw,
  AlertCircle,
  Building,
  Calendar,
  DollarSign,
  Tag,
  Paperclip,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
  Info
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function PayableApprovalsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [payables, setPayables] = useState([]);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const itemsPerPage = 10;

  // Form state in detail view
  const [checkNumber, setCheckNumber] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // API Key config modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    hasKey: false,
    maskedKey: null,
    apiUrl: 'http://my.nkbmanufacturing.com/api/v1',
    apiOnline: false,
    apiMessage: ''
  });
  const [inputApiKey, setInputApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Fetch payables list & config
  const fetchPayables = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/v1/payables?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPayables(data.data);
      } else {
        setError(data.message || 'Failed to load payables');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching payables');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await apiFetch('/api/v1/payables/config');
      const data = await res.json();
      if (data.success) {
        setApiConfig(data);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPayables();
    fetchConfig();
  }, [statusFilter]);

  // Handle save API key
  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    if (!inputApiKey.trim()) return;
    try {
      setSavingKey(true);
      const res = await apiFetch('/api/v1/payables/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputApiKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setInputApiKey('');
        setShowConfigModal(false);
        await fetchConfig();
        await fetchPayables();
      } else {
        alert(data.message || 'Failed to save API Key');
      }
    } catch (err) {
      alert(err.message || 'Network error');
    } finally {
      setSavingKey(false);
    }
  };

  // Open detail view
  const handleOpenDetail = (p) => {
    setSelectedPayable(p);
    setCheckNumber(p.cheque_number || '');
    setComments(p.comments || '');
    setActionSuccessMessage(null);
    setViewMode('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Approval / Rejection
  const handleConfirmDecision = async (decision) => {
    if (!selectedPayable) return;

    if (decision === 'CONFIRMED' && !checkNumber.trim()) {
      alert('Pakilagay ang Check Number (Cheque Number) bago mag-approve.\nCheck Number is required for approval.');
      return;
    }

    const confirmPrompt = decision === 'CONFIRMED'
      ? `Sigurado ka bang nais mong I-APPROVE ang Payable ${selectedPayable.payable_number} gamit ang Check Number: ${checkNumber.trim()}?`
      : `Sigurado ka bang nais mong I-REJECT ang Payable ${selectedPayable.payable_number}?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setSubmitting(true);
      const approverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'COO';

      const res = await apiFetch(`/api/v1/payables/${selectedPayable.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          cheque_number: checkNumber.trim(),
          notes: comments,
          confirmed_by: approverName
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Matagumpay na na-${decision === 'CONFIRMED' ? 'APPROVE' : 'REJECT'} ang Payable ${selectedPayable.payable_number}!`);
        setSelectedPayable(prev => ({
          ...prev,
          status: decision === 'CONFIRMED' ? 'Approved' : 'Rejected',
          cheque_number: checkNumber.trim()
        }));
        // Refresh master list in background
        fetchPayables();
      } else {
        alert(data.message || 'Failed to submit decision.');
      }
    } catch (err) {
      alert(err.message || 'Error communicating with approval server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Search filter
  const filteredPayables = useMemo(() => {
    if (!searchTerm.trim()) return payables;
    const q = searchTerm.trim().toLowerCase();
    return payables.filter(p =>
      (p.payable_number || '').toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.company_code || '').toLowerCase().includes(q) ||
      (p.control_number || '').toLowerCase().includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.vendor || '').toLowerCase().includes(q)
    );
  }, [payables, searchTerm]);

  // Pagination calculation
  const totalEntries = filteredPayables.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const paginatedPayables = useMemo(() => {
    const start = (currentPageNum - 1) * itemsPerPage;
    return filteredPayables.slice(start, start + itemsPerPage);
  }, [filteredPayables, currentPageNum]);

  // Formatter helper
  const formatMoney = (val) => {
    const num = parseFloat(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // =========================================================================
  // VIEW: APPROVING PAYABLE (DETAIL VIEW MATCHING SCREENSHOT 1)
  // =========================================================================
  if (viewMode === 'detail' && selectedPayable) {
    const p = selectedPayable;
    const isApproved = p.status === 'Approved' || p.status === 'CONFIRMED';
    const isRejected = p.status === 'Rejected' || p.status === 'REJECTED';

    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Notification if action was taken */}
        {actionSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Card Container */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                title="Back to list"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-slate-800">Approving Payable</h1>
            </div>
            <button
              onClick={() => window.print()}
              title="Print Payable Voucher"
              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
            >
              <Printer className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Top Details Grid - 4 Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Row 1 */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company</label>
                <input
                  type="text"
                  readOnly
                  value={p.company || 'NKB Manufacturing Corporation'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Invoice Number</label>
                <input
                  type="text"
                  readOnly
                  value={p.invoice_number || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Date Created</label>
                <input
                  type="text"
                  readOnly
                  value={p.date_created || p.date || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-blue-600 font-bold mb-1">Payable Number</label>
                <input
                  type="text"
                  readOnly
                  value={p.payable_number || ''}
                  className="w-full bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-blue-600 font-bold focus:outline-none"
                />
              </div>

              {/* Row 2 */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Category</label>
                <input
                  type="text"
                  readOnly
                  value={p.category || 'Accrued expenses'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Invoice Date</label>
                <input
                  type="text"
                  readOnly
                  value={p.invoice_date || p.date || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Created By</label>
                <input
                  type="text"
                  readOnly
                  value={p.created_by || 'Sharmaine Santos'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Control Number</label>
                <input
                  type="text"
                  readOnly
                  value={p.control_number || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>

              {/* Row 3 */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Vendor</label>
                <input
                  type="text"
                  readOnly
                  value={p.vendor || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Term</label>
                <input
                  type="text"
                  readOnly
                  value={p.term || 'Due on Receipt'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Status</label>
                <input
                  type="text"
                  readOnly
                  value={p.status || 'Submitted For Approval'}
                  className={`w-full border rounded-md px-3 py-2 font-bold focus:outline-none ${
                    isApproved ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                    isRejected ? 'bg-rose-50 border-rose-300 text-rose-700' :
                    'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Row 4 */}
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  readOnly
                  value={p.description || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Due Date</label>
                <input
                  type="text"
                  readOnly
                  value={p.due_date || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="p-3">Description</th>
                    <th className="p-3">Expense Category</th>
                    <th className="p-3 text-right">Quantity</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Subtotal</th>
                    <th className="p-3 text-center">Inclusive</th>
                    <th className="p-3 text-right">VAT</th>
                    <th className="p-3 text-right">VAT Zero Rated</th>
                    <th className="p-3 text-right">Non-VAT</th>
                    <th className="p-3 text-right">Withheld</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {(p.items || [
                    {
                      description: p.description || 'PAYMENT',
                      expense_category: p.category || 'General',
                      quantity: 1,
                      cost: p.total || 0,
                      subtotal: p.subtotal || p.total || 0,
                      inclusive: false,
                      vat: p.vat || 0,
                      vat_zero_rated: p.vat_zero_rated || 0,
                      non_vat: p.non_vat || 0,
                      withheld: p.withheld || 0,
                      total: p.total || 0
                    }
                  ]).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{item.description}</td>
                      <td className="p-3 text-slate-600">{item.expense_category}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{parseFloat(item.quantity || 1).toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.cost)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.subtotal)}</td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={Boolean(item.inclusive)}
                          disabled
                          className="rounded border-slate-300 text-blue-600 cursor-not-allowed"
                        />
                      </td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.vat)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.vat_zero_rated)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.non_vat)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatMoney(item.withheld)}</td>
                      <td className="p-3 text-right text-slate-900 font-bold font-mono">{formatMoney(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Grid: Left Comments & Check Number vs Right Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column (8 cols): Comments, CHECK NUMBER, Files */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <label className="block text-slate-700 font-semibold text-xs mb-1">Comments / Notes</label>
                  <textarea
                    rows={4}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Enter approval remarks or reference notes..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xs text-slate-800 font-sans focus:outline-none focus:border-blue-500 shadow-2xs resize-y"
                  />
                </div>

                {/* PROMINENT CHECK NUMBER INPUT FIELD (USER REQUIREMENT) */}
                <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-amber-950 font-bold text-xs">
                      Check Number (Cheque Number) <span className="text-rose-600 font-extrabold">* Required for COO Approval</span>
                    </label>
                    <span className="text-[10px] font-mono uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">
                      Required for Approval
                    </span>
                  </div>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="e.g. CHK-982341 / 000239664"
                    disabled={isApproved}
                    className="w-full bg-white border border-amber-400 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 rounded-lg px-3.5 py-2.5 text-sm font-mono font-bold text-slate-900 shadow-xs"
                  />
                  <p className="text-[11px] text-amber-800">
                    Ito ang Check Number na ibabato sa NKB Developer REST API kasama ang desisyon na CONFIRMED.
                  </p>
                </div>

                {/* Attached Files Section */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold text-xs">Files</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                    {p.files && p.files.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {p.files.map((file, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-md text-slate-700 font-medium shadow-2xs">
                            <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                            <span>{file}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="italic text-slate-400">No attached files provided.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (4 cols): Summary Box */}
              <div className="lg:col-span-4">
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-700 shadow-2xs">
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-900">{formatMoney(p.subtotal || p.total)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span>VAT:</span>
                    <span className="font-mono text-slate-800">{formatMoney(p.vat || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span>VAT Zero Rated:</span>
                    <span className="font-mono text-slate-800">{formatMoney(p.vat_zero_rated || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span>Non-VAT:</span>
                    <span className="font-mono text-slate-800">{formatMoney(p.non_vat || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/70">
                    <span>Withheld:</span>
                    <span className="font-mono text-slate-800">{formatMoney(p.withheld || 0)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-300 font-bold text-slate-900">
                    <span>Total:</span>
                    <span className="font-mono text-sm">{formatMoney(p.total)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm font-extrabold text-slate-950">
                    <span>Amount Due:</span>
                    <span className="font-mono text-base text-blue-700">{formatMoney(p.amount_due || p.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Approve, Reject, Back */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                disabled={submitting || isApproved}
                onClick={() => handleConfirmDecision('CONFIRMED')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Approve'}</span>
              </button>

              <button
                type="button"
                disabled={submitting || isRejected}
                onClick={() => handleConfirmDecision('REJECTED')}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="w-4 h-4" />
                <span>{submitting ? 'Submitting...' : 'Reject'}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-6 py-2.5 bg-slate-500 hover:bg-slate-600 text-white font-bold text-xs rounded-md shadow-xs transition flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: PAYABLE APPROVALS MASTER LIST (MATCHING SCREENSHOT 2)
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / API Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${apiConfig.hasKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">NKB Developer REST API Integration</span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                {apiConfig.hasKey ? 'API Key Configured' : 'Local Sandbox Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Endpoint: <span className="font-mono text-blue-600">http://my.nkbmanufacturing.com/api/v1/payables</span>
              {apiConfig.maskedKey && <span className="ml-2 font-mono text-slate-600">({apiConfig.maskedKey})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>Configure API Key</span>
          </button>
          <button
            onClick={fetchPayables}
            disabled={loading}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payable Approvals</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, verify, and approve company cheque disbursements and invoices
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'PENDING' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'APPROVED' ? 'bg-white text-emerald-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Approved
              </button>
            </div>

            {/* Search Box on Top Right (Matching Screenshot 2) */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPageNum(1);
                }}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Payable Number</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Control Number</th>
                <th className="py-3 px-3">Checked By</th>
                <th className="py-3 px-3">Invoice Number</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-4 text-right">Amount Due</th>
                <th className="py-3 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading payables list...</span>
                  </td>
                </tr>
              ) : paginatedPayables.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span>No payable entries found.</span>
                  </td>
                </tr>
              ) : (
                paginatedPayables.map((item, idx) => {
                  const isApproved = item.status === 'Approved' || item.status === 'CONFIRMED';
                  const isRejected = item.status === 'Rejected' || item.status === 'REJECTED';

                  return (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(item)}
                    >
                      {/* Payable Number - Blue Link as in screenshot */}
                      <td className="py-3.5 px-4 font-bold text-blue-600 hover:text-blue-800 hover:underline">
                        {item.payable_number}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 font-medium">{item.company_code || item.company}</td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono">{item.control_number}</td>
                      <td className="py-3.5 px-3 text-slate-600">{item.checked_by || '—'}</td>
                      <td className="py-3.5 px-3 text-slate-700 font-mono">{item.invoice_number}</td>
                      <td className="py-3.5 px-3 text-slate-800 font-semibold max-w-[200px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">{item.date}</td>
                      <td className="py-3.5 px-3 text-slate-600">{item.due_date}</td>
                      <td className="py-3.5 px-3 text-right font-mono text-slate-800 font-medium">
                        {formatMoney(item.total)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatMoney(item.amount_due || item.total)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' :
                          isRejected ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination matching Screenshot 2 */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-white">
          <div>
            Showing {totalEntries > 0 ? (currentPageNum - 1) * itemsPerPage + 1 : 0} to{' '}
            {Math.min(currentPageNum * itemsPerPage, totalEntries)} of {totalEntries} entries
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPageNum(p => Math.max(p - 1, 1))}
              disabled={currentPageNum === 1}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPageNum(pageNum)}
                className={`w-8 h-8 rounded-md font-bold text-xs transition ${
                  currentPageNum === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPageNum(p => Math.min(p + 1, totalPages))}
              disabled={currentPageNum === totalPages || totalPages === 0}
              className="px-3 py-1.5 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Configure NKB API Key */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">NKB API Key Setup</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  API Key (`x-api-key`)
                </label>
                <input
                  type="text"
                  value={inputApiKey}
                  onChange={(e) => setInputApiKey(e.target.value)}
                  placeholder="e.g. nkb_live_98ab76cd54ef..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Mula sa NKB Developer REST API documentation (OpenAPI: <code>http://my.nkbmanufacturing.com/api/v1/openapi.json</code>).
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Current Status:</p>
                <p>{apiConfig.hasKey ? `Active Key: ${apiConfig.maskedKey}` : 'Walang naka-set na API Key (gumagamit ng Local Cache).'}</p>
                <p className="text-[11px] text-slate-500">API URL: {apiConfig.apiUrl}</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKey}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50"
                >
                  {savingKey ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
