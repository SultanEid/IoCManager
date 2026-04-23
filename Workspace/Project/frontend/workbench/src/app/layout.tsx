import type { Metadata } from "next"
import { JetBrains_Mono, Manrope } from "next/font/google"
import { AppProviders } from "@/app/providers"
import "./globals.css"

const sansFont = Manrope({
  subsets: ["latin"],
  variable: "--font-workbench-sans",
  display: "swap",
})

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-workbench-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "IoC Manager",
  description: "IoC ingestion, rules, server management, distribution, scanning, and alert operations",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${sansFont.variable} ${monoFont.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
