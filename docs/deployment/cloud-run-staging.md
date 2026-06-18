# Cloud Run Staging Deploy

This runbook deploys the Movia backend staging service without exposing secret
values in terminal output or mobile builds.

## Service

- Project: `project-d1495bcf-fa0b-400c-bdb`
- Region: `southamerica-east1`
- Cloud Run service: `movia-backend-staging`
- Artifact Registry repository: `movia-backend`
- Image path:
  `southamerica-east1-docker.pkg.dev/project-d1495bcf-fa0b-400c-bdb/movia-backend/movia-backend-staging:<tag>`

## Required Secrets

The Cloud Run revision must read these from Secret Manager:

- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_GEOCODING_API_KEY`
- `METRICS_TOKEN`

Grant the Cloud Run runtime service account access with
`roles/secretmanager.secretAccessor`. Do not paste secret values into deploy
commands, chat, logs, or revision environment variables.

## Required Environment Variables

These non-secret values are set on deploy:

```text
NODE_ENV=staging
PRIVACY_REGION=CL
PRIVACY_RESPONSE_SLA_DAYS=30
ALLOWED_ORIGINS=http://localhost:8081
CORS_ORIGIN=http://localhost:8081
ADDRESS_SEARCH_ENABLED=true
ADDRESS_SEARCH_CACHE_TTL_SECONDS=604800
ADDRESS_SEARCH_MAX_RESULTS=5
```

## Deploy

From the repository root:

```bash
scripts/cloudrun/deploy-backend-staging.sh
```

The script:

1. verifies required secrets exist;
2. builds and pushes a `linux/amd64` Docker image;
3. deploys using the correct Artifact Registry repository;
4. attaches required Secret Manager references;
5. preserves required non-secret staging env vars;
6. smoke-tests `/health` and `/v1/search/address`.

## Smoke Tests

Expected:

```bash
curl -fsS "https://movia-backend-staging-509972004988.southamerica-east1.run.app/health"
curl -fsS "https://movia-backend-staging-509972004988.southamerica-east1.run.app/v1/search/address?q=Av.%20Providencia%201200"
curl -fsS "https://movia-backend-staging-509972004988.southamerica-east1.run.app/v1/search/address?q=Apoquindo%204501"
```

`/v1/search/address` must return HTTP 200 with `results` when
`ADDRESS_SEARCH_ENABLED=true` and the Google key is valid.

Do not use `ALLOWED_ORIGINS=*` or `CORS_ORIGIN=*` in staging. The backend
intentionally aborts startup when wildcard CORS is configured outside local
development.

## Security Follow-Up

If any secret value was exposed in terminal history, chat, screenshots, or logs:

1. rotate `GOOGLE_GEOCODING_API_KEY`;
2. rotate `JWT_SECRET`;
3. rotate `METRICS_TOKEN`;
4. rotate the database credential behind `DATABASE_URL`;
5. deploy a new revision after rotation.
