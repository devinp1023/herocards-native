# HeroCards — Career Screen Achievement Skill Tree
**Target files:** `src/screens/CareerScreen.tsx` (new), `src/data/achievements.ts`, `src/data/constants.ts`, `App.tsx` (navigation)
**Goal:** Add a paginated skill tree UI to the Career screen. Each of 6 category pages shows a hub node with branching family trees. Tiers unlock sequentially. Tapping a node opens a bottom sheet with details and progress.

---

## Architecture Constraints (read before touching anything)

- **Never import `ALL_CARDS` in screens** — not relevant here but noted
- **Always use `gs.cardRoster` / `useGameStateContext()`** for any game state
- **Achievements data lives in `src/data/achievements.ts`** — read this file fully before writing any code. The family names, tier structure, and progress tracking fields are all defined there
- **`battleStats`** in `useGameState.ts` is the source of truth for battle achievement progress — read how it's structured
- **Tiers use Roman numerals** — I, II, III, IV, V. Families have varying tier counts (1–5). Do not rename to Bronze/Silver/Gold/Platinum
- **React Navigation v6 pinned** — adding `CareerScreen` to the Profile Stack or as its own stack entry
- **`react-native-gesture-handler`** is already installed (used in battle) but not yet used for gestures in screens — the paginated approach uses `FlatList` horizontal scrolling, NOT gesture handler pan/pinch, so this is safe
- **Emoji do not render on Hermes/RN** — use `MaterialCommunityIcons` from `@expo/vector-icons` (already installed) for category icons
- Run `npx tsc --noEmit` after each step — zero errors required

---

## Step 0 — Read these files before writing any code

```bash
# Read in this order:
cat src/data/achievements.ts
cat src/hooks/useGameState.ts   # find battleStats shape + earnedAchievements
cat src/screens/BattleScreen.tsx  # find the attack overlay bottom sheet pattern to reuse
```

Specifically identify:
1. **Achievement interface shape** — `id`, `family`, `symbol`, `color`, `cat`, `tier` (Roman numeral string), `name`, `desc`, `req` (with `type`, `stat?`, `n`, etc.), `xp`, `credits`
2. **How completion is tracked** — `earnedAchievements: string[]` in game state (array of achievement IDs)
3. **How progress is tracked** — `battleStats: Record<string, number>` has raw counters (e.g. `battlesWon`, `heavyKills`). Non-battle achievements check collection size, packsOpened, level, totalTrades, ownedAvatars, etc.
4. **Overlay patterns** — BattleScreen uses dark `rgba(0,0,0,0.85)` backdrops for card preview modals and menus. There is no existing slide-up bottom sheet — CareerScreen builds one from scratch using `react-native-reanimated` (`translateY` + `withSpring`). `expo-blur` is NOT installed — do not use `BlurView`.

Do not proceed until you understand all four.

---

## Step 1 — Data layer: group achievements into categories

### 1a. Add category definitions to `constants.ts`

There are 41 achievement families (119 battle + 44 non-battle = 163 total achievement nodes). They are grouped into 6 categories:

```ts
export const ACHIEVEMENT_CATEGORIES = [
  {
    id: 'collector',
    label: 'COLLECTOR',
    icon: 'cards',                    // MaterialCommunityIcons
    color: '#4FC3F7',                 // cyan
    description: 'Card gathering and set completion',
  },
  {
    id: 'progression',
    label: 'PROGRESSION',
    icon: 'arrow-up-bold',            // MaterialCommunityIcons
    color: '#FBBF24',                 // gold
    description: 'Leveling, economy, and allegiance',
  },
  {
    id: 'combat',
    label: 'COMBAT',
    icon: 'sword-cross',              // MaterialCommunityIcons
    color: '#F87171',                 // red
    description: 'Core battle performance',
  },
  {
    id: 'strategy',
    label: 'STRATEGY',
    icon: 'chess-knight',             // MaterialCommunityIcons
    color: '#60A5FA',                 // blue
    description: 'Type mastery, resilience, and Legendary Lock',
  },
  {
    id: 'amp',
    label: 'AMP & ABILITIES',
    icon: 'lightning-bolt',           // MaterialCommunityIcons
    color: '#A78BFA',                 // purple
    description: 'Amp system and ability-specific feats',
  },
  {
    id: 'feats',
    label: 'FEATS',
    icon: 'trophy',                   // MaterialCommunityIcons
    color: '#34D399',                 // green
    description: 'Rare one-off achievements',
  },
] as const

export type AchievementCategoryId = typeof ACHIEVEMENT_CATEGORIES[number]['id']
```

