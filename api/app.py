# ============================================================
#  FRAUD DETECTION API v3 — Bank of Africa
#  FastAPI | MLP TensorFlow | BSM XGBoost | Supabase | Claude AI
# ============================================================

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import numpy as np
import pandas as pd
import pickle, json, io, time, os
from datetime import datetime
import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="FraudShield API v3 — Bank of Africa",
    description="API bicouche : MLP (détection transaction) + BSM XGBoost (scoring session sans OTP).",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ── Supabase ──────────────────────────────────────────────────
try:
    supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
    SUPABASE_OK = True
    print("✅ Supabase connecté")
except Exception as e:
    SUPABASE_OK = False; supabase = None
    print(f"⚠️  Supabase non connecté : {e}")

# ── Modèle MLP ────────────────────────────────────────────────
try:
    import tensorflow as tf
    mlp_model    = tf.keras.models.load_model('../models/mlp_final.keras')
    mlp_scaler   = pickle.load(open('../models/scaler.pkl', 'rb'))
    mlp_columns  = json.load(open('../models/feature_columns.json'))
    mlp_config   = json.load(open('../models/config.json'))
    MLP_THRESHOLD = mlp_config['best_threshold']
    MLP_VERSION   = mlp_config['model_version']
    MLP_LOADED    = True
    print(f"✅ Modèle MLP chargé — version {MLP_VERSION}")
except Exception as e:
    MLP_LOADED = False; MLP_THRESHOLD = 0.5; MLP_VERSION = "N/A"
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
    BSM_LOADED = False; BSM_T_CHALLENGE = 0.30; BSM_T_BLOCK = 0.70; BSM_VERSION = "N/A"
    print(f"⚠️  BSM non chargé : {e}")

# ── Stats mémoire ─────────────────────────────────────────────
mlp_stats = {"total_analysed":0,"total_fraud":0,"total_legitimate":0,"started_at":datetime.now().isoformat()}
bsm_stats = {"total_sessions":0,"total_approved":0,"total_challenged":0,"total_blocked":0,"started_at":datetime.now().isoformat()}

CATEGORIES = ['category_entertainment','category_food_dining','category_gas_transport',
              'category_grocery_net','category_grocery_pos','category_health_fitness',
              'category_home','category_kids_pets','category_misc_net','category_misc_pos',
              'category_personal_care','category_shopping_net','category_shopping_pos','category_travel']


# ============================================================
#  SCHÉMAS PYDANTIC
# ============================================================

class Transaction(BaseModel):
    amt:float=Field(...,example=250.0); hour:int=Field(...,example=14)
    day_of_week:int=Field(...,example=2); month:int=Field(...,example=6)
    is_night:int=Field(...,example=0); age:int=Field(...,example=35)
    distance_km:float=Field(...,example=12.5); gender:int=Field(...,example=0)
    city_pop:int=Field(...,example=50000); category:str=Field(...,example="grocery_pos")
    state:float=Field(...,example=0.012); job:float=Field(...,example=0.008)
    merchant:float=Field(...,example=0.005); avg_amt_card:float=Field(...,example=180.0)
    amt_deviation:float=Field(...,example=70.0); tx_count_card:int=Field(...,example=45)

class BatchRequest(BaseModel):
    transactions: List[Transaction]

class SessionData(BaseModel):
    typing_speed_ms:float=Field(...,example=180.0)
    typing_regularity:float=Field(...,example=0.85)
    copy_paste_detected:int=Field(...,example=0)
    mouse_movement_entropy:float=Field(...,example=0.78)
    time_on_page_sec:float=Field(...,example=45.0)
    field_focus_changes:int=Field(...,example=5)
    form_fill_duration_ms:float=Field(...,example=12000.0)
    tab_switches:int=Field(...,example=1)
    scroll_events:int=Field(...,example=8)
    is_new_device:int=Field(...,example=0)
    device_fingerprint_match:int=Field(...,example=1)
    ip_country_match:int=Field(...,example=1)
    ip_is_vpn_proxy:int=Field(...,example=0)
    time_since_last_login_min:float=Field(...,example=120.0)
    login_failed_attempts:int=Field(...,example=0)
    session_age_sec:float=Field(...,example=300.0)
    is_mobile_desktop_mismatch:int=Field(...,example=0)
    is_new_beneficiary:int=Field(...,example=0)
    amt_vs_avg_ratio:float=Field(...,example=1.0)
    transactions_last_hour:int=Field(...,example=1)
    is_international:int=Field(...,example=0)
    hour_of_day:int=Field(...,example=14)
    is_weekend:int=Field(...,example=0)

