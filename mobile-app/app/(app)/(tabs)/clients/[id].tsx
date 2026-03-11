/**
 * Client detail - contact, mandates, rates
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useClient } from '@/hooks/use-clients';
import { AppHeader } from '@/components/AppHeader';
import { colors, typography } from '@/lib/theme/colors';

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: client, isLoading } = useClient(id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Client not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <AppHeader />
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{client.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        {client.contact_email && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{client.contact_email}</Text>
          </View>
        )}
        {client.contact_phone && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.fieldValue}>{client.contact_phone}</Text>
          </View>
        )}
        {client.billing_email && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Billing email</Text>
            <Text style={styles.fieldValue}>{client.billing_email}</Text>
          </View>
        )}
        {!client.contact_email && !client.contact_phone && !client.billing_email && (
          <Text style={styles.muted}>No contact details</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mandates & rates</Text>
        <Text style={styles.muted}>Manage in web app Settings</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { marginBottom: 8 },
  backText: { fontSize: typography.sizes.base, color: colors.accent },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    marginBottom: 12,
  },
  field: { marginBottom: 12 },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: typography.sizes.base,
    color: colors.charcoal,
  },
  muted: { fontSize: typography.sizes.sm, color: colors.slate },
  errorText: { fontSize: typography.sizes.base, color: colors.error, marginBottom: 16 },
  backBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.copper,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});
