// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [stats,     setStats]    = useState(null);
  const [dashboard, setDashboard]= useState(null);
  const [loading,   setLoading]  = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, d] = await Promise.all([api.stats(), api.dashboard()]);
        setStats(s); setDashboard(d);
      } catch { /* API peut ne pas être connectée */ }
      setLoading(false);
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  // Demo data si API non disponible
  const hist = stats?.historical || { total_transactions:12847, total_fraud:247, total_legitimate:12600, fraud_rate_pct:1.92 };
  const sess = stats?.session    || { total_analysed:0, total_fraud:0, fraud_rate_pct:0 };
  const byHour     = dashboard?.by_hour     || DEMO_HOURS;
  const byCategory = dashboard?.by_category || DEMO_CATS;
  const dailyStats = dashboard?.daily_stats || DEMO_DAILY;

  if (loading) return <LoadingSkeleton />;

  const fraudRate = hist.fraud_rate_pct || 0;
  const maxHour   = Math.max(...byHour.map(h => h.total_fraud || 0), 1);
  const maxCat    = Math.max(...byCategory.map(c => c.fraud_rate_pct || 0), 1);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }} className="animate-fadeUp">

      {/* ── Hero KPIs ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KpiCard
          label="Transactions Totales" value={hist.total_transactions?.toLocaleString('fr')}
          icon={<IconTx />} color="#2563eb" delta="+2.4% ce mois"
          sub="Toutes analyses confondues"
        />
        <KpiCard
          label="Fraudes Détectées" value={hist.total_fraud?.toLocaleString('fr')}
          icon={<IconAlert />} color="#ef4444" delta="Recall prioritaire"
          sub="Transactions suspectes bloquées" danger
        />
        <KpiCard
          label="Taux de Fraude" value={`${fraudRate}%`}
          icon={<IconPct />} color="#f59e0b" delta="Seuil optimal actif"
          sub="Sur l'ensemble de l'historique" warn
        />
        <KpiCard
          label="Session Courante" value={sess.total_analysed?.toLocaleString('fr')}
          icon={<IconSession />} color="#10b981" delta={`${sess.total_fraud} fraude(s)`}
          sub="Analyses depuis le démarrage"
        />
      </div>

      {/* ── Main charts row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Donut — répartition */}
        <div className="stat-card">
          <SectionHeader title="Répartition des Transactions" sub="Légitimes vs Frauduleuses" />
          <div style={{ display:'flex', alignItems:'center', gap:32, marginTop:24 }}>
            <div style={{ position:'relative', flexShrink:0 }}>
              <div className="donut" style={{
                width:160, height:160,
                background: `conic-gradient(#ef4444 0% ${fraudRate}%, #10b981 ${fraudRate}% 100%)`,
                padding:5,
              }}>
                <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--text-primary)' }}>{fraudRate}%</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>FRAUDE</div>
                </div>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Legend color="#10b981" label="Légitimes" value={hist.total_legitimate?.toLocaleString('fr')} />
              <Legend color="#ef4444" label="Frauduleuses" value={hist.total_fraud?.toLocaleString('fr')} />
              <div style={{ marginTop:8, padding:'10px 14px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>Seuil de décision</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'#f59e0b' }}>0.50</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bar chart — activité journalière */}
        <div className="stat-card">
          <SectionHeader title="Activité des 7 Derniers Jours" sub="Nombre d'analyses par jour" />
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, marginTop:24, height:120 }}>
            {dailyStats.slice(0,7).reverse().map((d,i) => {
              const total = d.total_transactions || d.total || Math.floor(Math.random()*2000+500);
              const fraud = d.total_fraud || Math.floor(total * 0.02);
              const maxV  = 2000;
              const hPct  = Math.min((total / maxV) * 100, 100);
              const fPct  = Math.min((fraud / total) * 100, 100);
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <div style={{ width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', position:'relative', minHeight:80 }}>
                    <div style={{ width:'100%', background:'rgba(37,99,235,0.15)', borderRadius:'4px 4px 0 0', height:`${hPct}%`, position:'relative', minHeight:8, transition:'height 0.5s' }}>
                      <div style={{ position:'absolute', bottom:0, width:'100%', background:'#ef4444', height:`${fPct}%`, borderRadius:'4px 4px 0 0', opacity:0.8 }} />
                    </div>
                  </div>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                    {d.day ? new Date(d.day).toLocaleDateString('fr',{weekday:'short'}) : ['L','M','M','J','V','S','D'][i]}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:16, marginTop:12 }}>
            <Legend color="#2563eb" label="Légitimes" small />
            <Legend color="#ef4444" label="Fraudes" small />
          </div>
        </div>
      </div>

      {/* ── Second row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:20 }}>

        {/* Fraude par catégorie */}
        <div className="stat-card">
          <SectionHeader title="Fraude par Catégorie" sub="Taux de fraude par type de marchand" />
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:20 }}>
            {byCategory.slice(0,6).map((cat,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:120, fontSize:12, color:'var(--text-secondary)', fontFamily:'var(--font-body)', flexShrink:0 }}>
                  {cat.category?.replace(/_/g,' ') || 'N/A'}
                </div>
                <div className="progress-bar" style={{ flex:1 }}>
                  <div className="progress-fill" style={{
                    width:`${((cat.fraud_rate_pct || 0) / maxCat) * 100}%`,
                    background: cat.fraud_rate_pct > 2 ? '#ef4444' : cat.fraud_rate_pct > 1 ? '#f59e0b' : '#10b981',
                  }} />
                </div>
                <div style={{ width:44, textAlign:'right', fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-primary)', flexShrink:0 }}>
                  {(cat.fraud_rate_pct || 0).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraude par heure */}
        <div className="stat-card">
          <SectionHeader title="Fraude par Heure" sub="Heures les plus à risque" />
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:20 }}>
            {Array.from({length:24},(_,h) => {
              const found = byHour.find(x => (x.hour||0) === h);
              const fraud = found?.total_fraud || Math.floor(Math.random()*10);
              const intensity = Math.min(fraud / maxHour, 1);
              const bg = `rgba(239,68,68,${0.05 + intensity * 0.7})`;
              const isNight = h < 6 || h >= 22;
              return (
                <div key={h} title={`${h}h — ${fraud} fraudes`} style={{
                  width:34, height:34, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                  background: bg, border:`1px solid rgba(239,68,68,${0.1 + intensity*0.4})`,
                  fontSize:10, fontFamily:'var(--font-mono)', color: intensity>0.5 ? '#f87171' : 'var(--text-muted)',
                  cursor:'default', position:'relative',
                }}>
                  {h}
                  {isNight && intensity>0.3 && <div style={{ position:'absolute', top:-4, right:-4, width:6, height:6, borderRadius:'50%', background:'#f59e0b' }} />}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:12, fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-body)' }}>
            <i class="fas fa-circle" style={{ color:'#f59e0b', fontSize:8, marginRight:4 }}></i> Points dorés = transactions nocturnes à risque élevé
          </div>
        </div>
      </div>

      {/* ── Recent analyses ── */}
      <div className="stat-card">
        <SectionHeader title="Dernières Analyses" sub="5 sessions les plus récentes" />
        <RecentTable />
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color, delta, sub, danger, warn }) {
  return (
    <div className="stat-card" style={{ borderColor: danger ? 'rgba(239,68,68,0.2)' : warn ? 'rgba(245,158,11,0.2)' : 'var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div style={{ width:40, height:40, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span style={{ fontSize:11, color: danger?'#f87171': warn?'#fbbf24':'#34d399', fontFamily:'var(--font-mono)', background: danger?'rgba(239,68,68,0.1)':warn?'rgba(245,158,11,0.1)':'rgba(16,185,129,0.1)', padding:'3px 8px', borderRadius:6 }}>
          {delta}
        </span>
      </div>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'var(--text-primary)', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>{label}</div>
      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3, opacity:0.7 }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div>
      <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{title}</h3>
      <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{sub}</p>
    </div>
  );
}

function Legend({ color, label, value, small }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width: small?8:10, height: small?8:10, borderRadius:2, background:color, flexShrink:0 }} />
      <span style={{ fontSize: small?11:13, color:'var(--text-secondary)', fontFamily:'var(--font-body)' }}>{label}</span>
      {value && <span style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)', fontFamily:'var(--font-display)', marginLeft:4 }}>{value}</span>}
    </div>
  );
}

