// AchievementPopup — slide-up toast for newly earned achievements.
// Rendered as a global overlay in App.tsx.
// Shows the first item in pendingAchievements, auto-dismisses after 3.5s.

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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

const DISPLAY_MS  = 3500;  // how long the toast is visible
const SLIDE_IN_MS = 380;
const FADE_OUT_MS = 280;

interface Props {
  achievement: Achievement | null;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: Props) {
  const translateY = useSharedValue(100);
  const opacity    = useSharedValue(0);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: Easing.out(Easing.quad) },
      (finished) => { if (finished) runOnJS(onDismiss)(); },
    );
    translateY.value = withTiming(100, { duration: FADE_OUT_MS, easing: Easing.in(Easing.quad) });
  };

  useEffect(() => {
    if (!achievement) return;

    // Slide in
    translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
    opacity.value    = withTiming(1, { duration: SLIDE_IN_MS });

    // Auto-dismiss after DISPLAY_MS
    const timer = setTimeout(dismiss, DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [achievement?.id]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!achievement) return null;

  return (
    <Animated.View style={[s.container, animStyle]} pointerEvents="none">
      <View style={s.toast}>
        {/* Left accent strip */}
        <View style={[s.strip, { backgroundColor: achievement.color }]} />

        {/* Symbol badge */}
        <View style={[s.badge, { borderColor: achievement.color + '66', backgroundColor: achievement.color + '18' }]}>
          <Text style={[s.symbol, { color: achievement.color }]}>{achievement.symbol}</Text>
        </View>

        {/* Text */}
        <View style={s.textBlock}>
          <Text style={s.label}>ACHIEVEMENT UNLOCKED</Text>
          <Text style={s.name} numberOfLines={1}>{achievement.name}</Text>
          <Text style={s.rewards}>+{achievement.xp} XP  ·  +{achievement.credits} CR</Text>
        </View>
      </View>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d0d20',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e3a',
    overflow: 'hidden',
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
    fontSize: 20,
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 8,
    color: '#506070',
    letterSpacing: 1.5,
  },
  name: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  rewards: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 12,
    color: '#4fc3f7',
    letterSpacing: 0.5,
  },
});
