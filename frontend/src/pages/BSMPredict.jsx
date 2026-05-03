// src/pages/BSMPredict.jsx
import { useState } from 'react';
import { api } from '../services/api';

const BOOL_FIELDS = ['copy_paste_detected','is_new_device','device_fingerprint_match',
                     'ip_country_match','ip_is_vpn_proxy','is_mobile_desktop_mismatch',
                     'is_new_beneficiary','is_international','is_weekend'];

const FIELD_GROUPS = [
  {
    title:'🖱️ Comportement de Saisie', color:'#60a5fa',
    desc:'Métriques collectées par le navigateur pendant le remplissage du formulaire',
    fields:[
      { key:'typing_speed_ms',       label:'Vitesse de frappe (ms)',     type:'number', step:'1',   help:'Délai moyen entre deux touches. Bot ≈ 30ms, Humain ≈ 180ms' },
      { key:'typing_regularity',     label:'Régularité (0=bot, 1=humain)',type:'number', step:'0.01',help:'Coefficient de régularité de la frappe' },
      { key:'copy_paste_detected',   label:'Copy/Paste détecté',          type:'select', help:'1 si le client a utilisé copier/coller' },
      { key:'mouse_movement_entropy',label:'Entropie mouvements souris',  type:'number', step:'0.01',help:'0=rectiligne (bot), 1=naturel (humain)' },
      { key:'time_on_page_sec',      label:'Temps sur la page (s)',       type:'number', step:'1',   help:'Durée de consultation de la page de paiement' },
      { key:'field_focus_changes',   label:'Changements de champ',        type:'number', step:'1',   help:'Nombre de fois que le focus a changé entre les champs' },
      { key:'form_fill_duration_ms', label:'Durée remplissage formulaire (ms)', type:'number', step:'100', help:'Durée totale pour remplir le formulaire' },
      { key:'tab_switches',          label:'Changements d\'onglet',        type:'number', step:'1',   help:'Nombre de fois que l\'utilisateur a changé d\'onglet' },
      { key:'scroll_events',         label:'Événements de scroll',         type:'number', step:'1',   help:'Nombre de scrolls effectués sur la page' },
    ]
  },
  {
    title:'🌐 Contexte Appareil & Réseau', color:'#a78bfa',
    desc:'Informations sur l\'appareil, l\'IP et la session de connexion',
    fields:[
      { key:'is_new_device',              label:'Nouvel appareil',              type:'select', help:'1 si l\'empreinte de l\'appareil n\'est pas connue' },
      { key:'device_fingerprint_match',   label:'Empreinte appareil connue',    type:'select', help:'1 si l\'empreinte correspond au profil client' },
      { key:'ip_country_match',           label:'Pays IP correspond au profil', type:'select', help:'1 si le pays de l\'IP correspond au profil client' },
      { key:'ip_is_vpn_proxy',            label:'IP VPN / Proxy',               type:'select', help:'1 si l\'IP est identifiée comme VPN ou Proxy' },
      { key:'time_since_last_login_min',  label:'Temps depuis dernière connexion (min)', type:'number', step:'1', help:'Minutes écoulées depuis la dernière connexion réussie' },
      { key:'login_failed_attempts',      label:'Tentatives de connexion échouées', type:'number', step:'1', help:'Nombre d\'échecs de connexion récents' },
      { key:'session_age_sec',            label:'Âge de la session (s)',        type:'number', step:'1',   help:'Durée depuis l\'ouverture de la session courante' },
      { key:'is_mobile_desktop_mismatch', label:'Incohérence mobile/desktop',   type:'select', help:'1 si l\'agent user-agent ne correspond pas au comportement' },
    ]
  },
  {
    title:'💳 Contexte de la Transaction', color:'#34d399',
    desc:'Anomalies détectées sur la transaction en cours',
    fields:[
      { key:'is_new_beneficiary',     label:'Nouveau bénéficiaire',          type:'select', help:'1 si le bénéficiaire n\'a jamais été utilisé par ce client' },
      { key:'amt_vs_avg_ratio',       label:'Ratio montant / moyenne carte', type:'number', step:'0.1',  help:'Montant / montant moyen historique. 1=normal, 5=5x la normale' },
      { key:'transactions_last_hour', label:'Transactions dans l\'heure',    type:'number', step:'1',    help:'Nombre de transactions effectuées dans la dernière heure' },
      { key:'is_international',       label:'Transaction internationale',    type:'select', help:'1 si le bénéficiaire est dans un pays étranger' },
      { key:'hour_of_day',            label:'Heure de la transaction',       type:'number', step:'1', min:0, max:23, help:'Heure (0-23)' },
      { key:'is_weekend',             label:'Week-end',                      type:'select', help:'1 si la transaction a lieu un samedi ou dimanche' },
    ]
  },
];

