// src/pages/SinglePredict.jsx
import { useState } from 'react';
import { api } from '../services/api';

const CATEGORIES = ['entertainment','food_dining','gas_transport','grocery_net','grocery_pos','health_fitness','home','kids_pets','misc_net','misc_pos','personal_care','shopping_net','shopping_pos','travel'];

const FIELDS = [
  { key:'amt',          label:'Montant (MAD)',          type:'number', step:'0.01', placeholder:'ex: 250.00',  help:'Montant de la transaction' },
  { key:'hour',         label:'Heure',                  type:'number', min:0,max:23,placeholder:'0 - 23',       help:'Heure de la transaction' },
  { key:'day_of_week',  label:'Jour de la semaine',     type:'number', min:0,max:6, placeholder:'0=Lun, 6=Dim', help:'Jour de la semaine' },
  { key:'month',        label:'Mois',                   type:'number', min:1,max:12,placeholder:'1 - 12',       help:'Mois de la transaction' },
  { key:'is_night',     label:'Transaction nocturne',   type:'number', min:0,max:1, placeholder:'0 ou 1',       help:'1 si entre 22h et 5h' },
  { key:'age',          label:'Âge du titulaire',       type:'number', placeholder:'ex: 35',                    help:'Âge du porteur de carte' },
  { key:'distance_km',  label:'Distance client/marchand (km)', type:'number', step:'0.1', placeholder:'ex: 12.5', help:'Distance Haversine calculée' },
  { key:'gender',       label:'Genre',                  type:'number', min:0,max:1, placeholder:'0=Femme, 1=Homme', help:'Genre du porteur' },
  { key:'city_pop',     label:'Population de la ville', type:'number', placeholder:'ex: 50000',                 help:'Population de la ville du client' },
  { key:'state',        label:'État (Target Encoded)',  type:'number', step:'0.001',placeholder:'ex: 0.012',    help:'Taux de fraude moyen de l\'état' },
  { key:'job',          label:'Métier (Target Encoded)',type:'number', step:'0.001',placeholder:'ex: 0.008',    help:'Taux de fraude moyen du métier' },
  { key:'merchant',     label:'Marchand (Target Encoded)',type:'number',step:'0.001',placeholder:'ex: 0.005',   help:'Taux de fraude moyen du marchand' },
  { key:'avg_amt_card', label:'Montant moyen carte (MAD)',type:'number',step:'0.01',placeholder:'ex: 180.00',  help:'Moyenne historique de la carte' },
  { key:'amt_deviation',label:'Écart au montant moyen',type:'number', step:'0.01', placeholder:'ex: 70.00',    help:'amt - avg_amt_card' },
  { key:'tx_count_card',label:'Nb transactions carte', type:'number', placeholder:'ex: 45',                    help:'Nombre total de transactions' },
];

const EMPTY = Object.fromEntries([...FIELDS.map(f=>[f.key,'']),['category','grocery_pos']]);

