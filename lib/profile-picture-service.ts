"use client"

import { supabase } from './supabase'
import { getPrivateStorageUrl, userAvatarStoragePath } from './workspace'

export interface UploadResult {
  success: boolean
  url?: string
  path?: string
  error?: string
}

/**
 * Upload profile picture to Supabase storage
 */
export async function uploadProfilePicture(file: File): Promise<UploadResult> {
  try {
    // Validate file type
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (!allowedTypes.has(file.type)) {
      return { success: false, error: 'Please upload a JPEG, PNG, or WebP image' }
    }

    // Match the private bucket limit so oversized files never reach Storage.
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 2MB' }
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      return { success: false, error: 'You must be signed in to upload an image' }
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = userAvatarStoragePath(userData.user.id, fileExt)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: 'Failed to upload image' }
    }

    const signedUrl = await getPrivateStorageUrl('avatars', filePath)
    if (!signedUrl) {
      return { success: false, error: 'Failed to get image URL' }
    }

    return { success: true, url: signedUrl, path: filePath }
  } catch (error) {
    console.error('Profile picture upload error:', error)
    return { success: false, error: 'Failed to upload profile picture' }
  }
}

/**
 * Delete old profile picture from storage
 */
export async function deleteProfilePicture(avatarPathOrUrl: string): Promise<void> {
  try {
    let filePath = avatarPathOrUrl
    if (/^https?:\/\//i.test(avatarPathOrUrl)) {
      const url = new URL(avatarPathOrUrl)
      const marker = '/avatars/'
      const markerIndex = url.pathname.indexOf(marker)
      if (markerIndex === -1) return
      filePath = decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
    }
    
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
    }
  } catch (error) {
    console.error('Error deleting profile picture:', error)
  }
}

/**
 * Update personnel avatar URL in database
 */
export async function updatePersonnelAvatar(
  personnelId: string, 
  avatarUrl: string | null
): Promise<UploadResult> {
  try {
    const { error } = await supabase
      .from('personnel')
      .update({ avatar_url: avatarUrl })
      .eq('id', personnelId)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      return { success: false, error: 'Failed to update profile' }
    }

    return { success: true, url: avatarUrl || undefined }
  } catch (error) {
    console.error('Error updating avatar URL:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

/**
 * Complete profile picture upload process
 */
export async function updateProfilePicture(
  file: File,
  personnelId: string,
  currentAvatarUrl?: string | null
): Promise<UploadResult> {
  try {
    // Upload new picture
    const uploadResult = await uploadProfilePicture(file)
    
    if (!uploadResult.success || !uploadResult.url || !uploadResult.path) {
      return uploadResult
    }

    // Persist only the private object path. Components resolve short-lived
    // signed URLs at display time, so no permanent public media URL is stored.
    const updateResult = await updatePersonnelAvatar(personnelId, uploadResult.path)
    
    if (!updateResult.success) {
      // If database update fails, clean up uploaded file
      try {
        await deleteProfilePicture(uploadResult.path)
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }
      return updateResult
    }

    // Dispatch a custom event to notify all components about the avatar update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', { 
        detail: { personnelId, avatarUrl: uploadResult.path }
      }))
    }

    // Delete old picture if it exists
    if (currentAvatarUrl) {
      try {
        await deleteProfilePicture(currentAvatarUrl)
      } catch (deleteError) {
        console.error('Error deleting old profile picture:', deleteError)
        // Don't fail the whole operation if old picture deletion fails
      }
    }

    return { success: true, url: uploadResult.url, path: uploadResult.path }
  } catch (error) {
    console.error('Complete profile picture update error:', error)
    return { success: false, error: 'Failed to update profile picture' }
  }
}

/**
 * Remove profile picture
 */
export async function removeProfilePicture(
  personnelId: string,
  currentAvatarUrl?: string | null
): Promise<UploadResult> {
  try {
    // Update database to remove avatar URL
    const updateResult = await updatePersonnelAvatar(personnelId, null)
    
    if (!updateResult.success) {
      return updateResult
    }

    // Dispatch a custom event to notify all components about the avatar removal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', { 
        detail: { personnelId, avatarUrl: null } 
      }))
    }

    // Delete file from storage
    if (currentAvatarUrl) {
      try {
        await deleteProfilePicture(currentAvatarUrl)
      } catch (deleteError) {
        console.error('Error deleting profile picture file:', deleteError)
        // Don't fail the operation if file deletion fails
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Remove profile picture error:', error)
    return { success: false, error: 'Failed to remove profile picture' }
  }
}