### 1b. Assign each family to a category

The exact family-to-category mapping (41 families):

**collector** (8 families, ~31 nodes) — Card Collector (5), Pack Rat (5), Uncommon Ground (4), Rare Find (4), Epic Discovery (3), Legendary Hoard (3), Type Master (3), Pack Master (4)

**progression** (6 families, ~21 nodes) — Rising Star (5), Merchant (4), Big Spender (3), Hero Path (3), Villain Path (3), Anti-Hero Path (3)

**combat** (7 families, ~35 nodes) — Battle Victor (5), Battles Fought (5), Win Streak (5), Giant Killer (5), Champion (5), Heavy Hitter (5), Well Rested (5)

**strategy** (7 families, ~35 nodes) — Type Advantage (5), Cosmic Clash (5), Against All Odds (5), Iron Will (5), Legendary Unleashed (5), Lock Breaker (5), Legendary Victor (5)

**amp** (8 families, ~36 nodes) — Amped Up (5), Photo Finish (5), Battlefield Control (1), The Switcher (5), Ability Activated (5), Second Chance (5), Executioner (5), Unstoppable Force (5)

**feats** (5 families, 5 nodes — all single-tier) — Perfect Battle (1), The Comeback (1), Survivor (1), Amp Race (1), Tie Breaker (1)

Add a `FAMILY_CATEGORY_MAP` to `achievements.ts`:

```ts
export const FAMILY_CATEGORY_MAP: Record<string, AchievementCategoryId> = {
  // collector
  'Card Collector': 'collector',
  'Pack Rat': 'collector',
  'Uncommon Ground': 'collector',
  'Rare Find': 'collector',
  'Epic Discovery': 'collector',
  'Legendary Hoard': 'collector',
  'Type Master': 'collector',
  'Pack Master': 'collector',
  // progression
  'Rising Star': 'progression',
  'Merchant': 'progression',
  'Big Spender': 'progression',
  'Hero Path': 'progression',
  'Villain Path': 'progression',
  'Anti-Hero Path': 'progression',
  // combat
  'Battle Victor': 'combat',
  'Battles Fought': 'combat',
  'Win Streak': 'combat',
  'Giant Killer': 'combat',
  'Champion': 'combat',
  'Heavy Hitter': 'combat',
  'Well Rested': 'combat',
  // strategy
  'Type Advantage': 'strategy',
  'Cosmic Clash': 'strategy',
  'Against All Odds': 'strategy',
  'Iron Will': 'strategy',
  'Legendary Unleashed': 'strategy',
  'Lock Breaker': 'strategy',
  'Legendary Victor': 'strategy',
  // amp
  'Amped Up': 'amp',
  'Photo Finish': 'amp',
  'Battlefield Control': 'amp',
  'The Switcher': 'amp',
  'Ability Activated': 'amp',
  'Second Chance': 'amp',
  'Executioner': 'amp',
  'Unstoppable Force': 'amp',
  // feats
  'Perfect Battle': 'feats',
  'The Comeback': 'feats',
  'Survivor': 'feats',
  'Amp Race': 'feats',
  'Tie Breaker': 'feats',
}
```

### 1c. Add a helper function to `achievements.ts`

```ts
// Returns all families for a given category, each with their tiers sorted I→II→III→IV→V
export function getFamiliesForCategory(
  categoryId: AchievementCategoryId,
  allAchievements: Achievement[],
  completedIds: string[]
): AchievementFamily[] {
  // Group achievements by family
  // Filter to categoryId using FAMILY_CATEGORY_MAP
  // Sort tiers within each family by requirement ascending
  // Mark each tier as locked/unlocked/completed based on completedIds
  //   Rule: tier N is unlocked only if tier N-1 is completed
  //   Rule: tier I is always unlocked
}

export interface AchievementFamily {
  familyId: string
  familyName: string
  categoryId: AchievementCategoryId
  tiers: AchievementTier[]
}

export interface AchievementTier {
  achievement: Achievement
  status: 'locked' | 'unlocked' | 'completed'
  progress: number      // 0.0 – 1.0, for partial progress display
  progressLabel: string // e.g. "7 / 10"
}
```

**Verify:** `npx tsc --noEmit` passes.

---

## Step 2 — Node and connector components

These are pure visual components. Build them before the screen layout.

### 2a. `AchievementNode` component

```tsx
// src/components/AchievementNode.tsx

interface AchievementNodeProps {
  tier: AchievementTier
  categoryColor: string
  onPress: () => void
  size?: number  // default 52
}
```

Visual states:

**Completed** — full category color fill, glowing shadow, tier icon visible, shimmer animation (reuse the card shimmer pattern)

