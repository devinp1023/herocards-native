// HeroCard — fixed 300×433px Skia canvas card.
// Always rendered at full size; CardWrapper scales it externally.
//
// Session 3 additions:
//   - Rarity glow: animated pulsing border (Reanimated opacity on Skia Group)
//   - Shine sweep: LinearGradient animated left→right (Reanimated + Skia)
//   - Tilt on touch: GestureDetector Pan → 3D transform on Animated.View

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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
  Image,
  useImage,
  Circle,
  Line,
  Text as SkText,
  Paint,
  Rect,
} from '@shopify/react-native-skia';
import { Card } from '../data/cards';
import { RC, TYPE_COLORS } from '../data/constants';
import { useFontContext } from '../context/FontContext';
import { CARD_W, CARD_H } from './CardWrapper';

// ── Layout constants (all in canvas units) ──────────────────────────────────
const PAD       = 10;
const INNER_W   = CARD_W - PAD * 2;   // 280
const HEADER_H  = 60;
const IMG_Y     = HEADER_H + PAD;     // 70
const IMG_H     = 180;
const IMG_BOTTOM = IMG_Y + IMG_H;     // 250
const STATS_Y   = IMG_BOTTOM + 6;     // 256
const STATS_H   = 136;
const STATS_BOTTOM = STATS_Y + STATS_H; // 392
const FOOTER_Y  = STATS_BOTTOM + 4;   // 396
const STAT_LABEL_X = PAD + 8;
const STAT_BAR_X   = 58;
const STAT_BAR_W   = 192;
const STAT_BAR_H   = 7;
const STAT_ROW_H   = 30;
const STAT_START_Y = STATS_Y + 18;
const CORNER_R  = 14;
const BADGE_CX  = CARD_W - PAD - 14;
const BADGE_CY  = 28;
const BADGE_R   = 14;

// Shimmer colours per rarity (matching web version)
const SHIMMER_COLOR: Record<string, string> = {
  Legendary: 'rgba(255,200,50,0.45)',
  Epic:      'rgba(200,100,255,0.45)',
  Rare:      'rgba(80,180,255,0.40)',
};
const SHIMMER_DURATION: Record<string, number> = {
  Legendary: 1800, Epic: 2200, Rare: 3000,
};


interface HeroCardProps {
  card: Card;
  showShine?: boolean;   // shimmer sweep — default false (off in collection grid)
  enableTilt?: boolean;  // 3D tilt on touch — default false
}

