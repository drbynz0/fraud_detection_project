# ============================================================
#  services/mlp_service.py — Logique métier MLP
#  Prédiction, formatage des résultats, persistance Supabase
# ============================================================

import numpy as np
import pandas as pd
from datetime import datetime

import config
from schemas.mlp import Transaction


# ── Préparation des données ───────────────────────────────────

def tx_to_df(tx: Transaction) -> pd.DataFrame:
    """Convertit une Transaction Pydantic en DataFrame prêt pour le modèle."""
    data = tx.dict()
    cat  = data.pop('category')
    df   = pd.DataFrame([data])
    for c in config.CATEGORIES:
        df[c] = 1 if f'category_{cat}' == c else 0
    if config.MLP_LOADED:
        df = df.reindex(columns=config.mlp_columns, fill_value=0)
    return df


# ── Inférence ─────────────────────────────────────────────────

def predict_mlp(df: pd.DataFrame):
    """Retourne (probas, labels) — utilise le modèle réel ou une simulation."""
    if not config.MLP_LOADED:
        p = np.random.uniform(0, 1, len(df))
        return p, (p >= config.MLP_THRESHOLD).astype(int)
    X = config.mlp_scaler.transform(df)
    p = config.mlp_model.predict(X, verbose=0).flatten()
    return p, (p >= config.MLP_THRESHOLD).astype(int)


# ── Formatage du résultat ─────────────────────────────────────

def mlp_result(proba: float, label: int, tx_data: dict = None) -> dict:
    """Construit la réponse JSON d'une prédiction MLP."""
    risk = 'Faible' if proba < 0.3 else 'Modéré' if proba < 0.6 else 'Élevé'
    r = {
        "fraud_probability_pct": round(float(proba) * 100, 2),
        "is_fraud":              int(label),
        "verdict":               "FRAUDE DÉTECTÉE" if label else "Transaction Légitime",
        "risk_level":            risk,
        "threshold_used":        config.MLP_THRESHOLD,
        "analysed_at":           datetime.now().isoformat(),
    }
    if tx_data:
        r["transaction"] = tx_data
    return r


# ── Stats mémoire ─────────────────────────────────────────────

def update_mlp_stats(labels: np.ndarray) -> None:
    config.mlp_stats["total_analysed"]   += len(labels)
    config.mlp_stats["total_fraud"]      += int(labels.sum())
    config.mlp_stats["total_legitimate"] += int((labels == 0).sum())


# ── Persistance Supabase ──────────────────────────────────────

def save_mlp_session(mode: str, labels: np.ndarray, elapsed: float, filename: str = None):
    """Insère un enregistrement de session dans la table `predictions`."""
    if not config.SUPABASE_OK:
        return None
    try:
        t = len(labels)
        f = int(labels.sum())
        r = config.supabase.table("predictions").insert({
            "mode":               mode,
            "total_transactions": t,
            "total_fraud":        f,
            "total_legitimate":   t - f,
            "fraud_rate_pct":     round(f / t * 100, 2) if t else 0,
            "processing_time_s":  round(elapsed, 3),
            "filename":           filename,
            "threshold_used":     config.MLP_THRESHOLD,
            "model_version":      config.MLP_VERSION,
        }).execute()
        return r.data[0]["id"]
    except Exception as e:
        print(f"⚠️ Supabase MLP session: {e}")
        return None


def save_mlp_details(pred_id: str, txs_data: list, probas: np.ndarray, labels: np.ndarray) -> None:
    """Insère le détail de chaque transaction dans `prediction_details`."""
    if not config.SUPABASE_OK or not pred_id:
        return
    try:
        rows = [
            {
                "prediction_id":       pred_id,
                "amt":                 float(tx.get("amt", 0)),
                "hour":                int(tx.get("hour", 0)),
                "day_of_week":         int(tx.get("day_of_week", 0)),
                "month":               int(tx.get("month", 0)),
                "is_night":            bool(tx.get("is_night", 0)),
                "age":                 int(tx.get("age", 0)),
                "distance_km":         float(tx.get("distance_km", 0)),
                "gender":              int(tx.get("gender", 0)),
                "city_pop":            int(tx.get("city_pop", 0)),
                "category":            str(tx.get("category", "")),
                "avg_amt_card":        float(tx.get("avg_amt_card", 0)),
                "amt_deviation":       float(tx.get("amt_deviation", 0)),
                "tx_count_card":       int(tx.get("tx_count_card", 0)),
                "fraud_probability_pct": round(float(probas[i]) * 100, 2),
                "is_fraud":            bool(labels[i]),
                "verdict":             "FRAUDE" if labels[i] else "Légitime",
                "risk_level":          "Faible" if probas[i] < 0.3 else "Modéré" if probas[i] < 0.6 else "Élevé",
            }
            for i, tx in enumerate(txs_data)
        ]
        for i in range(0, len(rows), 500):
            config.supabase.table("prediction_details").insert(rows[i:i + 500]).execute()
    except Exception as e:
        print(f"⚠️ Supabase MLP details: {e}")
