# Rapport de Stage — FraudShield : Système de Détection de Fraude Bancaire par Intelligence Artificielle

**Établissement d'accueil :** Bank of Africa (BMCE Bank)  
**Filière :** 3ème année Ingénierie en Intelligence Artificielle et Science des Données (3IASD)  
**Durée du stage :** 1er avril - 31 mai 2026  
**Auteur :** Nizar SOILHI 

---

## 1. Présentation de l'Organisme d'Accueil

### 1.1 Bank of Africa (BMCE Bank)

Bank of Africa, anciennement connue sous le sigle BMCE Bank, est l'une des premières institutions financières du Maroc et du continent africain. Fondée en 1959, elle opère aujourd'hui dans plus de 20 pays africains et gère des millions de comptes clients. Son réseau couvre l'ensemble du territoire marocain avec plusieurs centaines d'agences physiques et une présence digitale en forte croissance.

La banque a engagé depuis plusieurs années une transformation numérique ambitieuse, plaçant la sécurité des transactions numériques au cœur de ses priorités stratégiques. Dans ce cadre, la direction des systèmes d'information a initié le projet **FraudShield**, une plateforme de détection de fraude par intelligence artificielle.

### 1.2 Contexte du Stage

Ce stage s'inscrit dans la mission de renforcer la cybersécurité bancaire face à une recrudescence des tentatives de fraude sur les canaux digitaux. Avec le développement du paiement sans OTP (One-Time Password) sur certaines plateformes e-commerce partenaires, de nouvelles failles de sécurité sont apparues, nécessitant une réponse technologique innovante.

---

## 2. Problématique et Objectifs

### 2.1 Problématique Générale

La fraude bancaire représente un fléau croissant pour les institutions financières. Selon les estimations de l'industrie, les pertes liées à la fraude sur les paiements en ligne atteignent plusieurs milliards de dollars annuellement à l'échelle mondiale. Au Maroc, la digitalisation accélérée des services bancaires expose davantage les clients à des risques de fraude transactionnelle et comportementale.

Deux problématiques distinctes mais complémentaires ont été identifiées :

1. **La fraude transactionnelle classique** : Détection de transactions frauduleuses basée sur les caractéristiques financières et contextuelles (montant, heure, localisation, catégorie marchande).
2. **La fraude comportementale lors de sessions sans OTP** : Certaines transactions en ligne ne nécessitent pas de code OTP, créant une faille exploitée par des bots et des fraudeurs qui usurpent l'identité des clients. La problématique est alors : *comment distinguer un utilisateur légitime d'un fraudeur, uniquement à partir de son comportement de navigation ?*

### 2.2 Objectifs du Projet

L'objectif principal est de concevoir, entraîner et déployer une **plateforme MLOps complète** capable de :

- Analyser des transactions bancaires en temps réel et signaler les fraudes potentielles.
- Évaluer le risque comportemental d'une session de paiement en l'absence d'OTP.
- Fournir aux analystes de la fraude un outil de supervision avec historique, statistiques et assistance IA.
- Maintenir un pipeline de réentraînement automatique avec versionnement des modèles.

---

## 3. Architecture Générale du Système FraudShield

FraudShield est une plateforme **bicouche** construite autour de deux modules d'intelligence artificielle complémentaires et d'une interface web unifiée.

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRAUDSHIELD v3                              │
│                  Bank of Africa Platform                        │
├─────────────┬───────────────────────┬───────────────────────────┤
│  MODULE A   │     MODULE B — BSM    │   ASSISTANT IA            │
│   (MLP)     │  Behavioral Scoring   │   FraudBot (Groq/Llama)   │
├─────────────┴───────────────────────┴───────────────────────────┤
│              BACKEND — FastAPI v3 (Python)                       │
│         /predict  /bsm/predict  /chat  /history                 │
├──────────────────────────────────────────────────────────────────┤
│              BASE DE DONNÉES — Supabase (PostgreSQL)             │
│  predictions | session_scores | chat_sessions | model_metrics   │
├──────────────────────────────────────────────────────────────────┤
│              FRONTEND — React 18 + Vite + Tailwind CSS           │
│    Dashboard | Analyse | BSM | Simulateur | Démo Live | ChatBot  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Stack Technologique

