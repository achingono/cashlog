# Transaction Recategorization System — Technical Design

## 1. Architecture: Rule-Based Override Layer

### Why a rule table instead of inline flags

The existing system has exactly one override mechanism: `isReviewed = true` prevents LLM re-categorization of a single transaction. This doesn't support "apply to all future Netflix transactions." A dedicated `CategoryRule` table introduces a **precedence layer** that sits between raw imports and LLM categorization:

```
Import → CategoryRule lookup (deterministic) → LLM categorization (probabilistic) → final categoryId
```

**Precedence model (highest wins):**
1. **Manual single-transaction override** — `isReviewed = true` on a Transaction row. Untouchable.
2. **CategoryRule match** — deterministic payee-based rule applies `categoryId` and sets `isReviewed = true`.
3. **LLM categorization** — only runs when both (1) and (2) miss (`categoryId IS NULL AND isReviewed = false`).

This preserves backward compatibility: existing `isReviewed` logic is unchanged; rules are additive.

---

## 2. Prisma Schema Additions

```prisma
model CategoryRule {
  id               String    @id @default(cuid())
  normalizedPayee  String    // output of normalizePayee() — lowercase, noise-stripped
  categoryId       String
  category         Category  @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  accountId        String?   // optional: scope rule to one account (null = all accounts)
  account          Account?  @relation(fields: [accountId], references: [id], onDelete: Cascade)
  sourceTransactionId String // the transaction that triggered rule creation (for audit)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@unique([normalizedPayee, accountId])  // one rule per payee per account scope
  @@index([normalizedPayee])
  @@index([categoryId])
}
```

**Changes to existing models:**

```prisma
model Transaction {
  // ... existing fields unchanged ...
  categoryRuleId  String?       // FK to the rule that set this category (null = manual or LLM)
  categoryRule    CategoryRule?  @relation(fields: [categoryRuleId], references: [id], onDelete: SetNull)
  // existing indexes unchanged; add:
  @@index([categoryRuleId])
}

model Category {
  // add reverse relation
  categoryRules CategoryRule[]
}

model Account {
  // add reverse relation
  categoryRules CategoryRule[]
}
```

**Key decisions:**
- `normalizedPayee` uses the existing `normalizePayee()` from `expense-analysis.service.ts` — consistent, deterministic, already tested.
- `@@unique([normalizedPayee, accountId])` prevents duplicate rules. `accountId = null` means "all accounts," and a row with a specific `accountId` takes precedence over the global rule (see §4).
- `sourceTransactionId` is a plain string (not FK) to avoid cascade issues if the source transaction is deleted.
- `categoryRuleId` on Transaction enables undo and audit — you can trace exactly which rule applied to which transaction.

---

## 3. API Contract Changes

### 3a. Recategorize transaction (replaces existing PATCH)

**`POST /api/transactions/:id/recategorize`**

New endpoint; the existing `PATCH /api/transactions/:id` continues to work for simple single-transaction updates (backward compatible).

**Request body:**
```json
{
  "categoryId": "clxyz123",
  "scope": "single" | "all-past" | "all-future" | "all-past-and-future"
}
```

**Validation (Zod):**
```ts
const recategorizeSchema = z.object({
  categoryId: z.string().min(1),
  scope: z.enum(["single", "all-past", "all-future", "all-past-and-future"]),
});
```

**Response — 200 OK:**
```json
{
  "data": {
    "transactionId": "cltx001",
    "categoryId": "clxyz123",
    "scope": "all-past-and-future",
    "rule": {
      "id": "clrule01",
      "normalizedPayee": "netflix",
      "categoryId": "clxyz123",
      "accountId": null
    },
    "applied": {
      "past": 14,
      "future": true
    }
  }
}
```

**Processing by scope:**

| Scope | Creates rule? | Updates past txns? | Sets `isReviewed`? |
|---|---|---|---|
| `single` | No | Only target txn | Yes (target only) |
| `all-past` | No | All matching past txns | Yes (all matched) |
| `all-future` | Yes | Only target txn | Yes (target only) |
| `all-past-and-future` | Yes | All matching past txns + target | Yes (all matched) |

