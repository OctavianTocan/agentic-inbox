dev:
  export AGENTIC_INBOX_API_ORIGIN_OVERRIDE="${AGENTIC_INBOX_API_ORIGIN:-}"; export WEB_PORT_OVERRIDE="${WEB_PORT:-}"; set -a; . ./.env; set +a; export AGENTIC_INBOX_API_ORIGIN="${AGENTIC_INBOX_API_ORIGIN_OVERRIDE:-${AGENTIC_INBOX_API_ORIGIN:-http://127.0.0.1:8001}}"; PORT="${WEB_PORT_OVERRIDE:-${WEB_PORT:-3003}}" bun run dev

api:
  set -a; . ./.env; set +a; bun run dev:api

web:
  export AGENTIC_INBOX_API_ORIGIN_OVERRIDE="${AGENTIC_INBOX_API_ORIGIN:-}"; export WEB_PORT_OVERRIDE="${WEB_PORT:-}"; set -a; . ./.env; set +a; export AGENTIC_INBOX_API_ORIGIN="${AGENTIC_INBOX_API_ORIGIN_OVERRIDE:-${AGENTIC_INBOX_API_ORIGIN:-http://127.0.0.1:8001}}"; PORT="${WEB_PORT_OVERRIDE:-${WEB_PORT:-3003}}" bun run dev:web

build:
  bun run build

test:
  bun run test

typecheck:
  bun run typecheck

lint:
  bun run lint

format:
  bun run format

ci:
  bun run ci

# Start the Postgres dev database (detached) and wait until it is healthy.
up:
  docker compose up -d --wait db

# Stop the dev stack (keeps the data volume).
down:
  docker compose down

# Stop the dev stack and delete the Postgres data volume.
db-clean:
  docker compose down -v

# Recreate a clean database from scratch, then apply migrations.
db-reset: db-clean up db-migrate

# Apply pending migrations against the running database (apps/api owns the runner).
db-migrate:
  set -a; . ./.env; set +a; bun run --cwd apps/api migrate
