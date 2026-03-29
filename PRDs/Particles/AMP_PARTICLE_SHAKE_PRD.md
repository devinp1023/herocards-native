# HeroCards — Amp Visual Upgrade: Particles + Shake

**Scope:** Replace the existing concentric ring glow on active HeroCards with a horizontal particle drift system and a card shake at 90%+ amp. Everything else in the Amp system (AmpEffectLabel, contextual buttons, BattleScreen wiring) is already implemented.

**Reference mockup:** `amp-particles-interactive.html` — the visual source of truth. All timing, scaling, and behavior described here matches that mockup exactly.

---

## What Changes

| Element | Before | After |
|---------|--------|-------|
| Active card amp visualization | Concentric glowing rings outside card border | **Horizontal particle drift left and right from card edges** |
| Active card at 90%+ amp | Nothing additional | **Card shudders — subtle tremor at 90%, frantic at 99%** |

Everything else stays exactly as implemented.

---

## Part 1 — Particle Drift System

### New Props on HeroCard

The existing `ampPercent`, `isAmpActive`, and `ampColor` props remain unchanged. No new props needed.

### Particle Zone Layout

Add two invisible overflow Views flanking the HeroCard — one left, one right. These are added to the HeroCard's existing wrapper, not inside the Skia canvas.

```
[LEFT ZONE 65px] [HEROCARD] [RIGHT ZONE 65px]
```

- Both zones: full card height, `overflow: 'hidden'`, `pointerEvents: 'none'`
- Zones live in the **RN layer only** — never inside the Skia canvas
- Position: absolute, flush against the card's left and right edges

### Particle Types

Each spawned particle is randomly one of two types:

**Dot particle:**
- Small filled circle, color `ampColor`
- `textShadow` glow matching `ampColor`

**Number particle:**
- Displays the current `ampPercent` value as text
- Font: `FONTS.orbitronBold`
- Color: `ampColor` with glow

**Number particle chance by amp:**

| Amp % | Chance of number particle |
|-------|--------------------------|
| 0–4% | 0% |
| 5–24% | 35% |
| 25–49% | 28% |
| 50–69% | 22% |
| 70–89% | 28% |
| 90–100% | 35% |

### Particle Scaling

All values use linear interpolation across the 0–100 amp range:

```
// Size (dot particles)
minSize = lerp(1.5, 2.5, amp / 100)
maxSize = lerp(2.5, 5.0, amp / 100)
size    = random between min and max

// Font size (number particles)
fontSize = lerp(6, 11, amp / 100)

// How far particles travel horizontally
travelDistance = lerp(15, 62, amp / 100)   // px

// How long each particle lives (faster at higher amp)
duration = lerp(2200, 900, amp / 100)      // ms

// Peak opacity
peakOpacity = lerp(0.4, 1.0, amp / 100)

// Glow radius
glowRadius = lerp(3, 8, amp / 100)         // dot
glowRadius = lerp(4, 10, amp / 100)        // number
```

### Particle Animation

Each particle animates in three phases using Reanimated `withTiming`:

1. **Fade in** — opacity 0 → peakOpacity over first 20% of duration
2. **Drift** — translateX toward screen edge + random vertical drift of ±6px over full duration
3. **Fade out** — opacity → 0 over final 35% of duration

Remove the particle View from the tree on animation complete.

### Spawn Rate

Each zone spawns independently on a staggered timer:

| Amp % | Spawns per second per zone |
|-------|---------------------------|
| 0–4% | 0 — no particles |
| 5–24% | 1.5 |
| 25–49% | 3.0 |
| 50–74% | 5.0 |
| 75–89% | 7.0 |
| 90–100% | 10.0 |

**Spawn timer:**
```
delay = (1000 / rate) + random jitter of ±(300 / rate) ms
```

**Double spawn:** At amp > 70, after each spawn there is a 35% chance of a second particle spawning 80–120ms later.

**Hard cap:** Maximum 20 active particle Views per card at any time. If cap is hit, remove the oldest particle before spawning a new one.

### Card Border Glow Update

Replace the existing ring-based glow with a horizontally-biased border glow on the HeroCard wrapper View. The `-3px 0` and `3px 0` shadow offsets bias the glow left and right, visually connecting the border to the particle streams.

