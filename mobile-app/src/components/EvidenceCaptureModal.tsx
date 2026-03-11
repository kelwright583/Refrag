/**
 * Evidence capture modal - handles camera, gallery, and document selection
 */

import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useUploadQueueStore } from '@/store/upload-queue';
import { useOrgStore } from '@/store/org';
import { ModalHeader } from '@/components/ModalHeader';
import { colors, typography } from '@/lib/theme/colors';
import { MediaType } from '@/lib/types/evidence';

const SUGGESTED_TAGS = [
  'VIN',
  'ODOMETER',
  'FRONT',
  'REAR',
  'LEFT',
  'RIGHT',
  'UNDERCARRIAGE',
  'ENGINE',
  'INTERIOR',
  'CHASSIS',
  'DAMAGE_CLOSEUP',
  'DAMAGE_WIDE',
];

interface EvidenceCaptureModalProps {
  visible: boolean;
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EvidenceCaptureModal({
  visible,
  caseId,
  onClose,
  onSuccess,
}: EvidenceCaptureModalProps) {
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const addToQueue = useUploadQueueStore((state) => state.addToQueue);
  const selectedOrgId = useOrgStore((state) => state.selectedOrgId);

  const handleCapture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: captureMode === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const mediaType = captureMode === 'video' ? 'video' : 'photo';
        const contentType = captureMode === 'video' ? 'video/mp4' : 'image/jpeg';
        await handleFileSelected(result.assets[0].uri, mediaType, contentType);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to capture ${captureMode}`);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const mediaType = asset.type === 'video' ? 'video' : 'photo';
        const contentType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        await handleFileSelected(asset.uri, mediaType, contentType);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick from gallery');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await handleFileSelected(asset.uri, 'document', asset.mimeType || 'application/pdf');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to pick document');
    }
  };

  const handleFileSelected = async (
    fileUri: string,
    mediaType: MediaType,
    contentType: string
  ) => {
    if (!selectedOrgId) {
      Alert.alert('Error', 'Organisation not selected');
      return;
    }

    setLoading(true);

    try {
      // Extract filename from URI
      const fileName = fileUri.split('/').pop() || `evidence_${Date.now()}`;
      
      // Get file size (approximate)
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const fileSize = blob.size;

      // Add to upload queue
      await addToQueue({
        local_file_uri: fileUri,
        org_id: selectedOrgId,
        case_id: caseId,
        media_type: mediaType,
        content_type: contentType,
        file_name: fileName,
        file_size: fileSize,
        tags,
        notes: notes.trim() || undefined,
        captured_at: new Date().toISOString(),
      });

      // Reset form
      setNotes('');
      setTags([]);
      setCustomTag('');

      Alert.alert('Success', 'Evidence added to upload queue');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add evidence');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <ModalHeader title="Add Evidence" onClose={onClose} />
          </View>

          <ScrollView style={styles.content}>
            {/* Capture section — Photo / Video toggle + single red CTA */}
            <View style={styles.captureSection}>
              <View style={styles.captureToggle}>
                <TouchableOpacity
                  style={[styles.toggleOption, captureMode === 'photo' && styles.toggleOptionActive]}
                  onPress={() => setCaptureMode('photo')}
                >
                  <Ionicons name="camera-outline" size={16} color={captureMode === 'photo' ? colors.white : colors.charcoal} />
                  <Text style={[styles.toggleText, captureMode === 'photo' && styles.toggleTextActive]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleOption, captureMode === 'video' && styles.toggleOptionActive]}
                  onPress={() => setCaptureMode('video')}
                >
                  <Ionicons name="videocam-outline" size={16} color={captureMode === 'video' ? colors.white : colors.charcoal} />
                  <Text style={[styles.toggleText, captureMode === 'video' && styles.toggleTextActive]}>Video</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.captureBtn, loading && { opacity: 0.5 }]}
                onPress={handleCapture}
                disabled={loading}
              >
                <Ionicons name={captureMode === 'photo' ? 'camera' : 'videocam'} size={20} color={colors.white} />
                <Text style={styles.captureBtnText}>
                  Capture {captureMode === 'photo' ? 'Photo' : 'Video'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Secondary actions — gallery & document in charcoal */}
            <View style={styles.secondaryButtons}>
              <TouchableOpacity
                style={[styles.secondaryBtn, loading && { opacity: 0.5 }]}
                onPress={handlePickFromGallery}
                disabled={loading}
              >
                <Ionicons name="images-outline" size={18} color={colors.charcoal} />
                <Text style={styles.secondaryBtnText}>From Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, loading && { opacity: 0.5 }]}
                onPress={handlePickDocument}
                disabled={loading}
              >
                <Ionicons name="document-outline" size={18} color={colors.charcoal} />
                <Text style={styles.secondaryBtnText}>Pick Document</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Tags</Text>
              <View style={styles.tagContainer}>
                {SUGGESTED_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      tags.includes(tag) && styles.tagActive,
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        tags.includes(tag) && styles.tagTextActive,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.customTagContainer}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Add custom tag"
                  placeholderTextColor={colors.muted}
                  value={customTag}
                  onChangeText={setCustomTag}
                  onSubmitEditing={addCustomTag}
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={addCustomTag}
                >
                  <Ionicons name="add" size={22} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes (optional)"
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </ScrollView>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    padding: 20,
  },

  /* Capture section */
  captureSection: {
    marginBottom: 16,
  },
  captureToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleOptionActive: {
    backgroundColor: colors.charcoal,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.charcoal,
  },
  toggleTextActive: {
    color: colors.white,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 10,
  },
  captureBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },

  /* Secondary buttons */
  secondaryButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.charcoal + '25',
    backgroundColor: colors.charcoal + '06',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
  },

  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagActive: {
    backgroundColor: colors.charcoal,
    borderColor: colors.charcoal,
  },
  tagText: {
    fontSize: typography.sizes.sm,
    color: colors.charcoal,
  },
  tagTextActive: {
    color: colors.white,
  },
  customTagContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    color: colors.charcoal,
  },
  addTagButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.charcoal,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: typography.sizes.base,
    color: colors.charcoal,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: typography.sizes.base,
    color: colors.slate,
  },
});
