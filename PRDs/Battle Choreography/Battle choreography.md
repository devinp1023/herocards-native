# HeroCards — Battle Choreography PRD

## Goal
Transform the battle from a rapid-fire state machine into a cinematic, readable experience. Every round should feel like a turn in Pokémon TCG Pocket — each beat gets its own moment, and the player always knows what just happened and what's coming next.

## Design Philosophy
- **One thing at a time.** Never overlap two meaningful events. The player should never wonder "wait, what just happened?"
- **Breathe between beats.** Dead space isn't wasted — it's processing time for the player.
- **Announce → Execute → Settle.** Each major action has a lead-in, a climax, and a resolution before the next action begins.
- **Round boundaries are visible.** The player should always feel the clean edge between "this round" and "next round."
- **Symmetry.** The AI gets the exact same animations as the player. Both sides slam, both sides get shockwaves and screen flash, both sides get damage popups and action labels. The battle should feel like two equally cinematic opponents.

## Key Reference
- **Slam Animation spec:** `PRDs/SLAM_ANIMATION.md` — defines `SLAM_CONFIG` with per-weight parameters (Light/Medium/Heavy), shockwave rings, screen flash, haptic timing. This PRD builds on that spec and extends it to cover the full round lifecycle.

## Current Problems
- `STEP_MS = 1000` is the only timing lever, and it's too fast for the density of events happening at each step.
- Multiple things resolve at once: damage is applied, HP bars update, hit keys fire, amp gains happen, and defeat checks run — all in the same `setTimeout` callback.
- No visual separation between round end and round start. The `result` phase auto-advances after 800ms with no visual marker.
- Card draw has no animation — a card simply appears in hand.
- AI actions (draw, swap, rest) resolve silently with no visual indicator.
- Defeat → replacement flows instantly — a card dies and the replacement appears in the same visual beat.
- The player has no attack animation — only the AI has a basic lunge (`lungeY`, 28px over 110ms). The slam spec (SLAM_ANIMATION.md) defines a full player slam but the AI still uses the old basic lunge.

---

## Timing Architecture

### Replace STEP_MS with CHOREO Config
Replace the single `STEP_MS = 1000` constant with a `CHOREO` config object. Attack timing is NOT in this config — attack animations are driven entirely by `SLAM_CONFIG` (defined in `constants.ts` per SLAM_ANIMATION.md). `CHOREO` covers everything else: the pacing between events, labels, transitions, and non-attack moments.

```ts
// src/battle/choreography.ts
import { SLAM_CONFIG } from '../data/constants';

// ── Async step sequencer ────────────────────────────────────
// Replaces nested setTimeout chains with a flat async sequence.
// Each step is a [action, waitMs] tuple — execute the action,
// then wait before proceeding to the next step.
const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type Step = [action: () => void, waitMs: number];

// cancelled: checked between steps — if true, sequence aborts silently.
// Use for forfeit, unmount, or battle end during choreography.
export async function runSteps(steps: Step[], cancelled: () => boolean) {
  for (const [action, ms] of steps) {
    if (cancelled()) return;
    action();
    if (ms > 0) await delay(ms);
  }
}

// Usage: branching goes BETWEEN runSteps calls, not inside callbacks.
// cancelled() typically reads a ref: () => phaseRef.current === 'finished'
//
//   await runSteps([
//     [() => { triggerPlayerSlam(weight); refresh(); }, slamDuration(weight)],
//     [() => { /* damage settle */ refresh(); },        CHOREO.damageSettle],
//     [() => {},                                         CHOREO.postAttackPause],
//   ], cancelled);
//   if (cancelled()) return;
//   if (aKilled) { /* handle death sequence */ }
//   else finishRound(events);

export const CHOREO = {
  // ── Announcements / Labels ──────────────────────────────
  roundBanner:       800,   // "ROUND 3" banner hold time
  actionLabel:       600,   // "REST" / "DRAW" / "SWAP" label hold time

  // ── Attack pacing (gaps around the slam animation) ──────
  // The slam itself is timed by SLAM_CONFIG per-weight.
  // These values control the space AROUND each slam.
  preSlamPause:      200,   // beat after action label fades, before slam begins
  damageSettle:      600,   // HP bar drain + damage number display after slam completes
  postAttackPause:   400,   // breathing room after damage settles, before next beat

  // ── Between two attacks (both-attack rounds) ────────────
  betweenAttacks:    500,   // gap between first and second slam

  // ── Card events ─────────────────────────────────────────
  defeatHold:        800,   // defeated card visible with KO overlay before falling
  defeatFall:        500,   // fall + fade animation (existing DefeatingCardAnim duration)
  defeatGap:         400,   // pause after card disappears, empty slot visible
  replaceDraw:       400,   // new card draws from deck/hand to active position
  replaceEntry:      350,   // new card scale-spring into active slot
  replaceSettle:     300,   // pause after new card is in place

  // ── Card draw from deck ─────────────────────────────────
  drawLift:          250,   // card lifts off deck pile
  drawTravel:        400,   // card travels to hand slot
  drawLand:          200,   // card lands in hand (spring)
  drawSettle:        300,   // pause after draw completes

  // ── Action announcements ────────────────────────────────
  actionShow:        700,   // action label visible (both AI and player)
  actionFade:        200,   // label fade out

  // ── Amp events ──────────────────────────────────────────
  ampTriggerFlash:   400,   // flash when amp hits 100
  ampEffectReveal:   600,   // effect name reveal + glow
  ampEffectHold:     500,   // hold effect name visible

  // ── Round transition ────────────────────────────────────
  roundEndPause:     500,   // pause after last event in round
  roundTransition:  1000,   // round banner entrance + hold + exit
  roundStartDelay:   300,   // pause before controls re-enable
} as const;

// ── Helper: total slam duration for a given weight ────────
// Used by runSteps to know how long to wait for the slam
// animation to complete before proceeding to the next beat.
export function slamDuration(weight: 'LIGHT' | 'MEDIUM' | 'HEAVY'): number {
  const cfg = SLAM_CONFIG[weight];
  return cfg.liftDuration + cfg.slamDuration + cfg.holdDuration + cfg.returnBuffer;
  // returnBuffer is per-weight because withSpring settle time varies
  // with mass/damping. Tuned so the spring is visibly returning but
  // not fully settled — avoids dead gaps (too long) or overlapping
  // beats (too short).
}

// returnBuffer values in SLAM_CONFIG (tune during playtesting):
//   LIGHT:  120  — snappy spring, settles fast
//   MEDIUM: 200  — balanced
//   HEAVY:  300  — high mass (1.4), slower bounce
```

