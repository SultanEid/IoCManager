import { expect, test } from "@playwright/test"
import { bootstrapSession, ids, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("approval flow accepts a rule proposal with review rationale", async ({ page }) => {
  await page.goto(`/cases/${ids.primaryCase}/rule-proposals`)

  await expect(page.getByRole("cell", { name: "Contain suspicious powershell chain" })).toBeVisible()
  await page.getByPlaceholder("Review reason").fill("Validated against policy and replay traces.")
  await page.getByRole("button", { name: "Submit Review" }).click()

  await expect(page.getByText(/Status:/)).toContainText("Accepted")
})
