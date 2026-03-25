// HeroCard — fixed 300×433px Skia canvas card.
// Redesigned layout: type icon + name | HP badge | image | ability | stat pills.
// Always rendered at full size; CardWrapper scales it externally.

import React, { useEffect } from 'react';
import { StyleSheet, Image as RNImage, View, Text } from 'react-native';
import { T } from '../theme/theme';
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Canvas,
  Rect,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  vec,
  Circle,
  Text as SkText,
  Paint,
  Path,
  Skia,
  Image as SkImage,
  useImage,
} from '@shopify/react-native-skia';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from '../data/cards';
import { RC, TYPE_COLORS, TYPE_META, RARITY_META } from '../data/constants';
import { ABILITY_DESC } from '../data/abilities';
import { useFontContext } from '../context/FontContext';
import { CARD_W, CARD_H } from './CardWrapper';

// Pre-load noise texture
const noiseSource = require('../../assets/noise.png');

// ── Layout constants (all in canvas units) ──────────────────────────────────
const PAD       = 10;
const INNER_W   = CARD_W - PAD * 2;   // 280
const CORNER_R  = 14;

// Header
const TYPE_R    = 18;
const TYPE_CX   = PAD + TYPE_R + 2;    // 30
const TYPE_CY   = 24;
const NAME_X    = TYPE_CX + TYPE_R + 8; // 56
const NAME_Y    = 5;

// Subtitle info (top-right)
const SUB_X     = CARD_W - PAD - 100;   // right-aligned area
const SUB_Y     = 10;

// Stat pills (anchored to bottom)
const PILL_H    = 26;
const PILL_Y    = CARD_H - 12 - PILL_H;
const PILL_W    = 82;
const PILL_GAP  = (INNER_W - 3 * PILL_W) / 2; // 17
const PILL_R    = 20;

// Ability bar height (3 lines)
const ABL_H     = 76;

// Image window — fixed height, do not change
const IMG_Y     = 50;
const IMG_H     = 170;

// Ability sits 8px below image
const ABL_Y     = IMG_Y + IMG_H + 8;   // 228

// HP bar + stamina dark pill rows anchored right below ability
const HPBAR_H   = 36;
const STAM_H    = 36;
const HPBAR_Y   = ABL_Y + ABL_H + 1;   // 305
const STAM_Y    = HPBAR_Y + HPBAR_H + 3; // 344

// Shimmer colours per rarity
const SHIMMER_COLOR: Record<string, string> = {
  Legendary: 'rgba(255,200,50,0.45)',
  Epic:      'rgba(200,100,255,0.45)',
  Rare:      'rgba(80,180,255,0.40)',
};
const SHIMMER_DURATION: Record<string, number> = {
  Legendary: 1800, Epic: 2200, Rare: 3000,
};

// Pre-built shield placeholder path (centred in image window)
const SHIELD_CX = CARD_W / 2;
const SHIELD_CY = IMG_Y + IMG_H / 2;
function buildShield(cx: number, cy: number, r: number) {
  const p = Skia.Path.Make();
  p.moveTo(cx, cy - r);
  p.lineTo(cx + r, cy - r * 0.45);
  p.lineTo(cx + r * 0.85, cy + r * 0.35);
  p.lineTo(cx, cy + r);
  p.lineTo(cx - r * 0.85, cy + r * 0.35);
  p.lineTo(cx - r, cy - r * 0.45);
  p.close();
  return p;
}
const shieldPath = buildShield(SHIELD_CX, SHIELD_CY, 40);

// Stat pill icon config
const PILL_ICONS = ['sword', 'shield', 'run-fast'] as const;

const TYPE_ICONS: Record<string, string> = {
  Blaster:   'pistol',
  Magic:     'star-four-points',
  Psychic:   'brain',
  Shadow:    'eye-off',
  Tank:      'shield-half-full',
  Speedster: 'lightning-bolt',
  Nature:    'leaf',
  Tech:      'robot',
  Cosmic:    'creation',
};


