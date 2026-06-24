# CI/CD

`deploy.yml` runs on every push to `main`:

1. **type-check** — installs deps, builds the `@challengers-bet/shared` package, then runs `tsc --noEmit` against `backend`. Fails fast before touching the server.
2. **deploy** — SSHes into the VPS, pulls `main`, reinstalls, runs `pnpm build` (topological — shared → backend → frontend), then `pm2 reload`s both services.

## One-time setup

### 1. GitHub repository secrets

`Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Value |
|---|---|
| `VPS_HOST` | The VPS IP or hostname (e.g. `xpunt24.com`) |
| `VPS_USER` | The Linux user that owns the deploy path and runs pm2 |
| `VPS_SSH_KEY` | The **private key** of an SSH keypair whose **public** half is in the VPS user's `~/.ssh/authorized_keys`. Use a dedicated deploy key, not your personal key. Key must have no passphrase. |
| `VPS_PORT` | Optional. SSH port if not 22. |
| `VPS_DEPLOY_PATH` | The clone path on the VPS — for this project: `/home/payram-xpunt24` |

Generate the keypair on your laptop:

```bash
ssh-keygen -t ed25519 -C "xpunt24-deploy" -f xpunt24-deploy-key
# Add xpunt24-deploy-key.pub to the VPS user's ~/.ssh/authorized_keys
# Paste the contents of xpunt24-deploy-key into the VPS_SSH_KEY secret
```

### 2. VPS bootstrap

The workflow assumes the VPS already has:

- Node 20, pnpm 9, pm2 installed
- The repo cloned at `/home/payram-xpunt24` and configured to pull from GitHub (deploy key or PAT)
- `backend/.env` and `frontend/.env.production` already populated (never committed)
- nginx fronting `api.xpunt24.com` → `localhost:4000` and `xpunt24.com` → `localhost:3003`
- pm2 processes already started and named **`xpunt24-backend`** and **`xpunt24-frontend`**:
  ```bash
  cd /home/payram-xpunt24
  pm2 start --name xpunt24-backend "pnpm --filter backend start"
  pm2 start --name xpunt24-frontend "pnpm --filter frontend start"
  pm2 save
  pm2 startup    # follow the printed command
  ```

The workflow assumes those exact pm2 process names — `pm2 reload xpunt24-backend` / `pm2 reload xpunt24-frontend`. If you renamed them, update `.github/workflows/deploy.yml` to match.

After that, every `git push` to `main` triggers an auto-deploy.

## Manual trigger

`Actions → Deploy → Run workflow` — runs the same job without a push. Useful for rolling back: revert the commit on `main` and push.

## What this workflow does not do

- No tests — the project has none yet. Add a `test` job above `deploy` once you do.
- No frontend type-check in CI — there are pre-existing `react-hook-form` import errors in `dashboard/page.tsx` and `ui/form.tsx`. Fix those (`pnpm --filter frontend add react-hook-form`) and add a `pnpm --filter frontend exec tsc --noEmit` step to the `type-check` job.
- No staging environment. Add a second workflow on a `staging` branch with different VPS secrets if you want one.
- No build artifact transfer — builds happen on the VPS. For larger projects build in CI and `rsync` the `dist/` and `.next/` directories.
- No DB migrations — Mongoose is schema-less so this is fine for now. If you ever add a migration tool (`migrate-mongo`), add `pnpm migrate up` between `pnpm build` and `pm2 reload`.
