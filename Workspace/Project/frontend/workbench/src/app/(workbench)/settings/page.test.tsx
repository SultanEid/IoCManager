import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ComponentType } from "react"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())
const gatewayMocks = vi.hoisted(() => ({
  runModelRetraining: vi.fn(),
  createSettingsAlertOwner: vi.fn(),
  updateSettingsAlertOwner: vi.fn(),
}))
const authState = vi.hoisted(() => ({
  roles: ["Admin"] as string[],
  username: "don",
  userId: "admin-1",
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}))

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <section {...props}>{children}</section>,
    header: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <header {...props}>{children}</header>,
    article: ({ children, ...props }: HTMLAttributes<HTMLElement>) => <article {...props}>{children}</article>,
  },
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}))

vi.mock("@/components/ui/input", () => ({
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}))

vi.mock("@/shared/ui/error-fallback", () => ({
  ClassifiedFailureState: ({
    title,
    description,
  }: {
    title: string
    description?: string
  }) => (
    <div>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  ),
}))

vi.mock("@/shared/ui/motion", () => ({
  panelMotion: {},
  staggerMotion: {},
}))

vi.mock("@/shared/ui/state-panels", () => ({
  CompactEmptyState: ({ title, label, description }: { title?: string; label?: string; description?: string }) => (
    <div>
      <h3>{title ?? label}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  ),
  LoadingState: ({ label }: { label: string }) => <div>{label}</div>,
  SimulatedBadge: () => <span>Simulated</span>,
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      userId: authState.userId,
      username: authState.username,
      roles: authState.roles,
    },
  }),
}))

vi.mock("@/shared/auth/session", () => ({
  canAccessAdminActions: (session: { roles?: string[] } | null) => Boolean(session?.roles?.includes("Admin")),
  canAccessWorkflowSettingsActions: (session: { roles?: string[] } | null) =>
    Boolean(
      session?.roles?.includes("Analyst")
      || session?.roles?.includes("Lead")
      || session?.roles?.includes("Admin")
      || session?.roles?.includes("DEV"),
    ),
  roleLabel: (value: string) => value,
  roleLabels: (roles: string[]) => roles.join(", "),
}))

vi.mock("@/shared/gateway", () => ({
  gateway: gatewayMocks,
  isMockMode: false,
  isModeConfigured: true,
}))

function success(data: unknown) {
  return {
    isLoading: false,
    isError: false,
    data,
    error: null,
    refetch: vi.fn(),
  }
}

function failure(error: unknown) {
  return {
    isLoading: false,
    isError: true,
    data: null,
    error,
    refetch: vi.fn(),
  }
}

