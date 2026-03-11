/**
 * AddressAutocomplete component
 * Google Places-powered address input with autocomplete suggestions.
 */

'use client'

import { useRef, useEffect, useState } from 'react'
import { useGoogleMaps } from './GoogleMapsProvider'
import { MapPin } from 'lucide-react'

interface AddressAutocompleteProps {
  value: string
  onChange: (address: string) => void
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** Restrict results to a specific country (ISO 3166-1 alpha-2) */
  country?: string | string[]
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Enter address...',
  className = '',
  disabled = false,
  country = 'za',
}: AddressAutocompleteProps) {
  const { isLoaded } = useGoogleMaps()
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: country as string },
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
      types: ['address'],
    })

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        onChange(place.formatted_address)
      } else if (place.name) {
        onChange(place.name)
      }
      onPlaceSelect?.(place)
    })

    autocompleteRef.current = autocomplete
  }, [isLoaded])

  if (!isLoaded) {
    return (
      <div className={`relative ${className}`}>
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
        />
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <MapPin
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
          isFocused ? 'text-accent' : 'text-slate'
        }`}
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full pl-9 pr-4 py-2 border rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-slate cursor-not-allowed'
            : 'border-gray-300 bg-white text-charcoal'
        }`}
      />
    </div>
  )
}
