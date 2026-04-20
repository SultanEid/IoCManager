import { RouteGuard } from "@/components/workbench/route-guard"
import { WorkbenchShell } from "@/components/workbench/app-shell"

export default function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard>
      <WorkbenchShell>{children}</WorkbenchShell>
    </RouteGuard>
  )
}
