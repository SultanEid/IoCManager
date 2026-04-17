import type {
  OperationsSubpageKey,
  OperationsWorkspaceVm,
  ScannerCoverageRollup,
  Server,
  ServerDetailVm,
  ServerEnvironment,
  ServerGroup,
  ServerGroupBy,
  ServerHealthStatus,
  ServerRiskSummary,
  Subnet,
  SubnetRollup,
} from "@/shared/modules/types"

export type OperationsSubpageMeta = {
  key: OperationsSubpageKey
  label: string
  href: string
  title: string
  description: string
}

export const OPERATIONS_SUBPAGES: OperationsSubpageMeta[] = [
  {
    key: "inventory",
    label: "Server Inventory",
    href: "/servers",
    title: "Server Inventory",
    description: "Live infrastructure inventory with health, telemetry posture, scanner coverage, and linked alerts.",
  },
  {
    key: "subnets",
    label: "Subnets",
    href: "/servers/subnets",
    title: "Subnets",
    description: "Network segmentation and capacity posture with operational reassignment controls.",
  },
  {
    key: "asset-groups",
    label: "Asset Groups",
    href: "/servers/asset-groups",
    title: "Asset Groups",
    description: "Policy-aligned infrastructure cohorts with coverage and alert-link context.",
  },
  {
    key: "scanner-fleet",
    label: "Scanner Fleet",
    href: "/servers/scanner-fleet",
    title: "Scanner Fleet",
    description: "Fleet health, assignment scope, queue pressure, and coverage confidence across scanning nodes.",
  },
]

const SUBNETS: Subnet[] = [
  {
    id: "snet-prod-dmz",
    name: "PROD-DMZ-A",
    cidr: "10.44.10.0/24",
    gateway: "10.44.10.1",
    zone: "DMZ",
    environment: "Production",
    capacity: 220,
    utilizationPercent: 78,
    scannerCoverage: "Full",
    health: "Healthy",
    notes: "Public-facing ingress and reverse proxy tier.",
  },
  {
    id: "snet-prod-core",
    name: "PROD-CORE-C",
    cidr: "10.44.30.0/24",
    gateway: "10.44.30.1",
    zone: "Core",
    environment: "Production",
    capacity: 200,
    utilizationPercent: 86,
    scannerCoverage: "Partial",
    health: "Degraded",
    notes: "Core workloads and database dependencies for alert processing.",
  },
  {
    id: "snet-stg-edge",
    name: "STG-EDGE-B",
    cidr: "10.55.22.0/24",
    gateway: "10.55.22.1",
    zone: "Cloud Edge",
    environment: "Staging",
    capacity: 160,
    utilizationPercent: 52,
    scannerCoverage: "Partial",
    health: "Healthy",
    notes: "Staging edge and canary validation services.",
  },
  {
    id: "snet-dev-ot",
    name: "DEV-OT-HUB",
    cidr: "172.20.14.0/24",
    gateway: "172.20.14.1",
    zone: "OT",
    environment: "Development",
    capacity: 90,
    utilizationPercent: 41,
    scannerCoverage: "None",
    health: "Degraded",
    notes: "ICS lab and parser test appliances.",
  },
]