class ChatMessage(BaseModel):
    message:str; history:Optional[List[dict]]=[]; session_id:Optional[str]="default"


# ============================================================
#  UTILITAIRES MLP
# ============================================================

def tx_to_df(tx: Transaction) -> pd.DataFrame:
    data=tx.dict(); cat=data.pop('category'); df=pd.DataFrame([data])
    for c in CATEGORIES: df[c]=1 if f'category_{cat}'==c else 0
    if MLP_LOADED: df=df.reindex(columns=mlp_columns,fill_value=0)
    return df

def predict_mlp(df: pd.DataFrame):
    if not MLP_LOADED:
        p=np.random.uniform(0,1,len(df)); return p,(p>=MLP_THRESHOLD).astype(int)
    X=mlp_scaler.transform(df); p=mlp_model.predict(X,verbose=0).flatten()
    return p,(p>=MLP_THRESHOLD).astype(int)

def mlp_result(proba,label,tx_data=None):
    risk='Faible' if proba<0.3 else 'Modéré' if proba<0.6 else 'Élevé'
    r={"fraud_probability_pct":round(float(proba)*100,2),"is_fraud":int(label),
       "verdict":"FRAUDE DÉTECTÉE" if label else "Transaction Légitime",
       "risk_level":risk,"threshold_used":MLP_THRESHOLD,"analysed_at":datetime.now().isoformat()}
    if tx_data: r["transaction"]=tx_data
    return r

def update_mlp_stats(labels):
    mlp_stats["total_analysed"]+=len(labels); mlp_stats["total_fraud"]+=int(labels.sum())
    mlp_stats["total_legitimate"]+=int((labels==0).sum())

def save_mlp_session(mode,labels,elapsed,filename=None):
    if not SUPABASE_OK: return None
    try:
        t=len(labels); f=int(labels.sum())
        r=supabase.table("predictions").insert({"mode":mode,"total_transactions":t,
            "total_fraud":f,"total_legitimate":t-f,"fraud_rate_pct":round(f/t*100,2) if t else 0,
            "processing_time_s":round(elapsed,3),"filename":filename,
            "threshold_used":MLP_THRESHOLD,"model_version":MLP_VERSION}).execute()
        return r.data[0]["id"]
    except Exception as e: print(f"⚠️ Supabase MLP: {e}"); return None

def save_mlp_details(pred_id,txs_data,probas,labels):
    if not SUPABASE_OK or not pred_id: return
    try:
        rows=[{"prediction_id":pred_id,"amt":float(tx.get("amt",0)),"hour":int(tx.get("hour",0)),
               "day_of_week":int(tx.get("day_of_week",0)),"month":int(tx.get("month",0)),
               "is_night":bool(tx.get("is_night",0)),"age":int(tx.get("age",0)),
               "distance_km":float(tx.get("distance_km",0)),"gender":int(tx.get("gender",0)),
               "city_pop":int(tx.get("city_pop",0)),"category":str(tx.get("category","")),
               "avg_amt_card":float(tx.get("avg_amt_card",0)),"amt_deviation":float(tx.get("amt_deviation",0)),
               "tx_count_card":int(tx.get("tx_count_card",0)),"fraud_probability_pct":round(float(probas[i])*100,2),
               "is_fraud":bool(labels[i]),"verdict":"FRAUDE" if labels[i] else "Légitime",
               "risk_level":"Faible" if probas[i]<0.3 else "Modéré" if probas[i]<0.6 else "Élevé"}
              for i,tx in enumerate(txs_data)]
        for i in range(0,len(rows),500):
            supabase.table("prediction_details").insert(rows[i:i+500]).execute()
    except Exception as e: print(f"⚠️ Supabase MLP details: {e}")


# ============================================================
#  UTILITAIRES BSM
# ============================================================

