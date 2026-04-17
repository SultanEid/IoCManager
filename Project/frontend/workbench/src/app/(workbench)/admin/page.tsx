"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ApiError } from "@/shared/api/error"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessAdminActions, roleLabel } from "@/shared/auth/session"
import { classifyUiError } from "@/shared/api/error-classification"
import type { AuditLogResponse } from "@/shared/api/schemas"
import { gateway, isMockMode, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { DataGrid } from "@/shared/ui/data-grid"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { LoadingState, SearchEmptyState, SimulatedBadge } from "@/shared/ui/state-panels"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"

const AUDIT_PAGE_SIZE = 15

type AuditFiltersState = {
  q: string
  actorUserId: string
  actionType: string
  entityType: string
  fromUtc: string
  toUtc: string
  page: number
}

const auditColumns: ColumnDef<AuditLogResponse>[] = [
  {
    accessorKey: "occurredAtUtc",
    header: "Occurred",
    cell: ({ row }) => new Date(row.original.occurredAtUtc).toLocaleString(),
  },
  { accessorKey: "actorUserId", header: "Actor" },
  { accessorKey: "actionType", header: "Action" },
  { accessorKey: "entityType", header: "Entity" },
  {
    accessorKey: "entityId",
    header: "Reference",
    cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.entityId.slice(0, 12)}</span>,
  },
]

function parseFilters(searchParams: URLSearchParams): AuditFiltersState {
  const pageRaw = Number(searchParams.get("page") ?? "1")
  return {
    q: searchParams.get("q") ?? "",
    actorUserId: searchParams.get("actorUserId") ?? "",
    actionType: searchParams.get("actionType") ?? "",
    entityType: searchParams.get("entityType") ?? "",
    fromUtc: searchParams.get("fromUtc") ?? "",
    toUtc: searchParams.get("toUtc") ?? "",
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  }
}

function buildQuery(filters: AuditFiltersState): string {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.actorUserId) {
    params.set("actorUserId", filters.actorUserId)
  }
  if (filters.actionType) {
    params.set("actionType", filters.actionType)
  }
  if (filters.entityType) {
    params.set("entityType", filters.entityType)
  }
  if (filters.fromUtc) {
    params.set("fromUtc", filters.fromUtc)
  }
  if (filters.toUtc) {
    params.set("toUtc", filters.toUtc)
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page))
  }
  return params.toString()
}

