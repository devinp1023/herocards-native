/**
 * ShimmerTitle — screen title with color breathing animation.
 *
 * The text color smoothly pulses between its base color and white,
 * creating a gentle glow effect on the letterforms themselves.
 * Focus-aware — only animates when the screen is visible.
 *
 * Usage:
 *   <ShimmerTitle style={styles.title}>COLLECTION</ShimmerTitle>
 */

import React, { useEffect } from 'react';
import { StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolateColor,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
}

function ShimmerTitleInner({ children, style }: Props) {
  const focused = useIsFocused();
  const progress = useSharedValue(0);

  // Extract the base color from style for interpolation
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const baseColor = (flatStyle.color as string) ?? '#ffffff';

  useEffect(() => {
    if (focused) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => cancelAnimation(progress);
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [baseColor, '#ffffff'],
    );
    return { color };
  });

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {children}
    </Animated.Text>
  );
}

export const ShimmerTitle = React.memo(ShimmerTitleInner);
