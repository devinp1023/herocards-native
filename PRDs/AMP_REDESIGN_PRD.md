# HeroCards — Amp System Redesign PRD

## Overview

This PRD covers the complete redesign of the Amp mechanic UI. The goal is to replace the current arc bar + floating label system with a design that is emotionally resonant, lore-consistent, and visually premium.

---

## Design Intent

### The Lore

Amp is the innate cosmic force that exists in humans in the HeroCards universe. Certain humans have their Amp activated, which gives them superpowers. It represents a **surge of energy** building inside a hero until it overflows into a powerful effect.

### The Emotion

The experience of Amp should feel like:
- **Slow tension building** — energy concentrating over multiple rounds
- **A race** — the rush of filling your bar before the opponent does
- **An eruption** — not a button press, but an explosion of contained power

### The Problem With the Current UI

The current arc bars + vertical label system communicates Amp as a loading bar. Loading bars are for progress, not power. They are measured, not felt. The current UI fights against the emotion it's supposed to create.

### The Solution

The **active cards themselves** communicate Amp state. A surge glow builds around the card as Amp increases — energy visibly concentrating in the hero. The race is felt by watching both cards simultaneously, not by reading numbers.

The **effect name** remains as a vertical label on the right side of the screen, shifting color and brightness to signal who is winning the race.

Numbers are removed entirely. The visual intensity of the glow *is* the number.

---

## Current Implementation Reference

- `HeroCard` props interface: `HeroCardProps extends BattleProps`
- `BattleProps` contains: `currentHp`, `maxHp`, `currentStamina`, `maxStamina`, `isActive`, `hpPct`
- `HeroCard` currently has: `showShine?: boolean`, `enableTilt?: boolean`
- Amp effect rendering: `AmpRaceBar` component receives `currentEffect` and `effectColor` from `AMP_EFFECT_LABELS` and `AMP_EFFECT_COLORS` lookup maps
- Amp values live in `useBattle.ts` and are exposed via battle snapshot as `battle.playerAmp` and `battle.aiAmp`

---

## What Changes

| Element | Before | After |
|---------|--------|-------|
| Arc bars (left side) | Two curved Skia arc paths showing amp progress | **Removed entirely** |
| Amp numbers | 66 / 73 floating labels | **Removed entirely** |
| Effect name | Vertical text, static color, fixed brightness | **Vertical text, color shifts mint/violet, brightness builds with amp** |
| Active card | Static, no amp awareness | **Surge glow builds outside card border as amp increases** |
| Reroll action | Unknown/existing | **Contextual button fades in below effect name when playerAmp ≥ 50** |
| Trigger action | Unknown/existing | **Contextual button fades in below effect name when playerAmp = 100** |

---

## Part 1 — HeroCard Amp Surge Glow

### New Props

Add to `HeroCardProps`:

```ts
ampPercent?: number      // 0–100, default 0
isAmpActive?: boolean    // true only for the currently active battle card
ampColor?: string        // '#00FFAA' for player, '#B14EFF' for AI
```

### Visual States

The surge glow renders as concentric glowing rings **outside** the card border, inside the existing Skia canvas. It must never conflict with the rarity glow system, which lives on the card border and surface.

| Amp % | Visual |
|-------|--------|
| 0–24% | Nothing visible |
| 25–49% | Single faint ring, opacity 0.15, blur 8 |
| 50–74% | Two rings, opacity 0.25, blur 12, card border faint glow |
| 75–99% | Three rings, opacity 0.4, blur 20, fast pulse 0.8s cycle |
| 100% | Full eruption — rings at opacity 0.8, blur 30, particles bleeding off card edges |

### Implementation Rules

- The surge glow renders in its own Skia `<Group>` drawn **before** the card base layers — so it appears behind the card, not on top of it. The card sits on top of the glow.
- The pulse animation at 75%+ must use a Reanimated shared value passed into the Skia canvas via `useDerivedValue` — never animate inside the Skia canvas directly
- `ampColor` is `#00FFAA` (mint) for the player card and `#B14EFF` (violet) for the AI card
- This must live inside the **existing** HeroCard Skia canvas — never create a new canvas
- `React.memo` on HeroCard is critical — `ampPercent` changing every round must not cause expensive re-renders of unrelated components

