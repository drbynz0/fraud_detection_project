// src/pages/BSMFilePredict.jsx
import { useState, useRef } from 'react';
import { api } from '../services/api';

const REQUIRED_COLS = [
  "typing_speed_ms", "typing_regularity", "copy_paste_detected", "mouse_movement_entropy",
  "time_on_page_sec", "field_focus_changes", "form_fill_duration_ms", "tab_switches",
  "scroll_events", "is_new_device", "device_fingerprint_match", "ip_country_match",
  "ip_is_vpn_proxy", "time_since_last_login_min", "login_failed_attempts", "session_age_sec",
  "is_mobile_desktop_mismatch", "is_new_beneficiary", "amt_vs_avg_ratio",
  "transactions_last_hour", "is_international", "hour_of_day", "is_weekend"
];

export default function BSMFilePredict() {
  const [file,    setFile]    = useState(null);
  const [drag,    setDrag]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [page,    setPage]    = useState(0);
  const inputRef = useRef();
  const PAGE_SIZE = 20;

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) pickFile(f);
  };
  const pickFile = (f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    if (!['csv','xlsx','xls'].includes(ext)) { setError('Format non supporté. Utilisez .csv ou .xlsx'); return; }
    setFile(f); setError(''); setResult(null);
  };

  const onSubmit = async () => {
    if (!file) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await api.bsmPredictFile(file);
      setResult(r); setPage(0);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const exportResults = () => {
    if (!result?.results?.length) return;
    const headers = "index,decision,risk_score_pct";
    const rows    = result.results.map(r => `${r.index},${r.decision},${r.risk_score}`);
    const csv     = [headers, ...rows].join('\n');
    const blob    = new Blob([csv], {type:'text/csv'});
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `bsm_results_${file?.name?.replace(/\.[^.]+$/,'')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pageData    = result?.results?.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE) || [];
  const totalPages  = Math.ceil((result?.results?.length || 0) / PAGE_SIZE);

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      {/* Header */}
      <div>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <div style={{ padding:'4px 10px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', color:'#a78bfa' }}>
            MODULE B — BSM
          </div>
        </div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
          Import & Analyse BSM (Batch)
        </h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          Analysez un fichier de sessions comportementales avec le modèle <strong style={{color:'#a78bfa'}}>XGBoost</strong>
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 2fr' : '1fr', gap:20 }}>
        
        {/* Left column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div
            className={`upload-zone ${drag?'drag-over':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            onClick={()=>inputRef.current?.click()}
            style={{ borderColor: file ? '#a78bfa' : undefined }}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={e=>e.target.files[0]&&pickFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize:36, marginBottom:10, color:'#a78bfa' }}>📄</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#a78bfa', marginBottom:6 }}>{file.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                  {(file.size/1024).toFixed(1)} KB · {file.name.split('.').pop().toUpperCase()}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:42, marginBottom:14, opacity:0.5 }}>📁</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:8 }}>
                  Glissez votre fichier BSM ici
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)' }}>ou cliquez pour parcourir</div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn-primary" onClick={onSubmit} disabled={!file || loading} style={{ padding:'13px', fontSize:15, opacity:(!file||loading)?0.6:1, background:'var(--bsm-gradient)' }}>
            {loading ? <><Spinner /> Analyse BSM...</> : '🚀 Lancer l\'analyse batch'}
          </button>

          {/* Guide des colonnes */}
          <div className="stat-card" style={{ padding:'16px 20px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:12 }}>
              📊 Colonnes BSM requises ({REQUIRED_COLS.length})
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {REQUIRED_COLS.map(c=>(
                <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#a78bfa', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', padding:'2px 6px', borderRadius:4 }}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Results */}
        {result && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {[
                { label:'Total',      value:result.summary.total_sessions, color:'#a78bfa' },
                { label:'Bloquées',   value:result.summary.decisions.Bloquer || 0, color:'#ef4444' },
                { label:'Challengées',value:result.summary.decisions.Challenger || 0, color:'#fbbf24' },
                { label:'Traitement', value:`${result.summary.processing_time_s}s`, color:'var(--text-muted)' },
              ].map((s,i)=>(
                <div key={i} className="stat-card" style={{ padding:'12px 16px' }}>
                  <div style={{ fontSize:9, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="stat-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                  Résultats détaillés
                </h3>
                <button className="btn-secondary" onClick={exportResults} style={{ fontSize:12 }}>
                  📥 Exporter CSV
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>Index</th><th>Décision</th><th>Score Risque</th><th>Probabilité BSM</th>
                  </tr></thead>
                  <tbody>
                    {pageData.map((r,i)=>(
                      <tr key={i}>
                        <td style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>#{r.index}</td>
                        <td>
                          <span className={`badge-${r.decision==='Approuver'?'legit':r.decision==='Challenger'?'medium':'fraud'}`} style={{ padding:'3px 8px', borderRadius:6, fontSize:11 }}>
                            {r.icon} {r.decision}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', minWidth:80 }}>
                              <div style={{ height:'100%', width:`${r.risk_score}%`, background:r.risk_score>70?'#ef4444':r.risk_score>30?'#fbbf24':'#10b981' }} />
                            </div>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:12 }}>{r.risk_score}%</span>
                          </div>
                        </td>
                        <td style={{ fontFamily:'var(--font-mono)', fontSize:12, color:r.risk_score>50?'#f87171':'var(--text-secondary)' }}>
                          {r.risk_score.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:16 }}>
                  <button className="btn-secondary" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0}>‹</button>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>{page+1} / {totalPages}</span>
                  <button className="btn-secondary" onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}>›</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() { return <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', verticalAlign:'middle', marginRight:8 }} />; }
