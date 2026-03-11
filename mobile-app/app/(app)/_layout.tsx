/**
 * Protected app layout
 */

import { Stack, router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';

export default function AppLayout() {
  const session = useAuthStore((state) => state.session);
  const initialized = useAuthStore((state) => state.initialized);
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);
  const segments = useSegments();

  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(app)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAppGroup && !selectedOrgId && segments[1] !== 'org-select') {
      router.replace('/(app)/org-select');
    } else if (session && inAppGroup && selectedOrgId && segments[1] === 'org-select') {
      router.replace('/(app)/(tabs)/dashboard');
    }
  }, [session, initialized, selectedOrgId, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="org-select" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
