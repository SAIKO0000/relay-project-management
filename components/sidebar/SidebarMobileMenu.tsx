"use client"

import { SidebarNavigation } from './SidebarNavigation'
import { SidebarUserProfile } from './SidebarUserProfile'
import { MenuItem, UserInfo } from './types'
import Image from "next/image"

interface SidebarMobileMenuProps {
  isMobile: boolean
  mobileMenuOpen: boolean
  menuItems: MenuItem[]
  activeTab: string
  userInfo: UserInfo
  onTabChangeAction: (tab: string) => void
  onToggleMobileMenuAction: () => void
  onProfileClickAction: () => void
  onLogoutAction: () => void
}

export function SidebarMobileMenu({ 
  isMobile,
  mobileMenuOpen,
  menuItems,
  activeTab,
  userInfo,
  onTabChangeAction,
  onToggleMobileMenuAction,
  onProfileClickAction,
  onLogoutAction
}: SidebarMobileMenuProps) {
  if (!isMobile || !mobileMenuOpen) return null

  const handleTabChange = (tab: string) => {
    onTabChangeAction(tab)
    onToggleMobileMenuAction() // Close mobile menu after selection
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] lg:hidden" onClick={onToggleMobileMenuAction}>
      <div 
        className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-[110] transform transition-transform duration-200 ease-out motion-reduce:transition-none flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200/60">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo.svg" 
              alt="Relay by GYG Power Systems"
              width={56}
              height={42}
              className="w-14 h-10.5 object-contain"
              priority
            />
            <div>
              <h1 className="text-base font-semibold text-gray-900">Relay</h1>
              <p className="text-xs font-medium text-gray-500">Electrical Project Management</p>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex-1 overflow-y-auto">
          <SidebarNavigation 
            menuItems={menuItems}
            activeTab={activeTab}
            onTabChangeAction={handleTabChange}
            isMobile={true}
          />
        </div>

        {/* Mobile User Profile at Bottom */}
        <SidebarUserProfile 
          userInfo={userInfo}
          isMobile={true}
          onProfileClickAction={onProfileClickAction}
          onLogoutAction={onLogoutAction}
        />
      </div>
    </div>
  )
}
