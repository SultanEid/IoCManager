import { expect, test } from "@playwright/test"
import { bootstrapSession, ids, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("rollout flow records canary observation and triggers rollback", async ({ page }) => {
  await page.goto(`/cases/${ids.primaryCase}/simulation-results`)

  await expect(page.getByText("Current stage:")).toContainText("canary")

  await page.getByPlaceholder("Observed noise (0-1)").fill("0.38")
  await page.getByRole("button", { name: "Save Observation" }).click()
  await expect(page.getByText("Observed noise:")).toContainText("38%")

  await page.getByPlaceholder("Rollback reason").fill("Exceeded acceptable noise threshold in canary.")
  await page.getByRole("button", { name: "Trigger Rollback" }).click()

  await expect(page.getByText("Triggered:")).toContainText("true")
  await expect(page.getByText("Current stage:")).toContainText("rollback")
})
