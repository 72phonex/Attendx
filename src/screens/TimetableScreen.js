import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../constants/colors';
import { DAYS, DAYS_SHORT, getTodayIndex } from '../constants';
import { getTimetable, addTimetableSlot, deleteTimetableSlot, getSubjects } from '../db/database';

export default function TimetableScreen() {
  const todayIdx = getTodayIndex();
  const [selectedDay, setSelectedDay] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    subject_id: null, start_time: '', end_time: '', room: '',
  });

  const load = async () => {
    setLoading(true);
    const [all, subs] = await Promise.all([getTimetable(), getSubjects()]);
    setSlots(all);
    setSubjects(subs);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const daySlots = slots.filter((s) => s.day === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const openModal = () => {
    setForm({ subject_id: subjects[0]?.id || null, start_time: '', end_time: '', room: '' });
    setModal(true);
  };

  const save = async () => {
    if (!form.subject_id) return Alert.alert('Required', 'Select a subject');
    if (!form.start_time || !form.end_time) return Alert.alert('Required', 'Enter start and end time');
    // Basic time format validation HH:MM
    const timeReg = /^\d{2}:\d{2}$/;
    if (!timeReg.test(form.start_time) || !timeReg.test(form.end_time))
      return Alert.alert('Format', 'Use HH:MM format (e.g. 09:00)');
    await addTimetableSlot(form.subject_id, selectedDay, form.start_time, form.end_time, form.room.trim());
    setModal(false);
    load();
  };

  const remove = (slot) => {
    Alert.alert('Remove Slot', `Remove ${slot.subject_name} on ${DAYS[selectedDay]}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteTimetableSlot(slot.id); load(); } },
    ]);
  };

  // Count total classes per day for summary
  const dayCounts = DAYS_SHORT.map((_, i) => slots.filter((s) => s.day === i).length);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Timetable</Text>
        <TouchableOpacity style={s.addBtn} onPress={openModal}>
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll}
        contentContainerStyle={s.dayRow}>
        {DAYS_SHORT.map((day, i) => {
          const isToday = i === todayIdx;
          const isSelected = i === selectedDay;
          return (
            <TouchableOpacity key={day} onPress={() => setSelectedDay(i)}
              style={[s.dayBtn, isSelected && s.dayBtnActive, isToday && !isSelected && s.dayBtnToday]}>
              <Text style={[s.dayLabel, isSelected && s.dayLabelActive]}>{day}</Text>
              <View style={[s.dayCount, isSelected && s.dayCountActive]}>
                <Text style={[s.dayCountText, isSelected && s.dayCountTextActive]}>
                  {dayCounts[i]}
                </Text>
              </View>
              {isToday && <View style={s.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={s.dayTitle}>{DAYS[selectedDay]}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} />
      ) : daySlots.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={48} color={C.textDim} />
          <Text style={s.emptyText}>No classes on {DAYS[selectedDay]}</Text>
          <TouchableOpacity style={s.emptyAddBtn} onPress={openModal}>
            <Text style={s.emptyAddText}>+ Add a class</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
          {/* Timeline view */}
          {daySlots.map((slot, idx) => (
            <View key={slot.id} style={s.slotRow}>
              {/* Time column */}
              <View style={s.timeCol}>
                <Text style={s.timeStart}>{slot.start_time}</Text>
                <Text style={s.timeEnd}>{slot.end_time}</Text>
              </View>
              {/* Connector line */}
              <View style={s.connectorCol}>
                <View style={[s.connDot, { backgroundColor: slot.subject_color }]} />
                {idx < daySlots.length - 1 && <View style={s.connLine} />}
              </View>
              {/* Slot card */}
              <View style={[s.slotCard, { borderLeftColor: slot.subject_color }]}>
                <Text style={s.slotName}>{slot.subject_name}</Text>
                {slot.subject_code ? <Text style={s.slotCode}>{slot.subject_code}</Text> : null}
                {slot.room ? (
                  <View style={s.roomRow}>
                    <Ionicons name="location-outline" size={12} color={C.textDim} />
                    <Text style={s.slotRoom}>{slot.room}</Text>
                  </View>
                ) : null}
                <TouchableOpacity onPress={() => remove(slot)} style={s.deleteSlot}>
                  <Ionicons name="trash-outline" size={14} color={C.danger + '99'} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Add Slot Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>Add Class · {DAYS[selectedDay]}</Text>

            {/* Subject picker */}
            <Text style={s.label}>Subject *</Text>
            {subjects.length === 0 ? (
              <Text style={s.noSubText}>⚠️ Add subjects in Attendance tab first</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {subjects.map((sub) => (
                  <TouchableOpacity key={sub.id} onPress={() => setForm({ ...form, subject_id: sub.id })}
                    style={[s.subBtn,
                      form.subject_id === sub.id && { backgroundColor: sub.color + '30', borderColor: sub.color }
                    ]}>
                    <View style={[s.subDot, { backgroundColor: sub.color }]} />
                    <Text style={[s.subBtnText, form.subject_id === sub.id && { color: sub.color }]}>
                      {sub.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={s.timeRow}>
              <View style={s.flex}>
                <Text style={s.label}>Start time *</Text>
                <TextInput style={s.input} placeholder="09:00" placeholderTextColor={C.textDim}
                  value={form.start_time} onChangeText={(v) => setForm({ ...form, start_time: v })}
                  keyboardType="numbers-and-punctuation" />
              </View>
              <View style={s.timeSep} />
              <View style={s.flex}>
                <Text style={s.label}>End time *</Text>
                <TextInput style={s.input} placeholder="10:00" placeholderTextColor={C.textDim}
                  value={form.end_time} onChangeText={(v) => setForm({ ...form, end_time: v })}
                  keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <TextInput style={s.input} placeholder="Room / Location (optional)"
              placeholderTextColor={C.textDim} value={form.room}
              onChangeText={(v) => setForm({ ...form, room: v })} />

            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={save}>
                <Text style={s.saveText}>Add Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  addBtn: {
    backgroundColor: C.accent, width: 40, height: 40,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  dayScroll: { maxHeight: 80 },
  dayRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  dayBtn: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    minWidth: 60, position: 'relative',
  },
  dayBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  dayBtnToday: { borderColor: C.accent },
  dayLabel: { fontSize: 13, fontWeight: '700', color: C.textMid },
  dayLabelActive: { color: C.white },
  dayCount: {
    marginTop: 4, backgroundColor: C.border, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  dayCountActive: { backgroundColor: C.white + '30' },
  dayCountText: { fontSize: 11, fontWeight: '700', color: C.textDim },
  dayCountTextActive: { color: C.white },
  todayDot: {
    position: 'absolute', bottom: 4, width: 5, height: 5,
    borderRadius: 3, backgroundColor: C.accentLight,
  },
  dayTitle: { fontSize: 15, fontWeight: '700', color: C.textMid, paddingHorizontal: 20, marginVertical: 14 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 16, color: C.textMid, textAlign: 'center', marginTop: 8 },
  emptyAddBtn: {
    marginTop: 8, backgroundColor: C.accentDim, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: C.accent,
  },
  emptyAddText: { color: C.accent, fontWeight: '700' },

  // Timeline layout
  slotRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' },
  timeCol: { width: 52, alignItems: 'flex-end', paddingRight: 10, paddingTop: 2 },
  timeStart: { fontSize: 12, fontWeight: '700', color: C.text },
  timeEnd: { fontSize: 11, color: C.textDim, marginTop: 2 },
  connectorCol: { width: 20, alignItems: 'center', paddingTop: 6 },
  connDot: { width: 12, height: 12, borderRadius: 6 },
  connLine: { flex: 1, width: 2, backgroundColor: C.border, marginTop: 4, minHeight: 50 },
  slotCard: {
    flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14,
    marginLeft: 10, marginBottom: 12, borderLeftWidth: 4,
    borderWidth: 1, borderColor: C.border,
  },
  slotName: { fontSize: 15, fontWeight: '700', color: C.text },
  slotCode: { fontSize: 12, color: C.textMid, marginTop: 2 },
  roomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  slotRoom: { fontSize: 12, color: C.textDim },
  deleteSlot: { position: 'absolute', top: 10, right: 10, padding: 4 },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 16 },
  label: { fontSize: 13, color: C.textMid, marginBottom: 8, fontWeight: '600' },
  noSubText: { color: C.warning, fontSize: 14, marginBottom: 14 },
  subBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  subDot: { width: 8, height: 8, borderRadius: 4 },
  subBtnText: { color: C.textMid, fontSize: 13, fontWeight: '600' },
  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  timeSep: { width: 1 },
  input: {
    backgroundColor: C.cardAlt, borderRadius: 12, padding: 14, color: C.text,
    fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: C.border,
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, alignItems: 'center',
  },
  cancelText: { color: C.textMid, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: C.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: C.white, fontWeight: '700', fontSize: 15 },
});
