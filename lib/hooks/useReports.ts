import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../supabase'
import type { Database } from '../supabase.types'
import { toast } from 'react-hot-toast'
import { getActiveWorkspaceId, workspaceStoragePath } from '@/lib/workspace'
import { assertUploadFile } from '@/lib/upload-policy'

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]
type Report = Database['public']['Tables']['reports']['Row']
type ReportInsert = Database['public']['Tables']['reports']['Insert']

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

export function useReports() {
  const [reports, setReports] = useState<ReportWithUploader[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const queryClient = useQueryClient()
  
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch reports with basic data
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .order('uploaded_at', { ascending: false })

      if (reportsError) {
        throw reportsError
      }

      // Get current user to check if any reports belong to them
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Get all personnel data to map by email
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('id, name, email, position')

      // Map reports with uploader names and positions
      const reportsWithNames = (reportsData || []).map(report => {
        let uploaderName = 'Unknown User'
        let uploaderPosition = 'Unknown Position'
        
        // First check if uploader_name and uploader_position are already stored in the database
        const reportWithName = report as Report & { uploader_name?: string; uploader_position?: string }
        if (reportWithName.uploader_name) {
          uploaderName = reportWithName.uploader_name
        }
        if (reportWithName.uploader_position) {
          uploaderPosition = reportWithName.uploader_position
        }
        
        // If not stored, try to get from current user or personnel data
        if (!reportWithName.uploader_name && report.uploaded_by) {
          // Fallback to current logic for reports without stored names
          if (currentUser && currentUser.id === report.uploaded_by) {
            // Try to find current user in personnel by email
            const personnelMatch = personnelData?.find(person => 
              person.email === currentUser.email
            )
            
            if (personnelMatch) {
              uploaderName = personnelMatch.name
              uploaderPosition = personnelMatch.position || 'Unknown Position'
            } else {
              // Use the name from user metadata or email
              uploaderName = currentUser.user_metadata?.name || 
                           currentUser.email?.split('@')[0] || 
                           'Current User'
              uploaderPosition = currentUser.user_metadata?.position || 'Unknown Position'
            }
          } else {
            // For other users, show a shortened UUID for now
            uploaderName = `User ${report.uploaded_by.substring(0, 8)}`
            uploaderPosition = 'Unknown Position'
          }
        }
        
        return {
          ...report,
          uploader_name: uploaderName,
          uploader_position: uploaderPosition
        }
      })
      
      setReports(reportsWithNames)
    } catch (error) {
      console.error('Error fetching reports:', error)
      // Fallback to reports without names
      try {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('reports')
          .select('*')
          .order('uploaded_at', { ascending: false })
        
        if (!fallbackError) {
          setReports(fallbackData || [])
        }
      } catch (fallbackError) {
        console.error('Fallback fetch also failed:', fallbackError)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Normalize MIME types for better Supabase compatibility
  const normalizeMimeType = (file: File): string => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    const originalType = file.type.toLowerCase()
    
    // Handle zip files with different MIME types
    if (extension === 'zip' || originalType.includes('zip')) {
      return 'application/zip'
    }
    
    // Handle other compressed files
    if (extension === 'rar') return 'application/x-rar-compressed'
    if (extension === '7z') return 'application/x-7z-compressed'
    if (extension === 'tar') return 'application/x-tar'
    if (extension === 'gz') return 'application/gzip'
    
    // Handle document types
    if (extension === 'pdf') return 'application/pdf'
    if (extension === 'doc') return 'application/msword'
    if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    if (extension === 'xls') return 'application/vnd.ms-excel'
    if (extension === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    if (extension === 'ppt') return 'application/vnd.ms-powerpoint'
    if (extension === 'pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    
    // Handle text files
    if (extension === 'txt') return 'text/plain'
    if (extension === 'csv') return 'text/csv'
    if (extension === 'json') return 'application/json'
    if (extension === 'xml') return 'application/xml'
    
    // Handle images
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
    if (extension === 'png') return 'image/png'
    if (extension === 'gif') return 'image/gif'
    if (extension === 'bmp') return 'image/bmp'
    if (extension === 'webp') return 'image/webp'
    if (extension === 'svg') return 'image/svg+xml'
    
    // Handle CAD files
    if (extension === 'dwg') return 'image/vnd.dwg'
    if (extension === 'dxf') return 'image/vnd.dxf'
    
    // Handle video files
    if (extension === 'mp4') return 'video/mp4'
    if (extension === 'avi') return 'video/x-msvideo'
    if (extension === 'mov') return 'video/quicktime'
    if (extension === 'wmv') return 'video/x-ms-wmv'
    if (extension === 'webm') return 'video/webm'
    
    // Handle audio files
    if (extension === 'mp3') return 'audio/mpeg'
    if (extension === 'wav') return 'audio/wav'
    if (extension === 'flac') return 'audio/flac'
    if (extension === 'aac') return 'audio/aac'
    
    // Handle code files
    if (extension === 'js') return 'text/javascript'
    if (extension === 'ts') return 'text/typescript'
    if (extension === 'html') return 'text/html'
    if (extension === 'css') return 'text/css'
    if (extension === 'py') return 'text/x-python'
    if (extension === 'java') return 'text/x-java'
    if (extension === 'cpp' || extension === 'c') return 'text/x-c'
    
    // Return original type if no normalization needed
    return originalType || 'application/octet-stream'
  }

  const uploadReport = async (
    file: File,
    projectId: string,
    category: string,
    status: string = 'pending',
    description?: string,
    assignedReviewer?: string, // Single reviewer ID
    title?: string // Report title
  ) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      assertUploadFile(file, 'document')

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileName = `${projectId}_${timestamp}_${randomId}.${fileExt}`
      const workspaceId = await getActiveWorkspaceId()
      const filePath = workspaceStoragePath(workspaceId, 'reports', projectId, fileName)

      // Normalize MIME type for better compatibility
      const normalizedMimeType = normalizeMimeType(file)
      
      // Create a new File object with normalized MIME type if needed
      const fileToUpload = file.type !== normalizedMimeType 
        ? new File([file], file.name, { type: normalizedMimeType })
        : file

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, fileToUpload, {
          contentType: normalizedMimeType,
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      setUploadProgress(50)

      // Truncate fields to match database constraints - file_type has 50 char limit
      const truncatedFileName = file.name.length > 255 ? file.name.substring(0, 255) : file.name
      const truncatedFileType = normalizedMimeType && normalizedMimeType.length > 50 ? normalizedMimeType.substring(0, 50) : normalizedMimeType
      const truncatedCategory = category.length > 50 ? category.substring(0, 50) : category
      const truncatedStatus = status.length > 50 ? status.substring(0, 50) : status
      const truncatedDescription = description && description.length > 1000 ? description.substring(0, 1000) : description

      // Get current user for uploaded_by field
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      // Get uploader name and position from personnel table or user metadata
      let uploaderName = 'Unknown User'
      let uploaderPosition = 'Unknown Position'
      if (currentUser?.email) {
        // Try to find user in personnel by email
        const { data: personnelData } = await supabase
          .from('personnel')
          .select('name, position')
          .eq('email', currentUser.email)
          .single()
        
        if (personnelData) {
          uploaderName = personnelData.name
          uploaderPosition = personnelData.position || 'Team Member' // Better default
        } else {
          // Use name and position from user metadata or email
          uploaderName = currentUser.user_metadata?.name || 
                        currentUser.email.split('@')[0] || 
                        'Current User'
          uploaderPosition = currentUser.user_metadata?.position || 'Team Member'
        }
      }
      
      // Save report metadata to database
      const reportData: ReportInsert & { uploader_name?: string; uploader_position?: string; assigned_reviewer?: string; title?: string } = {
        project_id: projectId,
        file_name: truncatedFileName,
        file_path: filePath,
        file_size: file.size,
        file_type: truncatedFileType || null,
        category: truncatedCategory,
        status: truncatedStatus,
        description: truncatedDescription || null,
        uploaded_by: currentUser?.id || null,
        uploader_name: uploaderName,
        uploader_position: uploaderPosition,
        assigned_reviewer: assignedReviewer || null,
        title: title || null,
      }

      const { data: report, error: dbError } = await supabase
        .from('reports')
        .insert(reportData)
        .select()
        .single()

      if (dbError) {
        console.error('Database error details:', {
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code,
          reportData
        })
        throw new Error(`Database insert failed: ${dbError.message}`)
      }

      setUploadProgress(100)

      // IMMEDIATE UPDATE: Add to local state immediately for instant UI feedback
      const newReport: ReportWithUploader = {
        ...report,
        uploader_name: uploaderName,
        uploader_position: uploaderPosition,
      }
      setReports(prev => [newReport, ...prev])

      // Invalidate React Query caches for other components  
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reports', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      
      toast.success('Report uploaded successfully!')
      return report
    } catch (error) {
      console.error('Error uploading report:', error)
      throw error
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getReportUrl = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(filePath, 900)
    return error ? '' : data.signedUrl
  }

  const downloadReport = async (report: Report) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-documents')
        .download(report.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = report.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading report:', error)
      throw error
    }
  }

  const deleteReport = async (reportId: string) => {
    try {
      // Get report details first
      const { data: report, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (fetchError) throw fetchError

      // IMMEDIATE OPTIMISTIC UPDATE: Remove from local state FIRST for instant UI feedback
      setReports(prev => prev.filter(r => r.id !== reportId))

      // Invalidate React Query caches immediately to force re-renders
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['reports', report.project_id] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-documents')
        .remove([report.file_path])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('reports')
        .delete()
        .eq('id', reportId)

      if (dbError) {
        // Rollback optimistic update on error
        await fetchReports()
        throw dbError
      }
      
      toast.success('Report deleted successfully!')
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
      throw error
    }
  }

  const updateReport = async (reportId: string, updates: Partial<Pick<Tables<'reports'>['Update'], 'file_name' | 'project_id' | 'category' | 'status' | 'description'>> & { reviewer_notes?: string }) => {
    if (!reportId) {
      throw new Error('Report ID is required')
    }

    try {
      setLoading(true)
      
      // IMMEDIATE OPTIMISTIC UPDATE: Update local state FIRST for instant UI feedback
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, ...updates } : r
      ))

      // Invalidate React Query caches immediately to force re-renders
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      
      const { data, error } = await supabase
        .from('reports')
        .update(updates)
        .eq('id', reportId)
        .select()
        .single()

      if (error) {
        // Rollback optimistic update on error
        await fetchReports()
        throw error
      }

      // Update local state with actual data from database
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, ...data } : r
      ))

      toast.success('Report updated successfully!')
      return data
      
    } catch (error) {
      console.error('Error updating report:', error)
      toast.error('Failed to update report')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const replaceReport = async (
    reportId: string,
    file: File,
    category?: string,
    status: string = 'pending',
    description?: string,
    title?: string // Report title
  ) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      assertUploadFile(file, 'document')

      // Get the existing report to find project ID
      const { data: existingReport, error: fetchError } = await supabase
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single()

      if (fetchError) throw fetchError

      const projectId = existingReport.project_id

      // Delete old file from storage if it exists
      if (existingReport.file_path) {
        const { error: deleteError } = await supabase.storage
          .from('project-documents')
          .remove([existingReport.file_path])
        
        if (deleteError) {
          console.warn('Could not delete old file:', deleteError)
        }
      }

      // Generate unique filename for new file
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const fileName = `${projectId}_${timestamp}_${randomId}.${fileExt}`
      const workspaceId = await getActiveWorkspaceId()
      const filePath = workspaceStoragePath(workspaceId, 'reports', projectId, fileName)

      // Normalize MIME type for better compatibility
      const normalizedMimeType = normalizeMimeType(file)
      
      // Create a new File object with normalized MIME type if needed
      const fileToUpload = file.type !== normalizedMimeType 
        ? new File([file], file.name, { type: normalizedMimeType })
        : file

      setUploadProgress(25)

      // Upload new file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, fileToUpload, {
          contentType: normalizedMimeType,
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error details:', uploadError)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      setUploadProgress(75)

      // Truncate fields to match database constraints
      const truncatedFileName = file.name.length > 255 ? file.name.substring(0, 255) : file.name
      const truncatedFileType = normalizedMimeType && normalizedMimeType.length > 50 ? normalizedMimeType.substring(0, 50) : normalizedMimeType
      const truncatedCategory = category && category.length > 50 ? category.substring(0, 50) : category
      const truncatedStatus = status.length > 50 ? status.substring(0, 50) : status
      const truncatedDescription = description && description.length > 1000 ? description.substring(0, 1000) : description

      // Get current user for uploaded_by field
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      // Get uploader name and position from personnel table or user metadata
      let uploaderName = 'Unknown User'
      let uploaderPosition = 'Unknown Position'
      if (currentUser?.email) {
        // Try to find user in personnel by email
        const { data: personnelData } = await supabase
          .from('personnel')
          .select('name, position')
          .eq('email', currentUser.email)
          .single()
        
        if (personnelData) {
          uploaderName = personnelData.name
          uploaderPosition = personnelData.position || 'Team Member' // Better default
        } else {
          // Use name and position from user metadata or email
          uploaderName = currentUser.user_metadata?.name || 
                        currentUser.email.split('@')[0] || 
                        'Current User'
          uploaderPosition = currentUser.user_metadata?.position || 'Team Member'
        }
      }

      // Update report metadata in database
      const updateData: Partial<ReportInsert> & { uploader_name?: string; uploader_position?: string; title?: string } = {
        file_name: truncatedFileName,
        file_path: filePath,
        file_type: truncatedFileType,
        file_size: file.size,
        status: truncatedStatus,
        uploaded_at: new Date().toISOString(),
        uploaded_by: currentUser?.id || null,
        uploader_name: uploaderName,
        uploader_position: uploaderPosition,
      }

      // Only update category, description, and title if provided
      if (category) updateData.category = truncatedCategory
      if (description !== undefined) updateData.description = truncatedDescription
      if (title !== undefined) updateData.title = title

      const { data, error } = await supabase
        .from('reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      setUploadProgress(100)

      // Instantly invalidate and refetch reports data for instant updates
      queryClient.invalidateQueries({ queryKey: ['reports'] })

      // Update local state
      setReports(prev => prev.map(r => 
        r.id === reportId ? data : r
      ))

      toast.success('Report replaced successfully!')
      return data
      
    } catch (error) {
      console.error('Error replacing report:', error)
      throw error
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void fetchReports()
    })
  }, [fetchReports])

  return {
    reports,
    loading,
    uploading,
    uploadProgress,
    fetchReports,
    uploadReport,
    replaceReport,
    getReportUrl,
    downloadReport,
    deleteReport,
    updateReport
  }
}
