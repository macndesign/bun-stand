## Context

The app is a Bun + Elysia + better-auth server rendered through `.tsx` templates, talking to a local SQLite DB via `bun:sqlite` and Drizzle (see `src/db/index.ts`). It is explicitly designed to bundle cleanly: `bun build src/index.tsx --compile --outfile app` already produces a ~64MB standalone binary that embeds the Bun runtime. There are no static assets in the repo (htmx and Pico.css load from CDNs), so the compiled binary is the entire artifact. `DATABASE_PATH`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` are already read from the environment. The server binds port `3000` hardcoded in `src/index.tsx:190`.

## Goals / Non-Goals

**Goals:**
- A multi-stage Dockerfile that compiles `src/index.tsx` into a standalone binary and serves it from a minimal runtime image.
- A `.dockerignore` to keep the build context to source + lockfile only.
- A `docker-compose.yml` that runs the container with a persistent SQLite volume, environment-driven secrets, and a migration step so a fresh container has a working schema.
- Architecture support for `linux/amd64` and `linux/arm64` via standard image manifests.

**Non-Goals:**
- Changing application code, routes, or behavior.
- Boot-time migrations baked into the app (kept external in compose).
- Hardcoded defaults for secrets; all runtime config stays environment-driven.

## Decisions

### 1. Multi-stage build with a standalone binary

```
build:   oven/bun:1               # Debian/glibc
         COPY package.json bun.lock
         RUN bun install --frozen-lockfile --ignore-scripts
         COPY src ./src
         RUN bun build src/index.tsx --compile --outfile app --target bun

runtime: gcr.io/distroless/cc-debian12:nonroot   # glibc (NOT the "static" variant)
         COPY --from=build --chown=65532:65532 /data /data
         COPY --from=build /app/app /app
         ENV DATABASE_PATH=/data/app.db
         EXPOSE 3000
         CMD ["/app"]
