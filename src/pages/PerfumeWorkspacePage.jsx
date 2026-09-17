import React, { useState, useEffect } from 'react';
import { PerfumeBrandPage } from './PerfumeBrandPage';
import { PerfumeNoBrandPage } from './PerfumeNoBrandPage';
import {
  Sparkles,
  FlaskConical,
  Droplet,
  Layers,
  Thermometer,
  Clock,
  CheckCircle2,
  Sliders,
  FileText,
  Filter,
} from 'lucide-react';
import { apiFetch } from '../services/api';
import { StatusBadge } from '../components/Badge';

export function PerfumeWorkspacePage({ setCurrentPage }) {
  const [activeTab, setActiveTab] = useState('brand'); // 'brand', 'nobrand', 'maceration', 'directory'

  // Maceration & Aging Tracker State
  const [macerationLogs, setMacerationLogs] = useState([
    {
      id: 1,
      batch_code: 'BAT-PRF-2026-001',
      formula_name: 'Perfume Brand (Without Water) - Musk Base',
      maceration_start_date: '2026-09-01',
      target_maceration_days: 14,
      elapsed_days: 16,
      chilling_temp_c: '4°C',
      chilling_hours: 24,
      filtration_status: 'COMPLETED',
      odor_profile: 'Warm vanilla floral notes with smooth musk dry-down',
      status: 'READY_FOR_BOTTLING',
    },
    {
      id: 2,
      batch_code: 'BAT-PRF-2026-002',
      formula_name: 'Perfume No Brand (With Water) - Citrus Fresh',
      maceration_start_date: '2026-09-10',
      target_maceration_days: 21,
      elapsed_days: 7,
      chilling_temp_c: '2°C',
      chilling_hours: 48,
      filtration_status: 'IN_MACERATION',
      odor_profile: 'Crisp bergamot & mandarin citrus top notes',
      status: 'AGING_IN_PROGRESS',
    },
  ]);

  const [allPerfumeFormulas, setAllPerfumeFormulas] = useState([]);

  useEffect(() => {
    // Fetch all perfume formulas for directory tab
    apiFetch('/api/v1/formulas')
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          const perf = d.data.filter(f =>
            (f.product_category || '').toLowerCase().includes('perfume') ||
            (f.formula_type || '').toLowerCase().includes('perfume')
          );
          setAllPerfumeFormulas(perf);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Dedicated Perfume Workspace Main Header (Light Theme) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4 text-amber-500" /> Dedicated Standalone Hub
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            🌸 Perfume Formulation Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Isolated Perfume R&D Hub — Brand Conversion Engine, No-Brand Base Presets, Maceration/Aging Tracker, & Perfume Calculations.
          </p>
        </div>

        {/* Workspace Hub Navigation Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('brand')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'brand'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-900" /> Perfume Brand
          </button>
          <button
            onClick={() => setActiveTab('nobrand')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'nobrand'
                ? 'bg-purple-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FlaskConical className="w-4 h-4 text-white" /> Perfume No-Brand
          </button>
          <button
            onClick={() => setActiveTab('maceration')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'maceration'
                ? 'bg-blue-600 text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-200" /> Maceration Tracker
          </button>
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-slate-900 text-white font-extrabold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Layers className="w-4 h-4 text-slate-300" /> Perfume Directory
          </button>
        </div>
      </div>

      {/* WORKSPACE SUB-MODULE 1: PERFUME BRAND PAGE */}
      {activeTab === 'brand' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <PerfumeBrandPage setCurrentPage={setCurrentPage} />
        </div>
      )}

      {/* WORKSPACE SUB-MODULE 2: PERFUME NO-BRAND PAGE */}
      {activeTab === 'nobrand' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <PerfumeNoBrandPage setCurrentPage={setCurrentPage} />
        </div>
      )}

      {/* WORKSPACE SUB-MODULE 3: MACERATION & AGING TRACKER */}
      {activeTab === 'maceration' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" /> Perfume Maceration, Chilling & Aging Tracker
                </h3>
                <p className="text-xs text-slate-500">Monitor batch aging timelines, chilling temperatures (4°C), and filtration readiness.</p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                {macerationLogs.length} Batches Aging
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {macerationLogs.map(log => {
                const pct = Math.min(100, Math.round((log.elapsed_days / log.target_maceration_days) * 100));
                const isReady = log.elapsed_days >= log.target_maceration_days;

                return (
                  <div key={log.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 hover:border-blue-300 transition">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-700 px-2.5 py-1 bg-blue-100 rounded-lg">
                        {log.batch_code}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        isReady
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {isReady ? 'READY FOR BOTTLING' : `AGING (${log.elapsed_days}/${log.target_maceration_days} Days)`}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{log.formula_name}</h4>
                      <p className="text-xs text-slate-500 italic mt-0.5">{log.odor_profile}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-600">
                        <span>Maceration Progress ({log.elapsed_days} of {log.target_maceration_days} Days)</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white p-3 rounded-xl border border-slate-200 text-center">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Chilling Temp</span>
                        <span className="font-bold text-slate-900 flex items-center justify-center gap-0.5">
                          <Thermometer className="w-3 h-3 text-blue-500" /> {log.chilling_temp_c}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Chilling Hours</span>
                        <span className="font-bold text-slate-900">{log.chilling_hours}h</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Filtration</span>
                        <span className="font-bold text-emerald-700">{log.filtration_status}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WORKSPACE SUB-MODULE 4: UNIFIED PERFUME DIRECTORY */}
      {activeTab === 'directory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-900 text-white font-bold text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" /> Master Perfume Formulas Directory (Brand & No-Brand)
            </span>
            <span className="text-xs text-slate-400">{allPerfumeFormulas.length} Registered Perfume Formulas</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Formula Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Subcategory</th>
                  <th className="p-3.5">Active Version</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {allPerfumeFormulas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">No perfume formulas found in directory. Use the Perfume Brand or No-Brand workspace to formulate.</td>
                  </tr>
                ) : (
                  allPerfumeFormulas.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-mono font-bold text-amber-700">{f.code}</td>
                      <td className="p-3.5 font-bold text-slate-900">{f.name}</td>
                      <td className="p-3.5 text-slate-600 font-semibold">{f.product_category}</td>
                      <td className="p-3.5 text-slate-600">{f.product_subcategory || 'Standard'}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700">V{f.active_version}</td>
                      <td className="p-3.5"><StatusBadge status={f.status || 'ACTIVE'} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