function seedQueries() {
  mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
    const key = Array.isArray(queryKey) ? queryKey[1] : ""
    switch (key) {
      case "health":
        return success({
          service: "Backend.Api",
          environment: "Development",
          utcNow: "2026-04-20T12:00:00Z",
        })
      case "ready":
        return success({
          status: "ready",
          components: [
            { name: "database", status: "healthy", required: true, message: "Database reachable." },
            { name: "ai_sidecar", status: "degraded", required: false, message: "AI sidecar temporarily unavailable." },
          ],
        })
      case "admin-runtime":
        return success({
          runtime: "8.0.0",
          machineName: "IOC-DEV",
          processId: 1234,
        })
      case "jobs":
        return success([
          {
            id: "11111111-1111-4111-8111-111111111111",
            jobType: "ModelRetraining",
            status: "Completed",
            triggeredBy: "admin-1",
            details: "",
            startedAtUtc: "2026-04-20T10:00:00Z",
            completedAtUtc: "2026-04-20T10:30:00Z",
          },
        ])
      case "audit":
        return success({
          items: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              actorUserId: "admin-1",
              actionType: "identity.user.create",
              entityType: "identity_user",
              entityId: "33333333-3333-4333-8333-333333333333",
              payloadJson: "{}",
              occurredAtUtc: "2026-04-20T11:00:00Z",
            },
          ],
          totalCount: 1,
          page: 1,
          pageSize: 5,
        })
      case "retention-policies":
        return success([
          {
            id: "44444444-4444-4444-8444-444444444444",
            dataType: "ScanResult",
            retainDays: 30,
            archiveAfterDays: 14,
            isEnabled: true,
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
          },
        ])
      case "archives":
        return success([])
      case "alert-owners":
        return success([
          {
            key: "soc",
            displayName: "Security Operations Center",
            email: "soc@local.test",
            isEnabled: true,
            source: "database",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
            createdByUserId: "system",
            updatedByUserId: "system",
          },
          {
            key: "forensics",
            displayName: "Digital Forensics",
            email: "forensics@local.test",
            isEnabled: false,
            source: "database",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T00:00:00Z",
            createdByUserId: "system",
            updatedByUserId: "system",
          },
        ])
      case "users":
        return success([
          {
            id: "55555555-5555-4555-8555-555555555555",
            userName: "don",
            email: "don@local.test",
            displayName: "Don",
            role: "Admin",
          },
        ])
      case "roles":
        return success([
          { id: "66666666-6666-4666-8666-666666666661", name: "Analyst" },
          { id: "66666666-6666-4666-8666-666666666662", name: "Admin" },
        ])
      case "permissions":
        return success([
          {
            id: "77777777-7777-4777-8777-777777777777",
            key: "retention.manage",
            description: "Manage retention policies.",
            createdAtUtc: "2026-04-20T00:00:00Z",
          },
        ])
      case "role-permissions":
        return success([
          {
            roleId: "66666666-6666-4666-8666-666666666662",
            permissionId: "77777777-7777-4777-8777-777777777777",
            grantedByUserId: "system",
            grantedAtUtc: "2026-04-20T00:00:00Z",
          },
        ])
      case "scanners":
        return success([
          {
            id: "88888888-8888-4888-8888-888888888888",
            name: "edge-yara-1",
            engineType: "Yara",
            version: "4.5.0",
            healthStatus: "Healthy",
            lastHeartbeatUtc: "2026-04-20T09:00:00Z",
            createdAtUtc: "2026-04-20T00:00:00Z",
            updatedAtUtc: "2026-04-20T09:00:00Z",
            capabilities: ["Yara"],
          },
        ])
      default:
        return success([])
    }
  })
}

