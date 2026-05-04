#!/bin/bash
set -euo pipefail

shopt -s nullglob
ENV_FILES=(.env.*)

if [[ ${#ENV_FILES[@]} -eq 0 ]]; then
  echo "No .env.* files found"
  exit 1
fi

for env_file in "${ENV_FILES[@]}"; do
  # Skip template/example files
  [[ "$env_file" == ".env.template" || "$env_file" == ".env.example" ]] && continue

  PROJECT_ID=$(grep '^VITE_FIREBASE_PROJECT_ID=' "$env_file" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
  if [[ -z "$PROJECT_ID" ]]; then
    echo "⚠️  Skipping $env_file — VITE_FIREBASE_PROJECT_ID not found"
    continue
  fi

  echo ""
  echo "▶ Deploying → Firebase project: $PROJECT_ID  ($env_file)"
  cp "$env_file" .env.local
  npm run build
  firebase deploy --project "$PROJECT_ID" --only firestore:rules,hosting \
    || echo "❌ Deploy failed for $PROJECT_ID"
  echo "✅ Done: $PROJECT_ID"
done

echo ""
echo "All deployments processed."
