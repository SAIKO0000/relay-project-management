"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Briefcase,
  Phone, 
  Edit3, 
  Save, 
  Loader2,
  Upload
} from "lucide-react"
import { useCurrentUserPersonnel } from "@/lib/hooks/useCurrentUserPersonnel"
import { useAuth } from "@/lib/auth"
import { updateProfilePicture } from "@/lib/profile-picture-service"
import { toast } from "react-hot-toast"
import type { Database } from "@/lib/supabase.types"
import { useModalMobileHide } from "@/lib/modal-mobile-utils"

type Personnel = Database['public']['Tables']['personnel']['Row']

interface ProfileModalProps {
  readonly isOpen: boolean
  readonly onCloseAction: () => void
  readonly personnel?: Personnel | null
}

export function ProfileModal({ isOpen, onCloseAction, personnel: viewingPersonnel }: ProfileModalProps) {
  // Hide mobile header when modal is open
  useModalMobileHide(isOpen)
  
  const { personnel: currentUserPersonnel, loading: currentUserLoading, updating, updatePersonnel, refetch } = useCurrentUserPersonnel()
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  })

  // Determine which personnel data to show
  // If viewingPersonnel is provided, show that personnel's profile
  // Otherwise, show current user's profile (for editing)
  const displayedPersonnel = viewingPersonnel || currentUserPersonnel
  const isOwnProfile = !viewingPersonnel || (viewingPersonnel?.email === user?.email)
  const loading = viewingPersonnel ? false : currentUserLoading

  // Helper function to get initials
  const getInitials = useCallback((name: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [])

  // Initialize form data when personnel data loads
  const initializeFormData = useCallback(() => {
    if (displayedPersonnel) {
      setFormData({
        name: displayedPersonnel.name || '',
        phone: displayedPersonnel.phone || ''
      })
    }
  }, [displayedPersonnel])

  // Initialize form data when modal opens or personnel data changes
  useEffect(() => {
    if (isOpen && displayedPersonnel) {
      queueMicrotask(initializeFormData)
    }
  }, [isOpen, displayedPersonnel, initializeFormData])

  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel editing - reset form data
      initializeFormData()
    } else {
      // Start editing - ensure form data is current
      initializeFormData()
    }
    setIsEditing(!isEditing)
  }, [isEditing, initializeFormData])

  const handleInputChange = useCallback((field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!isOwnProfile) return // Can't edit other people's profiles
    
    try {
      const updates = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || null
      }

      const result = await updatePersonnel(updates)
      
      if (result.success) {
        setIsEditing(false)
        toast.success("Profile updated successfully!")
      } else {
        toast.error(result.error || "Failed to update profile")
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error("Failed to update profile")
    }
  }, [formData, updatePersonnel, isOwnProfile])

  // Handle avatar upload
  const handleAvatarUpload = useCallback(async (file: File) => {
    if (!isOwnProfile || !displayedPersonnel?.id) return
    
    setIsUploadingAvatar(true)
    try {
      const result = await updateProfilePicture(
        file, 
        displayedPersonnel.id, 
        displayedPersonnel.avatar_url
      )
      
      if (result.success) {
        toast.success("Profile picture updated successfully!")
        // Refresh personnel data to show new avatar
        await refetch()
      } else {
        toast.error(result.error || "Failed to update profile picture")
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error("Failed to upload profile picture")
    } finally {
      setIsUploadingAvatar(false)
    }
  }, [isOwnProfile, displayedPersonnel, refetch])

  const isFormValid = useMemo(() => {
    return formData.name.trim().length > 0
  }, [formData.name])

  const userName = useMemo(() => {
    return displayedPersonnel?.name || user?.user_metadata?.name || "User"
  }, [displayedPersonnel, user])

  const userPosition = useMemo(() => {
    return displayedPersonnel?.position || user?.user_metadata?.position || "Team Member"
  }, [displayedPersonnel, user])

  const userEmail = useMemo(() => {
    return displayedPersonnel?.email || user?.email || ""
  }, [displayedPersonnel, user])

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onCloseAction}>
        <DialogContent className="w-[95vw] max-w-[380px] max-h-[90vh] overflow-y-auto mx-4 rounded-2xl bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-2xl">
          <div className="flex flex-col items-center justify-center p-8 space-y-3">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur opacity-25 animate-pulse"></div>
              <div className="relative h-12 w-12 rounded-full bg-gradient-to-r from-orange-50 to-orange-100 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-semibold text-gray-900">Loading Profile</h3>
              <p className="text-xs text-gray-600">Please wait while we fetch your information...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="w-[95vw] max-w-[380px] max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-2xl rounded-2xl fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[200]">
        <DialogHeader className="pb-3 text-center pr-4">
          <DialogTitle className="text-base font-bold text-gray-900 flex items-center justify-center gap-2 w-full">
            <div className="h-5 w-5 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <span className="break-words text-center text-sm">{isOwnProfile ? "Profile Settings" : `${userName}'s Profile`}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 px-1">
          {/* Enhanced Profile Header */}
          <div className="flex flex-col items-center space-y-3 p-4 bg-gradient-to-br from-orange-50/80 via-white/50 to-orange-100/80 rounded-xl border border-orange-200/50 backdrop-blur-sm shadow-lg">
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              {isOwnProfile ? (
                <div className="flex flex-col items-center space-y-3">
                  {/* Enhanced avatar with better styling */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                    <Avatar className="relative h-14 w-14 ring-2 ring-white/80 shadow-lg rounded-full">
                      <AvatarImage 
                        src={displayedPersonnel?.avatar_url || ""} 
                        alt={userName}
                        className="object-cover rounded-full"
                      />
                      <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-full">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Enhanced action buttons */}
                  <div className="flex items-center gap-2 flex-wrap justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Create and trigger a file input
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*'
                        input.onchange = async (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0]
                          if (file) {
                            await handleAvatarUpload(file)
                          }
                        }
                        input.click()
                      }}
                      disabled={isUploadingAvatar}
                      className="text-xs px-2 py-1 h-7 rounded-lg bg-white/80 hover:bg-orange-50 hover:border-orange-300 border-orange-200/50 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      {isUploadingAvatar ? 'Uploading...' : 'Upload'}
                    </Button>
                    
                    {!isEditing ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleEditToggle}
                        className="text-xs px-2 py-1 h-7 rounded-lg bg-white/80 hover:bg-blue-50 hover:border-blue-300 border-blue-200/50 backdrop-blur-sm shadow-md transition-all duration-200 hover:shadow-lg"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleEditToggle}
                          disabled={updating}
                          className="text-xs px-2 py-1 h-7 rounded-lg bg-white/80 hover:bg-gray-50 border-gray-200/50 shadow-md transition-all duration-200"
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleSave}
                          disabled={!isFormValid || updating}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-xs px-2 py-1 h-7 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {updating ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <Avatar className="relative h-14 w-14 ring-2 ring-white/80 shadow-lg rounded-full">
                    <AvatarImage src={displayedPersonnel?.avatar_url || ""} alt={userName} className="object-cover rounded-full" />
                    <AvatarFallback className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold rounded-full">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
            
            {/* Enhanced User Information */}
            <div className="flex flex-col items-center text-center space-y-2">
              <h2 className="text-base font-bold text-gray-900 break-words">{userName}</h2>
              
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300/50 text-xs px-3 py-1 rounded-full shadow-sm">
                <Briefcase className="h-3 w-3 mr-1" />
                {userPosition}
              </Badge>
              
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/60 px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
                <Mail className="h-3 w-3 flex-shrink-0 text-orange-500" />
                <span className="break-words">{userEmail}</span>
              </div>
              
              {displayedPersonnel?.created_at && (
                <div className="text-center bg-white/40 px-3 py-2 rounded-lg backdrop-blur-sm shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">Member Since</p>
                  <p className="text-xs font-bold text-gray-700">
                    {new Date(displayedPersonnel.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Editable Fields */}
          <div className="space-y-3 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center">
                <Phone className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">Contact Information</h3>
              {isEditing && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 rounded-full">Editing</Badge>}
            </div>
            
            <div className="space-y-3">
              {/* Enhanced Name Field */}
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <User className="h-3 w-3 text-orange-500" />
                  Full Name
                </Label>
                {isEditing && isOwnProfile ? (
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus:shadow-md"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-xs font-semibold text-gray-900 border border-gray-200/50 shadow-sm">
                    {displayedPersonnel?.name || 'Not specified'}
                  </div>
                )}
              </div>

              {/* Enhanced Phone Field */}
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Phone className="h-3 w-3 text-orange-500" />
                  Phone Number
                </Label>
                {isEditing && isOwnProfile ? (
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    className="h-8 text-xs border-gray-300 focus:border-orange-500 focus:ring-orange-500 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 focus:shadow-md"
                  />
                ) : (
                  <div className="px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg text-xs font-semibold text-gray-900 border border-gray-200/50 shadow-sm">
                    {displayedPersonnel?.phone || 'Not specified'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
