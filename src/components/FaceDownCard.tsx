// FaceDownCard — the card back design, rendered in Skia.
// Used for hand zones, deck display, and pack opening reveal.
// Spec: dark gradient bg, hex tile pattern, radial glow, corner ornaments,
//       central medallion, "HERO CARDS" / "TAP TO REVEAL" text.
// Note: The 🦸 hero emoji in the medallion is rendered as a native Text overlay.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  RadialGradient,
  Circle,
  Line,
  Path,
  Text as SkText,
  Paint,
  vec,
  Skia,
} from '@shopify/react-native-skia';
import { useFontContext } from '../context/FontContext';
import { CARD_W, CARD_H } from './CardWrapper';

const CORNER_R = 14;
const CX = CARD_W / 2;   // 150
const CY = CARD_H / 2;   // 216.5

// Corner ornament positions
const ORNAMENTS = [
  { x: 22, y: 22 },             // top-left
  { x: CARD_W - 22, y: 22 },    // top-right
  { x: 22, y: CARD_H - 22 },    // bottom-left
  { x: CARD_W - 22, y: CARD_H - 22 }, // bottom-right
];

// Build a simple hex tile path covering the card
function buildHexPath(): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const size = 14;   // hex circumradius
  const hx = size * Math.sqrt(3);
  const hy = size * 1.5;

  for (let row = -1; row < CARD_H / hy + 2; row++) {
    for (let col = -1; col < CARD_W / hx + 2; col++) {
      const cx = col * hx + (row % 2 === 0 ? 0 : hx / 2);
      const cy = row * hy;
      // Draw hexagon
      for (let k = 0; k < 6; k++) {
        const angle = (Math.PI / 3) * k - Math.PI / 6;
        const px = cx + size * Math.cos(angle);
        const py = cy + size * Math.sin(angle);
        if (k === 0) path.moveTo(px, py);
        else path.lineTo(px, py);
      }
      path.close();
    }
  }
  return path;
}

const hexPath = buildHexPath();

export function FaceDownCard() {
  const fonts = useFontContext();

  return (
    <View style={styles.root}>
      <Canvas style={{ width: CARD_W, height: CARD_H }}>
        {/* ── 1. Background gradient ──────────────────────────────────── */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(CARD_W, CARD_H)}
            colors={['#0a0a1e', '#12122e', '#0d0d28']}
            positions={[0, 0.5, 1]}
          />
        </RoundedRect>

        {/* ── 2. Border ────────────────────────────────────────────────── */}
        <RoundedRect x={1} y={1} width={CARD_W - 2} height={CARD_H - 2} r={CORNER_R - 1}>
          <Paint style="stroke" strokeWidth={1.5} color="#3a2a6a" />
        </RoundedRect>

        {/* ── 3. Hex tile pattern (clipped to card) ───────────────────── */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
          <Paint>
            <Path path={hexPath} color="transparent">
              <Paint style="stroke" strokeWidth={0.8} color="rgba(136,102,255,0.12)" />
            </Path>
          </Paint>
        </RoundedRect>

        {/* ── 4. Radial glow ───────────────────────────────────────────── */}
        <RoundedRect x={0} y={0} width={CARD_W} height={CARD_H} r={CORNER_R}>
          <RadialGradient
            c={vec(CX, CY)}
            r={CARD_H * 0.7}
            colors={['#4a2a8a', 'transparent']}
            positions={[0, 1]}
          />
        </RoundedRect>

        {/* ── 5. Corner ornaments ──────────────────────────────────────── */}
        {ORNAMENTS.map(({ x, y }, i) => {
          const dx = x < CX ? 1 : -1;
          const dy = y < CY ? 1 : -1;
          return (
            <React.Fragment key={i}>
              <Circle cx={x} cy={y} r={10}>
                <Paint style="stroke" strokeWidth={1.5} color="#7744cc" />
              </Circle>
              {/* Two extending lines from corner circle */}
              <Line
                p1={vec(x + dx * 10, y)}
                p2={vec(x + dx * 22, y)}
                color="#7744cc"
                strokeWidth={1}
              />
              <Line
                p1={vec(x, y + dy * 10)}
                p2={vec(x, y + dy * 22)}
                color="#7744cc"
                strokeWidth={1}
              />
            </React.Fragment>
          );
        })}

        {/* ── 6. Central medallion ─────────────────────────────────────── */}
        <Circle cx={CX} cy={CY} r={36}>
          <RadialGradient
            c={vec(CX, CY)}
            r={36}
            colors={['#1a0a3a', '#2a1060']}
          />
        </Circle>
        <Circle cx={CX} cy={CY} r={36}>
          <Paint style="stroke" strokeWidth={1.5} color="#7744cc" />
        </Circle>
        {/* Outer medallion ring */}
        <Circle cx={CX} cy={CY} r={42}>
          <Paint style="stroke" strokeWidth={0.5} color="rgba(119,68,204,0.4)" />
        </Circle>

        {/* ── 7. "HERO CARDS" text ─────────────────────────────────────── */}
        {fonts.fontCardTitle && (
          <SkText
            x={CX - 52}
            y={CY + 62}
            text="HERO CARDS"
            font={fonts.fontCardTitle}
            color="#9966ff"
          />
        )}

        {/* ── 8. "TAP TO REVEAL" text ──────────────────────────────────── */}
        {fonts.fontCardSub && (
          <SkText
            x={CX - 46}
            y={CY + 80}
            text="TAP TO REVEAL"
            font={fonts.fontCardSub}
            color="#5533aa"
          />
        )}
      </Canvas>

      {/* ── Hero emoji overlay (native Text — Skia cannot render emoji) ── */}
      <View style={styles.emojiContainer} pointerEvents="none">
        <Text style={styles.emoji}>🦸</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: CARD_W,
    height: CARD_H,
    position: 'relative',
  },
  emojiContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: CARD_H / 2 - 36,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 36,
  },
});
