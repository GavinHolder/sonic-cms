# White-Label CMS — New Client Deployment Checklist

> Standard setup for every client instance. Follow this exactly to ensure
> consistent deployments and working auto-update pipelines.

---

## Overview: How It Works

```
git push → GitHub Actions builds image → pushes to ghcr.io → Portainer API redeploys stack → container restarts
```

Every client has:
- Their own GitHub repo (fork of this repo)
- Their own Docker image on GHCR (`ghcr.io/gavinholder/<client>-cms:latest`)
- Their own Portainer stack on the shared VPS
- Four GitHub secrets connecting GitHub Actions to Portainer

> **Note:** Portainer CE does not support image re-pull via the GitOps webhook (Business Edition only).
> We use the Portainer REST API directly instead — it is confirmed working and requires no extra tooling.

---

## Step 1 — Create Client GitHub Repo

1. Fork `https://github.com/GavinHolder/white-label-cms` as `<client>-cms`
   - e.g. `sonic-cms`, `ovbreadymix-cms`
2. In the fork, update `.github/workflows/deploy.yml`:
   - Change `IMAGE: ghcr.io/gavinholder/white-label-cms` → `ghcr.io/gavinholder/<client>-cms`
3. In the fork, update `deploy/app/docker-compose.yml`:
   - Change `image: ghcr.io/gavinholder/white-label-cms:latest` → `ghcr.io/gavinholder/<client>-cms:latest`
4. Push to main — this triggers the first image build

---

## Step 2 — Make the GHCR Package Public

After the first GitHub Actions build completes:

1. Go to `https://github.com/users/GavinHolder/packages/container/<client>-cms/settings`
2. Set visibility to **Public**

This allows Portainer to pull the image without authentication.

---

## Step 3 — Create Portainer Stack

In Portainer → **Stacks → Add stack → Repository**:

| Field | Value |
|---|---|
| Stack name | `<client>-cms` (e.g. `sonic-cms`) |
| Repository URL | `https://github.com/GavinHolder/<client>-cms.git` |
| Branch | `refs/heads/main` |
| Compose path | `deploy/app/docker-compose.yml` |
| Authentication | ✅ Enable |
| Username | `GavinHolder` |
| Personal Access Token | GitHub PAT with `repo` + `read:packages` scope |

### Environment Variables (paste into Portainer env editor)

```
APP_NAME=<client>-cms
BASE_DOMAIN=<client-domain.co.za>
STAGING_DOMAIN=<staging-domain>
DATABASE_URL=postgresql://<user>:<password>@db:5432/<dbname>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=<dbname>
JWT_SECRET=<64-char hex — generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<64-char hex — generate: openssl rand -hex 32>
SESSION_TIMEOUT=14400000
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://www.<client-domain.co.za>
SKIP_MIGRATIONS=false
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760
MEDIA_URL=https://www.<client-domain.co.za>/uploads
```

> **STAGING_DOMAIN:** Set this to the VPS hostname (e.g. `clientweb.dedicated.co.za`) during
> initial setup so you can access the site before DNS cutover. Clear it once live on BASE_DOMAIN.

Deploy the stack. Wait ~60s for migrations to complete (watch container logs).

### Find Your Stack ID and Endpoint ID

After creating the stack, check the Portainer URL:
```
https://portainer.<domain>/#!/3/docker/stacks/sonic-cms?id=6&type=2...
                                              ↑                ↑
                                       ENDPOINT_ID        STACK_ID
```

---

## Step 4 — Add GitHub Secrets

Go to `https://github.com/GavinHolder/<client>-cms/settings/secrets/actions` and add:

| Secret | Value | Description |
|---|---|---|
| `PORTAINER_URL` | `https://portainer.<vps-domain>` | Portainer base URL (no trailing slash) |
| `PORTAINER_PASSWORD` | `<admin password>` | Portainer admin account password |
| `PORTAINER_STACK_ID` | `6` | From the Portainer stack URL (`id=X`) |
| `PORTAINER_ENDPOINT_ID` | `3` | From the Portainer stack URL (first number in path) |
| `UPSTREAM_REPO_URL` | *(optional)* | Defaults to `https://github.com/GavinHolder/white-label-cms.git` |

> `GITHUB_TOKEN` is automatic — no setup needed.

---

## Step 5 — Verify the Pipeline

Push any change to `main` (or trigger manually via GitHub Actions → Run workflow).

Expected flow:
1. GitHub Actions: `upstream-merge` (skipped on push) → `build` → `deploy`
2. `build` job pushes new image to GHCR
3. `deploy` job logs into Portainer API, calls `PUT /api/stacks/{id}/git/redeploy` → returns `200`
4. Portainer pulls latest image from GHCR and restarts the container

Check Portainer → Containers → `<client>-cms-app` → Logs for startup messages.

---

## Active Client Deployments

| Client | Repo | Portainer URL | Stack ID | Endpoint ID | VPS | Domain |
|---|---|---|---|---|---|---|
| Sonic Internet | `sonic-cms` | `https://portainer.sonic.co.za` | `6` | `3` | 165.73.86.236 | sonic.co.za |
| Overberg Ready Mix | `ovbreadymix-cms` | *(SSH deploy — migrate to API)* | — | — | 154.66.197.168 | ovbreadymix.co.za |

---

## DNS Cutover (when going live on BASE_DOMAIN)

1. Add DNS A records: `www.<domain>` + `<domain>` → VPS public IP
2. In Portainer, update stack env vars:
   - `NEXT_PUBLIC_API_URL` → `https://www.<domain>`
   - `MEDIA_URL` → `https://www.<domain>/uploads`
   - `STAGING_DOMAIN` → `` (clear/empty)
3. Portainer → Stacks → `<client>-cms` → **Pull and redeploy**

---

## CMS Auto-Update (from Admin Panel)

The **Update Now** button in Admin → Settings triggers a `workflow_dispatch` on the client repo
with `merge_upstream=true`. This:

1. Merges latest changes from `white-label-cms` into the client repo
2. Rebuilds the Docker image with the new code
3. Portainer API redeploys the container with the new image

No manual action needed after setup is complete.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| GHCR pull fails (403) | Package is private | Make package public (Step 2) |
| Deploy job skipped | Secrets not set | Add all 4 Portainer secrets to GitHub repo |
| Portainer API returns 401 | Wrong password | Check `PORTAINER_PASSWORD` secret |
| Portainer API returns 404 | Wrong stack/endpoint ID | Check IDs from Portainer URL |
| Container starts but site errors | Missing env vars | Check Portainer stack env vars, redeploy |
| Login fails | Seed not run | Seed runs automatically on every boot via `docker-entrypoint.sh` |
| Update Now does nothing | Secrets not set | Add all 4 Portainer secrets to GitHub |
| GitOps webhook returns 404 | CE limitation | Use Portainer API approach (this doc) — webhook Re-pull requires Business Edition |
