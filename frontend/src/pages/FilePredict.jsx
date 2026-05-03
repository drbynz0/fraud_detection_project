// src/pages/FilePredict.jsx
import { useState, useRef } from 'react';
import { api } from '../services/api';

export default function FilePredict() {
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
      const r = await api.predictFile(file);
      setResult(r); setPage(0);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const exportResults = () => {
    if (!result?.results?.length) return;
    const cols    = ['amt','hour','category','fraud_probability_pct','is_fraud','verdict','risk_level'];
    const headers = cols.join(',');
    const rows    = result.results.map(r => cols.map(c => r[c] ?? '').join(','));
    const csv     = [headers, ...rows].join('\n');
    const blob    = new Blob([csv], {type:'text/csv'});
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `results_${file?.name?.replace(/\.[^.]+$/,'')}_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const pageData    = result?.results?.slice(page*PAGE_SIZE, (page+1)*PAGE_SIZE) || [];
  const totalPages  = Math.ceil((result?.results?.length || 0) / PAGE_SIZE);

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)' }}>
          Import & Analyse de Fichier
        </h2>
        <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
          Importez un fichier <strong style={{color:'#34d399'}}>.csv</strong> ou <strong style={{color:'#34d399'}}>.xlsx</strong> contenant jusqu'à <strong style={{color:'#60a5fa'}}>100 000 transactions</strong>
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 2fr' : '1fr', gap:20 }}>

        {/* Left: upload + info */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Drop zone */}
          <div
            className={`upload-zone ${drag?'drag-over':''}`}
            onDragOver={e=>{e.preventDefault();setDrag(true)}}
            onDragLeave={()=>setDrag(false)}
            onDrop={onDrop}
            onClick={()=>inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={e=>e.target.files[0]&&pickFile(e.target.files[0])} />
            {file ? (
              <div>
                <div style={{ fontSize:36, marginBottom:10, color:'#60a5fa' }}><i class="fas fa-file-lines"></i></div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#60a5fa', marginBottom:6 }}>{file.name}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                  {(file.size/1024).toFixed(1)} KB · {file.name.split('.').pop().toUpperCase()}
                </div>
                <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)' }}>Cliquez pour changer le fichier</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize:42, marginBottom:14, opacity:0.5, color:'var(--text-muted)' }}><i class="fas fa-folder-open"></i></div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:8 }}>
                  Glissez votre fichier ici
                </div>
                <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>ou cliquez pour parcourir</div>
                <div style={{ display:'flex', justifyContent:'center', gap:10 }}>
                  {['CSV','XLSX','XLS'].map(f=>(
                    <span key={f} style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', fontSize:11, fontFamily:'var(--font-mono)', color:'#60a5fa' }}>{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:13 }}>
              <i class="fas fa-triangle-exclamation" style={{marginRight:6}}></i> {error}
            </div>
          )}

          <button className="btn-primary" onClick={onSubmit} disabled={!file || loading} style={{ padding:'13px', fontSize:15, opacity:(!file||loading)?0.6:1 }}>
            {loading ? <><Spinner /> Analyse en cours...</> : <><i class="fas fa-magnifying-glass" style={{marginRight:8}}></i> Lancer l'analyse</>}
          </button>

          {loading && <ProgressAnim />}

          {/* Format guide */}
          <div className="stat-card" style={{ padding:'16px 20px' }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:12 }}>
              📋 Colonnes requises
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['amt','hour','day_of_week','month','is_night','age','distance_km','gender','city_pop','category','state','job','merchant','avg_amt_card','amt_deviation','tx_count_card'].map(c=>(
                <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#a78bfa', background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', padding:'3px 8px', borderRadius:4 }}>{c}</span>
              ))}
            </div>
            <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)', fontSize:12, color:'var(--text-muted)' }}>
              💡 Téléchargez le fichier <strong style={{color:'#60a5fa'}}>template_transactions.csv</strong> fourni avec l'API comme modèle.
            </div>
          </div>
        </div>

        {/* Right: results */}
        {result && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Summary cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[
                { label:'Total',      value:result.summary.total_transactions?.toLocaleString('fr'), color:'#60a5fa' },
                { label:'Fraudes',    value:result.summary.total_fraud?.toLocaleString('fr'),        color:'#f87171' },
                { label:'Légitimes',  value:result.summary.total_legitimate?.toLocaleString('fr'),   color:'#34d399' },
                { label:'Taux fraude',value:`${result.summary.fraud_rate_pct}%`,                     color:'#fbbf24' },
                { label:'Traitement', value:`${result.summary.processing_time_s}s`,                  color:'#a78bfa' },
                { label:'Fichier',    value:result.summary.filename,                                 color:'var(--text-secondary)' },
              ].map((s,i)=>(
                <div key={i} className="stat-card" style={{ padding:'12px 16px' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:i<5?20:13, color:s.color, wordBreak:'break-all' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Risk breakdown */}
            {result.summary.risk_breakdown && (
              <div className="stat-card" style={{ padding:'16px 20px' }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text-primary)', marginBottom:14 }}>
                  Répartition par niveau de risque
                </div>
                <div style={{ display:'flex', gap:16 }}>
                  {Object.entries(result.summary.risk_breakdown).map(([level, count]) => {
                    const color = level==='Élevé'?'#ef4444':level==='Modéré'?'#f59e0b':'#10b981';
                    const icon  = 'fa-circle';
                    const total = result.summary.total_transactions || 1;
                    return (
                      <div key={level} style={{ flex:1, padding:'12px', background:'var(--bg-surface)', borderRadius:10, border:`1px solid ${color}30` }}>
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:4 }}><i class={`fas ${icon}`} style={{ color, marginRight:5, fontSize:8 }}></i> {level.toUpperCase()}</div>
                        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color }}>{count?.toLocaleString('fr')}</div>
                        <div className="progress-bar" style={{ marginTop:8 }}>
                          <div className="progress-fill" style={{ width:`${(count/total*100).toFixed(1)}%`, background:color }} />
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:4 }}>
                          {(count/total*100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Table */}
            <div className="stat-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <div>
                  <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>
                    Résultats ({result.results?.length?.toLocaleString('fr')} transactions)
                  </h3>
                  <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>Page {page+1} / {totalPages}</p>
                </div>
                <button className="btn-secondary" onClick={exportResults} style={{ fontSize:12, padding:'7px 14px' }}>
                  <i class="fas fa-download" style={{marginRight:6}}></i> Exporter CSV
                </button>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table className="data-table">
                  <thead><tr>
                    <th>#</th><th>Montant</th><th>Heure</th><th>Catégorie</th>
                    <th>Probabilité</th><th>Risque</th><th>Verdict</th>
                  </tr></thead>
                  <tbody>
                    {pageData.map((r,i)=>(
                      <tr key={i}>
                        <td>{page*PAGE_SIZE+i+1}</td>
                        <td style={{ color:'var(--text-primary)', fontWeight:600 }}>{r.amt} MAD</td>
                        <td>{r.hour}h</td>
                        <td>{String(r.category||'').replace(/_/g,' ')}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ width:60, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${r.fraud_probability_pct}%`, background:r.fraud_probability_pct>60?'#ef4444':r.fraud_probability_pct>30?'#f59e0b':'#10b981', borderRadius:3 }} />
                            </div>
                            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)' }}>{r.fraud_probability_pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color: r.risk_level==='Élevé'?'#f87171':r.risk_level==='Modéré'?'#fbbf24':'#34d399' }}>
                            <i class="fas fa-circle" style={{ marginRight:5, fontSize:8, color: r.risk_level==='Élevé'?'#ef4444':r.risk_level==='Modéré'?'#f59e0b':'#10b981' }}></i> {r.risk_level}
                          </span>
                        </td>
                        <td>
                          {r.is_fraud
                            ? <span className="badge-fraud" style={{ padding:'3px 8px', borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)' }}><i class="fas fa-bell" style={{marginRight:4}}></i> Fraude</span>
                            : <span className="badge-legit" style={{ padding:'3px 8px', borderRadius:6, fontSize:10, fontFamily:'var(--font-mono)' }}><i class="fas fa-circle-check" style={{marginRight:4}}></i> Légit.</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginTop:16 }}>
                  <button className="btn-secondary" onClick={()=>setPage(0)} disabled={page===0} style={{ fontSize:12, padding:'6px 10px' }}>«</button>
                  <button className="btn-secondary" onClick={()=>setPage(p=>Math.max(0,p-1))} disabled={page===0} style={{ fontSize:12, padding:'6px 12px' }}>‹ Préc.</button>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', padding:'0 8px' }}>{page+1} / {totalPages}</span>
                  <button className="btn-secondary" onClick={()=>setPage(p=>Math.min(totalPages-1,p+1))} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 12px' }}>Suiv. ›</button>
                  <button className="btn-secondary" onClick={()=>setPage(totalPages-1)} disabled={page===totalPages-1} style={{ fontSize:12, padding:'6px 10px' }}>»</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressAnim() {
  const [step, setStep] = useState(0);
  const steps = ['Lecture du fichier...','Prétraitement des données...','Inférence MLP...','Calcul des résultats...'];
  useState(() => { const t = setInterval(()=>setStep(s=>(s+1)%steps.length),1200); return ()=>clearInterval(t); });
  return (
    <div style={{ padding:'16px', background:'var(--bg-surface)', borderRadius:10, border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <Spinner />
        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'#60a5fa' }}>{steps[step]}</div>
      </div>
      <div className="progress-bar" style={{ marginTop:10 }}>
        <div className="progress-fill" style={{ width:`${(step+1)/steps.length*100}%`, background:'linear-gradient(90deg, #1d4ed8, #06b6d4)', transition:'width 1s ease' }} />
      </div>
    </div>
  );
}

function Spinner() { return <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', verticalAlign:'middle', marginRight:6 }} />; }
