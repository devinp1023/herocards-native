// MiniCard — lightweight native RN card for grid views (collection + deck builder).
// Drop-in replacement for HeroCard at small scales (≤0.45).
// No Skia canvas, no Reanimated — pure View + StyleSheet.
// Same 300×433 dimensions as HeroCard so CardWrapper scaling is unchanged.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Card } from '../data/cards';
import { RC, TYPE_COLORS } from '../data/constants';
import { CARD_W, CARD_H } from './CardWrapper';

// Mirror HeroCard layout constants exactly
const PAD         = 10;
const INNER_W     = CARD_W - PAD * 2;
const HEADER_H    = 60;
const IMG_Y       = HEADER_H + PAD;
const IMG_H       = 180;
const IMG_BOTTOM  = IMG_Y + IMG_H;
const STATS_Y     = IMG_BOTTOM + 6;
const STATS_H     = 136;
const FOOTER_Y    = STATS_Y + STATS_H + 4;
const CORNER_R    = 14;
const STAT_BAR_H  = 7;
const STAT_ROW_H  = 30;
const STAT_START_Y = STATS_Y + 18;

interface MiniCardProps {
  card: Card;
}

export function MiniCard({ card }: MiniCardProps) {
  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const rarityColor = cfg.color;
  const borderColor = cfg.border;
  const totalPwr   = card.power + card.defense + card.speed;

  const statRows = [
    { label: 'ATK', value: card.power,   color: '#ff6b40' },
    { label: 'DEF', value: card.defense, color: '#4db8ff' },
    { label: 'SPD', value: card.speed,   color: '#ffe040' },
  ];

  return (
    <View style={[s.card, { borderColor }]}>

      {/* Type colour gradient wash — two overlapping tints approximate the Skia gradient */}
      <View style={[s.tintFull, { backgroundColor: typeColor + '28' }]} />
      <View style={[s.tintTop,  { backgroundColor: typeColor + '44' }]} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={[s.cardNum, { color: rarityColor + 'aa' }]}>
          #{String(card.id).padStart(3, '0')}
        </Text>
        {/* Type badge — circle matching HeroCard's Circle element */}
        <View style={[s.typeBadge, { borderColor: typeColor, backgroundColor: typeColor + '30' }]}>
          <Text style={[s.typeLetter, { color: typeColor }]}>{card.type[0]}</Text>
        </View>
      </View>

      {/* Card name */}
      <Text style={s.cardName} numberOfLines={1}>{card.name.toUpperCase()}</Text>

      {/* ── Image window ── */}
      <View style={[s.imageWindow, { borderColor: rarityColor + 'cc' }]}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.imageBg, { backgroundColor: typeColor + '18' }]}>
            <View style={[s.imageGlow, { backgroundColor: typeColor + '30' }]} />
          </View>
        )}
      </View>

      {/* ── Stats box ── */}
      <View style={s.statsBox}>
        {/* Rarity accent bar at top of stats — mirrors HeroCard's Rect */}
        <View style={[s.statsAccent, { backgroundColor: rarityColor + '66' }]} />

        {statRows.map(({ label, value, color }) => (
          <View key={label} style={s.statRow}>
            <Text style={[s.statLabel, { color }]}>{label}</Text>
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${value}%`, backgroundColor: color }]} />
            </View>
            <Text style={s.statVal}>{value}</Text>
          </View>
        ))}

        <View style={s.divider} />

        <View style={s.totalRow}>
          <Text style={[s.totalLabel, { color: rarityColor + '88' }]}>TOTAL PWR</Text>
          <Text style={[s.totalVal,   { color: rarityColor }]}>{totalPwr}</Text>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <Text style={[s.footerText, { color: rarityColor + 'aa' }]} numberOfLines={1}>
          {card.alliance.toUpperCase()}
        </Text>
        <Text style={[s.footerText, { color: typeColor + 'cc' }]} numberOfLines={1}>
          {card.type.toUpperCase()}
        </Text>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#0a0a14',
    borderRadius: CORNER_R,
    borderWidth: 2.5,
    overflow: 'hidden',
  },

  // Type tint layers
  tintFull: { position: 'absolute', top: 0, left: 0, right: 0, height: CARD_H * 0.6 },
  tintTop:  { position: 'absolute', top: 0, left: 0, right: 0, height: CARD_H * 0.25 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD + 2,
    paddingTop: 8,
    height: HEADER_H - 20,
  },
  cardNum: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLetter: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 11,
  },
  cardName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 14,
    color: '#ffffff',
    paddingHorizontal: PAD + 2,
    marginTop: 2,
  },

  // Image window
  imageWindow: {
    position: 'absolute',
    left: PAD,
    top: IMG_Y,
    width: INNER_W,
    height: IMG_H,
    borderRadius: 6,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  image: { width: '100%', height: '100%' },
  imageBg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Stats box
  statsBox: {
    position: 'absolute',
    left: PAD,
    top: STATS_Y,
    width: INNER_W,
    height: STATS_H,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  statsAccent: {
    height: 2,
    marginHorizontal: -8,
    marginBottom: 4,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: STAT_ROW_H,
    gap: 6,
  },
  statLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 9,
    width: 28,
  },
  barTrack: {
    flex: 1,
    height: STAT_BAR_H,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  statVal: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 10,
    color: '#ffffff',
    width: 24,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 2,
  },
  totalLabel: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  totalVal: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 14,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: PAD,
    right: PAD,
    height: CARD_H - FOOTER_Y,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 11,
  },
});
