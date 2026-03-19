/**
 * Upload queue status panel — shows pending / uploading / failed / completed items
 * with per-item retry, retry-all, and clear-completed actions.
 */

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme/colors';
import { useUploadQueue } from '@/lib/upload/queue-hooks';
import type { QueueItem, QueueItemStatus } from '@/lib/types/evidence';

const STATUS_META: Record<QueueItemStatus, { label: string; color: string; icon: string }> = {
  pending:   { label: 'Pending',   color: colors.muted,   icon: 'time-outline' },
  uploading: { label: 'Uploading', color: colors.accent,  icon: 'cloud-upload-outline' },
  failed:    { label: 'Failed',    color: colors.error,   icon: 'alert-circle-outline' },
  complete:  { label: 'Done',      color: colors.success, icon: 'checkmark-circle-outline' },
};

export function UploadQueueBadge() {
  const { stats } = useUploadQueue();
  const count = stats.pending + stats.uploading + stats.failed;

  if (count === 0) return null;

  return (
    <View style={badgeStyles.container}>
      {stats.uploading > 0 && (
        <ActivityIndicator size={12} color={colors.white} style={{ marginRight: 4 }} />
      )}
      <Text style={badgeStyles.text}>{count}</Text>
    </View>
  );
}

export function UploadQueueStatus() {
  const {
    stats,
    items,
    isProcessing,
    retryItem,
    retryAll,
    removeItem,
    clearCompleted,
  } = useUploadQueue();
  const [expanded, setExpanded] = useState(false);

  const activeCount = stats.pending + stats.uploading + stats.failed;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {isProcessing ? (
            <ActivityIndicator size={16} color={colors.accent} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={16} color={colors.charcoal} />
          )}
          <Text style={styles.headerTitle}>Upload Queue</Text>
          {activeCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activeCount}</Text>
            </View>
          )}
        </View>

        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.statsRow}>
            <StatChip label="Pending" value={stats.pending} color={colors.muted} />
            <StatChip label="Uploading" value={stats.uploading} color={colors.accent} />
            <StatChip label="Failed" value={stats.failed} color={colors.error} />
            <StatChip label="Done" value={stats.complete} color={colors.success} />
          </View>

          {(stats.failed > 0 || stats.complete > 0) && (
            <View style={styles.actionRow}>
              {stats.failed > 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={retryAll}>
                  <Ionicons name="refresh" size={14} color={colors.accent} />
                  <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                    Retry All Failed
                  </Text>
                </TouchableOpacity>
              )}
              {stats.complete > 0 && (
                <TouchableOpacity style={styles.actionBtn} onPress={clearCompleted}>
                  <Ionicons name="trash-outline" size={14} color={colors.muted} />
                  <Text style={[styles.actionBtnText, { color: colors.muted }]}>
                    Clear Completed
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <QueueRow
                item={item}
                onRetry={() => retryItem(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            )}
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Queue is empty</Text>
            }
          />
        </View>
      )}
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[chipStyles.chip, { borderColor: color + '30' }]}>
      <Text style={[chipStyles.value, { color }]}>{value}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

function QueueRow({
  item,
  onRetry,
  onRemove,
}: {
  item: QueueItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const meta = STATUS_META[item.status];

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconCol}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
      </View>

      <View style={rowStyles.infoCol}>
        <Text style={rowStyles.fileName} numberOfLines={1}>
          {item.file_name}
        </Text>
        <Text style={rowStyles.meta}>
          {item.media_type} · {formatBytes(item.file_size)}
        </Text>
        {item.status === 'uploading' && (
          <ActivityIndicator
            size={12}
            color={colors.accent}
            style={{ alignSelf: 'flex-start', marginTop: 4 }}
          />
        )}
        {item.last_error && (
          <Text style={rowStyles.errorText} numberOfLines={2}>
            {item.last_error}
          </Text>
        )}
      </View>

      <View style={rowStyles.actionCol}>
        {item.status === 'failed' && (
          <TouchableOpacity onPress={onRetry} hitSlop={8} style={rowStyles.actionTouch}>
            <Ionicons name="refresh" size={18} color={colors.accent} />
          </TouchableOpacity>
        )}
        {(item.status === 'failed' || item.status === 'complete') && (
          <TouchableOpacity onPress={onRemove} hitSlop={8} style={rowStyles.actionTouch}>
            <Ionicons name="close-circle-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});

const chipStyles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
  },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  iconCol: {
    width: 28,
    paddingTop: 2,
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.charcoal,
  },
  meta: {
    fontSize: typography.sizes.xs,
    color: colors.muted,
    marginTop: 2,
  },
  errorText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginTop: 4,
  },
  actionCol: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionTouch: {
    padding: 4,
  },
});

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.charcoal,
  },
  countBadge: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  body: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '600',
  },
  list: {
    maxHeight: 320,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: typography.sizes.sm,
    paddingVertical: 16,
  },
});
