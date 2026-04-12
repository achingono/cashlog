# PRD: CODE_SMELL / MINOR Sonar Findings

## Problem
This cluster contains **3** open Sonar findings of type **CODE_SMELL** and severity **MINOR**.

## Goal
Eliminate all findings in this cluster while preserving existing behavior.

## Scope
- In scope: files and rules listed below.
- Out of scope: unrelated refactors.

## Acceptance Criteria
1. All issues in this cluster are resolved in SonarQube.
2. Workspace build passes.
3. No regression in API, SPA, or worker behavior.

## Findings

| Rule | File | Line | Message |
|------|------|------|---------|
| `typescript:S4325` | `code/api/src/routes/transactions.ts` | 28 | This assertion is unnecessary since it does not change the type of the expression. |
| `typescript:S4325` | `code/api/src/routes/transactions.ts` | 46 | This assertion is unnecessary since it does not change the type of the expression. |
| `typescript:S4325` | `code/spa/src/components/budgets/BudgetForm.tsx` | 129 | This assertion is unnecessary since it does not change the type of the expression. |

## Proposed Remediation
1. Fix highest-churn files first to reduce repeated edits.
2. Address rule-level patterns with shared helpers where possible.
3. Re-scan and close this cluster before moving on.
