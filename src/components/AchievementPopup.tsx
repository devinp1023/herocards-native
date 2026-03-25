// AchievementPopup — slide-up toast for newly earned achievements.
// Rendered as a global overlay in App.tsx.
// Shows the first item in pendingAchievements, auto-dismisses after 3.5s.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Achievement } from '../data/achievements';
import { GradientBorder, BORDER_COLORS } from './GradientBorder';
import { T, glowShadow } from '../theme/theme';

const DISPLAY_MS  = 3500;  // how long the toast is visible
const SLIDE_IN_MS = 380;
const FADE_OUT_MS = 280;

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
  onTap?: () => void;
  suppressed?: boolean; // true during active battle — delays toast until battle ends
}

export function AchievementPopup({ achievement, onDismiss, onTap, suppressed = false }: Props) {
  const translateY = useSharedValue(100);
  const opacity    = useSharedValue(0);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isShowing  = useRef(false);

  const dismiss = () => {
    isShowing.current = false;
    opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.out(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDismiss)(); },
    );
    translateY.value = withTiming(100, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
  };

  const handleTap = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
    onTap?.();
  };

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    dismiss();
  };

  useEffect(() => {
    if (!achievement || suppressed) return;

    // Slide in
    isShowing.current = true;
    translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    opacity.value    = withTiming(1, { duration: SLIDE_IN_MS });

    // Auto-dismiss after DISPLAY_MS
    timerRef.current = setTimeout(dismiss, DISPLAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [achievement?.id, suppressed]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!achievement || suppressed) return null;

  return (
    <Animated.View style={[s.container, animStyle]}>
      <Pressable onPress={handleTap}>
        <GradientBorder
          colors={BORDER_COLORS.violet}
          borderRadius={16}
          innerBackground="#0d0d20"
        >
          <View style={s.toast}>
            {/* Left accent strip */}
            <View style={[s.strip, { backgroundColor: achievement.color }]} />

            {/* Symbol badge */}
            <View style={[s.badge, { borderColor: achievement.color + '66', backgroundColor: achievement.color + '18' }]}>
              <Text style={[s.symbol, { color: achievement.color }]}>{achievement.symbol}</Text>
            </View>

            {/* Text */}
            <View style={s.textBlock}>
              <Text style={s.label}>ACHIEVEMENT EARNED</Text>
              <Text style={s.name} numberOfLines={1}>{achievement.name}</Text>
              <Text style={s.tapHint}>Tap to collect rewards</Text>
            </View>

            {/* Close button */}
            <Pressable onPress={handleClose} hitSlop={8} style={s.closeBtn}>
              <MaterialCommunityIcons name="close" size={16} color="#606480" />
            </Pressable>
          </View>
        </GradientBorder>
      </Pressable>
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
    // 3-layer violet glow
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
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    fontSize: T.font.xl,
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xs,
    color: T.text.muted,
    letterSpacing: 1.5,
  },
  name: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.md,
    color: T.text.primary,
    letterSpacing: 0.5,
  },
  tapHint: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.md,
    color: T.accent.mint,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
});
