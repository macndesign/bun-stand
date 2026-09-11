## Context

The base `docker-compose.yml` (from the archived `add-dockerfile` change) has `app` (compiled binary on `cc-debian12`) and `migrate` (application of `drizzle/*.sql` + one-time seed + `chown`), sharing the named volume `data` at `/data`, `DATABASE_PATH=/data/app.db`. The `dev` script (`bun run dev` = `bun run --watch src/index.tsx`) restarts the server on change. `oven/bun:1` is already pulled for the migrate service. The server binds port 3000 in-container; host publish is `${APP_PORT:-3000}`.

## Goals / Non-Goals

**Goals:**
- A Docker dev workflow whose code edits hot-reload the server and whose database is the same volume the compiled app uses.
- Zero changes to the production `docker-compose.yml`, `Dockerfile`, or application code.

**Non-Goals:**
- Running dev and the compiled app at the same time.
- A separate `dev` service addition; dev is an override of the existing `app` service.
- Live reload without a process restart (`bun --hot`); the existing `--watch` restart path is used.

## Decisions

### 1. Compose override file, not a `dev` service or profiles

`docker-compose.dev.yml` replaces the `app` service definition for dev:

```yaml
services:
  app:
    build: !reset null     # STOP building the compiled image (!reset, plain null is ignored by compose merge)
    image: oven/bun:1      # full Bun runtime to run source + watch
    working_dir: /app
    volumes:
      - .:/app             # live source
      - /app/node_modules  # container-local deps (don't clobber host)
      - data:/data         # SAME volume as the compiled app
    command: sh -c "bun install --frozen-lockfile --ignore-scripts && bun run dev"
```

Run with `APP_PORT=3100 docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.

Why an override of the same service: sharing the DB is then *by construction* — ports, env, `depends_on: migrate`, and the `data` volume are inherited rather than duplicated. A separate `dev` service would invite running it concurrently with the compiled app and require duplicating env/volume wiring.

Note on removing `build`: Compose v5.5.1 ignores `build: null` in overrides (an empty pointer is treated as "unset", so the base build survives — and `docker compose up --build` would then rebuild the prod Dockerfile and re-tag it as `oven/bun:1`, clobbering the image `migrate` relies on). The `!reset` merge tag (`build: !reset null`) is required to actually clear the build section.

Alternatives considered:
- **Compose profiles (`--profile dev`)**: `up` with a profile starts un-profiled services too (the `app`), so running only dev is awkward and concurrent-running risk remains. Rejected.
- **Separate `dev` service with its own port**: solves nothing — still two writers to one SQLite file and breaks the shared-`BETTER_AUTH_URL` story. Rejected.
- **`bun --hot` (in-process reload)**: avoids restart churn but changes runtime semantics; the project's `dev` script already uses `--watch`. Rejected for now.

### 2. Dev shares the compose volume (`/data/app.db`)

`DATABASE_PATH` stays `/data/app.db` on the shared `data` volume. This matches the database of `docker compose up` (the compiled deployment), per the confirmed decision. The host repo `./sqlite.db` (used by bare `bun run dev`/`./app`) remains separate.

### 3. Dev container runs as root; migrate self-heals permissions

`oven/bun:1` defaults to root, which is required to `bun install` into the anonymous `/app/node_modules` volume. The dev container therefore writes SQLite as root. This is safe *only* because dev and app are not run concurrently: the `migrate` service re-runs `chown -R 65532:65532 /data` on every `up`, so returning to the compiled app resets ownership.

### 4. Port and `BETTER_AUTH_URL` must agree

Both runtimes bind 3000 in-container; host publish stays `${APP_PORT:-3000}` and is inherited. Because better-auth validates the request origin against `BETTER_AUTH_URL`, that value must reflect the active host port (e.g. `APP_PORT=3100` → `BETTER_AUTH_URL=http://localhost:3100`). This is documented, not enforced.

## Risks / Trade-offs

- [Dev and compiled app run concurrently → SQLite permission/lock contention] → Override pattern makes dev a replacement; document "run one or the other".
- [Bind mount exposes host `node_modules`, `sqlite.db*`, `.env` inside the container] → `node_modules` is shadowed by the anonymous volume; `DATABASE_PATH` points at `/data`, so stray repo DB files are inert; `.env` matches compose's own interpolation.
- [`bun --watch` may miss some editor/network-FS events in Docker Desktop] → If reloads misfire, fall back to `--watch` on a local run; noted as a caveat, not a blocker.
- [Anonymous `/app/node_modules` reinstalls on each `up`] → `bun install` is fast; acceptable for dev. A named `deps` volume could cache it if it becomes annoying.

## Migration Plan

1. Add `docker-compose.dev.yml`; verify with `docker compose -f docker-compose.yml -f docker-compose.dev.yml config` that the effective `app` service points at `oven/bun:1`, mounts source + `data`, and runs the dev command.
2. Wipe or reuse the `data` volume; run dev mode (`APP_PORT=3100` to avoid the local server on 3000), confirm `GET /login` is 200 and `bun run dev` writes `/data/app.db`.
3. Edit a template file and confirm the change appears on reload (log line re-printed).
4. Confirm shared DB: increment the counter in dev mode, stop, `docker compose up` (compiled), sign in, counter still present — then `down -v` to restore a clean state if desired.
5. Rollback: none needed — removing `docker-compose.dev.yml` restores the previous dev workflow.

## Open Questions

_None._