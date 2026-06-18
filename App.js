import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDB } from './src/db/database';
import AppNavigator from './src/navigation';
import { C } from './src/constants/colors';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    initDB()
      .then(() => setReady(true))
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>DB Error: {error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={s.center}>
        <Text style={s.brand}>AttendX</Text>
        <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.bg} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.bg,
  },
  brand: {
    fontSize: 36, fontWeight: '900', color: C.accent,
    letterSpacing: 2,
  },
  errorText: { color: C.danger, fontSize: 14, textAlign: 'center', padding: 20 },
});
