import { defineConfig } from "@playwright/test"

const port = 3211

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: true,
  },
})
