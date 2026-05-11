"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { classifyUiError } from "@/shared/api/error-classification"
import type {
    ScanCadenceType,
    ScanPlanResponse,
    ScanRuleSelectionMode,
    ScannerCapability,
} from "@/shared/api/schemas"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessLeadActions } from "@/shared/auth/session"
import { gateway } from "@/shared/gateway"
import type {
    CreateScanPlanInput,
    ScanPlanStatus,
    ScanRuleScopeType,
    UpdateScanPlanInput,
} from "@/shared/gateway/types"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

const CAPABILITIES: ScannerCapability[] = ["Yara", "Sigma", "Snort", "Suricata"]
const RULE_MODES: ScanRuleSelectionMode[] = ["RuleSet", "RuleScope"]
const SCOPE_TYPES: ScanRuleScopeType[] = ["Global", "Environment", "Subnet", "Server", "Scanner"]
const CADENCE_TYPES: ScanCadenceType[] = ["Manual", "Interval", "Daily", "Weekly"]
const PLAN_STATUSES: ScanPlanStatus[] = ["Draft", "Active", "Paused", "Retired"]
const JOB_STATUSES = ["Queued", "Running", "Completed", "Failed", "Cancelled", "PartiallyCompleted"]
const PLAN_LIBRARY_PAGE_SIZE = 20
const WEEKDAY_OPTIONS = [
    { value: "0", label: "Sunday" },
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
    { value: "6", label: "Saturday" },
]

type FormState = {
    name: string
    description: string
    scannerCapability: ScannerCapability
    ruleSelectionMode: ScanRuleSelectionMode
    ruleScopeType: ScanRuleScopeType
    ruleScopeValue: string
    cadenceType: ScanCadenceType
    intervalMinutes: string
    runAtHourUtc: string
    runAtMinuteUtc: string
    weeklyDayOfWeek: string
    operatorNotes: string
    status: ScanPlanStatus
    targetServerSelection: Record<string, boolean>
    selectedRuleArtifacts: Record<string, boolean>
    ruleRevisionIdsText: string
}

type FilterState = {
    q: string
    scannerCapability: string
    status: string
    cadenceType: string
    lastResultStatus: string
}

const emptyForm = (): FormState => ({
    name: "",
    description: "",
    scannerCapability: "Yara",
    ruleSelectionMode: "RuleSet",
    ruleScopeType: "Global",
    ruleScopeValue: "",
    cadenceType: "Manual",
    intervalMinutes: "",
    runAtHourUtc: "",
    runAtMinuteUtc: "",
    weeklyDayOfWeek: "",
    operatorNotes: "",
    status: "Draft",
    targetServerSelection: {},
    selectedRuleArtifacts: {},
    ruleRevisionIdsText: "",
})

const parseFilters = (params: URLSearchParams): FilterState => ({
    q: params.get("q") ?? "",
    scannerCapability: params.get("scannerCapability") ?? "",
    status: params.get("status") ?? "",
    cadenceType: params.get("cadenceType") ?? "",
    lastResultStatus: params.get("lastResultStatus") ?? "",
})

const buildQuery = (filters: FilterState) => {
    const params = new URLSearchParams()
    if (filters.q) params.set("q", filters.q)
    if (filters.scannerCapability) params.set("scannerCapability", filters.scannerCapability)
    if (filters.status) params.set("status", filters.status)
    if (filters.cadenceType) params.set("cadenceType", filters.cadenceType)
    if (filters.lastResultStatus) params.set("lastResultStatus", filters.lastResultStatus)
    return params.toString()
}

const formatTime = (value: string | null) => (value ? new Date(value).toLocaleString() : "-")

const parseOptionalInt = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number.parseInt(trimmed, 10)
    return Number.isFinite(parsed) ? parsed : undefined
}

const parseGuidList = (raw: string) =>
    raw
        .split(/[\s,]+/)
        .map((v) => v.trim())
        .filter(Boolean)

