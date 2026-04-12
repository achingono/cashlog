#!/usr/bin/env bash
set -euo pipefail

ISSUES_FILE="${1:-.sonar/issues.json}"
DOCS_DIR="${2:-docs}"
OUT_DIR="${DOCS_DIR}/sonar-prds"

if [[ ! -f "${ISSUES_FILE}" ]]; then
  echo "Issues file not found: ${ISSUES_FILE}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
rm -f "${OUT_DIR}"/cluster-*.md

total_issues="$(jq '.issues | length' "${ISSUES_FILE}")"

cluster_json="$(jq '
  .issues
  | group_by(.type + "|" + .severity)
  | map({
      id: ("cluster-" + (.[0].type | ascii_downcase) + "-" + (.[0].severity | ascii_downcase)),
      type: .[0].type,
      severity: .[0].severity,
      issues: .
    })
  | sort_by(-(.issues | length))
' "${ISSUES_FILE}")"

count="$(echo "${cluster_json}" | jq 'length')"

if [[ "${count}" -eq 0 ]]; then
  index_file="${OUT_DIR}/index.md"
  {
    echo "# SonarQube Findings PRDs"
    echo
    echo "Generated from \`${ISSUES_FILE}\`."
    echo
    echo "- Total open issues: **0**"
    echo "- Total clusters: **0**"
  } > "${index_file}"
  echo "Generated PRDs in ${OUT_DIR}"
  exit 0
fi

for idx in $(seq 0 $((count - 1))); do
  cluster="$(echo "${cluster_json}" | jq ".[$idx]")"
  cluster_id="$(echo "${cluster}" | jq -r '.id')"
  type="$(echo "${cluster}" | jq -r '.type')"
  severity="$(echo "${cluster}" | jq -r '.severity')"
  issue_count="$(echo "${cluster}" | jq '.issues | length')"
  file="${OUT_DIR}/${cluster_id}.md"

  {
    echo "# PRD: ${type} / ${severity} Sonar Findings"
    echo
    echo "## Problem"
    echo "This cluster contains **${issue_count}** open Sonar findings of type **${type}** and severity **${severity}**."
    echo
    echo "## Goal"
    echo "Eliminate all findings in this cluster while preserving existing behavior."
    echo
    echo "## Scope"
    echo "- In scope: files and rules listed below."
    echo "- Out of scope: unrelated refactors."
    echo
    echo "## Acceptance Criteria"
    echo "1. All issues in this cluster are resolved in SonarQube."
    echo "2. Workspace build passes."
    echo "3. No regression in API, SPA, or worker behavior."
    echo
    echo "## Findings"
    echo
    echo "| Rule | File | Line | Message |"
    echo "|------|------|------|---------|"
    echo "${cluster}" | jq -r '.issues[] | [.rule, (.component | sub("^[^:]+:"; "")), ((.line // "N/A") | tostring), (.message | gsub("\\|"; "\\\\|"))] | "| `\(.[0])` | `\(.[1])` | \(.[2]) | \(.[3]) |"'
    echo
    echo "## Proposed Remediation"
    echo "1. Fix highest-churn files first to reduce repeated edits."
    echo "2. Address rule-level patterns with shared helpers where possible."
    echo "3. Re-scan and close this cluster before moving on."
  } > "${file}"
done

index_file="${OUT_DIR}/index.md"
{
  echo "# SonarQube Findings PRDs"
  echo
  echo "Generated from \`${ISSUES_FILE}\`."
  echo
  echo "- Total open issues: **${total_issues}**"
  echo "- Total clusters: **${count}**"
  echo
  echo "| Cluster | Type | Severity | Issues | PRD |"
  echo "|---------|------|----------|--------|-----|"
  echo "${cluster_json}" | jq -r '.[] | "| `\(.id)` | \(.type) | \(.severity) | \(.issues | length) | [Open](./\(.id).md) |"'
} > "${index_file}"

echo "Generated PRDs in ${OUT_DIR}"
