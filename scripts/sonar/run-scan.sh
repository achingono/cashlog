#!/usr/bin/env bash
set -euo pipefail

SONAR_HOST_URL="${SONAR_HOST_URL:-http://localhost:9000}"
SONAR_PROJECT_KEY="${SONAR_PROJECT_KEY:-achingono_money}"
SONAR_PROJECT_NAME="${SONAR_PROJECT_NAME:-money}"
SONAR_ADMIN_USER="${SONAR_ADMIN_USER:-admin}"
SONAR_ADMIN_PASSWORD="${SONAR_ADMIN_PASSWORD:-admin}"
SONAR_NEW_ADMIN_PASSWORD="${SONAR_NEW_ADMIN_PASSWORD:-}"
OUT_DIR="${SONAR_OUT_DIR:-.sonar}"
ISSUES_FILE="${OUT_DIR}/issues.json"

mkdir -p "${OUT_DIR}"

echo "Waiting for SonarQube at ${SONAR_HOST_URL}..."
for _ in $(seq 1 90); do
  status="$(curl -sf "${SONAR_HOST_URL}/api/system/status" | jq -r '.status' || true)"
  if [[ "${status}" == "UP" ]]; then
    break
  fi
  sleep 2
done

if [[ "${status:-}" != "UP" ]]; then
  echo "SonarQube did not become healthy in time." >&2
  exit 1
fi

if [[ -z "${SONAR_NEW_ADMIN_PASSWORD}" ]]; then
  SONAR_NEW_ADMIN_PASSWORD="$(openssl rand -base64 20)"
fi

if [[ "${SONAR_ADMIN_PASSWORD}" == "admin" ]]; then
  curl -sf -X POST "${SONAR_HOST_URL}/api/users/change_password" \
    -u "admin:admin" \
    --data-urlencode "login=admin" \
    --data-urlencode "password=${SONAR_NEW_ADMIN_PASSWORD}" \
    --data-urlencode "previousPassword=admin" >/dev/null
  SONAR_ADMIN_PASSWORD="${SONAR_NEW_ADMIN_PASSWORD}"
fi

curl -sf -X POST "${SONAR_HOST_URL}/api/projects/create" \
  -u "${SONAR_ADMIN_USER}:${SONAR_ADMIN_PASSWORD}" \
  --data-urlencode "name=${SONAR_PROJECT_NAME}" \
  --data-urlencode "project=${SONAR_PROJECT_KEY}" \
  --data-urlencode "visibility=private" >/dev/null || true

SONAR_TOKEN="$(curl -sf -X POST "${SONAR_HOST_URL}/api/user_tokens/generate" \
  -u "${SONAR_ADMIN_USER}:${SONAR_ADMIN_PASSWORD}" \
  --data-urlencode "name=local-scan-$(date +%s)" \
  --data-urlencode "type=GLOBAL_ANALYSIS_TOKEN" | jq -r '.token')"

if [[ -z "${SONAR_TOKEN}" || "${SONAR_TOKEN}" == "null" ]]; then
  echo "Failed to generate Sonar token." >&2
  exit 1
fi

echo "Running Sonar scanner..."
docker run --rm \
  --network host \
  -e SONAR_TOKEN="${SONAR_TOKEN}" \
  -e SONAR_HOST_URL="${SONAR_HOST_URL}" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli:latest \
  -Dsonar.projectKey="${SONAR_PROJECT_KEY}" \
  -Dsonar.qualitygate.wait=true

echo "Downloading open issues..."
tmp_file="${ISSUES_FILE}.tmp"
echo '{"issues":[]}' > "${tmp_file}"
page=1
page_size=500
total=1

while [[ $(((page - 1) * page_size)) -lt ${total} ]]; do
  response="$(curl -sf -u "${SONAR_TOKEN}:" \
    "${SONAR_HOST_URL}/api/issues/search?projectKeys=${SONAR_PROJECT_KEY}&statuses=OPEN&resolved=false&p=${page}&ps=${page_size}")"
  total="$(echo "${response}" | jq -r '.total // 0')"
  jq -s '.[0].issues += .[1].issues | .[0]' "${tmp_file}" <(echo "${response}") > "${tmp_file}.next"
  mv "${tmp_file}.next" "${tmp_file}"
  page=$((page + 1))
done

mv "${tmp_file}" "${ISSUES_FILE}"
echo "Issues written to ${ISSUES_FILE}"
echo "Open issues: $(jq '.issues | length' "${ISSUES_FILE}")"
