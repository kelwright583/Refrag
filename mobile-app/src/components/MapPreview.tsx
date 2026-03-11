/**
 * MapPreview component for React Native
 * Shows a small map with a marker for a given address using react-native-maps.
 * Falls back to a static Google Maps image for Expo Go compatibility.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme/colors';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface MapPreviewProps {
  address: string;
  height?: number;
  showDirections?: boolean;
}

interface Coords {
  lat: number;
  lng: number;
}

export function MapPreview({
  address,
  height = 160,
  showDirections = true,
}: MapPreviewProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || !GOOGLE_MAPS_API_KEY) {
      setLoading(false);
      return;
    }

    const geocode = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            address
          )}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data = await res.json();
        if (data.results && data.results[0]) {
          const { lat, lng } = data.results[0].geometry.location;
          setCoords({ lat, lng });
        }
      } catch (err) {
        // Geocoding failed, show fallback
      } finally {
        setLoading(false);
      }
    };

    geocode();
  }, [address]);

  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps://app?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
      default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    });
    Linking.openURL(url as string);
  };

  if (!address) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noAddress}>No address provided</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { height }]}>
        <ActivityIndicator size="small" color={colors.charcoal} />
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  // Use Google Static Maps API for a reliable preview image
  const staticMapUrl = coords
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${coords.lat},${coords.lng}&zoom=15&size=600x300&scale=2&markers=color:red%7C${coords.lat},${coords.lng}&key=${GOOGLE_MAPS_API_KEY}`
    : `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=15&size=600x300&scale=2&markers=color:red%7C${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;

  return (
    <View style={[styles.wrapper, { height }]}>
      <TouchableOpacity
        style={styles.mapContainer}
        onPress={openInMaps}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: staticMapUrl }}
          style={[styles.mapImage, { height }]}
          resizeMode="cover"
        />
      </TouchableOpacity>

      {showDirections && (
        <TouchableOpacity style={styles.directionsButton} onPress={openInMaps}>
          <Ionicons name="navigate-outline" size={14} color={colors.charcoal} />
          <Text style={styles.directionsText}>Get Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  container: {
    borderRadius: 10,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  mapImage: {
    width: '100%',
  },
  noAddress: {
    fontSize: 13,
    color: colors.muted,
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 6,
  },
  directionsButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  directionsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.charcoal,
  },
});