> **Key principle:** `SLAM_CONFIG` defines HOW an attack looks. `CHOREO` defines the SPACE between events. They don't overlap.

---

## Hook Architecture: useBattle vs useBattleChoreography

Split animation orchestration out of `useBattle` into a dedicated `useBattleChoreography` hook.

### `useBattleChoreography` (NEW — `src/hooks/useBattleChoreography.ts`)
**Owns:** All animation shared values (player + AI slam progress, shockwave keys, flash opacity, round banner key, action label, damage event, draw keys, defeat side, amp trigger event).
**Exposes named trigger functions:**

```ts
interface BattleChoreography {
  // ── Slam ──
  triggerPlayerSlam: (weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => void;
  triggerAiSlam:     (weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => void;

  // ── Announcements ──
  showRoundBanner:   () => void;
  showActionLabel:   (text: string, side: 'player' | 'ai') => void;

  // ── Damage ──
  fireDamagePopup:   (side: 'player' | 'ai', amount: number, weight: 'LIGHT' | 'MEDIUM' | 'HEAVY', typeMultiplier: number) => void;

  // ── Card events ──
  fireDrawAnimation: (side: 'player' | 'ai') => void;
  showDefeat:        (side: 'player' | 'ai') => void;
  clearDefeat:       () => void;

  // ── Amp ──
  fireAmpTrigger:    (side: 'player' | 'ai', effect: AmpEffectName) => void;

  // ── Raw shared values (read-only, for BattleScreen derived transforms) ──
  slamProgress:       SharedValue<number>;
  aiSlamProgress:     SharedValue<number>;
  playerSlamType:     SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>;
  aiSlamType:         SharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>;
  shockwaveActive:    SharedValue<number>;
  aiShockwaveActive:  SharedValue<number>;
  shockwave2Active:   SharedValue<number>;
  aiShockwave2Active: SharedValue<number>;
  flashOpacity:       SharedValue<number>;
  roundBannerKey:     number;
  actionLabel:        { text: string; side: 'player' | 'ai'; key: number } | null;
  damageEvent:        { side: 'player' | 'ai'; amount: number; weight: string; typeMultiplier: number; key: number } | null;
  playerDrawKey:      number;
  aiDrawKey:          number;
  defeatSide:         'player' | 'ai' | null;
  ampTriggerEvent:    { side: 'player' | 'ai'; effect: AmpEffectName; key: number } | null;
}
```

### `useBattle`
**Owns:** Battle state machine, round sequencing, AI logic, checkpoint save/resume.
**Calls:** `useBattleChoreography()` and invokes trigger functions at the right moments in `runSteps` sequences. Does not create or manage animation shared values directly.

### `BattleScreen`
**Reads:** Shared values from `useBattleChoreography` return value for `useDerivedValue` / `useAnimatedStyle` transforms. React state signals (`roundBannerKey`, `damageEvent`, etc.) for component rendering.

> **Separation:** `useBattle` decides WHAT happens and WHEN. `useBattleChoreography` decides HOW it looks. `BattleScreen` renders it.

---

## Attack Animation: Unified Slam System

