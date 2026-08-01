import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AWS Architecture Generator/);
});

test("homepage displays heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /AWS Architecture Generator/ })
  ).toBeVisible();
});
