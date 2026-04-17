module.exports = [
"[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "badgeVariants",
    ()=>badgeVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$merge$2d$props$2f$mergeProps$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/merge-props/mergeProps.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$use$2d$render$2f$useRender$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/use-render/useRender.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
;
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cva"])("group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
            secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
            destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
            outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
            ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
            link: "text-primary underline-offset-4 hover:underline"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Badge({ className, variant = "default", render, ...props }) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$use$2d$render$2f$useRender$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRender"])({
        defaultTagName: "span",
        props: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$merge$2d$props$2f$mergeProps$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mergeProps"])({
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
                variant
            }), className)
        }, props),
        render,
        state: {
            slot: "badge",
            variant
        }
    });
}
;
}),
"[project]/src/components/workbench/status-badge.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STATUS_TONE_BY_KEY",
    ()=>STATUS_TONE_BY_KEY,
    "StatusBadge",
    ()=>StatusBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-ssr] (ecmascript)");
;
;
const STATUS_TONE_BY_KEY = {
    passing: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    pass: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    approved: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    accepted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    deployed: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    promoted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    promote: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    healthy: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    open: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    proposed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    parsed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    validated: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    completed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    queued: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    running: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    canary: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    shadow: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    watch: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    awaitingapproval: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    needsreview: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    requestchanges: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    warning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    error: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    note: "border-border/80 bg-surface-2/80 text-muted-foreground",
    fullengine: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    heuristic: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    notavailable: "border-border/80 bg-surface-2/80 text-muted-foreground",
    high: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    medium: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    low: "border-violet-300/30 bg-violet-400/10 text-violet-100",
    critical: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    failing: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    fail: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rejected: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rollback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rolledback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rollbackready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    blocked: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    disabled: "border-border/80 bg-surface-2/80 text-muted-foreground",
    retired: "border-border/80 bg-surface-2/80 text-muted-foreground",
    notrun: "border-border/80 bg-surface-2/80 text-muted-foreground",
    needstuning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    ready: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    notready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    monitoring: "border-border/80 bg-surface-2/80 text-muted-foreground",
    notscheduled: "border-border/80 bg-surface-2/80 text-muted-foreground",
    yara: "border-violet-300/30 bg-violet-400/10 text-violet-100",
    sigma: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    snort: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    suricata: "border-sky-300/35 bg-sky-400/12 text-sky-200"
};
const DISPLAY_LABEL_BY_KEY = {
    yara: "YARA",
    sigma: "Sigma",
    snort: "Snort",
    suricata: "Suricata"
};
function normalize(value) {
    return value.replace(/\s|_|-/g, "").toLowerCase();
}
function formatStatusLabel(value) {
    const normalized = normalize(value);
    const mapped = DISPLAY_LABEL_BY_KEY[normalized];
    if (mapped) {
        return mapped;
    }
    if (value.includes(" ")) {
        return value;
    }
    return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (match)=>match.toUpperCase());
}
function StatusBadge({ value }) {
    const normalized = normalize(value);
    const tone = STATUS_TONE_BY_KEY[normalized] ?? "border-border/80 bg-surface-2/80 text-muted-foreground";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Badge"], {
        variant: "outline",
        className: `rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${tone}`,
        children: formatStatusLabel(value)
    }, void 0, false, {
        fileName: "[project]/src/components/workbench/status-badge.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/shared/modules/operations-foundation.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OPERATIONS_SUBPAGES",
    ()=>OPERATIONS_SUBPAGES,
    "buildScannerCoverageRollup",
    ()=>buildScannerCoverageRollup,
    "buildSubnetRollups",
    ()=>buildSubnetRollups,
    "deriveServerRiskSummary",
    ()=>deriveServerRiskSummary,
    "findServerById",
    ()=>findServerById,
    "getOperationsVm",
    ()=>getOperationsVm,
    "groupServersBy",
    ()=>groupServersBy,
    "resolveSubnet",
    ()=>resolveSubnet
]);
const OPERATIONS_SUBPAGES = [
    {
        key: "inventory",
        label: "Server Inventory",
        href: "/servers",
        title: "Server Inventory",
        description: "Live infrastructure inventory with health, telemetry posture, scanner coverage, and linked alerts."
    },
    {
        key: "subnets",
        label: "Subnets",
        href: "/servers/subnets",
        title: "Subnets",
        description: "Network segmentation and capacity posture with operational reassignment controls."
    },
    {
        key: "asset-groups",
        label: "Asset Groups",
        href: "/servers/asset-groups",
        title: "Asset Groups",
        description: "Policy-aligned infrastructure cohorts with coverage and alert-link context."
    },
    {
        key: "scanner-fleet",
        label: "Scanner Fleet",
        href: "/servers/scanner-fleet",
        title: "Scanner Fleet",
        description: "Fleet health, assignment scope, queue pressure, and coverage confidence across scanning nodes."
    }
];
const SUBNETS = [
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
        notes: "Public-facing ingress and reverse proxy tier."
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
        notes: "Core workloads and database dependencies for alert processing."
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
        notes: "Staging edge and canary validation services."
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
        notes: "ICS lab and parser test appliances."
    }
];
const SERVERS = [
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
            {
                id: "DET-6612",
                title: "DNS Tunneling Burst"
            },
            {
                id: "DET-7789",
                title: "JA3 Beacon Outlier"
            }
        ],
        linkedCases: [
            {
                id: "AL-4412",
                title: "Finance edge egress anomaly"
            },
            {
                id: "AL-4529",
                title: "Beacon channel variance spike"
            }
        ],
        linkedRules: [
            {
                id: "SIG-2041",
                title: "PowerShell Credential Artifact Sweep"
            },
            {
                id: "SNO-6102",
                title: "TLS JA3 C2 Beacon Burst"
            }
        ],
        scannerAssignments: [
            {
                scannerId: "scn-edge-1",
                scannerName: "edge-scan-eu-01",
                lastScanAtUtc: "2026-03-15T05:18:00.000Z",
                coveragePercent: 100
            }
        ],
        lastHeartbeatUtc: "2026-03-15T06:31:00.000Z",
        updatedAtUtc: "2026-03-15T06:33:00.000Z"
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
            {
                id: "DET-8822",
                title: "Credential Dump Sequence"
            },
            {
                id: "DET-9910",
                title: "LSASS Memory Access Pattern"
            }
        ],
        linkedCases: [
            {
                id: "AL-4307",
                title: "Credential access staging"
            }
        ],
        linkedRules: [
            {
                id: "YAR-8821",
                title: "Lumma Stealer Staging Buffer"
            }
        ],
        scannerAssignments: [
            {
                scannerId: "scn-core-2",
                scannerName: "core-scan-us-02",
                lastScanAtUtc: "2026-03-15T03:45:00.000Z",
                coveragePercent: 74
            }
        ],
        lastHeartbeatUtc: "2026-03-15T05:58:00.000Z",
        updatedAtUtc: "2026-03-15T06:10:00.000Z"
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
        linkedDetections: [
            {
                id: "DET-7101",
                title: "Kerberos Ticket Spray"
            }
        ],
        linkedCases: [
            {
                id: "AL-4178",
                title: "Privilege escalation watch"
            }
        ],
        linkedRules: [
            {
                id: "SIG-1652",
                title: "Credential Material Export"
            }
        ],
        scannerAssignments: [
            {
                scannerId: "scn-core-1",
                scannerName: "core-scan-us-01",
                lastScanAtUtc: "2026-03-15T04:52:00.000Z",
                coveragePercent: 68
            }
        ],
        lastHeartbeatUtc: "2026-03-15T06:35:00.000Z",
        updatedAtUtc: "2026-03-15T06:36:00.000Z"
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
        linkedDetections: [
            {
                id: "DET-5112",
                title: "Canary parser anomaly"
            }
        ],
        linkedCases: [
            {
                id: "AL-4510",
                title: "Canary rollout validation"
            }
        ],
        linkedRules: [
            {
                id: "YAR-9014",
                title: "Packed Loader Mutex Cluster"
            }
        ],
        scannerAssignments: [
            {
                scannerId: "scn-edge-2",
                scannerName: "edge-scan-eu-02",
                lastScanAtUtc: "2026-03-15T05:04:00.000Z",
                coveragePercent: 61
            }
        ],
        lastHeartbeatUtc: "2026-03-15T06:20:00.000Z",
        updatedAtUtc: "2026-03-15T06:21:00.000Z"
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
        linkedDetections: [
            {
                id: "DET-6211",
                title: "Queue depth drift"
            }
        ],
        linkedCases: [
            {
                id: "AL-4491",
                title: "Staging worker telemetry delay"
            }
        ],
        linkedRules: [
            {
                id: "SUR-7822",
                title: "Suricata JA3 Burst Detector"
            }
        ],
        scannerAssignments: [
            {
                scannerId: "scn-stg-1",
                scannerName: "stg-scan-01",
                lastScanAtUtc: "2026-03-15T05:41:00.000Z",
                coveragePercent: 63
            }
        ],
        lastHeartbeatUtc: "2026-03-15T06:03:00.000Z",
        updatedAtUtc: "2026-03-15T06:04:00.000Z"
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
        linkedDetections: [
            {
                id: "DET-3312",
                title: "Agent heartbeat loss"
            }
        ],
        linkedCases: [
            {
                id: "AL-4457",
                title: "OT lab blind spot"
            }
        ],
        linkedRules: [
            {
                id: "FDR-224",
                title: "Beacon Interval Outlier"
            }
        ],
        scannerAssignments: [],
        lastHeartbeatUtc: "2026-03-14T21:12:00.000Z",
        updatedAtUtc: "2026-03-15T05:57:00.000Z"
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
        linkedDetections: [
            {
                id: "DET-3308",
                title: "Ingestion parser crash loop"
            }
        ],
        linkedCases: [
            {
                id: "AL-4488",
                title: "Parser pipeline instability"
            }
        ],
        linkedRules: [
            {
                id: "FDR-411",
                title: "Suspicious Credential Export Chain"
            }
        ],
        scannerAssignments: [],
        lastHeartbeatUtc: "2026-03-15T01:14:00.000Z",
        updatedAtUtc: "2026-03-15T05:50:00.000Z"
    }
];
const ASSET_GROUPS = [
    {
        id: "ag-finance-edge",
        name: "Finance Edge Workloads",
        policyProfile: "Strict Egress + Full Packet Telemetry",
        ownerTeam: "Network Defense",
        environment: "Production",
        scannerCompliancePercent: 94,
        memberServerIds: [
            "srv-gateway-01",
            "srv-auth-02"
        ],
        linkedDetections: [
            {
                id: "DET-6612",
                title: "DNS Tunneling Burst"
            },
            {
                id: "DET-7101",
                title: "Kerberos Ticket Spray"
            }
        ],
        linkedCases: [
            {
                id: "AL-4412",
                title: "Finance edge egress anomaly"
            }
        ]
    },
    {
        id: "ag-credential-plane",
        name: "Credential Control Plane",
        policyProfile: "Identity Hardening + Memory Guardrails",
        ownerTeam: "Identity Operations",
        environment: "Production",
        scannerCompliancePercent: 82,
        memberServerIds: [
            "srv-collector-03",
            "srv-auth-02"
        ],
        linkedDetections: [
            {
                id: "DET-8822",
                title: "Credential Dump Sequence"
            }
        ],
        linkedCases: [
            {
                id: "AL-4307",
                title: "Credential access staging"
            }
        ]
    },
    {
        id: "ag-canary-lab",
        name: "Canary Validation Lab",
        policyProfile: "Staged Rollout + Aggressive Scanner Sampling",
        ownerTeam: "Platform Engineering",
        environment: "Staging",
        scannerCompliancePercent: 68,
        memberServerIds: [
            "srv-stg-api-05",
            "srv-stg-worker-08"
        ],
        linkedDetections: [
            {
                id: "DET-5112",
                title: "Canary parser anomaly"
            }
        ],
        linkedCases: [
            {
                id: "AL-4510",
                title: "Canary rollout validation"
            }
        ]
    },
    {
        id: "ag-ot-research",
        name: "OT Research Segment",
        policyProfile: "Constrained Telemetry + Manual Approval",
        ownerTeam: "Detection Engineering",
        environment: "Development",
        scannerCompliancePercent: 22,
        memberServerIds: [
            "srv-dev-lab-02",
            "srv-dev-parser-04"
        ],
        linkedDetections: [
            {
                id: "DET-3312",
                title: "Agent heartbeat loss"
            }
        ],
        linkedCases: [
            {
                id: "AL-4457",
                title: "OT lab blind spot"
            }
        ]
    }
];
const SCANNER_FLEET = [
    {
        id: "scn-edge-1",
        name: "edge-scan-eu-01",
        mode: "Hybrid",
        health: "Healthy",
        assignedSubnetIds: [
            "snet-prod-dmz",
            "snet-stg-edge"
        ],
        queueDepth: 14,
        uptimePercent: 99.3,
        coveragePercent: 97,
        lastHeartbeatUtc: "2026-03-15T06:34:00.000Z",
        latestVersion: "4.17.2"
    },
    {
        id: "scn-core-1",
        name: "core-scan-us-01",
        mode: "Scheduled",
        health: "Healthy",
        assignedSubnetIds: [
            "snet-prod-core"
        ],
        queueDepth: 21,
        uptimePercent: 98.8,
        coveragePercent: 84,
        lastHeartbeatUtc: "2026-03-15T06:29:00.000Z",
        latestVersion: "4.17.2"
    },
    {
        id: "scn-core-2",
        name: "core-scan-us-02",
        mode: "Hybrid",
        health: "Degraded",
        assignedSubnetIds: [
            "snet-prod-core"
        ],
        queueDepth: 39,
        uptimePercent: 95.2,
        coveragePercent: 72,
        lastHeartbeatUtc: "2026-03-15T06:12:00.000Z",
        latestVersion: "4.16.9"
    },
    {
        id: "scn-stg-1",
        name: "stg-scan-01",
        mode: "On-demand",
        health: "Offline",
        assignedSubnetIds: [
            "snet-stg-edge",
            "snet-dev-ot"
        ],
        queueDepth: 0,
        uptimePercent: 81.6,
        coveragePercent: 46,
        lastHeartbeatUtc: "2026-03-15T01:55:00.000Z",
        latestVersion: "4.15.5"
    }
];
const SERVER_DETAILS_BY_ID = {
    "srv-gateway-01": {
        serverId: "srv-gateway-01",
        timeline: [
            {
                id: "t1",
                title: "Beacon outlier promoted to alert linkage",
                detail: "JA3 beacon burst crossed baseline threshold and linked to AL-4529.",
                source: "Alert Link",
                tone: "warning",
                whenUtc: "2026-03-15T04:58:00.000Z"
            },
            {
                id: "t2",
                title: "Policy gate passed",
                detail: "Outbound DNS canary policy validated in production DMZ.",
                source: "Policy",
                tone: "success",
                whenUtc: "2026-03-15T05:42:00.000Z"
            },
            {
                id: "t3",
                title: "Scanner cycle complete",
                detail: "edge-scan-eu-01 completed deep scan with no critical findings.",
                source: "Scanner",
                tone: "default",
                whenUtc: "2026-03-15T05:18:00.000Z"
            }
        ],
        riskSummary: {
            score: 77,
            severity: "High",
            drivers: [
                {
                    label: "External exposure",
                    value: 89
                },
                {
                    label: "Alert linkage pressure",
                    value: 81
                },
                {
                    label: "Telemetry confidence",
                    value: 58
                }
            ],
            recommendation: "Increase DNS egress anomaly sampling and maintain 100% scanner coverage."
        },
        deploymentSummary: {
            stage: "Stable",
            lastChangeUtc: "2026-03-15T05:42:00.000Z",
            note: "Latest policy package promoted after canary acceptance."
        },
        scannerHistory: [
            {
                id: "sh1",
                scannerName: "edge-scan-eu-01",
                outcome: "Watch",
                note: "Low-confidence suspicious JA3 interval observed.",
                whenUtc: "2026-03-15T03:41:00.000Z"
            },
            {
                id: "sh2",
                scannerName: "edge-scan-eu-01",
                outcome: "Clean",
                note: "Post-policy scan returned below-risk baseline.",
                whenUtc: "2026-03-15T05:18:00.000Z"
            }
        ]
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
                whenUtc: "2026-03-15T05:33:00.000Z"
            },
            {
                id: "t2",
                title: "Canary parser deployed",
                detail: "Deployment moved to canary to validate parsing stability.",
                source: "Deployment",
                tone: "default",
                whenUtc: "2026-03-15T04:47:00.000Z"
            }
        ],
        riskSummary: {
            score: 91,
            severity: "Critical",
            drivers: [
                {
                    label: "Credential detection pressure",
                    value: 93
                },
                {
                    label: "Telemetry lag",
                    value: 87
                },
                {
                    label: "Scanner confidence",
                    value: 64
                }
            ],
            recommendation: "Restore telemetry SLA first, then expand scanner sampling to full coverage."
        },
        deploymentSummary: {
            stage: "Canary",
            lastChangeUtc: "2026-03-15T04:47:00.000Z",
            note: "Awaiting canary acceptance before promotion."
        },
        scannerHistory: [
            {
                id: "sh1",
                scannerName: "core-scan-us-02",
                outcome: "Action Required",
                note: "Credential extraction pattern matched high-confidence signature.",
                whenUtc: "2026-03-15T03:45:00.000Z"
            }
        ]
    }
};
const OPERATIONS_VM = {
    generatedAtUtc: "2026-03-15T06:40:00.000Z",
    servers: SERVERS,
    subnets: SUBNETS,
    assetGroups: ASSET_GROUPS,
    scannerFleet: SCANNER_FLEET,
    serverDetailsById: SERVER_DETAILS_BY_ID,
    defaults: {
        groupBy: "subnet"
    }
};
function healthWeight(status) {
    if (status === "Healthy") return 0;
    if (status === "Degraded") return 1;
    return 2;
}
function cloneServer(server) {
    return {
        ...server,
        linkedDetections: server.linkedDetections.map((item)=>({
                ...item
            })),
        linkedCases: server.linkedCases.map((item)=>({
                ...item
            })),
        linkedRules: server.linkedRules.map((item)=>({
                ...item
            })),
        scannerAssignments: server.scannerAssignments.map((item)=>({
                ...item
            }))
    };
}
function cloneServerDetail(detail) {
    return {
        ...detail,
        timeline: detail.timeline.map((item)=>({
                ...item
            })),
        riskSummary: {
            ...detail.riskSummary,
            drivers: detail.riskSummary.drivers.map((driver)=>({
                    ...driver
                }))
        },
        deploymentSummary: {
            ...detail.deploymentSummary
        },
        scannerHistory: detail.scannerHistory.map((item)=>({
                ...item
            }))
    };
}
function getOperationsVm() {
    return {
        generatedAtUtc: OPERATIONS_VM.generatedAtUtc,
        servers: OPERATIONS_VM.servers.map(cloneServer),
        subnets: OPERATIONS_VM.subnets.map((item)=>({
                ...item
            })),
        assetGroups: OPERATIONS_VM.assetGroups.map((item)=>({
                ...item,
                linkedCases: item.linkedCases.map((row)=>({
                        ...row
                    })),
                linkedDetections: item.linkedDetections.map((row)=>({
                        ...row
                    })),
                memberServerIds: item.memberServerIds.slice()
            })),
        scannerFleet: OPERATIONS_VM.scannerFleet.map((item)=>({
                ...item,
                assignedSubnetIds: item.assignedSubnetIds.slice()
            })),
        serverDetailsById: Object.fromEntries(Object.entries(OPERATIONS_VM.serverDetailsById).map(([key, value])=>[
                key,
                cloneServerDetail(value)
            ])),
        defaults: {
            ...OPERATIONS_VM.defaults
        }
    };
}
function groupServersBy(servers, subnets, groupBy) {
    const subnetById = new Map(subnets.map((item)=>[
            item.id,
            item
        ]));
    const groups = new Map();
    for (const server of servers){
        const groupLabel = groupBy === "subnet" ? subnetById.get(server.subnetId)?.name ?? "Unassigned Subnet" : groupBy === "environment" ? `${server.environment} Environment` : `${server.criticality}`;
        groups.set(groupLabel, [
            ...groups.get(groupLabel) ?? [],
            server
        ]);
    }
    return Array.from(groups.entries()).map(([label, groupedServers])=>({
            key: label.toLowerCase().replace(/\s+/g, "-"),
            label,
            servers: groupedServers.slice().sort((left, right)=>healthWeight(right.health) - healthWeight(left.health) || left.hostname.localeCompare(right.hostname))
        })).sort((left, right)=>left.label.localeCompare(right.label));
}
function buildSubnetRollups(servers, subnets) {
    const rollups = Object.fromEntries(subnets.map((subnet)=>[
            subnet.id,
            {
                subnetId: subnet.id,
                serverCount: 0,
                missionCriticalCount: 0,
                unhealthyCount: 0,
                telemetryMissingCount: 0
            }
        ]));
    for (const server of servers){
        const rollup = rollups[server.subnetId];
        if (!rollup) {
            continue;
        }
        rollup.serverCount += 1;
        if (server.criticality === "Mission Critical") {
            rollup.missionCriticalCount += 1;
        }
        if (server.health !== "Healthy") {
            rollup.unhealthyCount += 1;
        }
        if (server.telemetryStatus === "Missing") {
            rollup.telemetryMissingCount += 1;
        }
    }
    return rollups;
}
function buildScannerCoverageRollup(servers) {
    const fullCoverageCount = servers.filter((server)=>server.scannerCoverage === "Full").length;
    const partialCoverageCount = servers.filter((server)=>server.scannerCoverage === "Partial").length;
    const noCoverageCount = servers.filter((server)=>server.scannerCoverage === "None").length;
    return {
        totalServers: servers.length,
        fullCoverageCount,
        partialCoverageCount,
        noCoverageCount
    };
}
function findServerById(servers, serverId) {
    return servers.find((server)=>server.id === serverId) ?? null;
}
function resolveSubnet(serversSubnets, subnetId) {
    return serversSubnets.find((subnet)=>subnet.id === subnetId) ?? null;
}
function deriveServerRiskSummary(server, detail) {
    if (detail) {
        return detail.riskSummary;
    }
    const severityScore = {
        Critical: 90,
        High: 76,
        Medium: 58,
        Low: 37
    };
    const envModifier = {
        Production: 8,
        Staging: 3,
        Development: 0
    };
    const score = Math.min(99, severityScore[server.riskSeverity] + envModifier[server.environment]);
    return {
        score,
        severity: server.riskSeverity,
        drivers: [
            {
                label: "Asset criticality pressure",
                value: server.criticality === "Mission Critical" ? 88 : 61
            },
            {
                label: "Telemetry posture",
                value: server.telemetryStatus === "Missing" ? 84 : server.telemetryStatus === "Delayed" ? 63 : 37
            },
            {
                label: "Scanner coverage assurance",
                value: server.scannerCoverage === "Full" ? 30 : server.scannerCoverage === "Partial" ? 59 : 82
            }
        ],
        recommendation: "Run targeted scan and validate detection-to-alert linkage integrity."
    };
}
}),
"[project]/src/components/workbench/operations/operations-module-page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "OperationsModulePage",
    ()=>OperationsModulePage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/status-badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/sheet.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/modules/operations-foundation.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/motion.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
