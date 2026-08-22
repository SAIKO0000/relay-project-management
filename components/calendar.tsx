"use client"

import React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Users,
  Upload,
  ImageIcon,
  X,
  MoreHorizontal,
  Trash2,
  Download,
  Eye,
  ArrowRight,
  Edit,
  Search,
} from "lucide-react"
import { EventFormModal } from "./event-form-modal"
import { DeleteEventDialog } from "./delete-event-dialog"
import { DeleteConfirmationDialog } from "./delete-confirmation-dialog"
import { useEvents } from "@/lib/hooks/useEvents"
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery"
import { usePhotosOptimized, usePhotoCountsByDate, usePhotosForDate, usePhotoOperations } from "@/lib/hooks/usePhotosOptimized"
import { toast } from "@/lib/toast-manager"

// Custom hook for throttling with proper cleanup
const useThrottledFunction = <T extends unknown[]>(func: (...args: T) => void, delay: number) => {
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const lastExecTimeRef = useRef(0)
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [])
  
  return useCallback((...args: T) => {
    const currentTime = Date.now()
    
    if (currentTime - lastExecTimeRef.current > delay) {
      func(...args)
      lastExecTimeRef.current = currentTime
    } else {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = setTimeout(() => {
        func(...args)
        lastExecTimeRef.current = Date.now()
      }, delay - (currentTime - lastExecTimeRef.current))
    }
  }, [func, delay])
}

// Simple interfaces for type safety
interface Photo {
  id: string
  storage_path: string
  file_name: string
  title?: string
  description?: string
  project_id?: string
  uploaded_at: string
}

// Utility function to format dates consistently in local timezone
const formatDateToLocal = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Utility function to check if two dates are the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return formatDateToLocal(date1) === formatDateToLocal(date2)
}

// Optimized Photo count badge component - uses cached data
interface PhotoCountBadgeProps {
  date: Date
  photoCounts: Record<string, number>
}

const PhotoCountBadge: React.FC<PhotoCountBadgeProps> = ({ date, photoCounts }) => {
  const dateString = formatDateToLocal(date)
  const photoCount = photoCounts[dateString] || 0
  
  if (photoCount === 0) return null
  
  return (
    <div className="flex items-center gap-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">
      <ImageIcon size={10} />
      <span>{photoCount}</span>
    </div>
  )
}

