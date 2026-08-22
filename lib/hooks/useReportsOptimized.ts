import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase, queryKeys } from '@/lib/supabase-query'
import { toast } from 'react-hot-toast'
import { getActiveWorkspaceId, workspaceStoragePath } from '@/lib/workspace'
import { assertUploadFile } from '@/lib/upload-policy'

// Base report interface - matches database schema
interface Report {
  id: string
  project_id: string | null
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  category: string | null
  status: string | null
  description: string | null
  uploaded_at: string | null
  uploaded_by: string | null
  reviewer_notes?: string | null
  assigned_reviewer?: string | null
  title?: string | null
}

// Extended report type with uploader name and position
export interface ReportWithUploader extends Report {
  id: string
  project_id: string | null
  file_name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  category: string | null
  status: string | null
  description: string | null
  uploaded_at: string | null
  uploaded_by: string | null
  uploader_name?: string
  uploader_position?: string
  reviewer_notes?: string
  assigned_reviewer?: string
  title?: string
}

// TanStack Query-based Reports Hook - Similar to usePhotosOptimized
export function useReportsOptimized(projectId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: projectId ? queryKeys.reportsByProject(projectId) : queryKeys.reports(),
    queryFn: async () => {
      console.log('🔍 Fetching reports via TanStack Query...')
      
      // Fetch reports with basic data
      let reportsQuery = supabase
        .from('reports')
        .select('*')
        .order('uploaded_at', { ascending: false })

      if (projectId && projectId !== 'all') {
        reportsQuery = reportsQuery.eq('project_id', projectId)
      }

      const { data: reportsData, error: reportsError } = await reportsQuery

      if (reportsError) {
        console.error('Error fetching reports:', reportsError)
        throw reportsError
      }

      if (!reportsData || reportsData.length === 0) {
        console.log('No reports found')
        return []
      }

      // Get unique uploader IDs
      const uploaderIds = [...new Set(reportsData.map(r => r.uploaded_by).filter(Boolean))]
      
      let personnelMap: Record<string, { name: string; position: string }> = {}
      
      if (uploaderIds.length > 0) {
        // Fetch uploader info from personnel table
        const { data: personnelData } = await supabase
          .from('personnel')
          .select('id, name, position')
          .in('id', uploaderIds)

        if (personnelData) {
          personnelMap = Object.fromEntries(
            personnelData.map(p => [p.id, { name: p.name, position: p.position || 'Team Member' }])
          )
        }
      }

      // Enrich reports with uploader information
      const enrichedReports: ReportWithUploader[] = reportsData.map(report => ({
        ...report,
        uploader_name: report.uploaded_by ? personnelMap[report.uploaded_by]?.name || 'Unknown User' : 'Unknown User',
        uploader_position: report.uploaded_by ? personnelMap[report.uploaded_by]?.position || 'Team Member' : 'Team Member'
      }))

      console.log(`✅ Fetched ${enrichedReports.length} reports with uploader info`)
      return enrichedReports
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - reports change more frequently than photos
    gcTime: 15 * 60 * 1000, // 15 minutes cache
  })

  // Set up realtime subscription for reports
  useEffect(() => {
    console.log('🔄 Setting up realtime subscription for reports...')
    
    const channel = supabase
      .channel('reports_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reports',
        ...(projectId && projectId !== 'all' ? { filter: `project_id=eq.${projectId}` } : {})
      }, (payload) => {
        console.log('📡 Real-time reports change detected:', payload)
        
        // Invalidate and refetch reports
        queryClient.invalidateQueries({ 
          queryKey: projectId ? queryKeys.reportsByProject(projectId) : queryKeys.reports() 
        })
        
        // Also invalidate related queries
        queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
      })
      .subscribe()

    return () => {
      console.log('🔌 Unsubscribing from reports realtime updates')
      supabase.removeChannel(channel)
    }
  }, [queryClient, projectId])

  return query
}

