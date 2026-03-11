/**
 * MapPreview component
 * Shows a small interactive Google Map with a marker for a given address.
 * Geocodes the address string to coordinates automatically.
 */

'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { useGoogleMaps } from './GoogleMapsProvider'
import { MapPin } from 'lucide-react'

interface MapPreviewProps {
  address: string
  height?: string | number
  className?: string
  interactive?: boolean
  showDirectionsLink?: boolean
}

const defaultCenter = { lat: -33.9249, lng: 18.4241 } // Cape Town fallback

function MapPreviewInner({
  address,
  height = 180,
  className = '',
  interactive = false,
  showDirectionsLink = true,
}: MapPreviewProps) {
  const { isLoaded } = useGoogleMaps()
  const [center, setCenter] = useState(defaultCenter)
  const [geocoded, setGeocoded] = useState(false)

  useEffect(() => {
    if (!isLoaded || !address) return

    const geocoder = new google.maps.Geocoder()
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const loc = results[0].geometry.location
        setCenter({ lat: loc.lat(), lng: loc.lng() })
        setGeocoded(true)
      }
    })
  }, [isLoaded, address])

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

  if (!isLoaded) {
    return (
      <div
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <div className="animate-pulse flex items-center gap-2 text-slate text-sm">
          <MapPin className="w-4 h-4" />
          Loading map...
        </div>
      </div>
    )
  }

  if (!address) {
    return (
      <div
        className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}
        style={{ height }}
      >
        <p className="text-slate text-sm">No address provided</p>
      </div>
    )
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={geocoded ? 15 : 10}
        options={{
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          scrollwheel: interactive,
          draggable: interactive,
          clickableIcons: false,
          gestureHandling: interactive ? 'auto' : 'none',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        }}
      >
        {geocoded && <Marker position={center} />}
      </GoogleMap>

      {showDirectionsLink && geocoded && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 bg-white/95 hover:bg-white text-charcoal text-xs font-medium rounded-full shadow-md transition-colors"
        >
          <MapPin className="w-3 h-3" />
          Get Directions
        </a>
      )}
    </div>
  )
}

export const MapPreview = memo(MapPreviewInner)
