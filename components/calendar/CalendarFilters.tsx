import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X, CalendarIcon, ImageIcon } from "lucide-react"
import { EventFormModal } from "../event-form-modal"
import type { CalendarFiltersProps } from "./types"

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedProject,
  searchQuery,
  searchSuggestions,
  showSearchSuggestions,
  projects,
  filteredEvents,
  onProjectChange,
  onSearchChange,
  onSearchFocus,
  onSearchBlur,
  onClearSearch,
  onSuggestionClick,
  onEventCreated
}) => {
  return (
    <div 
      className="relative rounded-lg border border-gray-200/50 bg-white/95 p-3 shadow-sm sm:rounded-xl sm:p-5 sm:shadow-lg"
      style={{ zIndex: 50 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Mobile: Project Filter and New Event Button in same row */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:hidden sm:gap-3">
          <div className="min-w-0">
            <Select value={selectedProject} onValueChange={onProjectChange}>
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
          <EventFormModal onEventCreated={onEventCreated} />
        </div>
        
        {/* Desktop: Project Filter */}
        <div className="hidden lg:flex items-center gap-3">
          <Select value={selectedProject} onValueChange={onProjectChange}>
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
        <div className="relative flex-1 z-10">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            className="h-9 pl-9 sm:h-10 sm:pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Search Suggestions Dropdown */}
          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div 
              className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto backdrop-blur-sm z-[1000]"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 px-3 py-2 uppercase tracking-wide">
                  Quick Results
                </div>
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onSuggestionClick(suggestion)}
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
    </div>
  )
}
