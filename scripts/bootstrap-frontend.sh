#!/usr/bin/env bash
# Frontend repo path: scripts/bootstrap-frontend.sh
# Runs on the EC2 instance via SSM on every frontend deploy.
# Deploys the Nitro/Node server build and manages the systemd service.
set -euxo pipefail

APP_DIR="/opt/trading-frontend"
SERVICE="trading-frontend"
S3_BUCKET="${S3_BUCKET:-s3general-148535751717-ap-east-1-an}"
RELEASE="${RELEASE:?RELEASE env var is required}"
AWS_REGION="${AWS_REGION:-ap-east-1}"

export AWS_DEFAULT_REGION="${AWS_REGION}"

# ── Detect package manager ──────────────────────────────────────
if command -v dnf >/dev/null 2>&1; then
  PKG_MGR="dnf"
elif command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  PKG_MGR="apt-get"
else
  echo "No supported package manager found" >&2
  exit 1
fi

# ── Install Node.js if missing ──────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  if [ "${PKG_MGR}" = "dnf" ]; then
    dnf install -y nodejs
  else
    apt-get update
    apt-get install -y --no-install-recommends nodejs npm
  fi
fi
echo "Node version: $(node --version)"

# ── Nginx: install only — config is owned by backend bootstrap ──
# The backend's bootstrap.sh writes the full nginx config (myfinance.conf
# + mytradingagents.conf) with all four location blocks:
#   location = /api      → backend (exact match for health check)
#   location /api/mcp    → backend (streaming/SSE)
#   location /api/       → backend (prefix-strip)
#   location /           → frontend (Nitro on port 3000)
#
# Writing a second, simpler config here would overwrite the backend's
# version — removing the exact /api match and the MCP streaming block.
# So the frontend script only ensures nginx is installed and running.
if ! command -v nginx >/dev/null 2>&1; then
  if [ "${PKG_MGR}" = "dnf" ]; then
    dnf install -y nginx
  else
    apt-get install -y --no-install-recommends nginx
  fi
fi

# If the backend has never deployed yet (no config exists at all),
# write a minimal frontend-only config so the frontend can still start.
# The backend's next deploy will overwrite this with the full version.
if [ ! -f /etc/nginx/conf.d/mytradingagents.conf ] && \
   [ ! -f /etc/nginx/conf.d/myfinance.conf ]; then
  echo "No backend nginx config found — writing minimal frontend-only config"
  cat > /etc/nginx/conf.d/mytradingagents.conf <<'NGINX_FALLBACK'
server {
    listen 80;
    server_name _;

    # Minimal frontend-only config.
    # The backend's bootstrap.sh will overwrite this with the full
    # multi-location config on its next deploy.

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;
        proxy_cache     off;

        proxy_read_timeout  300s;
        proxy_send_timeout  300s;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX_FALLBACK
fi

# Remove the default server block on BOTH distros
if [ -f /etc/nginx/conf.d/default.conf ]; then
  mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi
if [ -L /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

# ── Download and unpack the build ───────────────────────────────
TMP=$(mktemp -d)
aws s3 cp "s3://${S3_BUCKET}/frontend/releases/${RELEASE}/frontend.zip" "${TMP}/frontend.zip" || {
  echo "Missing frontend artifact for release ${RELEASE}" >&2
  exit 1
}

unzip -o "${TMP}/frontend.zip" -d "${TMP}/unpacked"

# Validate
if [ ! -f "${TMP}/unpacked/.output/server/index.mjs" ]; then
  echo "Build is missing .output/server/index.mjs" >&2
  exit 1
fi

# ── Install into versioned directory and symlink ────────────────
mkdir -p "${APP_DIR}/releases/${RELEASE}"
mv "${TMP}/unpacked/.output"      "${APP_DIR}/releases/${RELEASE}/.output"
mv "${TMP}/unpacked/package.json" "${APP_DIR}/releases/${RELEASE}/package.json" 2>/dev/null || true

# Atomic symlink swap
ln -sfn "${APP_DIR}/releases/${RELEASE}" "${APP_DIR}/current"

rm -rf "${TMP}"

# Keep the MCP key server-side only. This private file is never in the build
# archive or the browser bundle; an absent key leaves every MCP tool closed.
mkdir -p "${APP_DIR}/config"
if aws s3 cp "s3://${S3_BUCKET}/frontend/config/.env" "${APP_DIR}/config/.env"; then
  chmod 600 "${APP_DIR}/config/.env"
elif [ ! -f "${APP_DIR}/config/.env" ]; then
  touch "${APP_DIR}/config/.env"
  chmod 600 "${APP_DIR}/config/.env"
  echo "MCP key not configured: frontend MCP tools remain closed." >&2
fi

# ── Clean up old releases (keep last 5) ─────────────────────────
ls -1dt "${APP_DIR}/releases"/*/ 2>/dev/null | tail -n +6 | xargs rm -rf || true

# ── Systemd service ─────────────────────────────────────────────
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Trading Agent Companion Frontend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/current
Environment=NODE_ENV=production
Environment=NITRO_PORT=3000
Environment=NITRO_HOST=0.0.0.0
Environment=TRADING_ENGINE_URL=https://www.myfinance5051.com/api
EnvironmentFile=${APP_DIR}/config/.env
ExecStart=/usr/bin/node ${APP_DIR}/current/.output/server/index.mjs
Restart=always
RestartSec=5
KillMode=process

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE}.service"
systemctl restart "${SERVICE}.service"

# ── Early diagnostics ───────────────────────────────────────────
sleep 5
echo "=== systemctl status (frontend) ==="
systemctl status "${SERVICE}.service" --no-pager || true
echo "=== journalctl (last 50 lines) ==="
journalctl -u "${SERVICE}.service" -n 50 --no-pager || true
echo "=== nginx config in effect ==="
echo "--- mytradingagents.conf ---"
cat /etc/nginx/conf.d/mytradingagents.conf 2>/dev/null || echo "(not present)"
echo "--- myfinance.conf ---"
cat /etc/nginx/conf.d/myfinance.conf 2>/dev/null || echo "(not present)"

# ── Health check loop (up to 60 seconds) ────────────────────────
for i in $(seq 1 12); do
  if curl -fsS "http://127.0.0.1:3000" >/dev/null 2>&1; then
    echo "Frontend healthy on release ${RELEASE}."
    exit 0
  fi
  sleep 5
done

journalctl -u "${SERVICE}.service" -n 50 --no-pager >&2 || true
echo "Frontend did not become healthy after bootstrap." >&2
exit 1