# HeroCards — React Native Project

## What This Is
A React Native (Expo) iOS app — a full conversion of an existing web-based superhero card collecting game.
The web version lives at https://github.com/devinp1023/herocards and is complete.
**The React Native conversion is complete.** The app is now in ongoing polish and maintenance before App Store submission.

## Key References
- **Tech spec**: `PRDs/HeroCards_ReactNative_TechSpec.docx` — original session plan and architecture decisions
- **Battle PRD**: `PRDs/HeroCards_BattleSystem_v2_PRD.md` — battle engine rules, abilities, AI logic (v2)
- **Career Screen PRD**: `PRDs/CAREER_SCREEN.md` — achievement skill tree UI, collection flow, category layout
- **Visual Polish PRD**: `PRDs/VISUAL_POLISH.md` — materials, textures, animations, rarity tiers, haptics, choreography (COMPLETE)
- **Amp Particle PRD**: `PRDs/Particles/AMP_PARTICLE_SHAKE_PRD.md` — particle drift + card shake amp visualization
- **Slam Animation PRD**: `PRDs/Battle Choreography/SLAM_ANIMATION.md` — per-weight attack slam animation (COMPLETE)
- **Battle Choreography PRD**: `PRDs/Battle Choreography/Battle choreography.md` — full round lifecycle choreography (7 sprints)
- **Web source**: https://github.com/devinp1023/herocards — original web app for reference
- **CMS**: https://hero-cards-1f345.web.app — creator-only card management UI (vanilla JS, Firebase Hosting)
- **CMS repo**: https://github.com/devinp1023/herocards-CMS

## Current Status
All 14 build sessions complete. The app has:
- Full card collection (200 cards, Skia rendering, rarity glows, tilt)
- Pack opening with animations and haptics
- Avatar store, card store, daily offers
- Daily quests and achievements
- Battle system with full ability engine, AI tiers, animations
- Firebase persistence (Firestore save/load on every state change)
- God Mode (login with `__god__` as username)
- Firestore as live card data source — falls back to `cards.ts`
- CMS for managing card data and images — `Re-seed All Cards` to push to Firestore

**Battle System v2 rewrite — COMPLETE (all 6 sprints)**
- Sprint 1: 9-type system + new damage formula
- Sprint 2: Stamina system + attack weights (Light/Medium/Heavy/Rest)
- Sprint 3: Amp meter + 6 effects (trigger at 100, spend 50 to switch)
- Sprint 4a/4b: All 50 v2 abilities implemented + assigned to all 200 cards
- Sprint 5: Legendary Lock + v2 AI deck compositions
- Sprint 6a: Win-streak ×2 threshold fixed (3+), 13 new battle daily quests (pool 15→28), CMS DEFAULT_CARDS synced and redeployed
- Sprint 6b: 119 new battle achievements across 27 families + `battleStats` cumulative tracking

**Visual Polish PRD — COMPLETE (all 5 phases, sprints 1.1–5.5)**
- Phase 1: Theme tokens, texture assets, color migration
- Phase 2: MaterialSurface, GradientBorder, elevation system, progress bars, cyan-to-mint migration
- Phase 3: ScreenBackground, ambient particles, screen title shimmer, font/color tokenization, button tokens
- Phase 4: AnimatedNumber, SuccessBurst, press ripple, button shimmer, tab energy trail, rarity tier upgrades (Uncommon→Legendary)
- Phase 5: Haptic pairing, pack opening choreography, legendary pull choreography, victory + level-up choreography, achievement toast choreography

**Current milestone: App Store submission**
- Switch Expo Go → EAS custom build
- App icons, splash screen, bundle ID, signing
- App Store Connect listing, TestFlight, submission

## Workflow
- Describe what you want fixed or improved — no need for formal session structure
- Run `npx tsc --noEmit` before committing (must be zero errors)
- Run `npx expo start` or `npx expo start --clear` to test (use `--clear` after hook/persistence changes)
- Always ask before pushing to GitHub

