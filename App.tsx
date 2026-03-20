// ⚠️ react-native-get-random-values MUST be the first import.
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani';
import { useFont } from '@shopify/react-native-skia';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/config';
import { loadGameData, PersistedGameData } from './src/hooks/useFirebase';

import AuthScreen            from './src/screens/AuthScreen';
import HomeScreen            from './src/screens/HomeScreen';
import PackOpeningScreen     from './src/screens/PackOpeningScreen';
import CollectionScreen      from './src/screens/CollectionScreen';
import CardDetailScreen      from './src/screens/CardDetailScreen';
import BattleLobbyScreen     from './src/screens/BattleLobbyScreen';
import BattleScreen          from './src/screens/BattleScreen';
import StoreScreen           from './src/screens/StoreScreen';
import ProfileScreen         from './src/screens/ProfileScreen';

import { FontContext }        from './src/context/FontContext';
import { SessionContext }     from './src/context/SessionContext';
import { GameStateContext }   from './src/context/GameStateContext';
import { useGameStateContext } from './src/context/GameStateContext';
import { useGameState }       from './src/hooks/useGameState';
import { AchievementPopup }  from './src/components/AchievementPopup';

// ── Navigation param lists ────────────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  HomeTab:       undefined;
  CollectionTab: undefined;
  BattleTab:     undefined;
  StoreTab:      undefined;
  ProfileTab:    undefined;
};

export type HomeStackParamList = {
  Home:        undefined;
  PackOpening: undefined;  // Session 7
};

export type CollectionStackParamList = {
  Collection: undefined;
  CardDetail: { cardId: number; owned: boolean; ownedCount: number };
};

export type BattleStackParamList  = {
  BattleLobby: undefined;
  Battle: { playerDeck: number[]; tier: number };
};
export type StoreStackParamList   = { Store:        undefined };
export type ProfileStackParamList = { Profile:      undefined };

// ── Navigators ────────────────────────────────────────────────────────────────
const RootStack        = createNativeStackNavigator<RootStackParamList>();
const Tab              = createBottomTabNavigator<MainTabParamList>();
const HomeStack        = createNativeStackNavigator<HomeStackParamList>();
const CollectionStack  = createNativeStackNavigator<CollectionStackParamList>();
const BattleStack      = createNativeStackNavigator<BattleStackParamList>();

// Font asset paths for Skia
const orbitronBoldTtf  = require('./assets/fonts/Orbitron_700Bold.ttf');
const orbitronBlackTtf = require('./assets/fonts/Orbitron_900Black.ttf');
const rajdhaniSemiTtf  = require('./assets/fonts/Rajdhani_600SemiBold.ttf');

// ── Tab bar helpers ───────────────────────────────────────────────────────────
// Emoji are unreliable with Hermes + custom fonts — use styled letter icons.
const TAB_ICONS: Record<string, string> = {
  HOME: 'H', CARDS: 'C', BATTLE: 'B', STORE: 'S', PROFILE: 'P',
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const letter = TAB_ICONS[label] ?? label[0];
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 8,
      backgroundColor: focused ? '#4fc3f722' : 'transparent',
      borderWidth: focused ? 1 : 0,
      borderColor: '#4fc3f7',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        fontFamily: 'Orbitron_900Black',
        fontSize: 11,
        color: focused ? '#4fc3f7' : '#404458',
      }}>{letter}</Text>
    </View>
  );
}
function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{
      fontFamily: 'Orbitron_700Bold',
      fontSize: 7,
      letterSpacing: 0.5,
      marginTop: 2,
      color: focused ? '#4fc3f7' : '#404458',
    }}>
      {label}
    </Text>
  );
}

// ── Nested stack navigators ───────────────────────────────────────────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home"        component={HomeScreen} />
      <HomeStack.Screen name="PackOpening" component={PackOpeningScreen} />
    </HomeStack.Navigator>
  );
}

function CollectionStackNav() {
  return (
    <CollectionStack.Navigator screenOptions={{ headerShown: false }}>
      <CollectionStack.Screen name="Collection" component={CollectionScreen} />
      <CollectionStack.Screen name="CardDetail"  component={CardDetailScreen} />
    </CollectionStack.Navigator>
  );
}

function BattleStackNav() {
  return (
    <BattleStack.Navigator screenOptions={{ headerShown: false }}>
      <BattleStack.Screen name="BattleLobby" component={BattleLobbyScreen} />
      <BattleStack.Screen name="Battle" component={BattleScreen} options={{ gestureEnabled: false }} />
    </BattleStack.Navigator>
  );
}

