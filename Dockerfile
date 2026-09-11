FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

COPY tsconfig.json ./
COPY src ./src

RUN mkdir -p /data && bun run compile

FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

COPY --from=build --chown=65532:65532 /data /data
COPY --from=build /app/app /app

ENV DATABASE_PATH=/data/app.db
EXPOSE 3000

CMD ["/app"]