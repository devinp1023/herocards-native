// MissingCard — placeholder shown in collection grid for unowned cards.
// Pure RN Views (no Skia) — always CARD_W × CARD_H before CardWrapper scaling.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../data/cards';
import { RC } from '../data/constants';
import { T } from '../theme/theme';
import { CARD_W, CARD_H } from './CardWrapper';

interface MissingCardProps {
  card: Card;
}

export function MissingCard({ card }: MissingCardProps) {
  const cfg = RC[card.rarity] ?? RC.Common;
  const color = cfg.color;

  return (
    <View style={[styles.root, { borderColor: color + '44' }]}>
      {/* Rarity tint overlay */}
      <View style={[styles.tint, { backgroundColor: color + '0a' }]} />

      {/* Horizontal stripe texture */}
      {STRIPES.map((_, i) => (
        <View key={i} style={[styles.stripe, { top: i * 13 }]} />
      ))}

      {/* Top row: card number + rarity pip */}
      <View style={styles.topRow}>
        <Text style={[styles.cardNum, { color: color + '77' }]}>
          #{String(card.id).padStart(3, '0')}
        </Text>
        <View style={[styles.pip, { backgroundColor: color, shadowColor: color }]} />
      </View>

      {/* Centre: redaction bars */}
      <View style={styles.center}>
        <View style={[styles.bar, { width: '70%', backgroundColor: color + '22', borderColor: color + '33' }]} />
        <View style={[styles.bar, { width: '50%', backgroundColor: color + '18', borderColor: color + '22' }]} />
        <View style={[styles.bar, { width: '60%', backgroundColor: color + '18', borderColor: color + '22' }]} />
      </View>

      {/* Bottom: rarity label */}
      <View style={styles.bottom}>
        <View style={[styles.rarityBadge, { borderColor: color + '44' }]}>
          <Text style={[styles.rarityText, { color: color + '88' }]}>
            {card.rarity.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Pre-build stripe positions (one per 13px over card height)
const STRIPES = Array.from({ length: Math.ceil(CARD_H / 13) });

const styles = StyleSheet.create({
  root: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#07070d',
    overflow: 'hidden',
    padding: 10,
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  stripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.018)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  cardNum: {
    fontFamily: 'monospace',
    fontSize: T.font.sm,
    letterSpacing: 1,
  },
  pip: {
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },
  bar: {
    height: 9,
    borderRadius: 3,
    borderWidth: 1,
  },
  bottom: {
    alignItems: 'center',
    marginTop: 8,
    zIndex: 2,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  rarityText: {
    fontFamily: 'monospace',
    fontSize: T.font.xs,
    letterSpacing: 1.5,
  },
});
