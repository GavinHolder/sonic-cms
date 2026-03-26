# White-Label CMS — Client Deployment Guide

> **Single source of truth** for deploying and managing client CMS instances.
> Follow this exactly. Every client uses the same process — no exceptions.

---

## ⛔ NON-NEGOTIABLE RULES

1. **ONE deploy method** — Portainer API with env var preservation. No SSH. No webhooks. No manual docker commands.
2. **ONE workflow template** — `deploy/client-deploy-template.yml` from the main CMS. NEVER write a custom deploy.yml.
3. **ONE process** — Fork → Template → Secrets → Deploy. No shortcuts, no variations.
4. **deploy.yml is protected** — `.gitattributes merge=ours` prevents upstream merges from overwriting it. Once set, it stays.
5. **Environment variables live in Portainer** — never in the repo, never in GitHub env vars. Only Portainer connection secrets in GitHub.
6. **DATABASE_URL special chars must be URL-encoded** — `!` → `%21`, `#` → `%23`. This is non-optional.
7. **The deploy workflow handles ALL Portainer stack types** — git-based stacks, manual stacks, and standalone stacks. Three fallback methods built in.
8. **Changes flow one direction only** — Main CMS → Client repo (via upstream merge). Never the reverse.
9. **Client custom code goes in `app/_client/`** — protected by `.gitattributes merge=ours`. Never edit core CMS files.
10. **Test before deploy** — every deploy runs `npm test` before building. Tests fail = no deploy.

**If something doesn't work, the fix goes in the MAIN CMS template, not in the client repo. Client deploy.yml is ALWAYS a copy of the template.**

---

## How It Works

```
Main CMS (this repo)                        Client CMS (client repo)
┌──────────────────────┐                    ┌──────────────────────┐
│ Push code to main    │                    │                      │
│        ↓             │                    │                      │
│ auto-version bumps   │                    │                      │
│ cms-version.json     │                    │                      │
│        ↓             │                    │                      │
│ notify-clients.yml   │───dispatches──────→│ deploy.yml triggers  │
│ reads CLIENT_REGISTRY│                    │        ↓             │
│ secret (JSON)        │                    │ Merges upstream      │
│                      │                    │        ↓             │
│                      │                    │ Runs tests           │
│                      │                    │        ↓             │
│                      │                    │ Builds Docker image  │
│                      │                    │ → pushes to GHCR     │
│                      │                    │        ↓             │
│                      │                    │ Portainer API        │
│                      │                    │ redeploys stack      │
└──────────────────────┘                    └──────────────────────┘
```

**Key principle:** The main CMS has ZERO client-specific code. Client registry lives in encrypted GitHub secrets. Association goes client → main, never main → client.

---

## Part A — Setting Up a New Client

### Step 1: Create Client GitHub Repo

1. Fork `https://github.com/GavinHolder/white-label-cms` as `<client>-cms`
2. Copy `deploy/client-deploy-template.yml` → `.github/workflows/deploy.yml`
3. In deploy.yml, change the IMAGE line:
   ```yaml
   env:
     IMAGE: ghcr.io/gavinholder/<client>-cms
   ```
4. In `deploy/app/docker-compose.yml`, change:
   ```yaml
   image: ghcr.io/gavinholder/<client>-cms:latest
   ```
5. Push to main — triggers first image build

### Step 2: Make GHCR Package Public

After the first build completes:

1. Go to `https://github.com/users/GavinHolder/packages/container/<client>-cms/settings`
2. Set visibility to **Public**

### Step 3: Create Portainer Stack

In Portainer → Stacks → Add stack → Repository:

| Field | Value |
|---|---|
| Stack name | `<client>-cms` |
| Repository URL | `https://github.com/GavinHolder/<client>-cms.git` |
| Branch | `refs/heads/main` |
| Compose path | `deploy/app/docker-compose.yml` |
| Authentication | ✅ Enable |
| Username | `GavinHolder` |
| Personal Access Token | GitHub PAT with `repo` + `read:packages` scope |

### Environment Variables

Paste into Portainer's environment editor:

