import React from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CalendarIcon,
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
  Edit,
  AlertTriangle,
  Info,
} from "lucide-react"
import { EventFormModal } from "../event-form-modal"
import type { DayModalProps } from "./types"
import { uploadAccept, uploadPolicySummary } from "@/lib/upload-policy"
import { isDemoMode } from "@/lib/demo/config"

export const DayModal: React.FC<DayModalProps> = ({
  selectedDay,
  showDayModal,
  dayPhotos,
  uploadFiles,
  uploadIssues,
  photoTitle,
  uploading,
  uploadProgress,
  selectedPhotos,
  selectedEvents,
  isEventSelectionMode,
  isPhotoSelectionMode,
  monthNames,
  onModalChange,
  onEventCreated,
  onFileUpload,
  onRemoveFile,
  onClearUploadIssues,
  onUploadAll,
  onPhotoTitleChange,
  onPhotoView,
  onPhotoDownload,
  onPhotoDelete,
  onEditEvent,
  onDeleteEvent,
  onTogglePhotoSelection,
  onToggleEventSelection,
  onSelectAllPhotos,
  onDeselectAllPhotos,
  onSelectAllEvents,
  onDeselectAllEvents,
  onClearAllSelections,
  onSetEventSelectionMode,
  onSetPhotoSelectionMode,
  onBulkDelete,
  getEventsForDate,
  getPhotoUrl,
  formatTime
}) => {
  return (
    <Dialog open={showDayModal} onOpenChange={(open) => {
      onModalChange(open)
      if (!open) {
        onClearAllSelections()
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
                        onSetEventSelectionMode(!isEventSelectionMode)
                        if (!isEventSelectionMode) {
                          onDeselectAllEvents()
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
                          onClick={onSelectAllEvents}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onDeselectAllEvents}
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
                  onEventCreated={onEventCreated}
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
                      onClick={() => onDeselectAllEvents()}
                      className="h-12 px-6"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="default"
                      variant="destructive"
                      onClick={() => onBulkDelete('events', selectedEvents.size)}
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
                            onCheckedChange={() => onToggleEventSelection(event.id)}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{event.title}</h4>
                            <Badge className="bg-blue-100 text-blue-800">
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
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => onEditEvent(event)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Event
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => onDeleteEvent(event.id, event.title)}
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
                        onSetPhotoSelectionMode(!isPhotoSelectionMode)
                        if (!isPhotoSelectionMode) {
                          onDeselectAllPhotos()
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
                          onClick={onSelectAllPhotos}
                          className="text-xs"
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={onDeselectAllPhotos}
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
                  accept={uploadAccept('photo')}
                  onChange={onFileUpload}
                  className="hidden"
                  aria-label="Select JPEG, PNG, or WebP images to upload"
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
                    onClick={onUploadAll}
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

            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-950">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium">{uploadPolicySummary('photo')} each · Up to 10 images</p>
                  {isDemoMode && (
                    <p className="text-xs leading-relaxed text-blue-800">
                      Demo Mode keeps the original image only for this browser session. Refreshing or resetting the demo removes it; nothing is uploaded to cloud storage.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {uploadIssues.length > 0 && (
              <div
                role="alert"
                aria-live="assertive"
                className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {uploadIssues.length === 1 ? 'This image could not be added' : `${uploadIssues.length} images could not be added`}
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-relaxed text-red-800">
                        {uploadIssues.map(issue => (
                          <li key={issue.id} className="break-words">{issue.message}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onClearUploadIssues}
                    className="h-8 flex-shrink-0 px-2 text-xs text-red-700 hover:bg-red-100 hover:text-red-900"
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

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
                      onClick={() => onDeselectAllPhotos()}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onBulkDelete('photos', selectedPhotos.size)}
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
                        onChange={(e) => onPhotoTitleChange(e.target.value)}
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
                  {uploadFiles.map((file, index) => {
                    const isImage = file.type.startsWith('image/')
                    const fileUrl = isImage ? URL.createObjectURL(file) : null
                    
                    return (
                      <div key={`upload-${file.name}-${file.size}`} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isImage && fileUrl ? (
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                <Image
                                  src={fileUrl}
                                  alt={file.name}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <ImageIcon className="h-5 w-5 text-blue-600" />
                              </div>
                            )}
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
                            onClick={() => onRemoveFile(index)}
                            className="ml-3 flex-shrink-0 h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
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
                    Add images to document this day&apos;s activities and progress
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
                          onCheckedChange={() => onTogglePhotoSelection(photo.id)}
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
                        onClick={() => onPhotoView(photo)}
                      />
                      {/* Remove button - top right */}
                      <button
                        className="absolute top-2 right-2 z-20 h-8 w-8 bg-white hover:bg-red-50 text-red-600 hover:text-red-700 rounded shadow-lg border border-gray-200 hover:border-red-300 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onPhotoDelete(photo)
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
                            onPhotoView(photo)
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
                            onPhotoDownload(photo)
                          }}
                        >
                          <Download className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-1.5 sm:p-2">
                      <p className="text-xs font-medium text-gray-900 break-words" title={photo.title || photo.file_name}>
                        {photo.title || photo.file_name}
                      </p>
                      <p className="text-xs text-gray-500 break-words" title={photo.file_name} style={{ fontSize: '0.625rem', fontWeight: 'normal' }}>
                        ({photo.file_name})
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {photo.created_at && new Date(photo.created_at).toLocaleTimeString('en-US', {
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
    </Dialog>
  )
}