| Couche | Technologie | Version | Rôle |
|--------|------------|---------|------|
| Deep Learning | TensorFlow / Keras | 2.16.1 / 3.3.3 | Modèle MLP |
| Gradient Boosting | XGBoost | 2.x | Modèle BSM |
| Machine Learning | Scikit-learn | 1.5.0 | Preprocessing, modèles classiques |
| Équilibrage données | Imbalanced-learn | 0.12.3 | SMOTE, sous-échantillonnage |
| API Backend | FastAPI + Uvicorn | 0.111.0 / 0.30.1 | Serveur REST asynchrone |
| Validation données | Pydantic | 2.7.2 | Schémas de validation |
| Base de données | Supabase (PostgreSQL) | Cloud | Persistance, historique |
| Frontend | React 18 + Vite | 18.3.1 / 5.4.8 | Interface utilisateur |
| Styling | TailwindCSS | 3.4.14 | Design system |
| LLM Assistant | Groq API (Llama 3.3) | 70B | Chatbot IA |
| Interprétabilité | SHAP | — | Explication des décisions |

---

## 4. Données et Exploration

### 4.1 Jeu de Données — Module MLP (Transactions)

**Source :** Dataset Sparkov (Kaggle) — Simulation de transactions bancaires générées synthétiquement par l'outil Sparkov Data Generation.

**Caractéristiques :**
- **Fichier d'entraînement :** `fraudTrain.csv` — 351 MB
- **Fichier de test :** `fraudTest.csv` — 150 MB
- **Volume total :** ~1,3 million de transactions
- **Variable cible :** `is_fraud` (binaire : 0 = Légitime, 1 = Fraude)
- **Déséquilibre de classes :** ~99,5% légitime vs ~0,5% fraude (déséquilibre sévère)

**Features brutes disponibles :**
- Informations temporelles : date, heure
- Informations géographiques : localisation du marchand, du client, distance calculée
- Informations financières : montant (`amt`), catégorie de marchand
- Informations démographiques : âge, genre
- Identifiants : numéro de carte, marchand (encodés)

### 4.2 Analyse Exploratoire (EDA — Notebook 01)

L'analyse exploratoire a permis de dégager les observations suivantes :

**Patterns temporels :**
- Les fraudes sont surreprésentées la nuit (entre 22h et 5h du matin).
- Un pic de fraudes est observé les week-ends.
- Les mois de mai et décembre présentent des taux légèrement supérieurs.

**Patterns catégoriels :**
- Les catégories `grocery_net` (épicerie en ligne), `shopping_net` et `misc_net` présentent les taux de fraude les plus élevés.
- Les transactions physiques (POS) sont moins sujettes à la fraude que les transactions en ligne (NET).

**Patterns financiers :**
- Les montants frauduleux suivent une distribution différente : plus de fraudes sur des montants moyens (entre 200 et 800 MAD) que sur des montants très faibles ou très élevés.
- La déviation par rapport au montant moyen habituel du porteur (`amt_deviation`) est un indicateur fort.

**Matrice de corrélation :**
Les features les plus corrélées avec `is_fraud` sont : `is_night`, `amt_deviation`, `distance_km`, `category_shopping_net`, `category_misc_net`.

### 4.3 Jeu de Données — Module BSM (Comportemental)

Le module BSM repose sur un dataset synthétique généré spécifiquement pour ce projet, simulant des sessions de paiement en ligne avec des profils comportementaux distincts (utilisateur légitime, bot scripté, fraudeur humain).

**23 features comportementales et contextuelles :**

| Catégorie | Features |
|-----------|----------|
| **Biométrie comportementale** | `typing_speed_ms`, `typing_regularity`, `copy_paste_detected`, `mouse_movement_entropy` |
| **Navigation** | `time_on_page_sec`, `field_focus_changes`, `form_fill_duration_ms`, `tab_switches`, `scroll_events` |
| **Contexte appareil** | `is_new_device`, `device_fingerprint_match`, `is_mobile_desktop_mismatch` |
| **Contexte réseau** | `ip_country_match`, `ip_is_vpn_proxy` |
| **Contexte session** | `time_since_last_login_min`, `login_failed_attempts`, `session_age_sec` |
| **Contexte transaction** | `is_new_beneficiary`, `amt_vs_avg_ratio`, `transactions_last_hour`, `is_international` |
| **Temporel** | `hour_of_day`, `is_weekend` |

