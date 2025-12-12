# Dependency Doctor

Autonomous dependency-repair system that detects breaking upgrades, reasons with Oumi, edits code via Cline, validates in sandboxed containers, and opens PRs while updating a live dashboard.

## Structure
- `backend/` – orchestrator (Express), detection, sandboxing (Docker), Oumi reasoning, Cline patching, validation, PR automation, SQLite logging.
- `dashboard/` – Next.js (app router) dashboard for incidents/events.

## Quick start
1. Set env vars (examples):
   ```bash
   export WORKSPACE_ROOT=$(pwd)
   export PROJECT_TEST_CMD="npm test -- --runInBand"
   export OUMI_BASE_URL=http://localhost:8000/v1/chat/completions  # self-hosted Oumi
   export OUMI_API_KEY=                                           # leave empty for self-hosted
   export GITHUB_TOKEN=...
   export REPO_FULL_NAME=org/repo
   export REDIS_URL=redis://localhost:6379
   export API_TOKEN=devtoken123              # protects backend endpoints
   ```
2. Install deps:
   ```bash
   cd backend && npm install
   cd ../dashboard && npm install
   ```
3. Run backend: `npm run dev` (needs Docker + Redis).
4. Run dashboard: `npm run dev` (defaults to `http://localhost:3001`, set `NEXT_PUBLIC_BACKEND_ORIGIN` to backend).

## Dockerized local stack
1. Ensure Docker is running and the daemon socket is accessible.
2. `docker compose up --build` from repo root. Services:
   - `redis`: queue backend.
   - `backend`: runs orchestrator; mounts repo at `/workspace` and mounts `/var/run/docker.sock` to run sandboxes inside.
   - `dashboard`: Next.js app on port 3000.
3. Env overrides can be passed via shell env; see `docker-compose.yml` for defaults (e.g., `API_TOKEN`, `OUMI_API_KEY`, `GITHUB_TOKEN`, `REPO_FULL_NAME`, `NEXT_PUBLIC_BACKEND_ORIGIN`).
4. The backend still uses Docker-in-Docker style by sharing host socket; sandbox image defaults to `node:20-bookworm`, override with `SANDBOX_IMAGE` as needed.

## Deploying dashboard to Vercel
1. Set env vars in Vercel project:
   - `NEXT_PUBLIC_BACKEND_ORIGIN`: public URL of the backend.
   - `NEXT_PUBLIC_API_TOKEN`: must match backend `API_TOKEN` if set.
2. Deploy via Vercel dashboard or `vercel --prod`.

## Pipeline
1. Detection scans manifests, checks registries, and simulates upgrades in Docker.
2. Intelligence sends incident to Oumi for structured repair plan with RL reward context.
3. Surgery dispatches plan to Cline or applies patch locally.
4. Validation re-runs sandbox; rewards +1 on success.
5. Reporting opens PR, requests CodeRabbit, pushes events to dashboard.

## Notes
- Requires Docker available locally.
- SQLite file `dependency-doctor.db` persists incidents/rewards.
- Dashboard `/api/events` accepts backend push for live stream.

