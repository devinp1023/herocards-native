// LevelUpToast — slide-up toast for level-ups outside of battle.
// Rendered as a global overlay in App.tsx, suppressed during battle
// (BattleScreen has its own full-screen level-up overlay).

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GradientBorder, BORDER_COLORS } from './GradientBorder';
import { T } from '../theme/theme';

const DISPLAY_MS  = 3000;
const SLIDE_IN_MS = 380;
const FADE_OUT_MS = 280;

interface Props {
  levelUpInfo: { oldLevel: number; newLevel: number } | null;
  onDismiss: () => void;
  suppressed?: boolean;
}

export function LevelUpToast({ levelUpInfo, onDismiss, suppressed = false }: Props) {
  const translateY = useSharedValue(100);
  const opacity    = useSharedValue(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.out(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDismiss)(); },
    );
    translateY.value = withTiming(100, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
  };

  useEffect(() => {
    if (!levelUpInfo || suppressed) return;

    // Slide in
    translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    opacity.value    = withTiming(1, { duration: SLIDE_IN_MS });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-dismiss
    timerRef.current = setTimeout(dismiss, DISPLAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [levelUpInfo?.newLevel, suppressed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!levelUpInfo || suppressed) return null;

  return (
    <Animated.View style={[s.container, animStyle]}>
      <GradientBorder
        colors={BORDER_COLORS.violet}
        borderRadius={16}
        innerBackground="#0d0d20"
      >
        <View style={s.toast}>
          <View style={s.strip} />
          <View style={s.badge}>
            <Text style={s.arrow}>▲</Text>
          </View>
          <View style={s.textBlock}>
            <Text style={s.label}>LEVEL UP</Text>
            <Text style={s.level}>LEVEL {levelUpInfo.newLevel}</Text>
          </View>
        </View>
      </GradientBorder>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 76,
    left: 16,
    right: 16,
    zIndex: 9999,
    shadowColor: T.accent.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 16,
    paddingVertical: 12,
  },
  strip: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: T.accent.violet,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.accent.violet + '66',
    backgroundColor: T.accent.violet + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 18,
    color: T.accent.violet,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xs,
    color: T.accent.violet,
    letterSpacing: T.letterSpacing.lg,
  },
  level: {
    fontFamily: 'Orbitron_900Black',
    fontSize: T.font.xl,
    color: T.accent.gold,
    letterSpacing: T.letterSpacing.md,
  },
});
