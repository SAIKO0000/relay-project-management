"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar-custom"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  CalendarIcon, 
  Plus, 
  Loader2, 
  Clock,
  MapPin,
  FileText,
  Users,
  X,
  CalendarPlus,
  Briefcase
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useEvents } from "@/lib/hooks/useEvents"
import { useProjects } from "@/lib/hooks/useProjects"
import { toast } from "react-hot-toast"
import { LocationAutocomplete } from "@/components/location-autocomplete"
import { useModalMobileHide } from "@/lib/modal-mobile-utils"


const eventSchema = z.object({
  title: z.string().min(1, "Event title is required").max(255, "Title too long"),
  description: z.string().optional(),
  date: z.date(),
  time: z.string().min(1, "Time is required"),
  type: z.enum(["inspection", "delivery", "meeting", "training", "review", "task"]),
  project_id: z.string().optional(),
  location: z.string().min(1, "Location is required").max(255, "Location too long"),
  attendees: z.array(z.string()),
})

type EventFormData = z.infer<typeof eventSchema>

interface EventWithId extends EventFormData {
  id: string
}

interface EventFormModalProps {
  onEventCreated?: () => void
  selectedDate?: Date
  trigger?: React.ReactNode
  eventToEdit?: EventWithId // Event object when editing
  onEventUpdated?: () => void
}

