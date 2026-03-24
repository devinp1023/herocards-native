// CareerScreen — paginated achievement skill tree.

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, Platform, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent, Pressable,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { MainTabParamList } from '../../App';
import ReAnimated, {
  useSharedValue, useAnimatedStyle, useAnimatedScrollHandler,
  interpolate, interpolateColor, Extrapolation, Easing,
  withTiming, withSpring, withSequence, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MaterialSurface } from '../components/MaterialSurface';
import { ACHIEVEMENT_CATEGORIES, AchievementCategoryId } from '../data/constants';
import { AchievementFamily, AchievementTier } from '../data/achievements';
import { useAchievementProgress } from '../hooks/useAchievementProgress';
import { useGameStateContext } from '../context/GameStateContext';
import { AchievementNode, HubNode } from '../components/AchievementNode';
import { BranchConnector } from '../components/BranchConnector';
import { T } from '../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const NODE_SIZE = 48;
const HUB_AREA_H = 110;       // hub node + label + spacing
const CONNECTOR_H = 24;       // vertical connector between tiers
const TIER_ROW_H = NODE_SIZE + 20 + CONNECTOR_H; // node + badge + connector
const COL_MIN_W = 72;         // minimum width per family column
const PAGE_PAD = 16;

type CategoryDef = typeof ACHIEVEMENT_CATEGORIES[number];

// ── FamilyColumn — one family's vertical chain of tier nodes ────────
const FamilyColumn = React.memo(function FamilyColumn({
  family, categoryColor, colWidth, onNodePress,
  lastCollectedId, celebrationScale,
}: {
  family: AchievementFamily;
  categoryColor: string;
  colWidth: number;
  onNodePress: (tier: AchievementTier) => void;
  lastCollectedId: string | null;
  celebrationScale: { value: number };
}) {
  return (
    <View style={{ width: colWidth, alignItems: 'center' }}>
      <Text style={fcStyles.familyLabel} numberOfLines={2}>
        {family.familyName.toUpperCase()}
      </Text>

      {family.tiers.map((tier, i) => {
        const prevCompleted = i === 0 || family.tiers[i - 1].status === 'completed';
        const connProgress = tier.status === 'completed' ? 1 : prevCompleted ? tier.progress : 0;
        return (
          <View key={tier.achievement.id} style={{ alignItems: 'center' }}>
            {i > 0 && (
              <BranchConnector
                completed={tier.status === 'completed'}
                progress={connProgress}
                color={categoryColor}
                orientation="vertical"
                length={CONNECTOR_H}
              />
            )}
            <AchievementNode
              tier={tier}
              categoryColor={categoryColor}
              onPress={() => onNodePress(tier)}
              size={NODE_SIZE}
              singleTier={family.tiers.length === 1}
              celebrationScale={celebrationScale}
              isCelebrating={tier.achievement.id === lastCollectedId}
            />
          </View>
        );
      })}
    </View>
  );
});

const fcStyles = StyleSheet.create({
  familyLabel: {
    fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#505068',
    letterSpacing: 0.5, marginBottom: 8, textAlign: 'center', width: '100%',
    height: 22,
  },
});