```
APP_NAME=<client>-cms
BASE_DOMAIN=<client-domain.co.za>
STAGING_DOMAIN=<vps-hostname-for-testing>
DATABASE_URL=postgresql://<user>:<password>@db:5432/<dbname>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
POSTGRES_DB=<dbname>
JWT_SECRET=<generate: openssl rand -hex 32>
JWT_REFRESH_SECRET=<generate: openssl rand -hex 32>
SESSION_TIMEOUT=14400000
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://www.<client-domain.co.za>
SKIP_MIGRATIONS=false
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760
MEDIA_URL=https://www.<client-domain.co.za>/uploads
```

Deploy the stack. Wait ~60s for migrations. Check container logs for "CMS started".

### Step 4: Get Portainer Stack ID and Endpoint ID

After creating the stack, look at the Portainer URL in your browser:

```
https://portainer.example.com/#!/3/docker/stacks/my-client?id=6&type=2
                                   ↑                          ↑
                            ENDPOINT_ID = 3            STACK_ID = 6
```

### Step 5: Add Secrets to the Client Repo

Go to the client repo → Settings → Secrets and variables → Actions:

| Secret | Value | Example |
|---|---|---|
| `PORTAINER_URL` | Portainer base URL (no trailing slash) | `https://portainer.example.com` |
| `PORTAINER_USERNAME` | Portainer login username | `admin` |
| `PORTAINER_PASSWORD` | Portainer login password | `MySecurePass123` |
| `PORTAINER_STACK_ID` | Stack ID from Step 4 | `6` |
| `PORTAINER_ENDPOINT_ID` | Endpoint ID from Step 4 | `3` |

### Step 6: Verify the Pipeline

1. Push any small change to the client repo's `main` branch
2. Go to Actions tab — watch the Build & Deploy workflow
3. Expected: all 4 jobs pass (Merge Upstream → Test → Build → Deploy)
4. Check Portainer → Containers → logs for startup confirmation

---

## Part B — Register Client for Auto-Updates

This is how the main CMS automatically notifies clients when a new version is available.

### How Auto-Updates Work

1. You push code to the main CMS repo
2. `auto-version.yml` bumps `cms-version.json` and commits
3. `notify-clients.yml` detects the version change
4. It reads the `CLIENT_REGISTRY` secret (a JSON array of clients)
5. For each client, it dispatches their `deploy.yml` with `merge_upstream=true`
6. The client's workflow merges latest upstream → tests → builds → deploys

**Result:** Push to main CMS → all registered clients automatically update. No manual action.

### Step 1: Create a PAT for the Client

You need a GitHub Personal Access Token that can trigger workflows on the client repo.

1. Go to https://github.com/settings/tokens → Generate new token (classic)
2. Name: `<CLIENT>-CMS-DEPLOY`
3. Scopes: `repo`, `workflow`
4. Copy the token

### Step 2: Add PAT Secret to the Main CMS Repo

1. Go to https://github.com/GavinHolder/white-label-cms/settings/secrets/actions
2. Click "New repository secret"
3. Name: `<CLIENT>_PAT` (e.g., `ACME_PAT`, `OVB_PAT`, `SONIC_PAT`)
4. Value: paste the PAT from Step 1

### Step 3: Add Client to the Registry Secret

1. Go to https://github.com/GavinHolder/white-label-cms/settings/secrets/actions
2. Edit the `CLIENT_REGISTRY` secret
3. It's a JSON array. Add your new client entry:

```json
[
  {
    "name": "Existing Client",
    "org": "GavinHolder",
    "repo": "existing-cms",
    "workflow": "deploy.yml",
    "secret": "EXISTING_PAT",
    "auto_deploy": true
  },
  {
    "name": "New Client Name",
    "org": "GavinHolder",
    "repo": "newclient-cms",
    "workflow": "deploy.yml",
    "secret": "NEWCLIENT_PAT",
    "auto_deploy": true
  }
]
```

**Fields explained:**

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Display name (for logs only) |
| `org` | Yes | GitHub org or username that owns the client repo |
| `repo` | Yes | Client repo name (e.g., `sonic-cms`) |
| `workflow` | Yes | Deploy workflow filename (always `deploy.yml`) |
| `secret` | Yes | Name of the PAT secret you created in Step 2 (e.g., `SONIC_PAT`) |
| `auto_deploy` | Yes | `true` = auto-merge upstream on notify. `false` = just badge notification |

