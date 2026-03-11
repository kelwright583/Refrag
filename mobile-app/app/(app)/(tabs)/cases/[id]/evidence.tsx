/**
 * Case evidence screen
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEvidence, useDeleteEvidence } from '@/hooks/use-evidence';
import { EvidenceCard } from '@/components/EvidenceCard';
import { EvidenceCaptureModal } from '@/components/EvidenceCaptureModal';
import { AppHeader } from '@/components/AppHeader';
import { useUploadQueueStore } from '@/store/upload-queue';
import { startUploadProcessor } from '@/lib/utils/upload-processor';
import { colors, typography } from '@/lib/theme/colors';

export default function CaseEvidenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  const { data: evidence, isLoading, refetch } = useEvidence(id);
  const deleteEvidence = useDeleteEvidence();
  const queueItems = useUploadQueueStore((state) => state.items);
  const pendingCount = queueItems.filter((item) => item.status === 'pending' || item.status === 'uploading').length;
  const failedCount = queueItems.filter((item) => item.status === 'failed').length;

  useEffect(() => {
    const cleanup = startUploadProcessor();
    return cleanup;
  }, []);

  const handleDelete = (evidenceId: string) => {
    Alert.alert('Delete Evidence', 'Are you sure you want to delete this evidence?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvidence.mutateAsync({ evidenceId, caseId: id });
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete evidence');
          }
        },
      },
    ]);
  };

  if (isLoading && !evidence) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppHeader title="Evidence" />
        {(pendingCount > 0 || failedCount > 0) && (
          <View style={styles.queueBadge}>
            {pendingCount > 0 && <Text style={styles.queueBadgeText}>{pendingCount} uploading...</Text>}
            {failedCount > 0 && <Text style={[styles.queueBadgeText, styles.queueBadgeError]}>{failedCount} failed</Text>}
          </View>
        )}
      </View>

      {evidence && evidence.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No evidence yet</Text>
          <Text style={styles.emptySubtext}>Tap the + button to capture or upload evidence</Text>
        </View>
      ) : (
        <FlatList
          data={evidence}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EvidenceCard
              evidence={item}
              onPress={() => Alert.alert('Evidence', `Viewing ${item.file_name}`)}
              onDelete={() => handleDelete(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setShowCaptureModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <EvidenceCaptureModal
        visible={showCaptureModal}
        caseId={id}
        onClose={() => setShowCaptureModal(false)}
        onSuccess={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 8 },
  queueBadge: { marginTop: 8 },
  queueBadgeText: { fontSize: typography.sizes.sm, color: colors.copper, fontWeight: typography.weights.medium },
  queueBadgeError: { color: colors.error },
  listContent: { padding: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.medium, color: colors.charcoal, marginBottom: 8 },
  emptySubtext: { fontSize: typography.sizes.base, color: colors.slate, textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.copper,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: { fontSize: 32, color: colors.white, fontWeight: typography.weights.bold },
});
