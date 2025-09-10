#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BUILD_DIR="$FRONTEND_DIR/dist/coffee-admin"

echo "[1/4] Build frontend with correct baseHref"
cd "$FRONTEND_DIR"
HUSKY=0 ng build --configuration production --base-href /coffe-deploy/

echo "[2/4] Prepare temp deploy directory"
cd "$ROOT_DIR"
rm -rf .tmp-deploy
mkdir -p .tmp-deploy
rsync -a --delete "$BUILD_DIR/" .tmp-deploy/

echo "[3/4] Init temp repo and push to deploy remote"
cd .tmp-deploy
git init
git config user.name "Deploy Bot"
git config user.email "deploy@example.com"
git config core.hooksPath /dev/null
git checkout -b gh-pages
git add .
git commit -m "Deploy"

DEPLOY_REMOTE_URL=${DEPLOY_REMOTE_URL:-"git@github.com:Addeo/coffe-deploy.git"}
echo "Using remote: $DEPLOY_REMOTE_URL"
git remote add origin "$DEPLOY_REMOTE_URL"
git push -f --no-verify origin gh-pages

echo "[4/4] Done. Enable GitHub Pages: Settings → Pages → Source: gh-pages, /(root)"

