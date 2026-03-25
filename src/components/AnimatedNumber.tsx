import React, { useEffect, useState, useCallback } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedReaction,
  useAnimatedStyle,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { T } from '../theme/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnimatedNumberProps {
  value: number;
  glowColor?: string;
  style?: TextStyle;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedText = Animated.createAnimatedComponent(Text);

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  glowColor = T.accent.mint,
  style,
  duration = 600,
  prefix = '',
  suffix = '',
}) => {
  const animatedValue = useSharedValue(value);
  const glowRadius = useSharedValue(0);
  const [displayValue, setDisplayValue] = useState(value);

  // Kick off animations when `value` changes
  useEffect(() => {
    // Tick animation
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });

    // Glow flash: 0 → 12 → 0 over 300ms
    glowRadius.value = 0;
    glowRadius.value = withTiming(12, { duration: 150, easing: Easing.out(Easing.quad) }, () => {
      glowRadius.value = withTiming(0, { duration: 150, easing: Easing.in(Easing.quad) });
    });
  }, [value, duration, animatedValue, glowRadius]);

  // Bridge: update React state from UI thread at ~30fps
  const updateDisplay = useCallback((v: number) => {
    setDisplayValue(v);
  }, []);

  useAnimatedReaction(
    () => Math.round(animatedValue.value),
    (rounded, prev) => {
      if (rounded !== prev) {
        runOnJS(updateDisplay)(rounded);
      }
    },
    [animatedValue],
  );

  // Glow style via textShadow
  const glowStyle = useAnimatedStyle(() => ({
    textShadowColor: glowColor,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: glowRadius.value,
  }));

  const formatted = displayValue.toLocaleString();

  return (
    <AnimatedText style={[style, glowStyle]}>
      {prefix}{formatted}{suffix}
    </AnimatedText>
  );
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const MemoizedAnimatedNumber = React.memo(AnimatedNumber);

export { MemoizedAnimatedNumber as AnimatedNumber };
export default MemoizedAnimatedNumber;