const SERVERS: Server[] = [
  {
    id: "srv-gateway-01",
    hostname: "gw-finance-prod-01",
    ipv4: "10.44.10.21",
    os: "Ubuntu 24.04 LTS",
    ownerTeam: "Network Defense",
    subnetId: "snet-prod-dmz",
    environment: "Production",
    criticality: "Mission Critical",
    health: "Healthy",
    telemetryStatus: "Healthy",
    scannerCoverage: "Full",
    deploymentStatus: "Stable",
    riskSeverity: "High",
    linkedDetections: [
      { id: "DET-6612", title: "DNS Tunneling Burst" },
      { id: "DET-7789", title: "JA3 Beacon Outlier" },
    ],
    linkedCases: [
      { id: "AL-4412", title: "Finance edge egress anomaly" },
      { id: "AL-4529", title: "Beacon channel variance spike" },
    ],
    linkedRules: [
      { id: "SIG-2041", title: "PowerShell Credential Artifact Sweep" },
      { id: "SNO-6102", title: "TLS JA3 C2 Beacon Burst" },
    ],
    scannerAssignments: [
      {
        scannerId: "scn-edge-1",
        scannerName: "edge-scan-eu-01",
        lastScanAtUtc: "2026-03-15T05:18:00.000Z",
        coveragePercent: 100,
      },
    ],
    lastHeartbeatUtc: "2026-03-15T06:31:00.000Z",
    updatedAtUtc: "2026-03-15T06:33:00.000Z",
  },
  {
    id: "srv-collector-03",
    hostname: "edr-collector-prod-03",
    ipv4: "10.44.30.58",
    os: "Windows Server 2022",
    ownerTeam: "Endpoint Security",
    subnetId: "snet-prod-core",
    environment: "Production",
    criticality: "Business Critical",
    health: "Degraded",
    telemetryStatus: "Delayed",
    scannerCoverage: "Partial",
    deploymentStatus: "Canary",
    riskSeverity: "Critical",
    linkedDetections: [
      { id: "DET-8822", title: "Credential Dump Sequence" },
      { id: "DET-9910", title: "LSASS Memory Access Pattern" },
    ],
    linkedCases: [{ id: "AL-4307", title: "Credential access staging" }],
    linkedRules: [{ id: "YAR-8821", title: "Lumma Stealer Staging Buffer" }],
    scannerAssignments: [
      {
        scannerId: "scn-core-2",
        scannerName: "core-scan-us-02",
        lastScanAtUtc: "2026-03-15T03:45:00.000Z",
        coveragePercent: 74,
      },
    ],
    lastHeartbeatUtc: "2026-03-15T05:58:00.000Z",
    updatedAtUtc: "2026-03-15T06:10:00.000Z",
  },
  {
    id: "srv-auth-02",
    hostname: "auth-core-prod-02",
    ipv4: "10.44.30.19",
    os: "RHEL 9",
    ownerTeam: "Identity Operations",
    subnetId: "snet-prod-core",
    environment: "Production",
    criticality: "Mission Critical",
    health: "Healthy",
    telemetryStatus: "Healthy",
    scannerCoverage: "Partial",
    deploymentStatus: "Stable",
    riskSeverity: "Medium",
    linkedDetections: [{ id: "DET-7101", title: "Kerberos Ticket Spray" }],
    linkedCases: [{ id: "AL-4178", title: "Privilege escalation watch" }],
    linkedRules: [{ id: "SIG-1652", title: "Credential Material Export" }],
    scannerAssignments: [
      {
        scannerId: "scn-core-1",
        scannerName: "core-scan-us-01",
        lastScanAtUtc: "2026-03-15T04:52:00.000Z",
        coveragePercent: 68,
      },
    ],
    lastHeartbeatUtc: "2026-03-15T06:35:00.000Z",
    updatedAtUtc: "2026-03-15T06:36:00.000Z",
  },
  {
    id: "srv-stg-api-05",
    hostname: "api-staging-edge-05",
    ipv4: "10.55.22.44",
    os: "Ubuntu 24.04 LTS",
    ownerTeam: "Platform Engineering",
    subnetId: "snet-stg-edge",
    environment: "Staging",
    criticality: "Business Critical",
    health: "Healthy",
    telemetryStatus: "Healthy",
    scannerCoverage: "Partial",
    deploymentStatus: "Pending",
    riskSeverity: "Low",
    linkedDetections: [{ id: "DET-5112", title: "Canary parser anomaly" }],
    linkedCases: [{ id: "AL-4510", title: "Canary rollout validation" }],
    linkedRules: [{ id: "YAR-9014", title: "Packed Loader Mutex Cluster" }],
    scannerAssignments: [
      {
        scannerId: "scn-edge-2",
        scannerName: "edge-scan-eu-02",
        lastScanAtUtc: "2026-03-15T05:04:00.000Z",
        coveragePercent: 61,
      },
    ],
    lastHeartbeatUtc: "2026-03-15T06:20:00.000Z",
    updatedAtUtc: "2026-03-15T06:21:00.000Z",
  },
  {
    id: "srv-stg-worker-08",
    hostname: "worker-staging-08",
    ipv4: "10.55.22.88",
    os: "Debian 12",
    ownerTeam: "Platform Engineering",
    subnetId: "snet-stg-edge",
    environment: "Staging",
    criticality: "Standard",
    health: "Healthy",
    telemetryStatus: "Delayed",
    scannerCoverage: "Partial",
    deploymentStatus: "Canary",
    riskSeverity: "Medium",
    linkedDetections: [{ id: "DET-6211", title: "Queue depth drift" }],
    linkedCases: [{ id: "AL-4491", title: "Staging worker telemetry delay" }],
  linkedRules: [{ id: "SUR-7822", title: "Suricata JA3 Burst Detector" }],
    scannerAssignments: [
      {
        scannerId: "scn-stg-1",
        scannerName: "stg-scan-01",
        lastScanAtUtc: "2026-03-15T05:41:00.000Z",
        coveragePercent: 63,
      },
    ],
    lastHeartbeatUtc: "2026-03-15T06:03:00.000Z",
    updatedAtUtc: "2026-03-15T06:04:00.000Z",
  },
  {
    id: "srv-dev-lab-02",
    hostname: "dev-lab-ot-02",
    ipv4: "172.20.14.44",
    os: "Windows 11 Enterprise",
    ownerTeam: "Detection Engineering",
    subnetId: "snet-dev-ot",
    environment: "Development",
    criticality: "Standard",
    health: "Unreachable",
    telemetryStatus: "Missing",
    scannerCoverage: "None",
    deploymentStatus: "Failed",
    riskSeverity: "High",
    linkedDetections: [{ id: "DET-3312", title: "Agent heartbeat loss" }],
    linkedCases: [{ id: "AL-4457", title: "OT lab blind spot" }],
    linkedRules: [{ id: "FDR-224", title: "Beacon Interval Outlier" }],
    scannerAssignments: [],
    lastHeartbeatUtc: "2026-03-14T21:12:00.000Z",
    updatedAtUtc: "2026-03-15T05:57:00.000Z",
  },
  {
    id: "srv-dev-parser-04",
    hostname: "parser-dev-04",
    ipv4: "172.20.14.67",
    os: "Ubuntu 22.04 LTS",
    ownerTeam: "Detection Engineering",
    subnetId: "snet-dev-ot",
    environment: "Development",
    criticality: "Business Critical",
    health: "Degraded",
    telemetryStatus: "Missing",
    scannerCoverage: "None",
    deploymentStatus: "Pending",
    riskSeverity: "Medium",
    linkedDetections: [{ id: "DET-3308", title: "Ingestion parser crash loop" }],
    linkedCases: [{ id: "AL-4488", title: "Parser pipeline instability" }],
    linkedRules: [{ id: "FDR-411", title: "Suspicious Credential Export Chain" }],
    scannerAssignments: [],
    lastHeartbeatUtc: "2026-03-15T01:14:00.000Z",
    updatedAtUtc: "2026-03-15T05:50:00.000Z",
  },
]