### 3b. Preview matched transactions

**`GET /api/transactions/:id/recategorize-preview?scope=all-past`**

Returns count and sample of transactions that would be affected, so the UI can show "This will recategorize 14 past transactions from Netflix."

**Response — 200 OK:**
```json
{
  "data": {
    "normalizedPayee": "netflix",
    "matchCount": 14,
    "sample": [
      { "id": "cltx002", "posted": "2024-11-15", "amount": -15.99, "description": "NETFLIX.COM" },
      { "id": "cltx003", "posted": "2024-10-15", "amount": -15.99, "description": "NETFLIX.COM" }
    ],
    "currentCategories": [
      { "id": "clcat01", "name": "Entertainment", "count": 10 },
      { "id": null, "name": "Uncategorized", "count": 4 }
    ],
    "existingRule": null
  }
}
```

### 3c. List / delete rules

**`GET /api/category-rules`**
Returns all rules with associated category info. Supports `?page=1&limit=20`.

**`DELETE /api/category-rules/:id`**
Deletes rule. Transactions previously categorized by this rule keep their category and `isReviewed = true` (non-destructive). Sets `categoryRuleId = null` on affected transactions.

### 3d. Undo recategorization

**`POST /api/transactions/:id/undo-recategorize`**

Reverts the last recategorization action for a transaction. If a rule was created, deletes it. Restores `categoryId` to `null` and `isReviewed` to `false` for affected transactions so LLM can re-categorize them.

**Request body:**
```json
{
  "ruleId": "clrule01"  // optional: if provided, also delete the rule and unlink all its transactions
}
```

---

## 4. Matching Algorithm

### 4a. Core matching: deterministic, conservative

```
matchKey = normalizePayee(transaction.payee || transaction.description)
```

Uses the **existing** `normalizePayee()` from `expense-analysis.service.ts`:
1. Lowercase
2. Strip digits
3. Strip non-alpha characters
4. Split tokens, remove noise words (`purchase`, `visa`, `debit`, etc.)
5. Take first 4 tokens, join with space

**Rule lookup order (first match wins):**
1. `WHERE normalizedPayee = :key AND accountId = :txAccountId` (account-scoped rule)
2. `WHERE normalizedPayee = :key AND accountId IS NULL` (global rule)

This is exact-match only — no fuzzy matching, no substring. Conservative by design.

### 4b. What counts as "matching" for past transaction bulk-update

When scope is `all-past` or `all-past-and-future`:
```sql
SELECT * FROM "Transaction"
WHERE normalizePayee(COALESCE(payee, description)) = :normalizedPayee
  AND posted <= NOW()
  AND (accountId = :accountId OR :accountId IS NULL)  -- if rule is account-scoped
```

The `normalizePayee` comparison is done in application code (not SQL) since it's a string function. The query uses:
```sql
-- App layer pre-filters, then applies normalizePayee() in-memory
SELECT * FROM "Transaction"
WHERE posted <= NOW()
  AND isReviewed = false  -- don't override manual single-transaction overrides
```

**Critical constraint:** Never overwrite a transaction where `isReviewed = true` and `categoryRuleId IS NULL` — that's a manual single-transaction override (precedence level 1).

### 4c. Future matching (at import time)

When new transactions arrive (import or sync), before LLM categorization:
```ts
async function applyRulesToTransactions(txIds: string[]): Promise<string[]> {
  const transactions = await prisma.transaction.findMany({
    where: { id: { in: txIds }, categoryId: null, isReviewed: false },
  });
  const rules = await prisma.categoryRule.findMany(); // cache; small table

  const ruleApplied: string[] = [];
  for (const tx of transactions) {
    const key = normalizePayee(tx.payee || tx.description);
    const rule = rules.find(r => r.normalizedPayee === key &&
      (r.accountId === null || r.accountId === tx.accountId));
    if (rule) {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { categoryId: rule.categoryId, isReviewed: true, categoryRuleId: rule.id },
      });
      ruleApplied.push(tx.id);
    }
  }
  return ruleApplied; // these IDs are excluded from LLM batch
}
```

