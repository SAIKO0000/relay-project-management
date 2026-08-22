"use client"

import { useState, useCallback } from "react"
import { supabase, type Project } from "@/lib/supabase"
import { EditProjectModal } from "@/components/edit-project-modal"
import { ContentSkeleton } from "@/components/ui/content-skeleton"
import { toast } from "react-hot-toast"
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery"

// Import refactored components
import { DashboardHeader } from "./dashboard-header"
import { DashboardStatsCards } from "./dashboard-stats-cards"
import { DashboardCharts } from "./dashboard-charts"
import { DashboardRecentProjects } from "./dashboard-recent-projects"
import { DashboardUpcomingTasks } from "./dashboard-upcoming-tasks"

// Import refactored hooks and utilities
import { useDashboardAnalytics } from "./dashboard-analytics"
import { useChartData } from "./dashboard-chart-data"
import { useTaskManagement } from "./dashboard-task-management"

export function Dashboard() {
  // Use optimized TanStack Query hooks instead of individual hooks
  const supabaseQuery = useSupabaseQuery()
  
  const { 
    data: projects = [], 
    isLoading: projectsLoading, 
    refetch: refetchProjects 
  } = supabaseQuery.useProjectsQuery()
  
  const { 
    data: personnel = [], 
    isLoading: personnelLoading
  } = supabaseQuery.usePersonnelQuery()
  
  const { 
    data: tasks = [], 
    isLoading: tasksLoading
  } = supabaseQuery.useTasksQuery()

  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Use refactored analytics hook
  const { stats, projectAnalytics, getProjectTaskProgress, getProjectTaskCounts } = useDashboardAnalytics(projects, tasks, personnel)

  // Use refactored chart data hook
  const { projectProgressData, statusData } = useChartData(projects, getProjectTaskProgress)

  // Use refactored task management hook
  const { upcomingTasks, getTaskUrgencyBadgeProps, formatTaskDate } = useTaskManagement(tasks, projects)

  const handleProjectCreated = useCallback(() => {
    // TanStack Query will automatically update the cache
  }, [])

  const handleDeleteProject = useCallback(async (projectId: string, projectName: string) => {
    if (confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      try {
        // We need to import deleteProject from the optimized hook or create a mutation
        // For now, we'll use the direct Supabase call and let TanStack Query handle the cache
        const { error } = await supabase.from('projects').delete().eq('id', projectId)
        if (error) throw error
        
        // Invalidate and refetch projects
        await refetchProjects()
        toast.success("Project deleted successfully")
      } catch (error) {
        console.error("Delete error:", error)
        toast.error("Failed to delete project")
      }
    }
  }, [refetchProjects])

  const handleEditProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setEditingProject(project)
    }
  }, [projects])

  const handleProjectUpdated = useCallback(() => {
    setEditingProject(null)
    // Don't call fetchProjects here as the hook should handle the update
  }, [])
  
  // Show loading only if all major data is still loading
  const isLoading = projectsLoading && tasksLoading && personnelLoading

  if (isLoading) {
    return <ContentSkeleton type="dashboard" />
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12 space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 xl:space-y-7 2xl:space-y-8 overflow-y-auto h-full bg-gradient-to-br from-gray-50 via-white to-gray-100/50">
      {/* Modern Header with Glassmorphism */}
      <DashboardHeader 
        onProjectCreatedAction={handleProjectCreated}
      />

      {/* Stats Cards */}
      <DashboardStatsCards 
        stats={stats}
        projectAnalytics={projectAnalytics}
      />

      {/* Charts Row */}
      <DashboardCharts 
        projectProgressData={projectProgressData}
        statusData={statusData}
      />

      {/* Recent Projects and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-7">
        <DashboardRecentProjects 
          projects={projects}
          getProjectTaskProgressAction={getProjectTaskProgress}
          getProjectTaskCountsAction={getProjectTaskCounts}
          onEditProjectAction={handleEditProject}
          onDeleteProjectAction={handleDeleteProject}
        />

        <DashboardUpcomingTasks 
          upcomingTasks={upcomingTasks}
          getTaskUrgencyBadgePropsAction={getTaskUrgencyBadgeProps}
          formatTaskDateAction={formatTaskDate}
        />
      </div>

      {/* Edit Project Modal */}
      <EditProjectModal
        project={editingProject}
        open={!!editingProject}
        onOpenChangeAction={(open) => !open && setEditingProject(null)}
        onProjectUpdatedAction={handleProjectUpdated}
      />
    </div>
  )
}
