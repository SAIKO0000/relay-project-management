"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarRefactored } from "@/components/sidebar/SidebarRefactored"
import { Dashboard } from "@/components/dashboard/dashboard-main"
import { Projects } from "@/components/projects/projects"
import { GanttChartEnhancedRefactored } from "@/components/gantt"
import { Calendar } from "@/components/calendar"
import { TeamRefactored } from "@/components/team"
import { ReportsRefactored } from "@/components/reports/ReportsRefactored"
import { NotificationsRefactored } from "@/components/notifications/NotificationsRefactored"
import { useAuth } from "@/lib/auth"
import { useDynamicTitle } from "@/lib/hooks/useDynamicTitle"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { DemoModeBanner } from "@/components/demo-mode-banner"

export default function Home() {
  // Initialize activeTab with default value, then load from localStorage in useEffect
  const [activeTab, setActiveTab] = useState("dashboard")

  // Load saved tab from localStorage after component mounts (client-side only)
  useEffect(() => {
    const savedTab = localStorage.getItem('activeTab')
    if (savedTab) {
      setActiveTab(savedTab)
    }
  }, [])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()

  // Update page title dynamically
  useDynamicTitle(activeTab)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId)
    setActiveTab("gantt")
    // Save the selected tab to localStorage for persistence
    localStorage.setItem('activeTab', "gantt")
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    // Save the selected tab to localStorage for persistence
    localStorage.setItem('activeTab', tab)
    // Clear project selection when navigating away from gantt or when going to gantt without project selection
    if (tab !== "gantt") {
      setSelectedProjectId(null)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard key="dashboard" />
      case "projects":
        return <Projects key="projects" onProjectSelect={handleProjectSelect} />
      case "gantt":
        return <GanttChartEnhancedRefactored key="gantt" selectedProjectId={selectedProjectId} />
      case "calendar":
        return <Calendar key="calendar" />
      case "team":
        return <TeamRefactored key="team" />
      case "notifications":
        return <NotificationsRefactored key="notifications" onTabChangeAction={handleTabChange} />
      case "reports":
        return <ReportsRefactored key="reports" onTabChangeAction={handleTabChange} />
      default:
        return <Dashboard key="dashboard-default" />
    }
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if user is not authenticated
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <DemoModeBanner />
      <div className="flex min-h-0 flex-1">
        <SidebarRefactored activeTab={activeTab} onTabChangeAction={handleTabChange} />
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pt-20 lg:pt-0">
            <ErrorBoundary>
              {renderContent()}
            </ErrorBoundary>
          </div>
        </main>
      </div>
      
    </div>
  )
}