---

## 5. LLM Categorization Pipeline Integration

### 5a. API categorization service (`categorization.service.ts`)

**Change in `runTransactionCategorization()`:**

```ts
// BEFORE (existing):
const uncategorized = await prisma.transaction.findMany({
  where: { id: { in: transactionIds }, categoryId: null, isReviewed: false },
});

// AFTER (no change needed!):
// The existing filter already excludes rule-applied transactions because
// applyRulesToTransactions() sets categoryId and isReviewed = true BEFORE
// this function is called.
```

**Call order in import pipeline:**
```
importTransactionsFromFile()
  → applyRulesToTransactions(importedIds)   // NEW: rule engine first
  → triggerTransactionCategorization(importedIds)  // existing: LLM second
```

The LLM function's existing `WHERE categoryId = null AND isReviewed = false` filter already skips rule-covered transactions. **Zero changes needed to LLM logic.**

### 5b. Worker categorization job (`categorize-transactions.ts`)

Same principle — add `applyRulesToTransactions()` call before the LLM batch:

```ts
export async function categorizeTransactions(): Promise<number> {
  // NEW: apply rules first
  const uncategorizedIds = await prisma.transaction.findMany({
    where: { categoryId: null, isReviewed: false },
    select: { id: true },
    take: BATCH_SIZE * 3,
  });
  await applyRulesToTransactions(uncategorizedIds.map(t => t.id));

  // EXISTING: LLM categorization (unchanged)
  // Its WHERE clause already filters out rule-applied transactions
  // ...
}
```

---

## 6. Expense Analysis Integration

The expense analysis service (`expense-analysis.service.ts`) already uses `normalizePayee()` and `transaction.category.name` for:
- `detectRecurringMerchants()` — groups by normalized payee
- `classifyEssentialDiscretionary()` — uses category name hints

### Improvements from recategorization rules:

**a) Higher category quality for recurring merchants:**
When a user recategorizes Netflix from "Uncategorized" → "Entertainment" with scope `all-past-and-future`, all past Netflix transactions get the correct category. This directly improves:
- `classifyEssentialDiscretionary()` accuracy (category hints match)
- `buildSubscriptionCandidates()` filtering (subscription vs insurance vs negotiable)

**b) New: rule-confidence signal for recurring detection:**
Add to the `generateExpenseAnalysis()` query:
```ts
const txRows = await prisma.transaction.findMany({
  where: { posted: { gte: start, lt: end } },
  select: {
    // existing fields...
    categoryRuleId: true,  // NEW: indicates rule-based categorization
  },
});
```

In `detectRecurringMerchants()`, transactions with `categoryRuleId != null` have **user-confirmed** merchant identity — boost confidence:
```ts
const hasRuleConfirmedCategory = txs.some(tx => tx.categoryRuleId != null);
if (hasRuleConfirmedCategory) {
  confidence = Math.min(1, confidence + 0.1); // small boost for user-validated merchants
}
```

**c) Category consistency for recurring merchants:**
Add a new utility to the expense analysis service:
```ts
function recurringMerchantCategoryConsistency(
  merchant: string,
  txs: ExpenseTransaction[]
): { consistent: boolean; dominantCategory: string | null } {
  const categories = txs.map(tx => tx.category?.name).filter(Boolean);
  const counts = new Map<string, number>();
  for (const cat of categories) counts.set(cat!, (counts.get(cat!) ?? 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    consistent: dominant ? dominant[1] / categories.length >= 0.8 : false,
    dominantCategory: dominant?.[0] ?? null,
  };
}
```
This feeds into the LLM prompt to produce better savings rationale when category data is consistent.

---

## 7. UX Flow

### 7a. Trigger point

User clicks `CategoryBadge` on any transaction in `TransactionTable` → opens **RecategorizeDialog** modal.

### 7b. Dialog flow

