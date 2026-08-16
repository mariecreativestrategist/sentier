# Mettre Sentier en ligne — guide complet

Ce guide part du principe que tu n'as jamais programmé. Tout se passe dans le navigateur — aucun logiciel à installer, aucun terminal à ouvrir. Chaque étape explique quoi cliquer et à quoi doit ressembler le résultat. Ne saute pas d'étape, même si elle te semble évidente.

Compte environ 20-25 minutes la première fois.

## Avant de commencer : le vocabulaire de base

- **Variable d'environnement** : une information secrète ou de configuration (clé d'un service, adresse de la base de données...) que le site va lire au démarrage.
- **Déployer** : mettre le site en ligne, accessible par une adresse internet.
- **Dépôt (repository)** : l'endroit où le code du site est rangé sur GitHub — un peu comme un dossier partagé.
- **Bucket** : un espace de stockage de fichiers (PDF, images, vidéos) dans Supabase.

Crée-toi un compte (gratuit) sur ce site — on le configure à l'étape 1 :

- [supabase.com](https://supabase.com)

Pour Vercel (étape 4), pas besoin de créer de compte à l'avance : tu pourras t'inscrire directement avec ton compte GitHub au moment de déployer.

## Étape 1 — Créer le projet Supabase (la base de données)

Supabase va stocker toutes les données du site (formations, apprenants, sessions, documents...) et les fichiers déposés (PDF, vidéos, pièces jointes).

1. Va sur [supabase.com](https://supabase.com), connecte-toi.
2. Clique **New project**.
3. Remplis :
   - **Name** : le nom que tu veux (ex. `mon-espace-formation`)
   - **Database Password** : clique **Generate a password** pour en générer un fort, puis copie-le et colle-le dans un fichier texte que tu gardes de côté.
   - **Region** : la région la plus proche de tes apprenants (ex. *West EU (Paris)* pour la France).
4. Clique **Create new project** et attends environ 2 minutes.

## Étape 2 — Créer les tables et le compte de démo (copier-coller un script)

1. Dans Supabase, menu de gauche : **SQL Editor**.
2. Clique **New query**.
3. Ouvre ce lien dans un nouvel onglet : [supabase/schema.sql](https://github.com/mariecreativestrategist/sentier/blob/master/supabase/schema.sql).
4. Sur cette page GitHub, clique le bouton **Raw** (en haut à droite de l'aperçu du fichier) — le texte brut du script s'affiche. Sélectionne tout (Ctrl+A / Cmd+A) et copie (Ctrl+C / Cmd+C).
5. Reviens dans Supabase, colle le script dans la zone de requête (Ctrl+V / Cmd+V).
6. Clique **Run** (ou Ctrl+Entrée).

Un message de succès s'affiche en bas. Ce script, en un seul passage, a créé :

- les tables de l'application, avec la sécurité (chaque apprenant ne voit jamais les données d'un autre apprenant) ;
- un bucket de stockage pour les fichiers (chapitres, exercices, documents administratifs) ;
- un compte formateur et un compte apprenant de démonstration, utilisables immédiatement après le déploiement :
  - Formateur — Email : `admin@exemple.com` · Mot de passe : `changeme123`
  - Apprenant — Email : `client@exemple.com` · Mot de passe : `changeme123`

(Tu changeras le mot de passe formateur juste après le premier déploiement — voir Étape 5.)

> ⚠️ Si l'exécution du script échoue avec une erreur mentionnant `auth.users` ou `auth.identities` : ce sont les tables internes de Supabase, qui peuvent varier légèrement selon les versions. Dans ce cas, crée les deux comptes à la main depuis **Authentication → Users → Add user** (`admin@exemple.com` / `changeme123`, puis `client@exemple.com` / `changeme123`, en cochant *Auto Confirm User*), puis relance le script en le collant une seconde fois — les tables existent déjà et seront ignorées, seul le contenu de démonstration manquant sera ajouté.

## Étape 3 — Récupérer les clés Supabase

1. Menu de gauche : **Project Settings → Data API**.
2. Section *Project URL* : copie l'adresse dans ton fichier texte.
3. Section *Project API keys* :
   - copie la clé **anon public** dans ton fichier texte ;
   - trouve la ligne **service_role** (ou **secret key** selon la version) → clique **Reveal**, copie-la dans ton fichier texte.

> ⚠️ Cette clé secrète ne se partage jamais publiquement — elle donne un accès complet à la base de données.

## Étape 4 — Déployer sur Vercel (en un clic)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmariecreativestrategist%2Fsentier&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY&envDescription=Cles%20Supabase%20(Project%20Settings%20-%3E%20Data%20API)&project-name=sentier&repository-name=sentier)

1. Clique sur le bouton ci-dessus (ou colle cette adresse dans ton navigateur : `https://vercel.com/new/clone?repository-url=https://github.com/mariecreativestrategist/sentier`).
2. Connecte-toi à Vercel avec ton compte GitHub, si ce n'est pas déjà fait.
3. Vercel te propose de créer une copie du code dans ton propre compte GitHub — laisse le nom par défaut (`sentier`) ou choisis le tien, puis clique **Create**. C'est important : c'est ta copie, indépendante de l'originale, que tu vas pouvoir modifier librement.
4. Un formulaire **Environment Variables** apparaît, avec les bons noms de variables déjà pré-remplis. Ajoute la valeur de chacune, récoltée à l'étape 3 :

| Nom de la variable | Valeur à coller |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | l'adresse de l'étape 3 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé anon public de l'étape 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé service_role / secret de l'étape 3 |

5. Clique **Deploy**. Une page avec un chargement animé apparaît — patiente 2-3 minutes.

> 💡 `SUPABASE_SERVICE_ROLE_KEY` est nécessaire sur Vercel (pas seulement en local) : c'est elle qui permet au site de créer le compte de connexion d'un apprenant quand tu cliques "+ Ajouter un apprenant".

> 💡 Si tu préfères garder la main sur la copie GitHub avant de déployer (par exemple pour la renommer autrement), tu peux aussi cliquer **Use this template** en haut de la page du dépôt GitHub toi-même, puis aller sur [vercel.com/new](https://vercel.com/new) et cliquer **Import** à côté de ta copie — le résultat est identique, juste en deux étapes séparées.

## Étape 5 — Premiers tests

Le site est maintenant entièrement réel : ce que tu vas faire ci-dessous est vraiment sauvegardé dans ta base Supabase, pas juste affiché à l'écran.

1. Une fois le déploiement terminé, clique sur l'aperçu pour ouvrir le site.
2. Connecte-toi avec `admin@exemple.com` / `changeme123`.
3. Tu arrives sur le **Dashboard** de l'espace formateur. Va dans **Paramètres** (menu de gauche) et change immédiatement ce mot de passe.

Teste côté formateur :

- **Apprenants → + Ajouter un apprenant** → renseigne un nom et un email → un compte de connexion est créé automatiquement, avec un mot de passe temporaire affiché **une seule fois** (note-le, ou utilise plutôt le compte de démo ci-dessous pour tester).
- **Formations** → ouvre la *Formation de démonstration* → onglet **Modules** → ouvre un module → onglet **Leçons** → ajoute un chapitre, écris du texte, ajoute un fichier — le fichier doit apparaître comme pièce jointe téléchargeable.
- **Sessions coaching → Créneaux disponibles** → ouvre un créneau.
- **Administratif** → ajoute un document.

Teste côté apprenant, dans un onglet privé/navigation privée :

- Connecte-toi avec le compte apprenant de démo créé automatiquement par le script SQL : `client@exemple.com` / `changeme123`.
- Va sur **Ma formation**, ouvre un module, envoie une remise d'exercice ou réponds au quiz.
- Reviens sur l'espace formateur (fiche de l'apprenant de démo, onglet Corrections) et vérifie que la remise apparaît bien.
- Va sur **Coaching → Réserver un créneau**, réserve le créneau ouvert plus haut.

## Étape 6 (optionnel) — Ton propre nom de domaine

Si tu as un nom de domaine (acheté chez OVH, Namecheap...) :

1. Dans Vercel : **Project → Settings → Domains** → tape ton adresse souhaitée → **Add**.
2. Suis les instructions DNS affichées (à ajouter chez ton fournisseur de domaine).

## Personnaliser le site (nom, logo, couleurs)

Voir [PERSONNALISATION.md](./PERSONNALISATION.md) — tout se fait aussi depuis le navigateur, sans rien installer localement (directement depuis GitHub en éditant les fichiers en ligne, ou depuis l'app elle-même).

## En cas de blocage

- **Le script SQL échoue avec une erreur sur `auth.users`** : voir l'encadré à la fin de l'Étape 2.
- **Impossible de se connecter avec `admin@exemple.com` ou `client@exemple.com`** : vérifie dans Supabase (**Table Editor → profiles**) qu'une ligne existe bien pour ce compte, et dans **Authentication → Users** que l'utilisateur apparaît.
- **Le mot de passe temporaire d'un nouvel apprenant ne fonctionne pas** : vérifie que `SUPABASE_SERVICE_ROLE_KEY` est bien renseignée dans Vercel — c'est cette clé qui permet au serveur de créer le compte de connexion de l'apprenant au moment où le formateur l'ajoute.
- **L'upload d'un fichier échoue** (chapitre, exercice, document) : vérifie dans Supabase (**Storage**) que le bucket `files` existe bien.
- **Le site redirige vers `/login` en boucle, ou une page reste blanche** : vérifie que les 3 variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` sont bien renseignées dans Vercel, puis redéploie (**Deployments → ⋯ → Redeploy**).
