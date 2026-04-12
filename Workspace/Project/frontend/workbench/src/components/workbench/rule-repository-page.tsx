"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type ColumnDef } from "@tanstack/react-table"
import { RuleValidationPanel } from "@/components/workbench/rule-validation-panel"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { classifyUiError } from "@/shared/api/error-classification"
import { ApiError } from "@/shared/api/error"
import type {
  RuleFamily,
  RuleImportAttempt,
  RuleListItem,
  RuleScopeType,
} from "@/shared/api/schemas"
import { useAuth } from "@/shared/auth/auth-provider"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

const FAMILY_OPTIONS: RuleFamily[] = ["yara", "sigma", "snort", "suricata"]
const SCOPE_OPTIONS: RuleScopeType[] = ["global", "environment", "subnet", "server", "scanner"]
const STATUS_OPTIONS = [
  "draft",
  "parsed",
  "validated",
  "needs review",
  "approved",
  "shadow",
  "canary",
  "promoted",
  "disabled",
  "retired",
  "rejected",
]

const FAMILY_LABELS: Record<RuleFamily, string> = {
  yara: "YARA",
  sigma: "Sigma",
  snort: "Snort",
  suricata: "Suricata",
}

function formatFamilyLabel(family: RuleFamily) {
  return FAMILY_LABELS[family]
}

function formatScopeLabel(scopeType: RuleScopeType, scopeValue: string | null) {
  const label = scopeType.charAt(0).toUpperCase() + scopeType.slice(1)
  return scopeValue ? `${label} / ${scopeValue}` : label
}

const columns: ColumnDef<RuleListItem>[] = [
  {
    accessorKey: "name",
    header: "Rule",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.description || "No description"}</p>
      </div>
    ),
  },
  {
    accessorKey: "ruleFamily",
    header: "Family",
    cell: ({ row }) => <StatusBadge value={row.original.ruleFamily} />,
  },
  {
    accessorKey: "source",
    header: "Source",
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.source}</span>,
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => (
      <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.tags.join(", ") || "-"}</p>
    ),
  },
  {
    accessorKey: "severity",
    header: "Severity",
    cell: ({ row }) => <StatusBadge value={row.original.severity} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.original.status} />,
  },
  {
    accessorKey: "scopeType",
    header: "Scope",
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{formatScopeLabel(row.original.scopeType, row.original.scopeValue)}</span>,
  },
  {
    accessorKey: "currentVersionLabel",
    header: "Version",
    cell: ({ row }) => (
      <span className="text-xs">
        {row.original.currentVersionLabel} (r{row.original.currentRevisionNumber})
      </span>
    ),
  },
  {
    accessorKey: "updatedAtUtc",
    header: "Updated",
    cell: ({ row }) => new Date(row.original.updatedAtUtc).toLocaleString(),
  },
]

type RuleFiltersState = {
  q: string
  family: "" | RuleFamily
  source: string
  severity: string
  status: string
  scopeType: "" | RuleScopeType
  tags: string
  fromUtc: string
  toUtc: string
  includeContent: boolean
  includeDeleted: boolean
  sort: "updated_desc" | "updated_asc" | "name_asc" | "name_desc" | "created_desc" | "created_asc"
  page: number
}

type RuleCreateState = {
  name: string
  ruleFamily: RuleFamily
  source: string
  description: string
  tags: string
  severity: string
  status: string
  scopeType: RuleScopeType
  scopeValue: string
  versionLabel: string
  originalContent: string
  actorUserId: string
  changeReason: string
}

type RuleImportState = {
  file: File | null
  declaredRuleFamily: RuleFamily
  name: string
  source: string
  description: string
  tags: string
  severity: string
  status: string
  scopeType: "" | RuleScopeType
  scopeValue: string
  versionLabel: string
  actorUserId: string
  changeReason: string
}

function parseBooleanParam(value: string | null) {
  return value === "true"
}

