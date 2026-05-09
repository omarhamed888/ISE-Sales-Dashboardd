#!/bin/bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./scripts/setup-new-company.sh <company-name> <admin-email>"
  exit 1
fi

COMPANY_NAME="$1"
ADMIN_EMAIL="$2"
ENV_FILE=".env.${COMPANY_NAME// /_}"

cp .env.template "$ENV_FILE"
echo "Created $ENV_FILE"
echo "Fill Firebase values in $ENV_FILE, then run:"
echo "npm run seed:company -- --company=\"$COMPANY_NAME\" --adminEmail=\"$ADMIN_EMAIL\""
echo "firebase deploy --only firestore:rules,hosting"
