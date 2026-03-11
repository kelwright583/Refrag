/**
 * Clients list - client access, mandates, rates
 */

import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useClients } from '@/hooks/use-clients';
import { AppHeader } from '@/components/AppHeader';
import { TabFABs } from '@/components/TabFABs';
import { colors, typography } from '@/lib/theme/colors';
import { Client } from '@/lib/types/client';

export default function ClientsScreen() {
  const router = useRouter();
  const { data: clients, isLoading } = useClients();

  const handleClientPress = (client: Client) => {
    router.push(`/(app)/(tabs)/clients/${client.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppHeader title="Clients" />
        <Text style={styles.subtitle}>
          Insurers, fintechs, fleet managers — anyone you do work for
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <Text style={styles.muted}>Loading...</Text>
        </View>
      ) : !clients || clients.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No clients yet</Text>
          <Text style={styles.emptySubtext}>
            Add clients in the web app under Settings
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.clientCard}
              onPress={() => handleClientPress(item)}
            >
              <Text style={styles.clientName}>{item.name}</Text>
              {item.contact_email && (
                <Text style={styles.clientEmail}>{item.contact_email}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.charcoal,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: typography.sizes.base,
    color: colors.slate,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  clientCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clientName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  clientEmail: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  muted: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
  },
});
