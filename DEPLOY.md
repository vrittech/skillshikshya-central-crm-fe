# Deploy

`.github/workflows/deploy.yml` runs on every push to `main` (and from **Actions > CI/CD > Run workflow**):

1. **check**: lint, type-check and build. Pull requests to `main` run only this.
2. **build**: builds the image and pushes it to GitHub Container Registry as `ghcr.io/vrittech/skillshikshya-crm-frontend:latest` and `:<commit>`.
3. **deploy**: copies `docker-compose.prod.yml` and a `.env` to the server over SSH, pulls that commit's image and restarts it.

The image is nginx serving the built app and proxying `/api` to the backend at `http://backend:8188`, over the Docker network `skillshikshya` that the backend stack joins. **Deploy the backend first**, on the same server.

The site listens on port `8080` (`FRONTEND_PORT`). Point the domain's reverse proxy (with HTTPS) at it, or set `FRONTEND_PORT` to `80`.

## Secrets

Settings > Secrets and variables > Actions > Repository secrets. They start as `CHANGE_ME`; a secret left as `CHANGE_ME` counts as not set.

| Secret | Required | What |
|---|---|---|
| `SSH_HOST` | yes | Server IP or host name (the backend's server) |
| `SSH_USER` | yes | SSH user, allowed to run `docker` |
| `SSH_PRIVATE_KEY` | yes | Private key whose public key is in the server's `~/.ssh/authorized_keys` |
| `SSH_PORT` | | Default `22` |
| `DEPLOY_PATH` | | Folder on the server. Default `~/skillshikshya-crm-frontend` |
| `FRONTEND_PORT` | | Port the site listens on. Default `8080` |

Change a value with **Update**, then rerun the workflow (**Actions > CI/CD > the run > Re-run all jobs**, or **Run workflow**).
