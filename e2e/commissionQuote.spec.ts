import { expect, test } from "@playwright/test";

const MOCK_VENDOR_URL = "http://localhost:5001";

test.beforeEach(async ({ request }) => {
  const res = await request.put(`${MOCK_VENDOR_URL}/mock/state`, {
    data: { stateId: "201" },
  });
  expect(res.ok()).toBe(true);
});

test.describe("Commission quote page", () => {
  test.describe("GIVEN the vendor returns 201", () => {
    test.describe("WHEN the user submits a valid loan", () => {
      test("THEN the quote is shown", async ({ page, request }) => {
        // A short vendor delay makes the loading state observable.
        await request.put(`${MOCK_VENDOR_URL}/mock/state`, {
          data: { stateId: "201", delay: 500 },
        });
        await page.goto("/");

        await page.getByLabel("Loan amount").fill("250000");
        await page.getByLabel("Loan term").fill("360");
        await page.getByRole("combobox", { name: "Risk band" }).click();
        await page.getByRole("option", { name: "Medium" }).click();
        await page.getByRole("button", { name: "Generate Quote" }).click();

        await expect(
          page.getByRole("button", { name: "Generating…" }),
        ).toBeDisabled();
        await expect(page.getByLabel("Loan amount")).toBeDisabled();

        await expect(page.getByText("Quote details")).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.getByText("$6,875.50")).toBeVisible();
        await expect(page.getByText("2.75%")).toBeVisible();
        await expect(page.getByText("001", { exact: true })).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
      });
    });
  });
  test.describe("GIVEN the vendor keeps returning 500", () => {
    test.describe("WHEN the user submits a valid loan", () => {
      test("THEN an error alert is shown, and Try again succeeds once the vendor recovers", async ({
        page,
        request,
      }) => {
        // vendor return 500 for the first time
        await request.put(`${MOCK_VENDOR_URL}/mock/state`, {
          data: { stateId: "500" },
        });
        await page.goto("/");

        await page.getByLabel("Loan amount").fill("250000");
        await page.getByLabel("Loan term").fill("360");
        await page.getByRole("combobox", { name: "Risk band" }).click();
        await page.getByRole("option", { name: "Medium" }).click();
        await page.getByRole("button", { name: "Generate Quote" }).click();

        const alert = page.getByRole("alert");
        await expect(alert).toContainText(
          "The quote service is unavailable. Please try again later.",
          { timeout: 10_000 },
        );
        await expect(page.getByText("$6,875.50")).toHaveCount(0);

        // vendor will return 201 when click retry button
        await request.put(`${MOCK_VENDOR_URL}/mock/state`, {
          data: { stateId: "201" },
        });

        await alert.getByRole("button", { name: "Try again" }).click();

        await expect(page.getByText("$6,875.50")).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.getByRole("alert")).toHaveCount(0);
      });
    });
  });
});
