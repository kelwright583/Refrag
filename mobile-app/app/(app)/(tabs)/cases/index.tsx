/**
 * Cases list screen
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCases, useSearchCases } from '@/hooks/use-cases';
import { useMockStore } from '@/store/mock';
import { CaseCard } from '@/components/CaseCard';
import { CreateCaseModal } from '@/components/CreateCaseModal';
import { AppHeader } from '@/components/AppHeader';
import { TabFABs } from '@/components/TabFABs';
import { colors, typography } from '@/lib/theme/colors';

export default function CasesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams<{ openCreate?: string }>();
  const mockAvailable = useMockStore((s) => s.available);

  const { data: cases, isLoading, refetch } = useCases();
  const { data: searchResults } = useSearchCases(searchQuery);

  const displayCases = searchQuery.trim() ? searchResults : cases;

  const handleCasePress = (caseId: string) => {
    router.push(`/(app)/(tabs)/cases/${caseId}`);
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  useEffect(() => {
    if (params.openCreate === '1') {
      setShowCreateModal(true);
      router.setParams({ openCreate: undefined });
    }
  }, [params.openCreate]);

  if (isLoading && !cases) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppHeader title="Cases" />
        <Text style={styles.subtitle}>Your cases and evidence</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search cases..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {displayCases && displayCases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No cases found' : 'No cases yet'}
          </Text>
          {!searchQuery && (
            <Text style={styles.emptySubtext}>
              Tap the + button to create your first case
            </Text>
          )}
        </View>
      ) : (
        <FlatList
          data={displayCases}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CaseCard case={item} onPress={() => handleCasePress(item.id)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        />
      )}

      <TabFABs
        onCreateCase={() => setShowCreateModal(true)}
        onCamera={() => router.push('/(app)/(tabs)/capture?openCapture=1')}
        onRecord={() => Alert.alert('Coming soon', 'Record meeting')}
      />

      <CreateCaseModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsBtnText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    backgroundColor: colors.white,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
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
});
