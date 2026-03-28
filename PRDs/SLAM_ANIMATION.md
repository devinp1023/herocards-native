# HeroCards — Attack Slam Animation
**Target files:** `src/hooks/useBattle.ts`, `src/screens/BattleScreen.tsx`  
**Goal:** A choreographed card slam animation on player attack, with distinct weight and feel for Light, Medium, and Heavy attacks. Inspired by Pokémon TCG Pocket's attack animations.

---

## Architecture Constraints (read before touching anything)

- **`useBattle.ts`** owns all battle state and animation signals — add new signals here
- **`BattleScreen.tsx`** consumes signals and drives visual output — add animated styles and overlay Views here
- **`DisplaySnapshot` pattern** — state is snapshotted atomically on each `refresh()` call. The slam animation fires off a signal; HP update and damage number happen in the same `refresh()` so damage appears at impact peak
- **`aiAttackKey`** is the existing pattern for AI lunge signals — follow the same pattern for player slam
- **Do not** add animation logic to `useGameState.ts` or `useFirebase.ts`
- **Do not** modify `battleEngine.ts` — pure logic, no side effects
- Run `npx tsc --noEmit` after each step — must pass with zero errors

---

## Animation Overview

Each attack type has a distinct personality:

| Attack | Feel | Speed | Travel | Squash | Screen Flash | Shockwave |
|--------|------|-------|--------|--------|--------------|-----------|
| Light  | Quick flick, snappy return | Fast | Short | Minimal | None | Small, fast fade |
| Medium | Confident strike, clean return | Medium | Mid | Moderate | Subtle | Medium ring |
| Heavy  | Slow wind-up, devastating slam, dramatic return | Slow wind-up + fast slam | Full | Strong | White flash | Large burst + second ring |

---

## Step 1 — Animation config constants

Add to `src/data/constants.ts`:

```ts
export const SLAM_CONFIG = {
  LIGHT: {
    liftHeight: 10,          // px upward before slam
    liftDuration: 80,        // ms
    liftScale: 1.03,         // card grows slightly on lift
    slamDuration: 140,       // ms — fast flick
    slamDistance: 90,        // px toward opponent
    squashY: 0.96,           // scaleY compression during slam
    holdDuration: 40,        // ms at impact before return
    returnDamping: 18,       // spring damping on return
    returnStiffness: 280,    // spring stiffness on return
    shockwaveScale: 1.8,     // max scale of shockwave ring
    shockwaveDuration: 260,  // ms for shockwave to expand + fade
    shockwaveBorderWidth: 1.5,
    flashOpacity: 0,         // no flash for light
    hapticLift: 'Light',
    hapticImpact: 'Medium',
  },
  MEDIUM: {
    liftHeight: 16,
    liftDuration: 110,
    liftScale: 1.05,
    slamDuration: 190,
    slamDistance: 140,
    squashY: 0.91,
    holdDuration: 55,
    returnDamping: 14,
    returnStiffness: 220,
    shockwaveScale: 2.4,
    shockwaveDuration: 350,
    shockwaveBorderWidth: 2,
    flashOpacity: 0.18,
    hapticLift: 'Light',
    hapticImpact: 'Heavy',
  },
  HEAVY: {
    liftHeight: 24,
    liftDuration: 200,       // slow wind-up — the delay creates anticipation
    liftScale: 1.08,
    slamDuration: 160,       // fast slam after slow wind-up — contrast is the key
    slamDistance: 200,
    squashY: 0.82,           // strong compression
    holdDuration: 80,        // longer hold at impact — lets the moment breathe
    returnDamping: 10,
    returnStiffness: 160,    // softer spring — heavier card settles slowly
    shockwaveScale: 3.4,
    shockwaveDuration: 500,
    shockwaveBorderWidth: 3,
    flashOpacity: 0.32,      // visible white flash
    hapticLift: 'Medium',
    hapticImpact: 'Heavy',   // trigger Heavy twice — once at lift, once at impact
  },
} as const

export type AttackLabel = 'LIGHT' | 'MEDIUM' | 'HEAVY' | 'REST'
```

---

## Step 2 — New signals in `useBattle.ts`

