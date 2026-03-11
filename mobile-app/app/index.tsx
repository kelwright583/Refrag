/**
 * Root index - redirect to auth or app. Prevents "unmatched route" on launch.
 */

import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';

export default function Index() {
  const session = useAuthStore((state) => state.session);
  const initialized = useAuthStore((state) => state.initialized);
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  if (!initialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#C72A00" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!selectedOrgId) {
    return <Redirect href="/(app)/org-select" />;
  }

  return <Redirect href="/(app)/(tabs)/dashboard" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EAE4DC',
  },
});
