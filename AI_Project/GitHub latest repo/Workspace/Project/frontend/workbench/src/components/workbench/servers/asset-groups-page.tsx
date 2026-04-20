"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { StatusBadge } from "@/components/workbench/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classifyUiError } from "@/shared/api/error-classification"
import { gateway } from "@/shared/gateway"
import { useWorkbenchQuery } from "@/shared/query/use-workbench-query"
import { ClassifiedFailureState } from "@/shared/ui/error-fallback"
import { panelMotion, staggerMotion } from "@/shared/ui/motion"
import { EmptyState, LoadingState, SearchEmptyState } from "@/shared/ui/state-panels"

type AssetGroupFilters = {
  q: string
  enabled: string
  groupId: string
}

function parseFilters(searchParams: URLSearchParams): AssetGroupFilters {
  return {
    q: searchParams.get("q") ?? "",
    enabled: searchParams.get("enabled") ?? "",
    groupId: searchParams.get("groupId") ?? "",
  }
}

function buildQuery(filters: AssetGroupFilters) {
  const params = new URLSearchParams()
  if (filters.q) {
    params.set("q", filters.q)
  }
  if (filters.enabled) {
    params.set("enabled", filters.enabled)
  }
  if (filters.groupId) {
    params.set("groupId", filters.groupId)
  }
  return params.toString()
}

