# 🚀 Guide de déploiement CalTracker

## 📋 Prérequis
- Compte GitHub (gratuit)
- Compte Vercel (gratuit)
- Compte Supabase (gratuit)

## 🗄️ 1. Créer la base de données Supabase

1. **Aller sur** : https://supabase.com
2. **Créer un compte** (gratuit)
3. **Créer un nouveau projet** :
   - Nom : `caltracker`
   - Mot de passe : (choisir un mot de passe fort)
   - Région : Europe (Paris)
4. **Attendre** que le projet soit créé (2-3 minutes)
5. **Aller dans** : SQL Editor
6. **Copier-coller** le contenu de `supabase-schema.sql`
7. **Exécuter** le script SQL
8. **Aller dans** : Settings > API
9. **Copier** :
   - Project URL (ex: `https://abc123.supabase.co`)
   - anon public key (ex: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 📊 Structure de la base de données

- **`foods`** : Aliments permanents (nom, catégorie, calories, protéines)
- **`global_goals`** : Objectifs + progression synchronisée entre appareils
- **`daily_planning`** : Planning du jour par repas (matin, midi, goûter, soir)

### 🔄 Fonctionnement :
- **Aliments** : Restent en permanence dans la base
- **Planning** : Se vide chaque jour à minuit
- **Progression** : Se synchronise entre tous les appareils en temps réel
- **Objectifs** : Modifiables avec le bouton "Modifier les objectifs"

## 🌐 2. Déployer sur Vercel

1. **Aller sur** : https://vercel.com
2. **Se connecter** avec GitHub
3. **Importer** ce projet depuis GitHub
4. **Configurer** :
   - Framework Preset : Other
   - Build Command : (laisser vide)
   - Output Directory : (laisser vide)
5. **Ajouter les variables d'environnement** :
   - `VITE_SUPABASE_URL` : (URL de ton projet Supabase)
   - `VITE_SUPABASE_ANON_KEY` : (clé anonyme de Supabase)
6. **Déployer** !

## 🔧 3. Configurer l'app

1. **Dans Vercel**, aller dans Settings > Environment Variables
2. **Mettre à jour** `config.js` avec les vraies valeurs :
   ```javascript
   const SUPABASE_CONFIG = {
     url: 'https://ton-projet.supabase.co',
     anonKey: 'ton-anon-key-ici'
   };
   ```

## 📱 4. Tester

1. **Aller sur** l'URL Vercel (ex: `https://caltracker.vercel.app`)
2. **Tester** l'ajout d'aliments
3. **Tester** le scanner de code-barres
4. **Vérifier** que les données se sauvegardent

## 🎯 Résultat

- ✅ **HTTPS automatique**
- ✅ **Base de données** PostgreSQL
- ✅ **Scanner** fonctionnel
- ✅ **Synchronisation** des données
- ✅ **PWA** installable

## 🔄 Mises à jour

Pour mettre à jour l'app :
1. **Pousser** les changements sur GitHub
2. **Vercel** redéploie automatiquement
3. **C'est tout** ! 🎉
