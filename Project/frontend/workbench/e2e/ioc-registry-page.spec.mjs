import { expect, test } from "@playwright/test"
import { bootstrapSession, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("ioc registry supports scope and mode switches", async ({ page }) => {
  await page.goto("/ioc-registry")

  await expect(page.getByRole("heading", { name: "Registry Overview" })).toBeVisible()

  await page.getByRole("button", { name: "Active Incidents" }).click()
  await expect(page.getByRole("button", { name: "Active Incidents" })).toBeVisible()

  await page.locator("select").first().selectOption("server")
  await expect(page.locator("select").nth(1)).toHaveValue("srv-idp-01")

  await page.getByRole("link", { name: "Telemetry Coverage" }).click()
  await expect(page).toHaveURL(/\/ioc-registry\/telemetry/)
  await expect(page.getByRole("columnheader", { name: "Collection" })).toBeVisible()

  await page.getByRole("link", { name: "Source Analysis" }).click()
  await expect(page).toHaveURL(/\/ioc-registry\/sources/)
  await expect(page.getByRole("columnheader", { name: "Dependency Risk" })).toBeVisible()
})
