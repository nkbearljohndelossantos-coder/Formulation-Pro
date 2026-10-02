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
  Info,
  HelpCircle,
  Radio,
  ExternalLink,
  Clock,
  Copy,
  Plus,
  Trash2,
  Code2,
  Terminal,
  Layers
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function PayableApprovalsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'detail'
  const [payables, setPayables] = useState([]);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [autoSync, setAutoSync] = useState(true);
  const itemsPerPage = 10;

  // Form state in detail view
  const [checkNumber, setCheckNumber] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // Quick Action Modal state (from table row)
  const [quickActionItem, setQuickActionItem] = useState(null);
  const [quickActionType, setQuickActionType] = useState(null); // 'APPROVE' | 'REJECT'
  const [quickCheckNumber, setQuickCheckNumber] = useState('');
  const [quickNotes, setQuickNotes] = useState('');

  // API Key config modal state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [apiConfig, setApiConfig] = useState({
    hasKey: false,
    maskedKey: null,
    apiUrl: 'http://my.nkbmanufacturing.com/api/v1',
    apiOnline: false,
    apiMessage: ''
  });
  const [inputApiKey, setInputApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Multi-API Key Management State for External WebApps
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);
  const [apiKeysTab, setApiKeysTab] = useState('list'); // 'list' | 'generate' | 'docs'
  const [apiKeysList, setApiKeysList] = useState([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newClientApp, setNewClientApp] = useState('');
  const [newScopes, setNewScopes] = useState('payables:read,payables:create');
  const [customKeyToken, setCustomKeyToken] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [justGeneratedKey, setJustGeneratedKey] = useState(null);
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Fetch registered API keys
  const fetchApiKeysList = async () => {
    try {
      setLoadingApiKeys(true);
      const res = await apiFetch('/api/v1/payables/api-keys');
      const data = await res.json();
      if (data.success && Array.isArray(data.keys)) {
        setApiKeysList(data.keys);
      }
    } catch (err) {
      console.error('Error fetching API keys:', err);
    } finally {
      setLoadingApiKeys(false);
    }
  };

  const handleOpenApiKeysModal = () => {
    setShowApiKeysModal(true);
    setJustGeneratedKey(null);
    fetchApiKeysList();
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim() || !newClientApp.trim()) return;
    try {
      setGeneratingKey(true);
      const res = await apiFetch('/api/v1/payables/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: newKeyName.trim(),
          client_app: newClientApp.trim(),
          scopes: newScopes,
          custom_key: customKeyToken.trim() || undefined
        })
      });
      const data = await res.json();
      if (data.success && data.key) {
        setJustGeneratedKey(data.key);
        setNewKeyName('');
        setNewClientApp('');
        setCustomKeyToken('');
        fetchApiKeysList();
      } else {
        alert(data.message || 'Failed to generate API Key');
      }
    } catch (err) {
      alert(err.message || 'Network error generating key');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleToggleApiKey = async (keyId) => {
    try {
      const res = await apiFetch(`/api/v1/payables/api-keys/${keyId}/toggle`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        fetchApiKeysList();
      } else {
        alert(data.message || 'Failed to toggle API Key status');
      }
    } catch (err) {
      alert(err.message || 'Network error');
    }
  };

  const handleDeleteApiKey = async (keyId, keyName) => {
    if (!window.confirm(`Are you sure you want to delete API key "${keyName}"? The external webapp using this key will immediately lose access.`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/payables/api-keys/${keyId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        fetchApiKeysList();
      } else {
        alert(data.message || 'Failed to delete API Key');
      }
    } catch (err) {
      alert(err.message || 'Network error');
    }
  };

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  // Fetch payables list & config
  const fetchPayables = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      else setLoading(true);
      setError(null);

      const res = await apiFetch(`/api/v1/payables?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPayables(data.data);
        if (isManualSync) {
          setActionSuccessMessage(`Synced successfully from my.nkbmanufacturing.com (${data.source === 'REMOTE_API' ? 'Live API' : 'Local Sandbox'}).`);
          setTimeout(() => setActionSuccessMessage(null), 4000);
        }
      } else {
        setError(data.message || 'Failed to load payables');
      }
    } catch (err) {
      setError(err.message || 'Network error fetching payables');
    } finally {
      setLoading(false);
      setSyncing(false);
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

  // Periodic Auto-Sync (polling every 30 seconds if enabled)
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchPayables();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSync, statusFilter, searchTerm]);

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
        await fetchPayables(true);
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

  // Handle Approval / Rejection from Detail View
  const handleConfirmDecision = async (decision) => {
    if (!selectedPayable) return;

    if (decision === 'CONFIRMED' && !checkNumber.trim()) {
      alert('Please enter the Cheque Number before approving.\nCheque Number is required for approval.');
      return;
    }

    const confirmPrompt = decision === 'CONFIRMED'
      ? `Are you sure you want to APPROVE Payable ${selectedPayable.req_cheque_no || selectedPayable.payable_number} with Cheque Number: ${checkNumber.trim()}?`
      : `Are you sure you want to REJECT Payable ${selectedPayable.req_cheque_no || selectedPayable.payable_number}?`;

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
        setActionSuccessMessage(`Successfully ${decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED'} Payable ${selectedPayable.req_cheque_no || selectedPayable.payable_number}!`);
        setSelectedPayable(prev => ({
          ...prev,
          status: decision === 'CONFIRMED' ? 'Approved' : 'Rejected',
          coo_approval: decision,
          cheque_number: checkNumber.trim()
        }));
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

  // Handle Quick Action from Table
  const handleExecuteQuickAction = async () => {
    if (!quickActionItem) return;
    const decision = quickActionType === 'APPROVE' ? 'CONFIRMED' : 'REJECTED';

    if (decision === 'CONFIRMED' && !quickCheckNumber.trim()) {
      alert('Please enter the Cheque Number for confirmation.');
      return;
    }

    try {
      setSubmitting(true);
      const approverName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'COO';

      const res = await apiFetch(`/api/v1/payables/${quickActionItem.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          cheque_number: quickCheckNumber.trim(),
          notes: quickNotes.trim(),
          confirmed_by: approverName
        })
      });

      const data = await res.json();
      if (data.success) {
        setActionSuccessMessage(`Successfully ${decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED'} ${quickActionItem.req_cheque_no || quickActionItem.payable_number}!`);
        setQuickActionItem(null);
        setQuickCheckNumber('');
        setQuickNotes('');
        fetchPayables();
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(data.message || 'Failed to submit quick decision.');
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
      (p.req_cheque_no || '').toLowerCase().includes(q) ||
      (p.payable_number || '').toLowerCase().includes(q) ||
      (p.payee_beneficiary || '').toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.bank_account || '').toLowerCase().includes(q) ||
      (p.purpose_usage || '').toLowerCase().includes(q) ||
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

  // Webhook URL display helper
  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/v1/payables/webhook`
    : 'https://<your-domain>/api/v1/payables/webhook';

  // =========================================================================
  // VIEW: APPROVING PAYABLE (DETAIL VIEW MATCHING SCREENSHOT 1)
  // =========================================================================
  if (viewMode === 'detail' && selectedPayable) {
    const p = selectedPayable;
    const isApproved = p.coo_approval === 'CONFIRMED' || p.status === 'Approved';
    const isRejected = p.coo_approval === 'REJECTED' || p.status === 'Rejected';

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
              <div>
                <h1 className="text-xl font-bold text-slate-800">Approving Payable</h1>
                <p className="text-xs text-slate-500">
                  Req / Cheque: <span className="font-mono font-bold text-blue-600">{p.req_cheque_no || p.payable_number}</span> | Payee: <span className="font-semibold text-slate-700">{p.payee_beneficiary || p.vendor}</span>
                </p>
              </div>
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
                <label className="block text-blue-600 font-bold mb-1">Payable / Cheque Number</label>
                <input
                  type="text"
                  readOnly
                  value={p.req_cheque_no || p.payable_number || ''}
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
                <label className="block text-slate-600 font-semibold mb-1">Payee / Beneficiary / Vendor</label>
                <input
                  type="text"
                  readOnly
                  value={p.payee_beneficiary || p.vendor || ''}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Bank & Account</label>
                <input
                  type="text"
                  readOnly
                  value={p.bank_account || 'BDO - 00234819234'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-slate-800 font-medium focus:outline-none"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">COO Approval Status</label>
                <input
                  type="text"
                  readOnly
                  value={p.coo_approval || p.status || 'Submitted For Approval'}
                  className={`w-full border rounded-md px-3 py-2 font-bold focus:outline-none ${
                    isApproved ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                    isRejected ? 'bg-rose-50 border-rose-300 text-rose-700' :
                    'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Row 4 */}
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Purpose / Usage / Description</label>
                <input
                  type="text"
                  readOnly
                  value={p.purpose_usage || p.description || ''}
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
                      description: p.purpose_usage || p.description || 'PAYMENT',
                      expense_category: p.category || 'General',
                      quantity: 1,
                      cost: p.amount || p.total || 0,
                      subtotal: p.subtotal || p.amount || p.total || 0,
                      inclusive: false,
                      vat: p.vat || 0,
                      vat_zero_rated: p.vat_zero_rated || 0,
                      non_vat: p.non_vat || 0,
                      withheld: p.withheld || 0,
                      total: p.amount || p.total || 0
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
                    This Cheque Number will be submitted to the NKB Developer REST API (`/payables/:id/confirm`) with the CONFIRMED decision.
                  </p>
                </div>

                {/* Attached Files Section */}
                <div className="space-y-1">
                  <label className="block text-slate-700 font-semibold text-xs">Attachment / Files</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-500">
                    {(p.files && p.files.length > 0) || p.attachment ? (
                      <div className="flex flex-wrap gap-2">
                        {p.attachment && (
                          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-md text-slate-700 font-medium shadow-2xs">
                            <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                            <span>{p.attachment}</span>
                          </div>
                        )}
                        {(p.files || []).filter(f => f !== p.attachment).map((file, fIdx) => (
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
                    <span className="font-mono font-semibold text-slate-900">{formatMoney(p.subtotal || p.amount || p.total)}</span>
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
                    <span className="font-mono text-sm">{formatMoney(p.amount || p.total)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm font-extrabold text-slate-950">
                    <span>Amount Due (₱):</span>
                    <span className="font-mono text-base text-blue-700">{formatMoney(p.amount_due || p.amount || p.total)}</span>
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
  // VIEW: PAYABLE APPROVALS MASTER LIST (EXACT USER SPECIFIED COLUMNS)
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / API Status & How-To Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${apiConfig.hasKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-800">my.nkbmanufacturing.com REST API Connection</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                apiConfig.hasKey ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {apiConfig.hasKey ? 'API Key Active (Sync Ready)' : 'No API Key — Using Local Sandbox'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Endpoint: <span className="font-mono text-blue-600">http://my.nkbmanufacturing.com/api/v1/payables</span>
              {apiConfig.maskedKey && <span className="ml-2 font-mono text-slate-700">({apiConfig.maskedKey})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end md:self-auto">
          {/* How to receive approvals button */}
          <button
            onClick={() => setShowHowToModal(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5 border border-blue-200"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Receive Approvals?</span>
          </button>

          {/* Sync now button */}
          <button
            onClick={() => fetchPayables(true)}
            disabled={syncing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
            title="Fetch latest pending approvals from my.nkbmanufacturing.com"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Manage Multi-API Keys button */}
          <button
            onClick={handleOpenApiKeysModal}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs"
            title="Manage multiple API keys for external webapps"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Manage API Keys</span>
          </button>

          {/* Upstream Master Key Config button */}
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 border border-slate-200"
            title="Configure Primary NKB Master Key"
          >
            <Key className="w-3.5 h-3.5 text-slate-500" />
            <span>Master Key</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payable Approvals</h1>
              {autoSync && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Live Polling (30s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review, verify, and approve company cheque disbursements and payables
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
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
                onClick={() => setStatusFilter('CONFIRMED')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'CONFIRMED' ? 'bg-white text-emerald-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'REJECTED' ? 'bg-white text-rose-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Rejected
              </button>
            </div>

            {/* Search Box */}
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

        {/* Table Content with EXACT 10 COLUMNS REQUESTED */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-3.5 whitespace-nowrap">Req / Cheque No.</th>
                <th className="py-3 px-3 whitespace-nowrap">Date</th>
                <th className="py-3 px-3 whitespace-nowrap">Payee / Beneficiary</th>
                <th className="py-3 px-3 whitespace-nowrap">Category</th>
                <th className="py-3 px-3 whitespace-nowrap">Bank & Account</th>
                <th className="py-3 px-3 min-w-[180px]">Purpose / Usage</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">Amount (₱)</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">Attachment</th>
                <th className="py-3 px-3 text-center whitespace-nowrap">COO Approval</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading payables list...</span>
                  </td>
                </tr>
              ) : paginatedPayables.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span>No payable entries found.</span>
                  </td>
                </tr>
              ) : (
                paginatedPayables.map((item, idx) => {
                  const isApproved = item.coo_approval === 'CONFIRMED' || item.status === 'Approved';
                  const isRejected = item.coo_approval === 'REJECTED' || item.status === 'Rejected';
                  const isPending = !isApproved && !isRejected;

                  return (
                    <tr
                      key={item.id || idx}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* 1. Req / Cheque No. (Blue Clickable Link) */}
                      <td className="py-3 px-3.5 font-bold font-mono text-blue-600 hover:text-blue-800 cursor-pointer hover:underline whitespace-nowrap"
                          onClick={() => handleOpenDetail(item)}>
                        {item.req_cheque_no || item.payable_number || `PB-${item.id}`}
                      </td>

                      {/* 2. Date */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {item.date || item.date_created || item.invoice_date}
                      </td>

                      {/* 3. Payee / Beneficiary */}
                      <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {item.payee_beneficiary || item.vendor || item.company}
                      </td>

                      {/* 4. Category */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          {item.category || 'Accrued expenses'}
                        </span>
                      </td>

                      {/* 5. Bank & Account */}
                      <td className="py-3 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                        {item.bank_account || 'BDO - 00234819234'}
                      </td>

                      {/* 6. Purpose / Usage */}
                      <td className="py-3 px-3 text-slate-800 font-medium max-w-[220px] truncate" title={item.purpose_usage || item.description}>
                        {item.purpose_usage || item.description}
                      </td>

                      {/* 7. Amount (₱) */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ₱{formatMoney(item.amount || item.total || item.amount_due)}
                      </td>

                      {/* 8. Attachment */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.attachment || (item.files && item.files.length > 0) ? (
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded"
                            title="View attachment"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono">—</span>
                        )}
                      </td>

                      {/* 9. COO Approval Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isRejected ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        }`}>
                          {item.coo_approval || item.status || 'PENDING_COO_APPROVAL'}
                        </span>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending ? (
                            <>
                              <button
                                onClick={() => {
                                  setQuickActionItem(item);
                                  setQuickActionType('APPROVE');
                                  setQuickCheckNumber(item.cheque_number || '');
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition shadow-2xs flex items-center gap-1"
                                title="Approve with Check Number"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  setQuickActionItem(item);
                                  setQuickActionType('REJECT');
                                  setQuickCheckNumber('');
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded transition shadow-2xs flex items-center gap-1"
                                title="Reject"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenDetail(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded transition flex items-center gap-1 border border-slate-200"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>View</span>
                            </button>
                          )}
                        </div>
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

      {/* Modal: Quick Approve / Reject from Table */}
      {quickActionItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                {quickActionType === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-slate-900 text-base">
                  {quickActionType === 'APPROVE' ? 'Confirm COO Approval' : 'Reject Cheque Payable'}
                </h3>
              </div>
              <button
                onClick={() => setQuickActionItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p><span className="text-slate-500 font-semibold">Req / Cheque No:</span> <span className="font-mono font-bold text-slate-900">{quickActionItem.req_cheque_no || quickActionItem.payable_number}</span></p>
              <p><span className="text-slate-500 font-semibold">Payee:</span> <span className="font-bold text-slate-900">{quickActionItem.payee_beneficiary || quickActionItem.vendor}</span></p>
              <p><span className="text-slate-500 font-semibold">Amount:</span> <span className="font-mono font-extrabold text-blue-700">₱{formatMoney(quickActionItem.amount || quickActionItem.total)}</span></p>
              <p><span className="text-slate-500 font-semibold">Purpose:</span> <span className="text-slate-800">{quickActionItem.purpose_usage || quickActionItem.description}</span></p>
            </div>

            {quickActionType === 'APPROVE' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Check Number (Cheque Number) <span className="text-rose-600">* Required</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={quickCheckNumber}
                  onChange={(e) => setQuickCheckNumber(e.target.value)}
                  placeholder="e.g. CHK-982341"
                  className="w-full bg-amber-50/50 border border-amber-300 rounded-lg p-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-amber-600 shadow-2xs"
                />
                <p className="text-[11px] text-slate-500">
                  This will be submitted to <code>http://my.nkbmanufacturing.com/api/v1/payables/:id/confirm</code>
                </p>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700">
                Notes / Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Enter remarks..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickActionItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleExecuteQuickAction}
                className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 ${
                  quickActionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Submitting...' : (quickActionType === 'APPROVE' ? 'Confirm Approval' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: How to Receive Approvals Guide */}
      {showHowToModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">How to Receive Approvals from my.nkbmanufacturing.com</h3>
              </div>
              <button
                onClick={() => setShowHowToModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                  Method 1: Using API Key (Recommended — Automatic Pull & Sync)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Our server connects directly to the NKB REST API endpoint:
                </p>
                <div className="bg-white p-2 rounded border border-blue-200 font-mono text-[11px] text-blue-800">
                  GET http://my.nkbmanufacturing.com/api/v1/payables?status=PENDING_COO_APPROVAL
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-600">
                  <li>Click the <strong>"Master Key"</strong> or <strong>"Manage API Keys"</strong> button in the top bar.</li>
                  <li>Ensure your valid <code>x-api-key</code> (e.g. <code>nkb_live_...</code>) is active.</li>
                  <li>Click <strong>"Sync Now"</strong> or keep <strong>Live Polling (30s)</strong> enabled to automatically pull pending cheques requiring approval.</li>
                </ol>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                  Method 2: Using Webhook (Instant Real-Time Push)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  If the system at <code>my.nkbmanufacturing.com</code> supports webhooks, paste this Webhook URL into their webhook settings:
                </p>
                <div className="bg-white p-2 rounded border border-emerald-200 font-mono text-[11px] text-emerald-900 select-all">
                  {webhookUrl}
                </div>
                <p className="text-[11px] text-slate-500">
                  Whenever a new Cheque Payable is created there, it will automatically push to this webhook and appear in your queue instantly.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowHowToModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Multi-API Key Manager */}
      {showApiKeysModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Multi-API Key Manager (External WebApps)</h3>
                  <p className="text-xs text-slate-500">
                    Allow external web applications (e-Commerce, logistics, branch portals) to submit payable requests using multiple <code className="text-blue-600 font-semibold">x-api-key</code> credentials.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeysModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setApiKeysTab('list')}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  apiKeysTab === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Registered WebApp Keys ({apiKeysList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setApiKeysTab('generate')}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  apiKeysTab === 'generate' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>Generate Key for WebApp</span>
              </button>
              <button
                type="button"
                onClick={() => setApiKeysTab('docs')}
                className={`flex-1 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                  apiKeysTab === 'docs' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                <Code2 className="w-4 h-4 text-purple-600" />
                <span>Integration Docs & cURL</span>
              </button>
            </div>

            {/* Notification when a new key was just generated */}
            {justGeneratedKey && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-xs text-emerald-900 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    New API Key Generated for {justGeneratedKey.client_app}!
                  </span>
                  <button
                    onClick={() => setJustGeneratedKey(null)}
                    className="text-emerald-700 hover:text-emerald-900 font-bold"
                  >
                    ×
                  </button>
                </div>
                <p className="text-slate-600">
                  Please copy this key now. Provide it to the web application developer to include in headers as <code className="font-mono text-emerald-800">x-api-key</code>:
                </p>
                <div className="bg-white border border-emerald-300 rounded-lg p-2.5 flex items-center justify-between gap-2 font-mono text-xs text-slate-900">
                  <span className="truncate select-all">{justGeneratedKey.api_key}</span>
                  <button
                    onClick={() => copyToClipboard(justGeneratedKey.api_key, 'newly-created')}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-sans font-semibold text-[11px] shrink-0 flex items-center gap-1 transition"
                  >
                    {copiedKeyId === 'newly-created' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: LIST VIEW */}
            {apiKeysTab === 'list' && (
              <div className="space-y-3">
                {loadingApiKeys ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading registered API keys...
                  </div>
                ) : apiKeysList.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No registered API keys found. Click "Generate Key for WebApp" to create one.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {apiKeysList.map((k) => (
                      <div
                        key={k.id}
                        className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          k.is_active ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-xs">{k.key_name}</span>
                            {k.is_master && (
                              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                                MASTER KEY
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                k.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {k.is_active ? 'ACTIVE' : 'REVOKED'}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>WebApp: <strong className="text-slate-700">{k.client_app}</strong></span>
                            <span>•</span>
                            <span>Scopes: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono text-[10px]">{k.scopes.join(', ')}</code></span>
                            {k.last_used_at && (
                              <>
                                <span>•</span>
                                <span>Last used: {new Date(k.last_used_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono text-xs text-slate-600 pt-0.5">
                            <code className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800 select-all text-[11px]">
                              {k.api_key}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(k.api_key, k.id)}
                              className="text-slate-500 hover:text-blue-600 p-1 rounded hover:bg-slate-100 transition"
                              title="Copy API Key"
                            >
                              {copiedKeyId === k.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {copiedKeyId === k.id && (
                              <span className="text-[10px] text-emerald-600 font-sans font-bold">Copied!</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleToggleApiKey(k.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                              k.is_active
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                            title={k.is_active ? 'Revoke / Disable this key' : 'Activate this key'}
                          >
                            {k.is_active ? 'Revoke Key' : 'Activate Key'}
                          </button>

                          {!k.is_master && (
                            <button
                              type="button"
                              onClick={() => handleDeleteApiKey(k.id, k.key_name)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete API Key"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GENERATE NEW KEY */}
            {apiKeysTab === 'generate' && (
              <form onSubmit={handleCreateApiKey} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Key Name / Purpose *
                    </label>
                    <input
                      type="text"
                      required
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Shopify Storefront, Branch Cebu App"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Client WebApp Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      value={newClientApp}
                      onChange={(e) => setNewClientApp(e.target.value)}
                      placeholder="e.g. Shopify US Store, Logistics WebApp"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Permissions / Scopes
                  </label>
                  <select
                    value={newScopes}
                    onChange={(e) => setNewScopes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  >
                    <option value="payables:read,payables:create">Read & Create Payables (Recommended for WebApps)</option>
                    <option value="payables:create">Create Only (Submit Payable Requests)</option>
                    <option value="payables:read">Read Only (Status Check Only)</option>
                    <option value="payables:read,payables:create,payables:confirm">Full Access (Read, Create, Confirm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Custom Key Token (Optional)
                  </label>
                  <input
                    type="text"
                    value={customKeyToken}
                    onChange={(e) => setCustomKeyToken(e.target.value)}
                    placeholder="Leave blank to auto-generate secure nkb_live_... token"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    If left blank, the system will automatically generate a secure token (e.g. <code>nkb_live_32hex...</code>).
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setApiKeysTab('list')}
                    className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingKey || !newKeyName.trim() || !newClientApp.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{generatingKey ? 'Generating...' : 'Generate New API Key'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: INTEGRATION DOCS & CURL */}
            {apiKeysTab === 'docs' && (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl space-y-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-sans font-bold text-xs text-white flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      1. Submitting a Payable Request from External WebApp (cURL)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `curl -X POST "${window.location.origin}/api/v1/payables" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payee_name": "ABC Chemical Supplies",
    "amount": 45000.00,
    "category": "Raw Materials",
    "bank_name": "BDO - 0080-5801-0547",
    "purpose": "Batch solvent materials for Perfume Production",
    "invoice_number": "INV-2026-8801",
    "due_date": "${new Date().toISOString().slice(0, 10)}"
  }'`;
                        copyToClipboard(snippet, 'curl-snippet');
                      }}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-sans text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKeyId === 'curl-snippet' ? 'Copied!' : 'Copy cURL'}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-emerald-400 leading-relaxed">
{`curl -X POST "${window.location.origin}/api/v1/payables" \\
  -H "x-api-key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payee_name": "ABC Chemical Supplies",
    "amount": 45000.00,
    "category": "Raw Materials",
    "bank_name": "BDO - 0080-5801-0547",
    "purpose": "Batch solvent materials for Perfume Production",
    "invoice_number": "INV-2026-8801",
    "due_date": "${new Date().toISOString().slice(0, 10)}"
  }'`}
                  </pre>
                </div>

                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl space-y-3 font-mono text-[11px]">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span className="font-sans font-bold text-xs text-white flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-blue-400" />
                      2. JavaScript / Node.js (fetch)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `const response = await fetch("${window.location.origin}/api/v1/payables", {
  method: "POST",
  headers: {
    "x-api-key": "YOUR_API_KEY_HERE",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    payee_name: "ABC Chemical Supplies",
    amount: 45000.00,
    category: "Raw Materials",
    purpose: "Batch solvent materials",
    invoice_number: "INV-2026-8801"
  })
});
const result = await response.json();
console.log("Payable submitted:", result);`;
                        copyToClipboard(snippet, 'js-snippet');
                      }}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-sans text-xs"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedKeyId === 'js-snippet' ? 'Copied!' : 'Copy JS'}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-blue-300 leading-relaxed">
{`const response = await fetch("${window.location.origin}/api/v1/payables", {
  method: "POST",
  headers: {
    "x-api-key": "YOUR_API_KEY_HERE",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    payee_name: "ABC Chemical Supplies",
    amount: 45000.00,
    category: "Raw Materials",
    purpose: "Batch solvent materials",
    invoice_number: "INV-2026-8801"
  })
});
const result = await response.json();
console.log("Payable submitted:", result);`}
                  </pre>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-600">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Automatic COO Queue & Upstream Sync
                  </p>
                  <p>
                    Every successful request submitted by an external web application will automatically:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pl-2 text-slate-600">
                    <li>Enter the COO Payable Approvals Queue on this dashboard with status <code className="text-amber-700 font-bold">PENDING_COO_APPROVAL</code>.</li>
                    <li>Synchronize upstream to <code className="text-blue-600 font-semibold">my.nkbmanufacturing.com</code> using the master connection key.</li>
                    <li>Allow the external web application to verify approval status via <code className="font-mono">GET /api/v1/payables?search=&lt;invoice_number&gt;</code> using their <code className="font-mono">x-api-key</code>.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowApiKeysModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

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
                  From NKB Developer REST API documentation (OpenAPI: <code>http://my.nkbmanufacturing.com/api/v1/openapi.json</code>).
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Current Status:</p>
                <p>{apiConfig.hasKey ? `Active Key: ${apiConfig.maskedKey}` : 'No API Key configured (using local cache).'}</p>
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
