import type { NextConfig } from "next"

const backendBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "http://localhost:5127").replace(/\/$/, "")

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/problematic-queue", destination: "/queue", permanent: false },
      { source: "/cases", destination: "/alerts", permanent: false },
      { source: "/cases/:caseId", destination: "/alerts/:caseId", permanent: false },
      { source: "/cases/:caseId/decision-trace", destination: "/alerts/:caseId", permanent: false },
      { source: "/cases/:caseId/evidence-bundle", destination: "/alerts/:caseId", permanent: false },
      { source: "/cases/:caseId/graph-investigation", destination: "/alerts/:caseId", permanent: false },
      { source: "/cases/:caseId/rule-proposals", destination: "/alerts/:caseId", permanent: false },
      { source: "/cases/:caseId/simulation-results", destination: "/alerts/:caseId", permanent: false },
      { source: "/matches", destination: "/alerts", permanent: false },
      { source: "/investigations", destination: "/alerts", permanent: false },
      { source: "/graph-relationships", destination: "/alerts", permanent: false },
      { source: "/rules-studio/feed-explorer", destination: "/ioc-ingestion/feed-explorer", permanent: false },
      { source: "/detection-studio/feed-explorer", destination: "/ioc-ingestion/feed-explorer", permanent: false },
      { source: "/rules/review", destination: "/rules", permanent: false },
      { source: "/rules/simulation", destination: "/rules", permanent: false },
      { source: "/rules/canary-rollouts", destination: "/rules", permanent: false },
      { source: "/rules/rollback-history", destination: "/rules", permanent: false },
      { source: "/rules-studio/review", destination: "/rules", permanent: false },
      { source: "/rules-studio/simulation", destination: "/rules", permanent: false },
      { source: "/rules-studio/canary-rollouts", destination: "/rules", permanent: false },
      { source: "/rules-studio/rollback-history", destination: "/rules", permanent: false },
      { source: "/detection-studio/review", destination: "/rules", permanent: false },
      { source: "/detection-studio/simulation", destination: "/rules", permanent: false },
      { source: "/detection-studio/canary-rollouts", destination: "/rules", permanent: false },
      { source: "/detection-studio/rollback-history", destination: "/rules", permanent: false },
      { source: "/rules-studio", destination: "/rules", permanent: false },
      { source: "/rules-studio/:path*", destination: "/rules/:path*", permanent: false },
      { source: "/detection-studio", destination: "/rules", permanent: false },
      { source: "/detection-studio/:path*", destination: "/rules/:path*", permanent: false },
      { source: "/operations", destination: "/servers", permanent: false },
      { source: "/operations/:path*", destination: "/servers/:path*", permanent: false },
      { source: "/deployments", destination: "/distribution", permanent: false },
      { source: "/ingestion-feeds", destination: "/ioc-ingestion", permanent: false },
      { source: "/ingestion-feeds/:path*", destination: "/ioc-ingestion/:path*", permanent: false },
      { source: "/threat-intel", destination: "/ioc-ingestion", permanent: false },
      { source: "/reports-ingestion", destination: "/results-ingestion", permanent: false },
      { source: "/coverage", destination: "/reports", permanent: false },
      { source: "/coverage/telemetry", destination: "/reports", permanent: false },
      { source: "/coverage/sources", destination: "/reports", permanent: false },
      { source: "/coverage/attack", destination: "/reports", permanent: false },
      { source: "/ioc-registry", destination: "/reports", permanent: false },
      { source: "/ioc-registry/:path*", destination: "/reports", permanent: false },
      { source: "/admin", destination: "/settings", permanent: false },
      { source: "/settings-admin", destination: "/settings", permanent: false },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/health/:path*",
        destination: `${backendBaseUrl}/health/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
