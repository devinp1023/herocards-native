# HeroCards — React Native Project

## What This Is
A React Native (Expo) conversion of an existing web-based superhero card collecting game.
The web version lives at https://github.com/devinp1023/herocards and is complete.
This repo is the native iOS app, built session by session per the tech spec.

**Always read the tech spec before starting any session:**
`PRDs/HeroCards_ReactNative_TechSpec.docx`

## Key References
- **Tech spec**: `PRDs/HeroCards_ReactNative_TechSpec.docx` — full session plan, architecture decisions, file structure
- **Battle PRD**: `PRDs/HeroCards_BattleSystem_PRD_v1.3.docx` — battle engine rules, abilities, AI logic (Sessions 11–12)
- **Web source**: https://github.com/devinp1023/herocards — reference for porting logic and UI

## Session Roadmap
| # | Focus | Status |
|---|-------|--------|
| 1 | Foundation — Expo scaffold, Firebase, AuthScreen, data port | ✅ Complete |
| 2 | HeroCard Skia — structure (canvas, layout, image window, stat bars) | ✅ Complete |
| 3 | HeroCard Skia — effects (rarity glow shader, shine, tilt on touch) | ✅ Complete |
| 4 | Collection Screen — 2-col grid, filters, MissingCard, card detail nav | ✅ Complete |
| 5 | Card Detail Screen | ✅ Complete |
| 6 | Home + Profile — XP bar, credits, avatar, quests preview, bottom tabs | ✅ Complete |
| 7 | Pack Opening — reveal animation, haptics, sounds, summary | ✅ Complete |
| 8 | Store — avatar store, card store, daily offers | ✅ Complete |
| 9 | Quests + Achievements | ✅ Complete |
| 10 | Battle Lobby — deck builder (rarity limits: max 1 Leg / 2 Epic / 4 Rare / 10 Uncommon / 10 Common) | ✅ Complete |
| 11 | Battle UI — core state machine port | ✅ Complete |
| 12 | Battle UI — animations (Reanimated) | ✅ Complete |
| 13 | Firebase Persistence — full Firestore save/load | ✅ Complete |
| 14 | Ability Assignment + God Mode | ⏳ Next |
| 15 | Polish + Edge Cases | |
| 16 | App Store Prep | |

## Architecture

### Tech Stack
- **Expo SDK 55** (blank TypeScript template)
- **React Native 0.83.2 / React 19**
- **React Navigation v6** (pinned — v7 API differs)
- **@shopify/react-native-skia** — card rendering
- **react-native-reanimated** — battle animations (lunge, shake, swap, defeat)
- **react-native-gesture-handler** — drag-to-attack gestures in battle
- **Firebase Web SDK v12** — same package as web app, pure JS, works in standard Expo Go
- **@react-native-async-storage/async-storage** — local persistence
- **react-native-get-random-values** — Metro shim for Firebase crypto (MUST be first import in App.tsx)
- **expo-font + @expo-google-fonts/orbitron + @expo-google-fonts/rajdhani** — fonts

