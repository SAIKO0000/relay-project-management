import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { supabase, queryKeys } from '@/lib/supabase-query'
import type { Database } from '@/lib/supabase.types'
import { useAuth } from '@/lib/auth'
import {
  getActiveWorkspaceId,
  getCachedPrivateStorageUrl,
  getPrivateStorageUrl,
  workspaceStoragePath,
} from '@/lib/workspace'

type Photo = Database['public']['Tables']['photos']['Row'] & {
  project?: { id: string; name: string }
  uploader_name?: string
}

// Optimized Photos Hook - Fetches all photos once and caches them
export function usePhotosOptimized(projectId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: projectId ? queryKeys.photosByProject(projectId) : queryKeys.photos(),
    queryFn: async () => {
      let query = supabase
        .from('photos_with_uploader_names')
        .select(`
          id, title, description, file_name, file_size, file_type, storage_path, 
          upload_date, uploaded_by, project_id, created_at, updated_at,
          uploader_name, project_name
        `)
        .order('created_at', { ascending: false })

      if (projectId && projectId !== 'all') {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching photos:', error)
        throw error
      }
      
      // The view already includes uploader names, so we can use them directly
      const photosWithNames = await Promise.all((data || []).map(async (photo) => ({
        ...photo,
        project: photo.project_name ? { id: photo.project_id, name: photo.project_name } : undefined,
        uploader_name: photo.uploader_name || 'Unknown User',
        signed_url: await getPrivateStorageUrl('project-photos', photo.storage_path),
      })))
      
      console.log('Fetched photos with uploader names:', photosWithNames)
      return photosWithNames
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - photos don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  })  // Set up realtime subscription for photos
  useEffect(() => {
    const channel = supabase
      .channel('photos_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photos'
        },
        (payload) => {
          console.log('Photos realtime update:', payload)
          
          // Invalidate photos queries
          queryClient.invalidateQueries({ queryKey: queryKeys.photos() })
          if (projectId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.photosByProject(projectId) })
          }
          
          // Also invalidate notifications since they include photos
          queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient, projectId])

  return query
}

// Hook to get photo counts by date - uses cached data instead of making new requests
export function usePhotoCountsByDate(photos: Photo[], selectedProject?: string) {
  return useMemo(() => {
    const counts: Record<string, number> = {}
    
    if (!photos) return counts

    photos.forEach(photo => {
      // Skip if project filter is active and doesn't match
      if (selectedProject && selectedProject !== 'all' && photo.project_id !== selectedProject) {
        return
      }

      const uploadDate = photo.upload_date
      if (uploadDate) {
        counts[uploadDate] = (counts[uploadDate] || 0) + 1
      }
    })

    return counts
  }, [photos, selectedProject])
}

// Hook to get photos for a specific date - uses cached data
export function usePhotosForDate(photos: Photo[], date: Date, selectedProject?: string) {
  return useMemo(() => {
    if (!photos) return []

    const dateString = formatDateToLocal(date)
    
    return photos.filter(photo => {
      // Check date match
      const uploadDate = photo.upload_date
      if (uploadDate !== dateString) return false

      // Check project filter
      if (selectedProject && selectedProject !== 'all' && photo.project_id !== selectedProject) {
        return false
      }

      return true
    })
  }, [photos, date, selectedProject])
}

// Helper function to format date consistently
function formatDateToLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Hook for recent photos (used in notifications)
export function useRecentPhotos(limit: number = 10) {
  return useQuery({
    queryKey: [...queryKeys.photos(), 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          id, description, file_name, storage_path, created_at, uploaded_by,
          project:projects!inner(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent photos:', error)
        throw error
      }
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for recent data
    gcTime: 10 * 60 * 1000,
  })
}

// Photo operations hook - for upload, download, delete operations
export function usePhotoOperations() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadPhotos = async (
    files: File[], 
    dateString: string,
    projectId?: string, 
    description?: string,
    title?: string
  ): Promise<Photo[]> => {
    try {
      setUploading(true)
      setUploadProgress(0)
      const uploadedPhotos: Photo[] = []
      const workspaceId = await getActiveWorkspaceId()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress((i / files.length) * 100)

        // Upload to storage
        const fileExtension = file.name.split('.').pop() || 'jpg'
        const fileName = workspaceStoragePath(
          workspaceId,
          'photos',
          `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
        )
        console.log('Uploading file:', fileName, 'to storage bucket: project-photos')
        
        const { data: storageData, error: storageError } = await supabase.storage
          .from('project-photos')
          .upload(fileName, file)

        if (storageError) {
          console.error('Storage upload error:', storageError)
          throw storageError
        }
        await getPrivateStorageUrl('project-photos', storageData.path)
        
        console.log('Upload successful, storage data:', storageData)

        // Insert record in database
        const photoRecord = {
          title: title || file.name.replace(/\.[^/.]+$/, ""), // Use title or fallback to filename without extension
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: storageData.path,
          project_id: projectId || null, // Allow null if no project is selected
          description: description || '',
          upload_date: dateString, // Use the provided date string
          uploaded_by: currentUser?.id || null, // Set the current user as uploader
        }
        
        console.log('Inserting photo record:', photoRecord)
        
        const { data: photoData, error: dbError } = await supabase
          .from('photos')
          .insert(photoRecord)
          .select()
          .single()

        if (dbError) {
          console.error('Database insert error:', dbError)
          console.error('Error details:', JSON.stringify(dbError, null, 2))
          console.error('Failed photo record:', photoRecord)
          throw dbError
        }
        
        console.log('Database insert successful:', photoData)

        uploadedPhotos.push(photoData)
      }

      setUploadProgress(100)

      // Invalidate photos queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.photos() })
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.photosByProject(projectId) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })

      return uploadedPhotos
    } catch (error) {
      console.error('Error uploading photos:', error)
      throw error
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getPhotoUrl = (storagePath: string) => {
    if (!storagePath) {
      console.warn('No storage path provided for photo')
      return ''
    }
    
    return getCachedPrivateStorageUrl('project-photos', storagePath)
  }

  // Alternative method for signed URLs (if the bucket is private)
  const getSignedPhotoUrl = async (storagePath: string, expiresIn: number = 3600) => {
    if (!storagePath) {
      console.warn('No storage path provided for photo')
      return ''
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .createSignedUrl(storagePath, expiresIn)
      
      if (error) {
        console.error('Error creating signed URL:', error)
        return ''
      }
      
      return data.signedUrl
    } catch (error) {
      console.error('Error in getSignedPhotoUrl:', error)
      return ''
    }
  }

  const downloadPhoto = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .download(photo.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = photo.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading photo:', error)
      throw error
    }
  }

  const deletePhoto = async (photoId: string): Promise<void> => {
    try {
      // Get photo data first to access storage path
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('storage_path, project_id')
        .eq('id', photoId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-photos')
        .remove([photo.storage_path])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        // Continue with database deletion even if storage fails
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.photos() })
      if (photo.project_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.photosByProject(photo.project_id) })
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })

    } catch (error) {
      console.error('Error deleting photo:', error)
      throw error
    }
  }

  return {
    uploadPhotos,
    getPhotoUrl,
    getSignedPhotoUrl,
    downloadPhoto,
    deletePhoto,
    uploading,
    uploadProgress,
  }
}
