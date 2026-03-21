// HeroCard — fixed 300×433px Skia canvas card.
// Redesigned layout: type icon + name | HP badge | image | ability | stat pills.
// Always rendered at full size; CardWrapper scales it externally.

import React, { useEffect } from 'react';
import { StyleSheet, Image as RNImage, View, Text } from 'react-native';
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
  RoundedRect,
  LinearGradient,
  RadialGradient,
  vec,
  Circle,
  Text as SkText,
  Paint,
  Path,
  Skia,
} from '@shopify/react-native-skia';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from '../data/cards';
import { RC, TYPE_COLORS } from '../data/constants';
import { ABILITY_DESC } from '../data/abilities';
import { useFontContext } from '../context/FontContext';
import { CARD_W, CARD_H } from './CardWrapper';

// ── Layout constants (all in canvas units) ──────────────────────────────────
const PAD       = 10;
const INNER_W   = CARD_W - PAD * 2;   // 280
const CORNER_R  = 14;

// Header
const TYPE_R    = 15;
const TYPE_CX   = PAD + TYPE_R + 2;    // 27
const TYPE_CY   = 24;
const NAME_X    = TYPE_CX + TYPE_R + 8; // 50
const NAME_Y    = 8;

// HP badge (top-right pill)
const HP_W      = 68;
const HP_H      = 28;
const HP_R      = 14;
const HP_X      = CARD_W - PAD - HP_W;  // 222
const HP_Y      = 10;

// Stat pills (anchored to bottom)
const PILL_H    = 40;
const PILL_Y    = CARD_H - 12 - PILL_H; // 381
const PILL_W    = 82;
const PILL_GAP  = (INNER_W - 3 * PILL_W) / 2; // 17
const PILL_R    = 20;

// Ability bar (above pills)
const ABL_H     = 54;
const ABL_Y     = PILL_Y - 4 - ABL_H;   // 343

// Image window (between header and ability)
const IMG_Y     = 50;
const IMG_H     = ABL_Y - 4 - IMG_Y;    // 289

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
  Speedster:    'lightning-bolt',
  Brainiac:     'brain',
  Blaster:      'pistol',
  Tank:         'shield-half-full',
  Healer:       'heart-pulse',
  Stealth:      'eye-off',
  Elemental:    'leaf',
  Tech:         'robot',
  Mystic:       'star-four-points',
  Brawler:      'boxing-glove',
  Flier:        'bird',
  Shapeshifter: 'swap-horizontal',
  Cosmic:       'creation',
  Alien:        'alien',
  Gadgets:      'toolbox',
};


interface HeroCardProps {
  card: Card;
  showShine?: boolean;   // shimmer sweep — default false
  enableTilt?: boolean;  // 3D tilt on touch — default false
}

