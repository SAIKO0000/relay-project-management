"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery"
import { useDeleteProject, useProjectsQuery, useUpdateProject } from "@/lib/hooks/useProjectsOptimized"
import { useReportsOptimized, useReportOperations } from "@/lib/hooks/useReportsOptimized"
import { ProjectFormModal } from "@/components/project-form-modal"
import { ReportUploadModal } from "@/components/report-upload-modal"
import { EditProjectModal } from "@/components/edit-project-modal"
import { ReviewerNotesModal } from "@/components/reviewer-notes-modal"
import { ReviewerNotesViewerModal } from "@/components/reviewer-notes-viewer-modal"
import { SimpleNotesModal } from "@/components/simple-notes-modal"
import { DocumentViewerWithNotesModal } from "@/components/document-viewer-with-notes-modal"
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog"
import { toast } from "react-hot-toast"
import { supabase, type Project } from "@/lib/supabase"
import { FileText } from "lucide-react"

// Import our organized components
import {
  ProjectsHeader,
  ProjectFiltersComponent,
  ProjectStats,
  AssignedReportsNotification,
  ProjectGrid,
  EmptyProjectsState
} from "./components"

// Import our hooks and utilities
import {
  useProjectPermissions,
  useProjectReports,
  useReportHelpers,
  useProjectTasks
} from "./hooks"

import {
  useCapitalizeWords,
  useGetReportStatusColor,
  useFormatDate
} from "./utils"

// Import types
import { type ProjectsProps, type ProjectModalState, type ProjectFilters } from "./types/project-types"

