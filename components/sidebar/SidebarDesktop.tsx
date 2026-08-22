"use client"

import { SidebarDesktopHeader } from './SidebarDesktopHeader'
import { SidebarNavigation } from './SidebarNavigation'
import { SidebarUserProfile } from './SidebarUserProfile'
import { MenuItem, UserInfo } from './types'

interface SidebarDesktopProps {
  collapsed: boolean
  menuItems: MenuItem[]
  activeTab: string
  userInfo: UserInfo
  onTabChangeAction: (tab: string) => void
  onToggleCollapsedAction: () => void
  onProfileClickAction: () => void
  onLogoutAction: () => void
}

export function SidebarDesktop({ 
  collapsed,
  menuItems,
  activeTab,
  userInfo,
  onTabChangeAction,
  onToggleCollapsedAction,
  onProfileClickAction,
  onLogoutAction
}: SidebarDesktopProps) {
  return (
    <div className={`hidden lg:flex bg-gradient-to-b from-white via-gray-50/30 to-white border-r border-gray-200/50 flex-col h-full shadow-sm ${collapsed ? "w-20" : "w-72"}`}>
      {/* Header */}
      <SidebarDesktopHeader 
        collapsed={collapsed}
        onToggleCollapsedAction={onToggleCollapsedAction}
      />

      {/* Navigation - Scrollable content area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-gray-50/20 px-3">
        <SidebarNavigation 
          menuItems={menuItems}
          activeTab={activeTab}
          onTabChangeAction={onTabChangeAction}
          collapsed={collapsed}
        />
      </div>

      {/* User Profile - Fixed at bottom */}
      <SidebarUserProfile 
        userInfo={userInfo}
        collapsed={collapsed}
        onProfileClickAction={onProfileClickAction}
        onLogoutAction={onLogoutAction}
      />
    </div>
  )
}
