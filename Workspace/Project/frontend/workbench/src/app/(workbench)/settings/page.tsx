"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { classifyUiError } from "@/shared/api/error-classification"
import { useAuth } from "@/shared/auth/auth-provider"
import { canAccessAdminActions, canAccessWorkflowSettingsActions, roleLabel, roleLabels } from "@/shared/auth/session"
import { gateway, isModeConfigured } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { CompactEmptyState, LoadingState, UnavailableState } from "@/shared/ui/state-panels"

const AUDIT_PREVIEW_SIZE = 5
const RETENTION_DATA_TYPES = ["ScanResult", "Alert", "Report", "AuditLog", "IocFile"] as const
const SCANNER_CAPABILITIES = ["Yara", "Sigma", "Snort", "Suricata"] as const
const SCANNER_ENGINES = ["Yara", "Sigma", "Snort", "Suricata"] as const
const ALERT_OWNER_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
type SettingsSectionKey = "owners" | "email" | "retention" | "access" | "scanners"

function formatTimestamp(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not reported"
}

function statusTone(label: string) {
  const normalized = label.toLowerCase()
  if (normalized.includes("healthy") || normalized === "ready" || normalized === "completed") {
    return "border-emerald-300/35 bg-emerald-500/10 text-emerald-100"
  }
  if (normalized.includes("degraded") || normalized.includes("queued")) {
    return "border-amber-300/35 bg-amber-500/10 text-amber-100"
  }
  if (normalized.includes("unhealthy") || normalized.includes("failed") || normalized.includes("offline") || normalized === "not ready") {
    return "border-destructive/35 bg-destructive/10 text-destructive"
  }
  return "border-border/70 bg-surface-2/65 text-foreground"
}