const cadenceSummary = (plan: ScanPlanResponse) =>
    plan.cadenceType === "Manual"
        ? "Manual"
        : plan.cadenceType === "Interval"
            ? `Every ${plan.intervalMinutes ?? "?"} min`
            : `${plan.cadenceType === "Weekly"
                ? `${WEEKDAY_OPTIONS.find((x) => x.value === String(plan.weeklyDayOfWeek ?? ""))?.label ?? "Weekday"} `
                : "Daily "
            }${String(plan.runAtHourUtc ?? 0).padStart(2, "0")}:${String(plan.runAtMinuteUtc ?? 0).padStart(2, "0")} UTC`

const isCancelable = (status: string) => status === "Queued" || status === "Running"

const targetPreview = (plan: ScanPlanResponse) =>
    plan.targetServers.length === 0
        ? "No targets linked"
        : `${plan.targetServers
            .slice(0, 2)
            .map((x) => x.hostname)
            .join(", ")}${plan.targetServers.length > 2 ? ` +${plan.targetServers.length - 2}` : ""}`

const rulePreview = (plan: ScanPlanResponse) =>
    plan.ruleSelectionMode === "RuleScope"
        ? `${plan.ruleScopeType ?? "Scope"} · ${plan.ruleScopeValue ?? "All"}`
        : plan.rules.length === 0
            ? "No linked rules"
            : `${plan.rules
                .slice(0, 2)
                .map((x) => `${x.ruleName} r${x.revisionNumber}`)
                .join(", ")}${plan.rules.length > 2 ? ` +${plan.rules.length - 2}` : ""}`

const lastRun = (plan: ScanPlanResponse) => formatTime(plan.lastCompletedAtUtc ?? plan.lastQueuedAtUtc)
const lastResult = (plan: ScanPlanResponse) => plan.lastResultStatus ?? "Not run"

const mapPlanToForm = (plan: ScanPlanResponse): FormState => ({
    name: plan.name,
    description: plan.description,
    scannerCapability: plan.scannerCapability,
    ruleSelectionMode: plan.ruleSelectionMode,
    ruleScopeType: (plan.ruleScopeType as ScanRuleScopeType | null) ?? "Global",
    ruleScopeValue: plan.ruleScopeValue ?? "",
    cadenceType: plan.cadenceType,
    intervalMinutes: String(plan.intervalMinutes ?? ""),
    runAtHourUtc: String(plan.runAtHourUtc ?? ""),
    runAtMinuteUtc: String(plan.runAtMinuteUtc ?? ""),
    weeklyDayOfWeek: String(plan.weeklyDayOfWeek ?? ""),
    operatorNotes: plan.operatorNotes,
    status: plan.status as ScanPlanStatus,
    targetServerSelection: Object.fromEntries(plan.targetServerIds.map((id) => [id, true])),
    selectedRuleArtifacts: Object.fromEntries(plan.rules.map((rule) => [rule.ruleArtifactId, true])),
    ruleRevisionIdsText: plan.ruleRevisionIds.join("\n"),
})

const matchesPlan = (plan: ScanPlanResponse, filters: FilterState) => {
    const q = filters.q.trim().toLowerCase()
    const corpus = [
        plan.name,
        plan.description,
        plan.operatorNotes,
        plan.scannerCapability,
        ...plan.targetServers.map((t) => `${t.hostname} ${t.ipAddress}`),
        ...plan.rules.map((r) => `${r.ruleName} ${r.ruleFamily} ${r.versionLabel}`),
    ]
        .join(" ")
        .toLowerCase()

    return (
        (!q || corpus.includes(q)) &&
        (!filters.scannerCapability || plan.scannerCapability === filters.scannerCapability) &&
        (!filters.status || plan.status === filters.status) &&
        (!filters.cadenceType || plan.cadenceType === filters.cadenceType) &&
        (!filters.lastResultStatus || (plan.lastResultStatus ?? "") === filters.lastResultStatus)
    )
}

