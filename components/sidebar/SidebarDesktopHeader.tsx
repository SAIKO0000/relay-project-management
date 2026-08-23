"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Image from "next/image"

interface SidebarDesktopHeaderProps {
  collapsed: boolean
  onToggleCollapsedAction: () => void
}

export function SidebarDesktopHeader({ collapsed, onToggleCollapsedAction }: SidebarDesktopHeaderProps) {
  return (
    <div className="p-4 border-b border-gray-200/70 bg-gradient-to-r from-white to-gray-50/50 backdrop-blur-sm flex-shrink-0 shadow-sm">
      {!collapsed ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-9 flex items-center justify-center rounded-xl shadow-sm">
              <Image 
                src="/logo.svg" 
                alt="Relay by GYG Power Systems"
                width={52}
                height={40}
                className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
                priority
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">Relay</h1>
              <p className="text-xs font-medium text-gray-500">Electrical Project Management</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleCollapsedAction} className="p-2 hover:bg-gray-100/80 hover:shadow-sm transition-all duration-300 rounded-lg">
            <ChevronLeft className="h-6 w-6 transition-transform duration-300 hover:scale-110 text-gray-600" />
          </Button>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onToggleCollapsedAction} 
            className="p-0 w-full h-12 rounded-lg hover:bg-gray-100/80 hover:shadow-md transition-all duration-500 group border border-transparent hover:border-gray-200"
            title="Expand Relay sidebar"
          >
            <Image 
              src="/logo.svg" 
              alt="Relay by GYG Power Systems"
              width={52}
              height={40}
              className="w-12 h-9 object-contain group-hover:scale-110 transition-transform duration-500 filter group-hover:drop-shadow-sm"
              priority
            />
          </Button>
        </div>
      )}
    </div>
  )
}
