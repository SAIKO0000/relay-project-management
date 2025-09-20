"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { updateProfilePicture, removeProfilePicture } from '@/lib/profile-picture-service'

interface ProfilePictureUploadProps {
  currentAvatarUrl?: string | null
  personnelId: string
  userName: string
  onAvatarUpdateAction: () => void
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
}

export function ProfilePictureUpload({
  currentAvatarUrl,
  personnelId,
  userName,
  onAvatarUpdateAction,
  size = 'lg',
  editable = true
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-12 w-12'
      case 'md':
        return 'h-16 w-16'
      case 'lg':
        return 'h-24 w-24'
      default:
        return 'h-24 w-24'
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)
      
      const result = await updateProfilePicture(file, personnelId, currentAvatarUrl)
      
      if (result.success && result.url) {
        onAvatarUpdateAction()
        toast.success('Profile picture updated successfully!')
      } else {
        toast.error(result.error || 'Failed to upload profile picture')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload profile picture')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = async () => {
    try {
      setRemoving(true)
      
      const result = await removeProfilePicture(personnelId, currentAvatarUrl)
      
      if (result.success) {
        onAvatarUpdateAction()
        toast.success('Profile picture removed successfully!')
      } else {
        toast.error(result.error || 'Failed to remove profile picture')
      }
    } catch (error) {
      console.error('Remove error:', error)
      toast.error('Failed to remove profile picture')
    } finally {
      setRemoving(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative group">
        <Avatar className={`${getSizeClasses()} ring-4 ring-white shadow-lg`}>
          <AvatarImage 
            src={currentAvatarUrl || ""} 
            alt={userName}
            className="object-cover"
          />
          <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-lg font-semibold">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
        
        {editable && (
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full flex items-center justify-center transition-all duration-200">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                size="sm"
                variant="ghost"
                onClick={triggerFileInput}
                disabled={uploading || removing}
                className="text-white hover:text-white hover:bg-white hover:bg-opacity-20 h-8 w-8 p-0 rounded-full"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {editable && (
        <div className="flex flex-col items-center space-y-2">
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={triggerFileInput}
              disabled={uploading || removing}
              className="hover:bg-orange-50 hover:border-orange-200"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload
            </Button>
            
            {currentAvatarUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                disabled={uploading || removing}
                className="hover:bg-red-50 hover:border-red-200 text-red-600"
              >
                {removing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Remove
              </Button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Upload a square image (max 50MB)
            <br />
            JPG, PNG, or GIF format
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading || removing}
      />
    </div>
  )
}