function StatusPill({ label }: { label: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(label)}`}>{label}</span>
}

function InlineFailure({ title, error }: { title: string; error: unknown }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
      <p className="text-xs font-semibold tracking-tight text-destructive">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{classifyUiError(error).message}</p>
    </div>
  )
}

export default function SettingsPage() {
  const { session } = useAuth()
  const queryClient = useQueryClient()
  const canAdmin = canAccessAdminActions(session)
  const canWorkflowSettings = canAccessWorkflowSettingsActions(session)
  const actorUserId = session?.userId ?? session?.username ?? ""

  const [overviewMessage, setOverviewMessage] = useState<string | null>(null)
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null)
  const [alertOwnerMessage, setAlertOwnerMessage] = useState<string | null>(null)
  const [accessMessage, setAccessMessage] = useState<string | null>(null)
  const [scannerMessage, setScannerMessage] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SettingsSectionKey>("owners")

  const [retentionForm, setRetentionForm] = useState({ dataType: "ScanResult", retainDays: "30", archiveAfterDays: "14" })
  const [archivePrefix, setArchivePrefix] = useState("file://archives")
  const [selectedRetentionPolicyId, setSelectedRetentionPolicyId] = useState("")
  const [newAlertOwner, setNewAlertOwner] = useState({ key: "", displayName: "", email: "" })
  const [alertOwnerDrafts, setAlertOwnerDrafts] = useState<Record<string, { displayName: string; email: string; isEnabled: boolean }>>({})

  const [newUser, setNewUser] = useState({ userName: "", email: "", displayName: "", password: "", role: "" })
  const [newRoleName, setNewRoleName] = useState("")
  const [newPermission, setNewPermission] = useState({ key: "", description: "" })
  const [rolePermissionForm, setRolePermissionForm] = useState({ roleId: "", permissionId: "" })

  const [newScanner, setNewScanner] = useState({ name: "", engineType: "Yara", version: "", capabilities: ["Yara"] as string[] })
  const [selectedScannerId, setSelectedScannerId] = useState("")
  const [scannerCapabilitiesDraft, setScannerCapabilitiesDraft] = useState<string[]>([])

  const healthQuery = useWorkbenchQuery(["settings", "health"], (signal) => gateway.getHealthInfo(signal))
  const readinessQuery = useWorkbenchQuery(["settings", "ready"], (signal) => gateway.getHealthReady(signal))
  const healthAdminQuery = useWorkbenchQuery(["settings", "admin-runtime"], (signal) => gateway.getHealthAdmin(signal), { enabled: canAdmin })
  const jobsQuery = useWorkbenchQuery(["settings", "jobs"], (signal) => gateway.listJobRuns(signal), { enabled: canAdmin })
  const auditQuery = useWorkbenchQuery(["settings", "audit"], (signal) => gateway.listAuditLogs({ page: 1, pageSize: AUDIT_PREVIEW_SIZE }, signal), { enabled: canAdmin })
  const retentionPoliciesQuery = useWorkbenchQuery(["settings", "retention-policies"], (signal) => gateway.listRetentionPolicies(signal), { enabled: canAdmin })
  const archiveRecordsQuery = useWorkbenchQuery(["settings", "archives", selectedRetentionPolicyId], (signal) => gateway.listArchiveRecords(selectedRetentionPolicyId || undefined, signal), { enabled: canAdmin })
  const alertOwnersQuery = useWorkbenchQuery(["settings", "alert-owners"], (signal) => gateway.listSettingsAlertOwners(signal), { enabled: canAdmin })
  const smtpStatusQuery = useWorkbenchQuery(["settings", "smtp-status"], (signal) => gateway.getSmtpNotificationStatus(signal), { enabled: canAdmin })
  const usersQuery = useWorkbenchQuery(["settings", "users"], (signal) => gateway.listUsers(signal), { enabled: canAdmin })
  const rolesQuery = useWorkbenchQuery(["settings", "roles"], (signal) => gateway.listRoles(signal), { enabled: canAdmin })
  const permissionsQuery = useWorkbenchQuery(["settings", "permissions"], (signal) => gateway.listPermissions(signal), { enabled: canAdmin })
  const rolePermissionsQuery = useWorkbenchQuery(["settings", "role-permissions"], (signal) => gateway.listRolePermissions(undefined, signal), { enabled: canAdmin })
  const scannersQuery = useWorkbenchQuery(["settings", "scanners"], (signal) => gateway.listScanners(signal), { enabled: canWorkflowSettings })

  const retentionPolicies = useMemo(() => retentionPoliciesQuery.data ?? [], [retentionPoliciesQuery.data])
  const archiveRecords = useMemo(() => archiveRecordsQuery.data ?? [], [archiveRecordsQuery.data])
  const alertOwners = useMemo(() => alertOwnersQuery.data ?? [], [alertOwnersQuery.data])
  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data])
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data])
  const rolePermissions = useMemo(() => rolePermissionsQuery.data ?? [], [rolePermissionsQuery.data])
  const scanners = useMemo(() => scannersQuery.data ?? [], [scannersQuery.data])
  const health = healthQuery.data ?? {
    service: "Backend API",
    status: "unknown",
    utcNow: new Date().toISOString(),
  }
  const readiness = readinessQuery.data ?? { status: "unknown", components: [] }
  const overviewUnavailable = healthQuery.isError || readinessQuery.isError
  const auditItems = Array.isArray(auditQuery.data?.items) ? auditQuery.data.items : []
  const selectedScanner = scanners.find((item) => item.id === selectedScannerId) ?? null
  const enabledAlertOwners = alertOwners.filter((owner) => owner.isEnabled).length
  const settingsSections = useMemo(
    () => [
      ...(canAdmin
        ? [
            {
              key: "owners" as const,
              label: "Owner routing",
              helper: `${enabledAlertOwners}/${alertOwners.length} assignable`,
            },
            {
              key: "email" as const,
              label: "Email delivery",
              helper: smtpStatusQuery.data?.willSendEmail ? "SMTP ready" : "Needs SMTP",
            },
            {
              key: "retention" as const,
              label: "Data lifecycle",
              helper: `${retentionPolicies.length} policies`,
            },
            {
              key: "access" as const,
              label: "Access control",
              helper: `${users.length} users / ${roles.length} roles`,
            },
          ]
        : []),
      ...(canWorkflowSettings
        ? [
            {
              key: "scanners" as const,
              label: "Scanner fleet",
              helper: `${scanners.length} registered`,
            },
          ]
        : []),
    ],
    [alertOwners.length, canAdmin, canWorkflowSettings, enabledAlertOwners, retentionPolicies.length, roles.length, scanners.length, smtpStatusQuery.data?.willSendEmail, users.length],
  )

  const groupedRolePermissions = useMemo(
    () => roles.map((role) => ({ role, assignments: rolePermissions.filter((item) => item.roleId === role.id) })),
    [rolePermissions, roles],
  )

  useEffect(() => {
    if (settingsSections.length === 0) {
      return
    }

    if (!settingsSections.some((section) => section.key === activeSection)) {
      setActiveSection(settingsSections[0].key)
    }
  }, [activeSection, settingsSections])

  useEffect(() => {
    if (retentionPolicies.length > 0) {
      setSelectedRetentionPolicyId((current) => retentionPolicies.some((item) => item.id === current) ? current : retentionPolicies[0].id)
    }
  }, [retentionPolicies])

  useEffect(() => {
    setAlertOwnerDrafts((current) => {
      const next: Record<string, { displayName: string; email: string; isEnabled: boolean }> = {}
      for (const owner of alertOwners) {
        next[owner.key] = current[owner.key] ?? {
          displayName: owner.displayName,
          email: owner.email,
          isEnabled: owner.isEnabled,
        }
      }
      return next
    })
  }, [alertOwners])

  useEffect(() => {
    if (roles.length > 0) {
      setNewUser((current) => ({ ...current, role: roles.some((role) => role.name === current.role) ? current.role : roles[0].name }))
      setRolePermissionForm((current) => ({ ...current, roleId: roles.some((role) => role.id === current.roleId) ? current.roleId : roles[0].id }))
    }
  }, [roles])

  useEffect(() => {
    if (permissions.length > 0) {
      setRolePermissionForm((current) => ({ ...current, permissionId: permissions.some((item) => item.id === current.permissionId) ? current.permissionId : permissions[0].id }))
    }
  }, [permissions])

  useEffect(() => {
    if (scanners.length > 0) {
      setSelectedScannerId((current) => scanners.some((item) => item.id === current) ? current : scanners[0].id)
    }
  }, [scanners])

  useEffect(() => {
    setScannerCapabilitiesDraft(selectedScanner?.capabilities ?? [])
  }, [selectedScanner])

  if (!isModeConfigured) {
    return <ClassifiedFailureState failure={classifyUiError(null, { modeMisconfigured: true })} fallbackTitle="Settings unavailable" />
  }

  if ((healthQuery.isLoading || readinessQuery.isLoading) && !healthQuery.data && !readinessQuery.data) {
    return <LoadingState label="Loading settings" />
  }

  async function runModelRetraining() {
    if (!actorUserId) {
      setOverviewMessage("Current session is missing an operator identity.")
      return
    }

    setBusyAction("retrain")
    setOverviewMessage(null)

    try {
      const response = await gateway.runModelRetraining(actorUserId)
      setOverviewMessage(`${response.jobType} triggered with status ${response.status}.`)
      await jobsQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setOverviewMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function createRetentionPolicy() {
    if (!actorUserId) {
      setRetentionMessage("Current session is missing an operator identity.")
      return
    }

    setBusyAction("create-retention")
    setRetentionMessage(null)

    try {
      await gateway.createRetentionPolicy({
        dataType: retentionForm.dataType,
        retainDays: Number(retentionForm.retainDays),
        archiveAfterDays: Number(retentionForm.archiveAfterDays),
        actorUserId,
      })
      setRetentionMessage("Retention policy created.")
      await retentionPoliciesQuery.refetch()
    } catch (error) {
      setRetentionMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function executeRetentionPolicy() {
    if (!actorUserId || !selectedRetentionPolicyId) {
      setRetentionMessage("Select a retention policy and ensure the current session has an operator identity.")
      return
    }

    setBusyAction("execute-retention")
    setRetentionMessage(null)

    try {
      const result = await gateway.executeRetentionPolicy({
        retentionPolicyId: selectedRetentionPolicyId,
        archiveUriPrefix: archivePrefix,
        actorUserId,
      })
      setRetentionMessage(
        result.length > 0 ? `Retention execution archived ${result.length} record(s).` : "Retention execution completed with no new archive records.",
      )
      await archiveRecordsQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setRetentionMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  function validateAlertOwnerFields(key: string, displayName: string, email: string) {
    if (!key.trim() || !displayName.trim() || !email.trim()) {
      return "Owner key, display name, and email are required."
    }

    if (!ALERT_OWNER_KEY_PATTERN.test(key.trim())) {
      return "Owner key must be a lowercase slug using letters, numbers, and hyphens."
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "A valid owner email is required."
    }

    return null
  }

  async function refreshAlertOwnerData() {
    await alertOwnersQuery.refetch()
    await queryClient.invalidateQueries({ queryKey: ["alert-owners"] })
  }

  async function createAlertOwner() {
    if (!actorUserId) {
      setAlertOwnerMessage("Current session is missing an operator identity.")
      return
    }

    const key = newAlertOwner.key.trim().toLowerCase()
    const validationMessage = validateAlertOwnerFields(key, newAlertOwner.displayName, newAlertOwner.email)
    if (validationMessage) {
      setAlertOwnerMessage(validationMessage)
      return
    }

    setBusyAction("create-alert-owner")
    setAlertOwnerMessage(null)

    try {
      await gateway.createSettingsAlertOwner({
        key,
        displayName: newAlertOwner.displayName.trim(),
        email: newAlertOwner.email.trim(),
        isEnabled: true,
        actorUserId,
      })
      setAlertOwnerMessage("Alert owner created.")
      setNewAlertOwner({ key: "", displayName: "", email: "" })
      await refreshAlertOwnerData()
      await auditQuery.refetch()
    } catch (error) {
      setAlertOwnerMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function saveAlertOwner(key: string) {
    if (!actorUserId) {
      setAlertOwnerMessage("Current session is missing an operator identity.")
      return
    }

    const draft = alertOwnerDrafts[key]
    if (!draft) {
      setAlertOwnerMessage("Alert owner draft was not found.")
      return
    }

    const validationMessage = validateAlertOwnerFields(key, draft.displayName, draft.email)
    if (validationMessage) {
      setAlertOwnerMessage(validationMessage)
      return
    }

    setBusyAction(`update-alert-owner:${key}`)
    setAlertOwnerMessage(null)

    try {
      await gateway.updateSettingsAlertOwner(key, {
        displayName: draft.displayName.trim(),
        email: draft.email.trim(),
        isEnabled: draft.isEnabled,
        actorUserId,
      })
      setAlertOwnerMessage("Alert owner updated.")
      await refreshAlertOwnerData()
      await auditQuery.refetch()
    } catch (error) {
      setAlertOwnerMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function createUser() {
    if (!newUser.userName.trim() || !newUser.email.trim() || !newUser.displayName.trim() || !newUser.password.trim() || !newUser.role) {
      setAccessMessage("Username, email, display name, password, and role are required.")
      return
    }

    setBusyAction("create-user")
    setAccessMessage(null)

    try {
      await gateway.createUser({
        userName: newUser.userName.trim(),
        email: newUser.email.trim(),
        displayName: newUser.displayName.trim(),
        password: newUser.password,
        roles: [newUser.role],
      })
      setAccessMessage("User created.")
      setNewUser({ userName: "", email: "", displayName: "", password: "", role: roles[0]?.name ?? "" })
      await usersQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setAccessMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function createRole() {
    if (!newRoleName.trim()) {
      setAccessMessage("Role name is required.")
      return
    }

    setBusyAction("create-role")
    setAccessMessage(null)

    try {
      await gateway.createRole({ name: newRoleName.trim() })
      setAccessMessage("Role created.")
      setNewRoleName("")
      await rolesQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setAccessMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function createPermission() {
    if (!actorUserId || !newPermission.key.trim() || !newPermission.description.trim()) {
      setAccessMessage("Permission key, description, and current operator identity are required.")
      return
    }

    setBusyAction("create-permission")
    setAccessMessage(null)

    try {
      await gateway.createPermission({
        key: newPermission.key.trim(),
        description: newPermission.description.trim(),
        actorUserId,
      })
      setAccessMessage("Permission created.")
      setNewPermission({ key: "", description: "" })
      await permissionsQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setAccessMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function assignRolePermission() {
    if (!actorUserId || !rolePermissionForm.roleId || !rolePermissionForm.permissionId) {
      setAccessMessage("Role, permission, and current operator identity are required.")
      return
    }

    setBusyAction("assign-role-permission")
    setAccessMessage(null)

    try {
      await gateway.assignRolePermission({
        roleId: rolePermissionForm.roleId,
        permissionId: rolePermissionForm.permissionId,
        actorUserId,
      })
      setAccessMessage("Permission assigned to role.")
      await rolePermissionsQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setAccessMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function createScanner() {
    if (!actorUserId || !newScanner.name.trim() || !newScanner.version.trim()) {
      setScannerMessage("Scanner name, version, and current operator identity are required.")
      return
    }

    setBusyAction("create-scanner")
    setScannerMessage(null)

    try {
      await gateway.createScanner({
        name: newScanner.name.trim(),
        engineType: newScanner.engineType,
        version: newScanner.version.trim(),
        actorUserId,
        capabilities: newScanner.capabilities,
      })
      setScannerMessage("Scanner created.")
      setNewScanner({ name: "", engineType: "Yara", version: "", capabilities: ["Yara"] })
      await scannersQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setScannerMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  async function saveScannerCapabilities() {
    if (!actorUserId || !selectedScannerId) {
      setScannerMessage("Select a scanner and ensure the current session has an operator identity.")
      return
    }

    setBusyAction("update-scanner-capabilities")
    setScannerMessage(null)

    try {
      await gateway.updateScannerCapabilities(selectedScannerId, {
        capabilities: scannerCapabilitiesDraft,
        actorUserId,
      })
      setScannerMessage("Scanner capabilities updated.")
      await scannersQuery.refetch()
      await auditQuery.refetch()
    } catch (error) {
      setScannerMessage(classifyUiError(error).message)
    } finally {
      setBusyAction(null)
    }
  }

  function toggleCapabilities(list: string[], capability: string) {
    return list.includes(capability) ? list.filter((item) => item !== capability) : [...list, capability]
  }

  const requiredIssues = readiness.components.filter((component) => component.required && component.status !== "healthy")
  const optionalIssues = readiness.components.filter((component) => !component.required && component.status !== "healthy")

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div>
          <p className="wb-kicker">Settings</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">System configuration and operating status</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor service readiness, retention, access control, and scanner administration from one workspace.
          </p>
        </div>
      </motion.header>

      {settingsSections.length > 0 ? (
        <motion.nav aria-label="Settings domains" className="grid gap-2 rounded-2xl border border-border/60 bg-surface-2/35 p-2 md:grid-cols-2 xl:grid-cols-5" variants={panelMotion}>
          {settingsSections.map((section) => {
            const selected = activeSection === section.key
            return (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-primary/45 bg-primary/15 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-surface-2/65 hover:text-foreground"
                }`}
              >
                <span className="block text-sm font-semibold">{section.label}</span>
                <span className="mt-1 block text-xs">{section.helper}</span>
              </button>
            )
          })}
        </motion.nav>
      ) : null}

      <motion.article className="wb-panel space-y-4" variants={panelMotion}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Overview</h3>
            <p className="mt-1 text-xs text-muted-foreground">Live health, readiness, and session context for the current environment.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overviewUnavailable ? <StatusPill label="Partial data" /> : null}
            <StatusPill label={readiness.status === "ready" ? "Ready" : readiness.status === "unknown" ? "Unknown" : "Not ready"} />
          </div>
        </div>

        {overviewUnavailable ? (
          <UnavailableState
            title="Settings overview is partially unavailable"
            description="One health endpoint failed, but editable settings sections remain available below."
          />
        ) : null}

        <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Service</p>
            <p className="mt-1 text-sm font-semibold">{health.service}</p>
            <p className="mt-1 text-xs text-muted-foreground">Reported {formatTimestamp(health.utcNow)}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Session</p>
            <p className="mt-1 text-sm font-semibold">{session?.username ?? "Unknown user"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Roles: {session?.roles.length ? roleLabels(session.roles) : "None"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
            <p className="wb-kicker">Required Dependencies</p>
            <p className="mt-1 text-sm font-semibold">{requiredIssues.length === 0 ? "Healthy" : `${requiredIssues.length} issue(s)`}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(health.utcNow)}</p>
          </div>
          {canAdmin ? (
            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="wb-kicker">Runtime</p>
              {healthAdminQuery.isLoading ? (
                <p className="mt-1 text-xs text-muted-foreground">Loading runtime metadata...</p>
              ) : healthAdminQuery.isError ? (
                <p className="mt-1 text-xs text-muted-foreground">{classifyUiError(healthAdminQuery.error).message}</p>
              ) : healthAdminQuery.data ? (
                <>
                  <p className="mt-1 text-sm font-semibold">{healthAdminQuery.data.runtime}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {healthAdminQuery.data.machineName} | PID {healthAdminQuery.data.processId}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Admin runtime details are not available for this session.</p>
              )}
            </div>
          ) : null}
        </div>

        {requiredIssues.length > 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
            <p className="text-xs font-semibold tracking-tight text-destructive">Required dependencies need attention</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {requiredIssues.map((component) => `${component.name}: ${component.message}`).join(" | ")}
            </p>
          </div>
        ) : null}

        {optionalIssues.length > 0 ? (
          <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2">
            <p className="text-xs font-semibold tracking-tight text-amber-100">Optional services are degraded</p>
            <p className="mt-1 text-xs text-amber-100/90">
              {optionalIssues.map((component) => `${component.name}: ${component.message}`).join(" | ")}
            </p>
          </div>
        ) : null}

        {canAdmin ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold tracking-tight">Operational Actions</p>
                    <p className="mt-1 text-xs text-muted-foreground">Administrative controls backed by live job orchestration.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={runModelRetraining} disabled={busyAction === "retrain"}>
                    {busyAction === "retrain" ? "Triggering..." : "Run Model Retraining"}
                  </Button>
                </div>
                {overviewMessage ? <p className="mt-2 text-xs text-muted-foreground">{overviewMessage}</p> : null}
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="text-xs font-semibold tracking-tight">Recent Job Runs</p>
                <div className="mt-3 space-y-2">
                  {jobsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading recent job activity...</p>
                  ) : jobsQuery.isError ? (
                    <InlineFailure title="Recent jobs unavailable" error={jobsQuery.error} />
                  ) : (jobsQuery.data ?? []).length === 0 ? (
                    <CompactEmptyState label="No recent jobs have been recorded yet." />
                  ) : (
                    (jobsQuery.data ?? []).slice(0, 6).map((job) => (
                      <div key={job.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{job.jobType}</p>
                          <StatusPill label={job.status} />
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          Triggered by {job.triggeredBy} | {formatTimestamp(job.startedAtUtc)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="text-xs font-semibold tracking-tight">Audit Preview</p>
              <p className="mt-1 text-xs text-muted-foreground">Latest administrative and operational events from the live audit stream.</p>
              <div className="mt-3 space-y-2">
                {auditQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading audit preview...</p>
                ) : auditQuery.isError ? (
                  <InlineFailure title="Audit preview unavailable" error={auditQuery.error} />
                ) : auditItems.length > 0 ? (
                  auditItems.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                      <p className="font-medium">{entry.actionType}</p>
                      <p className="mt-1 text-muted-foreground">
                        {entry.actorUserId} | {entry.entityType} | {formatTimestamp(entry.occurredAtUtc)}
                      </p>
                    </div>
                  ))
                ) : (
                  <CompactEmptyState label="No audit events are available yet." />
                )}
              </div>
            </div>
          </div>
        ) : null}
      </motion.article>

      {canAdmin ? (
        <>
          {activeSection === "retention" ? (
          <motion.article id="retention-settings" className="wb-panel scroll-mt-24 space-y-4" variants={panelMotion}>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Retention</h3>
              <p className="mt-1 text-xs text-muted-foreground">Create retention policies and execute archive runs against supported data types.</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="text-xs font-semibold tracking-tight">Create Policy</p>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <select value={retentionForm.dataType} onChange={(event) => setRetentionForm((current) => ({ ...current, dataType: event.target.value }))} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                    {RETENTION_DATA_TYPES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <Input value={retentionForm.retainDays} onChange={(event) => setRetentionForm((current) => ({ ...current, retainDays: event.target.value }))} placeholder="Retain days" />
                  <Input value={retentionForm.archiveAfterDays} onChange={(event) => setRetentionForm((current) => ({ ...current, archiveAfterDays: event.target.value }))} placeholder="Archive after days" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={createRetentionPolicy} disabled={busyAction === "create-retention"}>
                    {busyAction === "create-retention" ? "Creating..." : "Create Policy"}
                  </Button>
                </div>
                {retentionMessage ? <p className="mt-2 text-xs text-muted-foreground">{retentionMessage}</p> : null}
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="text-xs font-semibold tracking-tight">Execute Policy</p>
                <div className="mt-3 grid gap-2 md:grid-cols-[0.95fr_1.1fr_auto]">
                  <select value={selectedRetentionPolicyId} onChange={(event) => setSelectedRetentionPolicyId(event.target.value)} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                    <option value="">Select policy</option>
                    {retentionPolicies.map((item) => (
                      <option key={item.id} value={item.id}>{item.dataType} | retain {item.retainDays}d</option>
                    ))}
                  </select>
                  <Input value={archivePrefix} onChange={(event) => setArchivePrefix(event.target.value)} placeholder="Archive URI prefix" />
                  <Button size="sm" variant="outline" onClick={executeRetentionPolicy} disabled={busyAction === "execute-retention"}>
                    {busyAction === "execute-retention" ? "Running..." : "Execute"}
                  </Button>
                </div>
              </div>
            </div>

            {retentionPoliciesQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading retention policies...</p>
            ) : retentionPoliciesQuery.isError ? (
              <InlineFailure title="Retention policies unavailable" error={retentionPoliciesQuery.error} />
            ) : (
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="text-xs font-semibold tracking-tight">Policies</p>
                  <div className="mt-3 space-y-2">
                    {retentionPolicies.length === 0 ? (
                      <CompactEmptyState label="No retention policies have been created yet." />
                    ) : (
                      retentionPolicies.map((policy) => (
                        <div key={policy.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{policy.dataType}</p>
                            <StatusPill label={policy.isEnabled ? "Enabled" : "Disabled"} />
                          </div>
                          <p className="mt-1 text-muted-foreground">Retain {policy.retainDays}d | Archive after {policy.archiveAfterDays}d</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="text-xs font-semibold tracking-tight">Archive Records</p>
                  <div className="mt-3 space-y-2">
                    {archiveRecordsQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">Loading archive records...</p>
                    ) : archiveRecordsQuery.isError ? (
                      <InlineFailure title="Archive records unavailable" error={archiveRecordsQuery.error} />
                    ) : archiveRecords.length === 0 ? (
                      <CompactEmptyState label="No archive records are available for the current selection." />
                    ) : (
                      archiveRecords.slice(0, 8).map((record) => (
                        <div key={record.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                          <p className="font-medium">{record.entityType}</p>
                          <p className="mt-1 text-muted-foreground">{record.entityId} | {formatTimestamp(record.archivedAtUtc)}</p>
                          <p className="mt-1 truncate text-muted-foreground">{record.archiveUri}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.article>
          ) : null}

          {activeSection === "owners" ? (
          <motion.article id="alert-owner-emails" className="wb-panel scroll-mt-24 space-y-4" variants={panelMotion}>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Alert owner emails</h3>
              <p className="mt-1 text-xs text-muted-foreground">Manage the department mailboxes available for alert ownership and manual case updates.</p>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
              <p className="text-xs font-semibold tracking-tight">Create Owner</p>
              <div className="mt-3 grid gap-2 md:grid-cols-[0.8fr_1fr_1.1fr_auto]">
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Owner key
                  <Input aria-label="New alert owner key" value={newAlertOwner.key} onChange={(event) => setNewAlertOwner((current) => ({ ...current, key: event.target.value.toLowerCase() }))} placeholder="owner-key" />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Display name
                  <Input aria-label="New alert owner display name" value={newAlertOwner.displayName} onChange={(event) => setNewAlertOwner((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
                  Email
                  <Input aria-label="New alert owner email" value={newAlertOwner.email} onChange={(event) => setNewAlertOwner((current) => ({ ...current, email: event.target.value }))} placeholder="owner@company.test" />
                </label>
                <Button size="sm" onClick={createAlertOwner} disabled={busyAction === "create-alert-owner"}>{busyAction === "create-alert-owner" ? "Creating..." : "Create Owner"}</Button>
              </div>
              {alertOwnerMessage ? <p className="mt-2 text-xs text-muted-foreground">{alertOwnerMessage}</p> : null}
            </div>

            {alertOwnersQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading alert owner directory...</p>
            ) : alertOwnersQuery.isError ? (
              <InlineFailure title="Alert owner directory unavailable" error={alertOwnersQuery.error} />
            ) : alertOwners.length === 0 ? (
              <CompactEmptyState label="No alert owners have been configured yet." />
            ) : (
              <div className="space-y-2">
                {alertOwners.map((owner) => {
                  const draft = alertOwnerDrafts[owner.key] ?? {
                    displayName: owner.displayName,
                    email: owner.email,
                    isEnabled: owner.isEnabled,
                  }
                  const busy = busyAction === `update-alert-owner:${owner.key}`
                  return (
                    <div key={owner.key} className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                      <div className="grid gap-2 lg:grid-cols-[0.8fr_1fr_1.1fr_auto_auto]">
                        <div>
                          <p className="wb-kicker">Key</p>
                          <p className="mt-2 break-all text-sm font-medium">{owner.key}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{owner.source === "configuration" ? "Config fallback" : "Database"}</p>
                        </div>
                        <Input value={draft.displayName} onChange={(event) => setAlertOwnerDrafts((current) => ({ ...current, [owner.key]: { ...draft, displayName: event.target.value } }))} aria-label={`Display name for ${owner.key}`} />
                        <Input value={draft.email} onChange={(event) => setAlertOwnerDrafts((current) => ({ ...current, [owner.key]: { ...draft, email: event.target.value } }))} aria-label={`Email for ${owner.key}`} />
                        <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface-1 px-3 py-2 text-xs text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={draft.isEnabled}
                            onChange={(event) => setAlertOwnerDrafts((current) => ({ ...current, [owner.key]: { ...draft, isEnabled: event.target.checked } }))}
                          />
                          Enabled
                        </label>
                        <Button size="sm" variant="outline" aria-label={`Save ${owner.key} owner`} onClick={() => void saveAlertOwner(owner.key)} disabled={busy}>
                          {busy ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.article>
          ) : null}

          {activeSection === "email" ? (
          <motion.article id="smtp-delivery" className="wb-panel scroll-mt-24 space-y-4" variants={panelMotion}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">SMTP delivery</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Alert email updates use this server-side SMTP configuration. Credentials stay in appsettings, environment variables, or user secrets.
                </p>
              </div>
              {smtpStatusQuery.data ? (
                <StatusPill label={smtpStatusQuery.data.willSendEmail ? "Ready to send" : "Not configured"} />
              ) : null}
            </div>

            {smtpStatusQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Checking SMTP delivery configuration...</p>
            ) : smtpStatusQuery.isError ? (
              <InlineFailure title="SMTP status unavailable" error={smtpStatusQuery.error} />
            ) : smtpStatusQuery.data ? (
              <>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">Enabled</p>
                    <p className="mt-2 font-medium">{smtpStatusQuery.data.enabled ? "Yes" : "No"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">Host</p>
                    <p className="mt-2 break-all font-medium">{smtpStatusQuery.data.host || "Not set"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">Port / TLS</p>
                    <p className="mt-2 font-medium">{smtpStatusQuery.data.port} / {smtpStatusQuery.data.useSsl ? "TLS enabled" : "TLS off"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">From</p>
                    <p className="mt-2 break-all font-medium">{smtpStatusQuery.data.fromEmail || "Not set"}</p>
                    <p className="mt-1 text-muted-foreground">{smtpStatusQuery.data.fromDisplayName || "No display name"}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">Authentication</p>
                    <p className="mt-2 font-medium">{smtpStatusQuery.data.userNameConfigured ? "Username configured" : "No username configured"}</p>
                    <p className="mt-1 text-muted-foreground">Password is never returned to the browser.</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs">
                    <p className="wb-kicker">Result</p>
                    <p className="mt-2 font-medium">{smtpStatusQuery.data.willSendEmail ? "Alert updates will attempt SMTP delivery." : "Alert updates will be saved as NotConfigured."}</p>
                  </div>
                </div>

                {smtpStatusQuery.data.missingRequirements.length > 0 ? (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold tracking-tight text-amber-100">Required before real delivery</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                      {smtpStatusQuery.data.missingRequirements.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Environment variable names</p>
                  <p className="mt-2 break-all">Notifications__Smtp__Enabled, Notifications__Smtp__Host, Notifications__Smtp__Port, Notifications__Smtp__UseSsl, Notifications__Smtp__UserName, Notifications__Smtp__Password, Notifications__Smtp__FromEmail, Notifications__Smtp__FromDisplayName</p>
                </div>
              </>
            ) : null}
          </motion.article>
          ) : null}

          {activeSection === "access" ? (
          <motion.article id="access-settings" className="wb-panel scroll-mt-24 space-y-4" variants={panelMotion}>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Access</h3>
              <p className="mt-1 text-xs text-muted-foreground">Manage users, roles, permissions, and role-permission assignment through the merged identity surface.</p>
            </div>

            {usersQuery.isLoading || rolesQuery.isLoading || permissionsQuery.isLoading || rolePermissionsQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">Loading access controls...</p>
            ) : usersQuery.isError || rolesQuery.isError || permissionsQuery.isError || rolePermissionsQuery.isError ? (
              <InlineFailure title="Access settings unavailable" error={usersQuery.error ?? rolesQuery.error ?? permissionsQuery.error ?? rolePermissionsQuery.error} />
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                    <p className="text-xs font-semibold tracking-tight">Create User</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      <Input value={newUser.userName} onChange={(event) => setNewUser((current) => ({ ...current, userName: event.target.value }))} placeholder="Username" />
                      <Input value={newUser.displayName} onChange={(event) => setNewUser((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" />
                      <Input value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} placeholder="Email" />
                      <Input type="password" value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} placeholder="Password" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {roles.map((role) => {
                        const selected = newUser.role === role.name
                        return (
                          <button key={role.id} type="button" onClick={() => setNewUser((current) => ({ ...current, role: role.name }))} className={`rounded-full border px-2 py-1 text-[11px] ${selected ? "border-primary/45 bg-primary/12 text-foreground" : "border-border/70 bg-surface-1/85 text-muted-foreground"}`}>
                            {roleLabel(role.name)}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-3"><Button size="sm" onClick={createUser} disabled={busyAction === "create-user"}>{busyAction === "create-user" ? "Creating..." : "Create User"}</Button></div>
                  </div>

                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                    <p className="text-xs font-semibold tracking-tight">Create Role and Permission</p>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                      <Input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Role name" />
                      <Button size="sm" variant="outline" onClick={createRole} disabled={busyAction === "create-role"}>{busyAction === "create-role" ? "Creating..." : "Create Role"}</Button>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Input value={newPermission.key} onChange={(event) => setNewPermission((current) => ({ ...current, key: event.target.value }))} placeholder="Permission key" />
                      <Input value={newPermission.description} onChange={(event) => setNewPermission((current) => ({ ...current, description: event.target.value }))} placeholder="Description" />
                      <Button size="sm" variant="outline" onClick={createPermission} disabled={busyAction === "create-permission"}>{busyAction === "create-permission" ? "Creating..." : "Create Permission"}</Button>
                    </div>
                    <div className="mt-4 border-t border-border/70 pt-4">
                      <p className="text-xs font-semibold tracking-tight">Assign Permission to Role</p>
                      <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <select value={rolePermissionForm.roleId} onChange={(event) => setRolePermissionForm((current) => ({ ...current, roleId: event.target.value }))} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                          <option value="">Select role</option>
                          {roles.map((role) => <option key={role.id} value={role.id}>{roleLabel(role.name)}</option>)}
                        </select>
                        <select value={rolePermissionForm.permissionId} onChange={(event) => setRolePermissionForm((current) => ({ ...current, permissionId: event.target.value }))} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                          <option value="">Select permission</option>
                          {permissions.map((permission) => <option key={permission.id} value={permission.id}>{permission.key}</option>)}
                        </select>
                        <Button size="sm" onClick={assignRolePermission} disabled={busyAction === "assign-role-permission"}>{busyAction === "assign-role-permission" ? "Assigning..." : "Assign"}</Button>
                      </div>
                    </div>
                    {accessMessage ? <p className="mt-2 text-xs text-muted-foreground">{accessMessage}</p> : null}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                    <p className="text-xs font-semibold tracking-tight">Access Summary</p>
                    <p className="mt-1 text-xs text-muted-foreground">Current identity inventory and assignment coverage.</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2">
                        <p className="wb-kicker">Users</p>
                        <p className="mt-1 text-sm font-semibold">{users.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2">
                        <p className="wb-kicker">Roles</p>
                        <p className="mt-1 text-sm font-semibold">{roles.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2">
                        <p className="wb-kicker">Permissions</p>
                        <p className="mt-1 text-sm font-semibold">{permissions.length}</p>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2">
                        <p className="wb-kicker">Role Assignments</p>
                        <p className="mt-1 text-sm font-semibold">{rolePermissions.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                    <p className="text-xs font-semibold tracking-tight">Role Access Matrix</p>
                    <p className="mt-1 text-xs text-muted-foreground">Focused view of each role and its effective permission keys.</p>
                    <div className="mt-3 space-y-2">
                      {groupedRolePermissions.map(({ role, assignments }) => (
                        <div key={role.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium">{roleLabel(role.name)}</p>
                            <StatusPill label={`${assignments.length} permission${assignments.length === 1 ? "" : "s"}`} />
                          </div>
                          {assignments.length === 0 ? (
                            <p className="mt-1 text-muted-foreground">No permissions assigned.</p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {assignments.slice(0, 8).map((assignment) => {
                                const permission = permissions.find((item) => item.id === assignment.permissionId)
                                return (
                                  <span key={`${assignment.roleId}:${assignment.permissionId}`} className="rounded-full border border-border/70 bg-surface-2/65 px-2 py-1 text-[11px] text-muted-foreground">
                                    {permission?.key ?? assignment.permissionId}
                                  </span>
                                )
                              })}
                              {assignments.length > 8 ? (
                                <span className="rounded-full border border-border/70 bg-surface-2/65 px-2 py-1 text-[11px] text-muted-foreground">
                                  +{assignments.length - 8} more
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <details className="rounded-lg border border-border/70 bg-surface-2/65 p-3" open>
                      <summary className="cursor-pointer list-none text-xs font-semibold tracking-tight">
                        <div className="flex items-center justify-between gap-2">
                          <span>Users Directory</span>
                          <StatusPill label={`${users.length} users`} />
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2">
                        {users.length === 0 ? (
                          <CompactEmptyState label="No users were returned by the backend." />
                        ) : (
                          users.map((user) => (
                            <div key={user.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                              <p className="font-medium">{user.displayName || user.userName}</p>
                              <p className="mt-1 text-muted-foreground">{user.userName}</p>
                              <p className="mt-1 text-muted-foreground">Role: {roleLabel(user.role)}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </details>

                    <details className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                      <summary className="cursor-pointer list-none text-xs font-semibold tracking-tight">
                        <div className="flex items-center justify-between gap-2">
                          <span>Permission Catalog</span>
                          <StatusPill label={`${permissions.length} keys`} />
                        </div>
                      </summary>
                      <div className="mt-3 space-y-2">
                        {permissions.length === 0 ? (
                          <CompactEmptyState label="No permissions are currently available." />
                        ) : (
                          permissions.map((permission) => (
                            <div key={permission.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                              <p className="font-medium">{permission.key}</p>
                              <p className="mt-1 text-muted-foreground">{permission.description}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </>
            )}
          </motion.article>
          ) : null}

        </>
      ) : null}

      {canWorkflowSettings && activeSection === "scanners" ? (
        <motion.article id="scanner-settings" className="wb-panel scroll-mt-24 space-y-4" variants={panelMotion}>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Scanners</h3>
            <p className="mt-1 text-xs text-muted-foreground">Register scanners and maintain the capability set each scanner advertises to the platform.</p>
          </div>

          {scannersQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading scanners...</p>
          ) : scannersQuery.isError ? (
            <InlineFailure title="Scanner settings unavailable" error={scannersQuery.error} />
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="text-xs font-semibold tracking-tight">Create Scanner</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <Input value={newScanner.name} onChange={(event) => setNewScanner((current) => ({ ...current, name: event.target.value }))} placeholder="Scanner name" />
                    <select value={newScanner.engineType} onChange={(event) => setNewScanner((current) => ({ ...current, engineType: event.target.value, capabilities: [event.target.value] }))} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                      {SCANNER_ENGINES.map((engine) => <option key={engine} value={engine}>{engine}</option>)}
                    </select>
                    <Input value={newScanner.version} onChange={(event) => setNewScanner((current) => ({ ...current, version: event.target.value }))} placeholder="Version" />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SCANNER_CAPABILITIES.map((capability) => {
                      const selected = newScanner.capabilities.includes(capability)
                      return (
                        <button key={capability} type="button" onClick={() => setNewScanner((current) => ({ ...current, capabilities: toggleCapabilities(current.capabilities, capability) }))} className={`rounded-full border px-2 py-1 text-[11px] ${selected ? "border-primary/45 bg-primary/12 text-foreground" : "border-border/70 bg-surface-1/85 text-muted-foreground"}`}>
                          {capability}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3"><Button size="sm" onClick={createScanner} disabled={busyAction === "create-scanner"}>{busyAction === "create-scanner" ? "Creating..." : "Create Scanner"}</Button></div>
                </div>

                <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                  <p className="text-xs font-semibold tracking-tight">Update Capabilities</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                    <select value={selectedScannerId} onChange={(event) => setSelectedScannerId(event.target.value)} className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm">
                      <option value="">Select scanner</option>
                      {scanners.map((scanner) => <option key={scanner.id} value={scanner.id}>{scanner.name}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={saveScannerCapabilities} disabled={busyAction === "update-scanner-capabilities"}>{busyAction === "update-scanner-capabilities" ? "Saving..." : "Save"}</Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SCANNER_CAPABILITIES.map((capability) => {
                      const selected = scannerCapabilitiesDraft.includes(capability)
                      return (
                        <button key={capability} type="button" onClick={() => setScannerCapabilitiesDraft((current) => toggleCapabilities(current, capability))} className={`rounded-full border px-2 py-1 text-[11px] ${selected ? "border-primary/45 bg-primary/12 text-foreground" : "border-border/70 bg-surface-1/85 text-muted-foreground"}`}>
                          {capability}
                        </button>
                      )
                    })}
                  </div>
                  {selectedScanner ? <p className="mt-3 text-xs text-muted-foreground">Current scanner: {selectedScanner.name} | {selectedScanner.engineType} | {formatTimestamp(selectedScanner.lastHeartbeatUtc)}</p> : null}
                  {scannerMessage ? <p className="mt-2 text-xs text-muted-foreground">{scannerMessage}</p> : null}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
                <p className="text-xs font-semibold tracking-tight">Registered Scanners</p>
                <div className="mt-3 space-y-2">
                  {scanners.length === 0 ? (
                    <CompactEmptyState label="No scanners are registered." />
                  ) : (
                    scanners.map((scanner) => (
                      <div key={scanner.id} className="rounded-lg border border-border/70 bg-surface-1/85 px-3 py-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{scanner.name}</p>
                            <p className="mt-1 text-muted-foreground">{scanner.engineType} | v{scanner.version} | {formatTimestamp(scanner.lastHeartbeatUtc)}</p>
                          </div>
                          <StatusPill label={scanner.healthStatus} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {scanner.capabilities.map((capability) => (
                            <span key={`${scanner.id}:${capability}`} className="rounded-full border border-border/70 bg-surface-2/65 px-2 py-1 text-[11px] text-muted-foreground">{capability}</span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </motion.article>
      ) : null}
    </motion.section>
  )
}
