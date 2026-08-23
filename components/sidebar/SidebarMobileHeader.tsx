"use client"

import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import Image from "next/image"

interface SidebarMobileHeaderProps {
  isMobile: boolean
  mobileMenuOpen: boolean
  onToggleMobileMenuAction: () => void
}

export function SidebarMobileHeader({ 
  isMobile, 
  mobileMenuOpen, 
  onToggleMobileMenuAction 
}: SidebarMobileHeaderProps) {
  if (!isMobile) return null

  return (
    <div className="sidebar-mobile-header fixed inset-x-0 top-0 z-[90] h-14 border-b border-gray-100 bg-white/95 px-3 shadow-sm lg:hidden sm:h-16 sm:px-4">
      <div className="flex h-full items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex h-8 w-10 items-center justify-center rounded-lg border border-gray-100 bg-white shadow-sm sm:h-10 sm:w-12">
            <Image 
              src="/logo.svg" 
              alt="Relay by GYG Power Systems"
              width={40}
              height={30}
              className="w-8 h-6 sm:w-10 sm:h-7 object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold tracking-tight text-gray-900 sm:text-base">Relay</h1>
            <p className="hidden text-xs font-medium text-gray-600 sm:block">Electrical Project Management</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggleMobileMenuAction} 
          className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 p-0 shadow-sm transition-colors duration-150 hover:bg-gray-50 motion-reduce:transition-none sm:h-10 sm:w-10"
        >
          {mobileMenuOpen ? 
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" /> : 
            <Menu className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
          }
        </Button>
      </div>
    </div>
  )
}
