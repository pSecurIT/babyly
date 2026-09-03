import { expect, test } from "@playwright/test";

test.describe("Babyly browser security and flows", () => {
  test("shows the guest auth form with a CSRF token", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("form[action=\"/api/auth/request-link\"]")).toBeVisible();
    await expect(page.locator("input[name=\"csrfToken\"]")).toHaveValue(/^[a-f0-9]{64}$/);
  });

  test("rejects a CSRF-less guest auth request", async ({ request }) => {
    const response = await request.post("/api/auth/request-link", {
      form: {
        accessCode: "incorrect-code",
        name: "E2E Test",
        email: "e2e@example.com",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    const redirect = new URL(response.headers().location!);
    expect(redirect.pathname + redirect.search).toBe("/?mail=1");
  });

  test("keeps both participant flows behind guest authentication", async ({ page }) => {
    await page.goto("/deelnemen/voorspelling/formulier");
    await expect(page).toHaveURL(/\/?auth=1$/);

    await page.goto("/deelnemen/adres/formulier");
    await expect(page).toHaveURL(/\/?auth=1$/);
  });

  test.describe("with an isolated authenticated E2E participant", () => {
    test.skip(process.env.E2E_RUN_FULL !== "1", "Set E2E_RUN_FULL=1 for isolated database-backed flow tests.");
    test.use({ storageState: "e2e/.auth/guest.json" });

    test("completes prediction and shows the address cross-prompt", async ({ page }) => {
      await page.goto("/deelnemen/voorspelling/formulier");
      const predictionCsrfToken = await page.locator("input[name=csrfToken]").inputValue();
      const predictionCsrfCookie = await page.context().cookies();
      expect(predictionCsrfCookie.find((cookie) => cookie.name === "baby_csrf")?.value).toBe(predictionCsrfToken);
      await page.locator("input[name=\"name\"]").fill("E2E Test");
      await page.locator("select[name=\"gender\"]").selectOption("girl");
      await page.locator("input[name=\"weightKg\"]").fill("3.5");
      await page.locator("input[name=\"heightCm\"]").fill("52");
      await page.locator("input[name=\"birthDate\"]").fill("2027-01-15");
      await page.locator("input[name=\"birthTime\"]").fill("12:00");
      await Promise.all([
        page.waitForURL(/\/deelnemen\/voorspelling\/bedankt$/),
        page.getByRole("button", { name: /voorspelling opslaan/i }).click(),
      ]);
      await expect(page.getByRole("link", { name: /adres achterlaten/i })).toBeVisible();
    });

    test("completes address and shows the prediction cross-prompt", async ({ page }) => {
      await page.goto("/deelnemen/adres/formulier");
      const addressCsrfToken = await page.locator("input[name=csrfToken]").inputValue();
      const addressCsrfCookie = await page.context().cookies();
      expect(addressCsrfCookie.find((cookie) => cookie.name === "baby_csrf")?.value).toBe(addressCsrfToken);
      await page.locator("input[name=\"recipientName\"]").fill("E2E Test");
      await page.locator("input[name=\"street\"]").fill("Teststraat");
      await page.locator("input[name=\"houseNumber\"]").fill("1");
      await page.locator("input[name=\"postalCode\"]").fill("1234 AB");
      await page.locator("input[name=\"city\"]").fill("Utrecht");
      await page.locator("input[name=\"country\"]").fill("Nederland");
      await Promise.all([
        page.waitForURL(/\/deelnemen\/adres\/bedankt$/),
        page.getByRole("button", { name: /adres opslaan/i }).click(),
      ]);
      await expect(page.getByRole("link", { name: /voorspelling invullen/i })).toBeVisible();
    });
  });
});