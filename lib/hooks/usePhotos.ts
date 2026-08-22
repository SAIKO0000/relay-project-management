import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import type { Database } from '../supabase.types'
import { getActiveWorkspaceId, getCachedPrivateStorageUrl, workspaceStoragePath } from '../workspace'

type Photo = Database['public']['Tables']['photos']['Row']
type PhotoInsert = Database['public']['Tables']['photos']['Insert']

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPhotos(data || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPhotosForDate = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('upload_date', date)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching photos for date:', error)
      return []
    }
  }

  const uploadPhotos = async (
    files: File[],
    uploadDate: string,
    projectId?: string,
    eventId?: string
  ) => {
    try {
      setUploading(true)
      setUploadProgress(0)
      const uploadedPhotos: Photo[] = []
      const workspaceId = await getActiveWorkspaceId()
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${uploadDate}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = workspaceStoragePath(workspaceId, 'photos', uploadDate, fileName)
        const { error: uploadError } = await supabase.storage
          .from('project-photos')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Error uploading file:', uploadError)
          continue
        }

        // Save photo metadata to database
        const photoData: PhotoInsert = {
          project_id: projectId || null,
          event_id: eventId || null,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: filePath,
          upload_date: uploadDate,
          description: null,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id || null,
        }

        const { data: photo, error: dbError } = await supabase
          .from('photos')
          .insert(photoData)
          .select()
          .single()

        if (dbError) {
          console.error('Error saving photo metadata:', dbError)
          continue
        }

        uploadedPhotos.push(photo)
        setUploadProgress(((i + 1) / files.length) * 100)
      }

      // Refresh photos list
      await fetchPhotos()
      return uploadedPhotos
    } catch (error) {
      console.error('Error uploading photos:', error)
      throw error
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const getPhotoUrl = (storageePath: string) => {
    return getCachedPrivateStorageUrl('project-photos', storageePath)
  }

  const downloadPhoto = async (photo: Photo) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-photos')
        .download(photo.storage_path)

      if (error) throw error

      // Create download link
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

  const deletePhoto = async (photoId: string) => {
    try {
      // Get photo details first
      const { data: photo, error: fetchError } = await supabase
        .from('photos')
        .select('*')
        .eq('id', photoId)
        .single()

      if (fetchError) throw fetchError

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-photos')
        .remove([photo.storage_path])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photoId)

      if (dbError) throw dbError

      // Refresh photos list
      await fetchPhotos()
    } catch (error) {
      console.error('Error deleting photo:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [])

  return {
    photos,
    loading,
    uploading,
    uploadProgress,
    fetchPhotos,
    fetchPhotosForDate,
    uploadPhotos,
    getPhotoUrl,
    downloadPhoto,
    deletePhoto,
  }
}
