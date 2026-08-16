# Sentier

Plateforme de petites formations avec accompagnement coaching — espace formateur (`/admin`) + espace apprenant (`/espace`), Next.js 16 + Supabase.

Voir le cahier des charges (`../Sentier_Cahier_des_charges.docx`) et les deux prototypes HTML (`../sentier-admin-prototype.html`, `../sentier-client-prototype.html`) pour la spécification complète — ce projet en est l'implémentation réelle.

## Mise en route

### 1. Créer un projet Supabase

Sur [supabase.com](https://supabase.com), crée un nouveau projet (gratuit).

### 2. Configurer les variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplis `.env.local` avec les valeurs de **Project Settings > API** de ton projet Supabase :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (utilisée uniquement par le script de seed, jamais exposée au navigateur)

### 3. Appliquer le schéma de base de données

Dans le **SQL Editor** du dashboard Supabase, colle et exécute le contenu de `supabase/migrations/0001_init.sql`. Ça crée toutes les tables, les policies RLS (accès formateur vs. apprenant) et le bucket de stockage `files`.

### 4. Installer les dépendances et peupler des données de démo

```bash
npm install
npm run seed
```

Le script crée un compte formateur + 5 comptes apprenants de démonstration, avec 2 formations, modules, exercices, quiz, sessions de coaching, canaux communauté, documents et paiements. Mot de passe pour tous les comptes : `sentier2026`.

- Formateur : `coach@sentier.app`
- Apprenants : `chloe@`, `yanis@`, `sofia@`, `hugo@`, `lea@sentier.app`

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