// ── FeatsPage — special layout for single-tier achievements ─────────
const FeatsPage = React.memo(function FeatsPage({
  category, families, width, categoryStats, onNodePress, onHubPress, pageIndex, scrollX,
  lastCollectedId, celebrationScale,
}: {
  category: CategoryDef;
  families: AchievementFamily[];
  width: number;
  categoryStats: { completed: number; total: number };
  onNodePress: (tier: AchievementTier) => void;
  onHubPress: () => void;
  pageIndex: number;
  scrollX: { value: number };
  lastCollectedId: string | null;
  celebrationScale: { value: number };
}) {
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={fpStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Category header */}
      <View style={fpStyles.headerRow}>
        <Text style={[fpStyles.catLabel, { color: category.color }]}>{category.label}</Text>
        <Text style={[fpStyles.catCount, {
          color: categoryStats.completed === categoryStats.total ? '#2ED573' : '#606480',
        }]}>
          {categoryStats.completed}/{categoryStats.total}
        </Text>
      </View>
      <Text style={fpStyles.catDesc}>{category.description}</Text>

      {/* Hub */}
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <HubNode
          icon={category.icon}
          categoryColor={category.color}
          completedCount={categoryStats.completed}
          totalCount={categoryStats.total}
          onPress={onHubPress}
        />
      </View>

      {/* Ring layout — feats nodes in a circle with connectors between them */}
      {(() => {
        const RING_R = 100;
        const NODE_SZ = 56;
        const contentW = width - PAGE_PAD * 2;
        const ringCenterX = contentW / 2;
        const ringCenterY = RING_R + NODE_SZ / 2;
        const ringAreaH = RING_R * 2 + NODE_SZ + 60;
        const n = families.length;
        const startAngle = -Math.PI / 2;

        const positions = families.map((_, i) => {
          const angle = startAngle + (i / n) * Math.PI * 2;
          return {
            x: ringCenterX + Math.cos(angle) * RING_R - NODE_SZ / 2,
            y: ringCenterY + Math.sin(angle) * RING_R - NODE_SZ / 2,
          };
        });

        return (
          <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ height: ringAreaH, width: contentW, alignSelf: 'center' }}>
            {/* Connector lines forming the circle (node to next node) */}
            {families.map((fam, i) => {
              const tier = fam.tiers[0];
              if (!tier) return null;
              const next = (i + 1) % n;
              const x1 = positions[i].x + NODE_SZ / 2;
              const y1 = positions[i].y + NODE_SZ / 2;
              const x2 = positions[next].x + NODE_SZ / 2;
              const y2 = positions[next].y + NODE_SZ / 2;
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const nextTier = families[next].tiers[0];
              const bothCompleted = tier.status === 'completed' && nextTier?.status === 'completed';
              const avgProgress = ((tier.progress) + (nextTier?.progress ?? 0)) / 2;

              return (
                <View
                  key={`conn-${i}`}
                  style={{
                    position: 'absolute',
                    left: x1,
                    top: y1,
                    width: len,
                    height: 2,
                    transform: [{ rotate: `${angle}deg` }],
                    transformOrigin: 'left center',
                  }}
                >
                  <View style={{ position: 'absolute', width: '100%', height: 2, backgroundColor: T.bg.border }} />
                  <View style={{
                    position: 'absolute', height: 2,
                    width: bothCompleted ? '100%' : `${avgProgress * 100}%`,
                    backgroundColor: bothCompleted ? category.color : category.color + '60',
                    ...(bothCompleted ? {
                      shadowColor: category.color, shadowOpacity: 0.4, shadowRadius: 6,
                      shadowOffset: { width: 0, height: 0 },
                    } : {}),
                  } as any} />
                </View>
              );
            })}

            {/* Feat nodes around the ring */}
            {families.map((fam, i) => {
              const tier = fam.tiers[0];
              if (!tier) return null;
              // Push label outward from ring center
              const angle = startAngle + (i / n) * Math.PI * 2;
              const labelOffset = NODE_SZ / 2 + 14;
              const lx = Math.cos(angle) * labelOffset;
              const ly = Math.sin(angle) * labelOffset;
              // Determine label alignment based on position
              const isTop = Math.sin(angle) < -0.3;
              const isBottom = Math.sin(angle) > 0.3;

              return (
                <View key={fam.familyName} style={{
                  position: 'absolute',
                  left: positions[i].x,
                  top: positions[i].y,
                  width: NODE_SZ,
                  alignItems: 'center',
                }}>
                  <AchievementNode
                    tier={tier}
                    categoryColor={category.color}
                    onPress={() => onNodePress(tier)}
                    size={NODE_SZ}
                    singleTier
                    celebrationScale={celebrationScale}
                    isCelebrating={tier.achievement.id === lastCollectedId}
                  />
                  <Text style={[
                    fpStyles.badgeLabel,
                    {
                      position: 'absolute',
                      left: NODE_SZ / 2 - 40 + lx,
                      top: isTop ? -22 : isBottom ? NODE_SZ + 4 : NODE_SZ / 2 - 8 + ly,
                    },
                  ]} numberOfLines={2}>
                    {fam.familyName.toUpperCase()}
                  </Text>
                </View>
              );
            })}
          </View>
          </View>
        );
      })()}
    </ScrollView>
  );
});

