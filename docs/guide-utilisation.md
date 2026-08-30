# Utiliser Sentier — guide du formateur

Ce guide explique ce que tu peux faire dans chaque section de l'espace formateur (`/admin`), et ce que ton apprenant voit en face, côté `/espace`. Tout se passe dans l'interface — aucune de ces actions ne touche au code.

## Dashboard

Ta vue d'ensemble à l'ouverture : nombre d'apprenants actifs, de formations en cours, de sessions de coaching planifiées, et le taux de complétion moyen. En dessous, le **parcours** de tes apprenants les plus récents (une ligne de progression avec les modules faits/en cours/à venir), tes prochaines sessions, et un fil d'activité récente (nouvelles inscriptions, remises d'exercices).

## Formations

**Formations → + Nouvelle formation** : donne un nom, choisis un format (cohorte + coaching individuel, cohorte + ateliers de groupe, coaching 1:1, contenu autonome), une description.

Ouvre une formation pour accéder à trois onglets :

- **Aperçu** — modifie la description.
- **Modules** — la structure pédagogique. Clique **+ Ajouter un module**, puis ouvre-le pour construire son contenu (voir ci-dessous).
- **Apprenants inscrits** — la liste de qui suit cette formation, avec sa progression. Inscrire un apprenant déjà existant se fait ici ; en créer un nouveau se fait depuis **Apprenants** (voir plus bas).

Le statut de la formation (brouillon, en cours, places limitées, en pause, terminée) se change directement en haut de la fiche.

### Construire un module

Un module a trois onglets :

- **Leçons** — une liste de chapitres à gauche, l'éditeur à droite. Chaque chapitre a un titre, un lien vidéo (YouTube ou Vimeo — colle simplement l'URL, l'aperçu s'affiche automatiquement), un contenu en texte enrichi (titres, gras, souligné, couleur), et des fichiers joints (PDF, Excel...).
- **Exercices** — crée un exercice avec une consigne. Quand un apprenant envoie sa remise, elle apparaît ici : clique dessus pour l'ouvrir, écris un commentaire et une note, puis **Enregistrer la correction** — l'apprenant est notifié par email si Resend est configuré.
- **Quiz** — ajoute des questions à choix multiples (jusqu'à 6 réponses), coche la bonne. Les résultats des apprenants qui ont déjà répondu s'affichent en dessous.

## Apprenants

**Apprenants → + Ajouter un apprenant** : nom, email, formation (facultatif). Un compte est créé et une invitation part par email (ou le lien s'affiche à l'écran si Resend n'est pas configuré) — voir `guide-installation.md`.

La fiche d'un apprenant a cinq onglets :

- **Sessions** — historique et sessions à venir. Une session terminée peut recevoir un lien d'enregistrement et une retranscription.
- **Notes de suivi** — tes notes libres après chaque échange, horodatées.
- **Corrections** — toutes les remises de cet apprenant, tous modules confondus, avec accès direct à chacune.
- **Documents** — factures, contrats ou autres documents propres à cet apprenant.
- **Certificat** — se débloque automatiquement à 100% de progression.

## Coaching

Quatre sous-onglets :

- **Calendrier** — toutes les sessions à venir (individuelles et lives de groupe), triées par date.
- **Lives de groupe** — planifie un atelier ou une masterclass rattachée à une formation ; tous les apprenants inscrits la voient apparaître automatiquement dans leur propre calendrier.
- **Créneaux disponibles** — ouvre un créneau (date, heure, durée) que tes apprenants pourront réserver eux-mêmes en un clic.
- **Comptes-rendus** — le flux de toutes tes notes de suivi, tous apprenants confondus.

Tu peux aussi **fixer un rendez-vous directement** (sans passer par un créneau ouvert) si tu préfères garder la main sur ton planning.

Un email de rappel part automatiquement (à toi et à l'apprenant) dans les 24h précédant chaque session, si Resend est configuré.

## Messagerie

Une conversation par apprenant. Choisis-le dans la liste à gauche, écris et envoie — il reçoit une notification par email. Ses messages t'arrivent de la même façon.

## Communauté

**+ Nouveau canal** : choisis qui peut publier (tout le monde, ou seulement toi) et qui y a accès (tous les apprenants, ou seulement ceux d'une ou plusieurs formations précises). Le fil de publications fonctionne comme un mini-réseau social interne.

## Administratif

Ajoute un document (facture, contrat, autre), en le rattachant si besoin à une formation et/ou à un apprenant précis. Un document sans formation ni apprenant est visible par tout le monde. Filtre la liste par type.

## Facturation

Suivi manuel des paiements : montant, échéance, statut (payé, échec, en attente). Pas de prélèvement automatique pour l'instant — c'est toi qui mets le statut à jour.

## Paramètres

Change ton email ou ton mot de passe (l'ancien mot de passe est demandé pour confirmer), et le nom affiché de ton espace.

## Ce que voit ton apprenant (espace `/espace`)

Le miroir de ce que tu gères, en lecture + interactions ciblées :

- **Dashboard** — sa progression, le module où il en est, sa prochaine session, les dernières publications.
- **Ma formation** — la liste des modules, avec accès aux leçons, exercices (envoi de sa remise) et quiz (résultat affiché immédiatement après validation).
- **Coaching** — ses sessions, les lives de groupe de sa formation, et la réservation de créneaux.
- **Messagerie** — sa conversation avec toi.
- **Communauté** — uniquement les canaux auxquels sa formation lui donne accès.
- **Documents** — les siens, plus ceux de sa formation et les documents généraux.
- **Certificat** — verrouillé tant qu'il n'a pas atteint 100%, puis téléchargeable.

Il n'a jamais accès aux données d'un autre apprenant — c'est appliqué au niveau de la base de données, pas seulement caché dans l'interface.

## Pour aller plus loin

- Changer les couleurs, le logo, le nom : voir [PERSONNALISATION.md](./PERSONNALISATION.md).
- Mettre le site en ligne ou le redéployer : voir [guide-installation.md](./guide-installation.md).
