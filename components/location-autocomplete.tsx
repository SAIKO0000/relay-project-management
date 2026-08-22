"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { MapPin, Loader2 } from "lucide-react"
import { isDemoMode } from "@/lib/demo/config"

interface LocationSuggestion {
  properties: {
    formatted: string
    address_line1?: string
    address_line2?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}

interface LocationAutocompleteProps {
  value: string
  onChangeAction: (value: string) => void
  placeholder?: string
  className?: string
}

export function LocationAutocomplete({ 
  value, 
  onChangeAction, 
  placeholder = "Search for location", 
  className 
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchLocations = useCallback(async (query: string) => {
    const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
    if (isDemoMode || !geoapifyKey) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    if (query.length < 3) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${geoapifyKey}&limit=5&filter=countrycode:ph`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions')
      }

      const data = await response.json()
      // Handle both GeoJSON and JSON format responses
      const features = data.features || data.results || []
      setSuggestions(features)
      setShowDropdown(true)
      setHighlightedIndex(-1)
    } catch (error) {
      console.error('Error fetching location suggestions:', error)
      setSuggestions([])
      setShowDropdown(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleInputChange = (newValue: string) => {
    onChangeAction(newValue)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      searchLocations(newValue)
    }, 300) // Debounce for 300ms
  }

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    const formattedAddress = suggestion.properties?.formatted || 'Unknown location'
    onChangeAction(formattedAddress)
    setSuggestions([])
    setShowDropdown(false)
    setHighlightedIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setHighlightedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn("pr-10", className)}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const formatted = suggestion.properties?.formatted || 'Unknown location'
            const addressLine1 = suggestion.properties?.address_line1
            
            return (
              <div
                key={`${formatted}-${index}`}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0",
                  highlightedIndex === index
                    ? "bg-orange-50 border-orange-200"
                    : "hover:bg-gray-50"
                )}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {formatted}
                    </p>
                    {addressLine1 && addressLine1 !== formatted && (
                      <p className="text-xs text-gray-500 truncate">
                        {addressLine1}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
