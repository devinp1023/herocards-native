import React, { useImperativeHandle, forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from '../theme/theme';
import Animated, {
  SharedValue,
  useSharedValue,
  withTiming,
  withDelay,
  cancelAnimation,
  useAnimatedStyle,
  Easing,
} from 'react-native-reanimated';

export type SuccessBurstHandle = { fire: () => void };

type Props = {
  color?: string;
  particleCount?: number;
};

const PARTICLE_SIZE = 6;
const DURATION = 500;
const STAGGER = 20;
const MAX_PARTICLES = 20;

/* ---------- single particle ---------- */

type ParticleProps = {
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
  color: string;
};

const Particle = React.memo(function Particle({
  translateX,
  translateY,
  opacity,
  scale,
  color,
}: ParticleProps) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        style,
      ]}
    />
  );
});

/* ---------- main component ---------- */

const SuccessBurst = forwardRef<SuccessBurstHandle, Props>(
  function SuccessBurst({ color, particleCount = 12 }, ref) {
    const resolvedColor = color ?? T.accent.mint;
    const count = Math.min(Math.max(particleCount, 1), MAX_PARTICLES);

    // Pre-allocate shared values for each particle
    const particles = useMemo(() => {
      const arr: {
        translateX: SharedValue<number>;
        translateY: SharedValue<number>;
        opacity: SharedValue<number>;
        scale: SharedValue<number>;
      }[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          translateX: useSharedValue(0),
          translateY: useSharedValue(0),
          opacity: useSharedValue(0),
          scale: useSharedValue(0),
        });
      }
      return arr;
      // count is derived from a prop that shouldn't change after mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      fire() {
        const easing = Easing.out(Easing.cubic);

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];

          // Cancel any running animations
          cancelAnimation(p.translateX);
          cancelAnimation(p.translateY);
          cancelAnimation(p.opacity);
          cancelAnimation(p.scale);

          // Reset to center
          p.translateX.value = 0;
          p.translateY.value = 0;
          p.opacity.value = 1;
          p.scale.value = 0.3 + Math.random() * 0.7; // 0.3–1.0

          // Random direction and distance
          const angle = Math.random() * Math.PI * 2;
          const distance = 40 + Math.random() * 80; // 40–120
          const targetX = Math.cos(angle) * distance;
          const targetY = Math.sin(angle) * distance;
          const delay = i * STAGGER;

          p.translateX.value = withDelay(
            delay,
            withTiming(targetX, { duration: DURATION, easing }),
          );
          p.translateY.value = withDelay(
            delay,
            withTiming(targetY, { duration: DURATION, easing }),
          );
          p.opacity.value = withDelay(
            delay,
            withTiming(0, { duration: DURATION, easing }),
          );
        }
      },
    }));

    return (
      <View style={styles.container} pointerEvents="none">
        {particles.map((p, i) => (
          <Particle
            key={i}
            translateX={p.translateX}
            translateY={p.translateY}
            opacity={p.opacity}
            scale={p.scale}
            color={resolvedColor}
          />
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    borderRadius: PARTICLE_SIZE / 2,
  },
});

export { SuccessBurst };
export default SuccessBurst;