**Unlocked** — dark fill with category color border, icon visible at full opacity, subtle pulse animation on the border

**Locked** — near-black fill, grey border at 30% opacity, padlock icon overlay, everything else at 20% opacity

Node shape — use the same hexagonal `clip-path` / chamfered shape language from the HUD buttons for visual consistency. A regular hexagon works well for nodes.

The tier Roman numeral appears as a small badge on the node, using the family's `symbol` and `color` from the achievement data.

Progress arc — for unlocked (not yet completed) nodes, draw a thin arc around the node perimeter showing partial progress. If `react-native-svg` is not installed, approximate with a border-based approach (`View` with `borderWidth`, `borderRadius`, and `overflow: hidden`).

### 2b. `BranchConnector` component

The line connecting a hub to its first tier node, and each tier node to the next.

```tsx
interface BranchConnectorProps {
  completed: boolean    // true = fully lit, false = dim
  progress: number      // 0.0–1.0, partial fill
  color: string
  orientation: 'horizontal' | 'vertical' | 'diagonal-left' | 'diagonal-right'
  length: number
}
```

Implementation — a `View` with:
- Dark background (the empty track)
- An absolutely positioned fill `View` that animates width/height from `0` to `length * progress`
- When `completed`, the fill is the full category color with a glow shadow
- Diagonal connectors use `transform: [{ rotate: '45deg' }]` — keep them short to avoid visual clutter. If diagonals cause layout complexity, use only horizontal and vertical connectors for v1.

---

## Step 3 — Category page layout

Each of the 6 category pages follows the same layout template. This is the core of the screen.

### 3a. Layout structure (standard categories: collector, progression, combat, strategy, amp)

```
┌─────────────────────────────────────┐
│  [Category Label]    [X/Y complete] │  ← header
│                                     │
│            [HUB NODE]               │  ← center hub, larger node (72px)
│           /    |    \               │
│     [fam1] [fam2] [fam3]           │  ← family branch roots (row 1)
│      │       │      │              │
│     [I]     [I]    [I]             │  ← Tier I nodes
│      │       │      │              │
│     [II]    [II]   [II]            │  ← Tier II nodes
│      │              │              │
│    [III]           [III]           │  ← Tier III nodes
│      │                             │
│     [IV]                           │  ← Tier IV nodes
│      │                             │
│      [V]                           │  ← Tier V nodes
│                                     │
└─────────────────────────────────────┘
```

The hub node is the category itself — tapping it shows a summary of all families in that category.

Families spread horizontally from the hub in a row. Each family then branches vertically downward through its tiers.

For categories with more than 4 families, split into two rows of branches — left half above center, right half below — to avoid cramping. This applies to collector (8), combat (7), strategy (7), and amp (8).

### 3b. Layout structure (feats category — single-tier nodes only)

The feats category has 5 families, each with only 1 tier. Instead of a tree with branches, display these as standalone badge nodes in a ring or grid around the hub:

```
┌─────────────────────────────────────┐
│  FEATS                [X/5 complete]│
│                                     │
│        [Perfect]  [Comeback]        │
│              [HUB]                  │
│        [Survivor] [Amp Race]        │
│             [Tie Breaker]           │
│                                     │
└─────────────────────────────────────┘
```

Each node connects directly to the hub with a short connector. No vertical branching needed.

### 3c. Scroll within a page

The tree for a category will likely be taller than the screen. Each category page is a `ScrollView` (vertical) nested inside the horizontal paginator. This is safe in React Native as long as the outer scroll is horizontal and inner is vertical.

### 3d. Hub node

The hub is a larger version of `AchievementNode` (72px vs 52px) with:
- Category icon in center (using `MaterialCommunityIcons` with the `icon` field from `ACHIEVEMENT_CATEGORIES`)
- Category label below
- Completion ring showing `completedInCategory / totalInCategory`
- Always "unlocked" state — the hub itself is never locked

---

## Step 4 — Pagination

The 6 category pages sit in a horizontal `FlatList` with `pagingEnabled`. This is the simplest approach and doesn't require gesture handler.

```tsx
// In CareerScreen.tsx
<FlatList
  ref={flatListRef}
  data={ACHIEVEMENT_CATEGORIES}
  horizontal
  pagingEnabled
  showsHorizontalScrollIndicator={false}
  keyExtractor={item => item.id}
  renderItem={({ item, index }) => (
    <CategoryPage
      category={item}
      families={familiesByCategory[item.id]}
      width={screenWidth}
    />
  )}
  onMomentumScrollEnd={e => {
    const index = Math.round(e.nativeEvent.contentOffset.x / screenWidth)
    setActiveCategoryIndex(index)
  }}
/>
```

