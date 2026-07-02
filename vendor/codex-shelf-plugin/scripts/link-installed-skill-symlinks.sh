#!/usr/bin/env bash
# Recreate Shelf skill symlinks that may be omitted by plugin cache installation.
set -euo pipefail

PLUGIN_ROOT="${1:-${HOME}/.codex/plugins/cache/plugins-cli/shelf/0.1.0+codex.20260621233340}"
SKILLS_DIR="${PLUGIN_ROOT}/skills"
AGY_REVIEW_LINK="${SKILLS_DIR}/agy-review"
AGY_REVIEW_TARGET="../vendor/use-agy/.agents/skills/agy-review"
AGY_REVIEW_TARGET_ABS="${PLUGIN_ROOT}/vendor/use-agy/.agents/skills/agy-review"

if [ ! -d "${PLUGIN_ROOT}" ]; then
  echo "error: Shelf plugin root does not exist: ${PLUGIN_ROOT}" >&2
  exit 1
fi

if [ ! -f "${AGY_REVIEW_TARGET_ABS}/SKILL.md" ]; then
  echo "error: vendored agy-review skill is missing: ${AGY_REVIEW_TARGET_ABS}/SKILL.md" >&2
  exit 1
fi

mkdir -p "${SKILLS_DIR}"

if [ -e "${AGY_REVIEW_LINK}" ] && [ ! -L "${AGY_REVIEW_LINK}" ]; then
  echo "error: refusing to replace non-symlink path: ${AGY_REVIEW_LINK}" >&2
  exit 1
fi

ln -sfn "${AGY_REVIEW_TARGET}" "${AGY_REVIEW_LINK}"

if [ ! -f "${AGY_REVIEW_LINK}/SKILL.md" ]; then
  echo "error: symlink was created but SKILL.md is not readable: ${AGY_REVIEW_LINK}/SKILL.md" >&2
  exit 1
fi

echo "linked ${AGY_REVIEW_LINK} -> ${AGY_REVIEW_TARGET}"
