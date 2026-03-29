// HomeScreen — profile card, XP bar, credits, avatar, action buttons, pack stats.

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Platform, Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withRepeat, withSequence, Easing,
} from 'react-native-reanimated';
import { useElevation } from '../theme/elevation';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, HomeStackParamList } from '../../App';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../context/SessionContext';
import { totalUniqueOwned } from '../hooks/useGameState';
import { useGameStateContext } from '../context/GameStateContext';
import { AVATARS, LEVEL_AVATARS } from '../data/packs';
import { getTodaysQuests, DIFF_COLOR, Quest } from '../data/quests';
import { MaterialSurface } from '../components/MaterialSurface';
import { GradientBorder, BORDER_COLORS } from '../components/GradientBorder';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from '../theme/theme';
import { ScreenBackground } from '../components/ScreenBackground';
import { AnimatedNumber } from '../components/AnimatedNumber';
import LightningStrike from '../components/LightningStrike';
import { useRipple } from '../hooks/useRipple';

type Props = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParamList, 'Home'>,
  BottomTabScreenProps<MainTabParamList>
>;

const SCREEN_W = Dimensions.get('window').width;
const XP_BAR_W = SCREEN_W - 40 - 32; // panel padding

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
      <Animated.View style={[xpStyles.fill, barStyle]}>
        <LinearGradient
          colors={[T.accent.violet, '#cc6dff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={xpStyles.gradient}
        />
      </Animated.View>
    </View>
  );
}

const xpStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: T.bg.elevated, borderRadius: 3, overflow: 'hidden', marginTop: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  fill:  { height: '100%', borderRadius: 3, shadowColor: T.accent.violet, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4 },
  gradient: { flex: 1, borderRadius: 3 },
});

