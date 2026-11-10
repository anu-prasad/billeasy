#!/usr/bin/env bash
# =====================================================================
# BillEasy — Docker helper
#
# Usage:
#   ./docker.sh up                 Build + start the production stack (detached)
#   ./docker.sh dev                Start the dev stack with hot reload (foreground)
#   ./docker.sh down               Stop and remove containers + networks
#   ./docker.sh reset              Delete ALL volumes (DB data + caches) and start fresh
#   ./docker.sh build [svc...]     Build production images
#   ./docker.sh rebuild [svc...]   Rebuild images without cache
#   ./docker.sh logs [svc...]      Follow logs (all services if none given)
#   ./docker.sh ps                 Show container status
#   ./docker.sh restart [svc...]   Restart services
#   ./docker.sh shell <service>    Open a shell inside a running container
#   ./docker.sh db <service>       Open the mysql client for a service's database
#   ./docker.sh config             Validate/print the merged production config
#
# Examples:
#   ./docker.sh dev
#   ./docker.sh logs auth-service
#   ./docker.sh shell gateway
#   ./docker.sh db bill
#
# Works with both `docker compose` and `docker-compose`. Run with bash
# (Git Bash / WSL / macOS / Linux); the script cds to its own directory.
# =====================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PROD_FILES=(-f docker-compose.yml)
DEV_FILES=(-f docker-compose.yml -f docker-compose.dev.yml)

if docker compose version >/dev/null 2>&1; then
  compose() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() { docker-compose "$@"; }
else
  echo "ERROR: neither 'docker compose' nor 'docker-compose' is available." >&2
  exit 1
fi

compose_prod() { compose "${PROD_FILES[@]}" "$@"; }
compose_dev() { compose "${DEV_FILES[@]}" "$@"; }

# Password used by the mysql client helper. Prefer the shell env, then .env.
if [ -z "${MYSQL_PASSWORD:-}" ] && [ -f .env ]; then
  MYSQL_PASSWORD="$(awk -F= '/^MYSQL_PASSWORD=/{sub(/^[^=]*=/, ""); print; exit}' .env)"
fi
MYSQL_PASSWORD="${MYSQL_PASSWORD:-billeasy_root}"

usage() {
  sed -n '3,26p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

require_service() {
  if [ -z "${1:-}" ]; then
    echo "ERROR: this command needs a service name." >&2
    echo "Services: auth-service account-service product-service bill-service staff-service gateway web" >&2
    exit 1
  fi
}

cmd="${1:-}"
case "$cmd" in
  up)
    shift
    compose_prod up --build -d "$@"
    echo
    echo "BillEasy is starting: http://localhost:3200"
    compose_prod ps
    ;;

  dev)
    shift
    compose_dev up --build "$@"
    ;;

  down)
    shift
    compose_prod down --remove-orphans "$@"
    ;;

  reset)
    shift
    if [ "${1:-}" != "-y" ] && [ "${1:-}" != "--yes" ]; then
      read -r -p "This deletes all BillEasy volumes (databases, node_modules, .next). Continue? [y/N] " reply
      case "$reply" in
        y|Y|yes|YES) ;;
        *) echo "Aborted."; exit 1 ;;
      esac
    fi
    compose_prod down -v --remove-orphans
    compose_prod up --build -d
    echo
    echo "BillEasy was reset and is starting: http://localhost:3200"
    ;;

  build)
    shift
    compose_prod build "$@"
    ;;

  rebuild)
    shift
    compose_prod build --no-cache "$@"
    ;;

  logs)
    shift
    compose_prod logs -f --tail=200 "$@"
    ;;

  ps|status)
    compose_prod ps
    ;;

  restart)
    shift
    compose_prod restart "$@"
    ;;

  shell)
    shift
    require_service "${1:-}"
    compose_prod exec "$1" sh
    ;;

  db)
    shift
    case "${1:-}" in
      auth|auth-db)    db_container=auth-db;    db_name=billeasy_auth ;;
      account|account-db) db_container=account-db; db_name=billeasy_accounts ;;
      product|product-db) db_container=product-db; db_name=billeasy_products ;;
      bill|bill-db)    db_container=bill-db;    db_name=billeasy_bills ;;
      staff|staff-db)  db_container=staff-db;   db_name=billeasy_staff ;;
      *)
        echo "ERROR: choose one of: auth, account, product, bill, staff" >&2
        exit 1
        ;;
    esac
    compose_prod exec -e MYSQL_PWD="$MYSQL_PASSWORD" "$db_container" \
      mysql -uroot "$db_name"
    ;;

  config)
    compose_prod config
    ;;

  ""|-h|--help|help)
    usage
    ;;

  *)
    echo "ERROR: unknown command '$cmd'" >&2
    echo
    usage
    exit 1
    ;;
esac
