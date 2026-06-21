#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT_DIR="$HOME/Desktop/movia-security-reports"

cd "$ROOT"

mkdir -p "$REPORT_DIR"

TXT_REPORT="$REPORT_DIR/semgrep-backend-report.txt"
JSON_REPORT="$REPORT_DIR/semgrep-backend-report.json"

echo "============================================================"
echo "Movia — Semgrep Backend SAST"
echo "============================================================"
echo "Workspace: $ROOT"
echo "TXT report:  $TXT_REPORT"
echo "JSON report: $JSON_REPORT"
echo ""

echo "============================================================"
echo "1. Semgrep human-readable report"
echo "============================================================"

semgrep scan \
  --config p/owasp-top-ten \
  --config p/javascript \
  --config p/typescript \
  --config p/secrets \
  --exclude node_modules \
  --exclude dist \
  --exclude build \
  --exclude coverage \
  --exclude apps/mobile/android \
  --exclude apps/mobile/ios \
  apps/backend packages \
  2>&1 | tee "$TXT_REPORT"

echo ""
echo "============================================================"
echo "2. Semgrep JSON report"
echo "============================================================"

semgrep scan \
  --config p/owasp-top-ten \
  --config p/javascript \
  --config p/typescript \
  --config p/secrets \
  --exclude node_modules \
  --exclude dist \
  --exclude build \
  --exclude coverage \
  --exclude apps/mobile/android \
  --exclude apps/mobile/ios \
  --json \
  --output "$JSON_REPORT" \
  apps/backend packages

echo ""
echo "============================================================"
echo "3. Report files"
echo "============================================================"
ls -lh "$REPORT_DIR"/semgrep-backend-report.*

echo ""
echo "============================================================"
echo "Semgrep SAST finished"
echo "============================================================"