export function HeroCard({ card, showShine = false, enableTilt = false }: HeroCardProps) {
  const fonts = useFontContext();

  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const rarityColor = cfg.color;
  const borderColor = cfg.border;

  const hp = Math.round(100 + card.defense * 0.5);
  const abilityDesc = card.ability ? ABILITY_DESC[card.ability] : null;

  const statPills = [
    { label: 'A', value: card.power,   bg: '#e8445a', bgDark: '#b8283a' },
    { label: 'D', value: card.defense, bg: '#3aadad', bgDark: '#2a8888' },
    { label: 'S', value: card.speed,   bg: '#4caf6a', bgDark: '#3a8a52' },
  ];

  const gradColors = [typeColor + '40', typeColor + '18', '#0f152800'];

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
      <Canvas style={{ width: CARD_W, height: CARD_H }} pointerEvents="none">

        {/* 1. Dark base */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}
          color="#0f1528" />

        {/* 2. Type colour gradient wash */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
          <LinearGradient
            start={vec(CARD_W / 2, 0)}
            end={vec(CARD_W / 2, CARD_H * 0.6)}
            colors={gradColors}
          />
        </RoundedRect>

        {/* 3. Rarity border */}
        <RoundedRect x={2} y={2} width={CARD_W - 4} height={CARD_H - 4} r={CORNER_R - 1}>
          <Paint style="stroke" strokeWidth={3} color={borderColor} />
        </RoundedRect>

        {/* 4. Type icon circle — icon rendered via RN overlay below */}
        <Circle cx={TYPE_CX} cy={TYPE_CY} r={TYPE_R} color={typeColor + '35'} />
        <Circle cx={TYPE_CX} cy={TYPE_CY} r={TYPE_R}>
          <Paint style="stroke" strokeWidth={1.5} color="#ffffffcc" />
        </Circle>

        {/* 5. HP badge pill — background rendered in RN overlay below */}

        {/* 6. Image window */}
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

        {/* 7. Ability bar background */}
        <RoundedRect x={PAD} y={ABL_Y} width={INNER_W} height={ABL_H} r={6}
          color="rgba(0,0,0,0.50)" />

        {/* 8. Stat pills — backgrounds rendered in RN overlay below */}

        {/* 9. Shimmer sweep (Rare+ only, when showShine=true) */}
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

      {/* Card image */}
      {card.imageUrl && (
        <View pointerEvents="none"
          style={[styles.imageOverlay, { borderColor }]}>
          <RNImage
            source={{ uri: card.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Card name + subtitle */}
      <View pointerEvents="none" style={styles.headerOverlay}>
        <Text style={styles.cardName} numberOfLines={1}>{card.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {card.alliance.toUpperCase()} {'\u2022'} #{String(card.id).padStart(3, '0')} {'\u2022'} {card.rarity.toUpperCase()}
        </Text>
      </View>

      {/* Type icon */}
      <View pointerEvents="none" style={styles.typeIconOverlay}>
        <MaterialCommunityIcons
          name={(TYPE_ICONS[card.type] ?? 'help-circle-outline') as any}
          size={18}
          color="#ffffff"
        />
      </View>

      {/* HP badge icon + value */}
      <View pointerEvents="none" style={styles.hpOverlay}>
        <View style={styles.hpIconWrap}>
          <MaterialCommunityIcons name="heart" size={12} color="#7c3aed" />
        </View>
        <Text style={styles.hpText}>{hp}</Text>
      </View>

      {/* Stat pill icons + values (backgrounds here too) */}
      <View pointerEvents="none" style={styles.pillOverlay}>
        {statPills.map(({ value, bg }, i) => (
          <View key={i} style={[styles.pillContent, { backgroundColor: bg }]}>
            <View style={styles.pillIconWrap}>
              <MaterialCommunityIcons name={PILL_ICONS[i]} size={20} color="#7c3aed" />
            </View>
            <Text style={styles.pillValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Ability text */}
      {abilityDesc && (
        <View pointerEvents="none" style={styles.abilityOverlay}>
          <Text style={styles.abilityText} numberOfLines={2}>
            {abilityDesc}
          </Text>
        </View>
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
    width: HP_X - NAME_X - 4,
    height: 38,
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 14,
    color: '#ffffff',
  },
  subtitle: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 10,
    color: '#ffffff',
    marginTop: 1,
  },
  typeIconOverlay: {
    position: 'absolute',
    left: TYPE_CX - TYPE_R,
    top: TYPE_CY - TYPE_R,
    width: TYPE_R * 2,
    height: TYPE_R * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpOverlay: {
    position: 'absolute',
    left: HP_X,
    top: HP_Y,
    width: HP_W,
    height: HP_H,
    borderRadius: HP_R,
    backgroundColor: '#7c3aed',
    borderWidth: 2,
    borderColor: '#ffffffcc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  hpIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffffcc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpText: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 14,
    color: '#ffffff',
  },
  pillOverlay: {
    position: 'absolute',
    left: PAD,
    top: PILL_Y,
    width: INNER_W,
    height: PILL_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillContent: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffffcc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
  },
  pillIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#ffffffcc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 6,
  },
  abilityOverlay: {
    position: 'absolute',
    left: PAD + 8,
    top: ABL_Y + 2,
    width: INNER_W - 16,
    height: ABL_H - 4,
    justifyContent: 'center',
  },
  abilityText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#cccccc',
  },
});