// ── QuestCard ─────────────────────────────────────────────────────────────────
function QuestCard({ quest, progress }: { quest: Quest; progress: number }) {
  const target    = quest.req.n;
  const done      = progress >= target;
  const pct       = Math.min(progress / target, 1);
  const diffColor = DIFF_COLOR[quest.diff] ?? T.accent.mint;

  const [pressed, setPressed] = useState(false);
  const { animatedStyle: elevStyle } = useElevation(pressed ? 'hovered' : 'resting');

  return (
    <Animated.View style={elevStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
      >
        <MaterialSurface energyBorder style={[qStyles.card, done && qStyles.cardDone]}>
          <View style={qStyles.top}>
            <View style={[qStyles.iconBox, { borderColor: quest.color + '55', backgroundColor: quest.color + '14' }]}>
              <Text style={[qStyles.iconSymbol, { color: quest.color }]}>{quest.symbol}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[qStyles.task, done && { color: T.status.vitality + '99' }]}>{quest.task}</Text>
              <View style={qStyles.metaRow}>
                <View style={[qStyles.diffBadge, { borderColor: diffColor + '66', backgroundColor: diffColor + '18' }]}>
                  <Text style={[qStyles.diffText, { color: diffColor }]}>{quest.diff.toUpperCase()}</Text>
                </View>
                <Text style={qStyles.reward}>+{quest.xp} XP  +{quest.credits} CR</Text>
              </View>
            </View>
            {done
              ? <View style={qStyles.checkBox}><Text style={qStyles.checkmark}>DONE</Text></View>
              : <Text style={qStyles.progressText}>{progress}/{target}</Text>
            }
          </View>
          <View style={qStyles.barTrack}>
            <View style={[
              qStyles.barFill,
              { width: `${Math.round(pct * 100)}%` as any },
              done
                ? { backgroundColor: T.status.vitality, shadowColor: T.status.vitality, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }
                : { backgroundColor: T.accent.mint, shadowColor: T.accent.mint, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
            ]} />
          </View>
        </MaterialSurface>
      </TouchableOpacity>
    </Animated.View>
  );
}

const qStyles = StyleSheet.create({
  card:         { borderRadius:12, padding:14, marginBottom:10 },
  cardDone:     { borderColor:T.status.vitality + '33', backgroundColor:T.status.vitality + '08' },
  top:          { flexDirection:'row', alignItems:'center', gap:12, marginBottom:10 },
  iconBox:      { width:34, height:34, borderRadius:8, borderWidth:1, alignItems:'center', justifyContent:'center', flexShrink:0 },
  iconSymbol:   { fontSize:T.font.lg, lineHeight:20 },
  task:         { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:T.text.body, letterSpacing:0.3, lineHeight:16 },
  metaRow:      { flexDirection:'row', alignItems:'center', gap:8, marginTop:5 },
  diffBadge:    { paddingHorizontal:7, paddingVertical:2, borderRadius:5, borderWidth:1 },
  diffText:     { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, letterSpacing:T.letterSpacing.xs },
  reward:       { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.md, color:T.text.muted },
  checkBox:     { backgroundColor:T.status.vitality + '22', borderRadius:6, paddingHorizontal:6, paddingVertical:3, borderWidth:1, borderColor:T.status.vitality + '66' },
  checkmark:    { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.status.vitality, letterSpacing:T.letterSpacing.xs },
  progressText: { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:T.text.muted },
  barTrack:     { height:4, backgroundColor:T.bg.elevated, borderRadius:2, overflow:'hidden', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  barFill:      { height:'100%', borderRadius:2 },
});

// ── HomeScreen ────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  const { username } = useSession();
  const gs = useGameStateContext();
  const todaysQuests = getTodaysQuests();
  const questProgress = gs.questProgress;
  const doneCount = todaysQuests.filter(q => (questProgress[q.id] ?? 0) >= q.req.n).length;

  const isMaxLevel = gs.level >= 100;
  const isFocused = useIsFocused();

  // Glow pulse animations
  const battleGlow = useSharedValue(0.5);
  const packGlow   = useSharedValue(0.5);

  useEffect(() => {
    if (isFocused) {
      const pulseConfig = { duration: 1200, easing: Easing.inOut(Easing.ease) };
      battleGlow.value = withRepeat(
        withSequence(withTiming(1, pulseConfig), withTiming(0.5, pulseConfig)),
        -1, false,
      );
      packGlow.value = withRepeat(
        withSequence(withTiming(1, pulseConfig), withTiming(0.5, pulseConfig)),
        -1, false,
      );
    } else {
      battleGlow.value = 0.5;
      packGlow.value   = 0.5;
    }
  }, [isFocused]);

  const battleGlowStyle = useAnimatedStyle(() => ({
    shadowColor:   T.accent.mint,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: battleGlow.value,
    shadowRadius:  14,
  }));

  const packGlowStyle = useAnimatedStyle(() => ({
    shadowColor:   T.accent.violet,
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: packGlow.value,
    shadowRadius:  14,
  }));

  // Breathing shimmer overlay (reuses glow shared values)
  const battleShimmerStyle = useAnimatedStyle(() => ({
    opacity: battleGlow.value * 0.12,
  }));
  const packShimmerStyle = useAnimatedStyle(() => ({
    opacity: packGlow.value * 0.12,
  }));

  // Saved battle resume
  const saved = gs.savedBattle;
  const hasSavedBattle = saved && saved.version === 1 &&
    (Date.now() - (saved.savedAt ?? 0)) < 24 * 60 * 60 * 1000;

  useEffect(() => {
    if (hasSavedBattle) {
      navigation.navigate('Battle', {
        playerDeck: saved.playerDeckIds,
        tier: saved.tier,
        resume: saved,
      });
    }
  }, []); // run once on mount

  // Resolve active avatar symbol + color
  const avatarData =
    AVATARS.find(a => a.id === gs.activeAvatar) ??
    LEVEL_AVATARS.find(a => a.id === gs.activeAvatar);
  const avatarSymbol = avatarData?.symbol ?? username.charAt(0).toUpperCase();
  const avatarColor  = avatarData?.color  ?? T.accent.mint;

  const [profilePressed, setProfilePressed] = useState(false);
  const { animatedStyle: profileElevStyle } = useElevation(profilePressed ? 'hovered' : 'resting');

  const battleRipple = useRipple();
  const packRipple = useRipple({ rippleColor: 'rgba(0,0,0,0.25)' });

  return (
    <ScreenBackground theme="home">
      <LightningStrike color={T.accent.mint} secondaryColor={T.accent.violet} minInterval={800} maxInterval={2000} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Profile card ── */}
        <Animated.View style={profileElevStyle}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Profile')}
            onPressIn={() => setProfilePressed(true)}
            onPressOut={() => setProfilePressed(false)}
          >
            <MaterialSurface style={styles.profileCard} borderRadius={20}>
            {/* Active avatar ring */}
            <View style={[styles.avatarRing, { borderColor: avatarColor + '66' }]}>
              <Text style={[styles.avatarInitial, { color: avatarColor }]}>{avatarSymbol}</Text>
            </View>

            {/* Username + level */}
            <View style={styles.profileInfo}>
              <Text style={styles.username} numberOfLines={1}>{username.toUpperCase()}</Text>
              <View style={styles.levelRow}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>LVL {gs.level}</Text>
                </View>
                <Text style={styles.cardCount}>{totalUniqueOwned(gs.collection)} CARDS</Text>
              </View>
              <XpBar xpInLevel={gs.xpInLevel} xpNeeded={gs.xpNeeded} />
              <View style={styles.xpLabelRow}>
                <Text style={styles.xpLabel}>{gs.xpInLevel.toLocaleString()} / {gs.xpNeeded.toLocaleString()} XP</Text>
                {!isMaxLevel
                  ? <Text style={styles.xpNextLabel}>LVL {gs.level + 1}</Text>
                  : <Text style={[styles.xpNextLabel, { color: T.status.caution }]}>MAX</Text>
                }
              </View>
            </View>

            {/* Credits */}
            <View style={styles.creditsBox}>
              <AnimatedNumber value={gs.coins} glowColor={T.accent.gold} style={styles.creditsAmount} />
              <Text style={styles.creditsLabel}>CREDITS</Text>
            </View>
          </MaterialSurface>
        </TouchableOpacity>
        </Animated.View>

        {/* ── Action buttons row ── */}
        <View style={styles.actionRow}>
          {/* Battle */}
          <Animated.View style={[styles.actionCell, { borderRadius: 16 }, battleGlowStyle, battleRipple.pressStyle]}>
            <GradientBorder colors={BORDER_COLORS.mint} borderWidth={1.5} borderRadius={16} innerBackground="transparent">
              <TouchableOpacity
                style={[styles.actionBtn, styles.battleBtn, { overflow: 'hidden' }]}
                activeOpacity={1}
                onPress={() => navigation.navigate('BattleLobby')}
                onPressIn={battleRipple.onPressIn}
                onPressOut={battleRipple.onPressOut}
              >
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: T.text.primary, borderRadius: 14.5 }, battleShimmerStyle]} pointerEvents="none" />
                <Image source={require('../../assets/nav-icons/battle.png')} style={styles.battleIcon} />
                <Text style={styles.actionBtnText}>BATTLE</Text>
                {battleRipple.rippleView}
              </TouchableOpacity>
            </GradientBorder>
          </Animated.View>

          {/* Open Pack */}
          <Animated.View style={[styles.actionCell, { borderRadius: 16 }, packGlowStyle, packRipple.pressStyle]}>
            <GradientBorder colors={BORDER_COLORS.violet} borderWidth={1.5} borderRadius={16} innerBackground="transparent">
              <TouchableOpacity
                style={[styles.actionBtn, styles.packBtn, { overflow: 'hidden' }]}
                activeOpacity={1}
                onPress={() => navigation.navigate('PackOpening' as never)}
                onPressIn={packRipple.onPressIn}
                onPressOut={packRipple.onPressOut}
              >
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: T.text.primary, borderRadius: 14.5 }, packShimmerStyle]} pointerEvents="none" />
                <Image source={require('../../assets/nav-icons/open-pack.png')} style={styles.packIcon} />
                <Text style={styles.actionBtnText}>OPEN PACK</Text>
                {packRipple.rippleView}
              </TouchableOpacity>
            </GradientBorder>
          </Animated.View>
        </View>

        {/* ── Daily Quests ── */}
        <View style={styles.questSection}>
          <View style={styles.questHeader}>
            <Text style={styles.sectionTitle}>— DAILY QUESTS</Text>
            <Text style={[styles.questDoneLabel, { color: doneCount >= 3 ? T.status.vitality : T.text.muted }]}>
              {doneCount}/3 COMPLETE
            </Text>
          </View>
          <Text style={styles.questSub}>Resets at midnight</Text>
          {todaysQuests.map(quest => (
            <QuestCard key={quest.id} quest={quest} progress={questProgress[quest.id] ?? 0} />
          ))}
        </View>

      </ScrollView>
    </ScreenBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { },
  scroll: { padding:20, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom:40 },

  // Profile card
  profileCard: {
    flexDirection:'row', alignItems:'flex-start', gap:14,
    borderRadius:20,
    padding:18, marginBottom:20,
  },
  avatarRing: {
    width:64, height:64, borderRadius:32,
    backgroundColor:T.bg.elevated,
    borderWidth:2, borderColor:T.accent.mintMuted,
    alignItems:'center', justifyContent:'center', flexShrink:0,
  },
  avatarInitial: { fontFamily:'Orbitron_900Black', fontSize:T.font.xl, color:T.accent.mint },
  profileInfo: { flex:1, gap:2 },
  username: {
    fontFamily:'Orbitron_900Black', fontSize:T.font.lg,
    color:T.text.primary, letterSpacing:T.letterSpacing.md,
  },
  levelRow: { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  levelBadge: {
    backgroundColor:T.accent.mint + '22', borderRadius:6,
    paddingHorizontal:8, paddingVertical:2,
    borderWidth:1, borderColor:T.accent.mintMuted,
  },
  levelText: { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:T.accent.mint },
  cardCount: { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, color:T.text.muted },
  xpLabelRow: { flexDirection:'row', justifyContent:'space-between', marginTop:3 },
  xpLabel:    { fontFamily:'monospace', fontSize:T.font.xs, color:T.text.muted },
  xpNextLabel:{ fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.accent.mint + '88' },
  creditsBox: { alignItems:'center', flexShrink:0 },
  creditsAmount: { fontFamily:'Orbitron_900Black', fontSize:T.font.xl, color:T.accent.mint, lineHeight:24 },
  creditsLabel:  { fontFamily:'Orbitron_700Bold', fontSize:T.font.xs, color:T.text.muted, letterSpacing:T.letterSpacing.xs },

  // Action buttons
  actionRow: { flexDirection:'row', gap:14, marginBottom:20 },
  actionCell: { flex:1 },
  actionBtn: {
    aspectRatio:1, alignItems:'center', justifyContent:'center',
    gap:10, borderRadius:14.5,
  },
  battleIcon: { width:80, height:70, resizeMode:'contain', tintColor:T.text.primary },
  packIcon:   { width:60, height:70, resizeMode:'contain', tintColor:T.text.primary },
  battleBtn: {
    backgroundColor:T.accent.violet,
    shadowColor:T.accent.violet, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12,
  },
  packBtn: {
    backgroundColor:T.accent.mint,
    shadowColor:T.accent.mint, shadowOffset:{width:0,height:4}, shadowOpacity:0.4, shadowRadius:12,
  },
  actionBtnText: {
    fontFamily:'Orbitron_900Black', fontSize:T.font.lg,
    color:T.text.primary, letterSpacing:T.letterSpacing.xl,
  },

  // Daily quests
  questSection: { marginBottom:24 },
  questHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  questDoneLabel: { fontFamily:'Orbitron_700Bold', fontSize:T.font.sm, letterSpacing:T.letterSpacing.md },
  questSub:     { fontFamily:'Rajdhani_600SemiBold', fontSize:T.font.md, color:T.text.muted, marginBottom:14 },

  // Section title
  sectionTitle: {
    fontFamily:'Orbitron_700Bold', fontSize:T.font.sm,
    color:T.text.muted, letterSpacing:T.letterSpacing.lg, marginBottom:12,
  },
});
