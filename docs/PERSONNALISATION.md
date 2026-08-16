# Personnaliser Sentier

Ce que tu peux changer directement depuis l'app (aucun code) et ce qui se change dans quelques fichiers précis du projet — tout est possible sans rien installer, en éditant les fichiers directement sur GitHub (chaque fichier a un bouton crayon ✏️ "Edit this file" en haut à droite).

## Nom de l'espace

Directement dans l'app : **Paramètres → Espace**. Aucun code à toucher.

## Couleurs

Tout le système de couleurs vit dans [`src/app/globals.css`](../src/app/globals.css), dans le bloc `:root`. Change une valeur, toute l'app se met à jour partout où elle est utilisée.

| Variable | Couleur actuelle | Utilisée pour |
| --- | --- | --- |
| `--primary` | `#3B5BDB` | boutons, liens, progression |
| `--sidebar-bg` | `#101B36` | fond de la barre latérale |
| `--success` | `#0EA371` | statuts validés, payés |
| `--danger` | `#D64545` | alertes, échecs de paiement |
| `--bg` | `#F4F6FA` | fond général de l'app |
| `--text-primary` | `#16213A` | titres, texte de lecture |

Pour une nouvelle marque, changer `--primary` et `--sidebar-bg` suffit à transformer l'ambiance de toute l'app.

Après une modification sur GitHub, Vercel redéploie automatiquement en 1-2 minutes — pas besoin de relancer quoi que ce soit.

## Logo

Le rond « S » de la sidebar et de la page de connexion est du texte, pas une image — remplace-le par ton logo dans [`src/components/shell/app-shell.tsx`](../src/components/shell/app-shell.tsx) et [`src/app/login/page.tsx`](../src/app/login/page.tsx). L'icône d'onglet se change en remplaçant [`src/app/favicon.ico`](../src/app/favicon.ico).

## Typographie

Inter (texte courant) et IBM Plex Mono (dates, montants) sont chargées dans [`src/app/layout.tsx`](../src/app/layout.tsx) via `next/font/google` — n'importe quelle police Google Fonts peut les remplacer en changeant les deux imports.

## Formations, modules, apprenants

Tout le contenu pédagogique se crée depuis l'espace formateur lui-même — aucun accès au code nécessaire au quotidien : **Formations → + Nouvelle formation**, puis modules, chapitres, exercices et quiz depuis chaque fiche. **Apprenants → + Ajouter un apprenant** crée directement le compte de connexion.

## Pour aller plus loin

Pour toute modification plus structurelle (nouvel écran, nouvelle règle métier), le plus simple reste de redemander à Claude Code en pointant vers ce dépôt — il connaît déjà la structure : schéma dans [`supabase/schema.sql`](../supabase/schema.sql), logique de chaque section dans son propre `actions.ts`, composants partagés dans [`src/components/ui/`](../src/components/ui/).
