# CMS Deployment Guide

> **This file lives in `deploy/DEPLOYMENT.md` in every CMS repo.**
> Follow this exactly for every new client deployment. No steps are optional.

---

## Overview

```
Internet (80/443)
  │
  ▼
Traefik (reverse proxy + Let's Encrypt SSL)   ← Stack 1
  │
  ├─► www.CLIENT.co.za        → CMS app (Next.js, port 3000)  ← Stack 2
  └─► backend.CLIENT.co.za    → CMS admin panel (same app)    ← Stack 2
  └─► traefik.CLIENT.co.za    → Traefik dashboard (HTTPS)     ← Stack 1
  └─► portainer.CLIENT.co.za  → Portainer (HTTPS)             ← Stack 1

Database: PostgreSQL (internal only, not exposed)
Persistent volumes: postgres_data, uploads, images_uploads, data
```

**GitHub Actions** builds the Docker image on every push to `main` and triggers Portainer to redeploy. Zero manual SSH needed for deployments after initial setup.

---

## Prerequisites

- Ubuntu 24.04 LTS VPS (1GB RAM minimum, 2GB+ recommended)
- Domain with DNS A records pointing to VPS public IP
- SSH access (password-based for initial setup only)
- GitHub repo with this codebase (fork of `GavinHolder/white-label-cms`)

---

## Step 1 — DNS Records

Add **A records** for all four subdomains pointing to the VPS public IP:

| Subdomain | Points to |
|---|---|
| `traefik.CLIENT.co.za` | VPS public IP |
| `portainer.CLIENT.co.za` | VPS public IP |
| `www.CLIENT.co.za` | VPS public IP |
| `backend.CLIENT.co.za` | VPS public IP |

Also add apex (`CLIENT.co.za`) → VPS public IP if you want apex redirect.

> DNS must propagate before SSL certs can be issued. Run Step 2 while waiting.

---

## Step 2 — Bootstrap VPS

SSH in with password (one-time only):

```bash
ssh root@VPS_IP
# or: ssh cms@VPS_IP if root login is disabled
```

Run bootstrap:

```bash
# Update packages
apt-get update -qq && apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add deploy user to docker group
usermod -aG docker cms   # replace 'cms' with your deploy username
systemctl enable docker && systemctl start docker

# Create shared Traefik network (used by ALL stacks on this VPS)
docker network create traefik-public

# Create deploy directories
mkdir -p ~/deploy/traefik/acme
mkdir -p ~/deploy/portainer
touch ~/deploy/traefik/acme/acme.json
chmod 600 ~/deploy/traefik/acme/acme.json
```

SSH hardening (Ubuntu 24 specific — do NOT skip):

```bash
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#*KbdInteractiveAuthentication.*/KbdInteractiveAuthentication no/' /etc/ssh/sshd_config
sshd -t && systemctl restart sshd
```

Add your SSH public key before hardening:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

---

## Step 3 — Deploy Traefik Stack

Create `~/deploy/traefik/docker-compose.yml`:

```yaml
services:
  traefik:
    image: traefik:latest
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    ports:
      - "80:80"
      - "443:443"
    environment:
      - TZ=Africa/Johannesburg
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme/acme.json:/acme.json
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      # Traefik dashboard — HTTPS via subdomain
      - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.BASE_DOMAIN`)"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      - "traefik.http.routers.traefik-dashboard.middlewares=traefik-auth"
      - "traefik.http.middlewares.traefik-auth.basicauth.users=admin:HASHED_PASSWORD"
    command:
      - "--api.dashboard=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--providers.docker.network=traefik-public"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.web.http.redirections.entrypoint.permanent=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=ACME_EMAIL"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--log.level=INFO"
      - "--accesslog=true"

networks:
  traefik-public:
    external: true
```

Replace placeholders:
- `BASE_DOMAIN` → e.g. `ovbreadymix.co.za`
- `ACME_EMAIL` → e.g. `admin@ovbreadymix.co.za`
- `HASHED_PASSWORD` → generate with: `echo $(htpasswd -nb admin 'YourPassword') | sed -e s/\\$/\\$\\$/g`

Deploy:

```bash
cd ~/deploy/traefik
docker compose up -d
docker logs traefik -f   # watch for errors, Ctrl+C to exit
```

---

## Step 4 — Deploy Portainer Stack

Create `~/deploy/portainer/docker-compose.yml`:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    networks:
      - traefik-public
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.BASE_DOMAIN`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

