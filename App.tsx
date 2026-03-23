// ⚠️ react-native-get-random-values MUST be the first import.
import 'react-native-get-random-values';

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFonts, Orbitron_700Bold, Orbitron_900Black } from '@expo-google-fonts/orbitron';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani';
import { useFont, Canvas, Path, Skia } from '@shopify/react-native-skia';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './src/firebase/config';
import { loadGameData, loadCardRoster, PersistedGameData } from './src/hooks/useFirebase';
import { ALL_CARDS, Card } from './src/data/cards';

import AuthScreen            from './src/screens/AuthScreen';
import HomeScreen            from './src/screens/HomeScreen';
import PackOpeningScreen     from './src/screens/PackOpeningScreen';
import CollectionScreen      from './src/screens/CollectionScreen';
import CardDetailScreen      from './src/screens/CardDetailScreen';
import BattleLobbyScreen     from './src/screens/BattleLobbyScreen';
import BattleScreen          from './src/screens/BattleScreen';
import StoreScreen           from './src/screens/StoreScreen';
import ProfileScreen         from './src/screens/ProfileScreen';
import CareerScreen          from './src/screens/CareerScreen';
import DecksScreen           from './src/screens/DecksScreen';

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
  CollectionTab: undefined;
  DecksTab:      undefined;
  HomeTab:       undefined;
  StoreTab:      undefined;
  CareerTab:     undefined;
};

export type HomeStackParamList = {
  Home:        undefined;
  PackOpening: undefined;
  BattleLobby: undefined;
  Battle:      { playerDeck: number[]; tier: number; resume?: any };
  Profile:     undefined;
};

export type CollectionStackParamList = {
  Collection: undefined;
  CardDetail: { cardId: number; owned: boolean; ownedCount: number };
};

// BattleStackParamList kept as alias for screens that import it
export type BattleStackParamList  = {
  BattleLobby: undefined;
  Battle: { playerDeck: number[]; tier: number; resume?: any };
};
export type StoreStackParamList   = { Store:        undefined };
export type ProfileStackParamList = { Profile:      undefined };

// ── Navigators ────────────────────────────────────────────────────────────────
const RootStack        = createNativeStackNavigator<RootStackParamList>();
const Tab              = createBottomTabNavigator<MainTabParamList>();
const HomeStack        = createNativeStackNavigator<HomeStackParamList>();
const CollectionStack  = createNativeStackNavigator<CollectionStackParamList>();

// Font asset paths for Skia
const orbitronBoldTtf  = require('./assets/fonts/Orbitron_700Bold.ttf');
const orbitronBlackTtf = require('./assets/fonts/Orbitron_900Black.ttf');
const rajdhaniSemiTtf  = require('./assets/fonts/Rajdhani_600SemiBold.ttf');

// ── Custom tab bar ───────────────────────────────────────────────────────────
const TAB_ICON_MAP: (keyof typeof MaterialCommunityIcons.glyphMap)[] = [
  'view-grid',      // Collection
  'cards-outline',  // Decks
  'home',           // Home (center)
  'store',          // Store
  'trophy',         // Career
];

const CENTER_INDEX = 2;
const HEX_SIZE     = 44;
const CENTER_W     = 62;
const CENTER_H     = 74;
const BAR_H        = 70;
const CURVE_RISE   = 18; // how much the sides curve up
const BAR_TOTAL    = BAR_H + CURVE_RISE; // visible bar height
const SCREEN_W     = Dimensions.get('window').width;

// Vertical position for each icon — follows the curved arc
// Outer icons sit higher on the curve, center at bottom
const TAB_BOTTOM   = [22, 14, 8, 14, 22];

// Build the curved bar background path — drawn within the bar area (BAR_H + CURVE_RISE)
function makeBarPath(w: number): string {
  const h = BAR_H + CURVE_RISE;
  const cx = w / 2;
  return `M 0 0 Q ${cx} ${CURVE_RISE + 12} ${w} 0 L ${w} ${h} L 0 ${h} Z`;
}

// Separate stroke path — just the curve line
function makeStrokePath(w: number): string {
  const cx = w / 2;
  return `M 0 0 Q ${cx} ${CURVE_RISE + 12} ${w} 0`;
}

