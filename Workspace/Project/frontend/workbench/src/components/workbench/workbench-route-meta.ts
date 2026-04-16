import type { LucideIcon } from "lucide-react"
import {
  Activity,
  Clock3,
  FileSearch,
  FileText,
  Radar,
  SearchCode,
  Server,
  Settings,
  Workflow,
} from "lucide-react"

export type WorkbenchModule = "Core" | "Operations" | "Settings"

export type WorkbenchRouteMeta = {
  id: string
  href: string
  aliases: string[]
  module: WorkbenchModule
  label: string
  title: string
  subtitle: string
  icon: LucideIcon
  commandAliases: string[]
}

export type WorkbenchCaseRouteMeta = {
  id: string
  suffix: ""
  label: string
  title: string
  subtitle: string
  icon: LucideIcon
  commandAliases: string[]
}

export type WorkbenchBreadcrumbItem = {
  label: string
  href?: string
}

type RulesSubrouteMeta = {
  label: string
  title: string
  subtitle: string
}

type IngestionSubrouteMeta = {
  label: string
  title: string
  subtitle: string
}

type ServersSubrouteMeta = {
  label: string
  title: string
  subtitle: string
}

export type ResolvedWorkbenchRoute = {
  pathname: string
  canonicalPath: string
  module: WorkbenchModule | "Alert"
  title: string
  subtitle: string
  breadcrumbs: WorkbenchBreadcrumbItem[]
  route: WorkbenchRouteMeta | null
  caseRoute: WorkbenchCaseRouteMeta | null
  caseId: string | null
}

export const WORKBENCH_MODULE_ORDER: WorkbenchModule[] = ["Core", "Operations", "Settings"]

export const WORKBENCH_ROUTES: WorkbenchRouteMeta[] = [
  {
    id: "overview",
    href: "/overview",
    aliases: ["/"],
    module: "Core",
    label: "Dashboard",
    title: "Dashboard",
    subtitle: "Operational posture, embedded visual analytics, and current activity across alerts, scans, and reporting.",
    icon: Radar,
    commandAliases: ["Dashboard", "Overview", "Operations Overview", "Visual Analytics"],
  },
  {
    id: "alerts",
    href: "/alerts",
    aliases: ["/queue", "/problematic-queue", "/cases", "/matches", "/investigations", "/graph-relationships"],
    module: "Core",
    label: "Alerts",
    title: "Alert Registry",
    subtitle: "Alert registry with current status, priority, and deployment context.",
    icon: Activity,
    commandAliases: ["Alerts", "Alert Registry", "Alert Queue", "Queue", "Triage Queue"],
  },
  {
    id: "servers",
    href: "/servers",
    aliases: ["/operations"],
    module: "Operations",
    label: "Servers",
    title: "Servers",
    subtitle: "Server discovery, health, scanner coverage, and operational management.",
    icon: Server,
    commandAliases: ["Servers", "Targets", "Server Management", "Server Discovery"],
  },
  {
    id: "results-ingestion",
    href: "/results-ingestion",
    aliases: ["/reports-ingestion"],
    module: "Operations",
    label: "Scans",
    title: "Scans",
    subtitle: "Search scan results, detection history, and execution outcomes with backend filters.",
    icon: Workflow,
    commandAliases: ["Scans", "Result Ingestion", "Normalized Result Ingestion"],
  },
  {
    id: "scan-plan",
    href: "/scan-plan",
    aliases: ["/servers/scan-plans", "/operations/scan-plans"],
    module: "Operations",
    label: "Scan Plan",
    title: "Scan Plan",
    subtitle: "Reusable scan configurations with cadence, rule selection, run-now execution, and last-run posture.",
    icon: Clock3,
    commandAliases: ["Scan Plan", "Scan Plans", "Plan Scheduler", "Scheduled Scans"],
  },
  {
    id: "rules",
    href: "/rules",
    aliases: ["/distribution", "/deployments", "/detection-studio", "/rules-studio"],
    module: "Operations",
    label: "Rules Management",
    title: "Rules Management",
    subtitle: "YARA, Sigma, Snort, and Suricata rule authoring, review, simulation, and release controls.",
    icon: SearchCode,
    commandAliases: ["Rules Management", "Rule Repository", "Rules", "Rule Management", "Rule Distribution", "Distribution", "Deployments"],
  },
  {
    id: "ioc-ingestion",
    href: "/ioc-ingestion",
    aliases: ["/ingestion-feeds", "/threat-intel"],
    module: "Operations",
    label: "IOCs Explorer",
    title: "IOCs Explorer",
    subtitle: "Explore normalized IoC data, feed quality, and source-level processing state.",
    icon: FileSearch,
    commandAliases: ["IOCs Explorer", "IoC Ingestion", "Ingestion", "Feeds"],
  },
  {
    id: "reports",
    href: "/reports",
    aliases: ["/ioc-registry", "/coverage", "/coverage-pain-analysis"],
    module: "Operations",
    label: "Reports",
    title: "Reports",
    subtitle: "Generate management and technical summaries with preview, history, and future export paths.",
    icon: FileText,
    commandAliases: ["Reports", "Report Generation", "Export History", "Executive Summary"],
  },
  {
    id: "settings",
    href: "/settings",
    aliases: ["/admin", "/settings-admin"],
    module: "Settings",
    label: "Settings",
    title: "Settings",
    subtitle: "Environment health, retention controls, and role-gated administrative settings.",
    icon: Settings,
    commandAliases: ["Settings", "Administration"],
  },
]

