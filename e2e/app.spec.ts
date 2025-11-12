import { test, expect } from "@playwright/test";

test.describe("App bootstrap", () => {
  test("loads root without console errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    const ignoredPatterns = [
      "Failed to load module script: Expected a JavaScript-or-Wasm module script",
    ];

    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text();
        if (ignoredPatterns.some((pattern) => text.includes(pattern))) {
          return;
        }
        consoleErrors.push(text);
      }
    });

    await page.route("**/api/**", async (route) => {
      const { url, method } = route.request();
      if (method === "GET" && url.includes("/api/health")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    });

    const response = await page.goto("/");
    expect(response?.ok()).toBeTruthy();

    await page.waitForTimeout(500);
    expect(consoleErrors, "Expect no console errors during initial render").toEqual([]);
  });
});