// MiniCard — lightweight native RN card for grid views (collection + deck builder).
// Redesigned layout matching HeroCard: type icon, name, HP, image, ability, stat pills.
// No Skia canvas, no Reanimated — pure View + StyleSheet.
// Same 300×433 dimensions as HeroCard so CardWrapper scaling is unchanged.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { T } from '../theme/theme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from '../data/cards';

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
import { RC, TYPE_COLORS, RARITY_META } from '../data/constants';
import { ABILITY_DESC } from '../data/abilities';
import { CARD_W, CARD_H } from './CardWrapper';
import type { BattleProps } from './HeroCard';

// Layout constants (match HeroCard exactly)
const PAD       = 10;
const INNER_W   = CARD_W - PAD * 2;
const CORNER_R  = 14;

// Header
const TYPE_R    = 18;
const TYPE_CX   = PAD + TYPE_R + 2;
const TYPE_CY   = 24;
const NAME_X    = TYPE_CX + TYPE_R + 8;

// Subtitle overlay Y
const HP_Y      = 10;

// Stat pills (anchored to bottom)
const PILL_H    = 26;
const PILL_Y    = CARD_H - 12 - PILL_H;
const PILL_W    = 82;
const PILL_GAP  = (INNER_W - 3 * PILL_W) / 2;
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

interface MiniCardProps extends BattleProps {
  card: Card;
}