function parseFilters(searchParams: URLSearchParams): RuleFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    family: (searchParams.get("family") as RuleFamily | "") ?? "",
    source: searchParams.get("source") ?? "",
    severity: searchParams.get("severity") ?? "",
    status: searchParams.get("status") ?? "",
    scopeType: (searchParams.get("scopeType") as RuleScopeType | "") ?? "",
    tags: searchParams.get("tags") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? searchParams.get("updatedFromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? searchParams.get("updatedToUtc") ?? "",
    includeContent: parseBooleanParam(searchParams.get("includeContent")),
    includeDeleted: parseBooleanParam(searchParams.get("includeDeleted")),
    sort: (searchParams.get("sort") as RuleFiltersState["sort"]) ?? "updated_desc",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function parseFieldErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof ApiError) || typeof error.payload !== "object" || error.payload === null) {
    return {}
  }

  const payload = error.payload as Record<string, unknown>
  const errorsValue = payload.errors
  if (typeof errorsValue !== "object" || errorsValue === null) {
    return {}
  }

  const output: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(errorsValue as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      output[key] = value.filter((item): item is string => typeof item === "string")
    }
  }

  return output
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function createEmptyFilters(): RuleFiltersState {
  return {
    q: "",
    family: "",
    source: "",
    severity: "",
    status: "",
    scopeType: "",
    tags: "",
    fromUtc: "",
    toUtc: "",
    includeContent: false,
    includeDeleted: false,
    sort: "updated_desc",
    page: 1,
  }
}

