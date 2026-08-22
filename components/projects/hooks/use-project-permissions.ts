import { useMemo, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { usePersonnel } from "@/lib/hooks/usePersonnel"
import { useReportsOptimized } from "@/lib/hooks/useReportsOptimized"
import { type Project } from "../types/project-types"
import { useWorkspaceAccess } from "@/lib/hooks/useWorkspaceAccess"

export const useProjectPermissions = () => {
  const { user } = useAuth()
  const { personnel } = usePersonnel()
  const { role, isWorkspaceAdmin } = useWorkspaceAccess()

  const currentUserPersonnel = useMemo(() => 
    personnel.find(p => p.email === user?.email),
    [personnel, user?.email]
  )

  const userPosition = currentUserPersonnel?.position || user?.user_metadata?.position || "Team Member"

  return {
    user,
    userPosition,
    isAdmin: isWorkspaceAdmin,
    workspaceRole: role,
    currentUserPersonnel
  }
}

export const useProjectReports = (projects: Project[]) => {
  const { data: reports = [] } = useReportsOptimized()
  const { currentUserPersonnel } = useProjectPermissions()

  // Memoize expensive computations to reduce re-renders
  const projectReportsMap = useMemo(() => {
    const map = new Map<string, typeof reports>()
    projects.forEach(project => {
      map.set(project.id, reports.filter(report => report.project_id === project.id))
    })
    return map
  }, [projects, reports])

  // Get project reports with memoization
  const getProjectReports = useCallback((projectId: string) => {
    return projectReportsMap.get(projectId) || []
  }, [projectReportsMap])

  // Helper function to check if current user is the assigned reviewer for a report
  const isAssignedReviewer = useCallback((report: typeof reports[0]) => {
    if (!currentUserPersonnel) return false
    
    const reportWithReviewer = report as typeof report & { assigned_reviewer?: string }
    return reportWithReviewer.assigned_reviewer === currentUserPersonnel.id
  }, [currentUserPersonnel])

  // Memoize assigned reports to prevent recalculation
  const assignedReportsForCurrentUser = useMemo(() => {
    if (!currentUserPersonnel) return []

    return reports.filter(report => {
      if (report.status !== 'pending') return false

      const reportWithReviewer = report as typeof report & { assigned_reviewer?: string }
      if (reportWithReviewer.assigned_reviewer === currentUserPersonnel.id) {
        return true
      }

      const reportWithReviewers = report as typeof report & { 
        report_reviewers?: Array<{
          reviewer_id: string
          status: string | null
        }>
      }
      
      if (reportWithReviewers.report_reviewers?.some(rr => 
        rr.reviewer_id === currentUserPersonnel.id && rr.status === 'pending'
      )) {
        return true
      }

      return false
    })
  }, [reports, currentUserPersonnel])

  // Legacy function for backward compatibility
  const getAssignedReportsForCurrentUser = useCallback(() => {
    return assignedReportsForCurrentUser
  }, [assignedReportsForCurrentUser])

  return {
    reports,
    projectReportsMap,
    getProjectReports,
    isAssignedReviewer,
    assignedReportsForCurrentUser,
    getAssignedReportsForCurrentUser
  }
}