**Variable cible triclasse :**
- `0` — Approuver : Session à faible risque, transaction validée automatiquement
- `1` — Challenger : Risque modéré, validation supplémentaire requise (OTP ou autre)
- `2` — Bloquer : Risque élevé, transaction bloquée, alerte levée

---

## 5. Pipeline de Prétraitement (Notebook 02)

### 5.1 Ingénierie des Features (Feature Engineering) — MLP

Partant des données brutes Sparkov, les transformations suivantes ont été appliquées :

**Features temporelles dérivées :**
- `hour` : Heure de la transaction (0–23)
- `day_of_week` : Jour de la semaine (0=Lundi, 6=Dimanche)
- `month` : Mois de l'année
- `is_night` : Indicateur binaire (1 si heure ∈ [22h, 6h])
- `is_weekend` : Indicateur binaire

**Features géographiques :**
- `distance_km` : Distance euclidienne (approximée) entre la localisation du porteur et du marchand, calculée via la formule de Haversine simplifiée.

**Features comportementales carte :**
- `avg_amt_card` : Montant moyen historique du porteur de carte
- `std_amt_card` : Écart-type des montants
- `tx_count_card` : Nombre de transactions sur la période
- `amt_deviation` : Déviation du montant courant par rapport à la moyenne

**Encodage catégoriel :**
- Encodage One-Hot de la variable `category` → 14 colonnes binaires
- Encodage fréquentiel (`target encoding` simplifié) pour `merchant`, `state`, `job`

**Normalisation :**
- StandardScaler appliqué sur toutes les features numériques continues
- Scaler sauvegardé dans `models/scaler.pkl` pour usage en production

### 5.2 Gestion du Déséquilibre de Classes

Le déséquilibre sévère (0,5% de fraudes) a nécessité une stratégie spécifique :

- **SMOTE (Synthetic Minority Over-sampling Technique)** : Génération d'exemples synthétiques de fraudes pour équilibrer les classes dans les modèles classiques.
- **Class weighting** : Utilisation de `class_weight='balanced'` dans Scikit-learn pour pénaliser les erreurs sur la classe minoritaire.
- **Pour le MLP** : Paramètre `class_weight` appliqué directement dans `model.fit()`.

### 5.3 Persistance des Données Prétraitées

Les données prétraitées sont sauvegardées dans `data/processed_data.pkl` (533 MB) pour éviter de recalculer les features à chaque exécution de notebook.

---

## 6. Modèles d'Intelligence Artificielle

### 6.1 Modèles Classiques — Référence (Notebook 03)

Avant de développer le MLP, trois modèles classiques ont été entraînés comme **benchmarks** :

#### Régression Logistique
- Modèle linéaire de référence
- Avantage : Interprétable, rapide
- Limite : Ne capture pas les interactions non-linéaires

#### Arbre de Décision (Decision Tree)
- Modèle non-linéaire, très interprétable
- Tendance au surapprentissage sans élagage

#### Random Forest
- Ensemble de 100 arbres de décision
- Meilleure performance parmi les classiques
- Robuste aux outliers

**Résultats comparatifs :**

| Modèle | Précision | Rappel | F1-Score | AUC-ROC |
|--------|-----------|--------|----------|---------|
| Régression Logistique | 72% | 65% | 68% | ~0.92 |
| Arbre de Décision | 78% | 70% | 74% | ~0.85 |
| Random Forest | 88% | 82% | 85% | ~0.97 |
| **MLP (Deep Learning)** | **96.3%** | **98.5%** | **97.4%** | **99.9%** |

> **Note :** Pour la détection de fraude, le **Rappel** (Recall) est la métrique prioritaire — il est préférable de générer de fausses alertes plutôt que de manquer une vraie fraude. Le MLP excelle sur cette métrique avec 98,5%.

### 6.2 Module A — Modèle MLP (Notebook 04)

#### Architecture du Réseau de Neurones

```
Input Layer (35 features)
        ↓
Dense(256) + BatchNormalization + Dropout(0.3) + ReLU
        ↓
Dense(128) + BatchNormalization + Dropout(0.3) + ReLU
        ↓
Dense(64)  + BatchNormalization + Dropout(0.2) + ReLU
        ↓
Dense(1) + Sigmoid → P(fraude) ∈ [0, 1]
```

**Hyperparamètres :**
- Optimiseur : Adam (lr=0.001)
- Fonction de coût : Binary Cross-Entropy avec pondération de classes
- Batch size : 2048
- Callbacks : EarlyStopping (patience=15, monitor=val_recall), ModelCheckpoint