export function EventFormModal({ onEventCreated, selectedDate, trigger, eventToEdit, onEventUpdated }: EventFormModalProps) {
  const [open, setOpen] = useState(!!eventToEdit) // Auto-open if editing
  
  // Hide mobile header when modal is open
  useModalMobileHide(open)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendeeInput, setAttendeeInput] = useState("")
  const { createEvent, updateEvent } = useEvents()
  const { projects } = useProjects()
  
  const isEditing = !!eventToEdit
  
  // Auto-open when eventToEdit is provided
  useEffect(() => {
    if (eventToEdit) {
      setOpen(true)
    }
  }, [eventToEdit])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: eventToEdit?.type || "meeting",
      date: eventToEdit ? new Date(eventToEdit.date) : (selectedDate || new Date()),
      attendees: eventToEdit?.attendees || [],
      description: eventToEdit?.description || "",
      title: eventToEdit?.title || "",
      time: eventToEdit?.time || "",
      location: eventToEdit?.location || "",
      project_id: eventToEdit?.project_id || "",
    },
  })

  const eventDate = watch("date")
  const eventType = watch("type")
  const attendees = watch("attendees")
  const onSubmit = async (data: EventFormData) => {
    try {
      setIsSubmitting(true)
      
      // Format date in local timezone to avoid timezone conversion issues
      const formatDateToLocal = (date: Date) => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }
        const eventData = {
        ...data,
        date: formatDateToLocal(data.date),
        project_id: data.project_id || null,
        description: data.description || null,
        location: data.location || null,
        attendees: data.attendees || null,
        created_by: null, // Will be set when auth is implemented
      }

      if (isEditing && eventToEdit) {
        await updateEvent(eventToEdit.id, eventData)
        toast.success("Event updated successfully!")
        onEventUpdated?.()
      } else {
        await createEvent(eventData)
        toast.success("Event created successfully!")
        onEventCreated?.()
      }
      
      setOpen(false)
      reset()
      setAttendeeInput("")
    } catch (error) {
      console.error("Error creating event:", error)
      toast.error("Failed to create event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const addAttendee = () => {
    if (attendeeInput.trim() && !attendees.includes(attendeeInput.trim())) {
      setValue("attendees", [...attendees, attendeeInput.trim()])
      setAttendeeInput("")
    }
  }

  const removeAttendee = (attendee: string) => {
    setValue("attendees", attendees.filter(a => a !== attendee))
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "inspection": return "bg-blue-500"
      case "delivery": return "bg-green-500"
      case "meeting": return "bg-orange-500"
      case "training": return "bg-purple-500"
      case "review": return "bg-yellow-500"
      case "task": return "bg-indigo-500"
      default: return "bg-gray-500"
    }
  }

  const handleClose = (open: boolean) => {
    setOpen(open)
    if (!open && isEditing) {
      // If closing edit modal, call the callback to reset state
      onEventUpdated?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger || (
            <Button className="h-9 bg-gradient-to-r from-orange-500 to-orange-600 px-3 text-xs hover:from-orange-600 hover:to-orange-700 sm:h-10 sm:px-5 sm:text-sm">
              <Plus className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">New Event</span>
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] max-w-[95vw] w-[95vw] sm:w-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-gray-200/50 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-1 sm:space-y-2 p-2 sm:p-3 border-b border-gray-100">
          <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex flex-col sm:flex-row items-center sm:items-start">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-2 sm:mb-0 sm:mr-3 shadow-lg">
              <CalendarPlus className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <span className="block">{isEditing ? 'Edit Event' : 'Create New Event'}</span>
              <span className="text-xs font-normal text-gray-600 block">
                {isEditing ? 'Update the event details below' : 'Schedule a new event for your project timeline'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 sm:space-y-3 p-2 sm:p-3">
          <div className="grid grid-cols-1 gap-2 sm:gap-3">
            {/* Event Title */}
            <div className="space-y-1 sm:space-y-2">
              <Label htmlFor="title" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                Event Title *
              </Label>
              <div className="relative">
                <CalendarIcon className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="e.g., Site Inspection - CSA Makati"
                  className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-gray-900 placeholder:text-gray-500 text-xs sm:text-sm"
                />
              </div>
              {errors.title && (
                <p className="text-xs text-red-600 flex items-center">
                  <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Event Type and Project in one row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {/* Event Type */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <div className={cn("w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-1 sm:mr-2", getEventTypeColor(eventType))}></div>
                  Event Type *
                </Label>
                <Select
                  defaultValue="meeting"
                  onValueChange={(value) => setValue("type", value as EventFormData["type"])}
                >
                  <SelectTrigger className="h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inspection">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500 mr-2"></div>
                        Inspection
                      </div>
                    </SelectItem>
                    <SelectItem value="delivery">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500 mr-2"></div>
                        Delivery
                      </div>
                    </SelectItem>
                    <SelectItem value="meeting">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-orange-500 mr-2"></div>
                        Meeting
                      </div>
                    </SelectItem>
                    <SelectItem value="training">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-500 mr-2"></div>
                        Training
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-yellow-500 mr-2"></div>
                        Review
                      </div>
                    </SelectItem>
                    <SelectItem value="task">
                      <div className="flex items-center">
                        <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-indigo-500 mr-2"></div>
                        Task
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Selection */}
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Project (Optional)
                </Label>
                <Select onValueChange={(value) => setValue("project_id", value === "none" ? undefined : value)}>
                  <SelectTrigger className="h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-orange-500 mr-2"></div>
                          {project.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date and Time in one row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Date *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-8 sm:h-10 justify-start text-left font-normal bg-white/80 border-gray-200 hover:border-orange-500 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-xs sm:text-sm",
                        !eventDate && "text-gray-500"
                      )}
                    >
                      <CalendarIcon className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                      {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={(date) => setValue("date", date!)}
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && (
                  <p className="text-xs text-red-600 flex items-center">
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.date.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="time" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Time *
                </Label>
                <div className="relative">
                  <Clock className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    {...register("time")}
                    className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-gray-900 text-xs sm:text-sm"
                  />
                </div>
                {errors.time && (
                  <p className="text-xs text-red-600 flex items-center">
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.time.message}
                  </p>
                )}
              </div>
            </div>

            {/* Location and Description in one row */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="location" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Location *
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <LocationAutocomplete
                    value={watch("location")}
                    onChangeAction={(location) => setValue("location", location)}
                    placeholder="Search for location"
                    className="w-full pl-7 sm:pl-10 h-8 sm:h-10 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-gray-900 placeholder:text-gray-500 text-xs sm:text-sm"
                  />
                </div>
                {errors.location && (
                  <p className="text-xs text-red-600 flex items-center">
                    <span className="w-1 h-1 bg-red-600 rounded-full mr-2"></span>
                    {errors.location.message}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
                  Description
                </Label>
                <div className="relative">
                  <FileText className="absolute left-2 sm:left-3 top-2 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Brief description..."
                    rows={2}
                    className="w-full pl-7 sm:pl-10 pt-2 sm:pt-3 bg-white/80 border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 rounded-lg text-gray-900 placeholder:text-gray-500 resize-none text-xs sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-1 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-orange-500" />
              Attendees
            </Label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Users className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                <Input
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  placeholder="Add attendee name"
                  className="pl-7 sm:pl-10 h-8 sm:h-10 text-xs sm:text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                />
              </div>
              <Button type="button" onClick={addAttendee} variant="outline" aria-label="Add attendee" className="h-8 sm:h-10 px-2 sm:px-3">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
                {attendees.map((attendee, index) => (
                  <div
                    key={index}
                    className="flex items-center bg-orange-50 text-orange-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm"
                  >
                    <span>{attendee}</span>
                    <button
                      type="button"
                      onClick={() => removeAttendee(attendee)}
                      className="ml-1 sm:ml-2 text-orange-500 hover:text-orange-700"
                      aria-label={`Remove ${attendee}`}
                    >
                      <X className="h-2 w-2 sm:h-3 sm:w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions - Smaller on mobile */}
          <div className="flex flex-row justify-end gap-2 pt-2 sm:pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="h-8 sm:h-10 px-3 sm:px-4 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-all duration-200 text-xs sm:text-sm"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-8 sm:h-10 px-4 sm:px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3 sm:h-4 sm:w-4" />
                  {isEditing ? 'Update Event' : 'Create Event'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