const barFillPath = Skia.Path.MakeFromSVGString(makeBarPath(SCREEN_W))!;
const barStrokePath = Skia.Path.MakeFromSVGString(makeStrokePath(SCREEN_W))!;

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Hide tab bar during Battle screen
  const homeRoute = state.routes.find(r => r.name === 'HomeTab');
  if (homeRoute) {
    const homeState = homeRoute.state;
    if (homeState) {
      const currentRoute = homeState.routes[homeState.index ?? 0];
      if (currentRoute?.name === 'Battle') return null;
    }
  }

  return (
    <View style={tabStyles.outer}>
      {/* Skia curved background */}
      <Canvas style={tabStyles.canvas} pointerEvents="none">
        <Path path={barFillPath} color="#08081a" />
        <Path path={barStrokePath} color="#14142a" style="stroke" strokeWidth={1} />
      </Canvas>

      {/* Tab buttons */}
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const focused    = state.index === index;
          const isCenter   = index === CENTER_INDEX;
          const iconName   = TAB_ICON_MAP[index] ?? 'help-circle';
          const iconSize   = isCenter ? 32 : 24;
          const bottom     = TAB_BOTTOM[index] ?? 8;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.7}
              onPress={onPress}
              style={[tabStyles.tabBtn, { paddingBottom: bottom }]}
            >
              <View style={[
                isCenter ? tabStyles.centerHex : tabStyles.hex,
                focused && (isCenter ? tabStyles.centerHexActive : tabStyles.hexActive),
              ]}>
                <MaterialCommunityIcons
                  name={iconName}
                  size={iconSize}
                  color={focused ? '#4fc3f7' : '#ffffff'}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  outer: {
    height: BAR_TOTAL,
    position: 'relative',
    overflow: 'visible',
  },
  canvas: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flex: 1,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  // Regular hex icon container
  hex: {
    width: HEX_SIZE,
    height: HEX_SIZE,
    borderRadius: HEX_SIZE * 0.28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12122a',
    borderWidth: 1.5,
    borderColor: '#1e1e3a',
  },
  hexActive: {
    backgroundColor: '#4fc3f718',
    borderColor: '#4fc3f7',
    shadowColor: '#4fc3f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  // Center button — taller shape
  centerHex: {
    width: CENTER_W,
    height: CENTER_H,
    borderRadius: CENTER_W * 0.24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12122a',
    borderWidth: 2,
    borderColor: '#1e1e3a',
  },
  centerHexActive: {
    backgroundColor: '#4fc3f718',
    borderColor: '#4fc3f7',
    shadowColor: '#4fc3f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
});

// ── Nested stack navigators ───────────────────────────────────────────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home"        component={HomeScreen} />
      <HomeStack.Screen name="PackOpening" component={PackOpeningScreen} />
      <HomeStack.Screen name="BattleLobby" component={BattleLobbyScreen} />
      <HomeStack.Screen
        name="Battle"
        component={BattleScreen}
        options={{ gestureEnabled: false }}
      />
      <HomeStack.Screen name="Profile"     component={ProfileScreen} />
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

// ── Main tab navigator ────────────────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      sceneContainerStyle={{ backgroundColor: '#08081a' }}
    >
      <Tab.Screen name="CollectionTab" component={CollectionStackNav} />
      <Tab.Screen name="DecksTab"      component={DecksScreen} />
      <Tab.Screen name="HomeTab"       component={HomeStackNav} />
      <Tab.Screen name="StoreTab"      component={StoreScreen} />
      <Tab.Screen name="CareerTab"     component={CareerScreen} />
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
function GameStateProvider({ uid, initialData, cardRoster, children }: { uid: string; initialData: PersistedGameData | null; cardRoster: Card[]; children: React.ReactNode }) {
  const gs = useGameState(uid, initialData, cardRoster);
  return <GameStateContext.Provider value={gs}>{children}</GameStateContext.Provider>;
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [authReady, setAuthReady]   = useState(false);
  const [session, setSession]       = useState<{ uid: string; username: string } | null>(null);
  const [gameData, setGameData]     = useState<PersistedGameData | null>(null);
  const [cardRoster, setCardRoster] = useState<Card[]>(ALL_CARDS);

  const [fontsLoaded] = useFonts({ Orbitron_700Bold, Orbitron_900Black, Rajdhani_600SemiBold });

  const fontName      = useFont(orbitronBoldTtf,  17);
  const fontNumber    = useFont(orbitronBoldTtf,  10);
  const fontStatLabel = useFont(orbitronBoldTtf,  10);
  const fontStatValue = useFont(orbitronBoldTtf,  11);
  const fontTotal     = useFont(orbitronBlackTtf, 15);
  const fontSmall     = useFont(rajdhaniSemiTtf,  11);
  const fontCardTitle = useFont(orbitronBoldTtf,  13);
  const fontCardSub   = useFont(orbitronBoldTtf,  10);

  // Load card roster once at startup (Firestore with ALL_CARDS fallback)
  useEffect(() => {
    loadCardRoster().then(setCardRoster);
  }, []);

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
          <GameStateProvider key={session?.uid ?? ''} uid={session?.uid ?? ''} initialData={gameData} cardRoster={cardRoster}>
          <NavigationContainer theme={{ dark: true, colors: { primary: '#4fc3f7', background: '#08081a', card: '#08081a', text: '#ffffff', border: '#1e1e3a', notification: '#4fc3f7' } }}>
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
