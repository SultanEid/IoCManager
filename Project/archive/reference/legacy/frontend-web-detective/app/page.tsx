import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function Page() {
  const cookieStore = await cookies()
  const authenticated = cookieStore.get("detective.identity")
  redirect(authenticated ? "/dashboard" : "/auth")
}
