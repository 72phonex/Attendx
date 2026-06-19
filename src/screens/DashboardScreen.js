import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../constants/colors';
import { DAYS, PRIORITY_COLORS, getTodayIndex, formatDate } from '../constants';
import { getAttendanceSummary, getTasks, getTimetableForDay, calcAttendance } from '../db/database';
import { getStudyAdvice } from '../services/ai';

export default function DashboardScreen() {
  const [data, setData] = useState({ attendance: [], tasks: [], classes: [] });
  const [aiTip, setAiTip] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const todayIdx = getTodayIndex();
  const today = new Date();

  const load = async () => {
    setLoading(true);
    try {
      const [att, tsk, cls] = await Promise.all([
        getAttendanceSummary(),
        getTasks(),
        todayIdx >= 0 ? getTimetableForDay(todayIdx) : Promise.resolve([]),
      ]);
      setData({
        attendance: att,
        tasks: tsk.filter((t) => t.status === 'pending'),
        classes: cls,
      });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const fetchTip = async () => {
    setAiLoading(true);
    try {
      const danger = data.attendance.filter((s) => {
        const { pct } = calcAttendance(s.present, s.total, s.threshold);
        return pct !== null && pct < s.threshold;
      }).map((s) => ({ name: s.name, pct: calcAttendance(s.present, s.total).pct }));

      const urgent = data.tasks.filter((t) => {
        if (!t.due_date) return false;
        const d = Math.ceil((new Date(t.due_date) - today) / 86400000);
        return d >= 0 && d <= 3;
      });

      const tip = await getStudyAdvice(danger, urgent);
      setAiTip(tip);
    } catch (e) {
      setAiTip(`⚠️ ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const dangerSubjects = data.attendance.filter((s) => {
    const { pct } = calcAttendance(s.present, s.total, s.threshold);
    return pct !== null && pct < s.threshold;
  });

  const upcomingTasks = data.tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = Math.ceil((new Date(t.due_date) - today) / 86400000);
    return d >= 0 && d <= 7;
  }).slice(0, 5);

  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator color={C.accent} size="large" />
    </View>
  );

  return (
    <SafeAreaView style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{greeting} 👋</Text>
            <Text style={s.date}>
              {todayIdx >= 0 ? DAYS[todayIdx] : 'Sunday'},{' '}
              {today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
          {dangerSubjects.length > 0 && (
            <View style={s.dangerBadge}>
              <Text style={s.dangerNum}>{dangerSubjects.length}</Text>
              <Text style={s.dangerLabel}>at risk</Text>
            </View>
          )}
        </View>

        {/* AI Advisor */}
        <View style={s.aiCard}>
          <View style={s.aiTop}>
            <View style={s.aiIcon}>
              <Ionicons name="sparkles" size={15} color={C.accent} />
            </View>
            <Text style={s.aiTitle}>AI Advisor</Text>
            <TouchableOpacity onPress={fetchTip} disabled={aiLoading} style={s.refreshBtn}>
              {aiLoading
                ? <ActivityIndicator size="small" color={C.accent} />
                : <Ionicons name="refresh" size={17} color={C.accent} />}
            </TouchableOpacity>
          </View>
          {aiTip
            ? <Text style={s.aiText}>{aiTip}</Text>
            : <TouchableOpacity onPress={fetchTip}>
                <Text style={s.aiHint}>Tap ↻ for an AI study tip</Text>
              </TouchableOpacity>
          }
        </View>

        {/* Attendance Alerts */}
        {dangerSubjects.length > 0 && (
          <Section title="⚠️ Danger Zone" color={C.danger}>
            {dangerSubjects.map((sub) => {
              const { pct, needMore } = calcAttendance(sub.present, sub.total, sub.threshold);
              return (
                <View key={sub.id} style={s.alertRow}>
                  <View style={[s.dot, { backgroundColor: sub.color }]} />
                  <View style={s.flex}>
                    <Text style={s.alertName}>{sub.name}</Text>
                    <Text style={s.alertStat}>Attend {needMore} more to reach {sub.threshold}%</Text>
                  </View>
                  <Text style={s.alertPct}>{pct}%</Text>
                </View>
              );
            })}
          </Section>
        )}

        {/* Today's Classes */}
        <Section title={`Today · ${data.classes.length} class${data.classes.length !== 1 ? 'es' : ''}`}>
          {data.classes.length === 0
            ? <Text style={s.empty}>{todayIdx < 0 ? 'Sunday — enjoy your day off 🎉' : 'No classes scheduled'}</Text>
            : data.classes.map((cls) => (
              <View key={cls.id} style={s.classRow}>
                <View style={[s.classBar, { backgroundColor: cls.subject_color }]} />
                <View style={s.flex}>
                  <Text style={s.className}>{cls.subject_name}</Text>
                  <Text style={s.classTime}>
                    {cls.start_time} – {cls.end_time}
                    {cls.room ? ` · ${cls.room}` : ''}
                  </Text>
                </View>
              </View>
            ))}
        </Section>

        {/* Upcoming Tasks */}
        <Section title="Due This Week">
          {upcomingTasks.length === 0
            ? <Text style={s.empty}>No tasks due this week ✌️</Text>
            : upcomingTasks.map((t) => {
              const diff = Math.ceil((new Date(t.due_date) - today) / 86400000);
              return (
                <View key={t.id} style={s.taskRow}>
                  <View style={[s.taskDot, { backgroundColor: PRIORITY_COLORS[t.priority] }]} />
                  <View style={s.flex}>
                    <Text style={s.taskTitle}>{t.title}</Text>
                    {t.subject_name && <Text style={s.taskSub}>{t.subject_name}</Text>}
                  </View>
                  <Text style={[s.dueLabel, diff === 0 && s.dueToday, diff === 1 && s.dueSoon]}>
                    {diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `${diff}d`}
                  </Text>
                </View>
              );
            })}
        </Section>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children, color }) {
  return (
    <View style={s.section}>
      <Text style={[s.sectionTitle, color && { color }]}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: C.text },
  date: { fontSize: 13, color: C.textMid, marginTop: 2 },
  dangerBadge: {
    backgroundColor: C.dangerDim, borderRadius: 12, padding: 10, alignItems: 'center',
  },
  dangerNum: { fontSize: 20, fontWeight: '800', color: C.danger },
  dangerLabel: { fontSize: 10, color: C.danger, fontWeight: '600' },

  aiCard: {
    backgroundColor: C.accentDim, borderRadius: 16, marginHorizontal: 16, marginBottom: 8,
    padding: 16, borderWidth: 1, borderColor: C.accent + '40',
  },
  aiTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  aiIcon: {
    backgroundColor: C.accent + '30', borderRadius: 8, padding: 5, marginRight: 8,
  },
  aiTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: C.accentLight },
  refreshBtn: { padding: 4 },
  aiText: { fontSize: 14, color: C.text, lineHeight: 20 },
  aiHint: { fontSize: 13, color: C.textMid, fontStyle: 'italic' },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.textMid, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  card: { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' },

  alertRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  alertName: { fontSize: 15, fontWeight: '600', color: C.text },
  alertStat: { fontSize: 12, color: C.danger, marginTop: 2 },
  alertPct: { fontSize: 18, fontWeight: '800', color: C.danger },

  classRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  classBar: { width: 4, height: 38, borderRadius: 2, marginRight: 12 },
  className: { fontSize: 15, fontWeight: '600', color: C.text },
  classTime: { fontSize: 12, color: C.textMid, marginTop: 2 },

  taskRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  taskDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  taskTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  taskSub: { fontSize: 12, color: C.textMid, marginTop: 1 },
  dueLabel: { fontSize: 13, fontWeight: '700', color: C.textMid },
  dueToday: { color: C.danger },
  dueSoon: { color: C.warning },

  empty: { padding: 16, color: C.textMid, fontSize: 14, textAlign: 'center' },
});
