/**
 * Organisation selection screen
 */

import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useOrgStore } from '@/store/org';
import { colors, typography } from '@/lib/theme/colors';

interface Org {
  id: string;
  name: string;
  slug: string;
}

export default function OrgSelectScreen() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((state) => state.user);
  const setOrgsInStore = useOrgStore((state) => state.setOrgs);
  const setSelectedOrgId = useOrgStore((state) => state.setSelectedOrgId);

  useEffect(() => {
    loadOrgs();
  }, []);

  const loadOrgs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('org_members')
        .select(`
          org_id,
          organisations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const orgList = (data || []).map((item: any) => ({
        id: item.organisations.id,
        name: item.organisations.name,
        slug: item.organisations.slug,
      }));

      setOrgs(orgList);
      setOrgsInStore(orgList);

      // Auto-select if only one org
      if (orgList.length === 1) {
        await setSelectedOrgId(orgList[0].id);
        router.replace('/(app)/(tabs)/dashboard');
      }
    } catch (error) {
      console.error('Error loading orgs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = async (orgId: string) => {
    await setSelectedOrgId(orgId);
    router.replace('/(app)/(tabs)/dashboard');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.copper} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Organisation</Text>
      {orgs.map((org) => (
        <TouchableOpacity
          key={org.id}
          style={styles.orgButton}
          onPress={() => handleSelectOrg(org.id)}
        >
          <Text style={styles.orgName}>{org.name}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.fontFamilyForWeight[typography.weights.bold],
    color: colors.charcoal,
    marginBottom: 32,
  },
  orgButton: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 20,
    marginBottom: 12,
  },
  orgName: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilyForWeight[typography.weights.medium],
    color: colors.charcoal,
  },
});
