"use client"

import { useEffect } from 'react'

type TabType = 'dashboard' | 'projects' | 'gantt' | 'calendar' | 'team' | 'notifications' | 'reports'

const getPageTitle = (tab: TabType): string => {
  const titles: Record<TabType, string> = {
    dashboard: 'Dashboard',
    projects: 'Projects',
    gantt: 'Gantt Chart',
    calendar: 'Calendar',
    team: 'Team',
    notifications: 'Notifications',
    reports: 'Reports'
  }
  
  return `${titles[tab] || 'Dashboard'} | Relay`
}

export function useDynamicTitle(activeTab: string) {
  useEffect(() => {
    const title = getPageTitle(activeTab as TabType)
    document.title = title
  }, [activeTab])
}
