import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Cloud Architecture Generator/);
});

test("homepage displays heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Cloud Architecture Generator/ })
  ).toBeVisible();
});
