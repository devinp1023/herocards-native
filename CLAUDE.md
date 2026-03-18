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
| 2 | HeroCard Skia — structure (canvas, layout, image window, stat bars) | ⏳ Next |
| 3 | HeroCard Skia — effects (rarity glow shader, shine, tilt on touch) | |
| 4 | Collection Screen — 2-col grid, filters, MissingCard, card detail nav | |
| 5 | Card Detail Screen | |
| 6 | Home + Profile — XP bar, credits, avatar, quests preview, bottom tabs | |
| 7 | Pack Opening — reveal animation, haptics, sounds, summary | |
| 8 | Store — avatar store, card store, daily offers | |
| 9 | Quests + Achievements | |
| 10 | Battle Lobby — deck builder (rarity limits: max 1 Leg / 2 Epic / 4 Rare / 10 Uncommon / 10 Common) | |
| 11 | Battle UI — core state machine port | |
| 12 | Battle UI — animations (Reanimated) | |
| 13 | Firebase Persistence — full Firestore save/load | |
| 14 | Ability Assignment + God Mode | |
| 15 | Polish + Edge Cases | |
| 16 | App Store Prep | |

## Architecture

### Tech Stack
- **Expo SDK 55** (blank TypeScript template)
- **React Native 0.83.2 / React 19**
- **React Navigation v6** (pinned — v7 API differs)
- **@shopify/react-native-skia** — card rendering (Session 2+)
- **Firebase Web SDK v12** — same package as web app, pure JS, works in standard Expo Go
- **@react-native-async-storage/async-storage** — local persistence
- **react-native-get-random-values** — Metro shim for Firebase crypto (MUST be first import in App.tsx)
- **expo-font + @expo-google-fonts/orbitron + @expo-google-fonts/rajdhani** — fonts

### File Structure
```
HeroCards/
├── App.tsx                        ← Entry point (shim first, font loading, nav, auth state)
├── PRDs/                          ← Tech spec + battle PRD
├── src/
│   ├── data/
│   │   ├── cards.ts               ← ALL_CARDS (200 cards, typed)
│   │   ├── constants.ts           ← RC, RO, XP_THRESHOLDS, TYPE_COLORS, BATTLE_RARITY_LIMITS, etc.
│   │   └── packs.ts               ← PACKS, LEVEL_AVATARS
│   ├── firebase/
│   │   └── config.ts              ← Firebase init (auth, db, storage)
│   ├── screens/                   ← One file per screen
│   │   └── AuthScreen.tsx         ← ✅ Done
│   ├── context/
│   │   └── FontContext.ts         ← Skia font context (implement in Session 2)
│   └── theme/
│       └── fonts.ts               ← Font family name constants
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

### Fonts
- Loaded in `App.tsx` via `useFonts()` for native Text components
- `@expo-google-fonts/orbitron` → `Orbitron_700Bold`, `Orbitron_900Black`
- `@expo-google-fonts/rajdhani` → `Rajdhani_600SemiBold`
- Skia `useFont()` in Session 2 will reference the same `.ttf` files via `require()`
- Font constants: `src/theme/fonts.ts` → `FONTS.orbitronBold`, `FONTS.orbitronBlack`, `FONTS.rajdhaniSemiBold`

## Card Data
- 200 cards in `src/data/cards.ts`
- Fields: `id, name, type, rarity, power, defense, speed, emoji, desc, pack, alliance, imageUrl?`
- 17 cards have `imageUrl` pointing to Firebase Storage (`card-images/card_XXX.png`)
- Rarity distribution: 5 Legendary, 10 Epic, 30 Rare, 55 Uncommon, 100 Common
- 2 packs: Pack 1 "Infinite Waves" 🌊, Pack 2 "Shrouded Mysteries" 🌑

## Card Rendering — Skia (Session 2+)
- Each card is a fixed **300×433px canvas**, scaled externally via container transform
- Never reflows — contents always at same coordinates relative to canvas
- Context scale targets: collection 45%, detail 90%, battle active 85%, battle hand 40%, pack reveal 100%
- `useFont()` hook required for all text inside canvas — CSS font-family does not apply
- Fonts loaded once at app root, passed via `FontContext` to avoid redundant loading
- Skia images: `useImage(url)` is async — always handle null/loading state
- Emoji do not render in Skia canvas — use a separate RN `Text` overlay for emoji

## Expo Go Workflow
Standard Expo Go throughout Sessions 1–15 — no custom dev build needed.
Firebase Web SDK (pure JS) + AsyncStorage (pure JS) = no native modules.
Custom dev build only needed at Session 16 for App Store submission.

```bash
npx expo start    # starts Metro, shows QR
# press i         # opens iOS Simulator (Mac only)
# scan QR         # opens in Expo Go on iPhone
```

## Navigation Structure (final — built incrementally)
```
Root Stack
├── AuthScreen          (when not logged in)
└── MainTabs (Bottom Tab Navigator)
    ├── Home Stack → HomeScreen, PackOpeningScreen
    ├── Collection Stack → CollectionScreen, CardDetailScreen
    ├── Battle Stack → BattleLobbyScreen, BattleScreen
    ├── StoreScreen
    └── Profile Stack → ProfileScreen, SettingsScreen
```
Session 1 has a placeholder MainScreen — real tabs added in Session 6.

## State Architecture (final — built incrementally)
| Hook | Owns |
|------|------|
| `useGameState` | In-memory game state (coins, collection, XP, level, avatars). Calls `useFirebase` to persist. Never imports Firebase directly. |
| `useFirebase` | All Firebase SDK calls — auth, Firestore, Storage. Single source of truth. |
| `usePackOpening` | Pack selection, card reveal sequence, duplicate detection |
| `useQuests` | Daily quest state, progress, completion |
| `useAchievements` | Earned achievements, tier progress, popup queue |
| `useBattle` | Battle state, engine calls, deck selection, cooldown tracking |
| `useStore` | Daily offers, purchases, avatar inventory |

## Battle System (Sessions 11–12 — port of working web logic)
See `PRDs/HeroCards_BattleSystem_PRD_v1.3.docx` for full rules.
Web implementation reference: `src/battle-engine.js` + `src/battle-ui.js` in web repo.

Key rules:
- 10-card decks, rarity limits: max 1 Legendary / 2 Epic / 4 Rare / 10 Uncommon / 10 Common
- HP = `100 + (defense × 0.5)`, Damage = `max(1, round(power × typeMultiplier − defense × 0.5))`
- Free-hit rule: attack vs non-attack → attacker gets a free unreciprocated hit; both non-attack → no combat
- AI proactively swaps when active HP < 35% and a better card exists in hand
- 5 combat types (Melee/Agility/Energy/Intelligence/Magic) mapped from 15 card subtypes
- Type advantage: ×1.5 | Type disadvantage: ×0.75 | Same type: ×0.75 | Neutral: ×1.0
- Animations: lunge + shake/flash, swap slide, draw bounce, defeat fall, hand→active replacement (all via Reanimated)

## Git
- Repo: https://github.com/devinp1023/herocards-native (main branch)
- Git user: Devin Patel / devinp1023@gmail.com
- Always confirm with user before pushing to GitHub

## Workflow Per Session
1. Read the relevant session row in the tech spec before writing any code
2. Build the session deliverables
3. TypeScript check: `npx tsc --noEmit`
4. Confirm app runs in Expo Go / iOS Simulator
5. Commit and push (with user's permission)