const EMPTY = {
  typing_speed_ms:180, typing_regularity:0.85, copy_paste_detected:0,
  mouse_movement_entropy:0.78, time_on_page_sec:45, field_focus_changes:5,
  form_fill_duration_ms:12000, tab_switches:1, scroll_events:8,
  is_new_device:0, device_fingerprint_match:1, ip_country_match:1,
  ip_is_vpn_proxy:0, time_since_last_login_min:120, login_failed_attempts:0,
  session_age_sec:300, is_mobile_desktop_mismatch:0,
  is_new_beneficiary:0, amt_vs_avg_ratio:1.0, transactions_last_hour:1,
  is_international:0, hour_of_day:14, is_weekend:0,
};

const DEMO_FRAUD = {
  typing_speed_ms:28, typing_regularity:0.05, copy_paste_detected:1,
  mouse_movement_entropy:0.08, time_on_page_sec:4, field_focus_changes:0,
  form_fill_duration_ms:750, tab_switches:0, scroll_events:0,
  is_new_device:1, device_fingerprint_match:0, ip_country_match:0,
  ip_is_vpn_proxy:1, time_since_last_login_min:2, login_failed_attempts:4,
  session_age_sec:12, is_mobile_desktop_mismatch:1,
  is_new_beneficiary:1, amt_vs_avg_ratio:6.5, transactions_last_hour:9,
  is_international:1, hour_of_day:3, is_weekend:1,
};