volumes:
  portainer_data:
    driver: local

networks:
  traefik-public:
    external: true
```

Replace `BASE_DOMAIN`.

Deploy:

```bash
cd ~/deploy/portainer
docker compose up -d
```

> **CRITICAL:** Complete Portainer first-login (set admin password) within **5 minutes** of starting.
> If locked out: `docker restart portainer` — resets the 5-minute timer.
>
> Visit: `https://portainer.BASE_DOMAIN`

---

## Step 5 — Deploy App Stack via Portainer

In Portainer UI → **Stacks → Add stack → Repository**

| Field | Value |
|---|---|
| Stack name | `CLIENT-cms` (e.g. `sonic-cms`) |
| Repository URL | `https://github.com/GavinHolder/REPO_NAME.git` |
| Repository reference | `refs/heads/main` |
| Compose path | `deploy/app/docker-compose.yml` |
| Authentication | ✅ Enable → Username: `GavinHolder` → Password: GitHub PAT |

**Environment variables** (paste these into Portainer's env editor):

```
APP_NAME=CLIENT-cms
BASE_DOMAIN=CLIENT.co.za
DATABASE_URL=postgresql://cms:DB_PASSWORD@db:5432/cms_db
POSTGRES_USER=cms
POSTGRES_PASSWORD=DB_PASSWORD
POSTGRES_DB=cms_db
JWT_SECRET=GENERATE_64_BYTE_BASE64
JWT_REFRESH_SECRET=GENERATE_64_BYTE_BASE64
SESSION_TIMEOUT=14400000
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://www.CLIENT.co.za
SKIP_MIGRATIONS=false
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760
MEDIA_URL=https://www.CLIENT.co.za/uploads
DOMAIN=CLIENT.co.za
```

Generate secrets:
```bash
# On any machine with openssl:
openssl rand -base64 64   # run twice — one for JWT_SECRET, one for JWT_REFRESH_SECRET
openssl rand -base64 32   # for DB_PASSWORD
```

Click **Deploy the stack**. Watch logs: Portainer → Containers → CLIENT-cms-app → Logs.

First boot takes ~60s (Prisma migrations run automatically).

---

## Step 6 — Seed Database (First Deploy Only)

```bash
ssh cms@VPS_IP
docker exec CLIENT-cms-app node node_modules/prisma/build/index.js db seed
```

This creates:
- Admin user: `admin` / `admin2026` — **change this password immediately**
- Default sections (Hero, Normal, CTA, Footer)
- Sample site config

---

## Step 7 — GitHub Actions (Auto-Redeploy on Push)

**One-time setup per repo:**

1. In Portainer → Stacks → `CLIENT-cms` → **Webhooks** → Enable → Copy URL
2. In GitHub repo → Settings → Secrets and variables → Actions → **New secret**
   - Name: `PORTAINER_WEBHOOK_URL`
   - Value: paste the Portainer webhook URL

From now on, every `git push origin main` will:
1. Build a new Docker image → push to `ghcr.io/gavinholder/REPO_NAME:latest`
2. POST to Portainer webhook → Portainer pulls new image → restarts container
3. Zero downtime on fast deploys (Next.js startup ~30s)

**Verify it works:**
- GitHub → Actions tab → watch "Build & Deploy" workflow run
- Portainer → Containers → CLIENT-cms-app → check restart timestamp

---

## Step 8 — Verify Deployment

```bash
# All four URLs should load over HTTPS:
curl -Is https://www.CLIENT.co.za | head -2          # → HTTP/2 200
curl -Is https://backend.CLIENT.co.za | head -2      # → HTTP/2 302 (redirect to /admin/login)
curl -Is https://traefik.CLIENT.co.za | head -2      # → HTTP/2 200 or 401
curl -Is https://portainer.CLIENT.co.za | head -2    # → HTTP/2 200

# SEO endpoints:
curl https://www.CLIENT.co.za/robots.txt
curl https://www.CLIENT.co.za/sitemap.xml            # empty until canonicalBase is set
```

Admin login: `https://backend.CLIENT.co.za/admin/login` → `admin` / `admin2026`

---

## Step 9 — Post-Deploy Configuration

Do these in the CMS admin before going live:

1. **Settings → Site Config** — company name, logo, contact details
2. **Content → SEO** — set Canonical Base URL (`https://www.CLIENT.co.za`), business info for JSON-LD
3. **Settings → Site Config** — change admin password
4. **Features** — enable/disable features relevant to this client
5. **Maintenance mode** — turn OFF when ready to go live

---

## Persistence — What Survives Container Restarts

| Data | Storage | Volume name |
|---|---|---|
| Database (all pages, sections, users, settings) | PostgreSQL | `CLIENT-cms_postgres_data` |
| Uploaded media | `/app/public/uploads` | `CLIENT-cms_uploads` |
| Uploaded images | `/app/public/images/uploads` | `CLIENT-cms_images_uploads` |
| SEO config, navbar config | `/app/data/` | `CLIENT-cms_data` |

Docker volumes persist across:
- Container restarts ✅
- Image updates (Portainer webhook redeploy) ✅
- Stack redeployments ✅

They are **NOT** backed up automatically. Set up a cron backup to S3/B2 for production clients.

---

## Troubleshooting

### SSL cert not issuing
- DNS not propagated yet — wait and check with `dig www.CLIENT.co.za`
- Check Traefik logs: `docker logs traefik -f`
- Wipe acme.json and restart: `truncate -s 0 ~/deploy/traefik/acme/acme.json && chmod 600 ~/deploy/traefik/acme/acme.json && cd ~/deploy/traefik && docker compose restart`

### Portainer webhook returns non-200
- Stack name must match exactly (case-sensitive) what you entered in Portainer
- Webhook URL expires if you regenerate it — update `PORTAINER_WEBHOOK_URL` secret

### App won't start (DB connection error)
- DB healthcheck must pass before app starts — wait 30s and check again
- `docker logs CLIENT-cms-db -f` — check for auth errors

### Traefik API version mismatch (`client version too old`)
- Use `traefik:latest` — never pin to a specific version (v3.3 has Docker 29.x API bug)

### App showing stale content after deploy
- Hard refresh (Ctrl+Shift+R) — Next.js caches aggressively
- `docker restart CLIENT-cms-app` if server-side cache is stale

---

## Client Custom Development

Each client repo is a fork of `white-label-cms`. Global CMS improvements flow back via upstream merges. To protect client-specific code:

### Convention: `app/_client/` directory

Put **all client-specific pages, components, and API routes** in:
```
app/_client/          ← never exists in white-label-cms main
  pages/
  components/
  api/
```

Files under `app/_client/` will **never conflict** on upstream merge because main CMS never creates files there.

### `.gitattributes` — protect client-modified core files

If you modify a core CMS file (e.g. `app/page.tsx`), add it to `.gitattributes` to lock it:

```gitattributes
# Client-specific overrides — never overwrite on upstream merge
app/page.tsx                    merge=ours
app/calculator/page.tsx         merge=ours
lib/client-config.ts            merge=ours
prisma/seed.ts                  merge=ours
deploy/app/docker-compose.yml   merge=ours
.github/workflows/deploy.yml    merge=ours
```

Enable the ours driver once:
```bash
git config merge.ours.driver true
```

### Pulling upstream updates

```bash
git remote add upstream https://github.com/GavinHolder/white-label-cms.git
git fetch upstream
git merge upstream/main -X ours --no-edit
git push origin main
```

The `-X ours` strategy keeps your version when there are conflicts on unlisted files.

---

## Reference

| File | Purpose |
|---|---|
| `deploy/app/docker-compose.yml` | App + DB stack (used by Portainer) |
| `deploy/DEPLOYMENT.md` | This guide |
| `.github/workflows/deploy.yml` | Build image + trigger Portainer redeploy |
| `.github/workflows/auto-version.yml` | Auto-bump version on push |
| `data/seo-config.json` | SEO settings (persisted via Docker volume) |
| `data/navbar-config.json` | Navbar settings (persisted via Docker volume) |
| `prisma/schema.prisma` | Database schema |
