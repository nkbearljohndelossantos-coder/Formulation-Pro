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
  ChevronDown,
  ChevronUp,
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
  Layers,
  Edit3,
  Save,
  Filter,
  X,
  CreditCard,
  Hash,
  Maximize2,
  Minimize2,
  Receipt
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
  const [portalFilter, setPortalFilter] = useState('ALL'); // 'ALL' | 'my.nkbmanufacturing.com' | 'pc.nkbmanufacturing.com'
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [autoSync, setAutoSync] = useState(true);
  const itemsPerPage = 10;

  // Nested Row / Child Row expansion state
  const [expandedRows, setExpandedRows] = useState({});

  // Date filter states: Date Cheque Issued & Date Prepared
  const [showDateFilterBar, setShowDateFilterBar] = useState(false);
  const [dateChequeFrom, setDateChequeFrom] = useState('');
  const [dateChequeTo, setDateChequeTo] = useState('');
  const [datePreparedFrom, setDatePreparedFrom] = useState('');
  const [datePreparedTo, setDatePreparedTo] = useState('');

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

  // Portal Configuration state for editing
  const [configPortalTab, setConfigPortalTab] = useState('my'); // 'my' | 'pc'
  const [myApiKeyInput, setMyApiKeyInput] = useState('');
  const [myApiUrlInput, setMyApiUrlInput] = useState('http://my.nkbmanufacturing.com/api/v1');
  const [pcApiKeyInput, setPcApiKeyInput] = useState('');
  const [pcApiUrlInput, setPcApiUrlInput] = useState('http://pc.nkbmanufacturing.com/api/v1');

  // Editing existing API key state in Multi-API Key Manager
  const [editingKeyItem, setEditingKeyItem] = useState(null);
  const [editKeyName, setEditKeyName] = useState('');
  const [editClientApp, setEditClientApp] = useState('');
  const [editKeyToken, setEditKeyToken] = useState('');
  const [editScopes, setEditScopes] = useState('payables:read,payables:create');
  const [savingEditKey, setSavingEditKey] = useState(false);

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

      const portalParam = portalFilter !== 'ALL' ? `&portal=${encodeURIComponent(portalFilter)}` : '';
      const chkFrom = dateChequeFrom ? `&date_cheque_from=${encodeURIComponent(dateChequeFrom)}` : '';
      const chkTo = dateChequeTo ? `&date_cheque_to=${encodeURIComponent(dateChequeTo)}` : '';
      const prepFrom = datePreparedFrom ? `&date_prepared_from=${encodeURIComponent(datePreparedFrom)}` : '';
      const prepTo = datePreparedTo ? `&date_prepared_to=${encodeURIComponent(datePreparedTo)}` : '';
      const res = await apiFetch(`/api/v1/payables?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}${portalParam}${chkFrom}${chkTo}${prepFrom}${prepTo}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPayables(data.data);
        if (isManualSync) {
          setActionSuccessMessage(`Synced successfully from both my.nkb and pc.nkb portals (${data.source === 'REMOTE_API' ? 'Live API' : 'Cached/Local Records'}).`);
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
      if (res && res.ok) {
        const data = await res.json();
        if (data.success) {
          setApiConfig(data);
          if (data.portals?.my?.apiKey) setMyApiKeyInput(data.portals.my.apiKey);
          if (data.portals?.my?.apiUrl) setMyApiUrlInput(data.portals.my.apiUrl);
          if (data.portals?.pc?.apiKey) setPcApiKeyInput(data.portals.pc.apiKey);
          if (data.portals?.pc?.apiUrl) setPcApiUrlInput(data.portals.pc.apiUrl);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPayables();
    fetchConfig();
  }, [statusFilter, portalFilter, dateChequeFrom, dateChequeTo, datePreparedFrom, datePreparedTo]);

  // Periodic Auto-Sync (polling every 30 seconds if enabled)
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchPayables();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSync, statusFilter, portalFilter, searchTerm, dateChequeFrom, dateChequeTo, datePreparedFrom, datePreparedTo]);

  // Handle save Portal API keys & URLs
  const handleSaveApiKey = async (e) => {
    e.preventDefault();
    try {
      setSavingKey(true);
      const res = await apiFetch('/api/v1/payables/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          my_api_key: myApiKeyInput.trim(),
          my_api_url: myApiUrlInput.trim(),
          pc_api_key: pcApiKeyInput.trim(),
          pc_api_url: pcApiUrlInput.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowConfigModal(false);
        setActionSuccessMessage('Portal API keys and configurations updated successfully!');
        await fetchConfig();
        await fetchPayables(true);
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(data.message || 'Failed to update API configurations');
      }
    } catch (err) {
      alert(err.message || 'Network error updating API configurations');
    } finally {
      setSavingKey(false);
    }
  };

  // Handlers for Editing registered API keys
  const handleStartEditApiKey = (k) => {
    setEditingKeyItem(k);
    setEditKeyName(k.key_name || '');
    setEditClientApp(k.client_app || '');
    setEditKeyToken(k.api_key || '');
    setEditScopes(Array.isArray(k.scopes) ? k.scopes.join(',') : (k.scopes || 'payables:read,payables:create'));
  };

  const handleSaveEditedApiKey = async (e) => {
    e.preventDefault();
    if (!editingKeyItem || !editKeyName.trim() || !editClientApp.trim() || !editKeyToken.trim()) return;
    try {
      setSavingEditKey(true);
      const res = await apiFetch(`/api/v1/payables/api-keys/${editingKeyItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key_name: editKeyName.trim(),
          client_app: editClientApp.trim(),
          api_key: editKeyToken.trim(),
          scopes: editScopes
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingKeyItem(null);
        await fetchApiKeysList();
        await fetchConfig();
        setActionSuccessMessage(`API Key "${editKeyName}" successfully updated.`);
        setTimeout(() => setActionSuccessMessage(null), 4000);
      } else {
        alert(data.message || 'Failed to update API key');
      }
    } catch (err) {
      alert(err.message || 'Network error updating API key');
    } finally {
      setSavingEditKey(false);
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

  // Toggle row expansion for child/nested records
  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const expandAllRows = () => {
    const next = {};
    filteredPayables.forEach(item => {
      const key = item.id || item.req_cheque_no || item.payable_number;
      next[key] = true;
    });
    setExpandedRows(next);
  };

  const collapseAllRows = () => {
    setExpandedRows({});
  };

  const clearDateFilters = () => {
    setDateChequeFrom('');
    setDateChequeTo('');
    setDatePreparedFrom('');
    setDatePreparedTo('');
    setCurrentPageNum(1);
  };

  const applyDatePreset = (preset) => {
    const today = new Date();
    const formatIso = (d) => d.toISOString().slice(0, 10);

    if (preset === 'today') {
      const t = formatIso(today);
      setDatePreparedFrom(t);
      setDatePreparedTo(t);
    } else if (preset === 'last7') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      setDatePreparedFrom(formatIso(past));
      setDatePreparedTo(formatIso(today));
    } else if (preset === 'thisMonth') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      setDatePreparedFrom(formatIso(start));
      setDatePreparedTo(formatIso(today));
    }
    setCurrentPageNum(1);
  };

  const activeDateFilterCount = (dateChequeFrom ? 1 : 0) + (dateChequeTo ? 1 : 0) + (datePreparedFrom ? 1 : 0) + (datePreparedTo ? 1 : 0);

  // Search, portal, status, and date filters
  const filteredPayables = useMemo(() => {
    let list = payables;
    if (portalFilter !== 'ALL') {
      list = list.filter(p => (p.source_portal || '').toLowerCase().includes(portalFilter.toLowerCase()));
    }
    if (statusFilter !== 'ALL') {
      const s = statusFilter.toUpperCase();
      list = list.filter(p =>
        (p.coo_approval || '').toUpperCase().includes(s) ||
        (p.status || '').toUpperCase().includes(s)
      );
    }
    if (dateChequeFrom) {
      list = list.filter(p => {
        const d = (p.date_cheque_issued || p.cheque_date || p.date || '').slice(0, 10);
        return d && d >= dateChequeFrom;
      });
    }
    if (dateChequeTo) {
      list = list.filter(p => {
        const d = (p.date_cheque_issued || p.cheque_date || p.date || '').slice(0, 10);
        return d && d <= dateChequeTo;
      });
    }
    if (datePreparedFrom) {
      list = list.filter(p => {
        const d = (p.date_prepared || p.date_created || p.date || '').slice(0, 10);
        return d && d >= datePreparedFrom;
      });
    }
    if (datePreparedTo) {
      list = list.filter(p => {
        const d = (p.date_prepared || p.date_created || p.date || '').slice(0, 10);
        return d && d <= datePreparedTo;
      });
    }
    if (!searchTerm.trim()) return list;
    const q = searchTerm.trim().toLowerCase();
    return list.filter(p =>
      (p.req_cheque_no || '').toLowerCase().includes(q) ||
      (p.payable_number || '').toLowerCase().includes(q) ||
      (p.cheque_number || '').toLowerCase().includes(q) ||
      (p.payee_beneficiary || '').toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.bank_account || '').toLowerCase().includes(q) ||
      (p.purpose_usage || '').toLowerCase().includes(q) ||
      (p.control_number || '').toLowerCase().includes(q) ||
      (p.invoice_number || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.vendor || '').toLowerCase().includes(q) ||
      (p.source_portal || '').toLowerCase().includes(q)
    );
  }, [payables, searchTerm, portalFilter, statusFilter, dateChequeFrom, dateChequeTo, datePreparedFrom, datePreparedTo]);

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
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800">Approving Payable</h1>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold border ${
                      (p.source_portal || '').includes('pc.nkb')
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}
                  >
                    {(p.source_portal || '').includes('pc.nkb') ? 'pc.nkb (Petty Cash)' : 'my.nkb (Main)'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Req / Cheque: <span className="font-mono font-bold text-blue-600">{p.req_cheque_no || p.payable_number}</span> | Payee: <span className="font-semibold text-slate-700">{p.payee_beneficiary || p.vendor}</span> | Portal: <span className="font-mono text-slate-600">{p.source_portal || 'my.nkbmanufacturing.com'}</span>
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
      {/* Top Banner: Dual NKB REST API Connections */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Card 1: my.nkbmanufacturing.com */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse shrink-0"></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800">my.nkbmanufacturing.com</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">Main Portal</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Key: <span className="font-semibold text-slate-700">nkb_live_317a...dfb6</span>
              </p>
            </div>
          </div>

          {/* Card 2: pc.nkbmanufacturing.com */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3">
            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse shrink-0"></div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-slate-800">pc.nkbmanufacturing.com</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">Petty Cash</span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Key: <span className="font-semibold text-slate-700">nkb_live_f1d0...a2f</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-end xl:self-auto">
          {/* How to receive approvals button */}
          <button
            onClick={() => setShowHowToModal(true)}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition flex items-center gap-1.5 border border-blue-200"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>How to Connect?</span>
          </button>

          {/* Sync now button */}
          <button
            onClick={() => fetchPayables(true)}
            disabled={syncing}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
            title="Fetch latest pending approvals from both portals"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Both Portals'}</span>
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
            <span>Connection Keys</span>
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

          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Portal Source Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => { setPortalFilter('ALL'); setCurrentPageNum(1); }}
                className={`px-2.5 py-1.5 rounded-md transition ${portalFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                All Portals
              </button>
              <button
                onClick={() => { setPortalFilter('my.nkbmanufacturing.com'); setCurrentPageNum(1); }}
                className={`px-2.5 py-1.5 rounded-md transition ${portalFilter === 'my.nkbmanufacturing.com' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                my.nkb
              </button>
              <button
                onClick={() => { setPortalFilter('pc.nkbmanufacturing.com'); setCurrentPageNum(1); }}
                className={`px-2.5 py-1.5 rounded-md transition ${portalFilter === 'pc.nkbmanufacturing.com' ? 'bg-white text-purple-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                pc.nkb
              </button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-600">
              <button
                onClick={() => { setStatusFilter('ALL'); setCurrentPageNum(1); }}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                All
              </button>
              <button
                onClick={() => { setStatusFilter('PENDING'); setCurrentPageNum(1); }}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'PENDING' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Pending
              </button>
              <button
                onClick={() => { setStatusFilter('CONFIRMED'); setCurrentPageNum(1); }}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'CONFIRMED' ? 'bg-white text-emerald-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Approved
              </button>
              <button
                onClick={() => { setStatusFilter('REJECTED'); setCurrentPageNum(1); }}
                className={`px-3 py-1.5 rounded-md transition ${statusFilter === 'REJECTED' ? 'bg-white text-rose-600 shadow-2xs font-bold' : 'hover:text-slate-900'}`}
              >
                Rejected
              </button>
            </div>

            {/* Date Filters Toggle Button */}
            <button
              onClick={() => setShowDateFilterBar(prev => !prev)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 border ${
                showDateFilterBar || activeDateFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-300 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
              title="Filter by Date Cheque Issued or Date Prepared"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Date Filters</span>
              {activeDateFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeDateFilterCount}
                </span>
              )}
            </button>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search payables, req #, payee..."
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

        {/* Expandable Advanced Date Filters & Nested Row Controls Bar */}
        {(showDateFilterBar || activeDateFilterCount > 0) && (
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex flex-col gap-3">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              {/* Date Filters Inputs */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {/* 1. Date Cheque Issued */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5 px-2.5 shadow-2xs">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">Date Cheque Issued:</span>
                  <input
                    type="date"
                    value={dateChequeFrom}
                    onChange={(e) => { setDateChequeFrom(e.target.value); setCurrentPageNum(1); }}
                    className="text-[11px] font-mono border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500"
                    title="Date Cheque Issued From"
                  />
                  <span className="text-slate-400 text-[10px]">to</span>
                  <input
                    type="date"
                    value={dateChequeTo}
                    onChange={(e) => { setDateChequeTo(e.target.value); setCurrentPageNum(1); }}
                    className="text-[11px] font-mono border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500"
                    title="Date Cheque Issued To"
                  />
                  {(dateChequeFrom || dateChequeTo) && (
                    <button
                      onClick={() => { setDateChequeFrom(''); setDateChequeTo(''); setCurrentPageNum(1); }}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Clear Cheque Date filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* 2. Date Prepared */}
                <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-1.5 px-2.5 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-700 text-[11px] whitespace-nowrap">Date Prepared:</span>
                  <input
                    type="date"
                    value={datePreparedFrom}
                    onChange={(e) => { setDatePreparedFrom(e.target.value); setCurrentPageNum(1); }}
                    className="text-[11px] font-mono border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500"
                    title="Date Prepared From"
                  />
                  <span className="text-slate-400 text-[10px]">to</span>
                  <input
                    type="date"
                    value={datePreparedTo}
                    onChange={(e) => { setDatePreparedTo(e.target.value); setCurrentPageNum(1); }}
                    className="text-[11px] font-mono border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-blue-500"
                    title="Date Prepared To"
                  />
                  {(datePreparedFrom || datePreparedTo) && (
                    <button
                      onClick={() => { setDatePreparedFrom(''); setDatePreparedTo(''); setCurrentPageNum(1); }}
                      className="text-slate-400 hover:text-slate-700 p-0.5"
                      title="Clear Date Prepared filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Quick Date Presets */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => applyDatePreset('today')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => applyDatePreset('last7')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => applyDatePreset('thisMonth')}
                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                  >
                    This Month
                  </button>
                  {activeDateFilterCount > 0 && (
                    <button
                      onClick={clearDateFilters}
                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset Dates</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Nested View Actions: Expand All / Collapse All */}
              <div className="flex items-center gap-2 self-end xl:self-auto">
                <button
                  onClick={expandAllRows}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 font-semibold text-[11px] rounded border border-blue-200 transition flex items-center gap-1 shadow-2xs"
                  title="Expand all child rows to view line item breakdowns"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Expand All Rows</span>
                </button>
                <button
                  onClick={collapseAllRows}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] rounded border border-slate-200 transition flex items-center gap-1 shadow-2xs"
                  title="Collapse all child rows"
                >
                  <Minimize2 className="w-3 h-3" />
                  <span>Collapse All</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Table Content with 12 COLUMNS (Includes Expand Toggle, Date Prepared, Date Cheque Issued) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-2 text-center w-10 whitespace-nowrap">
                  <button
                    onClick={() => {
                      const hasAny = Object.values(expandedRows).some(Boolean);
                      if (hasAny) collapseAllRows();
                      else expandAllRows();
                    }}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition"
                    title="Toggle all child / nested rows"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="py-3 px-3.5 whitespace-nowrap">Req / Cheque No.</th>
                <th className="py-3 px-3 whitespace-nowrap">Date Prepared</th>
                <th className="py-3 px-3 whitespace-nowrap">Date Cheque Issued</th>
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
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>Loading payables list...</span>
                  </td>
                </tr>
              ) : paginatedPayables.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span>No payable entries found.</span>
                  </td>
                </tr>
              ) : (
                paginatedPayables.map((item, idx) => {
                  const itemKey = item.id || item.req_cheque_no || item.payable_number || idx;
                  const isExpanded = Boolean(expandedRows[itemKey]);
                  const isApproved = item.coo_approval === 'CONFIRMED' || item.status === 'Approved';
                  const isRejected = item.coo_approval === 'REJECTED' || item.status === 'Rejected';
                  const isPending = !isApproved && !isRejected;

                  return (
                    <React.Fragment key={itemKey}>
                      {/* PARENT ROW */}
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors group ${isExpanded ? 'bg-blue-50/20' : ''}`}
                      >
                        {/* 0. Expand / Collapse Trigger */}
                        <td className="py-3 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleRow(itemKey)}
                            className={`p-1 rounded-md transition-colors ${
                              isExpanded ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                            }`}
                            title={isExpanded ? 'Collapse child records' : 'Expand child records & line items'}
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`} />
                          </button>
                        </td>

                        {/* 1. Req / Cheque No. (Blue Clickable Link with Portal Badge + Child Items Badge) */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                (item.source_portal || '').includes('pc.nkb')
                                  ? 'bg-purple-100 text-purple-700 border-purple-200'
                                  : 'bg-blue-100 text-blue-700 border-blue-200'
                              }`}
                              title={`Submitted via ${item.source_portal || 'my.nkbmanufacturing.com'}`}
                            >
                              {(item.source_portal || '').includes('pc.nkb') ? 'pc.nkb' : 'my.nkb'}
                            </span>
                            <span
                              className="font-bold font-mono text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                              onClick={() => handleOpenDetail(item)}
                            >
                              {item.req_cheque_no || item.payable_number || `PB-${item.id}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRow(itemKey)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 transition"
                              title="Click to view child line items"
                            >
                              {item.items?.length || 1} {item.items?.length === 1 ? 'item' : 'items'}
                            </button>
                          </div>
                        </td>

                        {/* 2. Date Prepared */}
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{item.date_prepared || item.date_created || item.date}</span>
                          </div>
                        </td>

                        {/* 3. Date Cheque Issued */}
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                          {item.date_cheque_issued || item.cheque_date ? (
                            <span className="inline-flex items-center gap-1 text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                              <CreditCard className="w-3 h-3 text-blue-500" />
                              <span>{item.date_cheque_issued || item.cheque_date}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* 4. Payee / Beneficiary */}
                        <td className="py-3 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {item.payee_beneficiary || item.vendor || item.company}
                        </td>

                        {/* 5. Category */}
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                            {item.category || 'Accrued expenses'}
                          </span>
                        </td>

                        {/* 6. Bank & Account */}
                        <td className="py-3 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                          {item.bank_account || 'BDO - 00234819234'}
                        </td>

                        {/* 7. Purpose / Usage */}
                        <td className="py-3 px-3 text-slate-800 font-medium max-w-[220px] truncate" title={item.purpose_usage || item.description}>
                          {item.purpose_usage || item.description}
                        </td>

                        {/* 8. Amount (₱) */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₱{formatMoney(item.amount || item.total || item.amount_due)}
                        </td>

                        {/* 9. Attachment */}
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

                        {/* 10. COO Approval Status */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            isRejected ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                            'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                          }`}>
                            {item.coo_approval || item.status || 'PENDING_COO_APPROVAL'}
                          </span>
                        </td>

                        {/* 11. Actions */}
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

                      {/* NESTED CHILD ROW (EXPANDED) */}
                      {isExpanded && (
                        <tr
                          key={`${itemKey}-child`}
                          className="bg-gradient-to-r from-slate-50/90 via-blue-50/20 to-slate-50/90 border-b-2 border-slate-300 transition-all"
                        >
                          <td colSpan={12} className="p-0">
                            <div className="p-4 sm:p-5 pl-8 sm:pl-12 border-l-4 border-l-blue-600 space-y-4">
                              {/* Header of Nested Child Row */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="font-bold text-slate-900 text-xs tracking-tight">
                                    Child Records & Item Breakdown
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {item.req_cheque_no || item.payable_number}
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                      (item.source_portal || '').includes('pc.nkb')
                                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                                        : 'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}
                                  >
                                    {(item.source_portal || '').includes('pc.nkb') ? 'pc.nkb (Petty Cash)' : 'my.nkb (Main Portal)'}
                                  </span>
                                  {item.invoice_number && (
                                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                      Invoice: {item.invoice_number}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-slate-500">
                                    Total Items: <strong className="font-mono text-slate-800">{item.items?.length || 1}</strong>
                                  </span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-500">
                                    Net Amount Due: <strong className="font-mono text-blue-700 text-sm">₱{formatMoney(item.amount_due || item.amount || item.total)}</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Sub-table: Itemized Breakdown */}
                              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
                                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                  <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                                    Itemized Line Records ({item.items?.length || 1} {item.items?.length === 1 ? 'item' : 'items'})
                                  </span>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                                        <th className="py-2 px-3 w-10 text-center">#</th>
                                        <th className="py-2 px-3">Description / Item Particulars</th>
                                        <th className="py-2 px-3">Expense Category</th>
                                        <th className="py-2 px-3 text-right">Qty</th>
                                        <th className="py-2 px-3 text-right">Unit Cost (₱)</th>
                                        <th className="py-2 px-3 text-right">Subtotal (₱)</th>
                                        <th className="py-2 px-3 text-right">Tax / VAT (₱)</th>
                                        <th className="py-2 px-3 text-right">Total (₱)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {(item.items || []).map((subItem, sIdx) => (
                                        <tr key={sIdx} className="hover:bg-slate-50/70 transition-colors">
                                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{sIdx + 1}</td>
                                          <td className="py-2.5 px-3 font-semibold text-slate-800">{subItem.description || item.purpose_usage || 'Standard Disbursement Item'}</td>
                                          <td className="py-2.5 px-3 text-slate-600">
                                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                                              {subItem.expense_category || item.category || 'Disbursement'}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">{subItem.quantity || 1}</td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">₱{formatMoney(subItem.cost || subItem.subtotal || item.amount)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">₱{formatMoney(subItem.subtotal || subItem.total || item.amount)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">₱{formatMoney(subItem.vat || 0)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">₱{formatMoney(subItem.total || subItem.subtotal || item.amount)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200 text-xs">
                                        <td colSpan={5} className="py-2.5 px-3 text-right">Summary Total:</td>
                                        <td className="py-2.5 px-3 text-right font-mono">₱{formatMoney(item.amount || item.total)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">₱{formatMoney(item.vat || 0)}</td>
                                        <td className="py-2.5 px-3 text-right font-mono text-blue-700 font-extrabold text-sm">₱{formatMoney(item.amount_due || item.amount || item.total)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>

                              {/* 3 Associated Cards */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                {/* Card 1: Cheque Issuance Record */}
                                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-2 border-b border-slate-100">
                                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Cheque Issuance Record</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Cheque Number:</span>
                                    <span className="font-mono font-bold text-slate-900">{item.cheque_number || 'Pending Issuance'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Date Cheque Issued:</span>
                                    <span className="font-mono font-semibold text-blue-700">{item.date_cheque_issued || item.cheque_date || '—'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Bank & Account:</span>
                                    <span className="font-mono text-slate-700 truncate max-w-[150px]">{item.bank_account || 'BDO'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Disbursed To:</span>
                                    <span className="font-medium text-slate-800 truncate max-w-[150px]">{item.payee_beneficiary || item.vendor}</span>
                                  </div>
                                </div>

                                {/* Card 2: Preparation & Voucher Control */}
                                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-2 border-b border-slate-100">
                                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Preparation & Control Record</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Date Prepared:</span>
                                    <span className="font-mono font-semibold text-indigo-700">{item.date_prepared || item.date_created || item.date || '—'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Prepared By:</span>
                                    <span className="font-semibold text-slate-800">{item.prepared_by || item.created_by || 'Finance'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Control No:</span>
                                    <span className="font-mono text-slate-700">{item.control_number || 'None'}</span>
                                  </div>
                                  <div className="flex justify-between py-0.5 text-slate-600">
                                    <span>Invoice Reference:</span>
                                    <span className="font-mono text-slate-700">{item.invoice_number ? `${item.invoice_number} (${item.invoice_date || 'N/A'})` : 'N/A'}</span>
                                  </div>
                                </div>

                                {/* Card 3: COO Approval Status & Actions */}
                                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 shadow-2xs flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-800 pb-2 border-b border-slate-100">
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>COO Approval Trail</span>
                                    </div>
                                    <div className="flex justify-between py-0.5 text-slate-600">
                                      <span>Approval Status:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        isApproved ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                        isRejected ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                        'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                      }`}>
                                        {item.coo_approval || item.status || 'PENDING_COO_APPROVAL'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 pt-1">
                                      <span className="font-medium text-slate-600">Remarks: </span>
                                      <span className="italic">{item.comments || item.purpose_usage || 'No additional remarks'}</span>
                                    </div>
                                  </div>

                                  <div className="pt-2 flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenDetail(item)}
                                      className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] rounded transition flex items-center justify-center gap-1 border border-blue-200"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Open Full Voucher</span>
                                    </button>
                                    {isPending && (
                                      <button
                                        onClick={() => {
                                          setQuickActionItem(item);
                                          setQuickActionType('APPROVE');
                                          setQuickCheckNumber(item.cheque_number || '');
                                        }}
                                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded transition flex items-center gap-1 shadow-2xs"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Approve</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">How to Receive Approvals from NKB Portals</h3>
              </div>
              <button
                onClick={() => setShowHowToModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              {/* Dual Portal Connection Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Dual Portal Active API Keys
                </h4>
                <p className="text-slate-600">
                  Both NKB system portals are pre-configured, authenticated, and accepted simultaneously:
                </p>
                <div className="space-y-2">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <strong className="text-blue-900">1. my.nkbmanufacturing.com (Main Portal)</strong>
                      <span className="text-[10px] bg-blue-200 text-blue-800 font-bold px-1.5 py-0.2 rounded">ACTIVE</span>
                    </div>
                    <p className="font-mono text-[11px] text-blue-800 mt-1 select-all break-all">
                      nkb_live_317afeed3bd23218969a04d4abecdfb6
                    </p>
                  </div>

                  <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <strong className="text-purple-900">2. pc.nkbmanufacturing.com (Petty Cash Portal)</strong>
                      <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-1.5 py-0.2 rounded">ACTIVE</span>
                    </div>
                    <p className="font-mono text-[11px] text-purple-800 mt-1 select-all break-all">
                      nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f
                    </p>
                  </div>
                </div>
              </div>

              {/* Method 1: Polling / Sync */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px]">1</span>
                  Automatic Pull & Sync (Live Polling)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Our server concurrently queries both portals every 30 seconds:
                </p>
                <div className="space-y-1 font-mono text-[10px]">
                  <div className="bg-white p-1.5 rounded border border-blue-200 text-blue-800">
                    GET http://my.nkbmanufacturing.com/api/v1/payables?status=PENDING_COO_APPROVAL
                  </div>
                  <div className="bg-white p-1.5 rounded border border-purple-200 text-purple-800">
                    GET http://pc.nkbmanufacturing.com/api/v1/payables?status=PENDING_COO_APPROVAL
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Any new cheques created in either system automatically appear in this dashboard with their respective source portal tag.
                </p>
              </div>

              {/* Method 2: Webhooks */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px]">2</span>
                  Real-Time Push Webhook
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  External webapps and portals can push new payable requests directly into this webhook endpoint:
                </p>
                <div className="bg-white p-2 rounded border border-emerald-200 font-mono text-[11px] text-emerald-900 select-all">
                  {webhookUrl}
                </div>
                <p className="text-[11px] text-slate-500">
                  Include either portal's API key in the <code className="font-mono">x-api-key</code> request header.
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
                            onClick={() => handleStartEditApiKey(k)}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-slate-200"
                            title="Edit or replace this API Key"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

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

      {/* Modal: Configure NKB Portals API Keys & Endpoints (Dual Portal Simultaneous View) */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Key className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Dual Portal API Connections</h3>
                  <p className="text-xs text-slate-500">Both API keys are active together &mdash; view and configure both portals simultaneously</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              {/* SECTION 1: my.nkbmanufacturing.com (Main Portal) */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider">
                      1. my.nkbmanufacturing.com (Main ERP Portal)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Active Portal
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      my.nkb API Key (`x-api-key`)
                    </label>
                    <input
                      type="text"
                      value={myApiKeyInput}
                      onChange={(e) => setMyApiKeyInput(e.target.value)}
                      placeholder="e.g. nkb_inv_live_6ae6965c1ca61aef54939d6b1ecfac1b"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Target host: <code className="text-blue-700 font-semibold">https://my.nkbmanufacturing.com</code>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      my.nkb API Base URL
                    </label>
                    <input
                      type="text"
                      value={myApiUrlInput}
                      onChange={(e) => setMyApiUrlInput(e.target.value)}
                      placeholder="http://my.nkbmanufacturing.com/api/v1"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: pc.nkbmanufacturing.com (Petty Cash Portal) */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse"></span>
                    <h4 className="font-bold text-xs text-purple-900 uppercase tracking-wider">
                      2. pc.nkbmanufacturing.com (Petty Cash Portal)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    Active Portal
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      pc.nkb API Key (`x-api-key`)
                    </label>
                    <input
                      type="text"
                      value={pcApiKeyInput}
                      onChange={(e) => setPcApiKeyInput(e.target.value)}
                      placeholder="e.g. nkb_live_f1d0f3378f2fab77868d961f0c9084a5e427174e964eba2f"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Target host: <code className="text-purple-700 font-semibold">https://pc.nkbmanufacturing.com</code>
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      pc.nkb API Base URL
                    </label>
                    <input
                      type="text"
                      value={pcApiUrlInput}
                      onChange={(e) => setPcApiUrlInput(e.target.value)}
                      placeholder="https://pc.nkbmanufacturing.com/api/v1"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Both APIs Remain Concurrently Saved in Database
                </p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Saving updates both connections at once. Neither key will ever be cleared or overwritten when updating the other.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingKey ? 'Saving Connections...' : 'Save Both Connections'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Existing Registered API Key */}
      {editingKeyItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit & Replace API Key</h3>
                  <p className="text-xs text-slate-500">ID #{editingKeyItem.id} &bull; {editingKeyItem.client_app || 'Custom Client'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingKeyItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Key Name / Purpose *
                </label>
                <input
                  type="text"
                  required
                  value={editKeyName}
                  onChange={(e) => setEditKeyName(e.target.value)}
                  placeholder="e.g. my.nkbmanufacturing.com API"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Client WebApp / Origin *
                </label>
                <input
                  type="text"
                  required
                  value={editClientApp}
                  onChange={(e) => setEditClientApp(e.target.value)}
                  placeholder="e.g. https://my.nkbmanufacturing.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    API Key Token string (`x-api-key`) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const randHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
                      setEditKeyToken(`nkb_live_${randHex}`);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    Generate Random Token
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editKeyToken}
                  onChange={(e) => setEditKeyToken(e.target.value)}
                  placeholder="nkb_live_..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  You can paste a new API key here to replace the current token immediately.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Permissions / Scopes
                </label>
                <select
                  value={editScopes}
                  onChange={(e) => setEditScopes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="payables:read,payables:create">Read & Create Payables (Recommended)</option>
                  <option value="payables:create">Create Only (Submit Payable Requests)</option>
                  <option value="payables:read">Read Only (Status Check Only)</option>
                  <option value="payables:read,payables:create,payables:confirm">Full Access (Read, Create, Confirm)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingKeyItem(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditKey || !editKeyName.trim() || !editClientApp.trim() || !editKeyToken.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingEditKey ? 'Saving...' : 'Save & Update Key'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
