import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const targets = [
  "app/(protected)/dashboard/page.tsx",
  "app/(protected)/activity/page.tsx",
  "app/(protected)/investigate/page.tsx",
  "app/(protected)/graph/page.tsx",
  "app/(protected)/coverage/page.tsx",
  "app/(protected)/correlation/page.tsx",
  "app/(protected)/ioc/[id]/page.tsx",
]

const bannedMarkers = [/\bmock\b/i, /\bfaker\b/i, /\bdummy\b/i]
let failed = false

for (const relativePath of targets) {
  const filePath = resolve(process.cwd(), relativePath)
  const content = readFileSync(filePath, "utf8")

  if (!content.includes('/api/')) {
    console.error(`[real-data] ${relativePath} does not reference backend API paths.`)
    failed = true
  }

  for (const marker of bannedMarkers) {
    if (marker.test(content)) {
      console.error(`[real-data] ${relativePath} contains banned marker: ${marker}`)
      failed = true
    }
  }
}

if (failed) {
  process.exit(1)
}

console.log("[real-data] Compliance checks passed.")
