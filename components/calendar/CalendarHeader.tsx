import React from "react"
import { Button } from "@/components/ui/button"
import { CalendarIcon, RefreshCw } from "lucide-react"
import { EventFormModal } from "../event-form-modal"
import type { CalendarHeaderProps } from "./types"

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  onRefresh,
  onEventCreated
}) => {
  return (
    <>
      {/* Modern Header with Glassmorphism */}
      <div className="rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-sm sm:rounded-xl sm:p-5 sm:shadow-lg lg:p-7">
        {/* Mobile Layout: Title and description centered */}
        <div className="lg:hidden">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-gray-600">Schedule and track project activities</p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-7 shrink-0 gap-1 border-gray-300 px-2 text-xs hover:border-gray-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden min-[380px]:inline">Refresh</span>
            </Button>
          </div>
        </div>
        
        {/* Desktop Layout: Enhanced header */}
        <div className="hidden lg:flex items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">Calendar</h1>
                <p className="text-base lg:text-lg text-gray-600 mt-1">Schedule and track project activities</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="default"
              onClick={onRefresh}
              className="flex items-center gap-2 h-10 px-5 py-2 border-gray-300 hover:border-gray-400 hover:shadow-md transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <EventFormModal onEventCreated={onEventCreated} />
          </div>
        </div>
      </div>
    </>
  )
}
