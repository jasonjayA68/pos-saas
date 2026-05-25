#!/usr/bin/env bash
# Push every variable from .env.local to Vercel's Production environment.
#
# Usage:   bash scripts/push-env-to-vercel.sh
#  (or:    npm run env:push)
#
# Prereqs:
#   1. Vercel CLI installed     (script installs it if missing)
#   2. You're logged into Vercel (the script will prompt if not — browser flow)
#   3. The .env.local file exists at the project root and has your real values

set -euo pipefail

ENV_FILE=".env.local"

# ── Sanity checks ────────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "✘ $ENV_FILE not found. Run this from the project root." >&2
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "→ Vercel CLI not found. Installing globally (one-time)..."
  npm install -g vercel
  echo "✓ Vercel CLI installed."
  echo ""
fi

# Check login state — `vercel whoami` exits non-zero if not logged in.
if ! vercel whoami >/dev/null 2>&1; then
  echo "→ You're not logged into Vercel. Opening browser to sign in..."
  vercel login
  echo ""
fi

# Link the local folder to the Vercel project if not linked yet.
if [ ! -d .vercel ]; then
  echo "→ Linking this folder to your Vercel project..."
  echo "  When prompted, pick: vendora"
  vercel link
  echo ""
fi

# ── Push every var ──────────────────────────────────────────────────
echo "→ Reading $ENV_FILE and pushing each variable to Vercel → Production..."
echo ""

count=0
while IFS= read -r line || [ -n "$line" ]; do
  # Skip blanks and comments
  [[ -z "${line// /}" ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue

  # Split KEY=VALUE on the first `=` only (values may contain `=`)
  key="${line%%=*}"
  value="${line#*=}"

  # Strip wrapping quotes from value (handles KEY="value" and KEY='value')
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"

  # Trim whitespace from key
  key="${key// /}"
  [ -z "$key" ] && continue

  echo "  · $key"

  # Remove existing var (silently) so re-runs overwrite cleanly.
  vercel env rm "$key" production --yes >/dev/null 2>&1 || true

  # Pipe the value as stdin so we never echo secrets to the terminal.
  printf "%s" "$value" | vercel env add "$key" production >/dev/null

  count=$((count + 1))
done < "$ENV_FILE"

echo ""
echo "✓ Pushed $count variable(s) to Vercel → Production."
echo ""
echo "Next: trigger a redeploy so the deployed app picks them up."
echo ""
echo "  Easiest:"
echo "    vercel --prod"
echo ""
echo "  Or via dashboard:"
echo "    Vercel → Deployments → ⋯ on the top row → Redeploy"
echo "    (uncheck 'Use existing Build Cache' for a guaranteed fresh build)"