---

## Part 2 — AmpEffectLabel Component

Replace `AmpRaceBar` with a new component `src/components/AmpEffectLabel.tsx`.

### Props

```ts
interface AmpEffectLabelProps {
  effectName: string        // e.g. 'TYPE FLIP', 'EQUALISER'
  playerAmp: number         // 0–100
  aiAmp: number             // 0–100
  isTriggered?: boolean     // brief eruption state when amp hits 100
  onReroll: () => void      // called when player spends 50 amp to change effect
  onTrigger: () => void     // called when player spends 100 amp to trigger effect
}
```

### Vertical Text Rendering

- Each letter of `effectName` renders on its own line, stacked vertically, centered
- Font: `FONTS.orbitronBold`, size `T.font.lg`
- Positioned full height of the battle zone on the right side — same position as current vertical text
- The effect name is the only element — no bars, no numbers, no arcs

### Color and Brightness Logic

**Determine leader:**
```
if playerAmp >= aiAmp → leader is player → color is mint (#00FFAA)
else → leader is AI → color is violet (#B14EFF)
```

**Calculate intensity:**
```
intensity = Math.max(playerAmp, aiAmp) / 100    // 0.0 to 1.0
```

**Color interpolation:**
- At intensity 0.0 → `T.text.muted` (#6e7191), no glow
- At intensity 1.0 → full leader color, full glow
- Smoothly interpolates between the two as intensity builds

**Neck and neck state:**
- Condition: both amps within 10% of each other AND both > 40
- Behavior: slowly oscillate between mint and violet using `withRepeat(withTiming(...))`, 2s cycle
- Communicates a genuinely contested race

**Glow:**
- `textShadowRadius` scales from 0 at intensity 0 to 12 at intensity 1
- Color matches leader color

**At 75%+ intensity:**
- Add fast pulse on opacity: 0.7→1.0, 0.6s cycle
- Signals urgency — someone is about to trigger

**On `isTriggered`:**
- Scale 1.0→1.4→1.0 using `MOTION.burst`
- Full leader color glow at intensity 4
- Then return to normal state
- Must only fire for one cycle — not continuously

### Animation Rules

- All animations use Reanimated shared values — never React state for animation values
- All animations pause when screen is not focused via `useIsFocused()`
- `React.memo` on the component — amp values change frequently

---

### Contextual Action Buttons

Two small buttons appear below the vertical effect name, fading in only when the player has enough amp to use them. They are never visible otherwise — no placeholder, no disabled state, just absent.

**Reroll button — appears when `playerAmp >= 50`:**
- Label: `REROLL · 50`
- Color: `T.text.muted` at rest, brightens to `T.accent.mint` on press
- Border: `GradientBorder` preset mint, 1px
- Fades in with `withTiming` opacity 0→1, 300ms when threshold is crossed
- Fades out with `withTiming` opacity 1→0, 300ms when playerAmp drops below 50
- On press: calls `onReroll()`, button immediately fades out
- Font: `FONTS.orbitronBold`, size `T.font.xs`, letter spacing 1px

**Trigger button — appears when `playerAmp === 100`:**
- Label: `TRIGGER · 100`
- Color: `T.accent.mint`
- Border: `GradientBorder` preset mint, 1px, with glow `glowShadow('mint', 2)`
- Pulses continuously: opacity 0.7→1.0, 0.8s cycle — signals urgency
- Fades in with `withTiming` opacity 0→1, 200ms
- On press: calls `onTrigger()`, fires `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`, button fades out
- Font: `FONTS.orbitronBold`, size `T.font.xs`, letter spacing 1px

**Layout:**
- Both buttons are positioned below the vertical effect name text
- Stacked vertically: Reroll on top, Trigger below
- If both are visible simultaneously (playerAmp === 100 means playerAmp >= 50 is also true), both show — Reroll above Trigger
- Width matches the right-side column width
- `React.memo` — button visibility changes must not re-render the parent battle layout

**QA:**
- [ ] Reroll button is invisible below 50 amp — no layout shift when it appears
- [ ] Trigger button is invisible below 100 amp — no layout shift when it appears
- [ ] Both buttons fade in/out smoothly — never pop in abruptly
- [ ] Trigger button pulse stops immediately on press
- [ ] Pressing Reroll when playerAmp is exactly 50 works correctly
- [ ] Neither button is visible during AI turn processing

---

## Part 3 — Remove Old Amp Bar Elements

Remove the following from `AmpRaceBar` / `BattleScreen`:

- Arc path renders (Skia arc bars)
- Amp number labels (e.g. 66, 73)
- Bar track and bar fill Views
- Any horizontal or vertical bar progress indicators

**Keep:** The effect name display, now handled entirely by `AmpEffectLabel`.

---

## Part 4 — BattleScreen Wiring

### Player Active HeroCard
```tsx
<HeroCard
  ...existingProps
  ampPercent={battle.playerAmp}
  ampColor="#00FFAA"
  isAmpActive={true}
/>
```

### AI Active HeroCard
```tsx
<HeroCard
  ...existingProps
  ampPercent={battle.aiAmp}
  ampColor="#B14EFF"
  isAmpActive={true}
/>
```

### AmpEffectLabel
Replace existing `AmpRaceBar` usage with:
```tsx
<AmpEffectLabel
  effectName={AMP_EFFECT_LABELS[battle.ampActiveEffect ?? battle.ampPoolEffect]}
  playerAmp={battle.playerAmp}
  aiAmp={battle.aiAmp}
  isTriggered={isAmpTriggered}
  onReroll={handleAmpReroll}
  onTrigger={handleAmpTrigger}
/>
```

`isTriggered` should be true for one render cycle when amp hits 100 and the effect fires. Find the existing trigger logic in `useBattle.ts` and hook into it.

`onReroll` and `onTrigger` must be wrapped in `useCallback` in `BattleScreen` — they are passed to a memoized component.

---

## Architecture Constraints

These are non-negotiable and must be followed:

- **Never nest a Skia Canvas inside another Canvas**
- The amp surge Skia group must live inside the **existing** HeroCard canvas
- `React.memo` on HeroCard — `ampPercent` changing must not cause re-renders of unrelated components
- `useCallback` on all handlers passed to memoized components
- All animations use Reanimated shared values — never JS thread animation
- Animations pause on screen blur via `useIsFocused()`
- `npx tsc --noEmit` after all changes — zero errors required
- `npx expo start --clear` after to verify Metro cache is clean

---

## Visual QA Checklist

Before considering this complete, verify each of these:

- [ ] Surge glow renders **behind** the card, not on top of it — card image is never obscured
- [ ] Rarity glow system (Epic particles, Legendary shimmer) coexists with amp surge — no visual conflicts
- [ ] Effect name color shifts correctly: mint when player leads, violet when AI leads
- [ ] Neck and neck oscillation fires when both amps are within 10% and both > 40
- [ ] Pulse at 75%+ is fast and urgent feeling
- [ ] `isTriggered` burst fires once and returns to normal — not continuously looping
- [ ] No amp numbers visible anywhere on the battle screen
- [ ] No arc bars visible anywhere on the battle screen
- [ ] All animations pause when navigating away from BattleScreen
- [ ] BattleScreen maintains >55fps during an active round with all amp animations enabled — test with Expo performance monitor
- [ ] Reroll button invisible below 50 amp, fades in smoothly at 50, no layout shift
- [ ] Trigger button invisible below 100 amp, fades in smoothly at 100, no layout shift
- [ ] Both buttons visible simultaneously when playerAmp === 100
- [ ] Trigger button pulse stops immediately on press
- [ ] Neither button visible during AI turn processing
- [ ] `onReroll` and `onTrigger` wrapped in `useCallback` — no unnecessary re-renders
- [ ] Zero TypeScript errors after implementation

---

## What This PRD Does Not Cover

- Changes to Amp mechanic game logic — only the visual representation changes
- The card slam animation — covered separately
- MiniCard hand display — covered separately
- Battle screen layout changes beyond amp element placement
