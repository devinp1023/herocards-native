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
import { useFont, Canvas, Path, Skia, LinearGradient, vec, Rect } from '@shopify/react-native-skia';
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

// Notch dimensions — gap around center button
const NOTCH_PAD    = 14;             // padding around button on each side
const NOTCH_HALF   = CENTER_W / 2 + NOTCH_PAD;  // half-width of notch
const NOTCH_RISE   = 10;             // how far above the bar top the notch extends
const NOTCH_R      = 14;             // corner radius at notch top
const CANVAS_PAD   = NOTCH_RISE + 4; // extra canvas height above bar for notch

// Build a curve path with a smooth notch around the center button
// All Y values are offset by CANVAS_PAD so they stay in positive canvas space
function makeNotchPath(w: number): string {
  const cx = w / 2;
  const notchL = cx - NOTCH_HALF;
  const notchR = cx + NOTCH_HALF;
  const t = notchL / w;
  const curveY = CANVAS_PAD + 2 * t * (1 - t) * (CURVE_RISE + 8);
  const topY = CANVAS_PAD - NOTCH_RISE; // top of notch in canvas space
  const sideY = CANVAS_PAD; // where sides sit (y=0 of bar, shifted by pad)

  return [
    `M 0 ${sideY}`,
    `Q ${notchL * 0.55} ${sideY + curveY * 0.15} ${notchL} ${curveY}`,
    `C ${notchL} ${topY + NOTCH_R * 2} ${cx - NOTCH_HALF + NOTCH_R} ${topY} ${cx - NOTCH_R} ${topY}`,
    `L ${cx + NOTCH_R} ${topY}`,
    `C ${cx + NOTCH_HALF - NOTCH_R} ${topY} ${notchR} ${topY + NOTCH_R * 2} ${notchR} ${curveY}`,
    `Q ${notchR + (w - notchR) * 0.45} ${sideY + curveY * 0.15} ${w} ${sideY}`,
  ].join(' ');
}

// Fill path: notch curve + fill down to bottom
function makeBarPath(w: number): string {
  const h = BAR_TOTAL + CANVAS_PAD;
  return `${makeNotchPath(w)} L ${w} ${h} L 0 ${h} Z`;
}

// Top curve stroke (bright cyan)
function makeTopStrokePath(w: number): string {
  return makeNotchPath(w);
}

// Notch wall strokes — octagonal shape (dimmer)
function makeWallStrokePath(w: number): string {
  const cx = w / 2;
  const notchL = cx - NOTCH_HALF;
  const notchR = cx + NOTCH_HALF;
  const t = notchL / w;
  const curveY = CANVAS_PAD + 2 * t * (1 - t) * (CURVE_RISE + 8);
  const barBottom = CANVAS_PAD + BAR_TOTAL;
  const inset = 14;
  const cornerY = barBottom - 18;
  return `M ${notchL} ${curveY} L ${notchL} ${cornerY} L ${notchL + inset} ${barBottom} M ${notchR} ${curveY} L ${notchR} ${cornerY} L ${notchR - inset} ${barBottom}`;
}

const barFillPath = Skia.Path.MakeFromSVGString(makeBarPath(SCREEN_W))!;
const topStrokePath = Skia.Path.MakeFromSVGString(makeTopStrokePath(SCREEN_W))!;
const wallStrokePath = Skia.Path.MakeFromSVGString(makeWallStrokePath(SCREEN_W))!;

// Build angled divider lines between tabs (drawn in canvas space with CANVAS_PAD offset)
function makeDividerPaths(w: number): string[] {
  const tabW = w / 5;
  const paths: string[] = [];
  // Dividers at x = tabW, 2*tabW, 3*tabW, 4*tabW
  // Skip dividers adjacent to center (index 2) — those touch the notch
  const dividerXs = [1, 4]; // between tabs 0-1 and 3-4 (notch walls handle 1-2 and 2-3)
  const barBottom = CANVAS_PAD + BAR_TOTAL;

  for (const i of dividerXs) {
    const x = tabW * i;
    // Calculate slope: the curve dips toward center, so dividers tilt inward
    // Top of divider sits on the curve, bottom at bar bottom
    // Angle the top toward center by a few pixels
    const tiltDir = x < w / 2 ? 1 : -1; // tilt toward center
    const tilt = 6 * tiltDir;
    // Calculate curve Y at this x position so divider starts just below it
    const t = x / w;
    const curveYAtX = CANVAS_PAD + 2 * t * (1 - t) * (CURVE_RISE + 8);
    const topY = curveYAtX; // starts right at the curve line
    paths.push(`M ${x + tilt} ${topY} L ${x} ${barBottom}`);
  }
  return paths;
}

const dividerPathStrs = makeDividerPaths(SCREEN_W);

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
        {/* Gradient bar background — lighter at top, darker at bottom */}
        <Rect x={0} y={0} width={SCREEN_W} height={BAR_TOTAL + CANVAS_PAD}>
          <LinearGradient
            start={vec(0, CANVAS_PAD)}
            end={vec(0, BAR_TOTAL + CANVAS_PAD)}
            colors={['#0e1028', '#08081a']}
          />
        </Rect>
        <Path path={barFillPath}>
          <LinearGradient
            start={vec(0, CANVAS_PAD)}
            end={vec(0, BAR_TOTAL + CANVAS_PAD)}
            colors={['#10102a', '#08081a']}
          />
        </Path>
        <Path path={topStrokePath} color="#4fc3f7" style="stroke" strokeWidth={1.5} />
        <Path path={wallStrokePath} color="#2a7a9a" style="stroke" strokeWidth={1} />
        {/* Outer divider lines — slightly dimmer */}
        {dividerPathStrs.map((d, i) => {
          const p = Skia.Path.MakeFromSVGString(d);
          return p ? <Path key={i} path={p} color="#2a7a9a" style="stroke" strokeWidth={1} /> : null;
        })}
      </Canvas>

      {/* Tab buttons */}
      <View style={tabStyles.bar}>
        {state.routes.map((route, index) => {
          const focused    = state.index === index;
          const isCenter   = index === CENTER_INDEX;
          const iconName   = TAB_ICON_MAP[index] ?? 'help-circle';
          const iconSize   = isCenter ? 38 : 30;
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
    left: 0, right: 0, top: -CANVAS_PAD, bottom: 0,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexActive: {
    shadowColor: '#4fc3f7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  // Center button — taller shape
  centerHex: {
    width: CENTER_W,
    height: CENTER_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerHexActive: {
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