// ── Main tab navigator ────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#08081a',
          borderTopColor: '#14142a',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        // No tabBarLabelStyle here — fontFamily at navigator level propagates
        // into screen content and breaks all emoji. Labels use per-tab render fns.
        tabBarActiveTintColor:   '#4fc3f7',
        tabBarInactiveTintColor: '#404458',
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNav}
        options={{
          tabBarIcon:  ({ focused }) => <TabIcon  label="HOME"    focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="HOME"    focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CollectionTab"
        component={CollectionStackNav}
        options={{
          tabBarIcon:  ({ focused }) => <TabIcon  label="CARDS"   focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="CARDS"   focused={focused} />,
        }}
      />
      <Tab.Screen
        name="BattleTab"
        component={BattleStackNav}
        options={{
          tabBarIcon:  ({ focused }) => <TabIcon  label="BATTLE"  focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="BATTLE"  focused={focused} />,
        }}
      />
      <Tab.Screen
        name="StoreTab"
        component={StoreScreen}
        options={{
          tabBarIcon:  ({ focused }) => <TabIcon  label="STORE"   focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="STORE"   focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon:  ({ focused }) => <TabIcon  label="PROFILE" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label="PROFILE" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── AchievementOverlay — renders inside GameStateContext so it can read state ─
function AchievementOverlay() {
  const gs = useGameStateContext();
  const pending = gs.pendingAchievements[0] ?? null;
  return (
    <AchievementPopup
      achievement={pending}
      onDismiss={gs.dismissAchievement}
    />
  );
}

// ── GameStateProvider — owns the single shared GameState instance ─────────────
// Placed above NavigationContainer so all screens share one instance.
// key={uid} causes a clean remount (and re-init of useState) when uid changes,
// which correctly handles switching between god mode and regular accounts.
function GameStateProvider({ uid, initialData, children }: { uid: string; initialData: PersistedGameData | null; children: React.ReactNode }) {
  const gs = useGameState(uid, initialData);
  return <GameStateContext.Provider value={gs}>{children}</GameStateContext.Provider>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession]     = useState<{ uid: string; username: string } | null>(null);
  const [gameData, setGameData]   = useState<PersistedGameData | null>(null);

  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black, Rajdhani_600SemiBold });

  const fontName      = useFont(orbitronBoldTtf,  17);
  const fontNumber    = useFont(orbitronBoldTtf,  10);
  const fontStatLabel = useFont(orbitronBoldTtf,  10);
  const fontStatValue = useFont(orbitronBoldTtf,  11);
  const fontTotal     = useFont(orbitronBlackTtf, 15);
  const fontSmall     = useFont(rajdhaniSemiTtf,  11);
  const fontCardTitle = useFont(orbitronBoldTtf,  13);
  const fontCardSub   = useFont(orbitronBoldTtf,  10);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            const data = snap.data() as { username: string };
            // Load saved game state alongside the user profile
            const saved = await loadGameData(user.uid);
            setGameData(saved);
            setSession({ uid: user.uid, username: data.username });
          } else {
            signOut(auth);
          }
        } catch {
          signOut(auth);
        }
      } else {
        setSession(null);
        setGameData(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  if (!fontsLoaded || !authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#010004', alignItems: 'center', justifyContent: 'center' }}>
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
        <SessionContext.Provider value={session ? { ...session, logout: () => { signOut(auth); setSession(null); } } : { uid: '', username: '', logout: () => {} }}>
          <GameStateProvider key={session?.uid ?? ''} uid={session?.uid ?? ''} initialData={gameData}>
          <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              {!session ? (
                <RootStack.Screen name="Auth">
                  {() => (
                    <AuthScreen
                      onLogin={handleLogin}
                      godMode={false}
                      onToggleGodMode={handleEnterGodMode}
                      onEnterGodMode={handleEnterGodMode}
                    />
                  )}
                </RootStack.Screen>
              ) : (
                <RootStack.Screen name="Main" component={MainTabs} />
              )}
            </RootStack.Navigator>
          </NavigationContainer>
          {/* Global achievement toast — rendered on top of all navigation */}
          {session && <AchievementOverlay />}
          </GameStateProvider>
        </SessionContext.Provider>
      </FontContext.Provider>
    </GestureHandlerRootView>
  );
}
