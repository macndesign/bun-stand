# Bun + Elysia + HTMX + better-auth

A server-rendered counter app with email/password auth, built with Bun, Elysia, htmx, better-auth, and Drizzle over SQLite (`bun:sqlite`).

## Local development

```sh
cp .env.example .env          # then set a real BETTER_AUTH_SECRET
bun install
bun run db:migrate            # or db:push
bun run db:seed               # optional demo user (demo@example.com / password123)
bun run dev                   # http://localhost:3000
```

Compile a standalone binary (embeds the Bun runtime):

```sh
bun run compile               # produces ./app
```

## Running with Docker

A multi-stage Dockerfile builds `src/index.tsx` into a standalone binary and serves it from a minimal non-root distroless image. Compose runs one-off migration + seed, then the app.

Prerequisites: Docker with the Compose v2 plugin, and a `.env` with `BETTER_AUTH_SECRET` (32+ random chars) and `BETTER_AUTH_URL`.

```sh
docker compose up --build     # builds image, migrates, seeds, serves on http://localhost:3000
```

If host port 3000 is busy, pick another:

```sh
APP_PORT=3100 docker compose up --build
```

### Development mode (live reload inside Docker)

An override file (`docker-compose.dev.yml`) swaps the compiled `app` for a `bun run --watch` dev server bound to your source, so edits reload the app in real time while it uses the **same database volume** as the compiled deployment.

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Notes:

- Host port and `BETTER_AUTH_URL` must agree. If port 3000 is taken, e.g. `APP_PORT=3100 BETTER_AUTH_URL=http://localhost:3100 docker compose -f docker-compose.yml -f docker-compose.dev.yml up`.
- The `docker-compose.dev.yml` override disables building the compiled image with `build: !reset null`; do not pass `--build` (it would rebuild the prod Dockerfile and re-tag it as `oven/bun:1`, which the `migrate` service relies on).
- Run dev **or** the compiled deploy, not both at once — they share one SQLite file.

Runtime configuration:

| Variable            | Default                       | Purpose                                  |
|---------------------|-------------------------------|------------------------------------------|
| `BETTER_AUTH_SECRET`| (from `.env`, no default)     | better-auth signing secret               |
| `BETTER_AUTH_URL`   | (from `.env`)                 | Public base URL of the app               |
| `DATABASE_PATH`     | `/data/app.db`                | SQLite file location (inside the volume) |
| `APP_PORT`          | `3000`                        | Host port published to `3000`            |

### Data and resets

- The SQLite database lives in the named volume `bun-stand_data`, mounted at `/data`. It survives `docker compose down` and `up`.
- On a fresh volume, the `migrate` service applies `drizzle/*.sql` and seeds the demo user once (guarded by a `.seeded` marker in the volume). Re-running `up` does not wipe data.
- To start over from scratch, delete the volume: `docker compose down -v` then `up` again — this re-migrates and re-seeds (`demo@example.com` / `password123`).

### Building the image directly

```sh
docker build -t bun-stand .
docker tag bun-stand bun-stand:latest
docker run --rm -p 3000:3000 \
  -v bun-stand-data:/data \
  -e DATABASE_PATH=/data/app.db \
  -e BETTER_AUTH_SECRET="<real-secret>" \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  bun-stand
```

Notes:

- The runtime image is glibc (distroless `cc` variant) — keep it in sync with the build image's libc.
- The server binds a hardcoded port 3000 inside the container.