Add these shared values near the existing `aiAttackKey` signal. All are Reanimated `useSharedValue` — no React state.

```ts
// ── Slam animation signals ──────────────────────────────────────────
// Increments to trigger a new slam sequence. BattleScreen watches this.
const playerSlamKey = useSharedValue(0)

// Which attack type triggered the current slam — drives config selection in BattleScreen
const playerSlamType = useSharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>('MEDIUM')

// 0 = idle, 1 = lifting, 2 = slamming, 3 = at impact, 4 = returning
// BattleScreen derives all transform values from this single progress value
const slamProgress = useSharedValue(0)

// Shockwave signals — separate from slamProgress so they can animate independently
const shockwaveActive = useSharedValue(0)   // increments to trigger shockwave
const shockwave2Active = useSharedValue(0)  // Heavy only — second outer ring

// Screen flash
const flashOpacity = useSharedValue(0)
```

### Trigger function

Add `triggerPlayerSlam` inside `useBattle.ts`, called when the player confirms an attack (before the round resolves):

```ts
const triggerPlayerSlam = useCallback((attackLabel: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
  const cfg = SLAM_CONFIG[attackLabel]

  // Set slam type so BattleScreen knows which config to use
  playerSlamType.value = attackLabel

  // Lift phase
  slamProgress.value = withTiming(1, {
    duration: cfg.liftDuration,
    easing: Easing.out(Easing.quad),
  }, () => {
    // Slam phase — runs after lift completes
    slamProgress.value = withTiming(2, {
      duration: cfg.slamDuration,
      easing: Easing.in(Easing.cubic),  // accelerates into impact
    }, () => {
      // Impact hold
      slamProgress.value = 2.05  // tiny nudge to signal impact frame

      // Trigger shockwave + flash at impact
      shockwaveActive.value += 1
      flashOpacity.value = withSequence(
        withTiming(cfg.flashOpacity, { duration: 35, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) })
      )

      // Heavy only — second shockwave ring with delay
      if (attackLabel === 'HEAVY') {
        shockwave2Active.value = withDelay(120, withTiming(shockwave2Active.value + 1))
      }

      // Hold at impact, then spring back
      slamProgress.value = withDelay(
        cfg.holdDuration,
        withSpring(0, {
          damping: cfg.returnDamping,
          stiffness: cfg.returnStiffness,
          mass: attackLabel === 'HEAVY' ? 1.4 : 1.0,
        })
      )
    })
  })

  // Increment slamKey so BattleScreen effect fires
  playerSlamKey.value += 1
}, [])
```

### Expose via return value

Add to the `useBattle` return object:

```ts
return {
  // ... existing return values ...
  playerSlamKey,
  playerSlamType,
  slamProgress,
  shockwaveActive,
  shockwave2Active,
  flashOpacity,
  triggerPlayerSlam,
}
```

### Call site

In the existing attack handler inside `useBattle.ts`, where the player's attack choice is processed — call `triggerPlayerSlam` before `refresh()`:

```ts
// When player chooses an attack
if (attackLabel !== 'REST') {
  triggerPlayerSlam(attackLabel)
}
// existing refresh() call follows
```

**Verify:** `npx tsc --noEmit` passes.

---

## Step 3 — Derived transform values in `BattleScreen.tsx`

These `useDerivedValue` hooks convert `slamProgress` into actual transform numbers. Add near the top of `BattleScreen`, after destructuring from `useBattle`.