export function Projects({ onProjectSelect }: ProjectsProps) {
  // Use centralized TanStack Query hooks
  const supabaseQuery = useSupabaseQuery()
  const {
    data: projectsData = [], 
    isLoading: loading,
    refetch: refetchProjects 
  } = useProjectsQuery()
  const { data: tasks = [], isLoading: tasksLoading } = supabaseQuery.useTasksQuery()
  
  // Type guard to ensure projects is an array of Project objects with memoization
  const projects = useMemo(() => {
    return Array.isArray(projectsData) && projectsData.every(p => typeof p === 'object' && p && 'id' in p) 
      ? projectsData as Project[]
      : []
  }, [projectsData])
  
  // Get mutations from optimized hooks
  const deleteProjectMutation = useDeleteProject()
  const updateProjectMutation = useUpdateProject()
  
  // Extract mutate functions - use mutateAsync for proper promise handling
  const deleteProject = deleteProjectMutation.mutateAsync
  const updateProject = updateProjectMutation.mutateAsync
  
  // Get reports and operations with optimized hooks for immediate UI updates
  const { data: reports = [], isLoading: reportsLoading } = useReportsOptimized()
  const { updateReport, deleteReport } = useReportOperations()
  
  // Force re-render state for immediate UI updates
  const [forceRender, setForceRender] = useState(0)
  const [modalForceRender, setModalForceRender] = useState(0)
  
  const forceUIUpdate = useCallback(() => {
    console.log('🔄 FORCING UI UPDATE - Fetching latest data...')
    setForceRender(prev => prev + 1)
    setModalForceRender(prev => prev + 1) // Force modal data update
    
    // Refresh projects data (reports will auto-refresh via optimized hooks)
    refetchProjects() // Immediate projects refresh
    
    // Additional force update after a short delay to ensure data propagation
    setTimeout(() => {
      setForceRender(prev => prev + 1)
      console.log('🔄 Secondary UI update completed')
    }, 500)
  }, [refetchProjects])
  
  // Force re-render when reports change to ensure UI updates
  const reportsCount = useMemo(() => reports.length, [reports])
  console.log(`Projects component: ${reportsCount} reports loaded, force render: ${forceRender}, last update: ${Date.now()}`)
  
  // Add effect to debug reports changes
  useEffect(() => {
    console.log('Reports changed in projects component:', reports.length, 'reports')
  }, [reports])
  
  // Custom hooks
  const { user, isAdmin } = useProjectPermissions()
  const { 
    getProjectReports, 
    isAssignedReviewer, 
    getAssignedReportsForCurrentUser 
  } = useProjectReports(projects)
  const { 
    getUploaderInfo, 
    getAssignedReviewerNames, 
    getReviewerStatus, 
    getReportDisplayName 
  } = useReportHelpers()
  
  // Create a type-safe wrapper for getReportDisplayName
  const safeGetReportDisplayName = useCallback((report: { id: string; file_name: string; title?: string }) => {
    // Convert the simple report type to ReportWithUploader for the function
    const fullReport = reports.find(r => r.id === report.id)
    if (fullReport) {
      return getReportDisplayName(fullReport)
    }
    // Fallback if report not found in full list
    return {
      title: report.title || report.file_name,
      fileName: report.file_name,
      hasTitle: Boolean(report.title)
    }
  }, [reports, getReportDisplayName])
  const { 
    getProjectTaskProgress, 
    getProjectTaskCounts, 
    uniqueProjects, 
    getFilteredProjects 
  } = useProjectTasks(tasks, projects)

  // Utility hooks
  const capitalizeWords = useCapitalizeWords()
  const getReportStatusColor = useGetReportStatusColor()
  const formatDate = useFormatDate()

  // State management
  const [filters, setFilters] = useState<ProjectFilters>({
    searchTerm: "",
    statusFilter: "all",
    projectFilter: "all"
  })

  const [modalState, setModalState] = useState<ProjectModalState>({
    editingProject: null,
    viewingReports: null,
    reviewerNotesModal: {
      open: false,
      action: null,
      reportId: '',
      reportName: ''
    },
    simpleNotesModal: {
      open: false,
      reportId: '',
      reportName: '',
      existingNotes: ''
    },
    documentViewerModal: {
      open: false,
      report: null
    },
    reviewerNotesViewerModal: {
      open: false,
      reportName: '',
      reviewerNotes: '',
      reportDetails: undefined
    },
    deleteProjectDialog: {
      open: false,
      project: null,
      isDeleting: false
    },
    deleteReportDialog: {
      open: false,
      report: null,
      isDeleting: false
    }
  })

  // Event handlers
  const handleProjectCreated = useCallback(() => {
    // The mutation and realtime subscription update the shared cache directly.
    // No delayed refetch is needed, so the new card appears in the same frame.
  }, [])

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setModalState(prev => ({ 
        ...prev, 
        deleteProjectDialog: { open: true, project, isDeleting: false } 
      }))
    }
  }, [projects])

  const confirmDeleteProject = useCallback(async () => {
    const { project } = modalState.deleteProjectDialog
    if (!project) return

    setModalState(prev => ({ 
      ...prev, 
      deleteProjectDialog: { ...prev.deleteProjectDialog, isDeleting: true } 
    }))
    
    try {
      // Wait for the deletion to complete before updating UI
      await deleteProject(project.id)
      
      // IMMEDIATE UI UPDATE - Force refresh after project deletion
      forceUIUpdate()
      
      // Don't call toast.success here - deleteProject already shows success toast
      setModalState(prev => ({ 
        ...prev, 
        deleteProjectDialog: { open: false, project: null, isDeleting: false } 
      }))
    } catch (error) {
      console.error("Delete error:", error)
      // Don't call toast.error here - deleteProject already shows error toast
      setModalState(prev => ({ 
        ...prev, 
        deleteProjectDialog: { ...prev.deleteProjectDialog, isDeleting: false } 
      }))
    }
  }, [deleteProject, modalState.deleteProjectDialog, forceUIUpdate])

  const confirmDeleteReport = useCallback(async () => {
    const { report } = modalState.deleteReportDialog
    if (!report) return

    setModalState(prev => ({ 
      ...prev, 
      deleteReportDialog: { ...prev.deleteReportDialog, isDeleting: true } 
    }))
    
    try {
      deleteReport(report.id)
      
      // IMMEDIATE UI UPDATE - Force refresh after deletion
      forceUIUpdate()
      
      // Close the modal immediately
      setModalState(prev => ({ 
        ...prev, 
        deleteReportDialog: { open: false, report: null, isDeleting: false },
        // Close the viewing reports modal if the deleted report was being viewed
        viewingReports: prev.viewingReports?.projectId === report.project_id 
          ? { ...prev.viewingReports, highlightReportId: undefined }
          : prev.viewingReports
      }))
      
      // Force re-render by updating a timestamp
      const reportDeleteTimestamp = Date.now()
      console.log(`Report deleted at ${reportDeleteTimestamp}, UI should update immediately`)
      
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete report")
      setModalState(prev => ({ 
        ...prev, 
        deleteReportDialog: { ...prev.deleteReportDialog, isDeleting: false } 
      }))
    }
  }, [deleteReport, modalState.deleteReportDialog, forceUIUpdate])

  const handleEditProject = useCallback((projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setModalState(prev => ({ ...prev, editingProject: project }))
    }
  }, [projects])

  const handleProjectUpdated = useCallback(() => {
    setModalState(prev => ({ ...prev, editingProject: null }))
    // IMMEDIATE UI UPDATE - Force refresh after project update
    setTimeout(() => {
      refetchProjects()
      forceUIUpdate()
    }, 100)
  }, [refetchProjects, forceUIUpdate])

  // Handle project status update
  const handleStatusUpdate = useCallback(async (projectId: string, newStatus: string) => {
    try {
      updateProject({ id: projectId, updates: { status: newStatus } })
      
      // IMMEDIATE UI UPDATE - Force refresh after status change
      forceUIUpdate()
      
      // Toast is handled in the hook
    } catch (error) {
      console.error("Status update error:", error)
      // Don't call toast.error here - updateProject already shows error toast
    }
  }, [updateProject, forceUIUpdate])

  // Handle reviewer notes submission
  const handleReviewerNotesSubmit = useCallback(async (action: 'approved' | 'revision' | 'rejected', notes: string) => {
    try {
      updateReport({ 
        reportId: modalState.reviewerNotesModal.reportId,
        updates: { 
          status: action,
          reviewer_notes: notes 
        }
      })
      
      // IMMEDIATE UI UPDATE - Force refresh after action
      forceUIUpdate()
      
      // Don't call toast.success here - updateReport already shows success toast
      // Don't call fetchReports here as the hook should handle the update
      setModalState(prev => ({
        ...prev,
        reviewerNotesModal: {
          open: false,
          action: null,
          reportId: '',
          reportName: ''
        }
      }))
    } catch (error) {
      console.error("Status update error:", error)
      // Don't call toast.error here - updateReport already shows error toast
    }
  }, [updateReport, modalState.reviewerNotesModal.reportId, forceUIUpdate])

  // Handle simple notes submission (without status change)
  const handleSimpleNotesSubmit = useCallback(async (notes: string) => {
    try {
      updateReport({ 
        reportId: modalState.simpleNotesModal.reportId,
        updates: { 
          reviewer_notes: notes 
        }
      })
      
      // IMMEDIATE UI UPDATE - Force refresh after action
      forceUIUpdate()
      
      // Don't call toast.success here - updateReport already shows success toast
      // Don't call fetchReports here as the hook should handle the update
      setModalState(prev => ({
        ...prev,
        simpleNotesModal: {
          open: false,
          reportId: '',
          reportName: '',
          existingNotes: ''
        }
      }))
    } catch (error) {
      console.error("Notes update error:", error)
      // Don't call toast.error here - updateReport already shows error toast
    }
  }, [updateReport, modalState.simpleNotesModal.reportId, forceUIUpdate])

  // Handler for document viewer with notes (both save notes and status changes)
  const handleDocumentViewerNotesSubmit = useCallback(async (reportId: string, notes: string) => {
    try {
      updateReport({ 
        reportId,
        updates: { reviewer_notes: notes }
      })
      
      // IMMEDIATE UI UPDATE - Force refresh after action
      forceUIUpdate()
    } catch {
      throw new Error('Failed to save notes')
    }
  }, [updateReport, forceUIUpdate])

  const handleDocumentViewerStatusChange = useCallback(async (reportId: string, status: 'approved' | 'rejected' | 'revision', notes: string) => {
    try {
      updateReport({ 
        reportId,
        updates: { status, reviewer_notes: notes }
      })
      
      // IMMEDIATE UI UPDATE - Force refresh after action
      forceUIUpdate()
    } catch {
      throw new Error(`Failed to ${status} report`)
    }
  }, [updateReport, forceUIUpdate])

  // Handler for viewing reviewer notes
  const handleViewReviewerNotes = useCallback((reportName: string, reviewerNotes: string, reportDetails?: {
    uploader?: string
    uploadDate?: string
    category?: string
    status?: string
    description?: string
  }) => {
    setModalState(prev => ({
      ...prev,
      reviewerNotesViewerModal: {
        open: true,
        reportName,
        reviewerNotes,
        reportDetails
      }
    }))
  }, [])

  const handleViewReports = useCallback((projectId: string, projectName: string, highlightReportId?: string) => {
    setModalState(prev => ({
      ...prev,
      viewingReports: { projectId, projectName, highlightReportId }
    }))
  }, [])

  const handleReportClick = useCallback((projectId: string, projectName: string, reportId: string) => {
    handleViewReports(projectId, projectName, reportId)
  }, [handleViewReports])

  // Computed values
  const filteredProjects = useMemo(() => 
    getFilteredProjects(filters.searchTerm, filters.statusFilter, filters.projectFilter),
    [getFilteredProjects, filters.searchTerm, filters.statusFilter, filters.projectFilter]
  )

  const assignedReports = useMemo(() => 
    getAssignedReportsForCurrentUser(),
    [getAssignedReportsForCurrentUser]
  )

  if (loading || tasksLoading || reportsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 lg:p-9 space-y-4 sm:space-y-5 lg:space-y-7 overflow-y-auto h-full bg-gradient-to-br from-gray-50 via-white to-gray-100/50 max-w-full">
      {/* Modern Header with Glassmorphism */}
      <ProjectsHeader
        onProjectCreated={handleProjectCreated}
        ProjectFormModal={ProjectFormModal}
      />

      {/* Mobile and Desktop Filters */}
      <ProjectFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        uniqueProjects={uniqueProjects}
        isMobile={false}
        ProjectFormModal={ProjectFormModal}
        onProjectCreated={handleProjectCreated}
      />

      <ProjectFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        uniqueProjects={uniqueProjects}
        isMobile={true}
        ProjectFormModal={ProjectFormModal}
        onProjectCreated={handleProjectCreated}
      />

      {/* Project Stats */}
      <ProjectStats projects={projects} />

      {/* Reports Assigned for Review - Notification Section */}
      <AssignedReportsNotification
        assignedReports={assignedReports}
        projects={projects}
        onReportClick={handleReportClick}
        getReportDisplayName={safeGetReportDisplayName}
        formatDate={formatDate}
      />
      
      {/* Projects Grid - Responsive layout */}
      {filteredProjects.length > 0 ? (
        <ProjectGrid
          projects={filteredProjects}
          isAdmin={isAdmin}
          getProjectTaskProgress={getProjectTaskProgress}
          getProjectTaskCounts={getProjectTaskCounts}
          getProjectReports={getProjectReports}
          onProjectSelect={onProjectSelect}
          onStatusUpdate={handleStatusUpdate}
          onEditProject={handleEditProject}
          onDeleteProject={handleDeleteProject}
          onViewReports={handleViewReports}
          onReportUploaded={forceUIUpdate}
          ReportUploadModal={ReportUploadModal}
        />
      ) : (
        <EmptyProjectsState
          ProjectFormModal={ProjectFormModal}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {/* Edit Project Modal */}
      <EditProjectModal
        project={modalState.editingProject}
        open={!!modalState.editingProject}
        onOpenChangeAction={(open) => !open && setModalState(prev => ({ ...prev, editingProject: null }))}
        onProjectUpdatedAction={handleProjectUpdated}
      />

      {/* Reports Modal */}
      <Dialog open={!!modalState.viewingReports} onOpenChange={(open) => !open && setModalState(prev => ({ ...prev, viewingReports: null }))}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Project Reports
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {modalState.viewingReports && (
                `All reports for ${modalState.viewingReports.projectName}`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3" key={`modal-content-${modalForceRender}`}>
            {modalState.viewingReports && 
              // Get fresh reports directly from state instead of memoized function
              reports.filter(r => r.project_id === modalState.viewingReports!.projectId).map((report) => {
                const isHighlighted = modalState.viewingReports?.highlightReportId === report.id
              const isAssigned = isAssignedReviewer(report)
              
              return (
                <div 
                  key={report.id} 
                  className={`p-3 rounded-lg border transition-colors ${
                    isHighlighted 
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' 
                      : isAssigned && report.status === 'pending'
                        ? 'bg-yellow-50 border-yellow-300' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {isHighlighted && (
                    <div className="mb-2 flex items-center text-blue-700 text-sm font-medium">
                      <FileText className="h-4 w-4 mr-1" />
                      ⭐ This is the report you need to review
                    </div>
                  )}
                  {isAssigned && report.status === 'pending' && !isHighlighted && (
                    <div className="mb-2 flex items-center text-yellow-700 text-sm font-medium">
                      <FileText className="h-4 w-4 mr-1" />
                      📋 Assigned to you for review
                    </div>
                  )}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div>
                      <h4 className="font-medium truncate text-gray-900">
                        {getReportDisplayName(report).title}
                      </h4>
                      {getReportDisplayName(report).hasTitle && (
                        <p className="text-xs text-gray-500 font-normal truncate">
                          {getReportDisplayName(report).fileName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                      <span><span className="font-medium">Category:</span> {report.category}</span>
                      <span><span className="font-medium">Uploaded:</span> {new Date(report.uploaded_at || '').toLocaleDateString()}</span>
                      {report.uploaded_by && (
                        <span>
                          <span className="font-medium">By:</span> {getUploaderInfo(report).name}
                          <span className="ml-1 text-gray-500">({getUploaderInfo(report).position})</span>
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Description:</span> {report.description}
                      </p>
                    )}
                  </div>
                  <Badge className={`${getReportStatusColor(report.status)} ml-4 flex-shrink-0`}>
                    {capitalizeWords(report.status) || 'Pending'}
                  </Badge>
                </div>

                {/* Action buttons in horizontal layout */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {/* Download button for all users */}
                  <Button 
                    size="default" 
                    variant="outline" 
                    className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-gray-600 hover:bg-gray-50 border-gray-200"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from('project-documents')
                          .download(report.file_path)

                        if (error) throw error

                        const url = URL.createObjectURL(data)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = report.file_name
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                        toast.success('File downloaded successfully')
                      } catch (error) {
                        console.error('Download error:', error)
                        toast.error('Failed to download file')
                      }
                    }}
                  >
                    Download
                  </Button>

                  {/* View button for everyone, Note capability for assigned reviewers */}
                  <Button 
                    size="default" 
                    variant="outline" 
                    className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-purple-600 hover:bg-purple-50 border-purple-200"
                    onClick={() => {
                      setModalState(prev => ({
                        ...prev,
                        documentViewerModal: {
                          open: true,
                          report: report
                        }
                      }))
                    }}
                  >
                    {isAdmin && isAssignedReviewer(report) ? 'View & Note' : 'View'}
                  </Button>

                  {/* Approval buttons for pending reports */}
                  {isAdmin && report.status === 'pending' && report.uploaded_by !== user?.id && isAssignedReviewer(report) && (
                    <>
                      <Button 
                        size="default" 
                        variant="outline" 
                        className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-green-600 hover:bg-green-50 border-green-200"
                        onClick={() => {
                          setModalState(prev => ({
                            ...prev,
                            reviewerNotesModal: {
                              open: true,
                              action: 'approved',
                              reportId: report.id,
                              reportName: report.file_name || 'Unknown Report'
                            }
                          }))
                        }}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="default" 
                        variant="outline" 
                        className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-yellow-600 hover:bg-yellow-50 border-yellow-200"
                        onClick={() => {
                          setModalState(prev => ({
                            ...prev,
                            reviewerNotesModal: {
                              open: true,
                              action: 'revision',
                              reportId: report.id,
                              reportName: report.file_name || 'Unknown Report'
                            }
                          }))
                        }}
                      >
                        Revision
                      </Button>
                      <Button 
                        size="default" 
                        variant="outline" 
                        className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          setModalState(prev => ({
                            ...prev,
                            reviewerNotesModal: {
                              open: true,
                              action: 'rejected',
                              reportId: report.id,
                              reportName: report.file_name || 'Unknown Report'
                            }
                          }))
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  )}

                  {/* Replace Report Button for report owner when report is rejected/revision */}
                  {report.uploaded_by === user?.id && (report.status === 'rejected' || report.status === 'revision') && (
                    <ReportUploadModal 
                      preselectedProjectId={modalState.viewingReports!.projectId}
                      replacingReportId={report.id}
                      onUploadComplete={() => {
                        // IMMEDIATE UI UPDATE - Force refresh after upload
                        forceUIUpdate()
                        setModalState(prev => ({ ...prev, viewingReports: null }))
                      }}
                    >
                      <Button 
                        size="default" 
                        variant="outline" 
                        className="h-10 px-5 py-2 text-blue-600 hover:bg-blue-50 border-blue-200"
                      >
                        Replace Report
                      </Button>
                    </ReportUploadModal>
                  )}

                  {/* Delete Button for report uploader only */}
                  {report.uploaded_by === user?.id && (
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="h-8 sm:h-10 px-3 sm:px-5 text-xs sm:text-sm text-red-600 hover:bg-red-50 border-red-200"
                      onClick={() => {
                        setModalState(prev => ({
                          ...prev,
                          deleteReportDialog: {
                            open: true,
                            report,
                            isDeleting: false
                          }
                        }))
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {/* Show reviewer notes if available */}
                {(() => {
                  const reportWithNotes = report as typeof report & { reviewer_notes?: string, upload_date?: string }
                  return reportWithNotes.reviewer_notes && (
                    <div 
                      className="mt-2 p-2 bg-blue-50 rounded border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={() => handleViewReviewerNotes(
                        getReportDisplayName(report).title,
                        reportWithNotes.reviewer_notes!,
                        {
                          uploader: getUploaderInfo(report).name,
                          uploadDate: reportWithNotes.upload_date ? formatDate(reportWithNotes.upload_date) : undefined,
                          category: 'category' in report ? report.category as string : undefined,
                          status: report.status || undefined,
                          description: 'description' in report ? report.description as string : undefined
                        }
                      )}
                    >
                      <p className="text-xs font-medium text-blue-800 mb-1">
                        Reviewer Notes: <span className="text-blue-600">(Click to view full)</span>
                      </p>
                      <p className="text-xs text-blue-700 line-clamp-2">{reportWithNotes.reviewer_notes}</p>
                    </div>
                  )
                })()}

                {/* Show multiple reviewers status */}
                {(() => {
                  const reviewers = getReviewerStatus(report)
                  return reviewers.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-800 mb-1">
                        Reviewers ({reviewers.length}):
                      </p>
                      <div className="space-y-1">
                        {reviewers.map((reviewer) => (
                          <div key={reviewer.reviewerId} className="flex items-center justify-between text-xs">
                            <span className="text-gray-700">
                              {reviewer.reviewerName} - {reviewer.reviewerPosition}
                            </span>
                            <Badge 
                              className={`ml-2 ${
                                reviewer.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                reviewer.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                reviewer.status === 'revision' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}
                              variant="outline"
                            >
                              {capitalizeWords(reviewer.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Status messages */}
                {isAdmin && report.uploaded_by === user?.id && report.status === 'pending' && (
                  <p className="text-xs text-gray-500 italic mt-2">Cannot approve your own report</p>
                )}
                {isAdmin && report.uploaded_by !== user?.id && report.status === 'pending' && !isAssignedReviewer(report) && (
                  <p className="text-xs text-gray-500 italic mt-2">Assigned to: {getAssignedReviewerNames(report)}</p>
                )}
              </div>
              )
            })}
            
            {modalState.viewingReports && 
              reports.filter(r => r.project_id === modalState.viewingReports!.projectId).length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500">No reports have been uploaded for this project yet.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReviewerNotesModal
        open={modalState.reviewerNotesModal.open}
        onOpenChangeAction={(open) => setModalState(prev => ({ ...prev, reviewerNotesModal: { ...prev.reviewerNotesModal, open } }))}
        onSubmitAction={handleReviewerNotesSubmit}
        reportName={modalState.reviewerNotesModal.reportName}
        action={modalState.reviewerNotesModal.action}
      />

      <SimpleNotesModal
        open={modalState.simpleNotesModal.open}
        onOpenChange={(open) => setModalState(prev => ({ ...prev, simpleNotesModal: { ...prev.simpleNotesModal, open } }))}
        onSubmit={handleSimpleNotesSubmit}
        reportName={modalState.simpleNotesModal.reportName}
        existingNotes={modalState.simpleNotesModal.existingNotes}
      />

      <ReviewerNotesViewerModal
        open={modalState.reviewerNotesViewerModal.open}
        onOpenChangeAction={(open: boolean) => setModalState(prev => ({ ...prev, reviewerNotesViewerModal: { ...prev.reviewerNotesViewerModal, open } }))}
        reportName={modalState.reviewerNotesViewerModal.reportName}
        reviewerNotes={modalState.reviewerNotesViewerModal.reviewerNotes}
        reportDetails={modalState.reviewerNotesViewerModal.reportDetails}
      />

      <DocumentViewerWithNotesModal
        open={modalState.documentViewerModal.open}
        onOpenChangeAction={(open) => setModalState(prev => ({ ...prev, documentViewerModal: { ...prev.documentViewerModal, open } }))}
        report={modalState.documentViewerModal.report}
        onNotesSubmitAction={handleDocumentViewerNotesSubmit}
        onStatusChangeAction={handleDocumentViewerStatusChange}
        userRole={isAdmin && modalState.documentViewerModal.report && isAssignedReviewer(modalState.documentViewerModal.report) ? 'reviewer' : 'viewer'}
      />

      <DeleteConfirmationDialog
        isOpen={modalState.deleteProjectDialog.open}
        onClose={() => setModalState(prev => ({ 
          ...prev, 
          deleteProjectDialog: { open: false, project: null, isDeleting: false } 
        }))}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and will permanently remove all project data, tasks, and associated files."
        itemName={modalState.deleteProjectDialog.project?.name}
        isLoading={modalState.deleteProjectDialog.isDeleting}
      />

      <DeleteConfirmationDialog
        isOpen={modalState.deleteReportDialog.open}
        onClose={() => setModalState(prev => ({ 
          ...prev, 
          deleteReportDialog: { open: false, report: null, isDeleting: false } 
        }))}
        onConfirm={confirmDeleteReport}
        title="Delete Report"
        description="Are you sure you want to delete this report? This action cannot be undone and will permanently remove the report file."
        itemName={modalState.deleteReportDialog.report?.file_name}
        isLoading={modalState.deleteReportDialog.isDeleting}
      />
    </div>
  )
}