## Critical Rules — Read Before Touching Any Screen
- **Never import `ALL_CARDS` directly in screens or hooks.** Always use `gs.cardRoster` from `useGameStateContext()`. `ALL_CARDS` is only for fallback in `useFirebase.ts` and `useGameState.ts`.
- **Never put computed values that depend on `cardRoster` at module level.** They must be `useMemo` inside the component (e.g. `ALL_TYPES` filters).
- **`React.memo`** should be applied to any list item component rendered inside a `FlatList` — prevents expensive re-renders when unrelated state changes.
- **`useCallback`** should wrap all event handlers passed as props to memoized components.
- **Never hardcode hex color values in screens or components.** Always use `T.*` tokens from `src/theme/theme.ts` (e.g. `T.bg.surface`, `T.accent.mint`, `T.text.muted`). The only exceptions are: (1) domain colors in data files (`cards.ts`, `packs.ts`, `constants.ts`) where color is part of the data model, (2) stamina-specific cyan (`#4fc3f7`), and (3) colors with dynamic alpha that don't have a token (use `T.accent.mint + '66'` pattern). If a new color is needed, add it to `theme.ts` first, then reference the token.
- **Never animate layout props** (width, height, padding) — use Reanimated shared values or transforms only.
- **Never nest a Skia Canvas inside another Canvas.** Skia Canvases exist on `HeroCard.tsx`, the custom tab bar, and amp arcs in BattleScreen only.

## Auth
- Email/password only (no Google Sign-In in the native app)
- Users create an account or log in on `AuthScreen`
- God Mode: toggle on the login screen — bypasses Firebase auth entirely

## Screens Overview
- **HomeScreen** — hub with battle button, open packs button, daily quests displayed inline, profile card (taps to ProfileScreen)
- **CareerScreen** — paginated achievement skill tree (6 category pages: Collector, Progression, Combat, Strategy, Amp & Abilities, Feats) with collection flow
- **ProfileScreen** — standalone profile page: battle stats grid, collection progress per pack, avatar gallery grid, account/logout
- **DecksScreen** — coming soon placeholder
- Daily quests live on **HomeScreen**, achievements live on **CareerScreen**. There is no SettingsScreen.

## Scripts
| Script | What it does |
|--------|-------------|
| `npm run sync-cards` | Pulls all 200 cards from Firestore → regenerates `src/data/cards.ts` |
| `node scripts/assign-v2-types-stamina.js` | One-time v2 script — randomly assigns battle type and stamina to all 200 cards (run once, Sprint 1) |
| `node scripts/assign-v2-abilities.js` | One-time v2 script — randomly assigns a v2 ability per card within rarity tier (run once, Sprint 4a) |
| `node scripts/push-stamina-to-firestore.js` | Pushes stamina field from cards.ts to all 200 Firestore card documents |
| `node scripts/push-abilities-to-firestore.js` | Pushes ability field from cards.ts to all 200 Firestore card documents |

## Haptics
`expo-haptics` is used across the app per the haptic pairing map (Sprint 5.1):
- **Pack crack**: Medium impact on pack open
- **Card reveals**: Rarity-tiered (Common/Uncommon=Light, Rare=Medium, Epic=Heavy, Legendary=Success notification)
- **Battle slam lift**: Light impact (Medium for Heavy attacks) — fires when card lifts
- **Battle slam impact**: Heavy impact — fires at slam impact point; Heavy attacks add a second Medium pulse 120ms later
- **Battle damage received**: Medium impact (Heavy impact for heavy attacks) — incoming AI hits
- **Victory**: Success notification
- **Level up**: Success notification (both battle overlay and global toast)
- **Achievement earned**: Light impact
- **Achievement collected**: Medium impact
- **Amp 90% threshold**: Medium impact (once on crossing 90%, triggers card shake)
- No audio — sound effects were not implemented.