export function ScanPlanManagementPage() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const queryClient = useQueryClient()
    const { session } = useAuth()

    const actorUserId = session?.userId ?? session?.username ?? ""
    const canManage = canAccessLeadActions(session)

    const parsedFilters = useMemo(
        () => parseFilters(new URLSearchParams(searchParams.toString())),
        [searchParams],
    )

    const [filters, setFilters] = useState(parsedFilters)
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
    const [planLibraryPage, setPlanLibraryPage] = useState(1)
    const [openPlanActionsId, setOpenPlanActionsId] = useState<string | null>(null)
    const [jobStatusFilter, setJobStatusFilter] = useState("")
    const [jobPlanFilter, setJobPlanFilter] = useState("")
    const [formState, setFormState] = useState<FormState>(emptyForm())
    const [message, setMessage] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        // Keep editable filter controls synchronized with URL navigation.
        setFilters(parsedFilters)
    }, [parsedFilters])

    const plansQuery = useWorkbenchQuery(
        ["scanning", "plans"],
        (signal) => gateway.listScanPlans(signal),
        { refetchInterval: 10000 },
    )

    const targetServersQuery = useWorkbenchQuery(
        ["scanning", "target-servers"],
        (signal) => gateway.listTargetServers(undefined, signal),
    )

    const rulesQuery = useWorkbenchQuery(
        ["scanning", "rules"],
        (signal) => gateway.listRuleRepository({ page: 1, pageSize: 200, sort: "updated_desc" }, signal),
    )

    const jobsQuery = useWorkbenchQuery(
        ["scanning", "jobs", jobPlanFilter, jobStatusFilter],
        (signal) =>
            gateway.listScanJobs(
                {
                    scanPlanId: jobPlanFilter || undefined,
                    status: jobStatusFilter || undefined,
                    take: 100,
                },
                signal,
            ),
        { refetchInterval: 5000 },
    )

    const plans = useMemo(() => plansQuery.data ?? [], [plansQuery.data])
    const targetServers = targetServersQuery.data ?? []
    const rules = rulesQuery.data?.items ?? []
    const jobs = jobsQuery.data ?? []

    const planById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans])

    const filteredPlans = useMemo(
        () => plans.filter((plan) => matchesPlan(plan, parsedFilters)),
        [plans, parsedFilters],
    )
    const planLibraryTotalPages = Math.max(1, Math.ceil(filteredPlans.length / PLAN_LIBRARY_PAGE_SIZE))
    const boundedPlanLibraryPage = Math.min(planLibraryPage, planLibraryTotalPages)
    const visiblePlans = filteredPlans.slice(
        (boundedPlanLibraryPage - 1) * PLAN_LIBRARY_PAGE_SIZE,
        boundedPlanLibraryPage * PLAN_LIBRARY_PAGE_SIZE,
    )

    const selectedPlan = editingPlanId ? planById.get(editingPlanId) ?? null : null

    const savePlanMutation = useMutation({
        mutationFn: async () => {
            if (!canManage) throw new Error("Lead/Admin role required for scan-plan mutations.")
            if (!actorUserId) throw new Error("Current session is missing an operator id.")

            const targetServerIds = Object.entries(formState.targetServerSelection)
                .filter(([, selected]) => selected)
                .map(([id]) => id)

            if (targetServerIds.length === 0) throw new Error("Select at least one target server.")

            const explicitRevisionIds = parseGuidList(formState.ruleRevisionIdsText)
            const selectedRuleIds = Object.entries(formState.selectedRuleArtifacts)
                .filter(([, selected]) => selected)
                .map(([id]) => id)

            const selectedRevisionIds = await Promise.all(
                selectedRuleIds.map(async (ruleId) => (await gateway.getRuleDetail(ruleId)).currentRevision.id),
            )

            const ruleRevisionIds = Array.from(new Set([...explicitRevisionIds, ...selectedRevisionIds]))

            if (formState.ruleSelectionMode === "RuleSet" && ruleRevisionIds.length === 0) {
                throw new Error("RuleSet mode requires at least one rule revision.")
            }

            const basePayload: Omit<CreateScanPlanInput, "status"> = {
                name: formState.name.trim(),
                description: formState.description.trim(),
                scannerCapability: formState.scannerCapability,
                ruleSelectionMode: formState.ruleSelectionMode,
                ruleScopeType:
                    formState.ruleSelectionMode === "RuleScope" ? formState.ruleScopeType : undefined,
                ruleScopeValue:
                    formState.ruleSelectionMode === "RuleScope"
                        ? formState.ruleScopeValue.trim() || undefined
                        : undefined,
                cadenceType: formState.cadenceType,
                intervalMinutes:
                    formState.cadenceType === "Interval"
                        ? parseOptionalInt(formState.intervalMinutes)
                        : undefined,
                runAtHourUtc:
                    formState.cadenceType === "Daily" || formState.cadenceType === "Weekly"
                        ? parseOptionalInt(formState.runAtHourUtc)
                        : undefined,
                runAtMinuteUtc:
                    formState.cadenceType === "Daily" || formState.cadenceType === "Weekly"
                        ? parseOptionalInt(formState.runAtMinuteUtc)
                        : undefined,
                weeklyDayOfWeek:
                    formState.cadenceType === "Weekly"
                        ? parseOptionalInt(formState.weeklyDayOfWeek)
                        : undefined,
                operatorNotes: formState.operatorNotes.trim() || undefined,
                actorUserId,
                targetServerIds,
                ruleRevisionIds: formState.ruleSelectionMode === "RuleSet" ? ruleRevisionIds : [],
            }

            if (!editingPlanId) {
                return gateway.createScanPlan({
                    ...basePayload,
                    status: formState.status,
                })
            }

            const updatePayload: UpdateScanPlanInput = {
                ...basePayload,
                status: formState.status,
            }

            return gateway.updateScanPlan(editingPlanId, updatePayload)
        },
        onSuccess: async () => {
            setEditingPlanId(null)
            setFormState(emptyForm())
            setFormError(null)
            setMessage("Scan plan saved.")

            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["scanning", "plans"] }),
                queryClient.invalidateQueries({ queryKey: ["scanning", "jobs"] }),
            ])
        },
        onError: (error) => setFormError(classifyUiError(error).message),
    })

    const runPlanMutation = useMutation({
        mutationFn: async (scanPlanId: string) => {
            if (!actorUserId) throw new Error("Current session is missing an operator id.")
            return gateway.runScanPlan(scanPlanId, actorUserId, "Manual")
        },
        onSuccess: async () => {
            setMessage("Scan job queued.")
            await queryClient.invalidateQueries({ queryKey: ["scanning", "jobs"] })
            await queryClient.invalidateQueries({ queryKey: ["scanning", "plans"] })
        },
        onError: (error) => setMessage(classifyUiError(error).message),
    })

    const cancelJobMutation = useMutation({
        mutationFn: async (scanJobId: string) => {
            if (!actorUserId) throw new Error("Current session is missing an operator id.")
            return gateway.cancelScanJob(scanJobId, actorUserId, "Cancelled by operator.")
        },
        onSuccess: async () => {
            setMessage("Scan job cancellation requested.")
            await queryClient.invalidateQueries({ queryKey: ["scanning", "jobs"] })
            await queryClient.invalidateQueries({ queryKey: ["scanning", "plans"] })
        },
        onError: (error) => setMessage(classifyUiError(error).message),
    })

    if (
        plansQuery.isLoading ||
        targetServersQuery.isLoading ||
        rulesQuery.isLoading ||
        jobsQuery.isLoading
    ) {
        return <LoadingState label="Loading scan plan" />
    }

    if (plansQuery.isError) {
        return (
            <ClassifiedFailureState
                failure={classifyUiError(plansQuery.error)}
                fallbackTitle="Scan plan unavailable"
            />
        )
    }

    if (targetServersQuery.isError) {
        return (
            <ClassifiedFailureState
                failure={classifyUiError(targetServersQuery.error)}
                fallbackTitle="Scan plan unavailable"
            />
        )
    }

    if (rulesQuery.isError) {
        return (
            <ClassifiedFailureState
                failure={classifyUiError(rulesQuery.error)}
                fallbackTitle="Scan plan unavailable"
            />
        )
    }

    if (jobsQuery.isError) {
        return (
            <ClassifiedFailureState
                failure={classifyUiError(jobsQuery.error)}
                fallbackTitle="Scan runs unavailable"
            />
        )
    }

    const clearFilters = () => {
        const cleared = {
            q: "",
            scannerCapability: "",
            status: "",
            cadenceType: "",
            lastResultStatus: "",
        }
        setFilters(cleared)
        setPlanLibraryPage(1)
        setOpenPlanActionsId(null)
        router.replace(pathname)
    }

    const filtersApplied = Object.values(parsedFilters).some(Boolean)

    return (
        <section className="wb-page space-y-4">
            <header className="wb-page-header">
                <p className="wb-kicker">Operations</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Scan Plan</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Reusable scan configurations with scanner family, targets, rule source, cadence, run-now
                    execution, and last-run posture.
                </p>
                {message ? (
                    <div className="mt-4 rounded-xl border border-border/70 bg-surface-2/50 px-3 py-2 text-xs text-muted-foreground">
                        {message}
                    </div>
                ) : null}
            </header>

            <article className="wb-panel space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4">
                        <p className="wb-kicker">Plans</p>
                        <p className="mt-1 text-2xl font-semibold">{plans.length}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4">
                        <p className="wb-kicker">Active</p>
                        <p className="mt-1 text-2xl font-semibold">
                            {plans.filter((x) => x.status === "Active").length}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4">
                        <p className="wb-kicker">Scheduled</p>
                        <p className="mt-1 text-2xl font-semibold">
                            {plans.filter((x) => x.nextRunAtUtc !== null).length}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4">
                        <p className="wb-kicker">Failed Last Result</p>
                        <p className="mt-1 text-2xl font-semibold">
                            {plans.filter((x) => (x.lastResultStatus ?? "").toLowerCase() === "failed").length}
                        </p>
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-5">
                    <Input
                        value={filters.q}
                        onChange={(event) => setFilters((s) => ({ ...s, q: event.target.value }))}
                        placeholder="Search plan, target, or rule"
                    />
                    <select
                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                        value={filters.scannerCapability}
                        onChange={(event) =>
                            setFilters((s) => ({ ...s, scannerCapability: event.target.value }))
                        }
                    >
                        <option value="">All scanners</option>
                        {CAPABILITIES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <select
                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                        value={filters.status}
                        onChange={(event) => setFilters((s) => ({ ...s, status: event.target.value }))}
                    >
                        <option value="">All status</option>
                        {PLAN_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <select
                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                        value={filters.cadenceType}
                        onChange={(event) => setFilters((s) => ({ ...s, cadenceType: event.target.value }))}
                    >
                        <option value="">All cadence</option>
                        {CADENCE_TYPES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                    <select
                        className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
                        value={filters.lastResultStatus}
                        onChange={(event) =>
                            setFilters((s) => ({ ...s, lastResultStatus: event.target.value }))
                        }
                    >
                        <option value="">All last results</option>
                        {JOB_STATUSES.map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                            router.replace(buildQuery(filters) ? `${pathname}?${buildQuery(filters)}` : pathname)
                        }
                    >
                        Apply filters
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                        Clear
                    </Button>
                </div>
            </article>

            <article className="wb-panel space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold tracking-tight">Plan library</h3>
                        <p className="text-xs text-muted-foreground">
                            Showing {visiblePlans.length} of {filteredPlans.length} filtered plans. Secondary actions stay inside the row menu.
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Page {boundedPlanLibraryPage} of {planLibraryTotalPages}
                    </p>
                </div>

                {filteredPlans.length === 0 ? (
                    filtersApplied ? (
                        <SearchEmptyState
                            title="No scan plans matched the current filters"
                            description="Broaden the search or clear status, cadence, scanner, or result filters to reopen the full plan set."
                            action={
                                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                                    Reset plan filters
                                </Button>
                            }
                        />
                    ) : plans.length === 0 ? (
                        <EmptyState
                            title="No scan plans yet"
                            description="Create the first reusable scan plan to avoid rebuilding the same setup every time."
                        />
                    ) : (
                        <EmptyState title="No visible plans" description="The current plan list is empty." />
                    )
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border/75 bg-surface-1/90">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Cadence</TableHead>
                                    <TableHead>Targets</TableHead>
                                    <TableHead>Rules</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead>Last Result</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visiblePlans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-semibold">{plan.name}</p>
                                                    <StatusBadge value={plan.scannerCapability} />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {plan.description || "No description."}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge value={plan.status === "Active" ? "Active" : "Inactive"} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-xs">
                                                <p>{cadenceSummary(plan)}</p>
                                                <p className="text-muted-foreground">Next: {formatTime(plan.nextRunAtUtc)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-xs">
                                                <p>{plan.targetServers.length} server(s)</p>
                                                <p className="text-muted-foreground">{targetPreview(plan)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-xs">
                                                <p>
                                                    {plan.ruleSelectionMode === "RuleScope"
                                                        ? "Scoped rules"
                                                        : `${plan.rules.length} linked rule(s)`}
                                                </p>
                                                <p className="text-muted-foreground">{rulePreview(plan)}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>{lastRun(plan)}</TableCell>
                                        <TableCell>
                                            <div className="space-y-1 text-xs">
                                                <StatusBadge value={lastResult(plan)} />
                                                <p className="line-clamp-2 text-muted-foreground">
                                                    {plan.lastResultSummary || "No completed run summary available."}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                <DropdownMenu
                                                    open={openPlanActionsId === plan.id}
                                                    onOpenChange={(open) => setOpenPlanActionsId(open ? plan.id : null)}
                                                >
                                                    <DropdownMenuTrigger className="inline-flex h-6 items-center rounded-[min(var(--radius-md),10px)] border border-border bg-background px-2 text-xs font-medium transition hover:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground">
                                                    More
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" sideOffset={8} className="grid w-40 gap-1 rounded-xl border border-border/70 bg-surface-1 p-2 shadow-[var(--shadow-panel)]">
                                                        <DropdownMenuItem
                                                            className="rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                                                            onClick={() => {
                                                                setEditingPlanId(plan.id)
                                                                setFormState(mapPlanToForm(plan))
                                                                setJobPlanFilter(plan.id)
                                                                setOpenPlanActionsId(null)
                                                                setMessage("Plan loaded into the editor.")
                                                            }}
                                                        >
                                                            Edit details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2"
                                                            onClick={() => {
                                                                setEditingPlanId(plan.id)
                                                                setFormState(mapPlanToForm(plan))
                                                                setJobPlanFilter(plan.id)
                                                                setOpenPlanActionsId(null)
                                                                setMessage("Schedule settings loaded in the editor.")
                                                            }}
                                                        >
                                                            Schedule
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                            disabled={!canManage || runPlanMutation.isPending}
                                                            onClick={() => {
                                                                setOpenPlanActionsId(null)
                                                                runPlanMutation.mutate(plan.id)
                                                            }}
                                                        >
                                                            Run now
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                {filteredPlans.length > PLAN_LIBRARY_PAGE_SIZE ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface-2/45 px-3 py-2 text-xs text-muted-foreground">
                        <span>
                            Plans {(boundedPlanLibraryPage - 1) * PLAN_LIBRARY_PAGE_SIZE + 1}-{Math.min(boundedPlanLibraryPage * PLAN_LIBRARY_PAGE_SIZE, filteredPlans.length)} of {filteredPlans.length}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                disabled={boundedPlanLibraryPage <= 1}
                                onClick={() => {
                                    setOpenPlanActionsId(null)
                                    setPlanLibraryPage((page) => Math.max(1, page - 1))
                                }}
                            >
                                Previous
                            </Button>
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                disabled={boundedPlanLibraryPage >= planLibraryTotalPages}
                                onClick={() => {
                                    setOpenPlanActionsId(null)
                                    setPlanLibraryPage((page) => Math.min(planLibraryTotalPages, page + 1))
                                }}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                ) : null}
            </article>

            <article className="wb-panel space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">
                        {editingPlanId ? "Plan detail & editor" : "Create scan plan"}
                    </h3>
                    <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                            setEditingPlanId(null)
                            setFormState(emptyForm())
                            setFormError(null)
                        }}
                    >
                        Reset
                    </Button>
                </div>

                {selectedPlan ? (
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                            <p className="wb-kicker">Targets</p>
                            <p className="mt-1 text-sm font-semibold">{selectedPlan.targetServers.length}</p>
                            <p className="text-xs text-muted-foreground">{targetPreview(selectedPlan)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                            <p className="wb-kicker">Rules</p>
                            <p className="mt-1 text-sm font-semibold">
                                {selectedPlan.ruleSelectionMode === "RuleScope"
                                    ? "Scope"
                                    : selectedPlan.rules.length}
                            </p>
                            <p className="text-xs text-muted-foreground">{rulePreview(selectedPlan)}</p>
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                            <p className="wb-kicker">Last Result</p>
                            <p className="mt-1 text-sm font-semibold">{lastResult(selectedPlan)}</p>
                            <p className="text-xs text-muted-foreground">{lastRun(selectedPlan)}</p>
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                        <span className="wb-kicker">Name</span>
                        <Input
                            value={formState.name}
                            onChange={(event) => setFormState((s) => ({ ...s, name: event.target.value }))}
                        />
                    </label>

                    <label className="space-y-1">
                        <span className="wb-kicker">Status</span>
                        <select
                            value={formState.status}
                            onChange={(event) =>
                                setFormState((s) => ({ ...s, status: event.target.value as ScanPlanStatus }))
                            }
                            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            {PLAN_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="wb-kicker">Scanner Type</span>
                        <select
                            value={formState.scannerCapability}
                            onChange={(event) =>
                                setFormState((s) => ({
                                    ...s,
                                    scannerCapability: event.target.value as ScannerCapability,
                                }))
                            }
                            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            {CAPABILITIES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="wb-kicker">Rule Mode</span>
                        <select
                            value={formState.ruleSelectionMode}
                            onChange={(event) =>
                                setFormState((s) => ({
                                    ...s,
                                    ruleSelectionMode: event.target.value as ScanRuleSelectionMode,
                                }))
                            }
                            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            {RULE_MODES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="space-y-1">
                        <span className="wb-kicker">Schedule Type</span>
                        <select
                            value={formState.cadenceType}
                            onChange={(event) =>
                                setFormState((s) => ({ ...s, cadenceType: event.target.value as ScanCadenceType }))
                            }
                            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            {CADENCE_TYPES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </label>

                    {formState.cadenceType === "Interval" ? (
                        <label className="space-y-1">
                            <span className="wb-kicker">Interval Minutes</span>
                            <Input
                                value={formState.intervalMinutes}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, intervalMinutes: event.target.value }))
                                }
                            />
                        </label>
                    ) : null}

                    {formState.cadenceType === "Daily" || formState.cadenceType === "Weekly" ? (
                        <label className="space-y-1">
                            <span className="wb-kicker">Hour UTC</span>
                            <Input
                                value={formState.runAtHourUtc}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, runAtHourUtc: event.target.value }))
                                }
                            />
                        </label>
                    ) : null}

                    {formState.cadenceType === "Daily" || formState.cadenceType === "Weekly" ? (
                        <label className="space-y-1">
                            <span className="wb-kicker">Minute UTC</span>
                            <Input
                                value={formState.runAtMinuteUtc}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, runAtMinuteUtc: event.target.value }))
                                }
                            />
                        </label>
                    ) : null}

                    {formState.cadenceType === "Weekly" ? (
                        <label className="space-y-1">
                            <span className="wb-kicker">Weekday</span>
                            <select
                                value={formState.weeklyDayOfWeek}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, weeklyDayOfWeek: event.target.value }))
                                }
                                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                            >
                                <option value="">Select day</option>
                                {WEEKDAY_OPTIONS.map((value) => (
                                    <option key={value.value} value={value.value}>
                                        {value.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    ) : null}
                </div>

                <label className="space-y-1">
                    <span className="wb-kicker">Description</span>
                    <Textarea
                        value={formState.description}
                        onChange={(event) =>
                            setFormState((s) => ({ ...s, description: event.target.value }))
                        }
                    />
                </label>

                {formState.ruleSelectionMode === "RuleScope" ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="space-y-1">
                            <span className="wb-kicker">Scope Type</span>
                            <select
                                value={formState.ruleScopeType}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, ruleScopeType: event.target.value as ScanRuleScopeType }))
                                }
                                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                            >
                                {SCOPE_TYPES.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="space-y-1">
                            <span className="wb-kicker">Scope Value</span>
                            <Input
                                value={formState.ruleScopeValue}
                                onChange={(event) =>
                                    setFormState((s) => ({ ...s, ruleScopeValue: event.target.value }))
                                }
                            />
                        </label>
                    </div>
                ) : (
                    <label className="space-y-1">
                        <span className="wb-kicker">Rule Revision IDs</span>
                        <Textarea
                            value={formState.ruleRevisionIdsText}
                            onChange={(event) =>
                                setFormState((s) => ({ ...s, ruleRevisionIdsText: event.target.value }))
                            }
                            placeholder="UUIDs separated by comma, space, or newline."
                        />
                    </label>
                )}

                {formState.ruleSelectionMode === "RuleSet" ? (
                    <div className="space-y-2 rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                        <p className="wb-kicker">Rule Set</p>
                        <div className="max-h-36 space-y-1 overflow-y-auto">
                            {rules.map((rule) => (
                                <label key={rule.id} className="flex items-center justify-between gap-2 text-xs">
                                    <span>
                                        {rule.name} ({rule.ruleFamily}) r{rule.currentRevisionNumber}
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(formState.selectedRuleArtifacts[rule.id])}
                                        onChange={(event) =>
                                            setFormState((s) => ({
                                                ...s,
                                                selectedRuleArtifacts: {
                                                    ...s.selectedRuleArtifacts,
                                                    [rule.id]: event.target.checked,
                                                },
                                            }))
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                ) : null}

                <label className="space-y-1">
                    <span className="wb-kicker">Default Options / Notes</span>
                    <Textarea
                        value={formState.operatorNotes}
                        onChange={(event) =>
                            setFormState((s) => ({ ...s, operatorNotes: event.target.value }))
                        }
                    />
                </label>

                <div className="space-y-2 rounded-2xl border border-border/70 bg-surface-2/55 p-3">
                    <p className="wb-kicker">Target Servers</p>
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                        {targetServers.map((server) => (
                            <label key={server.id} className="flex items-center justify-between gap-2 text-xs">
                                <span>
                                    {server.hostname} ({server.ipAddress})
                                </span>
                                <input
                                    type="checkbox"
                                    checked={Boolean(formState.targetServerSelection[server.id])}
                                    onChange={(event) =>
                                        setFormState((s) => ({
                                            ...s,
                                            targetServerSelection: {
                                                ...s.targetServerSelection,
                                                [server.id]: event.target.checked,
                                            },
                                        }))
                                    }
                                />
                            </label>
                        ))}
                    </div>
                </div>

                {formError ? <p className="text-xs text-destructive">{formError}</p> : null}

                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        disabled={!canManage || savePlanMutation.isPending}
                        onClick={() => savePlanMutation.mutate()}
                    >
                        {savePlanMutation.isPending ? "Saving..." : "Save Plan"}
                    </Button>
                </div>
            </article>

            <article className="wb-panel space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight">Recent runs</h3>
                    <div className="flex gap-2">
                        <select
                            value={jobPlanFilter}
                            onChange={(event) => setJobPlanFilter(event.target.value)}
                            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            <option value="">All plans</option>
                            {plans.map((plan) => (
                                <option key={plan.id} value={plan.id}>
                                    {plan.name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={jobStatusFilter}
                            onChange={(event) => setJobStatusFilter(event.target.value)}
                            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
                        >
                            <option value="">All status</option>
                            {JOB_STATUSES.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {jobs.length === 0 ? (
                    <EmptyState
                        title="No scan runs"
                        description="Run a plan now or wait for an active cadence to queue the next execution."
                    />
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border/75 bg-surface-1/90">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Trigger</TableHead>
                                    <TableHead>Queued</TableHead>
                                    <TableHead>Completed</TableHead>
                                    <TableHead>Targets</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={job.id}>
                                        <TableCell>
                                            <StatusBadge value={job.status} />
                                        </TableCell>
                                        <TableCell>
                                            {job.scanPlanId
                                                ? planById.get(job.scanPlanId)?.name ?? job.scanPlanId.slice(0, 8)
                                                : "Manual"}
                                        </TableCell>
                                        <TableCell>{job.triggerSource}</TableCell>
                                        <TableCell>{formatTime(job.queuedAtUtc)}</TableCell>
                                        <TableCell>{formatTime(job.completedAtUtc)}</TableCell>
                                        <TableCell>
                                            {job.completedTargets}/{job.totalTargets} ({job.failedTargets} failed)
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end">
                                                {isCancelable(job.status) ? (
                                                    <Button
                                                        type="button"
                                                        size="xs"
                                                        variant="outline"
                                                        disabled={!canManage || cancelJobMutation.isPending}
                                                        onClick={() => cancelJobMutation.mutate(job.id)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </article>
        </section>
    )
}
