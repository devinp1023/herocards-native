# HeroCards — React Native Project

## What This Is
A React Native (Expo) iOS app — a full conversion of an existing web-based superhero card collecting game.
The web version lives at https://github.com/devinp1023/herocards and is complete.
**The React Native conversion is complete.** The app is now in ongoing polish and maintenance before App Store submission.

## Key References
- **Tech spec**: `PRDs/HeroCards_ReactNative_TechSpec.docx` — original session plan and architecture decisions
- **Battle PRD**: `PRDs/HeroCards_BattleSystem_PRD_v1.3.docx` — battle engine rules, abilities, AI logic
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

**Next milestone: App Store submission (Session 16)**
- Switch Expo Go → EAS custom build
- App icons, splash screen, bundle ID, signing
- App Store Connect listing, TestFlight, submission

## Workflow
- Describe what you want fixed or improved — no need for formal session structure
- Run `npx tsc --noEmit` before committing (must be zero errors)
- Run `npx expo start` or `npx expo start --clear` to test
- Always ask before pushing to GitHub

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
    │   └── battleEngine.ts          ← Pure battle logic (HP, damage, free-hit, type multipliers, all 25 abilities)
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
    │   ├── abilities.ts             ← Ability definitions and descriptions
    │   ├── achievements.ts          ← ACHIEVEMENTS array + Achievement interface
    │   ├── cards.ts                 ← ALL_CARDS (200 cards) — fallback if Firestore is unavailable
    │   ├── constants.ts             ← RC, RO, XP_THRESHOLDS, TYPE_COLORS, BATTLE_RARITY_LIMITS, TIER_INFO, BATTLE_REWARDS, cooldown helpers
    │   ├── packs.ts                 ← PACKS, AVATARS, AVATAR_TIER_COLORS, LEVEL_AVATARS
    │   └── quests.ts                ← DAILY_QUESTS, getTodaysQuests(), Quest interface
    ├── firebase/
    │   └── config.ts                ← Firebase init (auth, db, storage)
    ├── hooks/
    │   ├── useBattle.ts             ← Battle state machine, animation signals, round sequencing
    │   ├── useFirebase.ts           ← loadGameData / saveGameData / loadCardRoster (Firestore)
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
- Card data lives in Firestore `cards` collection — loaded on startup via `loadCardRoster()`, falls back to `cards.ts`
- Game state saved to Firestore `users/{uid}` — debounced 500ms, also saves on unmount

### Card Data
- 200 cards — `id, name, type, rarity, power, defense, speed, emoji, desc, pack, alliance, imageUrl?, ability?`
- Firestore is the live source; `src/data/cards.ts` is the offline fallback
- To update cards: edit in CMS → click "Re-seed All Cards" → Firestore updates → app picks up on next launch
- To sync Firestore → cards.ts: `npm run sync-cards`
- 17 cards have `imageUrl` (Firebase Storage `card-images/card_XXX.png`)
- All 200 cards have `ability` assigned (25 abilities across 5 rarity tiers)

### Fonts
- Loaded in `App.tsx` via `useFonts()` for native Text components
- Skia `useFont()` references `.ttf` files from `assets/fonts/` via `require()`
- Font constants: `src/theme/fonts.ts` → `FONTS.orbitronBold`, `FONTS.orbitronBlack`, `FONTS.rajdhaniSemiBold`

## Card Rendering — Skia
- Each card is a fixed **300×433px canvas**, scaled externally via container transform
- Never reflows — contents always at same coordinates relative to canvas
- Scale targets: collection 45%, detail 90%, battle active 85%, battle hand 40%, pack reveal 100%
- `useFont()` hook required for all text inside canvas — CSS font-family does not apply
- Emoji do not render in Skia canvas — use a separate RN `Text` overlay for emoji
- `MiniCard` (pure RN, no Skia) used in collection grid + battle hand for performance

## Battle System
See `PRDs/HeroCards_BattleSystem_PRD_v1.3.docx` for full rules.

Key rules:
- 10-card decks, rarity limits: max 1 Legendary / 2 Epic / 4 Rare / 10 Uncommon / 10 Common
- HP = `100 + (defense × 0.5)`, Damage = `max(1, round(power × typeMultiplier − defense × 0.5))`
- Free-hit rule: attack vs non-attack → attacker gets free unreciprocated hit; both non-attack → no combat
- AI proactively swaps when active HP < 35% and a better card exists in hand
- 5 combat types (Melee/Agility/Energy/Intelligence/Magic) mapped from 15 card subtypes
- Type advantage: ×1.5 | Type disadvantage: ×0.75 | Same type: ×0.75 | Neutral: ×1.0
- 3 AI tiers: Rookie (1), Veteran (2), Elite (3)
- All 25 abilities fully implemented in `battleEngine.ts`

### Battle UI Architecture
- `useBattle` uses **DisplaySnapshot** pattern — ref state snapshotted into React state atomically on each `refresh()` call
- `aiAttackKey` signal increments when AI attacks — triggers lunge animation in `AIActiveSection`
- Round sequencing uses `setTimeout` chains at `STEP_MS = 1000ms` per step

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
| `useFirebase` | `loadGameData` + `saveGameData` + `loadCardRoster` — all Firestore reads/writes. |
| `useBattle` | Battle state machine, animation signals, round sequencing |

## God Mode
Login with username `__god__` — unlocks all 200 cards, all avatars, 99999 coins, max XP, all achievements. Skips Firestore save.

## Git Workflow
- Repo: https://github.com/devinp1023/herocards-native
- Branch: **always work on `main` directly** — no worktrees or feature branches
- Git user: Devin Patel / devinp1023@gmail.com
- Always ask before pushing to GitHub
- Run `npx tsc --noEmit` before committing — must pass with zero errors

---

## Mac Environment Setup

**If this is the first session on a new Mac, run this setup before doing anything else.**

### Manual steps (require App Store — Claude Code cannot do these)
1. Install **Xcode** from the Mac App Store
2. Open Xcode once to accept the license agreement
3. Run `xcode-select --install` in Terminal to install Command Line Tools
4. Install **Expo Go** on iPhone from the App Store

### Automated setup (Claude Code can run all of these)
```bash
# 1. Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Core tools
brew install node python watchman pandoc gh

# 3. Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 4. Project dependencies (in herocards-native)
npm install
```

### What each tool is for
| Tool | Why |
|------|-----|
| Homebrew | Mac package manager |
| Node.js | Runs Metro bundler, npm, npx |
| Python | Required for docx reading |
| Watchman | Makes Metro faster and more reliable on Mac |
| pandoc | Extracts text from .docx files |
| GitHub CLI (`gh`) | Push, PRs, releases from terminal |
| Expo Go (iPhone) | Test on device via QR code |
| Xcode | iOS Simulator — press `i` in Metro |

### App Store Prep (when ready)
- Install EAS CLI: `npm install -g eas-cli`
- Run `eas build` for custom dev build
- Configure app icons, splash screen, bundle ID, signing in `app.json`
