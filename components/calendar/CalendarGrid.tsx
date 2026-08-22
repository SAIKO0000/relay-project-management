import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { PhotoCountBadge } from "./PhotoCountBadge"
import { isSameDay } from "./calendar-utils"
import type { CalendarGridProps } from "./types"

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  today,
  monthNames,
  photoCounts,
  getEventsForDate,
  getEventTypeColor,
  getEventTypeDotColor,
  getYearRange,
  onDayClick,
  onNavigateMonth,
  onMonthChange,
  onYearChange,
  onGoToToday
}) => {
  return (
    <Card className="order-1 gap-3 border border-gray-200/50 bg-white/95 py-3 shadow-sm sm:gap-6 sm:py-6 sm:shadow-lg lg:order-1 lg:col-span-3" style={{ zIndex: 1 }}>
      <CardHeader className="px-2 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:justify-start sm:space-x-4">
            {/* Navigation arrows and dropdowns aligned together */}
            <div className="grid min-w-0 flex-1 grid-cols-[2rem_minmax(0,1fr)_4.25rem_2rem] items-center gap-1 sm:flex sm:flex-none sm:space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateMonth("prev")}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-md sm:rounded-lg"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Select value={selectedDate.getMonth().toString()} onValueChange={onMonthChange}>
                <SelectTrigger className="h-8 w-full min-w-0 rounded-md px-2 text-xs sm:h-10 sm:w-[130px] sm:rounded-lg sm:px-3 sm:text-sm">
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
              <Select value={selectedDate.getFullYear().toString()} onValueChange={onYearChange}>
                <SelectTrigger className="h-8 w-full rounded-md px-2 text-xs sm:h-10 sm:w-[100px] sm:rounded-lg sm:px-3 sm:text-sm">
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
                onClick={() => onNavigateMonth("next")}
                className="h-8 w-8 sm:h-10 sm:w-10 p-0 rounded-md sm:rounded-lg"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="default"
              onClick={onGoToToday}
              className="h-8 w-14 shrink-0 rounded-md border-orange-200 px-1 text-xs text-orange-600 hover:bg-orange-50 sm:h-10 sm:w-20 sm:rounded-lg sm:px-4 sm:text-sm md:h-12 md:w-auto md:px-6"
            >
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        {/* Mobile-responsive day headers */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1 mb-2 sm:mb-4">
          {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
            <div key={`day-header-${index}`} className="p-1 sm:p-2 text-center text-sm sm:text-sm font-medium text-gray-500 min-h-[32px] sm:min-h-[40px] flex items-center justify-center">
              <span className="sm:hidden text-xs font-semibold">{day}</span>
              <span className="hidden sm:inline">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}
              </span>
            </div>
          ))}
        </div>
        
        {/* Mobile-responsive calendar grid */}
        <div className="bg-gray-50 p-1 sm:p-2 md:p-3 rounded-lg mx-0">
          <div className="grid grid-cols-7 gap-1 sm:gap-1 md:gap-2">
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDate(day) : []
              const isToday = day ? isSameDay(day, today) : false
              const isCurrentMonth = day ? day.getMonth() === selectedDate.getMonth() : false

              return (
                <div
                  key={day ? day.toISOString() : `empty-${index}`}
                  className={`
                    aspect-square min-h-0 min-w-0 h-auto w-full p-1 sm:min-h-[90px] sm:h-[90px] sm:max-h-[90px] sm:p-1.5 md:aspect-auto md:min-h-[120px] md:h-auto md:max-h-none md:p-2 border border-gray-200 rounded-md sm:rounded-lg cursor-pointer transition-all duration-200
                    hover:border-gray-300 sm:hover:-translate-y-1 sm:hover:shadow-lg touch-manipulation flex flex-col
                    ${isToday ? 'bg-orange-50 ring-1 sm:ring-2 ring-orange-200 shadow-md' : 'bg-white hover:bg-gray-50'}
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400 hover:bg-gray-100' : ''}
                  `}
                  onClick={() => onDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="flex justify-between items-start mb-0.5 sm:mb-1 flex-shrink-0">
                        <div className={`text-xs sm:text-sm md:text-base font-bold sm:font-medium ${isToday ? 'text-orange-600' : ''}`}>
                          {day.getDate()}
                        </div>
                        <PhotoCountBadge date={day} photoCounts={photoCounts} />
                      </div>
                      
                      {/* Mobile-optimized event display */}
                      <div className="space-y-0.5 sm:space-y-1 flex-1 flex flex-col justify-start overflow-hidden">
                        {/* On mobile: Show dots for events, on desktop: Show event titles */}
                        <div className="sm:hidden">
                          {dayEvents.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 justify-start">
                              {dayEvents.slice(0, 4).map((event) => (
                                <div
                                  key={`dot-${event.id}`}
                                  className={`w-1.5 h-1.5 rounded-full ${getEventTypeDotColor(event.type)}`}
                                  title={event.title}
                                />
                              ))}
                              {dayEvents.length > 4 && (
                                <div className="text-[8px] text-gray-500 ml-0.5 leading-none">
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
  )
}
