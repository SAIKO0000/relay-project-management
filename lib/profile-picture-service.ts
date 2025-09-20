"use client"

import { supabase } from './supabase'

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload profile picture to Supabase storage
 */
export async function uploadProfilePicture(
  file: File, 
  userId: string
): Promise<UploadResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Please upload an image file' }
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return { success: false, error: 'File size must be less than 50MB' }
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Date.now()}.${fileExt}`
    const filePath = `${fileName}` // Store directly in the bucket root

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

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    if (!urlData.publicUrl) {
      return { success: false, error: 'Failed to get image URL' }
    }

    return { success: true, url: urlData.publicUrl }
  } catch (error) {
    console.error('Profile picture upload error:', error)
    return { success: false, error: 'Failed to upload profile picture' }
  }
}

/**
 * Delete old profile picture from storage
 */
export async function deleteProfilePicture(avatarUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const url = new URL(avatarUrl)
    const pathSegments = url.pathname.split('/')
    const bucketIndex = pathSegments.findIndex(segment => segment === 'avatars')
    
    if (bucketIndex === -1) {
      console.warn('Invalid avatar URL format:', avatarUrl)
      return
    }

    // Get the filename (should be directly in the bucket root now)
    const filePath = pathSegments[pathSegments.length - 1]
    
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
    const uploadResult = await uploadProfilePicture(file, personnelId)
    
    if (!uploadResult.success || !uploadResult.url) {
      return uploadResult
    }

    // Update database
    const updateResult = await updatePersonnelAvatar(personnelId, uploadResult.url)
    
    if (!updateResult.success) {
      // If database update fails, clean up uploaded file
      try {
        await deleteProfilePicture(uploadResult.url)
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError)
      }
      return updateResult
    }

    // Dispatch a custom event to notify all components about the avatar update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('avatarUpdated', { 
        detail: { personnelId, avatarUrl: uploadResult.url } 
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

    return { success: true, url: uploadResult.url }
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
