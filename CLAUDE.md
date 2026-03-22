# HeroCards — React Native Project

## What This Is
A React Native (Expo) iOS app — a full conversion of an existing web-based superhero card collecting game.
The web version lives at https://github.com/devinp1023/herocards and is complete.
**The React Native conversion is complete.** The app is now in ongoing polish and maintenance before App Store submission.

## Key References
- **Tech spec**: `PRDs/HeroCards_ReactNative_TechSpec.docx` — original session plan and architecture decisions
- **Battle PRD**: `PRDs/HeroCards_BattleSystem_v2_PRD.md` — battle engine rules, abilities, AI logic (v2)
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

## Auth
- Email/password only (no Google Sign-In in the native app)
- Users create an account or log in on `AuthScreen`
- God Mode: toggle on the login screen — bypasses Firebase auth entirely

## Screens Overview
All quests and achievements UI lives inside **ProfileScreen** — there is no separate QuestsScreen or AchievementsScreen. There is no SettingsScreen.

## Scripts
| Script | What it does |
|--------|-------------|
| `npm run sync-cards` | Pulls all 200 cards from Firestore → regenerates `src/data/cards.ts` |
| `node scripts/assign-v2-types-stamina.js` | One-time v2 script — randomly assigns battle type and stamina to all 200 cards (run once, Sprint 1) |
| `node scripts/assign-v2-abilities.js` | One-time v2 script — randomly assigns a v2 ability per card within rarity tier (run once, Sprint 4a) |
| `node scripts/push-stamina-to-firestore.js` | Pushes stamina field from cards.ts to all 200 Firestore card documents |
| `node scripts/push-abilities-to-firestore.js` | Pushes ability field from cards.ts to all 200 Firestore card documents |

## Haptics
`expo-haptics` is used in `PackOpeningScreen` for card reveals. No audio — sound effects were not implemented.

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
- **@expo/vector-icons (MaterialCommunityIcons)** — type icons and stat pill icons on cards

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
    │   └── battleEngine.ts          ← Pure battle logic (HP, damage, stamina, type multipliers, Amp, all 50 abilities)
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
- Scale targets: collection 45%, detail 90%, battle active 85%, battle hand 40%, pack reveal 100%
- `useFont()` hook required for all text inside canvas — CSS font-family does not apply
- Emoji do not render in Skia canvas — use a separate RN `Text` overlay for emoji
- **RN overlay pattern**: Skia handles backgrounds, gradient washes, borders, image windows. RN `View`/`Text` overlays (with `pointerEvents="none"`) handle all icons, text, and colored badges — placing colored backgrounds in Skia causes them to be obscured by RN overlay Views
- `HeroCard` uses `MaterialCommunityIcons` RN overlays for type icon and stat pill icons
- `MiniCard` (pure RN, no Skia) used in collection grid + battle hand for performance

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
| `useGameState` | All in-memory game state (coins, XP, level, collection, avatars, quests, achievements, cooldowns, battleStats, battleWinStreak). Debounced Firestore save on change. |
| `useFirebase` | `loadGameData` + `saveGameData` + `loadCardRoster` — all Firestore reads/writes. |
| `useBattle` | Battle state machine, animation signals, round sequencing |

## God Mode
Toggle on the login screen — unlocks all 200 cards, all avatars, 99999 coins, max XP, all achievements. Skips Firestore save.
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
