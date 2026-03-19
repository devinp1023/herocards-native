// ⚠️ react-native-get-random-values MUST be the first import.
// It patches the global crypto.getRandomValues() required by the Firebase Web SDK.
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani';
import { useFont } from '@shopify/react-native-skia';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/config';
import AuthScreen from './src/screens/AuthScreen';
import CollectionScreen from './src/screens/CollectionScreen';
import CardDetailScreen from './src/screens/CardDetailScreen';
import { FontContext } from './src/context/FontContext';

// ── Navigation types ──────────────────────────────────────────────────
export type RootStackParamList = {
  Auth:       undefined;
  Main:       { uid: string; username: string };
  CardDetail: { cardId: number; owned: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Font asset requires — Skia useFont() reads raw .ttf files
const orbitronBoldTtf  = require('./assets/fonts/Orbitron_700Bold.ttf');
const orbitronBlackTtf = require('./assets/fonts/Orbitron_900Black.ttf');
const rajdhaniSemiTtf  = require('./assets/fonts/Rajdhani_600SemiBold.ttf');

// ── App ──────────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession]     = useState<{ uid: string; username: string } | null>(null);
  const [godMode, setGodMode]     = useState(false);

  // expo-font — for native Text components throughout the app
  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black, Rajdhani_600SemiBold });

  // Skia fonts — loaded once at root, shared via FontContext.
  // useFont() returns null until decoded; HeroCard/FaceDownCard guard on null.
  const fontName      = useFont(orbitronBoldTtf,  17);
  const fontNumber    = useFont(orbitronBoldTtf,  10);
  const fontStatLabel = useFont(orbitronBoldTtf,  10);
  const fontStatValue = useFont(orbitronBoldTtf,  11);
  const fontTotal     = useFont(orbitronBlackTtf, 15);
  const fontSmall     = useFont(rajdhaniSemiTtf,  11);
  const fontCardTitle = useFont(orbitronBoldTtf,  13);
  const fontCardSub   = useFont(orbitronBoldTtf,  10);

  // Firebase auth listener — restores session on app reopen
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as { username: string };
            setSession({ uid: user.uid, username: data.username });
          } else {
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

  if (!fontsLoaded || !authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#060610', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#4fc3f7" size="large" />
      </View>
    );
  }

  const handleLogin = (uid: string, username: string) => setSession({ uid, username });
  const handleEnterGodMode = () => setSession({ uid: '__god__', username: 'GOD' });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FontContext.Provider value={{
        fontName, fontNumber, fontStatLabel, fontStatValue,
        fontTotal, fontSmall, fontCardTitle, fontCardSub,
      }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!session ? (
              <Stack.Screen name="Auth">
                {() => (
                  <AuthScreen
                    onLogin={handleLogin}
                    godMode={godMode}
                    onToggleGodMode={() => { if (!godMode) handleEnterGodMode(); else setGodMode(false); }}
                    onEnterGodMode={handleEnterGodMode}
                  />
                )}
              </Stack.Screen>
            ) : (
              <>
                <Stack.Screen
                  name="Main"
                  component={CollectionScreen}
                  initialParams={{ uid: session.uid, username: session.username }}
                />
                <Stack.Screen name="CardDetail" component={CardDetailScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </FontContext.Provider>
    </GestureHandlerRootView>
  );
}