### 4a. Page indicator

Below the FlatList, 6 dots — active dot is the category color, inactive dots are white at 25% opacity. The active dot animates width from 8px to 24px (pill shape) when selected, using `withSpring`.

```tsx
// Dot indicator
{ACHIEVEMENT_CATEGORIES.map((cat, i) => (
  <Animated.View
    key={cat.id}
    style={[dotBaseStyle, i === activeCategoryIndex ? activeDotStyle(cat.color) : inactiveDotStyle]}
  />
))}
```

### 4b. Swipe hint on first visit

On first load, animate the list slightly left and back (`translateX: 0 → -30 → 0`) after a 1.2s delay to hint that it's swipeable. Only show once — gate with `AsyncStorage`.

---

## Step 5 — Node detail bottom sheet

Build a bottom sheet from scratch — there is no existing bottom sheet pattern in the codebase to reuse. BattleScreen uses simple dark backdrops (`rgba(0,0,0,0.85)`) for overlays, not slide-up sheets. The structure is:

```tsx
// Backdrop — dark semi-transparent, no BlurView (expo-blur is not installed)
<Pressable onPress={closeSheet} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />

// Sheet panel — slides up from bottom
<Animated.View style={[sheetStyle, sheetAnimatedStyle]}>
  {/* Drag handle */}
  <View style={dragHandleStyle} />

  {/* Achievement details */}
  <Text>{achievement.name}</Text>
  <Text>{achievement.desc}</Text>

  {/* Progress bar */}
  <ProgressBar current={progressCurrent} max={progressMax} color={categoryColor} />

  {/* Tier badge — Roman numeral */}
  <TierBadge tier={achievement.tier} />

  {/* Reward */}
  <RewardDisplay xp={achievement.xp} credits={achievement.credits} />

  {/* Locked message */}
  {status === 'locked' && (
    <Text>Complete {previousTierName} to unlock</Text>
  )}
</Animated.View>
```

The open/close animation:

```ts
const sheetY = useSharedValue(SHEET_HEIGHT)

const openSheet = (tier: AchievementTier) => {
  setSelectedTier(tier)
  sheetY.value = withSpring(0, { damping: 18, stiffness: 220 })
}

const closeSheet = () => {
  sheetY.value = withTiming(SHEET_HEIGHT, { duration: 240 })
  setTimeout(() => setSelectedTier(null), 240)
}

const sheetAnimatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: sheetY.value }],
}))
```

---

## Step 6 — Entry animations

When the screen mounts, stagger the nodes into view. This makes the tree feel alive rather than just appearing.

### 6a. Hub animates in first

```ts
hubOpacity.value = withDelay(100, withTiming(1, { duration: 300 }))
hubScale.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 200 }))
```

### 6b. Branch rows stagger in

Each row of nodes animates in with a delay based on row depth:

```ts
// Row 1 (family roots): delay 250ms
// Row 2 (Tier I): delay 380ms
// Row 3 (Tier II): delay 480ms
// etc.
nodes[rowIndex].forEach((node, colIndex) => {
  node.opacity.value = withDelay(
    250 + rowIndex * 110 + colIndex * 40,
    withTiming(1, { duration: 280 })
  )
  node.translateY.value = withDelay(
    250 + rowIndex * 110 + colIndex * 40,
    withSpring(0, { damping: 14, stiffness: 180 })
  )
})
```

Start all nodes at `opacity: 0, translateY: 20` and animate to `opacity: target, translateY: 0`.

### 6c. Re-run on page change

When the user swipes to a new category page, re-run the entry animation for that page's nodes. Gate this with the `onMomentumScrollEnd` callback.

---

## Step 7 — Completion celebration

When a node transitions from `unlocked` → `completed` (detected by comparing previous and current `completedIds`):

1. Node scales up to 1.3 then springs back to 1.0
2. A burst of small particles radiates from the node — 6–8 small circles, each flying outward on a random angle, fading to 0
3. The connector line to the next tier animates from 0% filled to its new progress value
4. If completing the last tier in a family, the branch connector to the hub pulses in the category color
5. Haptic: `Haptics.notificationAsync(NotificationFeedbackType.Success)`

Particle implementation — no library needed. Each particle is an `Animated.View` with:

```ts
const angle = (i / NUM_PARTICLES) * Math.PI * 2
const distance = 35 + Math.random() * 20

particle.x.value = withTiming(Math.cos(angle) * distance, { duration: 500 })
particle.y.value = withTiming(Math.sin(angle) * distance, { duration: 500 })
particle.opacity.value = withSequence(
  withTiming(1, { duration: 100 }),
  withTiming(0, { duration: 400 })
)
```