```
┌────────────────────────────────────────────────┐
│  Recategorize Transaction                       │
│                                                 │
│  "NETFLIX.COM" — $15.99 — Nov 15, 2024         │
│  Current category: Uncategorized                │
│                                                 │
│  New category: [ Entertainment ▾ ]              │
│                                                 │
│  Apply to:                                      │
│  ○ This transaction only                        │
│  ○ All past "Netflix" transactions (14 found)   │
│  ○ All future "Netflix" transactions            │
│  ○ All past & future (14 past + future)         │
│                                                 │
│  ℹ️  Future transactions matching "Netflix"     │
│     will be auto-categorized and excluded from  │
│     AI categorization.                          │
│                                                 │
│  [ Cancel ]                    [ Apply ]        │
└────────────────────────────────────────────────┘
```

### 7c. Preview counts

When the dialog opens, call `GET /api/transactions/:id/recategorize-preview?scope=all-past-and-future` to populate the counts. The scope radio buttons update dynamically:
- "All past" shows `(14 found)` count
- "All past & future" shows `(14 past + future)`

### 7d. Loading & confirmation

After clicking "Apply":
- Show spinner: "Updating 14 transactions…"
- On success, show toast: "✓ 14 transactions recategorized to Entertainment. Rule created for future Netflix transactions." with **Undo** action button.
- On error: "Failed to recategorize. No changes were made." (atomic operation)

### 7e. Undo behavior

Toast "Undo" button calls `POST /api/transactions/:id/undo-recategorize` within 30 seconds.
- Deletes rule if one was created
- Restores `categoryId = null`, `isReviewed = false`, `categoryRuleId = null` on affected transactions
- Toast confirms: "Recategorization undone."

### 7f. Rule management

Settings page → "Category Rules" tab shows all active rules:
```
| Payee Pattern | Category      | Scope       | Created      | Actions  |
|---------------|---------------|-------------|--------------|----------|
| Netflix       | Entertainment | All accounts| Nov 15, 2024 | [Delete] |
| Spotify       | Entertainment | Checking    | Oct 3, 2024  | [Delete] |
```

Deleting a rule shows confirmation: "This won't change existing transactions. Future transactions from this payee will go through AI categorization again."

---

## 8. Migration Strategy

### Phase 1: Schema migration

```sql
-- Migration: add CategoryRule table
CREATE TABLE "CategoryRule" (
  "id" TEXT NOT NULL,
  "normalizedPayee" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "accountId" TEXT,
  "sourceTransactionId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("id"),
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE,
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "CategoryRule_normalizedPayee_accountId_key"
  ON "CategoryRule"("normalizedPayee", "accountId");
CREATE INDEX "CategoryRule_normalizedPayee_idx" ON "CategoryRule"("normalizedPayee");
CREATE INDEX "CategoryRule_categoryId_idx" ON "CategoryRule"("categoryId");

-- Migration: add categoryRuleId to Transaction
ALTER TABLE "Transaction" ADD COLUMN "categoryRuleId" TEXT;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryRuleId_fkey"
  FOREIGN KEY ("categoryRuleId") REFERENCES "CategoryRule"("id") ON DELETE SET NULL;
CREATE INDEX "Transaction_categoryRuleId_idx" ON "Transaction"("categoryRuleId");
```

### Phase 2: Backfill (optional, run once)

Auto-generate rules from existing manually-reviewed transactions that share the same payee pattern:

```ts
async function backfillRulesFromReviewedTransactions() {
  const reviewed = await prisma.transaction.findMany({
    where: { isReviewed: true, categoryId: { not: null } },
    select: { id: true, payee: true, description: true, categoryId: true, accountId: true },
  });

  const candidates = new Map<string, { categoryId: string; count: number; sourceId: string }>();
  for (const tx of reviewed) {
    const key = normalizePayee(tx.payee || tx.description);
    if (key === 'unknown-merchant') continue;
    const existing = candidates.get(key);
    if (!existing) {
      candidates.set(key, { categoryId: tx.categoryId!, count: 1, sourceId: tx.id });
    } else if (existing.categoryId === tx.categoryId) {
      existing.count += 1;
    }
    // If different categories exist for same payee, skip (ambiguous)
  }

  // Only create rules where ≥3 transactions agree on same category
  for (const [normalizedPayee, data] of candidates) {
    if (data.count < 3) continue;
    await prisma.categoryRule.upsert({
      where: { normalizedPayee_accountId: { normalizedPayee, accountId: null } },
      create: {
        normalizedPayee,
        categoryId: data.categoryId,
        sourceTransactionId: data.sourceId,
      },
      update: {}, // don't overwrite existing rules
    });
  }
}
```

