import { Suspense } from "react"
import { AuthForm } from "@/components/workbench/auth-form"

export default function AuthPage() {
  return (
    <main className="auth-scene relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="auth-color-ray" aria-hidden="true" />
      <div className="auth-scanline auth-scanline-primary" aria-hidden="true" />
      <div className="auth-scanline auth-scanline-secondary" aria-hidden="true" />
      <div className="auth-packets" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading authentication...</div>}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  )
}
