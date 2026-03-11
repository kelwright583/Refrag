/**
 * Evidence picker modal component
 */

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EvidenceWithTags } from '@/lib/types/evidence';
import { EvidenceType } from '@/lib/types/mandate';
import { ModalHeader } from '@/components/ModalHeader';
import { colors, typography } from '@/lib/theme/colors';

interface EvidencePickerModalProps {
  visible: boolean;
  evidence: EvidenceWithTags[];
  requiredMediaType?: EvidenceType;
  onClose: () => void;
  onSelect: (evidenceId: string) => void;
}

const MEDIA_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  photo: 'camera-outline',
  video: 'videocam-outline',
  document: 'document-outline',
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  photo: 'Photo',
  video: 'Video',
  document: 'Document',
};

export function EvidencePickerModal({
  visible,
  evidence,
  requiredMediaType,
  onClose,
  onSelect,
}: EvidencePickerModalProps) {
  // Filter evidence by required media type if specified
  const filteredEvidence = requiredMediaType && requiredMediaType !== 'none' && requiredMediaType !== 'text_note'
    ? evidence.filter((item) => item.media_type === requiredMediaType)
    : evidence;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ModalHeader title="Select Evidence" onClose={onClose} />
          </View>

          {filteredEvidence.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {requiredMediaType && requiredMediaType !== 'none' && requiredMediaType !== 'text_note'
                  ? `No ${MEDIA_TYPE_LABELS[requiredMediaType] || requiredMediaType} evidence available`
                  : 'No evidence available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredEvidence}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.evidenceItem}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={styles.evidenceIconContainer}>
                    <Ionicons
                      name={MEDIA_TYPE_ICONS[item.media_type] || 'attach-outline'}
                      size={20}
                      color={colors.charcoal}
                    />
                  </View>
                  <View style={styles.evidenceInfo}>
                    <Text style={styles.evidenceName}>{item.file_name}</Text>
                    <Text style={styles.evidenceType}>
                      {MEDIA_TYPE_LABELS[item.media_type] || item.media_type}
                    </Text>
                    {item.tags.length > 0 && (
                      <Text style={styles.evidenceTags}>
                        Tags: {item.tags.slice(0, 3).join(', ')}
                        {item.tags.length > 3 && ` +${item.tags.length - 3} more`}
                      </Text>
                    )}
                  </View>
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
  centerContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.base,
    color: colors.slate,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  evidenceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.charcoal + '0A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  evidenceInfo: {
    flex: 1,
  },
  evidenceName: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 4,
  },
  evidenceType: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginBottom: 4,
  },
  evidenceTags: {
    fontSize: typography.sizes.xs,
    color: colors.slate,
  },
});