### Step 4: Add the PAT to the Notify Workflow

Because GitHub Actions can't dynamically access secrets by name, you must add the PAT to the notify workflow's env block:

1. Open `.github/workflows/notify-clients.yml` in the main CMS repo
2. Find the `env:` block in the "Dispatch to clients" step
3. Add your new PAT secret:

```yaml
      - name: Dispatch to clients
        env:
          CLIENT_REGISTRY: ${{ secrets.CLIENT_REGISTRY }}
          VERSION: ${{ steps.version.outputs.version }}
          DRY_RUN: ${{ github.event.inputs.dry_run || 'false' }}
          # ─── CLIENT PAT SECRETS ─────────────────────────
          OVB_PAT: ${{ secrets.OVB_PAT }}
          SONIC_PAT: ${{ secrets.SONIC_PAT }}
          NEWCLIENT_PAT: ${{ secrets.NEWCLIENT_PAT }}    # ← ADD THIS
          # ────────────────────────────────────────────────
```

4. Commit and push

### Step 5: Test the Notification

1. Go to the main CMS repo → Actions → Notify Clients → Run workflow
2. Set dry_run to "true" for a safe test
3. Check the logs — you should see each client listed with "DRY RUN: would dispatch"
4. Run again with dry_run "false" to actually dispatch

---

## Part C — DNS Cutover (Going Live)

When the client's domain is ready:

1. Add DNS A records: `www.<domain>` + `<domain>` → VPS public IP
2. In Portainer, update stack environment variables:
   - `NEXT_PUBLIC_API_URL` → `https://www.<domain>`
   - `MEDIA_URL` → `https://www.<domain>/uploads`
   - `STAGING_DOMAIN` → (clear/empty)
3. Portainer → Stacks → Pull and redeploy

---

## Part D — CMS Admin Update (Manual)

Clients can also trigger updates from their admin panel:

1. Log into client CMS → Settings → CMS Updates
2. Configure: GitHub PAT, repo owner, repo name, workflow ID
3. "Check for Updates" shows available version + breaking changes
4. "Update Now" dispatches `deploy.yml` with `merge_upstream=true`

This is the manual alternative to auto-updates. Both methods use the same deploy pipeline.

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| GHCR pull fails (403) | Package is private | Make package public (Part A, Step 2) |
| Deploy job skipped | Secrets not set | Add all 5 Portainer secrets (Part A, Step 5) |
| Portainer returns 401 | Wrong password or username | Check `PORTAINER_PASSWORD` and `PORTAINER_USERNAME` |
| Portainer returns 404 | Wrong stack/endpoint ID | Re-check IDs from Portainer URL (Part A, Step 4) |
| Merge conflict on update | Client modified protected file | `.gitattributes merge=ours` handles this. If it still fails, resolve manually |
| Workflow push rejected | Upstream has workflow files client doesn't | Deploy template auto-removes main-repo-only workflows |
| Notify doesn't dispatch | PAT not in env block | Add the PAT to `notify-clients.yml` env block (Part B, Step 4) |
| Client not updating | Not in CLIENT_REGISTRY | Add client to the secret (Part B, Step 3) |
| Site down after update | Missing env vars or migration failed | Check Portainer container logs, verify env vars |

---

## Summary: Adding a New Client (Quick Reference)

```
1. Fork white-label-cms → <client>-cms
2. Copy deploy/client-deploy-template.yml → .github/workflows/deploy.yml
3. Change IMAGE env var to ghcr.io/gavinholder/<client>-cms
4. Change docker-compose.yml image name
5. Push → first build runs → make GHCR package public
6. Create Portainer stack with env vars
7. Add 5 Portainer secrets to client repo
8. Verify pipeline (push + watch Actions)
9. Create PAT → add as secret to main repo
10. Add client to CLIENT_REGISTRY secret (JSON)
11. Add PAT env var to notify-clients.yml
12. Test notification (dry run → real)
```

Done. Client receives automatic updates whenever the main CMS pushes a new version.
