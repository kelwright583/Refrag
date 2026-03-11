/**
 * App header with Home (→ dashboard) and Menu icons on every screen.
 * Refrag brand colours.
 */

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography } from '@/lib/theme/colors';

const ICON_SIZE = 24;

interface AppHeaderProps {
  /** Optional title shown in the center */
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();

  const goHome = () => {
    router.replace('/(app)/(tabs)/dashboard');
  };

  const openMenu = () => {
    router.push('/(app)/(tabs)/profile');
  };

  return (
    <View style={styles.row}>
      {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : <View style={styles.spacer} />}
      <View style={styles.iconsRight}>
        <TouchableOpacity onPress={goHome} style={styles.iconButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="home" size={ICON_SIZE} color={colors.slate} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openMenu} style={styles.iconButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="menu" size={ICON_SIZE} color={colors.slate} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  title: {
    flex: 1,
    fontFamily: typography.fonts.heading,
    fontSize: typography.sizes.lg,
    color: colors.slate,
  },
  spacer: {
    flex: 1,
  },
  iconsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
