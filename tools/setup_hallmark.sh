#!/usr/bin/env bash
# Installs Hallmark locally for Codex in an AIson checkout.
# This helper never changes the GitHub main branch or deploys the website.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Run this inside an AIson git checkout." >&2
  exit 1
fi

branch="$(git branch --show-current)"
if [ -z "$branch" ] || [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "ERROR: Check out a separate feature branch before installing Hallmark." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: Node.js 18+ and npm are required." >&2
  exit 1
fi

node -e 'if (Number(process.versions.node.split(".")[0]) < 18) { console.error("Node.js 18+ required"); process.exit(1); }'

echo "Installing Nutlope/hallmark for Codex ONLY in this project..."
echo "Review https://github.com/Nutlope/hallmark before executing third-party skills."
npx --yes skills add Nutlope/hallmark --skill hallmark --agent codex -y

if [ ! -f .agents/skills/hallmark/SKILL.md ]; then
  echo "ERROR: .agents/skills/hallmark/SKILL.md was not created. Check skills CLI output." >&2
  exit 1
fi
if [ ! -d .agents/skills/hallmark/references ] || [ ! -d .agents/skills/hallmark/scripts ]; then
  echo "ERROR: Hallmark references/scripts are missing. Installation is incomplete." >&2
  exit 1
fi

echo "Hallmark installed in .agents/skills/hallmark (working tree only)."
echo "Review git status; do not commit generated files without review."
echo "Next: in Codex ask: Use Hallmark to audit ./index.html, reporting only."