def session_to_arr(session: SessionData) -> np.ndarray:
    data=session.dict(); return np.array([[data[c] for c in bsm_columns]],dtype=float)

def bsm_decision_fn(p_block:float):
    if p_block>=BSM_T_BLOCK:     return 'Bloquer',   '🚨','#ef4444'
    if p_block>=BSM_T_CHALLENGE: return 'Challenger','⚠️', '#f59e0b'
    return 'Approuver','✅','#10b981'

def bsm_result(probas,session_data=None,elapsed_ms=0):
    pa,pc,pb=float(probas[0]),float(probas[1]),float(probas[2])
    decision,icon,color=bsm_decision_fn(pb)
    r={"decision":decision,"icon":icon,"color":color,"risk_score_pct":round(pb*100,2),
       "probabilities":{"approve":round(pa*100,2),"challenge":round(pc*100,2),"block":round(pb*100,2)},
       "thresholds":{"challenge":BSM_T_CHALLENGE*100,"block":BSM_T_BLOCK*100},
       "analysed_at":datetime.now().isoformat(),"model_version":BSM_VERSION,
       "processing_time_ms":round(elapsed_ms,2)}
    if session_data: r["session"]=session_data
    return r

def update_bsm_stats(decision):
    bsm_stats["total_sessions"]+=1
    if decision=='Approuver':   bsm_stats["total_approved"]+=1
    elif decision=='Challenger':bsm_stats["total_challenged"]+=1
    else:                       bsm_stats["total_blocked"]+=1

def save_bsm_session(session_data,probas,decision,elapsed_ms):
    if not SUPABASE_OK: return None
    BOOL_COLS={'copy_paste_detected','is_new_device','device_fingerprint_match',
               'ip_country_match','ip_is_vpn_proxy','is_mobile_desktop_mismatch',
               'is_new_beneficiary','is_international','is_weekend'}
    try:
        row={**{k:(bool(v) if k in BOOL_COLS else v) for k,v in session_data.items()},
             "proba_approve":round(float(probas[0]),4),"proba_challenge":round(float(probas[1]),4),
             "proba_block":round(float(probas[2]),4),"decision":decision,
             "risk_score_pct":round(float(probas[2])*100,2),
             "model_version":BSM_VERSION,"processing_time_ms":round(elapsed_ms,2)}
        r=supabase.table("session_scores").insert(row).execute()
        if not r.data:
            print(f"⚠️ Supabase BSM: Insertion réussie mais aucun ID retourné.")
            return None
        return r.data[0]["id"]
    except Exception as e: 
        print(f"❌ ERREUR Supabase BSM lors de l'insertion : {str(e)}")
        return None


# ============================================================
#  ENDPOINTS — SYSTÈME
# ============================================================

@app.get("/health", tags=["Système"])
def health():
    return {"status":"✅ En ligne","mlp":{"loaded":MLP_LOADED,"version":MLP_VERSION,"threshold":MLP_THRESHOLD},
            "bsm":{"loaded":BSM_LOADED,"version":BSM_VERSION,"t_challenge":BSM_T_CHALLENGE,"t_block":BSM_T_BLOCK},
            "supabase_ok":SUPABASE_OK,"uptime_since":mlp_stats["started_at"]}

@app.get("/stats", tags=["Système"])
def get_all_stats():
    total=max(mlp_stats["total_analysed"],1); bs=max(bsm_stats["total_sessions"],1)
    return {"mlp":{**mlp_stats,"fraud_rate_pct":round(mlp_stats["total_fraud"]/total*100,2)},
            "bsm":{**bsm_stats,"block_rate_pct":round(bsm_stats["total_blocked"]/bs*100,2)}}


# ============================================================
#  ENDPOINTS — MLP (Détection de transactions)
# ============================================================

@app.post("/predict/single", tags=["MLP — Détection Transaction"])
def predict_single(transaction: Transaction):
    t0=time.time(); df=tx_to_df(transaction); p,l=predict_mlp(df); update_mlp_stats(l)
    elapsed=time.time()-t0; tx_data=transaction.dict()
    pred_id=save_mlp_session("single",l,elapsed); save_mlp_details(pred_id,[tx_data],p,l)
    r=mlp_result(p[0],l[0],tx_data); r["prediction_id"]=pred_id; return r