### Current State
- **Player:** No attack animation. Card stays in place during attack.
- **AI:** Basic lunge — `lungeY` animates 28px downward over 110ms with a fixed spring return. Same animation regardless of Light/Medium/Heavy.

### New State: Both Sides Use SLAM_CONFIG

Both the player and AI get the full slam treatment from SLAM_ANIMATION.md:
- **Lift phase** — card rises (player: upward, AI: downward toward their opponent), scales up slightly. Duration from `SLAM_CONFIG[weight].liftDuration`.
- **Slam phase** — card accelerates toward opponent. Duration from `SLAM_CONFIG[weight].slamDuration`.
- **Impact frame** — brief hold at impact point. Shockwave ring(s) expand from the hit card. Screen flash fires. Haptics fire. Damage number appears. Duration from `SLAM_CONFIG[weight].holdDuration`.
- **Return** — spring back to resting position. Damping/stiffness from `SLAM_CONFIG[weight]`.

The only difference between player and AI is **direction**: player slams upward (negative translateY), AI slams downward (positive translateY). All other parameters — lift scale, squash, shockwave size, flash opacity, haptic pattern — are identical.

### AI Weight Selection

The AI already selects attack weight via `aiChooseAttackWeight()` in `battleEngine.ts`. Currently this weight is used for damage calculation but NOT for animation — the AI lunge looks the same regardless. With this change, the AI's chosen weight drives its `SLAM_CONFIG` selection, so AI Heavy attacks look and feel as devastating as player Heavy attacks.

### Signals (extends SLAM_ANIMATION.md Step 2)

The slam spec defines player signals (`playerSlamKey`, `playerSlamType`, `slamProgress`, etc.). Add mirrored AI signals:

```ts
// ── AI Slam animation signals (mirror of player slam) ───────────────
const aiSlamKey = useSharedValue(0);
const aiSlamType = useSharedValue<'LIGHT' | 'MEDIUM' | 'HEAVY'>('MEDIUM');
const aiSlamProgress = useSharedValue(0);
const aiShockwaveActive = useSharedValue(0);
const aiShockwave2Active = useSharedValue(0);
// Screen flash is shared — both sides use the same flashOpacity
```

Add a `triggerAiSlam` function identical to `triggerPlayerSlam` but:
- Drives `aiSlamProgress` instead of `slamProgress`
- Direction is inverted (positive translateY — AI slams downward toward player)
- Shockwave renders on the **player** card (the one being hit)
- Weight comes from `aiChooseAttackWeight()` result

### Shared triggerSlam Helper

Extract common slam logic so both sides use the same function:

```ts
function triggerSlam(
  progress: SharedValue<number>,
  shockwave: SharedValue<number>,
  shockwave2: SharedValue<number>,
  flash: SharedValue<number>,
  weight: 'LIGHT' | 'MEDIUM' | 'HEAVY',
) {
  const cfg = SLAM_CONFIG[weight];
  // Lift → Slam → Impact hold → Spring return
  // (same sequence as SLAM_ANIMATION.md triggerPlayerSlam)
  progress.value = withTiming(1, {
    duration: cfg.liftDuration,
    easing: Easing.out(Easing.quad),
  }, () => {
    progress.value = withTiming(2, {
      duration: cfg.slamDuration,
      easing: Easing.in(Easing.cubic),
    }, () => {
      progress.value = 2.05;
      shockwave.value += 1;
      flash.value = withSequence(
        withTiming(cfg.flashOpacity, { duration: 35 }),
        withTiming(0, { duration: 110 }),
      );
      if (weight === 'HEAVY') {
        shockwave2.value = withDelay(120, withTiming(shockwave2.value + 1));
      }
      progress.value = withDelay(cfg.holdDuration, withSpring(0, {
        damping: cfg.returnDamping,
        stiffness: cfg.returnStiffness,
        mass: weight === 'HEAVY' ? 1.4 : 1.0,
      }));
    });
  });
}

// Player slam
const triggerPlayerSlam = useCallback((weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
  playerSlamType.value = weight;
  triggerSlam(slamProgress, shockwaveActive, shockwave2Active, flashOpacity, weight);
  playerSlamKey.value += 1;
  // Haptics via runOnJS per SLAM_ANIMATION.md Step 6
}, []);

// AI slam
const triggerAiSlam = useCallback((weight: 'LIGHT' | 'MEDIUM' | 'HEAVY') => {
  aiSlamType.value = weight;
  triggerSlam(aiSlamProgress, aiShockwaveActive, aiShockwave2Active, flashOpacity, weight);
  aiSlamKey.value += 1;
  // Haptics via runOnJS
}, []);
```

### Call Sites in useBattle.ts

Replace all instances of `setAiAttackKey(k => k + 1)` with `triggerAiSlam(aiWeight)`.
Wire `triggerPlayerSlam(weight)` at every player attack point (per SLAM_ANIMATION.md).

### Sequencing with runSteps

