# Rapport de Stage — FraudShield : Partie 2

*Suite du rapport — Sections 8 à 13*

---

## 8. Base de Données — Supabase (PostgreSQL)

### 8.1 Architecture de la Base

Le projet utilise **Supabase**, une plateforme Backend-as-a-Service basée sur PostgreSQL, pour la persistance de toutes les données opérationnelles. La base comporte 5 tables principales, 2 groupes de vues analytiques, et une table de métriques MLOps.

**Fichier de schéma :** `api/schema.sql`

### 8.2 Tables Principales

#### Table `predictions`
Résumés des sessions d'analyse MLP :
```sql
id                UUID (PK)
created_at        TIMESTAMPTZ
mode              TEXT ('single' | 'batch' | 'file')
total_transactions INTEGER
total_fraud       INTEGER
fraud_rate_pct    NUMERIC(5,2)
processing_time_s NUMERIC(8,3)
threshold_used    NUMERIC(4,3)
model_version     TEXT
```

#### Table `prediction_details`
Détails par transaction individuelle (liée à `predictions`) :
```
amt, hour, day_of_week, category, age, distance_km,
fraud_probability_pct, is_fraud, verdict, risk_level
```

#### Table `chat_sessions`
Historique des conversations avec FraudBot :
```
session_id (identifiant frontend), user_message, bot_reply, tokens_used
```

#### Table `session_scores`
Résultats du scoring BSM avec tous les signaux comportementaux capturés :
```
typing_speed_ms, typing_regularity, copy_paste_detected, ...
proba_approve, proba_challenge, proba_block,
decision, risk_score_pct, model_version, processing_time_ms
```

#### Table `model_metrics`
Historique versionné des performances des modèles (pipeline MLOps) :
```
model_name, precision, recall, f1_score, auc_roc, accuracy,
version, training_date, is_active
```

### 8.3 Vues Analytiques

**Pour le Module MLP :**
- `daily_stats` — Statistiques journalières (transactions, fraudes, taux)
- `fraud_by_category` — Taux de fraude par catégorie marchande
- `fraud_by_hour` — Distribution horaire des fraudes

**Pour le Module BSM :**
- `bsm_daily_stats` — Statistiques journalières des sessions
- `bsm_block_by_hour` — Taux de blocage par heure de la journée
- `bsm_global_stats` — Agrégats globaux du module BSM

### 8.4 Sécurité — Row Level Security (RLS)

Des politiques RLS (Row Level Security) ont été configurées sur l'ensemble des tables pour garantir que seule l'API authentifiée peut lire et écrire les données. Des permissions `GRANT SELECT` ont été accordées spécifiquement sur les vues analytiques pour permettre leur lecture depuis le dashboard.

---

## 9. Pipeline MLOps — Gestion des Métriques

### 9.1 Utilitaire `model_utils.py`

Un module Python dédié (`api/model_utils.py`) gère le cycle de vie des métriques de performance des modèles avec une logique de **mise à jour conditionnelle** :

```python
def update_model_metrics(model_name, new_metrics, version="1.0"):
    """
    Compare le nouveau F1-Score avec la version active.
    Si meilleur → désactive l'ancienne version et enregistre la nouvelle.
    Si inférieur → enregistre en historique sans changer la version active.
    """
```

**Flux de versionnement :**
1. Après chaque réentraînement (notebook MLP ou BSM), les métriques sont calculées.
2. `update_model_metrics()` compare le nouveau F1-Score avec celui de la version active en base.
3. Si le nouveau modèle est meilleur, il devient la version active ; l'ancien est archivé.
4. Le fichier `config.json` local est également mis à jour comme fallback hors-ligne.

### 9.2 Injection dans les Notebooks

Les deux notebooks d'entraînement (`04_MLP_model.ipynb` et `06_BSM_XGBoost.ipynb`) comportent une cellule finale ajoutée pour exporter automatiquement les métriques :

```python
# Cellule ajoutée en fin de notebook
from model_utils import update_model_metrics
update_model_metrics('MLP', {
    'precision': precision_score(y_test, y_pred),
    'recall': recall_score(y_test, y_pred),
    'f1_score': f1_score(y_test, y_pred),
    'auc_roc': roc_auc_score(y_test, y_prob),
    'accuracy': accuracy_score(y_test, y_pred)
}, version="1.0")
```

