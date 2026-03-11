/**
 * Root layout for Expo Router
 * Loads Inter and Anek Bangla fonts before rendering.
 * Shows custom splash (large REFRAG, actual logo, Anek Bangla subtitle) until app is ready.
 */

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import { useUploadQueueStore } from '@/store/upload-queue';
import { ReactQueryProvider } from '@/lib/react-query/provider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SplashScreen } from '@/components/brand';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  AnekBangla_400Regular,
  AnekBangla_500Medium,
  AnekBangla_600SemiBold,
  AnekBangla_700Bold,
} from '@expo-google-fonts/anek-bangla';

const SPLASH_MIN_MS = 2800;

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const loadSelectedOrg = useOrgStore((state) => state.loadSelectedOrg);
  const loadQueue = useUploadQueueStore((state) => state.loadQueue);
  const [splashDone, setSplashDone] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    AnekBangla_400Regular,
    AnekBangla_500Medium,
    AnekBangla_600SemiBold,
    AnekBangla_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      initialize();
      loadSelectedOrg();
      loadQueue();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const minTimer = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    return () => clearTimeout(minTimer);
  }, [fontsLoaded, fontError]);

  const showSplash = (fontsLoaded || fontError) && (!initialized || !splashDone);

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C72A00" />
      </View>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <ErrorBoundary>
      <ReactQueryProvider>
        <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAE4DC',
  },
});
