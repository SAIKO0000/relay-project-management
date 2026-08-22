"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { ProfileModal } from "@/components/profile-modal"
import { useCurrentUserPersonnel } from "@/lib/hooks/useCurrentUserPersonnel"
import { useAuth } from "@/lib/auth"
import { SidebarMobileHeader } from './SidebarMobileHeader'
import { SidebarMobileMenu } from './SidebarMobileMenu'
import { SidebarDesktop } from './SidebarDesktop'
import { menuItems } from './sidebar-config'
import { SidebarProps, UserInfo } from './types'

export function SidebarRefactored({ activeTab, onTabChangeAction }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user, signOut } = useAuth()
  const { personnel } = useCurrentUserPersonnel()

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false)
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleProfileClick = useCallback(() => {
    setShowProfileModal(true)
  }, [])

  const handleLogout = useCallback(async () => {
    await signOut()
  }, [signOut])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev)
  }, [])

  const userInfo: UserInfo = useMemo(() => ({
    userName: personnel?.name || user?.user_metadata?.name || "User",
    userPosition: personnel?.position || user?.user_metadata?.position || "Team Member",
    userEmail: personnel?.email || user?.email || "",
    avatarUrl: personnel?.avatar_url
  }), [user, personnel])

  return (
    <>
      {/* Mobile Menu Button - Fixed top bar */}
      <SidebarMobileHeader 
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenuAction={toggleMobileMenu}
      />

      {/* Mobile Menu Overlay */}
      <SidebarMobileMenu 
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        menuItems={menuItems}
        activeTab={activeTab}
        userInfo={userInfo}
        onTabChangeAction={onTabChangeAction}
        onToggleMobileMenuAction={toggleMobileMenu}
        onProfileClickAction={handleProfileClick}
        onLogoutAction={handleLogout}
      />

      {/* Desktop Sidebar */}
      <SidebarDesktop 
        collapsed={collapsed}
        menuItems={menuItems}
        activeTab={activeTab}
        userInfo={userInfo}
        onTabChangeAction={onTabChangeAction}
        onToggleCollapsedAction={toggleCollapsed}
        onProfileClickAction={handleProfileClick}
        onLogoutAction={handleLogout}
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onCloseAction={() => setShowProfileModal(false)} 
      />
    </>
  )
}
