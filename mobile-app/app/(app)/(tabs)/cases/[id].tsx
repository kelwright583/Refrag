/**
 * Case detail screen
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCase, useUpdateCaseStatus } from '@/hooks/use-cases';
import { useCaseNotes, useCreateCaseNote, useCreateCommsLogEntry } from '@/hooks/use-notes';
import { useRiskItems } from '@/hooks/use-risk-items';
import { colors, typography } from '@/lib/theme/colors';
import { MapPreview } from '@/components/MapPreview';
import { CaseStatus } from '@/lib/types/case';
import { RiskType, RISK_TYPE_LABELS } from '@/lib/types/risk-item';
import { AppHeader } from '@/components/AppHeader';
import { CreateNoteModal } from '@/components/CreateNoteModal';

const STATUS_OPTIONS: CaseStatus[] = [
  'draft', 'assigned', 'site_visit', 'awaiting_quote', 'reporting', 'submitted', 'additional', 'closed',
];

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: caseData, isLoading, refetch: refetchCase } = useCase(id);
  const { data: notes, refetch: refetchNotes } = useCaseNotes(id);
  const { data: riskItems } = useRiskItems(id);
  const updateStatus = useUpdateCaseStatus();
  const createNote = useCreateCaseNote();
  const createCommsLogEntry = useCreateCommsLogEntry();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchCase(), refetchNotes()]);
    setRefreshing(false);
  };

  const handleStatusChange = async (newStatus: CaseStatus) => {
    try {
      await updateStatus.mutateAsync({ caseId: id, status: newStatus });
      Alert.alert('Success', 'Case status updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleCreateNote = async (bodyMd: string) => {
    try {
      await createNote.mutateAsync({ case_id: id, body_md: bodyMd });
      setShowNoteModal(false);
      Alert.alert('Success', 'Note created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create note');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  if (!caseData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Case not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
      <View style={styles.header}>
        <AppHeader />
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.caseNumber}>{caseData.case_number}</Text>
        <View style={styles.statusDropdown}>
          {STATUS_OPTIONS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusOption, caseData.status === status && styles.statusOptionActive]}
              onPress={() => handleStatusChange(status)}
            >
              <Text style={[styles.statusOptionText, caseData.status === status && styles.statusOptionTextActive]}>
                {status.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Case Details</Text>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Client Name</Text>
          <Text style={styles.fieldValue}>{caseData.client_name}</Text>
        </View>
        {caseData.insurer_name && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Insurer</Text>
            <Text style={styles.fieldValue}>{caseData.insurer_name}</Text>
          </View>
        )}
        {caseData.claim_reference && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Claim Reference</Text>
            <Text style={styles.fieldValue}>{caseData.claim_reference}</Text>
          </View>
        )}
        {caseData.location && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Location</Text>
            <Text style={styles.fieldValue}>{caseData.location}</Text>
            <View style={{ marginTop: 8 }}>
              <MapPreview address={caseData.location} height={160} />
            </View>
          </View>
        )}
      </View>

      {/* Risk Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk Items</Text>
        {riskItems && riskItems.length > 0 ? (
          riskItems.map((item) => {
            const riskLabel = RISK_TYPE_LABELS[item.risk_type as RiskType] || item.risk_type;
            return (
              <View key={item.id} style={styles.riskItemCard}>
                <View style={styles.riskItemHeader}>
                  <Text style={styles.riskItemType}>{riskLabel}</Text>
                  {item.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
                {item.description && <Text style={styles.riskItemDesc}>{item.description}</Text>}
                {item.asset_data && Object.keys(item.asset_data).length > 0 && (
                  <View style={styles.riskItemAssets}>
                    {Object.entries(item.asset_data).map(([key, value]) => (
                      <Text key={key} style={styles.riskItemAssetRow}>
                        {key.replace(/_/g, ' ')}: {String(value)}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No risk items yet.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Case Notes</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowNoteModal(true)}>
            <Text style={styles.addButtonText}>+ Add Note</Text>
          </TouchableOpacity>
        </View>
        {notes && notes.length > 0 ? (
          notes.map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <Text style={styles.noteBody}>{note.body_md}</Text>
              <Text style={styles.noteMeta}>{new Date(note.created_at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No notes yet. Add one to get started.</Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/(app)/(tabs)/cases/${id}/evidence`)}
        >
          <Text style={styles.actionButtonText}>View Evidence</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/(app)/(tabs)/cases/${id}/mandate`)}
        >
          <Text style={styles.actionButtonText}>View Mandate</Text>
        </TouchableOpacity>
      </View>

      <CreateNoteModal
        visible={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        onSubmit={handleCreateNote}
        isLoading={createNote.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { marginBottom: 8 },
  backText: { fontSize: typography.sizes.base, color: colors.accent },
  caseNumber: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 16 },
  statusDropdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  statusOptionActive: { backgroundColor: colors.copper, borderColor: colors.copper },
  statusOptionText: { fontSize: typography.sizes.sm, color: colors.charcoal, textTransform: 'capitalize' },
  statusOptionTextActive: { color: colors.white },
  section: { padding: 20 },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.slate, marginBottom: 4 },
  fieldValue: { fontSize: typography.sizes.base, color: colors.charcoal },
  actions: { padding: 20, gap: 12 },
  actionButton: { backgroundColor: colors.copper, padding: 16, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.white },
  errorText: { fontSize: typography.sizes.lg, color: colors.error, marginBottom: 20 },
  backButton: { backgroundColor: colors.copper, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.white },
  addButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: colors.copper },
  addButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.white },
  noteCard: { backgroundColor: colors.background, borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  noteBody: { fontSize: typography.sizes.base, color: colors.charcoal, marginBottom: 8 },
  noteMeta: { fontSize: typography.sizes.xs, color: colors.slate },
  emptyText: { fontSize: typography.sizes.base, color: colors.slate, fontStyle: 'italic' },
  riskItemCard: { backgroundColor: colors.background, borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  riskItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  riskItemType: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.charcoal },
  primaryBadge: { marginLeft: 8, backgroundColor: colors.copper + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  primaryBadgeText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.copper },
  riskItemDesc: { fontSize: typography.sizes.sm, color: colors.slate, marginBottom: 4 },
  riskItemAssets: { marginTop: 4 },
  riskItemAssetRow: { fontSize: typography.sizes.sm, color: colors.slate, textTransform: 'capitalize' },
});
