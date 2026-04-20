import { vi } from "vitest"

type NextNavigationMockInit = {
  pathname?: string
  search?: string
}

function applyUrl(state: { pathname: string; searchParams: URLSearchParams }, url: string) {
  const nextUrl = new URL(url, "https://workbench.test")
  state.pathname = nextUrl.pathname
  state.searchParams = new URLSearchParams(nextUrl.search)
}

export function createNextNavigationMockState(init: NextNavigationMockInit = {}) {
  const state = {
    pathname: init.pathname ?? "/",
    searchParams: new URLSearchParams(init.search ?? ""),
    push: vi.fn<(url: string) => void>(),
    replace: vi.fn<(url: string) => void>(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined),
    redirect: vi.fn<(url: string) => void>(),
    setUrl(url: string) {
      applyUrl(state, url)
    },
    reset(nextInit: NextNavigationMockInit = {}) {
      state.pathname = nextInit.pathname ?? "/"
      state.searchParams = new URLSearchParams(nextInit.search ?? "")
      state.push.mockClear()
      state.replace.mockClear()
      state.back.mockClear()
      state.forward.mockClear()
      state.refresh.mockClear()
      state.prefetch.mockClear()
      state.redirect.mockClear()
    },
  }

  state.push.mockImplementation((url) => {
    state.setUrl(url)
  })
  state.replace.mockImplementation((url) => {
    state.setUrl(url)
  })

  return state
}

export function buildNextNavigationMock(state: ReturnType<typeof createNextNavigationMockState>) {
  return {
    useRouter: () => ({
      push: state.push,
      replace: state.replace,
      back: state.back,
      forward: state.forward,
      refresh: state.refresh,
      prefetch: state.prefetch,
    }),
    usePathname: () => state.pathname,
    useSearchParams: () => state.searchParams,
    redirect: state.redirect,
  }
}
