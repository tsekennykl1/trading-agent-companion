#!/usr/bin/env bash
# Backend repo path: scripts/bootstrap.sh
# Runs on the EC2 instance (via SSM from deploy.yml, or manually with sudo).
# Installs the backend release, fixes .env ownership/settings, and manages
# the systemd service. Idempotent — safe to re-run.
set -euxo pipefail

APP_DIR="/opt/myTradingAgentsBackend"
SERVICE="mytradingagents-backend"
RUN_USER="${RUN_USER:-ec2-user}"
S3_BUCKET="${S3_BUCKET:-s3general-148535751717-ap-east-1-an}"
RELEASE="${RELEASE:-}"                      # empty = manual run, skip download
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

# ── Python 3.11+ ────────────────────────────────────────────────
if ! command -v python3.11 >/dev/null 2>&1 && ! python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)' 2>/dev/null; then
  if [ "${PKG_MGR}" = "dnf" ]; then
    dnf install -y python3.11 python3.11-pip
  else
    apt-get update
    apt-get install -y --no-install-recommends python3.11 python3.11-venv python3.11-pip
  fi
fi
PYTHON_BIN="$(command -v python3.11 || command -v python3)"
echo "Python: $(${PYTHON_BIN} --version)"

# ── Download and unpack the release (skipped on manual runs) ────
if [ -n "${RELEASE}" ]; then
  TMP=$(mktemp -d)
  aws s3 cp "s3://${S3_BUCKET}/backend/releases/${RELEASE}/backend.zip" "${TMP}/backend.zip" || {
    echo "Missing backend artifact for release ${RELEASE}" >&2
    exit 1
  }
  mkdir -p "${APP_DIR}"
  unzip -o "${TMP}/backend.zip" -d "${APP_DIR}"
  rm -rf "${TMP}"
fi

# ── Settings file (.env) ────────────────────────────────────────
# Download from S3 if the instance doesn't have one yet.
if [ ! -f "${APP_DIR}/.env" ]; then
  aws s3 cp "s3://${S3_BUCKET}/config/.env" "${APP_DIR}/.env" || {
    echo "No .env on the instance and none in s3://${S3_BUCKET}/config/.env" >&2
    echo "Upload one first:  aws s3 cp .env s3://${S3_BUCKET}/config/.env" >&2
    exit 1
  }
fi

# Fix model names: litellm needs the provider prefix (deepseek/...).
# Only rewrites lines that lack the prefix; already-correct lines are untouched.
sed -i \
  -e 's|^TRADINGAGENTS_DEEP_THINK_LLM=deepseek-v4-pro|TRADINGAGENTS_DEEP_THINK_LLM=deepseek/deepseek-reasoner|' \
  -e 's|^TRADINGAGENTS_QUICK_THINK_LLM=deepseek-v4-flash|TRADINGAGENTS_QUICK_THINK_LLM=deepseek/deepseek-chat|' \
  "${APP_DIR}/.env"

# Ownership: the service runs as RUN_USER, so it must own the app dir and
# be able to read .env. This fixes the "Permission denied: '.env'" failure
# seen when .env was created with sudo/root.
chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}"
chmod 600 "${APP_DIR}/.env"

# Keep a copy in S3 so future deploys and rebuilt instances get the same settings.
aws s3 cp "${APP_DIR}/.env" "s3://${S3_BUCKET}/config/.env" --sse AES256 || \
  echo "WARNING: could not upload .env to S3 (check instance role s3:PutObject)" >&2

# ── Python environment ──────────────────────────────────────────
if [ ! -x "${APP_DIR}/.venv/bin/python" ]; then
  sudo -u "${RUN_USER}" "${PYTHON_BIN}" -m venv "${APP_DIR}/.venv"
fi
sudo -u "${RUN_USER}" "${APP_DIR}/.venv/bin/pip" install --upgrade pip
sudo -u "${RUN_USER}" "${APP_DIR}/.venv/bin/pip" install -r "${APP_DIR}/requirements.txt"

# Data dirs (persistent across deploys)
mkdir -p "${APP_DIR}/data" "${APP_DIR}/artifacts"
chown -R "${RUN_USER}:${RUN_USER}" "${APP_DIR}/data" "${APP_DIR}/artifacts"

# ── Systemd service (runs as RUN_USER, not root) ────────────────
cat > "/etc/systemd/system/${SERVICE}.service" <<EOF
[Unit]
Description=Trading Analysis API (myTradingAgentsBackend)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${APP_DIR}
Environment=PYTHONUNBUFFERED=1
ExecStart=${APP_DIR}/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE}.service"
systemctl restart "${SERVICE}.service"

# ── Health check (up to 60 seconds) ─────────────────────────────
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
    echo "Backend healthy."
    systemctl status "${SERVICE}.service" --no-pager || true
    exit 0
  fi
  sleep 2
done

journalctl -u "${SERVICE}.service" -n 80 --no-pager >&2 || true
echo "Backend did not become healthy after bootstrap." >&2
exit 1