### File Structure
```
herocards-native/
├── App.tsx                          ← Entry point: shim, fonts, auth state, GameStateProvider
├── PRDs/                            ← Tech spec + battle PRD (.docx)
├── assets/
│   └── fonts/                       ← Orbitron_700Bold.ttf, Orbitron_900Black.ttf, Rajdhani_600SemiBold.ttf
└── src/
    ├── battle/
    │   ├── aiDeck.ts                ← buildAiDeck() — randomised AI deck per tier
    │   └── battleEngine.ts          ← Pure battle logic (HP, damage, free-hit, type multipliers)
    ├── components/
    │   ├── CardWrapper.tsx          ← Scale container for HeroCard/MiniCard
    │   ├── FaceDownCard.tsx         ← Skia face-down card
    │   ├── HeroCard.tsx             ← Skia hero card (glow, shine, tilt)
    │   └── MiniCard.tsx             ← Lightweight RN card for grids + battle hand
    ├── context/
    │   ├── FontContext.ts           ← Skia font context (loaded once in App.tsx)
    │   ├── GameStateContext.ts      ← React context wrapping useGameState
    │   └── SessionContext.ts        ← uid + username + logout
    ├── data/
    │   ├── abilities.ts             ← Ability definitions (assigned in Session 14)
    │   ├── achievements.ts          ← ACHIEVEMENTS array + ACHIEVEMENT_FAMILIES + Achievement interface
    │   ├── cards.ts                 ← ALL_CARDS (200 cards) — id, name, type, rarity, power, defense, speed, emoji, desc, pack, alliance, imageUrl?, ability?
    │   ├── constants.ts             ← RC, RO, XP_THRESHOLDS, TYPE_COLORS, BATTLE_RARITY_LIMITS, TIER_INFO, BATTLE_REWARDS, AI_DECK_COMP, cooldown helpers
    │   ├── packs.ts                 ← PACKS, AVATARS, AVATAR_TIER_COLORS, LEVEL_AVATARS
    │   └── quests.ts                ← DAILY_QUESTS, DIFF_COLOR, getTodaysQuests(), Quest interface
    ├── firebase/
    │   └── config.ts                ← Firebase init (auth, db, storage)
    ├── hooks/
    │   ├── useBattle.ts             ← Battle state machine, animation signals, round sequencing
    │   ├── useFirebase.ts           ← loadGameData / saveGameData (Firestore read/write)
    │   └── useGameState.ts          ← All in-memory game state; debounced Firestore save on change
    ├── screens/
    │   ├── AuthScreen.tsx
    │   ├── BattleLobbyScreen.tsx
    │   ├── BattleScreen.tsx
    │   ├── CardDetailScreen.tsx
    │   ├── CollectionScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── PackOpeningScreen.tsx
    │   ├── ProfileScreen.tsx
    │   └── StoreScreen.tsx
    └── theme/
        └── fonts.ts                 ← FONTS.orbitronBold, FONTS.orbitronBlack, FONTS.rajdhaniSemiBold
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
- No Firebase SDK swap needed — same `firebase` npm package as web app

### Firebase Persistence (Session 13 — complete)
- `src/hooks/useFirebase.ts` — `loadGameData(uid)` + `saveGameData(uid, data)` via Firestore
- `useGameState` accepts `initialData?: PersistedGameData | null` — initialises all state from Firestore on login
- `App.tsx` calls `loadGameData` in the auth listener before mounting `GameStateProvider`, passing `initialData` as prop
- Save is **debounced 500ms** on any state change; also fires on unmount if dirty
- **Skip-first-save guard**: `mountedRef` prevents the mount-time default state from overwriting Firestore
- If Metro cache is stale after persistence changes, restart with `npx expo start --clear`

### Fonts
- Loaded in `App.tsx` via `useFonts()` for native Text components
- `@expo-google-fonts/orbitron` → `Orbitron_700Bold`, `Orbitron_900Black`
- `@expo-google-fonts/rajdhani` → `Rajdhani_600SemiBold`
- Skia `useFont()` references `.ttf` files from `assets/fonts/` via `require()`
- Font constants: `src/theme/fonts.ts` → `FONTS.orbitronBold`, `FONTS.orbitronBlack`, `FONTS.rajdhaniSemiBold`

## Card Data
- 200 cards in `src/data/cards.ts`
- Fields: `id, name, type, rarity, power, defense, speed, emoji, desc, pack, alliance, imageUrl?, ability?`
- 17 cards have `imageUrl` pointing to Firebase Storage (`card-images/card_XXX.png`)
- `ability?` field present on Card interface — populated in Session 14
- Rarity distribution: 5 Legendary, 10 Epic, 30 Rare, 55 Uncommon, 100 Common
- 2 packs: Pack 1 "Infinite Waves" 🌊, Pack 2 "Shrouded Mysteries" 🌑

## Card Rendering — Skia
- Each card is a fixed **300×433px canvas**, scaled externally via container transform
- Never reflows — contents always at same coordinates relative to canvas
- Scale targets: collection 45%, detail 90%, battle active 85%, battle hand 40%, pack reveal 100%
- `useFont()` hook required for all text inside canvas — CSS font-family does not apply
- Fonts loaded once at app root, passed via `FontContext` to avoid redundant loading
- Skia images: `useImage(url)` is async — always handle null/loading state
- Emoji do not render in Skia canvas — use a separate RN `Text` overlay for emoji
- `MiniCard` (pure RN, no Skia) used in collection grid + battle hand for performance

## Battle System
See `PRDs/HeroCards_BattleSystem_PRD_v1.3.docx` for full rules.

Key rules:
- 10-card decks, rarity limits: max 1 Legendary / 2 Epic / 4 Rare / 10 Uncommon / 10 Common
- HP = `100 + (defense × 0.5)`, Damage = `max(1, round(power × typeMultiplier − defense × 0.5))`
- Free-hit rule: attack vs non-attack → attacker gets a free unreciprocated hit; both non-attack → no combat
- AI proactively swaps when active HP < 35% and a better card exists in hand
- 5 combat types (Melee/Agility/Energy/Intelligence/Magic) mapped from 15 card subtypes
- Type advantage: ×1.5 | Type disadvantage: ×0.75 | Same type: ×0.75 | Neutral: ×1.0
- 3 AI tiers: Rookie (1), Veteran (2), Elite (3) — defined in `TIER_INFO` in constants.ts
- Animations: player lunge (spring-back), AI lunge (translateY toward player + spring back), shake/flash on hit, swap slide, draw bounce, defeat fall

### Battle UI Architecture
- `useBattle` uses **DisplaySnapshot** pattern — ref state is snapshotted into React state atomically on each `refresh()` call, preventing stale/torn UI reads
- `aiAttackKey` signal increments when AI card attacks — triggers lunge animation in `AIActiveSection`
- Round sequencing uses `setTimeout` chains at `STEP_MS = 1000ms` per step

## Expo Go Workflow
Standard Expo Go throughout Sessions 1–15 — no custom dev build needed.
Firebase Web SDK (pure JS) + AsyncStorage (pure JS) = no native modules.
Custom dev build only needed at Session 16 for App Store submission.

```bash
npx expo start          # starts Metro, shows QR
npx expo start --clear  # clears Metro cache (use after persistence/hook changes)
# press i               # opens iOS Simulator (Mac only)
# scan QR               # opens in Expo Go on iPhone
```

## Navigation Structure
```
Root Stack
├── AuthScreen          (when not logged in)
└── MainTabs (Bottom Tab Navigator)
    ├── Home Stack → HomeScreen, PackOpeningScreen
    ├── Collection Stack → CollectionScreen, CardDetailScreen
    ├── Battle Stack → BattleLobbyScreen, BattleScreen
    ├── StoreScreen
    └── Profile Stack → ProfileScreen
