#!/usr/bin/env bash
set -euo pipefail

ISSUES_FILE="${1:-.sonar/issues.json}"
OUT_DIR="${2:-.sonar}"

if [[ ! -f "${ISSUES_FILE}" ]]; then
  echo "Issues file not found: ${ISSUES_FILE}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

ISSUES_EXPORT_FILE="${OUT_DIR}/issues.tsv"
TOP_SAMPLE_FILE="${OUT_DIR}/issues-top-sample.tsv"
RULE_COUNTS_FILE="${OUT_DIR}/rule-counts.tsv"
TOP_RULE_COUNTS_FILE="${OUT_DIR}/rule-counts-top20.tsv"
TOP_RULES_FILE="${OUT_DIR}/top-rule-violations.txt"

echo "Summarize Sonar issues by rule"
jq -r '.issues[] | [.rule,.severity,.type,.component,.line,.message] | @tsv' "${ISSUES_FILE}" \
  | tee "${ISSUES_EXPORT_FILE}" \
  | head -n 5 | tee "${TOP_SAMPLE_FILE}"
echo "---"
jq -r '.issues | group_by(.rule) | map({rule:.[0].rule,count:length}) | sort_by(-.count)[:20] | .[] | "\(.count)\t\(.rule)"' "${ISSUES_FILE}" \
  | tee "${TOP_RULE_COUNTS_FILE}"

echo
echo "List top Sonar rule violations"
jq -r '.issues | group_by(.rule) | sort_by(-length) | .[:12][] | "RULE: " + .[0].rule + " (" + (length|tostring) + ")\n" + (map("  - " + (.component|sub("^[^:]+:";"")) + ":" + ((.line//"N/A")|tostring) + " :: " + .message) | join("\n")) + "\n"' "${ISSUES_FILE}" \
  | tee "${TOP_RULES_FILE}"

echo
echo "List all Sonar rule counts"
jq -r '.issues | group_by(.rule) | map({rule:.[0].rule,count:length}) | sort_by(-.count) | .[] | "\(.count)\t\(.rule)"' "${ISSUES_FILE}" \
  | tee "${RULE_COUNTS_FILE}"

echo
echo "Exported Sonar issue summary artifacts:"
echo "  - ${ISSUES_EXPORT_FILE}"
echo "  - ${TOP_SAMPLE_FILE}"
echo "  - ${RULE_COUNTS_FILE}"
echo "  - ${TOP_RULE_COUNTS_FILE}"
echo "  - ${TOP_RULES_FILE}"
