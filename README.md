# VoteÉcole

Application web progressive (PWA) en français pour organiser une élection de classe sur téléphone.

## Fonctionnalités
- Création de compte et connexion avec Supabase Auth (e-mail/mot de passe).
- Consultation des élections publiées et de leurs candidats.
- Vote réservé aux utilisateurs connectés, avec confirmation avant envoi.
- Le schéma Supabase impose un seul vote par utilisateur et par élection.
- Interface adaptée aux téléphones et cache PWA pour les fichiers statiques.

## Configuration
L'application utilise le projet Supabase `aucqzgjwbfkryppamfvv` et une clé publishable publique. Ne jamais mettre une clé `service_role` ou secrète dans le navigateur.

## Préparer une élection
Un responsable doit créer une ligne dans `public.elections` avec `status = 'open'`, puis ajouter des candidats dans `public.candidates` pour le même `election_id`. Les règles RLS existantes ne permettent pas de gérer les élections depuis l'interface élève ; la gestion doit être confiée à un administrateur de confiance.

## Déploiement
Publier le dépôt avec GitHub Pages ou un hébergeur statique HTTPS. La configuration GitHub Pages doit être activée dans les paramètres du dépôt. L'installation PWA nécessite HTTPS (sauf localhost).

## Tests effectués
- Vérification des tables, contraintes de clé étrangère, politiques RLS et contrainte unique de vote dans Supabase.
- Ajout de l'interface responsive `app.js` et `style.css`.
- Test de bout en bout de l'authentification et d'un scrutin réel encore à faire avec comptes de test et une élection/candidats configurés.
