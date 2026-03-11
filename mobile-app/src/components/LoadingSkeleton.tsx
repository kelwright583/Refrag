/**
 * Loading skeleton component
 */

import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors } from '@/lib/theme/colors';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: LoadingSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CaseCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <LoadingSkeleton width={120} height={16} />
        <LoadingSkeleton width={60} height={20} borderRadius={4} />
      </View>
      <LoadingSkeleton width="80%" height={16} style={styles.spacing} />
      <LoadingSkeleton width="60%" height={14} />
    </View>
  );
}

export function EvidenceCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <LoadingSkeleton width={60} height={60} borderRadius={8} />
        <View style={styles.content}>
          <LoadingSkeleton width="80%" height={16} style={styles.spacing} />
          <LoadingSkeleton width="60%" height={14} style={styles.spacing} />
          <LoadingSkeleton width="40%" height={12} />
        </View>
      </View>
    </View>
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
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
  },
  spacing: {
    marginBottom: 8,
  },
});
