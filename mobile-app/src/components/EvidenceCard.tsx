/**
 * Evidence card component for list display
 */

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EvidenceWithTags } from '@/lib/types/evidence';
import { getSignedUrl } from '@/lib/api/evidence';
import { colors, typography } from '@/lib/theme/colors';

interface EvidenceCardProps {
  evidence: EvidenceWithTags;
  onPress: () => void;
  onDelete?: () => void;
}

const MEDIA_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  photo: 'camera-outline',
  video: 'videocam-outline',
  document: 'document-outline',
};

export function EvidenceCard({ evidence, onPress, onDelete }: EvidenceCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  const isPhoto = evidence.media_type === 'photo';

  useEffect(() => {
    if (!isPhoto || !evidence.storage_path) return;

    let cancelled = false;
    getSignedUrl(evidence.storage_path)
      .then((url) => {
        if (!cancelled) setThumbnailUrl(url);
      })
      .catch(() => {
        if (!cancelled) setThumbnailError(true);
      });

    return () => { cancelled = true; };
  }, [evidence.storage_path, isPhoto]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderThumbnail = () => {
    if (isPhoto && thumbnailUrl && !thumbnailError) {
      return (
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
          onError={() => setThumbnailError(true)}
        />
      );
    }

    if (isPhoto && !thumbnailUrl && !thumbnailError) {
      return (
        <View style={styles.iconContainer}>
          <ActivityIndicator size="small" color={colors.muted} />
        </View>
      );
    }

    return (
      <View style={styles.iconContainer}>
        <Ionicons
          name={MEDIA_ICONS[evidence.media_type] || 'attach-outline'}
          size={22}
          color={colors.charcoal}
        />
      </View>
    );
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {renderThumbnail()}
        <View style={styles.info}>
          <Text style={styles.fileName} numberOfLines={1}>
            {evidence.file_name}
          </Text>
          <Text style={styles.meta}>
            {formatFileSize(evidence.file_size)} • {evidence.media_type}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Ionicons name="close" size={16} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {evidence.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {evidence.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {evidence.tags.length > 3 && (
            <Text style={styles.moreTags}>+{evidence.tags.length - 3}</Text>
          )}
        </View>
      )}

      {evidence.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {evidence.notes}
        </Text>
      )}

      {evidence.captured_at && (
        <Text style={styles.capturedAt}>
          {new Date(evidence.captured_at).toLocaleString()}
        </Text>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.charcoal + '0A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: colors.charcoal + '0A',
  },
  info: {
    flex: 1,
  },
  fileName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
    marginBottom: 4,
  },
  meta: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  tagText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.charcoal,
  },
  moreTags: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.slate,
    alignSelf: 'center',
  },
  notes: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fonts.body,
    color: colors.slate,
    marginBottom: 8,
  },
  capturedAt: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fonts.body,
    color: colors.slate,
  },
});
