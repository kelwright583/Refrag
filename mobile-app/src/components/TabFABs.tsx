/**
 * Three FABs on every tab: Create Case (+), Camera, Record.
 * Refrag brand colours, Ionicons.
 */

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme/colors';

const FAB_SIZE = 48;
const FAB_GAP = 12;
const ICON_SIZE = 24;

interface TabFABsProps {
  onCreateCase: () => void;
  onCamera: () => void;
  onRecord: () => void;
}

export function TabFABs({ onCreateCase, onCamera, onRecord }: TabFABsProps) {
  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.fab, styles.fabRecord]}
        onPress={onRecord}
        activeOpacity={0.8}
        accessibilityLabel="Record meeting"
      >
        <Ionicons name="mic" size={ICON_SIZE} color={colors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, styles.fabCamera]}
        onPress={onCamera}
        activeOpacity={0.8}
        accessibilityLabel="Capture evidence"
      >
        <Ionicons name="camera" size={ICON_SIZE} color={colors.white} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, styles.fabCreate]}
        onPress={onCreateCase}
        activeOpacity={0.8}
        accessibilityLabel="Create case"
      >
        <Ionicons name="add" size={ICON_SIZE + 4} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    alignItems: 'center',
    gap: FAB_GAP,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabCreate: {},
  fabCamera: {},
  fabRecord: {},
});
