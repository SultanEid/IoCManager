import type { Metadata } from "next"

import "./globals.css"
import { IocEasterEgg } from "@/components/ioc-easter-egg"
import { PreferencesProvider } from "@/components/preferences-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/toast-provider"

export const metadata: Metadata = {
  title: "Detective",
  description: "Indicator of Compromise classification and management",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans antialiased"
    >
      <body>
        <ThemeProvider>
          <ToastProvider>
            <PreferencesProvider>
              <IocEasterEgg />
              {children}
            </PreferencesProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
