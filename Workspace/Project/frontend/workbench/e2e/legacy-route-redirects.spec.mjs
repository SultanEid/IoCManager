import { expect, test } from "@playwright/test"
import { bootstrapSession, mockWorkbenchApi } from "./mock-api.mjs"

test.beforeEach(async ({ page }) => {
  await bootstrapSession(page)
  await mockWorkbenchApi(page)
})

test("legacy routes redirect to canonical modules", async ({ page }) => {
  await page.goto("/problematic-queue")
  await expect(page).toHaveURL(/\/queue$/)

  await page.goto("/graph-relationships")
  await expect(page).toHaveURL(/\/matches$/)

  await page.goto("/investigations")
  await expect(page).toHaveURL(/\/matches$/)

  await page.goto("/rules-studio")
  await expect(page).toHaveURL(/\/rules$/)

  await page.goto("/rules-studio/review")
  await expect(page).toHaveURL(/\/rules$/)

  await page.goto("/rules-studio/feed-explorer")
  await expect(page).toHaveURL(/\/ingestion-feeds\/feed-explorer$/)

  await page.goto("/detection-studio/feed-explorer")
  await expect(page).toHaveURL(/\/ingestion-feeds\/feed-explorer$/)

  await page.goto("/coverage")
  await expect(page).toHaveURL(/\/ioc-registry$/)

  await page.goto("/coverage/telemetry")
  await expect(page).toHaveURL(/\/ioc-registry\/telemetry$/)

  await page.goto("/coverage/sources")
  await expect(page).toHaveURL(/\/ioc-registry\/sources$/)

  await page.goto("/coverage/attack")
  await expect(page).toHaveURL(/\/ioc-registry$/)

  await page.goto("/coverage-pain-analysis")
  await expect(page).toHaveURL(/\/coverage-pain-analysis$/)

  await page.goto("/reports-ingestion")
  await expect(page).toHaveURL(/\/ingestion-feeds$/)

  await page.goto("/threat-intel")
  await expect(page).toHaveURL(/\/ingestion-feeds$/)

  await page.goto("/deployments")
  await expect(page).toHaveURL(/\/operations$/)

  await page.goto("/settings-admin")
  await expect(page).toHaveURL(/\/admin$/)
})
