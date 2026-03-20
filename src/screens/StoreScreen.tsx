// StoreScreen — Avatar store + Card store with daily offers. Built in Session 8.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { useGameStateContext } from '../context/GameStateContext';
import { ALL_CARDS, Card } from '../data/cards';
import { RC } from '../data/constants';
import {
  AVATARS, LEVEL_AVATARS, AVATAR_TIER_COLORS,
  PurchasableAvatar,
} from '../data/packs';
import { isOwned, getLevel } from '../hooks/useGameState';
import { HeroCard } from '../components/HeroCard';
import { CardWrapper } from '../components/CardWrapper';

// ── Layout constant ───────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
// 3-column avatar grid: account for 16px side padding × 2 and 8px gap × 2
const AVATAR_CARD_W = Math.floor((SCREEN_W - 32 - 16) / 3);

// ── Date / time helpers ───────────────────────────────────────────────────────
function getDateSeed(): number {
  return parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, ''), 10);
}
function getMsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// ── Avatar circle ─────────────────────────────────────────────────────────────
function AvatarCircle({
  symbol, color, size = 56, dimmed = false,
}: { symbol: string; color: string; size?: number; dimmed?: boolean }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: dimmed ? '#1a1a2a' : color + '18',
      borderWidth: 2, borderColor: dimmed ? '#2a2a3a' : color + '80',
      alignItems: 'center', justifyContent: 'center',
      opacity: dimmed ? 0.4 : 1,
    }}>
      <Text style={{
        fontFamily: 'Orbitron_900Black',
        fontSize: Math.round(size * 0.38),
        color: dimmed ? '#404060' : color,
      }}>
        {symbol}
      </Text>
    </View>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, color }: { msg: string; color: string }) {
  return (
    <View style={[
      toastStyles.wrap,
      { borderColor: color + '66', backgroundColor: color + '15' },
    ]}>
      <Text style={[toastStyles.text, { color }]}>{msg}</Text>
    </View>
  );
}
const toastStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 108 : 60,
    left: 20, right: 20, zIndex: 99,
    borderRadius: 10, borderWidth: 1,
    padding: 12, alignItems: 'center',
  },
  text: { fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 0.5 },
});

// ── Section divider with centred label ───────────────────────────────────────
function SectionDivider({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: color + '33' }} />
      <Text style={{
        fontFamily: 'Orbitron_700Bold', fontSize: 10,
        color, letterSpacing: 2, marginHorizontal: 12,
      }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: color + '33' }} />
    </View>
  );
}

// Card store uses the real HeroCard at 0.45 scale via CardWrapper.