export function HeroCard({ card, showShine = false, enableTilt = false }: HeroCardProps) {
  const fonts     = useFontContext();
  const heroImage = useImage(card.imageUrl ?? null);

  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const rarityColor = cfg.color;
  const borderColor = cfg.border;

  const totalPwr = card.power + card.defense + card.speed;

  const statRows = [
    { label: 'ATK', value: card.power,   color: '#ff6b40' },
    { label: 'DEF', value: card.defense, color: '#4db8ff' },
    { label: 'SPD', value: card.speed,   color: '#ffe040' },
  ];

  const gradColors = [
    typeColor + 'b0', typeColor + '70', typeColor + '28', '#1a1a2880', '#0a0a1400',
  ];

  // ── Shimmer sweep ─────────────────────────────────────────────────────────
  // A diagonal gradient strip sweeps left→right across Rare+ cards.
  const shimmerX = useSharedValue(-CARD_W * 0.6);
  const hasShimmer = showShine && !!SHIMMER_COLOR[card.rarity];

  useEffect(() => {
    if (!hasShimmer) { cancelAnimation(shimmerX); return; }
    const sweepMs  = SHIMMER_DURATION[card.rarity] ?? 3000;
    // Pause off-screen right before snapping back — makes the loop feel
    // like a deliberate flash rather than a hard restart.
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

  // Bridge Reanimated value → plain {x,y} objects (vec() is not worklet-safe)
  const shimmerStart = useDerivedValue(() => ({ x: shimmerX.value - 90, y: 0 }));
  const shimmerEnd   = useDerivedValue(() => ({ x: shimmerX.value + 90, y: CARD_H }));

  // ── Tilt on touch ────────────────────────────────────────────────────────
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .minDistance(0)          // start immediately on touch, no drag threshold
    .onUpdate((e) => {
      rotateY.value = ((e.x / CARD_W) - 0.5) * 22;   // −11° … +11°
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
      {/* pointerEvents="none" → Canvas doesn't swallow touches; parent TouchableOpacity/GestureDetector receives them */}
      <Canvas style={{ width: CARD_W, height: CARD_H }} pointerEvents="none">

        {/* 1. Dark base */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R} color="#0a0a14" />

        {/* 2. Type colour gradient wash */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
          <LinearGradient
            start={vec(CARD_W / 2, 0)} end={vec(CARD_W / 2, CARD_H)}
            colors={gradColors} positions={[0, 0.25, 0.55, 0.80, 1.0]}
          />
        </RoundedRect>

        {/* 3. Static rarity border */}
        <RoundedRect x={1} y={1} width={CARD_W - 2} height={CARD_H - 2} r={CORNER_R - 1}>
          <Paint style="stroke" strokeWidth={2.5} color={borderColor} />
        </RoundedRect>

        {/* 4. Card number */}
        {fonts.fontNumber && (
          <SkText x={PAD + 2} y={18}
            text={`#${String(card.id).padStart(3, '0')}`}
            font={fonts.fontNumber} color={rarityColor + 'aa'} />
        )}

        {/* 5. Card name */}
        {fonts.fontName && (
          <SkText x={PAD + 2} y={44}
            text={card.name.toUpperCase()}
            font={fonts.fontName} color="#ffffff" />
        )}

        {/* 6. Type badge */}
        <Circle cx={BADGE_CX} cy={BADGE_CY} r={BADGE_R} color={typeColor + '30'} />
        <Circle cx={BADGE_CX} cy={BADGE_CY} r={BADGE_R}>
          <Paint style="stroke" strokeWidth={1.5} color={typeColor} />
        </Circle>

        {/* 7. Image window */}
        <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={6} color="#000000" />
        {!card.imageUrl && (
          <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={6}>
            <RadialGradient
              c={vec(CARD_W / 2, IMG_Y + IMG_H / 2)} r={IMG_H * 0.65}
              colors={[typeColor + '55', typeColor + '18', '#00000000']}
            />
          </RoundedRect>
        )}
        {heroImage && (
          <Image image={heroImage} x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} fit="cover" />
        )}
        <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={IMG_H} r={6}>
          <Paint style="stroke" strokeWidth={2} color={rarityColor + 'cc'} />
        </RoundedRect>
        <RoundedRect x={PAD} y={IMG_Y} width={INNER_W} height={40} r={6}>
          <LinearGradient
            start={vec(PAD, IMG_Y)} end={vec(PAD, IMG_Y + 40)}
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
          />
        </RoundedRect>

        {/* 8. Stats section */}
        <RoundedRect x={PAD} y={STATS_Y} width={INNER_W} height={STATS_H} r={6} color="rgba(0,0,0,0.65)" />
        <RoundedRect x={PAD} y={STATS_Y} width={INNER_W} height={STATS_H} r={6}>
          <Paint style="stroke" strokeWidth={1} color="rgba(255,255,255,0.18)" />
        </RoundedRect>
        <Rect x={PAD + 1} y={STATS_Y} width={INNER_W - 2} height={2} color={rarityColor + '66'} />

        {/* 9. Stat rows */}
        {statRows.map(({ label, value, color }, i) => {
          const rowY = STAT_START_Y + i * STAT_ROW_H;
          const barFillW = Math.round((value / 100) * STAT_BAR_W);
          return (
            <React.Fragment key={label}>
              {fonts.fontStatLabel && (
                <SkText x={STAT_LABEL_X} y={rowY} text={label} font={fonts.fontStatLabel} color={color} />
              )}
              <RoundedRect x={STAT_BAR_X} y={rowY - STAT_BAR_H - 1} width={STAT_BAR_W} height={STAT_BAR_H} r={2} color="rgba(0,0,0,0.5)" />
              {barFillW > 0 && (
                <RoundedRect x={STAT_BAR_X} y={rowY - STAT_BAR_H - 1} width={barFillW} height={STAT_BAR_H} r={2}>
                  <LinearGradient start={vec(STAT_BAR_X, 0)} end={vec(STAT_BAR_X + STAT_BAR_W, 0)} colors={[color + '88', color]} />
                </RoundedRect>
              )}
              {fonts.fontStatValue && (
                <SkText x={STAT_VAL_X - 22} y={rowY} text={String(value)} font={fonts.fontStatValue} color="#ffffff" />
              )}
            </React.Fragment>
          );
        })}

        {/* 10. Divider */}
        <Line
          p1={vec(PAD + 8, STAT_START_Y + 3 * STAT_ROW_H - 8)}
          p2={vec(CARD_W - PAD - 8, STAT_START_Y + 3 * STAT_ROW_H - 8)}
          color="rgba(255,255,255,0.10)" strokeWidth={1}
        />

        {/* 11. Total power */}
        {(() => {
          const divY = STAT_START_Y + 3 * STAT_ROW_H;
          return (<>
            {fonts.fontStatLabel && (
              <SkText x={STAT_LABEL_X} y={divY + 14} text="TOTAL PWR" font={fonts.fontStatLabel} color={rarityColor + '88'} />
            )}
            {fonts.fontTotal && (
              <SkText x={CARD_W - PAD - 48} y={divY + 16} text={String(totalPwr)} font={fonts.fontTotal} color={rarityColor} />
            )}
          </>);
        })()}

        {/* 12. Footer */}
        {fonts.fontSmall && (<>
          <SkText x={PAD + 2} y={FOOTER_Y + 14} text={card.alliance.toUpperCase()} font={fonts.fontSmall} color={rarityColor + 'aa'} />
          <SkText x={CARD_W - PAD - 90} y={FOOTER_Y + 14} text={card.type.toUpperCase()} font={fonts.fontSmall} color={typeColor + 'cc'} />
        </>)}

        {/* 13. Shimmer sweep (Rare+ only, when showShine=true) */}
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
    </Animated.View>
  );

  if (!enableTilt) return card3d;

  return (
    <GestureDetector gesture={panGesture}>
      {card3d}
    </GestureDetector>
  );
}

// STAT_VAL_X used in stat rows (right-aligned)
const STAT_VAL_X = CARD_W - PAD - 6;

const styles = StyleSheet.create({});
