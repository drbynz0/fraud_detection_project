# ============================================================
#  routers/bsm.py — Endpoints BSM (Scoring de session)
#  POST /bsm/predict | /bsm/predict/file
#  GET  /bsm/stats   | /bsm/history | /bsm/dashboard
# ============================================================

import io
import time
import numpy as np
import pandas as pd
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException

import config
from schemas.bsm import SessionData
from services.bsm_service import (
    session_to_arr, bsm_decision_fn, bsm_result,
    update_bsm_stats, save_bsm_session,
)

router = APIRouter(tags=["BSM — Scoring Session"])


# ── Prédiction unitaire ───────────────────────────────────────

@router.post("/bsm/predict")
def bsm_predict(session: SessionData):
    """
    Évalue le risque comportemental d'une session de paiement sans OTP.
    Retourne : **Approuver** / **Challenger** / **Bloquer**
    """
    t0 = time.time()
    if not config.BSM_LOADED:
        p = np.array([0.7, 0.2, 0.1])
        elapsed_ms = (time.time() - t0) * 1000
    else:
        X          = session_to_arr(session)
        X_sc       = config.bsm_scaler.transform(X)
        p          = config.bsm_model.predict_proba(X_sc)[0]
        elapsed_ms = (time.time() - t0) * 1000

    decision     = bsm_decision_fn(float(p[2]))[0]
    update_bsm_stats(decision)
    session_data = session.dict()
    sid          = save_bsm_session(session_data, p, decision, elapsed_ms)
    r            = bsm_result(p, session_data, elapsed_ms)
    r["session_id"] = sid
    return r


# ── Prédiction batch (fichier) ────────────────────────────────

@router.post("/bsm/predict/file")
async def bsm_predict_file(file: UploadFile = File(...)):
    if not config.BSM_LOADED:
        raise HTTPException(503, "Modèle BSM non chargé.")
    fn = file.filename.lower()
    if not any(fn.endswith(e) for e in ['.csv', '.xlsx', '.xls']):
        raise HTTPException(400, "Format non supporté.")
    contents = await file.read()
    try:
        df_in = (pd.read_csv(io.BytesIO(contents)) if fn.endswith('.csv')
                 else pd.read_excel(io.BytesIO(contents)))
    except Exception as e:
        raise HTTPException(422, f"Lecture impossible : {e}")

    missing = [c for c in config.bsm_columns if c not in df_in.columns]
    if missing:
        raise HTTPException(422, f"Colonnes BSM manquantes : {missing}")
    if len(df_in) == 0:
        raise HTTPException(400, "Fichier vide.")

    t0    = time.time()
    X     = df_in[config.bsm_columns].values
    X_sc  = config.bsm_scaler.transform(X)
    probs = config.bsm_model.predict_proba(X_sc)

    results = []
    for i, p in enumerate(probs):
        decision = bsm_decision_fn(float(p[2]))[0]
        update_bsm_stats(decision)
        row_data = df_in.iloc[i][config.bsm_columns].to_dict()
        save_bsm_session(row_data, p, decision, 0)
        results.append({
            "index":       i,
            "decision":    decision,
            "proba_block": round(float(p[2]) * 100, 2),
            "risk_score":  round(float(p[2]) * 100, 2),
            "icon":        "✅" if decision == "Approuver" else "⚠️" if decision == "Challenger" else "🚨",
        })

    elapsed          = time.time() - t0
    decisions_counts = pd.Series([r['decision'] for r in results]).value_counts().to_dict()
    return {
        "summary": {
            "filename":         file.filename,
            "total_sessions":   len(df_in),
            "decisions":        decisions_counts,
            "processing_time_s": round(elapsed, 3),
            "model_version":    config.BSM_VERSION,
        },
        "results": results,
    }


# ── Stats ─────────────────────────────────────────────────────

@router.get("/bsm/stats")
def bsm_get_stats():
    bs = max(config.bsm_stats["total_sessions"], 1)
    result = {
        "session": {
            **config.bsm_stats,
            "block_rate_pct": round(config.bsm_stats["total_blocked"] / bs * 100, 2),
        },
        "historical": None,
        "model": {
            "loaded":             config.BSM_LOADED,
            "version":            config.BSM_VERSION,
            "algorithm":          "XGBoost",
            "threshold_challenge": config.BSM_T_CHALLENGE,
            "threshold_block":    config.BSM_T_BLOCK,
        },
    }
    if config.SUPABASE_OK:
        try:
            h = config.supabase.table("bsm_global_stats").select("*").execute()
            result["historical"] = h.data[0] if h.data else {}
        except Exception as e:
            result["historical"] = {"error": str(e)}
    return result


# ── Historique ────────────────────────────────────────────────

@router.get("/bsm/history")
def bsm_get_history(limit: int = 50, offset: int = 0, decision: Optional[str] = None):
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        q = (config.supabase.table("session_scores")
             .select("id,created_at,decision,risk_score_pct,proba_block,"
                     "is_new_device,ip_is_vpn_proxy,is_new_beneficiary,"
                     "amt_vs_avg_ratio,processing_time_ms,model_version")
             .order("created_at", desc=True))
        if decision in ('Approuver', 'Challenger', 'Bloquer'):
            q = q.eq("decision", decision)
        r = q.range(offset, offset + limit - 1).execute()
        return {"count": len(r.data), "offset": offset, "limit": limit, "filter": decision, "results": r.data}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/bsm/dashboard")
def bsm_get_dashboard():
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        return {
            "daily_stats":  config.supabase.table("bsm_daily_stats").select("*").limit(30).execute().data,
            "by_hour":      config.supabase.table("bsm_block_by_hour").select("*").execute().data,
            "global_stats": config.supabase.table("bsm_global_stats").select("*").execute().data,
        }
    except Exception as e:
        raise HTTPException(500, str(e))