export function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedProject, setSelectedProject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [showDayModal, setShowDayModal] = useState(false)
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null)
  const [deleteEventTitle, setDeleteEventTitle] = useState<string>("")
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [photoTitle, setPhotoTitle] = useState<string>("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  
  // Selection state for multi-select functionality
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set())
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [isEventSelectionMode, setIsEventSelectionMode] = useState(false)
  const [isPhotoSelectionMode, setIsPhotoSelectionMode] = useState(false)
  
  // Photo delete dialog state
  const [photoDeleteDialog, setPhotoDeleteDialog] = useState<{
    open: boolean
    photo: Photo | null
    isDeleting: boolean
  }>({
    open: false,
    photo: null,
    isDeleting: false
  })

  // Bulk delete dialogs
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{
    open: boolean
    type: 'events' | 'photos' | null
    count: number
    isDeleting: boolean
  }>({
    open: false,
    type: null,
    count: 0,
    isDeleting: false
  })
  
  // Use optimized hooks - single data fetch instead of hundreds of requests
  const { events, loading: eventsLoading, fetchEvents, deleteEvent } = useEvents()
  
  // Use centralized TanStack Query hooks
  const supabaseQuery = useSupabaseQuery()
  const { data: projects = [], isLoading: projectsLoading } = supabaseQuery.useProjectsQuery()
  
  const { data: photos = [] } = usePhotosOptimized(selectedProject)
  const { uploadPhotos, getPhotoUrl, downloadPhoto, deletePhoto, uploading, uploadProgress } = usePhotoOperations()
  
  // Get photo counts for all dates at once
  const photoCounts = usePhotoCountsByDate(photos, selectedProject)
  
  // Get photos for selected day - always call the hook
  const dayPhotosFromHook = usePhotosForDate(photos, selectedDay || new Date(), selectedProject)
  
  // Memoized day photos without search filtering
  const dayPhotos = useMemo(() => {
    if (!selectedDay) return []
    // Remove search filtering for calendar display - only show suggestions
    return dayPhotosFromHook
  }, [dayPhotosFromHook, selectedDay]) // Remove searchQuery dependency

  // Handle navigation from notifications
  useEffect(() => {
    const navigateToDate = localStorage.getItem('navigateToDate')
    const navigateToType = localStorage.getItem('navigateToType')
    
    if (navigateToDate && navigateToType === 'photo') {
      const targetDate = new Date(navigateToDate)
      setSelectedDate(targetDate)
      setSelectedDay(targetDate)
      setShowDayModal(true)
      
      // Clear the navigation request
      localStorage.removeItem('navigateToDate')
      localStorage.removeItem('navigateToType')
    }
  }, [])

  // Memoized calculations
  const monthNames = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ], [])

  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }, [])

  // Memoized getEventsForDate function using local timezone without search filtering
  const getEventsForDate = useMemo(() => (date: Date | null) => {
    if (!date) return []
    const dateString = formatDateToLocal(date)
    return events.filter((event) => {
      const matchesDate = event.date === dateString
      const matchesProject = selectedProject === "all" || event.project_id === selectedProject
      // Remove search filtering for calendar display - only show suggestions
      return matchesDate && matchesProject
    })
  }, [events, selectedProject]) // Remove searchQuery dependency

  // Memoized search suggestions
  const searchSuggestions = useMemo(() => {
    if (searchQuery.length < 2) return []
    
    const suggestions: Array<{
      text: string
      type: 'event' | 'photo'
      id?: string
      date?: string
      projectId?: string
    }> = []
    const query = searchQuery.toLowerCase()
    
    // Add event suggestions
    events.forEach(event => {
      if (event.title.toLowerCase().includes(query) && 
          !suggestions.some(s => s.text === event.title)) {
        suggestions.push({
          text: event.title,
          type: 'event',
          id: event.id,
          date: event.date,
          projectId: event.project_id
        })
      }
      if (event.description?.toLowerCase().includes(query) && 
          !suggestions.some(s => s.text === event.description)) {
        suggestions.push({
          text: event.description,
          type: 'event',
          id: event.id,
          date: event.date,
          projectId: event.project_id
        })
      }
      if (event.location?.toLowerCase().includes(query) && 
          !suggestions.some(s => s.text === event.location)) {
        suggestions.push({
          text: event.location,
          type: 'event',
          id: event.id,
          date: event.date,
          projectId: event.project_id
        })
      }
    })
    
    // Add photo suggestions
    photos.forEach(photo => {
      if (photo.title?.toLowerCase().includes(query) && 
          !suggestions.some(s => s.text === photo.title)) {
        suggestions.push({
          text: photo.title,
          type: 'photo',
          id: photo.id,
          date: photo.upload_date || photo.created_at?.split('T')[0] || photo.uploaded_at?.split('T')[0]
        })
      }
      if (photo.file_name.toLowerCase().includes(query) && 
          !suggestions.some(s => s.text === photo.file_name)) {
        suggestions.push({
          text: photo.file_name,
          type: 'photo',
          id: photo.id,
          date: photo.upload_date || photo.created_at?.split('T')[0] || photo.uploaded_at?.split('T')[0]
        })
      }
    })
    
    return suggestions.slice(0, 8) // Limit to 8 suggestions
  }, [searchQuery, events, photos])

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "inspection":
        return "bg-blue-100 text-blue-800"
      case "delivery":
        return "bg-green-100 text-green-800"
      case "meeting":
        return "bg-orange-100 text-orange-800"
      case "training":
        return "bg-purple-100 text-purple-800"
      case "review":
        return "bg-yellow-100 text-yellow-800"
      case "task":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getEventTypeDotColor = (type: string) => {
    switch (type) {
      case "inspection":
        return "bg-blue-500"
      case "delivery":
        return "bg-green-500"
      case "meeting":
        return "bg-orange-500"
      case "training":
        return "bg-purple-500"
      case "review":
        return "bg-yellow-500"
      case "task":
        return "bg-indigo-500"
      default:
        return "bg-gray-500"
    }
  }

  const navigateMonth = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    if (direction === "prev") {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setSelectedDate(newDate)
  }

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(parseInt(monthIndex))
    setSelectedDate(newDate)
  }

  const handleYearChange = (year: string) => {
    const newDate = new Date(selectedDate)
    newDate.setFullYear(parseInt(year))
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const getCurrentYear = () => new Date().getFullYear()
  const getYearRange = () => {
    const currentYear = getCurrentYear()
    const years = []
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push(i)
    }
    return years
  }
  const handleDayClick = (day: Date | null) => {
    if (day) {
      setSelectedDay(day)
      setShowDayModal(true)
      // Photos for the selected day will be automatically loaded from cache
    }
  }

  const handleEventCreated = () => {
    fetchEvents() // Refresh events
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      setUploadFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAll = async () => {
    if (!selectedDay || uploadFiles.length === 0) {
      toast.error("Please select files to upload")
      return
    }

    try {
      const dateString = formatDateToLocal(selectedDay)
      await uploadPhotos(uploadFiles, dateString, selectedProject !== "all" ? selectedProject : undefined, "", photoTitle)
      setUploadFiles([])
      setPhotoTitle("")
      // Photos will be automatically refreshed via React Query invalidation
      toast.success(`Successfully uploaded ${uploadFiles.length} photos`)
    } catch (error) {
      console.error("Upload error:", error)
      toast.error("Failed to upload photos")
    }
  }

  const handlePhotoView = (photo: Photo) => {
    setPhotoPreview(getPhotoUrl(photo.storage_path))
  }

  const handlePhotoDownload = async (photo: Photo) => {
    try {      await downloadPhoto(photo)
      toast.success("Photo downloaded successfully")
    } catch (error) {      console.error("Failed to download photo:", error)
      toast.error("Failed to download photo")
    }
  }

  const handlePhotoDelete = (photo: Photo) => {
    setPhotoDeleteDialog({
      open: true,
      photo,
      isDeleting: false
    })
  }

  const confirmPhotoDelete = async () => {
    if (!photoDeleteDialog.photo) return

    setPhotoDeleteDialog(prev => ({ ...prev, isDeleting: true }))
    
    try {
      await deletePhoto(photoDeleteDialog.photo.id)
      
      // Photos will be automatically refreshed via React Query invalidation
      toast.success("Photo deleted successfully")
      setPhotoDeleteDialog({ open: false, photo: null, isDeleting: false })
    } catch (error) {
      console.error("Failed to delete photo:", error)
      toast.error("Failed to delete photo")
      setPhotoDeleteDialog(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const confirmBulkDelete = async () => {
    if (!bulkDeleteDialog.type) return

    setBulkDeleteDialog(prev => ({ ...prev, isDeleting: true }))
    
    try {
      if (bulkDeleteDialog.type === 'events') {
        await Promise.all(
          Array.from(selectedEvents).map(eventId => deleteEvent(eventId))
        )
        setSelectedEvents(new Set())
        setIsEventSelectionMode(false)
        toast.success(`Deleted ${bulkDeleteDialog.count} events`)
        await fetchEvents() // Refresh events after deletion
      } else if (bulkDeleteDialog.type === 'photos') {
        await Promise.all(
          Array.from(selectedPhotos).map(async photoId => {
            const photo = dayPhotos.find(p => p.id === photoId)
            if (photo) await deletePhoto(photo.id)
          })
        )
        setSelectedPhotos(new Set())
        setIsPhotoSelectionMode(false)
        toast.success(`Deleted ${bulkDeleteDialog.count} photos`)
      }
      
      setBulkDeleteDialog({ open: false, type: null, count: 0, isDeleting: false })
    } catch (error) {
      console.error("Bulk delete error:", error)
      toast.error(`Failed to delete some ${bulkDeleteDialog.type}`)
      setBulkDeleteDialog(prev => ({ ...prev, isDeleting: false }))
    }
  }

  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    setDeleteEventId(eventId)
    setDeleteEventTitle(eventTitle)
  }

  // Selection handlers
  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  const toggleEventSelection = (eventId: string) => {
    setSelectedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
    })
  }

  const selectAllPhotos = () => {
    setSelectedPhotos(new Set(dayPhotos.map(photo => photo.id)))
  }

  const deselectAllPhotos = () => {
    setSelectedPhotos(new Set())
  }

  const selectAllEvents = () => {
    const dayEvents = selectedDay ? getEventsForDate(selectedDay) : []
    setSelectedEvents(new Set(dayEvents.map(event => event.id)))
  }

  const deselectAllEvents = () => {
    setSelectedEvents(new Set())
  }

  const clearAllSelections = () => {
    setSelectedPhotos(new Set())
    setSelectedEvents(new Set())
    setIsEventSelectionMode(false)
    setIsPhotoSelectionMode(false)
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
  }

  const handleEventUpdated = () => {
    fetchEvents() // Refresh events
    setEditingEvent(null) // Close edit modal
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const days = getDaysInMonth(selectedDate)
    // Use the updated function for today's events
  const today = new Date()
  const todayEvents = getEventsForDate(today)
  
  const filteredEvents = events.filter((event) => {
    const matchesProject = selectedProject === "all" || event.project_id === selectedProject
    // Remove search filtering for calendar display - only show suggestions
    return matchesProject
  })  // Function to get all upcoming events (excluding today)
  const getAllUpcomingEvents = () => {
    const todayString = formatDateToLocal(today)
    return events
      .filter((event) => {
        const eventDate = new Date(event.date + 'T00:00:00')
        const eventDateString = formatDateToLocal(eventDate)
        const matchesProject = selectedProject === "all" || event.project_id === selectedProject
        // Remove search filtering for calendar display - only show suggestions
        return eventDateString > todayString && matchesProject
      })
      .sort((a, b) => {
        // Sort by date first, then by time
        const dateA = new Date(a.date + 'T' + a.time)
        const dateB = new Date(b.date + 'T' + b.time)
        return dateA.getTime() - dateB.getTime()
      })
  }

  // Function to get all past events (excluding today)
  const getAllPastEvents = () => {
    const todayString = formatDateToLocal(today)
    return events
      .filter((event) => {
        const eventDate = new Date(event.date + 'T00:00:00')
        const eventDateString = formatDateToLocal(eventDate)
        const matchesProject = selectedProject === "all" || event.project_id === selectedProject
        // Remove search filtering for calendar display - only show suggestions
        return eventDateString < todayString && matchesProject
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first), then by time
        const dateA = new Date(a.date + 'T' + a.time)
        const dateB = new Date(b.date + 'T' + b.time)
        return dateB.getTime() - dateA.getTime()
      })
  }

  // Function to navigate to a specific event's date
  const navigateToEventDate = (eventDate: string) => {
    const date = new Date(eventDate + 'T00:00:00')
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), 1)) // Set to first day of month for proper navigation
    setSelectedDay(date)
    setShowDayModal(true)
    // Photos for the selected day will be automatically loaded from cache
  }
  // Helper function to get relative date description
  const getRelativeDateDescription = (eventDate: Date) => {
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // Future dates
    if (diffDays > 0) {
      if (diffDays === 1) return "Tomorrow"
      if (diffDays <= 7) return `In ${diffDays} days`
      if (diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`
      if (diffDays <= 365) return `In ${Math.ceil(diffDays / 30)} months`
      return `In ${Math.ceil(diffDays / 365)} years`
    }
    
    // Past dates
    const pastDays = Math.abs(diffDays)
    if (pastDays === 1) return "Yesterday"
    if (pastDays <= 7) return `${pastDays} days ago`
    if (pastDays <= 30) return `${Math.ceil(pastDays / 7)} weeks ago`
    if (pastDays <= 365) return `${Math.ceil(pastDays / 30)} months ago`
    return `${Math.ceil(pastDays / 365)} years ago`
  }

  const upcomingEvents = getAllUpcomingEvents()
  const pastEvents = getAllPastEvents()

  if (eventsLoading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-gray-100/50 p-2 sm:space-y-5 sm:p-5 lg:space-y-7 lg:p-9">
      {/* Modern Header with Glassmorphism */}
      <div className="rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-sm sm:rounded-xl sm:p-5 sm:shadow-lg lg:p-7">
        {/* Mobile Layout: Title and description centered */}
        <div className="lg:hidden">
          <div className="mb-1 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-sm">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
          </div>
          <p className="text-sm text-gray-600">Schedule and track project activities</p>
        </div>
        
        {/* Desktop Layout: Enhanced header */}
        <div className="hidden lg:flex items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">Calendar</h1>
                <p className="text-base lg:text-lg text-gray-600 mt-1">Schedule and track project activities</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <EventFormModal onEventCreated={handleEventCreated} />
          </div>
        </div>
      </div>

      {/* Project Filter and Search - Mobile Optimized */}
      <div 
        className="relative rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-sm sm:rounded-xl sm:p-5 sm:shadow-lg"
        style={{ zIndex: 50 }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Mobile: Project Filter and New Event Button in same row */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:hidden sm:gap-3">
            <div className="min-w-0">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="h-9 w-full min-w-0 sm:h-10">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <EventFormModal onEventCreated={handleEventCreated} />
          </div>
          
          {/* Desktop: Project Filter */}
          <div className="hidden lg:flex items-center gap-3">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-44 h-10">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Search */}
          <div className="relative flex-1" style={{ zIndex: 1 }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSearchSuggestions(e.target.value.length >= 2)
              }}
              onFocus={() => setShowSearchSuggestions(searchQuery.length >= 2)}
              onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 150)}
              className="h-9 pl-9 sm:h-10 sm:pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setShowSearchSuggestions(false)
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            
            {/* Search Suggestions Dropdown */}
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div 
                className="fixed left-0 right-0 mx-4 sm:absolute sm:left-0 sm:right-0 sm:mx-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto backdrop-blur-sm"
                style={{ 
                  zIndex: 2,
                  top: typeof window !== 'undefined' && window.innerWidth < 640 ? '260px' : 'auto'
                }}
              >
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
                    Quick Results
                  </div>
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // Keep the search query but clear suggestions
                        setShowSearchSuggestions(false)
                        
                        // Navigate to the specific item
                        if (suggestion.type === 'event' && suggestion.date) {
                          // Navigate to the specific date and highlight the event
                          const targetDate = new Date(suggestion.date)
                          setSelectedDate(targetDate)
                          setSelectedDay(targetDate)
                          setShowDayModal(true)
                          // Set search query to help highlight the specific event
                          setSearchQuery(suggestion.text)
                        } else if (suggestion.type === 'photo' && suggestion.date) {
                          // Navigate to the photo date
                          const targetDate = new Date(suggestion.date)
                          setSelectedDate(targetDate)
                          setSelectedDay(targetDate)
                          setShowDayModal(true)
                          // Set search query to help filter the specific photo
                          setSearchQuery(suggestion.text)
                        }
                      }}
                      className="w-full text-left px-3 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${suggestion.type === 'event' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'} group-hover:scale-110 transition-transform duration-200`}>
                          {suggestion.type === 'event' ? (
                            <CalendarIcon className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-gray-900 font-medium text-sm truncate group-hover:text-gray-700">
                            {suggestion.text}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              suggestion.type === 'event' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {suggestion.type === 'event' ? 'Event' : 'Photo'}
                            </span>
                            <span className="text-xs text-gray-500">{suggestion.date}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Event count */}
          <div className="flex items-center justify-center sm:justify-start">
            <span className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
              {filteredEvents.length} Events
            </span>
          </div>
        </div>
      </div>      {/* Mobile-responsive calendar layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" style={{ zIndex: 1 }}>
        {/* Calendar - Full width on mobile, 3/4 on desktop - Shows FIRST on mobile */}
        <Card className="order-1 gap-3 border border-gray-200/50 bg-white/95 py-3 shadow-sm sm:gap-6 sm:py-6 sm:shadow-lg lg:order-1 lg:col-span-3" style={{ zIndex: 1 }}>          <CardHeader className="px-2 sm:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:space-x-4">
                {/* Navigation arrows and dropdowns aligned together */}
                <div className="grid min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)_4.25rem_2rem] items-center gap-1 sm:flex sm:flex-none sm:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("prev")}
                    className="h-8 sm:h-10 w-8 sm:w-10 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select value={selectedDate.getMonth().toString()} onValueChange={handleMonthChange}>
                    <SelectTrigger className="h-8 w-full min-w-0 px-2 text-xs sm:h-10 sm:w-[130px] sm:px-3 sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={month} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedDate.getFullYear().toString()} onValueChange={handleYearChange}>
                    <SelectTrigger className="h-8 w-full px-2 text-xs sm:h-10 sm:w-[100px] sm:px-3 sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearRange().map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateMonth("next")}
                    className="h-8 sm:h-10 w-8 sm:w-10 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="default"
                  onClick={goToToday}
                  className="h-8 w-14 shrink-0 border-orange-200 px-1 text-xs text-orange-600 hover:bg-orange-50 sm:h-10 sm:w-20 sm:px-4 sm:text-sm md:h-12 md:w-auto md:px-6"
                >
                  Today
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {/* Mobile-responsive day headers */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2 sm:mb-4">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                <div key={`day-header-${index}`} className="flex min-h-7 items-center justify-center p-1 text-center text-sm font-medium text-gray-500 sm:min-h-10 sm:p-2">
                  <span className="sm:hidden text-base font-semibold">{day}</span>
                  <span className="hidden sm:inline">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Mobile-responsive calendar grid */}
            <div className="mx-0 rounded-lg bg-gray-50 p-1 sm:p-3">
              <div className="grid grid-cols-7 gap-1 sm:gap-1 md:gap-2">
                {days.map((day, index) => {
                const dayEvents = day ? getEventsForDate(day) : []
                const isToday = day ? isSameDay(day, today) : false
                const isCurrentMonth = day ? day.getMonth() === selectedDate.getMonth() : false

                return (
                  <div
                    key={day ? formatDateToLocal(day) : `empty-${index}`}
                    className={`
                      aspect-square min-h-0 min-w-0 w-full p-1 sm:aspect-auto sm:min-h-[120px] sm:p-2 border border-gray-200 rounded-md sm:rounded-lg cursor-pointer transition-all duration-200
                      hover:border-gray-300 sm:hover:-translate-y-1 sm:hover:shadow-lg touch-manipulation
                      ${isToday ? 'bg-orange-50 ring-1 sm:ring-2 ring-orange-200 shadow-md' : 'bg-white hover:bg-gray-50'}
                      ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 hover:bg-gray-100' : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                  >
                    {day && (
                      <>
                        <div className="flex justify-between items-start mb-1">
                          <div className={`text-base sm:text-sm md:text-base font-semibold sm:font-medium ${isToday ? 'text-orange-600' : ''}`}>
                            {day.getDate()}
                          </div>
                          <PhotoCountBadge date={day} photoCounts={photoCounts} />
                        </div>
                        
                        {/* Mobile-optimized event display */}
                        <div className="space-y-0.5 sm:space-y-1">
                          {/* On mobile: Show dots for events, on desktop: Show event titles */}
                          <div className="sm:hidden">
                            {dayEvents.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 justify-center">
                                {dayEvents.slice(0, 4).map((event) => (
                                  <div
                                    key={`dot-${event.id}`}
                                    className={`w-1.5 h-1.5 rounded-full ${getEventTypeDotColor(event.type)}`}
                                    title={event.title}
                                  />
                                ))}
                                {dayEvents.length > 4 && (
                                  <div className="text-[10px] text-gray-500 ml-1">
                                    +{dayEvents.length - 4}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Desktop: Show event titles */}
                          <div className="hidden sm:block">
                            {dayEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className={`text-xs p-1 rounded truncate ${getEventTypeColor(event.type)}`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{dayEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile-responsive sidebar - Shows BELOW calendar on mobile, side on desktop */}
        <div className="space-y-4 order-2 lg:order-2">
          {/* Today's Events - Collapsible on mobile */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center">
                <CalendarIcon className="h-4 w-4 mr-2 text-orange-500" />
                Today&apos;s Events
                <Badge variant="secondary" className="ml-auto text-xs bg-orange-100 text-orange-700">
                  {todayEvents.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {todayEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events today</p>
              ) : (
                <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                  {todayEvents.map((event) => {
                    const eventProject = projects.find(p => p.id === event.project_id)
                    
                    return (
                      <div key={event.id} className="p-2 bg-gray-50 rounded">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs truncate">{event.title}</h4>
                            {eventProject && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {eventProject.name}
                              </p>
                            )}
                            <div className="flex items-center mt-0.5 text-xs text-gray-600">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatTime(event.time)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center mt-0.5 text-xs text-gray-600">
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className={`text-[10px] sm:text-xs ml-2 flex-shrink-0 ${getEventTypeColor(event.type)}`}>
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events - Mobile optimized */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="hidden sm:inline">Upcoming Events</span>
                  <span className="sm:hidden">Upcoming</span>
                </div>
                {upcomingEvents.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    {upcomingEvents.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming events</p>
              ) : (
                <div className="space-y-2 sm:space-y-3 max-h-40 sm:max-h-48 overflow-y-auto">
                  {upcomingEvents.slice(0, 8).map((event) => {
                    const eventDate = new Date(event.date + 'T00:00:00')
                    const isThisWeek = (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) <= 7
                    const relativeDate = getRelativeDateDescription(eventDate)
                    const eventProject = projects.find(p => p.id === event.project_id)
                    
                    return (
                      <div key={event.id} className={`p-2 rounded-lg transition-colors border-l-4 ${
                        isThisWeek 
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-blue-400' 
                          : 'bg-gray-50 hover:bg-gray-100 border-l-gray-300'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-xs sm:text-sm truncate">{event.title}</h4>
                            {eventProject && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                {eventProject.name}
                              </p>
                            )}
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <CalendarIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className={`font-medium truncate ${isThisWeek ? 'text-blue-700' : 'text-blue-600'}`}>
                                {relativeDate}
                              </span>
                              <span className="mx-1 hidden sm:inline">•</span>
                              <span className="hidden sm:inline truncate">
                                {eventDate.toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: eventDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                                })}
                              </span>
                            </div>
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatTime(event.time)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1 ml-2 flex-shrink-0">
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] sm:text-xs ${getEventTypeColor(event.type)} ${isThisWeek ? 'ring-2 ring-blue-200' : ''}`}
                            >
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigateToEventDate(event.date)}
                              className="h-5 sm:h-6 w-5 sm:w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={`Go to ${eventDate.toLocaleDateString()}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {upcomingEvents.length > 8 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        +{upcomingEvents.length - 8} more events
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Events */}
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/50">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-500" />
                  Past Events
                </div>
                {pastEvents.length > 0 && (
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
                    {pastEvents.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pastEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No past events</p>
              ) : (
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {pastEvents.slice(0, 10).map((event) => {
                    const eventDate = new Date(event.date + 'T00:00:00')
                    const relativeDate = getRelativeDateDescription(eventDate)
                    const eventProject = projects.find(p => p.id === event.project_id)
                    
                    return (
                      <div key={event.id} className="p-2 rounded-lg transition-colors border-l-4 bg-gray-50 hover:bg-gray-100 border-l-gray-300">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">{event.title}</h4>
                            {eventProject && (
                              <p className="text-xs text-gray-500 mt-1">
                                {eventProject.name}
                              </p>
                            )}
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              <span 
                                className="font-medium text-gray-600"
                                title={`Exact date: ${eventDate.toLocaleDateString()}`}
                              >
                                {relativeDate}
                              </span>
                              <span className="mx-1">•</span>
                              {eventDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: eventDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                              })}
                            </div>
                            <div className="flex items-center mt-1 text-xs text-gray-600">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(event.time)}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-1">
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getEventTypeColor(event.type)} opacity-75`}
                            >
                              {event.type}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigateToEventDate(event.date)}
                              className="h-6 px-2 text-xs text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                              title={`Go to ${eventDate.toLocaleDateString()}`}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {pastEvents.length > 10 && (
                    <div className="text-center py-2">
                      <p className="text-xs text-gray-500">
                        +{pastEvents.length - 10} more events
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Day Detail Modal */}
      <Dialog open={showDayModal} onOpenChange={(open) => {
        setShowDayModal(open)
        if (!open) {
          clearAllSelections()
        }
      }}>
        <DialogContent className="w-[90vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center text-base sm:text-lg">
                  <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">
                    {selectedDay && `${monthNames[selectedDay.getMonth()]} ${selectedDay.getDate()}, ${selectedDay.getFullYear()}`}
                  </span>
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto p-3 sm:p-4">
            <div className="space-y-4">

            {/* Events Section */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold">Events</h3>
                  {selectedDay && getEventsForDate(selectedDay).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isEventSelectionMode ? "default" : "outline"}
                        onClick={() => {
                          setIsEventSelectionMode(!isEventSelectionMode)
                          if (!isEventSelectionMode) {
                            setSelectedEvents(new Set())
                          }
                        }}
                        className="text-xs"
                      >
                        {isEventSelectionMode ? 'Exit Selection' : 'Select Events'}
                      </Button>
                      {isEventSelectionMode && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={selectAllEvents}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={deselectAllEvents}
                            className="text-xs"
                          >
                            Deselect All
                          </Button>
                          {selectedEvents.size > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedEvents.size} selected
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-start sm:justify-end">
                  <EventFormModal
                    selectedDate={selectedDay || undefined}
                    onEventCreated={handleEventCreated}
                    trigger={
                      <Button size="default" variant="outline" className="h-10 px-5 py-2">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Add Event
                      </Button>
                    }
                  />
                </div>
              </div>
              
              {/* Selection Summary for Events */}
              {isEventSelectionMode && selectedEvents.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <h4 className="font-medium text-blue-900 text-sm">Event Selection</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {selectedEvents.size} events selected
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => setSelectedEvents(new Set())}
                        className="h-12 px-6"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="default"
                        variant="destructive"
                        onClick={() => {
                          setBulkDeleteDialog({
                            open: true,
                            type: 'events',
                            count: selectedEvents.size,
                            isDeleting: false
                          })
                        }}
                        className="h-12 px-6"
                      >
                        Delete Selected Events
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {selectedDay && getEventsForDate(selectedDay).length === 0 ? (
                <p className="text-gray-500 text-center py-3">No events scheduled for this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedDay && getEventsForDate(selectedDay).map((event) => (
                    <div key={event.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {isEventSelectionMode && (
                            <Checkbox
                              checked={selectedEvents.has(event.id)}
                              onCheckedChange={() => toggleEventSelection(event.id)}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{event.title}</h4>
                              <Badge className={getEventTypeColor(event.type)}>
                                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-2" />
                                {formatTime(event.time)}
                              </div>
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                {event.location}
                              </div>
                              {event.attendees && event.attendees.length > 0 && (
                                <div className="flex items-center">
                                  <Users className="h-4 w-4 mr-2" />
                                  {event.attendees.length} attendees
                                </div>
                              )}
                            </div>
                            {event.description && (
                              <p className="mt-2 text-sm text-gray-700">{event.description}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Event
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Event
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold">Photos</h3>
                  {dayPhotos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={isPhotoSelectionMode ? "default" : "outline"}
                        onClick={() => {
                          setIsPhotoSelectionMode(!isPhotoSelectionMode)
                          if (!isPhotoSelectionMode) {
                            setSelectedPhotos(new Set())
                          }
                        }}
                        className="text-xs"
                      >
                        {isPhotoSelectionMode ? 'Exit Selection' : 'Select Photos'}
                      </Button>
                      {isPhotoSelectionMode && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={selectAllPhotos}
                            className="text-xs"
                          >
                            Select All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={deselectAllPhotos}
                            className="text-xs"
                          >
                            Deselect All
                          </Button>
                          {selectedPhotos.size > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {selectedPhotos.size} selected
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <input
                    type="file"
                    id="photo-upload"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    aria-label="Select photos and videos to upload"
                  />
                  <Button
                    size="default"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="h-10 px-5 py-2 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 hover:text-blue-800 font-medium transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    <span>Choose Files</span>
                  </Button>
                  {uploadFiles.length > 0 && (
                    <Button
                      size="default"
                      onClick={handleUploadAll}
                      disabled={uploading}
                      className="h-11 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60"
                    >
                      {uploading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2.5"></div>
                          <span>Uploading... {Math.round(uploadProgress)}%</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2.5" />
                          <span>Upload All ({uploadFiles.length})</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Selection Summary for Photos */}
              {isPhotoSelectionMode && selectedPhotos.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <h4 className="font-medium text-blue-900 text-sm">Photo Selection</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {selectedPhotos.size} photos selected
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPhotos(new Set())}
                        className="text-xs"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setBulkDeleteDialog({
                            open: true,
                            type: 'photos',
                            count: selectedPhotos.size,
                            isDeleting: false
                          })
                        }}
                        className="text-xs"
                      >
                        Delete Selected Photos
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Title Input */}
              {uploadFiles.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                    <h4 className="text-base font-semibold text-gray-800">Media Details</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Description (Optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="Enter a descriptive title for your media files..."
                          value={photoTitle}
                          onChange={(e) => setPhotoTitle(e.target.value)}
                          className="w-full h-11 bg-white border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg shadow-sm text-base"
                        />
                      </div>
                      <div className="text-sm text-gray-700 bg-white px-4 py-3 rounded-lg border border-blue-200 shadow-sm min-w-fit">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">{uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} ready</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* File Queue */}
              {uploadFiles.length > 0 && (
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-semibold text-gray-800">Upload Queue</h4>
                    <div className="text-sm text-gray-500">
                      Total: {(uploadFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                  <div className="space-y-2">
                    {uploadFiles.map((file, index) => (
                      <div key={`upload-${file.name}-${file.size}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <ImageIcon className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(index)}
                            className="ml-3 flex-shrink-0 h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {dayPhotos.length === 0 && uploadFiles.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50/50">
                  <div className="max-w-sm mx-auto">
                    <div className="mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ImageIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No media files yet</h3>
                    <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                      Upload photos and videos to document this day&apos;s activities and progress
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {dayPhotos.map((photo) => (
                    <div key={photo.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {isPhotoSelectionMode && (
                        <div className="p-1.5 border-b border-gray-200">
                          <Checkbox
                            checked={selectedPhotos.has(photo.id)}
                            onCheckedChange={() => togglePhotoSelection(photo.id)}
                          />
                        </div>
                      )}
                      <div className="relative group">
                        <Image
                          src={getPhotoUrl(photo.storage_path)}
                          alt={photo.file_name}
                          width={300}
                          height={128}
                          className="w-full h-24 sm:h-32 object-cover cursor-pointer hover:opacity-40 transition-opacity duration-300"
                          onClick={() => handlePhotoView(photo)}
                        />                        {/* Remove button - top right */}                        {/* Remove button - top right */}
                        <button
                          className="absolute top-2 right-2 z-20 h-8 w-8 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded shadow-lg border border-gray-200 hover:border-red-300 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handlePhotoDelete(photo)
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          type="button"
                          title={`Delete ${photo.file_name}`}
                          aria-label={`Delete photo ${photo.file_name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {/* View and Download buttons - center of image */}
                        <div className="absolute inset-0 flex items-center justify-center space-x-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-10 w-10 p-0 bg-white hover:bg-gray-200 text-gray-700 hover:text-gray-900 shadow-lg border border-gray-200 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePhotoView(photo)
                            }}
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="h-10 w-10 p-0 bg-white hover:bg-gray-200 text-gray-700 hover:text-gray-900 shadow-lg border border-gray-200 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePhotoDownload(photo)
                            }}
                          >
                            <Download className="h-5 w-5" />
                          </Button>
                        </div>
                      </div><div className="p-1.5 sm:p-2">
                        <p className="text-xs font-medium text-gray-900 break-words" title={photo.title || photo.file_name}>
                          {photo.title || photo.file_name}
                        </p>
                        <p className="text-xs text-gray-500 break-words" title={photo.file_name} style={{ fontSize: '0.625rem', fontWeight: 'normal' }}>
                          ({photo.file_name})
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(photo.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          by {photo.uploader_name || 'Unknown User'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>      {/* Photo Preview Modal */}
      <Dialog open={!!photoPreview} onOpenChange={() => setPhotoPreview(null)}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-base sm:text-lg">Photo Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {photoPreview && (
              <div className="flex justify-center">
                <Image
                  src={photoPreview}
                  alt="Selected photo preview"
                  width={800}
                  height={600}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>      {/* Edit Event Modal */}
      {editingEvent && (
        <EventFormModal
          eventToEdit={editingEvent}
          onEventUpdated={handleEventUpdated}
        />
      )}

      {/* Delete Event Dialog */}
      <DeleteEventDialog 
        eventId={deleteEventId || ""} 
        eventTitle={deleteEventTitle}
        open={!!deleteEventId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteEventId(null)
            setDeleteEventTitle("")
          }
        }}
        onEventDeleted={() => {
          handleEventCreated()
          setDeleteEventId(null)
          setDeleteEventTitle("")
        }}
      />

      {/* Photo Delete Dialog */}
      <DeleteConfirmationDialog
        isOpen={photoDeleteDialog.open}
        onClose={() => setPhotoDeleteDialog({ open: false, photo: null, isDeleting: false })}
        onConfirm={confirmPhotoDelete}
        title="Delete Photo"
        description="Are you sure you want to delete this photo? This action cannot be undone."
        itemName={photoDeleteDialog.photo?.file_name}
        isLoading={photoDeleteDialog.isDeleting}
      />

      {/* Bulk Delete Dialog */}
      <DeleteConfirmationDialog
        isOpen={bulkDeleteDialog.open}
        onClose={() => setBulkDeleteDialog({ open: false, type: null, count: 0, isDeleting: false })}
        onConfirm={confirmBulkDelete}
        title={`Delete ${bulkDeleteDialog.type === 'events' ? 'Events' : 'Photos'}`}
        description={`Are you sure you want to delete ${bulkDeleteDialog.count} selected ${bulkDeleteDialog.type}? This action cannot be undone.`}
        isLoading={bulkDeleteDialog.isDeleting}
      />
    </div>
  )
}