## Architecture

### Tech Stack
- **Expo SDK 55** (blank TypeScript template)
- **React Native 0.83.2 / React 19**
- **React Navigation v6** (pinned — v7 API differs)
- **@shopify/react-native-skia** — card rendering
- **react-native-reanimated** — all animations (battle, toast choreography, pack opening, ambient effects)
- **react-native-gesture-handler** — drag-to-attack gestures in battle, swipe-to-dismiss on toasts
- **Firebase Web SDK v12** — same package as web app, pure JS, works in standard Expo Go
- **@react-native-async-storage/async-storage** — local persistence
- **react-native-get-random-values** — Metro shim for Firebase crypto (MUST be first import in App.tsx)
- **expo-font + @expo-google-fonts/orbitron + @expo-google-fonts/rajdhani** — fonts
- **@expo/vector-icons (MaterialCommunityIcons)** — type icons and stat pill icons on cards
- **expo-linear-gradient** — gradient fills for battle action buttons

### File Structure
```
herocards-native/
├── App.tsx                          ← Entry point: shim, fonts, auth state, GameStateProvider
├── PRDs/                            ← Tech spec + battle PRD (.docx)
├── assets/
│   ├── fonts/                       ← Orbitron_700Bold.ttf, Orbitron_900Black.ttf, Rajdhani_600SemiBold.ttf
│   └── nav-icons/                   ← Custom home icon (SVG unselected, PNG selected)
└── src/
    ├── battle/
    │   ├── aiDeck.ts                ← buildAiDeck() — randomised AI deck per tier
    │   └── battleEngine.ts          ← Pure battle logic (HP, damage, stamina, type multipliers, Amp, all 50 abilities)
    ├── components/
    │   ├── AchievementNode.tsx      ← Skill tree node (4 visual states) + hub node
    │   ├── AchievementPopup.tsx     ← Toast for earned achievements (slam, burst, swipe-to-dismiss)
    │   ├── AmbientParticles.tsx     ← Viewport-aware particle drift (Home, Store screens)
    │   ├── AnimatedNumber.tsx       ← Numeric value tick-up with glow flash
    │   ├── BranchConnector.tsx      ← Connecting lines between skill tree nodes
    │   ├── CardWrapper.tsx          ← Scale container for HeroCard/MiniCard
    │   ├── FaceDownCard.tsx         ← Skia face-down card
    │   ├── GradientBorder.tsx       ← Animated gradient border overlays (violet/mint/gold)
    │   ├── AmpParticleWrap.tsx      ← Horizontal particle drift + card shake for active battle cards
    │   ├── HeroCard.tsx             ← Skia hero card (glow, shine, tilt, rarity shimmer)
    │   ├── LevelUpToast.tsx         ← Global level-up toast (slam, burst, swipe-to-dismiss)
    │   ├── LightningStrike.tsx      ← Damage number + screen shake visual
    │   ├── MaterialSurface.tsx      ← Material-finish surface panels (brushedMetal, frostedGlass, obsidian)
    │   ├── MiniCard.tsx             ← Lightweight RN card for grids + battle hand
    │   ├── ScreenBackground.tsx     ← Screen root wrapper with gradient + breathing vignette
    │   ├── ShimmerTitle.tsx         ← Gradient-shimmer screen title header
    │   └── SuccessBurst.tsx         ← Particle burst effect (up to 40 particles, imperative fire())
    ├── context/
    │   ├── FontContext.ts           ← Skia font context (loaded once in App.tsx)
    │   ├── GameStateContext.ts      ← React context wrapping useGameState
    │   └── SessionContext.ts        ← uid + username + logout
    ├── data/
    │   ├── abilities.ts             ← Ability definitions and descriptions
    │   ├── achievements.ts          ← ACHIEVEMENTS array, FAMILY_CATEGORY_MAP, getFamiliesForCategory(), AchievementFamily/AchievementTier interfaces
    │   ├── cards.ts                 ← ALL_CARDS (200 cards) — fallback if Firestore is unavailable
    │   ├── constants.ts             ← RC, RO, XP_THRESHOLDS, TYPE_COLORS, TYPE_META, RARITY_META, BATTLE_RARITY_LIMITS, TIER_INFO, BATTLE_REWARDS, ACHIEVEMENT_CATEGORIES, cooldown helpers
    │   ├── packs.ts                 ← PACKS, AVATARS, AVATAR_TIER_COLORS, LEVEL_AVATARS
    │   └── quests.ts                ← DAILY_QUESTS, getTodaysQuests(), Quest interface
    ├── firebase/
    │   └── config.ts                ← Firebase init (auth, db, storage)
    ├── hooks/
    │   ├── useAchievementProgress.ts ← Achievement progress computation for Career screen
    │   ├── useBattle.ts             ← Battle state machine, animation signals, round sequencing
    │   ├── useFirebase.ts           ← loadGameData / saveGameData / loadCardRoster (Firestore)
    │   └── useGameState.ts          ← All in-memory game state; debounced Firestore save on change
    ├── screens/
    │   ├── AuthScreen.tsx
    │   ├── BattleLobbyScreen.tsx
    │   ├── BattleScreen.tsx
    │   ├── CardDetailScreen.tsx
    │   ├── CareerScreen.tsx           ← Paginated achievement skill tree with collection flow
    │   ├── CollectionScreen.tsx
    │   ├── DecksScreen.tsx            ← Coming soon placeholder
    │   ├── HomeScreen.tsx
    │   ├── PackOpeningScreen.tsx
    │   ├── ProfileScreen.tsx          ← Standalone profile: stats, collection, avatars, account
    │   └── StoreScreen.tsx
    └── theme/
        ├── elevation.ts             ← ELEVATION states + useElevation() hook for press feedback
        ├── fonts.ts                 ← FONTS.orbitronBold, FONTS.orbitronBlack, FONTS.rajdhaniSemiBold
        └── theme.ts                 ← T tokens, TIMING, MOTION (slam/burst/float/snap/impact), SPRING, EASE, glowShadow()
```