// ── Avatar grid card ──────────────────────────────────────────────────────────
function AvatarCard({
  symbol, color, name, tier,
  isActive, owned, locked, lockedLevel,
  price, onBuy, onEquip,
}: {
  symbol: string; color: string; name: string; tier: string;
  isActive: boolean; owned: boolean; locked: boolean; lockedLevel?: number;
  price?: number; onBuy?: () => void; onEquip?: () => void;
}) {
  const tc = AVATAR_TIER_COLORS[tier] ?? AVATAR_TIER_COLORS['Common'];
  return (
    <View style={[
      avStyles.card,
      { borderColor: isActive ? tc.color : owned ? tc.border : '#1a1a30' },
      isActive && { backgroundColor: tc.bg },
    ]}>
      <AvatarCircle symbol={symbol} color={color} size={50} dimmed={locked} />
      <Text style={[avStyles.name, owned && !locked && { color: tc.color }]} numberOfLines={2}>
        {name}
      </Text>

      {locked && lockedLevel !== undefined && (
        <View style={avStyles.lockedBadge}>
          <Text style={avStyles.lockedText}>LVL {lockedLevel}</Text>
        </View>
      )}
      {isActive && !locked && (
        <View style={[avStyles.activeBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
          <Text style={[avStyles.activeText, { color: tc.color }]}>ACTIVE</Text>
        </View>
      )}
      {!isActive && owned && !locked && (
        <TouchableOpacity
          style={[avStyles.equipBtn, { backgroundColor: tc.color }]}
          onPress={onEquip}
          activeOpacity={0.8}
        >
          <Text style={avStyles.equipText}>EQUIP</Text>
        </TouchableOpacity>
      )}
      {!owned && !locked && price !== undefined && (
        <TouchableOpacity style={avStyles.buyBtn} onPress={onBuy} activeOpacity={0.8}>
          <Text style={avStyles.buyText}>{price.toLocaleString()} CR</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const avStyles = StyleSheet.create({
  card:        { width: AVATAR_CARD_W, backgroundColor: '#0a0a1e', borderRadius: 12, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 7 },
  name:        { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#8090a0', textAlign: 'center', letterSpacing: 0.3, lineHeight: 12 },
  lockedBadge: { backgroundColor: '#0f0f1e', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  lockedText:  { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#505878', letterSpacing: 0.5 },
  activeBadge: { borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  activeText:  { fontFamily: 'Orbitron_700Bold', fontSize: 7, letterSpacing: 1 },
  equipBtn:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, width: '100%', alignItems: 'center' },
  equipText:   { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#060610', letterSpacing: 1 },
  buyBtn:      { backgroundColor: '#0d0d22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 5, borderWidth: 1, borderColor: '#2a2a40', width: '100%', alignItems: 'center' },
  buyText:     { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#8090a0', letterSpacing: 0.3 },
});

// ── StoreScreen ───────────────────────────────────────────────────────────────
export default function StoreScreen() {
  const gs = useGameStateContext();

  const [activeTab, setActiveTab] = useState<'avatars' | 'cards'>('avatars');
  const [toast, setToast]         = useState<{ msg: string; color: string } | null>(null);
  const [timeLeft, setTimeLeft]   = useState(getMsUntilMidnight);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh countdown every minute
  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getMsUntilMidnight()), 60_000);
    return () => clearInterval(id);
  }, []);

  const hLeft = Math.floor(timeLeft / 3_600_000);
  const mLeft = Math.floor((timeLeft % 3_600_000) / 60_000);

  const showToast = useCallback((msg: string, color = '#4fc3f7') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, color });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  // ── Daily seeds (same algo as web) ─────────────────────────────────────────
  const seed = getDateSeed();

  // Featured avatar deal — 40% off
  const featuredIdx  = ((seed * 2654435761) >>> 0) % AVATARS.length;
  const featured     = AVATARS[featuredIdx];
  const salePrice    = Math.floor(featured.price * 0.6);
  const featuredTc   = AVATAR_TIER_COLORS[featured.tier];

  // Daily card offers
  const legendaries  = gs.cardRoster.filter(c => c.rarity === 'Legendary');
  const epics        = gs.cardRoster.filter(c => c.rarity === 'Epic');
  const rares        = gs.cardRoster.filter(c => c.rarity === 'Rare');
  const dailyLeg     = legendaries[((seed * 1234567) >>> 0) % legendaries.length];
  const dailyEpic    = epics[((seed * 3141592) >>> 0) % epics.length];
  const dailyRare    = rares[((seed * 7654321) >>> 0) % rares.length];

  const LEGENDARY_PRICE = 8000;
  const EPIC_PRICE      = 5000;
  const RARE_PRICE      = 3000;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBuyAvatar = (av: PurchasableAvatar, price: number) => {
    const ok = gs.purchaseAvatar(av.id, price);
    if (!ok) { showToast('Not enough credits!', '#ef5350'); return; }
    const tc = AVATAR_TIER_COLORS[av.tier];
    showToast(`${av.name} unlocked!`, tc.color);
  };

  const handleEquipAvatar = (id: string) => {
    gs.equipAvatar(id);
    showToast('Avatar equipped!', '#ff9800');
  };

  const handleBuyCard = (card: Card, price: number) => {
    const ok = gs.spendCoins(price);
    if (!ok) { showToast('Not enough credits!', '#ef5350'); return; }
    gs.addCards([card.id]);
    showToast(`${card.name} added!`, RC[card.rarity].color);
  };

  const currentLevel = getLevel(gs.xp);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {toast && <Toast msg={toast.msg} color={toast.color} />}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Text style={styles.storeTitle}>STORE</Text>
        <View style={styles.creditsChip}>
          <Text style={styles.creditsVal}>{gs.coins.toLocaleString()}</Text>
          <Text style={styles.creditsLbl}> CR</Text>
        </View>
      </View>

      {/* ── Tab switcher ────────────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        {(['avatars', 'cards'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'avatars' ? 'AVATAR STORE' : 'CARD STORE'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ════════════════ AVATAR STORE ═══════════════════════════════ */}
        {activeTab === 'avatars' && (
          <>
            {/* Featured deal */}
            <SectionDivider label="FEATURED DEAL" color="#ff9800" />
            <View style={[styles.featuredCard, { borderColor: '#ff980077' }]}>
              <AvatarCircle symbol={featured.symbol} color={featured.color} size={68} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                  <Text style={styles.featuredName}>{featured.name}</Text>
                  <View style={[styles.tierBadge, { backgroundColor: featuredTc.bg, borderColor: featuredTc.border }]}>
                    <Text style={[styles.tierText, { color: featuredTc.color }]}>
                      {featured.tier.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.salePrice}>{salePrice.toLocaleString()} CR</Text>
                  <Text style={styles.origPrice}>{featured.price.toLocaleString()}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>40% OFF</Text>
                  </View>
                </View>
                <Text style={styles.resetLabel}>Resets in {hLeft}h {mLeft}m</Text>
                {/* Buy / Equip / Active — inline under info on smaller screens */}
                <View style={{ marginTop: 10 }}>
                  {gs.activeAvatar === featured.id ? (
                    <View style={[styles.activeChip, { backgroundColor: featuredTc.bg, borderColor: featuredTc.border }]}>
                      <Text style={[styles.activeChipText, { color: featuredTc.color }]}>ACTIVE</Text>
                    </View>
                  ) : gs.ownedAvatars.includes(featured.id) ? (
                    <TouchableOpacity
                      style={[styles.featuredEquipBtn, { backgroundColor: featuredTc.color }]}
                      onPress={() => handleEquipAvatar(featured.id)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.featuredEquipText}>EQUIP</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.featuredBuyBtn,
                        { borderColor: gs.coins >= salePrice ? '#ff980088' : '#1a1a30' },
                      ]}
                      onPress={() => handleBuyAvatar(featured, salePrice)}
                      activeOpacity={0.85}
                    >
                      <Text style={[
                        styles.featuredBuyText,
                        { color: gs.coins >= salePrice ? '#ff9800' : '#404060' },
                      ]}>
                        {gs.coins >= salePrice
                          ? `BUY  ${salePrice.toLocaleString()} CR`
                          : 'NOT ENOUGH CR'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Level-Up Exclusive */}
            <SectionDivider label="LEVEL-UP EXCLUSIVE" color="#00e676" />
            <Text style={styles.sectionSub}>Automatically unlocked as you level up</Text>
            <View style={styles.avatarGrid}>
              {LEVEL_AVATARS.map(av => {
                const locked = currentLevel < (av.unlocksAt ?? 0);
                const owned  = gs.ownedAvatars.includes(av.id);
                return (
                  <AvatarCard
                    key={av.id}
                    symbol={av.symbol}
                    color={av.color}
                    name={av.name}
                    tier="LevelUp"
                    isActive={gs.activeAvatar === av.id}
                    owned={owned}
                    locked={locked}
                    lockedLevel={av.unlocksAt}
                    onEquip={() => handleEquipAvatar(av.id)}
                  />
                );
              })}
            </View>

            {/* Purchaseable tiers */}
            {(['Common', 'Rare', 'Epic', 'Legendary'] as const).map(tier => {
              const tierAvatars = AVATARS.filter(a => a.tier === tier);
              const tc = AVATAR_TIER_COLORS[tier];
              return (
                <View key={tier}>
                  <SectionDivider
                    label={`${tier.toUpperCase()} — ${tierAvatars[0].price.toLocaleString()} CR`}
                    color={tc.color}
                  />
                  <View style={styles.avatarGrid}>
                    {tierAvatars.map(av => (
                      <AvatarCard
                        key={av.id}
                        symbol={av.symbol}
                        color={av.color}
                        name={av.name}
                        tier={av.tier}
                        isActive={gs.activeAvatar === av.id}
                        owned={gs.ownedAvatars.includes(av.id)}
                        locked={false}
                        price={av.price}
                        onBuy={() => handleBuyAvatar(av, av.price)}
                        onEquip={() => handleEquipAvatar(av.id)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ════════════════ CARD STORE ══════════════════════════════════ */}
        {activeTab === 'cards' && (
          <>
            <Text style={styles.cardStoreSub}>One card per rarity, same for all players today</Text>
            <Text style={styles.resetTimer}>Resets in {hLeft}h {mLeft}m</Text>

            {[
              { card: dailyLeg,  price: LEGENDARY_PRICE },
              { card: dailyEpic, price: EPIC_PRICE },
              { card: dailyRare, price: RARE_PRICE },
            ].map(({ card, price }) => {
              if (!card) return null;
              const cfg        = RC[card.rarity];
              const alreadyOwned = isOwned(gs.collection, card.id);
              const canAfford  = gs.coins >= price;
              return (
                <View
                  key={card.id}
                  style={[styles.cardOffer, { borderColor: cfg.color + '55' }]}
                >
                  {/* Left rarity accent strip */}
                  <View style={[styles.offerAccent, { backgroundColor: cfg.color }]} />
                  <CardWrapper scale={0.45}>
                    <HeroCard card={card} showShine />
                  </CardWrapper>
                  <View style={styles.offerRight}>
                    <View style={[
                      styles.rarityPill,
                      { backgroundColor: cfg.color + '20', borderColor: cfg.color + '60' },
                    ]}>
                      <Text style={[styles.rarityPillText, { color: cfg.color }]}>
                        {card.rarity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.offerName}>{card.name}</Text>
                    <Text style={[styles.offerPrice, { color: cfg.color }]}>
                      {price.toLocaleString()} CR
                    </Text>
                    {alreadyOwned ? (
                      <View style={styles.ownedBadge}>
                        <Text style={styles.ownedBadgeText}>IN COLLECTION</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.buyCardBtn,
                          { borderColor: cfg.color + '88' },
                          !canAfford && styles.buyCardBtnDisabled,
                        ]}
                        onPress={() => handleBuyCard(card, price)}
                        activeOpacity={0.85}
                      >
                        <Text style={[
                          styles.buyCardBtnText,
                          { color: canAfford ? cfg.color : '#404060' },
                        ]}>
                          {canAfford ? 'BUY' : 'NOT ENOUGH CR'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#060610' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 12,
    backgroundColor: '#060610',
  },
  storeTitle:  { fontFamily: 'Orbitron_900Black', fontSize: 22, color: '#ff9800', letterSpacing: 3 },
  creditsChip: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: '#0a0a1e', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#1a1a30',
  },
  creditsVal: { fontFamily: 'Orbitron_900Black', fontSize: 14, color: '#4fc3f7' },
  creditsLbl: { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#404458', letterSpacing: 1 },

  // Tab row
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0a0a1e',
    marginHorizontal: 16, marginBottom: 16,
    borderRadius: 12, borderWidth: 1, borderColor: '#14142a',
    overflow: 'hidden',
  },
  tab:          { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive:    { backgroundColor: '#ff9800' },
  tabText:      { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#404458', letterSpacing: 1 },
  tabTextActive:{ color: '#060610' },

  // Featured deal
  featuredCard: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: '#120800', borderRadius: 16, borderWidth: 1.5,
    padding: 16, marginBottom: 24,
  },
  featuredName:     { fontFamily: 'Orbitron_900Black', fontSize: 13, color: '#fff', letterSpacing: 0.5 },
  tierBadge:        { borderRadius: 5, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  tierText:         { fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 1 },
  salePrice:        { fontFamily: 'Orbitron_900Black', fontSize: 15, color: '#ff9800' },
  origPrice:        { fontFamily: 'Orbitron_700Bold', fontSize: 11, color: '#404060', textDecorationLine: 'line-through' },
  discountBadge:    { backgroundColor: '#ff980022', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#ff980055' },
  discountText:     { fontFamily: 'Orbitron_700Bold', fontSize: 8, color: '#ff9800', letterSpacing: 1 },
  resetLabel:       { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#506070' },
  activeChip:       { alignSelf: 'flex-start', borderRadius: 7, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  activeChipText:   { fontFamily: 'Orbitron_700Bold', fontSize: 9, letterSpacing: 1 },
  featuredEquipBtn: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  featuredEquipText:{ fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#060610', letterSpacing: 1 },
  featuredBuyBtn:   { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, backgroundColor: 'transparent' },
  featuredBuyText:  { fontFamily: 'Orbitron_700Bold', fontSize: 10, letterSpacing: 0.5 },

  // Section sub-label
  sectionSub: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#404060', marginBottom: 12, marginTop: -8 },

  // Avatar grid — 3 columns
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },

  // Card store
  cardStoreSub: { fontFamily: 'Rajdhani_600SemiBold', fontSize: 13, color: '#8090a0', marginBottom: 4 },
  resetTimer:   { fontFamily: 'Orbitron_700Bold', fontSize: 10, color: '#ff9800', letterSpacing: 1, marginBottom: 20 },

  cardOffer: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: '#0a0a1e', borderRadius: 16, borderWidth: 1.5,
    padding: 16, paddingLeft: 20, marginBottom: 16, overflow: 'hidden',
  },
  offerAccent:  { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3 },
  offerRight:   { flex: 1, gap: 8, justifyContent: 'flex-start' },
  rarityPill:   { alignSelf: 'flex-start', borderRadius: 5, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  rarityPillText: { fontFamily: 'Orbitron_700Bold', fontSize: 8, letterSpacing: 1 },
  offerName:    { fontFamily: 'Orbitron_700Bold', fontSize: 13, color: '#c0c8dc', letterSpacing: 0.3, lineHeight: 18 },
  offerPrice:   { fontFamily: 'Orbitron_900Black', fontSize: 18 },
  ownedBadge:   { backgroundColor: '#00e67620', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#00e67640', alignItems: 'center' },
  ownedBadgeText: { fontFamily: 'Orbitron_700Bold', fontSize: 9, color: '#00e676', letterSpacing: 1 },
  buyCardBtn:     { borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5, backgroundColor: 'transparent' },
  buyCardBtnText: { fontFamily: 'Orbitron_700Bold', fontSize: 11, letterSpacing: 1 },
  buyCardBtnDisabled: { borderColor: '#1a1a30' },
});
