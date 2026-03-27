import React, { useImperativeHandle, forwardRef } from 'react';
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
const DURATION = 900;
const STAGGER = 12;
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

    // Pre-allocate shared values for MAX_PARTICLES (fixed hook count).
    // Only `count` particles are rendered, but all hooks are always called.
    const tx: SharedValue<number>[] = [];
    const ty: SharedValue<number>[] = [];
    const op: SharedValue<number>[] = [];
    const sc: SharedValue<number>[] = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      tx.push(useSharedValue(0));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      ty.push(useSharedValue(0));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      op.push(useSharedValue(0));
      // eslint-disable-next-line react-hooks/rules-of-hooks
      sc.push(useSharedValue(0));
    }

    useImperativeHandle(ref, () => ({
      fire() {
        const easing = Easing.out(Easing.cubic);

        for (let i = 0; i < count; i++) {
          // Cancel any running animations
          cancelAnimation(tx[i]);
          cancelAnimation(ty[i]);
          cancelAnimation(op[i]);
          cancelAnimation(sc[i]);

          // Reset to center
          tx[i].value = 0;
          ty[i].value = 0;
          op[i].value = 1;
          sc[i].value = 0.3 + Math.random() * 0.7; // 0.3–1.0

          // Random direction and distance
          const angle = Math.random() * Math.PI * 2;
          const distance = 80 + Math.random() * 120; // 80–200
          const targetX = Math.cos(angle) * distance;
          const targetY = Math.sin(angle) * distance;
          const delay = i * STAGGER;

          tx[i].value = withDelay(
            delay,
            withTiming(targetX, { duration: DURATION, easing }),
          );
          ty[i].value = withDelay(
            delay,
            withTiming(targetY, { duration: DURATION, easing }),
          );
          op[i].value = withDelay(
            delay,
            withTiming(0, { duration: DURATION, easing }),
          );
        }
      },
    }));

    return (
      <View style={styles.container} pointerEvents="none">
        {Array.from({ length: count }, (_, i) => (
          <Particle
            key={i}
            translateX={tx[i]}
            translateY={ty[i]}
            opacity={op[i]}
            scale={sc[i]}
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