---

## Step 8 — Navigation

`CareerScreen` is already registered as its own tab in the bottom tab navigator (`Career Stack → CareerScreen`). The screen file already exists at `src/screens/CareerScreen.tsx`. This step is about replacing the existing CareerScreen content with the new skill tree UI — no navigation changes needed.

---

## Performance Notes

With ~163 nodes across 6 categories, performance needs attention:

- **Only render the active category page and its immediate neighbors** — use `FlatList`'s `windowSize={3}` and `initialNumToRender={1}`
- **`React.memo` on `AchievementNode` and `BranchConnector`** — these will re-render frequently otherwise
- **`useCallback` on `onPress` handlers** passed to nodes
- **Don't run entry animations on off-screen pages** — gate animation start with `isFocused` from the page's position relative to `activeCategoryIndex`
- **Shared values over state** for all animation values — never `useState` for anything that drives a transform

---

## Testing Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] All 6 category pages render without crash
- [ ] All 41 families correctly assigned to categories — verify by reading `achievements.ts`
- [ ] Tier I always unlocked, Tier II locked until Tier I complete, etc.
- [ ] Locked nodes show padlock, correct opacity
- [ ] Completed nodes show glow and shimmer
- [ ] Progress arc on unlocked nodes reflects real game state data (battleStats for battle achievements, collection/level/etc. for non-battle)
- [ ] Tapping any node opens bottom sheet with correct achievement data
- [ ] Bottom sheet closes on backdrop tap and drag down
- [ ] Locked node bottom sheet shows "complete X to unlock" message
- [ ] Page indicator dots update on swipe, active dot animates to pill shape
- [ ] Entry stagger animation fires on mount and on page change
- [ ] Completion celebration fires when achievement completes mid-session
- [ ] Completion haptic fires correctly
- [ ] `FlatList` pagination snaps cleanly between 6 pages
- [ ] Vertical scroll within each page works independently of horizontal page swipe
- [ ] No performance jank scrolling the vertical tree — test with largest categories (amp: 36 nodes, combat/strategy: 35 nodes)
- [ ] Feats page renders badge-style layout (no vertical branches)
- [ ] Single-tier families (Battlefield Control in amp, all feats) render correctly without empty branch space
- [ ] `npx expo start --clear` — clean boot

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/data/constants.ts` | Add `ACHIEVEMENT_CATEGORIES`, `AchievementCategoryId` |
| `src/data/achievements.ts` | Add `FAMILY_CATEGORY_MAP`, `getFamiliesForCategory` helper, `AchievementFamily` and `AchievementTier` interfaces |
| `src/components/AchievementNode.tsx` | New component |
| `src/components/BranchConnector.tsx` | New component |
| `src/screens/CareerScreen.tsx` | New screen — full skill tree UI |
| `App.tsx` | Add `CareerScreen` to navigation |

---

## Notes for Claude Code

- Read `achievements.ts` and `useGameState.ts` fully in Step 0 — confirm field names (`id`, `family`, `symbol`, `color`, `cat`, `tier`, `name`, `desc`, `req`, `xp`, `credits`) and progress tracking shape (`battleStats: Record<string, number>`, `earnedAchievements: string[]`)
- The `FAMILY_CATEGORY_MAP` in Step 1b is the canonical mapping — use it exactly as written, all 41 families are accounted for
- Do not use `react-native-gesture-handler` pan/pinch for this implementation — the paginated `FlatList` approach deliberately avoids it for simplicity
- The `BranchConnector` diagonal orientation is optional — if it causes layout complexity, use only horizontal and vertical connectors for v1
- Particle burst in Step 7 can be deferred to v2 if Step 6 entry animations are already complex enough — the core celebration (node scale + haptic + connector fill) is the minimum
- `expo-blur` is NOT installed — do not use `BlurView`. Use dark semi-transparent backdrop (`rgba(0,0,0,0.85)`) matching BattleScreen's overlay pattern
- `react-native-svg` is NOT installed — use a border-based approximation for progress arcs (`View` with `borderWidth`, `borderRadius`, and `overflow: hidden`)
- Battlefield Control is the only single-tier family outside of the feats category — handle it gracefully in the amp page layout (no branch below it)
- Non-battle achievement progress is computed from game state fields: `collection` (card count), `packsOpened`, `level`, `totalTrades`, `ownedAvatars`, card roster (rarity/alliance/type filters). Battle achievements use `battleStats[stat]`.
