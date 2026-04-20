import { describe, expect, it } from "vitest"
import {
  buildScannerCoverageRollup,
  buildSubnetRollups,
  deriveServerRiskSummary,
  findServerById,
  getOperationsVm,
  groupServersBy,
} from "@/shared/modules/operations-foundation"

describe("operations foundation", () => {
  it("groups servers by subnet, environment, and criticality", () => {
    const vm = getOperationsVm()
    const bySubnet = groupServersBy(vm.servers, vm.subnets, "subnet")
    const byEnvironment = groupServersBy(vm.servers, vm.subnets, "environment")
    const byCriticality = groupServersBy(vm.servers, vm.subnets, "criticality")

    expect(bySubnet.length).toBeGreaterThan(2)
    expect(byEnvironment.map((group) => group.label)).toContain("Production Environment")
    expect(byCriticality.map((group) => group.label)).toContain("Mission Critical")
  })

  it("builds subnet rollups with telemetry and health counts", () => {
    const vm = getOperationsVm()
    const rollups = buildSubnetRollups(vm.servers, vm.subnets)
    const prodCore = rollups["snet-prod-core"]

    expect(prodCore).toBeDefined()
    expect(prodCore.serverCount).toBeGreaterThan(1)
    expect(prodCore.unhealthyCount).toBeGreaterThan(0)
  })

  it("builds scanner coverage rollup and derives fallback risk summary", () => {
    const vm = getOperationsVm()
    const coverage = buildScannerCoverageRollup(vm.servers)
    const server = findServerById(vm.servers, "srv-dev-parser-04")
    const summary = server ? deriveServerRiskSummary(server, vm.serverDetailsById[server.id] ?? null) : null

    expect(coverage.totalServers).toBe(vm.servers.length)
    expect(coverage.totalServers).toBe(coverage.fullCoverageCount + coverage.partialCoverageCount + coverage.noCoverageCount)
    expect(summary?.score).toBeGreaterThan(0)
  })
})
