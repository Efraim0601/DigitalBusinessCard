#!/usr/bin/env bash
# Build / démarrage Docker Compose.
#
# Le Dockerfile utilise un cache npm (RUN --mount=type=cache) : il faut **BuildKit**
# (Docker 23+ / Compose v2 : souvent activé par défaut).
#
# Ancien bug AppArmor / Docker Snap :
#   write /proc/thread-self/attr/apparmor/exec: no such file or directory
# → préférer Docker Engine via apt (https://docs.docker.com/engine/install/ubuntu/)
#   plutôt que le paquet Snap ; puis redémarrer docker / la machine.
#
# Dernier recours uniquement : forcer l’ancien builder (**sans** cache npm du Dockerfile,
# le build peut échouer sur `RUN --mount` — il faudrait retirer ces lignes dans Dockerfile) :
#   export DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0
#   docker compose up -d --build
#
set -euo pipefail
cd "$(dirname "$0")/.."

export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export COMPOSE_DOCKER_CLI_BUILD="${COMPOSE_DOCKER_CLI_BUILD:-1}"

exec docker compose up -d --build "$@"