### Firebase Config
```
apiKey:            AIzaSyCND0fQv2JUNBE4YR7bxkMuwsucnlYmH9M
authDomain:        hero-cards-1f345.firebaseapp.com
projectId:         hero-cards-1f345
storageBucket:     hero-cards-1f345.firebasestorage.app
messagingSenderId: 270324583342
appId:             1:270324583342:web:f72095eaf4a08f5dc2563f
```

### Firebase Notes
- Uses **modular v9+ API** (`import { getDoc } from 'firebase/firestore'`) — NOT the compat API
- Auth persistence: custom AsyncStorage implementation (`as unknown as Persistence`) — Firebase v12 removed `getReactNativePersistence`
- `enableIndexedDbPersistence()` is browser-only — do NOT use in React Native
- Storage uploads use `uploadBytes()` with a `Blob` (not `File`) in RN
- Card data lives in Firestore `cards` collection — loaded on startup via `loadCardRoster()`, falls back to `cards.ts`
- Game state saved to Firestore `users/{uid}` — debounced 500ms, also saves on unmount

### Card Data
- 200 cards — `id, name, type, rarity, power, defense, speed, stamina, emoji, desc, pack, alliance, imageUrl?, ability?`
- `type` = one of 9 battle types (Blaster, Magic, Psychic, Shadow, Tank, Speedster, Nature, Tech, Cosmic) — NOT the old 15-subtype system
- `stamina` = fixed stat per card, assigned within type range (Tank 12–16 … Speedster 6–9)
- `ability` = one of 50 v2 abilities (10 per rarity tier), randomly assigned per card
- Firestore is the live source; `src/data/cards.ts` is the offline fallback
- To update a card: edit in CMS → click Save — saves that card individually to Firestore → app picks up on next launch
- "Re-seed All Cards" button: overwrites ALL 200 Firestore cards with the `DEFAULT_CARDS` array embedded in the CMS HTML — use when bulk data (e.g. abilities) was changed in code and needs to be pushed to Firestore
- `DEFAULT_CARDS` in the CMS HTML is a snapshot — it goes stale when cards are edited individually in the CMS. To bring it back in sync: run `npm run sync-cards` (from `herocards-native`) to pull Firestore → `cards.ts`, then rebuild and redeploy the CMS so `DEFAULT_CARDS` reflects the latest data
- 17 cards have `imageUrl` (Firebase Storage `card-images/card_XXX.png`)
- All 200 cards have `ability` assigned (50 v2 abilities across 5 rarity tiers)

