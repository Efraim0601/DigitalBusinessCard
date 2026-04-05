#!/usr/bin/env bash
# Build / démarrage Docker Compose quand le build échoue avec :
#   apparmor failed to apply profile: write /proc/thread-self/attr/apparmor/exec: no such file or directory
#
# 1) Ce script désactive BuildKit pour le build (souvent suffisant selon la version de Docker).
# 2) Si ça échoue encore : préférer Docker Engine installé via apt
#    (https://docs.docker.com/engine/install/ubuntu/) plutôt que le paquet Snap ;
#    puis : sudo apt install --reinstall apparmor && sudo systemctl restart docker
#
set -euo pipefail
cd "$(dirname "$0")/.."

export DOCKER_BUILDKIT=0
export COMPOSE_DOCKER_CLI_BUILD=0

exec docker compose up -d --build "$@"