export const WORKBENCH_CASE_ROUTES: WorkbenchCaseRouteMeta[] = [
  {
    id: "alert-detail",
    suffix: "",
    label: "Alert Detail",
    title: "Alert Detail",
    subtitle: "Alert summary with decisions, evidence, and rollout posture.",
    icon: Activity,
    commandAliases: ["Alert Detail"],
  },
]

const ROUTE_BY_HREF = new Map(WORKBENCH_ROUTES.map((item) => [item.href, item]))
const ALIAS_TO_CANONICAL = new Map(
  WORKBENCH_ROUTES.flatMap((item) => item.aliases.map((alias) => [alias, item.href] as const)),
)

const RULES_SUBROUTE_BY_SUFFIX = new Map<string, RulesSubrouteMeta>([
  [
    "",
    {
      label: "Rule Catalog",
      title: "Rules Management",
      subtitle: "Central rule repository with review and release stages.",
    },
  ],
  [
    "review",
    {
      label: "Rule Review",
      title: "Rule Review",
      subtitle: "Reviewer queue, validation notes, and approval outcomes.",
    },
  ],
  [
    "simulation",
    {
      label: "Rule Simulation",
      title: "Rule Simulation",
      subtitle: "Dry-run and quality simulation before controlled rollout.",
    },
  ],
  [
    "canary-rollouts",
    {
      label: "Canary Rollouts",
      title: "Canary Rollouts",
      subtitle: "Staged deployment progression with explicit safety controls.",
    },
  ],
  [
    "rollback-history",
    {
      label: "Rollback History",
      title: "Rollback History",
      subtitle: "Historical rollback actions and remediation traceability.",
    },
  ],
])

const INGESTION_SUBROUTE_BY_SUFFIX = new Map<string, IngestionSubrouteMeta>([
  [
    "",
    {
      label: "Ingestion Overview",
      title: "IOCs Explorer",
      subtitle: "Explore ingestion health and normalization readiness for IoC sources.",
    },
  ],
  [
    "feed-explorer",
    {
      label: "Feed Explorer",
      title: "Feed Explorer",
      subtitle: "Source-level feed quality, dedupe posture, and processing state.",
    },
  ],
])

const SERVERS_SUBROUTE_BY_SUFFIX = new Map<string, ServersSubrouteMeta>([
  [
    "",
    {
      label: "Server Inventory",
      title: "Servers",
      subtitle: "Server inventory, health, and scanner assignment posture.",
    },
  ],
  [
    "subnets",
    {
      label: "Subnets",
      title: "Subnet Operations",
      subtitle: "Network segmentation and subnet allocation controls.",
    },
  ],
  [
    "asset-groups",
    {
      label: "Asset Groups",
      title: "Asset Group Operations",
      subtitle: "Server grouping policies and operational assignment context.",
    },
  ],
  [
    "scanner-fleet",
    {
      label: "Scanner Fleet",
      title: "Scanner Fleet",
      subtitle: "Scanner node health and assignment management.",
    },
  ],
])

const LEGACY_ALERT_SUBROUTES = new Set(["evidence-bundle", "graph-investigation", "decision-trace", "rule-proposals", "simulation-results"])

function normalizePath(pathname: string) {
  const trimmed = pathname.trim()
  if (!trimmed || trimmed === "/") {
    return "/overview"
  }

  return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed
}