### Fonts
- Loaded in `App.tsx` via `useFonts()` for native Text components
- Skia `useFont()` references `.ttf` files from `assets/fonts/` via `require()`
- Font constants: `src/theme/fonts.ts` → `FONTS.orbitronBold`, `FONTS.orbitronBlack`, `FONTS.rajdhaniSemiBold`

## Card Rendering — Skia
- Each card is a fixed **300×433px canvas**, scaled externally via container transform
- Never reflows — contents always at same coordinates relative to canvas
- Scale targets: collection 45%, detail 90%, battle active 52%, battle hand 30%, battle preview 85%, pack reveal 100%
- `useFont()` hook required for all text inside canvas — CSS font-family does not apply
- Emoji do not render in Skia canvas — use a separate RN `Text` overlay for emoji
- **RN overlay pattern**: Skia handles backgrounds, borders, image windows, shimmer, noise. RN `View`/`Text` overlays (with `pointerEvents="none"`) handle type wash, icons, text, stat sections
- **Skia LinearGradient with hex alpha colors does not render visibly** — use RN View overlays for type color wash instead
- `HeroCard` uses `MaterialCommunityIcons` RN overlays for type icon and stat pill icons
- `MiniCard` (pure RN, no Skia) used in collection grid + battle hand for performance
- **Image height (`IMG_H = 150`)**

### Card Color Scheme
- **Type** → card color: full-card RN tint overlay (`typeColor + '30'`), type icon solid fill
- **Rarity** → accents + animation: shimmer sweep (Rare/Epic/Legendary), card border, accent bars on ability + stats sections, rarity strip at top of image
- Both cards use identical color logic

### Card Layout (4 sections)
1. **Header** — type icon (solid `typeColor` fill, white icon), card name, card number
2. **Image** — fixed 150px height, bordered with rarity color
3. **Ability box** — dark `rgba(0,0,0,0.75)` background, rarity-colored left accent bar
4. **Stats box** — dark background (Skia-rendered on HeroCard for shimmer pass-through), rarity-colored left accent bar, contains HP row + STA row + stat pills

### Stat Pill Colors
- ATK: red `#e8445a` | DEF: purple `#8b5cf6` | SPD: amber `#f59e0b`

## Battle System
See `PRDs/HeroCards_BattleSystem_v2_PRD.md` for full rules.