After triggering a slam, use `runSteps` to wait through each beat:

```ts
await runSteps([
  [() => { triggerPlayerSlam(weight); refresh(); }, slamDuration(weight)],
  [() => { /* HP bar draining, damage number visible */ }, CHOREO.damageSettle],
  [() => {},                                                CHOREO.postAttackPause],
]);
// Branching happens here — flat, not nested
if (aKilled) handleDefeat(events);
else finishRound(events);
```

Each round type (`playerAttacksOnly`, `aiAttacksOnly`, `bothAttack`, `noCombat`) becomes a top-to-bottom async function with `runSteps` calls and `if/else` branching between them.

### Removing the Old AI Lunge

Remove `lungeY` shared value and `lungeStyle` from `AIActiveSection`. Replace with AI slam derived transforms (same `useDerivedValue` pattern as player, inverted Y).

---

## New Animation Signals

Add to `UseBattleResult` (in addition to slam signals above):

| Signal | Type | Purpose |
|--------|------|---------|
| `roundBannerKey` | `number` | Increments at round start → triggers "ROUND N" banner |
| `actionLabel` | `{ text: string, side: 'player'\|'ai', key: number } \| null` | Non-attack action announcement |
| `playerDrawKey` | `number` | Player drew a card → deck-to-hand animation |
| `aiDrawKey` | `number` | AI drew a card → AI deck-to-hand animation |
| `damageEvent` | `{ side: 'player'\|'ai', amount: number, weight: 'LIGHT'\|'MEDIUM'\|'HEAVY', typeMultiplier: number, key: number } \| null` | Damage number popup |
| `ampTriggerEvent` | `{ side: 'player'\|'ai', effect: AmpEffectName, key: number } \| null` | Amp activation moment |
| `defeatSide` | `'player'\|'ai'\|null` | Which side is playing defeat animation |

---

## Round-by-Round Choreography

### A. Round Start
**Current:** Round number increments silently. Phase flips from `result` → `ready` after 800ms.
**New:**

1. **Round banner** — `"ROUND N"` animates in using `MOTION.slam` easing (scale `0 → 1.2 → 1.0`), centered on combat zone. Holds `CHOREO.roundBanner` ms, fades out.
2. Wait `CHOREO.roundStartDelay` before phase → `ready`.

**Visual spec:**
- Text: `Orbitron_900Black`, size 28, color `T.accent.mint`, letterSpacing 4
- Background: semi-transparent pill (`T.bg.elevated + 'dd'`), border `T.accent.mint + '44'`
- Position: centered vertically between AI and player active cards
- `pointerEvents="none"`

### B. Player Attacks (AI doesn't attack)

**Current:** AI action at t=0, player hit at t=STEP_MS, death check at t=2×STEP_MS.
**New:**

1. Phase → `animating`, disable controls
2. **AI action label** — "AI RESTED" / "AI DREW" / "AI SWAPPED" for `CHOREO.actionShow` ms. If AI drew, also play AI draw animation (section E). Fade over `CHOREO.actionFade`.
3. Wait `CHOREO.preSlamPause`
4. **Player slam** — `triggerPlayerSlam(weight)`. Full lift → slam → shockwave → flash → haptic per `SLAM_CONFIG[weight]`. Damage number appears at impact peak.
5. Wait `slamDuration(weight)`
6. **Damage settle** — HP bar drains. Damage number holds. Duration `CHOREO.damageSettle`.
7. Wait `CHOREO.postAttackPause`
8. Death check → **Defeat Sequence** (F) or **Round End** (H)

### C. AI Attacks (Player doesn't attack)

Identical structure to B, mirrored:

1. Phase → `animating`
2. **Player action label** — "RESTED +5 STA" / "DREW A CARD" for `CHOREO.actionShow` ms. If drew, play draw animation.
3. Wait `CHOREO.preSlamPause`
4. **AI slam** — `triggerAiSlam(aiWeight)`. Same full slam, inverted direction. Shockwave on player card. Damage number on player card.
5. Wait `slamDuration(aiWeight)`
6. **Damage settle** — player HP bar drains. Duration `CHOREO.damageSettle`.
7. Wait `CHOREO.postAttackPause`
8. Death check or Round End

### D. Both Attack — Two-way Combat

**Current:** First hit at t=0, second at t=STEP_MS.
**New:**

1. Phase → `animating`
2. **First attacker's full slam sequence** (B.4–B.7 or C.4–C.7 depending on speed/heavy rules)
3. Wait `CHOREO.betweenAttacks`
4. **Second attacker's full slam sequence** (if they survived)
5. Death check → Defeat Sequence or Round End

> **The critical improvement:** The second attack doesn't begin until the first attack's damage has fully settled.

### E. Card Draw from Deck

**Current:** `drawCard()` runs, card instantly appears in hand. No visual.

