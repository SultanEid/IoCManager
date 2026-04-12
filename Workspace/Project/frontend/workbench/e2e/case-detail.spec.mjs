import { expect, test } from "@playwright/test"
import { bootstrapSession, ids, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("case detail renders recommendation, approval tier, and evidence", async ({ page }) => {
  await page.goto(`/cases/${ids.primaryCase}`)

  await expect(page.getByRole("heading", { name: "Escalate suspicious DNS tunnel" })).toBeVisible()
  await expect(page.getByTestId("recommended-action")).toContainText("contain_and_monitor")
  await expect(page.getByTestId("approval-tier")).toContainText("Lead")
  await expect(page.getByText("network from EDR at confidence 91%")).toBeVisible()
  await expect(page.getByRole("link", { name: "Open Evidence Bundle" })).toBeVisible()
})
