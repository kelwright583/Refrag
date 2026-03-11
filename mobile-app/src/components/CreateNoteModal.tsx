/**
 * Create note modal component
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ModalHeader } from '@/components/ModalHeader';
import { colors, typography } from '@/lib/theme/colors';

interface CreateNoteModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (bodyMd: string) => void;
  isLoading?: boolean;
}

export function CreateNoteModal({
  visible,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateNoteModalProps) {
  const [noteText, setNoteText] = useState('');

  const handleSubmit = () => {
    if (noteText.trim()) {
      onSubmit(noteText.trim());
      setNoteText('');
    }
  };

  const handleClose = () => {
    setNoteText('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ModalHeader title="Add Note" onClose={handleClose} />
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>Note</Text>
            <TextInput
              style={styles.input}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Enter your note..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={isLoading || !noteText.trim()}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Add Note</Text>
              )}
            </TouchableOpacity>
          </View>
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
  content: {
    padding: 20,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    fontFamily: typography.fonts.body,
    backgroundColor: colors.white,
    minHeight: 120,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.semibold],
    color: colors.charcoal,
  },
  submitButton: {
    backgroundColor: colors.copper,
  },
  submitButtonText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.semibold],
    color: colors.white,
  },
});
