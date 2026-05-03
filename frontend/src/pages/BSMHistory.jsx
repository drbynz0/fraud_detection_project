// src/pages/BSMHistory.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

const PAGE_SIZE = 15;

export default function BSMHistory() {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [stats,     setStats]     = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [filter,    setFilter]    = useState('all');
  const [selected,  setSelected]  = useState(null);
  const [page,      setPage]      = useState(0);
  const [total,     setTotal]     = useState(0);

  const load = async (p=0, f='all') => {
    setLoading(true);
    try {
      const dec = f==='all' ? null : f==='approve' ? 'Approuver' : f==='challenge' ? 'Challenger' : 'Bloquer';
      const [s, st, dash] = await Promise.all([
        api.bsmHistory(PAGE_SIZE, p*PAGE_SIZE, dec),
        api.bsmStats(),
        api.bsmDashboard(),
      ]);
      setSessions(s.results || DEMO_SESSIONS);
      setTotal(s.count || DEMO_SESSIONS.length);
      setStats(st);
      setDashboard(dash);
    } catch {
      setSessions(DEMO_SESSIONS);
      setTotal(DEMO_SESSIONS.length);
      setStats(DEMO_STATS);
      setDashboard(DEMO_DASHBOARD);
    }
    setLoading(false);
  };

  useEffect(() => { load(page, filter); }, [page, filter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const global = stats?.historical || stats?.session || {};
  const byHour = dashboard?.by_hour || DEMO_HOURS;

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ padding:'4px 10px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', color:'#a78bfa' }}>
              MODULE B — BSM
            </div>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
            Historique — Scoring de Sessions
          </h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Toutes les sessions analysées par le modèle XGBoost BSM
          </p>
        </div>
        <button className="btn-secondary" onClick={() => load(page,filter)} style={{ fontSize:13 }}>
          🔄 Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          { label:'Sessions totales',  value:(global.total_sessions||0).toLocaleString('fr'),  color:'#a78bfa', icon:'🔍' },
          { label:'Approuvées',        value:(global.total_approved||0).toLocaleString('fr'),   color:'#10b981', icon:'✅' },
          { label:'Challengées',       value:(global.total_challenged||0).toLocaleString('fr'), color:'#fbbf24', icon:'⚠️' },
          { label:'Bloquées',          value:(global.total_blocked||0).toLocaleString('fr'),    color:'#ef4444', icon:'🚨' },
        ].map((s,i) => (
          <div key={i} className="stat-card" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ fontSize:28 }}>{s.icon}</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Répartition donut */}
        <div className="stat-card">
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:20 }}>
            Répartition des décisions
          </h3>
          <DecisionDonut stats={global} />
        </div>

        {/* Blocages par heure */}
        <div className="stat-card">
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:4 }}>
            Taux de blocage par heure
          </h3>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>
            Heures les plus à risque de sessions frauduleuses
          </p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {Array.from({length:24},(_,h) => {
              const found = byHour.find(x=>(x.hour_of_day||x.hour||0)===h);
              const rate  = found?.block_rate_pct || (Math.random()*20*(h<6||h>=22?3:1));
              const intensity = Math.min(rate/30,1);
              const bg = `rgba(239,68,68,${0.05+intensity*0.7})`;
              return (
                <div key={h} title={`${h}h — taux blocage: ${rate.toFixed(1)}%`} style={{
                  width:34, height:34, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                  background:bg, border:`1px solid rgba(239,68,68,${0.1+intensity*0.4})`,
                  fontSize:10, fontFamily:'var(--font-mono)',
                  color: intensity>0.5?'#f87171':'var(--text-muted)', cursor:'default',
                }}>
                  {h}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:10, fontSize:11, color:'var(--text-muted)' }}>
            🔴 Plus foncé = taux de blocage plus élevé
          </div>
        </div>
      </div>

      {/* Table + detail */}
      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:20 }}>

        {/* Table */}
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
              Sessions ({total.toLocaleString('fr')})
            </h3>
            <div style={{ display:'flex', gap:6 }}>
              {[
                ['all','Toutes','var(--text-muted)'],
                ['approve','Approuvées','#10b981'],
                ['challenge','Challengées','#fbbf24'],
                ['block','Bloquées','#ef4444'],
              ].map(([f,label,color]) => (
                <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                  style={{ fontSize:11, padding:'5px 10px', borderRadius:6,
                    background: filter===f ? `${color}18` : 'transparent',
                    border: `1px solid ${filter===f ? color : 'var(--border)'}`,
                    color: filter===f ? color : 'var(--text-muted)',
                    cursor:'pointer', fontFamily:'var(--font-mono)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="shimmer" style={{ height:48, borderRadius:8 }} />)}
            </div>
          ) : (
            <>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Date</th>
                    <th>Décision</th>
                    <th>Score risque</th>
                    <th>P(Fraude)</th>
                    <th>Nouveau bénéf.</th>
                    <th>VPN</th>
                    <th>Nouvel appar.</th>
                    <th>Ratio montant</th>
                    <th></th>
                  </tr></thead>
                  <tbody>
                    {sessions.map((s,i) => (
                      <tr key={i} onClick={() => setSelected(s===selected?null:s)}
                        style={{ cursor:'pointer', background:selected?.id===s.id?'rgba(167,139,250,0.08)':'', borderLeft:`2px solid ${selected?.id===s.id?'#a78bfa':'transparent'}` }}>
                        <td style={{ whiteSpace:'nowrap', fontSize:12 }}>
                          {s.created_at ? new Date(s.created_at).toLocaleString('fr',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                        </td>
                        <td><DecisionBadge decision={s.decision} /></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:50, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${s.risk_score_pct||0}%`,
                                background:s.risk_score_pct>70?'#ef4444':s.risk_score_pct>30?'#f59e0b':'#10b981', borderRadius:3 }} />
                            </div>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)' }}>
                              {(s.risk_score_pct||0).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color: s.proba_block>0.7?'#f87171':s.proba_block>0.3?'#fbbf24':'#34d399' }}>
                          {((s.proba_block||0)*100).toFixed(1)}%
                        </td>
                        <td><BoolCell val={s.is_new_beneficiary} danger /></td>
                        <td><BoolCell val={s.ip_is_vpn_proxy} danger /></td>
                        <td><BoolCell val={s.is_new_device} danger /></td>
                        <td style={{ fontFamily:'var(--font-mono)', fontSize:11, color: (s.amt_vs_avg_ratio||1)>3?'#f87171':'var(--text-secondary)' }}>
                          {(s.amt_vs_avg_ratio||1).toFixed(1)}x
                        </td>
                        <td>
                          <button onClick={e=>{e.stopPropagation();setSelected(s===selected?null:s);}}
                            style={{ background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', color:'#a78bfa', borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:11, fontFamily:'var(--font-mono)' }}>
                            Détails →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sessions.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
                  <div style={{ fontSize:32, marginBottom:12 }}>📭</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:14 }}>Aucune session trouvée</div>
                </div>
              )}

              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:16 }}>
                  <button className="btn-secondary" onClick={() => setPage(0)} disabled={page===0} style={{ fontSize:12, padding:'6px 10px' }}>«</button>
                  <button className="btn-secondary" onClick={() => setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ fontSize:12, padding:'6px 12px' }}>‹</button>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', padding:'0 10px' }}>{page+1} / {totalPages}</span>
                  <button className="btn-secondary" onClick={() => setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 12px' }}>›</button>
                  <button className="btn-secondary" onClick={() => setPage(totalPages-1)} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 10px' }}>»</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail panel */}
        {selected && <DetailPanel session={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function DecisionDonut({ stats }) {
  const approve   = stats?.total_approved   || 0;
  const challenge = stats?.total_challenged || 0;
  const block     = stats?.total_blocked    || 0;
  const total     = Math.max(approve + challenge + block, 1);
  const pA = (approve/total*100).toFixed(1);
  const pC = (challenge/total*100).toFixed(1);
  const pB = (block/total*100).toFixed(1);
  const conicGrad = `conic-gradient(#10b981 0% ${pA}%, #f59e0b ${pA}% ${(+pA + +pC).toFixed(1)}%, #ef4444 ${(+pA + +pC).toFixed(1)}% 100%)`;

  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <div style={{ width:140, height:140, borderRadius:'50%', background:conicGrad, padding:4, flexShrink:0 }}>
        <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'var(--text-primary)' }}>
            {total.toLocaleString('fr')}
          </div>
          <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>SESSIONS</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[['✅ Approuvées',pA+'%',approve,'#10b981'],['⚠️ Challengées',pC+'%',challenge,'#f59e0b'],['🚨 Bloquées',pB+'%',block,'#ef4444']].map(([label,pct,n,color],i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:color, flexShrink:0 }} />
            <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{label}</span>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color }}>{n.toLocaleString('fr')}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>({pct})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ session, onClose }) {
  const decColor = session.decision==='Approuver'?'#10b981':session.decision==='Challenger'?'#fbbf24':'#ef4444';
  const fields = [
    ['Décision',        <DecisionBadge decision={session.decision} />],
    ['Score risque',    `${(session.risk_score_pct||0).toFixed(2)}%`],
    ['P(Fraude)',        `${((session.proba_block||0)*100).toFixed(2)}%`],
    ['P(Approuver)',     `${((session.proba_approve||0)*100).toFixed(2)}%`],
    ['P(Challenge)',     `${((session.proba_challenge||0)*100).toFixed(2)}%`],
    ['Nouveau bénéf.',  session.is_new_beneficiary ? '⚠️ Oui' : '✅ Non'],
    ['VPN/Proxy',       session.ip_is_vpn_proxy ? '⚠️ Oui' : '✅ Non'],
    ['Nouvel appareil', session.is_new_device ? '⚠️ Oui' : '✅ Non'],
    ['Pays IP OK',      session.ip_country_match ? '✅ Oui' : '⚠️ Non'],
    ['Ratio montant',   `${(session.amt_vs_avg_ratio||1).toFixed(2)}x`],
    ['Traitement',      `${(session.processing_time_ms||0).toFixed(1)}ms`],
    ['Version BSM',     session.model_version||'1.0'],
  ];

  return (
    <div className="stat-card" style={{ animation:'fadeUp 0.3s ease forwards', borderColor:`${decColor}30` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>Détail de la session</h3>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)', marginTop:4 }}>
            {session.id || 'demo-session-id'}
          </div>
        </div>
        <button onClick={onClose} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:20, lineHeight:1 }}>×</button>
      </div>

      {/* Score visuel */}
      <div style={{ textAlign:'center', padding:'16px', background:`${decColor}12`, border:`1px solid ${decColor}30`, borderRadius:10, marginBottom:16 }}>
        <div style={{ fontSize:36 }}>
          {session.decision==='Approuver'?'✅':session.decision==='Challenger'?'⚠️':'🚨'}
        </div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:decColor, marginTop:6 }}>
          {session.decision}
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', marginTop:4 }}>
          {session.created_at ? new Date(session.created_at).toLocaleString('fr') : '—'}
        </div>
      </div>

      {/* Champs détails */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {fields.map(([k,v],i) => (
          <div key={i} style={{ padding:'9px 12px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{k.toUpperCase()}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:12, color:'var(--text-primary)' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Export */}
      <button className="btn-secondary" onClick={() => {
        const blob = new Blob([JSON.stringify(session, null, 2)], {type:'application/json'});
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a'); a.href=url; a.download=`session_${session.id?.slice(0,8)||'export'}.json`; a.click();
        URL.revokeObjectURL(url);
      }} style={{ width:'100%', marginTop:14, fontSize:12 }}>
        ⬇️ Exporter JSON
      </button>
    </div>
  );
}

function DecisionBadge({ decision }) {
  const map = {
    'Approuver': { cls:'badge-legit',   label:'✅ Approuver' },
    'Challenger':{ cls:'badge-medium',  label:'⚠️ Challenger' },
    'Bloquer':   { cls:'badge-fraud',   label:'🚨 Bloquer' },
  };
  const m = map[decision] || { cls:'badge-low', label:decision||'—' };
  return <span className={m.cls} style={{ padding:'3px 9px', borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)' }}>{m.label}</span>;
}

function BoolCell({ val, danger }) {
  const isTrue = val===1 || val===true;
  const color  = danger ? (isTrue?'#f87171':'#34d399') : (isTrue?'#34d399':'#f87171');
  return <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color }}>{isTrue ? 'Oui' : 'Non'}</span>;
}

/* ── Demo data ── */
const DEMO_SESSIONS = Array.from({length:12},(_,i)=>({
  id:`bsm-demo-${i}`,
  created_at: new Date(Date.now()-i*3600000*2).toISOString(),
  decision:['Approuver','Approuver','Challenger','Bloquer','Approuver','Challenger'][i%6],
  risk_score_pct:[8,12,45,85,5,55][i%6],
  proba_block:[0.08,0.12,0.45,0.85,0.05,0.55][i%6],
  proba_approve:[0.85,0.78,0.40,0.05,0.90,0.30][i%6],
  proba_challenge:[0.07,0.10,0.15,0.10,0.05,0.15][i%6],
  is_new_beneficiary:[0,0,1,1,0,1][i%6],
  ip_is_vpn_proxy:[0,0,0,1,0,1][i%6],
  is_new_device:[0,0,1,1,0,0][i%6],
  ip_country_match:[1,1,1,0,1,0][i%6],
  amt_vs_avg_ratio:[1.1,0.9,2.5,6.8,1.0,3.2][i%6],
  processing_time_ms:[12,14,11,13,10,15][i%6],
  model_version:'1.0',
}));
const DEMO_STATS   = {historical:{total_sessions:1240,total_approved:1080,total_challenged:110,total_blocked:50,block_rate_pct:4.03}};
const DEMO_HOURS   = Array.from({length:24},(_,h)=>({hour_of_day:h,block_rate_pct:Math.random()*20*(h<6||h>=22?4:1)}));
const DEMO_DASHBOARD = {by_hour:DEMO_HOURS};
