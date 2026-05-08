import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Chargement des variables d'environnement
# On cherche le .env dans le dossier courant ou le dossier parent (cas des notebooks)
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '..', 'api', '.env')

load_dotenv(env_path)

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL ou SUPABASE_KEY manquant dans le .env")
    return create_client(url, key)

def update_model_metrics(model_name: str, new_metrics: dict, version: str = "1.0"):
    """
    Compare les nouvelles métriques avec les métriques actives en base.
    Si les nouvelles sont meilleures (F1-score), met à jour la version active.
    """
    print(f"--- Mise à jour des métriques pour {model_name} ---")
    
    try:
        supabase = get_supabase_client()
        
        # 1. Récupérer la métrique active actuelle
        current_active = supabase.table("model_metrics") \
            .select("*") \
            .eq("model_name", model_name) \
            .eq("is_active", True) \
            .execute()
        
        current_f1 = 0
        if current_active.data:
            current_f1 = current_active.data[0].get("f1_score", 0)
            print(f"F1 actuel (actif) : {current_f1:.4f}")
        else:
            print("Aucune métrique active trouvée.")

        new_f1 = new_metrics.get("f1_score", 0)
        print(f"Nouveau F1 : {new_f1:.4f}")

        is_better = new_f1 > current_f1
        
        # 2. Insérer la nouvelle métrique
        # Si c'est la première ou si c'est meilleur, elle devient active
        should_be_active = is_better or not current_active.data
        
        if should_be_active and current_active.data:
            # Désactiver l'ancienne
            supabase.table("model_metrics") \
                .update({"is_active": False}) \
                .eq("model_name", model_name) \
                .execute()
            print(f"Ancienne version de {model_name} désactivée.")

        insert_data = {
            "model_name": model_name,
            "precision": new_metrics.get("precision"),
            "recall": new_metrics.get("recall"),
            "f1_score": new_f1,
            "auc_roc": new_metrics.get("auc_roc"),
            "accuracy": new_metrics.get("accuracy"),
            "version": version,
            "is_active": should_be_active
        }
        
        res = supabase.table("model_metrics").insert(insert_data).execute()
        
        if should_be_active:
            print(f"✅ NOUVELLE VERSION ACTIVE enregistrée pour {model_name} (F1: {new_f1:.4f})")
            # Optionnel : mettre à jour le JSON local pour la robustesse hors-ligne
            _update_local_json(model_name, insert_data)
        else:
            print(f"ℹ️ Métriques enregistrées en historique (non actives, car F1 {new_f1:.4f} <= {current_f1:.4f})")
            
        return res.data[0] if res.data else None

    except Exception as e:
        print(f"❌ Erreur lors de la mise à jour des métriques : {e}")
        return None

def _update_local_json(model_name, metrics):
    """Met à jour le fichier config.json local correspondant."""
    try:
        config_path = '../models/config.json' if model_name == 'MLP' else '../models/bsm_config.json'
        # On ajuste le chemin si on est dans api/
        if not os.path.exists(config_path):
            config_path = os.path.join(os.path.dirname(__file__), '..', 'models', 
                                     'config.json' if model_name == 'MLP' else 'bsm_config.json')
            
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            config['performance_metrics'] = metrics
            config['last_updated'] = datetime.now().isoformat()
            
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            print(f"Fichier local {os.path.basename(config_path)} mis à jour.")
    except Exception as e:
        print(f"⚠️ Erreur mise à jour JSON local : {e}")

def get_active_metrics(model_name: str):
    """Récupère les métriques actives depuis la base."""
    try:
        supabase = get_supabase_client()
        res = supabase.table("model_metrics") \
            .select("*") \
            .eq("model_name", model_name) \
            .eq("is_active", True) \
            .execute()
        return res.data[0] if res.data else None
    except Exception:
        return None
