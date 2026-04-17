import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const hoisted = vi.hoisted(() => ({
  aspCtor: vi.fn(),
  mockCtor: vi.fn(),
  augmentedCtor: vi.fn(),
}))

vi.mock("@/shared/gateway/aspnet-gateway", () => ({
  AspNetGateway: class {
    constructor() {
      hoisted.aspCtor()
    }
  },
}))

vi.mock("@/shared/gateway/mock-gateway", () => ({
  MockGateway: class {
    constructor() {
      hoisted.mockCtor()
    }
  },
}))

vi.mock("@/shared/gateway/augmented-gateway", () => ({
  AugmentedGateway: class {
    constructor() {
      hoisted.augmentedCtor()
    }
  },
}))

describe("gateway/index mode selection", () => {
  beforeEach(() => {
    vi.resetModules()
    hoisted.aspCtor.mockReset()
    hoisted.mockCtor.mockReset()
    hoisted.augmentedCtor.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("normal mode selects ASP.NET gateway and does not instantiate mock/augmented paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_ASPNET_GATEWAY", "1")
    const mod = await import("@/shared/gateway")

    expect(mod.runtimeMode).toBe("aspnet")
    expect(mod.isAspNetMode).toBe(true)
    expect(mod.isMockMode).toBe(false)
    expect(mod.gateway).toBe(mod.rawGateway)
    expect(hoisted.aspCtor).toHaveBeenCalledTimes(1)
    expect(hoisted.mockCtor).toHaveBeenCalledTimes(0)
    expect(hoisted.augmentedCtor).toHaveBeenCalledTimes(0)
  })

  it("demo mode selects mock gateway and instantiates demo-only augmentation path", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_ASPNET_GATEWAY", "0")
    const mod = await import("@/shared/gateway")

    expect(mod.runtimeMode).toBe("demo")
    expect(mod.isAspNetMode).toBe(false)
    expect(mod.isMockMode).toBe(true)
    expect(mod.gateway).toBe(mod.mockGateway)
    expect(hoisted.aspCtor).toHaveBeenCalledTimes(1)
    expect(hoisted.mockCtor).toHaveBeenCalledTimes(1)
    expect(hoisted.augmentedCtor).toHaveBeenCalledTimes(1)
  })

  it("misconfigured mode remains non-demo and does not instantiate mock/augmented paths", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_ASPNET_GATEWAY", "")
    const mod = await import("@/shared/gateway")

    expect(mod.runtimeMode).toBe("misconfigured")
    expect(mod.isModeConfigured).toBe(false)
    expect(mod.isMockMode).toBe(false)
    expect(mod.gateway).toBe(mod.rawGateway)
    expect(hoisted.aspCtor).toHaveBeenCalledTimes(1)
    expect(hoisted.mockCtor).toHaveBeenCalledTimes(0)
    expect(hoisted.augmentedCtor).toHaveBeenCalledTimes(0)
  })
})
