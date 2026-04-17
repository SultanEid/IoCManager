import { AspNetGateway } from "@/shared/gateway/aspnet-gateway"
import { AugmentedGateway } from "@/shared/gateway/augmented-gateway"
import { MockGateway } from "@/shared/gateway/mock-gateway"
import type { Gateway } from "@/shared/gateway/types"

const source = new AspNetGateway()

const modeFlag = process.env.NEXT_PUBLIC_USE_ASPNET_GATEWAY?.trim()

export type WorkbenchRuntimeMode = "demo" | "aspnet" | "misconfigured"

export const runtimeMode: WorkbenchRuntimeMode =
  modeFlag === "0" ? "demo" : modeFlag === undefined || modeFlag === "" || modeFlag === "1" ? "aspnet" : "misconfigured"

export const isModeConfigured = runtimeMode !== "misconfigured"
export const isMockMode = runtimeMode === "demo"
export const isAspNetMode = runtimeMode === "aspnet"

const mock = runtimeMode === "demo" ? new MockGateway() : null
const augmented = runtimeMode === "demo" ? new AugmentedGateway(source) : null

// In non-demo mode, never implicitly fall back to mock data.
export const gateway: Gateway = isMockMode ? (mock as Gateway) : source
export const rawGateway = source
export const mockGateway = mock
export const augmentedGateway = augmented
