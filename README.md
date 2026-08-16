# Sentier

Plateforme de petites formations avec accompagnement coaching — espace formateur (`/admin`) + espace apprenant (`/espace`), Next.js 16 + Supabase.

Ce dépôt est un **template** : n'importe qui peut en récupérer sa propre copie pour lancer son propre espace, connecté à son propre Supabase et déployé sur son propre Vercel — rien n'est partagé avec l'original.

📄 **Guide complet pour non-développeurs** : `docs/guide-installation.md` — explique chaque étape en détail, sans terminal.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmariecreativestrategist%2Fsentier&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Cles%20Supabase%20(Project%20Settings%20-%3E%20Data%20API)&envLink=https%3A%2F%2Fgithub.com%2Fmariecreativestrategist%2Fsentier%2Fblob%2Fmaster%2Fdocs%2Fguide-installation.md&project-name=sentier&repository-name=sentier)

## Mise en route (résumé technique)

Pour l'explication détaillée pas à pas, utilise `docs/guide-installation.md`. Résumé pour un profil développeur :

### 1. Créer un projet Supabase

Sur [supabase.com](https://supabase.com), crée un nouveau projet (gratuit).

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis `.env.local` avec les valeurs de **Project Settings > Data API** de ton projet Supabase :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — secrète, utilisée côté serveur uniquement (création de comptes apprenants, script de seed). Nécessaire aussi en production (Vercel) pour que "Ajouter un apprenant" fonctionne.

### 3. Appliquer le schéma de base de données

Dans le **SQL Editor** du dashboard Supabase, colle et exécute le contenu de `supabase/schema.sql`. Ce script (idempotent — relançable sans risque) crée toutes les tables, les policies RLS (accès formateur vs. apprenant), le bucket de stockage `files`, et un compte de démonstration prêt à l'emploi :

- Formateur : `admin@exemple.com`
- Apprenant : `client@exemple.com`
- Mot de passe pour les deux : `changeme123` (à changer depuis Paramètres après la première connexion)

### 4. (Optionnel) Données de démo plus riches

```bash
npm install
npm run seed
```

Ajoute un jeu de données plus complet (5 apprenants, 2 formations) par-dessus le compte de démo créé à l'étape 3 — utile pour développer l'app elle-même, pas nécessaire pour l'utiliser.

### 5. Lancer en local

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — la connexion redirige automatiquement vers `/admin` (formateur) ou `/espace` (apprenant) selon le rôle du compte.

## Ce qui est livré (Phase 1)

Toutes les sections du cahier des charges sont routées et connectées à Supabase (lecture **et** écriture réelles, RLS appliquée) : Dashboard, Formations (liste/détail/éditeur de modules avec chapitres/exercices/quiz), Apprenants (fiche complète), Coaching (calendrier, lives de groupe, créneaux avec réservation atomique anti-double-booking, rendez-vous direct), Communauté (canaux avec permissions), Administratif, Facturation (suivi manuel), Certificat, Paramètres.

## Ce qui est volontairement hors périmètre pour l'instant

Voir le plan de développement pour le détail — en résumé : pas de paiement Stripe automatisé, pas d'emails transactionnels (Resend), pas de génération PDF réelle du certificat, pas de visioconférence intégrée, un seul formateur par espace, pas de déploiement encore effectué. Deux écrans du prototype (Messagerie, Ressources) ne sont pas dans le cahier des charges écrit et affichent une note à ce sujet plutôt qu'une fonctionnalité complète — à cadrer si besoin.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Server Actions pour toutes les mutations.
