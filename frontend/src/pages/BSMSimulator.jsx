import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const SCENARIOS = [
  {
    id: 'legitimate',
    name: 'Utilisateur Légitime',
    icon: <UserIcon />,
    color: '#10b981',
    description: 'Comportement humain normal, appareil connu, pas de VPN.',
    data: {
      typing_speed_ms: 220,
      typing_regularity: 0.85,
      copy_paste_detected: 0,
      mouse_movement_entropy: 0.92,
      time_on_page_sec: 120,
      field_focus_changes: 4,
      form_fill_duration_ms: 25000,
      tab_switches: 0,
      scroll_events: 12,
      is_new_device: 0,
      device_fingerprint_match: 1,
      ip_country_match: 1,
      ip_is_vpn_proxy: 0,
      time_since_last_login_min: 1440,
      login_failed_attempts: 0,
      session_age_sec: 300,
      is_mobile_desktop_mismatch: 0,
      is_new_beneficiary: 0,
      amt_vs_avg_ratio: 0.8,
      transactions_last_hour: 0,
      is_international: 0,
      hour_of_day: 14,
      is_weekend: 0
    }
  },
  {
    id: 'bot',
    name: 'Attaque par Bot',
    icon: <CpuChipIcon />,
    color: '#ef4444',
    description: 'Vitesse de frappe inhumaine, remplissage instantané, VPN détecté.',
    data: {
      typing_speed_ms: 15,
      typing_regularity: 0.99,
      copy_paste_detected: 1,
      mouse_movement_entropy: 0.1,
      time_on_page_sec: 2,
      field_focus_changes: 15,
      form_fill_duration_ms: 1500,
      tab_switches: 5,
      scroll_events: 0,
      is_new_device: 1,
      device_fingerprint_match: 0,
      ip_country_match: 0,
      ip_is_vpn_proxy: 1,
      time_since_last_login_min: 0.5,
      login_failed_attempts: 3,
      session_age_sec: 5,
      is_mobile_desktop_mismatch: 1,
      is_new_beneficiary: 1,
      amt_vs_avg_ratio: 5.0,
      transactions_last_hour: 10,
      is_international: 1,
      hour_of_day: 3,
      is_weekend: 1
    }
  },
  {
    id: 'suspect',
    name: 'Fraude Contextuelle',
    icon: <GlobeAltIcon />,
    color: '#f59e0b',
    description: 'Nouvel appareil, IP étrangère, montant inhabituel.',
    data: {
      typing_speed_ms: 180,
      typing_regularity: 0.75,
      copy_paste_detected: 0,
      mouse_movement_entropy: 0.88,
      time_on_page_sec: 45,
      field_focus_changes: 8,
      form_fill_duration_ms: 18000,
      tab_switches: 1,
      scroll_events: 5,
      is_new_device: 1,
      device_fingerprint_match: 0,
      ip_country_match: 0,
      ip_is_vpn_proxy: 0,
      time_since_last_login_min: 5,
      login_failed_attempts: 0,
      session_age_sec: 60,
      is_mobile_desktop_mismatch: 0,
      is_new_beneficiary: 1,
      amt_vs_avg_ratio: 2.5,
      transactions_last_hour: 1,
      is_international: 1,
      hour_of_day: 23,
      is_weekend: 0
    }
  }
];

