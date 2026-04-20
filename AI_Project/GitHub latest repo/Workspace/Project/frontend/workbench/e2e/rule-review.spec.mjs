import { expect, test } from "@playwright/test"
import { bootstrapSession, ids, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("rule review flow rejects proposal with explicit override rationale", async ({ page }) => {
  await page.goto(`/cases/${ids.primaryCase}/rule-proposals`)

  await expect(page.getByRole("cell", { name: "Contain suspicious powershell chain" })).toBeVisible()
  await page.getByRole("combobox").selectOption("reject")
  await page.getByPlaceholder("Review reason").fill("Replay mismatch detected in canary simulations.")
  await page.getByPlaceholder("Override reason (required for high-risk approvals)").fill("Risk budget exceeded.")
  await page.getByRole("button", { name: "Submit Review" }).click()

  await expect(page.getByText(/Status:/)).toContainText("Rejected")
})