export interface BattleProps {
  currentHp?: number;
  maxHp?: number;
  currentStamina?: number;
  isActive?: boolean;
  hpPct?: number;
}

interface HeroCardProps extends BattleProps {
  card: Card;
  showShine?: boolean;   // shimmer sweep — default false
  enableTilt?: boolean;  // 3D tilt on touch — default false
}

export function HeroCard({
  card,
  showShine = false,
  enableTilt = false,
  currentHp,
  maxHp,
  currentStamina,
  isActive = false,
  hpPct,
}: HeroCardProps) {
  const fonts = useFontContext();
  const noiseImage = useImage(noiseSource);

  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const tm         = TYPE_META[card.type] ?? { primary: typeColor, bg: '#0f1528', mid: '#151a2e' };
  const rm         = RARITY_META[card.rarity] ?? { color: '#9CA3AF', shimmer: false };
  const rc         = rm.color;
  const rarityColor = cfg.color;
  const borderColor = cfg.border;

  // Battle-aware values (defaults to base stats when not in battle)
  const computedMaxHp = maxHp ?? Math.round(100 + card.defense * 0.5);
  const displayHp     = currentHp ?? computedMaxHp;
  const displayHpPct  = hpPct ?? (currentHp != null && maxHp ? currentHp / maxHp : 1);
  const maxStam       = card.stamina ?? 0;
  const displayStam   = currentStamina ?? maxStam;

  const abilityDesc = card.ability ? ABILITY_DESC[card.ability] : null;

  // HP bar color based on percentage
  const hpBarColor = displayHpPct > 0.5 ? T.status.vitality : displayHpPct > 0.25 ? T.status.caution : T.status.danger;
  const isLowHp = displayHpPct <= 0.25 && currentHp != null;

  // Low HP pulse animation
  const lowHpPulse = useSharedValue(0.15);
  useEffect(() => {
    if (!isLowHp) { cancelAnimation(lowHpPulse); lowHpPulse.value = 0; return; }
    lowHpPulse.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(lowHpPulse);
  }, [isLowHp]);
  const lowHpOpacity = useDerivedValue(() => lowHpPulse.value);

  // Active glow pulse animation
  const activeGlow = useSharedValue(0.3);
  useEffect(() => {
    if (!isActive) { cancelAnimation(activeGlow); activeGlow.value = 0; return; }
    activeGlow.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(activeGlow);
  }, [isActive]);
  const activeGlowStyle = useAnimatedStyle(() => ({
    opacity: activeGlow.value,
  }));

  const statPills = [
    { label: 'A', value: card.power,   bg: T.stat.atk, bgDark: '#b8283a' },
    { label: 'D', value: card.defense, bg: T.stat.def, bgDark: '#6d3fd4' },
    { label: 'S', value: card.speed,   bg: T.stat.spd, bgDark: '#c47d08' },
  ];

  // ── Shimmer sweep ─────────────────────────────────────────────────────────
  const shimmerX = useSharedValue(-CARD_W * 0.6);
  const hasShimmer = showShine && !!SHIMMER_COLOR[card.rarity];

  useEffect(() => {
    if (!hasShimmer) { cancelAnimation(shimmerX); return; }
    const sweepMs  = SHIMMER_DURATION[card.rarity] ?? 3000;
    const pauseMs  = sweepMs * 0.6;
    shimmerX.value = -CARD_W * 0.6;
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(CARD_W * 1.6, { duration: sweepMs, easing: Easing.linear }),
        withDelay(pauseMs, withTiming(-CARD_W * 0.6, { duration: 0 })),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shimmerX);
  }, [hasShimmer, card.rarity]);

  const shimmerStart = useDerivedValue(() => ({ x: shimmerX.value - 90, y: 0 }));
  const shimmerEnd   = useDerivedValue(() => ({ x: shimmerX.value + 90, y: CARD_H }));

  // ── Tilt on touch ────────────────────────────────────────────────────────
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onUpdate((e) => {
      rotateY.value = ((e.x / CARD_W) - 0.5) * 22;
      rotateX.value = -((e.y / CARD_H) - 0.5) * 22;
    })
    .onFinalize(() => {
      rotateX.value = withSpring(0, { damping: 12, stiffness: 120 });
      rotateY.value = withSpring(0, { damping: 12, stiffness: 120 });
    });

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 800 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  // ── Render ────────────────────────────────────────────────────────────────
  const card3d = (
    <Animated.View style={enableTilt ? tiltStyle : undefined}>
      {/* Active outer glow */}
      {isActive && (
        <Animated.View style={[styles.activeGlow, { backgroundColor: typeColor }, activeGlowStyle]} />
      )}
      <Canvas style={{ width: CARD_W, height: CARD_H }} pointerEvents="none">

        {/* 3a. Card body background */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}
          color="#040408" />

        {/* 3d. Gradient border — swaps to type color when active */}
        <RoundedRect x={0.75} y={0.75} width={CARD_W - 1.5} height={CARD_H - 1.5} r={CORNER_R}>
          <Paint style="stroke" strokeWidth={isActive ? 2 : 1.5}>
            <LinearGradient
              start={vec(CARD_W / 2, 0)}
              end={vec(CARD_W / 2, CARD_H)}
              colors={isActive
                ? [tm.primary + '88', tm.primary + '44', 'rgba(0,0,0,0.5)']
                : ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.5)']}
              positions={[0, 0.4, 1]}
            />
          </Paint>
        </RoundedRect>

        {/* 3e. Top specular edge */}
        <Rect x={0} y={0} width={CARD_W} height={1.5}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(CARD_W, 0)}
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)']}
          />
        </Rect>

        {/* 3f. Noise texture overlay */}
        {noiseImage && (
          <SkImage
            image={noiseImage}
            x={0} y={0} width={CARD_W} height={CARD_H}
            fit="cover"
            opacity={0.05}
          />
        )}

        {/* Type icon circle — background + icon rendered via RN overlay below */}

        {/* Image window */}
        <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={8}
          color="#000000" />
        {!card.imageUrl && (
          <>
            <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={8}>
              <RadialGradient
                c={vec(SHIELD_CX, SHIELD_CY)} r={IMG_H * 0.45}
                colors={[typeColor + '30', typeColor + '08', '#00000000']}
              />
            </RoundedRect>
            <Path path={shieldPath} color={typeColor + '40'} />
            <Path path={shieldPath}>
              <Paint style="stroke" strokeWidth={2} color={typeColor + '80'} />
            </Path>
          </>
        )}
        <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={8}>
          <Paint style="stroke" strokeWidth={2.5} color={borderColor} />
        </RoundedRect>

        {/* 3g. Art window inset shadow (vignette) */}
        <Rect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H}>
          <RadialGradient
            c={vec(PAD + INNER_W / 2, IMG_Y + IMG_H * 0.42)}
            r={INNER_W * 0.65}
            colors={['transparent', 'rgba(0,0,0,0.58)']}
          />
        </Rect>
        <Rect x={PAD} y={IMG_Y + IMG_H - 36} width={INNER_W} height={36}>
          <LinearGradient
            start={vec(0, IMG_Y + IMG_H - 36)}
            end={vec(0, IMG_Y + IMG_H)}
            colors={['transparent', 'rgba(4,4,8,0.9)']}
          />
        </Rect>

        {/* Low HP red pulse overlay */}
        {isLowHp && (
          <Rect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H}
            color="#FF4757" opacity={lowHpOpacity} />
        )}

        {/* 3h. Rarity line at top of art window */}
        <Rect x={PAD} y={IMG_Y} width={INNER_W} height={2}>
          <LinearGradient
            start={vec(PAD, 0)}
            end={vec(PAD + INNER_W, 0)}
            colors={['transparent', rc + 'bb', rc, rc + 'bb', 'transparent']}
            positions={[0, 0.38, 0.5, 0.62, 1]}
          />
        </Rect>

        {/* Ability bar background */}
        <RoundedRect x={PAD} y={ABL_Y} width={INNER_W} height={ABL_H} r={6}
          color="rgba(0,0,0,0.75)" />

        {/* Stats group background */}
        <RoundedRect x={PAD} y={HPBAR_Y} width={INNER_W} height={PILL_Y + PILL_H - HPBAR_Y} r={6}
          color="rgba(0,0,0,0.75)" />

        {/* 3i. Bottom rarity accent line */}
        <Rect x={0} y={CARD_H - 2} width={CARD_W} height={2}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(CARD_W, 0)}
            colors={['transparent', rc + '88', 'transparent']}
          />
        </Rect>

        {/* Shimmer sweep (Rare+ only, when showShine=true) */}
        {hasShimmer && (
          <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
            <LinearGradient
              start={shimmerStart}
              end={shimmerEnd}
              colors={['transparent', SHIMMER_COLOR[card.rarity]!, 'transparent']}
            />
          </RoundedRect>
        )}

      </Canvas>

      {/* ── RN overlays ────────────────────────────────────────────────────── */}

      {/* Type colour wash — single full-card tint */}
      <View pointerEvents="none" style={[styles.typeTint, { backgroundColor: typeColor + '30' }]} />

      {/* Card image */}
      {card.imageUrl && (
        <View pointerEvents="none"
          style={[styles.imageOverlay, { borderColor, opacity: isLowHp ? 0.65 : 1 }]}>
          <RNImage
            source={{ uri: card.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Card name */}
      <View pointerEvents="none" style={styles.headerOverlay}>
        <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
      </View>

      {/* Alliance / number / rarity (top-right) */}
      <View pointerEvents="none" style={styles.subtitleOverlay}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {card.alliance.toUpperCase()} {'\u2022'} #{String(card.id).padStart(3, '0')}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {card.rarity.toUpperCase()}
        </Text>
      </View>

      {/* Type icon */}
      <View pointerEvents="none" style={[styles.typeIconOverlay, { backgroundColor: typeColor }]}>
        <MaterialCommunityIcons
          name={(TYPE_ICONS[card.type] ?? 'help-circle-outline') as any}
          size={18}
          color="#ffffff"
          style={{ textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 }}
        />
      </View>

      {/* Stats group wrapper — HP, STA, pills in one box */}
      <View pointerEvents="none" style={styles.statsWrapper}>
        <View style={[styles.statsAccentBar, { backgroundColor: rm.color }]} />

        {/* HP row */}
        <View style={styles.hpSection}>
          <View style={styles.statRowHeader}>
            <Text style={styles.statTag}>HP</Text>
            <Text style={[styles.statValue, { color: hpBarColor }]}>{displayHp}</Text>
          </View>
          <View style={[styles.hpBarTrack, { shadowColor: hpBarColor }]}>
            <View style={[styles.hpBarFill, { width: `${displayHpPct * 100}%`, backgroundColor: hpBarColor }]}>
              <View style={styles.hpBarGloss} />
            </View>
          </View>
        </View>

        {/* STA row */}
        <View style={styles.stamSection}>
          <View style={styles.statRowHeader}>
            <Text style={styles.statTag}>STA</Text>
            <Text style={styles.stamValue}>{displayStam}</Text>
          </View>
          <View style={[styles.stamTrack, { shadowColor: '#4fc3f7' }]}>
            {Array.from({ length: maxStam }, (_, i) => (
              <View key={i} style={[
                styles.stamPip,
                i < displayStam ? styles.stamPipFilled : styles.stamPipEmpty,
              ]}>
                {i < displayStam && <View style={styles.stamPipGloss} />}
              </View>
            ))}
          </View>
        </View>

        {/* Stat pills */}
        <View style={styles.pillRow}>
          {statPills.map(({ value, bg }, i) => (
            <View key={i} style={[styles.pillContent, {
              backgroundColor: bg,
              shadowColor: bg,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.35,
              shadowRadius: 6,
              elevation: 4,
            }]}>
              <View style={styles.pillSpecular} />
              <View style={styles.pillGradientTop} />
              <MaterialCommunityIcons name={PILL_ICONS[i]} size={20} color="rgba(255,255,255,0.75)" />
              <Text style={styles.pillValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Ability text */}
      {card.ability && abilityDesc && (
        <>
          <View pointerEvents="none" style={[styles.abilityAccentBar, { backgroundColor: rm.color }]} />
          <View pointerEvents="none" style={styles.abilityOverlay}>
            <Text style={styles.abilityText} numberOfLines={3}>
              <Text style={styles.abilityName}>{card.ability}: </Text>{abilityDesc}
            </Text>
          </View>
        </>
      )}

    </Animated.View>
  );

  if (!enableTilt) return card3d;

  return (
    <GestureDetector gesture={panGesture}>
      {card3d}
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  activeGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: CORNER_R + 4,
    // width/height not needed — absolute positioning handles it
  },
  // Type tint — full card wash
  typeTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CORNER_R },

  imageOverlay: {
    position: 'absolute',
    left: PAD,
    top: IMG_Y,
    width: INNER_W,
    height: IMG_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2.5,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    left: NAME_X,
    top: NAME_Y,
    width: SUB_X - NAME_X - 4,
    height: 38,
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: T.font.xl,
    color: T.text.primary,
  },
  subtitleOverlay: {
    position: 'absolute',
    right: PAD,
    top: SUB_Y,
    width: 140,
    height: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.md,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
  },
  typeIconOverlay: {
    position: 'absolute',
    left: TYPE_CX - TYPE_R,
    top: TYPE_CY - TYPE_R,
    width: TYPE_R * 2,
    height: TYPE_R * 2,
    borderRadius: TYPE_R,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Stats group wrapper
  statsWrapper: {
    position: 'absolute',
    left: PAD,
    top: HPBAR_Y,
    width: INNER_W,
    height: PILL_Y + PILL_H - HPBAR_Y,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'space-between',
  },
  statsAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
  },
  hpSection: {
    height: HPBAR_H,
    justifyContent: 'flex-start',
    gap: 4,
  },
  statRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statTag: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.sm,
    color: T.text.primary,
    letterSpacing: 1.5,
  },
  statValue: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.lg,
    lineHeight: 18,
  },
  stamValue: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.lg,
    lineHeight: 18,
    color: '#4fc3f7',
  },
  hpBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  hpBarGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 99,
  },

  // Stamina pips
  stamSection: {
    height: STAM_H,
    justifyContent: 'flex-start',
    gap: 4,
  },
  stamTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
  },
  stamPip: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  stamPipFilled: {
    backgroundColor: '#4fc3f7',
  },
  stamPipEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  stamPipGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  // Stat pills
  pillRow: {
    height: PILL_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillContent: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffffcc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  pillSpecular: {
    position: 'absolute',
    top: 0,
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  pillGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  pillValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: T.font.lg,
    color: T.text.primary,
    flex: 1,
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Ability bar
  abilityAccentBar: {
    position: 'absolute',
    left: PAD,
    top: ABL_Y + 2,
    width: 3,
    height: ABL_H - 4,
    borderRadius: 2,
  },
  abilityOverlay: {
    position: 'absolute',
    left: PAD,
    top: ABL_Y + 2,
    width: INNER_W,
    height: ABL_H - 4,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  abilityText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: T.font.lg,
    color: T.text.body,
    lineHeight: 20,
  },
  abilityName: {
    fontFamily: 'Rajdhani_600SemiBold',
    color: T.text.primary,
    letterSpacing: 0.5,
  },
});
