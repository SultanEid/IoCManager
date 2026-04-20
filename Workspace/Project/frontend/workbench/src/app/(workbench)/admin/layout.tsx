import { RouteGuard } from "@/components/workbench/route-guard"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard>{children}</RouteGuard>
}
