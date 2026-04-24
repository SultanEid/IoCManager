"use client"

type DemoMetric = {
  label: string
  value: string
  detail: string
}

type DemoSection = {
  title: string
  summary: string
  metrics: DemoMetric[]
  highlights: string[]
}

type DemoNetwork = {
  id: string
  name: string
  cidrBlock: string
  sshUser: string | null
  sshKeyPath: string | null
  hasSshPassword: boolean
  notes: string | null
  totalTargets: number
  onlineTargets: number
  lastSweepAtUtc: string | null
}

type DemoTarget = {
  id: string
  networkId: string
  networkName: string
  displayName: string | null
  hostname: string | null
  ipAddress: string
  status: string
  targetOsType: string | null
  lastSweepAtUtc: string | null
}

type DemoRulePreset = {
  scannerFamily: string
  paths: string[]
}

type DemoPlan = {
  id: string
  name: string
  scannerFamilies: string[]
  status: string
  scheduleType: string
  rulePathsByFamily: Record<string, string | null>
  notes: string | null
  networkIds: string[]
  targetIds: string[]
  networkNames: string[]
  targetDisplayNames: string[]
  schedule: Record<string, string | null>
  options: Record<string, string | null>
  nextRunAtUtc: string | null
  lastRunAtUtc: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

type DemoJob = {
  id: string
  scanPlanId: string | null
  scannerFamily: string
  executionMode: string | null
  triggerType: string
  status: string
  summary: string
  queuedAtUtc: string
  startedAtUtc: string | null
  finishedAtUtc: string | null
  batchId: string | null
  totalTargets: number
  completedTargets: number
  failedTargets: number
  noFindingsTargets: number
}

type DemoResult = {
  id: string
  jobId: string | null
  targetId: string | null
  targetDisplay: string
  scannerFamily: string
  status: string
  findingsCount: number
  startedAtUtc: string | null
  finishedAtUtc: string | null
}

type DemoFinding = {
  iocId: string
  scannerFamily: string
  targetId: string | null
  targetDisplay: string
  targetIp: string | null
  targetOsType: string | null
  jobId: string | null
  scanPlanId: string | null
  ruleName: string
  indicatorValue: string
  indicatorKind: string
  painLevel: string
  severity: string
  timestampUtc: string
  rawPayload: string | null
  status: string
}

type DemoReportRecord = {
  id: string
  title: string
  reportType: string
  scope: string
  createdAtUtc: string
  pdfDownloadPath: string | null
  csvDownloadPath: string | null
  status: string
}

type DemoReportDetail = {
  id: string
  title: string
  reportType: string
  scope: string
  createdAtUtc: string
  query: {
    jobId: string | null
    targetId: string | null
    networkId: string | null
    scannerFamily: string | null
    fromUtc: string | null
    toUtc: string | null
    severity: string | null
    status: string | null
  }
  sections: DemoSection[]
  pdfDownloadPath: string | null
  csvDownloadPath: string | null
  status: string
}

type DemoState = {
  networks: DemoNetwork[]
  targets: DemoTarget[]
  rulePresets: DemoRulePreset[]
  plans: DemoPlan[]
  jobs: DemoJob[]
  results: DemoResult[]
  findings: DemoFinding[]
  reports: DemoReportRecord[]
  reportDetails: Record<string, DemoReportDetail>
}

let idCounter = 100

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nextId(prefix: string) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

function shiftMinutes(base: string, minutes: number) {
  return new Date(new Date(base).getTime() + minutes * 60_000).toISOString()
}

function makeArtifactPath(reportId: string, format: "pdf" | "csv") {
  return `/demo/legacy-pipeline/reports/${reportId}.${format}`
}

function recalculateNetworkStats(state: DemoState) {
  state.networks = state.networks.map((network) => {
    const targets = state.targets.filter((target) => target.networkId === network.id)
    const lastSweepAtUtc = targets
      .map((target) => target.lastSweepAtUtc)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? network.lastSweepAtUtc
    return {
      ...network,
      totalTargets: targets.length,
      onlineTargets: targets.filter((target) => target.status === "Online").length,
      lastSweepAtUtc,
    }
  })
}

const baseTime = "2026-04-20T09:00:00.000Z"

function createInitialState(): DemoState {
  const networks: DemoNetwork[] = [
    {
      id: "net-corp",
      name: "Corporate LAN",
      cidrBlock: "10.24.18.0/24",
      sshUser: "iocmgr",
      sshKeyPath: "/opt/ioc/keys/corp_ed25519",
      hasSshPassword: false,
      notes: "Primary analyst subnet for workstation sweeps.",
      totalTargets: 0,
      onlineTargets: 0,
      lastSweepAtUtc: shiftMinutes(baseTime, -95),
    },
    {
      id: "net-edge",
      name: "Edge DMZ",
      cidrBlock: "10.24.44.0/24",
      sshUser: "scanner",
      sshKeyPath: "/opt/ioc/keys/dmz_rsa",
      hasSshPassword: true,
      notes: "Ingress-exposed services and appliance hosts.",
      totalTargets: 0,
      onlineTargets: 0,
      lastSweepAtUtc: shiftMinutes(baseTime, -130),
    },
  ]

  const targets: DemoTarget[] = [
    {
      id: "target-win-01",
      networkId: "net-corp",
      networkName: "Corporate LAN",
      displayName: "HR-LT-014",
      hostname: "hr-lt-014",
      ipAddress: "10.24.18.14",
      status: "Online",
      targetOsType: "windows",
      lastSweepAtUtc: shiftMinutes(baseTime, -95),
    },
    {
      id: "target-win-02",
      networkId: "net-corp",
      networkName: "Corporate LAN",
      displayName: "FIN-WS-022",
      hostname: "fin-ws-022",
      ipAddress: "10.24.18.22",
      status: "Online",
      targetOsType: "windows",
      lastSweepAtUtc: shiftMinutes(baseTime, -95),
    },
    {
      id: "target-linux-01",
      networkId: "net-edge",
      networkName: "Edge DMZ",
      displayName: "WEB-EDGE-01",
      hostname: "web-edge-01",
      ipAddress: "10.24.44.11",
      status: "Online",
      targetOsType: "linux",
      lastSweepAtUtc: shiftMinutes(baseTime, -130),
    },
    {
      id: "target-linux-02",
      networkId: "net-edge",
      networkName: "Edge DMZ",
      displayName: null,
      hostname: "sensor-22",
      ipAddress: "10.24.44.22",
      status: "Offline",
      targetOsType: "linux",
      lastSweepAtUtc: shiftMinutes(baseTime, -130),
    },
  ]

  const rulePresets: DemoRulePreset[] = [
    { scannerFamily: "yara", paths: ["C:\\IOC\\rules\\corp.yar", "/opt/ioc/rules/linux.yar"] },
    { scannerFamily: "sigma", paths: ["C:\\IOC\\rules\\windows-sigma", "/opt/ioc/rules/linux-sigma"] },
    { scannerFamily: "snort", paths: ["/opt/ioc/rules/snort/local.rules"] },
    { scannerFamily: "suricata", paths: ["/opt/ioc/rules/suricata/local.rules"] },
  ]

  const plans: DemoPlan[] = [
    {
      id: "plan-daily-windows",
      name: "Daily Windows Hunt",
      scannerFamilies: ["yara", "sigma"],
      status: "Active",
      scheduleType: "Daily",
      rulePathsByFamily: {
        yara: "C:\\IOC\\rules\\corp.yar",
        sigma: "C:\\IOC\\rules\\windows-sigma",
      },
      notes: "Windows endpoints with elevated auth pressure.",
      networkIds: ["net-corp"],
      targetIds: ["target-win-01", "target-win-02"],
      networkNames: ["Corporate LAN"],
      targetDisplayNames: ["HR-LT-014", "FIN-WS-022"],
      schedule: { hourUtc: "02", minuteUtc: "15" },
      options: {
        "yara.windowsScanPath": "C:\\Users",
        "sigma.minutesBack": "120",
      },
      nextRunAtUtc: shiftMinutes(baseTime, 1020),
      lastRunAtUtc: shiftMinutes(baseTime, -220),
      createdAtUtc: shiftMinutes(baseTime, -1440),
      updatedAtUtc: shiftMinutes(baseTime, -220),
    },
    {
      id: "plan-dmz-network",
      name: "DMZ Sensor Watch",
      scannerFamilies: ["suricata"],
      status: "Paused",
      scheduleType: "Interval",
      rulePathsByFamily: {
        suricata: "/opt/ioc/rules/suricata/local.rules",
      },
      notes: "Network inspection for ingress and egress lanes.",
      networkIds: ["net-edge"],
      targetIds: [],
      networkNames: ["Edge DMZ"],
      targetDisplayNames: [],
      schedule: { intervalMinutes: "60" },
      options: {
        "suricata.suricataMode": "hunt",
        "suricata.minutesBack": "60",
      },
      nextRunAtUtc: null,
      lastRunAtUtc: shiftMinutes(baseTime, -500),
      createdAtUtc: shiftMinutes(baseTime, -1800),
      updatedAtUtc: shiftMinutes(baseTime, -500),
    },
  ]

  const jobs: DemoJob[] = [
    {
      id: "job-yara-001",
      scanPlanId: "plan-daily-windows",
      scannerFamily: "yara",
      executionMode: "host",
      triggerType: "Plan",
      status: "Completed",
      summary: "Completed YARA sweep across the daily Windows pack.",
      queuedAtUtc: shiftMinutes(baseTime, -220),
      startedAtUtc: shiftMinutes(baseTime, -218),
      finishedAtUtc: shiftMinutes(baseTime, -206),
      batchId: "batch-1001",
      totalTargets: 2,
      completedTargets: 2,
      failedTargets: 0,
      noFindingsTargets: 1,
    },
    {
      id: "job-sigma-001",
      scanPlanId: "plan-daily-windows",
      scannerFamily: "sigma",
      executionMode: "host",
      triggerType: "Plan",
      status: "Completed",
      summary: "Event-log review completed with one elevated finding.",
      queuedAtUtc: shiftMinutes(baseTime, -220),
      startedAtUtc: shiftMinutes(baseTime, -217),
      finishedAtUtc: shiftMinutes(baseTime, -204),
      batchId: "batch-1001",
      totalTargets: 2,
      completedTargets: 2,
      failedTargets: 0,
      noFindingsTargets: 1,
    },
    {
      id: "job-suricata-001",
      scanPlanId: "plan-dmz-network",
      scannerFamily: "suricata",
      executionMode: "hunt",
      triggerType: "Manual",
      status: "Running",
      summary: "Live sensor hunt is still collecting candidate flows.",
      queuedAtUtc: shiftMinutes(baseTime, -32),
      startedAtUtc: shiftMinutes(baseTime, -30),
      finishedAtUtc: null,
      batchId: "batch-1002",
      totalTargets: 2,
      completedTargets: 1,
      failedTargets: 0,
      noFindingsTargets: 0,
    },
  ]

  const results: DemoResult[] = [
    {
      id: "result-yara-01",
      jobId: "job-yara-001",
      targetId: "target-win-01",
      targetDisplay: "HR-LT-014",
      scannerFamily: "yara",
      status: "Succeeded",
      findingsCount: 1,
      startedAtUtc: shiftMinutes(baseTime, -218),
      finishedAtUtc: shiftMinutes(baseTime, -210),
    },
    {
      id: "result-yara-02",
      jobId: "job-yara-001",
      targetId: "target-win-02",
      targetDisplay: "FIN-WS-022",
      scannerFamily: "yara",
      status: "NoFindings",
      findingsCount: 0,
      startedAtUtc: shiftMinutes(baseTime, -216),
      finishedAtUtc: shiftMinutes(baseTime, -206),
    },
    {
      id: "result-sigma-01",
      jobId: "job-sigma-001",
      targetId: "target-win-01",
      targetDisplay: "HR-LT-014",
      scannerFamily: "sigma",
      status: "Succeeded",
      findingsCount: 1,
      startedAtUtc: shiftMinutes(baseTime, -217),
      finishedAtUtc: shiftMinutes(baseTime, -205),
    },
    {
      id: "result-sigma-02",
      jobId: "job-sigma-001",
      targetId: "target-win-02",
      targetDisplay: "FIN-WS-022",
      scannerFamily: "sigma",
      status: "NoFindings",
      findingsCount: 0,
      startedAtUtc: shiftMinutes(baseTime, -216),
      finishedAtUtc: shiftMinutes(baseTime, -204),
    },
    {
      id: "result-suricata-01",
      jobId: "job-suricata-001",
      targetId: "target-linux-01",
      targetDisplay: "WEB-EDGE-01",
      scannerFamily: "suricata",
      status: "Running",
      findingsCount: 1,
      startedAtUtc: shiftMinutes(baseTime, -30),
      finishedAtUtc: null,
    },
  ]

  const findings: DemoFinding[] = [
    {
      iocId: "ioc-001",
      scannerFamily: "yara",
      targetId: "target-win-01",
      targetDisplay: "HR-LT-014",
      targetIp: "10.24.18.14",
      targetOsType: "windows",
      jobId: "job-yara-001",
      scanPlanId: "plan-daily-windows",
      ruleName: "Suspicious_PDF_Dropper",
      indicatorValue: "C:\\Users\\Public\\invoice-checker.exe",
      indicatorKind: "file_path",
      painLevel: "HostArtifact",
      severity: "High",
      timestampUtc: shiftMinutes(baseTime, -211),
      rawPayload: "{\"file\":\"C:\\\\Users\\\\Public\\\\invoice-checker.exe\",\"sha256\":\"3bb0e4...\"}",
      status: "Detection",
    },
    {
      iocId: "ioc-002",
      scannerFamily: "sigma",
      targetId: "target-win-01",
      targetDisplay: "HR-LT-014",
      targetIp: "10.24.18.14",
      targetOsType: "windows",
      jobId: "job-sigma-001",
      scanPlanId: "plan-daily-windows",
      ruleName: "PowerShell Download Cradle",
      indicatorValue: "powershell.exe -nop -w hidden -enc SQBFAFgA",
      indicatorKind: "command_line",
      painLevel: "Ttp",
      severity: "Critical",
      timestampUtc: shiftMinutes(baseTime, -205),
      rawPayload: "{\"event_id\":4104,\"commandLine\":\"powershell.exe -nop -w hidden -enc SQBFAFgA\"}",
      status: "Detection",
    },
    {
      iocId: "ioc-003",
      scannerFamily: "suricata",
      targetId: "target-linux-01",
      targetDisplay: "WEB-EDGE-01",
      targetIp: "10.24.44.11",
      targetOsType: "linux",
      jobId: "job-suricata-001",
      scanPlanId: "plan-dmz-network",
      ruleName: "ET POLICY Suspicious TLS SNI",
      indicatorValue: "api-shadow-updates.example",
      indicatorKind: "domain",
      painLevel: "Domain",
      severity: "Medium",
      timestampUtc: shiftMinutes(baseTime, -12),
      rawPayload: "{\"src_ip\":\"10.24.44.11\",\"dest_ip\":\"198.51.100.20\",\"protocol\":\"tls\"}",
      status: "Detection",
    },
    {
      iocId: "ioc-004",
      scannerFamily: "suricata",
      targetId: "target-linux-01",
      targetDisplay: "WEB-EDGE-01",
      targetIp: "10.24.44.11",
      targetOsType: "linux",
      jobId: "job-suricata-001",
      scanPlanId: "plan-dmz-network",
      ruleName: "Potential Scanner Tooling Beacon",
      indicatorValue: "198.51.100.20",
      indicatorKind: "ip",
      painLevel: "IP",
      severity: "Low",
      timestampUtc: shiftMinutes(baseTime, -9),
      rawPayload: "{\"src_ip\":\"10.24.44.11\",\"dest_ip\":\"198.51.100.20\",\"flow_id\":9981}",
      status: "Detection",
    },
  ]

  const reportId = "report-001"
  const reports: DemoReportRecord[] = [
    {
      id: reportId,
      title: "Weekly Exposure Brief",
      reportType: "ExecutiveSummary",
      scope: "Global scope",
      createdAtUtc: shiftMinutes(baseTime, -180),
      pdfDownloadPath: makeArtifactPath(reportId, "pdf"),
      csvDownloadPath: makeArtifactPath(reportId, "csv"),
      status: "Ready",
    },
  ]

  const reportDetails: Record<string, DemoReportDetail> = {
    [reportId]: {
      id: reportId,
      title: "Weekly Exposure Brief",
      reportType: "ExecutiveSummary",
      scope: "Global scope",
      createdAtUtc: shiftMinutes(baseTime, -180),
      query: {
        jobId: null,
        targetId: null,
        networkId: null,
        scannerFamily: null,
        fromUtc: shiftMinutes(baseTime, -10_080),
        toUtc: baseTime,
        severity: null,
        status: null,
      },
      sections: [
        {
          title: "Operational Posture",
          summary: "Demo snapshot showing active detections, running jobs, and saved reporting output.",
          metrics: [
            { label: "Jobs", value: "3", detail: "Recent queued and running activity." },
            { label: "Findings", value: "4", detail: "Normalized IOC rows in demo state." },
            { label: "Targets", value: "4", detail: "Discovered hosts in current scope." },
          ],
          highlights: [
            "Critical PowerShell behavior remains the highest-pain finding in the sample data.",
            "The DMZ sensor hunt is still running, so this snapshot should be refreshed before handoff.",
          ],
        },
      ],
      pdfDownloadPath: makeArtifactPath(reportId, "pdf"),
      csvDownloadPath: makeArtifactPath(reportId, "csv"),
      status: "Ready",
    },
  }

  const state: DemoState = { networks, targets, rulePresets, plans, jobs, results, findings, reports, reportDetails }
  recalculateNetworkStats(state)
  return state
}

const demoState = createInitialState()

function getState() {
  recalculateNetworkStats(demoState)
  return demoState
}

function resolveTargetName(target: DemoTarget) {
  return target.displayName ?? target.hostname ?? target.ipAddress
}

function listScopedTargets(input: { networkIds?: string[]; targetIds?: string[] }) {
  const state = getState()
  const networkIds = new Set(input.networkIds ?? [])
  const targetIds = new Set(input.targetIds ?? [])
  const hasExplicitScope = networkIds.size > 0 || targetIds.size > 0
  return state.targets.filter((target) => {
    if (!hasExplicitScope) {
      return true
    }
    return networkIds.has(target.networkId) || targetIds.has(target.id)
  })
}

function createJobArtifacts(input: {
  scannerFamilies: string[]
  triggerType: string
  executionMode?: string | null
  scanPlanId?: string | null
  batchId: string
  summaryPrefix: string
  targetIds: string[]
}) {
  const state = getState()
  const targets = listScopedTargets({ targetIds: input.targetIds })
  const now = new Date().toISOString()
  const createdJobs: DemoJob[] = []

  for (const scannerFamily of input.scannerFamilies) {
    const jobId = nextId(`job-${scannerFamily}`)
    const completed = scannerFamily === "snort" || scannerFamily === "suricata" ? 0 : targets.length
    const running = scannerFamily === "snort" || scannerFamily === "suricata"
    const job: DemoJob = {
      id: jobId,
      scanPlanId: input.scanPlanId ?? null,
      scannerFamily,
      executionMode: input.executionMode ?? (scannerFamily === "yara" || scannerFamily === "sigma" ? "host" : "hunt"),
      triggerType: input.triggerType,
      status: running ? "Running" : "Completed",
      summary: `${input.summaryPrefix} ${scannerFamily.toUpperCase()} across ${targets.length || 1} target${targets.length === 1 ? "" : "s"}.`,
      queuedAtUtc: now,
      startedAtUtc: now,
      finishedAtUtc: running ? null : shiftMinutes(now, 6),
      batchId: input.batchId,
      totalTargets: targets.length,
      completedTargets: completed,
      failedTargets: 0,
      noFindingsTargets: running ? 0 : Math.max(targets.length - 1, 0),
    }
    state.jobs.unshift(job)
    createdJobs.push(job)

    for (const [index, target] of targets.entries()) {
      const resultStatus = running ? (index === 0 ? "Running" : "Queued") : index === 0 ? "Succeeded" : "NoFindings"
      const findingsCount = index === 0 ? 1 : 0
      state.results.unshift({
        id: nextId(`result-${scannerFamily}`),
        jobId,
        targetId: target.id,
        targetDisplay: resolveTargetName(target),
        scannerFamily,
        status: resultStatus,
        findingsCount,
        startedAtUtc: now,
        finishedAtUtc: running ? null : shiftMinutes(now, 6),
      })

      if (index === 0) {
        state.findings.unshift({
          iocId: nextId("ioc"),
          scannerFamily,
          targetId: target.id,
          targetDisplay: resolveTargetName(target),
          targetIp: target.ipAddress,
          targetOsType: target.targetOsType,
          jobId,
          scanPlanId: input.scanPlanId ?? null,
          ruleName: scannerFamily === "yara" ? "Fresh Binary Sweep Match" : scannerFamily === "sigma" ? "Encoded Command Execution" : "Live Sensor Indicator",
          indicatorValue:
            scannerFamily === "yara"
              ? `${target.targetOsType === "windows" ? "C:\\Temp" : "/tmp"}/demo-match.bin`
              : scannerFamily === "sigma"
                ? "powershell.exe -enc RABlAG0AbwA="
                : target.ipAddress,
          indicatorKind:
            scannerFamily === "yara" ? "file_path" : scannerFamily === "sigma" ? "command_line" : "ip",
          painLevel:
            scannerFamily === "sigma" ? "Ttp" : scannerFamily === "yara" ? "HostArtifact" : "IP",
          severity: scannerFamily === "sigma" ? "Critical" : scannerFamily === "yara" ? "High" : "Medium",
          timestampUtc: now,
          rawPayload: JSON.stringify({
            scannerFamily,
            target: resolveTargetName(target),
            source: "frontend-demo",
          }),
          status: "Detection",
        })
      }
    }
  }

  return createdJobs
}

function buildOverviewSummary() {
  const state = getState()
  return {
    targetCount: state.targets.length,
    iocCount: state.findings.length,
    reportCount: state.reports.length,
    alertCount: Math.max(12, state.findings.length + 6),
  }
}

function buildPainAnalysis(filters: {
  scannerFamily?: string
  targetId?: string
  severity?: string
  fromUtc?: string
  toUtc?: string
}) {
  const state = getState()
  const rows = state.findings.filter((finding) => {
    const matchesScanner = !filters.scannerFamily || finding.scannerFamily.toLowerCase() === filters.scannerFamily.toLowerCase()
    const matchesTarget = !filters.targetId || finding.targetId === filters.targetId
    const matchesSeverity = !filters.severity || finding.severity.toLowerCase() === filters.severity.toLowerCase()
    const timestamp = Date.parse(finding.timestampUtc)
    const matchesFrom = !filters.fromUtc || timestamp >= Date.parse(filters.fromUtc)
    const matchesTo = !filters.toUtc || timestamp <= Date.parse(filters.toUtc)
    return matchesScanner && matchesTarget && matchesSeverity && matchesFrom && matchesTo
  })
  const levels = ["Ttp", "Tool", "HostArtifact", "Domain", "IP", "Hash"]
  const totalCount = rows.length
  const fromUtc = filters.fromUtc ?? shiftMinutes(baseTime, -10_080)
  const toUtc = filters.toUtc ?? baseTime

  return {
    fromUtc,
    toUtc,
    totalCount,
    levels: levels.map((level) => {
      const previewIocs = rows.filter((finding) => finding.painLevel === level).slice(0, 5)
      const count = previewIocs.length === 0 ? rows.filter((finding) => finding.painLevel === level).length : rows.filter((finding) => finding.painLevel === level).length
      return {
        level,
        label: level,
        count,
        share: totalCount === 0 ? 0 : count / totalCount,
        previewIocs,
      }
    }),
    trend: Array.from({ length: 7 }, (_, index) => {
      const bucketDate = shiftMinutes(baseTime, -(6 - index) * 24 * 60)
      const countsByLevel = levels.reduce<Record<string, number>>((acc, level, levelIndex) => {
        const base = rows.filter((finding) => finding.painLevel === level).length
        acc[level] = base === 0 ? 0 : Math.max(0, base - (6 - index) + (levelIndex % 2))
        return acc
      }, {})
      return {
        bucketStartUtc: bucketDate,
        countsByLevel,
      }
    }),
  }
}

function buildReportScope(query: DemoReportDetail["query"]) {
  const parts: string[] = []
  if (query.networkId) parts.push(`Subnet ${query.networkId}`)
  if (query.targetId) parts.push(`Target ${query.targetId}`)
  if (query.jobId) parts.push(`Job ${query.jobId}`)
  if (query.scannerFamily) parts.push(query.scannerFamily.toUpperCase())
  if (query.severity) parts.push(`${query.severity} severity`)
  return parts.length > 0 ? parts.join(" | ") : "Global scope"
}

function buildReportSections(query: DemoReportDetail["query"], reportType: string): DemoSection[] {
  const state = getState()
  const scopedTargets = listScopedTargets({
    networkIds: query.networkId ? [query.networkId] : [],
    targetIds: query.targetId ? [query.targetId] : [],
  })
  const matchingFindings = state.findings.filter((finding) => {
    const matchesJob = !query.jobId || finding.jobId === query.jobId
    const matchesTarget = !query.targetId || finding.targetId === query.targetId
    const matchesScanner = !query.scannerFamily || finding.scannerFamily.toLowerCase() === query.scannerFamily.toLowerCase()
    const matchesSeverity = !query.severity || finding.severity.toLowerCase() === query.severity.toLowerCase()
    const matchesStatus = !query.status || finding.status.toLowerCase() === query.status.toLowerCase()
    const matchesFrom = !query.fromUtc || Date.parse(finding.timestampUtc) >= Date.parse(query.fromUtc)
    const matchesTo = !query.toUtc || Date.parse(finding.timestampUtc) <= Date.parse(query.toUtc)
    const target = finding.targetId ? state.targets.find((item) => item.id === finding.targetId) : null
    const matchesNetwork = !query.networkId || target?.networkId === query.networkId
    return matchesJob && matchesTarget && matchesScanner && matchesSeverity && matchesStatus && matchesFrom && matchesTo && matchesNetwork
  })

  return [
    {
      title: reportType === "TargetExposureSummary" ? "Target Exposure" : "Operational Summary",
      summary: "Frontend-only report snapshot built from the demo legacy pipeline state.",
      metrics: [
        { label: "Targets", value: String(scopedTargets.length || state.targets.length), detail: "Assets in the selected scope." },
        { label: "Findings", value: String(matchingFindings.length), detail: "Normalized IOC rows matched by the report query." },
        { label: "Jobs", value: String(state.jobs.length), detail: "Recent execution history available to the report builder." },
      ],
      highlights: [
        matchingFindings[0]
          ? `Highest-signal sample: ${matchingFindings[0].ruleName} on ${matchingFindings[0].targetDisplay}.`
          : "No findings matched this exact scope, so the report acts as a structural preview.",
        "This report is generated fully in the frontend so the design workflow can keep moving before backend readiness.",
      ],
    },
  ]
}

function downloadContent(fileName: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export const legacyPipelineDemo = {
  listNetworks() {
    return deepCopy(getState().networks)
  },

  createNetwork(input: {
    name: string
    cidrBlock: string
    sshUser?: string
    sshKeyPath?: string
    sshPassword?: string
    notes?: string
  }) {
    const network: DemoNetwork = {
      id: nextId("network"),
      name: input.name.trim() || "New Subnet",
      cidrBlock: input.cidrBlock.trim() || "10.0.0.0/24",
      sshUser: input.sshUser?.trim() || null,
      sshKeyPath: input.sshKeyPath?.trim() || null,
      hasSshPassword: Boolean(input.sshPassword?.trim()),
      notes: input.notes?.trim() || null,
      totalTargets: 0,
      onlineTargets: 0,
      lastSweepAtUtc: null,
    }
    getState().networks.unshift(network)
    recalculateNetworkStats(getState())
    return deepCopy(network)
  },

  updateNetwork(networkId: string, input: {
    name: string
    cidrBlock: string
    sshUser?: string
    sshKeyPath?: string
    sshPassword?: string
    clearSshPassword?: boolean
    notes?: string
  }) {
    const state = getState()
    const network = state.networks.find((item) => item.id === networkId)
    if (!network) {
      throw new Error("Subnet not found.")
    }

    network.name = input.name.trim() || network.name
    network.cidrBlock = input.cidrBlock.trim() || network.cidrBlock
    network.sshUser = input.sshUser?.trim() || null
    network.sshKeyPath = input.sshKeyPath?.trim() || null
    network.hasSshPassword = input.clearSshPassword ? false : input.sshPassword?.trim() ? true : network.hasSshPassword
    network.notes = input.notes?.trim() || null

    state.targets = state.targets.map((target) => target.networkId === networkId ? { ...target, networkName: network.name } : target)
    state.plans = state.plans.map((plan) =>
      plan.networkIds.includes(networkId)
        ? {
            ...plan,
            networkNames: plan.networkIds.map((id) => state.networks.find((item) => item.id === id)?.name ?? id),
          }
        : plan,
    )
    recalculateNetworkStats(state)
    return deepCopy(network)
  },

  discoverNetwork(networkId: string, _input: { actorUserId: string; rangeStartIp?: string; rangeEndIp?: string }) {
    void _input
    const state = getState()
    const network = state.networks.find((item) => item.id === networkId)
    if (!network) {
      throw new Error("Subnet not found.")
    }

    const now = new Date().toISOString()
    state.targets = state.targets.map((target) =>
      target.networkId === networkId ? { ...target, lastSweepAtUtc: now, status: "Online" } : target,
    )

    if (!state.targets.some((target) => target.networkId === networkId && target.ipAddress.endsWith(".31"))) {
      state.targets.push({
        id: nextId("target"),
        networkId: network.id,
        networkName: network.name,
        displayName: `${network.name.split(" ")[0].toUpperCase()}-DISCOVERED`,
        hostname: `${network.name.toLowerCase().replace(/\s+/g, "-")}-31`,
        ipAddress: network.id === "net-corp" ? "10.24.18.31" : "10.24.44.31",
        status: "Online",
        targetOsType: network.id === "net-corp" ? "windows" : "linux",
        lastSweepAtUtc: now,
      })
    }

    recalculateNetworkStats(state)
    return {
      networkId: network.id,
      networkName: network.name,
      requestedCidr: network.cidrBlock,
      totalHosts: state.targets.filter((target) => target.networkId === networkId).length,
      reachableHosts: state.targets.filter((target) => target.networkId === networkId && target.status === "Online").length,
      offlineHosts: state.targets.filter((target) => target.networkId === networkId && target.status !== "Online").length,
      discoveredAtUtc: now,
    }
  },

  deleteNetwork(networkId: string, force?: boolean) {
    const state = getState()
    const network = state.networks.find((item) => item.id === networkId)
    if (!network) {
      throw new Error("Subnet not found.")
    }
    const targetIds = new Set(state.targets.filter((target) => target.networkId === networkId).map((target) => target.id))
    const dependentPlanIds = new Set(state.plans.filter((plan) => plan.networkIds.includes(networkId)).map((plan) => plan.id))
    const detachedJobs = state.jobs.filter((job) => job.scanPlanId && dependentPlanIds.has(job.scanPlanId)).length
    const detachedResults = state.results.filter((result) => result.targetId && targetIds.has(result.targetId)).length
    const detachedReports = Object.values(state.reportDetails).filter((detail) => detail.query.networkId === networkId).length

    state.networks = state.networks.filter((item) => item.id !== networkId)
    state.targets = state.targets.filter((target) => !targetIds.has(target.id))
    state.plans = state.plans.filter((plan) => !dependentPlanIds.has(plan.id))
    state.jobs = state.jobs.map((job) => job.scanPlanId && dependentPlanIds.has(job.scanPlanId) ? { ...job, scanPlanId: null } : job)
    state.results = state.results.map((result) => result.targetId && targetIds.has(result.targetId) ? { ...result, targetId: null } : result)
    state.findings = state.findings.map((finding) =>
      finding.targetId && targetIds.has(finding.targetId)
        ? { ...finding, targetId: null, targetIp: null, targetOsType: null, targetDisplay: `${finding.targetDisplay} (detached)` }
        : finding,
    )

    recalculateNetworkStats(state)

    return {
      networkId,
      networkName: network.name,
      deletedTargets: targetIds.size,
      forced: Boolean(force),
      deletedPlans: dependentPlanIds.size,
      deletedJobs: detachedJobs,
      detachedResults,
      detachedReports,
    }
  },

  listTargets(networkId?: string) {
    const state = getState()
    const rows = networkId ? state.targets.filter((target) => target.networkId === networkId) : state.targets
    return deepCopy(rows)
  },

  updateTarget(targetId: string, input: { displayName?: string | null }) {
    const state = getState()
    const target = state.targets.find((item) => item.id === targetId)
    if (!target) {
      throw new Error("Target not found.")
    }
    target.displayName = input.displayName?.trim() || null
    state.plans = state.plans.map((plan) =>
      plan.targetIds.includes(targetId)
        ? {
            ...plan,
            targetDisplayNames: plan.targetIds.map((id) => {
              const match = state.targets.find((item) => item.id === id)
              return match ? resolveTargetName(match) : id
            }),
          }
        : plan,
    )
    return deepCopy(target)
  },

  listRulePresets() {
    return deepCopy(getState().rulePresets)
  },

  listPlans() {
    return deepCopy(getState().plans)
  },

  createPlan(body: unknown) {
    const state = getState()
    const input = body as Record<string, unknown>
    const now = new Date().toISOString()
    const networkIds = Array.isArray(input.networkIds) ? (input.networkIds as string[]) : []
    const targetIds = Array.isArray(input.targetIds) ? (input.targetIds as string[]) : []
    const plan: DemoPlan = {
      id: nextId("plan"),
      name: String(input.name ?? "New Scan Plan"),
      scannerFamilies: Array.isArray(input.scannerFamilies) ? (input.scannerFamilies as string[]) : [],
      status: String(input.status ?? "Draft"),
      scheduleType: String(input.scheduleType ?? "Manual"),
      rulePathsByFamily: (input.rulePathsByFamily as Record<string, string | null>) ?? {},
      notes: typeof input.notes === "string" ? input.notes : null,
      networkIds,
      targetIds,
      networkNames: networkIds.map((id) => state.networks.find((network) => network.id === id)?.name ?? id),
      targetDisplayNames: targetIds.map((id) => {
        const target = state.targets.find((item) => item.id === id)
        return target ? resolveTargetName(target) : id
      }),
      schedule: (input.schedule as Record<string, string | null>) ?? {},
      options: (input.options as Record<string, string | null>) ?? {},
      nextRunAtUtc: String(input.status ?? "Draft") === "Active" ? shiftMinutes(now, 60) : null,
      lastRunAtUtc: null,
      createdAtUtc: now,
      updatedAtUtc: now,
    }
    state.plans.unshift(plan)
    return deepCopy(plan)
  },

  updatePlan(planId: string, body: unknown) {
    const state = getState()
    const plan = state.plans.find((item) => item.id === planId)
    if (!plan) {
      throw new Error("Plan not found.")
    }
    const input = body as Record<string, unknown>
    const networkIds = Array.isArray(input.networkIds) ? (input.networkIds as string[]) : plan.networkIds
    const targetIds = Array.isArray(input.targetIds) ? (input.targetIds as string[]) : plan.targetIds

    plan.name = String(input.name ?? plan.name)
    plan.scannerFamilies = Array.isArray(input.scannerFamilies) ? (input.scannerFamilies as string[]) : plan.scannerFamilies
    plan.status = String(input.status ?? plan.status)
    plan.scheduleType = String(input.scheduleType ?? plan.scheduleType)
    plan.rulePathsByFamily = (input.rulePathsByFamily as Record<string, string | null>) ?? plan.rulePathsByFamily
    plan.notes = typeof input.notes === "string" ? input.notes : plan.notes
    plan.networkIds = networkIds
    plan.targetIds = targetIds
    plan.networkNames = networkIds.map((id) => state.networks.find((network) => network.id === id)?.name ?? id)
    plan.targetDisplayNames = targetIds.map((id) => {
      const target = state.targets.find((item) => item.id === id)
      return target ? resolveTargetName(target) : id
    })
    plan.schedule = (input.schedule as Record<string, string | null>) ?? plan.schedule
    plan.options = (input.options as Record<string, string | null>) ?? plan.options
    plan.updatedAtUtc = new Date().toISOString()
    plan.nextRunAtUtc = plan.status === "Active" ? shiftMinutes(plan.updatedAtUtc, 60) : null
    return deepCopy(plan)
  },

  clonePlan(planId: string) {
    const state = getState()
    const source = state.plans.find((item) => item.id === planId)
    if (!source) {
      throw new Error("Plan not found.")
    }
    const clone = deepCopy(source)
    clone.id = nextId("plan")
    clone.name = `${source.name} Copy`
    clone.status = "Draft"
    clone.createdAtUtc = new Date().toISOString()
    clone.updatedAtUtc = clone.createdAtUtc
    clone.lastRunAtUtc = null
    clone.nextRunAtUtc = null
    state.plans.unshift(clone)
    return deepCopy(clone)
  },

  deletePlan(planId: string) {
    const state = getState()
    const plan = state.plans.find((item) => item.id === planId)
    if (!plan) {
      throw new Error("Plan not found.")
    }
    const detachedJobs = state.jobs.filter((job) => job.scanPlanId === planId).length
    state.plans = state.plans.filter((item) => item.id !== planId)
    state.jobs = state.jobs.map((job) => job.scanPlanId === planId ? { ...job, scanPlanId: null } : job)
    return {
      planId,
      planName: plan.name,
      detachedJobs,
    }
  },

  runPlan(planId: string) {
    const state = getState()
    const plan = state.plans.find((item) => item.id === planId)
    if (!plan) {
      throw new Error("Plan not found.")
    }
    const batchId = nextId("batch")
    const scopedTargets = listScopedTargets({ networkIds: plan.networkIds, targetIds: plan.targetIds }).map((target) => target.id)
    const jobs = createJobArtifacts({
      scannerFamilies: plan.scannerFamilies,
      triggerType: "Plan",
      scanPlanId: plan.id,
      batchId,
      summaryPrefix: "Queued demo plan run for",
      targetIds: scopedTargets,
    })
    plan.lastRunAtUtc = new Date().toISOString()
    plan.updatedAtUtc = plan.lastRunAtUtc
    plan.nextRunAtUtc = plan.status === "Active" ? shiftMinutes(plan.lastRunAtUtc, 60) : null
    return {
      batchId,
      planId: plan.id,
      jobs: deepCopy(jobs),
    }
  },

  createCustomScan(input: {
    scannerFamilies: string[]
    networkIds: string[]
    targetIds: string[]
  }) {
    const batchId = nextId("batch")
    const targets = listScopedTargets({ networkIds: input.networkIds, targetIds: input.targetIds }).map((target) => target.id)
    const jobs = createJobArtifacts({
      scannerFamilies: input.scannerFamilies,
      triggerType: "Manual",
      batchId,
      summaryPrefix: "Queued ad hoc scan for",
      targetIds: targets,
    })
    return {
      batchId,
      jobs: deepCopy(jobs),
    }
  },

  listJobs() {
    return deepCopy(getState().jobs)
  },

  stopJob(jobId: string) {
    const state = getState()
    const job = state.jobs.find((item) => item.id === jobId)
    if (!job) {
      throw new Error("Job not found.")
    }
    const finishedAtUtc = new Date().toISOString()
    job.status = "Stopped"
    job.finishedAtUtc = finishedAtUtc
    job.summary = `${job.summary.replace(/\.$/, "")}. Stopped by frontend demo control.`
    state.results = state.results.map((result) =>
      result.jobId === jobId && result.status === "Running"
        ? { ...result, status: "Stopped", finishedAtUtc }
        : result,
    )
    return deepCopy(job)
  },

  listResults(filters: {
    jobId?: string
    targetId?: string
    limit?: number
    scannerFamily?: string
    status?: string
    includeOrphaned?: boolean
  }) {
    const state = getState()
    let rows = state.results.filter((result) => {
      const matchesJob = !filters.jobId || result.jobId === filters.jobId
      const matchesTarget = !filters.targetId || result.targetId === filters.targetId
      const matchesScanner = !filters.scannerFamily || result.scannerFamily.toLowerCase() === filters.scannerFamily.toLowerCase()
      const matchesStatus = !filters.status || result.status.toLowerCase() === filters.status.toLowerCase()
      const matchesOrphaned = filters.includeOrphaned ? true : result.targetId !== null
      return matchesJob && matchesTarget && matchesScanner && matchesStatus && matchesOrphaned
    })
    if (typeof filters.limit === "number") {
      rows = rows.slice(0, filters.limit)
    }
    return deepCopy(rows)
  },

  listIocFindings(filters: {
    scannerFamily?: string
    targetId?: string
    severity?: string
    fromUtc?: string
    toUtc?: string
    q?: string
    painLevel?: string
    page?: number
    pageSize?: number
  }) {
    const state = getState()
    const query = filters.q?.trim().toLowerCase()
    const filtered = state.findings.filter((finding) => {
      const matchesScanner = !filters.scannerFamily || finding.scannerFamily.toLowerCase() === filters.scannerFamily.toLowerCase()
      const matchesTarget = !filters.targetId || finding.targetId === filters.targetId
      const matchesSeverity = !filters.severity || finding.severity.toLowerCase() === filters.severity.toLowerCase()
      const matchesPainLevel = !filters.painLevel || finding.painLevel.toLowerCase() === filters.painLevel.toLowerCase()
      const matchesFrom = !filters.fromUtc || Date.parse(finding.timestampUtc) >= Date.parse(filters.fromUtc)
      const matchesTo = !filters.toUtc || Date.parse(finding.timestampUtc) <= Date.parse(filters.toUtc)
      const haystack = [
        finding.ruleName,
        finding.indicatorValue,
        finding.indicatorKind,
        finding.targetDisplay,
        finding.rawPayload ?? "",
      ].join(" ").toLowerCase()
      const matchesQuery = !query || haystack.includes(query)
      return matchesScanner && matchesTarget && matchesSeverity && matchesPainLevel && matchesFrom && matchesTo && matchesQuery
    })
    const page = Math.max(filters.page ?? 1, 1)
    const pageSize = Math.max(filters.pageSize ?? 100, 1)
    const start = (page - 1) * pageSize
    return {
      items: deepCopy(filtered.slice(start, start + pageSize)),
      totalCount: filtered.length,
      page,
      pageSize,
      availableSeverities: Array.from(new Set(state.findings.map((finding) => finding.severity))),
    }
  },

  getIocFindingDetail(iocId: string) {
    const state = getState()
    const finding = state.findings.find((item) => item.iocId === iocId)
    if (!finding) {
      throw new Error("IOC detail not found.")
    }
    const target = finding.targetId ? state.targets.find((item) => item.id === finding.targetId) ?? null : null
    const job = finding.jobId ? state.jobs.find((item) => item.id === finding.jobId) ?? null : null
    return deepCopy({
      ...finding,
      target: target
        ? {
            id: target.id,
            display: resolveTargetName(target),
            hostname: target.hostname,
            ipAddress: target.ipAddress,
            status: target.status,
            targetOsType: target.targetOsType,
          }
        : null,
      relatedScan: job
        ? {
            jobId: job.id,
            scanPlanId: job.scanPlanId,
            scannerFamily: job.scannerFamily,
            executionMode: job.executionMode,
            triggerType: job.triggerType,
            status: job.status,
            queuedAtUtc: job.queuedAtUtc,
            startedAtUtc: job.startedAtUtc,
            finishedAtUtc: job.finishedAtUtc,
          }
        : null,
      yaraDetail: finding.scannerFamily === "yara"
        ? {
            filePath: finding.indicatorValue,
            fileHash: "3bb0e4d91f4e9b92a-demo",
          }
        : null,
      sigmaDetail: finding.scannerFamily === "sigma"
        ? {
            logSource: "Microsoft-Windows-PowerShell/Operational",
            severity: finding.severity,
            commandLine: finding.indicatorValue,
          }
        : null,
      networkDetail: finding.scannerFamily === "snort" || finding.scannerFamily === "suricata"
        ? {
            sourceIp: target?.ipAddress ?? "10.24.44.11",
            destIp: "198.51.100.20",
            protocol: "tcp",
            severity: finding.severity,
            flowId: 9981,
          }
        : null,
    })
  },

  getPainAnalysis(filters: {
    scannerFamily?: string
    targetId?: string
    severity?: string
    fromUtc?: string
    toUtc?: string
  }) {
    return deepCopy(buildPainAnalysis(filters))
  },

  getOverviewSummary() {
    return deepCopy(buildOverviewSummary())
  },

  listReports() {
    return deepCopy(getState().reports)
  },

  getReportDetail(reportId: string) {
    const report = getState().reportDetails[reportId]
    if (!report) {
      throw new Error("Saved report not found.")
    }
    return deepCopy(report)
  },

  generateReport(body: unknown) {
    const input = body as Record<string, unknown>
    const now = new Date().toISOString()
    const query = {
      jobId: typeof input.jobId === "string" ? input.jobId : null,
      targetId: typeof input.targetId === "string" ? input.targetId : null,
      networkId: typeof input.networkId === "string" ? input.networkId : null,
      scannerFamily: typeof input.scannerFamily === "string" ? input.scannerFamily : null,
      fromUtc: typeof input.fromUtc === "string" ? input.fromUtc : null,
      toUtc: typeof input.toUtc === "string" ? input.toUtc : null,
      severity: typeof input.severity === "string" ? input.severity : null,
      status: typeof input.status === "string" ? input.status : null,
    }
    const reportType = typeof input.reportType === "string" ? input.reportType : "ExecutiveSummary"
    const title = typeof input.title === "string" && input.title.trim() ? input.title.trim() : `${reportType} Preview`
    const scope = buildReportScope(query)
    const sections = buildReportSections(query, reportType)
    const persist = Boolean(input.persist)

    let persistedReport: DemoReportRecord | null = null
    if (persist) {
      const reportId = nextId("report")
      persistedReport = {
        id: reportId,
        title,
        reportType,
        scope,
        createdAtUtc: now,
        pdfDownloadPath: makeArtifactPath(reportId, "pdf"),
        csvDownloadPath: makeArtifactPath(reportId, "csv"),
        status: "Ready",
      }
      getState().reports.unshift(persistedReport)
      getState().reportDetails[reportId] = {
        id: reportId,
        title,
        reportType,
        scope,
        createdAtUtc: now,
        query,
        sections,
        pdfDownloadPath: persistedReport.pdfDownloadPath,
        csvDownloadPath: persistedReport.csvDownloadPath,
        status: persistedReport.status,
      }
    }

    return deepCopy({
      title,
      reportType,
      scope,
      generatedAtUtc: now,
      query,
      sections,
      persistedReport,
    })
  },

  deleteReport(reportId: string) {
    const state = getState()
    const report = state.reports.find((item) => item.id === reportId)
    if (!report) {
      throw new Error("Saved report not found.")
    }
    state.reports = state.reports.filter((item) => item.id !== reportId)
    delete state.reportDetails[reportId]
    return {
      id: report.id,
      title: report.title,
      deletedFiles: 2,
    }
  },

  downloadReportArtifact(path: string, fallbackFileName: string) {
    const reportId = path.split("/").pop()?.split(".")[0] ?? fallbackFileName
    const format = path.toLowerCase().endsWith(".csv") ? "csv" : "pdf"
    if (format === "csv") {
      downloadContent(`${reportId}.csv`, "title,status\nFrontend Demo,Ready\n", "text/csv;charset=utf-8")
      return
    }
    downloadContent(`${reportId}.pdf`, `Demo report artifact for ${reportId}`, "application/pdf")
  },
}