**Player draw:**
1. Top card lifts off deck — slight scale-up + tilt. Duration `CHOREO.drawLift`.
2. Card travels from deck to rightmost hand slot along curved arc. Duration `CHOREO.drawTravel`. Face-down during travel.
3. Card lands in hand with `withSpring` scale. Duration `CHOREO.drawLand`.
4. Wait `CHOREO.drawSettle`.
5. Hand state updates after `drawLift + drawTravel + drawLand` to sync with animation.

**AI draw (same treatment):**
1. AI deck pile shrinks.
2. Card-back lifts from AI deck, travels to AI hand area.
3. AI hand gains new face-down card with slide-in.
4. Wait `CHOREO.drawSettle`.

### F. Card KO + Replacement

**Current:** `DefeatingCardAnim` plays 500ms, replacement appears almost instantly.
**New (same for both sides):**

1. **KO overlay** — defeated card holds for `CHOREO.defeatHold` ms with pulsing red vignette.
2. **Defeat fall** — existing fall+fade animation. Duration `CHOREO.defeatFall`.
3. Wait `CHOREO.defeatGap` — empty slot visible.
4. **Replacement:**
   - AI: card animates from AI hand to active slot. Duration `CHOREO.replaceDraw + CHOREO.replaceEntry`.
   - Player: phase → `selecting`, then chosen card animates from hand to active. Duration `CHOREO.replaceEntry`.
5. Wait `CHOREO.replaceSettle`.

### G. Amp Trigger / Effect Activation

**Current:** Runs silently.
**New (same for both sides):**

1. Both amp particle systems pulse to max. Screen dims 20%. Duration `CHOREO.ampTriggerFlash`.
2. `AmpEffectLabel` pulses/scales in effect color. "TRIGGERED" sub-label. Duration `CHOREO.ampEffectReveal`.
3. Hold `CHOREO.ampEffectHold` ms.
4. Resume.

**Amp Spend (reroll):** Effect label text scrambles through 2–3 names → lands on new one. ~800ms total.

### H. Round End → Round Start

**Current:** `finishRound()` → `result` → 800ms → `ready`.
**New:**

1. Post-round bleed ticks: brief damage numbers + small shake per tick (~400ms each).
2. Wait `CHOREO.roundEndPause`.
3. Round banner "ROUND N+1" animates in. Duration `CHOREO.roundTransition`.
4. Wait `CHOREO.roundStartDelay`.
5. Phase → `ready`.

### I. Rest Action (both sides)

1. Card pulses green/vitality glow. "+5 STA" floats up from stamina bar. Duration `CHOREO.actionLabel`.
2. Stamina bar animates up.

**Sequencing rule:** Non-attack actions always resolve visually FIRST, before the opponent's slam. This matches the game logic (rest/draw/swap happen before attacks land) and ensures the player understands what happened before damage appears.

**Rest + opponent attacks:**
1. Phase → `animating`
2. Rest animation plays (green glow + "+5 STA" float). Duration `CHOREO.actionShow`.
3. Wait `CHOREO.preSlamPause`
4. Opponent's full slam sequence (same as B.4–B.7 or C.4–C.7)
5. Death check → Defeat Sequence or Round End

**Both sides rest / both non-attack:**
1. Phase → `animating`
2. Both action labels show simultaneously. Duration `CHOREO.actionShow`.
3. Wait `CHOREO.actionFade`
4. Round End (H)

### J. Swap Action (both sides)

1. **Swap out** — active card shrinks + slides toward hand. ~300ms.
2. **Swap in** — new card animates from hand to active with `withSpring` scale. Duration `CHOREO.replaceEntry`.
3. Wait `CHOREO.replaceSettle`.

**Swap + opponent attacks:**
1. Phase → `animating`
2. Swap animation plays (swap out → swap in → settle). The opponent's slam targets the NEW card — this matches game logic where swaps resolve before attacks.
3. Wait `CHOREO.preSlamPause`
4. Opponent's full slam sequence hits the newly swapped-in card
5. Death check → Defeat Sequence or Round End

**Swap + opponent rests/draws:**
1. Phase → `animating`
2. Swap animation plays
3. Opponent action label shows. Duration `CHOREO.actionShow`.
4. Round End (H)

---

## New UI Components

### 1. `RoundBanner`
**Props:** `round: number`, `bannerKey: number`
**Behavior:** On `bannerKey` change → scale `0 → 1.2 → 1.0` using `MOTION.slam` → hold `CHOREO.roundBanner` → fade. `pointerEvents="none"`.
**Position:** Centered in combat zone between both active cards.

### 2. `DamagePopup`
**Props:** `amount: number`, `weight: 'LIGHT'|'MEDIUM'|'HEAVY'`, `typeMultiplier: number`, `triggerKey: number`
**Styling by weight:** Light = `T.font.lg` white, Medium = `T.font.xl` white, Heavy = `T.font.xxl` red-tinted.
**Styling by type:** ×2.0 = gold + "SUPER EFFECTIVE" sub-label, ×0.5 = dimmed + "RESISTED" sub-label.
**Animation:** Appears at slam impact (delayed by `liftDuration + slamDuration`). Scale `0 → 1.2 → 1.0`, float up ~20px over `CHOREO.damageSettle`, fade.
**Rendered on BOTH** `PlayerActiveSection` and `AIActiveSection`.

