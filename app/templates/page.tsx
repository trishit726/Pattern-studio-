"use client"

import { TooltipProvider } from "@/components/ui/tooltip"
import { TemplatesView } from "@/components/templates/templates-view"

export default function TemplatesPage() {
  return (
    <TooltipProvider delayDuration={300}>
      <TemplatesView />
    </TooltipProvider>
  )
}
