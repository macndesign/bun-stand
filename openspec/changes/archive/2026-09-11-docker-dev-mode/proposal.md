## Why

The project has a compiled, containerized deploy (`docker compose up`) and a local `bun run dev`, but no way to edit code and see it live inside Docker. Developers who want hot reload end up running outside Docker against the host `sqlite.db`, which diverges from the database the compiled app uses. A Docker dev mode gives real-time reloads against the same database as the compiled deployment.

## What Changes

- Add `docker-compose.dev.yml`, a compose override file that swaps the `app` service for a development runtime:
  - `oven/bun:1` image running `bun run dev` (`bun run --watch src/index.tsx`) so code changes restart the server live.
  - The repository source bind-mounted at `/app` for immediate edits.
  - The **same `data` named volume** mounted at `/data` with `DATABASE_PATH=/data/app.db`, so dev writes the same database as the compiled `docker compose up` app.
  - Same host port (`APP_PORT`), same env vars, same `migrate` dependency as the base `app` service.
- Update `README.md` with the dev-mode command and notes (port/`BETTER_AUTH_URL`, "run dev OR app, not both", volume reset).
- No changes to the `Dockerfile`, base `docker-compose.yml`, or application code.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `deployment/docker`: adds a requirement that a live-reloading Docker development mode exists and shares the same database volume as the compiled deployment. Existing requirements (containerized build, port 3000, env config, persistence, boot schema, non-root runtime) are unchanged.

## Impact

- **New file**: `docker-compose.dev.yml`.
- **Modified file**: `README.md` (documentation only).
- **Dependencies**: uses the already-present `oven/bun:1` image; no new packages.
- **Systems**: local Docker dev environment; shares the `bun-stand_data` volume. Host port and `BETTER_AUTH_URL` must match (defaults to `${APP_PORT:-3000}`).
- **Constraints**: dev container runs as root (like the `migrate` service); `migrate` re-applies a `chown` on every `up`, so switching between dev and compiled modes self-heals as long as they are not run concurrently.