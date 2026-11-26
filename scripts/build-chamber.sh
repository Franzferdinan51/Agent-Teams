#!/usr/bin/env bash
# build-chamber.sh — clean, reproducible build of the Chamber UI.
#
# Why a staging dir: npm only consumes files literally named package.json /
# package-lock.json, but the chamber manifest lives in council-package.json /
# council-package-lock.json (the repo-root package.json belongs to the
# servers). So this script stages the chamber sources into a temp dir, puts
# council-package.json in place as package.json next to its lockfile,
# installs from the lockfile, builds with Vite, and copies the output to
# council-dist/ in the repo. The repo's own package.json / node_modules are
# never touched.
#
# Usage:  scripts/build-chamber.sh
# Output: council-dist/ (index.html + assets/)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STAGE="$(mktemp -d /tmp/chamber-build.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT

echo "== staging chamber sources in $STAGE"
cp "$REPO_ROOT/council-package.json" "$STAGE/package.json"
cp "$REPO_ROOT/council-package-lock.json" "$STAGE/package-lock.json"
cp "$REPO_ROOT/index.html" "$REPO_ROOT/vite.config.ts" "$REPO_ROOT/tsconfig.chamber.json" "$STAGE/"
cp "$REPO_ROOT/council-index.tsx" "$REPO_ROOT/council-index.css" "$STAGE/"
cp "$REPO_ROOT/council-app.tsx" "$REPO_ROOT/council-types.ts" "$REPO_ROOT/council-constants.ts" "$STAGE/"
cp -r "$REPO_ROOT/council-components" "$REPO_ROOT/services" "$REPO_ROOT/hooks" "$STAGE/"

cd "$STAGE"
echo "== npm install (from council-package-lock.json)"
# `npm install` (not `ci`) so a lockfile refreshed for newly added deps is
# honoured; the updated lockfile is copied back over council-package-lock.json.
npm install --no-audit --no-fund

echo "== tsc typecheck (strict, tsconfig.chamber.json)"
npx tsc -p tsconfig.chamber.json

echo "== vite build"
npx vite build

echo "== publishing council-dist/"
rm -rf "$REPO_ROOT/council-dist"
cp -r "$STAGE/council-dist" "$REPO_ROOT/council-dist"
# Keep the repo lockfile in sync with what was actually installed.
cp "$STAGE/package-lock.json" "$REPO_ROOT/council-package-lock.json"

echo "== done: $REPO_ROOT/council-dist"
ls -la "$REPO_ROOT/council-dist" "$REPO_ROOT/council-dist/assets"
