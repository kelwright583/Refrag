/**
 * Case mandate screen
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
import { useLocalSearchParams } from 'expo-router';
import { colors, typography } from '@/lib/theme/colors';
import {
  useMandates,
  useCaseMandates,
  useRequirementChecks,
  useAssignMandate,
  useUpdateRequirementCheck,
} from '@/hooks/use-mandates';
import { useEvidence } from '@/hooks/use-evidence';
import { RequirementStatus, EvidenceType } from '@/lib/types/mandate';
import { AppHeader } from '@/components/AppHeader';
import { MandateSelectionModal } from '@/components/MandateSelectionModal';
import { EvidencePickerModal } from '@/components/EvidencePickerModal';

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  photo: 'Photo', video: 'Video', document: 'Document', text_note: 'Text Note', none: 'None',
};
const STATUS_LABELS: Record<RequirementStatus, string> = {
  missing: 'Missing', provided: 'Provided', not_applicable: 'N/A',
};
const STATUS_COLORS: Record<RequirementStatus, string> = {
  missing: colors.error, provided: colors.success, not_applicable: colors.slate,
};

export default function CaseMandateScreen() {
  const { id: caseId } = useLocalSearchParams<{ id: string }>();
  const [showMandateSelection, setShowMandateSelection] = useState(false);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [selectedRequirementCheckId, setSelectedRequirementCheckId] = useState<string | null>(null);

  const { data: mandates, isLoading: mandatesLoading } = useMandates();
  const { data: caseMandates, isLoading: caseMandatesLoading, refetch: refetchCaseMandates } = useCaseMandates(caseId);
  const { data: requirementChecks, isLoading: checksLoading, refetch: refetchChecks } = useRequirementChecks(caseId);
  const { data: evidence } = useEvidence(caseId);
  const assignMandate = useAssignMandate();
  const updateRequirementCheck = useUpdateRequirementCheck();

  const isLoading = mandatesLoading || caseMandatesLoading || checksLoading;
  const assignedMandate = caseMandates && caseMandates.length > 0 ? caseMandates[0] : null;

  const handleAssignMandate = async (mandateId: string) => {
    try {
      await assignMandate.mutateAsync({ case_id: caseId, mandate_id: mandateId });
      setShowMandateSelection(false);
      refetchCaseMandates();
      refetchChecks();
      Alert.alert('Success', 'Mandate assigned successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign mandate');
    }
  };

  const handleStatusChange = async (checkId: string, status: RequirementStatus) => {
    try {
      await updateRequirementCheck.mutateAsync({ requirement_check_id: checkId, status });
      refetchChecks();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const handleAttachEvidence = (checkId: string) => {
    setSelectedRequirementCheckId(checkId);
    setShowEvidencePicker(true);
  };

  const handleEvidenceSelected = async (evidenceId: string) => {
    if (!selectedRequirementCheckId) return;
    try {
      await updateRequirementCheck.mutateAsync({
        requirement_check_id: selectedRequirementCheckId,
        evidence_id: evidenceId,
        status: 'provided',
      });
      setShowEvidencePicker(false);
      setSelectedRequirementCheckId(null);
      refetchChecks();
      Alert.alert('Success', 'Evidence attached to requirement');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to attach evidence');
    }
  };

  const groupedRequirements = requirementChecks?.reduce((acc, check) => {
    const evidenceType = check.requirement.evidence_type;
    if (!acc[evidenceType]) acc[evidenceType] = [];
    acc[evidenceType].push(check);
    return acc;
  }, {} as Record<EvidenceType, typeof requirementChecks>) || {} as Record<EvidenceType, typeof requirementChecks>;
  const missingRequirements = requirementChecks?.filter((c) => c.status === 'missing' && c.requirement.required) || [];

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetchCaseMandates(); refetchChecks(); }} />}>
        {!assignedMandate ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Mandate Assigned</Text>
            <Text style={styles.emptyText}>Assign a mandate to this case to view requirements and track completion.</Text>
            <TouchableOpacity style={styles.assignButton} onPress={() => setShowMandateSelection(true)}>
              <Text style={styles.assignButtonText}>Assign Mandate</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <AppHeader title="Mandate" />
              <Text style={styles.mandateName}>{assignedMandate.mandate.name}</Text>
              {assignedMandate.mandate.insurer_name && <Text style={styles.insurerName}>{assignedMandate.mandate.insurer_name}</Text>}
              <TouchableOpacity style={styles.changeButton} onPress={() => setShowMandateSelection(true)}>
                <Text style={styles.changeButtonText}>Change Mandate</Text>
              </TouchableOpacity>
            </View>
            {missingRequirements.length > 0 && (
              <View style={styles.missingCard}>
                <Text style={styles.missingTitle}>{missingRequirements.length} Missing Requirement{missingRequirements.length !== 1 ? 's' : ''}</Text>
                <Text style={styles.missingText}>Please provide evidence for all required items.</Text>
              </View>
            )}
            {Object.keys(groupedRequirements).length === 0 ? (
              <View style={styles.emptyState}><Text style={styles.emptyText}>No requirements found for this mandate.</Text></View>
            ) : (
              Object.entries(groupedRequirements).map(([evidenceType, checks]) => (
                <View key={evidenceType} style={styles.section}>
                  <Text style={styles.sectionTitle}>{EVIDENCE_TYPE_LABELS[evidenceType as EvidenceType]} Requirements</Text>
                  {checks.map((check) => (
                    <View key={check.id} style={styles.requirementCard}>
                      <View style={styles.requirementHeader}>
                        <View style={styles.requirementInfo}>
                          <Text style={styles.requirementLabel}>{check.requirement.label}{check.requirement.required && <Text style={styles.required}> *</Text>}</Text>
                          {check.requirement.description && <Text style={styles.requirementDescription}>{check.requirement.description}</Text>}
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[check.status] }]}>
                          <Text style={styles.statusText}>{STATUS_LABELS[check.status]}</Text>
                        </View>
                      </View>
                      {check.evidence && (
                        <View style={styles.evidenceInfo}>
                          <Text style={styles.evidenceLabel}>Attached:</Text>
                          <Text style={styles.evidenceName}>{check.evidence.file_name}</Text>
                        </View>
                      )}
                      <View style={styles.actions}>
                        <View style={styles.statusButtons}>
                          {(['missing', 'provided', 'not_applicable'] as RequirementStatus[]).map((status) => (
                            <TouchableOpacity
                              key={status}
                              style={[styles.statusButton, check.status === status && styles.statusButtonActive]}
                              onPress={() => handleStatusChange(check.id, status)}
                            >
                              <Text style={[styles.statusButtonText, check.status === status && styles.statusButtonTextActive]}>{STATUS_LABELS[status]}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        {check.requirement.evidence_type !== 'none' && check.requirement.evidence_type !== 'text_note' && (
                          <TouchableOpacity style={styles.attachButton} onPress={() => handleAttachEvidence(check.id)}>
                            <Text style={styles.attachButtonText}>{check.evidence ? 'Change Evidence' : 'Attach Evidence'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
      <MandateSelectionModal visible={showMandateSelection} mandates={mandates || []} onClose={() => setShowMandateSelection(false)} onSelect={handleAssignMandate} isLoading={assignMandate.isPending} />
      <EvidencePickerModal visible={showEvidencePicker} evidence={evidence || []} requiredMediaType={requirementChecks?.find((c) => c.id === selectedRequirementCheckId)?.requirement.evidence_type} onClose={() => { setShowEvidencePicker(false); setSelectedRequirementCheckId(null); }} onSelect={handleEvidenceSelected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  mandateName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 4 },
  insurerName: { fontSize: typography.sizes.base, color: colors.slate, marginBottom: 12 },
  changeButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  changeButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.charcoal },
  missingCard: { margin: 20, padding: 16, backgroundColor: '#FEF3C7', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: colors.error },
  missingTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 4 },
  missingText: { fontSize: typography.sizes.sm, color: colors.charcoal },
  section: { padding: 20 },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 16 },
  requirementCard: { backgroundColor: colors.white, borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  requirementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  requirementInfo: { flex: 1, marginRight: 12 },
  requirementLabel: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.charcoal, marginBottom: 4 },
  required: { color: colors.error },
  requirementDescription: { fontSize: typography.sizes.sm, color: colors.slate },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.white },
  evidenceInfo: { marginBottom: 12, padding: 12, backgroundColor: colors.background, borderRadius: 6 },
  evidenceLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, color: colors.slate, marginBottom: 4 },
  evidenceName: { fontSize: typography.sizes.sm, color: colors.charcoal },
  actions: { gap: 8 },
  statusButtons: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center' },
  statusButtonActive: { backgroundColor: colors.copper, borderColor: colors.copper },
  statusButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.charcoal },
  statusButtonTextActive: { color: colors.white },
  attachButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.copper, alignItems: 'center' },
  attachButtonText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold, color: colors.white },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, color: colors.charcoal, marginBottom: 8 },
  emptyText: { fontSize: typography.sizes.base, color: colors.slate, textAlign: 'center', marginBottom: 24 },
  assignButton: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: colors.copper },
  assignButtonText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold, color: colors.white },
});
