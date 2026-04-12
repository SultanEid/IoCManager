import type { DetectionStudioSubpageKey, LifecycleState } from "@/shared/modules/types"

export type DetectionSubpageMeta = {
  key: DetectionStudioSubpageKey
  label: string
  href: string
  title: string
  description: string
}

export const DETECTION_SUBPAGES: DetectionSubpageMeta[] = [
  {
    key: "catalog",
    label: "Rule Catalog",
    href: "/rules",
    title: "Rule Catalog",
    description: "Operational rule catalog with policy-aware editing, provenance, and duplicate intelligence.",
  },
  {
    key: "review",
    label: "Rule Review",
    href: "/rules/review",
    title: "Rule Review",
    description: "Reviewer queue with decision notes, policy gate checks, and auditable approval actions.",
  },
  {
    key: "simulation",
    label: "Rule Simulation",
    href: "/rules/simulation",
    title: "Rule Simulation",
    description: "Replay quality, precision/recall posture, and pre-rollout tuning guidance.",
  },
  {
    key: "canary-rollouts",
    label: "Canary Rollouts",
    href: "/rules/canary-rollouts",
    title: "Canary Rollouts",
    description: "Live staged deployments with acceptance telemetry and rollback readiness indicators.",
  },
  {
    key: "rollback-history",
    label: "Rollback History",
    href: "/rules/rollback-history",
    title: "Rollback History",
    description: "Rollback timeline, impact context, restored versions, and trigger accountability.",
  },
]

export const DETECTION_FEED_EXPLORER_META: DetectionSubpageMeta = {
  key: "feed-explorer",
  label: "Feed Explorer",
  href: "/ioc-ingestion/feed-explorer",
  title: "Feed Explorer",
  description: "Inbound rule feed analysis with parse state, provenance, and duplicate risk.",
}

export const LIFECYCLE_FILTER_OPTIONS: Array<LifecycleState | "All"> = [
  "All",
  "Draft",
  "Parsed",
  "Validated",
  "Needs Review",
  "Approved",
  "Shadow",
  "Canary",
  "Promoted",
  "Disabled",
  "Retired",
  "Rejected",
]
