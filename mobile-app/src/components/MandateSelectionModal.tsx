/**
 * Mandate selection modal component
 */

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Mandate } from '@/lib/types/mandate';
import { ModalHeader } from '@/components/ModalHeader';
import { colors, typography } from '@/lib/theme/colors';

interface MandateSelectionModalProps {
  visible: boolean;
  mandates: Mandate[];
  onClose: () => void;
  onSelect: (mandateId: string) => void;
  isLoading?: boolean;
}

export function MandateSelectionModal({
  visible,
  mandates,
  onClose,
  onSelect,
  isLoading = false,
}: MandateSelectionModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ModalHeader title="Select Mandate" onClose={onClose} />
          </View>

          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.copper} />
            </View>
          ) : mandates.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>No mandates available</Text>
            </View>
          ) : (
            <FlatList
              data={mandates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.mandateItem}
                  onPress={() => onSelect(item.id)}
                >
                  <Text style={styles.mandateName}>{item.name}</Text>
                  {item.insurer_name && (
                    <Text style={styles.insurerName}>{item.insurer_name}</Text>
                  )}
                  {item.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilyForWeight[typography.weights.bold],
    color: colors.charcoal,
  },
  closeButton: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
  listContent: {
    padding: 20,
  },
  mandateItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  mandateName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.bold],
    color: colors.charcoal,
    marginBottom: 4,
  },
  insurerName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
    marginBottom: 4,
  },
  description: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
});
