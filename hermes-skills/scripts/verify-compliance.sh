#!/usr/bin/env bash
# verify-compliance.sh — check that every skill in hermes-skills/ is dual-compliant
# (works in BOTH OpenClaw team-orchestrator format AND Hermes Agent skill-discovery format)
set -e

cd "$(dirname "$0")/.."
HERMES_SKILLS="$(pwd)"
ERRORS=0
SKILL_COUNT=0

echo "🔍 Checking dual-compliance for skills in $HERMES_SKILLS"
echo "============================================================"
echo

for skill_dir in "$HERMES_SKILLS"/skills/*/; do
  skill_name=$(basename "$skill_dir")
  SKILL_COUNT=$((SKILL_COUNT + 1))
  skill_file="$skill_dir/SKILL.md"

  if [ ! -f "$skill_file" ]; then
    echo "❌ $skill_name: missing SKILL.md"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  echo "📦 $skill_name"

  # --- Hermes Agent checks ---
  # 1. YAML frontmatter (starts with ---)
  if ! head -1 "$skill_file" | grep -q '^---$'; then
    echo "   ❌ Hermes: missing YAML frontmatter (file should start with ---)"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ✅ Hermes: YAML frontmatter present"
  fi

  # 2. Required frontmatter fields
  for field in name description trigger; do
    if ! awk '/^---$/{c++; next} c==1' "$skill_file" | grep -q "^$field:"; then
      echo "   ❌ Hermes: frontmatter missing required field: $field"
      ERRORS=$((ERRORS + 1))
    fi
  done
  echo "   ✅ Hermes: required frontmatter fields (name, description, trigger)"

  # 3. Compatibility declaration
  if ! awk '/^---$/{c++; next} c==1' "$skill_file" | grep -q "^compatibility:"; then
    echo "   ⚠️  Hermes: no 'compatibility' field in frontmatter (will still load, but not declared dual-compliant)"
  else
    compat=$(awk '/^---$/{c++; next} c==1' "$skill_file" | grep "^compatibility:" | sed 's/compatibility://; s/\[//g; s/\]//g; s/"//g; s/ //g')
    if [[ "$compat" == *"openclaw"* ]] && [[ "$compat" == *"hermes-agent"* ]]; then
      echo "   ✅ Hermes: declared dual-compliant (openclaw + hermes-agent)"
    else
      echo "   ⚠️  Hermes: compatibility=$compat (not dual)"
    fi
  fi

  # --- OpenClaw checks ---
  # 4. Required body sections
  for section in "## Role" "## Capabilities" "## Workflow"; do
    if ! grep -q "^$section" "$skill_file"; then
      echo "   ❌ OpenClaw: missing required section: $section"
      ERRORS=$((ERRORS + 1))
    fi
  done
  echo "   ✅ OpenClaw: required body sections (Role, Capabilities, Workflow)"

  # 5. Optional but recommended
  for section in "## Example" "## Notes"; do
    if ! grep -q "^$section" "$skill_file"; then
      echo "   ⚠️  OpenClaw: missing recommended section: $section"
    fi
  done

  # 6. Standard subdirectories (optional)
  if [ -d "$skill_dir/references" ]; then
    echo "   ✅ references/ directory present"
  fi
  if [ -d "$skill_dir/scripts" ]; then
    echo "   ✅ scripts/ directory present"
  fi

  echo
done

echo "============================================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ All $SKILL_COUNT skill(s) pass dual-compliance check"
  exit 0
else
  echo "❌ $ERRORS error(s) across $SKILL_COUNT skill(s)"
  exit 1
fi
