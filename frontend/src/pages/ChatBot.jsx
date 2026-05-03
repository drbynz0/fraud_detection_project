// src/pages/ChatBot.jsx
import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const getSessionId = () => {
  let sid = localStorage.getItem('fraudbot_session_id');
  if (!sid) {
    sid = `session_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('fraudbot_session_id', sid);
  }
  return sid;
};

const SESSION_ID = getSessionId();

const QUICK_QUESTIONS = [
  'Quel est le recall du modèle ?',
  'Comment fonctionne le feature engineering ?',
  'Pourquoi utiliser le MLP et pas le CNN ?',
  'Comment gérer le déséquilibre de classes ?',
  'Quelles sont les features les plus importantes ?',
  'Comment interpréter la probabilité de fraude ?',
  'Qu\'est-ce que le Target Encoding ?',
  'Comment fonctionne la distance Haversine ?',
];

const WELCOME_MSG = {
  role: 'assistant',
  content: `# Bonjour ! Je suis **FraudBot** <i class="fas fa-shield-halved"></i>

Je suis l'assistant intelligent de la plateforme **FraudShield — Bank of Africa**.

Je peux vous aider sur :

- <i class="fas fa-brain"></i> **Le modèle MLP** — architecture, entraînement, métriques
- <i class="fas fa-chart-pie"></i> **Les données** — dataset Sparkov, feature engineering, prétraitement
- <i class="fas fa-magnifying-glass"></i> **Les résultats** — interpréter les probabilités, niveaux de risque
- <i class="fas fa-gear"></i> **L'API** — endpoints disponibles, formats acceptés
- <i class="fas fa-chart-line"></i> **La performance** — Recall, F1-Score, AUC-ROC, seuil de décision

Posez votre question ou choisissez un sujet suggéré ci-dessous !`,
  timestamp: new Date().toISOString(),
};

export default function ChatBot() {
  const [messages,  setMessages]  = useState([WELCOME_MSG]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [history,   setHistory]   = useState([]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await api.chatHistory(SESSION_ID);
        if (data.messages && data.messages.length > 0) {
          const mapped = data.messages.flatMap(m => [
            { role: 'user', content: m.user_message, timestamp: m.created_at },
            { role: 'assistant', content: m.bot_reply, timestamp: m.created_at, tokens: m.tokens_used }
          ]);
          setMessages([WELCOME_MSG, ...mapped]);
          
          // Mettre à jour l'historique utilisé pour le contexte de l'IA
          const llmHistory = data.messages.flatMap(m => [
            { role: 'user', content: m.user_message },
            { role: 'assistant', content: m.bot_reply }
          ]);
          setHistory(llmHistory);
        }
      } catch (e) {
        console.error("Erreur chargement historique:", e);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput(''); setError('');

    const userMsg = { role:'user', content:msg, timestamp:new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    setLoading(true);

    try {
      const r = await api.chat(msg, history, SESSION_ID);
      const botMsg = { role:'assistant', content:r.reply, timestamp:new Date().toISOString(), tokens:r.tokens_used };
      setMessages(m => [...m, botMsg]);
      setHistory(h => [...h, { role:'user', content:msg }, { role:'assistant', content:r.reply }]);
    } catch(e) {
      setError(e.message);
      setMessages(m => [...m, {
        role:'assistant',
        content:'<i class="fas fa-circle-xmark"></i> Une erreur est survenue. Vérifiez que l\'API est en ligne et que la clé API est configurée.',
        timestamp:new Date().toISOString(),
        isError:true,
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([WELCOME_MSG]);
    setHistory([]);
    setError('');
  };

  return (
    <div className="animate-fadeUp" style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', gap:0 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background:'linear-gradient(135deg, #1d4ed8, #06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 20px rgba(37,99,235,0.35)', flexShrink:0,
          }}>
            <span style={{ fontSize:20, color:'white' }}><i class="fas fa-robot"></i></span>
          </div>
          <div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, color:'var(--text-primary)' }}>
              FraudBot IA
            </h2>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:2 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981' }} />
              <span style={{ fontSize:12, color:'#10b981', fontFamily:'var(--font-mono)' }}>
                Propulsé par Claude Sonnet · {messages.length-1} messages
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-secondary" onClick={clearChat} style={{ fontSize:12, padding:'7px 14px' }}>
            <i class="fas fa-trash-can" style={{marginRight:6}}></i> Effacer
          </button>
          <ExportChat messages={messages} />
        </div>
      </div>

      {/* Main chat layout */}
      <div style={{ display:'flex', gap:16, flex:1, overflow:'hidden' }}>

        {/* Sidebar — quick questions */}
        <div style={{ width:220, flexShrink:0, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-display)', fontWeight:700, letterSpacing:'0.1em', padding:'0 2px 8px' }}>
            QUESTIONS RAPIDES
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                disabled={loading}
                style={{
                  background:'var(--bg-card)', border:'1px solid var(--border)',
                  borderRadius:8, padding:'10px 12px', textAlign:'left',
                  color:'var(--text-secondary)', fontSize:12,
                  fontFamily:'var(--font-body)', cursor:'pointer',
                  transition:'all 0.2s', lineHeight:1.4,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent-blue)'; e.currentTarget.style.color='var(--text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text-secondary)'; }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Session info */}
          <div style={{ marginTop:'auto', padding:'12px', background:'var(--bg-surface)', borderRadius:10, border:'1px solid var(--border)', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>
            <div style={{ marginBottom:4 }}>Session active</div>
            <div style={{ color:'#a78bfa', wordBreak:'break-all' }}>{SESSION_ID.slice(0,24)}...</div>
            <div style={{ marginTop:8 }}>
              Messages: <span style={{ color:'var(--text-primary)' }}>{messages.length}</span>
            </div>
            <div>
              Tokens: <span style={{ color:'var(--text-primary)' }}>
                {messages.filter(m=>m.tokens).reduce((a,m)=>a+(m.tokens||0),0)}
              </span>
            </div>
          </div>
        </div>

        {/* Chat window */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--bg-card)', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>

          {/* Messages */}
          <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && <TypingIndicator />}

            {error && (
              <div style={{ padding:'10px 14px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'#f87171', fontSize:12 }}>
                <i class="fas fa-triangle-exclamation" style={{marginRight:6}}></i> {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{ borderTop:'1px solid var(--border)', padding:'16px', background:'var(--bg-surface)' }}>
            <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
              <textarea
                ref={inputRef}
                className="input-field"
                placeholder="Posez votre question sur le modèle, les données, ou la plateforme..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                rows={2}
                style={{ resize:'none', flex:1, lineHeight:1.5, fontFamily:'var(--font-body)' }}
              />
              <button
                className="btn-primary"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{ padding:'10px 18px', flexShrink:0, opacity:(!input.trim()||loading)?0.5:1 }}
              >
                {loading ? <Spinner /> : <SendIcon />}
              </button>
            </div>
            <div style={{ marginTop:8, fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-body)' }}>
              Appuyez sur <kbd style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 5px', fontFamily:'var(--font-mono)', fontSize:10 }}>Enter</kbd> pour envoyer ·{' '}
              <kbd style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:4, padding:'1px 5px', fontFamily:'var(--font-mono)', fontSize:10 }}>Shift+Enter</kbd> pour nouvelle ligne
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const time   = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr', { hour:'2-digit', minute:'2-digit' }) : '';

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap:4, animation:'fadeUp 0.3s ease forwards' }}>
      {/* Author label */}
      <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft: isUser ? 0 : 4 }}>
        {!isUser && (
          <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#1d4ed8,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}>
            <i class="fas fa-robot"></i>
          </div>
        )}
        <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
          {isUser ? 'Vous' : 'FraudBot'} · {time}
        </span>
        {isUser && (
          <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#7c3aed,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}>
            <i class="fas fa-user"></i>
          </div>
        )}
        {msg.tokens && <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>({msg.tokens} tokens)</span>}
      </div>

      {/* Bubble */}
      <div
        className={isUser ? 'bubble-user' : 'bubble-bot'}
        style={{ maxWidth:'85%', padding:'12px 16px', fontSize:13.5, lineHeight:1.7, color:'var(--text-primary)' }}
      >
        <FormattedMessage content={msg.content} isError={msg.isError} />
      </div>
    </div>
  );
}

function FormattedMessage({ content, isError }) {
  if (isError) return <span style={{ color:'#f87171' }}>{content}</span>;

  // Simple markdown-like rendering
  const lines = content.split('\n');
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      {lines.map((line, i) => {
        if (line.startsWith('# '))  return <h3 key={i} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--text-primary)', marginBottom:4 }}>{renderInline(line.slice(2))}</h3>;
        if (line.startsWith('## ')) return <h4 key={i} style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#60a5fa', marginBottom:2 }}>{renderInline(line.slice(3))}</h4>;
        if (line.startsWith('- '))  return <div key={i} style={{ display:'flex', gap:8 }}><span style={{ color:'var(--accent-blue)', flexShrink:0 }}>•</span><span>{renderInline(line.slice(2))}</span></div>;
        if (line.match(/^\d+\. /)) {
          const [num, ...rest] = line.split('. ');
          return <div key={i} style={{ display:'flex', gap:8 }}><span style={{ color:'var(--accent-blue)', flexShrink:0, fontFamily:'var(--font-mono)', fontSize:12 }}>{num}.</span><span>{renderInline(rest.join('. '))}</span></div>;
        }
        if (line === '') return <div key={i} style={{ height:4 }} />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} style={{ color:'var(--text-primary)', fontWeight:700 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} style={{ fontFamily:'var(--font-mono)', fontSize:12, background:'rgba(37,99,235,0.15)', padding:'1px 5px', borderRadius:4, color:'#a78bfa' }}>{p.slice(1,-1)}</code>;
    return p;
  });
}

function TypingIndicator() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
      <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#1d4ed8,#06b6d4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}><i class="fas fa-robot"></i></div>
      <div className="bubble-bot" style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:7, height:7, borderRadius:'50%', background:'var(--accent-blue)',
            animation:`blink 1.2s ease-in-out ${i*0.2}s infinite`,
          }} />
        ))}
        <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:4, fontFamily:'var(--font-mono)' }}>FraudBot réfléchit...</span>
      </div>
    </div>
  );
}

function ExportChat({ messages }) {
  const onClick = () => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.timestamp ? new Date(m.timestamp).toLocaleString('fr') : ''}\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([text], { type:'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `fraudbot_conversation_${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="btn-secondary" onClick={onClick} style={{ fontSize:12, padding:'7px 14px' }}>
      <i class="fas fa-file-export" style={{marginRight:6}}></i> Exporter
    </button>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
    </svg>
  );
}

function Spinner() {
  return <span style={{ display:'inline-block', width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />;
}
