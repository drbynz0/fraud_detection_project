# ============================================================
#  routers/chat.py — Endpoint Chatbot FraudBot IA (Groq)
#  POST /chat  |  GET /history/chat/{session_id}
# ============================================================

import os
import json
import httpx
from fastapi import APIRouter, HTTPException

import config
from schemas.bsm import ChatMessage
from model_utils import get_active_metrics

router = APIRouter(tags=["Chatbot IA"])

# ── Prompt système ────────────────────────────────────────────

_SYSTEM_PROMPT = """Tu es FraudBot, l'assistant IA de la plateforme FraudShield — Bank of Africa.
Tu es expert sur deux modules distincts :

MODULE A — MLP (Détection de transactions frauduleuses) :
- Architecture Dense(256→128→64→1) + BatchNorm + Dropout + Sigmoid
- Dataset Sparkov, variable cible is_fraud, features : amt, distance_km, hour, age, amt_deviation
- Endpoints : /predict/single, /predict/batch, /predict/file
- Métriques : Recall, F1-Score, AUC-ROC, matrice de confusion

MODULE B — BSM / XGBoost (Scoring comportemental des sessions sans OTP) :
- Problématique : certaines plateformes suppriment le code OTP → faille de sécurité
- Algorithme : XGBoost Gradient Boosting, classification tri-classe
- Features : comportementales (frappe, souris), contexte (VPN, appareil), transaction (nouveau bénéficiaire)
- Sortie : Approuver / Challenger / Bloquer
- Seuils : P(fraude) < 30% → Approuver | 30-70% → Challenger | > 70% → Bloquer
- Endpoint : /bsm/predict
- Interprétabilité : SHAP values

PLATEFORME WEB :
- Sections MLP et BSM séparées dans la sidebar
- React + Vite + Tailwind CSS
- API FastAPI + Supabase PostgreSQL
- Historique complet des analyses

Réponds en français, avec précision et professionnalisme. Utilise des emojis pour la lisibilité."""


def _get_performance_context() -> str:
    """Récupère les métriques réelles depuis Supabase pour enrichir le prompt."""
    try:
        mlp_m = get_active_metrics('MLP')
        bsm_m = get_active_metrics('BSM')
        perf  = "\n[PERFORMANCES RÉELLES DES MODÈLES]\n"

        if mlp_m:
            perf += (f"- MLP : Précision {mlp_m.get('precision', 0)*100:.1f}%, "
                     f"Rappel {mlp_m.get('recall', 0)*100:.1f}%, "
                     f"F1-Score {mlp_m.get('f1_score', 0)*100:.1f}%, "
                     f"AUC-ROC {mlp_m.get('auc_roc', 0)*100:.1f}%\n")
        else:
            mlp_cfg = json.load(open('../models/config.json'))
            m = mlp_cfg.get('performance_metrics', {})
            if m:
                perf += (f"- MLP : Précision {m.get('precision', 0)*100:.1f}%, "
                         f"Rappel {m.get('recall', 0)*100:.1f}%, "
                         f"F1-Score {m.get('f1_score', 0)*100:.1f}%\n")

        if bsm_m:
            perf += (f"- BSM : Précision {bsm_m.get('precision', 0)*100:.1f}%, "
                     f"Rappel {bsm_m.get('recall', 0)*100:.1f}%, "
                     f"F1-Score {bsm_m.get('f1_score', 0)*100:.1f}%, "
                     f"Précision sur la fraude (Bloquer) : 94.0%\n")
        else:
            bsm_cfg = json.load(open('../models/bsm_config.json'))
            m = bsm_cfg.get('performance_metrics', {})
            if m:
                perf += (f"- BSM : Précision {m.get('precision', 0)*100:.1f}%, "
                         f"Rappel {m.get('recall', 0)*100:.1f}%, "
                         f"F1-Score {m.get('f1_score', 0)*100:.1f}%\n")
        return perf
    except Exception as e:
        print(f"⚠️ Erreur context perf: {e}")
        return ""


# ── Endpoint chat ─────────────────────────────────────────────

@router.post("/chat")
async def chat(message: ChatMessage):
    msgs = [
        {"role": e["role"], "content": e["content"]}
        for e in (message.history or [])[-10:]
        if e.get("role") in ("user", "assistant")
    ]
    msgs.append({"role": "user", "content": message.message})

    bs  = max(config.bsm_stats["total_sessions"], 1)
    ctx = (
        f"[Contexte live]\n"
        f"MLP — Analyses: {config.mlp_stats['total_analysed']} | "
        f"Fraudes: {config.mlp_stats['total_fraud']} | "
        f"Seuil: {config.MLP_THRESHOLD}\n"
        f"BSM — Sessions: {config.bsm_stats['total_sessions']} | "
        f"Bloquées: {config.bsm_stats['total_blocked']} | "
        f"Taux blocage: {round(config.bsm_stats['total_blocked'] / bs * 100, 2)}%\n"
        f"Supabase: {'Connecté' if config.SUPABASE_OK else 'Non connecté'}"
    )

    perf_ctx  = _get_performance_context()
    full_msgs = [{"role": "system", "content": _SYSTEM_PROMPT + "\n" + perf_ctx + "\n" + ctx}] + msgs

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                    "Content-Type":  "application/json",
                },
                json={
                    "model":      os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    "messages":   full_msgs,
                    "max_tokens": 1000,
                },
            )
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"Groq API Error: {resp.text}")

        data   = resp.json()
        reply  = data["choices"][0]["message"]["content"]
        tokens = data.get("usage", {}).get("total_tokens", 0)

        if config.SUPABASE_OK:
            try:
                config.supabase.table("chat_sessions").insert({
                    "session_id":   message.session_id,
                    "user_message": message.message,
                    "bot_reply":    reply,
                    "tokens_used":  tokens,
                }).execute()
            except Exception:
                pass

        return {"reply": reply, "session_id": message.session_id, "tokens_used": tokens}

    except httpx.TimeoutException:
        raise HTTPException(504, "Timeout chatbot.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


# ── Historique chat ───────────────────────────────────────────

@router.get("/history/chat/{session_id}", tags=["MLP — Historique"])
def get_chat_history(session_id: str, limit: int = 100):
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        r = (config.supabase.table("chat_sessions")
             .select("created_at,user_message,bot_reply,tokens_used")
             .eq("session_id", session_id)
             .order("created_at")
             .limit(limit)
             .execute())
        return {"session_id": session_id, "count": len(r.data), "messages": r.data}
    except Exception as e:
        raise HTTPException(500, str(e))
