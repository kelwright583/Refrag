/**
 * Capture tab - quick capture without opening a case
 * Case picker when capturing
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useCases } from '@/hooks/use-cases';
import { EvidenceCaptureModal } from '@/components/EvidenceCaptureModal';
import { AppHeader } from '@/components/AppHeader';
import { ModalHeader } from '@/components/ModalHeader';
import { TabFABs } from '@/components/TabFABs';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme/colors';

const CAPTURE_ICON_SIZE = 32;

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ openCapture?: string }>();
  const [showCasePicker, setShowCasePicker] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);

  const { data: cases, isLoading } = useCases();

  useEffect(() => {
    if (params.openCapture === '1') {
      handleStartCapture();
      router.setParams({ openCapture: undefined });
    }
  }, [params.openCapture]);

  const handleStartCapture = () => {
    if (!cases || cases.length === 0) {
      Alert.alert(
        'No cases',
        'Create a case first to capture evidence.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowCasePicker(true);
  };

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowCasePicker(false);
    setShowCapture(true);
  };

  const handleCaptureSuccess = () => {
    setShowCapture(false);
    setSelectedCaseId(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppHeader title="Capture" />
        <Text style={styles.subtitle}>Quick capture — photo, video, document</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity style={styles.captureButton} onPress={handleStartCapture}>
          <View style={styles.captureButtonIconWrap}>
            <Ionicons name="camera" size={CAPTURE_ICON_SIZE} color={colors.slate} />
          </View>
          <Text style={styles.captureButtonText}>Capture evidence</Text>
          <Text style={styles.captureButtonSubtext}>
            Select a case, then capture
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureButton, styles.captureButtonSecondary]}
          disabled
        >
          <View style={styles.captureButtonIconWrap}>
            <Ionicons name="mic" size={CAPTURE_ICON_SIZE} color={colors.slate} />
          </View>
          <Text style={styles.captureButtonText}>Record meeting</Text>
          <Text style={styles.captureButtonSubtext}>Coming soon</Text>
        </TouchableOpacity>
      </View>

      <TabFABs
        onCreateCase={() => router.push('/(app)/(tabs)/cases?openCreate=1')}
        onCamera={handleStartCapture}
        onRecord={() => Alert.alert('Coming soon', 'Record meeting')}
      />

      <Modal
        visible={showCasePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCasePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCasePicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderWrap}>
              <ModalHeader title="Select case" onClose={() => setShowCasePicker(false)} />
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.copper} />
            ) : (
              <FlatList
                data={cases || []}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.caseItem}
                    onPress={() => handleSelectCase(item.id)}
                  >
                    <Text style={styles.caseNumber}>{item.case_number}</Text>
                    <Text style={styles.caseClient}>{item.client_name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowCasePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {selectedCaseId && (
        <EvidenceCaptureModal
          visible={showCapture}
          caseId={selectedCaseId}
          onClose={() => {
            setShowCapture(false);
            setSelectedCaseId(null);
          }}
          onSuccess={handleCaptureSuccess}
        />
      )}
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
  content: {
    padding: 20,
    gap: 12,
  },
  captureButton: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  captureButtonSecondary: {
    opacity: 0.7,
  },
  captureButtonIconWrap: {
    marginBottom: 8,
  },
  captureButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  captureButtonSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: 400,
  },
  modalHeaderWrap: {
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
    marginBottom: 16,
  },
  caseItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  caseNumber: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  caseClient: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  cancelButton: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    color: colors.slate,
  },
});
