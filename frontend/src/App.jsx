// src/App.jsx
import { useState, useEffect } from 'react';
import Sidebar       from './components/Sidebar';
import TopBar        from './components/TopBar';
import Dashboard     from './pages/Dashboard';
import SinglePredict from './pages/SinglePredict';
import BatchPredict  from './pages/BatchPredict';
import FilePredict   from './pages/FilePredict';
import History       from './pages/History';
import ChatBot       from './pages/ChatBot';
import BSMPredict    from './pages/BSMPredict';
import BSMHistory    from './pages/BSMHistory';
import BSMFilePredict from './pages/BSMFilePredict';
import BSMSimulator from './pages/BSMSimulator';
import BSMLiveDemo from './pages/BSMLiveDemo';
import { api }       from './services/api';

export default function App() {
  const [page,      setPage]    = useState('dashboard');
  const [apiStatus, setStatus]  = useState('checking');
  const [sidebarOpen,setSidebar]= useState(true);

  useEffect(() => {
    api.health()
      .then(() => setStatus('online'))
      .catch(() => setStatus('offline'));
    const t = setInterval(() => {
      api.health().then(()=>setStatus('online')).catch(()=>setStatus('offline'));
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const pages = {
    dashboard:  Dashboard,
    single:     SinglePredict,
    batch:      BatchPredict,
    file:       FilePredict,
    history:    History,
    chat:       ChatBot,
    bsm:        BSMPredict,
    bsmfile:    BSMFilePredict,
    bsmhistory: BSMHistory,
    bsmsimulator: BSMSimulator,
    bsmlive: BSMLiveDemo,
  };

  const PageComponent = pages[page] || Dashboard;

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg-base)' }}>
      {sidebarOpen && <Sidebar page={page} setPage={setPage} />}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', transition:'all 0.3s' }}>
        <TopBar page={page} apiStatus={apiStatus} onToggleSidebar={() => setSidebar(v=>!v)} />
        <main style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