**Note sur l'early stopping :**
L'entraînement configuré pour 50 epochs s'est arrêté à l'epoch 15. Ceci est le comportement attendu et souhaitable du mécanisme EarlyStopping : le modèle a convergé et la performance sur le jeu de validation n'améliorait plus le Recall après 15 epochs consécutives, évitant ainsi le surapprentissage.

**Optimisation du Seuil de Décision :**
Plutôt que d'utiliser le seuil par défaut de 0.5, un seuil optimal a été calculé par recherche sur la courbe Precision-Recall. Le seuil retenu est **0.85**, maximisant le F1-Score tout en maintenant un Rappel supérieur à 98%.

**Performances finales MLP :**
- Précision : **96.3%**
- Rappel : **98.5%**
- F1-Score : **97.4%**
- AUC-ROC : **99.9%**

**Artefacts sauvegardés :**
- `models/mlp_final.keras` — Modèle complet
- `models/mlp_best.keras` — Meilleur checkpoint
- `models/scaler.pkl` — StandardScaler
- `models/feature_columns.json` — 35 noms de features
- `models/config.json` — Seuil optimal et version

### 6.3 Module B — Modèle BSM XGBoost (Notebook 06)

#### Pourquoi XGBoost pour le BSM ?

XGBoost (eXtreme Gradient Boosting) a été sélectionné pour le module comportemental pour plusieurs raisons :

1. **Interprétabilité via SHAP** : Contrairement aux réseaux de neurones, XGBoost se prête naturellement à l'analyse SHAP pour expliquer chaque décision.
2. **Robustesse aux valeurs aberrantes** : Les sessions comportementales peuvent contenir des valeurs extrêmes (ex : bot avec typing_speed_ms = 5ms).
3. **Performance sur données tabulaires** : XGBoost surpasse généralement les réseaux de neurones sur des jeux de données structurés de taille moyenne.
4. **Faible latence d'inférence** : Critique pour une décision en temps réel lors d'un paiement.

#### Architecture du Modèle BSM

- **Type :** Classification multiclasse (3 classes)
- **Nombre de features :** 23
- **Nombre de classes :** 3 (Approuver / Challenger / Bloquer)
- **Meilleure itération (best_iteration) :** 287 arbres
- **Normalisation :** StandardScaler appliqué avant l'inférence

**Seuils de décision :**

| Probabilité P(Bloquer) | Décision | Action |
|------------------------|----------|--------|
| < 30% | ✅ Approuver | Transaction validée automatiquement |
| 30% – 70% | ⚠️ Challenger | Validation supplémentaire requise |
| > 70% | 🚨 Bloquer | Transaction bloquée, alerte levée |

**Performances BSM :**
- Précision : **95.8%**
- Rappel : **95.7%**
- F1-Score : **95.7%**
- Précision sur la classe Bloquer (fraude avérée) : ~94%

**Artefacts sauvegardés :**
- `models/bsm_model.pkl` — Modèle XGBoost (811 KB)
- `models/bsm_scaler.pkl` — StandardScaler BSM
- `models/bsm_feature_columns.json` — 23 features
- `models/bsm_config.json` — Seuils, version, métadonnées

#### Interprétabilité SHAP

Des analyses SHAP (SHapley Additive exPlanations) ont été produites pour comprendre les décisions du modèle BSM :

**Figures générées :**
- `bsm_shap_importance.png` — Importance globale des features
- `bsm_shap_beeswarm.png` — Distribution des valeurs SHAP par feature

**Principales features influentes (par importance SHAP décroissante) :**
1. `typing_speed_ms` — Vitesse de frappe (signal le plus fort)
2. `ip_is_vpn_proxy` — Détection VPN/Proxy
3. `device_fingerprint_match` — Correspondance de l'empreinte appareil
4. `copy_paste_detected` — Copier-coller détecté
5. `amt_vs_avg_ratio` — Ratio montant/moyenne habituelle
6. `is_new_beneficiary` — Nouveau destinataire
7. `mouse_movement_entropy` — Entropie des mouvements de souris
8. `time_on_page_sec` — Temps passé sur la page
9. `login_failed_attempts` — Tentatives de connexion échouées
10. `is_new_device` — Nouvel appareil détecté

