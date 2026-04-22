import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { WorkbenchShell } from "@/components/workbench/app-shell"
import { WorkbenchInspectorProvider } from "@/components/workbench/workbench-inspector"
import { THEME_STORAGE_KEY } from "@/shared/theme/theme"
import { ThemeProvider } from "@/shared/theme/theme-provider"

const mockedUseWorkbenchQuery = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  usePathname: () => "/queue",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock("@/shared/auth/auth-provider", () => ({
  useAuth: () => ({
    session: {
      token: "token",
      expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "u1",
      username: "analyst",
      roles: ["Analyst"],
    },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}))

vi.mock("@/shared/query/use-workbench-query", () => ({
  useWorkbenchQuery: mockedUseWorkbenchQuery,
}))

describe("WorkbenchShell smoke", () => {
  afterEach(() => {
    cleanup()
    window.localStorage.removeItem(THEME_STORAGE_KEY)
    document.documentElement.className = ""
  })

  beforeEach(() => {
    mockedUseWorkbenchQuery.mockImplementation((key: unknown) => {
      const queryKey = Array.isArray(key) ? key : []
      if (queryKey[1] === "notifications") {
        return {
          data: {
            items: [],
            hasPartialError: false,
          },
          isLoading: false,
          isError: false,
        }
      }

      return {
        data: [],
        isLoading: false,
        isError: false,
      }
    })
  })

  it("renders shell-level global search, breadcrumbs, and notifications controls", () => {
    render(
      <ThemeProvider>
        <WorkbenchInspectorProvider>
          <WorkbenchShell>
            <div>Workbench Content</div>
          </WorkbenchShell>
        </WorkbenchInspectorProvider>
      </ThemeProvider>,
    )

    expect(screen.getByTestId("global-search-trigger")).toBeInTheDocument()
    expect(screen.getByTestId("shell-breadcrumbs")).toBeInTheDocument()
    expect(screen.getByTestId("notifications-trigger")).toBeInTheDocument()
  })

  it("shows explicit reduced-capability notification messaging", () => {
    render(
      <ThemeProvider>
        <WorkbenchInspectorProvider>
          <WorkbenchShell>
            <div>Workbench Content</div>
          </WorkbenchShell>
        </WorkbenchInspectorProvider>
      </ThemeProvider>,
    )

    const [trigger] = screen.getAllByTestId("notifications-trigger")
    fireEvent.click(trigger)
    expect(screen.getByText(/notification coverage is currently limited to job activity/i)).toBeInTheDocument()
  })

  it("defaults to dark and toggles to persisted light mode", () => {
    render(
      <ThemeProvider>
        <WorkbenchInspectorProvider>
          <WorkbenchShell>
            <div>Workbench Content</div>
          </WorkbenchShell>
        </WorkbenchInspectorProvider>
      </ThemeProvider>,
    )

    expect(document.documentElement.classList.contains("dark")).toBe(true)
    const [themeToggle] = screen.getAllByTestId("theme-toggle")
    fireEvent.click(themeToggle)

    expect(document.documentElement.classList.contains("light")).toBe(true)
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light")
  })
})
