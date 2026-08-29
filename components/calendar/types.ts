// Simple interfaces for type safety
export interface Photo {
  id: string
  storage_path: string
  file_name: string
  title?: string
  description?: string
  project_id?: string
  uploaded_at: string
  created_at?: string
  upload_date?: string
  uploader_name?: string
}

// Project interface
export interface Project {
  id: string
  name: string
}

// Event interfaces (extending from existing Event type)
export interface Event {
  id: string
  title: string
  description?: string
  date: string
  time: string
  location?: string
  type: string
  project_id?: string
  attendees?: string[]
}

// Search suggestion interface
export interface SearchSuggestion {
  text: string
  type: 'event' | 'photo'
  id?: string
  date?: string
  projectId?: string
}

// Dialog state interfaces
export interface PhotoDeleteDialogState {
  open: boolean
  photo: Photo | null
  isDeleting: boolean
}

export interface BulkDeleteDialogState {
  open: boolean
  type: 'events' | 'photos' | null
  count: number
  isDeleting: boolean
}

export interface UploadIssue {
  id: string
  message: string
}

// Component props interfaces
export interface PhotoCountBadgeProps {
  date: Date
  photoCounts: Record<string, number>
}

export interface CalendarHeaderProps {
  selectedDate: Date
  monthNames: string[]
  onNavigateMonth: (direction: "prev" | "next") => void
  onMonthChange: (monthIndex: string) => void
  onYearChange: (year: string) => void
  onGoToToday: () => void
  onRefresh: () => void
  onEventCreated: () => void
  getYearRange: () => number[]
}

export interface CalendarFiltersProps {
  selectedProject: string
  searchQuery: string
  searchSuggestions: SearchSuggestion[]
  showSearchSuggestions: boolean
  projects: Project[]
  filteredEvents: Event[]
  onProjectChange: (project: string) => void
  onSearchChange: (query: string) => void
  onSearchFocus: () => void
  onSearchBlur: () => void
  onClearSearch: () => void
  onSuggestionClick: (suggestion: SearchSuggestion) => void
  onEventCreated: () => void
}

export interface CalendarGridProps {
  days: (Date | null)[]
  selectedDate: Date
  today: Date
  monthNames: string[]
  photoCounts: Record<string, number>
  getEventsForDate: (date: Date | null) => Event[]
  getEventTypeColor: (type: string) => string
  getEventTypeDotColor: (type: string) => string
  getYearRange: () => number[]
  onDayClick: (day: Date | null) => void
  onNavigateMonth: (direction: "prev" | "next") => void
  onMonthChange: (monthIndex: string) => void
  onYearChange: (year: string) => void
  onGoToToday: () => void
}

export interface CalendarSidebarProps {
  today: Date
  todayEvents: Event[]
  upcomingEvents: Event[]
  pastEvents: Event[]
  projects: Project[]
  formatTime: (time: string) => string
  getEventTypeColor: (type: string) => string
  getRelativeDateDescription: (date: Date) => string
  onNavigateToEventDate: (date: string) => void
}

export interface DayModalProps {
  selectedDay: Date | null
  showDayModal: boolean
  dayPhotos: Photo[]
  uploadFiles: File[]
  uploadIssues: UploadIssue[]
  photoTitle: string
  uploading: boolean
  uploadProgress: number
  selectedPhotos: Set<string>
  selectedEvents: Set<string>
  isEventSelectionMode: boolean
  isPhotoSelectionMode: boolean
  monthNames: string[]
  onModalChange: (open: boolean) => void
  onEventCreated: () => void
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  onClearUploadIssues: () => void
  onUploadAll: () => void
  onPhotoTitleChange: (title: string) => void
  onPhotoView: (photo: Photo) => void
  onPhotoDownload: (photo: Photo) => void
  onPhotoDelete: (photo: Photo) => void
  onEditEvent: (event: Event) => void
  onDeleteEvent: (eventId: string, eventTitle: string) => void
  onTogglePhotoSelection: (photoId: string) => void
  onToggleEventSelection: (eventId: string) => void
  onSelectAllPhotos: () => void
  onDeselectAllPhotos: () => void
  onSelectAllEvents: () => void
  onDeselectAllEvents: () => void
  onClearAllSelections: () => void
  onSetEventSelectionMode: (mode: boolean) => void
  onSetPhotoSelectionMode: (mode: boolean) => void
  onBulkDelete: (type: 'events' | 'photos', count: number) => void
  getEventsForDate: (date: Date | null) => Event[]
  getPhotoUrl: (path: string) => string
  formatTime: (time: string) => string
}