### 3. `ActionLabel`
**Props:** `text: string | null`, `side: 'player'|'ai'`, `triggerKey: number`
**Position:** Centered above respective active card.
**Visual:** `Orbitron_700Bold`, `T.font.md`, semi-transparent pill background.
**Animation:** Fade in + slide up 10px → hold `CHOREO.actionShow` → fade over `CHOREO.actionFade`.
**Used for BOTH sides.**

### 4. `DrawCardAnimation`
**Props:** `triggerKey: number`, `fromBounds: LayoutRectangle`, `toBounds: LayoutRectangle`, `side: 'player'|'ai'`
**Bounds source:** Use `onLayout` callbacks on deck and hand containers, cached in refs — NOT `measureInWindow` (unreliable during animations and before layout settles). Deck and hand containers share a common parent in BattleScreen, so `onLayout` coordinates (relative to parent) are consistent. If cross-parent measurement is needed, sum offsets from nested `onLayout` calls.
**Animation:** Card-back lifts from deck → curved bezier to hand → spring landing. Player draws flip face-up midway.
**Used for BOTH sides.**

### 5. `Shockwave` (from SLAM_ANIMATION.md Step 4)
Expanding ring at impact point. Uses `useAnimatedReaction` on trigger key.
**Rendered on BOTH sides** — appears on whichever card got hit.

---

## Existing Implementation (Pre-Sprint Audit)

The following already exist and do NOT need to be built from scratch:

| Item | Location | Status |
|------|----------|--------|
| `SLAM_CONFIG` (3 weights, 14 fields each) | `constants.ts:133–186` | Complete (no `returnBuffer` yet) |
| Player slam shared values (6 values) | `useBattle.ts:166–173` | Complete, exported |
| `triggerPlayerSlam()` | `useBattle.ts:185–239` | Complete, wired at all attack points |
| AI slam animation | `BattleScreen.tsx:268–312` | Works but local to `AIActiveSection`, always MEDIUM |
| `aiShockwaveActive` | `useBattle.ts:173` | Exported, wired |
| `Shockwave` component | `BattleScreen.tsx:185–241` | Inline, 3 instances (player×2, AI×1) |
| Screen flash overlay | `BattleScreen.tsx:1473–1481` | Complete, driven by `flashOpacity` |
| `STEP_MS = 1000` | `useBattle.ts:263` | Active, 17 references |

**What does NOT exist yet:** `RoundBanner`, `DamagePopup`, `ActionLabel`, `DrawCardAnimation`, KO polish, amp trigger moment.

---

## Implementation Plan

### Sprint 1: Timing Foundation + Hook Extraction — COMPLETE
**Goal:** Create `choreography.ts`, extract `useBattleChoreography`, replace `STEP_MS` with `CHOREO` + `runSteps`.

1. Create `src/battle/choreography.ts` with `CHOREO` config, `slamDuration()` helper, `runSteps()` sequencer
2. Add `returnBuffer` field to each weight in `SLAM_CONFIG` (LIGHT: 120, MEDIUM: 200, HEAVY: 300)
3. Create `src/hooks/useBattleChoreography.ts` — move all existing slam shared values (`slamProgress`, `playerSlamKey`, `playerSlamType`, `shockwaveActive`, `shockwave2Active`, `flashOpacity`, `aiShockwaveActive`) out of `useBattle` into this hook. Expose named trigger functions.
4. Update `useBattle` to call `useBattleChoreography()` and use trigger functions instead of direct shared value manipulation
5. Replace all 17 `STEP_MS` references in `useBattle.ts` with `CHOREO.*` values
6. Convert nested `setTimeout` chains to `runSteps()` with `cancelled` check
7. Update `result` → `ready` auto-advance to `CHOREO.roundEndPause + CHOREO.roundTransition + CHOREO.roundStartDelay`
8. Add `roundBannerKey` signal to `useBattleChoreography`
9. Playtest and tune values

**Validation:** Battle pacing is noticeably different. Each step is distinguishable. No `STEP_MS` references remain. All slam animations still work.

### Sprint 2: AI Slam Refactor + Weight Variation — COMPLETE
**Goal:** AI gets full weight-varied slam via `useBattleChoreography`, replacing local `lungeY` approach.

