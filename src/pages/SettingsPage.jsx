import React, { useEffect, useState } from 'react';
import {
  Settings, Save, Info, AlertTriangle, Type,
  Key, Copy, Check, RefreshCw, Eye, EyeOff, ShieldCheck, Code, Play, Terminal
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    percentage_display_decimals: '2',
    rounding_mode: 'ROUND_HALF_UP',
    default_currency: 'PHP',
    formula_tolerance_pct: '0.01',
    document_font: localStorage.getItem('nkb_document_font') || 'Inter',
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [message, setMessage] = useState(null);

  // Inventory API Management States
  const [inventoryApiKey, setInventoryApiKey] = useState('');
  const [inventoryApiEnabled, setInventoryApiEnabled] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [togglingApi, setTogglingApi] = useState(false);

  // Live API Tester States
  const [approvedFormulas, setApprovedFormulas] = useState([]);
  const [testFormulaCode, setTestFormulaCode] = useState('');
  const [testBatchQty, setTestBatchQty] = useState('50.00');
  const [testUom, setTestUom] = useState('kg');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    // 1. Fetch system settings
    apiFetch('/api/v1/settings')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setSettings(prev => ({
            ...prev,
            ...d.data,
            document_font: d.data.document_font || localStorage.getItem('nkb_document_font') || 'Inter',
          }));
        }
      });

    // 2. Fetch inventory API key configuration
    fetchInventoryApiKey();

    // 3. Fetch formulas for test runner
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          const approved = d.data.filter(f => (f.versions || []).some(v => v.version_status === 'APPROVED'));
          setApprovedFormulas(approved);
          if (approved.length > 0 && !testFormulaCode) {
            setTestFormulaCode(approved[0].code);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchInventoryApiKey = () => {
    apiFetch('/api/v1/settings/inventory-api-key')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setInventoryApiKey(d.apiKey || '');
          setInventoryApiEnabled(Boolean(d.isEnabled));
        }
      })
      .catch(() => {});
  };

  const handleCopyApiKey = () => {
    if (!inventoryApiKey) return;
    navigator.clipboard.writeText(inventoryApiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRegenerateApiKey = () => {
    const conf = window.confirm(
      'Sigurado ka bang nais mong mag-generate ng bagong API Key?\n\nAng lumang API key ay hindi na gagana at kakailanganing i-update sa inyong external Inventory system.'
    );
    if (!conf) return;

    setRegeneratingKey(true);
    apiFetch('/api/v1/settings/generate-inventory-api-key', { method: 'POST' })
      .then(r => r.json())
      .then(d => {
        setRegeneratingKey(false);
        if (d.success) {
          setInventoryApiKey(d.apiKey);
          alert('Bagong Inventory API Key ay matagumpay na nabuo!');
        } else {
          alert('Failed to generate key: ' + d.message);
        }
      })
      .catch(e => {
        setRegeneratingKey(false);
        alert('Error: ' + e.message);
      });
  };

  const handleToggleInventoryApi = () => {
    const nextState = !inventoryApiEnabled;
    setTogglingApi(true);
    apiFetch('/api/v1/settings/inventory-api-status', {
      method: 'PUT',
      body: JSON.stringify({ isEnabled: nextState })
    })
      .then(r => r.json())
      .then(d => {
        setTogglingApi(false);
        if (d.success) {
          setInventoryApiEnabled(nextState);
        } else {
          alert('Failed to update status: ' + d.message);
        }
      })
      .catch(e => {
        setTogglingApi(false);
        alert('Error: ' + e.message);
      });
  };

  const handleRunApiTest = (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!testFormulaCode) {
      alert('Pumili ng formulation na itetest.');
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    // Call the external inventory API using x-api-key header
    const targetUrl = `/api/v1/external/inventory/formulations/${encodeURIComponent(testFormulaCode)}?batch_size=${encodeURIComponent(testBatchQty)}&uom=${encodeURIComponent(testUom)}`;

    fetch(targetUrl, {
      headers: {
        'x-api-key': inventoryApiKey,
        'Accept': 'application/json'
      }
    })
      .then(r => r.json())
      .then(d => {
        setTestLoading(false);
        setTestResult({
          request: {
            method: 'GET',
            url: targetUrl,
            headers: { 'x-api-key': showApiKey ? inventoryApiKey : '••••••••••••••••' }
          },
          response: d
        });
      })
      .catch(err => {
        setTestLoading(false);
        setTestResult({
          error: err.message
        });
      });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    localStorage.setItem('nkb_document_font', settings.document_font || 'Inter');

    apiFetch('/api/v1/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    })
      .then(r => r.json())
      .then(d => {
        setSaving(false);
        if (d.success) {
          setMessage({ type: 'success', text: 'System settings & font preferences saved successfully!' });
        } else {
          setMessage({ type: 'error', text: d.message });
        }
      });
  };

  const handleSystemReset = () => {
    if (resetConfirmation !== 'RESET_ALL_DATA') return;

    const conf = window.confirm(
      'WARNING: This will permanently delete all formulas, raw materials, batch records, QC parameters, compounding entries, and audit logs. This action CANNOT be undone.\n\nAre you absolutely sure you want to proceed?'
    );
    if (!conf) return;

    setResetting(true);
    setMessage(null);

    apiFetch('/api/v1/settings/reset', {
      method: 'POST',
      body: JSON.stringify({ confirmation: resetConfirmation }),
    })
      .then(r => r.json())
      .then(d => {
        setResetting(false);
        setResetConfirmation('');
        if (d.success) {
          alert('System Database Reset Completed Successfully.');
          window.location.reload(); // Refresh session/app state
        } else {
          setMessage({ type: 'error', text: d.message || 'System reset failed.' });
        }
      })
      .catch(err => {
        setResetting(false);
        setMessage({ type: 'error', text: err.message || 'Connection error during reset.' });
      });
  };

  const isSuperAdmin = user?.role === 'Super Admin' || user?.roles?.includes('Super Admin');

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" /> System Settings & Tolerances
        </h1>
        <p className="text-xs text-slate-500">Configure default currency, calculation rounding models, and database parameters.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          <Info className="w-4 h-4" /> {message.text}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Calculation & Regional Settings</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Percentage Display Decimals</label>
            <select
              value={settings.percentage_display_decimals || '2'}
              onChange={e => setSettings({ ...settings, percentage_display_decimals: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
            >
              <option value="2">2 Decimals (e.g. 15.50%)</option>
              <option value="4">4 Decimals (e.g. 15.5000%)</option>
              <option value="6">6 Decimals (e.g. 15.500000%)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Rounding Mode</label>
            <select
              value={settings.rounding_mode || 'ROUND_HALF_UP'}
              onChange={e => setSettings({ ...settings, rounding_mode: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
            >
              <option value="ROUND_HALF_UP">ROUND_HALF_UP (Standard Scientific)</option>
              <option value="ROUND_HALF_EVEN">ROUND_HALF_EVEN (Banker's Rounding)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Default Currency Code</label>
            <input
              type="text"
              maxLength="3"
              value={settings.default_currency || 'PHP'}
              onChange={e => setSettings({ ...settings, default_currency: e.target.value.toUpperCase() })}
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-bold uppercase text-center focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">100% Formula Tolerance (%)</label>
            <input
              type="number"
              step="0.0001"
              value={settings.formula_tolerance_pct || '0.01'}
              onChange={e => setSettings({ ...settings, formula_tolerance_pct: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Auto-Send Formula Batches to Operator Station Toggle */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-slate-900 font-bold text-xs">
                Auto-Send Formulated Batches to Operator Station
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kapag <span className="font-bold text-amber-700">OFF (Print Only Mode)</span>, mag-pi-print lamang ng barcode/log at WALANG mababato sa Operator Station. Kapag <span className="font-bold text-emerald-600">ON</span>, awtomatikong lalabas sa Operator station ang bagong batch.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, auto_send_to_operator_mes: settings.auto_send_to_operator_mes === 'true' ? 'false' : 'true' })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                settings.auto_send_to_operator_mes === 'true' ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.auto_send_to_operator_mes === 'true' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="pt-1">
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-md inline-block ${
              settings.auto_send_to_operator_mes === 'true'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}>
              {settings.auto_send_to_operator_mes === 'true'
                ? '🟢 Status: ON (Auto-Send Batches to Operator Station Enabled)'
                : '🔴 Status: OFF (Print Only Mode — No Batches Sent to Operator)'}
            </span>
          </div>
        </div>

        {/* Document & Print PDF Typography Settings */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
            <Type className="w-4 h-4 text-blue-600" /> Document & Print PDF Typography Settings
          </h3>
          <p className="text-xs text-slate-500">Select the official font family for Production Sheets, PDF print exports, and batch calculator document previews.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">Official Document Font Style</label>
              <select
                value={settings.document_font || 'Inter'}
                onChange={e => {
                  const newFont = e.target.value;
                  setSettings({ ...settings, document_font: newFont });
                  localStorage.setItem('nkb_document_font', newFont);
                }}
                className="w-full bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-bold focus:outline-none focus:border-blue-600"
              >
                <option value="Inter">Inter (Modern Corporate Sans-Serif — Recommended)</option>
                <option value="Roboto">Roboto (Clean Industrial Sans-Serif)</option>
                <option value="Outfit">Outfit (Geometric Modern Sans-Serif)</option>
                <option value="Segoe UI">Segoe UI / Arial (Standard Enterprise)</option>
                <option value="Georgia">Georgia / Times New Roman (Classic Formal Serif)</option>
              </select>
            </div>

            {/* Live Typography Preview Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Live Font Preview</span>
              <div
                className="text-sm font-bold text-slate-900"
                style={{
                  fontFamily:
                    settings.document_font === 'Roboto'
                      ? 'Roboto, sans-serif'
                      : settings.document_font === 'Outfit'
                      ? 'Outfit, sans-serif'
                      : settings.document_font === 'Segoe UI'
                      ? '"Segoe UI", Arial, sans-serif'
                      : settings.document_font === 'Georgia'
                      ? 'Georgia, serif'
                      : 'Inter, sans-serif',
                }}
              >
                NKB Manufacturing Corporation — PRODUCTION SHEET
              </div>
              <div className="text-xs text-slate-600 font-semibold">
                Target Quantity: 10,000.00 g | Target pH: 5.50 - 6.00 | Compounding No: CP-1794
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> Save System Settings
        </button>
      </form>

      {/* External Inventory Integration API & Formulation Raw Materials Gateway */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">External Inventory Formulation API</h3>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${inventoryApiEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                {inventoryApiEnabled ? '🟢 Active / Enabled' : '⚪ Disabled'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Secure REST API para makuha ng external Inventory System ang Raw Materials at kailangang dami nang hindi nali-leak ang formula secrets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleInventoryApi}
              disabled={togglingApi}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                inventoryApiEnabled ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              {inventoryApiEnabled ? 'API Enabled' : 'API Disabled'}
            </button>
          </div>
        </div>

        {/* Trade Secret & Zero-Formula-Leak Protection Banner */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="font-bold text-emerald-900 flex items-center gap-2">
              <span>Trade Secret &amp; Zero-Formula-Leak Protection</span>
              <span className="bg-emerald-200/80 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded font-black">ENFORCED</span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Kapag ginamit ng inyong Inventory System ang API na ito, <strong>RAW MATERIALS LAMANG (Material Code, Name, at Required Kilos/Grams)</strong> ang kanilang matatanggap. Awtomatikong <strong>NAKATAGO AT REDACTED</strong> ang mga sumusunod para protektado ang inyong kumpanya:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-semibold text-[11px] text-emerald-900">
              <div className="bg-white/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <span className="text-rose-600 font-bold">✕</span> Proprietary Percentages (%)
              </div>
              <div className="bg-white/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <span className="text-rose-600 font-bold">✕</span> Compounding SOP &amp; Steps
              </div>
              <div className="bg-white/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <span className="text-rose-600 font-bold">✕</span> Secret Phase Breakdown
              </div>
              <div className="bg-white/90 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                <span className="text-rose-600 font-bold">✕</span> Material Costs &amp; Pricing
              </div>
            </div>
          </div>
        </div>

        {/* API Key Management */}
        <div className="space-y-2 text-xs">
          <label className="block text-slate-700 font-semibold">Inventory Live API Key (Bearer / x-api-key)</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showApiKey ? 'text' : 'password'}
                readOnly
                value={inventoryApiKey || 'Loading API key...'}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2.5 pl-3 pr-10 text-xs font-mono font-bold text-slate-900 select-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                title={showApiKey ? 'Hide Key' : 'Show Key'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyApiKey}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copied!' : 'Copy API Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleRegenerateApiKey}
                disabled={regeneratingKey}
                className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition disabled:opacity-50"
                title="Generate a brand new API key"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${regeneratingKey ? 'animate-spin' : ''}`} />
                <span>Regenerate Key</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Gamitin bilang Header sa external HTTP request: <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">x-api-key: {showApiKey ? inventoryApiKey : '••••••••••••••••'}</code> o <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">Authorization: Bearer {showApiKey ? inventoryApiKey : '••••••••••••••••'}</code>
          </p>
        </div>

        {/* API Endpoints Reference Documentation */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-200 flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-600" />
            <span>Available REST Endpoints for Inventory Systems</span>
          </div>

          <div className="divide-y divide-slate-200 bg-white">
            {/* Endpoint 1 */}
            <div className="p-3.5 space-y-1 hover:bg-slate-50/60 transition">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono text-[10px]">GET</span>
                <span className="font-mono font-extrabold text-slate-900 text-xs">/api/v1/external/inventory/formulations</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Ilista ang lahat ng Approved formulations kasama ang listahan ng raw materials na kailangan.
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Query params: <code>?batch_size=100&amp;uom=kg&amp;search=meow&amp;category=Perfume</code>
              </div>
            </div>

            {/* Endpoint 2 */}
            <div className="p-3.5 space-y-1 hover:bg-slate-50/60 transition">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono text-[10px]">GET</span>
                <span className="font-mono font-extrabold text-slate-900 text-xs">/api/v1/external/inventory/formulations/:idOrCode</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Kunin ang raw materials para sa partikular na formulation gamit ang ID o Formula Code. Awtomatikong kinalkula batay sa <code>batch_size</code> at <code>uom</code>.
              </p>
              <div className="text-[10px] text-slate-400 font-mono">
                Halimbawa: <code>/api/v1/external/inventory/formulations/PRF-2026-001?batch_size=50&amp;uom=kg</code>
              </div>
            </div>

            {/* Endpoint 3 */}
            <div className="p-3.5 space-y-1 hover:bg-slate-50/60 transition">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded font-mono text-[10px]">POST</span>
                <span className="font-mono font-extrabold text-slate-900 text-xs">/api/v1/external/inventory/calculate-bom</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Mag-compute ng raw material Bill of Materials (BOM) sa pamamagitan ng JSON body: <code>{`{ "formula_code": "PRF-2026-001", "target_batch_qty": 50, "target_uom": "kg" }`}</code>
              </p>
            </div>

            {/* Endpoint 4 */}
            <div className="p-3.5 space-y-1 hover:bg-slate-50/60 transition">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded font-mono text-[10px]">GET</span>
                <span className="font-mono font-extrabold text-slate-900 text-xs">/api/v1/external/inventory/active-batches</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                Ilista ang lahat ng aktibong compounding batches na nakapila o ginagawa sa planta at ang eksaktong raw materials na kailangan i-ready ng bodega / inventory.
              </p>
            </div>
          </div>
        </div>

        {/* Live Interactive API Tester */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>Live API Response Tester (Subukan ang Output)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold">Test directly with current API Key</span>
          </div>

          <form onSubmit={handleRunApiTest} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 font-semibold mb-1">Select Formulation to Test</label>
              <select
                value={testFormulaCode}
                onChange={e => setTestFormulaCode(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-600"
              >
                {approvedFormulas.length === 0 ? (
                  <option value="">-- No Approved Formulations Available --</option>
                ) : (
                  approvedFormulas.map(f => (
                    <option key={f.id} value={f.code}>
                      {f.code} — {f.name} ({f.product_category || 'Formula'})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Batch</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={testBatchQty}
                  onChange={e => setTestBatchQty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-emerald-600"
                  placeholder="50"
                />
                <select
                  value={testUom}
                  onChange={e => setTestUom(e.target.value)}
                  className="bg-white border border-slate-300 rounded p-2 text-slate-900 font-bold focus:outline-none focus:border-emerald-600 shrink-0"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={testLoading || !testFormulaCode}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Calling API...' : 'Send Test Request'}</span>
              </button>
            </div>
          </form>

          {/* Test JSON Output */}
          {testResult && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Response Status: {testResult.response?.success ? '🟢 200 OK' : '🔴 Error'}</span>
                <span>Data Privacy: Percentages &amp; SOP Redacted ✓</span>
              </div>
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-64 border border-slate-800 shadow-inner">
                {JSON.stringify(testResult.response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone System Reset (Super Admin Only) */}
      {isSuperAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
          <h3 className="font-bold text-rose-600 text-sm border-b border-slate-200 pb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> System Reset Danger Zone
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Perform a complete database factory reset. This will permanently clear all formulations, raw materials, cost snapshots, batch compounding requirements, QC parameters, compounding runs, and audit logs.
            <br />
            <strong className="text-rose-700">Important:</strong> Active User Accounts and Role definitions will remain completely untouched.
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1.5">
                To confirm, type <span className="font-mono text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">RESET_ALL_DATA</span> below:
              </label>
              <input
                type="text"
                placeholder="RESET_ALL_DATA"
                value={resetConfirmation}
                onChange={e => setResetConfirmation(e.target.value)}
                className="w-full max-w-xs bg-white border border-slate-300 rounded p-2.5 text-slate-900 font-mono font-bold uppercase focus:outline-none focus:border-rose-600"
              />
            </div>

            <button
              type="button"
              disabled={resetConfirmation !== 'RESET_ALL_DATA' || resetting}
              onClick={handleSystemReset}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-50 transition"
            >
              {resetting ? 'Resetting System Database...' : 'Execute Complete Database Reset'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SettingsPage;
