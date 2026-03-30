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
  roundBanner:      1800,   // "ROUND 3" banner hold time
  actionLabel:       900,   // "REST" / "DRAW" / "SWAP" label hold time

  // ── Attack pacing (gaps around the slam animation) ──────
  preSlamPause:      500,   // beat after action label fades, before slam begins
  damageSettle:     1300,   // HP bar drain + damage number display after slam
  postAttackPause:   900,   // breathing room after damage settles

  // ── Between two attacks (both-attack rounds) ────────────
  betweenAttacks:   1000,   // gap between first and second slam

  // ── Card events ─────────────────────────────────────────
  defeatHold:       1200,   // defeated card visible with KO overlay
  defeatFall:        700,   // fall + fade animation
  defeatGap:         600,   // pause after card disappears
  replaceDraw:       600,   // new card draws from deck/hand to active
  replaceEntry:      500,   // new card scale-spring into active slot
  replaceSettle:     500,   // pause after new card is in place

  // ── Player card draw (3-phase cinematic) ────────────────
  drawExit:          300,   // card-back slides down off screen from deck
  drawRevealIn:      400,   // card front slides up from bottom to center
  drawRevealHold:    700,   // hold at center — player sees what they drew
  drawRevealOut:     400,   // card shrinks + moves to hand slot
  drawSettle:       1500,   // breathing room after card lands in hand

  // ── AI card draw (simple flight) ──────────────────────
  aiDrawTravel:      500,   // card-back flies from AI deck to AI hand
  aiDrawSettle:      200,   // pause after AI draw

  // ── Action announcements ────────────────────────────────
  actionShow:       1300,   // action label visible (both AI and player)
  actionFade:        300,   // label fade out

  // ── Amp events ──────────────────────────────────────────
  ampTriggerFlash:   600,   // flash when amp hits 100
  ampEffectReveal:   900,   // effect name reveal + glow
  ampEffectHold:     700,   // hold effect name visible

  // ── Round transition ────────────────────────────────────
  roundEndPause:    1000,   // pause after last event in round
  roundTransition:  1400,   // round banner entrance + hold + exit
  roundStartDelay:   500,   // pause before controls re-enable
} as const;

// ── Helper: total slam duration for a given weight ────────
// Used by runSteps to know how long to wait for the slam
// animation to complete before proceeding to the next beat.
export function slamDuration(weight: 'LIGHT' | 'MEDIUM' | 'HEAVY'): number {
  const cfg = SLAM_CONFIG[weight];
  return cfg.liftDuration + cfg.slamDuration + cfg.holdDuration + cfg.returnBuffer;
}

export function drawDuration(side: 'player' | 'ai'): number {
  if (side === 'ai') return CHOREO.aiDrawTravel;
  return CHOREO.drawExit + CHOREO.drawRevealIn + CHOREO.drawRevealHold + CHOREO.drawRevealOut;
}
