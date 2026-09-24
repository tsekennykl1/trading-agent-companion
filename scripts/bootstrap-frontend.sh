#!/usr/bin/env bash
# bootstrap-frontend.sh — runs ON the EC2 instance (invoked by SSM from the
# GitHub Actions deploy-frontend.yml workflow).
#
# It downloads the newest frontend release from S3, installs it under
# /opt/trading-frontend, and restarts the "trading-frontend" service
# (a Node server on port 3000, with nginx in front sending /api/ and /mcp
# to the Python backend on port 8000).
#
# Usage: bash bootstrap-frontend.sh [git-commit-sha]
#   With no argument it reads frontend/current/release.txt from S3.

set -euo pipefail

BUCKET="s3general-148535751717-ap-east-1-an"
APP_DIR="/opt/trading-frontend"
SERVICE="trading-frontend"
RELEASE="${1:-}"

mkdir -p "$APP_DIR"

# Keep a copy of this script on the instance so SSM can always find it.
aws s3 cp "s3://$BUCKET/frontend/scripts/bootstrap-frontend.sh" "$APP_DIR/bootstrap-frontend.sh" --quiet || true

# Which release to install?
if [ -z "$RELEASE" ]; then
  RELEASE="$(aws s3 cp "s3://$BUCKET/frontend/current/release.txt" - | tr -d '[:space:]')"
fi
echo "Installing frontend release: $RELEASE"

# Download and unpack the new release.
TMP="$(mktemp -d)"
aws s3 cp "s3://$BUCKET/frontend/releases/$RELEASE/frontend.tar.gz" "$TMP/frontend.tar.gz"
tar -xzf "$TMP/frontend.tar.gz" -C "$TMP"

# Node 22 runtime — installed once.
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - || true
  yum install -y nodejs || apt-get install -y nodejs
fi

# Settings file (never stored in GitHub): downloaded once from S3.
aws s3 cp "s3://$BUCKET/frontend/config/.env" "$APP_DIR/.env" --quiet || \
  echo "NOTE: no s3://$BUCKET/frontend/config/.env found — continuing without one."

# Swap in the new release atomically.
rm -rf "$APP_DIR/releases/$RELEASE"
mkdir -p "$APP_DIR/releases"
mv "$TMP/.output" "$APP_DIR/releases/$RELEASE"
mv "$TMP/package.json" "$APP_DIR/releases/$RELEASE/package.json" 2>/dev/null || true
ln -sfn "$APP_DIR/releases/$RELEASE" "$APP_DIR/current"
rm -rf "$TMP"

# (Re)create the systemd service and start it.
cat > /etc/systemd/system/$SERVICE.service <<EOF
[Unit]
Description=Trading Agent dashboard (frontend)
After=network.target

[Service]
WorkingDirectory=$APP_DIR/current
EnvironmentFile=-$APP_DIR/.env
Environment=PORT=3000
Environment=NITRO_PORT=3000
ExecStart=/usr/bin/node $APP_DIR/current/server/index.mjs
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now $SERVICE
systemctl restart $SERVICE

# Wait until the site answers on port 3000.
for i in $(seq 1 30); do
  if curl -sf -o /dev/null http://127.0.0.1:3000/; then
    echo "Frontend is up (release $RELEASE)."
    exit 0
  fi
  sleep 2
done

echo "WARNING: frontend did not answer on port 3000 within 60s." >&2
journalctl -u $SERVICE --no-pager -n 50 >&2 || true
exit 1
