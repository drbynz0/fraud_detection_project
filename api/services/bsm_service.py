# ============================================================
#  services/bsm_service.py — Logique métier BSM
#  Prédiction comportementale, formatage, persistance Supabase
# ============================================================

import numpy as np
from datetime import datetime

import config
from schemas.bsm import SessionData


# Colonnes booléennes pour la sérialisation Supabase
_BOOL_COLS = {
    'copy_paste_detected', 'is_new_device', 'device_fingerprint_match',
    'ip_country_match', 'ip_is_vpn_proxy', 'is_mobile_desktop_mismatch',
    'is_new_beneficiary', 'is_international', 'is_weekend',
}


# ── Préparation des données ───────────────────────────────────

def session_to_arr(session: SessionData) -> np.ndarray:
    """Convertit une SessionData Pydantic en tableau numpy ordonné."""
    data = session.dict()
    return np.array([[data[c] for c in config.bsm_columns]], dtype=float)


# ── Logique de décision ───────────────────────────────────────

def bsm_decision_fn(p_block: float) -> tuple:
    """Retourne (décision, icône, couleur) selon le score de risque."""
    if p_block >= config.BSM_T_BLOCK:
        return 'Bloquer',    '🚨', '#ef4444'
    if p_block >= config.BSM_T_CHALLENGE:
        return 'Challenger', '⚠️',  '#f59e0b'
    return 'Approuver', '✅', '#10b981'


# ── Formatage du résultat ─────────────────────────────────────

def bsm_result(probas: np.ndarray, session_data: dict = None, elapsed_ms: float = 0) -> dict:
    """Construit la réponse JSON d'une prédiction BSM."""
    pa, pc, pb = float(probas[0]), float(probas[1]), float(probas[2])
    decision, icon, color = bsm_decision_fn(pb)
    r = {
        "decision":      decision,
        "icon":          icon,
        "color":         color,
        "risk_score_pct": round(pb * 100, 2),
        "probabilities": {
            "approve":   round(pa * 100, 2),
            "challenge": round(pc * 100, 2),
            "block":     round(pb * 100, 2),
        },
        "thresholds": {
            "challenge": config.BSM_T_CHALLENGE * 100,
            "block":     config.BSM_T_BLOCK * 100,
        },
        "analysed_at":        datetime.now().isoformat(),
        "model_version":      config.BSM_VERSION,
        "processing_time_ms": round(elapsed_ms, 2),
    }
    if session_data:
        r["session"] = session_data
    return r


# ── Stats mémoire ─────────────────────────────────────────────

def update_bsm_stats(decision: str) -> None:
    config.bsm_stats["total_sessions"] += 1
    if decision == 'Approuver':
        config.bsm_stats["total_approved"] += 1
    elif decision == 'Challenger':
        config.bsm_stats["total_challenged"] += 1
    else:
        config.bsm_stats["total_blocked"] += 1


# ── Persistance Supabase ──────────────────────────────────────

def save_bsm_session(session_data: dict, probas: np.ndarray, decision: str, elapsed_ms: float):
    """Insère un enregistrement de session BSM dans `session_scores`."""
    if not config.SUPABASE_OK:
        return None
    try:
        row = {
            **{k: (bool(v) if k in _BOOL_COLS else v) for k, v in session_data.items()},
            "proba_approve":    round(float(probas[0]), 4),
            "proba_challenge":  round(float(probas[1]), 4),
            "proba_block":      round(float(probas[2]), 4),
            "decision":         decision,
            "risk_score_pct":   round(float(probas[2]) * 100, 2),
            "model_version":    config.BSM_VERSION,
            "processing_time_ms": round(elapsed_ms, 2),
        }
        r = config.supabase.table("session_scores").insert(row).execute()
        if not r.data:
            print("⚠️ Supabase BSM: insertion réussie mais aucun ID retourné.")
            return None
        return r.data[0]["id"]
    except Exception as e:
        print(f"❌ ERREUR Supabase BSM lors de l'insertion : {e}")
        return None