export default function BSMPredict() {
  const [form,   setForm]   = useState(EMPTY);
  const [result, setResult] = useState(null);
  const [loading,setLoading]= useState(false);
  const [error,  setError]  = useState('');
  const [tab,    setTab]    = useState(0);

  const onChange = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    setError(''); setLoading(true); setResult(null);
    try {
      const payload = { ...form };
      Object.keys(payload).forEach(k => { payload[k] = parseFloat(payload[k]) || 0; });
      const r = await api.bsmPredict(payload);
      setResult(r);
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const group = FIELD_GROUPS[tab];

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ padding:'4px 10px', background:'rgba(167,139,250,0.15)', border:'1px solid rgba(167,139,250,0.3)', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', color:'#a78bfa' }}>
              MODULE B — BSM
            </div>
            <div style={{ padding:'4px 10px', background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:6, fontSize:11, fontFamily:'var(--font-mono)', color:'#fbbf24' }}>
              XGBoost · Gradient Boosting
            </div>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:20, color:'var(--text-primary)', marginTop:8 }}>
            Scoring Comportemental de Session
          </h2>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
            Évalue le risque d'une session de paiement en l'absence de code OTP
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn-secondary" onClick={() => setForm(EMPTY)} style={{ fontSize:12, padding:'7px 14px' }}>
            ↺ Reset
          </button>
          <button className="btn-danger" onClick={() => setForm(DEMO_FRAUD)} style={{ fontSize:12, padding:'7px 14px' }}>
            🤖 Exemple fraude
          </button>
        </div>
      </div>

      {/* Explication */}
      <div style={{ padding:'14px 18px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:10 }}>
        <div style={{ fontSize:13, color:'#fbbf24', fontWeight:600, fontFamily:'var(--font-display)', marginBottom:6 }}>
          ⚠️ Pourquoi ce module ?
        </div>
        <div style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.6 }}>
          Certaines plateformes de paiement suppriment le code de confirmation OTP pour éviter l'abandon de transaction.
          Le BSM compense cette absence en analysant <strong style={{color:'var(--text-primary)'}}>23 signaux comportementaux</strong> de la session
          pour détecter bots, attaquants et sessions suspectes en temps réel.
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20, alignItems:'start' }}>

        {/* Left: form */}
        <div className="stat-card">
          {/* Group tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:20 }}>
            {FIELD_GROUPS.map((g, i) => (
              <button key={i} onClick={() => setTab(i)}
                style={{ flex:1, padding:'8px 6px', borderRadius:8, border:`1px solid ${tab===i?g.color:'var(--border)'}`,
                  background: tab===i?`${g.color}18`:'transparent', color:tab===i?g.color:'var(--text-muted)',
                  fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, cursor:'pointer', transition:'all 0.2s' }}>
                {g.title}
              </button>
            ))}
          </div>

          <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16, padding:'8px 12px', background:'var(--bg-surface)', borderRadius:8 }}>
            {group.desc}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {group.fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.06em', display:'block', marginBottom:5 }}>
                  {f.label.toUpperCase()}
                </label>
                {f.type === 'select' ? (
                  <select className="input-field" value={form[f.key]} onChange={e => onChange(f.key, e.target.value)} title={f.help}>
                    <option value="0">Non (0)</option>
                    <option value="1">Oui (1)</option>
                  </select>
                ) : (
                  <input className="input-field" type="number" step={f.step} min={f.min} max={f.max}
                    value={form[f.key]} onChange={e => onChange(f.key, e.target.value)} title={f.help} />
                )}
              </div>
            ))}
          </div>

          {/* Navigation entre groupes */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:20 }}>
            <button className="btn-secondary" onClick={() => setTab(t => Math.max(0,t-1))} disabled={tab===0} style={{ fontSize:12 }}>
              ← Précédent
            </button>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-muted)', alignSelf:'center' }}>
              {tab+1} / {FIELD_GROUPS.length}
            </span>
            {tab < FIELD_GROUPS.length - 1 ? (
              <button className="btn-secondary" onClick={() => setTab(t => t+1)} style={{ fontSize:12 }}>
                Suivant →
              </button>
            ) : (
              <button className="btn-primary" onClick={onSubmit} disabled={loading} style={{ fontSize:13, padding:'9px 20px' }}>
                {loading ? <Spinner /> : '🔍 Analyser la session'}
              </button>
            )}
          </div>

          {error && (
            <div style={{ marginTop:14, padding:'12px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:12 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Right: result */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!result && !loading && <EmptyState />}
          {loading && <BSMLoading />}
          {result && <BSMResultCard result={result} />}
          <BSMGuide />
        </div>
      </div>
    </div>
  );
}

function BSMResultCard({ result }) {
  const colorMap = { 'Approuver':'#10b981', 'Challenger':'#f59e0b', 'Bloquer':'#ef4444' };
  const glowMap  = { 'Approuver':'glow-green', 'Challenger':'glow-gold', 'Bloquer':'glow-red' };
  const color    = colorMap[result.decision] || '#10b981';
  const glow     = glowMap[result.decision]  || 'glow-green';
  const pBlock   = result.probabilities?.block || 0;

  return (
    <div className={`stat-card ${glow}`} style={{ borderColor:`${color}50`, animation:'fadeUp 0.4s ease forwards' }}>
      {/* Décision principale */}
      <div style={{ textAlign:'center', padding:'20px 0 16px' }}>
        <div style={{ fontSize:52, marginBottom:10 }}>{result.icon}</div>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color }}>
          {result.decision.toUpperCase()}
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginTop:4 }}>
          Session analysée le {new Date(result.analysed_at).toLocaleString('fr')}
        </div>
      </div>

      {/* Score de risque */}
      <div style={{ margin:'0 0 16px', padding:'14px', background:'var(--bg-surface)', borderRadius:10, border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:600 }}>
            SCORE DE RISQUE FRAUDE
          </span>
          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:20, color }}>{pBlock}%</span>
        </div>
        <div className="progress-bar" style={{ height:10 }}>
          <div className="progress-fill" style={{
            width:`${pBlock}%`,
            background:`linear-gradient(90deg, #10b981 0%, #f59e0b 30%, #ef4444 70%)`,
          }} />
        </div>
        {/* Seuils */}
        <div style={{ position:'relative', height:16, marginTop:4 }}>
          <div style={{ position:'absolute', left:`${result.thresholds?.challenge||30}%`, transform:'translateX(-50%)', fontSize:9, color:'#fbbf24', fontFamily:'var(--font-mono)' }}>
            ▲ {result.thresholds?.challenge}%
          </div>
          <div style={{ position:'absolute', left:`${result.thresholds?.block||70}%`, transform:'translateX(-50%)', fontSize:9, color:'#ef4444', fontFamily:'var(--font-mono)' }}>
            ▲ {result.thresholds?.block}%
          </div>
        </div>
      </div>

      {/* Probabilités détaillées */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        {[
          ['✅ Approuver',   result.probabilities?.approve,   '#10b981'],
          ['⚠️ Challenger',  result.probabilities?.challenge, '#f59e0b'],
          ['🚨 Bloquer',     result.probabilities?.block,     '#ef4444'],
        ].map(([label, pct, c], i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:c, fontFamily:'var(--font-body)', minWidth:110 }}>{label}</span>
            <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:c, borderRadius:3, transition:'width 0.6s ease' }} />
            </div>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:c, minWidth:38, textAlign:'right' }}>{pct}%</span>
          </div>
        ))}
      </div>

      {/* Recommandation */}
      <div style={{ padding:'12px 14px', background:`${color}12`, border:`1px solid ${color}30`, borderRadius:8 }}>
        <div style={{ fontSize:11, fontFamily:'var(--font-display)', fontWeight:700, color, marginBottom:4 }}>
          RECOMMANDATION
        </div>
        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
          {result.decision === 'Approuver'  && 'Session légitime détectée. La transaction peut être autorisée automatiquement.'}
          {result.decision === 'Challenger' && 'Anomalies détectées. Demander une vérification légère (question secrète ou notification push) avant d\'autoriser.'}
          {result.decision === 'Bloquer'    && 'Session hautement suspecte. Bloquer la transaction, alerter l\'analyste et contacter le client via le canal sécurisé.'}
        </div>
      </div>

      <div style={{ marginTop:12, fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)', textAlign:'right' }}>
        BSM v{result.model_version} · {result.processing_time_ms}ms
      </div>
    </div>
  );
}

