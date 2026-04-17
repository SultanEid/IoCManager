"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

type ButtonVariant = "primary" | "outline" | "ghost" | "subtle"
type ButtonSize = "sm" | "md" | "lg" | "icon"

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost:
    "border border-transparent bg-transparent text-[var(--muted-foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-[var(--foreground)]",
  subtle:
    "border border-[var(--input)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] text-[var(--foreground)] hover:bg-[color-mix(in_srgb,var(--foreground)_12%,transparent)]",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-4 text-sm",
  icon: "h-9 w-9 px-0 text-xs",
}

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] font-semibold transition-[background-color,border-color,color,filter,box-shadow] disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_45%,transparent)]",
          VARIANT_CLASS[variant],
          SIZE_CLASS[size],
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

