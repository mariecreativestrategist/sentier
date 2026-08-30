# Sentier

Plateforme de petites formations avec accompagnement coaching — espace formateur (`/admin`) + espace apprenant (`/espace`), Next.js 16 + Supabase.

Ce dépôt est un **template** : n'importe qui peut en récupérer sa propre copie pour lancer son propre espace, connecté à son propre Supabase et déployé sur son propre Vercel — rien n'est partagé avec l'original.

📄 **Guides pour non-développeurs** : [`docs/guide-installation.md`](docs/guide-installation.md) (mettre le site en ligne), [`docs/guide-utilisation.md`](docs/guide-utilisation.md) (utiliser chaque fonctionnalité au quotidien), [`docs/PERSONNALISATION.md`](docs/PERSONNALISATION.md) (couleurs, logo, nom).

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
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `COACH_NOTIFICATION_EMAIL` — facultatifs. Sans eux, l'app fonctionne à l'identique, elle n'envoie juste aucun email (invitation, message, correction, rappel de session). Clé sur [resend.com](https://resend.com) > API Keys.

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

## Ce qui est livré

Toutes les sections du cahier des charges sont routées et connectées à Supabase (lecture **et** écriture réelles, RLS appliquée) : Dashboard, Formations (liste/détail/éditeur de modules avec chapitres/exercices/quiz), Apprenants (fiche complète, création de compte par invitation), Coaching (calendrier, lives de groupe, créneaux avec réservation atomique anti-double-booking, rendez-vous direct, rappel automatique par email), Messagerie (formateur ↔ apprenant, avec notification email), Communauté (canaux avec permissions), Administratif, Facturation (suivi manuel), Certificat, Paramètres.

Emails transactionnels via Resend (facultatif, voir `.env.local.example`) : invitation d'un nouvel apprenant, nouveau message, nouvelle remise d'exercice, correction disponible, rappel de session (cron quotidien, `vercel.json`).

## Ce qui est volontairement hors périmètre pour l'instant

Voir le plan de développement pour le détail — en résumé : pas de paiement Stripe automatisé, pas de génération PDF réelle du certificat, pas de visioconférence intégrée, un seul formateur par espace. L'écran Ressources du prototype n'est pas dans le cahier des charges écrit et affiche une note à ce sujet plutôt qu'une fonctionnalité complète — à cadrer si besoin.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage) · Server Actions pour toutes les mutations.
