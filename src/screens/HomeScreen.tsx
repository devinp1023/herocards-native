// HomeScreen — profile card, XP bar, credits, avatar, action buttons, pack stats.

import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from 'react-native-reanimated';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, HomeStackParamList } from '../../App';
import { useSession } from '../context/SessionContext';
import { useGameState } from '../hooks/useGameState';
import { ALL_CARDS } from '../data/cards';
import { RC } from '../data/constants';
import { PACKS } from '../data/packs';
import { PACK_COST } from '../data/constants';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  BottomTabScreenProps<MainTabParamList>
>;

const SCREEN_W = Dimensions.get('window').width;
const XP_BAR_W = SCREEN_W - 40 - 32; // panel padding

const RARITIES = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

// ── XP bar component ──────────────────────────────────────────────────────────
function XpBar({ xpInLevel, xpNeeded }: { xpInLevel: number; xpNeeded: number }) {
  const fillW = useSharedValue(0);
  const pct   = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 1;

  useEffect(() => {
    fillW.value = withDelay(300, withTiming(pct * XP_BAR_W, {
      duration: 800, easing: Easing.out(Easing.cubic),
    }));
  }, [pct]);

  const barStyle = useAnimatedStyle(() => ({ width: fillW.value }));

  return (
    <View style={xpStyles.track}>
      <Animated.View style={[xpStyles.fill, barStyle]} />
    </View>
  );
}

const xpStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: '#0d0d22', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  fill:  { height: '100%', backgroundColor: '#4fc3f7', borderRadius: 3, shadowColor: '#4fc3f7', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 },
});

