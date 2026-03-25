# OVB Migration Brief — Standardise Deployment to Portainer API

## Context

This project uses a white-label CMS system. Every client instance is a fork of
`white-label-cms`. All client deployments must follow ONE standard pipeline.

**The standard is defined in:** `deploy/CLIENT-DEPLOYMENT.md` in this repo.

---

## The Problem with OVB Currently

OVB (`ovbreadymix-cms`) uses a non-standard SSH-based deploy that:
- SSHes into the VPS directly from GitHub Actions
- Runs a custom Python redeploy script
- Uses `VPS_HOST`, `VPS_SSH_KEY`, `VPS_USER` secrets
- Has the **wrong Docker image** in `deploy/app/docker-compose.yml`
  — it pulls `ghcr.io/gavinholder/white-label-cms:latest` instead of
    `ghcr.io/gavinholder/ovbreadymix-cms:latest`

---

## What Needs to Change

### 1. Fix `deploy/app/docker-compose.yml`

Change line 28:
```yaml
# WRONG (currently):
image: ghcr.io/gavinholder/white-label-cms:latest

# CORRECT:
image: ghcr.io/gavinholder/ovbreadymix-cms:latest
```

### 2. Replace `.github/workflows/deploy.yml` deploy job

Remove the entire `deploy` job (Job 3 — SSH deploy) and replace with:

```yaml
  # ── Job 3: Trigger Portainer stack redeploy ──────────────────────────────────
  deploy:
    name: Deploy via Portainer
    runs-on: ubuntu-latest
    needs: build
    if: always() && needs.build.result == 'success'

    steps:
      - name: Redeploy stack via Portainer API
        run: |
          if [ -z "${{ secrets.PORTAINER_URL }}" ] || [ -z "${{ secrets.PORTAINER_PASSWORD }}" ]; then
            echo "PORTAINER_URL or PORTAINER_PASSWORD secret not set — skipping redeploy"
            exit 0
          fi

          JWT=$(curl -s -X POST "${{ secrets.PORTAINER_URL }}/api/auth" \
            -H "Content-Type: application/json" \
            -d '{"username":"admin","password":"${{ secrets.PORTAINER_PASSWORD }}"}' \
            | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
            "${{ secrets.PORTAINER_URL }}/api/stacks/${{ secrets.PORTAINER_STACK_ID }}/git/redeploy?endpointId=${{ secrets.PORTAINER_ENDPOINT_ID }}" \
            -H "Authorization: Bearer $JWT" \
            -H "Content-Type: application/json" \
            -d '{"pullImage":true,"prune":false,"RepositoryReferenceName":"refs/heads/main"}')

          echo "Portainer redeploy response: $RESPONSE"
          if [ "$RESPONSE" != "200" ]; then
            echo "Redeploy failed with HTTP $RESPONSE"
            exit 1
          fi
          echo "Stack redeploy triggered successfully"
```

Also update the header comment at the top of deploy.yml:
```yaml
# Secrets required:
#   PORTAINER_URL         — e.g. https://portainer.ovbreadymix.co.za (or http://IP:9000)
#   PORTAINER_PASSWORD    — Portainer admin password
#   PORTAINER_STACK_ID    — Stack ID from Portainer URL (id=X)
#   PORTAINER_ENDPOINT_ID — Endpoint ID from Portainer URL (first number in path)
#   UPSTREAM_REPO_URL     — (optional) defaults to white-label-cms
```

### 3. Add GitHub Secrets to `ovbreadymix-cms` repo

Go to: `https://github.com/GavinHolder/ovbreadymix-cms/settings/secrets/actions`

Add these 4 secrets (delete `VPS_HOST`, `VPS_SSH_KEY`, `VPS_USER` once confirmed working):

| Secret | Value |
|---|---|
| `PORTAINER_URL` | Portainer URL for OVB's VPS (e.g. `http://154.66.197.168:9000`) |
| `PORTAINER_PASSWORD` | Portainer admin password for OVB's VPS |
| `PORTAINER_STACK_ID` | From Portainer URL when viewing the stack (`id=X`) |
| `PORTAINER_ENDPOINT_ID` | From Portainer URL (`/#!/X/docker/stacks/...`) |

### 4. Ensure OVB Portainer Stack Uses Repository Method

The Portainer stack for `ovbreadymix-cms` must be set up as a **Repository** stack
(not manual compose), pointing to the GitHub repo, so the API redeploy can do a
`git pull` + `docker compose up` in one call.

If it's currently a manual stack, recreate it as Repository:
- Repository URL: `https://github.com/GavinHolder/ovbreadymix-cms.git`
- Branch: `refs/heads/main`
- Compose path: `deploy/app/docker-compose.yml`

---

## Why This Standard

- **Portainer CE webhook** does NOT support image re-pull (Business Edition only)
- **Portainer API** (`PUT /api/stacks/{id}/git/redeploy`) works in CE and is confirmed working
- SSH deploy is fragile — SSH keys expire, VPS IPs change, Python scripts break
- One standard = every client instance behaves identically = no debugging surprises

---

## Reference

Full deployment standard: `deploy/CLIENT-DEPLOYMENT.md` in `white-label-cms` repo.
Sonic CMS (`sonic-cms`) is already on this standard and working.
