import { expect, test } from "@playwright/test"
import { bootstrapSession, mockWorkbenchApi } from "./mock-api.mjs"

const primaryCaseId = "11111111-1111-4111-8111-111111111111"
const secondaryCaseId = "22222222-2222-4222-8222-222222222222"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("overview is the main home entry point", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/overview$/)
  await expect(page.getByRole("heading", { name: "Current triage pressure and deployment safety posture" })).toBeVisible()
})

test("row selection updates right preview pane", async ({ page }) => {
  await page.goto("/queue")

  const primaryRow = page.getByTestId(`queue-row-${primaryCaseId}`)
  const secondaryRow = page.getByTestId(`queue-row-${secondaryCaseId}`)
  await expect(primaryRow).toBeVisible()
  await expect(secondaryRow).toBeVisible()

  await secondaryRow.click()

  await expect(secondaryRow).toHaveClass(/bg-primary\/12/)
  await expect(page.getByTestId("queue-preview-pane")).toContainText("Selected case")
})

test("saved views can be created and reapplied", async ({ page }) => {
  await page.goto("/queue")

  await page.getByPlaceholder("Name this view").fill("Morning triage")
  await page.getByRole("button", { name: "Save view" }).click()
  await page.getByTestId("saved-view-select").selectOption({ label: "Morning triage" })

  await expect(page.getByTestId("saved-view-select")).toHaveValue(/.+/)
})

test("compare mode shows dual preview cards", async ({ page }) => {
  await page.goto("/queue")

  await page.getByTestId("queue-compare-toggle").click()
  await page.getByTestId(`queue-row-${secondaryCaseId}`).getByRole("button", { name: "Compare" }).click()

  await expect(page.getByTestId("queue-compare-pane")).toBeVisible()
  await expect(page.getByTestId("queue-compare-secondary")).toBeVisible()
  await expect(page.getByText("Compare Delta")).toBeVisible()
})

test("open case quick action navigates to case detail", async ({ page }) => {
  await page.goto("/queue")

  await page.getByTestId(`queue-row-${primaryCaseId}`).getByRole("button", { name: "Open case" }).click()
  await expect(page).toHaveURL(new RegExp(`/cases/${primaryCaseId}$`))
})