// ── PackStatCard ──────────────────────────────────────────────────────────────
function PackStatCard({ packId, collection }: { packId: number; collection: number[] }) {
  const pack      = PACKS[packId];
  const packCards = ALL_CARDS.filter(c => c.pack === packId);
  const owned     = packCards.filter(c => collection.includes(c.id));
  const pct       = packCards.length > 0 ? Math.round(owned.length / packCards.length * 100) : 0;

  const statsByRarity = RARITIES.map(r => ({
    r, color: RC[r]?.color ?? '#fff',
    count: owned.filter(c => c.rarity === r).length,
    total: packCards.filter(c => c.rarity === r).length,
  }));

  return (
    <View style={[packStyles.card, { borderColor: pack.color + '33' }]}>
      <View style={packStyles.header}>
        <View style={[packStyles.packDot, { backgroundColor: pack.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={[packStyles.name, { color: pack.color }]}>{pack.name.toUpperCase()}</Text>
          <Text style={packStyles.sub}>{pack.subtitle}</Text>
        </View>
        <Text style={[packStyles.pct, { color: pack.color }]}>{pct}%</Text>
      </View>
      <View style={[packStyles.barTrack, { backgroundColor: pack.color + '18' }]}>
        <View style={[packStyles.barFill, { width: `${pct}%` as any, backgroundColor: pack.color }]} />
      </View>
      <View style={packStyles.rarityRow}>
        {statsByRarity.map(({ r, color, count, total }) => (
          <View key={r} style={packStyles.rarityItem}>
            <View style={[packStyles.rarityDot, { backgroundColor: color }]} />
            <Text style={[packStyles.rarityCount, { color }]}>{count}<Text style={packStyles.rarityTotal}>/{total}</Text></Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const packStyles = StyleSheet.create({
  card:       { backgroundColor:'#0a0a18', borderRadius:14, borderWidth:1, padding:16, marginBottom:12 },
  header:     { flexDirection:'row', alignItems:'center', gap:10, marginBottom:10 },
  packDot:    { width:12, height:12, borderRadius:6, flexShrink:0 },
  name:       { fontFamily:'Orbitron_700Bold', fontSize:11, letterSpacing:1 },
  sub:        { fontFamily:'Rajdhani_600SemiBold', fontSize:12, color:'#506070', marginTop:2 },
  pct:        { fontFamily:'Orbitron_900Black', fontSize:20 },
  barTrack:   { height:5, borderRadius:3, overflow:'hidden', marginBottom:10 },
  barFill:    { height:'100%', borderRadius:3 },
  rarityRow:  { flexDirection:'row', justifyContent:'space-between' },
  rarityItem: { alignItems:'center', gap:3 },
  rarityDot:  { width:6, height:6, borderRadius:3 },
  rarityCount:{ fontFamily:'Orbitron_700Bold', fontSize:10 },
  rarityTotal:{ color:'#303050', fontFamily:'Orbitron_700Bold', fontSize:8 },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { uid, username } = useSession();
  const gs = useGameState(uid);
  const doneCount = 0; // real progress tracked in Session 9

  const isMaxLevel = gs.level >= 100;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          {/* Avatar — initial in ring (emoji unreliable on Hermes) */}
          <View style={styles.avatarRing}>
            <Text style={styles.avatarInitial}>{username.charAt(0).toUpperCase()}</Text>
          </View>

          {/* Username + level */}
          <View style={styles.profileInfo}>
            <Text style={styles.username} numberOfLines={1}>{username.toUpperCase()}</Text>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>LVL {gs.level}</Text>
              </View>
              <Text style={styles.cardCount}>{gs.collection.length} CARDS</Text>
            </View>
            <XpBar xpInLevel={gs.xpInLevel} xpNeeded={gs.xpNeeded} />
            <View style={styles.xpLabelRow}>
              <Text style={styles.xpLabel}>{gs.xpInLevel.toLocaleString()} / {gs.xpNeeded.toLocaleString()} XP</Text>
              {!isMaxLevel
                ? <Text style={styles.xpNextLabel}>LVL {gs.level + 1}</Text>
                : <Text style={[styles.xpNextLabel, { color: '#ff9800' }]}>MAX</Text>
              }
            </View>
          </View>

          {/* Credits */}
          <View style={styles.creditsBox}>
            <Text style={styles.creditsAmount}>{gs.coins.toLocaleString()}</Text>
            <Text style={styles.creditsLabel}>CREDITS</Text>
          </View>
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          {/* Open Pack — Session 7 */}
          <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]}
            onPress={() => navigation.navigate('PackOpening' as never)}>
            <View style={[styles.actionDot, { backgroundColor: '#4fc3f7' }]} />
            <Text style={[styles.actionLabel, { color: '#4fc3f7' }]}>OPEN PACK</Text>
            <Text style={styles.actionSub}>{PACK_COST} CR</Text>
          </TouchableOpacity>

          {/* Store */}
          <TouchableOpacity style={styles.actionBtn}
            onPress={() => (navigation as any).getParent()?.navigate('StoreTab')}>
            <View style={[styles.actionDot, { backgroundColor: '#8890b0' }]} />
            <Text style={styles.actionLabel}>STORE</Text>
          </TouchableOpacity>

          {/* Daily Quests */}
          <TouchableOpacity style={styles.actionBtn}
            onPress={() => (navigation as any).getParent()?.navigate('ProfileTab')}>
            <View style={[styles.actionDot, { backgroundColor: doneCount >= 3 ? '#4caf50' : '#8890b0' }]} />
            <Text style={styles.actionLabel}>QUESTS</Text>
            <Text style={[styles.actionSub, { color: doneCount >= 3 ? '#4caf50' : '#606480' }]}>
              {doneCount}/3 done
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Pack completion stats ── */}
        <Text style={styles.sectionTitle}>PACK PROGRESS</Text>
        <PackStatCard packId={1} collection={gs.collection} />
        <PackStatCard packId={2} collection={gs.collection} />

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex:1, backgroundColor:'#060610' },
  scroll: { padding:20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom:40 },

  // Profile card
  profileCard: {
    flexDirection:'row', alignItems:'flex-start', gap:14,
    backgroundColor:'#0a0a1e', borderRadius:20,
    padding:18, marginBottom:20,
    borderWidth:1, borderColor:'#12122a',
  },
  avatarRing: {
    width:64, height:64, borderRadius:32,
    backgroundColor:'#12122e',
    borderWidth:2, borderColor:'#4fc3f744',
    alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  avatarInitial: { fontFamily:'Orbitron_900Black', fontSize:22, color:'#4fc3f7' },
  profileInfo: { flex:1, gap:2 },
  username: {
    fontFamily:'Orbitron_900Black', fontSize:16,
    color:'#ffffff', letterSpacing:1,
  },
  levelRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  levelBadge: {
    backgroundColor:'#4fc3f722', borderRadius:6,
    paddingHorizontal:8, paddingVertical:2,
    borderWidth:1, borderColor:'#4fc3f744',
  },
  levelText: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#4fc3f7' },
  cardCount: { fontFamily:'Orbitron_700Bold', fontSize:11, color:'#506070' },
  xpLabelRow: { flexDirection:'row', justifyContent:'space-between', marginTop:3 },
  xpLabel:    { fontFamily:'monospace', fontSize:9, color:'#506070' },
  xpNextLabel:{ fontFamily:'Orbitron_700Bold', fontSize:9, color:'#4fc3f788' },
  creditsBox: { alignItems:'center', flexShrink:0 },
  creditsAmount: { fontFamily:'Orbitron_900Black', fontSize:20, color:'#4fc3f7', lineHeight:24 },
  creditsLabel:  { fontFamily:'Orbitron_700Bold', fontSize:8, color:'#404458', letterSpacing:1 },

  // Action buttons
  actionRow: { flexDirection:'row', gap:10, marginBottom:24 },
  actionBtn: {
    flex:1, alignItems:'center', justifyContent:'center',
    backgroundColor:'#0a0a1e', borderRadius:14,
    paddingVertical:14, gap:4,
    borderWidth:1, borderColor:'#14142a',
  },
  actionPrimary: { borderColor:'#4fc3f744', backgroundColor:'#4fc3f70a' },
  actionDot:   { width:8, height:8, borderRadius:4 },
  actionLabel: { fontFamily:'Orbitron_700Bold', fontSize:9, color:'#8890b0', letterSpacing:1 },
  actionSub:   { fontFamily:'Orbitron_700Bold', fontSize:8, color:'#404458' },

  // Section title
  sectionTitle: {
    fontFamily:'Orbitron_700Bold', fontSize:9,
    color:'#404060', letterSpacing:2.5, marginBottom:12,
  },
});
