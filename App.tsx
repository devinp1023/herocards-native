// ⚠️ react-native-get-random-values MUST be the first import.
import 'react-native-get-random-values';

import React, { useState, useEffect, useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { View, Text, Image, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
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
import { FAMILY_CATEGORY_MAP } from './src/data/achievements';
import { ACHIEVEMENT_CATEGORIES } from './src/data/constants';
import { T } from './src/theme/theme';

// Navigation ref for global navigation (e.g. toast → Career tab)
const navigationRef = createNavigationContainerRef<RootStackParamList>();

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
  CareerTab:     { initialPage?: number } | undefined;
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
  'home',           // Home (center) — fallback
  'store',          // Store
  'trophy',         // Career
];

// SVG path data for custom icons (rendered via Skia Path) — keyed by tab index
const HOME_SVG_PATH = "M523.180 352.756 C 527.219 355.056,551.116 376.332,616.922 436.216 L 626.500 444.932 627.000 417.014 C 627.376 396.001,627.821 388.776,628.799 387.798 C 629.798 386.799,637.645 386.434,662.865 386.212 C 694.913 385.930,695.692 385.970,698.317 388.034 L 701.000 390.145 701.000 450.587 L 701.000 511.029 704.250 514.545 C 706.038 516.479,723.457 532.560,742.960 550.281 C 782.418 586.133,783.153 587.008,783.829 598.975 C 784.305 607.410,781.745 613.246,774.847 619.448 C 765.816 627.567,753.504 627.858,743.175 620.195 C 737.650 616.097,715.221 595.874,596.846 488.261 C 552.487 447.934,515.127 414.101,513.825 413.077 L 511.456 411.214 495.906 425.357 C 487.354 433.136,470.473 448.500,458.394 459.500 C 446.315 470.500,424.747 490.100,410.466 503.055 C 396.185 516.011,379.100 531.555,372.500 537.599 C 306.593 597.947,280.066 621.532,276.025 623.371 C 270.028 626.102,260.009 626.177,254.597 623.533 C 249.291 620.942,244.810 616.255,242.077 610.440 C 239.117 604.142,239.457 594.759,242.903 587.676 C 245.223 582.908,258.682 570.234,326.984 508.500 C 358.376 480.127,364.637 474.448,385.540 455.390 C 397.068 444.880,419.550 424.440,435.500 409.967 C 451.450 395.494,471.394 377.318,479.821 369.576 C 495.445 355.221,500.665 351.346,506.314 349.913 C 511.304 348.646,517.923 349.762,523.180 352.756 M520.846 452.750 C 524.459 455.913,533.313 463.900,540.523 470.500 C 547.733 477.100,561.927 489.965,572.066 499.089 C 582.205 508.214,607.115 530.714,627.423 549.089 C 647.730 567.465,674.730 591.867,687.423 603.315 C 700.115 614.763,711.708 625.925,713.185 628.118 C 714.821 630.550,716.109 634.135,716.484 637.303 C 716.822 640.161,716.964 685.177,716.799 737.337 L 716.500 832.174 713.694 834.587 L 710.888 837.000 643.944 837.000 C 578.333 837.000,576.960 836.960,575.000 835.000 C 573.034 833.034,573.000 831.666,572.998 753.750 C 572.997 680.277,572.869 674.250,571.248 671.071 C 570.287 669.185,568.229 666.710,566.676 665.571 C 563.907 663.539,562.868 663.500,512.176 663.500 L 460.500 663.500 457.364 665.737 C 450.803 670.417,451.000 667.657,451.000 754.964 L 451.000 833.887 448.777 835.443 C 446.820 836.814,438.638 837.000,380.201 837.000 L 313.846 837.000 311.009 834.163 C 309.120 832.274,307.958 829.850,307.533 826.913 C 307.182 824.486,307.031 779.975,307.197 728.000 C 307.545 619.307,306.411 630.351,318.304 619.827 C 325.646 613.330,364.166 578.464,427.402 521.080 C 500.678 454.584,509.325 447.000,511.861 447.000 C 513.376 447.000,516.731 449.147,520.846 452.750";
const TAB_SVG_PATHS: (string | undefined)[] = [
  undefined,        // Collection
  undefined,        // Decks
  HOME_SVG_PATH,    // Home
  undefined,        // Store
  undefined,        // Career
];

// Pre-scale SVG paths for each icon size (center = 50, others = 30)
function scaleSvgPath(pathStr: string, targetSize: number, offsetY = 0) {
  const p = Skia.Path.MakeFromSVGString(pathStr)!;
  const s = targetSize / 1024;
  // Scale then translate: [scaleX, 0, translateX, 0, scaleY, translateY, 0, 0, 1]
  p.transform(Skia.Matrix([s, 0, 0, 0, s, offsetY, 0, 0, 1]));
  return p;
}
const HOME_PATH_50 = scaleSvgPath(HOME_SVG_PATH, 50);
const HOME_PATH_30 = scaleSvgPath(HOME_SVG_PATH, 30);

// Selected state PNG for home (the lightning bolt version looks great at this size)
const HOME_SELECTED_PNG = require('./assets/nav-icons/home-selected.png');

const AnimatedImage = Animated.createAnimatedComponent(Image);

// Animated home icon — crossfades between SVG (unselected) and PNG (selected) with a scale pulse
const AnimatedHomeIcon = React.memo(({ focused, size }: { focused: boolean; size: number }) => {
  const selectedOpacity = useSharedValue(focused ? 1 : 0);
  const unselectedOpacity = useSharedValue(focused ? 0 : 1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const dur = 180;
    const easing = Easing.out(Easing.quad);
    if (focused) {
      // Fade in selected, fade out unselected, pulse scale
      selectedOpacity.value = withTiming(1, { duration: dur, easing });
      unselectedOpacity.value = withTiming(0, { duration: dur, easing });
      scale.value = withSequence(
        withTiming(1.15, { duration: 100, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 120, easing }),
      );
    } else {
      selectedOpacity.value = withTiming(0, { duration: dur, easing });
      unselectedOpacity.value = withTiming(1, { duration: dur, easing });
      scale.value = withSequence(
        withTiming(0.9, { duration: 80, easing }),
        withTiming(1, { duration: 120, easing }),
      );
    }
  }, [focused]);

  const selectedStyle = useAnimatedStyle(() => ({
    opacity: selectedOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  const unselectedStyle = useAnimatedStyle(() => ({
    opacity: unselectedOpacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ width: size, height: size, overflow: 'visible' }}>
      {/* Unselected SVG layer */}
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: size, height: size }, unselectedStyle]}>
        <Canvas style={{ width: size, height: size }}>
          <Path path={HOME_PATH_50} color="#ffffff" />
        </Canvas>
      </Animated.View>
      {/* Selected PNG layer */}
      <Animated.View style={[{ position: 'absolute', bottom: -1, left: -(size * 0.04), width: size * 1.08, height: size * 1.08 }, selectedStyle]}>
        <Image
          source={HOME_SELECTED_PNG}
          style={{ width: size * 1.08, height: size * 1.08 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
});


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
const TAB_BOTTOM   = [22, 14, 16, 14, 22];

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

const CAREER_TAB_INDEX = 4; // CareerTab is the 5th tab (0-indexed)

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const gs = useGameStateContext();
  const uncollectedCount = gs.uncollectedCount;

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
        {/* Gradient bar background — follows curve shape only */}
        <Path path={barFillPath}>
          <LinearGradient
            start={vec(0, CANVAS_PAD)}
            end={vec(0, BAR_TOTAL + CANVAS_PAD)}
            colors={['#10102a', '#08081a']}
          />
        </Path>
        <Path path={topStrokePath} color={T.accent.mint} style="stroke" strokeWidth={1.5} />
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
          const iconSize   = isCenter ? 50 : 30;
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
                {TAB_SVG_PATHS[index] ? (
                  <AnimatedHomeIcon focused={focused} size={iconSize} />
                ) : (
                  <MaterialCommunityIcons
                    name={iconName}
                    size={iconSize}
                    color={focused ? T.accent.mint : '#ffffff'}
                  />
                )}
                {/* Badge for Career tab */}
                {index === CAREER_TAB_INDEX && uncollectedCount > 0 && (
                  <View style={tabStyles.badge}>
                    <Text style={tabStyles.badgeText}>
                      {uncollectedCount > 99 ? '99+' : uncollectedCount}
                    </Text>
                  </View>
                )}
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
    shadowColor: T.accent.mint,
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
    shadowColor: T.accent.mint,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: 'Orbitron_700Bold', fontSize: 8,
    color: '#ffffff', letterSpacing: 0,
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
// Suppresses the toast during active battle (before result screen).
function useIsBattleActive(): boolean {
  const [inBattle, setInBattle] = useState(false);
  useEffect(() => {
    if (!navigationRef.isReady()) return;
    // Check current route on every navigation state change
    const unsubscribe = navigationRef.addListener('state', () => {
      const state = navigationRef.getRootState();
      // Dig into Main → HomeTab → stack routes to find 'Battle'
      const mainRoute = state?.routes?.find((r: any) => r.name === 'Main');
      const tabState = mainRoute?.state;
      const homeRoute = tabState?.routes?.find((r: any) => r.name === 'HomeTab');
      const homeState = homeRoute?.state;
      const currentRoute = homeState?.routes?.[homeState?.index ?? 0];
      setInBattle(currentRoute?.name === 'Battle');
    });
    return unsubscribe;
  }, []);
  return inBattle;
}

function AchievementOverlay() {
  const gs = useGameStateContext();
  const pending = gs.pendingAchievements[0] ?? null;
  const inBattle = useIsBattleActive();

  const handleTap = useCallback(() => {
    if (!pending) return;
    const categoryId = FAMILY_CATEGORY_MAP[pending.family];
    const pageIndex = ACHIEVEMENT_CATEGORIES.findIndex(c => c.id === categoryId);
    // Navigate to Career tab with the correct page
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('Main', { screen: 'CareerTab', params: { initialPage: Math.max(0, pageIndex) } });
    }
  }, [pending]);

  return (
    <AchievementPopup
      achievement={pending}
      onDismiss={gs.dismissAchievement}
      onTap={handleTap}
      suppressed={inBattle}
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
        <ActivityIndicator color={T.accent.mint} size="large" />
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
          <NavigationContainer ref={navigationRef} theme={{ dark: true, colors: { primary: T.accent.mint, background: '#08081a', card: '#08081a', text: '#ffffff', border: '#1e1e3a', notification: T.accent.mint } }}>
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