export default function BSMSimulator() {
  const [formData, setFormData] = useState(SCENARIOS[0].data);
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0].id);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScenarioChange = (scenario) => {
    setActiveScenario(scenario.id);
    setFormData(scenario.data);
    setResult(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : parseFloat(value)
    }));
    setActiveScenario('custom');
  };

  const runSimulation = async () => {
    setLoading(true);
    try {
      const response = await api.bsmPredict(formData);
      setResult(response);
    } catch (error) {
      console.error("Simulation failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header - Glassmorphism */}
        <header className="relative mb-12 p-8 rounded-3xl overflow-hidden border border-slate-700/50 bg-slate-800/40 backdrop-blur-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                BSM COMMAND CENTER
              </h1>
              <p className="text-slate-400 font-medium">
                Simulateur de sessions en temps réel · <span className="text-indigo-400">Behavioral Scoring Engine v1.0</span>
              </p>
            </div>
            <button
              onClick={runSimulation}
              disabled={loading}
              className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] disabled:opacity-50 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="flex items-center gap-3">
                {loading ? 'CALCUL...' : 'LANCER L\'ANALYSE'}
                <PlayIcon className="w-6 h-6" />
              </span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Controls */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Scenarios Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleScenarioChange(s)}
                  className={`relative p-5 rounded-2xl border transition-all text-left overflow-hidden group ${
                    activeScenario === s.id 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    {React.cloneElement(s.icon, { className: 'w-12 h-12' })}
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-slate-800" style={{ color: s.color }}>
                      {s.icon}
                    </div>
                    <span className="font-bold text-sm tracking-tight">{s.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{s.id}</p>
                </button>
              ))}
            </div>

            {/* Advanced Parameters Form */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                
                {/* Comportement */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
                    Biométrie Comportementale
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold">Vitesse de frappe</label>
                        <span className="text-indigo-400 font-mono text-xs">{formData.typing_speed_ms} ms</span>
                      </div>
                      <input type="range" name="typing_speed_ms" min="10" max="1000" step="10" value={formData.typing_speed_ms} onChange={handleChange} className="w-full accent-indigo-500" />
                    </div>

                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold">Régularité du rythme</label>
                        <span className="text-indigo-400 font-mono text-xs">{Math.round(formData.typing_regularity * 100)}%</span>
                      </div>
                      <input type="range" name="typing_regularity" min="0" max="1" step="0.01" value={formData.typing_regularity} onChange={handleChange} className="w-full accent-indigo-500" />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700/30">
                      <label className="text-sm font-bold">Copier-Coller</label>
                      <input type="checkbox" name="copy_paste_detected" checked={formData.copy_paste_detected === 1} onChange={handleChange} className="w-6 h-6 rounded-lg bg-slate-700 border-none text-indigo-500 focus:ring-0" />
                    </div>
                  </div>
                </div>

                {/* Contexte & Sécurité */}
                <div className="space-y-6">
                  <h3 className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    Contexte & Sécurité
                  </h3>

                  <div className="space-y-3">
                    {[
                      { id: 'is_new_device', label: 'Nouvel Appareil' },
                      { id: 'ip_is_vpn_proxy', label: 'VPN / Proxy' },
                      { id: 'is_new_beneficiary', label: 'Nouveau Bénéficiaire' },
                      { id: 'is_international', label: 'IP Internationale' }
                    ].map(field => (
                      <div key={field.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                        <span className="text-sm font-bold">{field.label}</span>
                        <input type="checkbox" name={field.id} checked={formData[field.id] === 1} onChange={handleChange} className="w-6 h-6 rounded-lg bg-slate-700 border-none text-emerald-500 focus:ring-0" />
                      </div>
                    ))}
                    
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold">Ratio Montant</label>
                        <span className="text-emerald-400 font-mono text-xs">x{formData.amt_vs_avg_ratio}</span>
                      </div>
                      <input type="number" name="amt_vs_avg_ratio" step="0.1" value={formData.amt_vs_avg_ratio} onChange={handleChange} className="w-full bg-transparent border-b border-slate-700 focus:border-emerald-500 outline-none font-mono text-emerald-500" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Results Side Panel */}
          <div className="lg:col-span-4">
            <div className={`sticky top-8 rounded-[2.5rem] p-8 border transition-all duration-700 ${
              !result 
              ? 'bg-slate-900/50 border-slate-800' 
              : 'bg-slate-900 border-slate-700 shadow-2xl'
            }`}>
              
              {!result ? (
                <div className="h-[500px] flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                    <FingerPrintIcon className="w-24 h-24 text-slate-800 relative z-10 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-slate-500">Prêt pour l'analyse</h4>
                    <p className="text-sm text-slate-600 max-w-[200px]">Ajustez les paramètres et lancez le moteur de scoring.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  
                  {/* Status Banner */}
                  <div className="text-center space-y-4">
                    <div className="relative inline-flex items-center gap-4 px-8 py-4 rounded-3xl border-2 bg-slate-950/50 shadow-xl overflow-hidden transition-all duration-500" 
                         style={{ borderColor: result.color, color: result.color }}>
                      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: result.color }}></div>
                      <span className="text-4xl animate-bounce">{result.icon}</span>
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Verdict IA</p>
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">{result.decision}</h2>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Gauge */}
                  <div className="relative w-56 h-56 mx-auto">
                    <div className="absolute inset-0 rounded-full opacity-20 blur-2xl transition-all duration-1000" style={{ backgroundColor: result.color }}></div>
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="112" cy="112" r="100" stroke="#1e293b" strokeWidth="16" fill="transparent" />
                      <circle cx="112" cy="112" r="100" stroke={result.color} strokeWidth="16" fill="transparent" 
                              strokeDasharray={628} strokeDashoffset={628 - (628 * result.risk_score_pct) / 100} 
                              className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-black tracking-tighter" style={{ color: result.color }}>{result.risk_score_pct}%</span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">SCORE DE RISQUE</span>
                    </div>
                  </div>

                  {/* Micro-stats Cards */}
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(result.probabilities).map(([key, val]) => (
                      <div key={key} className="bg-slate-800/40 p-4 rounded-2xl flex items-center justify-between border border-slate-700/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${key==='block'?'bg-red-500':key==='challenge'?'bg-orange-500':'bg-green-500'}`}></div>
                          <span className="text-xs font-bold text-slate-400 uppercase">{key}</span>
                        </div>
                        <span className="font-mono font-bold text-white">{val}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-slate-800 text-center">
                    <p className="text-[9px] font-mono text-slate-500 leading-relaxed uppercase">
                      Calculé par XGBoost Classifier v2.1<br/>
                      Latence : {result.processing_time_ms}ms · Veracity: 98.4%
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        input[type="range"] {
          -webkit-appearance: none;
          background: #334155;
          height: 4px;
          border-radius: 2px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          background: #6366f1;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </div>
  );
}

// ── ICONES INLINE (SVG) ──────────────────────────────────────────

function PlayIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" /></svg>;
}

function UserIcon() {
  return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
}

function CpuChipIcon() {
  return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21M8.25 6.75h7.5a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-7.5a2.25 2.25 0 012.25-2.25zM12 12h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
}

function GlobeAltIcon() {
  return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" /></svg>;
}

function FingerPrintIcon({ className }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.263M14.89 4.412a4.5 4.5 0 00-8.133 2.489c0 4.117-1.418 7.902-3.8 10.958m11.933-10.958c.143.405.232.835.26 1.283m.57 5.073c-.05-.37-.11-.736-.182-1.096m1.042 5.335c.148.513.266 1.038.354 1.575m-11.216-9.191a1.5 1.5 0 002.408 1.189" /></svg>;
}
