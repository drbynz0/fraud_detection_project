# 🛡️ FraudShield — Bank of Africa
### Plateforme de Détection de Fraude par Intelligence Artificielle

---

## 📁 Structure du projet

```
fraud_detection_project/
│
├── data/
│   ├── fraudTrain.csv
│   └── fraudTest.csv
│
├── models/                          ← Générés après l'entraînement
│   ├── mlp_final.keras
│   ├── scaler.pkl
│   ├── feature_columns.json
│   └── config.json
│
├── notebooks/
│   ├── 01_EDA.ipynb
│   ├── 02_Preprocessing.ipynb
│   ├── 03_Models_Classiques.ipynb
│   ├── 04_MLP_Model.ipynb
│   └── 05_Evaluation_Comparaison.ipynb
│
├── api/
│   ├── app_v2.py                    ← API FastAPI + Supabase + Chatbot
│   ├── requirements_v2.txt
│   ├── supabase_schema.sql
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx        ← Vue d'ensemble + graphiques
    │   │   ├── SinglePredict.jsx    ← Analyse 1 transaction
    │   │   ├── BatchPredict.jsx     ← Analyse N transactions (JSON)
    │   │   ├── FilePredict.jsx      ← Import CSV / Excel
    │   │   ├── History.jsx          ← Historique Supabase
    │   │   └── ChatBot.jsx          ← FraudBot IA (Claude)
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   └── TopBar.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.js
    └── .env.example
```

---

## 🚀 Installation et démarrage

### 1. Prérequis
- Python 3.10+
- Node.js 18+
- Compte Supabase (gratuit)
- Clé API Anthropic (pour FraudBot)

### 2. Entraîner le modèle
```bash
# Exécuter les notebooks dans l'ordre
jupyter notebook notebooks/01_EDA.ipynb
jupyter notebook notebooks/02_Preprocessing.ipynb
jupyter notebook notebooks/03_Models_Classiques.ipynb
jupyter notebook notebooks/04_MLP_Model.ipynb
jupyter notebook notebooks/05_Evaluation_Comparaison.ipynb
```

### 3. Configurer Supabase
```bash
# Dans Supabase → SQL Editor → coller et exécuter :
api/supabase_schema.sql
```

### 4. Lancer l'API
```bash
cd api
pip install -r requirements_v2.txt
cp .env.example .env          # Remplir SUPABASE_URL, SUPABASE_KEY, ANTHROPIC_API_KEY
uvicorn app_v2:app --reload --port 8000
# Documentation interactive : http://localhost:8000/docs
```

### 5. Lancer le Frontend
```bash
cd frontend
npm install
cp .env.example .env          # Vérifier VITE_API_URL
npm run dev
# Application : http://localhost:5173
```

---

## 🎯 Fonctionnalités

| Fonctionnalité           | Description |
|--------------------------|-------------|
| **Dashboard**            | KPIs temps réel, graphiques (donut, barres, heatmap heures, catégories) |
| **Analyse Unitaire**     | Formulaire complet, résultat instantané avec jauge de probabilité |
| **Analyse Batch**        | Tableau interactif, jusqu'à 10 000 transactions, export CSV |
| **Import Fichier**       | Drag & drop CSV/Excel, 100K transactions, pagination, export |
| **Historique**           | Sessions Supabase, recherche, filtres, détail par transaction |
| **FraudBot IA**          | Chatbot Claude AI, 8 questions rapides, export conversation |

---

## 🧠 Le Modèle MLP

```
Input (n features)
    ↓
Dense(256) + BatchNorm + ReLU + Dropout(0.3)
    ↓
Dense(128) + BatchNorm + ReLU + Dropout(0.3)
    ↓
Dense(64) + ReLU + Dropout(0.2)
    ↓
Dense(1) + Sigmoid → P(fraude) ∈ [0, 1]
```

**Dataset** : Sparkov (fraudTrain.csv + fraudTest.csv)  
**Features clés** : `amt`, `distance_km` (Haversine), `hour`, `age`, `amt_deviation`, `tx_count_card`  
**Métriques cibles** : Recall, F1-Score, AUC-ROC  

---

## 📡 Endpoints API

| Méthode | Endpoint                              | Description |
|---------|---------------------------------------|-------------|
| GET     | `/health`                             | Statut API + modèle |
| GET     | `/stats`                              | Stats session + historique |
| POST    | `/predict/single`                     | 1 transaction JSON |
| POST    | `/predict/batch`                      | N transactions JSON |
| POST    | `/predict/file`                       | Fichier CSV/Excel |
| POST    | `/chat`                               | FraudBot IA |
| GET     | `/history/predictions`                | Historique sessions |
| GET     | `/history/predictions/{id}/details`   | Détail session |
| GET     | `/history/chat/{session_id}`          | Historique chat |
| GET     | `/history/dashboard`                  | Données dashboard |

---

## 🎨 Stack Technique

**ML** : Python · TensorFlow/Keras · scikit-learn · pandas · numpy  
**API** : FastAPI · Supabase (PostgreSQL) · httpx  
**Frontend** : React 18 · Vite · Tailwind CSS  
**IA Chatbot** : Claude Sonnet (Anthropic)  
**Déploiement** : Uvicorn (API) · Vite build (Frontend)

---

*Développé dans le cadre d'un stage chez Bank of Africa — Essaouira, Maroc*
