## Why

The app currently runs only via local `bun run` (or a locally-produced `app` binary). There is no way to build and serve it in a container, which blocks repeatable deployment. A Dockerfile that compiles the Bun project into a standalone binary and serves it in a minimal runtime image gives the project a single, reproducible deploy path.

## What Changes

- Add a `Dockerfile` with a multi-stage build:
  - Build stage uses `oven/bun:1`, installs with `--frozen-lockfile`, and compiles `src/index.tsx` into a standalone binary via `bun build --compile`.
  - Runtime stage is a minimal glibc-compatible image (distroless/static) that contains only the compiled binary and runs it.
- Add a `.dockerignore` so the build context stays small (excludes `node_modules`, `sqlite.db*`, `.env`, the locally-built `app` binary).
- Add a `docker-compose.yml` that:
  - Runs the compiled app in the container on port 3000.
  - Mounts a named volume for the SQLite database (`DATABASE_PATH`).
  - Provides `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` via environment (from `.env`).
  - Includes a migration step that applies `drizzle/*.sql` against the volume before the app starts, so a fresh container has the schema (and optionally a seeded demo user).
- No application behavior or routes change. Secrets and DB location continue to come from environment variables already read by the app.

## Capabilities

### New Capabilities

- `deployment/docker`: Containerized build and serve of the Bun app as a standalone binary, with environment-driven configuration and a persistent SQLite volume.

### Modified Capabilities

- None. Existing app behavior is unchanged.

## Impact

- **New files**: `Dockerfile`, `.dockerignore`, `docker-compose.yml`.
- **Dependencies**: Pulls `oven/bun:1` during image builds; runtime image has no runtime dependencies.
- **Systems**: Container image; named Docker volume for SQLite; host port 3000.
- **Config**: Requires `BETTER_AUTH_SECRET` (`BETTER_AUTH_URL` defaults to the container's own service) and `DATABASE_PATH` pointing at the volume.
- **Open question**: whether the compose migration step seeds the demo user or only applies schema migrations.