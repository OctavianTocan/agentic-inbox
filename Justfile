dev:
  bun run dev

api:
  bun run dev:api

web:
  bun run dev:web

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
  bun run --cwd apps/api migrate
