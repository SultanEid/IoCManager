import { Suspense } from "react"
import { AuthForm } from "@/components/workbench/auth-form"

export default function AuthPage() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,color-mix(in_srgb,var(--primary)_24%,transparent),transparent_35%),radial-gradient(circle_at_80%_80%,color-mix(in_srgb,var(--primary)_15%,transparent),transparent_40%),var(--background)] p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading authentication...</div>}>
        <AuthForm />
      </Suspense>
    </main>
  )
}
