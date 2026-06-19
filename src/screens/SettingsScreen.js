import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C } from '../constants/colors';
import { AI_PROVIDERS } from '../constants';
import { getAIConfig, saveAIConfig, testConnection } from '../services/ai';
import { clearAllData } from '../db/database';

export default function SettingsScreen() {
  const [provider, setProvider] = useState('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);

  const load = async () => {
    const cfg = await getAIConfig();
    setProvider(cfg.provider);
    setApiKey(cfg.apiKey);
    setModel(cfg.model);
    setEndpoint(cfg.endpoint);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onProviderChange = (p) => {
    setProvider(p);
    setModel(AI_PROVIDERS[p]?.defaultModel || '');
    setEndpoint(AI_PROVIDERS[p]?.endpoint || '');
    setProviderOpen(false);
    setTestResult('');
  };

  const save = async () => {
    if (!apiKey.trim()) return Alert.alert('Required', 'API key cannot be empty');
    setSaving(true);
    try {
      await saveAIConfig(provider, apiKey.trim(), model.trim(), endpoint.trim());
      Alert.alert('Saved ✅', 'AI settings saved successfully');
      setTestResult('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      // Save first so test uses current values
      await saveAIConfig(provider, apiKey.trim(), model.trim(), endpoint.trim());
      const result = await testConnection();
      setTestResult(`✅ ${result}`);
    } catch (e) {
      setTestResult(`❌ ${e.message}`);
    } finally {
      setTesting(false);
    }
  };

  const confirmClear = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will delete ALL subjects, attendance records, tasks and timetable. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything', style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Cleared', 'All data has been deleted.');
          },
        },
      ]
    );
  };

  const currentProvider = AI_PROVIDERS[provider];
  const modelList = currentProvider?.models || [];

  return (
    <SafeAreaView style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Settings</Text>

        {/* ── AI Settings ─────────────────────────────── */}
        <SectionHeader title="AI Configuration" icon="sparkles" />

        <View style={s.card}>
          {/* Provider */}
          <SettingRow label="Provider" last={false}>
            <TouchableOpacity onPress={() => setProviderOpen(!providerOpen)} style={s.pickerBtn}>
              <Text style={s.pickerText}>{currentProvider?.name || provider}</Text>
              <Ionicons name={providerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={C.textMid} />
            </TouchableOpacity>
          </SettingRow>

          {providerOpen && (
            <View style={s.dropdown}>
              {Object.entries(AI_PROVIDERS).map(([key, val]) => (
                <TouchableOpacity key={key} onPress={() => onProviderChange(key)}
                  style={[s.dropItem, provider === key && s.dropItemActive]}>
                  <Text style={[s.dropText, provider === key && s.dropTextActive]}>{val.name}</Text>
                  {provider === key && <Ionicons name="checkmark" size={16} color={C.accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* API Key */}
          <SettingRow label="API Key" last={false}>
            <View style={s.keyRow}>
              <TextInput
                style={s.keyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Paste your API key"
                placeholderTextColor={C.textDim}
                secureTextEntry={!keyVisible}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setKeyVisible(!keyVisible)} style={s.eyeBtn}>
                <Ionicons name={keyVisible ? 'eye-off' : 'eye'} size={18} color={C.textMid} />
              </TouchableOpacity>
            </View>
          </SettingRow>
          {currentProvider?.keyHint && (
            <Text style={s.keyHint}>💡 {currentProvider.keyHint}</Text>
          )}

          {/* Model */}
          <SettingRow label="Model" last={false}>
            <TextInput
              style={s.inlineInput}
              value={model}
              onChangeText={setModel}
              placeholder="Model name"
              placeholderTextColor={C.textDim}
              autoCapitalize="none"
            />
          </SettingRow>

          {/* Quick model select */}
          {modelList.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.modelScroll}>
              {modelList.map((m) => (
                <TouchableOpacity key={m} onPress={() => setModel(m)}
                  style={[s.modelChip, model === m && s.modelChipActive]}>
                  <Text style={[s.modelChipText, model === m && s.modelChipTextActive]}>
                    {m.split('-').slice(0, 3).join('-')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Custom endpoint (always show for custom, hide for others) */}
          {(provider === 'custom') && (
            <SettingRow label="Endpoint URL" last>
              <TextInput
                style={s.inlineInput}
                value={endpoint}
                onChangeText={setEndpoint}
                placeholder="https://..."
                placeholderTextColor={C.textDim}
                autoCapitalize="none"
                keyboardType="url"
              />
            </SettingRow>
          )}
        </View>

        {/* Test result */}
        {testResult ? (
          <View style={[s.testResult, testResult.startsWith('✅') ? s.testOk : s.testFail]}>
            <Text style={s.testResultText}>{testResult}</Text>
          </View>
        ) : null}

        {/* Save + Test buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.testBtn} onPress={runTest} disabled={testing}>
            {testing
              ? <ActivityIndicator size="small" color={C.accent} />
              : <Text style={s.testBtnText}>Test Connection</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.white} />
              : <Text style={s.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── About ───────────────────────────────────── */}
        <SectionHeader title="About" icon="information-circle" />
        <View style={s.card}>
          <View style={s.aboutRow}>
            <View style={s.appIconBox}>
              <Text style={s.appIconText}>AX</Text>
            </View>
            <View style={s.flex}>
              <Text style={s.appName}>AttendX</Text>
              <Text style={s.appVer}>v1.0.0 · Fully offline</Text>
              <Text style={s.appDesc}>Your data stays on your device. No server. No account.</Text>
            </View>
          </View>
        </View>

        {/* ── Danger Zone ─────────────────────────────── */}
        <SectionHeader title="Data" icon="warning" color={C.danger} />
        <View style={s.card}>
          <TouchableOpacity style={s.dangerRow} onPress={confirmClear}>
            <Ionicons name="trash-outline" size={20} color={C.danger} />
            <View style={s.flex}>
              <Text style={s.dangerLabel}>Clear All Data</Text>
              <Text style={s.dangerHint}>Deletes all subjects, attendance, tasks, timetable</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, icon, color }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon} size={15} color={color || C.accent} />
      <Text style={[s.sectionTitle, color && { color }]}>{title}</Text>
    </View>
  );
}

function SettingRow({ label, children, last }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowValue}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', color: C.text, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: C.accent, letterSpacing: 1, textTransform: 'uppercase' },

  card: { backgroundColor: C.card, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border },

  row: { paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 14, color: C.textMid, fontWeight: '600', marginBottom: 8 },
  rowValue: {},

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.cardAlt, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  pickerText: { color: C.text, fontSize: 14, fontWeight: '600' },

  dropdown: { backgroundColor: C.cardAlt, marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginBottom: 4 },
  dropItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  dropItemActive: { backgroundColor: C.accentDim },
  dropText: { fontSize: 14, color: C.textMid },
  dropTextActive: { color: C.accentLight, fontWeight: '700' },

  keyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardAlt, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  keyInput: { flex: 1, padding: 12, color: C.text, fontSize: 14, fontFamily: 'monospace' },
  eyeBtn: { padding: 12 },
  keyHint: { fontSize: 12, color: C.textDim, paddingHorizontal: 16, paddingBottom: 10, marginTop: -4 },

  inlineInput: {
    backgroundColor: C.cardAlt, borderRadius: 10, padding: 12, color: C.text,
    fontSize: 14, borderWidth: 1, borderColor: C.border,
  },

  modelScroll: { paddingHorizontal: 16, paddingBottom: 14 },
  modelChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginRight: 8,
  },
  modelChipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  modelChipText: { fontSize: 12, color: C.textDim, fontWeight: '600' },
  modelChipTextActive: { color: C.accentLight },

  testResult: { marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12 },
  testOk: { backgroundColor: C.successDim },
  testFail: { backgroundColor: C.dangerDim },
  testResultText: { color: C.text, fontSize: 13 },

  btnRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 12 },
  testBtn: {
    flex: 1, padding: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.accent,
  },
  testBtnText: { color: C.accent, fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 1, backgroundColor: C.accent, padding: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  appIconBox: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: C.accentDim,
    justifyContent: 'center', alignItems: 'center',
  },
  appIconText: { color: C.accentLight, fontSize: 20, fontWeight: '900' },
  appName: { fontSize: 17, fontWeight: '800', color: C.text },
  appVer: { fontSize: 12, color: C.textMid, marginTop: 2 },
  appDesc: { fontSize: 12, color: C.textDim, marginTop: 4, lineHeight: 16 },

  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 0,
  },
  dangerLabel: { fontSize: 15, fontWeight: '600', color: C.danger },
  dangerHint: { fontSize: 12, color: C.textDim, marginTop: 2 },
});