**This backfill is conservative:** only creates rules when ≥3 reviewed transactions with the same normalized payee all have the same category. No false positives.

### Phase 3: No breaking changes

- Existing `PATCH /api/transactions/:id` continues to work (single-transaction, no rule creation).
- Existing `isReviewed` logic is unchanged.
- `categoryRuleId` is nullable — all existing transactions have `null`.

---

## 9. Edge Cases & Conflict Resolution

| Edge Case | Resolution |
|---|---|
| **Manual override vs rule** | `isReviewed = true AND categoryRuleId IS NULL` = manual override. Rules never overwrite these. Only `categoryId IS NULL AND isReviewed = false` transactions are eligible for rule application. |
| **Conflicting rules (same payee, different category)** | `@@unique([normalizedPayee, accountId])` prevents this. Creating a new rule for the same payee updates the existing rule's `categoryId` (upsert). |
| **Account-scoped vs global rule** | Account-scoped wins. Lookup order: account-specific first, global second. |
| **Category deletion** | `onDelete: Cascade` on `CategoryRule.categoryId` — rule is deleted. Transactions keep `categoryId = null` (via `onDelete: SetNull` on Transaction.categoryId). |
| **Renamed/merged payees** | Different payee strings that normalize to the same key are automatically handled. Different normalized keys = different rules (correct). |
| **Account transfers** | Transfer transactions typically have payees like "Transfer to Savings." These normalize distinctly and are unlikely to collide with merchant rules. If they do, the user can delete the rule. |
| **Race: concurrent import + recategorize** | Rule creation uses `upsert` with unique constraint — idempotent. Transaction updates use `WHERE id = :id` — row-level locking by Postgres. Import sets `categoryId = null, isReviewed = false` initially; rules apply after. |
| **Race: two recategorize requests for same payee** | The `@@unique` constraint + upsert means the second request overwrites the first rule's `categoryId`. Last-write-wins is correct here — the user's most recent intent should prevail. |
| **Payee is null and description is generic** | `normalizePayee()` returns `'unknown-merchant'` for empty strings. Rules with `normalizedPayee = 'unknown-merchant'` should be rejected at API validation: `if (normalizedPayee === 'unknown-merchant') throw AppError(400, 'Cannot create rule for unidentifiable payee')`. |
| **Very old past transactions** | `all-past` scope has no time limit. For performance, cap at 1000 transactions per batch. Process in chunks of 100 with `prisma.transaction.updateMany()`. |
| **Undo after transactions deleted** | Undo is best-effort. If transactions were deleted between recategorize and undo, those are skipped. The rule deletion still succeeds. |

---

## 10. Phased Implementation Plan

### Phase 1: Foundation (schema + single-endpoint)
**Scope:** Prisma migration, `CategoryRule` model, `POST /api/transactions/:id/recategorize` with `scope: "single"` only.

**Tasks:**
1. Add `CategoryRule` model and `categoryRuleId` to Transaction in `schema.prisma`
2. Run `npx prisma migrate dev`
3. Create `category-rule.service.ts` with CRUD operations
4. Create `recategorization.service.ts` with `recategorize(txId, categoryId, scope)` handling `single` scope
5. Add `POST /api/transactions/:id/recategorize` route
6. Keep existing `PATCH /api/transactions/:id` unchanged

**Tests:**
- Unit: `recategorize()` with `scope: "single"` sets `categoryId`, `isReviewed = true`, `categoryRuleId = null`
- Unit: validate that `categoryId` must reference a valid leaf category
- Integration: `POST /api/transactions/:id/recategorize` returns 200 with correct shape
- Integration: existing `PATCH` endpoint still works

