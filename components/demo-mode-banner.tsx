"use client"

import { RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { demoModeNotice, isDemoMode } from '@/lib/demo/config'
import { resetDemoData } from '@/lib/demo/supabase-client'

export function DemoModeBanner() {
  if (!isDemoMode) return null

  const handleReset = () => {
    resetDemoData()
    window.location.reload()
  }

  return (
    <div className="flex min-h-10 flex-col items-center justify-between gap-2 border-b border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-950 sm:flex-row sm:px-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
        <span>{demoModeNotice}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 border-orange-300 bg-white px-2 text-xs text-orange-800 hover:bg-orange-100"
        onClick={handleReset}
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
        Reset demo
      </Button>
    </div>
  )
}
