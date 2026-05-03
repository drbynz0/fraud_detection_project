// src/pages/History.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PAGE_SIZE = 15;

export default function History() {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [page,      setPage]      = useState(0);
  const [total,     setTotal]     = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [details,   setDetails]   = useState(null);
  const [detLoading,setDetLoading]= useState(false);
  const [filter,    setFilter]    = useState('all'); // all | single | batch | file
  const [search,    setSearch]    = useState('');

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const r = await api.predictionHistory(PAGE_SIZE, p * PAGE_SIZE);
      setSessions(r.results || DEMO_SESSIONS);
      setTotal(r.count || DEMO_SESSIONS.length);
    } catch {
      setSessions(DEMO_SESSIONS);
      setTotal(DEMO_SESSIONS.length);
    }
    setLoading(false);
  };

  useEffect(() => { load(page); }, [page]);

  const openDetails = async (session) => {
    setSelected(session);
    setDetails(null);
    setDetLoading(true);
    try {
      const r = await api.predictionDetails(session.id);
      setDetails(r.details || []);
    } catch {
      setDetails(DEMO_DETAILS);
    }
    setDetLoading(false);
  };

  const filtered = sessions.filter(s => {
    if (filter !== 'all' && s.mode !== filter) return false;
    if (search && !s.id?.includes(search) && !s.mode?.includes(search) && !s.filename?.includes(search)) return false;
    return true;
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
            Historique des Analyses
          </h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Toutes les sessions d'analyse enregistrées dans Supabase
          </p>
        </div>
        <button className="btn-secondary" onClick={() => load(page)} style={{ fontSize:13 }}>
          <i class="fas fa-rotate" style={{marginRight:6}}></i> Actualiser
        </button>
      </div>

      {/* Global stats */}
      <GlobalStats sessions={sessions} />

      {/* Filters + search */}
      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
        <div style={{ flex:1, position:'relative' }}>
          <input
            className="input-field"
            placeholder="Rechercher par ID, fichier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft:36 }}
          />
          <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }}><i class="fas fa-magnifying-glass"></i></span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {['all','single','batch','file'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter===f ? 'btn-primary' : 'btn-secondary'}
              style={{ fontSize:12, padding:'8px 14px' }}
            >
              {f==='all' ? 'Tous' : f==='single' ? 'Unitaire' : f==='batch' ? 'Batch' : 'Fichier'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:20 }}>

        {/* Sessions table */}
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
              Sessions ({total.toLocaleString('fr')})
            </h3>
            <ExportCSV data={sessions} filename="historique_sessions" />
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height:56, borderRadius:8 }} />)}
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Date</th>
                  <th>Mode</th>
                  <th>Total</th>
                  <th>Fraudes</th>
                  <th>Taux</th>
                  <th>Durée</th>
                  <th></th>
                </tr></thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr
                      key={i}
                      onClick={() => openDetails(s)}
                      style={{
                        cursor:'pointer',
                        background: selected?.id === s.id ? 'rgba(37,99,235,0.1)' : '',
                        borderLeft: selected?.id === s.id ? '2px solid #2563eb' : '2px solid transparent',
                      }}
                    >
                      <td style={{ whiteSpace:'nowrap' }}>
                        {s.created_at
                          ? new Date(s.created_at).toLocaleString('fr', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
                          : '01 Jun 14:32'}
                      </td>
                      <td><ModeBadge mode={s.mode} /></td>
                      <td style={{ color:'var(--text-primary)', fontWeight:600 }}>
                        {(s.total_transactions||1).toLocaleString('fr')}
                      </td>
                      <td style={{ color: s.total_fraud > 0 ? '#f87171' : '#34d399', fontWeight:600 }}>
                        {s.total_fraud||0}
                      </td>
                      <td>
                        <FraudRatePill rate={s.fraud_rate_pct || 0} />
                      </td>
                      <td style={{ color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:12 }}>
                        {s.processing_time_s ? `${s.processing_time_s}s` : '—'}
                      </td>
                      <td>
                        <button
                          onClick={e => { e.stopPropagation(); openDetails(s); }}
                          style={{ background:'rgba(37,99,235,0.15)', border:'1px solid rgba(37,99,235,0.3)', color:'#60a5fa', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11, fontFamily:'var(--font-mono)' }}
                        >
                          Détails <i class="fas fa-arrow-right" style={{marginLeft:4}}></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}><i class="fas fa-inbox"></i></div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:14 }}>Aucun résultat trouvé</div>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:16 }}>
              <button className="btn-secondary" onClick={() => setPage(0)} disabled={page===0} style={{ fontSize:12, padding:'6px 10px' }}>«</button>
              <button className="btn-secondary" onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} style={{ fontSize:12, padding:'6px 12px' }}>‹</button>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', padding:'0 10px' }}>
                {page+1} / {totalPages}
              </span>
              <button className="btn-secondary" onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 12px' }}>›</button>
              <button className="btn-secondary" onClick={() => setPage(totalPages-1)} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 10px' }}>»</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="stat-card" style={{ animation:'fadeUp 0.3s ease forwards' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                  Détail de la session
                </h3>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)', marginTop:4 }}>
                  ID: {selected.id || 'demo-session'}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setDetails(null); }}
                style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, lineHeight:1 }}
              >×</button>
            </div>

            {/* Session summary */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              {[
                ['Mode',        <ModeBadge mode={selected.mode} />],
                ['Transactions', (selected.total_transactions||1).toLocaleString('fr')],
                ['Fraudes',     <span style={{color:'#f87171',fontWeight:700}}>{selected.total_fraud||0}</span>],
                ['Légitimes',   <span style={{color:'#34d399',fontWeight:700}}>{selected.total_legitimate||0}</span>],
                ['Taux fraude', `${selected.fraud_rate_pct||0}%`],
                ['Durée',       selected.processing_time_s ? `${selected.processing_time_s}s` : '—'],
                ['Date',        selected.created_at ? new Date(selected.created_at).toLocaleString('fr') : '—'],
                ['Version ML',  selected.model_version || 'v1.0'],
              ].map(([k,v],i) => (
                <div key={i} style={{ padding:'10px 12px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{k.toUpperCase()}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:13, color:'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Transactions detail */}
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:12 }}>
                Transactions ({details?.length || 0})
              </div>

              {detLoading ? (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:44, borderRadius:8 }} />)}
                </div>
              ) : (
                <div style={{ maxHeight:340, overflowY:'auto' }}>
                  <table className="data-table">
                    <thead><tr>
                      <th>#</th><th>Montant</th><th>Catégorie</th><th>Prob.</th><th>Verdict</th>
                    </tr></thead>
                    <tbody>
                      {(details||[]).map((d,i) => (
                        <tr key={i}>
                          <td style={{ fontSize:11 }}>{i+1}</td>
                          <td style={{ color:'var(--text-primary)', fontWeight:600 }}>{d.amt} MAD</td>
                          <td style={{ fontSize:11 }}>{String(d.category||'').replace(/_/g,' ')}</td>
                          <td>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: d.fraud_probability_pct>60?'#f87171':d.fraud_probability_pct>30?'#fbbf24':'#34d399' }}>
                              {d.fraud_probability_pct}%
                            </span>
                          </td>
                          <td>
                            {d.is_fraud
                              ? <span className="badge-fraud" style={{ padding:'2px 7px', borderRadius:4, fontSize:10 }}><i class="fas fa-bell"></i></span>
                              : <span className="badge-legit" style={{ padding:'2px 7px', borderRadius:4, fontSize:10 }}><i class="fas fa-circle-check"></i></span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {details && <ExportCSV data={details} filename={`details_${selected.id?.slice(0,8)||'session'}`} style={{ marginTop:12 }} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobalStats({ sessions }) {
  const total    = sessions.reduce((a,s) => a+(s.total_transactions||0),0);
  const fraud    = sessions.reduce((a,s) => a+(s.total_fraud||0),0);
  const avgTime  = sessions.length ? (sessions.reduce((a,s)=>a+(s.processing_time_s||0),0)/sessions.length).toFixed(2) : 0;
  const rate     = total ? (fraud/total*100).toFixed(2) : 0;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
      {[
        { label:'Sessions totales',   value:sessions.length,             color:'#60a5fa', icon:'fa-clipboard-list' },
        { label:'Transactions totales',value:total.toLocaleString('fr'), color:'#a78bfa', icon:'fa-credit-card' },
        { label:'Fraudes historiques', value:fraud.toLocaleString('fr'), color:'#f87171', icon:'fa-bell' },
        { label:'Taux moyen',          value:`${rate}%`,                 color:'#fbbf24', icon:'fa-chart-pie' },
      ].map((s,i) => (
        <div key={i} className="stat-card" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:20, color:s.color }}><i class={`fas ${s.icon}`}></i></div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModeBadge({ mode }) {
  const map = {
    single: { label:'Unitaire', color:'#60a5fa' },
    batch:  { label:'Batch',    color:'#a78bfa' },
    file:   { label:'Fichier',  color:'#34d399' },
  };
  const m = map[mode] || { label: mode||'N/A', color:'var(--text-muted)' };
  return (
    <span style={{ fontSize:11, color:m.color, fontFamily:'var(--font-mono)', background:`${m.color}18`, border:`1px solid ${m.color}30`, padding:'3px 8px', borderRadius:6 }}>
      {m.label}
    </span>
  );
}

function FraudRatePill({ rate }) {
  const color = rate > 5 ? '#f87171' : rate > 1 ? '#fbbf24' : '#34d399';
  return <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color }}>{(+rate||0).toFixed(2)}%</span>;
}

function ExportCSV({ data, filename, style:s }) {
  const onClick = () => {
    if (!data?.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows    = data.map(r => Object.values(r).map(v => `"${v ?? ''}"`).join(','));
    const csv     = [headers, ...rows].join('\n');
    const blob    = new Blob([csv], { type:'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `${filename}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="btn-secondary" onClick={onClick} style={{ fontSize:12, padding:'7px 14px', ...s }}>
      <i class="fas fa-download" style={{marginRight:6}}></i> Exporter CSV
    </button>
  );
}

/* ── Demo data ── */
const DEMO_SESSIONS = Array.from({ length: 12 }, (_, i) => ({
  id:                 `demo-${i}-${Math.random().toString(36).slice(2,8)}`,
  created_at:         new Date(Date.now() - i * 3600000 * 4).toISOString(),
  mode:               ['single','batch','file'][i % 3],
  total_transactions: [1, 150, 5000][i % 3],
  total_fraud:        [0, 3, 112][i % 3],
  total_legitimate:   [1, 147, 4888][i % 3],
  fraud_rate_pct:     [0, 2.0, 2.24][i % 3],
  processing_time_s:  [0.1, 0.4, 1.2][i % 3],
  model_version:      '1.0',
  filename:           i % 3 === 2 ? 'transactions_juin.csv' : null,
}));

const DEMO_DETAILS = Array.from({ length: 10 }, (_, i) => ({
  amt:                    Math.floor(Math.random() * 1000 + 20),
  category:               ['grocery_pos','shopping_net','misc_net','food_dining'][i % 4],
  fraud_probability_pct:  +(Math.random() * 100).toFixed(2),
  is_fraud:               Math.random() > 0.8,
  verdict:                Math.random() > 0.8 ? 'FRAUDE' : 'Légitime',
  risk_level:             ['Faible','Modéré','Élevé'][Math.floor(Math.random()*3)],
}));
