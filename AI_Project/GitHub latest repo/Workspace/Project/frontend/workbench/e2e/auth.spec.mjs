import { expect, test } from "@playwright/test"
import { clearSession, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await clearSession(page)
  await mockWorkbenchApi(page)
})

test("auth flow signs in and redirects to requested page", async ({ page }) => {
  await page.goto("/auth?next=%2Fqueue")

  await expect(page.getByRole("heading", { name: "Select an operational persona" })).toBeVisible()
  await page.getByRole("button", { name: "Enter workspace" }).first().click()

  await expect(page).toHaveURL(/\/queue$/)
  await expect(page.getByRole("heading", { name: "Triage-first case queue with policy and evidence visibility" })).toBeVisible()
})