### Phase 2: Past bulk update
**Scope:** `scope: "all-past"` support, preview endpoint, matching algorithm.

**Tasks:**
1. Add `normalizePayee` utility to shared lib (extract from `expense-analysis.service.ts`)
2. Implement `getRecategorizePreview(txId, scope)` — counts matching transactions
3. Add `GET /api/transactions/:id/recategorize-preview` route
4. Extend `recategorize()` to handle `all-past` — bulk update matching transactions within a Prisma `$transaction` block
5. Add `POST /api/transactions/:id/undo-recategorize` route

**Tests:**
- Unit: `normalizePayee()` is deterministic across various payee strings (existing tests can be reused)
- Unit: `getRecategorizePreview()` returns correct counts, excludes manually-reviewed transactions
- Unit: `recategorize()` with `all-past` only updates transactions with matching normalized payee, `isReviewed = false`
- Unit: undo restores `categoryId = null`, `isReviewed = false`
- Integration: preview → recategorize → undo full cycle
- Edge: payee normalization collision scenarios

### Phase 3: Future rules + pipeline integration
**Scope:** `scope: "all-future"` and `"all-past-and-future"`, rule engine, pipeline gating.

**Tasks:**
1. Implement rule creation in `recategorize()` for future-inclusive scopes
2. Create `applyRulesToTransactions(txIds)` function
3. Integrate into import pipeline (`transaction-import.service.ts`): call before `triggerTransactionCategorization()`
4. Integrate into worker job (`categorize-transactions.ts`): call before LLM batch
5. Add `GET /api/category-rules` and `DELETE /api/category-rules/:id` routes

**Tests:**
- Unit: rule creation with unique constraint handling
- Unit: `applyRulesToTransactions()` correctly matches, sets `categoryRuleId`, skips manually-reviewed
- Unit: account-scoped rules take precedence over global rules
- Integration: import → rule applies → LLM skips rule-covered transactions
- Integration: rule deletion doesn't change existing transaction categories
- Race condition: simulate concurrent import + recategorize with parallel test execution
- Edge: `unknown-merchant` payee rejected
- Edge: category deletion cascades to rule deletion

### Phase 4: SPA UI
**Scope:** RecategorizeDialog component, preview integration, undo toast, rule management page.

**Tasks:**
1. Create `RecategorizeDialog` component with scope radio buttons
2. Wire `CategoryBadge.onClick` → open dialog
3. Call preview API on dialog open, display counts per scope
4. Call recategorize API on submit, show loading + success toast with undo
5. Add "Category Rules" section to Settings page
6. Add `api.recategorizeTransaction()`, `api.getRecategorizePreview()`, `api.getCategoryRules()`, `api.deleteCategoryRule()`, `api.undoRecategorize()` to SPA API client

**Tests:**
- Component: dialog renders scope options with preview counts
- Component: submit calls API with correct scope
- Component: undo toast appears and calls undo endpoint
- E2E (Playwright): full recategorize flow — click badge → select scope → apply → verify table updates → undo → verify revert

### Phase 5: Expense analysis improvements + backfill
**Scope:** Integrate `categoryRuleId` signal into expense analysis, run optional backfill.

**Tasks:**
1. Include `categoryRuleId` in expense analysis transaction query
2. Add confidence boost for rule-confirmed merchants in `detectRecurringMerchants()`
3. Add category consistency metric to recurring merchant output
4. Run backfill script for existing reviewed transactions (optional, admin-triggered)

**Tests:**
- Unit: confidence boost applied correctly for rule-confirmed merchants
- Unit: category consistency calculation
- Integration: expense analysis report includes improved recurring merchant data
- Backfill: verify rules created only when ≥3 transactions agree, no overwrites of existing rules

### Test infrastructure notes
- All unit tests use Vitest (already configured in `vitest.config.ts`)
- Integration tests use Prisma with test database
- E2E tests use Playwright (already configured in `playwright.config.ts`)
- Run `npm test` from monorepo root to execute all test suites