```ts
const { slamProgress, playerSlamType, shockwaveActive, shockwave2Active, flashOpacity, triggerPlayerSlam } = battle

// ── Card transform derivations ──────────────────────────────────────

const slamTranslateY = useDerivedValue(() => {
  const p = slamProgress.value
  const type = playerSlamType.value
  const cfg = SLAM_CONFIG[type]

  if (p <= 0) return 0

  // Phase 1: lift (0 → 1)
  if (p <= 1) {
    return interpolate(p, [0, 1], [0, -cfg.liftHeight])
  }

  // Phase 2: slam toward opponent (1 → 2)
  if (p <= 2) {
    return interpolate(p, [1, 2], [-cfg.liftHeight, -cfg.slamDistance])
  }

  // Past impact — spring handles return, extrapolate clamp
  return -cfg.slamDistance
})

const slamScaleY = useDerivedValue(() => {
  const p = slamProgress.value
  const type = playerSlamType.value
  const cfg = SLAM_CONFIG[type]

  if (p <= 1) return interpolate(p, [0, 1], [1, 1.0])  // no squash on lift

  // Squash peaks at midpoint of slam, recovers at impact
  if (p <= 2) return interpolate(p, [1, 1.5, 2], [1.0, cfg.squashY, 0.97])

  return 1
})

const slamScale = useDerivedValue(() => {
  const p = slamProgress.value
  const type = playerSlamType.value
  const cfg = SLAM_CONFIG[type]

  // Card grows slightly on lift — feels like it's powering up
  if (p <= 1) return interpolate(p, [0, 1], [1, cfg.liftScale])
  if (p <= 2) return interpolate(p, [1, 2], [cfg.liftScale, 1.0])
  return 1
})

// Animated style object for the player card wrapper
const playerCardAnimatedStyle = useAnimatedStyle(() => ({
  transform: [
    { translateY: slamTranslateY.value },
    { scaleY: slamScaleY.value },
    { scale: slamScale.value },
  ],
}))
```

---

## Step 4 — Shockwave ring component

Add this component at the top of `BattleScreen.tsx` (or extract to `src/components/Shockwave.tsx`):

```tsx
interface ShockwaveProps {
  triggerKey: SharedValue<number>
  color: string
  maxScale: number
  duration: number
  borderWidth: number
  size?: number  // base diameter — default 60
}

function Shockwave({ triggerKey, color, maxScale, duration, borderWidth, size = 60 }: ShockwaveProps) {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useAnimatedReaction(
    () => triggerKey.value,
    (current, previous) => {
      if (current !== previous && current > 0) {
        // Reset and fire
        scale.value = 0.3
        opacity.value = 0.9
        scale.value = withTiming(maxScale, {
          duration,
          easing: Easing.out(Easing.quad),
        })
        opacity.value = withTiming(0, {
          duration: duration * 0.9,
          easing: Easing.in(Easing.quad),
        })
      }
    }
  )

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth,
          borderColor: color,
          backgroundColor: 'transparent',
          // Center on the AI card impact point
          alignSelf: 'center',
        },
        animStyle,
      ]}
    />
  )
}
```

---

## Step 5 — Screen flash overlay

Add a full-screen flash `View` as the **topmost** child of the `BattleScreen` root View, with `pointerEvents="none"` so it never blocks touches:

```tsx
// At the very end of BattleScreen JSX, inside the root View
const flashAnimStyle = useAnimatedStyle(() => ({
  opacity: flashOpacity.value,
}))

// ...

<Animated.View
  pointerEvents="none"
  style={[
    StyleSheet.absoluteFill,
    { backgroundColor: '#ffffff', zIndex: 999 },
    flashAnimStyle,
  ]}
/>
```

---

## Step 6 — Haptics timing

Add `expo-haptics` calls inside `triggerPlayerSlam` in `useBattle.ts`. These must be called on the JS thread (not worklet), so use `runOnJS`:

```ts
// At the start of triggerPlayerSlam (lift moment)
runOnJS(Haptics.impactAsync)(
  cfg.hapticLift === 'Light'
    ? Haptics.ImpactFeedbackStyle.Light
    : Haptics.ImpactFeedbackStyle.Medium
)

// At impact — inside the slamProgress impact callback
runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy)

// Heavy only — second haptic pulse at the second shockwave
if (attackLabel === 'HEAVY') {
  // Delay matches shockwave2 delay (120ms)
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, 120)
}
```

---

## Step 7 — Wire up in `BattleScreen.tsx`

### Player card wrapper

Wrap the player's active card section in an `Animated.View` using `playerCardAnimatedStyle`:

```tsx
<Animated.View style={playerCardAnimatedStyle}>
  {/* existing player active card rendering */}
</Animated.View>
```

### Shockwave placement

Place the shockwave rings absolutely positioned over the **AI card zone**, centered on the AI active card. The impact point should be the vertical midpoint of the AI card:

```tsx
{/* AI card zone — existing JSX */}
<View style={{ position: 'relative' }}>
  {/* existing AI card */}

  {/* Shockwave rings — rendered on top of AI card */}
  <Shockwave
    triggerKey={shockwaveActive}
    color={playerTypeColor}   // use the attacking card's type color
    maxScale={SLAM_CONFIG[currentSlamType].shockwaveScale}
    duration={SLAM_CONFIG[currentSlamType].shockwaveDuration}
    borderWidth={SLAM_CONFIG[currentSlamType].shockwaveBorderWidth}
    size={70}
  />

  {/* Heavy only — second outer ring */}
  <Shockwave
    triggerKey={shockwave2Active}
    color={playerTypeColor}
    maxScale={SLAM_CONFIG.HEAVY.shockwaveScale * 0.65}
    duration={SLAM_CONFIG.HEAVY.shockwaveDuration * 1.2}
    borderWidth={1}
    size={70}
  />
</View>
```

### REST attack — no slam

When the player chooses REST, skip `triggerPlayerSlam` entirely. The card should stay in place.

### Damage number timing

The existing floating damage number should appear at the **impact moment** — when `slamProgress` reaches `2.0`. Since `refresh()` is called in the same tick as `triggerPlayerSlam`, the damage number state update is already queued. You may want to delay the damage number's *appearance* animation by `cfg.liftDuration + cfg.slamDuration` ms so it visually pops at impact rather than immediately:

```ts
// In the damage number reveal animation
const revealDelay = attackLabel !== 'REST'
  ? SLAM_CONFIG[attackLabel].liftDuration + SLAM_CONFIG[attackLabel].slamDuration
  : 0

damageOpacity.value = withDelay(revealDelay, withTiming(1, { duration: 80 }))
```

---

## Step 8 — AI lunge update (optional but recommended)

The existing AI lunge uses a simpler animation. Now that the player slam is choreographed, the AI lunge looks comparatively plain. Consider giving the AI lunge the same treatment using `SLAM_CONFIG.MEDIUM` as a baseline — the AI doesn't telegraph its attack type the same way, so medium weight is appropriate regardless of what the AI actually chose.

Mirror the structure from Steps 2–3 but for the AI card, triggered by `aiAttackKey`.

---

## Testing Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] Light attack: snappy lift, fast flick, small shockwave, no flash, quick return
- [ ] Medium attack: confident lift, solid slam, medium ring, subtle flash, clean return
- [ ] Heavy attack: slow wind-up pause is noticeable (anticipation), fast slam, large burst + second ring, white flash, slow heavy spring return
- [ ] REST: no animation fires, card stays still
- [ ] Damage number appears at impact peak, not before card moves
- [ ] Shockwave color matches attacking card's type color
- [ ] Screen flash does not block touches (`pointerEvents="none"`)
- [ ] Haptics fire at correct moments — lift and impact distinct
- [ ] Heavy haptic has two pulses (lift + impact + second ring)
- [ ] Animation completes cleanly before next round input is accepted — check `disabled` state gating
- [ ] No animation jank on lower-end devices — profile with Flipper if needed
- [ ] AI lunge still works correctly (not broken by changes)
- [ ] `npx expo start --clear` — clean boot with no errors

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/data/constants.ts` | Add `SLAM_CONFIG` and `AttackLabel` type |
| `src/hooks/useBattle.ts` | Add slam shared values, `triggerPlayerSlam`, expose in return |
| `src/screens/BattleScreen.tsx` | Add derived styles, `Shockwave` component, flash overlay, wire up player card wrapper |

---

## Notes for Claude Code

- `slamProgress` drives all card transform values via `useDerivedValue` — never drive transforms directly from `withTiming`/`withSpring` as that makes them harder to derive from
- The `useAnimatedReaction` in `Shockwave` is the correct pattern for responding to a signal increment — do not use `useEffect` with a shared value
- `runOnJS` is required for haptics since `Haptics.impactAsync` is not a worklet
- The `withDelay` inside the spring return creates the hold-at-impact pause — do not use `setTimeout` for animation sequencing
- Keep `SLAM_CONFIG` values in `constants.ts` so they can be tuned without touching animation logic
- If the animation feels too slow on device, reduce `liftDuration` first — the lift phase is where most of the "sluggishness" perception comes from
