// src/services/api.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Erreur API');
  }
  return res.json();
}

export const api = {
  // ── Système ────────────────────────────────────────────────
  health:  () => request('/health'),
  stats:   () => request('/stats'),

  // ── MLP — Prédiction transaction ──────────────────────────
  predictSingle: (data) => request('/predict/single', { method:'POST', body:JSON.stringify(data) }),
  predictBatch:  (list) => request('/predict/batch',  { method:'POST', body:JSON.stringify({ transactions:list }) }),
  predictFile:   (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/predict/file', { method:'POST', headers:{}, body:fd });
  },

  // ── MLP — Historique ──────────────────────────────────────
  predictionHistory: (limit=50, offset=0) => request(`/history/predictions?limit=${limit}&offset=${offset}`),
  predictionDetails: (id)                  => request(`/history/predictions/${id}/details`),
  dashboard:         ()                    => request('/history/dashboard'),

  // ── BSM — Scoring de session ──────────────────────────────
  bsmPredict:   (data)                         => request('/bsm/predict', { method:'POST', body:JSON.stringify(data) }),
  bsmPredictFile: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('/bsm/predict/file', { method:'POST', headers:{}, body:fd });
  },
  bsmStats:     ()                             => request('/bsm/stats'),
  bsmDashboard: ()                             => request('/bsm/dashboard'),
  bsmHistory:   (limit=50, offset=0, dec=null) => {
    const qs = new URLSearchParams({ limit, offset });
    if (dec) qs.set('decision', dec);
    return request(`/bsm/history?${qs}`);
  },

  // ── Chatbot ───────────────────────────────────────────────
  chat:        (msg, history, sessionId) => request('/chat', {
    method: 'POST',
    body:   JSON.stringify({ message:msg, history, session_id:sessionId }),
  }),
  chatHistory: (sid) => request(`/history/chat/${sid}`),
};
