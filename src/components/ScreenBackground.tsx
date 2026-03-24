/**
 * ScreenBackground — per-screen themed background with gradient + breathing vignette.
 *
 * Each screen has a unique visual temperature defined by:
 * 1. A vertical base gradient (subtle color shift in the dark range)
 * 2. A radial vignette with a breathing opacity animation (5s cycle)
 *
 * Usage:
 *   <ScreenBackground theme="home">
 *     ... screen content ...
 *   </ScreenBackground>
 *
 * The component replaces the screen's root View — it provides flex:1
 * and the background. Remove backgroundColor from the screen's root style.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

// ── Screen theme definitions ────────────────────────────────────────────────

interface ScreenTheme {
  /** Vertical base gradient [top, bottom] */
  gradient: [string, string];
  /** Vignette color (without alpha — alpha is set per-theme via vignetteAlpha) */
  vignetteColor: string;
  /** Hex alpha suffix for the vignette gradient (default '30') — warm colors need higher values to match perceived brightness */
  vignetteAlpha: string;
  /** Radial gradient position for the vignette */
  vignettePosition: 'top-center' | 'top-right' | 'center' | 'bottom-center';
}

const THEMES: Record<string, ScreenTheme> = {
  home: {
    gradient: ['#050a08', '#040810'],
    vignetteColor: '#00FFAA',
    vignetteAlpha: '30',
    vignettePosition: 'top-center',
  },
  career: {
    gradient: ['#060510', '#080614'],
    vignetteColor: '#B14EFF',
    vignetteAlpha: '44',
    vignettePosition: 'center',
  },
  battle: {
    gradient: ['#0a0508', '#100814'],
    vignetteColor: '#FF4757',
    vignetteAlpha: '40',
    vignettePosition: 'bottom-center',
  },
  collection: {
    gradient: ['#050808', '#04080c'],
    vignetteColor: '#00FFAA',
    vignetteAlpha: '30',
    vignettePosition: 'top-right',
  },
  store: {
    gradient: ['#080704', '#0a0806'],
    vignetteColor: '#FFB800',
    vignetteAlpha: '50',
    vignettePosition: 'top-center',
  },
  profile: {
    gradient: ['#050508', '#06070c'],
    vignetteColor: '#ffffff',
    vignetteAlpha: '20',
    vignettePosition: 'top-center',
  },
  // Fallback neutral theme for screens without identity (Auth, Decks, etc.)
  neutral: {
    gradient: ['#050508', '#07070c'],
    vignetteColor: '#ffffff',
    vignetteAlpha: '20',
    vignettePosition: 'top-center',
  },
};

// ── Vignette position styles ────────────────────────────────────────────────

/** Returns LinearGradient start/end points to control where color concentrates */
function getVignetteGradientDirection(position: ScreenTheme['vignettePosition']) {
  switch (position) {
    case 'top-center':
      return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 0.6 } };
    case 'top-right':
      return { start: { x: 0.8, y: 0 }, end: { x: 0.2, y: 0.6 } };
    case 'center':
      return { start: { x: 0.5, y: 0.3 }, end: { x: 0.5, y: 0.8 } };
    case 'bottom-center':
      return { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0.4 } };
  }
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  theme: keyof typeof THEMES;
  children: React.ReactNode;
  /** Additional style applied to the root container */
  style?: any;
}

function ScreenBackgroundInner({ theme, children, style }: Props) {
  const config = THEMES[theme] ?? THEMES.neutral;
  const isFocused = useIsFocused();

  // Breathing vignette animation
  const breathOpacity = useSharedValue(0.3);

  React.useEffect(() => {
    if (isFocused) {
      breathOpacity.value = withRepeat(
        withTiming(0.55, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        -1, // infinite
        true, // reverse
      );
    } else {
      // Pause animation when screen is not focused
      breathOpacity.value = 0.3;
    }
  }, [isFocused, breathOpacity]);

  const vignetteAnimStyle = useAnimatedStyle(() => ({
    opacity: breathOpacity.value,
  }));

  const vignetteDir = getVignetteGradientDirection(config.vignettePosition);

  return (
    <View style={[styles.root, style]}>
      {/* Base gradient */}
      <LinearGradient
        colors={config.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Breathing vignette — full screen, gradient direction controls color placement */}
      <Animated.View
        style={[StyleSheet.absoluteFill, vignetteAnimStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[config.vignetteColor + config.vignetteAlpha, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={vignetteDir.start}
          end={vignetteDir.end}
        />
      </Animated.View>

      {/* Screen content */}
      {children}
    </View>
  );
}

export const ScreenBackground = React.memo(ScreenBackgroundInner);

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