```

## State Architecture
| Hook | Owns |
|------|------|
| `useGameState` | All in-memory game state (coins, XP, level, collection, avatars, quests, achievements, cooldowns). Debounced Firestore save on change. |
| `useFirebase` | `loadGameData` + `saveGameData` — all Firestore reads/writes. |
| `useBattle` | Battle state machine, animation signals (hitKey, attackKey, swapOutCardId, etc.), round sequencing |

## Git Workflow
- Repo: https://github.com/devinp1023/herocards-native
- Branch: **always work on `main` directly** — do not use worktrees or feature branches
- Git user: Devin Patel / devinp1023@gmail.com
- Always ask before pushing to GitHub
- Run `npx tsc --noEmit` before committing — must pass with zero errors

## Workflow Per Session
1. Read the relevant session row in the tech spec before writing any code
2. Build the session deliverables
3. TypeScript check: `npx tsc --noEmit` (must be zero errors)
4. Confirm app runs in Expo Go / iOS Simulator
5. Ask user before committing and pushing

---

## Mac Environment Setup

**If this is the first session on a new Mac, run this setup before doing anything else.**

### Manual steps (require App Store — Claude Code cannot do these)
1. Install **Xcode** from the Mac App Store
2. Open Xcode once to accept the license agreement
3. Run `xcode-select --install` in Terminal to install Command Line Tools
4. Install **Expo Go** on iPhone from the App Store

### Automated setup (Claude Code can run all of these)
Ask Claude Code: *"Set up my Mac for this project"* and it will run:

```bash
# 1. Homebrew (Mac package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Core tools
brew install node python watchman pandoc gh

# 3. Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 4. Clone the original web app (needed as porting reference — must be sibling folder)
# Run this from the same parent directory as herocards-native
git clone https://github.com/devinp1023/herocards.git

# 5. Project dependencies (in herocards-native)
npm install
```

### Expected folder structure on Mac
```
~/          (or wherever you keep projects)
├── herocards/           ← original web app (porting reference)
│   └── src/
│       ├── data.js          ← ALL_CARDS, constants, Firebase init
│       ├── components.js    ← HeroCard, AuthScreen, all UI components
│       ├── game.js          ← Game + App, all screen logic
│       ├── battle-engine.js ← pure JS battle engine
│       └── battle-ui.js     ← live battle UI
└── herocards-native/    ← this repo (React Native app)
```

Claude Code will read files from `../herocards/src/` when porting components and logic. If you clone to a different location, update the paths accordingly.

### What each tool is for
| Tool | Why |
|------|-----|
| Homebrew | Mac package manager — installs everything else |
| Node.js | Runs Metro bundler, npm, npx |
| Python | Required for docx editing (tech spec + PRDs) |
| Watchman | Facebook's file watcher — makes Metro faster and more reliable on Mac |
| pandoc | Extracts text from .docx files cleanly (docx skill) |
| GitHub CLI (`gh`) | Lets Claude Code push, create PRs, manage releases from terminal |
| Claude Code CLI | The AI coding assistant itself |
| Expo Go (iPhone) | Test the app on device by scanning QR code |
| Xcode | iOS Simulator — press `i` in Metro to open without needing a phone |

### Not needed until Session 16
- **EAS CLI** (`npm install -g eas-cli`) — only for App Store build submission
