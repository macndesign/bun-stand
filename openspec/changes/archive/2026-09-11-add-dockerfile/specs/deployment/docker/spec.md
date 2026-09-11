## Purpose

Containerized build and serve of the Bun app as a standalone binary, with environment-driven configuration and a persistent SQLite database.

## ADDED Requirements

### Requirement: Containerized build produces a runnable image

The project SHALL provide a Dockerfile that builds the app into a standalone executable and packages it into a runnable container image. A container produced from that image MUST be able to start the app without a source checkout, node_modules, or a separate runtime installed in the image.

#### Scenario: Image builds successfully

- **WHEN** an image is built from `docker build` using the repository's Dockerfile
- **THEN** the build completes successfully and produces an image containing the compiled app

#### Scenario: Fresh container serves the app

- **WHEN** a container is started from the built image with required environment variables set
- **THEN** the app starts from the standalone binary and begins listening for HTTP requests

### Requirement: HTTP service on port 3000

The served app SHALL listen for HTTP requests on port 3000 inside the container.

#### Scenario: Compose exposes the port

- **WHEN** the container is started via the provided compose file
- **THEN** the HTTP server is reachable on host port 3000
- **AND** a request to `/login` returns a 200 response with the login page HTML

### Requirement: Environment-driven configuration

The container SHALL derive its runtime configuration exclusively from environment variables, including `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `DATABASE_PATH`.

#### Scenario: Better-auth is configured by environment

- **WHEN** a container is started with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` set
- **THEN** authentication uses those values and a registration and sign-in flow works against the served app

#### Scenario: Database location follows DATABASE_PATH

- **WHEN** a container is started with `DATABASE_PATH` pointing at a writable location
- **THEN** the app opens and uses the SQLite database at that path

### Requirement: SQLite database persists across restarts

The app's SQLite database SHALL be stored in a location that survives container recreation, so application data is not lost.

#### Scenario: Data survives container restart

- **WHEN** a user creates a counter value and the container is stopped and recreated with the same database volume
- **THEN** the counter value is still present and reported by the app

### Requirement: Fresh deployment boots with a schema

A newly-created database volume SHALL be initialized with the application schema and a usable demo account before the app serves traffic, so a first-time deployment is immediately functional.

#### Scenario: First boot has working tables and demo user

- **WHEN** the database volume is empty and the deployment is brought up with the provided compose file
- **THEN** the schema tables are created
- **AND** the demo user `demo@example.com` can sign in with its documented password

### Requirement: Container runs as a non-root user

The produced container image SHALL run the app as a non-root user.

#### Scenario: Process user is not root

- **WHEN** the image is inspected and the container's application process is executed
- **THEN** the process runs as a non-root user

## REMOVED Requirements

_None._