export default function AdminPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const [message, setMessage] = useState<string | null>(null)
  const [userMessage, setUserMessage] = useState<string | null>(null)
  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({
    userName: "",
    email: "",
    displayName: "",
    password: "",
    roles: ["Analyst"] as string[],
  })
  const [busy, setBusy] = useState<"retrain" | null>(null)
  const canAdmin = canAccessAdminActions(session)
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  if (!isModeConfigured) {
    const failure = classifyUiError(null, { modeMisconfigured: true })
    return <ClassifiedFailureState failure={failure} fallbackTitle="Settings unavailable" />
  }

  const healthQuery = useWorkbenchQuery(["admin", "health"], (signal) => gateway.getHealthInfo(signal))
  const readinessQuery = useWorkbenchQuery(["admin", "ready"], (signal) => gateway.getHealthReady(signal))
  const jobsQuery = useWorkbenchQuery(["admin", "jobs"], (signal) => gateway.listJobRuns(signal))
  const usersQuery = useWorkbenchQuery(["admin", "users"], (signal) => gateway.listUsers(signal), { enabled: canAdmin })
  const rolesQuery = useWorkbenchQuery(["admin", "roles"], (signal) => gateway.listRoles(signal), { enabled: canAdmin })
  const auditQuery = useWorkbenchQuery(
    ["admin", "audit", parsedFilters],
    (signal) =>
      gateway.listAuditLogs(
        {
          q: parsedFilters.q || undefined,
          actorUserId: parsedFilters.actorUserId || undefined,
          actionType: parsedFilters.actionType || undefined,
          entityType: parsedFilters.entityType || undefined,
          fromUtc: parsedFilters.fromUtc || undefined,
          toUtc: parsedFilters.toUtc || undefined,
          page: parsedFilters.page,
          pageSize: AUDIT_PAGE_SIZE,
        },
        signal,
      ),
  )
  const availableUsers = usersQuery.data ?? []
  const availableRoles = rolesQuery.data ?? []
  const roleOptions = availableRoles
  const defaultRoleName = roleOptions.some((role) => role.name === "Analyst") ? "Analyst" : roleOptions[0]?.name ?? ""

  useEffect(() => {
    if (roleOptions.length === 0) {
      return
    }

    setNewUser((previous) => {
      const validRoles = previous.roles.filter((roleName) => roleOptions.some((role) => role.name === roleName))
      const nextRoles = validRoles.length > 0 ? validRoles : [defaultRoleName]

      if (nextRoles.length === previous.roles.length && nextRoles.every((roleName, index) => roleName === previous.roles[index])) {
        return previous
      }

      return {
        ...previous,
        roles: nextRoles,
      }
    })
  }, [defaultRoleName, roleOptions])

  async function runJob(type: "retrain") {
    const triggeredByUserId = session?.userId ?? session?.username
    if (!triggeredByUserId) {
      setMessage("Missing user identity from token claims.")
      return
    }

    setBusy(type)
    setMessage(null)

    try {
      const response = await gateway.runModelRetraining(triggeredByUserId)
      setMessage(`${response.jobType} triggered: ${response.status}`)
    } catch (error) {
      const failure = classifyUiError(error)
      setMessage(failure.message)
    } finally {
      setBusy(null)
    }
  }

  function toggleRole(roleName: string) {
    setNewUser((previous) => {
      const exists = previous.roles.includes(roleName)
      return {
        ...previous,
        roles: exists ? previous.roles.filter((value) => value !== roleName) : [...previous.roles, roleName],
      }
    })
  }

  async function createUser() {
    if (!canAdmin) {
      setUserMessage("Admin role required for user management.")
      return
    }

    if (roleOptions.length === 0) {
      setUserMessage("Role catalog unavailable. User creation is disabled until backend roles are returned.")
      return
    }

    if (
      !newUser.userName.trim() ||
      !newUser.email.trim() ||
      !newUser.displayName.trim() ||
      !newUser.password.trim() ||
      newUser.roles.length === 0
    ) {
      setUserMessage("Username, email, display name, password, and at least one role are required.")
      return
    }

    setCreatingUser(true)
    setUserMessage(null)

    try {
      await gateway.createUser({
        userName: newUser.userName.trim(),
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        password: newUser.password,
        roles: newUser.roles,
      })

      await usersQuery.refetch()
      setNewUser({
        userName: "",
        email: "",
        displayName: "",
        password: "",
        roles: defaultRoleName ? [defaultRoleName] : [],
      })
      setUserMessage("User created successfully.")
    } catch (error) {
      const failure = classifyUiError(error)
      setUserMessage(failure.message)
    } finally {
      setCreatingUser(false)
    }
  }

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared: AuditFiltersState = {
      q: "",
      actorUserId: "",
      actionType: "",
      entityType: "",
      fromUtc: "",
      toUtc: "",
      page: 1,
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const movePage = (page: number) => {
    const next = buildQuery({ ...parsedFilters, page: Math.max(1, page) })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  if (healthQuery.isLoading || readinessQuery.isLoading || jobsQuery.isLoading || auditQuery.isLoading) {
    return <LoadingState label="Loading settings state" />
  }

  if (healthQuery.isError || !healthQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(healthQuery.error)} fallbackTitle="Settings unavailable" />
  }

  if (readinessQuery.isError || !readinessQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(readinessQuery.error)} fallbackTitle="Settings unavailable" />
  }

  if (jobsQuery.isError || !jobsQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(jobsQuery.error)} fallbackTitle="Settings unavailable" />
  }

  if (auditQuery.isError) {
    return <ClassifiedFailureState failure={classifyUiError(auditQuery.error)} fallbackTitle="Audit search unavailable" />
  }

  if (readinessQuery.data.status !== "ready") {
    const unavailableRequired = readinessQuery.data.components
      .filter((component) => component.required && component.status !== "healthy")
      .map((component) => component.name)
    const detail =
      unavailableRequired.length > 0
        ? `Required backend dependencies are unavailable: ${unavailableRequired.join(", ")}.`
        : "Required backend dependencies are unavailable."

    return (
      <ClassifiedFailureState
        failure={classifyUiError(
          new ApiError(detail, 503, readinessQuery.data, {
            title: "Dependency Temporarily Unavailable",
            detail,
            dependency: unavailableRequired.join(",") || "required_dependencies",
            condition: "not_ready",
            dependencyType: "required",
            retryable: true,
          }),
        )}
        fallbackTitle="Settings unavailable"
      />
    )
  }

  const optionalDegradedComponents = readinessQuery.data.components.filter(
    (component) => !component.required && component.status === "degraded",
  )
  const audit = auditQuery.data
  const auditItems = audit?.items ?? []
  const auditTotal = audit?.totalCount ?? 0
  const auditPage = audit?.page ?? parsedFilters.page
  const auditPageSize = audit?.pageSize ?? AUDIT_PAGE_SIZE
  const canMoveNext = auditPage * auditPageSize < auditTotal
  const filteredOut = Object.values(parsedFilters).some((value) => value !== "" && value !== 1)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="wb-kicker">Settings</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">Environment status and orchestration controls</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {healthQuery.data.service} | {healthQuery.data.environment} | {new Date(healthQuery.data.utcNow).toLocaleString()}
            </p>
          </div>
          {isMockMode ? <SimulatedBadge /> : null}
        </div>
        {optionalDegradedComponents.length > 0 ? (
          <div
            data-testid="admin-optional-degraded"
            className="mt-3 rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          >
            Optional dependency degraded:{" "}
            {optionalDegradedComponents.map((component) => `${component.name} (${component.message})`).join(", ")}
          </div>
        ) : null}
      </motion.header>

      <motion.article className="wb-panel" variants={panelMotion}>
        <h2 className="text-sm font-semibold tracking-tight">Operational Actions</h2>
        <p className="mt-1 text-xs text-muted-foreground">Backend-backed job orchestration controls.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" disabled={!canAdmin || busy !== null} onClick={() => runJob("retrain")}>
            Run Model Retraining
          </Button>
        </div>
        {!canAdmin ? <p className="mt-2 text-xs text-amber-200">Admin role required for orchestration actions.</p> : null}
        {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
      </motion.article>

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Audit Search</h2>
            <p className="mt-1 text-xs text-muted-foreground">Filter administrative, rule, report, and infrastructure audit events.</p>
          </div>
          <p className="text-xs text-muted-foreground">Page {auditPage}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value, page: 1 }))}
            placeholder="Search payload or ids"
          />
          <Input
            value={filters.actorUserId}
            onChange={(event) => setFilters((current) => ({ ...current, actorUserId: event.target.value, page: 1 }))}
            placeholder="Actor user id"
          />
          <Input
            value={filters.actionType}
            onChange={(event) => setFilters((current) => ({ ...current, actionType: event.target.value, page: 1 }))}
            placeholder="Action type"
          />
          <Input
            value={filters.entityType}
            onChange={(event) => setFilters((current) => ({ ...current, entityType: event.target.value, page: 1 }))}
            placeholder="Entity type"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <Input
            type="date"
            value={filters.fromUtc}
            onChange={(event) => setFilters((current) => ({ ...current, fromUtc: event.target.value, page: 1 }))}
          />
          <Input
            type="date"
            value={filters.toUtc}
            onChange={(event) => setFilters((current) => ({ ...current, toUtc: event.target.value, page: 1 }))}
          />
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {auditItems.length === 0 ? (
          filteredOut ? (
            <SearchEmptyState
              title="No audit entries matched the current search"
              description="Broaden the time range, remove the actor or entity filter, or clear the query to return to the broader audit trail."
              action={
                <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                  Reset audit filters
                </Button>
              }
            />
          ) : (
            <SearchEmptyState
              title="No audit entries available"
              description="Audit records will appear here once backend actions persist operational and administrative events."
            />
          )
        ) : (
          <DataGrid data={auditItems} columns={auditColumns} />
        )}

        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">Showing {auditItems.length} of {auditTotal} audit entries</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(auditPage - 1)} disabled={auditPage <= 1}>
              Previous
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => movePage(auditPage + 1)} disabled={!canMoveNext}>
              Next
            </Button>
          </div>
        </div>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Recent Job Runs</h2>
        <div className="space-y-2">
          {jobsQuery.data.slice(0, 8).map((job) => (
            <div key={job.id} className="rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2 text-sm">
              <p className="font-medium">
                {job.jobType} | {job.status}
              </p>
              <p className="text-xs text-muted-foreground">
                Triggered by {job.triggeredBy} | {new Date(job.startedAtUtc).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </motion.article>

      <motion.article className="wb-panel" variants={panelMotion}>
        <h2 className="text-sm font-semibold tracking-tight">User Management</h2>
        <p className="mt-1 text-xs text-muted-foreground">Contract-backed Admin controls for account provisioning.</p>

        {!canAdmin ? <p className="mt-3 text-xs text-amber-200">Admin role required for user management.</p> : null}

        {canAdmin && (usersQuery.isLoading || rolesQuery.isLoading) ? (
          <p className="mt-3 text-xs text-muted-foreground">Loading users and roles...</p>
        ) : null}

        {canAdmin && (usersQuery.isError || rolesQuery.isError) ? (
          <div className="mt-3">
            <ClassifiedFailureState
              failure={classifyUiError(usersQuery.error ?? rolesQuery.error)}
              fallbackTitle="User management unavailable"
            />
          </div>
        ) : null}

        {canAdmin && !usersQuery.isLoading && !rolesQuery.isLoading && !usersQuery.isError && !rolesQuery.isError ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="text-xs font-semibold tracking-tight">Create User</p>
              {roleOptions.length === 0 ? (
                <p className="mt-2 text-xs text-amber-200">
                  Role catalog unavailable. User provisioning stays disabled until the backend returns assignable roles.
                </p>
              ) : null}
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input
                  className="h-8 rounded border border-border/70 bg-surface-1/85 px-2 text-xs"
                  placeholder="Username"
                  value={newUser.userName}
                  onChange={(event) => setNewUser((previous) => ({ ...previous, userName: event.target.value }))}
                />
                <input
                  className="h-8 rounded border border-border/70 bg-surface-1/85 px-2 text-xs"
                  placeholder="Display name"
                  value={newUser.displayName}
                  onChange={(event) => setNewUser((previous) => ({ ...previous, displayName: event.target.value }))}
                />
                <input
                  className="h-8 rounded border border-border/70 bg-surface-1/85 px-2 text-xs"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((previous) => ({ ...previous, email: event.target.value }))}
                />
                <input
                  className="h-8 rounded border border-border/70 bg-surface-1/85 px-2 text-xs"
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((previous) => ({ ...previous, password: event.target.value }))}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {roleOptions.map((role) => {
                  const selected = newUser.roles.includes(role.name)
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.name)}
                      className={`rounded-full border px-2 py-1 text-[11px] ${
                        selected
                          ? "border-primary/45 bg-primary/12 text-foreground"
                          : "border-border/70 bg-surface-1/85 text-muted-foreground"
                      }`}
                    >
                      {roleLabel(role.name)}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" disabled={creatingUser || roleOptions.length === 0} onClick={createUser}>
                  {creatingUser ? "Creating..." : "Create User"}
                </Button>
                {userMessage ? <p className="text-xs text-muted-foreground">{userMessage}</p> : null}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="text-xs font-semibold tracking-tight">Existing Users</p>
              <div className="mt-2 space-y-2">
                {availableUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No users returned by backend.</p>
                ) : (
                  availableUsers.map((user) => (
                    <div key={user.id} className="rounded border border-border/65 bg-surface-1/80 px-2 py-1.5 text-xs">
                      <p className="font-medium">{user.displayName || user.userName}</p>
                      <p className="text-muted-foreground">
                        {user.userName}
                        {user.email ? ` | ${user.email}` : ""}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </motion.article>
    </motion.section>
  )
}
