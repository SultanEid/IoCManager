import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { bootstrapSession, mockWorkbenchApi } from "./mock-api.mjs"

async function expectNoColorContrastViolations(page, includeSelector = "main") {
  const includeCount = await page.locator(includeSelector).count()
  const builder = new AxeBuilder({ page }).withTags(["wcag2aa", "wcag21aa"])
  if (includeCount > 0) {
    builder.include(includeSelector)
  } else {
    builder.include("body")
  }
  const results = await builder.analyze()

  const colorContrastViolations = results.violations.filter((violation) => violation.id === "color-contrast")
  expect(colorContrastViolations).toEqual([])
}

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("theme toggle persists dark/light preference", async ({ page }) => {
  await page.goto("/overview")
  await expect(page.locator("html")).toHaveClass(/dark/)

  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).toHaveClass(/light/)

  await page.reload()
  await expect(page.locator("html")).toHaveClass(/light/)
})

test("core screens keep WCAG AA color contrast in dark and light modes", async ({ page }) => {
  await page.goto("/overview")
  await expectNoColorContrastViolations(page)

  await page.getByTestId("theme-toggle").click()
  await expect(page.locator("html")).toHaveClass(/light/)

  for (const route of ["/overview", "/queue", "/alerts", "/servers", "/scans", "/rules", "/reports", "/settings"]) {
    await page.goto(route)
    await expectNoColorContrastViolations(page)
  }
})
