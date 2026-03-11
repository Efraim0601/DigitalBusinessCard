# Commandes à exécuter sur le serveur pour déploiement à jour

À lancer **sur le serveur** (ex. `root@afbdricmr`), dans le répertoire du projet (ex. `/opt/DigitalBusinessCard`).

> Si la commande `docker compose` ne fonctionne pas, utilisez `docker-compose` à la place.

## 1. Aller dans le répertoire du projet

```bash
cd /opt/DigitalBusinessCard
```

## 2. Récupérer la dernière version du code

```bash
git fetch origin
git pull origin master
```

(Si vous utilisez une autre branche, remplacez `master` par son nom.)

## 3. Reconstruire et redémarrer l’application

```bash
docker compose build app --no-cache
docker compose up -d app
```

Cela met à jour l’image `digitalbusinesscard-app` et redémarre le conteneur `vcard-app` sans toucher à la base.

## 4. Mettre à jour la base de données (migration)

Indispensable pour que les onglets **Directions** et **Titres / Postes** fonctionnent (tables `departments` et `job_titles`) :

```bash
docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
```

Si vous n’êtes pas dans le répertoire du projet :

```bash
docker exec -i vcard-db psql -U vcard -d vcard < /opt/DigitalBusinessCard/sql/migration_departments_job_titles.sql
```

## 5. Vérifier que tout est en place

**Conteneurs :**

```bash
docker ps -a
```

Vérifier que `vcard-app` et `vcard-db` sont en statut **Up**.

**Tables en base :**

```bash
docker exec -i vcard-db psql -U vcard -d vcard -c "\dt"
```

Vous devez voir au moins : `cards`, `departments`, `job_titles`.

**Données de démo (optionnel) :**

```bash
docker exec -i vcard-db psql -U vcard -d vcard -c "SELECT COUNT(*) FROM departments; SELECT COUNT(*) FROM job_titles;"
```

## Résumé en une seule séquence

```bash
cd /opt/DigitalBusinessCard
git pull origin master
docker compose build app --no-cache
docker compose up -d app
docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
docker exec -i vcard-db psql -U vcard -d vcard -c "\dt"
```

Après cela, la version déployée est à jour et la base contient les tables nécessaires ; les erreurs 500 sur Directions / Titres ne devraient plus apparaître si la migration a bien été exécutée.
