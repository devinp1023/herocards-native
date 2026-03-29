import { SLAM_CONFIG } from '../data/constants';

// ── Async step sequencer ────────────────────────────────────
// Replaces nested setTimeout chains with flat async sequences.
// Each step is [action, waitMs] — execute the action, then wait.

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type Step = [action: () => void, waitMs: number];

export async function runSteps(steps: Step[], cancelled: () => boolean) {
  for (const [action, ms] of steps) {
    if (cancelled()) return;
    action();
    if (ms > 0) await delay(ms);
    if (cancelled()) return;
  }
}

// ── CHOREO: named timing constants ──────────────────────────
// SLAM_CONFIG defines HOW an attack looks.
// CHOREO defines the SPACE between events.

export const CHOREO = {
  // ── Announcements / Labels ──────────────────────────────
  roundBanner:      1400,   // "ROUND 3" banner hold time
  actionLabel:       600,   // "REST" / "DRAW" / "SWAP" label hold time

  // ── Attack pacing (gaps around the slam animation) ──────
  preSlamPause:      300,   // beat after action label fades, before slam begins
  damageSettle:      900,   // HP bar drain + damage number display after slam
  postAttackPause:   600,   // breathing room after damage settles

  // ── Between two attacks (both-attack rounds) ────────────
  betweenAttacks:    700,   // gap between first and second slam

  // ── Card events ─────────────────────────────────────────
  defeatHold:        800,   // defeated card visible with KO overlay
  defeatFall:        500,   // fall + fade animation
  defeatGap:         400,   // pause after card disappears
  replaceDraw:       400,   // new card draws from deck/hand to active
  replaceEntry:      350,   // new card scale-spring into active slot
  replaceSettle:     300,   // pause after new card is in place

  // ── Card draw from deck ─────────────────────────────────
  drawLift:          250,   // card lifts off deck pile
  drawTravel:        400,   // card travels to hand slot
  drawLand:          200,   // card lands in hand (spring)
  drawSettle:        500,   // pause after draw completes

  // ── Action announcements ────────────────────────────────
  actionShow:        900,   // action label visible (both AI and player)
  actionFade:        200,   // label fade out

  // ── Amp events ──────────────────────────────────────────
  ampTriggerFlash:   400,   // flash when amp hits 100
  ampEffectReveal:   600,   // effect name reveal + glow
  ampEffectHold:     500,   // hold effect name visible

  // ── Round transition ────────────────────────────────────
  roundEndPause:     700,   // pause after last event in round
  roundTransition:  1000,   // round banner entrance + hold + exit
  roundStartDelay:   300,   // pause before controls re-enable
} as const;

// ── Helper: total slam duration for a given weight ────────
// Used by runSteps to know how long to wait for the slam
// animation to complete before proceeding to the next beat.
export function slamDuration(weight: 'LIGHT' | 'MEDIUM' | 'HEAVY'): number {
  const cfg = SLAM_CONFIG[weight];
  return cfg.liftDuration + cfg.slamDuration + cfg.holdDuration + cfg.returnBuffer;
}