export function AssetGroupsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const parsedFilters = useMemo(() => parseFilters(new URLSearchParams(searchParams.toString())), [searchParams])
  const [filters, setFilters] = useState(parsedFilters)

  useEffect(() => {
    setFilters(parsedFilters)
  }, [parsedFilters])

  const groupsQuery = useWorkbenchQuery(["asset-groups"], async (signal) => {
    const groups = await gateway.listTargetGroups(signal)
    const membershipRows = await Promise.all(
      groups.map(async (group) => ({
        group,
        members: await gateway.listTargetGroupMembers(group.id, signal),
      })),
    )

    return membershipRows
  })

  if (groupsQuery.isLoading) {
    return <LoadingState label="Loading asset groups" />
  }

  if (groupsQuery.isError || !groupsQuery.data) {
    return <ClassifiedFailureState failure={classifyUiError(groupsQuery.error)} fallbackTitle="Asset groups unavailable" />
  }

  const rows = groupsQuery.data
  const filteredRows = rows.filter((item) => {
    const matchesQ =
      !parsedFilters.q ||
      [item.group.name, item.group.description].join(" ").toLowerCase().includes(parsedFilters.q.toLowerCase())
    const matchesEnabled =
      !parsedFilters.enabled ||
      (parsedFilters.enabled === "enabled" ? item.group.isEnabled : !item.group.isEnabled)

    return matchesQ && matchesEnabled
  })

  const selectedGroup =
    filteredRows.find((item) => item.group.id === parsedFilters.groupId) ??
    filteredRows[0] ??
    null

  const applyFilters = () => {
    const next = buildQuery(filters)
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const clearFilters = () => {
    const cleared = {
      q: "",
      enabled: "",
      groupId: "",
    }
    setFilters(cleared)
    router.replace(pathname)
  }

  const selectGroup = (groupId: string) => {
    const next = buildQuery({ ...parsedFilters, groupId })
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const enabledCount = rows.filter((item) => item.group.isEnabled).length
  const uniqueMemberCount = new Set(rows.flatMap((item) => item.members.map((member) => member.targetServerId))).size
  const filteredOut = Boolean(parsedFilters.q || parsedFilters.enabled)

  return (
    <motion.section className="wb-page" variants={staggerMotion} initial="hidden" animate="visible">
      <motion.header className="wb-page-header" variants={panelMotion}>
        <div>
          <p className="wb-kicker">Asset Groups</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight">Persisted target grouping and member coverage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Group membership is pulled directly from infrastructure contracts and linked back to managed servers.
          </p>
        </div>
      </motion.header>

      <motion.article className="grid gap-3 md:grid-cols-3" variants={panelMotion}>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Groups</p>
          <p className="mt-1 text-lg font-semibold">{rows.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 p-3">
          <p className="wb-kicker text-emerald-100">Enabled</p>
          <p className="mt-1 text-lg font-semibold text-emerald-100">{enabledCount}</p>
        </div>
        <div className="rounded-lg border border-border/70 bg-surface-2/65 p-3">
          <p className="wb-kicker">Unique Servers</p>
          <p className="mt-1 text-lg font-semibold">{uniqueMemberCount}</p>
        </div>
      </motion.article>

      <motion.article className="wb-panel space-y-3" variants={panelMotion}>
        <div className="grid gap-3 md:grid-cols-4">
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Search group name or description"
          />
          <select
            value={filters.enabled}
            onChange={(event) => setFilters((current) => ({ ...current, enabled: event.target.value }))}
            className="h-9 rounded-lg border border-border/70 bg-surface-1 px-2 text-sm"
          >
            <option value="">All states</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <div className="flex items-center gap-2 md:col-span-2">
            <Button type="button" size="sm" onClick={applyFilters}>
              Apply
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>
      </motion.article>

      {rows.length === 0 ? (
        <motion.article variants={panelMotion}>
          <EmptyState
            title="No asset groups registered"
            description="Create target groups in the backend before using grouped distribution and scanning views."
          />
        </motion.article>
      ) : filteredRows.length === 0 ? (
        <motion.article variants={panelMotion}>
          <SearchEmptyState
            title="No asset groups matched the current filters"
            description="Clear the search or state filter to reopen the full target-group inventory."
            action={
              <Button type="button" size="sm" variant="outline" onClick={clearFilters}>
                Reset group filters
              </Button>
            }
          />
        </motion.article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Group Inventory</h3>
              <p className="text-xs text-muted-foreground">
                {filteredRows.length} row(s){filteredOut ? " filtered" : ""}
              </p>
            </div>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((item) => (
                    <TableRow
                      key={item.group.id}
                      className={selectedGroup?.group.id === item.group.id ? "bg-surface-2/50" : ""}
                      onClick={() => selectGroup(item.group.id)}
                    >
                      <TableCell>
                        <p className="text-sm font-medium">{item.group.name}</p>
                        <p className="text-xs text-muted-foreground">{item.group.description || "No description"}</p>
                      </TableCell>
                      <TableCell><StatusBadge value={item.group.isEnabled ? "Enabled" : "Disabled"} /></TableCell>
                      <TableCell>{item.members.length}</TableCell>
                      <TableCell>{new Date(item.group.updatedAtUtc).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.article>

          <motion.article className="wb-panel" variants={panelMotion}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-tight">Selected Group</h3>
              {selectedGroup ? <StatusBadge value={selectedGroup.group.isEnabled ? "Enabled" : "Disabled"} /> : null}
            </div>
            {!selectedGroup ? (
              <div className="mt-3">
                <EmptyState title="No group selected" description="Choose a group row to inspect member coverage." />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                  <p className="text-sm font-medium">{selectedGroup.group.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedGroup.group.description || "No description provided."}
                  </p>
                </div>

                {selectedGroup.members.length === 0 ? (
                  <EmptyState
                    title="No member servers"
                    description="This group exists but does not currently contain any target servers."
                  />
                ) : (
                  <div className="space-y-2">
                    {selectedGroup.members.map((member) => (
                      <div key={`${member.targetGroupId}-${member.targetServerId}`} className="rounded-lg border border-border/70 bg-surface-2/55 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/servers/servers/${member.targetServerId}`} className="text-sm font-medium hover:underline">
                            {member.hostname}
                          </Link>
                          <span className="text-xs text-muted-foreground">{member.ipAddress}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Added by {member.addedByUserId} on {new Date(member.addedAtUtc).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.article>
        </div>
      )}
    </motion.section>
  )
}