1. Add AI slam signals to `useBattleChoreography`: `aiSlamKey`, `aiSlamType`, `aiSlamProgress`, `aiShockwave2Active`
2. Implement `triggerAiSlam(weight)` in `useBattleChoreography` — mirrors `triggerPlayerSlam` with inverted Y direction
3. Extract shared `triggerSlam()` helper used by both `triggerPlayerSlam` and `triggerAiSlam`
4. AI slam derived transforms in `BattleScreen` — same `useDerivedValue` pattern as player, positive translateY
5. Remove old `lungeY`/`lungeScale`/`lungeSquash`/`lungeStyle` from `AIActiveSection`
6. Wire `triggerAiSlam(aiWeight)` at all AI attack points (replace `setAiAttackKey` / `attackKey` increment)
7. AI screen flash uses shared `flashOpacity` (currently AI has local `flashOp`)
8. Add second shockwave instance for AI Heavy attacks
9. Verify both-attack rounds: sequential slams with `CHOREO.betweenAttacks` gap

**Validation:** AI Light/Medium/Heavy look distinct. AI Heavy has slow windup + dual shockwaves. Flash fires from shared overlay for both sides.

### Sprint 3: Round Banner + Action Labels — COMPLETE
**Goal:** Visual markers for transitions and action announcements.

1. Build `RoundBanner` component with `MOTION.slam` easing
2. Wire to `roundBannerKey` from `useBattleChoreography` in `BattleScreen`
3. Add `actionLabel` signal to `useBattleChoreography` + `showActionLabel()` trigger
4. Build `ActionLabel` component
5. Wire all non-attack actions for BOTH sides (rest, draw, swap labels)
6. Add rest visual (green glow + "+5 STA" float) for BOTH sides
7. Verify non-attack-then-attack sequencing: label resolves before opponent's slam

### Sprint 4: External HP/STA Bars + Damage & Stamina Popups — COMPLETE
**Goal:** Battle HUD bars that extend beyond card edges, inline damage/stamina popups.

1. Add `damageEvent` signal to `useBattleChoreography` + `fireDamagePopup()` trigger
2. Add `staminaEvent` signal to `useBattleChoreography` + `fireStaminaPopup()` trigger
3. Build `ExternalHpBar` — extends 40px beyond each card edge, full-width track with gloss, low-HP pulse, inline -N damage popup
4. Build `ExternalStaBar` — same width as HP bar, pip-based stamina display, inline +N/-N stamina popup
5. Hide in-card HP/STA sections during battle (`hideHpBar`, `hideStaBar` props on HeroCard)
6. Damage popup appears to right of HP number (absolutely positioned, no layout shift)
7. Stamina popup appears to right of STA number — +N green on rest, -N red on attack
8. Return `staminaCost` from `executeAttack()` to power the -N popup
9. Remove "RESTED +5 STA" action label (STA bar popup replaces it)
10. Add thin white stroke to all progress bars app-wide

### Sprint 5: Card Draw Animation — COMPLETE
**Goal:** Drawing is visible for BOTH sides.

1. Add `drawEvent` signal to `useBattleChoreography` + `fireDrawAnimation()` trigger
2. Build `DrawCardAnimation` component — 3-phase Pokemon TCG Pocket-style player draw (card-back exit → full HeroCard reveal with dark overlay → shrink to hand slot), simple card-back flight for AI
3. Add `onLayout` + `measureInWindow` callbacks to deck and hand containers in `BattleScreen`, cache bounds in refs
4. Delay state update to sync with animation — card appears in hand only after animation lands
5. Player: card-back slides off screen → card front slides up as big reveal → card shrinks into hand
6. AI: card-back → travel → land as face-down

### Sprint 6: KO + Replacement Polish — COMPLETE
**Goal:** Dramatic defeats and readable replacements for BOTH sides.

1. Add `defeatSide` signal to `useBattleChoreography` + `showDefeat()`/`clearDefeat()` triggers
2. KO overlay (pulsing red vignette) during `CHOREO.defeatHold` — BOTH sides
3. `CHOREO.defeatGap` pause after fall
4. `choreographDefeat` async helper replaces all inline death handling with choreographed `runSteps` sequences
5. AI replacement: delayed by KO hold + fall + gap, then card springs into active slot
6. Player replacement: same choreographed gap before `selecting` phase begins

### Sprint 7: Amp Activation Moment — COMPLETE
**Goal:** Amp triggers feel cinematic for BOTH sides.

1. Add `ampActivation` signal to `useBattleChoreography` + `fireAmpActivation()` trigger
2. Trigger sequence: screen dims 20%, effect label bursts with "ACTIVATED" sub-label, 2.2s choreographed pause
3. Spend/reroll text scramble animation — cycles through 3 random effect names before landing on new one
4. Same visual for player and AI triggers — `processAiAmp` returns action type, callers add choreography waits

---

## Timing Budget

Both-attack round (Medium vs Medium, no KOs):

| Beat | Duration |
|------|----------|
| Round banner + start delay | ~1,100ms |
| First slam (Medium) | ~555ms |
| Damage settle + pause | ~1,000ms |
| Between attacks | 500ms |
| Second slam (Medium) | ~555ms |
| Damage settle + pause | ~1,000ms |
| Round end pause | 500ms |
| **Total** | **~5,210ms** |