| Amp % | boxShadow | borderColor |
|-------|-----------|-------------|
| 0–24% | none | `ampColor + '22'` |
| 25–49% | `0 0 8px ampColor22` | `ampColor + '44'` |
| 50–74% | `0 0 16px ampColor33, -3px 0 10px ampColor22, 3px 0 10px ampColor22` | `ampColor + '66'` |
| 75–99% | `0 0 28px ampColor55, -6px 0 20px ampColor33, 6px 0 20px ampColor33` | `ampColor + '99'` |
| 100% | `0 0 32px ampColor88, -8px 0 24px ampColor55, 8px 0 24px ampColor55` | `ampColor` |

---

## Part 2 — Card Shake at 90%+

### Overview

When `ampPercent >= 90` the HeroCard wrapper View enters a continuous shake animation. Intensity scales from a subtle tremor at 90% to a frantic shudder at 99%. At 100% the existing eruption fires and shake stops.

### Shake Parameters

Interpolated across the 90–100% range (`t = (amp - 90) / 10`, where t=0 at 90%, t=1 at 100%):

```
amplitude = lerp(1.5, 4.5, t)    // px translateX
rotation  = lerp(0.3, 1.2, t)    // degrees rotateZ
duration  = lerp(160, 65,  t)    // ms per cycle
```

### Shake Keyframe Sequence

```
frame 0: translateX(0)              rotateZ(0)
frame 1: translateX(+amplitude)     rotateZ(+rotation)
frame 2: translateX(-amplitude×0.8) rotateZ(-rotation×0.7)
frame 3: translateX(+amplitude×0.6) rotateZ(+rotation×0.5)
frame 4: translateX(-amplitude×0.4) rotateZ(-rotation×0.3)
frame 5: translateX(0)              rotateZ(0)
```

Implement as `withRepeat(withSequence(...))` on Reanimated shared values `shakeX` and `shakeRotation`.

### Shake Rules

- Shake lives on the HeroCard **wrapper View** — not inside the Skia canvas
- When amp drops below 90: cancel immediately, ease `shakeX` and `shakeRotation` back to 0 over 100ms
- When amp changes within 90–100: cancel current shake, restart with updated parameters
- **Card slam takes priority:** if a slam animation fires while shake is active, cancel shake immediately before slam begins — resume shake after slam completes if amp is still ≥ 90
- Shake pauses when screen loses focus via `useIsFocused()`

### Haptic at 90% Threshold

- Fire `Haptics.impactAsync(ImpactFeedbackStyle.Medium)` once when `ampPercent` crosses 90%
- Track with a ref `hasShakeHapticFired` — reset to `false` when amp drops below 90
- Never fires more than once per crossing

---

## Architecture Constraints

- **Particle system is pure RN** — never inside the Skia canvas
- **Existing HeroCard Skia canvas is not modified** — particles and shake live in the RN wrapper layer
- Hard cap of 20 particles per card — recycle oldest on overflow
- All animations on Reanimated shared values — never JS thread
- `React.memo` on HeroCard — `ampPercent` changing must not re-render unrelated components
- Particles and shake pause on screen blur via `useIsFocused()`
- `npx tsc --noEmit` — zero TypeScript errors required
- `npx expo start --clear` after changes

---

## Visual QA Checklist

**Particles:**
- [ ] No particles below 5% amp
- [ ] Number particles visible within 2–3 seconds at 20% amp
- [ ] Roughly 1 in 3 particles shows the amp number at 20% amp
- [ ] Particle count, size, speed and travel distance increase with amp
- [ ] At 90%+ amp — dense particle streams clearly visible
- [ ] Particles drift both left and right
- [ ] Particles dissolve smoothly — never pop out
- [ ] Particle zones never intercept touch events
- [ ] No memory buildup after 20+ rounds — particle cleanup working

**Border glow:**
- [ ] Glow absent below 25% amp
- [ ] Clear horizontal bias — left and right edges brighter
- [ ] Intensity builds across 25–100% range
- [ ] No conflict with rarity glow system (Epic particles, Legendary shimmer)

**Shake:**
- [ ] No shake below 90% amp
- [ ] Subtle tremor at 90%
- [ ] Clearly more frantic at 98–99%
- [ ] Stops immediately when amp drops below 90%
- [ ] Stops immediately when slam fires, resumes after if amp still ≥ 90%
- [ ] Haptic fires once on crossing 90% — not repeatedly
- [ ] Pauses when navigating away from BattleScreen

**Performance:**
- [ ] BattleScreen >55fps with particles + shake running simultaneously
- [ ] Zero TypeScript errors
