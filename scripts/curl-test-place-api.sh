#!/usr/bin/env bash
# Test GET /api/place-by-google-id with curl.
# Usage: ./scripts/curl-test-place-api.sh [BASE_URL] [PLACE_ID]
# Example: ./scripts/curl-test-place-api.sh http://localhost:8000 ChIJj61dQgK6j4AR4GeTYWZsKWw

BASE_URL="${1:-http://localhost:8000}"
PLACE_ID="${2:-ChIJj61dQgK6j4AR4GeTYWZsKWw}"

echo "=== Health ==="
curl -s "${BASE_URL}/api/health" | head -c 500
echo -e "\n"

echo "=== Place by Google ID (${PLACE_ID}) ==="
curl -s -w "\n\nHTTP %{http_code}" "${BASE_URL}/api/place-by-google-id/${PLACE_ID}"
echo ""
