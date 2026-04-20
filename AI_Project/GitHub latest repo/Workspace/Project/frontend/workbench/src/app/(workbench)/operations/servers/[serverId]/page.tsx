import { redirect } from "next/navigation"

export default async function OperationsServerDetailCompatibilityRoute({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params
  redirect(`/servers/servers/${serverId}`)
}
