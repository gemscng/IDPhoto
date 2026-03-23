import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows content", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("body")).toBeVisible();

    // Page title should be set
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("has navigation to upload page", async ({ page }) => {
    await page.goto("/en");

    // Look for a link/button that leads to upload
    const uploadLink = page.locator('a[href*="upload"]').first();
    if (await uploadLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await uploadLink.click();
      await expect(page).toHaveURL(/\/upload/);
    }
  });
});

test.describe("Upload page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/en/upload");
    await expect(page.locator("body")).toBeVisible();

    // Wait for client-side hydration — the upload component is a client component
    // Check for any interactive element that indicates the page loaded
    await page.waitForLoadState("networkidle");

    // The page should have rendered content
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});

test.describe("Language switcher", () => {
  test("can switch to Chinese", async ({ page }) => {
    await page.goto("/en");

    // Look for language switcher
    const zhLink = page.locator('a[href*="zh-HK"], a[hreflang="zh-HK"]').first();
    if (await zhLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await zhLink.click();
      await expect(page).toHaveURL(/\/zh-HK/);
    } else {
      // Try button-based switcher
      const switcher = page.locator("button", { hasText: /中文|繁體|HK/i }).first();
      if (await switcher.isVisible({ timeout: 3000 }).catch(() => false)) {
        await switcher.click();
        await expect(page).toHaveURL(/\/zh-HK/);
      }
    }
  });

  test("zh-HK locale loads correctly", async ({ page }) => {
    await page.goto("/zh-HK");
    await expect(page.locator("body")).toBeVisible();

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
  });
});

test.describe("Mobile viewport", () => {
  test("renders correctly at 375px width", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en");
    await expect(page.locator("body")).toBeVisible();

    // No horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test("renders correctly at 414px width", async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto("/en/upload");
    await expect(page.locator("body")).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(414);
  });
});
