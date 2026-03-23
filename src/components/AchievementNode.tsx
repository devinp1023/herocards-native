import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, Easing, cancelAnimation,
} from 'react-native-reanimated';
import { AchievementTier } from '../data/achievements';

// ── Props ────────────────────────────────────────────────────────────
interface AchievementNodeProps {
  tier: AchievementTier;
  categoryColor: string;
  onPress: () => void;
  size?: number;
  singleTier?: boolean;
}

interface HubNodeProps {
  icon: string;
  categoryColor: string;
  completedCount: number;
  totalCount: number;
  onPress: () => void;
}

// ── Progress ring (border-based approximation) ──────────────────────
function ProgressRing({ progress, color, size }: { progress: number; color: string; size: number }) {
  if (progress <= 0 || progress >= 1) return null;
  const ringSize = size + 6;
  const borderW = 2.5;

  return (
    <View style={[pStyles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
      {/* Background track */}
      <View style={[pStyles.track, {
        width: ringSize, height: ringSize, borderRadius: ringSize / 2,
        borderWidth: borderW, borderColor: color + '25',
      }]} />
      {/* Fill — clip from top using rotation trick */}
      {/* Right half */}
      <View style={[pStyles.half, { width: ringSize / 2, height: ringSize, right: 0, overflow: 'hidden' }]}>
        <View style={[pStyles.arcFill, {
          width: ringSize, height: ringSize, borderRadius: ringSize / 2,
          borderWidth: borderW, borderColor: color,
          borderLeftColor: 'transparent', borderBottomColor: 'transparent',
          transform: [{ rotate: `${Math.min(progress, 0.5) * 360}deg` }],
        }]} />
      </View>
      {/* Left half (only visible above 50%) */}
      {progress > 0.5 && (
        <View style={[pStyles.half, { width: ringSize / 2, height: ringSize, left: 0, overflow: 'hidden' }]}>
          <View style={[pStyles.arcFill, {
            width: ringSize, height: ringSize, borderRadius: ringSize / 2,
            borderWidth: borderW, borderColor: color,
            borderRightColor: 'transparent', borderTopColor: 'transparent',
            transform: [{ rotate: `${(progress - 0.5) * 360}deg` }],
          }]} />
        </View>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  ring:    { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  track:   { position: 'absolute' },
  half:    { position: 'absolute', top: 0 },
  arcFill: { position: 'absolute', top: 0, left: 0 },
});

// ── AchievementNode ─────────────────────────────────────────────────
const AchievementNode = React.memo(function AchievementNode({
  tier, categoryColor, onPress, size = 52, singleTier = false,
}: AchievementNodeProps) {
  const { achievement, status, progress } = tier;
  const isSingleTier = singleTier;
  const borderRadius = size * 0.22;

  // Pulse animation for unlocked nodes
  const borderOp = useSharedValue(1);
  useEffect(() => {
    if (status !== 'unlocked') { cancelAnimation(borderOp); borderOp.value = 1; return; }
    borderOp.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(borderOp);
  }, [status]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: borderOp.value }));

  // Shimmer for completed nodes
  const shimmerOp = useSharedValue(0.15);
  useEffect(() => {
    if (status !== 'completed') { cancelAnimation(shimmerOp); shimmerOp.value = 0.15; return; }
    shimmerOp.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(shimmerOp);
  }, [status]);
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmerOp.value }));

  const isCompleted = status === 'completed';
  const isLocked    = status === 'locked';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ alignItems: 'center' }}>
      {/* Progress ring for unlocked */}
      {status === 'unlocked' && (
        <ProgressRing progress={progress} color={categoryColor} size={size} />
      )}

      {/* Main node */}
      <ReAnimated.View style={[
        nStyles.node,
        {
          width: size, height: size, borderRadius,
          backgroundColor: isCompleted ? categoryColor : isLocked ? '#08081a' : '#0a0a1e',
          borderColor: isCompleted ? categoryColor : isLocked ? '#ffffff20' : categoryColor,
          borderWidth: isCompleted ? 0 : 2,
        },
        isCompleted && {
          shadowColor: categoryColor, shadowOpacity: 0.6, shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 }, elevation: 8,
        },
        status === 'unlocked' && pulseStyle,
      ]}>
        {/* Shimmer overlay for completed */}
        {isCompleted && (
          <ReAnimated.View style={[
            nStyles.shimmer,
            { borderRadius, backgroundColor: '#ffffff' },
            shimmerStyle,
          ]} />
        )}

        {/* Tier numeral, star (single-tier), or lock icon */}
        {isLocked ? (
          <MaterialCommunityIcons name="lock" size={size * 0.36} color="#ffffff50" />
        ) : isSingleTier ? (
          <MaterialCommunityIcons name="star-four-points" size={size * 0.4} color={isCompleted ? '#ffffff' : categoryColor} />
        ) : (
          <Text style={[
            nStyles.tierNumeral,
            {
              fontSize: size * 0.32,
              color: isCompleted ? '#ffffff' : categoryColor,
            },
          ]}>
            {achievement.tier}
          </Text>
        )}
      </ReAnimated.View>

    </TouchableOpacity>
  );
});

const nStyles = StyleSheet.create({
  node: {
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  tierNumeral: {
    fontFamily: 'Orbitron_700Bold', textAlign: 'center',
  },
});

// ── HubNode ─────────────────────────────────────────────────────────
const HUB_SIZE = 72;

const HubNode = React.memo(function HubNode({
  icon, categoryColor, completedCount, totalCount, onPress,
}: HubNodeProps) {
  const allDone = completedCount === totalCount && totalCount > 0;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const borderRadius = HUB_SIZE * 0.22;

  // Glow pulse when all completed
  const glowOp = useSharedValue(0.3);
  useEffect(() => {
    if (!allDone) { cancelAnimation(glowOp); glowOp.value = 0.3; return; }
    glowOp.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
    return () => cancelAnimation(glowOp);
  }, [allDone]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOp.value }));

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={{ alignItems: 'center' }}>
      {/* Progress ring */}
      <ProgressRing progress={progress} color={categoryColor} size={HUB_SIZE} />

      <ReAnimated.View style={[
        hStyles.hub,
        {
          borderRadius,
          backgroundColor: allDone ? categoryColor : '#0c0c22',
          borderColor: categoryColor, borderWidth: allDone ? 0 : 2,
        },
        allDone && {
          shadowColor: categoryColor, shadowOpacity: 0.6, shadowRadius: 16,
          shadowOffset: { width: 0, height: 0 }, elevation: 10,
        },
        allDone && glowStyle,
      ]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={30}
          color={allDone ? '#ffffff' : categoryColor}
        />
      </ReAnimated.View>

      {/* Completion label */}
      <Text style={[hStyles.countText, { color: allDone ? categoryColor : '#606480' }]}>
        {completedCount}/{totalCount}
      </Text>
    </TouchableOpacity>
  );
});

const hStyles = StyleSheet.create({
  hub: {
    width: HUB_SIZE, height: HUB_SIZE,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  countText: {
    fontFamily: 'Orbitron_700Bold', fontSize: 9, letterSpacing: 0.5, marginTop: 6,
  },
});

export { AchievementNode, HubNode };
