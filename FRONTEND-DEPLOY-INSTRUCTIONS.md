# Deploying the dashboard to the same S3 bucket + EC2 instance

Bucket: `s3general-148535751717-ap-east-1-an` · Instance: `i-00c16218eb325facf` · Region: `ap-east-1`

The dashboard is **not** a plain static site — it renders pages on the server, so it runs as a small
Node service on the instance (port 3000) and S3 is used to carry the build over. Nginx puts it on
port 80/443, with `/api/` going to the backend on port 8000.

## Where the two files go (frontend GitHub repo)

```
your-frontend-repo/
├── .github/workflows/deploy-frontend.yml
└── scripts/bootstrap-frontend.sh
```

Make the script executable before committing: `chmod +x scripts/bootstrap-frontend.sh`

## One-time setup

1. **GitHub repository secret** — `AWS_DEPLOY_ROLE_ARN`: a role GitHub can assume with permission to
   write to the bucket and run `ssm:SendCommand` on the instance. (Access keys work too — see the
   commented lines in the workflow.)
2. **GitHub repository variable** (optional) — `VITE_ENGINE_BASE_URL`: the public address of your
   backend, e.g. `https://your-domain.com`. Only needed if the site is built with a fixed backend URL.
3. **Runtime settings** — upload once, they are never stored in GitHub:
   ```bash
   aws s3 cp .env s3://s3general-148535751717-ap-east-1-an/frontend/config/.env
   ```
   Typical contents:
   ```env
   MCP_ACCESS_KEY=<the same key as the backend>
   ENGINE_BASE_URL=http://127.0.0.1:8000
   ```
4. **On the instance** — the SSM agent running, an instance role that can read the bucket, and nginx:
   ```bash
   sudo dnf install -y nginx unzip   # or apt-get
   sudo systemctl enable --now nginx
   ```
5. **Nginx site** — `/etc/nginx/conf.d/trading.conf`:
   ```nginx
   server {
     listen 80;
     server_name _;

     location /api/ { proxy_pass http://127.0.0.1:8000/; }
     location /mcp  { proxy_pass http://127.0.0.1:8000/mcp; }

     location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```
   Then `sudo nginx -t && sudo systemctl reload nginx`.
6. **Security group** — allow inbound 80 (and 443 once you add HTTPS). Ports 3000 and 8000 stay
   closed to the internet; only nginx reaches them.

## What happens on every push to `main`

1. GitHub builds the site with `NITRO_PRESET=node-server` (a Node build instead of the Cloudflare one).
2. The build is zipped to `s3://…/frontend/releases/<commit>/frontend.zip`, and
   `frontend/current/release.txt` records the live commit.
3. The instance is told (via Systems Manager) to download that release, install it under
   `/opt/trading-frontend`, and restart the `trading-frontend` service.

## Checking and rolling back

```bash
sudo systemctl status trading-frontend
sudo journalctl -u trading-frontend -f

# roll back to an earlier commit
sudo S3_BUCKET=s3general-148535751717-ap-east-1-an RELEASE=<old-commit-sha> \
  /tmp/bootstrap-frontend.sh
```

## Notes

- After changing the `.env` in S3, re-run the workflow (or the bootstrap script) — settings are read
  at startup only.
- Backend and frontend deploy independently; they only share the bucket, the instance and nginx.
- For HTTPS, point a domain at the instance and run `sudo certbot --nginx`.
