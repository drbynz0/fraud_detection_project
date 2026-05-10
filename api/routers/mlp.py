# ============================================================
#  routers/mlp.py — Endpoints MLP
#  POST /predict/single | /predict/batch | /predict/file
#  GET  /history/predictions | /history/predictions/{id}/details | /history/dashboard
# ============================================================

import io
import time
import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Query

import config
from schemas.mlp import Transaction, BatchRequest
from services.mlp_service import (
    tx_to_df, predict_mlp, mlp_result,
    update_mlp_stats, save_mlp_session, save_mlp_details,
)

router = APIRouter(tags=["MLP — Détection Transaction"])


# ── Prédiction unitaire ───────────────────────────────────────

@router.post("/predict/single")
def predict_single(transaction: Transaction):
    t0      = time.time()
    df      = tx_to_df(transaction)
    p, l    = predict_mlp(df)
    update_mlp_stats(l)
    elapsed = time.time() - t0
    tx_data = transaction.dict()
    pred_id = save_mlp_session("single", l, elapsed)
    save_mlp_details(pred_id, [tx_data], p, l)
    r = mlp_result(p[0], l[0], tx_data)
    r["prediction_id"] = pred_id
    return r


# ── Prédiction batch (JSON) ───────────────────────────────────

@router.post("/predict/batch")
def predict_batch(request: BatchRequest):
    if not request.transactions:
        raise HTTPException(400, "Liste vide.")
    if len(request.transactions) > 10_000:
        raise HTTPException(400, "Max 10 000 transactions.")
    t0     = time.time()
    dfs    = [tx_to_df(tx) for tx in request.transactions]
    df_all = pd.concat(dfs, ignore_index=True)
    p, l   = predict_mlp(df_all)
    update_mlp_stats(l)
    elapsed = time.time() - t0
    txs     = [tx.dict() for tx in request.transactions]
    pred_id = save_mlp_session("batch", l, elapsed)
    save_mlp_details(pred_id, txs, p, l)
    return {
        "prediction_id": pred_id,
        "summary": {
            "total_transactions": len(l),
            "total_fraud":        int(l.sum()),
            "total_legitimate":   int((l == 0).sum()),
            "fraud_rate_pct":     round(float(l.mean()) * 100, 2),
            "processing_time_s":  round(elapsed, 3),
        },
        "results": [mlp_result(p[i], l[i], txs[i]) for i in range(len(l))],
    }


# ── Prédiction par fichier CSV/Excel ─────────────────────────

_REQUIRED_COLS = [
    'amt', 'hour', 'day_of_week', 'month', 'is_night', 'age',
    'distance_km', 'gender', 'city_pop', 'category', 'state',
    'job', 'merchant', 'avg_amt_card', 'amt_deviation', 'tx_count_card',
]


@router.post("/predict/file")
async def predict_file(file: UploadFile = File(...)):
    fn = file.filename.lower()
    if not any(fn.endswith(e) for e in ['.csv', '.xlsx', '.xls']):
        raise HTTPException(400, "Format non supporté.")
    contents = await file.read()
    try:
        df_in = pd.read_csv(io.BytesIO(contents)) if fn.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(422, f"Lecture impossible : {e}")

    missing = [c for c in _REQUIRED_COLS if c not in df_in.columns]
    if missing:
        raise HTTPException(422, f"Colonnes manquantes : {missing}")
    if len(df_in) == 0:
        raise HTTPException(400, "Fichier vide.")
    if len(df_in) > 100_000:
        raise HTTPException(400, "Max 100 000 lignes.")

    t0   = time.time()
    df_p = df_in.copy()
    for cat in config.CATEGORIES:
        df_p[cat] = df_in['category'].apply(lambda x: 1 if f'category_{x}' == cat else 0)
    df_p.drop(columns=['category'], inplace=True)
    if config.MLP_LOADED:
        df_p = df_p.reindex(columns=config.mlp_columns, fill_value=0)

    p, l    = predict_mlp(df_p)
    update_mlp_stats(l)
    elapsed = time.time() - t0
    txs     = df_in[_REQUIRED_COLS].to_dict(orient='records')
    pred_id = save_mlp_session("file", l, elapsed, filename=file.filename)
    save_mlp_details(pred_id, txs, p, l)

    df_in['fraud_probability_pct'] = (p * 100).round(2)
    df_in['is_fraud']  = l
    df_in['verdict']   = np.where(l == 1, "FRAUDE", "Légitime")
    df_in['risk_level'] = pd.cut(
        p, bins=[0, 0.3, 0.6, 1.0],
        labels=["Faible", "Modéré", "Élevé"],
        include_lowest=True,
    )
    return {
        "prediction_id": pred_id,
        "summary": {
            "filename":           file.filename,
            "total_transactions": len(df_in),
            "total_fraud":        int(l.sum()),
            "total_legitimate":   int((l == 0).sum()),
            "fraud_rate_pct":     round(float(l.mean()) * 100, 2),
            "risk_breakdown":     df_in['risk_level'].value_counts().to_dict(),
            "processing_time_s":  round(elapsed, 3),
        },
        "results": df_in[
            ['amt', 'hour', 'category' if 'category' in df_in.columns else 'amt',
             'fraud_probability_pct', 'is_fraud', 'verdict', 'risk_level']
        ].to_dict(orient='records'),
    }


# ── Historique ────────────────────────────────────────────────

@router.get("/history/predictions", tags=["MLP — Historique"])
def get_mlp_history(limit: int = 50, offset: int = 0):
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        r = (config.supabase.table("predictions")
             .select("*")
             .order("created_at", desc=True)
             .range(offset, offset + limit - 1)
             .execute())
        return {"count": len(r.data), "offset": offset, "limit": limit, "results": r.data}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/history/predictions/{prediction_id}/details", tags=["MLP — Historique"])
def get_mlp_details(prediction_id: str):
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        r = (config.supabase.table("prediction_details")
             .select("*")
             .eq("prediction_id", prediction_id)
             .execute())
        return {"prediction_id": prediction_id, "count": len(r.data), "details": r.data}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/history/dashboard", tags=["MLP — Historique"])
def get_mlp_dashboard():
    if not config.SUPABASE_OK:
        raise HTTPException(503, "Supabase non connecté.")
    try:
        return {
            "daily_stats": config.supabase.table("daily_stats").select("*").limit(30).execute().data,
            "by_category": config.supabase.table("fraud_by_category").select("*").execute().data,
            "by_hour":     config.supabase.table("fraud_by_hour").select("*").execute().data,
        }
    except Exception as e:
        raise HTTPException(500, str(e))