export default function SinglePredict() {
  const [form,   setForm]   = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState('');

  const onChange = (k, v) => setForm(f => ({...f, [k]:v}));

  const autofill = () => setForm({
    amt:550, hour:2, day_of_week:5, month:6, is_night:1, age:28,
    distance_km:380, gender:1, city_pop:120000, category:'shopping_net',
    state:0.015, job:0.010, merchant:0.022,
    avg_amt_card:180, amt_deviation:370, tx_count_card:12,
  });

  const onSubmit = async () => {
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = {...form};
      FIELDS.forEach(f => { payload[f.key] = parseFloat(payload[f.key]) || 0; });
      const r = await api.predictSingle(payload);
      setResult(r);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const reset = () => { setForm(EMPTY); setResult(null); setError(''); };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:24, alignItems:'start' }} className="animate-fadeUp">

      {/* ── Form panel ── */}
      <div className="stat-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>
              Détails de la Transaction
            </h2>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>Remplissez tous les champs pour analyser la transaction</p>
          </div>
          <button className="btn-secondary" onClick={autofill} style={{ fontSize:12, padding:'7px 14px' }}>
            <i class="fas fa-bolt" style={{marginRight:6}}></i> Exemple fraude
          </button>
        </div>

        {/* Category */}
        <div style={{ marginBottom:20 }}>
          <label style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:6 }}>
            CATÉGORIE DU MARCHAND
          </label>
          <select className="input-field" value={form.category} onChange={e=>onChange('category',e.target.value)}>
            {CATEGORIES.map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        {/* Fields grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {FIELDS.map(f => (
            <div key={f.key}>
              <label style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600, letterSpacing:'0.05em', display:'block', marginBottom:5 }}>
                {f.label.toUpperCase()}
              </label>
              <input
                className="input-field"
                type={f.type} step={f.step} min={f.min} max={f.max}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e=>onChange(f.key, e.target.value)}
                title={f.help}
              />
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:13 }}>
            <i class="fas fa-triangle-exclamation" style={{marginRight:6}}></i> {error}
          </div>
        )}

        <div style={{ display:'flex', gap:12, marginTop:24 }}>
          <button className="btn-primary" onClick={onSubmit} disabled={loading} style={{ flex:1, padding:'13px', fontSize:15 }}>
            {loading ? <Spinner /> : <><i class="fas fa-magnifying-glass" style={{marginRight:8}}></i> Analyser la Transaction</>}
          </button>
          <button className="btn-secondary" onClick={reset}><i class="fas fa-xmark" style={{marginRight:6}}></i> Reset</button>
        </div>
      </div>

      {/* ── Result panel ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        {!result && !loading && (
          <div className="stat-card" style={{ textAlign:'center', padding:'60px 32px' }}>
            <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}><i class="fas fa-shield-halved"></i></div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:16, color:'var(--text-muted)' }}>
              Le résultat apparaîtra ici
            </div>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:8, opacity:0.7 }}>
              Remplissez le formulaire et cliquez sur Analyser
            </p>
          </div>
        )}
        {loading && <LoadingResult />}
        {result && <ResultCard result={result} />}

        {/* Info card */}
        <div className="stat-card" style={{ padding:'16px 20px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, marginBottom:12, color:'var(--text-primary)' }}>
            💡 Guide des champs
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              ['Target Encoding','Remplacez state/job/merchant par leur taux de fraude moyen calculé pendant le preprocessing.'],
              ['Distance km','Calculée via la formule Haversine entre les coordonnées du client et du marchand.'],
              ['Exemple fraude','Le bouton chargé d\'une icône éclair charge un exemple typique de fraude nocturne à distance élevée.'],
            ].map(([t,d],i)=>(
              <div key={i} style={{ padding:'10px 12px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#60a5fa', fontFamily:'var(--font-display)', marginBottom:3 }}>{t}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const isFraud = result.is_fraud === 1;
  const pct     = result.fraud_probability_pct || 0;
  const riskMap = { 'Faible':'#10b981','Modéré':'#f59e0b','Élevé':'#ef4444' };
  const riskColor = riskMap[result.risk_level] || '#10b981';

  return (
    <div className={`stat-card ${isFraud?'glow-red':'glow-green'}`} style={{
      borderColor: isFraud ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)',
      animation: 'fadeUp 0.4s ease forwards',
    }}>
      {/* Verdict */}
      <div style={{ textAlign:'center', padding:'20px 0 16px' }}>
        <div style={{ fontSize:52, marginBottom:12 }}>{isFraud ? <i class="fas fa-bell animate-pulse"></i> : <i class="fas fa-circle-check"></i>}</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color: isFraud?'#f87171':'#34d399' }}>
          {isFraud ? 'FRAUDE DÉTECTÉE' : 'TRANSACTION LÉGITIME'}
        </div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
          Analysé le {new Date(result.analysed_at).toLocaleString('fr')}
        </div>
      </div>

      {/* Probability gauge */}
      <div style={{ margin:'16px 0', padding:'16px', background:'var(--bg-surface)', borderRadius:10, border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600 }}>PROBABILITÉ DE FRAUDE</span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:18, color: isFraud?'#f87171':'#34d399' }}>{pct}%</span>
        </div>
        <div className="progress-bar" style={{ height:10 }}>
          <div className="progress-fill" style={{ width:`${pct}%`, background: isFraud?'linear-gradient(90deg,#f59e0b,#ef4444)':'linear-gradient(90deg,#059669,#10b981)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>0%</span>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>Seuil: {result.threshold_used*100}%</span>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>100%</span>
        </div>
      </div>

      {/* Risk level */}
      <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
        <div style={{ padding:'8px 20px', borderRadius:20, background:`${riskColor}18`, border:`1px solid ${riskColor}40`, fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:riskColor }}>
          Niveau de risque : {result.risk_level}
        </div>
      </div>

      {/* Details */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {[
          ['Montant',    `${result.transaction?.amt || 0} MAD`],
          ['Catégorie',  result.transaction?.category || 'N/A'],
          ['Heure',      `${result.transaction?.hour || 0}h`],
          ['Distance',   `${result.transaction?.distance_km || 0} km`],
        ].map(([k,v],i)=>(
          <div key={i} style={{ padding:'10px 12px', background:'var(--bg-surface)', borderRadius:8, border:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2 }}>{k}</div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--text-primary)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingResult() {
  return (
    <div className="stat-card" style={{ textAlign:'center', padding:'48px' }}>
      <div style={{ width:60, height:60, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'var(--accent-blue)', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
      <div style={{ fontFamily:'var(--font-display)', color:'var(--text-muted)' }}>Analyse en cours...</div>
    </div>
  );
}
function Spinner() { return <span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', verticalAlign:'middle' }} />; }
