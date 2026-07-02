#!/usr/bin/env bash
# linear-query.sh — run a GraphQL query OR mutation against the Linear API.
#
# Auth: reads the personal API key from $LINEAR_API_KEY (never hardcode a key).
#   export LINEAR_API_KEY=lin_api_xxx
# Note: personal API keys go in the Authorization header RAW (no "Bearer ").
#
# Usage:
#   linear-query.sh '<graphql query string>'
#   linear-query.sh -f op.graphql
#   linear-query.sh -f op.graphql -v '{"n":5}'           # query/mutation + variables
#   linear-query.sh -f mutation.graphql -v "$(cat vars.json)"   # a mutation (see references/mutations.md)
#   echo '<query>' | linear-query.sh -                   # read query from stdin
#
# Output: the JSON response (pretty-printed if `jq` is available).
# Exit codes: 0 ok · 1 usage/auth error · 2 GraphQL or HTTP error.
set -euo pipefail

ENDPOINT="https://api.linear.app/graphql"
QUERY=""
VARIABLES="{}"

usage() { sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

while [ $# -gt 0 ]; do
  case "$1" in
    -f|--file)   QUERY="$(cat "$2")"; shift 2 ;;
    -v|--vars)   VARIABLES="$2"; shift 2 ;;
    -h|--help)   usage ;;
    -)           QUERY="$(cat -)"; shift ;;
    *)           QUERY="$1"; shift ;;
  esac
done

if [ -z "${LINEAR_API_KEY:-}" ]; then
  echo "error: LINEAR_API_KEY is not set. Create one at https://linear.app/settings/account/security" >&2
  exit 1
fi
if [ -z "$QUERY" ]; then echo "error: no query provided" >&2; usage; fi

# Build the JSON body safely (jq if present, else a minimal fallback).
if command -v jq >/dev/null 2>&1; then
  BODY="$(jq -cn --arg q "$QUERY" --argjson v "$VARIABLES" '{query:$q, variables:$v}')"
else
  ESCAPED="$(printf '%s' "$QUERY" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')"
  BODY="{\"query\":$ESCAPED,\"variables\":$VARIABLES}"
fi

RESP="$(curl -sS -w $'\n%{http_code}' -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: $LINEAR_API_KEY" \
  --data "$BODY")"

HTTP_CODE="${RESP##*$'\n'}"
JSON="${RESP%$'\n'*}"

if command -v jq >/dev/null 2>&1; then echo "$JSON" | jq .; else echo "$JSON"; fi

# GraphQL can return 200 with a top-level "errors" array — treat that as failure.
if [ "$HTTP_CODE" -ge 400 ] 2>/dev/null; then
  echo "error: HTTP $HTTP_CODE" >&2; exit 2
fi
if printf '%s' "$JSON" | grep -q '"errors"'; then
  echo "error: GraphQL returned errors (see response above)" >&2; exit 2
fi