const ASSET_GROUPS = [
  {
    id: "ag-finance-edge",
    name: "Finance Edge Workloads",
    policyProfile: "Strict Egress + Full Packet Telemetry",
    ownerTeam: "Network Defense",
    environment: "Production",
    scannerCompliancePercent: 94,
    memberServerIds: ["srv-gateway-01", "srv-auth-02"],
    linkedDetections: [
      { id: "DET-6612", title: "DNS Tunneling Burst" },
      { id: "DET-7101", title: "Kerberos Ticket Spray" },
    ],
    linkedCases: [{ id: "AL-4412", title: "Finance edge egress anomaly" }],
  },
  {
    id: "ag-credential-plane",
    name: "Credential Control Plane",
    policyProfile: "Identity Hardening + Memory Guardrails",
    ownerTeam: "Identity Operations",
    environment: "Production",
    scannerCompliancePercent: 82,
    memberServerIds: ["srv-collector-03", "srv-auth-02"],
    linkedDetections: [{ id: "DET-8822", title: "Credential Dump Sequence" }],
    linkedCases: [{ id: "AL-4307", title: "Credential access staging" }],
  },
  {
    id: "ag-canary-lab",
    name: "Canary Validation Lab",
    policyProfile: "Staged Rollout + Aggressive Scanner Sampling",
    ownerTeam: "Platform Engineering",
    environment: "Staging",
    scannerCompliancePercent: 68,
    memberServerIds: ["srv-stg-api-05", "srv-stg-worker-08"],
    linkedDetections: [{ id: "DET-5112", title: "Canary parser anomaly" }],
    linkedCases: [{ id: "AL-4510", title: "Canary rollout validation" }],
  },
  {
    id: "ag-ot-research",
    name: "OT Research Segment",
    policyProfile: "Constrained Telemetry + Manual Approval",
    ownerTeam: "Detection Engineering",
    environment: "Development",
    scannerCompliancePercent: 22,
    memberServerIds: ["srv-dev-lab-02", "srv-dev-parser-04"],
    linkedDetections: [{ id: "DET-3312", title: "Agent heartbeat loss" }],
    linkedCases: [{ id: "AL-4457", title: "OT lab blind spot" }],
  },
] satisfies OperationsWorkspaceVm["assetGroups"]