const fpStyles = StyleSheet.create({
  container:  { flexGrow: 1, paddingHorizontal: PAGE_PAD, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 60 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catLabel:   { fontFamily: 'Orbitron_900Black', fontSize: 16, letterSpacing: 2 },
  catCount:   { fontFamily: 'Orbitron_700Bold', fontSize: 10, letterSpacing: 1 },
  catDesc:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#404458', marginBottom: 20 },
  badgeLabel: { fontFamily: 'Orbitron_700Bold', fontSize: 7, color: '#505068', letterSpacing: 0.5, marginTop: 4, textAlign: 'center', width: 80 },
});

// ── StandardPage — tree layout for categories with multi-tier families
const StandardPage = React.memo(function StandardPage({
  category, families, width, categoryStats, onNodePress, onHubPress, pageIndex, scrollX,
  lastCollectedId, celebrationScale,
}: {
  category: CategoryDef;
  families: AchievementFamily[];
  width: number;
  categoryStats: { completed: number; total: number };
  onNodePress: (tier: AchievementTier) => void;
  onHubPress: () => void;
  pageIndex: number;
  scrollX: { value: number };
  lastCollectedId: string | null;
  celebrationScale: { value: number };
}) {
  const usableW = width - PAGE_PAD * 2;
  const needsSplit = families.length > 4;
  const splitAt = needsSplit ? Math.ceil(families.length / 2) : families.length;
  const rowA = families.slice(0, splitAt);
  const rowB = needsSplit ? families.slice(splitAt) : [];

  const colWidthA = Math.max(COL_MIN_W, Math.floor(usableW / rowA.length));
  const colWidthB = rowB.length > 0 ? Math.max(COL_MIN_W, Math.floor(usableW / rowB.length)) : 0;

  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={spStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Category header */}
      <View style={spStyles.headerRow}>
        <Text style={[spStyles.catLabel, { color: category.color }]}>{category.label}</Text>
        <Text style={[spStyles.catCount, {
          color: categoryStats.completed === categoryStats.total ? '#2ED573' : '#606480',
        }]}>
          {categoryStats.completed}/{categoryStats.total}
        </Text>
      </View>
      <Text style={spStyles.catDesc}>{category.description}</Text>

      {/* Hub node */}
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <HubNode
          icon={category.icon}
          categoryColor={category.color}
          completedCount={categoryStats.completed}
          totalCount={categoryStats.total}
          onPress={onHubPress}
        />
      </View>

      {/* Row A families */}
      <View style={spStyles.rowLabel}>
        <View style={[spStyles.rowDivider, { backgroundColor: category.color + '20' }]} />
      </View>
      <View style={spStyles.familyRow}>
        {rowA.map((fam) => (
          <FamilyColumn
            key={fam.familyName}
            family={fam}
            categoryColor={category.color}
            colWidth={colWidthA}
            onNodePress={onNodePress}
            lastCollectedId={lastCollectedId}
            celebrationScale={celebrationScale}
          />
        ))}
      </View>

      {/* Row B families (if split) */}
      {rowB.length > 0 && (
        <>
          <View style={[spStyles.rowLabel, { marginTop: 24 }]}>
            <View style={[spStyles.rowDivider, { backgroundColor: category.color + '20' }]} />
          </View>
          <View style={spStyles.familyRow}>
            {rowB.map((fam) => (
              <FamilyColumn
                key={fam.familyName}
                family={fam}
                categoryColor={category.color}
                colWidth={colWidthB}
                onNodePress={onNodePress}
                lastCollectedId={lastCollectedId}
                celebrationScale={celebrationScale}
              />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
});

const spStyles = StyleSheet.create({
  container:  { paddingHorizontal: PAGE_PAD, paddingTop: Platform.OS === 'ios' ? 60 : 20, paddingBottom: 60 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  catLabel:   { fontFamily: 'Orbitron_900Black', fontSize: 16, letterSpacing: 2 },
  catCount:   { fontFamily: 'Orbitron_700Bold', fontSize: 10, letterSpacing: 1 },
  catDesc:    { fontFamily: 'Rajdhani_600SemiBold', fontSize: 12, color: '#404458', marginBottom: 20 },
  rowLabel:   { marginBottom: 12 },
  rowDivider: { height: 1 },
  familyRow:  { flexDirection: 'row', justifyContent: 'center', paddingBottom: 8 },
});

// ── Animated page indicator dots ─────────────────────────────────────
const CATEGORY_COLORS = ACHIEVEMENT_CATEGORIES.map(c => c.color);
const INACTIVE_COLOR = '#ffffff40';

function AnimatedDot({ index, scrollX }: { index: number; scrollX: { value: number } }) {
  const color = CATEGORY_COLORS[index];
  const animStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * SCREEN_W, index * SCREEN_W, (index + 1) * SCREEN_W];
    const width = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const backgroundColor = interpolateColor(scrollX.value, inputRange, [INACTIVE_COLOR, color, INACTIVE_COLOR]);
    return { width, backgroundColor };
  });

  return <ReAnimated.View style={[dotStyles.dot, animStyle]} />;
}

function PageDots({ scrollX }: { scrollX: { value: number } }) {
  return (
    <View style={dotStyles.row}>
      {ACHIEVEMENT_CATEGORIES.map((cat, i) => (
        <AnimatedDot key={cat.id} index={i} scrollX={scrollX} />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
});

// ── CareerScreen ────────────────────────────────────────────────────
export default function CareerScreen() {
  const route = useRoute<RouteProp<MainTabParamList, 'CareerTab'>>();
  const gs = useGameStateContext();
  const { familiesByCategory, categoryStats, totalEarned, totalAchievements } = useAchievementProgress();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  // Scroll to page when navigated to via toast tap
  useEffect(() => {
    const page = route.params?.initialPage;
    if (page != null && page >= 0 && page < ACHIEVEMENT_CATEGORIES.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: page, animated: false });
        setActiveIndex(page);
      }, 50);
    }
  }, [route.params?.initialPage]);

  const lastSetIndex = useSharedValue(0);
  const animatedScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const idx = Math.round(event.contentOffset.x / SCREEN_W);
      if (idx !== lastSetIndex.value) {
        lastSetIndex.value = idx;
        runOnJS(setActiveIndex)(idx);
      }
    },
  });

  const [selectedTier, setSelectedTier] = useState<AchievementTier | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [lastCollectedId, setLastCollectedId] = useState<string | null>(null);
  const celebrationScale = useSharedValue(1);
  const sheetY = useSharedValue(600);
  const DISMISS_THRESHOLD = 120;

  const openSheet = useCallback((tier: AchievementTier, color: string) => {
    setSelectedTier(tier);
    setSelectedColor(color);
    sheetY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, []);

  const dismissSheet = useCallback(() => {
    setSelectedTier(null);
  }, []);

  const closeSheet = useCallback(() => {
    sheetY.value = withTiming(600, { duration: 240 });
    setTimeout(dismissSheet, 240);
  }, [dismissSheet]);

  const handleCollect = useCallback(() => {
    if (!selectedTier) return;
    const achId = selectedTier.achievement.id;
    gs.collectAchievement(achId);
    setLastCollectedId(achId);
    // Close sheet, then trigger celebration
    sheetY.value = withTiming(600, { duration: 240 });
    setTimeout(() => {
      dismissSheet();
      // Scale bounce celebration
      celebrationScale.value = withSequence(
        withTiming(1.3, { duration: 200 }),
        withSpring(1.0, { damping: 12, stiffness: 200 }),
      );
      // Clear after animation
      setTimeout(() => setLastCollectedId(null), 600);
    }, 240);
  }, [selectedTier, gs, dismissSheet]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        sheetY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD) {
        sheetY.value = withTiming(600, { duration: 240 });
        runOnJS(dismissSheet)();
      } else {
        sheetY.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      }
    });

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value }],
  }));

  const handleNodePress = useCallback((tier: AchievementTier) => {
    const catId = ACHIEVEMENT_CATEGORIES[activeIndex]?.id as AchievementCategoryId;
    const cat = ACHIEVEMENT_CATEGORIES.find(c => c.id === catId);
    openSheet(tier, cat?.color ?? '#ffffff');
  }, [activeIndex, openSheet]);

  const handleHubPress = useCallback(() => {}, []);

  const renderPage = useCallback(({ item, index }: { item: CategoryDef; index: number }) => {
    const catId = item.id as AchievementCategoryId;
    const families = familiesByCategory[catId] ?? [];
    const stats = categoryStats[catId] ?? { completed: 0, total: 0 };

    if (catId === 'feats') {
      return (
        <FeatsPage
          category={item}
          families={families}
          width={SCREEN_W}
          categoryStats={stats}
          onNodePress={handleNodePress}
          onHubPress={handleHubPress}
          pageIndex={index}
          scrollX={scrollX}
          lastCollectedId={lastCollectedId}
          celebrationScale={celebrationScale}
        />
      );
    }

    return (
      <StandardPage
        category={item}
        families={families}
        width={SCREEN_W}
        categoryStats={stats}
        onNodePress={handleNodePress}
        onHubPress={handleHubPress}
        pageIndex={index}
        scrollX={scrollX}
        lastCollectedId={lastCollectedId}
        celebrationScale={celebrationScale}
      />
    );
  }, [familiesByCategory, categoryStats, handleNodePress, handleHubPress, scrollX, lastCollectedId, celebrationScale]);

  const keyExtractor = useCallback((item: CategoryDef) => item.id, []);

  return (
    <View style={styles.root}>
      <ReAnimated.FlatList
        ref={flatListRef as any}
        data={ACHIEVEMENT_CATEGORIES as unknown as CategoryDef[]}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderPage}
        onScroll={animatedScrollHandler}
        scrollEventThrottle={16}
        windowSize={3}
        initialNumToRender={1}
        getItemLayout={(_data, index) => ({
          length: SCREEN_W, offset: SCREEN_W * index, index,
        })}
      />
      <PageDots scrollX={scrollX} />

      {/* ── Bottom sheet ── */}
      {selectedTier && (
        <>
          <Pressable onPress={closeSheet} style={bsStyles.backdrop} />
          <GestureDetector gesture={panGesture}>
          <ReAnimated.View style={[bsStyles.sheet, sheetAnimStyle]}>
            {/* Drag handle */}
            <View style={bsStyles.handle} />

            {/* Achievement name */}
            <Text style={[bsStyles.name, { color: selectedColor }]}>
              {selectedTier.achievement.name}
            </Text>

            {/* Tier badge */}
            <View style={[bsStyles.tierBadge, { backgroundColor: selectedColor + '20' }]}>
              <Text style={[bsStyles.tierText, { color: selectedColor }]}>
                TIER {selectedTier.achievement.tier}
              </Text>
            </View>

            {/* Description */}
            <Text style={bsStyles.desc}>{selectedTier.achievement.desc}</Text>

            {/* Progress bar */}
            <View style={bsStyles.progressTrack}>
              <View style={[
                bsStyles.progressFill,
                { width: `${Math.min(selectedTier.progress, 1) * 100}%` as any, backgroundColor: selectedColor,
                  shadowColor: selectedColor, shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
              ]} />
            </View>
            <Text style={bsStyles.progressLabel}>{selectedTier.progressLabel}</Text>

            {/* Rewards */}
            <MaterialSurface style={bsStyles.rewardRow} borderRadius={12}>
              <View style={bsStyles.rewardItem}>
                <View style={bsStyles.rewardValueRow}>
                  <Text style={bsStyles.rewardValue}>+{selectedTier.achievement.xp.toLocaleString()}</Text>
                  {selectedTier.status === 'completed' && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#2ED573" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={bsStyles.rewardLabel}>XP</Text>
              </View>
              <View style={bsStyles.rewardDivider} />
              <View style={bsStyles.rewardItem}>
                <View style={bsStyles.rewardValueRow}>
                  <Text style={bsStyles.rewardValue}>+{selectedTier.achievement.credits.toLocaleString()}</Text>
                  {selectedTier.status === 'completed' && (
                    <MaterialCommunityIcons name="check-circle" size={14} color="#2ED573" style={{ marginLeft: 4 }} />
                  )}
                </View>
                <Text style={bsStyles.rewardLabel}>CREDITS</Text>
              </View>
            </MaterialSurface>

            {/* Status / action */}
            {selectedTier.status === 'completed' && (
              <Text style={[bsStyles.statusText, { color: '#2ED573' }]}>COMPLETED</Text>
            )}
            {selectedTier.status === 'earned' && (
              <Pressable
                onPress={handleCollect}
                style={[bsStyles.collectBtn, { backgroundColor: selectedColor }]}
              >
                <Text style={bsStyles.collectBtnText}>COLLECT REWARDS</Text>
              </Pressable>
            )}
            {selectedTier.status === 'unlocked' && (
              <Text style={[bsStyles.statusText, { color: selectedColor }]}>IN PROGRESS</Text>
            )}
            {selectedTier.status === 'locked' && (
              <Text style={[bsStyles.statusText, { color: '#606480' }]}>
                Complete the previous tier to unlock
              </Text>
            )}
          </ReAnimated.View>
          </GestureDetector>
        </>
      )}
    </View>
  );
}

const bsStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0c0c22', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12,
    borderTopWidth: 1, borderColor: '#1a1a35',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#2a2a45',
    alignSelf: 'center', marginBottom: 16,
  },
  name: {
    fontFamily: 'Orbitron_900Black', fontSize: 16, letterSpacing: 1,
    textAlign: 'center', marginBottom: 8,
  },
  tierBadge: {
    alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 6, marginBottom: 12,
  },
  tierText: {
    fontFamily: 'Orbitron_700Bold', fontSize: 10, letterSpacing: 1,
  },
  desc: {
    fontFamily: 'Rajdhani_600SemiBold', fontSize: 14, color: '#b0b8cc',
    textAlign: 'center', marginBottom: 16, lineHeight: 20,
  },
  progressTrack: {
    height: 6, backgroundColor: T.bg.elevated, borderRadius: 3,
    overflow: 'hidden', marginBottom: 6,
  },
  progressFill: {
    height: '100%', borderRadius: 3,
  },
  progressLabel: {
    fontFamily: 'Orbitron_700Bold', fontSize: 10, color: T.text.primary,
    textAlign: 'center', marginBottom: 16, letterSpacing: 0.5,
  },
  rewardRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, marginBottom: 12,
  },
  rewardItem: {
    flex: 1, alignItems: 'center',
  },
  rewardValueRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  rewardValue: {
    fontFamily: 'Orbitron_900Black', fontSize: 14, color: T.accent.mint, marginBottom: 2,
  },
  rewardLabel: {
    fontFamily: 'Orbitron_700Bold', fontSize: 8, color: T.text.primary, letterSpacing: 1,
  },
  rewardDivider: {
    width: 1, height: 28, backgroundColor: T.bg.border,
  },
  statusText: {
    fontFamily: 'Orbitron_700Bold', fontSize: 10, letterSpacing: 1,
    textAlign: 'center',
  },
  collectBtn: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  collectBtnText: {
    fontFamily: 'Orbitron_900Black', fontSize: 13, color: T.text.primary,
    letterSpacing: 1.5,
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg.root },
});