function parseAlertPath(pathname: string): { caseId: string; suffix: string | null } | null {
  const match = pathname.match(/^\/(?:alerts|cases)\/([^/]+)(?:\/([^/]+))?$/)
  if (!match) {
    return null
  }

  const caseId = match[1]
  const suffix = match[2] ?? ""
  if (!suffix) {
    return { caseId, suffix: "" }
  }

  if (LEGACY_ALERT_SUBROUTES.has(suffix)) {
    return { caseId, suffix }
  }

  return { caseId, suffix: null }
}

function parseRulesPath(pathname: string): { kind: "catalog" | "legacy" | "detail" } | null {
  const match = pathname.match(/^\/(?:rules|detection-studio|rules-studio)(?:\/([^/]+))?$/)
  if (!match) {
    return null
  }

  const suffix = match[1] ?? ""
  if (suffix === "feed-explorer") {
    return null
  }

  if (!suffix) {
    return { kind: "catalog" }
  }

  if (RULES_SUBROUTE_BY_SUFFIX.has(suffix)) {
    return { kind: suffix === "" ? "catalog" : "legacy" }
  }

  return { kind: "detail" }
}

function parseIngestionPath(pathname: string): { suffix: string | null } | null {
  if (pathname === "/detection-studio/feed-explorer" || pathname === "/rules-studio/feed-explorer") {
    return { suffix: "feed-explorer" }
  }

  const match = pathname.match(/^\/(?:ioc-ingestion|ingestion-feeds|threat-intel)(?:\/([^/]+))?$/)
  if (!match) {
    return null
  }

  const suffix = match[1] ?? ""
  if (!INGESTION_SUBROUTE_BY_SUFFIX.has(suffix)) {
    return { suffix: null }
  }

  return { suffix }
}

function parseResultIngestionPath(pathname: string): boolean {
  return /^\/(?:results-ingestion|reports-ingestion)(?:\/.*)?$/.test(pathname)
}

function parseScanPlanPath(pathname: string): boolean {
  return /^\/(?:scan-plan|servers\/scan-plans|operations\/scan-plans)(?:\/.*)?$/.test(pathname)
}

function parseServersPath(pathname: string): { kind: "subpage"; suffix: string | null } | { kind: "server"; serverId: string } | null {
  const serverMatch = pathname.match(/^\/(?:servers|operations)\/servers\/([^/]+)$/)
  if (serverMatch) {
    return { kind: "server", serverId: serverMatch[1] }
  }

  const subpageMatch = pathname.match(/^\/(?:servers|operations)(?:\/([^/]+))?$/)
  if (!subpageMatch) {
    return null
  }

  const suffix = subpageMatch[1] ?? ""
  if (!SERVERS_SUBROUTE_BY_SUFFIX.has(suffix)) {
    return { kind: "subpage", suffix: null }
  }

  return { kind: "subpage", suffix }
}

function parseDistributionPath(pathname: string): boolean {
  return /^\/(?:distribution|deployments)(?:\/.*)?$/.test(pathname)
}

function parseReportingPath(pathname: string): boolean {
  return /^\/(?:reports|ioc-registry|coverage|coverage-pain-analysis)(?:\/.*)?$/.test(pathname)
}

function toAlertLabel(caseId: string) {
  return `Alert ${caseId.slice(0, 8)}`
}

function buildRouteBreadcrumbs(route: WorkbenchRouteMeta): WorkbenchBreadcrumbItem[] {
  return [
    { label: route.module },
    { label: route.label, href: route.href },
  ]
}

function buildAlertBreadcrumbs(caseId: string) {
  return [
    { label: "Core" },
    { label: "Alerts", href: "/alerts" },
    { label: toAlertLabel(caseId), href: `/alerts/${caseId}` },
  ]
}

function buildRulesBreadcrumbs(subroute: RulesSubrouteMeta | null) {
  const breadcrumbs: WorkbenchBreadcrumbItem[] = [
    { label: "Operations" },
    { label: "Rules Management", href: "/rules" },
  ]

  if (subroute && subroute.label !== "Rule Catalog") {
    breadcrumbs.push({ label: subroute.label })
  }

  return breadcrumbs
}