const SCANNER_FLEET = [
  {
    id: "scn-edge-1",
    name: "edge-scan-eu-01",
    mode: "Hybrid",
    health: "Healthy",
    assignedSubnetIds: ["snet-prod-dmz", "snet-stg-edge"],
    queueDepth: 14,
    uptimePercent: 99.3,
    coveragePercent: 97,
    lastHeartbeatUtc: "2026-03-15T06:34:00.000Z",
    latestVersion: "4.17.2",
  },
  {
    id: "scn-core-1",
    name: "core-scan-us-01",
    mode: "Scheduled",
    health: "Healthy",
    assignedSubnetIds: ["snet-prod-core"],
    queueDepth: 21,
    uptimePercent: 98.8,
    coveragePercent: 84,
    lastHeartbeatUtc: "2026-03-15T06:29:00.000Z",
    latestVersion: "4.17.2",
  },
  {
    id: "scn-core-2",
    name: "core-scan-us-02",
    mode: "Hybrid",
    health: "Degraded",
    assignedSubnetIds: ["snet-prod-core"],
    queueDepth: 39,
    uptimePercent: 95.2,
    coveragePercent: 72,
    lastHeartbeatUtc: "2026-03-15T06:12:00.000Z",
    latestVersion: "4.16.9",
  },
  {
    id: "scn-stg-1",
    name: "stg-scan-01",
    mode: "On-demand",
    health: "Offline",
    assignedSubnetIds: ["snet-stg-edge", "snet-dev-ot"],
    queueDepth: 0,
    uptimePercent: 81.6,
    coveragePercent: 46,
    lastHeartbeatUtc: "2026-03-15T01:55:00.000Z",
    latestVersion: "4.15.5",
  },
] satisfies OperationsWorkspaceVm["scannerFleet"]