Key rules:
- 10-card decks, rarity limits: max 1 Legendary / 2 Epic / 4 Rare / 10 Uncommon / 10 Common
- HP = `100 + (defense × 0.5)`, Damage = `max(5, round(power × 0.4 × typeMultiplier × staminaModifier − defense × 0.15))`
- Attack types: Light (cost 1, ×0.8) / Medium (cost 3, ×1.0) / Heavy (cost 5, ×1.5) / Rest (no attack, +5 stamina)
- Heavy attacker always goes second; if both choose Heavy, normal speed check applies
- Stamina is per-card, independent — cards retain stamina when swapped; hand cards regen +1/round
- Legendary Lock: must defeat 3 opponent cards before playing a Legendary; no Legendary as opening card
- 9 battle types (Blaster, Magic, Psychic, Shadow, Tank, Speedster, Nature, Tech, Cosmic) — main cycle + Nature↔Tech rival pair + Cosmic
- Type advantage: ×2.0 | Resisted: ×0.5 | Neutral: ×1.0
- Amp meter (0–100): both sides build independently, shared effect pool of 6 effects, trigger at 100 or spend 50 to switch
- 5 AI tiers: Rookie (1), Scrapper (2), Fighter (3), Elite (4), Champion (5)
- All 50 v2 abilities implemented in `battleEngine.ts`
- AI follows the same rules as the player — no free draws, subject to Legendary Lock, manages stamina and Amp

### Battle UI Architecture
- `useBattle` uses **DisplaySnapshot** pattern — ref state snapshotted into React state atomically on each `refresh()` call
- `aiAttackKey` signal increments when AI attacks — triggers slam animation in `AIActiveSection`
- **Slam animation** — both player and AI get choreographed attack slams (lift → slam → impact hold → spring return). `SLAM_CONFIG` in `constants.ts` defines per-weight params (Light/Medium/Heavy) for lift height, slam distance, squash, shockwave, screen flash, haptics. Player slam driven by Reanimated shared values (`slamProgress`, `playerSlamType`, `shockwaveActive`, `shockwave2Active`, `flashOpacity`). AI slam uses `SLAM_CONFIG.MEDIUM` for all weights. `Shockwave` ring component renders on the hit card at impact. Z-index on `cardSection` wrappers ensures the attacking card renders on top during slam.
- Round sequencing uses `setTimeout` chains at `STEP_MS = 1000ms` per step
- **Tab bar hidden** during battle — only way to exit is Forfeit button in header
- **Battle state persistence** — battle saved to Firestore at each `'ready'` phase checkpoint; resumes on app reopen (expires after 24h). Serialization helpers in `battleEngine.ts` (`serializeBattleCard`, `rehydrateBattleCard`, `serializeSideState`, `rehydrateSideState`). Cleared on battle end or forfeit. God Mode skips saves.
- **Card preview modal** — tap any active card or hand card to see full-size HeroCard (0.85 scale) centered over dark overlay
- **Action bar** — two skewed gradient buttons (REST + ATTACK); ATTACK opens a submenu with Light/Medium/Heavy options. Uses `expo-linear-gradient` + `skewX` transform.
- **Amp visualization** — `AmpParticleWrap` wraps each active card with horizontal particle drift (dots + amp number text) from left/right edges, intensity-scaled border glow, and card shake at 90%+ amp. Vertical effect name label (`AmpEffectLabel`) on right side with REROLL/TRIGGER buttons. Tap effect name to open info modal with description.
- **Deck piles** — stacked card backs with offset layers (1–4 visible based on cards remaining) for 3D depth effect
- **Low HP** — HP bar and number pulse red (opacity 0.35→1.0) when card drops to 25% HP or below

## Navigation Structure
```
Root Stack
├── AuthScreen          (when not logged in)
└── MainTabs (Bottom Tab Navigator — custom Skia tab bar)
    ├── Collection Stack → CollectionScreen, CardDetailScreen
    ├── Decks Stack → DecksScreen
    ├── Home Stack → HomeScreen, PackOpeningScreen, ProfileScreen
    ├── StoreScreen
    └── Career Stack → CareerScreen
    (Battle accessed via button on HomeScreen → BattleLobbyScreen → BattleScreen)
```