function buildIngestionBreadcrumbs(subroute: IngestionSubrouteMeta | null) {
  const breadcrumbs: WorkbenchBreadcrumbItem[] = [
    { label: "Operations" },
    { label: "IOCs Explorer", href: "/ioc-ingestion" },
  ]

  if (subroute && subroute.label !== "Ingestion Overview") {
    breadcrumbs.push({ label: subroute.label })
  }

  return breadcrumbs
}

function buildServersBreadcrumbs(subroute: ServersSubrouteMeta | null) {
  const breadcrumbs: WorkbenchBreadcrumbItem[] = [
    { label: "Operations" },
    { label: "Servers", href: "/servers" },
  ]

  if (subroute && subroute.label !== "Server Inventory") {
    breadcrumbs.push({ label: subroute.label })
  }

  return breadcrumbs
}

function buildServerDetailBreadcrumbs(serverId: string) {
  return [
    { label: "Operations" },
    { label: "Servers", href: "/servers" },
    { label: `Server ${serverId.slice(0, 11)}` },
  ]
}

export function resolveWorkbenchRoute(pathname: string): ResolvedWorkbenchRoute {
  const normalized = normalizePath(pathname)
  const alertMatch = parseAlertPath(normalized)

  if (alertMatch) {
    return {
      pathname: normalized,
      canonicalPath: `/alerts/${alertMatch.caseId}`,
      module: "Alert",
      title: toAlertLabel(alertMatch.caseId),
      subtitle: "Alert summary with evidence, decision, and rollout posture.",
      breadcrumbs: buildAlertBreadcrumbs(alertMatch.caseId),
      route: ROUTE_BY_HREF.get("/alerts") ?? null,
      caseRoute: WORKBENCH_CASE_ROUTES[0] ?? null,
      caseId: alertMatch.caseId,
    }
  }

  const rulesMatch = parseRulesPath(normalized)
  if (rulesMatch) {
    const route = ROUTE_BY_HREF.get("/rules") ?? null
    if (rulesMatch.kind === "detail") {
      const ruleId = normalized.split("/").filter(Boolean).at(-1) ?? "rule"
      return {
        pathname: normalized,
        canonicalPath: `/rules/${ruleId}`,
        module: "Operations",
        title: `Rule Detail - ${ruleId.slice(0, 12)}`,
        subtitle: "Metadata, current content, revisions, and import diagnostics.",
        breadcrumbs: [
          { label: "Operations" },
          { label: "Rules Management", href: "/rules" },
          { label: `Rule ${ruleId.slice(0, 12)}` },
        ],
        route,
        caseRoute: null,
        caseId: null,
      }
    }

    return {
      pathname: normalized,
      canonicalPath: "/rules",
      module: "Operations",
      title: route?.title ?? "Rules Management",
      subtitle: route?.subtitle ?? "Rule authoring and staged release controls.",
      breadcrumbs: buildRulesBreadcrumbs(null),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  const ingestionMatch = parseIngestionPath(normalized)
  if (ingestionMatch) {
    const route = ROUTE_BY_HREF.get("/ioc-ingestion") ?? null
    const subroute =
      ingestionMatch.suffix === null ? null : INGESTION_SUBROUTE_BY_SUFFIX.get(ingestionMatch.suffix) ?? null
    const canonicalPath =
      ingestionMatch.suffix && ingestionMatch.suffix.length > 0 ? `/ioc-ingestion/${ingestionMatch.suffix}` : "/ioc-ingestion"

    return {
      pathname: normalized,
      canonicalPath,
      module: "Operations",
      title: subroute?.title ?? route?.title ?? "IOCs Explorer",
      subtitle: subroute?.subtitle ?? route?.subtitle ?? "Explore IoC ingestion health and normalized data readiness.",
      breadcrumbs: buildIngestionBreadcrumbs(subroute),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  if (parseResultIngestionPath(normalized)) {
    const route = ROUTE_BY_HREF.get("/results-ingestion") ?? null
    return {
      pathname: normalized,
      canonicalPath: "/results-ingestion",
      module: "Operations",
      title: route?.title ?? "Scans",
      subtitle: route?.subtitle ?? "Search scan outcomes and normalized detection history.",
      breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  if (parseScanPlanPath(normalized)) {
    const route = ROUTE_BY_HREF.get("/scan-plan") ?? null
    return {
      pathname: normalized,
      canonicalPath: "/scan-plan",
      module: "Operations",
      title: route?.title ?? "Scan Plan",
      subtitle: route?.subtitle ?? "Reusable scan execution plans and recent run posture.",
      breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  const serversMatch = parseServersPath(normalized)
  if (serversMatch) {
    const route = ROUTE_BY_HREF.get("/servers") ?? null
    if (serversMatch.kind === "server") {
      return {
        pathname: normalized,
        canonicalPath: `/servers/servers/${serversMatch.serverId}`,
        module: "Operations",
        title: `Server Detail - Server ${serversMatch.serverId.slice(0, 11)}`,
        subtitle: "Host-level posture, scanner coverage, and distribution state.",
        breadcrumbs: buildServerDetailBreadcrumbs(serversMatch.serverId),
        route,
        caseRoute: null,
        caseId: null,
      }
    }

    const subroute = serversMatch.suffix === null ? null : SERVERS_SUBROUTE_BY_SUFFIX.get(serversMatch.suffix) ?? null
    const canonicalPath = serversMatch.suffix && serversMatch.suffix.length > 0 ? `/servers/${serversMatch.suffix}` : "/servers"

    return {
      pathname: normalized,
      canonicalPath,
      module: "Operations",
      title: subroute?.title ?? route?.title ?? "Targets / Servers",
      subtitle: subroute?.subtitle ?? route?.subtitle ?? "Server inventory and scanner posture.",
      breadcrumbs: buildServersBreadcrumbs(subroute),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  if (parseDistributionPath(normalized)) {
    const route = ROUTE_BY_HREF.get("/distribution") ?? null
    return {
      pathname: normalized,
      canonicalPath: "/distribution",
      module: "Operations",
      title: route?.title ?? "Rule Distribution",
      subtitle: route?.subtitle ?? "Controlled distribution and staged promotion of rules.",
      breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  if (parseReportingPath(normalized)) {
    const route = ROUTE_BY_HREF.get("/reports") ?? null
    return {
      pathname: normalized,
      canonicalPath: "/reports",
      module: "Operations",
      title: route?.title ?? "Reports",
      subtitle: route?.subtitle ?? "Generated management and technical summaries.",
      breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
      route,
      caseRoute: null,
      caseId: null,
    }
  }

  const canonicalPath = ALIAS_TO_CANONICAL.get(normalized) ?? normalized
  const route = ROUTE_BY_HREF.get(canonicalPath) ?? ROUTE_BY_HREF.get("/overview") ?? null

  if (!route) {
    return {
      pathname: normalized,
      canonicalPath: "/overview",
      module: "Core",
      title: "Overview",
      subtitle: "Operational posture across ingestion, rules, scans, and alerts.",
      breadcrumbs: [
        { label: "Core" },
        { label: "Overview", href: "/overview" },
      ],
      route: null,
      caseRoute: null,
      caseId: null,
    }
  }

  return {
    pathname: normalized,
    canonicalPath: route.href,
    module: route.module,
    title: route.title,
    subtitle: route.subtitle,
    breadcrumbs: buildRouteBreadcrumbs(route),
    route,
    caseRoute: null,
    caseId: null,
  }
}

export function isWorkbenchNavActive(pathname: string, href: string) {
  const resolved = resolveWorkbenchRoute(pathname)
  if (resolved.caseId && href === "/alerts") {
    return true
  }

  if (href === "/rules" && resolved.canonicalPath.startsWith("/rules")) {
    return true
  }

  if (href === "/ioc-ingestion" && resolved.canonicalPath.startsWith("/ioc-ingestion")) {
    return true
  }

  if (href === "/results-ingestion" && resolved.canonicalPath.startsWith("/results-ingestion")) {
    return true
  }

  if (href === "/scan-plan" && resolved.canonicalPath.startsWith("/scan-plan")) {
    return true
  }

  if (href === "/servers" && resolved.canonicalPath.startsWith("/servers")) {
    return true
  }

  if (href === "/distribution" && resolved.canonicalPath.startsWith("/distribution")) {
    return true
  }

  if (href === "/reports" && resolved.canonicalPath.startsWith("/reports")) {
    return true
  }

  return resolved.canonicalPath === href
}

export function getWorkbenchNavByModule() {
  const grouped = new Map<WorkbenchModule, WorkbenchRouteMeta[]>(WORKBENCH_MODULE_ORDER.map((module) => [module, []]))
  for (const route of WORKBENCH_ROUTES) {
    grouped.get(route.module)?.push(route)
  }

  return WORKBENCH_MODULE_ORDER.map((module) => ({
    module,
    routes: grouped.get(module) ?? [],
  }))
}
