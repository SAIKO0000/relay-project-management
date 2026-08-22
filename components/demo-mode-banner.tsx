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
    <div className="flex min-h-9 items-center justify-between gap-2 border-b border-orange-200 bg-orange-50/90 px-3 py-1.5 text-xs text-orange-950 sm:min-h-10 sm:px-5">
      <div className="flex min-w-0 items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-orange-600 sm:h-4 sm:w-4" aria-hidden="true" />
        <span className="whitespace-nowrap font-medium sm:hidden">Demo mode</span>
        <span className="hidden truncate sm:inline">{demoModeNotice}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-8 shrink-0 border-orange-300 bg-white p-0 text-xs text-orange-800 hover:bg-orange-100 sm:w-auto sm:px-2"
        onClick={handleReset}
        aria-label="Reset demo data"
        title="Reset demo data"
      >
        <RotateCcw className="h-3.5 w-3.5 sm:mr-1" aria-hidden="true" />
        <span className="hidden sm:inline">Reset demo</span>
      </Button>
    </div>
  )
}
