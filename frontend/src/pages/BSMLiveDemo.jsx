import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useBehavioralTracking } from '../hooks/useBehavioralTracking';

export default function BSMLiveDemo() {
  const { metrics, getFinalMetrics } = useBehavioralTracking();
  const [formData, setFormData] = useState({
    beneficiary: '',
    accountNumber: '',
    amount: '',
    category: 'transfer',
    reference: '',
    is_new_beneficiary: false
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const finalData = getFinalMetrics(formData);
    try {
      const res = await api.bsmPredict(finalData);
      setResult(res);
    } catch (error) {
      console.error("Prediction failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    window.location.reload(); 
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-8 font-sans text-slate-300">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation / Back */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl shadow-xl flex items-center justify-center border border-slate-800">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-tight">Espace Client Personnel</h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bank of Africa · Digital Banking</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-2xl shadow-xl border border-slate-800">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protection BSM Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Transaction Card */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <h2 className="text-3xl font-black text-white">Effectuer un Virement</h2>
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700"></div>)}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="space-y-6">
                    {/* Beneficiary */}
                    <div className={`group transition-all ${activeField === 'benef' ? 'scale-[1.02]' : ''}`}>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Destinataire</label>
                      <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${activeField === 'benef' ? 'border-indigo-600 bg-slate-800 shadow-lg' : 'border-slate-800 bg-slate-800/40'}`}>
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold">
                          {formData.beneficiary ? formData.beneficiary[0].toUpperCase() : '?'}
                        </div>
                        <input 
                          required
                          type="text"
                          onFocus={() => setActiveField('benef')}
                          onBlur={() => setActiveField(null)}
                          value={formData.beneficiary}
                          onChange={(e) => setFormData({...formData, beneficiary: e.target.value})}
                          placeholder="Nom complet du bénéficiaire"
                          className="flex-1 bg-transparent border-none outline-none font-bold text-white placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className={`transition-all ${activeField === 'account' ? 'scale-[1.02]' : ''}`}>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numéro de compte (IBAN)</label>
                      <input 
                        required
                        type="text"
                        onFocus={() => setActiveField('account')}
                        onBlur={() => setActiveField(null)}
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
                        placeholder="FR76 3000 1000 ..."
                        className={`w-full p-5 rounded-2xl border-2 font-mono text-sm transition-all text-white placeholder:text-slate-600 ${activeField === 'account' ? 'border-indigo-600 bg-slate-800 shadow-lg' : 'border-slate-800 bg-slate-800/40'}`}
                      />
                    </div>

                    {/* Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className={`transition-all ${activeField === 'amt' ? 'scale-[1.02]' : ''}`}>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Montant</label>
                        <div className={`flex items-center gap-2 p-5 rounded-2xl border-2 transition-all ${activeField === 'amt' ? 'border-indigo-600 bg-slate-800 shadow-lg' : 'border-slate-800 bg-slate-800/40'}`}>
                          <input 
                            required
                            type="number"
                            onFocus={() => setActiveField('amt')}
                            onBlur={() => setActiveField(null)}
                            value={formData.amount}
                            onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            placeholder="0.00"
                            className="flex-1 bg-transparent border-none outline-none font-black text-2xl text-white placeholder:text-slate-600"
                          />
                          <span className="font-black text-slate-600">MAD</span>
                        </div>
                      </div>
                      <div className={`transition-all ${activeField === 'cat' ? 'scale-[1.02]' : ''}`}>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Motif</label>
                        <select 
                          onFocus={() => setActiveField('cat')}
                          onBlur={() => setActiveField(null)}
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className={`w-full p-5 rounded-2xl border-2 font-bold text-white transition-all appearance-none bg-no-repeat bg-[right_1.5rem_center] ${activeField === 'cat' ? 'border-indigo-600 bg-slate-800 shadow-lg' : 'border-slate-800 bg-slate-800/40'}`}
                        >
                          <option value="transfer">Virement standard</option>
                          <option value="shopping">Achat en ligne</option>
                          <option value="rent">Loyer</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-black text-indigo-100 uppercase">Nouveau bénéficiaire</p>
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Enregistrer dans mes favoris</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.is_new_beneficiary} onChange={(e)=>setFormData({...formData, is_new_beneficiary: e.target.checked})} className="sr-only peer" />
                      <div className="w-14 h-8 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <button 
                    disabled={loading || !!result}
                    className="group relative w-full py-6 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-xl transition-all shadow-2xl disabled:opacity-50 overflow-hidden"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
                    <span className="flex items-center justify-center gap-4">
                      {loading ? 'SÉCURISATION...' : 'VALIDER LE PAIEMENT'}
                      {!loading && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Telemetry / Live Feed */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Live Monitoring Dashboard */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Monitoring</h3>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Streaming</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Typing Velocity</p>
                    <p className="text-xl font-mono font-bold text-indigo-400">{metrics.typing_speed_ms}<span className="text-[10px] text-slate-600 ml-1">ms</span></p>
                  </div>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Ritual Rhythm</p>
                    <p className="text-xl font-mono font-bold text-indigo-400">{(metrics.typing_regularity * 100).toFixed(0)}<span className="text-[10px] text-slate-600 ml-1">%</span></p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Paste detected', val: metrics.copy_paste_detected ? 'YES' : 'NO', danger: metrics.copy_paste_detected },
                    { label: 'Focus shifts', val: metrics.field_focus_changes, danger: metrics.field_focus_changes > 10 },
                    { label: 'Tab Switches', val: metrics.tab_switches, danger: metrics.tab_switches > 0 },
                    { label: 'Neural Entropy', val: metrics.mouse_movement_entropy.toFixed(3), danger: false }
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/20">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
                      <span className={`font-mono text-xs font-bold ${m.danger ? 'text-red-500' : 'text-slate-300'}`}>{m.val}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-center">
                  <p className="text-[8px] font-bold text-indigo-400/60 uppercase leading-relaxed">
                    Le modèle XGBoost analyse ces signaux physiologiques en temps réel pour authentifier votre identité.
                  </p>
                </div>
              </div>
            </div>

            {/* Verification Steps */}
            <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Protocoles de Sécurité</h3>
              <div className="space-y-4">
                {[
                  { label: 'Biométrie comportementale', status: 'Active' },
                  { label: 'Analyse de l\'appareil', status: 'Vérifié' },
                  { label: 'Géolocalisation IP', status: 'Vérifié' }
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{s.label}</span>
                    <span className="ml-auto text-[8px] font-black text-emerald-500 uppercase tracking-widest">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Result MODALS */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500">
          
          <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-500">
            
            {result.decision === 'Bloquer' ? (
              <>
                <div className="bg-red-600 p-10 text-center text-white relative">
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)]"></div>
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white/30 animate-pulse">
                    <span className="text-6xl">🚨</span>
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic">OPÉRATION BLOQUÉE</h2>
                </div>
                <div className="p-12 space-y-8">
                  <div className="bg-red-50 p-8 rounded-[2rem] border border-red-100 relative">
                    <div className="absolute -top-4 left-8 bg-red-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Alerte Sécurité</div>
                    <p className="text-red-900 font-black text-xl leading-snug mb-4">
                      Comportement inhabituel détecté.
                    </p>
                    <p className="text-red-600/80 text-sm font-medium leading-relaxed">
                      Notre système d'intelligence artificielle a suspendu cette transaction car votre manière de saisir les données ne correspond pas à votre profil habituel.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <button onClick={handleReset} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all shadow-xl">
                      RÉESSAYER MANUELLEMENT
                    </button>
                    <button className="w-full py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">
                      SERVICE CLIENT (3434)
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-10 text-center relative" style={{ backgroundColor: result.color }}>
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white/30">
                    <span className="text-6xl">{result.icon}</span>
                  </div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white">
                    {result.decision === 'Approuver' ? 'SUCCÈS' : 'CHALLENGE'}
                  </h2>
                </div>
                <div className="p-12 text-center space-y-8">
                  <p className="text-slate-600 font-bold text-xl leading-relaxed">
                    {result.decision === 'Approuver' 
                      ? "Transaction authentifiée avec succès via biométrie comportementale."
                      : "Une confirmation par SMS (OTP) est nécessaire pour finaliser l'opération."}
                  </p>
                  
                  <div className="flex justify-center gap-8">
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Score IA</p>
                      <p className="text-3xl font-black" style={{ color: result.color }}>{result.risk_score_pct}%</p>
                    </div>
                    <div className="w-[1px] h-12 bg-slate-100"></div>
                    <div className="text-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Moteur</p>
                      <p className="text-3xl font-black text-slate-800">BSM</p>
                    </div>
                  </div>

                  <button onClick={handleReset} className="w-full py-5 text-white rounded-2xl font-black text-lg shadow-xl transition-all" style={{ backgroundColor: result.color }}>
                    TERMINER
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
