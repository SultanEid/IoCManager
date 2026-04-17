import type { LucideIcon } from "lucide-react"
import {
  WORKBENCH_CASE_ROUTES,
  WORKBENCH_ROUTES,
} from "@/components/workbench/workbench-route-meta"

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  section: string
  subtitle: string
  commandAlias: string
}

export type QueueFocus = {
  key: string
  label: string
  description: string
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  ...WORKBENCH_ROUTES.map((route) => ({
    href: route.href,
    label: route.label,
    icon: route.icon,
    section: route.module,
    subtitle: route.subtitle,
    commandAlias: route.commandAliases[0] ?? route.label,
  })),
]

export const QUEUE_FOCUS_ITEMS: QueueFocus[] = [
  {
    key: "critical",
    label: "Critical Triage",
    description: "Show alerts with the highest triage score and response pressure.",
    href: "/queue?state=critical",
  },
  {
    key: "awaitingapproval",
    label: "Awaiting Approval",
    description: "Queue subset waiting for lead/admin sign-off before alert action.",
    href: "/queue?state=awaitingapproval",
  },
  {
    key: "missing-evidence",
    label: "Missing Evidence",
    description: "Prioritize alerts with unresolved evidence gaps.",
    href: "/queue?missing=1&group=decisionState",
  },
  {
    key: "sla-critical",
    label: "SLA Critical",
    description: "Focus on alerts close to SLA expiry and high operational pressure.",
    href: "/queue?minSla=80&group=slaBand",
  },
  {
    key: "canarywatch",
    label: "Fleet Watch",
    description: "Jump to server fleet and rollout monitoring.",
    href: "/servers",
  },
]

export const CASE_SUBROUTES: NavItem[] = [
  ...WORKBENCH_CASE_ROUTES.map((route) => ({
    href: route.suffix ? `/alerts/[id]/${route.suffix}` : "/alerts/[id]",
    label: route.label,
    icon: route.icon,
    section: "Alert",
    subtitle: route.subtitle,
    commandAlias: route.commandAliases[0] ?? route.label,
  })),
]