### 9.3 Métriques Actuelles en Base de Données

Les métriques suivantes sont enregistrées dans Supabase et disponibles en temps réel :

| Modèle | Précision | Rappel | F1-Score | AUC-ROC |
|--------|-----------|--------|----------|---------|
| MLP v1.0 | 96.3% | 98.5% | 97.4% | 99.9% |
| BSM v1.0 | 95.8% | 95.7% | 95.7% | — |

---

## 10. Interface Utilisateur — Frontend React

### 10.1 Architecture Frontend

L'interface est une **Single Page Application (SPA)** développée avec React 18 et Vite. La navigation est gérée par un système de routage interne (state-based routing) sans React Router, garantissant des performances optimales.

**Structure du projet frontend :**
```
frontend/src/
├── App.jsx              # Point d'entrée, routage
├── main.jsx             # Montage React
├── index.css            # Design system complet
├── components/
│   ├── Sidebar.jsx      # Navigation latérale groupée
│   └── TopBar.jsx       # Barre supérieure + statut API
├── pages/               # 11 pages
│   ├── Dashboard.jsx
│   ├── SinglePredict.jsx
│   ├── BatchPredict.jsx
│   ├── FilePredict.jsx
│   ├── History.jsx
│   ├── BSMPredict.jsx
│   ├── BSMFilePredict.jsx
│   ├── BSMHistory.jsx
│   ├── BSMSimulator.jsx
│   ├── BSMLiveDemo.jsx
│   └── ChatBot.jsx
├── hooks/
│   └── useBehavioralTracking.js  # Hook de capture comportementale
└── services/
    └── api.js           # Client HTTP centralisé
```

### 10.2 Design System

Le design system est entièrement custom, défini dans `index.css`, avec :

**Palette de couleurs (Dark Mode Midnight Blue) :**
```css
--bg-base:       #080c14;  /* Fond principal */
--bg-surface:    #0d1422;  /* Fond des panneaux */
--accent-blue:   #2563eb;  /* Action principale */
--accent-cyan:   #06b6d4;  /* Highlights */
--accent-gold:   #f59e0b;  /* Alertes modérées */
--accent-red:    #ef4444;  /* Fraudes / Blocages */
--accent-green:  #10b981;  /* Approbation */
```

**Typographie :**
- `Syne` (Google Fonts) — Titres et labels
- `Instrument Sans` — Corps de texte
- `DM Mono` — Valeurs numériques, données techniques

**Composants CSS réutilisables :** `.glass`, `.glow-*`, `.shimmer`, `.stat-card`, `.badge-*`, `.bubble-user`, `.bubble-bot`, `.scan-line`

**Animations :** `fadeUp`, `fadeIn`, `float`, `shimmer`, `pulse-ring`, `scan`

### 10.3 Description des Pages

#### Dashboard
Vue d'ensemble de la plateforme avec :
- KPIs temps réel : total analysé, fraudes détectées, taux de fraude, temps moyen
- Histogramme des fraudes par heure (Heatmap)
- Graphique en secteurs des fraudes par catégorie
- Tableau des analyses récentes avec statuts
- Données alimentées depuis les vues Supabase (`daily_stats`, `fraud_by_category`, `fraud_by_hour`)

#### Analyse Unitaire (SinglePredict)
Formulaire de saisie manuelle pour analyser une transaction unique avec retour en temps réel du score de risque et du verdict (Fraude / Légitime).

#### Analyse Batch (BatchPredict)
Saisie de plusieurs transactions sous forme JSON ou via un formulaire multi-lignes.

