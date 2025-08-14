# Subscriber Micro-Frontend — Operational README

> An autonomous, minimal micro-frontend that lets users add names to a **subscriber** database. Clean lines. Clear contracts. Built to run locally, in Codespaces, or under CI with Flyway-driven migrations.

---

## Table of Contents

* [Architecture & Components](#architecture--components)
* [Prerequisites](#prerequisites)
* [Quick Start (Local)](#quick-start-local)
* [Infrastructure Automation (Ansible)](#infrastructure-automation-ansible)
* [Database Operations (MySQL)](#database-operations-mysql)
* [Schema Migrations (Flyway)](#schema-migrations-flyway)
* [CI with GitHub Actions](#ci-with-github-actions)
* [Running Actions Locally with `act`](#running-actions-locally-with-act)
* [Local UI & API Development](#local-ui--api-development)
* [Configuration & Environment Variables](#configuration--environment-variables)
* [Repository Layout](#repository-layout)
* [Troubleshooting](#troubleshooting)
* [Security & Secrets](#security--secrets)
* [Clean Up](#clean-up)
* [License](#license)

---

## Architecture & Components

* **Micro-frontend (JS/HTML)**: a small, self-contained UI surface that collects subscriber names.
* **FastAPI service**: thin HTTP layer to orchestrate DB calls.
* **MySQL**: canonical data store for subscribers.
* **Flyway**: database version control; migrations are idempotent and repeatable.
* **Ansible**: reproducible environment setup and teardown.
* **GitHub Actions**: CI job to provision DB (if necessary) and run migrations.

> Design principle: **small, autonomous, testable** units. No heroics—just reliable plumbing.

---

## Prerequisites

* **Python 3.10+** (FastAPI runner)
* **Node 18+** (build/watch workflow)
* **Ansible 2.14+** (for infra playbooks)
* **Docker** (for Flyway container & optional `act`)
* **MySQL client** (`mysql` CLI)
* Optional: **`act`** to execute GitHub Actions locally

---

## Quick Start (Local)

```bash
# From repository root
ansible-playbook up.yml          # Provision local MySQL and any required services

# Connect to DB locally (password prompt will appear)
mysql -u root -h 127.0.0.1 -p
```

---

## Infrastructure Automation (Ansible)

**Bring up** the local environment:

```bash
ansible-playbook up.yml
```

**Tear down** all locally created resources:

```bash
ansible-playbook down.yml
```

> *Tip:* Keep `hosts` and `group_vars/` checked in for deterministic runs.

---

## Database Operations (MySQL)

Interactive shell:

```bash
mysql -u root -h 127.0.0.1 -p
```

Default database/user/password can be overridden via env vars (see below).

---

## Schema Migrations (Flyway)

We vendor a minimal Flyway flow using the official container. Replace `<repo name>` with your local folder name.

```bash
docker run --rm \
  -v "/workspaces/<repo name>/migrations:/flyway/sql" \
  redgate/flyway \
  -user=root \
  -password=Secret5555 \
  -url=jdbc:mysql://172.17.0.1:3306/flyway_test \
  migrate
```

**Notes**

* `172.17.0.1` is the Docker host’s default bridge address on Linux.

  * On macOS/Windows Docker Desktop, use `host.docker.internal`.
* Ensure the target database exists; our CI job creates it if missing.

---

## CI with GitHub Actions

A slim workflow that installs the MySQL client, ensures connectivity, and applies SQL changes. It uses **secrets with sensible local defaults**.

```yaml
name: db-migrate

on:
  workflow_dispatch:
  push:
    paths:
      - "migrations/**"
      - ".github/workflows/db-migrate.yml"

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install MySQL client
        run: |
          sudo apt-get update
          sudo apt-get install -y mysql-client

      - name: Deploy to Database
        env:
          DB_HOST: ${{ secrets.DB_HOST || '127.0.0.1' }}
          DB_USER: ${{ secrets.DB_ADMIN_USER || 'root' }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD  || 'Secret5555' }}
          DB_NAME: ${{ secrets.DB_NAME || 'mysql' }}
        run: |
          # Apply an example SQL file. Replace with your Flyway invocation or SQL bundle.
          mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < schema_changes.sql
```

> Production guidance: prefer Flyway CLI/Container in CI for **repeatable migrations** and drift detection. The SQL direct apply shown above is the simplest baseline.

---

## Running Actions Locally with `act`

Run GitHub Actions in a local container (resource-friendly defaults):

```bash
# In a container runtime
bin/act

# Use host network/namespace to conserve resources
bin/act -P ubuntu-latest=-self-hosted

# In Codespaces (Docker-in-Docker available)
# (No extra flags typically required)
```

> If your workflow needs DB access, confirm the container can reach your host DB (e.g., `host.docker.internal` on macOS/Windows, `172.17.0.1` on Linux).

---

## Local UI & API Development

Two terminals for a smooth feedback loop:

**Terminal A — JS build**

```bash
npm install
npm run watch
```

**Terminal B — API**

```bash
python app.py
```

Open `index.html` to exercise the micro-frontend and post to the FastAPI endpoints.

---

## Configuration & Environment Variables

| Variable        | Purpose              | Default      | Scope      |
| --------------- | -------------------- | ------------ | ---------- |
| `DB_HOST`       | MySQL host           | `127.0.0.1`  | Local & CI |
| `DB_ADMIN_USER` | MySQL admin user     | `root`       | Local & CI |
| `DB_PASSWORD`   | MySQL admin password | `Secret5555` | Local & CI |
| `DB_NAME`       | Target database name | `mysql`      | Local & CI |

**Priority order:** GitHub **Secrets** (CI) → shell **env** → **defaults** above.

---

## Repository Layout

```
.
├─ migrations/                 # Flyway SQL migrations (V*, R*, U*, etc.)
├─ app.py                      # FastAPI application
├─ index.html                  # Micro-frontend harness
├─ package.json                # JS toolchain (watch/build)
├─ schema_changes.sql          # Example SQL applied by CI
├─ up.yml / down.yml           # Ansible: provision/teardown
├─ hosts                       # Ansible inventory (local, dev, etc.)
├─ bin/
│  └─ act                      # Convenience wrapper for 'act'
└─ k8sInfra/ (optional)        # Helm/K8s artifacts if/when deployed
```

---

## Troubleshooting

* **Port already in use**
  Stop stray services: `sudo lsof -i :3306` (Linux/macOS) or use Resource Monitor (Windows).
* **`mysql: command not found`**
  Install client: Ubuntu `sudo apt-get install -y mysql-client`, macOS `brew install mysql-client`, Windows use MySQL Shell or WSL.
* **Flyway cannot connect**
  Verify host mapping (`172.17.0.1` vs `host.docker.internal`) and that the DB exists.
* **`act` cannot reach DB**
  Run with host networking or export `DB_HOST` appropriately.
* **Migrations fail**
  Ensure ordering (e.g., `V1__init.sql`, `V2__add_table.sql`) and no out-of-band changes.

---

## Security & Secrets

* Never commit credentials. Use **GitHub Secrets** for CI.
* Prefer per-environment users with least privilege.
* Rotate `DB_PASSWORD` per environment. For local demos, defaults are acceptable, not for prod.
* If you need files >100 MB, use **Git LFS**. Avoid committing binaries to the repo.

---

## Clean Up

```bash
ansible-playbook down.yml
```

Optionally remove Docker volumes/containers created during local testing.

---

## License

Choose a license appropriate to your organization or coursework (e.g., MIT/Apache-2.0). Add `LICENSE` at the repo root.

---

### Final word

Pragmatic scaffolding today; scalable patterns tomorrow. This micro-frontend stays small, speaks plainly to MySQL, and lets Flyway keep time—so your subscribers, and your future self, can trust the state of play.
