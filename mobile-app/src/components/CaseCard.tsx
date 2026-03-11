/**
 * Case card component for list display
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Case } from '@/lib/types/case';
import { colors, typography } from '@/lib/theme/colors';

interface CaseCardProps {
  case: Case;
  onPress: () => void;
}

export function CaseCard({ case: caseData, onPress }: CaseCardProps) {
  const getStatusColor = (status: Case['status']) => {
    switch (status) {
      case 'draft':
        return colors.slate;
      case 'submitted':
      case 'closed':
        return colors.success;
      default:
        return colors.copper;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.caseNumber}>{caseData.case_number}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(caseData.status) }]}>
          <Text style={styles.statusText}>{caseData.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.clientName}>{caseData.client_name}</Text>
      {caseData.claim_reference && (
        <Text style={styles.claimRef}>Claim: {caseData.claim_reference}</Text>
      )}
      {caseData.loss_date && (
        <Text style={styles.lossDate}>Loss Date: {new Date(caseData.loss_date).toLocaleDateString()}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  caseNumber: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.bold],
    color: colors.charcoal,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.white,
    textTransform: 'capitalize',
  },
  clientName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
    marginBottom: 4,
  },
  claimRef: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
    marginBottom: 2,
  },
  lossDate: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
});
