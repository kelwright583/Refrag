/**
 * Dashboard - assessor-focused overview
 * Today's appointments, case status breakdown, recent cases, quick actions
 */

import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCases } from '@/hooks/use-cases';
import { useTodayAppointments } from '@/hooks/use-appointments';
import { useClients } from '@/hooks/use-clients';
import { AppHeader } from '@/components/AppHeader';
import { TabFABs } from '@/components/TabFABs';
import { colors, typography } from '@/lib/theme/colors';

const CASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  assigned: 'Assigned',
  site_visit: 'Site visit',
  awaiting_quote: 'Awaiting quote',
  reporting: 'In reporting',
  submitted: 'Submitted',
  additional: 'Additional',
  closed: 'Closed',
};

export default function DashboardScreen() {
  const router = useRouter();
  const { data: cases, isLoading: casesLoading } = useCases();
  const { data: todayAppointments, isLoading: appointmentsLoading } = useTodayAppointments();
  const { data: clients } = useClients();

  // Derive stats from cases (schema: cases.status)
  const caseCount = cases?.length ?? 0;
  const draftCount = cases?.filter((c) => c.status === 'draft').length ?? 0;
  const reportingCount = cases?.filter((c) => c.status === 'reporting').length ?? 0;
  const siteVisitCount = cases?.filter((c) => c.status === 'site_visit').length ?? 0;
  const assignedCount = cases?.filter((c) => c.status === 'assigned').length ?? 0;
  const submittedCount = cases?.filter((c) => c.status === 'submitted').length ?? 0;

  // Recent cases needing attention (draft, assigned, site_visit, reporting first)
  const priorityStatuses = ['draft', 'assigned', 'site_visit', 'reporting', 'awaiting_quote'];
  const recentCases = (cases || [])
    .sort((a, b) => {
      const aIdx = priorityStatuses.indexOf(a.status);
      const bIdx = priorityStatuses.indexOf(b.status);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    })
    .slice(0, 5);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AppHeader title="Dashboard" />
          <Text style={styles.subtitle}>Overview and quick access</Text>
        </View>

        {/* Today's appointments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today</Text>
          <View style={styles.card}>
            {appointmentsLoading ? (
              <Text style={styles.muted}>Loading...</Text>
            ) : !todayAppointments || todayAppointments.length === 0 ? (
              <>
                <Text style={styles.cardText}>No appointments scheduled</Text>
                <Text style={styles.muted}>Add appointments from a case</Text>
              </>
            ) : (
              <>
                <Text style={styles.cardText}>
                  {todayAppointments.length} appointment{todayAppointments.length !== 1 ? 's' : ''} today
                </Text>
                {todayAppointments.slice(0, 3).map((apt) => (
                  <TouchableOpacity
                    key={apt.id}
                    style={styles.appointmentRow}
                    onPress={() => router.push(`/(app)/(tabs)/cases/${apt.case_id}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.appointmentTime}>{formatTime(apt.scheduled_at)}</Text>
                    <View style={styles.appointmentDetail}>
                      <Text style={styles.appointmentCase}>
                        {apt.case?.case_number ?? 'Case'}
                      </Text>
                      <Text style={styles.muted}>{apt.case?.client_name ?? ''}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {todayAppointments.length > 3 && (
                  <TouchableOpacity
                    onPress={() => router.push('/(app)/(tabs)/cases')}
                    style={styles.viewAll}
                  >
                    <Text style={styles.viewAllText}>View all appointments</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {/* Case status breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cases</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{casesLoading ? '—' : caseCount}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={styles.statNumber}>{casesLoading ? '—' : draftCount}</Text>
              <Text style={styles.statLabel}>Draft</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={styles.statNumber}>{casesLoading ? '—' : reportingCount}</Text>
              <Text style={styles.statLabel}>In reporting</Text>
            </View>
          </View>
          {(assignedCount > 0 || siteVisitCount > 0 || submittedCount > 0) && (
            <View style={styles.miniStats}>
              {assignedCount > 0 && (
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{assignedCount}</Text>
                  <Text style={styles.miniStatLabel}>Assigned</Text>
                </View>
              )}
              {siteVisitCount > 0 && (
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{siteVisitCount}</Text>
                  <Text style={styles.miniStatLabel}>Site visit</Text>
                </View>
              )}
              {submittedCount > 0 && (
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatNum}>{submittedCount}</Text>
                  <Text style={styles.miniStatLabel}>Submitted</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Recent cases */}
        {recentCases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent / needs attention</Text>
            <View style={styles.card}>
              {recentCases.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.caseRow}
                  onPress={() => router.push(`/(app)/(tabs)/cases/${c.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.caseRowLeft}>
                    <Text style={styles.caseNumber}>{c.case_number}</Text>
                    <Text style={styles.muted}>{c.client_name}</Text>
                  </View>
                  <View style={styles.caseRowRight}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {CASE_STATUS_LABELS[c.status] ?? c.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => router.push('/(app)/(tabs)/cases')}
                style={styles.viewAll}
              >
                <Text style={styles.viewAllText}>View all cases</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick access</Text>
          <View style={styles.quickLinks}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(app)/(tabs)/cases')}
            >
              <Text style={styles.quickLinkText}>Cases</Text>
              <Text style={styles.quickLinkCount}>{caseCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => router.push('/(app)/(tabs)/clients')}
            >
              <Text style={styles.quickLinkText}>Clients</Text>
              <Text style={styles.quickLinkCount}>{clients?.length ?? 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TabFABs
        onCreateCase={() => router.push('/(app)/(tabs)/cases?openCreate=1')}
        onCamera={() => router.push('/(app)/(tabs)/capture?openCapture=1')}
        onRecord={() => Alert.alert('Coming soon', 'Record meeting')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    fontSize: typography.sizes.base,
    color: colors.charcoal,
  },
  muted: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#30313A',
    borderRadius: 8,
    padding: 16,
    borderWidth: 0,
  },
  statCardAccent: {
    backgroundColor: colors.accent,
  },
  statNumber: {
    fontSize: typography.sizes['2xl'],
    fontWeight: '700',
    color: colors.white,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    marginTop: 4,
  },
  miniStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniStatNum: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
  },
  miniStatLabel: {
    fontSize: typography.sizes.sm,
    color: colors.slate,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  appointmentTime: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
    width: 56,
  },
  appointmentDetail: {
    flex: 1,
  },
  appointmentCase: {
    fontSize: typography.sizes.base,
    color: colors.charcoal,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  caseRowLeft: {
    flex: 1,
  },
  caseNumber: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
  },
  caseRowRight: {
    marginLeft: 12,
  },
  statusBadge: {
    backgroundColor: colors.charcoal,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.xs,
    color: colors.white,
    fontWeight: '500',
  },
  viewAll: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewAllText: {
    fontSize: typography.sizes.sm,
    color: colors.accent,
    fontWeight: '500',
  },
  quickLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  quickLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickLinkText: {
    fontSize: typography.sizes.base,
    fontWeight: '600',
    color: colors.charcoal,
  },
  quickLinkCount: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.accent,
  },
});