const SERVER_DETAILS_BY_ID: Record<string, ServerDetailVm> = {
  "srv-gateway-01": {
    serverId: "srv-gateway-01",
    timeline: [
      {
        id: "t1",
        title: "Beacon outlier promoted to alert linkage",
        detail: "JA3 beacon burst crossed baseline threshold and linked to AL-4529.",
        source: "Alert Link",
        tone: "warning",
        whenUtc: "2026-03-15T04:58:00.000Z",
      },
      {
        id: "t2",
        title: "Policy gate passed",
        detail: "Outbound DNS canary policy validated in production DMZ.",
        source: "Policy",
        tone: "success",
        whenUtc: "2026-03-15T05:42:00.000Z",
      },
      {
        id: "t3",
        title: "Scanner cycle complete",
        detail: "edge-scan-eu-01 completed deep scan with no critical findings.",
        source: "Scanner",
        tone: "default",
        whenUtc: "2026-03-15T05:18:00.000Z",
      },
    ],
    riskSummary: {
      score: 77,
      severity: "High",
      drivers: [
        { label: "External exposure", value: 89 },
        { label: "Alert linkage pressure", value: 81 },
        { label: "Telemetry confidence", value: 58 },
      ],
      recommendation: "Increase DNS egress anomaly sampling and maintain 100% scanner coverage.",
    },
    deploymentSummary: {
      stage: "Stable",
      lastChangeUtc: "2026-03-15T05:42:00.000Z",
      note: "Latest policy package promoted after canary acceptance.",
    },
    scannerHistory: [
      {
        id: "sh1",
        scannerName: "edge-scan-eu-01",
        outcome: "Watch",
        note: "Low-confidence suspicious JA3 interval observed.",
        whenUtc: "2026-03-15T03:41:00.000Z",
      },
      {
        id: "sh2",
        scannerName: "edge-scan-eu-01",
        outcome: "Clean",
        note: "Post-policy scan returned below-risk baseline.",
        whenUtc: "2026-03-15T05:18:00.000Z",
      },
    ],
  },
  "srv-collector-03": {
    serverId: "srv-collector-03",
    timeline: [
      {
        id: "t1",
        title: "Telemetry lag exceeded threshold",
        detail: "Collector ingest lag exceeded 18 minutes for EDR stream.",
        source: "Telemetry",
        tone: "warning",
        whenUtc: "2026-03-15T05:33:00.000Z",
      },
      {
        id: "t2",
        title: "Canary parser deployed",
        detail: "Deployment moved to canary to validate parsing stability.",
        source: "Deployment",
        tone: "default",
        whenUtc: "2026-03-15T04:47:00.000Z",
      },
    ],
    riskSummary: {
      score: 91,
      severity: "Critical",
      drivers: [
        { label: "Credential detection pressure", value: 93 },
        { label: "Telemetry lag", value: 87 },
        { label: "Scanner confidence", value: 64 },
      ],
      recommendation: "Restore telemetry SLA first, then expand scanner sampling to full coverage.",
    },
    deploymentSummary: {
      stage: "Canary",
      lastChangeUtc: "2026-03-15T04:47:00.000Z",
      note: "Awaiting canary acceptance before promotion.",
    },
    scannerHistory: [
      {
        id: "sh1",
        scannerName: "core-scan-us-02",
        outcome: "Action Required",
        note: "Credential extraction pattern matched high-confidence signature.",
        whenUtc: "2026-03-15T03:45:00.000Z",
      },
    ],
  },
}

const OPERATIONS_VM: OperationsWorkspaceVm = {
  generatedAtUtc: "2026-03-15T06:40:00.000Z",
  servers: SERVERS,
  subnets: SUBNETS,
  assetGroups: ASSET_GROUPS,
  scannerFleet: SCANNER_FLEET,
  serverDetailsById: SERVER_DETAILS_BY_ID,
  defaults: {
    groupBy: "subnet",
  },
}

function healthWeight(status: ServerHealthStatus) {
  if (status === "Healthy") return 0
  if (status === "Degraded") return 1
  return 2
}

function cloneServer(server: Server): Server {
  return {
    ...server,
    linkedDetections: server.linkedDetections.map((item) => ({ ...item })),
    linkedCases: server.linkedCases.map((item) => ({ ...item })),
    linkedRules: server.linkedRules.map((item) => ({ ...item })),
    scannerAssignments: server.scannerAssignments.map((item) => ({ ...item })),
  }
}

function cloneServerDetail(detail: ServerDetailVm): ServerDetailVm {
  return {
    ...detail,
    timeline: detail.timeline.map((item) => ({ ...item })),
    riskSummary: {
      ...detail.riskSummary,
      drivers: detail.riskSummary.drivers.map((driver) => ({ ...driver })),
    },
    deploymentSummary: { ...detail.deploymentSummary },
    scannerHistory: detail.scannerHistory.map((item) => ({ ...item })),
  }
}

export function getOperationsVm(): OperationsWorkspaceVm {
  return {
    generatedAtUtc: OPERATIONS_VM.generatedAtUtc,
    servers: OPERATIONS_VM.servers.map(cloneServer),
    subnets: OPERATIONS_VM.subnets.map((item) => ({ ...item })),
    assetGroups: OPERATIONS_VM.assetGroups.map((item) => ({
      ...item,
      linkedCases: item.linkedCases.map((row) => ({ ...row })),
      linkedDetections: item.linkedDetections.map((row) => ({ ...row })),
      memberServerIds: item.memberServerIds.slice(),
    })),
    scannerFleet: OPERATIONS_VM.scannerFleet.map((item) => ({
      ...item,
      assignedSubnetIds: item.assignedSubnetIds.slice(),
    })),
    serverDetailsById: Object.fromEntries(
      Object.entries(OPERATIONS_VM.serverDetailsById).map(([key, value]) => [key, cloneServerDetail(value)]),
    ),
    defaults: { ...OPERATIONS_VM.defaults },
  }
}