```

Rationale: the compile path already exists and is the project's intended artifact. The runtime stage then holds only the binary, removing node_modules and a second Bun runtime from the deployed image. `--frozen-lockfile` pins to the committed `bun.lock`. The final stage runs as non-root (distroless `nonroot` = UID 65532), and `/data` is pre-created in the image with that ownership so a fresh named volume is writable.

Implementation corrections to the earlier sketch:
- **`distroless/static` does not contain glibc.** The compiled binary links glibc dynamically, so the runtime must be the `cc` variant (`cc-debian12`); the `static` variant produces `exec /app: no such file or directory` (missing ELF interpreter). Verified empirically.
- **`bun install --ignore-scripts`.** `better-sqlite3@13.0.3` publishes no prebuilt for `linux-arm64`, so its postinstall runs node-gyp and fails without Python/make/g++. The app never imports it, so skipping scripts is safe (no other package in the tree has an install script). Verified by grep.

Alternatives considered:
- **Source-run image** (`oven/bun:1` + `COPY src` + `bun run src/index.tsx`): simpler entrypoint but larger image and keeps node_modules in prod. Rejected because the compile path is available and preferable.
- **Single-stage**: rejected; would carry build tools and node_modules into the runtime image.
- **Building `better-sqlite3` in the build stage** (install python3/make/g++): keeps scripts but wastes build time on an unused package. Rejected.
- **Overriding `better-sqlite3` to a version with prebuilds**: mangles the dependency tree for an unused package. Rejected.

### 2. Build on glibc, run on glibc (cc variant, not static)

The compiled binary dynamically links the libc of the *build* machine. Building on `oven/bun:1` (Debian/glibc) means the runtime stage must also be glibc — and critically, this means the **`cc`** distroless variant, not the `static` variant. The `static` flavor contains no glibc (`/lib/ld-linux-aarch64.so.1` absent) and is only for binaries that are fully statically linked. Building on the Alpine image would produce a musl binary, which must run on a musl base. Mixing either pair fails at load time with a loader error.

### 3. Migrations use `db:migrate:runtime` (bun-sqlite migrator) in compose

The app performs no migrations on boot. Rather than run `drizzle-kit migrate` in a separate container (which would require `better-sqlite3` native tools), compose uses a **one-off `oven/bun:1` container** with the same volume that:

1. Installs deps with `--ignore-scripts` (no native toolchain needed).
2. Runs `bun run db:migrate:runtime` — a new script (`src/db/migrate.ts`) that calls `drizzle-orm`'s bun-sqlite `migrate()` directly against `DATABASE_PATH`, applying `drizzle/*.sql` without touching `better-sqlite3`.
3. Seeds the demo user (`demo@example.com` / `password123`) **once**, guarded by a `/data/.seeded` sentinel file.
4. `chown -R 65532:65532 /data` so the non-root app can write to the database.

This keeps the app runtime image minimal and avoids requiring Python/make/g++ anywhere in the deploy path.

Why `db:migrate:runtime` instead of `drizzle-kit migrate`:
`drizzle-kit@0.28.1` depends on `better-sqlite3`, which publishes no prebuilt for `linux-arm64`. On the `oven/bun:1` image, `bun install` falls back to `node-gyp` and fails without Python/make/g++. The bun-sqlite `migrate()` function from `drizzle-orm` applies the same SQL files and writes to the same migration table — no native module involved.

Why seed only once:
The commit's `db:seed` deletes and recreates `demo@example.com` (cascade deletes the counter row). If it ran on every `docker compose up`, it would wipe user data. The sentinel `/data/.seeded` ensures the seed is applied exactly once per named volume. Deleting the volume (`docker compose down -v`) removes the sentinel and triggers a full re-seed on next `up`.

Alternatives considered:
- **In-app migrations at boot** (`migrate()` called in `src/index.tsx` at startup): cleanest long-term but a larger code change; deferred.
- **Baking a pre-seeded DB into the image**: fragile — container FS state conflicts with volume-mounted state.
- **Zero migrate step**: would leave a fresh container with empty tables and 500s.
- **`oven/bun:1` with `apt-get install python3 make g++`**: works but installs a C++ toolchain on every `up`, adding minutes of build time and a new network-bound dependency.

### 4. Configurable `APP_PORT` and volume permissions

- **`APP_PORT`** defaults to `3000` but is configurable via environment (`APP_PORT=3100 docker compose up`). This avoids host port collisions when another service is running on 3000 during development. The server still binds 3000 inside the container (`EXPOSE 3000`).
- **Volume ownership**: the `migrate` service runs as root. Without intervention it creates `app.db` owned `root:root`, which the non-root app (UID 65532) cannot write to. The migrate command ends with `chown -R 65532:65532 /data`, fixing this on every run.

### 5. `.dockerignore` keeps the context small

Excludes `node_modules`, `sqlite.db*`, `.env`, `.DS_Store`, the 64MB local `app` binary, and `.git`. Prevents context bloat and leaking secrets into the image.

## Risks / Trade-offs

- [Compiled binary links build-time libc] → Pin the build image to a glibc `oven/bun:1` tag and the runtime to a glibc distroless image; document that Alpine builds must stay on Alpine.
- [Bun standalone binaries self-extract on first run] → Ensure the non-root runtime has a writable temp dir (distroless provides `/tmp`); verify with a container smoke test in tasks.
- [Concurrent SQLite writers if migrate and app overlap] → compose runs migrate/seed to completion before starting the app container.
- [Fresh container with no volume seed] → compose migration step is the source of truth; document that wiping the volume means re-running `up` recreates it.
- [AI-generated migration container adds sostance per run] → volume persists schema across `up`/`down`; migration is idempotent Drizzle SQL.

## Migration Plan

1. `docker compose up --build` builds the image, creates the named volume, runs migrate + seed against it, then starts the app container.
2. Rolling back: `docker compose down` retains the volume; reverting to a prior image is `docker compose up` against the same volume. Deleting the volume (with seed) resets the demo.
3. No application code changes, so rollback risk is low.

## Open Questions

_Resolved during implementation:_
- **Seed frequency**: seeding on every `up` would wipe user data (cascade delete in `db:seed`). Resolved with a `/data/.seeded` sentinel — the demo user is created exactly once per volume; `docker compose down -v` deletes the sentinel and allows re-seeding.
- **Native tools in migrate**: `drizzle-kit migrate` needs `better-sqlite3` native, which can't compile on a stock `oven/bun:1` image (no Python/make/g++). Resolved by adding `src/db/migrate.ts` using `drizzle-orm`'s bun-sqlite `migrate()` function instead — no native module required.
- **`distroless/static` vs `cc`**: the `static` variant ships no glibc, causing `exec /app: no such file or directory`. Resolved by using `gcr.io/distroless/cc-debian12:nonroot`.