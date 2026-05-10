# ============================================================
#  routers/system.py — Endpoints système
#  GET /health  |  GET /stats
# ============================================================

from fastapi import APIRouter
import config

router = APIRouter(tags=["Système"])


@router.get("/health")
def health():
    return {
        "status":      "✅ En ligne",
        "mlp": {
            "loaded":    config.MLP_LOADED,
            "version":   config.MLP_VERSION,
            "threshold": config.MLP_THRESHOLD,
        },
        "bsm": {
            "loaded":      config.BSM_LOADED,
            "version":     config.BSM_VERSION,
            "t_challenge": config.BSM_T_CHALLENGE,
            "t_block":     config.BSM_T_BLOCK,
        },
        "supabase_ok":  config.SUPABASE_OK,
        "uptime_since": config.mlp_stats["started_at"],
    }


@router.get("/stats")
def get_all_stats():
    total = max(config.mlp_stats["total_analysed"], 1)
    bs    = max(config.bsm_stats["total_sessions"], 1)
    return {
        "mlp": {
            **config.mlp_stats,
            "fraud_rate_pct": round(config.mlp_stats["total_fraud"] / total * 100, 2),
        },
        "bsm": {
            **config.bsm_stats,
            "block_rate_pct": round(config.bsm_stats["total_blocked"] / bs * 100, 2),
        },
    }