### 6.4 Comparaison et Évaluation (Notebook 05)

Le notebook `05_evaluation_comparaison.ipynb` réalise une évaluation comparative complète de tous les modèles avec :
- Courbes ROC et AUC
- Courbes Precision-Recall
- Matrices de confusion
- Analyse des erreurs (faux positifs vs faux négatifs)
- Comparaison des temps d'inférence

---

## 7. Architecture Backend — API FastAPI

### 7.1 Vue d'ensemble

Le backend est une **API REST asynchrone** développée avec FastAPI v0.111.0. Elle expose 18 endpoints organisés en 4 groupes fonctionnels, chargée au démarrage de tous les artefacts ML.

**Fichier principal :** `api/app.py` (570 lignes)

### 7.2 Chargement des Modèles au Démarrage

```python
# Modèle MLP
mlp_model    = tf.keras.models.load_model('../models/mlp_final.keras')
mlp_scaler   = pickle.load(open('../models/scaler.pkl', 'rb'))
mlp_columns  = json.load(open('../models/feature_columns.json'))
MLP_THRESHOLD = mlp_config['best_threshold']  # 0.85

# Modèle BSM
bsm_model   = pickle.load(open('../models/bsm_model.pkl', 'rb'))
bsm_scaler  = pickle.load(open('../models/bsm_scaler.pkl', 'rb'))
BSM_T_CHALLENGE = 0.30
BSM_T_BLOCK     = 0.70
```

### 7.3 Endpoints Disponibles

#### Groupe 1 — MLP (Détection Transaction)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/predict/single` | Analyse une transaction unique |
| POST | `/predict/batch` | Analyse un lot (max 10 000 transactions) |
| POST | `/predict/file` | Import CSV/Excel (max 100 000 lignes) |
| GET | `/history/predictions` | Historique paginé des analyses |
| GET | `/history/predictions/{id}/details` | Détails d'une analyse |
| GET | `/history/dashboard` | Statistiques agrégées (dashboard) |

#### Groupe 2 — BSM (Scoring Comportemental)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/bsm/predict` | Scoring d'une session unique |
| POST | `/bsm/predict/file` | Scoring de sessions en batch (CSV) |
| GET | `/bsm/stats` | Statistiques temps réel + historiques |
| GET | `/bsm/history` | Historique des sessions scorées |
| GET | `/bsm/dashboard` | Dashboard BSM agrégé |

#### Groupe 3 — Chatbot IA

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/chat` | Envoi d'un message à FraudBot |
| GET | `/history/chat/{session_id}` | Historique de conversation |

#### Groupe 4 — Système

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | État des modèles et de la connexion |
| GET | `/stats` | Statistiques temps réel des deux modules |

### 7.4 Schémas de Validation Pydantic

**Transaction MLP (16 champs) :**
```
amt, hour, day_of_week, month, is_night, age, distance_km, gender,
city_pop, category, state, job, merchant, avg_amt_card,
amt_deviation, tx_count_card
```

**Session BSM (23 champs) :**
```
typing_speed_ms, typing_regularity, copy_paste_detected,
mouse_movement_entropy, time_on_page_sec, field_focus_changes,
form_fill_duration_ms, tab_switches, scroll_events, is_new_device,
device_fingerprint_match, ip_country_match, ip_is_vpn_proxy,
time_since_last_login_min, login_failed_attempts, session_age_sec,
is_mobile_desktop_mismatch, is_new_beneficiary, amt_vs_avg_ratio,
transactions_last_hour, is_international, hour_of_day, is_weekend
```

### 7.5 Assistant IA — FraudBot

FraudBot est un assistant conversationnel intégré directement dans la plateforme, propulsé par l'API **Groq** avec le modèle **Llama 3.3-70B Versatile**.

**Fonctionnement :**
1. Le système prompt statique encode l'expertise de FraudBot sur les deux modules.
2. À chaque requête, un contexte live est injecté dynamiquement : nombre de transactions analysées, taux de fraude courant, état de Supabase.
3. Les **métriques réelles des modèles** (précision, rappel, F1-Score) sont récupérées depuis Supabase via `model_utils.get_active_metrics()` et injectées dans le prompt.
4. L'historique des 10 derniers messages de la conversation est transmis pour maintenir le contexte.
5. La réponse est persistée dans la table `chat_sessions` de Supabase.

---

*[Suite dans la Partie 2]*
