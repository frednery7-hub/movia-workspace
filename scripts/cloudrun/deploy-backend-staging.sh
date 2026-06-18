#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-project-d1495bcf-fa0b-400c-bdb}"
REGION="${REGION:-southamerica-east1}"
SERVICE_NAME="${SERVICE_NAME:-movia-backend-staging}"
ARTIFACT_REPOSITORY="${ARTIFACT_REPOSITORY:-movia-backend}"
IMAGE_NAME="${IMAGE_NAME:-movia-backend-staging}"
TAG="${TAG:-$(git rev-parse --short HEAD)}"
PLATFORM="${PLATFORM:-linux/amd64}"
STAGING_ALLOWED_ORIGIN="${STAGING_ALLOWED_ORIGIN:-http://localhost:8081}"

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${ARTIFACT_REPOSITORY}/${IMAGE_NAME}:${TAG}"

REQUIRED_SECRETS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "GOOGLE_GEOCODING_API_KEY"
  "METRICS_TOKEN"
)

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_secret() {
  local secret_name="$1"
  if ! gcloud secrets describe "$secret_name" \
    --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Missing Secret Manager secret: ${secret_name}" >&2
    echo "Create it before deploy; do not pass secret values via env vars." >&2
    exit 1
  fi
}

require_command gcloud
require_command docker
require_command git

for secret_name in "${REQUIRED_SECRETS[@]}"; do
  require_secret "$secret_name"
done

echo "Building and pushing ${IMAGE_URI} for ${PLATFORM}"
docker buildx build \
  --platform "$PLATFORM" \
  --file apps/backend/Dockerfile \
  --tag "$IMAGE_URI" \
  --push \
  .

echo "Deploying ${SERVICE_NAME} to Cloud Run (${REGION})"
gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --platform managed \
  --image "$IMAGE_URI" \
  --allow-unauthenticated \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest,JWT_SECRET=JWT_SECRET:latest,GOOGLE_GEOCODING_API_KEY=GOOGLE_GEOCODING_API_KEY:latest,METRICS_TOKEN=METRICS_TOKEN:latest" \
  --set-env-vars "NODE_ENV=staging,PRIVACY_REGION=CL,PRIVACY_RESPONSE_SLA_DAYS=30,ALLOWED_ORIGINS=${STAGING_ALLOWED_ORIGIN},CORS_ORIGIN=${STAGING_ALLOWED_ORIGIN},ADDRESS_SEARCH_ENABLED=true,ADDRESS_SEARCH_CACHE_TTL_SECONDS=604800,ADDRESS_SEARCH_MAX_RESULTS=5"

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --format='value(status.url)')"

echo "Cloud Run service URL: ${SERVICE_URL}"
echo "Smoke testing /health"
curl --fail --silent --show-error "${SERVICE_URL}/health" >/dev/null

echo "Smoke testing /v1/search/address"
curl --fail --silent --show-error \
  "${SERVICE_URL}/v1/search/address?q=Av.%20Providencia%201200" >/dev/null

echo "Deploy complete: ${IMAGE_URI}"
