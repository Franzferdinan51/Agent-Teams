#!/usr/bin/env bash
# sync-to-local.sh — mirror hermes-skills/skills/ → ~/.hermes/skills/duckets-stack/
# Run this after committing changes so your local Hermes picks up the latest skills.
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$REPO_ROOT/hermes-skills/skills"

# Detect local Hermes skills dir (Windows + git-bash + WSL)
if [ -d "/c/Users/franz/AppData/Local/hermes/skills/duckets-stack" ]; then
  DEST="/c/Users/franz/AppData/Local/hermes/skills/duckets-stack"
elif [ -d "$HOME/.hermes/skills/duckets-stack" ]; then
  DEST="$HOME/.hermes/skills/duckets-stack"
else
  echo "❌ Could not find local Hermes skills directory"
  echo "   Tried: /c/Users/franz/AppData/Local/hermes/skills/duckets-stack"
  echo "   Tried: $HOME/.hermes/skills/duckets-stack"
  exit 1
fi

echo "🔄 Syncing skills"
echo "   src: $SRC"
echo "   dest: $DEST"
echo

if [ ! -d "$SRC" ]; then
  echo "❌ Source not found: $SRC"
  exit 1
fi

mkdir -p "$DEST"
COPIED=0
for skill_dir in "$SRC"/*/; do
  skill_name=$(basename "$skill_dir")
  target="$DEST/$skill_name"
  echo "  → $skill_name"
  mkdir -p "$target"
  # copy contents (SKILL.md, references/, scripts/)
  cp -r "$skill_dir"* "$target/" 2>/dev/null || cp -r "$skill_dir". "$target/"
  COPIED=$((COPIED + 1))
done

echo
echo "✅ Synced $COPIED skill(s) to $DEST"
echo
echo "👉 Restart Hermes (or run /reset) to pick up the new skills."
