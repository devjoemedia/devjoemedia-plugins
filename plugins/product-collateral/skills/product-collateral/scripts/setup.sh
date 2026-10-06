#!/usr/bin/env bash
# Create a collateral work directory with the template design system and its two npm deps.
#   bash setup.sh [work-dir]     (default: ./collateral)
set -euo pipefail
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="${1:-collateral}"

mkdir -p "$WORK"/{src,assets/shots,assets/img,assets/brand,out}
cp -n "$SKILL_DIR/assets/templates/brand.css" "$SKILL_DIR/assets/templates/icons.js" "$WORK/src/" 2>/dev/null || true
cd "$WORK"

if [ ! -f package.json ]; then npm init -y >/dev/null; fi
# Reuse a project-local Playwright when present instead of downloading another copy.
if ! node -e "require.resolve('playwright')" >/dev/null 2>&1; then npm i -D playwright >/dev/null; fi
if ! node -e "require.resolve('qrcode')" >/dev/null 2>&1; then npm i -D qrcode >/dev/null; fi
node -e "const {chromium}=require('playwright'); chromium.launch().then(b=>b.close()).catch(()=>process.exit(3))" \
  || npx playwright install chromium

echo "ready: $(pwd)"
echo "scripts: $SKILL_DIR/scripts  (run them from this directory)"