const GROUP_OPTIONS = [
    {
        key: "subnet",
        label: "Subnet"
    },
    {
        key: "environment",
        label: "Environment"
    },
    {
        key: "criticality",
        label: "Criticality"
    }
];
function toId(prefix, value) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    return `${prefix}-${normalized}`;
}
function buildDefaultServerDraft(subnetId) {
    return {
        hostname: "",
        ipv4: "",
        os: "Ubuntu 24.04 LTS",
        ownerTeam: "",
        subnetId,
        environment: "Production",
        criticality: "Business Critical",
        health: "Healthy",
        telemetryStatus: "Healthy",
        scannerCoverage: "Partial",
        riskSeverity: "Medium"
    };
}
function buildDefaultSubnetDraft() {
    return {
        name: "",
        cidr: "",
        gateway: "",
        zone: "DMZ",
        environment: "Production",
        capacity: "120"
    };
}
function hasServerFormErrors(draft) {
    return !draft.hostname.trim() || !draft.ipv4.trim() || !draft.ownerTeam.trim() || !draft.subnetId;
}
function hasSubnetFormErrors(draft) {
    return !draft.name.trim() || !draft.cidr.trim() || !draft.gateway.trim() || Number.isNaN(Number(draft.capacity));
}
function environmentTint(value) {
    if (value >= 80) return "text-rose-200";
    if (value >= 60) return "text-amber-200";
    return "text-emerald-200";
}
function OperationsModulePage({ subpageKey }) {
    const vm = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getOperationsVm"])(), []);
    const [servers, setServers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(vm.servers);
    const [subnets, setSubnets] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(vm.subnets);
    const [scannerFleet, setScannerFleet] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(vm.scannerFleet);
    const [assetGroups] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(vm.assetGroups);
    const [groupBy, setGroupBy] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(vm.defaults.groupBy);
    const [addServerOpen, setAddServerOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editServerId, setEditServerId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [addSubnetOpen, setAddSubnetOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [removeSubnetId, setRemoveSubnetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [serverDraft, setServerDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>buildDefaultServerDraft(vm.subnets[0]?.id ?? ""));
    const [editDraft, setEditDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>buildDefaultServerDraft(vm.subnets[0]?.id ?? ""));
    const [subnetDraft, setSubnetDraft] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>buildDefaultSubnetDraft());
    const [reassignSubnetId, setReassignSubnetId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const copy = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OPERATIONS_SUBPAGES"].find((item)=>item.key === subpageKey) ?? __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OPERATIONS_SUBPAGES"][0];
    const groupedServers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["groupServersBy"])(servers, subnets, groupBy), [
        servers,
        subnets,
        groupBy
    ]);
    const subnetRollups = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildSubnetRollups"])(servers, subnets), [
        servers,
        subnets
    ]);
    const coverage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["buildScannerCoverageRollup"])(servers), [
        servers
    ]);
    const editServer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>servers.find((item)=>item.id === editServerId) ?? null, [
        servers,
        editServerId
    ]);
    const removeSubnet = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>subnets.find((item)=>item.id === removeSubnetId) ?? null, [
        subnets,
        removeSubnetId
    ]);
    const attachedServers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>removeSubnet ? servers.filter((server)=>server.subnetId === removeSubnet.id) : [], [
        removeSubnet,
        servers
    ]);
    const unhealthyCount = servers.filter((item)=>item.health !== "Healthy").length;
    const telemetryGaps = servers.filter((item)=>item.telemetryStatus !== "Healthy").length;
    const criticalCount = servers.filter((item)=>item.criticality === "Mission Critical").length;
    function openEdit(server) {
        setEditServerId(server.id);
        setEditDraft({
            hostname: server.hostname,
            ipv4: server.ipv4,
            os: server.os,
            ownerTeam: server.ownerTeam,
            subnetId: server.subnetId,
            environment: server.environment,
            criticality: server.criticality,
            health: server.health,
            telemetryStatus: server.telemetryStatus,
            scannerCoverage: server.scannerCoverage,
            riskSeverity: server.riskSeverity
        });
        setMessage(null);
    }
    function submitAddServer() {
        if (hasServerFormErrors(serverDraft)) {
            setMessage("Add server failed: hostname, IP, owner team, and subnet are required.");
            return;
        }
        const nextServer = {
            id: toId("srv", serverDraft.hostname),
            hostname: serverDraft.hostname.trim(),
            ipv4: serverDraft.ipv4.trim(),
            os: serverDraft.os.trim(),
            ownerTeam: serverDraft.ownerTeam.trim(),
            subnetId: serverDraft.subnetId,
            environment: serverDraft.environment,
            criticality: serverDraft.criticality,
            health: serverDraft.health,
            telemetryStatus: serverDraft.telemetryStatus,
            scannerCoverage: serverDraft.scannerCoverage,
            deploymentStatus: "Pending",
            riskSeverity: serverDraft.riskSeverity,
            linkedDetections: [
                {
                    id: "DET-7701",
                    title: "Operational baseline anomaly"
                }
            ],
            linkedCases: [
                {
                    id: "CA-4601",
                    title: "Infrastructure posture watch"
                }
            ],
            linkedRules: [
                {
                    id: "SIG-2041",
                    title: "PowerShell Credential Artifact Sweep"
                }
            ],
            scannerAssignments: [],
            lastHeartbeatUtc: new Date().toISOString(),
            updatedAtUtc: new Date().toISOString()
        };
        setServers((current)=>[
                nextServer,
                ...current
            ]);
        setServerDraft(buildDefaultServerDraft(serverDraft.subnetId));
        setAddServerOpen(false);
        setMessage("Server added to inventory.");
    }
    function submitEditServer() {
        if (!editServer) return;
        if (hasServerFormErrors(editDraft)) {
            setMessage("Edit server failed: hostname, IP, owner team, and subnet are required.");
            return;
        }
        setServers((current)=>current.map((server)=>server.id === editServer.id ? {
                    ...server,
                    hostname: editDraft.hostname.trim(),
                    ipv4: editDraft.ipv4.trim(),
                    os: editDraft.os.trim(),
                    ownerTeam: editDraft.ownerTeam.trim(),
                    subnetId: editDraft.subnetId,
                    environment: editDraft.environment,
                    criticality: editDraft.criticality,
                    health: editDraft.health,
                    telemetryStatus: editDraft.telemetryStatus,
                    scannerCoverage: editDraft.scannerCoverage,
                    riskSeverity: editDraft.riskSeverity,
                    updatedAtUtc: new Date().toISOString()
                } : server));
        setEditServerId(null);
        setMessage("Server updated.");
    }
    function submitAddSubnet() {
        if (hasSubnetFormErrors(subnetDraft)) {
            setMessage("Add subnet failed: name, CIDR, gateway, and numeric capacity are required.");
            return;
        }
        const nextSubnet = {
            id: toId("snet", subnetDraft.name),
            name: subnetDraft.name.trim(),
            cidr: subnetDraft.cidr.trim(),
            gateway: subnetDraft.gateway.trim(),
            zone: subnetDraft.zone,
            environment: subnetDraft.environment,
            capacity: Number(subnetDraft.capacity),
            utilizationPercent: 0,
            scannerCoverage: subnetDraft.environment === "Production" ? "Partial" : "None",
            health: subnetDraft.environment === "Development" ? "Degraded" : "Healthy",
            notes: "New subnet pending scanner assignment."
        };
        setSubnets((current)=>[
                nextSubnet,
                ...current
            ]);
        setSubnetDraft(buildDefaultSubnetDraft());
        setAddSubnetOpen(false);
        setMessage("Subnet added.");
    }
    function submitRemoveSubnet() {
        if (!removeSubnet) return;
        if (attachedServers.length > 0 && !reassignSubnetId) {
            setMessage("Subnet removal blocked: reassign attached servers first.");
            return;
        }
        setServers((current)=>current.map((server)=>server.subnetId === removeSubnet.id && reassignSubnetId ? {
                    ...server,
                    subnetId: reassignSubnetId,
                    updatedAtUtc: new Date().toISOString()
                } : server));
        setSubnets((current)=>current.filter((subnet)=>subnet.id !== removeSubnet.id));
        setScannerFleet((current)=>current.map((scanner)=>({
                    ...scanner,
                    assignedSubnetIds: scanner.assignedSubnetIds.filter((id)=>id !== removeSubnet.id)
                })));
        setRemoveSubnetId(null);
        setReassignSubnetId("");
        setMessage("Subnet removed and attached servers reassigned.");
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].section, {
        className: "wb-page",
        variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["staggerMotion"],
        initial: "hidden",
        animate: "visible",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].header, {
                className: "wb-page-header space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-start justify-between gap-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Infrastructure Operations"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 283,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                        className: "mt-1 text-lg font-semibold tracking-tight",
                                        children: copy.title
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 284,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 max-w-4xl text-sm text-muted-foreground",
                                        children: copy.description
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 285,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 282,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "rounded-full border border-border/70 bg-surface-2/70 px-3 py-1 text-[11px] text-muted-foreground",
                                children: [
                                    "Snapshot ",
                                    new Date(vm.generatedAtUtc).toLocaleString()
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 287,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 281,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 p-1.5",
                        children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$modules$2f$operations$2d$foundation$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OPERATIONS_SUBPAGES"].map((page)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                href: page.href,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("inline-flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors", page.key === subpageKey ? "border-primary/45 bg-primary/14 text-foreground" : "border-transparent text-muted-foreground hover:border-border/75 hover:bg-surface-1/80 hover:text-foreground"),
                                children: page.label
                            }, page.key, false, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 294,
                                columnNumber: 13
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 292,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 280,
                columnNumber: 7
            }, this),
            message ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel-muted",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-xs text-muted-foreground",
                    children: message
                }, void 0, false, {
                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                    lineNumber: 312,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 311,
                columnNumber: 9
            }, this) : null,
            subpageKey === "inventory" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Servers"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold",
                                        children: servers.length
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 319,
                                        columnNumber: 121
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 319,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Mission Critical"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 320,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold",
                                        children: criticalCount
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 320,
                                        columnNumber: 130
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 320,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Health Alerts"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 321,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold text-rose-200",
                                        children: unhealthyCount
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 321,
                                        columnNumber: 127
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 321,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Coverage"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 322,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold",
                                        children: [
                                            coverage.fullCoverageCount,
                                            "/",
                                            coverage.totalServers,
                                            " full"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 322,
                                        columnNumber: 122
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: [
                                            coverage.partialCoverageCount,
                                            " partial - ",
                                            coverage.noCoverageCount,
                                            " none"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 322,
                                        columnNumber: 225
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 322,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 318,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex flex-wrap items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex flex-wrap items-center gap-1.5",
                                children: GROUP_OPTIONS.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        size: "xs",
                                        variant: groupBy === option.key ? "secondary" : "outline",
                                        onClick: ()=>setGroupBy(option.key),
                                        children: [
                                            "Group by ",
                                            option.label
                                        ]
                                    }, option.key, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 327,
                                        columnNumber: 46
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 326,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sheet"], {
                                open: addServerOpen,
                                onOpenChange: setAddServerOpen,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                                        render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            size: "sm",
                                            variant: "outline",
                                            children: "Add Server"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                            lineNumber: 330,
                                            columnNumber: 37
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 330,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetContent"], {
                                        side: "right",
                                        className: "w-full max-w-md border-border bg-surface-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetHeader"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTitle"], {
                                                        children: "Add Server"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 332,
                                                        columnNumber: 30
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetDescription"], {
                                                        children: "Register server in inventory."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 332,
                                                        columnNumber: 65
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 332,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2 px-4 pb-4 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "Hostname",
                                                        value: serverDraft.hostname,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    hostname: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 334,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "IPv4",
                                                        value: serverDraft.ipv4,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    ipv4: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 335,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "Owner Team",
                                                        value: serverDraft.ownerTeam,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    ownerTeam: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 336,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "OS",
                                                        value: serverDraft.os,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    os: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 337,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.subnetId,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    subnetId: event.target.value
                                                                })),
                                                        children: subnets.map((subnet)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: subnet.id,
                                                                children: subnet.name
                                                            }, subnet.id, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 338,
                                                                columnNumber: 258
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 338,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.environment,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    environment: event.target.value
                                                                })),
                                                        children: [
                                                            "Production",
                                                            "Staging",
                                                            "Development"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 339,
                                                                columnNumber: 317
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 339,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.criticality,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    criticality: event.target.value
                                                                })),
                                                        children: [
                                                            "Mission Critical",
                                                            "Business Critical",
                                                            "Standard"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 340,
                                                                columnNumber: 330
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 340,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.health,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    health: event.target.value
                                                                })),
                                                        children: [
                                                            "Healthy",
                                                            "Degraded",
                                                            "Unreachable"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 341,
                                                                columnNumber: 306
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 341,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.telemetryStatus,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    telemetryStatus: event.target.value
                                                                })),
                                                        children: [
                                                            "Healthy",
                                                            "Delayed",
                                                            "Missing"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 342,
                                                                columnNumber: 316
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 342,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.scannerCoverage,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    scannerCoverage: event.target.value
                                                                })),
                                                        children: [
                                                            "Full",
                                                            "Partial",
                                                            "None"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 343,
                                                                columnNumber: 316
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 343,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: serverDraft.riskSeverity,
                                                        onChange: (event)=>setServerDraft((current)=>({
                                                                    ...current,
                                                                    riskSeverity: event.target.value
                                                                })),
                                                        children: [
                                                            "Critical",
                                                            "High",
                                                            "Medium",
                                                            "Low"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 344,
                                                                columnNumber: 311
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 344,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-end gap-2 pt-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                size: "sm",
                                                                variant: "outline",
                                                                onClick: ()=>setAddServerOpen(false),
                                                                children: "Cancel"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 345,
                                                                columnNumber: 64
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                size: "sm",
                                                                onClick: submitAddServer,
                                                                children: "Add"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 345,
                                                                columnNumber: 155
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 345,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 333,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 331,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 329,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 325,
                        columnNumber: 11
                    }, this),
                    groupedServers.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmptyState"], {
                        title: "No servers",
                        description: "Add a server to start monitoring posture."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 351,
                        columnNumber: 42
                    }, this) : groupedServers.map((group)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "rounded-xl border border-border/70 bg-surface-2/55",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-between border-b border-border/60 px-3 py-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-sm font-semibold",
                                            children: group.label
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                            lineNumber: 353,
                                            columnNumber: 102
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: [
                                                group.servers.length,
                                                " server(s)"
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                            lineNumber: 353,
                                            columnNumber: 156
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                    lineNumber: 353,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "divide-y divide-border/50",
                                    children: group.servers.map((server)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "grid gap-2 px-3 py-2.5 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm font-medium",
                                                            children: server.hostname
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 357,
                                                            columnNumber: 26
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: [
                                                                server.ipv4,
                                                                " - ",
                                                                server.os
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 357,
                                                            columnNumber: 82
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: server.ownerTeam
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 357,
                                                            columnNumber: 158
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                    lineNumber: 357,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: server.health
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 358,
                                                            columnNumber: 48
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: server.telemetryStatus
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 358,
                                                            columnNumber: 85
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                    lineNumber: 358,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "space-y-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: server.scannerCoverage
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 359,
                                                            columnNumber: 48
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: server.riskSeverity
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 359,
                                                            columnNumber: 94
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                    lineNumber: 359,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "text-xs text-muted-foreground",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: [
                                                                server.linkedDetections.length,
                                                                " detections"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 360,
                                                            columnNumber: 68
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: [
                                                                server.linkedCases.length,
                                                                " alerts"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 360,
                                                            columnNumber: 118
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            children: [
                                                                server.linkedRules.length,
                                                                " rules"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 360,
                                                            columnNumber: 159
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                    lineNumber: 360,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex items-start gap-1",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "xs",
                                                            variant: "outline",
                                                            onClick: ()=>openEdit(server),
                                                            children: "Edit"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 361,
                                                            columnNumber: 61
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "xs",
                                                            variant: "outline",
                                                            render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                                href: `/servers/servers/${server.id}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 361,
                                                                columnNumber: 187
                                                            }, void 0),
                                                            children: "Detail"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 361,
                                                            columnNumber: 143
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                    lineNumber: 361,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, server.id, true, {
                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                            lineNumber: 356,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                    lineNumber: 354,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, group.key, true, {
                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                            lineNumber: 352,
                            columnNumber: 13
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 317,
                columnNumber: 9
            }, this) : null,
            subpageKey === "subnets" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm font-semibold",
                                children: "Subnet Registry"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 373,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sheet"], {
                                open: addSubnetOpen,
                                onOpenChange: setAddSubnetOpen,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                                        render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                            size: "sm",
                                            variant: "outline",
                                            children: "Add Subnet"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                            lineNumber: 375,
                                            columnNumber: 37
                                        }, void 0)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 375,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetContent"], {
                                        side: "right",
                                        className: "w-full max-w-md border-border bg-surface-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetHeader"], {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTitle"], {
                                                        children: "Add Subnet"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 377,
                                                        columnNumber: 30
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetDescription"], {
                                                        children: "Register subnet for server placement."
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 377,
                                                        columnNumber: 65
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 377,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-2 px-4 pb-4 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "Name",
                                                        value: subnetDraft.name,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    name: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 379,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "CIDR",
                                                        value: subnetDraft.cidr,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    cidr: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 380,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "Gateway",
                                                        value: subnetDraft.gateway,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    gateway: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 381,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: subnetDraft.zone,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    zone: event.target.value
                                                                })),
                                                        children: [
                                                            "DMZ",
                                                            "Core",
                                                            "Cloud Edge",
                                                            "OT"
                                                        ].map((zone)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: zone,
                                                                children: zone
                                                            }, zone, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 382,
                                                                columnNumber: 299
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 382,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        value: subnetDraft.environment,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    environment: event.target.value
                                                                })),
                                                        children: [
                                                            "Production",
                                                            "Staging",
                                                            "Development"
                                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                value: entry,
                                                                children: entry
                                                            }, entry, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 383,
                                                                columnNumber: 317
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 383,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                        placeholder: "Capacity",
                                                        value: subnetDraft.capacity,
                                                        onChange: (event)=>setSubnetDraft((current)=>({
                                                                    ...current,
                                                                    capacity: event.target.value
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 384,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex justify-end gap-2 pt-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                size: "sm",
                                                                variant: "outline",
                                                                onClick: ()=>setAddSubnetOpen(false),
                                                                children: "Cancel"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 385,
                                                                columnNumber: 64
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                size: "sm",
                                                                onClick: submitAddSubnet,
                                                                children: "Add"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 385,
                                                                columnNumber: 155
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 385,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 378,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 376,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 374,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 372,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-2",
                        children: subnets.map((subnet)=>{
                            const rollup = subnetRollups[subnet.id];
                            const reassignOptions = subnets.filter((item)=>item.id !== subnet.id);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                className: "rounded-xl border border-border/70 bg-surface-2/60 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-start justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-semibold",
                                                        children: subnet.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 396,
                                                        columnNumber: 74
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-muted-foreground",
                                                        children: [
                                                            subnet.cidr,
                                                            " - ",
                                                            subnet.gateway
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 396,
                                                        columnNumber: 128
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 396,
                                                columnNumber: 69
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                value: subnet.health
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 396,
                                                columnNumber: 215
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 396,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Zone: ",
                                                    subnet.zone
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 94
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Env: ",
                                                    subnet.environment
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 120
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Servers: ",
                                                    rollup?.serverCount ?? 0
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 152
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Capacity: ",
                                                    subnet.capacity
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 194
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: environmentTint(subnet.utilizationPercent),
                                                children: [
                                                    "Utilization: ",
                                                    subnet.utilizationPercent,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 228
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Coverage: ",
                                                    subnet.scannerCoverage
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 397,
                                                columnNumber: 331
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 397,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-xs text-muted-foreground",
                                        children: subnet.notes
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 398,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2 flex items-center justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[11px] text-muted-foreground",
                                                children: [
                                                    rollup?.missionCriticalCount ?? 0,
                                                    " mission critical - ",
                                                    rollup?.telemetryMissingCount ?? 0,
                                                    " telemetry missing"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 400,
                                                columnNumber: 21
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sheet"], {
                                                open: removeSubnetId === subnet.id,
                                                onOpenChange: (open)=>{
                                                    setRemoveSubnetId(open ? subnet.id : null);
                                                    setReassignSubnetId(reassignOptions[0]?.id ?? "");
                                                },
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                                                        render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                            size: "xs",
                                                            variant: "outline",
                                                            children: "Remove"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                            lineNumber: 402,
                                                            columnNumber: 45
                                                        }, void 0)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 402,
                                                        columnNumber: 23
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetContent"], {
                                                        side: "right",
                                                        className: "w-full max-w-sm border-border bg-surface-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetHeader"], {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTitle"], {
                                                                        children: "Remove Subnet"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                        lineNumber: 404,
                                                                        columnNumber: 38
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetDescription"], {
                                                                        children: "Reassign attached servers before removal."
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                        lineNumber: 404,
                                                                        columnNumber: 76
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 404,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "space-y-3 px-4 pb-4 text-xs",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "rounded-lg border border-amber-300/35 bg-amber-500/10 p-2 text-amber-100",
                                                                        children: [
                                                                            "Attached servers: ",
                                                                            servers.filter((server)=>server.subnetId === subnet.id).length
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                        lineNumber: 406,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    servers.filter((server)=>server.subnetId === subnet.id).length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                                                        value: reassignSubnetId,
                                                                        onChange: (event)=>setReassignSubnetId(event.target.value),
                                                                        children: reassignOptions.map((option)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                                value: option.id,
                                                                                children: option.name
                                                                            }, option.id, false, {
                                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                                lineNumber: 407,
                                                                                columnNumber: 306
                                                                            }, this))
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                        lineNumber: 407,
                                                                        columnNumber: 99
                                                                    }, this) : null,
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: "flex justify-end gap-2",
                                                                        children: [
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                                size: "sm",
                                                                                variant: "outline",
                                                                                onClick: ()=>setRemoveSubnetId(null),
                                                                                children: "Cancel"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                                lineNumber: 408,
                                                                                columnNumber: 67
                                                                            }, this),
                                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                                size: "sm",
                                                                                onClick: submitRemoveSubnet,
                                                                                children: "Confirm"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                                lineNumber: 408,
                                                                                columnNumber: 158
                                                                            }, this)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                        lineNumber: 408,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                                lineNumber: 405,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 403,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 401,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 399,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, subnet.id, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 395,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 390,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 371,
                columnNumber: 9
            }, this) : null,
            subpageKey === "asset-groups" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel grid gap-3 md:grid-cols-2",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: assetGroups.map((group)=>{
                    const members = servers.filter((server)=>group.memberServerIds.includes(server.id));
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                        className: "rounded-xl border border-border/70 bg-surface-2/60 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-sm font-semibold",
                                                children: group.name
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 426,
                                                columnNumber: 72
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-muted-foreground",
                                                children: group.policyProfile
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 426,
                                                columnNumber: 125
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 426,
                                        columnNumber: 67
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                        value: group.environment
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 426,
                                        columnNumber: 201
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 426,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: [
                                            "Owner: ",
                                            group.ownerTeam
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 92
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: [
                                            "Members: ",
                                            members.length
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 123
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: [
                                            "Scanner compliance: ",
                                            group.scannerCompliancePercent,
                                            "%"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 155
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: [
                                            "Detections: ",
                                            group.linkedDetections.length
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 215
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        children: [
                                            "Alerts: ",
                                            group.linkedCases.length
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 427,
                                        columnNumber: 265
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 427,
                                columnNumber: 17
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-2 rounded-lg border border-border/65 bg-surface-1/70 p-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Member Servers"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 429,
                                        columnNumber: 19
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                                        className: "mt-1 space-y-1 text-xs text-muted-foreground",
                                        children: members.map((member)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                                                className: "flex items-center justify-between",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: member.hostname
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 430,
                                                        columnNumber: 171
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                        value: member.health
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 430,
                                                        columnNumber: 201
                                                    }, this)
                                                ]
                                            }, member.id, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 430,
                                                columnNumber: 105
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 430,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 428,
                                columnNumber: 17
                            }, this)
                        ]
                    }, group.id, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 425,
                        columnNumber: 15
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 421,
                columnNumber: 9
            }, this) : null,
            subpageKey === "scanner-fleet" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-2",
                        children: scannerFleet.map((node)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                                className: "rounded-xl border border-border/70 bg-surface-2/60 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-start justify-between",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-semibold",
                                                        children: node.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 443,
                                                        columnNumber: 72
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-muted-foreground",
                                                        children: [
                                                            node.mode,
                                                            " mode | v",
                                                            node.latestVersion
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                        lineNumber: 443,
                                                        columnNumber: 124
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 443,
                                                columnNumber: 67
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                value: node.health
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 443,
                                                columnNumber: 219
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 443,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Queue depth: ",
                                                    node.queueDepth
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 444,
                                                columnNumber: 92
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Coverage: ",
                                                    node.coveragePercent,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 444,
                                                columnNumber: 129
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Uptime: ",
                                                    node.uptimePercent,
                                                    "%"
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 444,
                                                columnNumber: 169
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                children: [
                                                    "Subnets: ",
                                                    node.assignedSubnetIds.length
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 444,
                                                columnNumber: 205
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 444,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-2 text-xs text-muted-foreground",
                                        children: [
                                            "Last heartbeat: ",
                                            new Date(node.lastHeartbeatUtc).toLocaleString()
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 445,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, node.id, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 442,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 440,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/60 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Total Nodes"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 450,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold",
                                        children: scannerFleet.length
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 450,
                                        columnNumber: 125
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 450,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/60 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Degraded/Offline"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 451,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold text-amber-200",
                                        children: scannerFleet.filter((node)=>node.health !== "Healthy").length
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 451,
                                        columnNumber: 130
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 451,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "rounded-lg border border-border/70 bg-surface-2/60 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Telemetry Gaps"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 452,
                                        columnNumber: 85
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "mt-1 text-lg font-semibold text-rose-200",
                                        children: telemetryGaps
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 452,
                                        columnNumber: 128
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 452,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 449,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 439,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Sheet"], {
                open: Boolean(editServer),
                onOpenChange: (open)=>!open && setEditServerId(null),
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                        className: "hidden"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 458,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetContent"], {
                        side: "right",
                        className: "w-full max-w-md border-border bg-surface-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetHeader"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetTitle"], {
                                        children: "Edit Server"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 460,
                                        columnNumber: 24
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SheetDescription"], {
                                        children: "Modify host and posture data."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 460,
                                        columnNumber: 60
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 460,
                                columnNumber: 11
                            }, this),
                            editServer ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 px-4 pb-4 text-xs",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.hostname,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    hostname: event.target.value
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 463,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.ipv4,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    ipv4: event.target.value
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 464,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.ownerTeam,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    ownerTeam: event.target.value
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 465,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.os,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    os: event.target.value
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 466,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.subnetId,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    subnetId: event.target.value
                                                })),
                                        children: subnets.map((subnet)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: subnet.id,
                                                children: subnet.name
                                            }, subnet.id, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 467,
                                                columnNumber: 250
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 467,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.environment,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    environment: event.target.value
                                                })),
                                        children: [
                                            "Production",
                                            "Staging",
                                            "Development"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 468,
                                                columnNumber: 309
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 468,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.criticality,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    criticality: event.target.value
                                                })),
                                        children: [
                                            "Mission Critical",
                                            "Business Critical",
                                            "Standard"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 469,
                                                columnNumber: 322
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 469,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.health,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    health: event.target.value
                                                })),
                                        children: [
                                            "Healthy",
                                            "Degraded",
                                            "Unreachable"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 470,
                                                columnNumber: 298
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 470,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.telemetryStatus,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    telemetryStatus: event.target.value
                                                })),
                                        children: [
                                            "Healthy",
                                            "Delayed",
                                            "Missing"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 471,
                                                columnNumber: 308
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 471,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.scannerCoverage,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    scannerCoverage: event.target.value
                                                })),
                                        children: [
                                            "Full",
                                            "Partial",
                                            "None"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 472,
                                                columnNumber: 308
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 472,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        className: "h-8 w-full rounded-lg border border-border/70 bg-surface-2/75 px-2",
                                        value: editDraft.riskSeverity,
                                        onChange: (event)=>setEditDraft((current)=>({
                                                    ...current,
                                                    riskSeverity: event.target.value
                                                })),
                                        children: [
                                            "Critical",
                                            "High",
                                            "Medium",
                                            "Low"
                                        ].map((entry)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: entry,
                                                children: entry
                                            }, entry, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 473,
                                                columnNumber: 303
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 473,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex justify-end gap-2 pt-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "sm",
                                                variant: "outline",
                                                onClick: ()=>setEditServerId(null),
                                                children: "Cancel"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 474,
                                                columnNumber: 60
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "sm",
                                                onClick: submitEditServer,
                                                children: "Save"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                                lineNumber: 474,
                                                columnNumber: 149
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                        lineNumber: 474,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                                lineNumber: 462,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                        lineNumber: 459,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
                lineNumber: 457,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/operations/operations-module-page.tsx",
        lineNumber: 279,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/components/ui/table.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Table",
    ()=>Table,
    "TableBody",
    ()=>TableBody,
    "TableCaption",
    ()=>TableCaption,
    "TableCell",
    ()=>TableCell,
    "TableFooter",
    ()=>TableFooter,
    "TableHead",
    ()=>TableHead,
    "TableHeader",
    ()=>TableHeader,
    "TableRow",
    ()=>TableRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-ssr] (ecmascript)");
"use client";
;
;
function Table({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "table-container",
        className: "relative w-full overflow-x-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            "data-slot": "table",
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("w-full caption-bottom text-sm", className),
            ...props
        }, void 0, false, {
            fileName: "[project]/src/components/ui/table.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
function TableHeader({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
        "data-slot": "table-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("[&_tr]:border-b [&_tr]:border-border/70", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
function TableBody({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
        "data-slot": "table-body",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("[&_tr:last-child]:border-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
function TableFooter({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tfoot", {
        "data-slot": "table-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("border-t border-border/70 bg-surface-2/70 font-medium [&>tr]:last:border-b-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
function TableRow({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
        "data-slot": "table-row",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("border-b border-border/60 text-[13px] transition-colors hover:bg-surface-2/70 data-[state=selected]:bg-surface-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
function TableHead({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
        "data-slot": "table-head",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("h-9 px-2.5 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
function TableCell({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
        "data-slot": "table-cell",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("p-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 83,
        columnNumber: 5
    }, this);
}
function TableCaption({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("caption", {
        "data-slot": "table-caption",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])("mt-4 text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
;
}),
"[project]/src/shared/api/error-classification.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "classifyUiError",
    ()=>classifyUiError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error.ts [app-ssr] (ecmascript)");
;
function fallbackMessage(error) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return "Unexpected client or network failure.";
}
function apiErrorMessage(error) {
    if (error.detail && error.detail.trim()) {
        return error.detail;
    }
    if (error.title && error.title.trim()) {
        return error.title;
    }
    return error.message;
}
function classifyUiError(error, options = {}) {
    if (options.modeMisconfigured) {
        return {
            kind: "unavailable-configuration",
            isContractMismatch: false,
            status: null,
            message: "Runtime gateway mode is not configured. Set NEXT_PUBLIC_USE_ASPNET_GATEWAY to 0 or 1."
        };
    }
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ApiError"]) {
        const isSchemaMismatch = error.isSchemaValidationFailure;
        const hasDependencySignal = Boolean(error.dependency) || Boolean(error.condition) || Boolean(error.dependencyType) || error.retryable === true;
        if (error.status === 401 || error.status === 403) {
            return {
                kind: "permission-restricted",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        if (error.status === 404 && options.treat404AsMissingFeature) {
            return {
                kind: "unavailable-missing-feature",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        if (isSchemaMismatch || hasDependencySignal || error.status >= 500) {
            return {
                kind: "dependency-down",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        return {
            kind: "unavailable",
            isContractMismatch: isSchemaMismatch,
            status: error.status,
            message: apiErrorMessage(error)
        };
    }
    return {
        kind: "dependency-down",
        isContractMismatch: false,
        status: null,
        message: fallbackMessage(error)
    };
}
}),
"[project]/src/shared/ui/error-fallback.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClassifiedFailureState",
    ()=>ClassifiedFailureState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-ssr] (ecmascript)");
;
;
function ClassifiedFailureState({ failure, fallbackTitle }) {
    if (failure.kind === "permission-restricted") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PermissionRestrictedState"], {
            title: "Permission restricted",
            description: "Your role cannot access this backend surface."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this);
    }
    if (failure.kind === "dependency-down") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DependencyDownState"], {
            title: "Dependency down",
            description: failure.isContractMismatch ? "This surface is not mapped to the current backend shape yet. An empty or reduced view is expected until that module is integrated." : "A required backend dependency is currently unavailable."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    if (failure.kind === "unavailable-configuration") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UnavailableState"], {
            title: "Configuration unavailable",
            description: failure.message
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 34,
            columnNumber: 12
        }, this);
    }
    if (failure.kind === "unavailable-missing-feature") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UnavailableState"], {
            title: fallbackTitle,
            description: "Backend feature support is not available for this surface yet."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 39,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["UnavailableState"], {
        title: fallbackTitle,
        description: failure.message
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/error-fallback.tsx",
        lineNumber: 46,
        columnNumber: 10
    }, this);
}
}),
"[project]/src/components/workbench/servers/managed-server-inventory-page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ManagedServerInventoryPage",
    ()=>ManagedServerInventoryPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/status-badge.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/dialog.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/input.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/table.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/textarea.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error-classification.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/auth-provider.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/session.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/index.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/query/use-workbench-query.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/motion.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/error-fallback.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-ssr] (ecmascript)");
"use client";
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
;
const STATUS_OPTIONS = [
    "Unknown",
    "Online",
    "Degraded",
    "Offline"
];
const CAPABILITY_OPTIONS = [
    "Yara",
    "Sigma",
    "Snort",
    "Suricata"
];
const LAST_CONTACT_OPTIONS = [
    "24h",
    "72h",
    "7d",
    "30d",
    "stale",
    "never"
];
const INVENTORY_PAGE_SIZE = 20;
function parseFilters(searchParams) {
    const pageRaw = Number(searchParams.get("page") ?? "1");
    return {
        q: searchParams.get("q") ?? "",
        status: searchParams.get("status") ?? "",
        scannerCapability: searchParams.get("scannerCapability") ?? "",
        subnetId: searchParams.get("subnetId") ?? "",
        lastContact: searchParams.get("lastContact") ?? "",
        environment: searchParams.get("environment") ?? "",
        fromUtc: searchParams.get("fromUtc") ?? "",
        toUtc: searchParams.get("toUtc") ?? "",
        page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1
    };
}
function buildQuery(filters) {
    const params = new URLSearchParams();
    if (filters.q) {
        params.set("q", filters.q);
    }
    if (filters.status) {
        params.set("status", filters.status);
    }
    if (filters.scannerCapability) {
        params.set("scannerCapability", filters.scannerCapability);
    }
    if (filters.subnetId) {
        params.set("subnetId", filters.subnetId);
    }
    if (filters.lastContact) {
        params.set("lastContact", filters.lastContact);
    }
    if (filters.environment) {
        params.set("environment", filters.environment);
    }
    if (filters.fromUtc) {
        params.set("fromUtc", filters.fromUtc);
    }
    if (filters.toUtc) {
        params.set("toUtc", filters.toUtc);
    }
    if (filters.page > 1) {
        params.set("page", String(filters.page));
    }
    return params.toString();
}
function toOptionalString(value) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
function parseOptionalPort(value) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isNaN(parsed)) {
        return undefined;
    }
    return parsed;
}
function formatTimestamp(value) {
    if (!value) {
        return "Never";
    }
    return new Date(value).toLocaleString();
}
function isStaleContact(value) {
    if (!value) {
        return true;
    }
    return Date.now() - Date.parse(value) > 72 * 60 * 60 * 1000;
}
function buildFormState(server, defaultSubnetId) {
    if (!server) {
        return {
            subnetId: defaultSubnetId,
            hostname: "",
            ipAddress: "",
            operatingSystem: "",
            environment: "",
            status: "Discovered",
            connectivityStatus: "Unknown",
            connectionProtocol: "",
            connectionHost: "",
            connectionPort: "",
            connectionAuthMode: "",
            connectionUsername: ""
        };
    }
    return {
        subnetId: server.subnetId,
        hostname: server.hostname,
        ipAddress: server.ipAddress,
        operatingSystem: server.operatingSystem,
        environment: server.environment,
        status: server.status,
        connectivityStatus: server.connectivityStatus,
        connectionProtocol: server.connectionProtocol ?? "",
        connectionHost: server.connectionHost ?? "",
        connectionPort: server.connectionPort?.toString() ?? "",
        connectionAuthMode: server.connectionAuthMode ?? "",
        connectionUsername: server.connectionUsername ?? ""
    };
}
function ManagedServerInventoryPage() {
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRouter"])();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useSearchParams"])();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { session } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useAuth"])();
    const canManageServers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["canAccessLeadActions"])(session);
    const actorUserId = session?.userId ?? session?.username ?? "unknown-user";
    const parsedFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>parseFilters(new URLSearchParams(searchParams.toString())), [
        searchParams
    ]);
    const [filters, setFilters] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(parsedFilters);
    const [serverDialogOpen, setServerDialogOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [editingServerId, setEditingServerId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [formState, setFormState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>buildFormState(null, ""));
    const [formError, setFormError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [assignmentDialogServer, setAssignmentDialogServer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [assignmentConnectivityStatus, setAssignmentConnectivityStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("Unknown");
    const [assignmentSelection, setAssignmentSelection] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])({});
    const [assignmentError, setAssignmentError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [secretDialogServer, setSecretDialogServer] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [secretPayload, setSecretPayload] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])("");
    const [secretError, setSecretError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        setFilters(parsedFilters);
    }, [
        parsedFilters
    ]);
    const subnetsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "infrastructure",
        "subnets"
    ], (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].listSubnets(signal));
    const scannersQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "infrastructure",
        "scanners"
    ], (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].listScanners(signal));
    const inventoryFilters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>({
            q: parsedFilters.q || undefined,
            status: parsedFilters.status.length > 0 ? parsedFilters.status : undefined,
            scannerCapability: parsedFilters.scannerCapability.length > 0 ? parsedFilters.scannerCapability : undefined,
            subnetId: parsedFilters.subnetId || undefined,
            lastContact: parsedFilters.lastContact.length > 0 ? parsedFilters.lastContact : undefined,
            environment: parsedFilters.environment || undefined,
            fromUtc: parsedFilters.fromUtc || undefined,
            toUtc: parsedFilters.toUtc || undefined,
            page: parsedFilters.page,
            pageSize: INVENTORY_PAGE_SIZE
        }), [
        parsedFilters
    ]);
    const inventoryQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "infrastructure",
        "managed-servers",
        inventoryFilters
    ], (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].listManagedServers(inventoryFilters, signal), {
        refetchInterval: 15000
    });
    const saveServerMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async (draft)=>{
            const hostname = draft.hostname.trim();
            const ipAddress = draft.ipAddress.trim();
            const operatingSystem = draft.operatingSystem.trim();
            const environment = draft.environment.trim();
            if (!draft.subnetId || hostname.length === 0 || ipAddress.length === 0 || operatingSystem.length === 0 || environment.length === 0) {
                throw new Error("Subnet, hostname, IP address, operating system, and environment are required.");
            }
            if (editingServerId) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].updateManagedServer(editingServerId, {
                    hostname,
                    ipAddress,
                    operatingSystem,
                    environment,
                    actorUserId,
                    status: toOptionalString(draft.status),
                    connectivityStatus: toOptionalString(draft.connectivityStatus),
                    connectionProtocol: toOptionalString(draft.connectionProtocol),
                    connectionHost: toOptionalString(draft.connectionHost),
                    connectionPort: parseOptionalPort(draft.connectionPort),
                    connectionAuthMode: toOptionalString(draft.connectionAuthMode),
                    connectionUsername: toOptionalString(draft.connectionUsername)
                });
                return;
            }
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].createManagedServer({
                subnetId: draft.subnetId,
                hostname,
                ipAddress,
                operatingSystem,
                environment,
                actorUserId,
                status: toOptionalString(draft.status),
                connectivityStatus: toOptionalString(draft.connectivityStatus),
                connectionProtocol: toOptionalString(draft.connectionProtocol),
                connectionHost: toOptionalString(draft.connectionHost),
                connectionPort: parseOptionalPort(draft.connectionPort),
                connectionAuthMode: toOptionalString(draft.connectionAuthMode),
                connectionUsername: toOptionalString(draft.connectionUsername)
            });
        },
        onSuccess: async ()=>{
            setServerDialogOpen(false);
            setEditingServerId(null);
            setFormError(null);
            await queryClient.invalidateQueries({
                queryKey: [
                    "infrastructure",
                    "managed-servers"
                ]
            });
        },
        onError: (error)=>{
            setFormError((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(error).message);
        }
    });
    const assignmentMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async ()=>{
            if (!assignmentDialogServer) {
                return;
            }
            const scannerRows = scannersQuery.data ?? [];
            const selectedIds = scannerRows.filter((scanner)=>assignmentSelection[scanner.id]).map((scanner)=>scanner.id);
            const selectedIdSet = new Set(selectedIds);
            const existingAssignments = assignmentDialogServer.scannerAssignments;
            const existingByScannerId = new Map(existingAssignments.map((item)=>[
                    item.scannerId,
                    item
                ]));
            const toRemove = existingAssignments.filter((item)=>!selectedIdSet.has(item.scannerId)).map((item)=>item.scannerId);
            for (const scannerId of selectedIds){
                const current = existingByScannerId.get(scannerId);
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].upsertManagedServerScannerAssignment(assignmentDialogServer.id, scannerId, {
                    connectivityStatus: current?.connectivityStatus ?? assignmentConnectivityStatus,
                    lastHeartbeatUtc: current?.lastHeartbeatUtc ?? undefined,
                    lastContactUtc: current?.lastContactUtc ?? undefined,
                    isEnabled: true,
                    actorUserId
                });
            }
            for (const scannerId of toRemove){
                await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].removeManagedServerScannerAssignment(assignmentDialogServer.id, scannerId);
            }
        },
        onSuccess: async ()=>{
            setAssignmentDialogServer(null);
            setAssignmentError(null);
            await queryClient.invalidateQueries({
                queryKey: [
                    "infrastructure",
                    "managed-servers"
                ]
            });
        },
        onError: (error)=>{
            setAssignmentError((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(error).message);
        }
    });
    const rotateSecretMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: async ()=>{
            if (!secretDialogServer) {
                return;
            }
            const payload = secretPayload.trim();
            if (payload.length === 0) {
                throw new Error("Connection secret payload is required.");
            }
            await __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["gateway"].rotateManagedServerConnectionSecret(secretDialogServer.id, {
                secretPayload: payload,
                actorUserId
            });
        },
        onSuccess: async ()=>{
            setSecretDialogServer(null);
            setSecretPayload("");
            setSecretError(null);
            await queryClient.invalidateQueries({
                queryKey: [
                    "infrastructure",
                    "managed-servers"
                ]
            });
        },
        onError: (error)=>{
            setSecretError((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(error).message);
        }
    });
    const subnets = subnetsQuery.data ?? [];
    const scanners = scannersQuery.data ?? [];
    const subnetLabelById = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        return new Map(subnets.map((item)=>[
                item.id,
                item.name
            ]));
    }, [
        subnets
    ]);
    if (subnetsQuery.isLoading || inventoryQuery.isLoading || scannersQuery.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["LoadingState"], {
            label: "Loading managed server inventory"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
            lineNumber: 369,
            columnNumber: 12
        }, this);
    }
    if (subnetsQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(subnetsQuery.error),
            fallbackTitle: "Servers unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
            lineNumber: 373,
            columnNumber: 12
        }, this);
    }
    if (inventoryQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(inventoryQuery.error),
            fallbackTitle: "Servers unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
            lineNumber: 377,
            columnNumber: 12
        }, this);
    }
    if (scannersQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["classifyUiError"])(scannersQuery.error),
            fallbackTitle: "Scanner inventory unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
            lineNumber: 381,
            columnNumber: 12
        }, this);
    }
    const inventory = inventoryQuery.data ?? {
        servers: [],
        totalServers: 0,
        unhealthyServers: 0,
        unreachableServers: 0,
        staleContactServers: 0,
        page: 1,
        pageSize: INVENTORY_PAGE_SIZE
    };
    const servers = inventory.servers;
    const staleServers = servers.filter((server)=>isStaleContact(server.lastContactUtc)).length;
    const page = inventory.page ?? parsedFilters.page;
    const pageSize = inventory.pageSize ?? INVENTORY_PAGE_SIZE;
    const canMoveNext = page * pageSize < inventory.totalServers;
    const filteredOut = Object.values(parsedFilters).some((value)=>value !== "" && value !== 1);
    const applyFilters = ()=>{
        const next = buildQuery(filters);
        router.replace(next ? `${pathname}?${next}` : pathname);
    };
    const clearFilters = ()=>{
        const cleared = {
            q: "",
            status: "",
            scannerCapability: "",
            subnetId: "",
            lastContact: "",
            environment: "",
            fromUtc: "",
            toUtc: "",
            page: 1
        };
        setFilters(cleared);
        router.replace(pathname);
    };
    const movePage = (nextPage)=>{
        const next = buildQuery({
            ...parsedFilters,
            page: Math.max(1, nextPage)
        });
        router.replace(next ? `${pathname}?${next}` : pathname);
    };
    const openCreateDialog = ()=>{
        setEditingServerId(null);
        setFormState(buildFormState(null, subnets[0]?.id ?? ""));
        setFormError(null);
        setServerDialogOpen(true);
    };
    const openEditDialog = (server)=>{
        setEditingServerId(server.id);
        setFormState(buildFormState(server, server.subnetId));
        setFormError(null);
        setServerDialogOpen(true);
    };
    const openAssignmentDialog = (server)=>{
        const selected = Object.fromEntries(scanners.map((scanner)=>[
                scanner.id,
                false
            ]));
        for (const assignment of server.scannerAssignments){
            selected[assignment.scannerId] = assignment.isEnabled;
        }
        setAssignmentDialogServer(server);
        setAssignmentConnectivityStatus(server.connectivityStatus ?? "Unknown");
        setAssignmentSelection(selected);
        setAssignmentError(null);
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].section, {
        className: "wb-page",
        variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["staggerMotion"],
        initial: "hidden",
        animate: "visible",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].header, {
                className: "wb-page-header",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-start justify-between gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "wb-kicker",
                                    children: "Servers"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 460,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "mt-1 text-lg font-semibold tracking-tight",
                                    children: "Managed server and scanner inventory"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 461,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-muted-foreground",
                                    children: "Search indexed inventory by hostname, IP, environment, capability, subnet, and contact recency without losing place."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 462,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 459,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "flex flex-wrap items-center gap-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    size: "sm",
                                    variant: "outline",
                                    render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        href: "/scan-plan"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 467,
                                        columnNumber: 71
                                    }, void 0),
                                    children: "Open scan plans"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 467,
                                    columnNumber: 13
                                }, this),
                                canManageServers ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    size: "sm",
                                    onClick: openCreateDialog,
                                    children: "Register managed server"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 471,
                                    columnNumber: 15
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 466,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                    lineNumber: 458,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 457,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "grid gap-3 md:grid-cols-4",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "wb-kicker",
                                children: "Total Servers"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 481,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-lg font-semibold",
                                children: inventory.totalServers
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 482,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 480,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg border border-amber-300/35 bg-amber-500/10 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "wb-kicker text-amber-100",
                                children: "Unhealthy"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 485,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-lg font-semibold text-amber-100",
                                children: inventory.unhealthyServers
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 486,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 484,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg border border-rose-300/35 bg-rose-500/10 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "wb-kicker text-rose-100",
                                children: "Unreachable"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 489,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-lg font-semibold text-rose-100",
                                children: inventory.unreachableServers
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 490,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 488,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "rounded-lg border border-sky-300/35 bg-sky-500/10 p-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "wb-kicker text-sky-100",
                                children: "Stale Contact"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 493,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "mt-1 text-lg font-semibold text-sky-100",
                                children: staleServers
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 494,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 492,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 479,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1 md:col-span-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Search"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 501,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                        value: filters.q,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    q: event.target.value,
                                                    page: 1
                                                })),
                                        placeholder: "Hostname, IP, OS, environment"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 502,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 500,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Status"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 510,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: filters.status,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    status: event.target.value,
                                                    page: 1
                                                })),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 516,
                                                columnNumber: 15
                                            }, this),
                                            STATUS_OPTIONS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: item,
                                                    children: item
                                                }, item, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 518,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 511,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 509,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Scanner Capability"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 526,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: filters.scannerCapability,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    scannerCapability: event.target.value,
                                                    page: 1
                                                })),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 532,
                                                columnNumber: 15
                                            }, this),
                                            CAPABILITY_OPTIONS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: item,
                                                    children: item
                                                }, item, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 534,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 527,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 525,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Subnet"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 542,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: filters.subnetId,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    subnetId: event.target.value,
                                                    page: 1
                                                })),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 548,
                                                columnNumber: 15
                                            }, this),
                                            subnets.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: item.id,
                                                    children: item.name
                                                }, item.id, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 550,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 543,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 541,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Last Contact"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 558,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: filters.lastContact,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    lastContact: event.target.value,
                                                    page: 1
                                                })),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 564,
                                                columnNumber: 15
                                            }, this),
                                            LAST_CONTACT_OPTIONS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: item,
                                                    children: item
                                                }, item, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 566,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 559,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 557,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 499,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Environment"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 576,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                        value: filters.environment,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    environment: event.target.value,
                                                    page: 1
                                                })),
                                        placeholder: "prod, dmz, lab"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 577,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 575,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Contact From"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 584,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                        type: "date",
                                        value: filters.fromUtc,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    fromUtc: event.target.value,
                                                    page: 1
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 585,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 583,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Contact To"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 592,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                        type: "date",
                                        value: filters.toUtc,
                                        onChange: (event)=>setFilters((current)=>({
                                                    ...current,
                                                    toUtc: event.target.value,
                                                    page: 1
                                                }))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 593,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 591,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-end gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "button",
                                        size: "sm",
                                        onClick: applyFilters,
                                        children: "Apply"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 600,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "button",
                                        size: "sm",
                                        variant: "outline",
                                        onClick: clearFilters,
                                        children: "Clear"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 603,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 599,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 574,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 498,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel space-y-3",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm font-semibold tracking-tight",
                                children: "Managed inventory"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 612,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: [
                                    "Page ",
                                    page,
                                    " | ",
                                    servers.length,
                                    " row(s) returned"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 613,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 611,
                        columnNumber: 9
                    }, this),
                    servers.length === 0 ? filteredOut ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SearchEmptyState"], {
                        title: "No managed servers matched the current search",
                        description: "Broaden the contact window, remove the capability or subnet filter, or clear the search text to reopen the full inventory.",
                        action: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            size: "sm",
                            variant: "outline",
                            onClick: clearFilters,
                            children: "Reset server filters"
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 624,
                            columnNumber: 17
                        }, void 0)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 620,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["EmptyState"], {
                        title: "No managed servers",
                        description: "Register a managed server to start scanner assignment and heartbeat tracking."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 630,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Table"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHeader"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableRow"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Server"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 640,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Subnet"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 641,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 642,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Capabilities"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 643,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Contact"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 644,
                                                columnNumber: 19
                                            }, this),
                                            canManageServers ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableHead"], {
                                                className: "text-right",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                lineNumber: 645,
                                                columnNumber: 39
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 639,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 638,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableBody"], {
                                    children: servers.map((server)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableRow"], {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: `/servers/servers/${server.id}`,
                                                            className: "text-sm font-semibold hover:underline",
                                                            children: server.hostname
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 652,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: server.ipAddress
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 655,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 651,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: subnetLabelById.get(server.subnetId) ?? server.subnetId.slice(0, 8)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 657,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap items-center gap-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                                value: server.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 660,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                                value: server.connectivityStatus
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 661,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                        lineNumber: 659,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 658,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap gap-1",
                                                        children: server.scannerCapabilities.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: "None"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 667,
                                                            columnNumber: 27
                                                        }, this) : server.scannerCapabilities.map((capability)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                                value: capability
                                                            }, `${server.id}-${capability}`, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 669,
                                                                columnNumber: 74
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                        lineNumber: 665,
                                                        columnNumber: 23
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 664,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: `text-xs ${isStaleContact(server.lastContactUtc) ? "text-amber-100" : "text-muted-foreground"}`,
                                                            children: [
                                                                "Last contact: ",
                                                                formatTimestamp(server.lastContactUtc)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 674,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-xs text-muted-foreground",
                                                            children: [
                                                                "Heartbeat: ",
                                                                formatTimestamp(server.lastHeartbeatUtc)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 677,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 673,
                                                    columnNumber: 21
                                                }, this),
                                                canManageServers ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap justify-end gap-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                type: "button",
                                                                size: "xs",
                                                                variant: "outline",
                                                                onClick: ()=>openEditDialog(server),
                                                                children: "Edit"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 682,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                type: "button",
                                                                size: "xs",
                                                                variant: "outline",
                                                                onClick: ()=>openAssignmentDialog(server),
                                                                children: "Assign"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 685,
                                                                columnNumber: 27
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                                                type: "button",
                                                                size: "xs",
                                                                variant: "outline",
                                                                onClick: ()=>setSecretDialogServer(server),
                                                                children: "Rotate Secret"
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                                lineNumber: 688,
                                                                columnNumber: 27
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                        lineNumber: 681,
                                                        columnNumber: 25
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 680,
                                                    columnNumber: 23
                                                }, this) : null
                                            ]
                                        }, server.id, true, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 650,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 648,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 637,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 636,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between text-sm",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-muted-foreground",
                                children: [
                                    "Showing ",
                                    servers.length,
                                    " of ",
                                    inventory.totalServers,
                                    " matching servers"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 702,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "button",
                                        size: "sm",
                                        variant: "outline",
                                        onClick: ()=>movePage(page - 1),
                                        disabled: page <= 1,
                                        children: "Previous"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 706,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                        type: "button",
                                        size: "sm",
                                        variant: "outline",
                                        onClick: ()=>movePage(page + 1),
                                        disabled: !canMoveNext,
                                        children: "Next"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                        lineNumber: 709,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                lineNumber: 705,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                        lineNumber: 701,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 610,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                open: serverDialogOpen,
                onOpenChange: setServerDialogOpen,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                    className: "max-w-xl",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogHeader"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    children: editingServerId ? "Edit Managed Server" : "Register Managed Server"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 719,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                    children: "Connection secrets are write-only and rotated separately. This form stores only metadata needed for managed connectivity."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 720,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 718,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "grid gap-3 md:grid-cols-2",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1 md:col-span-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Subnet"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 727,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: formState.subnetId,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        subnetId: event.target.value
                                                    })),
                                            className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "Select subnet"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 733,
                                                    columnNumber: 17
                                                }, this),
                                                subnets.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                        value: item.id,
                                                        children: [
                                                            item.name,
                                                            " (",
                                                            item.cidrBlock,
                                                            ")"
                                                        ]
                                                    }, item.id, true, {
                                                        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                        lineNumber: 735,
                                                        columnNumber: 19
                                                    }, this))
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 728,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 726,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Hostname"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 742,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.hostname,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        hostname: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 743,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 741,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "IP Address"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 749,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.ipAddress,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        ipAddress: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 750,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 748,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Operating System"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 756,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.operatingSystem,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        operatingSystem: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 757,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 755,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Environment"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 763,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.environment,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        environment: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 764,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 762,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Server Status"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 770,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.status,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        status: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 771,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 769,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Connectivity"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 777,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: formState.connectivityStatus,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectivityStatus: event.target.value
                                                    })),
                                            className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                            children: STATUS_OPTIONS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: item,
                                                    children: item
                                                }, item, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 784,
                                                    columnNumber: 19
                                                }, this))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 778,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 776,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Connection Protocol"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 792,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: formState.connectionProtocol,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectionProtocol: event.target.value
                                                    })),
                                            className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "None"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 798,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "Ssh",
                                                    children: "Ssh"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 799,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "WinRm",
                                                    children: "WinRm"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 800,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "Agent",
                                                    children: "Agent"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 801,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 793,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 791,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Connection Host"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 805,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.connectionHost,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectionHost: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 806,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 804,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Connection Port"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 812,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.connectionPort,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectionPort: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 813,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 811,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Auth Mode"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 819,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                            value: formState.connectionAuthMode,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectionAuthMode: event.target.value
                                                    })),
                                            className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "",
                                                    children: "None"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 825,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "Password",
                                                    children: "Password"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 826,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "Key",
                                                    children: "Key"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 827,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: "Token",
                                                    children: "Token"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 828,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 820,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 818,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "space-y-1 md:col-span-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "wb-kicker",
                                            children: "Connection Username"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 832,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Input"], {
                                            value: formState.connectionUsername,
                                            onChange: (event)=>setFormState((current)=>({
                                                        ...current,
                                                        connectionUsername: event.target.value
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 833,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 831,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 725,
                            columnNumber: 11
                        }, this),
                        formError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-destructive",
                            children: formError
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 840,
                            columnNumber: 24
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogFooter"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "outline",
                                    onClick: ()=>setServerDialogOpen(false),
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 843,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    onClick: ()=>saveServerMutation.mutate(formState),
                                    disabled: saveServerMutation.isPending,
                                    children: saveServerMutation.isPending ? "Saving..." : editingServerId ? "Save Changes" : "Register Server"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 846,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 842,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                    lineNumber: 717,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 716,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                open: assignmentDialogServer !== null,
                onOpenChange: (open)=>!open ? setAssignmentDialogServer(null) : null,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                    className: "max-w-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogHeader"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    children: "Scanner Assignments"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 856,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                    children: "Enable scanners for this server and persist assignment telemetry routing in backend inventory."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 857,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 855,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "space-y-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "wb-kicker",
                                    children: "Default Connectivity For New Assignments"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 863,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                    value: assignmentConnectivityStatus,
                                    onChange: (event)=>setAssignmentConnectivityStatus(event.target.value),
                                    className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                    children: STATUS_OPTIONS.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                            value: item,
                                            children: item
                                        }, item, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 870,
                                            columnNumber: 17
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 864,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 862,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border/70 bg-surface-2/55 p-2",
                            children: scanners.map((scanner)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                    className: "flex items-center justify-between gap-2 rounded-md border border-border/60 bg-surface-1/80 px-2 py-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-sm font-medium",
                                                    children: scanner.name
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 881,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "mt-1 flex flex-wrap gap-1",
                                                    children: scanner.capabilities.map((capability)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: capability
                                                        }, `${scanner.id}-${capability}`, false, {
                                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                            lineNumber: 884,
                                                            columnNumber: 23
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                                    lineNumber: 882,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 880,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                            type: "checkbox",
                                            checked: Boolean(assignmentSelection[scanner.id]),
                                            onChange: (event)=>setAssignmentSelection((current)=>({
                                                        ...current,
                                                        [scanner.id]: event.target.checked
                                                    }))
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                            lineNumber: 888,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, scanner.id, true, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 879,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 877,
                            columnNumber: 11
                        }, this),
                        assignmentError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-destructive",
                            children: assignmentError
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 902,
                            columnNumber: 30
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogFooter"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "outline",
                                    onClick: ()=>setAssignmentDialogServer(null),
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 905,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    onClick: ()=>assignmentMutation.mutate(),
                                    disabled: assignmentMutation.isPending,
                                    children: assignmentMutation.isPending ? "Saving..." : "Save Assignments"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 908,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 904,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                    lineNumber: 854,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 853,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Dialog"], {
                open: secretDialogServer !== null,
                onOpenChange: (open)=>!open ? setSecretDialogServer(null) : null,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogContent"], {
                    className: "max-w-lg",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogHeader"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogTitle"], {
                                    children: "Rotate Connection Secret"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 918,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogDescription"], {
                                    children: "Secret payload is encrypted before persistence and never returned in read responses."
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 919,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 917,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "space-y-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "wb-kicker",
                                    children: "Secret Payload"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 925,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Textarea"], {
                                    value: secretPayload,
                                    onChange: (event)=>setSecretPayload(event.target.value),
                                    placeholder: "Paste credential payload JSON or token bundle"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 926,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 924,
                            columnNumber: 11
                        }, this),
                        secretError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs text-destructive",
                            children: secretError
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 933,
                            columnNumber: 26
                        }, this) : null,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DialogFooter"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    variant: "outline",
                                    onClick: ()=>setSecretDialogServer(null),
                                    children: "Cancel"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 936,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Button"], {
                                    type: "button",
                                    onClick: ()=>rotateSecretMutation.mutate(),
                                    disabled: rotateSecretMutation.isPending,
                                    children: rotateSecretMutation.isPending ? "Rotating..." : "Rotate Secret"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                                    lineNumber: 939,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                            lineNumber: 935,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                    lineNumber: 916,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
                lineNumber: 915,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/servers/managed-server-inventory-page.tsx",
        lineNumber: 456,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=src_7528cff6._.js.map