export function RuleRepositoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const sessionActorUserId = useMemo(() => session?.userId ?? session?.username ?? "", [session?.userId, session?.username])

  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState<RuleFiltersState>(parsedFilters)
  const [createForm, setCreateForm] = useState<RuleCreateState>({
    name: "",
    ruleFamily: "yara",
    source: "manual",
    description: "",
    tags: "",
    severity: "medium",
    status: "draft",
    scopeType: "global",
    scopeValue: "",
    versionLabel: "v1",
    originalContent: "",
    actorUserId: sessionActorUserId,
    changeReason: "",
  })
  const [importForm, setImportForm] = useState<RuleImportState>({
    file: null,
    declaredRuleFamily: "yara",
    name: "",
    source: "import",
    description: "",
    tags: "",
    severity: "",
    status: "",
    scopeType: "",
    scopeValue: "",
    versionLabel: "",
    actorUserId: sessionActorUserId,
    changeReason: "",
  })
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({})
  const [lastImportAttempt, setLastImportAttempt] = useState<RuleImportAttempt | null>(null)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  useEffect(() => {
    setCreateForm((previous) => ({ ...previous, actorUserId: sessionActorUserId }))
    setImportForm((previous) => ({ ...previous, actorUserId: sessionActorUserId }))
  }, [sessionActorUserId])

  const createActorUserId = createForm.actorUserId.trim()
  const importActorUserId = importForm.actorUserId.trim()

  const listQuery = useWorkbenchQuery(
    ["rules-repository", parsedFilters],
    (signal) =>
      gateway.listRuleRepository(
        {
          q: parsedFilters.q || undefined,
          includeContent: parsedFilters.includeContent,
          family: parsedFilters.family || undefined,
          source: parsedFilters.source || undefined,
          severity: parsedFilters.severity || undefined,
          status: parsedFilters.status || undefined,
          scopeType: parsedFilters.scopeType || undefined,
          tags: parsedFilters.tags ? splitTags(parsedFilters.tags) : undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          includeDeleted: parsedFilters.includeDeleted,
          sort: parsedFilters.sort,
          page: parsedFilters.page,
          pageSize: 25,
        },
        signal,
      ),
  )

  const createMutation = useMutation({
    mutationFn: () =>
      gateway.createRule({
        name: createForm.name,
        ruleFamily: createForm.ruleFamily,
        source: createForm.source,
        description: createForm.description,
        tags: splitTags(createForm.tags),
        severity: createForm.severity,
        status: createForm.status,
        scopeType: createForm.scopeType,
        scopeValue: createForm.scopeValue || undefined,
        versionLabel: createForm.versionLabel,
        originalContent: createForm.originalContent,
        actorUserId: createActorUserId,
        changeReason: createForm.changeReason || undefined,
      }),
    onSuccess: (detail) => {
      setCreateFieldErrors({})
      void queryClient.invalidateQueries({ queryKey: ["rules-repository"] })
      router.push(`/rules/${detail.rule.id}`)
    },
    onError: (error) => {
      setCreateFieldErrors(parseFieldErrors(error))
    },
  })

  const importMutation = useMutation({
    mutationFn: () => {
      if (!importForm.file) {
        throw new Error("Import requires a file.")
      }

      return gateway.importRuleFile({
        file: importForm.file,
        declaredRuleFamily: importForm.declaredRuleFamily,
        name: importForm.name || undefined,
        source: importForm.source || undefined,
        description: importForm.description || undefined,
        tags: importForm.tags ? splitTags(importForm.tags) : undefined,
        severity: importForm.severity || undefined,
        status: importForm.status || undefined,
        scopeType: importForm.scopeType || undefined,
        scopeValue: importForm.scopeValue || undefined,
        versionLabel: importForm.versionLabel || undefined,
        actorUserId: importActorUserId,
        changeReason: importForm.changeReason || undefined,
      })
    },
    onSuccess: (attempt) => {
      setLastImportAttempt(attempt)
      void queryClient.invalidateQueries({ queryKey: ["rules-repository"] })
      if (attempt.ruleArtifactId && attempt.wasSuccessful) {
        router.push(`/rules/${attempt.ruleArtifactId}`)
      }
    },
  })

  function applyFilters() {
    const next = new URLSearchParams()
    if (filters.q) {
      next.set("q", filters.q)
    }
    if (filters.family) {
      next.set("family", filters.family)
    }
    if (filters.source) {
      next.set("source", filters.source)
    }
    if (filters.severity) {
      next.set("severity", filters.severity)
    }
    if (filters.status) {
      next.set("status", filters.status)
    }
    if (filters.scopeType) {
      next.set("scopeType", filters.scopeType)
    }
    if (filters.tags) {
      next.set("tags", filters.tags)
    }
    if (filters.fromUtc) {
      next.set("fromUtc", filters.fromUtc)
    }
    if (filters.toUtc) {
      next.set("toUtc", filters.toUtc)
    }
    if (filters.includeContent) {
      next.set("includeContent", "true")
    }
    if (filters.includeDeleted) {
      next.set("includeDeleted", "true")
    }
    if (filters.sort && filters.sort !== "updated_desc") {
      next.set("sort", filters.sort)
    }
    if (filters.page > 1) {
      next.set("page", String(filters.page))
    }

    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  function resetFilters() {
    setFilters(createEmptyFilters())
    router.replace(pathname)
  }

  function movePage(nextPage: number) {
    const bounded = Math.max(1, nextPage)
    setFilters((previous) => ({ ...previous, page: bounded }))
    const next = new URLSearchParams(searchParams.toString())
    if (bounded <= 1) {
      next.delete("page")
    } else {
      next.set("page", String(bounded))
    }
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  if (listQuery.isLoading) {
    return <LoadingState label="Loading rule repository" />
  }

  if (listQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(listQuery.error)} fallbackTitle="Rule repository unavailable" />
  }

  const list = listQuery.data
  const items = list?.items ?? []
  const total = list?.totalCount ?? 0
  const deletedCount = items.filter((item) => item.isDeleted).length
  const readyCount = items.filter((item) => item.status === "approved" || item.status === "promoted").length
  const visibleFamilyCount = new Set(items.map((item) => item.ruleFamily)).size
  const page = list?.page ?? 1
  const pageSize = list?.pageSize ?? 25
  const canMoveNext = parsedFilters.page * pageSize < total
  const filteredOut =
    total === 0 &&
    Object.entries(parsedFilters).some(([key, value]) => {
      if (key === "sort") {
        return value !== "updated_desc"
      }
      if (typeof value === "boolean") {
        return value
      }
      return value !== "" && value !== 1
    })
  const familyBreakdown = FAMILY_OPTIONS.map((family) => ({
    family,
    count: items.filter((item) => item.ruleFamily === family).length,
  })).filter((entry) => entry.count > 0)

  return (
    <section className="wb-page space-y-6">
      <header className="wb-page-header">
        <p className="wb-kicker">Rule Repository</p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">YARA, Sigma, Snort, and Suricata</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Repository-first management for live rule inventory. Search metadata by default, include content only when needed, and use the same surface for creation, import, and detailed validation review.
        </p>
        <div className="mt-4 grid gap-3 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="wb-kicker">Visible Rules</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{items.length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="wb-kicker">Total Matches</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{total}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="wb-kicker">Ready In Page</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{readyCount}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-2/65 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="wb-kicker">Deleted In Page</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{deletedCount}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,_rgba(58,93,169,0.18),_rgba(12,18,26,0.96)_72%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="wb-kicker">Visible Families</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{visibleFamilyCount || 0}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {familyBreakdown.length > 0 ? familyBreakdown.map((entry) => (
                <div key={entry.family} className="rounded-full border border-border/70 bg-surface-1/70 px-2.5 py-1 text-[11px] text-muted-foreground">
                  {formatFamilyLabel(entry.family)} <span className="text-foreground">{entry.count}</span>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">No family coverage on this page yet.</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <article className="wb-panel space-y-4 border border-border/70 bg-[linear-gradient(180deg,rgba(12,18,26,0.98),rgba(16,22,32,0.92))]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Search and filter</h3>
            <p className="mt-1 text-xs text-muted-foreground">Search by identity, source, tags, actor, version, or narrow to one family and lifecycle slice.</p>
          </div>
          <div className="rounded-full border border-border/70 bg-surface-2/65 px-3 py-1 text-[11px] text-muted-foreground">
            URL state preserved
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((previous) => ({ ...previous, q: event.target.value, page: 1 }))}
            placeholder="Search name, source, tags, actor, version"
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.family}
            onChange={(event) => setFilters((previous) => ({ ...previous, family: event.target.value as RuleFamily | "", page: 1 }))}
          >
            <option value="">All families</option>
            {FAMILY_OPTIONS.map((family) => (
              <option key={family} value={family}>
                {formatFamilyLabel(family)}
              </option>
            ))}
          </select>
          <Input
            value={filters.source}
            onChange={(event) => setFilters((previous) => ({ ...previous, source: event.target.value, page: 1 }))}
            placeholder="Source"
          />
          <Input
            value={filters.severity}
            onChange={(event) => setFilters((previous) => ({ ...previous, severity: event.target.value, page: 1 }))}
            placeholder="Severity"
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.scopeType}
            onChange={(event) => setFilters((previous) => ({ ...previous, scopeType: event.target.value as RuleScopeType | "", page: 1 }))}
          >
            <option value="">All scope types</option>
            {SCOPE_OPTIONS.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((previous) => ({ ...previous, status: event.target.value, page: 1 }))}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <Input
            value={filters.tags}
            onChange={(event) => setFilters((previous) => ({ ...previous, tags: event.target.value, page: 1 }))}
            placeholder="Tags (comma-separated)"
          />
          <select
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
            value={filters.sort}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                sort: event.target.value as RuleFiltersState["sort"],
                page: 1,
              }))
            }
          >
            <option value="updated_desc">Newest updated</option>
            <option value="updated_asc">Oldest updated</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="created_desc">Newest created</option>
            <option value="created_asc">Oldest created</option>
          </select>
          <Input
            type="date"
            value={filters.fromUtc}
            onChange={(event) => setFilters((previous) => ({ ...previous, fromUtc: event.target.value, page: 1 }))}
            placeholder="Updated from"
          />
          <Input
            type="date"
            value={filters.toUtc}
            onChange={(event) => setFilters((previous) => ({ ...previous, toUtc: event.target.value, page: 1 }))}
            placeholder="Updated to"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.includeContent}
                onChange={(event) => setFilters((previous) => ({ ...previous, includeContent: event.target.checked, page: 1 }))}
              />
              Include content search
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.includeDeleted}
                onChange={(event) => setFilters((previous) => ({ ...previous, includeDeleted: event.target.checked, page: 1 }))}
              />
              Include deleted
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
              Clear
            </Button>
          </div>
        </div>
      </article>

      <article className="wb-panel space-y-4 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.98),rgba(15,21,31,0.9))]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Repository inventory</h3>
            <p className="mt-1 text-xs text-muted-foreground">Current page {page} with {Math.min(pageSize, items.length)} visible records.</p>
          </div>
          <div className="rounded-full border border-border/70 bg-surface-2/60 px-3 py-1 text-[11px] text-muted-foreground">
            Click any row for detail, revisions, import history, and validation.
          </div>
        </div>

        {items.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No rules matched the current filters"
              description="Broaden the time range, remove content search, or clear the scope and status filters to widen the repository view."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                >
                  Reset repository filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No rules in repository"
              description="Create a rule manually or import one file to start revision and diagnostics history."
            />
          )
        ) : (
          <DataGrid data={items} columns={columns} onRowClick={(row) => router.push(`/rules/${row.id}`)} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Page {page}</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(parsedFilters.page - 1)} disabled={parsedFilters.page <= 1}>
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(parsedFilters.page + 1)} disabled={!canMoveNext}>
              Next
            </Button>
          </div>
        </div>
      </article>

      <article className="grid gap-4 xl:grid-cols-2">
        <section className="wb-panel space-y-3 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.96),rgba(16,22,32,0.88))]">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Create single rule</h3>
            <p className="mt-1 text-xs text-muted-foreground">Add one repository rule with explicit family, scope, version, and deployment-ready metadata.</p>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input value={createForm.name} onChange={(event) => setCreateForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Rule name/title" />
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={createForm.ruleFamily}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, ruleFamily: event.target.value as RuleFamily }))}
            >
              {FAMILY_OPTIONS.map((family) => (
                <option key={family} value={family}>
                  {formatFamilyLabel(family)}
                </option>
              ))}
            </select>
            <Input value={createForm.source} onChange={(event) => setCreateForm((previous) => ({ ...previous, source: event.target.value }))} placeholder="Source" />
            <Input value={createForm.tags} onChange={(event) => setCreateForm((previous) => ({ ...previous, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
            <Input value={createForm.severity} onChange={(event) => setCreateForm((previous) => ({ ...previous, severity: event.target.value }))} placeholder="Severity" />
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={createForm.scopeType}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, scopeType: event.target.value as RuleScopeType }))}
            >
              {SCOPE_OPTIONS.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={createForm.status}
              onChange={(event) => setCreateForm((previous) => ({ ...previous, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Input value={createForm.scopeValue} onChange={(event) => setCreateForm((previous) => ({ ...previous, scopeValue: event.target.value }))} placeholder="Scope value" />
            <Input value={createForm.versionLabel} onChange={(event) => setCreateForm((previous) => ({ ...previous, versionLabel: event.target.value }))} placeholder="Version label" />
            <Input value={createForm.actorUserId} onChange={(event) => setCreateForm((previous) => ({ ...previous, actorUserId: event.target.value }))} placeholder="Current session or operator id" />
          </div>
          <Textarea
            value={createForm.description}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Description"
          />
          <Textarea
            value={createForm.originalContent}
            onChange={(event) => setCreateForm((previous) => ({ ...previous, originalContent: event.target.value }))}
            placeholder="Original rule content"
            className="min-h-48 border-border/70 bg-surface-1/90 font-mono text-xs"
          />
          <Input value={createForm.changeReason} onChange={(event) => setCreateForm((previous) => ({ ...previous, changeReason: event.target.value }))} placeholder="Change reason" />
          {Object.keys(createFieldErrors).length > 0 ? (
            <div className="rounded-md border border-destructive/35 bg-destructive/10 p-2 text-xs text-destructive">
              {Object.entries(createFieldErrors).map(([field, errors]) => (
                <p key={field}>{field}: {errors.join("; ")}</p>
              ))}
            </div>
          ) : null}
          {createActorUserId.length === 0 ? <p className="text-xs text-amber-200">Provide an operator identity before creating a rule.</p> : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Single-rule creation stays intentionally lightweight for this first pass.</p>
            <Button type="button" size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || createActorUserId.length === 0}>
              {createMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </div>
        </section>

        <section className="wb-panel space-y-3 border border-border/70 bg-[linear-gradient(180deg,rgba(11,16,24,0.96),rgba(16,22,32,0.88))]">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Import single file</h3>
            <p className="mt-1 text-xs text-muted-foreground">Stage one file, declare its family, and review validation before relying on it in scanning or distribution.</p>
          </div>
          <input
            type="file"
            onChange={(event) =>
              setImportForm((previous) => ({
                ...previous,
                file: event.target.files && event.target.files.length > 0 ? event.target.files[0] : null,
              }))
            }
            className="text-sm"
          />
          <div className="grid gap-2 md:grid-cols-2">
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={importForm.declaredRuleFamily}
              onChange={(event) =>
                setImportForm((previous) => ({ ...previous, declaredRuleFamily: event.target.value as RuleFamily }))
              }
            >
              {FAMILY_OPTIONS.map((family) => (
                <option key={family} value={family}>
                  {formatFamilyLabel(family)}
                </option>
              ))}
            </select>
            <Input value={importForm.actorUserId} onChange={(event) => setImportForm((previous) => ({ ...previous, actorUserId: event.target.value }))} placeholder="Current session or operator id" />
            <Input value={importForm.name} onChange={(event) => setImportForm((previous) => ({ ...previous, name: event.target.value }))} placeholder="Name override" />
            <Input value={importForm.source} onChange={(event) => setImportForm((previous) => ({ ...previous, source: event.target.value }))} placeholder="Source override" />
            <Input value={importForm.tags} onChange={(event) => setImportForm((previous) => ({ ...previous, tags: event.target.value }))} placeholder="Tags override" />
            <Input value={importForm.severity} onChange={(event) => setImportForm((previous) => ({ ...previous, severity: event.target.value }))} placeholder="Severity override" />
            <Input value={importForm.status} onChange={(event) => setImportForm((previous) => ({ ...previous, status: event.target.value }))} placeholder="Status override" />
            <select
              className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
              value={importForm.scopeType}
              onChange={(event) => setImportForm((previous) => ({ ...previous, scopeType: event.target.value as RuleScopeType | "" }))}
            >
              <option value="">Scope type override</option>
              {SCOPE_OPTIONS.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
            <Input value={importForm.scopeValue} onChange={(event) => setImportForm((previous) => ({ ...previous, scopeValue: event.target.value }))} placeholder="Scope value override" />
            <Input value={importForm.versionLabel} onChange={(event) => setImportForm((previous) => ({ ...previous, versionLabel: event.target.value }))} placeholder="Version override" />
            <Input value={importForm.changeReason} onChange={(event) => setImportForm((previous) => ({ ...previous, changeReason: event.target.value }))} placeholder="Change reason" />
          </div>
          <Textarea
            value={importForm.description}
            onChange={(event) => setImportForm((previous) => ({ ...previous, description: event.target.value }))}
            placeholder="Description override"
          />
          {importActorUserId.length === 0 ? <p className="text-xs text-amber-200">Provide an operator identity before importing a rule file.</p> : null}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Use this for clean file intake, not bulk migration.</p>
            <Button type="button" size="sm" onClick={() => importMutation.mutate()} disabled={importMutation.isPending || importActorUserId.length === 0}>
              {importMutation.isPending ? "Importing..." : "Import Rule File"}
            </Button>
          </div>

          {importMutation.isError ? (
            <p className="text-xs text-destructive">{importMutation.error instanceof Error ? importMutation.error.message : "Import failed."}</p>
          ) : null}

          {lastImportAttempt ? (
            <div className="rounded-2xl border border-border/70 bg-surface-2/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold tracking-tight">Latest import validation</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lastImportAttempt.fileName} - {lastImportAttempt.wasSuccessful ? "success" : "failed"}
                  </p>
                </div>
                <StatusBadge value={lastImportAttempt.declaredRuleFamily} />
              </div>
              {lastImportAttempt.failureReason ? <p className="mt-1 text-xs text-destructive">{lastImportAttempt.failureReason}</p> : null}
              <div className="mt-3">
                <RuleValidationPanel validation={lastImportAttempt.validation} title="Import Validation Pipeline" />
              </div>
            </div>
          ) : null}
        </section>
      </article>
    </section>
  )
}