@app.post("/predict/batch", tags=["MLP — Détection Transaction"])
def predict_batch(request: BatchRequest):
    if not request.transactions: raise HTTPException(400,"Liste vide.")
    if len(request.transactions)>10000: raise HTTPException(400,"Max 10 000 transactions.")
    t0=time.time()
    dfs=[tx_to_df(tx) for tx in request.transactions]; df_all=pd.concat(dfs,ignore_index=True)
    p,l=predict_mlp(df_all); update_mlp_stats(l); elapsed=time.time()-t0
    txs=[tx.dict() for tx in request.transactions]
    pred_id=save_mlp_session("batch",l,elapsed); save_mlp_details(pred_id,txs,p,l)
    return {"prediction_id":pred_id,"summary":{"total_transactions":len(l),"total_fraud":int(l.sum()),
            "total_legitimate":int((l==0).sum()),"fraud_rate_pct":round(float(l.mean())*100,2),
            "processing_time_s":round(elapsed,3)},
            "results":[mlp_result(p[i],l[i],txs[i]) for i in range(len(l))]}

@app.post("/predict/file", tags=["MLP — Détection Transaction"])
async def predict_file(file: UploadFile=File(...)):
    fn=file.filename.lower()
    if not any(fn.endswith(e) for e in ['.csv','.xlsx','.xls']): raise HTTPException(400,"Format non supporté.")
    contents=await file.read()
    try: df_in=pd.read_csv(io.BytesIO(contents)) if fn.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    except Exception as e: raise HTTPException(422,f"Lecture impossible : {e}")
    required=['amt','hour','day_of_week','month','is_night','age','distance_km','gender','city_pop',
              'category','state','job','merchant','avg_amt_card','amt_deviation','tx_count_card']
    missing=[c for c in required if c not in df_in.columns]
    if missing: raise HTTPException(422,f"Colonnes manquantes : {missing}")
    if len(df_in)==0: raise HTTPException(400,"Fichier vide.")
    if len(df_in)>100000: raise HTTPException(400,"Max 100 000 lignes.")
    t0=time.time(); df_p=df_in.copy()
    for cat in CATEGORIES: df_p[cat]=df_in['category'].apply(lambda x:1 if f'category_{x}'==cat else 0)
    df_p.drop(columns=['category'],inplace=True)
    if MLP_LOADED: df_p=df_p.reindex(columns=mlp_columns,fill_value=0)
    p,l=predict_mlp(df_p); update_mlp_stats(l); elapsed=time.time()-t0
    txs=df_in[required].to_dict(orient='records')
    pred_id=save_mlp_session("file",l,elapsed,filename=file.filename)
    save_mlp_details(pred_id,txs,p,l)
    df_in['fraud_probability_pct']=(p*100).round(2); df_in['is_fraud']=l
    df_in['verdict']=np.where(l==1,"FRAUDE","Légitime")
    df_in['risk_level']=pd.cut(p,bins=[0,0.3,0.6,1.0],labels=["Faible","Modéré","Élevé"],include_lowest=True)
    return {"prediction_id":pred_id,
            "summary":{"filename":file.filename,"total_transactions":len(df_in),"total_fraud":int(l.sum()),
                       "total_legitimate":int((l==0).sum()),"fraud_rate_pct":round(float(l.mean())*100,2),
                       "risk_breakdown":df_in['risk_level'].value_counts().to_dict(),"processing_time_s":round(elapsed,3)},
            "results":df_in[['amt','hour','category' if 'category' in df_in.columns else 'amt',
                              'fraud_probability_pct','is_fraud','verdict','risk_level']].to_dict(orient='records')}

@app.get("/history/predictions", tags=["MLP — Historique"])
def get_mlp_history(limit:int=50, offset:int=0):
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        r=supabase.table("predictions").select("*").order("created_at",desc=True).range(offset,offset+limit-1).execute()
        return {"count":len(r.data),"offset":offset,"limit":limit,"results":r.data}
    except Exception as e: raise HTTPException(500,str(e))

@app.get("/history/predictions/{prediction_id}/details", tags=["MLP — Historique"])
def get_mlp_details(prediction_id:str):
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        r=supabase.table("prediction_details").select("*").eq("prediction_id",prediction_id).execute()
        return {"prediction_id":prediction_id,"count":len(r.data),"details":r.data}
    except Exception as e: raise HTTPException(500,str(e))

