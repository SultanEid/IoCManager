import { RouteGuard } from "@/components/workbench/route-guard"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard requiredRoles={["Admin"]}>{children}</RouteGuard>
}