export function MiniCard({
  card,
  currentHp,
  maxHp,
  currentStamina,
  isActive = false,
  hpPct,
}: MiniCardProps) {
  const cfg        = RC[card.rarity] ?? RC.Common;
  const typeColor  = TYPE_COLORS[card.type] ?? '#888888';
  const rm         = RARITY_META[card.rarity] ?? { color: '#9CA3AF', shimmer: false };
  const rarityColor = cfg.color;
  const borderColor = rm.color + 'bb';

  // Battle-aware values
  const computedMaxHp = maxHp ?? Math.round(100 + card.defense * 0.5);
  const displayHp     = currentHp ?? computedMaxHp;
  const displayHpPct  = hpPct ?? (currentHp != null && maxHp ? currentHp / maxHp : 1);
  const maxStam       = card.stamina ?? 0;
  const displayStam   = currentStamina ?? maxStam;

  const hp = displayHp;
  const hpBarColor = displayHpPct > 0.5 ? T.status.vitality : displayHpPct > 0.25 ? T.status.caution : T.status.danger;
  const abilityDesc = card.ability ? ABILITY_DESC[card.ability] : null;

  const statPills: { icon: 'sword' | 'shield' | 'run-fast'; value: number; bg: string }[] = [
    { icon: 'sword',    value: card.power,   bg: '#e8445a' },
    { icon: 'shield',   value: card.defense, bg: '#8b5cf6' },
    { icon: 'run-fast', value: card.speed,   bg: '#f59e0b' },
  ];

  return (
    <View style={[s.card, { borderColor }]}>


      {/* Top rarity accent strip */}
      <View style={[s.rarityStrip, { backgroundColor: rm.color }]} />

      {/* Type colour wash — single full-card tint */}
      <View style={[s.typeTint, { backgroundColor: typeColor + '30' }]} />

      {/* ── Type icon ── */}
      <View style={[s.typeIcon, {
        borderColor: 'rgba(255,255,255,0.35)',
        backgroundColor: typeColor,
      }]}>
        <MaterialCommunityIcons
          name={(TYPE_ICONS[card.type] ?? 'help-circle-outline') as any}
          size={18}
          color="#ffffff"
          style={{ textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 3 }}
        />
      </View>

      {/* ── Name ── */}
      <View style={s.nameBlock}>
        <Text style={s.cardName} numberOfLines={1}>{card.name}</Text>
      </View>

      {/* ── Alliance / number / rarity (top-right) ── */}
      <View style={s.subtitleOverlay}>
        <Text style={s.subtitle} numberOfLines={1}>
          {card.alliance.toUpperCase()} {'\u2022'} #{String(card.id).padStart(3, '0')}
        </Text>
        <Text style={s.subtitle} numberOfLines={1}>
          {card.rarity.toUpperCase()}
        </Text>
      </View>

      {/* ── Image window ── */}
      <View style={[s.imageWindow, { borderColor }]}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={[s.placeholder, { backgroundColor: typeColor + '18' }]}>
            <View style={[s.placeholderGlow, { backgroundColor: typeColor + '30' }]} />
            <MaterialCommunityIcons
              name={(TYPE_ICONS[card.type] ?? 'help-circle-outline') as any}
              size={72}
              color={typeColor + '70'}
            />
          </View>
        )}
      </View>

      {/* ── Ability bar ── */}
      <View style={s.abilityBar}>
        {card.ability && abilityDesc ? (
          <Text style={s.abilityText} numberOfLines={3}>
            <Text style={s.abilityName}>{card.ability}: </Text>{abilityDesc}
          </Text>
        ) : (
          <Text style={s.abilityText}>No special ability</Text>
        )}
      </View>
      <View style={[s.abilityAccentBar, { backgroundColor: rm.color }]} />

      {/* ── Stats group wrapper — HP, STA, pills in one box ── */}
      <View style={s.statsWrapper}>
        <View style={[s.statsAccentBar, { backgroundColor: rm.color }]} />

        {/* HP row */}
        <View style={s.hpSection}>
          <View style={s.statRowHeader}>
            <Text style={s.statTag}>HP</Text>
            <Text style={[s.statValue, { color: hpBarColor }]}>{displayHp}</Text>
          </View>
          <View style={[s.hpBarTrack, { shadowColor: hpBarColor }]}>
            <View style={[s.hpBarFill, { width: `${displayHpPct * 100}%`, backgroundColor: hpBarColor }]} />
          </View>
        </View>

        {/* STA row */}
        {maxStam > 0 && (
          <View style={s.stamSection}>
            <View style={s.statRowHeader}>
              <Text style={s.statTag}>STA</Text>
              <Text style={s.stamValue}>{displayStam}</Text>
            </View>
            <View style={[s.stamTrack, { shadowColor: '#4fc3f7' }]}>
              {Array.from({ length: maxStam }, (_, i) => (
                <View key={i} style={[
                  s.stamPip,
                  i < displayStam ? s.stamPipFilled : s.stamPipEmpty,
                ]}>
                  {i < displayStam && <View style={s.stamPipGloss} />}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stat pills */}
        <View style={s.pillRow}>
          {statPills.map(({ icon, value, bg }) => (
            <View key={icon} style={[s.pill, { backgroundColor: bg }]}>
              <MaterialCommunityIcons name={icon} size={20} color="rgba(255,255,255,0.75)" />
              <Text style={s.pillValue}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    backgroundColor: '#040408',
    borderRadius: CORNER_R,
    borderWidth: 2,
    overflow: 'hidden',
  },

  // Rarity dot
  rarityDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 5,
    height: 5,
    borderRadius: 99,
    zIndex: 10,
  },

  // Type tint — full card wash
  typeTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CORNER_R },

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

  // Name block
  nameBlock: {
    position: 'absolute',
    left: NAME_X,
    top: 11,
    width: CARD_W - PAD - NAME_X - 4,
    height: 26,
    justifyContent: 'center',
  },
  cardName: {
    fontFamily: 'Orbitron_700Bold',
    fontSize: 18,
    color: '#ffffff',
  },

  // Subtitle overlay (top-right)
  subtitleOverlay: {
    position: 'absolute',
    right: PAD,
    top: HP_Y,
    width: 140,
    height: 34,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtitle: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.3,
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
  placeholderGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  rarityStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    zIndex: 10,
  },

  // Stats group wrapper
  statsWrapper: {
    position: 'absolute',
    left: PAD,
    top: HPBAR_Y,
    width: INNER_W,
    height: PILL_Y + PILL_H - HPBAR_Y,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  statValue: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    lineHeight: 18,
  },
  stamValue: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
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

  // Ability bar
  abilityAccentBar: {
    position: 'absolute',
    left: PAD,
    top: ABL_Y,
    width: 3,
    height: ABL_H,
    borderRadius: 2,
  },
  abilityBar: {
    position: 'absolute',
    left: PAD,
    top: ABL_Y,
    width: INNER_W,
    height: ABL_H,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  abilityText: {
    fontFamily: 'Rajdhani_600SemiBold',
    fontSize: 16,
    color: '#e8e8e8',
    lineHeight: 20,
  },
  abilityName: {
    fontFamily: 'Rajdhani_600SemiBold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Stat pills
  pillRow: {
    height: PILL_H,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pill: {
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
  pillValue: {
    fontFamily: 'Orbitron_900Black',
    fontSize: 17,
    color: '#ffffff',
    flex: 1,
    textAlign: 'right',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