// Report Operations Hook - Similar to usePhotoOperations
export function useReportOperations() {
  const queryClient = useQueryClient()

  // Upload Report Mutation
  const uploadReportMutation = useMutation({
    mutationFn: async ({ 
      file, 
      projectId, 
      category, 
      status = 'pending', 
      description, 
      assignedReviewer, 
      title 
    }: {
      file: File
      projectId: string
      category: string
      status?: string
      description?: string
      assignedReviewer?: string
      title?: string
    }) => {
      assertUploadFile(file, 'document')
      console.log('⬆️ Starting report upload via mutation...')
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileName = `${projectId}_${timestamp}_${randomId}.${fileExt}`
      const workspaceId = await getActiveWorkspaceId()
      const filePath = workspaceStoragePath(workspaceId, 'reports', projectId, fileName)

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Get current user for uploaded_by field
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Get uploader name and position
      let uploaderName = 'Unknown User'
      let uploaderPosition = 'Unknown Position'
      if (currentUser && currentUser.email) {
        const { data: personnelData } = await supabase
          .from('personnel')
          .select('name, position')
          .eq('email', currentUser.email)
          .single()
        
        if (personnelData) {
          uploaderName = personnelData.name
          uploaderPosition = personnelData.position || 'Team Member'
        }
      }
      
      // Save report metadata to database
      const reportData = {
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type || null,
        category: category,
        status: status,
        description: description || null,
        uploaded_by: currentUser?.id || null,
        assigned_reviewer: assignedReviewer || null,
        title: title || null,
      }

      const { data: report, error: dbError } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      console.log('✅ Report uploaded successfully')
      return {
        ...report,
        uploader_name: uploaderName,
        uploader_position: uploaderPosition,
      }
    },
    onSuccess: (newReport) => {
      // Invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.reports() })
      queryClient.invalidateQueries({ queryKey: queryKeys.reportsByProject(newReport.project_id!) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
      
      toast.success('Report uploaded successfully!')
    },
    onError: (error) => {
      console.error('Upload error:', error)
      toast.error('Failed to upload report')
    }
  })

  // Update Report Mutation
  const updateReportMutation = useMutation({
    mutationFn: async ({ 
      reportId, 
      updates 
    }: { 
      reportId: string
      updates: Partial<Pick<Report, 'file_name' | 'project_id' | 'category' | 'status' | 'description'>> & { reviewer_notes?: string }
    }) => {
      console.log('📝 Updating report via mutation:', reportId, updates)
      
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      return data
    },
    onMutate: async ({ reportId, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.reports() })

      // Snapshot the previous value
      const previousReports = queryClient.getQueryData(queryKeys.reports())

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.reports(), (old: ReportWithUploader[] | undefined) => {
        if (!old) return old
        return old.map(report => 
          report.id === reportId ? { ...report, ...updates } : report
        )
      })

      // Return a context object with the snapshotted value
      return { previousReports }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReports) {
        queryClient.setQueryData(queryKeys.reports(), context.previousReports)
      }
      toast.error('Failed to update report')
    },
    onSuccess: (updatedReport) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.reports() })
      queryClient.invalidateQueries({ queryKey: queryKeys.reportsByProject(updatedReport.project_id!) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
      
      toast.success('Report updated successfully!')
    }
  })

  // Delete Report Mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      console.log('🗑️ Deleting report via mutation:', reportId)
      
      // Get report details first
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      if (report.file_path) {
        const { error: storageError } = await supabase.storage
          .from('project-documents')
          .remove([report.file_path])

        if (storageError) {
          console.error('Error deleting from storage:', storageError)
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (dbError) throw dbError
      
      return { reportId, projectId: report.project_id }
    },
    onMutate: async (reportId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.reports() })

      // Snapshot the previous value
      const previousReports = queryClient.getQueryData(queryKeys.reports())

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.reports(), (old: ReportWithUploader[] | undefined) => {
        if (!old) return old
        return old.filter(report => report.id !== reportId)
      })

      // Return a context object with the snapshotted value
      return { previousReports }
    },
    onError: (err, reportId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousReports) {
        queryClient.setQueryData(queryKeys.reports(), context.previousReports)
      }
      toast.error('Failed to delete report')
    },
    onSuccess: ({ projectId }) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.reports() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.reportsByProject(projectId) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
      
      toast.success('Report deleted successfully!')
    }
  })

  return {
    uploadReport: uploadReportMutation.mutate,
    updateReport: updateReportMutation.mutate,
    deleteReport: deleteReportMutation.mutate,
    isUploading: uploadReportMutation.isPending,
    isUpdating: updateReportMutation.isPending,
    isDeleting: deleteReportMutation.isPending,
  }
}

// Helper hook to get reports for a specific project
export function useProjectReportsOptimized(projectId: string) {
  return useReportsOptimized(projectId)
}
