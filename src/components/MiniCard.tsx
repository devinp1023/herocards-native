// MiniCard — lightweight native RN card for grid views (collection + deck builder).
// Redesigned layout matching HeroCard: type icon, name, HP, image, ability, stat pills.
// No Skia canvas, no Reanimated — pure View + StyleSheet.
// Same 300×433 dimensions as HeroCard so CardWrapper scaling is unchanged.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from '../data/cards';
import { RC, TYPE_COLORS } from '../data/constants';
import { ABILITY_DESC } from '../data/abilities';
import { CARD_W, CARD_H } from './CardWrapper';

// Layout constants (match HeroCard exactly)
const PAD       = 10;
const INNER_W   = CARD_W - PAD * 2;
const CORNER_R  = 14;

// Header
const TYPE_R    = 15;
const TYPE_CX   = PAD + TYPE_R + 2;
const TYPE_CY   = 24;
const NAME_X    = TYPE_CX + TYPE_R + 8;

// HP badge
const HP_W      = 68;
const HP_H      = 28;
const HP_R      = 14;
const HP_X      = CARD_W - PAD - HP_W;
const HP_Y      = 10;

// Stat pills (anchored to bottom)
const PILL_H    = 40;
const PILL_Y    = CARD_H - 12 - PILL_H;
const PILL_W    = 82;
const PILL_GAP  = (INNER_W - 3 * PILL_W) / 2;
const PILL_R    = 20;

// Ability bar
const ABL_H     = 54;
const ABL_Y     = PILL_Y - 4 - ABL_H;

// Image window
const IMG_Y     = 50;
const IMG_H     = ABL_Y - 4 - IMG_Y;

interface MiniCardProps {
  card: Card;
}

export function MiniCard({ card }: MiniCardProps) {
  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const rarityColor = cfg.color;
  const borderColor = cfg.border;

  const hp = Math.round(100 + card.defense * 0.5);
  const abilityDesc = card.ability ? ABILITY_DESC[card.ability] : null;

  const statPills: { icon: 'sword' | 'shield' | 'run-fast'; value: number; bg: string }[] = [
    { icon: 'sword',    value: card.power,   bg: '#e8445a' },
    { icon: 'shield',   value: card.defense, bg: '#3aadad' },
    { icon: 'run-fast', value: card.speed,   bg: '#4caf6a' },
  ];

  return (
    <View style={[s.card, { borderColor }]}>

      {/* Type colour wash */}
      <View style={[s.tintTop, { backgroundColor: typeColor + '30' }]} />

      {/* ── Type icon ── */}
      <View style={[s.typeIcon, {
        borderColor: typeColor,
        backgroundColor: typeColor + '25',
      }]}>
        <Text style={[s.typeLetter, { color: typeColor }]}>{card.type[0]}</Text>
      </View>

      {/* ── Name + subtitle ── */}
      <View style={s.nameBlock}>
        <Text style={s.cardName} numberOfLines={1}>{card.name}</Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {card.alliance.toUpperCase()} {'\u2022'} #{String(card.id).padStart(3, '0')} {'\u2022'} {card.rarity.toUpperCase()}
        </Text>
      </View>

      {/* ── HP badge ── */}
      <View style={s.hpBadge}>
        <View style={s.hpIconWrap}>
          <MaterialCommunityIcons name="heart" size={12} color="#7c3aed" />
        </View>
        <Text style={s.hpText}>{hp}</Text>
      </View>

      {/* ── Image window ── */}
      <View style={[s.imageWindow, { borderColor }]}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.placeholder, { backgroundColor: typeColor + '10' }]}>
            <View style={[s.placeholderCircle, {
              backgroundColor: typeColor + '20',
              borderColor: typeColor + '40',
            }]}>
              <Text style={[s.placeholderLetter, { color: typeColor + '60' }]}>
                {card.type[0]}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Ability bar ── */}
      <View style={s.abilityBar}>
        {abilityDesc ? (
          <Text style={s.abilityText} numberOfLines={2}>
            {abilityDesc}
          </Text>
        ) : (
          <Text style={s.abilityText}>No special ability</Text>
        )}
      </View>

      {/* ── Stat pills ── */}
      <View style={s.pillRow}>
        {statPills.map(({ icon, value, bg }) => (
          <View key={icon} style={[s.pill, { backgroundColor: bg }]}>
            <View style={s.pillIcon}>
              <MaterialCommunityIcons name={icon} size={20} color="#7c3aed" />
            </View>
            <Text style={s.pillValue}>{value}</Text>
          </View>
        ))}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#0f1528',
    borderRadius: CORNER_R,
    borderWidth: 3,
    overflow: 'hidden',
  },

  // Type tint
  tintTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.3,
  },

  // Type icon
  typeIcon: {
    position: 'absolute',
    left: TYPE_CX - TYPE_R,
    top: TYPE_CY - TYPE_R,
    width: TYPE_R * 2,
    height: TYPE_R * 2,
    borderRadius: TYPE_R,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLetter: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 13,
  },

  // Name block
  nameBlock: {
    position: 'absolute',
    left: NAME_X,
    top: 8,
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

  // HP badge
  hpBadge: {
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

  // Image window
  imageWindow: {
    position: 'absolute',
    left: PAD,
    top: IMG_Y,
    width: INNER_W,
    height: IMG_H,
    borderRadius: 8,
    borderWidth: 2.5,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 24,
  },

  // Ability bar
  abilityBar: {
    position: 'absolute',
    left: PAD,
    top: ABL_Y,
    width: INNER_W,
    height: ABL_H,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.50)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  abilityText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#cccccc',
  },

  // Stat pills
  pillRow: {
    position: 'absolute',
    left: PAD,
    top: PILL_Y,
    width: INNER_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ffffffcc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
  },
  pillIcon: {
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
});