@app.get("/history/dashboard", tags=["MLP — Historique"])
def get_mlp_dashboard():
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        return {"daily_stats":supabase.table("daily_stats").select("*").limit(30).execute().data,
                "by_category":supabase.table("fraud_by_category").select("*").execute().data,
                "by_hour":    supabase.table("fraud_by_hour").select("*").execute().data}
    except Exception as e: raise HTTPException(500,str(e))


# ============================================================
#  ENDPOINTS — BSM (Scoring de session)
# ============================================================

@app.post("/bsm/predict", tags=["BSM — Scoring Session"])
def bsm_predict(session: SessionData):
    """
    Évalue le risque comportemental d'une session de paiement sans OTP.
    Retourne : **Approuver** / **Challenger** / **Bloquer**
    """
    t0=time.time()
    if not BSM_LOADED:
        p=np.array([0.7,0.2,0.1]); elapsed_ms=(time.time()-t0)*1000
    else:
        X=session_to_arr(session); X_sc=bsm_scaler.transform(X)
        p=bsm_model.predict_proba(X_sc)[0]; elapsed_ms=(time.time()-t0)*1000
    decision=bsm_decision_fn(float(p[2]))[0]; update_bsm_stats(decision)
    session_data=session.dict()
    sid=save_bsm_session(session_data,p,decision,elapsed_ms)
    r=bsm_result(p,session_data,elapsed_ms); r["session_id"]=sid; return r

@app.post("/bsm/predict/file", tags=["BSM — Scoring Session"])
async def bsm_predict_file(file: UploadFile=File(...)):
    if not BSM_LOADED: raise HTTPException(503,"Modèle BSM non chargé.")
    fn=file.filename.lower()
    if not any(fn.endswith(e) for e in ['.csv','.xlsx','.xls']): raise HTTPException(400,"Format non supporté.")
    contents = await file.read()
    try: df_in = pd.read_csv(io.BytesIO(contents)) if fn.endswith('.csv') else pd.read_excel(io.BytesIO(contents))
    except Exception as e: raise HTTPException(422, f"Lecture impossible : {e}")
    
    missing = [c for c in bsm_columns if c not in df_in.columns]
    if missing: raise HTTPException(422, f"Colonnes BSM manquantes : {missing}")
    if len(df_in)==0: raise HTTPException(400, "Fichier vide.")
    
    t0 = time.time()
    X = df_in[bsm_columns].values
    X_sc = bsm_scaler.transform(X)
    probs = bsm_model.predict_proba(X_sc)
    
    results = []
    for i in range(len(probs)):
        p = probs[i]
        decision = bsm_decision_fn(float(p[2]))[0]
        update_bsm_stats(decision)
        
        # Sauvegarde individuelle (optionnelle, ici on sauvegarde pour l'historique)
        row_data = df_in.iloc[i][bsm_columns].to_dict()
        save_bsm_session(row_data, p, decision, 0) # 0ms car c'est du batch
        
        results.append({
            "index": i,
            "decision": decision,
            "proba_block": round(float(p[2])*100, 2),
            "risk_score": round(float(p[2])*100, 2),
            "icon": "✅" if decision=="Approuver" else "⚠️" if decision=="Challenger" else "🚨"
        })
    
    elapsed = (time.time() - t0)
    
    # Statistiques du fichier
    decisions_counts = pd.Series([r['decision'] for r in results]).value_counts().to_dict()
    
    return {
        "summary": {
            "filename": file.filename,
            "total_sessions": len(df_in),
            "decisions": decisions_counts,
            "processing_time_s": round(elapsed, 3),
            "model_version": BSM_VERSION
        },
        "results": results
    }

@app.get("/bsm/stats", tags=["BSM — Scoring Session"])
def bsm_get_stats():
    bs=max(bsm_stats["total_sessions"],1)
    result={"session":{**bsm_stats,"block_rate_pct":round(bsm_stats["total_blocked"]/bs*100,2)},
            "historical":None,
            "model":{"loaded":BSM_LOADED,"version":BSM_VERSION,"algorithm":"XGBoost",
                     "threshold_challenge":BSM_T_CHALLENGE,"threshold_block":BSM_T_BLOCK}}
    if SUPABASE_OK:
        try:
            h=supabase.table("bsm_global_stats").select("*").execute()
            result["historical"]=h.data[0] if h.data else {}
        except Exception as e: result["historical"]={"error":str(e)}
    return result

