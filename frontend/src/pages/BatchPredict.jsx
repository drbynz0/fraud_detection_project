// src/pages/BatchPredict.jsx
import { useState } from 'react';
import { api } from '../services/api';

const EMPTY_TX = { amt:'', hour:'', day_of_week:'', month:'', is_night:'', age:'', distance_km:'', gender:'', city_pop:'', category:'grocery_pos', state:'', job:'', merchant:'', avg_amt_card:'', amt_deviation:'', tx_count_card:'' };
const CATEGORIES = ['entertainment','food_dining','gas_transport','grocery_net','grocery_pos','health_fitness','home','kids_pets','misc_net','misc_pos','personal_care','shopping_net','shopping_pos','travel'];

const DEMO_BATCH = [
  { amt:550,  hour:2,  day_of_week:5, month:6, is_night:1, age:28, distance_km:380, gender:1, city_pop:120000, category:'shopping_net', state:0.015, job:0.010, merchant:0.022, avg_amt_card:180, amt_deviation:370, tx_count_card:12 },
  { amt:45,   hour:10, day_of_week:1, month:6, is_night:0, age:52, distance_km:3,   gender:0, city_pop:30000,  category:'food_dining',   state:0.009, job:0.006, merchant:0.004, avg_amt_card:55,  amt_deviation:-10, tx_count_card:200 },
  { amt:1200, hour:23, day_of_week:6, month:11,is_night:1, age:34, distance_km:520, gender:1, city_pop:80000,  category:'misc_net',      state:0.018, job:0.012, merchant:0.030, avg_amt_card:200, amt_deviation:1000,tx_count_card:5 },
];

