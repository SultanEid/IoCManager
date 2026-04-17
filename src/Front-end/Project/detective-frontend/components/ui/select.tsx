"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select ref={ref} className={cn("input-surface w-full text-[15px]", className)} {...props}>
        {children}
      </select>
    )
  }
)

Select.displayName = "Select"

