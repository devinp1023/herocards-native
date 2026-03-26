// useRipple — provides a press ripple effect from the touch point on any
// tappable element. Returns an overlay View, press handlers, and an animated
// press-scale style.

import React, { useCallback, useState } from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseRippleProps {
  rippleColor?: string;
  rippleSize?: number;
}

interface UseRippleReturn {
  /** Ripple overlay — render inside the button */
  rippleView: React.ReactNode;
  /** Pass to TouchableOpacity's onPressIn */
  onPressIn: (e: GestureResponderEvent) => void;
  /** Pass to TouchableOpacity's onPressOut */
  onPressOut: () => void;
  /** Animated scale(0.96) on press, bounces back on release */
  pressStyle: { transform: { scale: number }[] };
}

// ---------------------------------------------------------------------------
// Ripple circle component
// ---------------------------------------------------------------------------

interface RippleCircleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  onDone: () => void;
}

const RippleCircle = React.memo(function RippleCircle({
  x,
  y,
  size,
  color,
  onDone,
}: RippleCircleProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0.5);

  // Kick off the animation on mount
  React.useEffect(() => {
    scale.value = withTiming(2.5, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    opacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    }, (finished) => {
      if (finished) {
        runOnJS(onDone)();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const half = size / 2;

  return React.createElement(Animated.View, {
    style: [
      {
        position: 'absolute' as const,
        left: x - half,
        top: y - half,
        width: size,
        height: size,
        borderRadius: half,
        backgroundColor: color,
      },
      animStyle,
    ],
  });
});

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRipple(props?: UseRippleProps): UseRippleReturn {
  const rippleColor = props?.rippleColor ?? 'rgba(255,255,255,0.35)';
  const rippleSize = props?.rippleSize ?? 120;

  // Press scale
  const scaleVal = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  // Ripple state — array of { key, x, y }
  const [ripples, setRipples] = useState<{ key: number; x: number; y: number }[]>([]);
  const nextKey = React.useRef(0);

  const removeRipple = useCallback((key: number) => {
    setRipples((prev) => prev.filter((r) => r.key !== key));
  }, []);

  const onPressIn = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY } = e.nativeEvent;
      const key = nextKey.current++;
      setRipples((prev) => [...prev, { key, x: locationX, y: locationY }]);

      scaleVal.value = withTiming(0.96, { duration: 100 });
    },
    [scaleVal],
  );

  const onPressOut = useCallback(() => {
    scaleVal.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, [scaleVal]);

  // Build the overlay
  const rippleView: React.ReactNode = React.createElement(
    Animated.View,
    {
      style: styles.overlay,
      pointerEvents: 'none' as const,
    },
    ...ripples.map((r) =>
      React.createElement(RippleCircle, {
        key: r.key,
        x: r.x,
        y: r.y,
        size: rippleSize,
        color: rippleColor,
        onDone: () => removeRipple(r.key),
      }),
    ),
  );

  return { rippleView, onPressIn, onPressOut, pressStyle };
}

export default useRipple;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  } as ViewStyle,
});
