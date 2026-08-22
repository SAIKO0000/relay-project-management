"use client"

import React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EventFormModal } from "../event-form-modal"
import { DeleteEventDialog } from "../delete-event-dialog"
import { DeleteConfirmationDialog } from "../delete-confirmation-dialog"
import { useEvents } from "@/lib/hooks/useEvents"
import { useSupabaseQuery } from "@/lib/hooks/useSupabaseQuery"
import { usePhotosOptimized, usePhotoCountsByDate, usePhotosForDate, usePhotoOperations } from "@/lib/hooks/usePhotosOptimized"
import { toast } from "@/lib/toast-manager"
import { validateUploadFile } from "@/lib/upload-policy"

// Import calendar components
import { CalendarHeader } from "./CalendarHeader"
import { CalendarGrid } from "./CalendarGrid"
import { CalendarFilters } from "./CalendarFilters"
import { CalendarSidebar } from "./CalendarSidebar"
import { DayModal } from "./DayModal"

// Import utilities and types
import {
  formatDateToLocal,
  getEventTypeColor,
  getEventTypeDotColor,
  getDaysInMonth,
  getYearRange,
  formatTime,
  getRelativeDateDescription,
  MONTH_NAMES
} from "./calendar-utils"
import type {
  Photo,
  Event,
  SearchSuggestion,
  PhotoDeleteDialogState,
  BulkDeleteDialogState
} from "./types"

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
  const [photoDeleteDialog, setPhotoDeleteDialog] = useState<PhotoDeleteDialogState>({
    open: false,
    photo: null,
    isDeleting: false
  })

  // Bulk delete dialogs
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<BulkDeleteDialogState>({
    open: false,
    type: null,
    count: 0,
    isDeleting: false
  })
  
  // Refs for throttling
  const lastRefreshRef = useRef<number>(0)
  
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

  const handleRefresh = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefreshRef.current < 30000) {
      toast.success("Calendar is already up to date")
      return
    }

    try {
      await fetchEvents()
      lastRefreshRef.current = now
      toast.success("Calendar refreshed successfully")
    } catch (error) {
      console.error('Error refreshing calendar:', error)
      toast.error("Failed to refresh calendar")
    }
  }, [fetchEvents])

  // Handle navigation from notifications
  useEffect(() => {
    const navigateToDate = localStorage.getItem('navigateToDate')
    const navigateToType = localStorage.getItem('navigateToType')
    
    if (navigateToDate && navigateToType === 'photo') {
      const targetDate = new Date(navigateToDate)
      queueMicrotask(() => {
        setSelectedDate(targetDate)
        setSelectedDay(targetDate)
        setShowDayModal(true)

        // Clear the navigation request
        localStorage.removeItem('navigateToDate')
        localStorage.removeItem('navigateToType')
      })
    }
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
    
    const suggestions: SearchSuggestion[] = []
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

  // Navigation functions
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

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = Array.from(event.target.files)
      const validFiles = newFiles.filter(file => {
        const validationError = validateUploadFile(file, 'photo')
        if (validationError) toast.error(validationError)
        return !validationError
      })
      setUploadFiles(prev => {
        const combined = [...prev, ...validFiles]
        if (combined.length > 10) {
          toast.error('A maximum of 10 images can be uploaded at once.')
        }
        return combined.slice(0, 10)
      })
      event.target.value = ''
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

  // Photo handlers
  const handlePhotoView = (photo: Photo) => {
    setPhotoPreview(getPhotoUrl(photo.storage_path))
  }

  const handlePhotoDownload = async (photo: Photo) => {
    try {
      await downloadPhoto(photo)
      toast.success("Photo downloaded successfully")
    } catch (error) {
      console.error("Failed to download photo:", error)
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

  // Search handlers
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setShowSearchSuggestions(query.length >= 2)
  }

  const handleSearchFocus = () => {
    setShowSearchSuggestions(searchQuery.length >= 2)
  }

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchSuggestions(false), 150)
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setShowSearchSuggestions(false)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
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
  }

  // Function to navigate to a specific event's date
  const navigateToEventDate = (eventDate: string) => {
    const date = new Date(eventDate + 'T00:00:00')
    setSelectedDate(new Date(date.getFullYear(), date.getMonth(), 1)) // Set to first day of month for proper navigation
    setSelectedDay(date)
    setShowDayModal(true)
    // Photos for the selected day will be automatically loaded from cache
  }

  // Bulk delete handler
  const handleBulkDelete = (type: 'events' | 'photos', count: number) => {
    setBulkDeleteDialog({
      open: true,
      type,
      count,
      isDeleting: false
    })
  }

  // Calculate derived data
  const days = getDaysInMonth(selectedDate)
  const today = new Date()
  const todayEvents = getEventsForDate(today)
  
  const filteredEvents = events.filter((event) => {
    const matchesProject = selectedProject === "all" || event.project_id === selectedProject
    // Remove search filtering for calendar display - only show suggestions
    return matchesProject
  })

  // Function to get all upcoming events (excluding today)
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
      <CalendarHeader
        selectedDate={selectedDate}
        monthNames={MONTH_NAMES}
        onNavigateMonth={navigateMonth}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onGoToToday={goToToday}
        onRefresh={handleRefresh}
        onEventCreated={handleEventCreated}
        getYearRange={getYearRange}
      />

      <CalendarFilters
        selectedProject={selectedProject}
        searchQuery={searchQuery}
        searchSuggestions={searchSuggestions}
        showSearchSuggestions={showSearchSuggestions}
        projects={projects}
        filteredEvents={filteredEvents}
        onProjectChange={setSelectedProject}
        onSearchChange={handleSearchChange}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onClearSearch={handleClearSearch}
        onSuggestionClick={handleSuggestionClick}
        onEventCreated={handleEventCreated}
      />

      {/* Mobile-responsive calendar layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8" style={{ zIndex: 1 }}>
        <CalendarGrid
          days={days}
          selectedDate={selectedDate}
          today={today}
          monthNames={MONTH_NAMES}
          photoCounts={photoCounts}
          getEventsForDate={getEventsForDate}
          getEventTypeColor={getEventTypeColor}
          getEventTypeDotColor={getEventTypeDotColor}
          getYearRange={getYearRange}
          onDayClick={handleDayClick}
          onNavigateMonth={navigateMonth}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          onGoToToday={goToToday}
        />

        <CalendarSidebar
          today={today}
          todayEvents={todayEvents}
          upcomingEvents={upcomingEvents}
          pastEvents={pastEvents}
          projects={projects}
          formatTime={formatTime}
          getEventTypeColor={getEventTypeColor}
          getRelativeDateDescription={getRelativeDateDescription}
          onNavigateToEventDate={navigateToEventDate}
        />
      </div>

      <DayModal
        selectedDay={selectedDay}
        showDayModal={showDayModal}
        dayPhotos={dayPhotos}
        uploadFiles={uploadFiles}
        photoTitle={photoTitle}
        uploading={uploading}
        uploadProgress={uploadProgress}
        selectedPhotos={selectedPhotos}
        selectedEvents={selectedEvents}
        isEventSelectionMode={isEventSelectionMode}
        isPhotoSelectionMode={isPhotoSelectionMode}
        monthNames={MONTH_NAMES}
        onModalChange={setShowDayModal}
        onEventCreated={handleEventCreated}
        onFileUpload={handleFileUpload}
        onRemoveFile={removeFile}
        onUploadAll={handleUploadAll}
        onPhotoTitleChange={setPhotoTitle}
        onPhotoView={handlePhotoView}
        onPhotoDownload={handlePhotoDownload}
        onPhotoDelete={handlePhotoDelete}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onTogglePhotoSelection={togglePhotoSelection}
        onToggleEventSelection={toggleEventSelection}
        onSelectAllPhotos={selectAllPhotos}
        onDeselectAllPhotos={deselectAllPhotos}
        onSelectAllEvents={selectAllEvents}
        onDeselectAllEvents={deselectAllEvents}
        onClearAllSelections={clearAllSelections}
        onSetEventSelectionMode={setIsEventSelectionMode}
        onSetPhotoSelectionMode={setIsPhotoSelectionMode}
        onBulkDelete={handleBulkDelete}
        getEventsForDate={getEventsForDate}
        getPhotoUrl={getPhotoUrl}
        formatTime={formatTime}
      />

      {/* Photo Preview Modal */}
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
      </Dialog>

      {/* Edit Event Modal */}
      {editingEvent && (
        <EventFormModal
          eventToEdit={{
            ...editingEvent,
            date: new Date(editingEvent.date),
            type: editingEvent.type as "inspection" | "delivery" | "meeting" | "training" | "review" | "task",
            location: editingEvent.location || "",
            attendees: editingEvent.attendees || []
          }}
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
