// src/components/Sidebar.jsx

const NAV_GROUPS = [
  {
    label: 'MODULE A — MLP',
    color: '#2563eb',
    items: [
      { id:'dashboard', label:'Dashboard',       icon:<IconDash /> },
      { id:'single',    label:'Analyse Unitaire',icon:<IconSingle /> },
      { id:'batch',     label:'Analyse Batch',   icon:<IconBatch /> },
      { id:'file',      label:'Import Fichier',  icon:<IconFile /> },
      { id:'history',   label:'Historique MLP',  icon:<IconHistory /> },
    ],
  },
  {
    label: 'MODULE B — BSM',
    color: '#a78bfa',
    items: [
      { id:'bsm',        label:'Scoring Session',icon:<IconBSM />,     badge:'NOUVEAU' },
      { id:'bsmfile',    label:'Import Fichier', icon:<IconFile /> },
      { id:'bsmhistory', label:'Historique BSM', icon:<IconBSMHist /> },
    ],
  },
  {
    label: 'ASSISTANT',
    color: '#06b6d4',
    items: [
      { id:'chat', label:'FraudBot IA', icon:<IconChat />, badge:'IA' },
    ],
  },
];

export default function Sidebar({ page, setPage }) {
  return (
    <aside style={{
      width:'240px', minWidth:'240px',
      background:'var(--bg-surface)',
      borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column',
      overflow:'hidden', position:'relative', zIndex:10,
    }}>
      {/* Logo */}
      <div style={{ padding:'24px 20px 20px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:'10px',
            background:'linear-gradient(135deg,#1d4ed8,#06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 20px rgba(37,99,235,0.4)',
          }}>
            <ShieldIcon />
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'var(--text-primary)', letterSpacing:'0.05em' }}>FRAUDSHIELD</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em' }}>BANK OF AFRICA</div>
          </div>
        </div>
      </div>

      {/* Navigation groupée */}
      <nav style={{ flex:1, padding:'12px', overflowY:'auto', display:'flex', flexDirection:'column', gap:0 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom:8 }}>
            <div style={{ fontSize:9, fontFamily:'var(--font-mono)', fontWeight:700, letterSpacing:'0.12em', color:group.color, padding:'10px 8px 6px', display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ flex:1, height:1, background:`${group.color}30` }} />
              {group.label}
              <div style={{ flex:1, height:1, background:`${group.color}30` }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {group.items.map(item => (
                <button key={item.id}
                  className={`nav-item ${page===item.id?'active':''}`}
                  onClick={() => setPage(item.id)}
                  style={{ width:'100%', textAlign:'left',
                    background: page===item.id ? `${group.color}15` : 'none',
                    border: `1px solid ${page===item.id ? `${group.color}40` : 'transparent'}`,
                    color: page===item.id ? group.color : undefined,
                  }}>
                  <span style={{ opacity:page===item.id?1:0.65 }}>{item.icon}</span>
                  <span style={{ flex:1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: item.badge==='IA' ? 'linear-gradient(135deg,#1d4ed8,#06b6d4)' : `${group.color}`,
                      color:'white', fontSize:8, padding:'2px 6px', borderRadius:8,
                      fontFamily:'var(--font-mono)', fontWeight:700, letterSpacing:'0.05em',
                    }}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', marginBottom:2 }}>MLP v1.0 · BSM v1.0</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', opacity:0.6 }}>Sparkov · XGBoost · TensorFlow</div>
        <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)', opacity:0.5, marginTop:2 }}>© 2024 Bank of Africa</div>
      </div>
    </aside>
  );
}

function ShieldIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function IconDash()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function IconSingle()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>; }
function IconBatch()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function IconFile()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>; }
function IconHistory() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>; }
function IconBSM()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>; }
function IconBSMHist() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 12l2 2 4-4"/></svg>; }
function IconChat()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
