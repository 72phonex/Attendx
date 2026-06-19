import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  StyleSheet, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../constants/colors';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../constants';
import { getTasks, addTask, toggleTask, deleteTask, getSubjects } from '../db/database';
import { parseTaskNLP } from '../services/ai';

const FILTERS = ['All', 'Pending', 'Done'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [nlpMode, setNlpMode] = useState(false);
  const [nlpInput, setNlpInput] = useState('');
  const [nlpLoading, setNlpLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', subject_id: null, due_date: '', priority: 'medium',
  });

  const load = async () => {
    setLoading(true);
    const [t, s] = await Promise.all([getTasks(), getSubjects()]);
    setTasks(t);
    setSubjects(s);
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const filtered = tasks.filter((t) => {
    if (filter === 'Pending') return t.status === 'pending';
    if (filter === 'Done') return t.status === 'done';
    return true;
  });

  const openModal = () => {
    setForm({ title: '', description: '', subject_id: null, due_date: '', priority: 'medium' });
    setNlpInput('');
    setNlpMode(false);
    setModal(true);
  };

  const runNLP = async () => {
    if (!nlpInput.trim()) return;
    setNlpLoading(true);
    try {
      const parsed = await parseTaskNLP(nlpInput, subjects);
      const matchedSub = subjects.find(
        (s) => s.name.toLowerCase() === (parsed.subject_name || '').toLowerCase()
      );
      setForm({
        title: parsed.title || nlpInput,
        description: '',
        subject_id: matchedSub?.id || null,
        due_date: parsed.due_date || '',
        priority: parsed.priority || 'medium',
      });
      setNlpMode(false);
    } catch (e) {
      Alert.alert('AI Error', e.message);
    } finally {
      setNlpLoading(false);
    }
  };

  const save = async () => {
    if (!form.title.trim()) return Alert.alert('Required', 'Task title is required');
    await addTask(form.title.trim(), form.description.trim(), form.subject_id, form.due_date || null, form.priority);
    setModal(false);
    load();
  };

  const toggle = async (task) => {
    await toggleTask(task.id, task.status);
    load();
  };

  const remove = (task) => {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTask(task.id); load(); } },
    ]);
  };

  const daysLeft = (due) => {
    if (!due) return null;
    const d = Math.ceil((new Date(due) - new Date()) / 86400000);
    return d;
  };

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <Text style={s.title}>Tasks</Text>
        <TouchableOpacity style={s.addBtn} onPress={openModal}>
          <Ionicons name="add" size={22} color={C.white} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={s.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[s.filterBtn, filter === f && s.filterActive]}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} color={C.accent} />
        : filtered.length === 0
          ? <View style={s.empty}>
              <Ionicons name="document-text-outline" size={48} color={C.textDim} />
              <Text style={s.emptyText}>{filter === 'Pending' ? 'All clear! No pending tasks.' : 'Nothing here yet.'}</Text>
            </View>
          : <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {filtered.map((task) => {
                const days = daysLeft(task.due_date);
                const done = task.status === 'done';
                return (
                  <View key={task.id} style={[s.card, done && s.cardDone]}>
                    <TouchableOpacity style={s.checkbox} onPress={() => toggle(task)}>
                      <Ionicons
                        name={done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={24} color={done ? C.success : C.textDim}
                      />
                    </TouchableOpacity>
                    <View style={s.flex}>
                      <Text style={[s.taskTitle, done && s.taskDone]}>{task.title}</Text>
                      <View style={s.metaRow}>
                        {task.subject_name && (
                          <View style={[s.subChip, { backgroundColor: task.subject_color + '30' }]}>
                            <Text style={[s.subChipText, { color: task.subject_color }]}>{task.subject_name}</Text>
                          </View>
                        )}
                        <View style={[s.priChip, { backgroundColor: PRIORITY_COLORS[task.priority] + '25' }]}>
                          <Text style={[s.priChipText, { color: PRIORITY_COLORS[task.priority] }]}>
                            {task.priority}
                          </Text>
                        </View>
                        {days !== null && !done && (
                          <Text style={[s.dueText,
                            days < 0 && { color: C.danger },
                            days === 0 && { color: C.danger },
                            days === 1 && { color: C.warning },
                          ]}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `${days}d left`}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => remove(task)} style={s.del}>
                      <Ionicons name="trash-outline" size={16} color={C.danger + '99'} />
                    </TouchableOpacity>
                  </View>
                );
              })}
              <View style={{ height: 30 }} />
            </ScrollView>
      }

      {/* Add Task Modal */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Add Task</Text>
              <TouchableOpacity
                onPress={() => setNlpMode(!nlpMode)}
                style={[s.aiToggle, nlpMode && s.aiToggleActive]}
              >
                <Ionicons name="sparkles" size={16} color={nlpMode ? C.white : C.accent} />
                <Text style={[s.aiToggleText, nlpMode && { color: C.white }]}>AI</Text>
              </TouchableOpacity>
            </View>

            {nlpMode ? (
              <View>
                <Text style={s.nlpHint}>Describe your task naturally:</Text>
                <TextInput
                  style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder={'e.g. "Networks assignment due this Friday, high priority"'}
                  placeholderTextColor={C.textDim}
                  value={nlpInput}
                  onChangeText={setNlpInput}
                  multiline
                  autoFocus
                />
                <TouchableOpacity style={s.aiParseBtn} onPress={runNLP} disabled={nlpLoading}>
                  {nlpLoading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <Text style={s.aiParseBtnText}>✨ Parse with AI</Text>
                  }
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <TextInput style={s.input} placeholder="Task title *" placeholderTextColor={C.textDim}
                  value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} autoFocus />
                <TextInput style={s.input} placeholder="Due date (YYYY-MM-DD)" placeholderTextColor={C.textDim}
                  value={form.due_date} onChangeText={(v) => setForm({ ...form, due_date: v })} />

                {/* Priority selector */}
                <Text style={s.label}>Priority</Text>
                <View style={s.priRow}>
                  {['high', 'medium', 'low'].map((p) => (
                    <TouchableOpacity key={p} onPress={() => setForm({ ...form, priority: p })}
                      style={[s.priBtn, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '30', borderColor: PRIORITY_COLORS[p] }]}>
                      <Text style={[s.priBtnText, form.priority === p && { color: PRIORITY_COLORS[p] }]}>
                        {PRIORITY_LABELS[p]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Subject selector */}
                <Text style={s.label}>Subject (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <TouchableOpacity onPress={() => setForm({ ...form, subject_id: null })}
                    style={[s.subBtn, !form.subject_id && s.subBtnActive]}>
                    <Text style={[s.subBtnText, !form.subject_id && { color: C.accent }]}>None</Text>
                  </TouchableOpacity>
                  {subjects.map((sub) => (
                    <TouchableOpacity key={sub.id} onPress={() => setForm({ ...form, subject_id: sub.id })}
                      style={[s.subBtn, form.subject_id === sub.id && { backgroundColor: sub.color + '30', borderColor: sub.color }]}>
                      <Text style={[s.subBtnText, form.subject_id === sub.id && { color: sub.color }]}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View style={s.btnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)}>
                    <Text style={s.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.saveBtn} onPress={save}>
                    <Text style={s.saveText}>Add Task</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
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
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: C.text },
  addBtn: {
    backgroundColor: C.accent, width: 40, height: 40,
    borderRadius: 20, justifyContent: 'center', alignItems: 'center',
  },
  filters: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  filterActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  filterText: { color: C.textMid, fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: C.accent },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 10 },
  emptyText: { fontSize: 16, color: C.textMid, textAlign: 'center', marginTop: 8 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card,
    borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  cardDone: { opacity: 0.55 },
  checkbox: { marginRight: 12, marginTop: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6 },
  taskDone: { textDecorationLine: 'line-through', color: C.textMid },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  subChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  subChipText: { fontSize: 11, fontWeight: '700' },
  priChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  priChipText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  dueText: { fontSize: 12, fontWeight: '600', color: C.textMid },
  del: { padding: 4, marginLeft: 8 },

  overlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  aiToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: C.accent,
  },
  aiToggleActive: { backgroundColor: C.accent },
  aiToggleText: { fontSize: 13, fontWeight: '700', color: C.accent },
  nlpHint: { fontSize: 13, color: C.textMid, marginBottom: 10 },
  aiParseBtn: {
    backgroundColor: C.accent, borderRadius: 14, padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  aiParseBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  input: {
    backgroundColor: C.cardAlt, borderRadius: 12, padding: 14, color: C.text,
    fontSize: 15, marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },
  label: { fontSize: 13, color: C.textMid, marginBottom: 8, fontWeight: '600' },
  priRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  priBtn: {
    flex: 1, padding: 10, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, alignItems: 'center',
  },
  priBtnText: { color: C.textMid, fontSize: 12, fontWeight: '600' },
  subBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  subBtnActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  subBtnText: { color: C.textMid, fontSize: 13, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: 14, borderWidth: 1,
    borderColor: C.border, alignItems: 'center',
  },
  cancelText: { color: C.textMid, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, backgroundColor: C.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: C.white, fontWeight: '700', fontSize: 15 },
});