@app.get("/bsm/history", tags=["BSM — Scoring Session"])
def bsm_get_history(limit:int=50, offset:int=0, decision:Optional[str]=None):
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        q=(supabase.table("session_scores")
           .select("id,created_at,decision,risk_score_pct,proba_block,"
                   "is_new_device,ip_is_vpn_proxy,is_new_beneficiary,"
                   "amt_vs_avg_ratio,processing_time_ms,model_version")
           .order("created_at",desc=True))
        if decision in ('Approuver','Challenger','Bloquer'): q=q.eq("decision",decision)
        r=q.range(offset,offset+limit-1).execute()
        return {"count":len(r.data),"offset":offset,"limit":limit,"filter":decision,"results":r.data}
    except Exception as e: raise HTTPException(500,str(e))

@app.get("/bsm/dashboard", tags=["BSM — Scoring Session"])
def bsm_get_dashboard():
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        return {"daily_stats":supabase.table("bsm_daily_stats").select("*").limit(30).execute().data,
                "by_hour":    supabase.table("bsm_block_by_hour").select("*").execute().data,
                "global_stats":supabase.table("bsm_global_stats").select("*").execute().data}
    except Exception as e: raise HTTPException(500,str(e))


# ============================================================
#  ENDPOINT — CHATBOT FRAUDBOT IA
# ============================================================

SYSTEM_PROMPT = """Tu es FraudBot, l'assistant IA de la plateforme FraudShield — Bank of Africa.
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

@app.post("/chat", tags=["Chatbot IA"])
async def chat(message: ChatMessage):
    msgs=[{"role":e["role"],"content":e["content"]} for e in (message.history or [])[-10:] if e.get("role") in ("user","assistant")]
    msgs.append({"role":"user","content":message.message})
    bs=max(bsm_stats["total_sessions"],1)
    ctx=f"""[Contexte live]
MLP — Analyses: {mlp_stats['total_analysed']} | Fraudes: {mlp_stats['total_fraud']} | Seuil: {MLP_THRESHOLD}
BSM — Sessions: {bsm_stats['total_sessions']} | Bloquées: {bsm_stats['total_blocked']} | Taux blocage: {round(bsm_stats['total_blocked']/bs*100,2)}%
Supabase: {'Connecté' if SUPABASE_OK else 'Non connecté'}"""

    # Format pour Groq (OpenAI-compatible)
    full_msgs = [{"role": "system", "content": SYSTEM_PROMPT + "\n" + ctx}] + msgs

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp=await client.post("https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    "messages": full_msgs,
                    "max_tokens": 1000
                })
        
        if resp.status_code != 200:
            raise HTTPException(resp.status_code, f"Groq API Error: {resp.text}")

        data=resp.json()
        reply=data["choices"][0]["message"]["content"]
        tokens=data.get("usage",{}).get("total_tokens",0)
        
        if SUPABASE_OK:
            try: supabase.table("chat_sessions").insert({"session_id":message.session_id,"user_message":message.message,"bot_reply":reply,"tokens_used":tokens}).execute()
            except: pass
        return {"reply":reply,"session_id":message.session_id,"tokens_used":tokens}
    except httpx.TimeoutException: raise HTTPException(504,"Timeout chatbot.")
    except HTTPException: raise
    except Exception as e: raise HTTPException(500,str(e))

@app.get("/history/chat/{session_id}", tags=["Chatbot IA"])
def get_chat_history(session_id:str, limit:int=100):
    if not SUPABASE_OK: raise HTTPException(503,"Supabase non connecté.")
    try:
        r=supabase.table("chat_sessions").select("created_at,user_message,bot_reply,tokens_used").eq("session_id",session_id).order("created_at").limit(limit).execute()
        return {"session_id":session_id,"count":len(r.data),"messages":r.data}
    except Exception as e: raise HTTPException(500,str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
