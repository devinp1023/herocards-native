/**
 * GradientBorder — wraps children with a gradient border effect.
 *
 * React Native doesn't support CSS background-clip, so gradient borders
 * are achieved by rendering a LinearGradient as the outer shell with 1px
 * padding, and the content View sits inside with its own background.
 *
 * Use for: interactive/highlighted elements — buttons, toasts, active inputs,
 * selected cards, legendary card preview.
 *
 * Do NOT use for: static panels at rest, list row separators, progress bar tracks.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme/theme';

interface Props {
  children: React.ReactNode;
  /** Gradient colors for the border. Default: mint gradient */
  colors?: [string, string, ...string[]];
  /** Gradient direction start point. Default: { x: 0, y: 0 } (top-left) */
  start?: { x: number; y: number };
  /** Gradient direction end point. Default: { x: 1, y: 1 } (bottom-right) */
  end?: { x: number; y: number };
  /** Border width in px. Default: 1 */
  borderWidth?: number;
  /** Border radius. Default: T.radius.lg (14) */
  borderRadius?: number;
  /** Background color of the inner content area. Default: T.bg.surface */
  innerBackground?: string;
  /** Style applied to the outer gradient container */
  style?: StyleProp<ViewStyle>;
  /** Style applied to the inner content View */
  innerStyle?: StyleProp<ViewStyle>;
}

function GradientBorderInner({
  children,
  colors = [T.accent.mint + '66', T.accent.mint + '22'],
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  borderWidth = 1,
  borderRadius = T.radius.lg,
  innerBackground = T.bg.surface,
  style,
  innerStyle,
}: Props) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[{ padding: borderWidth, borderRadius }, style]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: borderRadius - borderWidth,
            backgroundColor: innerBackground,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

export const GradientBorder = React.memo(GradientBorderInner);

// ── Preset color combos ─────────────────────────────────────────────────────
export const BORDER_COLORS = {
  mint: [T.accent.mint + '66', T.accent.mint + '22'] as [string, string],
  violet: [T.accent.violet + '66', T.accent.violet + '22'] as [string, string],
  gold: [T.accent.gold + '66', T.accent.gold + '22'] as [string, string],
  danger: [T.status.danger + '66', T.status.danger + '22'] as [string, string],
  legendary: [T.accent.gold + '66', T.accent.violet + '44', T.accent.gold + '66'] as [string, string, string],
} as const;

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
  },
});