### Tab Bar Architecture
- **Custom Skia tab bar** defined in `App.tsx` — Marvel Snap-inspired design
- Curved top edge drawn with Skia Path (quadratic bezier), octagonal notch around center Home button
- Blue cyan (`#4fc3f7`) stroke on curve + notch, dimmer dividers between sections
- Gradient background (`#10102a` → `#08081a`)
- Icons: MaterialCommunityIcons for 4 outer tabs, custom SVG/PNG for Home (animated crossfade between selected/unselected with reanimated)
- Dark `NavigationContainer` theme (`#0a0a1a`) eliminates white bleed behind curve
- Tab bar hidden during battle via `tabBarStyle: { display: 'none' }`
- Career tab has a red badge showing uncollected achievement count (reads `uncollectedCount` from game state)

## State Architecture
| Hook | Owns |
|------|------|
| `useGameState` | All in-memory game state (coins, XP, level, collection, avatars, quests, achievements, cooldowns, battleStats, battleWinStreak, savedBattle, levelUpInfo/clearLevelUp). Debounced Firestore save on change. |
| `useFirebase` | `loadGameData` + `saveGameData` + `loadCardRoster` — all Firestore reads/writes. |
| `useBattle` | Battle state machine, animation signals, round sequencing, checkpoint save/resume |
| `useAchievementProgress` | Computes `familiesByCategory`, `categoryStats`, `uncollectedCount` from game state for CareerScreen |

## Achievement System
- **41 families** across **6 categories** (collector, progression, combat, strategy, amp, feats) — 163 total tiers
- **Career Screen PRD**: `PRDs/CAREER_SCREEN.md`
- **Earned vs Collected**: achievements have two phases — `earnedAchievements` (criteria met) and `collectedAchievements` (rewards claimed via Career screen)
- **4 node states**: locked → unlocked → earned → completed
- **Uncollected achievements block the next tier** — player must collect (tap node → "Collect Rewards") before next tier unlocks
- **Rewards** (XP + credits) are NOT auto-granted — only granted when player taps "Collect" on the Career screen via `collectAchievement(id)`
- **Toast notification**: appears when achievement earned, tappable (navigates to correct Career page), X to close, suppressed during active battle
- **Tab badge**: red badge on Career tab icon shows uncollected count
- **Navigation ref**: `createNavigationContainerRef` in `App.tsx` enables global navigation from toast to Career tab
- **Feats page**: 5 single-tier achievements arranged in a ring layout (not vertical branches)
- **Battlefield Control**: only multi-tier family in feats-adjacent position — lives in `amp` category with 5 tiers
- **Entry animations**: COMPLETE — slam slide-in with MOTION.slam overshoot, badge scale burst, SuccessBurst particle pop, swipe-to-dismiss

## God Mode
Toggle on the login screen — unlocks all 200 cards, all avatars, 99999 coins. Skips Firestore save.
- **XP**: Set to `XP_THRESHOLDS[10] - 50` (just below Level 11) so any battle win triggers a level-up for easy testing
- **Achievements**: Auto-computed from initial state — only achievements already satisfied by God Mode's starting state are pre-earned. Pack/battle/level achievements trigger naturally during testing.
- **Pack opening**: Guarantees one of each rarity (Common, Uncommon, Rare, Epic, Legendary) for testing all reveal choreographies
- God Mode does **NOT** bypass Legendary Lock — the lock applies in all modes

## Git Workflow

### Native App (herocards-native)
- Repo: https://github.com/devinp1023/herocards-native
- Branch: **always work on `main` directly** — no worktrees or feature branches
- Git user: Devin Patel / devinp1023@gmail.com
- Always ask before pushing to GitHub
- Run `npx tsc --noEmit` before committing — must pass with zero errors

### CMS (herocards-CMS)
- Repo: https://github.com/devinp1023/herocards-CMS
- Local path: `/Users/devinpatel/Desktop/herocards-cms`
- Branch: **always work on `main` directly**
- After editing `public/index.html`, deploy with: `cd /Users/devinpatel/Desktop/herocards-cms && npx firebase-tools deploy --only hosting`
- Always ask before pushing to GitHub or deploying

---

## New Mac Setup
See `SETUP.md` for full environment setup instructions.