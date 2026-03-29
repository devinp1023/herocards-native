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
// Used by setTimeout chains to know how long to wait for the
// slam animation to complete before proceeding to the next beat.
export function slamDuration(weight: 'LIGHT' | 'MEDIUM' | 'HEAVY'): number {
  const cfg = SLAM_CONFIG[weight];
  return cfg.liftDuration + cfg.slamDuration + cfg.holdDuration + 200;
  // +200 accounts for the spring return starting — we don't need to
  // wait for the full spring settle, just enough that it's clearly returning.
}
```

> **Key principle:** `SLAM_CONFIG` defines HOW an attack looks. `CHOREO` defines the SPACE between events. They don't overlap.

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

### setTimeout Delays

After triggering a slam, wait `slamDuration(weight)` before the next beat:

```ts
triggerPlayerSlam(weight);
refresh();
setTimeout(() => {
  // Damage has settled — HP bar drained, damage number fading
  setTimeout(() => {
    // Post-attack pause complete, proceed to death check or next beat
  }, CHOREO.damageSettle + CHOREO.postAttackPause);
}, slamDuration(weight));
```

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
3. Opposing side's action resolves.

### J. Swap Action (both sides)

1. **Swap out** — active card shrinks + slides toward hand. ~300ms.
2. **Swap in** — new card animates from hand to active with `withSpring` scale. Duration `CHOREO.replaceEntry`.
3. Wait `CHOREO.replaceSettle`.
4. Opposing side's action resolves.

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
**Props:** `triggerKey: number`, `fromBounds: Bounds`, `toBounds: Bounds`, `side: 'player'|'ai'`
**Animation:** Card-back lifts from deck → curved bezier to hand → spring landing. Player draws flip face-up midway.
**Used for BOTH sides.**

### 5. `Shockwave` (from SLAM_ANIMATION.md Step 4)
Expanding ring at impact point. Uses `useAnimatedReaction` on trigger key.
**Rendered on BOTH sides** — appears on whichever card got hit.

---

## Implementation Plan

### Sprint 1: Timing Foundation + CHOREO Config
**Goal:** Replace `STEP_MS` with `CHOREO` named delays. No new animations — just pacing.

1. Create `src/battle/choreography.ts` with `CHOREO` config and `slamDuration()` helper
2. Verify `SLAM_CONFIG` exists in `constants.ts` (per SLAM_ANIMATION.md) — add if missing
3. Replace all `STEP_MS` in `useBattle.ts` with `CHOREO.*` values
4. Update `result` → `ready` auto-advance to `CHOREO.roundEndPause + CHOREO.roundTransition + CHOREO.roundStartDelay`
5. Add `roundBannerKey` signal
6. Playtest and tune values

**Validation:** Battle feels noticeably slower. Each step is distinguishable.

### Sprint 2: Slam Animation — Both Sides
**Goal:** Full slam system for player AND AI per SLAM_ANIMATION.md.

1. Implement player slam (SLAM_ANIMATION.md Steps 1–7)
2. Add mirrored AI slam signals (`aiSlamKey`, `aiSlamType`, `aiSlamProgress`, `aiShockwaveActive`, `aiShockwave2Active`)
3. Extract shared `triggerSlam()` helper, implement `triggerPlayerSlam()` and `triggerAiSlam()`
4. AI slam derived transforms — same `useDerivedValue` pattern, positive translateY
5. Remove old `lungeY`/`lungeStyle` from `AIActiveSection`
6. Build `Shockwave` component — render on BOTH player and AI cards
7. Shared screen flash overlay
8. Replace `setAiAttackKey(k => k + 1)` with `triggerAiSlam(aiWeight)` everywhere
9. Wire `triggerPlayerSlam(weight)` at all player attack points
10. Verify both-attack rounds: sequential slams with `CHOREO.betweenAttacks` gap

**Validation:** Light/Medium/Heavy feel distinct for BOTH sides. AI Heavy has slow windup. Shockwaves appear on correct card. Flash fires for both.

### Sprint 3: Round Banner + Action Labels
**Goal:** Visual markers for transitions and action announcements.

1. Build `RoundBanner` with `MOTION.slam`
2. Wire to `roundBannerKey` in `BattleScreen`
3. Add `actionLabel` signal
4. Build `ActionLabel` component
5. Wire all non-attack actions for BOTH sides
6. Add rest visual (green glow + "+5 STA" float) for BOTH sides

### Sprint 4: Damage Popup
**Goal:** Damage numbers at slam impact with weight + type styling.

1. Add `damageEvent` signal
2. Build `DamagePopup` with weight and typeMultiplier styling
3. Render on BOTH active card sections
4. Set `damageEvent` at each damage point in `useBattle.ts`
5. Delay appearance by `liftDuration + slamDuration` for impact sync
6. Hold during `CHOREO.damageSettle`, then fade

### Sprint 5: Card Draw Animation
**Goal:** Drawing is visible for BOTH sides.

1. Add `playerDrawKey` and `aiDrawKey` signals
2. Build `DrawCardAnimation` component
3. Measure deck/hand positions via `measureInWindow`
4. Delay state update to sync with animation
5. Player: card-back → travel → flip → land
6. AI: card-back → travel → land as face-down

### Sprint 6: KO + Replacement Polish
**Goal:** Dramatic defeats and readable replacements for BOTH sides.

1. Add `defeatSide` signal
2. KO overlay (pulsing red vignette) during `CHOREO.defeatHold` — BOTH sides
3. `CHOREO.defeatGap` pause after fall
4. AI replacement: card slides from AI hand to active (not instant)
5. Player replacement: after selection, card slides from hand to active
6. Empty deck + draw-then-replace sequence

### Sprint 7: Amp Activation Moment
**Goal:** Amp triggers feel cinematic for BOTH sides.

1. Add `ampTriggerEvent` signal
2. Trigger sequence: particle burst, dim overlay, label pulse
3. Spend/reroll text scramble animation
4. Same visual for player and AI triggers

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

## Constraints
- All animations: `react-native-reanimated` shared values, transforms + opacity only
- Shockwave uses `useAnimatedReaction` (NOT `useEffect`) per SLAM_ANIMATION.md
- Haptics use `runOnJS` — `Haptics.impactAsync` is not a worklet
- `DisplaySnapshot` pattern unchanged — signals drive animations
- `setTimeout` chains remain — `CHOREO` replaces `STEP_MS` delays
- `SLAM_CONFIG` in `constants.ts`, `CHOREO` in `src/battle/choreography.ts`
- `npx tsc --noEmit` zero errors after each sprint

---

## Files Changed

| File | Changes |
|------|---------|
| `src/data/constants.ts` | `SLAM_CONFIG` + `AttackLabel` type (per SLAM_ANIMATION.md) |
| `src/battle/choreography.ts` | **NEW** — `CHOREO` config + `slamDuration()` helper |
| `src/hooks/useBattle.ts` | Replace `STEP_MS`, add player + AI slam signals, `triggerSlam`/`triggerPlayerSlam`/`triggerAiSlam`, add `roundBannerKey`, `actionLabel`, `damageEvent`, draw keys, `defeatSide`, `ampTriggerEvent` |
| `src/screens/BattleScreen.tsx` | Player + AI slam derived transforms, `Shockwave` on both sides, flash overlay, `RoundBanner`, `DamagePopup`, `ActionLabel`, `DrawCardAnimation`, KO overlay, replacement animations, remove old `lungeY`/`lungeStyle` |
| `src/components/Shockwave.tsx` | **NEW** (optional — can stay in BattleScreen) |

---

## Notes for Claude Code
- AI slam is a **mirror** of player slam — only translateY direction differs. Use the shared `triggerSlam()` helper, don't copy-paste.
- Both-attack rounds: first slam must fully complete (`slamDuration(firstWeight)`) before second begins. Never fire both simultaneously.
- `slamProgress` and `aiSlamProgress` are independent — spring return overlap between sequential slams is fine and looks natural.
- Damage numbers: use `useAnimatedReaction` on shared value for sub-frame precision, NOT `useEffect` with React state.
- `slamDuration()` adds 200ms buffer beyond `holdDuration` — spring return is visibly underway, but we don't wait for full settle.
- If `SLAM_CONFIG` doesn't exist yet, add it per SLAM_ANIMATION.md Step 1 before Sprint 2.
