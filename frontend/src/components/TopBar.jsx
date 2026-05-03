// src/components/TopBar.jsx
import { useState, useEffect } from 'react';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', sub: 'Vue d\'ensemble des analyses en temps réel' },
  single:    { title: 'Analyse Unitaire', sub: 'Analyser une transaction individuelle' },
  batch:     { title: 'Analyse Batch', sub: 'Soumettre plusieurs transactions simultanément' },
  file:      { title: 'Import Fichier', sub: 'Importer un fichier Excel ou CSV' },
  history:    { title: 'Historique MLP',       sub: 'Consulter toutes les analyses de transactions' },
  bsm:        { title: 'Scoring de Session',   sub: 'Module BSM — XGBoost — Détection sessions sans OTP' },
  bsmhistory: { title: 'Historique BSM',       sub: 'Sessions analysées par le Behavioral Scoring Model' },
  chat:      { title: 'FraudBot IA', sub: 'Assistant intelligent du projet' },
};

export default function TopBar({ page, apiStatus, onToggleSidebar }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const info = PAGE_TITLES[page] || PAGE_TITLES.dashboard;
  const statusColor = apiStatus==='online' ? 'var(--accent-green)' : apiStatus==='offline' ? 'var(--accent-red)' : 'var(--accent-gold)';
  const statusLabel = apiStatus==='online' ? 'API En ligne' : apiStatus==='offline' ? 'API Hors ligne' : 'Vérification...';

  return (
    <header style={{
      height: 64,
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 28px', gap: 16,
      position: 'relative', flexShrink: 0,
    }}>
      {/* Scan line */}
      <div className="scan-line" />

      {/* Menu toggle */}
      <button onClick={onToggleSidebar} className="btn-secondary" style={{ padding:'8px', flexShrink:0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>

      {/* Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'var(--text-primary)', letterSpacing:'0.02em' }}>
          {info.title}
        </h1>
        <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-body)' }}>
          {info.sub}
        </p>
      </div>

      {/* Right section */}
      <div style={{ display:'flex', alignItems:'center', gap:20 }}>
        {/* Clock */}
        <div style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-muted)' }}>
          {time.toLocaleTimeString('fr-MA', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
          <span style={{ marginLeft:8, opacity:0.5 }}>
            {time.toLocaleDateString('fr-MA', { day:'2-digit', month:'short', year:'numeric' })}
          </span>
        </div>

        {/* API Status */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px' }}>
          <div style={{ position:'relative', width:8, height:8 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:statusColor, opacity:0.3, animation: apiStatus==='online' ? 'pulse-ring 1.5s infinite' : 'none' }} />
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', background:statusColor }} />
          </div>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:statusColor, letterSpacing:'0.05em' }}>
            {statusLabel}
          </span>
        </div>

        {/* Avatar */}
        <div style={{
          width:34, height:34, borderRadius:'50%',
          background:'linear-gradient(135deg, #1d4ed8, #06b6d4)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'white',
          cursor:'pointer', flexShrink:0,
        }}>
          A
        </div>
      </div>
    </header>
  );
}