export function groupServersBy(servers: Server[], subnets: Subnet[], groupBy: ServerGroupBy): ServerGroup[] {
  const subnetById = new Map(subnets.map((item) => [item.id, item]))
  const groups = new Map<string, Server[]>()

  for (const server of servers) {
    const groupLabel =
      groupBy === "subnet"
        ? subnetById.get(server.subnetId)?.name ?? "Unassigned Subnet"
        : groupBy === "environment"
          ? `${server.environment} Environment`
          : `${server.criticality}`
    groups.set(groupLabel, [...(groups.get(groupLabel) ?? []), server])
  }

  return Array.from(groups.entries())
    .map(([label, groupedServers]) => ({
      key: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      servers: groupedServers
        .slice()
        .sort((left, right) => healthWeight(right.health) - healthWeight(left.health) || left.hostname.localeCompare(right.hostname)),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function buildSubnetRollups(servers: Server[], subnets: Subnet[]): Record<string, SubnetRollup> {
  const rollups = Object.fromEntries(
    subnets.map((subnet) => [
      subnet.id,
      {
        subnetId: subnet.id,
        serverCount: 0,
        missionCriticalCount: 0,
        unhealthyCount: 0,
        telemetryMissingCount: 0,
      },
    ]),
  ) as Record<string, SubnetRollup>

  for (const server of servers) {
    const rollup = rollups[server.subnetId]
    if (!rollup) {
      continue
    }

    rollup.serverCount += 1
    if (server.criticality === "Mission Critical") {
      rollup.missionCriticalCount += 1
    }
    if (server.health !== "Healthy") {
      rollup.unhealthyCount += 1
    }
    if (server.telemetryStatus === "Missing") {
      rollup.telemetryMissingCount += 1
    }
  }

  return rollups
}

export function buildScannerCoverageRollup(servers: Server[]): ScannerCoverageRollup {
  const fullCoverageCount = servers.filter((server) => server.scannerCoverage === "Full").length
  const partialCoverageCount = servers.filter((server) => server.scannerCoverage === "Partial").length
  const noCoverageCount = servers.filter((server) => server.scannerCoverage === "None").length

  return {
    totalServers: servers.length,
    fullCoverageCount,
    partialCoverageCount,
    noCoverageCount,
  }
}

export function findServerById(servers: Server[], serverId: string) {
  return servers.find((server) => server.id === serverId) ?? null
}

export function resolveSubnet(serversSubnets: Subnet[], subnetId: string) {
  return serversSubnets.find((subnet) => subnet.id === subnetId) ?? null
}

export function deriveServerRiskSummary(server: Server, detail: ServerDetailVm | null): ServerRiskSummary {
  if (detail) {
    return detail.riskSummary
  }

  const severityScore: Record<Server["riskSeverity"], number> = {
    Critical: 90,
    High: 76,
    Medium: 58,
    Low: 37,
  }

  const envModifier: Record<ServerEnvironment, number> = {
    Production: 8,
    Staging: 3,
    Development: 0,
  }

  const score = Math.min(99, severityScore[server.riskSeverity] + envModifier[server.environment])
  return {
    score,
    severity: server.riskSeverity,
    drivers: [
      { label: "Asset criticality pressure", value: server.criticality === "Mission Critical" ? 88 : 61 },
      { label: "Telemetry posture", value: server.telemetryStatus === "Missing" ? 84 : server.telemetryStatus === "Delayed" ? 63 : 37 },
      { label: "Scanner coverage assurance", value: server.scannerCoverage === "Full" ? 30 : server.scannerCoverage === "Partial" ? 59 : 82 },
    ],
      recommendation: "Run targeted scan and validate detection-to-alert linkage integrity.",
  }
}