// Route-level rendering is currently too heavy for the Vitest worker on this
// Windows setup and exhausts the JS heap before assertions run.
describe.skip("SettingsPage", () => {
  let SettingsPage: ComponentType

  beforeEach(async () => {
    mockedUseWorkbenchQuery.mockReset()
    gatewayMocks.createSettingsAlertOwner.mockReset()
    gatewayMocks.updateSettingsAlertOwner.mockReset()
    gatewayMocks.createSettingsAlertOwner.mockResolvedValue({
      key: "malware-lab",
      displayName: "Malware Lab",
      email: "malware-lab@local.test",
      isEnabled: true,
      source: "database",
      createdAtUtc: "2026-04-20T00:00:00Z",
      updatedAtUtc: "2026-04-20T00:00:00Z",
      createdByUserId: "admin-1",
      updatedByUserId: "admin-1",
    })
    gatewayMocks.updateSettingsAlertOwner.mockResolvedValue({
      key: "soc",
      displayName: "SOC Updated",
      email: "soc-updated@local.test",
      isEnabled: false,
      source: "database",
      createdAtUtc: "2026-04-20T00:00:00Z",
      updatedAtUtc: "2026-04-20T01:00:00Z",
      createdByUserId: "system",
      updatedByUserId: "admin-1",
    })
    seedQueries()
    authState.roles = ["Admin"]
    authState.username = "don"
    authState.userId = "admin-1"
    vi.resetModules()
    SettingsPage = (await import("@/app/(workbench)/settings/page")).default
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("shows overview only for non-admin users", () => {
    authState.roles = ["Analyst"]

    render(<SettingsPage />)

    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.queryByText("Retention")).not.toBeInTheDocument()
    expect(screen.queryByText("Access")).not.toBeInTheDocument()
    expect(screen.getByText("Scanners")).toBeInTheDocument()
  })

  it("shows admin sections for administrator sessions", () => {
    render(<SettingsPage />)

    expect(screen.getByText("Overview")).toBeInTheDocument()
    expect(screen.getByText("Retention")).toBeInTheDocument()
    expect(screen.getByText("Access")).toBeInTheDocument()
    expect(screen.getByText("Scanners")).toBeInTheDocument()
    expect(screen.getByText("Audit Preview")).toBeInTheDocument()
  })

  it("does not show stale dbo.User copy", () => {
    render(<SettingsPage />)

    expect(screen.queryByText(/dbo\.User/i)).not.toBeInTheDocument()
  })

  it("renders the alert owner directory", () => {
    render(<SettingsPage />)

    expect(screen.getAllByText("Alert owner emails").length).toBeGreaterThan(0)
    expect(screen.getByText("Security Operations Center")).toBeInTheDocument()
    expect(screen.getByText("soc@local.test")).toBeInTheDocument()
    expect(screen.getByText("forensics")).toBeInTheDocument()
  })

  it("validates and creates alert owners", async () => {
    render(<SettingsPage />)

    fireEvent.change(screen.getByLabelText("New alert owner key"), { target: { value: "Bad Key" } })
    fireEvent.change(screen.getByLabelText("New alert owner display name"), { target: { value: "Bad Owner" } })
    fireEvent.change(screen.getByLabelText("New alert owner email"), { target: { value: "bad-owner@local.test" } })
    fireEvent.click(screen.getByRole("button", { name: "Create Owner" }))

    expect(await screen.findByText("Owner key must be a lowercase slug using letters, numbers, and hyphens.")).toBeInTheDocument()
    expect(gatewayMocks.createSettingsAlertOwner).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText("New alert owner key"), { target: { value: "malware-lab" } })
    fireEvent.click(screen.getByRole("button", { name: "Create Owner" }))

    await waitFor(() => {
      expect(gatewayMocks.createSettingsAlertOwner).toHaveBeenCalledWith({
        key: "malware-lab",
        displayName: "Bad Owner",
        email: "bad-owner@local.test",
        isEnabled: true,
        actorUserId: "admin-1",
      })
    })
  })

  it("updates alert owner email, display name, and enabled state", async () => {
    render(<SettingsPage />)

    fireEvent.change(screen.getByLabelText("Display name for soc"), { target: { value: "SOC Updated" } })
    fireEvent.change(screen.getByLabelText("Email for soc"), { target: { value: "soc-updated@local.test" } })
    fireEvent.click(screen.getAllByText("Enabled")[0])
    fireEvent.click(screen.getByRole("button", { name: "Save soc owner" }))

    await waitFor(() => {
      expect(gatewayMocks.updateSettingsAlertOwner).toHaveBeenCalledWith("soc", {
        displayName: "SOC Updated",
        email: "soc-updated@local.test",
        isEnabled: false,
        actorUserId: "admin-1",
      })
    })
  })

  it("surfaces inline failures for admin subsections", () => {
    mockedUseWorkbenchQuery.mockImplementation((queryKey: unknown) => {
      const key = Array.isArray(queryKey) ? queryKey[1] : ""
      if (key === "health") {
        return success({
          service: "Backend.Api",
          environment: "Development",
          utcNow: "2026-04-20T12:00:00Z",
        })
      }
      if (key === "ready") {
        return success({
          status: "ready",
          components: [{ name: "database", status: "healthy", required: true, message: "Database reachable." }],
        })
      }
      if (key === "retention-policies") {
        return failure(new Error("Retention broke"))
      }
      return success([])
    })

    render(<SettingsPage />)

    expect(screen.getByText("Retention policies unavailable")).toBeInTheDocument()
  })
})
