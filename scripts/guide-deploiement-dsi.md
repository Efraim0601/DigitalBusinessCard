# Guide de Deploiement DSI - vcard (Carte de visite digitale)

Version: 1.0  
Date: 2026-03-23  
Applicatif: vcard (Nuxt 3 + PostgreSQL)  
Mode cible recommande: Docker Compose (app + base)

---

## Table des matieres

1. [Prerequis Systeme](#1-prerequis-systeme)  
   1.1 [Environnement serveur](#11-environnement-serveur)  
   1.2 [Ressources materielles recommandees](#12-ressources-materielles-recommandees)  
   1.3 [Acces reseau](#13-acces-reseau)  
2. [Structure du Projet](#2-structure-du-projet)  
3. [Installation](#3-installation)  
   3.1 [Copie du code source](#31-copie-du-code-source)  
   3.2 [Installation des dependances (avec/sans acces internet)](#32-installation-des-dependances-avecsans-acces-internet)  
   3.4 [Dependances principales](#34-dependances-principales)  
4. [Configuration](#4-configuration)  
   4.1 [Fichier de configuration](#41-fichier-de-configuration)  
5. [Base de Donnees](#5-base-de-donnees)  
   5.1 [Creation de la base](#51-creation-de-la-base)  
   5.2 [Creation du schema et des tables](#52-creation-du-schema-et-des-tables)  
   5.3 [Tables du schema](#53-tables-du-schema)  
6. [Demarrage de l'Application](#6-demarrage-de-lapplication)  
   6.1 [Script de demarrage](#61-script-de-demarrage)  
   6.2 [Demarrage manuel de l'API](#62-demarrage-manuel-de-lapi)  
   6.3 [Demarrage de l'interface web](#63-demarrage-de-linterface-web)  
   6.4 [Demarrage en production (Tache planifiee Windows)](#64-demarrage-en-production-tache-planifiee-windows)  
9. [Verification du Deploiement](#9-verification-du-deploiement)  
   9.1 [Tests de connectivite](#91-tests-de-connectivite)  
   9.2 [Points de verification](#92-points-de-verification)  
10. [Mise a Jour](#10-mise-a-jour)  
   10.1 [Procedure de mise a jour](#101-procedure-de-mise-a-jour)  
   10.2 [Mise a jour de la base de donnees](#102-mise-a-jour-de-la-base-de-donnees)  
11. [Maintenance](#11-maintenance)  
   11.1 [Sauvegarde](#111-sauvegarde)  
   11.2 [Supervision](#112-supervision)  
12. [Depannage](#12-depannage)

> Note: la numerotation suit le plan fourni.

---

## 1. Prerequis Systeme

### 1.1 Environnement serveur

- OS recommande: Linux serveur (Ubuntu 22.04 LTS ou equivalent).
- Alternative possible: Windows Server (avec Docker Desktop/Engine et taches planifiees).
- Runtime:
  - Docker Engine + Docker Compose plugin (ou `docker-compose`).
  - Git.
- Option mode manuel (hors Docker):
  - Node.js 20 LTS.
  - npm 10+.
  - PostgreSQL 15+.

### 1.2 Ressources materielles recommandees

- Environnement preproduction:
  - 2 vCPU
  - 4 Go RAM
  - 20 Go disque SSD
- Environnement production (minimum):
  - 4 vCPU
  - 8 Go RAM
  - 50 Go disque SSD
- Production confortable (charge moyenne):
  - 4-8 vCPU
  - 16 Go RAM
  - 100 Go disque (logs + sauvegardes + marges)

### 1.3 Acces reseau

- Flux entrants:
  - `80/443` (via reverse proxy Nginx/Apache) vers l'application.
- Flux internes:
  - Application -> PostgreSQL (port `5432` conteneur DB, ou `5435` hote selon `docker-compose.yml`).
- Flux sortants:
  - Acces registry Docker/npm (si build en ligne).
- DNS:
  - FQDN recommande (ex: `vcard.afriland.local`).

---

## 2. Structure du Projet

Arborescence utile:

- `app/` : interface utilisateur (pages/composants Nuxt).
- `server/api/` : API backend (cards, departments, job-titles).
- `server/utils/db.ts` : connexion PostgreSQL.
- `sql/init.sql` : schema initial.
- `sql/migration_departments_job_titles.sql` : migration directions/titres + seed.
- `docker-compose.yml` : orchestration conteneurs app + DB.
- `Dockerfile` : image applicative.
- `scripts/deploy-server.md` : procedure rapide de mise a jour.
- `scripts/perf-bench.mjs` : script de test de performances + rapport.

---

## 3. Installation

### 3.1 Copie du code source

#### Option A - Git (recommande)

```bash
cd /opt
git clone <URL_DU_REPO> DigitalBusinessCard
cd /opt/DigitalBusinessCard
git checkout master
```

#### Option B - Archive offline

1. Exporter une archive `.tar.gz` ou `.zip` depuis un poste avec acces.
2. Copier sur le serveur cible.
3. Extraire:

```bash
mkdir -p /opt/DigitalBusinessCard
tar -xzf vcard-release.tar.gz -C /opt/DigitalBusinessCard --strip-components=1
cd /opt/DigitalBusinessCard
```

### 3.2 Installation des dependances (avec/sans acces internet)

#### Cas recommande: Docker Compose (avec acces internet)

```bash
cd /opt/DigitalBusinessCard
docker compose pull || true
docker compose up -d --build
```

Si `docker compose` n'est pas disponible:

```bash
docker-compose up -d --build
```

#### Cas sans acces internet (air-gapped)

1. Sur un serveur ayant internet:
   - Construire l'image:
     ```bash
     docker build -t vcard:release .
     ```
   - Exporter:
     ```bash
     docker save vcard:release -o vcard-release-image.tar
     ```
   - Exporter aussi l'image PostgreSQL requise si necessaire.
2. Sur le serveur cible:
   - Importer:
     ```bash
     docker load -i vcard-release-image.tar
     ```
   - Adapter `docker-compose.yml` pour utiliser l'image locale (`image: vcard:release`) et desactiver le `build`.
   - Lancer:
     ```bash
     docker compose up -d
     ```

### 3.4 Dependances principales

- Front/API:
  - `nuxt` (3.x)
  - `@nuxt/ui`, `@nuxt/icon`, `@nuxt/image`
  - `@vite-pwa/nuxt`
  - `nuxt-qrcode`
  - `html-to-image`
- Backend DB:
  - `pg` (client PostgreSQL)
- Infra:
  - Docker, Docker Compose, PostgreSQL 16 (image officielle)

---

## 4. Configuration

### 4.1 Fichier de configuration

Les variables principales sont lues depuis l'environnement (conteneur app) :

- `PGHOST` (ex: `db`)
- `PGPORT` (ex: `5432`)
- `PGDATABASE` (ex: `vcard`)
- `PGUSER` (ex: `vcard`)
- `PGPASSWORD` (ex: `vcard`)
- `DATABASE_URL` (optionnel, prioritaire si defini)

Extrait `docker-compose.yml` (par defaut):

- Service DB:
  - `POSTGRES_DB=vcard`
  - `POSTGRES_USER=vcard`
  - `POSTGRES_PASSWORD=vcard`
  - Port hote `5435` -> conteneur `5432`
- Service app:
  - Expose `8765` -> `3000`
  - Connexion DB vers service `db`

Recommandations DSI:

- Changer les secrets par defaut (`PGPASSWORD`).
- Utiliser un fichier `.env` serveur non versionne.
- Mettre un reverse proxy HTTPS devant l'application.
- Limiter l'exposition du port PostgreSQL aux seuls reseaux internes.

---

## 5. Base de Donnees

### 5.1 Creation de la base

En mode Docker Compose, la base est creee automatiquement par l'image PostgreSQL via:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

En mode manuel PostgreSQL:

```sql
CREATE DATABASE vcard;
CREATE USER vcard WITH ENCRYPTED PASSWORD '<MOT_DE_PASSE_FORT>';
GRANT ALL PRIVILEGES ON DATABASE vcard TO vcard;
```

### 5.2 Creation du schema et des tables

Deux scripts sont a appliquer:

1. Initialisation schema de base (`sql/init.sql`)  
2. Migration directions/titres (`sql/migration_departments_job_titles.sql`)

#### En Docker

```bash
cd /opt/DigitalBusinessCard
docker exec -i vcard-db psql -U vcard -d vcard < sql/init.sql
docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
```

> `init.sql` peut deja etre auto-joue au premier demarrage PostgreSQL si monte dans `/docker-entrypoint-initdb.d/`.

### 5.3 Tables du schema

Tables principales attendues:

- `cards`
- `departments`
- `job_titles`

Verification:

```bash
docker exec -i vcard-db psql -U vcard -d vcard -c "\dt"
```

Verification volumetrie:

```bash
docker exec -i vcard-db psql -U vcard -d vcard -c "SELECT COUNT(*) FROM cards;"
docker exec -i vcard-db psql -U vcard -d vcard -c "SELECT COUNT(*) FROM departments;"
docker exec -i vcard-db psql -U vcard -d vcard -c "SELECT COUNT(*) FROM job_titles;"
```

---

## 6. Demarrage de l'Application

### 6.1 Script de demarrage

Commande standard (app + db):

```bash
cd /opt/DigitalBusinessCard
docker compose up -d
```

Pour forcer une reconstruction:

```bash
docker compose up -d --build
```

### 6.2 Demarrage manuel de l'API

Dans vcard, API et interface sont servies ensemble par Nuxt/Nitro.

Mode manuel (hors Docker), apres build:

```bash
cd /opt/DigitalBusinessCard
npm install
npm run build
PGHOST=localhost PGPORT=5432 PGDATABASE=vcard PGUSER=vcard PGPASSWORD='<secret>' node .output/server/index.mjs
```

### 6.3 Demarrage de l'interface web

- Avec Docker: l'interface est accessible via `http://<serveur>:8765`.
- Avec reverse proxy: exposer via `https://<domaine>` (recommande).
- Avec mode manuel: port par defaut `3000` (ou variable `PORT`).

### 6.4 Demarrage en production (Tache planifiee Windows)

> Recommande en priorite: execution via service Docker.  
> Si demarrage manuel Node sur Windows est impose:

1. Creer un script `start-vcard.bat`:

```bat
@echo off
cd /d C:\DigitalBusinessCard
set PGHOST=localhost
set PGPORT=5432
set PGDATABASE=vcard
set PGUSER=vcard
set PGPASSWORD=<secret>
set PORT=3000
node .output\server\index.mjs
```

2. Configurer une tache planifiee:
   - Declencheur: au demarrage du serveur.
   - Compte: service technique dedie.
   - Action: executer `start-vcard.bat`.
   - Option: redemarrage auto en cas d'echec.

3. Alternative plus robuste Windows: utiliser `nssm` pour installer un service.

---

## 9. Verification du Deploiement

### 9.1 Tests de connectivite

Verifier l'etat des conteneurs:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Tests HTTP:

```bash
curl -I http://localhost:8765/
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/cards?limit=1&offset=0"
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/departments"
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/job-titles"
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/openapi"
```

Codes attendus:

- `/` -> `200`
- `/api/cards?limit=1&offset=0` -> `200`
- `/api/departments` -> `200`
- `/api/job-titles` -> `200`
- `/api/openapi` -> `200` (specification OpenAPI 3.0 JSON, DOC-002)

### 9.1.1 Documentation technique API (OpenAPI)

- **URL** : `GET /api/openapi` (sans authentification ; `Cache-Control: public, max-age=3600`).
- **Variables** : `NITRO_HANDLER_TIMEOUT_MS` (defaut 2000) — delai avant reponse **503** si un handler API ne termine pas ; `NITRO_REQUEST_TIMEOUT_MS` — timeout socket HTTP Node (defaut = handler + 1500 ms).

### 9.2 Points de verification

- Admin:
  - Login admin accessible.
  - Onglets Cartes / Directions / Titres operationnels.
- Front carte:
  - Affichage via URL `/?email=<email>`.
  - Actions partage/QR/telechargement fonctionnelles.
- DB:
  - Presence des 3 tables (`cards`, `departments`, `job_titles`).
  - Absence d'erreur 500 sur endpoints admin.
- Performance (optionnel mais recommande):

```bash
BASE_URL=http://localhost:8765 EMAIL=demo@afrilandfirstbank.com npm run perf:bench -- --runs 2
```

---

## 10. Mise a Jour

### 10.1 Procedure de mise a jour

```bash
cd /opt/DigitalBusinessCard
git fetch origin
git pull origin master
docker compose build app --no-cache
docker compose up -d app
```

Si vous utilisez une autre branche, remplacer `master`.

### 10.2 Mise a jour de la base de donnees

Apres toute livraison touchant le schema:

```bash
cd /opt/DigitalBusinessCard
docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
```

Validation:

```bash
docker exec -i vcard-db psql -U vcard -d vcard -c "\dt"
```

---

## 11. Maintenance

### 11.1 Sauvegarde

Sauvegarde quotidienne recommandee (dump PostgreSQL):

```bash
mkdir -p /var/backups/vcard
docker exec vcard-db pg_dump -U vcard -d vcard > /var/backups/vcard/vcard_$(date +%F).sql
```

Politique conseillee:

- Retention: 30 jours local + copie hors site.
- Test de restauration mensuel.

Restauration:

```bash
cat /var/backups/vcard/vcard_YYYY-MM-DD.sql | docker exec -i vcard-db psql -U vcard -d vcard
```

### 11.2 Supervision

Supervision minimale:

- Sante conteneurs (`docker ps`, restart count).
- Disponibilite HTTP (`/`, `/api/cards`).
- Logs applicatifs (`docker logs vcard-app`).
- Espace disque (volumes Docker + sauvegardes).
- Latence API (p95/p99) via `scripts/perf-bench.mjs` en execution planifiee.

Commandes utiles:

```bash
docker logs --tail 200 vcard-app
docker logs --tail 200 vcard-db
docker stats --no-stream
```

---

## 12. Depannage

### Problemes frequents et resolutions

1. **Erreur 500 sur Directions/Titres**
   - Cause: migration non appliquee.
   - Action:
     ```bash
     docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
     ```

2. **`/api/departments` ou `/api/job-titles` en 404**
   - Cause probable: image applicative ancienne.
   - Action:
     ```bash
     docker compose build app --no-cache
     docker compose up -d app
     ```

3. **Application inaccessible**
   - Verifier ports et firewall:
     - `8765` (app)
     - `5435` (DB hote, si expose)
   - Verifier statut:
     ```bash
     docker ps -a
     ```

4. **Connexion DB refusee**
   - Verifier variables `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`.
   - Verifier logs DB:
     ```bash
     docker logs vcard-db --tail 200
     ```

5. **Build Docker echoue (reseau/registry/polices)**
   - Relancer sur reseau stable.
   - Utiliser image pre-build importee (`docker load`) en environnement ferme.

### Escalade

- Niveau 1: equipe exploitation DSI (runbook + logs).
- Niveau 2: equipe applicative (analyse code/API).
- Niveau 3: DBA (incident schema/performance SQL).

---

## Annexe A - Sequence complete "deploiement initial"

```bash
cd /opt
git clone <URL_DU_REPO> DigitalBusinessCard
cd /opt/DigitalBusinessCard
docker compose up -d --build
docker exec -i vcard-db psql -U vcard -d vcard < sql/migration_departments_job_titles.sql
docker exec -i vcard-db psql -U vcard -d vcard -c "\dt"
curl -I http://localhost:8765/
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/cards?limit=1&offset=0"
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/departments"
curl -sS -o /dev/null -w "%{http_code}\n" "http://localhost:8765/api/job-titles"
```

