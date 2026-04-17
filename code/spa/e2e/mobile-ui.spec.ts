import { expect, test, type Page } from "@playwright/test";

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    const respond = async (status: number, body: unknown) => {
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    };

    if (method === "DELETE") {
      await respond(204, {});
      return;
    }

    if (path.endsWith("/dashboard/summary")) {
      await respond(200, {
        data: {
          netWorth: 250000,
          totalAssets: 320000,
          totalLiabilities: 70000,
          monthlyIncome: 9200,
          monthlyExpenses: 6100,
          monthlyNet: 3100,
        },
      });
      return;
    }

    if (path.endsWith("/dashboard/trends")) {
      await respond(200, {
        data: [
          { date: "2026-01-01", value: 245000 },
          { date: "2026-02-01", value: 248500 },
          { date: "2026-03-01", value: 250000 },
        ],
      });
      return;
    }

    if (path.endsWith("/dashboard/spending-by-category")) {
      await respond(200, {
        data: [
          { category: { id: "cat-food", name: "Food", icon: null, color: null }, total: 820 },
          { category: { id: "cat-housing", name: "Housing", icon: null, color: null }, total: 1700 },
        ],
      });
      return;
    }

    if (path.endsWith("/holdings/history")) {
      await respond(200, {
        data: [
          { date: "2026-01-01", value: 241000 },
          { date: "2026-02-01", value: 246000 },
          { date: "2026-03-01", value: 250000 },
        ],
      });
      return;
    }

    if (path.endsWith("/holdings")) {
      await respond(200, {
        data: {
          totalAssets: 320000,
          totalLiabilities: 70000,
          netWorth: 250000,
          accounts: [
            {
              id: "acct-1",
              name: "Checking",
              institution: "Mock Bank",
              type: "CHECKING",
              currency: "USD",
              balance: 8400,
              availableBalance: 8400,
              balanceDate: "2026-03-01",
              transactionCount: 5,
            },
          ],
        },
      });
      return;
    }

    if (path.endsWith("/transactions/filter-categories")) {
      await respond(200, {
        data: [{ id: "cat-food", name: "Food", icon: null, color: null, count: 2 }],
      });
      return;
    }

    if (path.endsWith("/transactions")) {
      await respond(200, {
        data: [
          {
            id: "tx-1",
            posted: "2026-03-08",
            amount: -35.5,
            description: "Market",
            payee: "Corner Market",
            memo: null,
            isReviewed: true,
            categoryRuleId: null,
            account: { id: "acct-1", name: "Checking", institution: "Mock Bank" },
            category: { id: "cat-food", name: "Food", icon: null, color: null },
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      });
      return;
    }

    if (path.endsWith("/accounts")) {
      await respond(200, {
        data: [
          {
            id: "acct-1",
            name: "Checking",
            institution: "Mock Bank",
            type: "CHECKING",
            currency: "USD",
            balance: 8400,
            availableBalance: 8400,
            balanceDate: "2026-03-01",
            transactionCount: 5,
          },
        ],
      });
      return;
    }

    if (path.endsWith("/categories")) {
      await respond(200, {
        data: [{ id: "cat-food", name: "Food", icon: null, color: null, parentId: null, children: [] }],
      });
      return;
    }

    if (path.endsWith("/budgets")) {
      await respond(200, {
        data: [
          {
            id: "bud-1",
            categoryId: "cat-food",
            categoryName: "Food",
            categoryIcon: null,
            categoryColor: null,
            amount: 900,
            spent: 820,
            remaining: 80,
            percentUsed: 91.1,
            period: "MONTHLY",
            startDate: "2026-03-01",
            endDate: null,
          },
        ],
      });
      return;
    }

    if (path.endsWith("/goals")) {
      await respond(200, {
        data: [
          {
            id: "goal-1",
            name: "Emergency Fund",
            targetAmount: 15000,
            currentAmount: 9000,
            percentComplete: 60,
            targetDate: null,
            status: "ACTIVE",
            icon: null,
            color: null,
            notes: null,
            createdAt: "2026-01-01",
            updatedAt: "2026-03-01",
            accounts: [],
          },
        ],
      });
      return;
    }

    if (path.endsWith("/assets")) {
      await respond(200, { data: [] });
      return;
    }

    if (path.endsWith("/reports")) {
      await respond(200, { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      return;
    }

    if (path.endsWith("/sync/status")) {
      await respond(200, { data: null });
      return;
    }

    if (path.endsWith("/sync/history")) {
      await respond(200, { data: [] });
      return;
    }

    if (path.endsWith("/category-rules")) {
      await respond(200, { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
      return;
    }

    if (method === "POST" || method === "PATCH" || method === "PUT") {
      await respond(200, { data: {} });
      return;
    }

    await respond(404, { error: { message: `Unhandled API mock: ${path}` } });
  });
}

async function openMobileSidebarRoute(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await page.getByRole("link", { name: label, exact: true }).click();
  const sidebarDialog = page.getByRole("dialog");
  if (await sidebarDialog.isVisible()) {
    await page.keyboard.press("Escape");
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

test.describe("mobile compatibility", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("all primary pages remain navigable without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const pages = ["Holdings", "Transactions", "Assets", "Budgets", "Goals", "Reports", "Settings", "Dashboard"];
    for (const name of pages) {
      await openMobileSidebarRoute(page, name);
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("spending chart drills down to transactions", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const categoryButton = page.getByRole("button", { name: /Food/i }).first();
    await expect(categoryButton).toBeVisible();
    await categoryButton.click();

    await expect(page).toHaveURL(/\/transactions\?/);
    await expect(page).toHaveURL(/categoryId=/);
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible();
  });
});