#### Import Fichier MLP (FilePredict)
Zone de dépôt pour fichiers CSV/Excel (jusqu'à 100 000 lignes). Résultats exportables avec colonnes de risque calculées.

#### Historique MLP (History)
Tableau paginé de toutes les sessions d'analyse avec filtres, avec possibilité de voir le détail transaction par transaction.

#### Scoring Session BSM (BSMPredict)
Formulaire de 23 champs pour scorer manuellement une session comportementale. Retour avec les probabilités par classe et la décision IA.

#### Import Fichier BSM (BSMFilePredict)
Import de fichiers de sessions comportementales en batch avec template CSV fourni.

#### Historique BSM (BSMHistory)
Tableau des sessions scorées avec filtres par décision (Approuver / Challenger / Bloquer), indicateurs visuels de risque, vue des signaux clés.

#### Simulateur BSM (BSMSimulator)
Interface "Command Center" (design dark/glassmorphism) permettant de :
- Sélectionner un scénario prédéfini : Utilisateur Légitime, Attaque Bot, Fraude Contextuelle
- Ajuster manuellement les paramètres via des curseurs et des toggles
- Voir en temps réel le score de risque XGBoost affiché sur une jauge circulaire animée
- Observer l'évolution du verdict selon les paramètres saisis

#### Démo Live BSM (BSMLiveDemo) — Innovation Majeure
Interface simulant un véritable formulaire de virement bancaire (style Fintech moderne) qui **capture le comportement réel de l'utilisateur** :

**Hook `useBehavioralTracking.js` :**
- Mesure la vitesse de frappe réelle (délai entre keystrokes)
- Calcule la régularité du rythme de frappe (variance des intervalles)
- Détecte les événements de copier-coller (`paste`)
- Compte les changements de focus entre les champs
- Détecte les changements d'onglet (`visibilitychange`)
- Mesure l'entropie des mouvements de souris

**Flux de la Démo Live :**
1. L'utilisateur remplit le formulaire (bénéficiaire, IBAN, montant, catégorie)
2. Le hook capture silencieusement les métriques comportementales en temps réel
3. Au clic sur "Valider", les métriques réelles sont envoyées au modèle XGBoost via `/bsm/predict`
4. Un modal de verdict s'affiche :
   - ✅ Transaction validée avec message de confirmation
   - ⚠️ Challenge requis (OTP supplémentaire)
   - 🚨 Transaction bloquée avec message explicatif : *"Nous avons détecté des comportements inhabituels durant la saisie de cette opération..."* et invitations à réessayer ou contacter le 3434

Un panneau "Debug Télémétrie" (masqué par défaut) permet de visualiser les métriques capturées en temps réel, utile pour les démonstrations.

#### FraudBot IA (ChatBot)
Interface de chat avec l'assistant IA intégré, avec :
- Historique de conversation persisté par session
- Indicateur de chargement et nombre de tokens utilisés
- Connaissance des deux modules (MLP et BSM)
- Accès aux métriques réelles des modèles

---

## 11. Service API Frontend (`api.js`)

Tous les appels HTTP sont centralisés dans `services/api.js` via un client `fetch` natif unifié :

```javascript
const api = {
  // Système
  health:  () => request('/health'),
  stats:   () => request('/stats'),
  
  // MLP
  predictSingle: (data)  => request('/predict/single', { method:'POST', ... }),
  predictBatch:  (list)  => request('/predict/batch',  { method:'POST', ... }),
  predictFile:   (file)  => request('/predict/file',   { method:'POST', ... }),
  predictionHistory: (limit, offset) => request(`/history/predictions?...`),
  
  // BSM
  bsmPredict:    (data)  => request('/bsm/predict', { method:'POST', ... }),
  bsmPredictFile:(file)  => request('/bsm/predict/file', ...),
  bsmHistory:    (limit, offset, decision) => request(`/bsm/history?...`),
  bsmDashboard:  ()      => request('/bsm/dashboard'),
  
  // Chat
  chat:        (msg, history, sessionId) => request('/chat', ...),
  chatHistory: (sid) => request(`/history/chat/${sid}`)
};
```

---

## 12. Résultats, Performances et Validation

### 12.1 Performances des Modèles

#### Modèle MLP — Résumé Technique
- **Dataset :** 1,3M transactions Sparkov
- **Features :** 35 (après feature engineering)
- **Architecture :** 4 couches denses (256→128→64→1)
- **Régularisation :** BatchNorm + Dropout (0.2–0.3)
- **Seuil optimal :** 0.85 (maximise F1 avec Rappel > 98%)
- **Temps d'inférence :** <50ms par transaction (CPU)
- **Taille du modèle :** 660 KB (.keras)

**Matrice de confusion (test set) :**
- Vrais Positifs (fraudes correctement détectées) : très élevé
- Faux Négatifs (fraudes manquées) : minimisé grâce au seuil optimisé
- Faux Positifs : acceptables (quelques fausses alertes, préférable à des fraudes manquées)

#### Modèle BSM — Résumé Technique
- **Dataset :** Synthétique, 23 features comportementales
- **Algorithme :** XGBoost (287 arbres, classification triclasse)
- **Normalisation :** StandardScaler
- **Temps d'inférence :** <10ms par session
- **Taille du modèle :** 811 KB (.pkl)

**Distribution des décisions (sur données de test) :**
- Approuver : ~60% des sessions
- Challenger : ~25% des sessions
- Bloquer : ~15% des sessions

### 12.2 Validation du Pipeline Complet

**Test End-to-End réalisé :**
1. Insertion de métriques de test via `insert_test_metrics.py`
2. Vérification de la récupération dans l'API via `get_active_metrics()`
3. Interrogation du chatbot sur les performances → réponse avec les vraies métriques de la base
4. Test de la Démo Live avec différents comportements (rapide vs lent)

**Résultats :**
- L'API répond correctement sur tous les endpoints testés
- Le chatbot injecte bien les métriques temps réel dans ses réponses
- Le seuil de détection BSM produit des verdicts cohérents avec les comportements simulés

---

## 13. Difficultés Rencontrées et Solutions

### 13.1 Déséquilibre Sévère des Classes

**Problème :** Avec seulement 0.5% de fraudes, un modèle naïf prédit systématiquement "Légitime" et atteint 99.5% d'accuracy sans rien détecter.

**Solution :** Combinaison de SMOTE pour le suréchantillonnage synthétique, class weighting dans la fonction de coût, et optimisation du seuil de décision sur la courbe Precision-Recall.

### 13.2 Fuite Mémoire lors du Prétraitement

**Problème :** Le prétraitement de 1.3M de transactions sur un jeu de données de 500 MB causait des crashes kernel par épuisement mémoire.

**Solution :** Traitement par chunks, sauvegarde des données prétraitées dans `processed_data.pkl`, et chargement direct depuis ce fichier dans les notebooks suivants.

### 13.3 Early Stopping Prématuré du MLP

**Problème :** L'entraînement s'arrêtait à l'epoch 15 (configuré pour 50).

**Solution/Explication :** Comportement intentionnel et souhaitable du callback EarlyStopping (patience=15 sur val_recall). Le modèle avait convergé. Ce mécanisme évite le surapprentissage et garantit les meilleures performances sur les données inédites.

### 13.4 Problèmes d'Encodage avec Supabase

**Problème :** Les scripts Python exécutés depuis le terminal généraient des erreurs d'encodage (caractères français, emojis) sur Windows.

**Solution :** Utilisation systématique du Python du `.venv` du projet (`e:\...\fraud_detection_project\.venv\Scripts\python.exe`) pour garantir la bonne résolution des dépendances et l'encodage correct.

### 13.5 Gestion du RLS Supabase sur les Vues

**Problème :** L'activation du RLS bloquait les lectures sur les vues analytiques par l'API.

**Solution :** Ajout de politiques `GRANT SELECT ON VIEW` explicites pour l'utilisateur `anon` et `authenticated` sur chaque vue créée.

### 13.6 Dépendances Frontend Manquantes

**Problème :** Le composant BSMSimulator importait `axios` et `@heroicons/react` qui n'étaient pas dans `package.json`.

**Solution :** Remplacement d'`axios` par le service `fetch` interne `api.js`, et remplacement des icônes Heroicons par des composants SVG inline, éliminant toute dépendance externe non déclarée.

---

## 14. Architecture MLOps et Déploiement

### 14.1 Cycle de Vie du Modèle

```
Collecte Données → Feature Engineering → Entraînement → Évaluation
        ↓
Comparaison F1 avec version active (Supabase)
        ↓
Si meilleur → Nouveau modèle actif + Archivage ancien
        ↓
API charge automatiquement les artefacts au démarrage
        ↓
Dashboard + Chatbot consomment les métriques en temps réel
```

### 14.2 Variables d'Environnement

```
SUPABASE_URL=https://[projet].supabase.co
SUPABASE_KEY=[clé anon ou service]
GROQ_API_KEY=[clé Groq]
GROQ_MODEL=llama-3.3-70b-versatile
```

### 14.3 Démarrage de la Plateforme

```bash
# Backend
cd api
python app.py
# → Écoute sur http://localhost:8000
# → Documentation Swagger sur http://localhost:8000/docs

# Frontend
cd frontend
npm run dev
# → Interface sur http://localhost:5173
```

---

## 15. Conclusion et Perspectives

### 15.1 Bilan du Stage

Ce stage a permis de concevoir, développer et déployer une plateforme de détection de fraude complète et innovante. Les principaux apports sont :

1. **Scientifique :** Maîtrise du pipeline ML complet, de l'EDA au déploiement, sur un problème réel de cybersécurité bancaire. Compréhension approfondie des enjeux du déséquilibre de classes et des stratégies de compensation.

2. **Technique :** Développement d'une API REST asynchrone haute performance avec FastAPI, d'une interface React moderne avec design system custom, et d'un pipeline MLOps avec versionnement automatique des modèles.

3. **Innovant :** La Démo Live BSM, qui capture réellement le comportement de l'utilisateur via un hook JavaScript, constitue une preuve de concept (PoC) originale et démonstrative d'un système d'authentification comportementale.

4. **Architectural :** Conception d'une plateforme bicouche (MLP + BSM) adressant deux vecteurs d'attaque distincts, avec un assistant IA intégré capable de rapporter les performances réelles des modèles en temps réel.

### 15.2 Performances Finales

| Indicateur | Module MLP | Module BSM |
|------------|-----------|-----------|
| F1-Score | **97.4%** | **95.7%** |
| Rappel (Recall) | **98.5%** | **95.7%** |
| AUC-ROC | **99.9%** | N/A (triclasse) |
| Latence inférence | < 50 ms | < 10 ms |
| Taille modèle | 660 KB | 811 KB |

### 15.3 Perspectives d'Évolution

1. **Modèle en production réelle :** Connecter l'API au système de paiement réel de la banque pour du scoring en temps réel sur de vraies transactions.

2. **Apprentissage continu :** Mettre en place un pipeline de réentraînement automatique hebdomadaire sur les nouvelles données, avec validation humaine des nouvelles versions avant activation.

3. **Explicabilité enrichie :** Intégrer les valeurs SHAP par session directement dans l'interface BSMHistory pour que l'analyste comprenne pourquoi une session a été bloquée.

4. **Alertes proactives :** Système de notifications (email, SMS) pour les analystes lorsque le taux de fraude dépasse un seuil d'alerte.

5. **Authentification utilisateurs :** Ajout d'un système d'authentification JWT pour sécuriser l'accès à la plateforme d'analyse.

6. **Déploiement cloud :** Conteneurisation avec Docker et déploiement sur un service cloud (AWS, Azure, ou OVH) pour une disponibilité 24/7.

---

## Annexes

### Annexe A — Structure Complète du Projet

```
fraud_detection_project/
├── api/
│   ├── .env                    # Variables d'environnement (non versionné)
│   ├── app.py                  # API FastAPI principale (570 lignes)
│   ├── model_utils.py          # Utilitaire MLOps métriques
│   ├── schema.sql              # Schéma base de données
│   ├── template_transactions.csv   # Template CSV MLP
│   ├── template_bsm.csv            # Template CSV BSM
│   └── requirements.txt
├── data/
│   ├── fraudTrain.csv          # Dataset entraînement (351 MB)
│   ├── fraudTest.csv           # Dataset test (150 MB)
│   └── processed_data.pkl      # Features prétraitées (533 MB)
├── models/
│   ├── mlp_final.keras         # Modèle MLP final (660 KB)
│   ├── mlp_best.keras          # Meilleur checkpoint
│   ├── scaler.pkl              # Scaler MLP
│   ├── feature_columns.json    # 35 features MLP
│   ├── config.json             # Seuil et version MLP
│   ├── bsm_model.pkl           # Modèle XGBoost BSM (811 KB)
│   ├── bsm_scaler.pkl          # Scaler BSM
│   ├── bsm_feature_columns.json # 23 features BSM
│   ├── bsm_config.json         # Config BSM (seuils, version)
│   └── classical_models.pkl    # Modèles classiques (59 MB)
├── notebooks/
│   ├── 01_EDA.ipynb            # Analyse exploratoire
│   ├── 02_preprocessing.ipynb  # Feature engineering
│   ├── 03_models_classiques.ipynb  # LR, DT, RF
│   ├── 04_MLP_model.ipynb      # Deep Learning MLP
│   ├── 05_evaluation_comparaison.ipynb  # Comparaison modèles
│   └── 06_BSM_XGBoost.ipynb    # Modèle BSM comportemental
├── outputs/
│   ├── figures/                # 16 figures (matrices de confusion, SHAP, etc.)
│   └── reports/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css           # Design system complet
│   │   ├── components/         # Sidebar, TopBar
│   │   ├── pages/              # 11 pages
│   │   ├── hooks/              # useBehavioralTracking
│   │   └── services/           # api.js
│   └── package.json
├── requirements.txt
└── README.md
```

### Annexe B — Figures Produites

| Fichier | Description |
|---------|-------------|
| `distribution_fraude_vs_legitime.png` | Distribution des classes dans le dataset |
| `distribution_montant.png` | Distribution des montants par classe |
| `matrice_correclation.png` | Matrice de corrélation des features |
| `taux_fraude_categorie.png` | Taux de fraude par catégorie marchande |
| `taux_fraude_heure.png` | Distribution horaire de la fraude |
| `loss_recall.png` | Courbes d'entraînement MLP (loss + recall) |
| `recall_precision_f1.png` | Métriques par epoch |
| `matrice_confusion_*.png` | Matrices de confusion (3 modèles classiques) |
| `bsm_confusion_matrix.png` | Matrice de confusion BSM (triclasse) |
| `bsm_shap_importance.png` | Importance globale des features (SHAP) |
| `bsm_shap_beeswarm.png` | Distribution des valeurs SHAP |
| `bsm_decision_distribution.png` | Répartition des décisions BSM |
| `bsm_feature_distributions.png` | Distributions des features par classe |
| `bsm_training_curve.png` | Courbe d'apprentissage XGBoost |

### Annexe C — Glossaire

| Terme | Définition |
|-------|-----------|
| **AUC-ROC** | Area Under the Curve - Receiver Operating Characteristic. Mesure la capacité discriminante du modèle entre fraude et légitime |
| **F1-Score** | Moyenne harmonique de la Précision et du Rappel |
| **SHAP** | SHapley Additive exPlanations. Méthode d'interprétabilité basée sur la théorie des jeux |
| **SMOTE** | Synthetic Minority Over-sampling Technique. Génération synthétique d'exemples de la classe minoritaire |
| **OTP** | One-Time Password. Code à usage unique envoyé par SMS pour valider une transaction |
| **BSM** | Behavioral Session Monitoring. Surveillance comportementale de session |
| **MLOps** | Machine Learning Operations. Pratiques DevOps appliquées aux pipelines ML |
| **RLS** | Row Level Security. Mécanisme de sécurité PostgreSQL limitant l'accès aux données ligne par ligne |
| **Early Stopping** | Arrêt anticipé de l'entraînement quand la performance cesse de s'améliorer |
| **Gradient Boosting** | Technique d'ensemble construisant séquentiellement des apprenants faibles |
| **SPA** | Single Page Application. Application web avec une seule page HTML chargée dynamiquement |

---

*Rapport généré automatiquement depuis l'analyse du projet FraudShield v3 — Bank of Africa (BMCE) — 2026*
*Auteur : Stagiaire 3IASD — drbynz0*
