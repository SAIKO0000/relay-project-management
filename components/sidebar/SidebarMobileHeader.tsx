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
    <div className="sidebar-mobile-header lg:hidden fixed top-0 left-0 right-0 bg-white p-3 sm:p-4 z-[90] shadow-sm border-b border-gray-100/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="w-10 h-8 sm:w-12 sm:h-10 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100/50">
            <Image 
              src="/logo.svg" 
              alt="GYG Power Systems" 
              width={40}
              height={30}
              className="w-8 h-6 sm:w-10 sm:h-7 object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">GYG Power Systems</h1>
            <p className="text-xs text-gray-600 font-medium hidden sm:block">Electrical Engineering Solutions</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggleMobileMenuAction} 
          className="p-2 sm:p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 shadow-sm transition-colors duration-150 motion-reduce:transition-none"
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
