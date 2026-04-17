"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { WorkbenchInspectorProvider } from "@/components/workbench/workbench-inspector"
import { AuthProvider } from "@/shared/auth/auth-provider"
import { AppQueryProvider } from "@/shared/query/provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AppQueryProvider>
        <AuthProvider>
          <WorkbenchInspectorProvider>{children}</WorkbenchInspectorProvider>
        </AuthProvider>
      </AppQueryProvider>
    </TooltipProvider>
  )
}