export default function BatchPredict() {
  const [transactions, setTransactions] = useState([{ ...EMPTY_TX, _id: Date.now() }]);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [view,    setView]    = useState('form'); // 'form' | 'results'

  const addRow    = () => setTransactions(t => [...t, { ...EMPTY_TX, _id: Date.now() }]);
  const removeRow = (id) => setTransactions(t => t.filter(r => r._id !== id));
  const updateRow = (id, key, val) => setTransactions(t => t.map(r => r._id===id ? {...r,[key]:val} : r));

  const loadDemo = () => {
    setTransactions(DEMO_BATCH.map((d,i) => ({ ...d, _id: Date.now()+i })));
    setResult(null); setError('');
  };

  const onSubmit = async () => {
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = transactions.map(tx => {
        const t = { ...tx };
        delete t._id;
        ['amt','hour','day_of_week','month','is_night','age','distance_km','gender','city_pop','state','job','merchant','avg_amt_card','amt_deviation','tx_count_card'].forEach(k => { t[k] = parseFloat(t[k]) || 0; });
        return t;
      });
      const r = await api.predictBatch(payload);
      setResult(r);
      setView('results');
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
            Analyse Batch
          </h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Soumettez jusqu'à <strong style={{color:'#60a5fa'}}>10 000 transactions</strong> en une seule requête
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={loadDemo} style={{ fontSize:13 }}><i class="fas fa-bolt" style={{marginRight:6}}></i> Charger 3 exemples</button>
          {result && (
            <button className="btn-secondary" onClick={() => setView(v => v==='form'?'results':'form')} style={{ fontSize:13 }}>
              {view==='form' ? <><i class="fas fa-chart-column" style={{marginRight:6}}></i> Voir résultats</> : <><i class="fas fa-pen-to-square" style={{marginRight:6}}></i> Modifier</>}
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Transactions à analyser', value: transactions.length, color:'#60a5fa' },
          { label:'Fraudes détectées',        value: result?.summary?.total_fraud ?? '—',       color:'#f87171' },
          { label:'Légitimes',                value: result?.summary?.total_legitimate ?? '—', color:'#34d399' },
          { label:'Taux de fraude',           value: result?.summary?.fraud_rate_pct != null ? `${result.summary.fraud_rate_pct}%` : '—', color:'#fbbf24' },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{ padding:'14px 18px' }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* FORM VIEW */}
      {view === 'form' && (
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
              Tableau des Transactions ({transactions.length})
            </h3>
            <button className="btn-primary" onClick={addRow} style={{ fontSize:12, padding:'7px 14px' }}>
              + Ajouter une ligne
            </button>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:1100 }}>
              <thead>
                <tr>
                  {['#','Montant','Heure','Jour','Mois','Nuit','Âge','Dist.km','Genre','Pop.','Catégorie','State','Job','Merchant','MoyCart','Écart','NbTx',''].map((h,i) => (
                    <th key={i} style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.08em', padding:'10px 8px', borderBottom:'1px solid var(--border)', textAlign:'left', background:'var(--bg-surface)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr key={tx._id}>
                    <td style={{ padding:'6px 8px', color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>{idx+1}</td>
                    {['amt','hour','day_of_week','month','is_night','age','distance_km','gender','city_pop'].map(k => (
                      <td key={k} style={{ padding:'4px 6px' }}>
                        <input className="input-field" type="number" value={tx[k]} onChange={e=>updateRow(tx._id,k,e.target.value)} style={{ minWidth:64, padding:'6px 8px', fontSize:12 }} />
                      </td>
                    ))}
                    <td style={{ padding:'4px 6px' }}>
                      <select className="input-field" value={tx.category} onChange={e=>updateRow(tx._id,'category',e.target.value)} style={{ minWidth:120, padding:'6px 8px', fontSize:12 }}>
                        {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    {['state','job','merchant','avg_amt_card','amt_deviation','tx_count_card'].map(k => (
                      <td key={k} style={{ padding:'4px 6px' }}>
                        <input className="input-field" type="number" value={tx[k]} onChange={e=>updateRow(tx._id,k,e.target.value)} style={{ minWidth:64, padding:'6px 8px', fontSize:12 }} />
                      </td>
                    ))}
                    <td style={{ padding:'4px 8px' }}>
                      <button onClick={()=>removeRow(tx._id)} style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#f87171', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:12 }}><i class="fas fa-xmark"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:13 }}>
              <i class="fas fa-triangle-exclamation" style={{marginRight:6}}></i> {error}
            </div>
          )}

          <div style={{ display:'flex', gap:12, marginTop:20 }}>
            <button className="btn-primary" onClick={onSubmit} disabled={loading} style={{ flex:1, padding:'13px', fontSize:15 }}>
              {loading ? <><Spinner /> Analyse en cours...</> : <><i class="fas fa-magnifying-glass" style={{marginRight:8}}></i> Analyser {transactions.length} transaction(s)</>}
            </button>
            <button className="btn-secondary" onClick={() => { setTransactions([{...EMPTY_TX,_id:Date.now()}]); setResult(null); }}>
              <i class="fas fa-xmark" style={{marginRight:6}}></i> Vider
            </button>
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {view === 'results' && result && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* Summary */}
          <div className="stat-card" style={{ background:'linear-gradient(135deg, rgba(17,24,39,0.9), rgba(13,20,34,0.9))', borderColor:'rgba(37,99,235,0.2)' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--text-primary)', marginBottom:16 }}>
              <i class="fas fa-chart-column" style={{marginRight:8, color:'#60a5fa'}}></i> Résumé de l'analyse
            </h3>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
              <Metric label="Total analysé"  value={result.summary.total_transactions} color="#60a5fa" />
              <Metric label="Fraudes"        value={result.summary.total_fraud}        color="#f87171" />
              <Metric label="Légitimes"      value={result.summary.total_legitimate}   color="#34d399" />
              <Metric label="Taux fraude"    value={`${result.summary.fraud_rate_pct}%`} color="#fbbf24" />
              <Metric label="Temps traitement" value={`${result.summary.processing_time_s}s`} color="#a78bfa" />
            </div>
          </div>

          {/* Results table */}
          <div className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                Résultats détaillés
              </h3>
              <ExportBtn data={result.results} filename="batch_results" />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>#</th><th>Montant</th><th>Catégorie</th><th>Heure</th><th>Distance</th>
                  <th>Probabilité</th><th>Risque</th><th>Verdict</th>
                </tr></thead>
                <tbody>
                  {result.results.map((r,i) => (
                    <tr key={i}>
                      <td>{i+1}</td>
                      <td style={{ color:'var(--text-primary)', fontWeight:600 }}>{r.transaction?.amt} MAD</td>
                      <td>{r.transaction?.category?.replace(/_/g,' ')}</td>
                      <td>{r.transaction?.hour}h</td>
                      <td>{r.transaction?.distance_km} km</td>
                      <td>
                        <ProbBar pct={r.fraud_probability_pct} />
                      </td>
                      <td><RiskBadge level={r.risk_level} /></td>
                      <td><VerdictBadge isFraud={r.is_fraud} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color }}>{value}</div>
    </div>
  );
}

function ProbBar({ pct }) {
  const color = pct > 60 ? '#ef4444' : pct > 30 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3, transition:'width 0.5s' }} />
      </div>
      <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color, minWidth:36 }}>{pct}%</span>
    </div>
  );
}

function RiskBadge({ level }) {
  const map = { 'Élevé':['badge-high','fa-circle'], 'Modéré':['badge-medium','fa-circle'], 'Faible':['badge-low','fa-circle'] };
  const [cls, icon] = map[level] || ['badge-low','fa-circle'];
  const iconColor = level==='Élevé'?'#ef4444':level==='Modéré'?'#f59e0b':'#10b981';
  return <span className={cls} style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)' }}>
    <i class={`fas ${icon}`} style={{ marginRight:5, fontSize:8, color:iconColor }}></i> {level}
  </span>;
}

function VerdictBadge({ isFraud }) {
  return isFraud
    ? <span className="badge-fraud" style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)' }}><i class="fas fa-bell" style={{marginRight:5}}></i> Fraude</span>
    : <span className="badge-legit" style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)' }}><i class="fas fa-circle-check" style={{marginRight:5}}></i> Légit.</span>;
}

function ExportBtn({ data, filename }) {
  const exportCSV = () => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows    = data.map(r => Object.values(r).map(v => typeof v==='object'?JSON.stringify(v):v).join(','));
    const csv     = [headers, ...rows].join('\n');
    const blob    = new Blob([csv], { type:'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `${filename}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="btn-secondary" onClick={exportCSV} style={{ fontSize:12, padding:'7px 14px' }}>
      <i class="fas fa-download" style={{marginRight:6}}></i> Exporter CSV
    </button>
  );
}

function Spinner() { return <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', verticalAlign:'middle', marginRight:8 }} />; }
