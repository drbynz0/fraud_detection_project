# ============================================================
#  config.py — Source de vérité unique
#  Chargement des modèles, connexion Supabase, stats mémoire
# ============================================================

import os
import json
import pickle
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# ── Supabase ──────────────────────────────────────────────────
try:
    supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    SUPABASE_OK = True
    print("✅ Supabase connecté")
except Exception as e:
    SUPABASE_OK = False
    supabase = None
    print(f"⚠️  Supabase non connecté : {e}")

# ── Modèle MLP ────────────────────────────────────────────────
try:
    import tensorflow as tf
    mlp_model   = tf.keras.models.load_model('../models/mlp_final.keras')
    mlp_scaler  = pickle.load(open('../models/scaler.pkl', 'rb'))
    mlp_columns = json.load(open('../models/feature_columns.json'))
    mlp_config  = json.load(open('../models/config.json'))
    MLP_THRESHOLD = mlp_config['best_threshold']
    MLP_VERSION   = mlp_config['model_version']
    MLP_LOADED    = True
    print(f"✅ Modèle MLP chargé — version {MLP_VERSION}")
except Exception as e:
    mlp_model = mlp_scaler = mlp_columns = None
    MLP_LOADED = False
    MLP_THRESHOLD = 0.5
    MLP_VERSION   = "N/A"
    print(f"⚠️  MLP non chargé : {e}")

# ── Modèle BSM ────────────────────────────────────────────────
try:
    bsm_model   = pickle.load(open('../models/bsm_model.pkl', 'rb'))
    bsm_scaler  = pickle.load(open('../models/bsm_scaler.pkl', 'rb'))
    bsm_columns = json.load(open('../models/bsm_feature_columns.json'))
    bsm_cfg     = json.load(open('../models/bsm_config.json'))
    BSM_T_CHALLENGE = bsm_cfg['threshold_challenge']
    BSM_T_BLOCK     = bsm_cfg['threshold_block']
    BSM_VERSION     = bsm_cfg['model_version']
    BSM_LOADED      = True
    print(f"✅ Modèle BSM chargé — version {BSM_VERSION}")
except Exception as e:
    bsm_model = bsm_scaler = bsm_columns = None
    BSM_LOADED      = False
    BSM_T_CHALLENGE = 0.30
    BSM_T_BLOCK     = 0.70
    BSM_VERSION     = "N/A"
    print(f"⚠️  BSM non chargé : {e}")

# ── Stats mémoire ─────────────────────────────────────────────
mlp_stats: dict = {
    "total_analysed":    0,
    "total_fraud":       0,
    "total_legitimate":  0,
    "started_at":        datetime.now().isoformat(),
}

bsm_stats: dict = {
    "total_sessions":   0,
    "total_approved":   0,
    "total_challenged": 0,
    "total_blocked":    0,
    "started_at":       datetime.now().isoformat(),
}

# ── Catégories MLP ────────────────────────────────────────────
CATEGORIES = [
    'category_entertainment', 'category_food_dining',
    'category_gas_transport', 'category_grocery_net',
    'category_grocery_pos',   'category_health_fitness',
    'category_home',          'category_kids_pets',
    'category_misc_net',      'category_misc_pos',
    'category_personal_care', 'category_shopping_net',
    'category_shopping_pos',  'category_travel',
]
