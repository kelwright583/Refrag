/**
 * Google Maps Provider
 * Wraps the app with the Google Maps script loader.
 * Use this at the layout level so all child components can use maps.
 */

'use client'

import { Libraries, useJsApiLoader } from '@react-google-maps/api'
import { createContext, useContext, ReactNode } from 'react'

const LIBRARIES: Libraries = ['places']

interface GoogleMapsContextType {
  isLoaded: boolean
  loadError: Error | undefined
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
})

export function useGoogleMaps() {
  return useContext(GoogleMapsContext)
}

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  })

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
