/**
 * Profile / Settings - company profile, app settings
 */

import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMockStore } from '@/store/mock';
import { AppHeader } from '@/components/AppHeader';
import { TabFABs } from '@/components/TabFABs';
import { colors, typography } from '@/lib/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const available = useMockStore((s) => s.available);
  const toggles = useMockStore((s) => s.toggles);
  const setEnabled = useMockStore((s) => s.setEnabled);
  const load = useMockStore((s) => s.load);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppHeader title="Profile" />
        <Text style={styles.subtitle}>Company & app settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Company profile</Text>
        <Text style={styles.sectionDesc}>
          Logo, billing, certifications — manage in web app Settings
        </Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {}}
        >
          <Text style={styles.linkButtonText}>Open web app →</Text>
        </TouchableOpacity>
      </View>

      {available && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demo data</Text>
          <Text style={styles.sectionDesc}>Turn off for production</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Mock cases</Text>
            <Switch
              value={toggles.cases}
              onValueChange={(v) => setEnabled('cases', v)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Org</Text>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/(app)/org-select')}
        >
          <Text style={styles.linkButtonText}>Switch organisation</Text>
        </TouchableOpacity>
      </View>

      <TabFABs
        onCreateCase={() => router.push('/(app)/(tabs)/cases?openCreate=1')}
        onCamera={() => router.push('/(app)/(tabs)/capture?openCapture=1')}
        onRecord={() => Alert.alert('Coming soon', 'Record meeting')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  sectionDesc: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: typography.sizes.base,
    color: colors.slate,
  },
  linkButton: {
    paddingVertical: 8,
  },
  linkButtonText: {
    fontSize: typography.sizes.base,
    color: colors.accent,
  },
});
