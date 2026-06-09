#!/usr/bin/env bash
# Auto-push feature branch to main on every commit
# Usage: ./push-to-main.sh "commit message"
set -e

cd "$(dirname "$0")/../.."
cd /c/Users/franz/Agent-Teams

# Ensure we're on the feature branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 On branch: $BRANCH"

# Stage everything in hive-swarm-enhancements/ + any related files
git add hive-swarm-enhancements/ 2>/dev/null || true
git add skills/ 2>/dev/null || true
git add providers/ 2>/dev/null || true

# Commit if there are staged changes
if git diff --staged --quiet; then
  echo "ℹ️  No changes to commit"
else
  MSG="${1:-chore: hive-swarm-enhancements auto-update $(date -u +%Y-%m-%dT%H:%M:%SZ)}"
  git commit -m "$MSG" 2>&1 | tail -3
  echo "✅ Committed to $BRANCH"
fi

# Push feature branch first (safer)
echo "🚀 Pushing $BRANCH to origin..."
git push origin "$BRANCH" 2>&1 | tail -3 || echo "⚠️  Push to feature branch failed (will try main directly)"

# Merge to main and push
echo "🔀 Merging $BRANCH → main..."
git checkout main 2>&1 | tail -1
git pull origin main --ff-only 2>&1 | tail -1 || echo "⚠️  Pull failed (may be offline)"
git merge "$BRANCH" --no-ff -m "merge: $BRANCH → main (auto by hive-swarm-builder)" 2>&1 | tail -3 || {
  echo "⚠️  Merge conflict — keeping feature branch as source of truth"
  git checkout "$BRANCH" 2>&1 | tail -1
  exit 1
}

echo "🚀 Pushing main to origin..."
git push origin main 2>&1 | tail -3

# Switch back to feature branch for next iteration
git checkout "$BRANCH" 2>&1 | tail -1

echo "✅ Done — main is up to date"