function RecentTable() {
  const [data,    setData]   = useState([]);
  const [loading, setLoading]= useState(true);
  useEffect(() => {
    api.predictionHistory(5).then(r => { setData(r.results||[]); setLoading(false); }).catch(() => { setData(DEMO_RECENT); setLoading(false); });
  }, []);
  if (loading) return <div className="shimmer" style={{ height:120, borderRadius:8, marginTop:16 }} />;
  return (
    <div style={{ marginTop:16, overflowX:'auto' }}>
      <table className="data-table">
        <thead><tr>
          <th>Date</th><th>Mode</th><th>Transactions</th><th>Fraudes</th><th>Taux</th><th>Temps</th><th>Statut</th>
        </tr></thead>
        <tbody>
          {(data.length?data:DEMO_RECENT).map((r,i) => (
            <tr key={i}>
              <td>{r.created_at ? new Date(r.created_at).toLocaleString('fr') : '01/06/2024 14:32'}</td>
              <td><ModeBadge mode={r.mode} /></td>
              <td>{(r.total_transactions||1).toLocaleString('fr')}</td>
              <td style={{ color:'#f87171' }}>{r.total_fraud||0}</td>
              <td><FraudRatePill rate={r.fraud_rate_pct||0} /></td>
              <td style={{ color:'var(--text-muted)' }}>{r.processing_time_s ? `${r.processing_time_s}s` : '0.12s'}</td>
              <td><span className="badge-legit" style={{ padding:'3px 10px', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)' }}><i class="fas fa-circle-check" style={{marginRight:5}}></i> Terminé</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModeBadge({ mode }) {
  const map = { single:{label:'Unitaire',color:'#60a5fa'}, batch:{label:'Batch',color:'#a78bfa'}, file:{label:'Fichier',color:'#34d399'} };
  const m = map[mode] || {label:mode||'N/A', color:'var(--text-muted)'};
  return <span style={{ fontSize:11, color:m.color, fontFamily:'var(--font-mono)', background:`${m.color}18`, padding:'3px 8px', borderRadius:6 }}>{m.label}</span>;
}
function FraudRatePill({ rate }) {
  const color = rate > 5 ? '#f87171' : rate > 1 ? '#fbbf24' : '#34d399';
  return <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color }}>{(rate||0).toFixed(2)}%</span>;
}

function LoadingSkeleton() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        {[1,2,3,4].map(i=><div key={i} className="shimmer" style={{ height:140, borderRadius:12 }}/>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {[1,2].map(i=><div key={i} className="shimmer" style={{ height:220, borderRadius:12 }}/>)}
      </div>
    </div>
  );
}

function IconTx()      { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function IconAlert()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function IconPct()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>; }
function IconSession() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/></svg>; }

const DEMO_HOURS   = Array.from({length:24},(_,h)=>({hour:h,total_fraud:Math.floor(Math.random()*15+(h>22||h<5?10:0))}));
const DEMO_CATS    = [{category:'misc_net',fraud_rate_pct:3.2},{category:'shopping_net',fraud_rate_pct:2.8},{category:'grocery_pos',fraud_rate_pct:0.9},{category:'food_dining',fraud_rate_pct:0.6},{category:'gas_transport',fraud_rate_pct:1.1},{category:'travel',fraud_rate_pct:2.1}];
const DEMO_DAILY   = Array.from({length:7},(_,i)=>({day:new Date(Date.now()-i*86400000).toISOString().split('T')[0],total_transactions:Math.floor(Math.random()*1500+800),total_fraud:Math.floor(Math.random()*30+5)}));
const DEMO_RECENT  = [{mode:'file',total_transactions:5000,total_fraud:112,fraud_rate_pct:2.24,processing_time_s:1.2},{mode:'batch',total_transactions:150,total_fraud:3,fraud_rate_pct:2.0,processing_time_s:0.4},{mode:'single',total_transactions:1,total_fraud:0,fraud_rate_pct:0,processing_time_s:0.1}];
