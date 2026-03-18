// ⚠️ react-native-get-random-values MUST be the first import.
// It patches the global crypto.getRandomValues() required by the Firebase Web SDK.
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/config';
import AuthScreen from './src/screens/AuthScreen';

// ── Types ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: { uid: string; username: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Placeholder main screen (replaced each session) ─────────────────
function MainScreen({ route }: any) {
  const { username } = route.params as { username: string };
  return (
    <View style={ph.root}>
      <Text style={ph.emoji}>🦸</Text>
      <Text style={ph.title}>Welcome, {username}!</Text>
      <Text style={ph.sub}>Session 2 → HeroCard Skia coming next</Text>
    </View>
  );
}

const ph = StyleSheet.create({
  root:  { flex:1, backgroundColor:'#060610', alignItems:'center', justifyContent:'center', gap:16 },
  emoji: { fontSize:64 },
  title: { fontSize:22, color:'#4fc3f7', fontFamily:'monospace', fontWeight:'700' },
  sub:   { fontSize:14, color:'#606480', fontFamily:'monospace' },
});

// ── App ──────────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession]     = useState<{ uid: string; username: string } | null>(null);
  const [godMode, setGodMode]     = useState(false);

  // Load fonts (expo-font — for native Text components throughout the app;
  // Skia useFont() will reference the same .ttf files via require() in Session 2)
  const [fontsLoaded] = useFonts({
    Orbitron_700Bold,
    Orbitron_900Black,
    Rajdhani_600SemiBold,
  });

  // Firebase auth state listener — restores session on app reopen
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as { username: string };
            setSession({ uid: user.uid, username: data.username });
          } else {
            // Auth record exists but no Firestore doc — sign out to stay consistent
            auth.signOut();
          }
        } catch {
          auth.signOut();
        }
      } else {
        setSession(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Hold at splash until fonts + auth both resolved
  if (!fontsLoaded || !authReady) {
    return (
      <View style={{ flex:1, backgroundColor:'#060610', alignItems:'center', justifyContent:'center' }}>
        <ActivityIndicator color="#4fc3f7" size="large" />
      </View>
    );
  }

  const handleLogin = (uid: string, username: string) => setSession({ uid, username });
  const handleEnterGodMode = () => setSession({ uid: '__god__', username: 'GOD' });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Auth">
            {() => (
              <AuthScreen
                onLogin={handleLogin}
                godMode={godMode}
                onToggleGodMode={() => setGodMode(g => !g)}
                onEnterGodMode={handleEnterGodMode}
              />
            )}
          </Stack.Screen>
        ) : (
          <Stack.Screen
            name="Main"
            component={MainScreen}
            initialParams={{ uid: session.uid, username: session.username }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
