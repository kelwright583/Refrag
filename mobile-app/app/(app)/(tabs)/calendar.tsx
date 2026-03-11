/**
 * Calendar tab — Day / Week / Month views
 */

import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalendarBlocks, useCalendarAppointments } from '@/hooks/use-calendar';
import { useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from '@/hooks/use-appointments';
import { useCases } from '@/hooks/use-cases';
import { colors } from '@/lib/theme/colors';
import { BLOCK_TYPE_LABELS, BlockType, CalendarBlock, CalendarAppointment } from '@/lib/types/calendar';
import { Case } from '@/lib/types/case';
import { MapPreview } from '@/components/MapPreview';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 6);
const DAY_LABELS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SCREEN_WIDTH = Dimensions.get('window').width;

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

const BLOCK_COLORS: Record<BlockType, { bg: string; text: string }> = {
  personal: { bg: '#DBEAFE', text: '#1E40AF' },
  travel: { bg: '#E9D5FF', text: '#6B21A8' },
  admin: { bg: '#FEF3C7', text: '#92400E' },
  leave: { bg: '#FEE2E2', text: '#991B1B' },
  other: { bg: '#F3F4F6', text: '#374151' },
};

type ViewMode = 'day' | 'week' | 'month';

export default function CalendarScreen() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<CalendarAppointment | null>(null);
  const scheduleAppt = useCreateAppointment();
  const updateAppt = useUpdateAppointment();
  const deleteAppt = useDeleteAppointment();

  // Compute date range for fetch
  const { from, to } = useMemo(() => {
    switch (viewMode) {
      case 'day': {
        const s = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const e = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59, 999);
        return { from: s.toISOString(), to: e.toISOString() };
      }
      case 'week': {
        const ws = startOfWeek(currentDate);
        return { from: ws.toISOString(), to: addDays(ws, 7).toISOString() };
      }
      case 'month': {
        const ms = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const gridStart = startOfWeek(ms);
        const me = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
        const gridEnd = addDays(startOfWeek(addDays(me, 6)), 7);
        return { from: gridStart.toISOString(), to: gridEnd.toISOString() };
      }
    }
  }, [viewMode, currentDate]);

  const { data: blocks } = useCalendarBlocks(from, to);
  const { data: appointments } = useCalendarAppointments(from, to);

  const todayStr = formatDateISO(new Date());

  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateISO(date);
    return {
      blocks: (blocks || []).filter((b) => formatDateISO(new Date(b.starts_at)) === dateStr),
      appointments: (appointments || []).filter((a) => formatDateISO(new Date(a.scheduled_at)) === dateStr),
    };
  };

  const navigate = (dir: -1 | 1) => {
    switch (viewMode) {
      case 'day': setCurrentDate(addDays(currentDate, dir)); break;
      case 'week': setCurrentDate(addDays(currentDate, dir * 7)); break;
      case 'month': setCurrentDate(addMonths(currentDate, dir)); break;
    }
  };

  const headingText = useMemo(() => {
    switch (viewMode) {
      case 'day':
        return currentDate.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      case 'week': {
        const ws = startOfWeek(currentDate);
        return `${ws.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })} – ${addDays(ws, 6).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
      }
      case 'month':
        return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, currentDate]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        {(['day', 'week', 'month'] as ViewMode[]).map((vm) => (
          <TouchableOpacity
            key={vm}
            onPress={() => setViewMode(vm)}
            style={[styles.toggleBtn, viewMode === vm && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleText, viewMode === vm && styles.toggleTextActive]}>
              {vm.charAt(0).toUpperCase() + vm.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Nav */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => navigate(-1)}>
          <Ionicons name="chevron-back" size={22} color={colors.slate} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentDate(new Date())}>
          <Text style={styles.dateLabel}>{headingText}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigate(1)}>
          <Ionicons name="chevron-forward" size={22} color={colors.slate} />
        </TouchableOpacity>
      </View>

      {/* Views */}
      {viewMode === 'day' && (
        <DayTimeline
          date={currentDate}
          blocks={blocks || []}
          appointments={appointments || []}
          onApptPress={setSelectedAppt}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          currentDate={currentDate}
          todayStr={todayStr}
          getEventsForDate={getEventsForDate}
          onDayPress={(d) => { setCurrentDate(d); setViewMode('day'); }}
          onApptPress={setSelectedAppt}
        />
      )}
      {viewMode === 'month' && (
        <MonthView
          currentDate={currentDate}
          todayStr={todayStr}
          getEventsForDate={getEventsForDate}
          onDayPress={(d) => { setCurrentDate(d); setViewMode('day'); }}
        />
      )}

      {/* FAB — Schedule Assessment */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowScheduleModal(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="calendar" size={22} color={colors.white} />
        <Text style={styles.fabText}>Schedule</Text>
      </TouchableOpacity>

      {/* Schedule Assessment Modal */}
      <ScheduleAssessmentModal
        visible={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onCreate={async (input) => {
          await scheduleAppt.mutateAsync(input);
          setShowScheduleModal(false);
        }}
        isLoading={scheduleAppt.isPending}
        defaultDate={currentDate}
      />

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <AppointmentDetailModal
          appointment={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onUpdate={async (id, input) => { await updateAppt.mutateAsync({ id, input }); setSelectedAppt(null); }}
          onDelete={async (id) => { await deleteAppt.mutateAsync(id); setSelectedAppt(null); }}
          onViewCase={(caseId) => { setSelectedAppt(null); router.push(`/cases/${caseId}` as any); }}
          isBusy={updateAppt.isPending || deleteAppt.isPending}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Day Timeline ─────────────────────────────────────────
function DayTimeline({
  date, blocks, appointments, onApptPress,
}: {
  date: Date;
  blocks: CalendarBlock[];
  appointments: CalendarAppointment[];
  onApptPress: (a: CalendarAppointment) => void;
}) {
  const dateStr = formatDateISO(date);
  const dayBlocks = blocks.filter((b) => formatDateISO(new Date(b.starts_at)) === dateStr);
  const dayAppts = appointments.filter((a) => formatDateISO(new Date(a.scheduled_at)) === dateStr);

  return (
    <ScrollView style={styles.timeline} contentContainerStyle={styles.timelineContent}>
      {HOURS.map((hour) => {
        const hourAppts = dayAppts.filter((a) => new Date(a.scheduled_at).getHours() === hour);
        const hourBlocks = dayBlocks.filter((b) => new Date(b.starts_at).getHours() === hour);
        return (
          <View key={hour} style={styles.hourRow}>
            <View style={styles.hourLabel}>
              <Text style={styles.hourText}>{String(hour).padStart(2, '0')}:00</Text>
            </View>
            <View style={styles.hourContent}>
              {hourAppts.map((a) => {
                const done = !!a.completed_at;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.appointmentCard, done && styles.appointmentCardDone]}
                    onPress={() => onApptPress(a)}
                  >
                    <View style={styles.apptRow}>
                      <Ionicons name={done ? 'checkmark-circle' : 'time-outline'} size={14} color={done ? '#16A34A' : colors.charcoal} />
                      <Text style={[styles.apptTime, done && { color: '#16A34A' }]}>{formatTime(a.scheduled_at)}</Text>
                      <Text style={styles.apptCase}>{a.case_number}</Text>
                    </View>
                    {a.client_name && <Text style={styles.apptClient}>{a.client_name}</Text>}
                    {a.address && (
                      <View style={styles.apptRow}>
                        <Ionicons name="location-outline" size={12} color={colors.muted} />
                        <Text style={styles.apptAddress}>{a.address}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {hourBlocks.map((b) => {
                const bc = BLOCK_COLORS[b.block_type] || BLOCK_COLORS.other;
                return (
                  <View key={b.id} style={[styles.blockCard, { backgroundColor: bc.bg }]}>
                    <Text style={[styles.blockTime, { color: bc.text }]}>{formatTime(b.starts_at)} – {formatTime(b.ends_at)}</Text>
                    <Text style={[styles.blockTitle, { color: bc.text }]}>{b.title || BLOCK_TYPE_LABELS[b.block_type]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Week View ────────────────────────────────────────────
function WeekView({
  currentDate, todayStr, getEventsForDate, onDayPress, onApptPress,
}: {
  currentDate: Date;
  todayStr: string;
  getEventsForDate: (d: Date) => { blocks: CalendarBlock[]; appointments: CalendarAppointment[] };
  onDayPress: (d: Date) => void;
  onApptPress: (a: CalendarAppointment) => void;
}) {
  const ws = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  const colWidth = (SCREEN_WIDTH - 20) / 7;

  return (
    <ScrollView style={styles.timeline} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Day headers */}
      <View style={styles.weekHeaderRow}>
        {weekDays.map((day, i) => {
          const isToday = formatDateISO(day) === todayStr;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => onDayPress(day)}
              style={[styles.weekHeaderCell, { width: colWidth }]}
            >
              <Text style={styles.weekDayLabel}>{DAY_LABELS[i]}</Text>
              <View style={[styles.weekDateCircle, isToday && styles.weekDateCircleToday]}>
                <Text style={[styles.weekDateNum, isToday && styles.weekDateNumToday]}>{day.getDate()}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day columns with events */}
      <View style={styles.weekBody}>
        {weekDays.map((day, i) => {
          const events = getEventsForDate(day);
          const isToday = formatDateISO(day) === todayStr;
          return (
            <View
              key={i}
              style={[
                styles.weekDayCol,
                { width: colWidth },
                isToday && { backgroundColor: colors.charcoal + '08' },
              ]}
            >
              {events.appointments.map((a) => {
                const done = !!a.completed_at;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.weekEvent, done && styles.weekEventDone]}
                    onPress={() => onApptPress(a)}
                  >
                    <Text style={[styles.weekEventTime, done && { color: '#16A34A' }]}>{formatTime(a.scheduled_at)}</Text>
                    <Text style={styles.weekEventTitle} numberOfLines={1}>{a.case_number}</Text>
                  </TouchableOpacity>
                );
              })}
              {events.blocks.map((b) => {
                const bc = BLOCK_COLORS[b.block_type] || BLOCK_COLORS.other;
                return (
                  <View key={b.id} style={[styles.weekBlock, { backgroundColor: bc.bg }]}>
                    <Text style={[styles.weekBlockText, { color: bc.text }]} numberOfLines={1}>
                      {b.title || BLOCK_TYPE_LABELS[b.block_type]}
                    </Text>
                  </View>
                );
              })}
              {events.appointments.length === 0 && events.blocks.length === 0 && (
                <TouchableOpacity onPress={() => onDayPress(day)} style={{ flex: 1, minHeight: 80 }} />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Month View ───────────────────────────────────────────
function MonthView({
  currentDate, todayStr, getEventsForDate, onDayPress,
}: {
  currentDate: Date;
  todayStr: string;
  getEventsForDate: (d: Date) => { blocks: CalendarBlock[]; appointments: CalendarAppointment[] };
  onDayPress: (d: Date) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = startOfWeek(firstOfMonth);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const cellSize = (SCREEN_WIDTH - 20) / 7;

  return (
    <ScrollView style={styles.timeline} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Day labels */}
      <View style={styles.monthDayLabelRow}>
        {DAY_LABELS_SHORT.map((d, i) => (
          <View key={i} style={[styles.monthDayLabelCell, { width: cellSize }]}>
            <Text style={styles.monthDayLabelText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.monthGrid}>
        {cells.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = formatDateISO(day) === todayStr;
          const events = getEventsForDate(day);
          const count = events.blocks.length + events.appointments.length;

          return (
            <TouchableOpacity
              key={i}
              onPress={() => onDayPress(day)}
              style={[
                styles.monthCell,
                { width: cellSize, height: cellSize * 1.1 },
                !isCurrentMonth && { opacity: 0.3 },
              ]}
            >
              <View style={[styles.monthDateCircle, isToday && styles.monthDateCircleToday]}>
                <Text style={[styles.monthDateText, isToday && styles.monthDateTextToday]}>
                  {day.getDate()}
                </Text>
              </View>
              {count > 0 && isCurrentMonth && (
                <View style={styles.monthDotRow}>
                  {events.appointments.length > 0 && <View style={[styles.monthDot, { backgroundColor: colors.charcoal }]} />}
                  {events.blocks.length > 0 && <View style={[styles.monthDot, { backgroundColor: '#6B21A8' }]} />}
                </View>
              )}
              {count > 0 && isCurrentMonth && (
                <Text style={styles.monthEventCount}>{count}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: colors.charcoal },

  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: { fontSize: 13, color: colors.muted, fontWeight: '500' },
  toggleTextActive: { color: colors.charcoal, fontWeight: '600' },

  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dateLabel: { fontSize: 14, fontWeight: '600', color: colors.charcoal },

  timeline: { flex: 1 },
  timelineContent: { paddingBottom: 40 },

  // Day view
  hourRow: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hourLabel: {
    width: 50,
    paddingTop: 8,
    paddingRight: 6,
    alignItems: 'flex-end',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  hourText: { fontSize: 10, color: colors.muted },
  hourContent: { flex: 1, padding: 4 },
  appointmentCard: {
    backgroundColor: colors.charcoal + '0D',
    borderWidth: 1,
    borderColor: colors.charcoal + '20',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
  },
  appointmentCardDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  apptRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  apptTime: { fontSize: 12, fontWeight: '600', color: colors.charcoal },
  apptCase: { fontSize: 12, fontWeight: '600', color: colors.charcoal, marginLeft: 4 },
  apptClient: { fontSize: 11, color: colors.muted, marginTop: 2 },
  apptAddress: { fontSize: 11, color: colors.muted, marginLeft: 2 },
  blockCard: { borderRadius: 6, padding: 8, marginBottom: 4 },
  blockTime: { fontSize: 11, fontWeight: '600' },
  blockTitle: { fontSize: 12, marginTop: 2 },

  // Week view
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 10,
  },
  weekHeaderCell: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayLabel: { fontSize: 10, color: colors.muted, marginBottom: 4 },
  weekDateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDateCircleToday: { backgroundColor: colors.charcoal },
  weekDateNum: { fontSize: 14, fontWeight: '600', color: colors.charcoal },
  weekDateNumToday: { color: colors.white },
  weekBody: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    minHeight: 300,
  },
  weekDayCol: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    padding: 2,
  },
  weekEvent: {
    backgroundColor: colors.charcoal + '0D',
    borderRadius: 4,
    padding: 4,
    marginBottom: 2,
  },
  weekEventDone: {
    backgroundColor: '#F0FDF4',
  },
  weekEventTime: { fontSize: 9, fontWeight: '600', color: colors.charcoal },
  weekEventTitle: { fontSize: 9, color: colors.charcoal },
  weekBlock: {
    borderRadius: 4,
    padding: 4,
    marginBottom: 2,
  },
  weekBlockText: { fontSize: 9, fontWeight: '500' },

  // Month view
  monthDayLabelRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  monthDayLabelCell: { alignItems: 'center', paddingVertical: 6 },
  monthDayLabelText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  monthCell: {
    alignItems: 'center',
    paddingTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  monthDateCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDateCircleToday: { backgroundColor: colors.charcoal },
  monthDateText: { fontSize: 13, fontWeight: '500', color: colors.charcoal },
  monthDateTextToday: { color: colors.white, fontWeight: '700' },
  monthDotRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 3,
  },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  monthEventCount: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.charcoal,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  fabText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Appointment Detail Modal ─────────────────────────────
function AppointmentDetailModal({
  appointment: appt, onClose, onUpdate, onDelete, onViewCase, isBusy,
}: {
  appointment: CalendarAppointment;
  onClose: () => void;
  onUpdate: (id: string, input: Record<string, any>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewCase: (caseId: string) => void;
  isBusy: boolean;
}) {
  const [mode, setMode] = useState<'view' | 'reschedule' | 'editNotes' | 'editAddress'>('view');
  const [newDate, setNewDate] = useState(formatDateISO(new Date(appt.scheduled_at)));
  const [newTime, setNewTime] = useState(formatTime(appt.scheduled_at));
  const [newNotes, setNewNotes] = useState(appt.notes || '');
  const [newAddress, setNewAddress] = useState(appt.address || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCompleted = !!appt.completed_at;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={detailStyles.container}>
        {/* Header */}
        <View style={[detailStyles.header, isCompleted && { backgroundColor: '#F0FDF4', borderBottomColor: '#BBF7D0' }]}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'calendar'}
                size={16}
                color={isCompleted ? '#16A34A' : colors.charcoal}
              />
              <Text style={[detailStyles.badge, isCompleted && { color: '#16A34A' }]}>
                {isCompleted ? 'COMPLETED' : 'ASSESSMENT'}
              </Text>
            </View>
            <Text style={detailStyles.title}>{appt.case_number || 'Appointment'}</Text>
            {appt.client_name && <Text style={detailStyles.subtitle}>{appt.client_name}</Text>}
          </View>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={detailStyles.body}>
          {/* Details */}
          <View style={detailStyles.detailSection}>
            <View style={detailStyles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.charcoal} />
              <Text style={detailStyles.detailText}>
                {new Date(appt.scheduled_at).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {formatTime(appt.scheduled_at)}
              </Text>
            </View>
            {appt.address && (
              <>
                <View style={detailStyles.detailRow}>
                  <Ionicons name="location-outline" size={16} color={colors.charcoal} />
                  <View style={{ flex: 1 }}>
                    <Text style={detailStyles.detailText}>{appt.address}</Text>
                  </View>
                </View>
                <View style={{ marginTop: 8, marginBottom: 4 }}>
                  <MapPreview address={appt.address} height={150} />
                </View>
              </>
            )}
            {appt.notes && (
              <View style={detailStyles.detailRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.charcoal} />
                <Text style={[detailStyles.detailText, { color: colors.muted }]}>{appt.notes}</Text>
              </View>
            )}
          </View>

          {/* Inline edit modes */}
          {mode === 'reschedule' && (
            <View style={detailStyles.editSection}>
              <Text style={detailStyles.editLabel}>RESCHEDULE</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                <TextInput style={[detailStyles.editInput, { flex: 1 }]} value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
                <TextInput style={[detailStyles.editInput, { flex: 1 }]} value={newTime} onChangeText={setNewTime} placeholder="HH:MM" placeholderTextColor={colors.muted} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[detailStyles.saveBtn, { flex: 1 }, isBusy && { opacity: 0.5 }]}
                  onPress={() => onUpdate(appt.id, { scheduled_at: new Date(`${newDate}T${newTime}:00`).toISOString() })}
                  disabled={isBusy}
                >
                  <Text style={detailStyles.saveBtnText}>{isBusy ? 'Saving...' : 'Confirm Reschedule'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={detailStyles.cancelBtn} onPress={() => setMode('view')}>
                  <Text style={detailStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'editNotes' && (
            <View style={detailStyles.editSection}>
              <Text style={detailStyles.editLabel}>EDIT NOTES</Text>
              <TextInput
                style={[detailStyles.editInput, { height: 80, textAlignVertical: 'top' }]}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="Gate code, contact on site, special instructions..."
                placeholderTextColor={colors.muted}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[detailStyles.saveBtn, { flex: 1 }, isBusy && { opacity: 0.5 }]}
                  onPress={() => onUpdate(appt.id, { notes: newNotes || null })}
                  disabled={isBusy}
                >
                  <Text style={detailStyles.saveBtnText}>{isBusy ? 'Saving...' : 'Save Notes'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={detailStyles.cancelBtn} onPress={() => setMode('view')}>
                  <Text style={detailStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === 'editAddress' && (
            <View style={detailStyles.editSection}>
              <Text style={detailStyles.editLabel}>EDIT ADDRESS</Text>
              <AddressAutocomplete
                value={newAddress}
                onChange={setNewAddress}
                placeholder="Assessment location"
              />
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                  style={[detailStyles.saveBtn, { flex: 1 }, isBusy && { opacity: 0.5 }]}
                  onPress={() => onUpdate(appt.id, { address: newAddress || null })}
                  disabled={isBusy}
                >
                  <Text style={detailStyles.saveBtnText}>{isBusy ? 'Saving...' : 'Save Address'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={detailStyles.cancelBtn} onPress={() => setMode('view')}>
                  <Text style={detailStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Actions */}
          {mode === 'view' && (
            <View style={detailStyles.actionsSection}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity style={[detailStyles.actionBtn, { flex: 1 }]} onPress={() => setMode('reschedule')}>
                  <Ionicons name="refresh" size={16} color={colors.charcoal} />
                  <Text style={detailStyles.actionText}>Reschedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[detailStyles.actionBtn, { flex: 1 }]} onPress={() => setMode('editNotes')}>
                  <Ionicons name="create-outline" size={16} color={colors.charcoal} />
                  <Text style={detailStyles.actionText}>Edit Notes</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TouchableOpacity style={[detailStyles.actionBtn, { flex: 1 }]} onPress={() => setMode('editAddress')}>
                  <Ionicons name="location-outline" size={16} color={colors.charcoal} />
                  <Text style={detailStyles.actionText}>Edit Address</Text>
                </TouchableOpacity>
                {!isCompleted ? (
                  <TouchableOpacity
                    style={[detailStyles.actionBtn, { flex: 1, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }, isBusy && { opacity: 0.5 }]}
                    onPress={() => onUpdate(appt.id, { completed_at: new Date().toISOString() })}
                    disabled={isBusy}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
                    <Text style={[detailStyles.actionText, { color: '#16A34A' }]}>Complete</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[detailStyles.actionBtn, { flex: 1, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }, isBusy && { opacity: 0.5 }]}
                    onPress={() => onUpdate(appt.id, { completed_at: null })}
                    disabled={isBusy}
                  >
                    <Ionicons name="refresh" size={16} color="#D97706" />
                    <Text style={[detailStyles.actionText, { color: '#D97706' }]}>Undo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {appt.address && (
                <TouchableOpacity
                  style={[detailStyles.actionBtnWide, { backgroundColor: colors.charcoal + '08', borderColor: colors.charcoal + '20' }]}
                  onPress={() => {
                    const url = Platform.OS === 'ios'
                      ? `maps:0,0?q=${encodeURIComponent(appt.address!)}`
                      : `geo:0,0?q=${encodeURIComponent(appt.address!)}`;
                    Linking.openURL(url);
                  }}
                >
                  <Ionicons name="navigate-outline" size={16} color={colors.charcoal} />
                  <Text style={detailStyles.actionText}>Get Directions</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[detailStyles.actionBtnWide, { backgroundColor: colors.charcoal + '08', borderColor: colors.charcoal + '20' }]}
                onPress={() => onViewCase(appt.case_id)}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.charcoal} />
                <Text style={detailStyles.actionText}>View Case</Text>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={14} color={colors.muted} />
              </TouchableOpacity>

              {/* Delete */}
              {!confirmDelete ? (
                <TouchableOpacity style={detailStyles.deleteBtn} onPress={() => setConfirmDelete(true)}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={detailStyles.deleteText}>Delete Appointment</Text>
                </TouchableOpacity>
              ) : (
                <View style={detailStyles.confirmDeleteRow}>
                  <Text style={{ flex: 1, fontSize: 12, color: '#B91C1C' }}>This cannot be undone.</Text>
                  <TouchableOpacity
                    style={[detailStyles.confirmDeleteBtn, isBusy && { opacity: 0.5 }]}
                    onPress={() => onDelete(appt.id)}
                    disabled={isBusy}
                  >
                    <Text style={detailStyles.confirmDeleteBtnText}>{isBusy ? '...' : 'Delete'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmDelete(false)}>
                    <Text style={{ fontSize: 12, color: colors.muted, paddingHorizontal: 8 }}>No</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.charcoal + '06',
  },
  badge: { fontSize: 10, fontWeight: '700', color: colors.charcoal, letterSpacing: 1 },
  title: { fontSize: 20, fontWeight: '700', color: colors.charcoal, marginTop: 4 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 2 },
  body: { flex: 1, padding: 20 },
  detailSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  detailText: { fontSize: 14, color: colors.charcoal, flex: 1 },
  editSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FAFAF8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLabel: { fontSize: 10, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginBottom: 10 },
  editInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.charcoal,
    backgroundColor: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 16, justifyContent: 'center' },
  cancelBtnText: { fontSize: 13, color: colors.muted },
  actionsSection: { marginTop: 4 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F9FAFB',
  },
  actionBtnWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.charcoal },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 8,
  },
  deleteText: { fontSize: 12, color: '#EF4444' },
  confirmDeleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    marginTop: 8,
  },
  confirmDeleteBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  confirmDeleteBtnText: { color: colors.white, fontSize: 12, fontWeight: '600' },
});

// ─── Schedule Assessment Modal ────────────────────────────
function ScheduleAssessmentModal({
  visible, onClose, onCreate, isLoading, defaultDate,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (input: { case_id: string; scheduled_at: string; address?: string; notes?: string }) => Promise<void>;
  isLoading: boolean;
  defaultDate: Date;
}) {
  const { data: allCases, isLoading: casesLoading } = useCases();
  const [search, setSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [date, setDate] = useState(formatDateISO(defaultDate));
  const [time, setTime] = useState('09:00');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filtered = useMemo(() => {
    if (!allCases) return [];
    if (!search) return allCases.slice(0, 10);
    const q = search.toLowerCase();
    return allCases.filter((c: Case) =>
      c.case_number?.toLowerCase().includes(q) ||
      c.client_name?.toLowerCase().includes(q) ||
      c.claim_reference?.toLowerCase().includes(q) ||
      c.insurer_name?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [allCases, search]);

  const handleSelect = (c: Case) => {
    setSelectedCase(c);
    setSearch('');
    if (c.location && !address) setAddress(c.location);
  };

  const handleSubmit = async () => {
    if (!selectedCase) return;
    const scheduled_at = new Date(`${date}T${time}:00`).toISOString();
    await onCreate({
      case_id: selectedCase.id,
      scheduled_at,
      address: address || undefined,
      notes: notes || undefined,
    });
    // Reset
    setSelectedCase(null);
    setSearch('');
    setAddress('');
    setNotes('');
  };

  const handleClose = () => {
    setSelectedCase(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={modalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={modalStyles.header}>
          <View style={modalStyles.headerLeft}>
            <Ionicons name="calendar" size={20} color={colors.charcoal} />
            <Text style={modalStyles.headerTitle}>Schedule Assessment</Text>
          </View>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView style={modalStyles.body} keyboardShouldPersistTaps="handled">
          {/* Case Picker */}
          <Text style={modalStyles.label}>Case</Text>
          {selectedCase ? (
            <View style={modalStyles.selectedCase}>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.selectedCaseNumber}>{selectedCase.case_number}</Text>
                <Text style={modalStyles.selectedCaseClient}>{selectedCase.client_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCase(null)}>
                <Ionicons name="close-circle" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={modalStyles.searchRow}>
                <Ionicons name="search" size={16} color={colors.muted} />
                <TextInput
                  style={modalStyles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search case number, client..."
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={modalStyles.caseList}>
                {casesLoading ? (
                  <Text style={modalStyles.emptyText}>Loading cases...</Text>
                ) : filtered.length === 0 ? (
                  <Text style={modalStyles.emptyText}>No cases found</Text>
                ) : (
                  filtered.map((c: Case) => (
                    <TouchableOpacity
                      key={c.id}
                      style={modalStyles.caseRow}
                      onPress={() => handleSelect(c)}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={modalStyles.caseRowTop}>
                          <Text style={modalStyles.caseNum}>{c.case_number}</Text>
                          <Text style={modalStyles.caseClient}>{c.client_name}</Text>
                        </View>
                        {c.insurer_name && <Text style={modalStyles.caseMeta}>{c.insurer_name}</Text>}
                      </View>
                      <View style={[
                        modalStyles.statusBadge,
                        { backgroundColor: c.status === 'closed' ? '#D1FAE5' : colors.accent + '15' },
                      ]}>
                        <Text style={[
                          modalStyles.statusText,
                          { color: c.status === 'closed' ? '#065F46' : colors.accent },
                        ]}>{c.status.replace('_', ' ')}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          {/* Date & Time */}
          <View style={modalStyles.row}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Date</Text>
              <TextInput
                style={modalStyles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.label}>Time</Text>
              <TextInput
                style={modalStyles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Address */}
          <Text style={modalStyles.label}>Address</Text>
          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            placeholder="Assessment location"
          />

          {/* Notes */}
          <Text style={modalStyles.label}>Notes (optional)</Text>
          <TextInput
            style={[modalStyles.input, { height: 60, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Gate code, contact on site..."
            placeholderTextColor={colors.muted}
            multiline
          />

          {/* Submit */}
          <TouchableOpacity
            style={[modalStyles.submitBtn, (!selectedCase || isLoading) && { opacity: 0.4 }]}
            onPress={handleSubmit}
            disabled={!selectedCase || isLoading}
          >
            <Text style={modalStyles.submitText}>
              {isLoading ? 'Scheduling...' : 'Schedule Assessment'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.charcoal },
  body: { flex: 1, padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: colors.slate, marginBottom: 6, marginTop: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.charcoal },
  caseList: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    maxHeight: 200,
  },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  caseRowTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caseNum: { fontSize: 13, fontWeight: '600', color: colors.charcoal },
  caseClient: { fontSize: 13, color: colors.muted },
  caseMeta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  selectedCase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.charcoal + '08',
    borderWidth: 1,
    borderColor: colors.charcoal + '20',
    borderRadius: 8,
    padding: 12,
  },
  selectedCaseNumber: { fontSize: 14, fontWeight: '700', color: colors.charcoal },
  selectedCaseClient: { fontSize: 13, color: colors.muted, marginTop: 1 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center', padding: 16 },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.charcoal,
  },
  submitBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
