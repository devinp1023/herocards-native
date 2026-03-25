# HeroCards — Visual Polish PRD

**Reference:** `STYLE_GUIDE.html` — the source of truth for all visual targets
**Goal:** Upgrade the app from functional dark UI to premium game-quality visuals as defined in the style guide. Covers materials, textures, color migration, ambient life, screen identity, micro-interactions, layered glows, elevation drama, motion presets, rarity tiers, and haptics.

---

## Design Intent

Before writing code, internalize the three emotional registers that drive every visual decision:

- **Neon Mint (#00FFAA)** = cool precision. The player's hand on the controls. Buttons, progress, navigation, active states.
- **Electric Violet (#B14EFF)** = raw power. The game surprising and rewarding the player. Legendary reveals, level ups, achievements, XP, abilities.
- **Forge Gold (#FFB800)** = earned worth. The player's collection, rank, and treasure. Currency, store, premium offers, rank badges.

The app is built on a **void-black stage** where every pixel of color is earned. Surfaces are **materials** (brushed metal, frosted glass, holographic foil, cracked obsidian) — not flat CSS divs. The UI is **never fully still** — even at rest, energy flows through borders, cards breathe, and particles drift. Every screen has its own **visual temperature**.

If you're unsure whether a visual choice is correct, ask: does this reinforce the emotional register it belongs to? Does the surface feel like a material? Is there ambient life?

---

## Architecture Constraints (read before touching anything)

- **Never import `ALL_CARDS` in screens** — always use `gs.cardRoster` from `useGameStateContext()`
- **`React.memo`** on all FlatList item components — ambient animations must not break memoization
- **`useCallback`** for all event handlers passed as props to memoized components
- **Reanimated shared values only** for ambient animations — never animate layout props (width, height, padding)
- **`useNativeDriver: true`** or Reanimated for all animation — no JS-thread animation
- **Skia Canvas already exists** on `HeroCard.tsx` and the custom tab bar — do not create duplicate canvases for the same element
- **Run `npx tsc --noEmit` after each step** — zero errors required
- **Run `npx expo start --clear` after adding new assets** to clear the Metro cache

---

## Engineering Risks & Warnings

Read these before starting any phase. Each has tripped up similar projects.

### Expo Go vs Custom Dev Client
The app currently runs in **Expo Go** (per CLAUDE.md). Two new dependencies require a custom dev client (EAS build):
- `@react-native-community/blur` (Frosted Glass material) — **will not work in Expo Go**
- `@react-native-masked-view/masked-view` — verify Expo Go compatibility before adopting; some versions require a custom build

**Decision needed before Phase 2:** Either migrate to EAS custom dev client first (which is already on the roadmap for App Store submission), or use Expo Go–compatible fallbacks:
- Frosted Glass fallback: opaque dark `View` at `rgba(10,11,16,0.85)` — functional but not blurred
- MaskedView fallback: Skia `<Text>` with `<LinearGradient>` shader for gradient text (already inside Canvas on HeroCard). For screen title shimmer, skip the mask and use a simple opacity-animated overlay gradient instead.

### Image Tiling on iOS — CONFIRMED BROKEN
`resizeMode="repeat"` on RN `<Image>` is **broken on iOS** — images do not tile. Using `resizeMode="cover"` with a large noise PNG looked blurry and bad. **We pivoted `MaterialSurface` to a pure RN gradient-based approach:** multi-stop `LinearGradient` + top-edge light catch (1px bright `View`) + inner glow (gradient fade from top). No image textures are used in `MaterialSurface`.

**Note:** Skia `<Image>` tiling (used in `HeroCard.tsx` for `assets/noise.png`) is **unaffected** — Skia's image tiling works correctly and remains in use. This issue only applies to RN `<Image>` components.

### Skia Canvas Nesting
**Never nest a Skia Canvas inside another Canvas.** The PRD correctly places particle edges and hue rotation inside HeroCard's existing Canvas.

**Rule:** `MaterialSurface` must use **pure RN layers only** (View, LinearGradient). All Skia usage is confined to existing Canvases: HeroCard, the custom tab bar, and the amp arcs in BattleScreen. This is already the case with the gradient-based `MaterialSurface` approach.

### BattleScreen Performance
BattleScreen is already the heaviest screen in the app:
- Skia Canvas for active cards + amp arc paths
- Reanimated gesture handler for drag-to-attack
- `setTimeout` chains for round sequencing (STEP_MS = 1000ms per step)
- Multiple animated card swap/lunge/shake animations

Adding on top of that: obsidian material (gradient layers, plus crack overlay Image TBD), glow trail on drag (4 ghost Views updating per gesture frame), damage haptics, and potential ambient effects — **stress test this screen specifically**. Run the Expo performance monitor and confirm >55fps during an active battle round with all new visual layers enabled.

**If BattleScreen drops frames:** Cut in this priority order:
1. Remove glow trail on drag (most expensive — updates every gesture frame)
2. Remove obsidian crack overlay Image if present (keep pure gradient approach)
3. Disable ambient vignette breathing on this screen only (battle is already visually intense)

### Legendary Hue Rotation Scope
The Skia `ColorMatrix` hue rotation filter applies to **everything inside its `<Group>`**. If the Group wraps too much, it will rotate the card image, text, and stats — not just the shimmer.

**Correct layer order inside HeroCard Canvas:**
```
<Canvas>
  {/* Card base layers (NOT inside hue group) */}
  <RoundedRect ... />        {/* background */}
  <Image ... />               {/* card image */}

  {/* Hue rotation group — ONLY wraps shimmer */}
  <Group layer={<Paint><ColorMatrix ... /></Paint>}>
    <Rect>                     {/* shimmer gradient sweep */}
      <LinearGradient ... />
    </Rect>
    <Image ... />              {/* foil noise grain */}
  </Group>

  {/* Card content layers (NOT inside hue group) */}
  {/* Text, stats, borders rendered by RN overlays, not Skia */}
</Canvas>
```

Test by setting the hue rotation to an extreme angle (180°) and confirming only the shimmer layer shifts color. The card image and stat sections should remain unchanged.

### MaskedView Performance
`MaskedView` is a **relatively expensive component** — it renders its children twice (once as mask, once as content) and composites on the GPU.

**Safe to use:**
- Screen titles (1 per screen, always visible, static text) — fine
- Legendary card name on reveal (momentary, single instance) — fine
- Button shimmer sweep (1–2 primary buttons per screen) — fine

**Never use for:**
- FlatList item components (repeated N times)
- MiniCard grid items
- Any element rendered >4 times on screen simultaneously

If you need gradient text inside a list, use Skia `<Text>` with `<LinearGradient>` shader instead — it's cheaper and contained within an existing Canvas.

### Texture Memory on Older Devices
`noise-512.png` and `brush-grain-128x4.png` are **no longer used** by `MaterialSurface` (due to the iOS tiling bug pivot to pure gradients). The memory concern from those assets is resolved.

`obsidian-cracks.png` (375×812) is **TBD** — pending BattleScreen testing in Sprint 2.3. If we add it back as a `resizeMode="cover"` overlay on the obsidian material at full-screen size, the original memory concern applies. **Mitigations if we use it:**
- Use `@2x` / `@3x` asset scaling variants instead of one fixed 375×812 image, so the system loads the appropriate resolution
- Alternatively, make the crack image smaller (e.g., 187×406) and use `resizeMode="cover"` — the cracks are subtle enough that upscaling won't be visible
- Unmount the crack overlay Image when BattleScreen is not focused (use `useIsFocused()`) to free the texture

### Reanimated Shared Value Count
Each ambient animation creates shared values that persist in memory while the screen is mounted. On a busy screen the count adds up:

| Animation | Shared values |
|-----------|--------------|
| Card breathing (12 visible MiniCards) | 12 (one scale each) |
| Glow pulse per button (2–3 buttons) | 3 (one opacity each) |
| Vignette breathing | 1 |
| Border energy flow | 1 |
| Ambient particles (3 particles × 4 values each) | 12 (translateX, translateY, opacity, scale) |
| Title shimmer | 1 |
| **Total** | **~30** |

Reanimated has no published limit on shared values, but the worklet thread processes all active animations each frame. 30 values is fine on modern devices. **Monitor if adding significantly more.** If a screen exceeds ~50 active shared values, audit which animations can share values or be combined.

### SuccessBurst Particle Cleanup
If `SuccessBurst.fire()` is called rapidly (e.g., staggered card reveals in pack opening fire every 200ms, or multiple quests complete at once), previous burst particles may still be animating when the next burst fires. Without cleanup, this can stack up to **40+ animated Views** from overlapping bursts.

**Required safeguards:**
- Hard-cap active particles to 20 at any time. If a new burst fires while particles are still animating, recycle the oldest particles (reset their position/opacity and reuse for the new burst)
- Use a **particle pool pattern**: pre-allocate 20 `Animated.View` particle instances on mount, toggle their visibility and reset their animations on each `fire()` call. This avoids creating/destroying Views dynamically.
- On `fire()`, cancel any in-progress animations on the recycled particles with `cancelAnimation()` before starting new ones

### ColorMatrix Scope — Legendary Only, HeroCard Only
The `ColorMatrix` hue rotation for Legendary holographic shimmer runs **every frame** for the full 6s rotation cycle. This is fine for a single HeroCard in card detail, pack reveal, or card preview modal.

**It must never run on:**
- `MiniCard` — MiniCard is pure RN (no Skia Canvas), so this doesn't apply structurally, but if someone tries to add a "mini shimmer" to MiniCard using Skia, do not add hue rotation
- Multiple simultaneous HeroCards — only one HeroCard should ever be rendered at full scale at a time (card detail or pack reveal). The collection grid uses MiniCard, and battle hand uses MiniCard. This is already the case in the current architecture.

### Energy Border Must Not Break Memoization
The animated energy flow border on `MaterialSurface` (the mint→violet gradient that pulses along the top edge) re-renders the gradient position each frame. If this animation is implemented as a prop change on the `MaterialSurface` View, it will **break `React.memo`** on any parent component, causing expensive re-renders of the panel's children.

**Required pattern:**
- The energy border must be a **separate absolute-positioned `Animated.View`** inside `MaterialSurface`, driven by its own `useAnimatedStyle`
- The animated value (gradient position) must be a Reanimated shared value, never React state
- The parent `MaterialSurface` View and its children must not re-render when the energy border animates
- Test by wrapping `MaterialSurface` children in a `console.log` render counter — it should not increment while the energy border is animating

```tsx
// Inside MaterialSurface — energy border is isolated
{energyBorder && (
  <Animated.View
    style={[styles.energyBorderLine, energyAnimatedStyle]}
    pointerEvents="none"
  />
)}
{/* children render independently of the animation above */}
{children}
```

---

## Phasing Strategy

This is a **5-phase rollout**, not a big bang. Each phase is independently shippable and testable.

| Phase | Focus | Screens Touched |
|-------|-------|-----------------|
| 1 | Foundation (tokens, motion presets, textures, colors) | All (via shared theme) |
| 2 | Materials, glows & elevation | All panels/surfaces |
| 3 | Screen identity & ambient life | Each screen individually |
| 4 | Micro-interactions & rarity tiers | Buttons, numbers, tabs, cards |
| 5 | Wow moment choreography & haptics | Pack opening, battle, level up |

**Do not skip phases.** Phase 2 depends on Phase 1 assets. Phase 3 depends on Phase 2 components.

---

## Sprint Breakdown

Each sprint is a focused, shippable unit of work. Commit after each sprint. Run `npx tsc --noEmit` and `npx expo start --clear` to verify.

> **Before every sprint:** Re-read the **Engineering Risks & Warnings** section above. Identify which warnings are relevant to the sprint and flag them as you work. If a warning applies, follow the mitigation strategy before moving on.

### Phase 1 — Foundation

**Sprint 1.1 — Theme tokens + motion presets** ✅ COMPLETE
- Create `src/theme/theme.ts` with `T` tokens
- Add `TIMING`, `MOTION`, `SPRING`, `EASE` presets
- Add `TEXT_FX` helpers
- Add `glowShadow()` and `skiaGlowLayers()` helpers
- Add `caution` to `T.glow`
- Re-export `FONTS` from the existing `fonts.ts`
- **Verify:** `npx tsc --noEmit` passes. Import `T` from a test screen and confirm values resolve.
- **Warnings to check:** None — this is pure code, no rendering.

**Sprint 1.2 — Texture assets** ✅ COMPLETE (partially obsolete)
- Created `assets/textures/` directory
- Generated `noise-512.png` and `brush-grain-128x4.png` — **dead assets** due to iOS `resizeMode="repeat"` bug. MaterialSurface uses pure gradients instead.
- `obsidian-cracks.png` — **TBD**, pending testing on BattleScreen in Sprint 2.3
- The existing `assets/noise.png` (256×256) is still used by `HeroCard.tsx`'s Skia Canvas — that is a separate system and works correctly.
- **Warnings to check:** Texture Memory — confirm obsidian-cracks asset sizing strategy if we proceed with it.

**Sprint 1.3 — Color migration** ✅ COMPLETE
- Find-and-replace status colors: `#ef5350` → `#FF4757`, `#4caf50` → `#2ED573`, `#ff9800` → `#FFBE0B`
- Do NOT touch domain colors (type, rarity, achievement) — those stay in `constants.ts`
- **Note:** Background/text/accent migration to `T.*` references was deferred — screens still use hardcoded hex values for backgrounds. These will naturally migrate as `ScreenBackground` (Sprint 3.1) and `MaterialSurface` replace raw background colors.
- **Verify:** `npx tsc --noEmit` passes. Visual spot-check every screen — colors should look identical or slightly more vivid (status colors).
- **Warnings to check:** None — mechanical replacement only.

---

### Phase 2 — Materials, Glows & Elevation

**Sprint 2.1 — MaterialSurface component** ✅ COMPLETE
- Created `src/components/MaterialSurface.tsx`
- `brushedMetal` material: 4-stop LinearGradient + top-edge light catch (1px View) + inner glow (40px gradient). No image textures.
- `obsidian` material: warm 4-stop LinearGradient + red-tinted top edge + red inner glow (50px). No image textures.
- `frostedGlass` material: 2-stop semi-transparent LinearGradient + top-edge highlight + inner glow (30px). Pure gradient fallback (no blur dependency).
- **Pivot:** Originally used tiled noise PNGs via `resizeMode="repeat"` — iOS tiling is broken. Rebuilt with pure RN gradients + edge highlights. Zero images, GPU-native.
- **Warnings resolved:** Expo Go compatibility confirmed (no blur dependency). Skia Canvas Nesting avoided (pure RN).

**Sprint 2.2 — Retrofit Home, Collection, Store** ✅ COMPLETE
- HomeScreen: profile card, quest cards, pack stat cards wrapped in `<MaterialSurface>`
- CollectionScreen: filter sidebar — custom left-edge light catch + leftward inner glow (full-height panel, not suited for standard MaterialSurface top-edge treatment)
- StoreScreen: credits chip, featured deal card, card offer panels, avatar grid cards wrapped
- **Verify:** All three screens render correctly, no visual regressions, no Canvas nesting issues.
- **Warnings resolved:** No Skia Canvas nesting — CollectionScreen uses MiniCards (pure RN). StoreScreen also safe.

**Sprint 2.3 — Retrofit Career, Profile, Battle, Auth, PackOpening, BattleLobby** ✅ COMPLETE
- CareerScreen: reward row panel in bottom sheet wrapped
- ProfileScreen: stat boxes (6), profile header, collection cards wrapped
- BattleScreen: card preview modal (`frostedGlass`), AI hand zone, player hand zone, result rewards box, header bar (`brushedMetal`)
- BattleLobbyScreen: deck summary panel, opponent tier cards wrapped
- PackOpeningScreen: balance row, pack cards, odds box, totals box wrapped
- AuthScreen: login form card wrapped
- **Note:** Obsidian cracks overlay was not tested — BattleScreen uses `brushedMetal` for zones/header, `frostedGlass` for preview modal. Full obsidian screen background deferred to Sprint 3.1 (ScreenBackground).
- **Verify:** All screens render correctly. BattleScreen confirmed — no Skia canvas conflicts.
- **Warnings resolved:** BattleScreen performance stable. No Canvas nesting issues.

**Sprint 2.4 — GradientBorder component + elevation system** ✅ COMPLETE
- Created `src/components/GradientBorder.tsx` with `BORDER_COLORS` presets (mint, violet, gold, danger, legendary)
- Created `src/theme/elevation.ts` with `ELEVATION` states (resting/hovered/lifted/heroic) and `useElevation()` hook
- Applied gradient border + violet glow to achievement toast (`AchievementPopup`)
- **Remaining:** Broad GradientBorder and elevation application deferred to Sprint 2.4b (high-impact spots) and Sprints 3.3/4.2 (full rollout).
- **Verify:** Earn an achievement — toast has violet gradient border + violet glow.
- **Warnings to check:** Energy Border Memoization — when applying elevation to FlatList items in future sprints, confirm animations don't break `React.memo`.

**Sprint 2.4b — Token migration + targeted GradientBorder/elevation** ✅ COMPLETE
- Color token migration: ~104 replacements across 12 screens — hardcoded backgrounds → `T.bg.*`, borders → `T.bg.border`, text colors → `T.text.*`
- GradientBorder on TextInputs: AuthScreen (3 inputs), CollectionScreen search, BattleLobbyScreen search — mint gradient on focus
- GradientBorder on CTA buttons: HomeScreen battle (mint) + pack (violet), AuthScreen submit (mint), StoreScreen buy/equip (gold)
- useElevation on: HomeScreen quest cards + profile card, StoreScreen featured deal card
- **Note:** Broad button/MiniCard application deferred to Sprints 3.3 and 4.2.

**Sprint 2.5 — Progress bar treatments** ✅ COMPLETE
- XP bar: violet gradient fill (`#B14EFF → #cc6dff`) + violet glow
- Quest bars: mint fill + mint glow (green when complete)
- HP bars (HeroCard + MiniCard): `T.status.vitality`/`caution`/`danger` with matched glow
- Pack progress bars (Home + Profile): pack-color glow added
- Achievement progress bar (Career): category-color glow added
- Collection progress bar (Profile): mint fill + mint glow

**Sprint 2.6 — Cyan-to-mint accent migration** ✅ COMPLETE
- Replaced 117 occurrences of `#4fc3f7` with `T.accent.mint` across 18 files
- Data files (quests.ts, achievements.ts) updated to `#00FFAA` literals
- Pack domain colors (Infinite Waves, Sea Sovereign, Storm Rider) kept as cyan — identity colors
- Stamina pips/text kept as cyan — stamina has its own visual identity

---

### Phase 3 — Screen Identity & Ambient Life

**Sprint 3.1 — ScreenBackground component** ✅ COMPLETE
- Created `src/components/ScreenBackground.tsx` with 7 themes (home, career, battle, collection, store, profile, neutral)
- Each theme has unique base gradient + colored vignette with breathing animation (5s cycle)
- Per-theme vignette alpha tuned for perceptual brightness matching (mint=30, violet=44, red=40, gold=50, white=20)
- Vignette pauses when screen is not focused (`useIsFocused()`)
- All 10 screens wrapped. Removed opaque backgrounds from StoreScreen topBar and BattleLobbyScreen header so vignette shows through.
- BattleLobby footer uses `rgba(8,5,10,0.92)` to hide scroll content while allowing vignette bleed.
- CLAUDE.md updated: never hardcode hex colors, always use `T.*` tokens.

**Sprint 3.1b — Text visibility cleanup** ✅ COMPLETE
- **Problem:** 50+ hardcoded dark gray colors (`#506070`, `#404458`, `#404060`, `#303050`, `#505068`, `#8090a0`) remain across all screens — these create a fourth unofficial text tier darker than `T.text.muted` (#6e7191). Combined with deepened screen gradients, these elements are nearly invisible.
- **Additionally:** 17 elements at fontSize 7 combined with dark colors are at the edge of legibility (CareerScreen badge labels, BattleLobbyScreen limit text, various card labels).
- **Migration rules:**
  - Section headers/labels currently `#506070` → `T.text.muted` (promote to visible)
  - Subtitles/descriptions currently `#404458`/`#404060` → `T.text.muted` (promote to visible)
  - Placeholder/disabled text currently `#303050` → leave as intentionally dim OR use `T.text.muted` with reduced opacity
  - Font sizes at 7px → bump to minimum 8px where space allows
  - Domain-specific disabled states (unaffordable prices, locked avatars) → keep dim but ensure minimum contrast
- **Verify:** All text across the app is legible. Section headers no longer disappear into the background. No fontSize below 8px except where space is genuinely constrained (deck slot labels, card pip labels in battle).
- **Warnings to check:** None — style-only changes.

**Sprint 3.2 — Ambient particles** ✅ COMPLETE
- Create `src/components/AmbientParticles.tsx`
- Implement particle pool pattern: pre-allocate Views, randomize position/size/opacity/speed
- Add to HomeScreen (mint particles behind battle button area) and StoreScreen (gold particles near featured offers)
- Implement `useIsFocused()` pause — particles stop animating when screen is not visible
- **Verify:** Particles drift smoothly upward, staggered, 2–4 visible. Navigate away and back — particles resume correctly, no stacking.
- **Warnings to check:** Reanimated Shared Value Count (~12 new values per screen with particles). SuccessBurst Particle Cleanup — same pool pattern applies here, validate the approach.

**Sprint 3.3 — Ambient animations on existing elements** ✅ COMPLETE
- Wire up `energyBorder` animation in `MaterialSurface` (4s linear loop, mint→violet gradient along top edge)
- Enable on primary panels only: quest panel (Home), featured offer (Store), skill tree container (Career)
- Add card breathing to `MiniCard.tsx`: scale pulse `1.0→1.005→1.0`, `MOTION.float` timing, viewport-aware via `onViewableItemsChanged`
- Add glow pulse to primary action buttons (outer shadow opacity 0.3→0.6, 2s cycle)
- Add glow pulse to active progress bar fills (shadow radius ±2px, 2s cycle)
- **Verify:** Collection grid cards breathe subtly. Scroll quickly — cards leaving viewport stop animating. Energy border flows on Home quest panel. Buttons pulse.
- **Warnings to check:** Energy Border Memoization — confirm isolated Animated.View pattern, run render counter test. Reanimated Shared Value Count — card breathing adds ~12 values on collection screen.

**Sprint 3.4 — Screen title shimmer** ✅ COMPLETE
- Add diagonal shimmer sweep to screen titles on Home, Collection, Store, Career
- Implement with `MaskedView` (if Expo Go compatible) or Reanimated opacity-animated gradient overlay as fallback
- 45° angle, 6s cycle, 0.05 opacity, focused-only
- **Verify:** Watch a screen title for 6s — a faint light sweep should cross the text. Switch screens — shimmer only runs on focused screen.
- **Warnings to check:** Expo Go vs Custom Dev Client (MaskedView compatibility). MaskedView Performance — one per screen is fine.

**Sprint 3.5 — Font size tokenization** ✅ COMPLETE
- **Problem:** Font sizes are hardcoded across 100+ declarations with no system — fontSize 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 26 etc. appear ad-hoc. Same problem we had with colors before tokenization: values drift, inconsistencies emerge, and there's no single place to tune the type scale.
- **Step 1:** Audit all `fontSize` values across `/src/screens/` and `/src/components/`. Group into a named scale (e.g., `T.font.xs`, `T.font.sm`, `T.font.md`, `T.font.lg`, `T.font.xl`, `T.font.xxl`, `T.font.display`).
- **Step 2:** Add `T.font` to `src/theme/theme.ts` with the named scale. Each size maps to a specific px value.
- **Step 3:** Replace all hardcoded `fontSize: N` with `fontSize: T.font.*` across all screens and components.
- **Exception:** Skia `<Text>` elements use `fontSize` as a number prop — these can reference `T.font.*` since it resolves to a number.
- **Verify:** `npx tsc --noEmit` passes. Visual spot-check every screen — text sizes should be identical (this is a mechanical replacement, not a redesign).
- **Warnings to check:** None — mechanical replacement only. No visual changes expected.

> **IMPORTANT — Tokenization process for all remaining sprints (3.6–3.9):**
> 1. **Read the style guide first.** Check `STYLE_GUIDE.html` for the canonical values, names, and use cases for the property being tokenized.
> 2. **Define tokens in `T` that match the style guide exactly.** Don't invent values from what's currently in the codebase — the style guide is the source of truth.
> 3. **Then apply tokens to the app.** Map existing hardcoded values to the closest style guide token. If a value doesn't match any token, either add a token (if the style guide supports it) or adjust the value to the nearest token.
> Sprint 3.5 was initially done backwards (audit codebase → create tokens → apply) which produced a scale that didn't match the style guide. This was caught and corrected. Don't repeat this mistake.

**Sprint 3.6 — Skia canvas color audit** ✅ COMPLETE
- Skia elements (`<Path>`, `<Text>`, `<Fill>`, `<Rect>`, `<LinearGradient>`, etc.) use raw string colors — they can't reference `T.*` tokens directly.
- Audit all Skia color values in: `App.tsx` (tab bar), `HeroCard.tsx`, `MiniCard.tsx`, `FaceDownCard.tsx`, `BranchConnector.tsx`, `AchievementNode.tsx`, and any Skia elements in screen files (BattleScreen amp arcs, etc.)
- For each hardcoded Skia color, verify it matches the style guide's intended value. Replace outdated hex values (old cyan, old status colors, old backgrounds) with the correct style guide hex equivalents.
- Since Skia can't use `T.*` at runtime, add a comment next to each Skia color referencing the token it corresponds to (e.g., `color="#00FFAA" /* T.accent.mint */`).
- Consolidate stat pill colors if HeroCard and CardDetailScreen use different values for ATK/DEF/SPD — pick the canonical set and use it everywhere.
- **Verify:** Tab bar colors match mint system. Card shimmer/glow colors align with style guide. Amp arcs use correct accent colors. No leftover cyan in Skia elements (except stamina).
- **Warnings to check:** None — string color replacements only, no structural changes.

**Sprint 3.7 — Font weight + line height + letter spacing tokens** ✅ COMPLETE
- **Problem:** `fontWeight` is hardcoded as `'700'`, `'600'`, `'900'` etc. across screens. `lineHeight` and `letterSpacing` are mostly absent or inconsistent. These three properties combine with font size to define the full type system.
- **Step 1:** Add to `src/theme/theme.ts`:
  ```
  T.weight: { regular: '400', semibold: '600', bold: '700', black: '900' }
  T.lineHeight: { tight: 1.1, normal: 1.3, relaxed: 1.5 } (multipliers, applied as fontSize × multiplier)
  T.letterSpacing: { tight: -0.5, normal: 0, wide: 1, allCaps: 2 }
  ```
- **Step 2:** Replace all hardcoded `fontWeight`, `lineHeight`, and `letterSpacing` with `T.*` tokens.
- **Exception:** Skia text doesn't use RN style props — skip Skia elements.
- **Verify:** `npx tsc --noEmit` passes. No visual changes — mechanical replacement.
- **Warnings to check:** None.

**Sprint 3.8 — Button tokens** ✅ COMPLETE
- **Problem:** Buttons across the app have inconsistent heights, padding, border radii, text sizes, and disabled states. The style guide defines 4 button variants but the app doesn't follow them.
- **Step 1:** Audit all buttons across screens. Map each to one of the 4 style guide variants.
- **Step 2:** Add `T.button` to `src/theme/theme.ts` matching the style guide exactly:
  ```
  T.button: {
    primary: {
      // Mint gradient fill, dark text, skewed, shimmer sweep, 4-layer glow
      bg: ['#00FFCC', '#00FFAA', '#00DD88'],  // 3-stop vertical gradient
      text: T.bg.root,                         // dark text on bright bg
      fontFamily: FONTS.orbitronBlack,
      fontSize: 14,
      letterSpacing: 2,
      paddingV: 14, paddingH: 32,
      radius: 12,
      skew: -3,
      pressScale: 0.96,
    },
    secondary: {
      // Transparent bg, mint text, gradient mint border, skewed
      bg: 'transparent',
      text: T.accent.mint,
      borderGradient: [T.accent.mint + '66', T.accent.mint + '22'],  // 135° gradient
      fontFamily: FONTS.orbitronBold,
      fontSize: 12,
      letterSpacing: 1.5,
      paddingV: 10, paddingH: 24,
      radius: 12,
      skew: -3,
      pressScale: 0.97,
    },
    destructive: {
      // Transparent bg, danger text, gradient danger border, skewed
      bg: 'transparent',
      text: T.status.danger,
      borderGradient: [T.status.danger + '66', T.status.danger + '22'],  // 135° gradient
      fontFamily: FONTS.orbitronBold,
      fontSize: 12,
      letterSpacing: 1.5,
      paddingV: 10, paddingH: 24,
      radius: 12,
      skew: -3,
      pressScale: 0.97,
    },
    disabled: {
      // Same shape as primary but 0.3 opacity, no glow, no shimmer
      opacity: 0.3,
    },
  }
  ```
- **Step 3:** Replace all hardcoded button styles with `T.button.*` tokens across all screens. Every button should reference a variant.
- **Step 4:** Standardize disabled states — any variant + `T.button.disabled.opacity` applied.
- **Exception:** Battle action buttons (REST/ATTACK) have unique skewed designs with LinearGradient — keep custom styles but reference tokens where possible.
- **Verify:** `npx tsc --noEmit` passes. All buttons match their style guide variant. Disabled buttons are consistently dimmed at 0.3 opacity.
- **Warnings to check:** The skew transform (`skewX(-3deg)`) with counter-skew on text (`skewX(3deg)`) is a key style guide detail — don't lose it during migration.

**Sprint 3.9 — Stamina cyan token + remaining one-offs**
- **Problem:** Stamina cyan (`#4fc3f7`) is hardcoded in HeroCard, MiniCard, and BattleScreen. Other one-offs: `#ffa726` (win streak), `#ff6b00` (god mode), `#ffc04a` (legendary lock text).
- **Step 1:** Add `T.domain.stamina: '#4fc3f7'` to `src/theme/theme.ts`.
- **Step 2:** Replace all `'#4fc3f7'` references in components/screens with `T.domain.stamina`.
- **Step 3:** Evaluate remaining one-offs. Either add as domain tokens (`T.domain.winStreak`, `T.domain.godMode`) or map to existing tokens if close enough.
- **Verify:** `npx tsc --noEmit` passes. Stamina pips still cyan.
- **Warnings to check:** Skia elements use string colors — Skia can reference `T.domain.stamina` since it resolves to a string at runtime.

---

### Phase 4 — Micro-Interactions & Rarity Tiers

**Sprint 4.1 — AnimatedNumber + SuccessBurst components**
- Create `src/components/AnimatedNumber.tsx` — tick-up with glow flash and optional haptic
- Create `src/components/SuccessBurst.tsx` — particle pool, imperative fire via ref, 20-particle hard cap
- Replace static coin display on Home/Store with `<AnimatedNumber>` (gold glow)
- Replace static XP display on Home/Profile with `<AnimatedNumber>` (violet glow)
- **Verify:** Buy something in Store — coin count ticks down with gold glow. Earn XP — XP ticks up with violet glow. Numbers don't jump.
- **Warnings to check:** SuccessBurst Particle Cleanup — implement pool pattern with `cancelAnimation()` on recycle from day one.

**Sprint 4.2 — Press ripple + button shimmer**
- Create `useRipple()` hook — returns ripple View, onPressIn handler, press animated style
- Apply to all buttons (primary, secondary, destructive), tappable MiniCards, quest list items
- Add button shimmer sweep to primary action buttons — diagonal gradient, 3s cycle, pauses on press
- **Verify:** Tap any button — see ripple from touch point + scale(0.96). Primary buttons shimmer when idle. Tap — shimmer pauses, ripple fires, scale bounces.
- **Warnings to check:** MaskedView Performance — if using MaskedView for button shimmer, limit to 2–3 buttons per screen. Energy Border Memoization — ripple hook must not break parent memo.

**Sprint 4.3 — Tab energy trail + glow trail on drag**
- Add tab switch energy trail to custom Skia tab bar in `App.tsx` — 2px mint line, `MOTION.snap` easing
- Add glow trail to battle drag-to-attack gesture — 4 ghost Views, type-color tinted, circular position buffer
- **Verify:** Switch tabs — see a brief mint line stretch between old and new tab. Start a battle, drag a card to attack — see colored ghost trail behind the card.
- **Warnings to check:** BattleScreen Performance — glow trail updates every gesture frame. If frames drop, this is the first cut. ColorMatrix Scope — trail uses type color, not hue rotation (safe).

**Sprint 4.4 — Rarity tier upgrades (Uncommon + Rare)**
- Upgrade HeroCard shimmer for Uncommon: single sweep, 2s, 1-layer glow
- Upgrade HeroCard shimmer for Rare: dual sweep (90° offset), 1.5s, foil noise grain, 2-layer glow, blue-tinted gradient border
- **Verify:** Open card detail for an Uncommon card — subtle shimmer. Open Rare — more active dual shimmer with foil grain. Common cards remain static.
- **Warnings to check:** None — these are contained within the existing HeroCard Skia Canvas.

**Sprint 4.5 — Rarity tier upgrades (Epic + Legendary)**
- Upgrade HeroCard shimmer for Epic: continuous shimmer (1.2s), **particle edges** (8–12 dots orbiting card border), 3-layer glow
- Upgrade HeroCard shimmer for Legendary: **holographic hue rotation** (ColorMatrix, 360° over 6s), **living gradient border** (gold↔violet animated), particle edges (12–16, brighter), 4-layer glow
- **Verify:** Open card detail for Epic — particles orbit the border. Open Legendary — shimmer shifts through holographic colors, border pulses gold↔violet. Confirm card image/text are NOT affected by hue rotation.
- **Warnings to check:** Legendary Hue Rotation Scope — test at 180° rotation to confirm only shimmer layer rotates. ColorMatrix Scope — never on MiniCard, only full HeroCard.

---

### Phase 5 — Wow Moment Choreography & Haptics

**Sprint 5.1 — Haptic pairing across existing moments**
- Wire haptic calls to all existing moments per the haptic pairing map
- Pack crack: Medium impact. Card reveals: Light impact (staggered). Victory: notification Success. Achievement earned: Light impact. Achievement collected: Medium impact. Damage dealt: Medium impact. Heavy attack: Heavy impact.
- **Verify:** Play through a battle — feel haptics on attacks and victory. Open a pack — feel crack and card reveals. Earn an achievement — feel toast haptic.
- **Warnings to check:** None — haptics are fire-and-forget, no performance concerns.

**Sprint 5.2 — Pack opening choreography**
- Upgrade PackOpeningScreen with full sequence: dim → glow buildup (800ms) → crack + impact → staggered card reveals (200ms apart) using `MOTION.slam`
- Integrate `<SuccessBurst>` on each card reveal
- **Verify:** Open a pack — screen dims, pack glows with rarity color, cracks open, cards fly in with overshoot + particles. Feels like an event, not a list appearing.
- **Warnings to check:** SuccessBurst Particle Cleanup — staggered 200ms reveals will fire bursts in quick succession. Confirm particle pool recycles correctly.

**Sprint 5.3 — Legendary pull choreography**
- Implement the full legendary pull sequence within pack opening: blackout → violet explosion → 360° card spin → particle shower (20+ particles) → gradient text card name → haptic sequence
- This is the single most important visual moment in the app — take time to get the timing right
- **Verify:** Force a legendary pull (God Mode or rigged pack). The reveal should feel unmistakably different from every other card. Screen shake, violet wash, holographic spin, gold+violet particle shower, gradient text name.
- **Warnings to check:** SuccessBurst Particle Cleanup — 20+ particles in one burst, confirm pool handles it. Texture Memory — momentary spike with full-screen violet gradient + card textures + particles.

**Sprint 5.4 — Victory + level up choreography**
- Upgrade BattleScreen victory sequence: side split → VICTORY slam + impact + embossed text → stat cascade with `<AnimatedNumber>` (staggered 150ms, `MOTION.burst`) → reward tally with gold/violet glow
- Upgrade level-up moment: violet burst → gradient text level number + slam (overshoot 1.3x) → XP bar shatter (`<SuccessBurst>`) → reward cascade with `<AnimatedNumber>`
- **Verify:** Win a battle — victory sequence is choreographed and dramatic, not just a results screen appearing. Level up — number slams in, bar shatters, rewards cascade.
- **Warnings to check:** BattleScreen Performance — victory sequence adds multiple simultaneous animations on an already heavy screen. Confirm >55fps during the cascade. Reanimated Shared Value Count — multiple AnimatedNumbers rendering simultaneously during stat cascade.

**Sprint 5.5 — Achievement earned choreography + final polish**
- Upgrade AchievementPopup with full sequence: slam slide-in → gradient violet border + 3-layer glow → icon burst → particle pop → haptic
- Final polish pass across all screens: spot-check every material, glow, ambient animation, and micro-interaction
- Fix any visual inconsistencies found during the full walkthrough
- **Verify:** Earn an achievement — toast feels impactful with burst and glow. Full app walkthrough: every screen has its identity, every surface is a material, every interaction has feedback.
- **Warnings to check:** All warnings — do a final audit. Confirm BattleScreen >55fps, particle pools are clean, no Canvas nesting, no memoization breaks. Phase 5 depends on Phase 4 components.

---

## Phase 1 — Foundation

### 1a. Create the tokens file

Create `src/theme/theme.ts` as the single source of truth for all UI tokens. This is step 1 before any visual work.

```ts
// src/theme/theme.ts
import { Easing } from 'react-native-reanimated';

export const T = {
  // Backgrounds
  bg: {
    root: '#050508',
    surface: '#0a0b10',
    elevated: '#111218',
    border: '#1e2030',
  },
  // Gradients (use with LinearGradient colors prop)
  grad: {
    root: ['#050508', '#07070c'],
    surface: ['#0c0d14', '#0a0b10'],
    elevated: ['#131420', '#111218'],
    obsidian: ['#08060a', '#0d0810'],
  },
  // Text
  text: {
    primary: '#ffffff',
    body: '#c8cad0',
    muted: '#6e7191',
  },
  // Three accent system
  accent: {
    mint: '#00FFAA',
    mintMuted: '#00FFAA44',
    mintFaint: '#00FFAA11',
    violet: '#B14EFF',
    violetMuted: '#B14EFF44',
    violetFaint: '#B14EFF11',
    gold: '#FFB800',
    goldMuted: '#FFB80044',
    goldFaint: '#FFB80011',
  },
  // Status colors (replacing old Material defaults)
  status: {
    danger: '#FF4757',    // was #ef5350
    vitality: '#2ED573',  // was #4caf50
    caution: '#FFBE0B',   // was #ff9800
  },
  // Spacing (base unit 4px)
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32,
  },
  // Radii
  radius: {
    sm: 6, md: 10, lg: 14, xl: 20,
  },
  // Glow presets — 3-layer system (core + halo + bloom)
  // For max-drama moments, add a 4th layer: wash (0 0 80px {color}11)
  glow: {
    mint:   { core: '#00FFAAaa', halo: '#00FFAA66', bloom: '#00FFAA22', wash: '#00FFAA11' },
    violet: { core: '#B14EFFaa', halo: '#B14EFF66', bloom: '#B14EFF22', wash: '#B14EFF11' },
    gold:   { core: '#FFB800aa', halo: '#FFB80066', bloom: '#FFB80022', wash: '#FFB80011' },
    danger: { core: '#FF4757aa', halo: '#FF475766', bloom: '#FF475722', wash: '#FF475711' },
    vital:  { core: '#2ED573aa', halo: '#2ED57366', bloom: '#2ED57322', wash: '#2ED57311' },
  },
} as const;

// Re-export FONTS from existing location for convenience
export { FONTS } from './fonts';
```

### 1b. Create motion presets

Add to `src/theme/theme.ts` — these are the 6 named motion personalities from the style guide. Every animation in the app should use one of these presets so motion feels consistent.

```ts
// Motion timing tiers
export const TIMING = {
  quick:    250,   // 220–300ms — toggles, micro-interactions, button press
  standard: 400,   // 380–500ms — fade, scale, modal open/close
  long:    1000,   // 800–1200ms — pulse cycles, shimmer sweeps
  slow:    2000,   // 1400–3000ms — rarity shimmer, ambient breathing
} as const;

// Motion personalities — use these for all animations
export const MOTION = {
  // Fast overshoot (1.15x) then settle — UI entering, panels, battle results
  slam: {
    duration: TIMING.standard,
    easing: Easing.out(Easing.cubic),
    overshoot: 1.15, // scale to 1.15 then settle to 1.0
  },
  // Instant lock, no ease-out — cards into hand, grid layouts, tab switches
  snap: {
    duration: TIMING.quick,
    easing: Easing.out(Easing.cubic), // very fast decel, no bounce
  },
  // Screen shake (2–4px, 150ms) + white flash (50ms) — damage, destruction
  impact: {
    shakePx: 3,
    shakeDuration: 150,
    flashDuration: 50,
    flashColor: 'rgba(255,255,255,0.3)',
  },
  // Gentle ease-in-out, continuous — idle bob, node pulse, ambient
  float: {
    duration: TIMING.slow,
    easing: Easing.inOut(Easing.ease),
  },
  // Rapid scale 0 → 1.2 → 1.0 (200ms) — number popups, rewards, badges
  burst: {
    duration: 200,
    overshoot: 1.2,
    easing: Easing.out(Easing.cubic),
  },
  // Slow build 0 → 0.9 (hold) → 1.3 snap (release) — long-press, amp fill
  charge: {
    buildDuration: TIMING.long,
    holdScale: 0.9,
    releaseScale: 1.3,
    releaseDuration: TIMING.quick,
    easing: Easing.inOut(Easing.ease),
  },
} as const;

// Common spring configs (for Reanimated withSpring)
export const SPRING = {
  snappy:  { damping: 16, stiffness: 220 },  // buttons, toggles
  bouncy:  { damping: 8,  stiffness: 120 },  // rewards, popups
  gentle:  { damping: 20, stiffness: 80 },   // ambient, elevation

} as const;

// Easing shorthands
export const EASE = {
  enter: Easing.out(Easing.cubic),     // slam, burst — enters fast, decels
  exit:  Easing.in(Easing.quad),       // exits — slow start, fast end
  inOut: Easing.inOut(Easing.ease),    // general transitions
} as const;
```

**Usage example:**
```ts
// Slam a panel in
translateY.value = withTiming(0, {
  duration: MOTION.slam.duration,
  easing: MOTION.slam.easing,
});

// Burst a number popup
scale.value = withSequence(
  withTiming(MOTION.burst.overshoot, { duration: MOTION.burst.duration * 0.6 }),
  withTiming(1.0, { duration: MOTION.burst.duration * 0.4 }),
);

// Impact screen shake
translateX.value = withSequence(
  withTiming(MOTION.impact.shakePx, { duration: 30 }),
  withTiming(-MOTION.impact.shakePx, { duration: 30 }),
  withTiming(MOTION.impact.shakePx * 0.5, { duration: 30 }),
  withTiming(0, { duration: 60 }),
);
```

### 1c. Create texture assets

Create `assets/textures/` with 3 PNGs:

| File | Size | Status | How to generate |
|------|------|--------|----------------|
| `noise-512.png` | 512×512 | **Unused** — dead asset (iOS tiling broken) | Photoshop: solid gray → Filter → Noise → Add Noise (Gaussian, 40%, mono). Export as grayscale PNG. |
| `brush-grain-128x4.png` | 128×4 | **Unused** — dead asset (iOS tiling broken) | 1px white lines at 3% opacity on transparent, spaced 2–3px apart. Horizontal orientation. |
| `obsidian-cracks.png` | 375×812 | **TBD** — pending BattleScreen test in Sprint 2.3 | Jagged branching crack paths in #FF4757 at 15% opacity, 1–2px stroke on transparent. Design 3–5 main cracks with smaller branches. |

**Note:** `noise-512.png` and `brush-grain-128x4.png` were generated but are not used by `MaterialSurface` because RN `<Image resizeMode="repeat">` is broken on iOS. They remain in `assets/textures/` as dead assets. `obsidian-cracks.png` may be used as a `resizeMode="cover"` overlay on the BattleScreen obsidian material — pending visual quality testing. The existing `assets/noise.png` (256×256) used by HeroCard's Skia Canvas is unrelated and works correctly.

### 1d. Migrate status colors

Global find-and-replace across all screens and components:

| Old | New | Token |
|-----|-----|-------|
| `#ef5350` | `#FF4757` | `T.status.danger` |
| `#4caf50` | `#2ED573` | `T.status.vitality` |
| `#ff9800` | `#FFBE0B` | `T.status.caution` |

**Note on Gold vs Legendary:** `#FFB800` (T.accent.gold) is the new UI accent for currency/value contexts. `#ffc04a` remains the **rarity color** for Legendary cards (defined in `constants.ts` RARITY_META). They coexist — gold accent is for UI elements like coin displays, store prices, and premium badges. Legendary rarity color stays on card borders, shimmer, and rarity labels.

### 1e. Migrate hardcoded colors to tokens

Replace hardcoded hex values across all screens with `T.*` references. This is a mechanical find-and-replace — no visual changes, just centralizing values.

Priority targets:
- `#050508` → `T.bg.root`
- `#0a0b10` → `T.bg.surface`
- `#111218` → `T.bg.elevated`
- `#1e2030` → `T.bg.border`
- `#ffffff` → `T.text.primary`
- `#c8cad0` → `T.text.body`
- `#6e7191` → `T.text.muted`
- `#00FFAA` → `T.accent.mint`
- `#B14EFF` → `T.accent.violet`

Do NOT migrate domain colors (type colors, rarity colors, achievement category colors) — those stay in `constants.ts`.

### 1f. Create text impact style helpers

Add to `src/theme/theme.ts` — reusable text style presets for the three impact treatments:

```ts
// Text impact treatments
export const TEXT_FX = {
  // Active screen titles, section headers — mint glow behind text
  glow: (color = T.accent.mint) => ({
    textShadowColor: color + '44',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  }),
  // Large stat values, level numbers — stamped-into-metal feel
  embossed: (glowColor = T.accent.violet) => ({
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    // Note: RN only supports one textShadow. For the secondary glow,
    // wrap in a View with a separate Text overlay at 0.3 opacity offset.
  }),
  // Legendary moments — gradient fill on text
  // RN doesn't support background-clip:text natively.
  // Use MaskedView: gradient as background, Text as mask.
  // Or use Skia Text with LinearGradient shader.
  gradient: {
    colors: ['#ffc04a', '#ffffff', '#B14EFF'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
} as const;
```

**Where to use each treatment:**
- **Glow:** Active screen titles (Home → "HOME", Collection → "COLLECTION"), selected tab labels, panel headers with mint accent
- **Embossed:** Level number (XXL size), large stat displays on Profile, battle HP numbers
- **Gradient:** Legendary card name on reveal, rank-up text, "LEGENDARY" label in pack opening. Implement with `@react-native-masked-view/masked-view` or Skia `<Text>` with `<LinearGradient>` shader.

---

## Phase 2 — Materials, Glows & Elevation

### 2a. Create `<MaterialSurface>` component

Create `src/components/MaterialSurface.tsx` — a reusable wrapper that applies material treatments.

```ts
type Material = 'brushedMetal' | 'frostedGlass' | 'obsidian';

interface Props {
  material?: Material;      // default: 'brushedMetal'
  children: React.ReactNode;
  style?: ViewStyle;
  glowColor?: string;       // optional border glow
  energyBorder?: boolean;   // animated top border (default false)
}
```

**Layer structure per material** (pure RN gradient-based — no image textures due to iOS tiling bug):

- **brushedMetal:** 4-stop LinearGradient(`#0e0f16` → `#0b0c12` → `#0a0b10` → `#090a0e`) → top-edge light catch (1px View, `rgba(255,255,255,0.06)`) → inner glow (40px gradient from `rgba(255,255,255,0.025)` → transparent) → children
- **frostedGlass:** BlurView(dark, 20) or opaque fallback → 2-stop semi-transparent LinearGradient → top-edge highlight (`rgba(255,255,255,0.08)`) → inner glow (30px) → children
- **obsidian:** warm 4-stop LinearGradient(`#0d080c` → `#0b0710` → `#09060a` → `#080508`) → red-tinted top edge (`rgba(255,71,87,0.06)`) → red inner glow (50px) → children. (Crack overlay Image TBD — tested on BattleScreen in Sprint 2.3.)

All layers use `StyleSheet.absoluteFill` + `pointerEvents="none"` (except children and BlurView).

**Frosted Glass dependency decision:** Use `@react-native-community/blur` for the BlurView. It is Expo-compatible and GPU-accelerated on iOS. If we want zero new dependencies, fall back to a semi-opaque dark View without blur — still functional, just less premium. **Recommendation: add the dependency.**

### 2b. Retrofit existing panels

Replace direct `View` + `backgroundColor: '#0a0b10'` patterns with `<MaterialSurface>`:

- **All screens:** Quest panels, list containers, stat boxes, filter bars, modals
- **BattleScreen:** Root background → `<MaterialSurface material="obsidian">`
- **Card preview modal:** Backdrop → `<MaterialSurface material="frostedGlass">`

This is the highest-touch phase. Work screen by screen:
1. HomeScreen
2. CollectionScreen
3. StoreScreen
4. CareerScreen
5. ProfileScreen
6. BattleScreen + BattleLobbyScreen
7. PackOpeningScreen
8. AuthScreen

### 2c. Layered glow system

Create a helper for the 3-layer (and optional 4-layer) glow shadow:

```ts
// src/theme/theme.ts (add to existing)
export function glowShadow(color: keyof typeof T.glow, intensity: 1 | 2 | 3 | 4 = 2) {
  const g = T.glow[color];
  // RN only supports a single shadow per View.
  // Return the most visible single layer as the RN shadow:
  return {
    shadowColor: intensity <= 2 ? g.halo : g.core,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: intensity === 1 ? 4 : intensity === 2 ? 12 : intensity === 3 ? 20 : 30,
    elevation: intensity * 4, // Android fallback
  };
}

// For Skia elements — use inside Canvas for true multi-layer glow
export function skiaGlowLayers(color: keyof typeof T.glow, intensity: 1 | 2 | 3 | 4 = 3) {
  const g = T.glow[color];
  const layers = [
    { blur: 4,  color: g.core },  // tight inner edge
    { blur: 16, color: g.halo },  // visible glow ring
    { blur: 40, color: g.bloom }, // ambient atmosphere
  ];
  if (intensity === 4) {
    layers.push({ blur: 80, color: g.wash }); // environmental wash (max drama)
  }
  return layers.slice(0, intensity);
}
```

**RN shadow limitation:** React Native only supports a single shadow per View (no CSS-style multi-shadow). For true multi-layer glows:
- **Option A (simple):** Use the halo layer as the single RN shadow via `glowShadow()`. Good enough for most elements.
- **Option B (premium):** Nest 3 Views with decreasing size and increasing shadowRadius. Works but adds View overhead.
- **Option C (Skia):** For elements already inside a Canvas (cards, tab bar), use multiple Skia `<Shadow>` nodes via `skiaGlowLayers()`. This is the correct solution for HeroCard and the custom tab bar.

**When to use intensity 4 (environmental wash):**
- Legendary card reveal in pack opening
- Level up number display
- Boss encounter card entrance
- Achievement collection moment on Career screen

### 2d. Gradient borders

React Native does not support CSS `background-clip`. Implement gradient borders with:

```tsx
// Gradient border wrapper — use for interactive/highlighted elements
<LinearGradient
  colors={['#00FFAA66', '#00FFAA22']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={[styles.gradientBorder, borderStyle]}
>
  <View style={styles.innerContent}>
    {children}
  </View>
</LinearGradient>

// styles
gradientBorder: { padding: 1, borderRadius: T.radius.lg },
innerContent: { borderRadius: T.radius.lg - 1, backgroundColor: T.bg.surface, padding: 16 },
```

The outer LinearGradient acts as the border, the inner View is the content area. The 1px padding on the gradient creates the border width.

**Where to use gradient borders:**
- Primary buttons (mint gradient)
- Secondary/destructive buttons (mint/red gradient)
- Achievement toast (violet gradient)
- Active input focus state (mint gradient)
- Legendary card container in card preview (gold→violet animated gradient — see 4g)
- Selected/active list items

**Where to keep flat borders:**
- Static panels at rest
- List row separators
- Progress bar tracks
- Inactive chips/badges

### 2e. Elevation drama system

Create `src/theme/elevation.ts` — a 4-level elevation system that combines scale, glow, border treatment, and timing into unified states. Every interactive element should use one of these levels.

```ts
import { T, SPRING, glowShadow } from './theme';

// Four elevation states with multi-property transforms
export const ELEVATION = {
  // Base state — no transform, no glow, flat border
  resting: {
    scale: 1.0,
    shadow: {},
    borderColor: T.bg.border,
    springConfig: null,
  },

  // Subtle lift — faint accent glow, tappable feedback
  // Used for: tappable cards, interactive list items, hoverable elements
  hovered: {
    scale: 1.02,
    shadow: glowShadow('mint', 1),      // 2-layer: core + halo
    borderColor: T.accent.mintMuted,     // #00FFAA44
    springConfig: SPRING.snappy,         // 200ms feel
  },

  // Clearly elevated — strong glow, gradient border
  // Used for: selected card, active element, card preview, focused input
  lifted: {
    scale: 1.05,
    shadow: glowShadow('mint', 2),      // 3-layer: core + halo + bloom
    borderColor: T.accent.mint + '66',  // or use gradient border
    useGradientBorder: true,
    springConfig: SPRING.gentle,         // 300ms feel
  },

  // Maximum drama — full glow halo, particles, background dims
  // Used for: legendary reveal, featured card, boss encounter, achievement collect
  heroic: {
    scale: 1.10,
    shadow: glowShadow('violet', 4),    // 4-layer: core + halo + bloom + wash
    borderColor: T.accent.violet + '88',
    useGradientBorder: true,
    gradientColors: [T.accent.violet + '88', T.accent.gold + '44'],
    springConfig: SPRING.bouncy,         // 500ms dramatic
    dimBackground: true,                 // darken surrounding content to 0.4 opacity
    particles: true,                     // enable particle ring around element
  },
} as const;
```

**Implementation pattern:**
```tsx
// useElevation hook — returns animated styles for current elevation level
function useElevation(level: keyof typeof ELEVATION) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const e = ELEVATION[level];
    scale.value = e.springConfig
      ? withSpring(e.scale, e.springConfig)
      : withTiming(e.scale, { duration: TIMING.quick });
    glowOpacity.value = withTiming(level === 'resting' ? 0 : 1, {
      duration: TIMING.quick,
    });
  }, [level]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, glowOpacity };
}
```

**Where each level applies:**

| Element | Resting | On press/tap | On select/focus | On legendary/hero moment |
|---------|---------|-------------|----------------|-------------------------|
| MiniCard in grid | resting | hovered | lifted (card preview) | — |
| Quest list item | resting | hovered | — | — |
| Primary button | hovered (default glow) | resting (scale down) | — | — |
| Card preview modal | — | — | lifted | heroic (legendary) |
| Achievement node | resting | hovered | lifted (earned) | heroic (collecting) |
| Battle active card | lifted | — | — | heroic (legendary lock reveal) |

### 2f. Progress bar treatments

Apply glow and color treatments to all progress bars per the style guide:

| Context | Fill Color | Glow | Token |
|---------|-----------|------|-------|
| Quest progress | `#00FFAA` | mint 2-layer | `T.accent.mint` + `glowShadow('mint', 2)` |
| HP high (>50%) | `#2ED573` | vital 2-layer | `T.status.vitality` + `glowShadow('vital', 2)` |
| HP medium (25–50%) | `#FFBE0B` | caution 2-layer | `T.status.caution` + `glowShadow('caution', 2)` (not currently defined — add to `T.glow`) |
| HP critical (<25%) | `#FF4757` | danger 2-layer | `T.status.danger` + `glowShadow('danger', 2)` |
| XP / reward | gradient `#B14EFF → #cc6dff` | violet 2-layer | `T.accent.violet` + `glowShadow('violet', 2)` |

**Note:** Add `caution` to `T.glow`:
```ts
caution: { core: '#FFBE0Baa', halo: '#FFBE0B66', bloom: '#FFBE0B22', wash: '#FFBE0B11' },
```

The XP bar uses a LinearGradient fill (violet→light violet) instead of a flat color for extra richness.

---

## Phase 3 — Screen Identity & Ambient Life

### 3a. Create `<ScreenBackground>` component

Create `src/components/ScreenBackground.tsx` that wraps each screen's root View with its unique atmosphere.

```ts
type ScreenTheme = 'home' | 'collection' | 'store' | 'career' | 'battle' | 'profile';

interface Props {
  theme: ScreenTheme;
  children: React.ReactNode;
}
```

Each theme applies:
1. **Base gradient** — unique per screen (from style guide Screen Identity section)
2. **Vignette** — a positioned radial gradient View at low opacity, **animated with a breathing pulse** (5s ease-in-out, opacity 0→0.03 center, edges 0.4→0.5)
3. **Ambient particles** — optional, spawned by a shared `<AmbientParticles>` component

| Screen | Base Gradient | Vignette Position | Vignette Color | Texture | Particles |
|--------|--------------|-------------------|----------------|---------|-----------|
| Home | `#050508 → #060810` | top center | mint 6% | gradient only | mint, behind battle button |
| Collection | `#050508 → #06080a` | top right | mint 4% | gradient only | none |
| Store | `#050508 → #0a0806` | top center | gold 6% | gradient only | gold, near featured offers |
| Career | `#050508 → #080610` | center | violet 4% | gradient only | none |
| Battle | `#08060a → #0d0810` | bottom center | red 8% | obsidian gradient (cracks TBD) | none (handled by damage effects) |
| Profile | `#050508 → #06070c` | top center | white 4% | gradient only | none |

**Vignette breathing animation:**
```ts
// Inside ScreenBackground — the vignette view pulses subtly
const vignetteOpacity = useSharedValue(0.4);
useEffect(() => {
  vignetteOpacity.value = withRepeat(
    withTiming(0.5, { duration: 5000, easing: EASE.inOut }),
    -1, // infinite
    true // reverse
  );
}, []);
```
This creates a subliminal depth pulse that makes the screen feel alive without any visible moving element. The vignette itself is a View with a radial-gradient approximation (centered transparent → dark edges).

### 3b. Create `<AmbientParticles>` component

Create `src/components/AmbientParticles.tsx` — spawns 2–4 small dots that drift upward.

```ts
interface Props {
  color: string;       // particle color (mint, gold, violet)
  count?: number;      // max particles (default 3)
  area?: { x: number, y: number, width: number, height: number }; // spawn zone
}
```

**Implementation:**
- Each particle is an `Animated.View` (absolute positioned, 2–3px circle)
- Randomized: startX, size (2–3px), opacity (0.1–0.2), travel time (8–15s)
- Animation: `translateY` from bottom of area to top, linear timing, infinite loop
- Stagger start times so particles don't move in sync
- Use Reanimated shared values, `useNativeDriver: true`
- Max 4 particles rendering simultaneously — old particles are recycled

**Performance rule:** Particles pause when the screen loses focus (use `useIsFocused()` from React Navigation).

### 3c. Ambient animations on existing elements

These are added to existing components, not new components:

**Border energy flow** (panels):
- Add to `<MaterialSurface>` when `energyBorder={true}`
- Animated LinearGradient along top edge: mint → violet → transparent
- Speed: 4s linear infinite loop (per style guide)
- Only enable on the **primary panel per screen** (e.g., quest panel on Home, featured offer on Store). Not every panel.

**Card breathing** (collection grid):
- Add to `MiniCard.tsx`: a faint scale pulse `1.0 → 1.005 → 1.0` using `MOTION.float` (3s ease-in-out)
- **Critical:** Only animate cards currently visible in the FlatList viewport. Use `onViewableItemsChanged` to track which items are visible. Cards outside the viewport should not run animations.
- Stagger start times using the card's index: `delay = (index % 8) * 375` ms
- This keeps max simultaneous breathing animations to ~8–12 (one screen's worth)

**Glow pulse** (buttons, progress fills):
- Add to primary action buttons: outer shadow layer opacity breathes 0.3→0.6 over 2s using `MOTION.float` timing
- Add to progress bar fills: shadow radius breathes ±2px over 2s
- Scope: all progress bars that are actively filling (quest progress, XP bar). Static/full bars do not pulse.

**Screen title shimmer sweep:**
- Add to screen titles on Home, Collection, Store, Career
- A diagonal (45°) gradient mask slides across the title text over 6s, 0.05 opacity
- Use `MaskedView` from `@react-native-masked-view/masked-view` (Expo-compatible)
- Only runs when screen is focused

### 3d. Performance budget

- **Max 6 simultaneous ambient animations per screen** (breathing + particles + glow pulse + energy border + vignette pulse + title shimmer)
- **All animations must use `useNativeDriver: true`** or Reanimated shared values — zero JS thread involvement
- **Animations pause on screen blur** via `useIsFocused()` — no background animation work
- **FlatList items:** Max 12 simultaneously animated cards in viewport. Cards scroll off → animation stops.
- **Frame budget:** If any screen drops below 55fps with ambient animations enabled, reduce particle count and disable card breathing first. Measure with Expo's performance monitor (`expo start --dev-client` → shake → Performance Monitor).

---

## Phase 4 — Micro-Interactions & Rarity Tiers

### 4a. Create `<AnimatedNumber>` component

Create `src/components/AnimatedNumber.tsx` — numbers tick through intermediate values instead of jumping.

```ts
interface Props {
  value: number;
  duration?: number;      // tick-up time (default TIMING.standard = 400ms)
  glowColor?: string;     // accent glow at final value
  style?: TextStyle;
  format?: (n: number) => string; // e.g., comma formatting
  haptic?: boolean;       // soft taps per digit change (default false)
}
```

**Implementation:**
- Track previous value in a ref
- On value change: animate from old → new using Reanimated `withTiming` at `TIMING.standard`
- Display interpolated integer values during animation
- At completion: brief text glow flash using `TEXT_FX.glow(glowColor)` (fade in 100ms, fade out 300ms)
- If `haptic={true}`: fire `Haptics.impactAsync(ImpactFeedbackStyle.Light)` every ~50ms during tick

**Where to use:**
- Coin display (Home, Store) — gold glow, haptic on purchase
- XP display (Home, Profile) — violet glow
- Battle damage numbers — danger glow, no haptic (has its own)
- Quest progress counters — mint glow

### 4b. Button shimmer sweep

Add to the primary action button component:
- A diagonal gradient mask (60% width) that slides left→right over 3s
- Same technique as the Skia shimmer on cards, but using Reanimated + RN `MaskedView`
- Runs continuously on idle primary buttons, pauses on press

### 4c. Press ripple

Add to all interactive surfaces (buttons, cards, list items):
- On `onPressIn`: capture `nativeEvent.locationX/Y`
- Simultaneously: `scale(0.96)` on the element (using `SPRING.snappy`) + glow contracts to core-only layer
- Spawn an `Animated.View` circle at touch point
- Animate: scale 0→1 + opacity 0.15→0 over 300ms (`TIMING.quick`)
- Color matches the element's accent (mint for standard, violet for reward, red for destructive)

**Implementation approach:** Create a `useRipple()` hook that returns:
- `rippleView` — the animated circle View to render inside the element
- `onPressIn` — the handler that captures touch position and starts the animation
- `pressAnimStyle` — the scale(0.96) + glow contraction animated style for the container

### 4d. Success burst particles

Create `src/components/SuccessBurst.tsx`:
- Trigger: called imperatively via ref (`burstRef.current.fire()`)
- Spawns 8–12 particles from a center point using `MOTION.burst` timing
- Particles travel 30–60px outward in random directions over 400ms, fading to 0
- Particle color matches context (mint for quests, violet for achievements, gold for rewards)

**Where to use:**
- Quest completion (fire from the checkmark/progress bar)
- Achievement earned toast (fire from the icon)
- Card collected on Career screen (fire from the node)
- Pack opening: each card reveal (fire from the card center)

### 4e. Tab switch energy trail

Modify the custom Skia tab bar in `App.tsx`:
- Track `previousTabIndex` in a ref
- On tab change: draw a Skia path (2px mint line) from old tab X to new tab X
- Animate: the line stretches from old→new position over `TIMING.quick` (250ms), then fades over 150ms
- Use Skia `Path` with animated trim start/end for the stretching effect
- Use `MOTION.snap` easing for the movement — instant lock, no bounce

### 4f. Glow trail on drag

Add to the battle drag-to-attack gesture in `BattleScreen.tsx`:
- As a card is dragged, render 3–4 ghost positions behind it at decreasing opacity (0.3, 0.2, 0.1, 0.05)
- Each ghost is a simplified card shape (just a rounded rect with the card's type color fill at the opacity)
- Ghosts trail the finger by 3–4 gesture positions, stored in a circular buffer from the `onGestureEvent` handler
- Color matches the dragged card's type color (from `TYPE_COLORS` in constants)
- Trail clears instantly on gesture end (snap to invisible using `MOTION.snap`)

**Implementation:**
```ts
// Inside the gesture handler, maintain a position history
const trailPositions = useSharedValue<{x: number, y: number}[]>([]);

// On gesture move: push current position, keep last 4
// Render 4 Animated.View ghosts at trailPositions with decreasing opacity
```

### 4g. Rarity visual tier upgrades

Upgrade `HeroCard.tsx` shimmer system to match the style guide's per-rarity treatments. These are all **Skia-driven** inside the existing Canvas.

**Common (no changes):**
- Static card, no shimmer, no glow. Brushed Metal surface only.

**Uncommon:**
- Single-sweep shimmer: one LinearGradient pass, 2s cycle (`TIMING.slow`)
- Faint border glow: 1-layer (core only), `skiaGlowLayers('mint', 1)`
- Easing: `EASE.inOut`

**Rare:**
- Dual-sweep shimmer: two LinearGradient passes at 90° offset, 1.5s cycle
- Animated foil grain: noise texture at 0.04 opacity
- Border glow: 2-layer (core + halo), `skiaGlowLayers('mint', 2)`
- Gradient border shifts blue (use rarity color `#5ab4ff`)

**Epic:**
- Continuous shimmer (same as Rare but faster, 1.2s)
- **Particle edges:** 8–12 small dots (2px) floating along the card border path
  - Dots are Skia `<Circle>` elements positioned on the card's rounded rect perimeter
  - Each dot has randomized speed (3–6s orbit), opacity (0.3–0.6), and size (1.5–2.5px)
  - Color: rarity color `#cc6dff`
  - Animate position along the path using `PathOp` or manual sin/cos on rect edges
- Border glow: 3-layer, `skiaGlowLayers('violet', 3)`

**Legendary:**
- **Holographic prismatic shimmer:** same dual-sweep as Epic + Skia `ColorMatrix` hue rotation
  - Hue rotates 360° over 6s (`TIMING.slow * 3`), continuous
  - This makes the shimmer shift through rainbow colors as it sweeps — holographic effect
- **Living gradient border:** gold↔violet animated gradient
  - Skia `<RoundedRect>` stroke with `<LinearGradient>` whose color stops animate:
    - `[#ffc04a, #B14EFF44]` → `[#B14EFF, #ffc04a44]` over 3s, ping-pong
  - This creates a border that shifts between gold and violet
- **Particle edges:** same as Epic but more particles (12–16), brighter (0.5–0.8 opacity), gold + violet alternating colors
- **4-layer glow:** `skiaGlowLayers('gold', 4)` — full environmental wash
- **Screen shake on reveal:** `MOTION.impact` (3px shake, 150ms) + `Haptics.impactAsync(Heavy)`

---

## Phase 5 — Wow Moment Choreography & Haptics

### 5a. Haptic pairing map

Every wow moment pairs visual with physical feedback. Add haptic calls at the specified timing:

| Moment | Haptic Type | Expo API | When to fire |
|--------|-----------|----------|-------------|
| Pack crack/open | Medium impact | `Haptics.impactAsync(Medium)` | On crack animation start |
| Card reveal (non-legendary) | Light impact | `Haptics.impactAsync(Light)` | Each card fly-in (staggered) |
| Legendary card reveal | Heavy impact + pattern | `Haptics.impactAsync(Heavy)` then `Haptics.notificationAsync(Success)` | On violet burst, then on card spin completion |
| Victory | Notification success | `Haptics.notificationAsync(Success)` | On "VICTORY" text slam |
| Level up | Notification success | `Haptics.notificationAsync(Success)` | On level number slam |
| Achievement earned | Light impact | `Haptics.impactAsync(Light)` | On toast slide-in |
| Achievement collected | Medium impact | `Haptics.impactAsync(Medium)` | On "Collect" button press on Career screen |
| Number tick-up | Light impact (repeated) | `Haptics.impactAsync(Light)` every ~50ms | During AnimatedNumber tick (optional, via prop) |
| Damage dealt | Medium impact | `Haptics.impactAsync(Medium)` | On damage number appearance + screen shake |
| Heavy attack landed | Heavy impact | `Haptics.impactAsync(Heavy)` | On Impact motion screen shake |

**Note:** `expo-haptics` is already installed (used in PackOpeningScreen and useGameState). No new dependency needed.

### 5b. Pack opening choreography

Upgrade `PackOpeningScreen.tsx` with the full sequence from the style guide:

**Phase sequence (timed):**

1. **Dim** (0ms): Screen background fades to near-black (`rgba(0,0,0,0.85)`) over 400ms (`TIMING.standard`)
2. **Glow buildup** (400ms): Pack starts glowing with the rarity color of the best card inside. Glow builds using `glowShadow` from intensity 1→3 over 800ms (`TIMING.long`). Use the card data to determine glow color before reveal.
3. **Crack** (1200ms): A vertical white line appears at pack center, expands to a bright crack. `MOTION.impact` fires — screen shake + `Haptics.impactAsync(Medium)`. Duration: 200ms.
4. **Reveal** (1400ms): Cards fly out with staggered 200ms delays. Each card enters using `MOTION.slam` (overshoot 1.15x, settle). Fire `Haptics.impactAsync(Light)` per card.
5. **Legendary trigger** (if applicable): Before the legendary card reveals, insert a 500ms pause. Then: full-screen violet radial gradient scales from 0→full over 300ms. 4-layer violet glow (`glowShadow('violet', 4)`). `Haptics.impactAsync(Heavy)`. Card spins 360° Y-axis rotation over 800ms (`TIMING.long`). Gold + violet `<SuccessBurst>` fires. Card name renders with `TEXT_FX.gradient`.

### 5c. Victory choreography

Upgrade `BattleScreen.tsx` victory sequence:

1. **Side split** (0ms): Player half of screen pulses with mint tint (`T.accent.mintFaint`), opponent half fades to darkness over 300ms
2. **VICTORY slam** (300ms): Text enters from above using `MOTION.slam` (overshoot 1.15x). Apply `TEXT_FX.embossed()` with mint glow. Fire `MOTION.impact` screen shake. `Haptics.notificationAsync(Success)`.
3. **Stat cascade** (800ms): Battle stats appear one by one, staggered 150ms apart. Each stat uses `MOTION.burst` (scale 0→1.2→1.0). Numeric values use `<AnimatedNumber>`.
4. **Reward tally** (after stats): Coins/XP earned tick up using `<AnimatedNumber>` with gold/violet glow respectively.

### 5d. Level up choreography

Upgrade the level-up moment (triggered in `useGameState.ts`):

1. **Violet burst** (0ms): Radial gradient from center, 4-layer violet glow, scales from 0→full over 300ms. `Haptics.notificationAsync(Success)`.
2. **Level number slam** (300ms): New level number scales using `MOTION.slam` (overshoot to 1.3x, settle to 1.0). Render with `TEXT_FX.gradient` (violet→white). Apply `TEXT_FX.embossed()`.
3. **XP bar shatter** (600ms): Existing XP bar fires `<SuccessBurst>` (particles explode from bar position). Bar reforms at new position with violet gradient fill.
4. **Reward cascade** (1000ms): Reward items (coins, new unlocks) cascade in using `MOTION.float` timing. Numeric values use `<AnimatedNumber>` with gold glow.

### 5e. Legendary pull choreography

The single most important wow moment in the game. This is a sub-sequence within pack opening (5b step 5), fully specified:

1. **Blackout** (0ms): Screen goes to `rgba(0,0,0,0.95)`. All other revealed cards dim to 0.2 opacity.
2. **Violet explosion** (200ms): Full-screen radial gradient burst from card center. Color: `T.accent.violet`. 4-layer glow at intensity 4 (with environmental wash). Duration: 300ms scale-up.
3. **Card spin** (500ms): Card does a 360° Y-axis rotation over 800ms. During spin, apply holographic shimmer with full hue rotation. Card border animates gold↔violet.
4. **Particle shower** (800ms): `<SuccessBurst>` fires from card center but with 20+ particles (not the normal 8–12). Particles use alternating gold + violet colors. Travel distance: 80–120px (larger than normal). Duration: 600ms.
5. **Card name** (1300ms): Card name renders below the card using `TEXT_FX.gradient` (gold→white→violet). `MOTION.slam` entrance.
6. **Haptic sequence**: `Heavy` on violet explosion → `Medium` on spin completion → `notificationAsync(Success)` on card name reveal.

### 5f. Achievement earned choreography

Upgrade `AchievementPopup.tsx`:

1. **Toast slide-in** (0ms): Toast slides from top of screen, 300ms (`TIMING.quick`), `MOTION.slam` overshoot. Gradient violet border via `<GradientBorder>`. 3-layer violet glow.
2. **Icon burst** (200ms): Achievement icon inside the toast scales using `MOTION.burst` (0→1.2→1.0, 200ms).
3. **Particle pop** (300ms): `<SuccessBurst>` fires from the icon position, violet particles.
4. **Haptic**: `Haptics.impactAsync(Light)` on slide-in.

---

## Component Summary

New components to create:

| Component | File | Phase | Used By |
|-----------|------|-------|---------|
| `MaterialSurface` | `src/components/MaterialSurface.tsx` | 2 | All screens (replaces bare View panels) |
| `ScreenBackground` | `src/components/ScreenBackground.tsx` | 3 | All screen root wrappers |
| `AmbientParticles` | `src/components/AmbientParticles.tsx` | 3 | Home, Store (optional per screen) |
| `AnimatedNumber` | `src/components/AnimatedNumber.tsx` | 4 | Coin/XP displays, battle damage, quest counters |
| `SuccessBurst` | `src/components/SuccessBurst.tsx` | 4 | Quest complete, achievement earned, card collect, pack opening |
| `GradientBorder` | `src/components/GradientBorder.tsx` | 2 | Buttons, toasts, active inputs, card preview |

Modified components:

| Component | Phase | Changes |
|-----------|-------|---------|
| `MiniCard.tsx` | 3 | Add breathing scale pulse (viewport-aware, `MOTION.float`) |
| `HeroCard.tsx` | 4 | Upgrade shimmer to rarity-tiered holographic foil (Skia), add particle edges for Epic+, hue rotation for Legendary |
| `App.tsx` (tab bar) | 4 | Add energy trail on tab switch (Skia Path, `MOTION.snap`) |
| `AchievementPopup.tsx` | 5 | Gradient border + 3-layer violet glow + success burst + haptic |
| `PackOpeningScreen.tsx` | 5 | Full wow choreography: dim→glow→crack→reveal→legendary burst |
| `BattleScreen.tsx` | 4+5 | Glow trail on drag, victory choreography, damage haptics |
| All screen files | 2+3 | Wrap root in `<ScreenBackground>`, replace panels with `<MaterialSurface>` |

New theme/utility files:

| File | Phase | Contents |
|------|-------|---------|
| `src/theme/theme.ts` | 1 | T tokens, TIMING, MOTION, SPRING, EASE, TEXT_FX, glowShadow(), skiaGlowLayers() |
| `src/theme/elevation.ts` | 2 | ELEVATION states, useElevation() hook |

New assets:

| File | Location | Size | Status |
|------|----------|------|--------|
| `noise-512.png` | `assets/textures/` | ~2KB | Unused — dead asset (iOS tiling broken) |
| `brush-grain-128x4.png` | `assets/textures/` | ~1KB | Unused — dead asset (iOS tiling broken) |
| `obsidian-cracks.png` | `assets/textures/` | ~8KB | TBD — pending BattleScreen test in Sprint 2.3 |

New dependencies:

| Package | Purpose | Phase | Required? |
|---------|---------|-------|-----------|
| `@react-native-community/blur` | Frosted Glass material (iOS BlurView) | 2 | Recommended, not blocking. Can fall back to opaque dark overlay. |
| `@react-native-masked-view/masked-view` | Text shimmer sweep, gradient text | 3 | Recommended for screen title shimmer + gradient text. Alternative: Skia-only approach. |

---

## What This PRD Does NOT Cover

- **Card redesign** — card layout/structure changes are a separate effort (see `CARD_REDESIGN.md` if it exists)
- **Sound effects** — audio is explicitly not implemented per CLAUDE.md
- **New screens or features** — this is purely visual polish on existing screens
- **App Store assets** — icons, splash screen, screenshots are a separate task
- **Android-specific tuning** — this PRD targets iOS first. Android shadow/blur fallbacks may need a follow-up pass
