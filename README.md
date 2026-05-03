# 🛡️ FraudShield v3 — Système Avancé de Détection de Fraude

**Projet de Stage - Bank of Africa (BMCE)**
Une plateforme bicouche combinant l'analyse de transactions par Deep Learning et le monitoring comportemental de session.

## 🚀 Vue d'ensemble

FraudShield est une solution de pointe conçue pour sécuriser les transactions bancaires en temps réel. Elle repose sur deux piliers technologiques complémentaires :

1.  **Module A (MLP)** : Détection de fraude au niveau transactionnel basée sur un réseau de neurones (Multi-Layer Perceptron).
2.  **Module B (BSM)** : Scoring de risque comportemental (*Behavioral Session Monitoring*) utilisant XGBoost pour sécuriser les transactions sans OTP.
3.  **FraudBot IA** : Un assistant conversationnel intelligent intégré (via Groq/Llama) pour aider les analystes à interpréter les scores de risque.

## 🛠️ Architecture Technique

### Backend (FastAPI)
- **Modèles ML** : 
  - TensorFlow/Keras (MLP) pour les transactions.
  - XGBoost (BSM) pour le comportement utilisateur.
- **Base de données** : Supabase (PostgreSQL) pour l'historique et la persistance.
- **LLM** : Intégration Groq API (Llama 3) pour l'assistant IA.

### Frontend (React + Vite)
- Interface moderne, réactive et "Premium" avec Dark Mode natif.
- Visualisations de données dynamiques (Donuts, Heatmaps, SHAP plots).
- Système de gestion d'état fluide pour l'analyse batch et unitaire.

## 📦 Installation & Démarrage

### 1. Prérequis
- Python 3.10+
- Node.js 18+
- Un compte Supabase et une clé API Groq.

### 2. Configuration du Backend
```bash
cd api
pip install -r requirements.txt
# Créer un fichier .env avec :
# SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY
python app.py
```

### 3. Configuration du Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📊 Fonctionnalités Clés

- **Analyse Unitaire & Batch** : Testez des transactions isolées ou importez des fichiers CSV (jusqu'à 100 000 lignes).
- **Dashboard Admin** : Statistiques globales, taux de fraude par catégorie et répartition horaire.
- **Historique BSM** : Suivi des sessions suspectes avec analyse des signaux (vitesse de frappe, entropie souris, VPN, etc.).
- **Interprétabilité (SHAP)** : Comprenez *pourquoi* une session est jugée risquée grâce aux valeurs SHAP intégrées.

## 📂 Structure du Projet

```text
├── api/                # Serveur FastAPI et logique métier
├── frontend/           # Interface React (Vite)
├── models/             # Artefacts des modèles entraînés (.keras, .pkl)
├── notebooks/          # Pipelines d'entraînement et recherche SHAP
├── data/               # Jeux de données d'entraînement (Sparkov)
└── schema.sql          # Définition de la base de données Supabase
```

## 👥 Auteur
**drbynz0** - Stage 3IASD @ Bank of Africa (BMCE)