Single attacker: ~3,200ms. Non-combat (both rest/draw): ~2,500ms.

**Tuning order if too slow:**
1. `CHOREO.damageSettle` (600 → 400)
2. `CHOREO.roundBanner` (800 → 500)
3. `CHOREO.postAttackPause` (400 → 200)
4. Do NOT compress `SLAM_CONFIG` durations — they make attacks feel weighty

---

## Battle Save/Resume During Choreography

The current system saves a checkpoint to Firestore at each `'ready'` phase. The `'animating'` phase introduced by this PRD can last up to ~5 seconds. If the app closes mid-choreography, the battle must resume cleanly.

### Rules
- **Never save during `'animating'` phase.** Checkpoints only fire at `'ready'` (unchanged from current behavior).
- **Never call `refresh()` between two slams in a both-attack round.** All state mutations (HP changes, kills, amp gains) accumulate in refs during the choreography sequence. A single `refresh()` commits everything to React state at round end when phase returns to `'ready'`.
- **Resume = replay the round.** If the app dies mid-animation, the last checkpoint was `'ready'` at the start of the round. On resume, both sides re-select actions and the round replays from scratch. No partial state was persisted, so no duplicate damage.
- **Visual-only calls are safe mid-animation.** Trigger functions from `useBattleChoreography` (slams, banners, popups) only touch animation shared values — they don't mutate battle state and don't trigger saves.

### What NOT to do
- Don't add a `refresh()` after the first attacker's damage in a both-attack round — this would snapshot partial state.
- Don't add a Firestore save at any point during `'animating'` — partial round state is not resumable.
- Don't add a new phase like `'animating_checkpoint'` — it adds complexity for no benefit since the round replays cleanly from `'ready'`.

---

## Constraints
- All animations: `react-native-reanimated` shared values, transforms + opacity only
- Shockwave uses `useAnimatedReaction` (NOT `useEffect`) per SLAM_ANIMATION.md
- Haptics use `runOnJS` — `Haptics.impactAsync` is not a worklet
- `DisplaySnapshot` pattern unchanged — signals drive animations
- `runSteps()` async sequencer replaces nested `setTimeout` chains — flat, readable choreography scripts with branching between steps, not inside callbacks. No new dependencies (Promise wrapper around `setTimeout`).
- `runSteps()` takes a `cancelled` callback — check between steps and after each `await runSteps()` call. Forfeit sets phase to `'finished'`, so `cancelled = () => phaseRef.current === 'finished'`. This prevents state updates on unmounted components.
- `SLAM_CONFIG` in `constants.ts`, `CHOREO` in `src/battle/choreography.ts`
- `npx tsc --noEmit` zero errors after each sprint

---

## Files Changed

| File | Changes |
|------|---------|
| `src/data/constants.ts` | `SLAM_CONFIG` + `AttackLabel` type (per SLAM_ANIMATION.md) + `returnBuffer` field per weight |
| `src/battle/choreography.ts` | **NEW** — `CHOREO` config, `slamDuration()` helper, `runSteps()` sequencer |
| `src/hooks/useBattleChoreography.ts` | **NEW** — owns all animation shared values + exposes named trigger functions (see below) |
| `src/hooks/useBattle.ts` | Replace `STEP_MS`, call `useBattleChoreography()` trigger functions at sequencing points, remove direct shared value management for animations |
| `src/screens/BattleScreen.tsx` | Player + AI slam derived transforms, `Shockwave` on both sides, flash overlay, `RoundBanner`, `DamagePopup`, `ActionLabel`, `DrawCardAnimation`, KO overlay, replacement animations, remove old `lungeY`/`lungeStyle` |
| `src/components/Shockwave.tsx` | **NEW** (optional — can stay in BattleScreen) |

---

## Notes for Claude Code
- AI slam is a **mirror** of player slam — only translateY direction differs. Use the shared `triggerSlam()` helper, don't copy-paste.
- Both-attack rounds: first slam must fully complete (`slamDuration(firstWeight)`) before second begins. Never fire both simultaneously.
- `slamProgress` and `aiSlamProgress` are independent — spring return overlap between sequential slams is fine and looks natural.
- Damage numbers: use `useAnimatedReaction` on shared value for sub-frame precision, NOT `useEffect` with React state.
- `slamDuration()` uses per-weight `returnBuffer` — spring return is visibly underway, but we don't wait for full settle.
- If `SLAM_CONFIG` doesn't exist yet, add it per SLAM_ANIMATION.md Step 1 before Sprint 2.
- `useBattle` should NEVER create animation shared values directly — all shared values live in `useBattleChoreography`. `useBattle` calls named trigger functions only.
- `BattleScreen` destructures both hooks — battle state from `useBattle`, animation values from `useBattleChoreography`.