function BSMGuide() {
  return (
    <div className="stat-card" style={{ padding:'16px 20px' }}>
      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'var(--text-primary)', marginBottom:12 }}>
        🎯 Décisions du BSM
      </div>
      {[
        ['✅ Approuver',  '#10b981', 'P(fraude) < 30%', 'Comportement humain naturel, contexte normal'],
        ['⚠️ Challenger', '#fbbf24', 'P(fraude) 30–70%', 'Anomalies légères, demander vérification'],
        ['🚨 Bloquer',    '#f87171', 'P(fraude) > 70%', 'Bot/attaquant probable, bloquer et alerter'],
      ].map(([d, c, seuil, desc], i) => (
        <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom: i<2 ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize:13, color:c, fontFamily:'var(--font-display)', fontWeight:700, minWidth:90 }}>{d}</span>
          <div>
            <div style={{ fontSize:11, color:c, fontFamily:'var(--font-mono)', marginBottom:2 }}>{seuil}</div>
            <div style={{ fontSize:12, color:'var(--text-muted)' }}>{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="stat-card" style={{ textAlign:'center', padding:'60px 32px' }}>
      <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>🛡️</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:15, color:'var(--text-muted)' }}>
        Remplissez les 3 groupes de features
      </div>
      <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8, opacity:0.7 }}>
        Naviguez entre Comportement → Contexte → Transaction
      </p>
    </div>
  );
}

function BSMLoading() {
  return (
    <div className="stat-card" style={{ textAlign:'center', padding:'48px' }}>
      <div style={{ width:60, height:60, borderRadius:'50%', border:'3px solid var(--border)', borderTopColor:'#a78bfa', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
      <div style={{ fontFamily:'var(--font-display)', color:'var(--text-muted)', fontSize:14 }}>
        Analyse comportementale...
      </div>
      <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6, fontFamily:'var(--font-mono)' }}>
        XGBoost · 23 features · 3 classes
      </div>
    </div>
  );
}

function Spinner() {
  return <span style={{ display:'inline-block', width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite', verticalAlign:'middle', marginRight:6 }} />;
}
