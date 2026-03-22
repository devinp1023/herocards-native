# HeroCards — Card Visual Redesign
**Target files:** `src/components/HeroCard.tsx`, `src/components/MiniCard.tsx`, `src/data/constants.ts`, `src/screens/BattleScreen.tsx`
**Goal:** Premium card polish inspired by Marvel Snap / Pokémon TCG Pocket — texture, lighting, depth, rarity shimmer, and battle-state layering.

---

## Guiding Principle: The Card IS the Battle HUD

The card itself is the UI during battle. HP bars, stamina indicators, and stat displays are rendered **on the card**, not as separate battle screen elements. This means:

1. **Cards are self-contained battle units.** Everything the player needs to know about a card's battle state (current HP, current stamina, active status, ability) is visible on the card itself.
2. **Battle state is transient.** `HeroCard` and `MiniCard` accept optional battle props (`currentHp`, `maxHp`, `currentStamina`, `maxStamina`, `isActive`, etc.). When these props are provided, the card renders live battle state. When omitted (collection, detail, store), the card shows its base/max values.
3. **Battle screen simplifies.** Once cards carry their own HUD, redundant battle UI elements (external HP bars, stamina displays, stat readouts) are stripped from `BattleScreen.tsx`. The battle screen becomes a layout shell — card placement, attack buttons, and turn log only.
4. **Active battle card uses HeroCard (Skia).** The active fighter on each side renders as a full `HeroCard` at 85% scale — premium Skia treatment (gradients, noise, shimmer on Epic/Legendary) during the most important moment. Only 2 HeroCards on screen at once (player + opponent), so no performance concern. This creates natural visual hierarchy: active card is rich and detailed, hand cards are simpler MiniCards.
5. **Hand cards use MiniCard** — same visual structure (HP bar, stamina, stats), at **55–60% scale** (up from 40%) so live HP/stamina remains legible. Pure RN, no Skia.
6. **Collection grid is unchanged** — MiniCards at 38% scale showing static base stats. No battle props passed.

---

## Architecture Constraints (read before touching anything)

- **Never import `ALL_CARDS` in components** — always use `gs.cardRoster` from `useGameStateContext()`
- **Skia handles:** backgrounds, gradients, borders, image windows, noise, shimmer, vignettes
- **RN overlays handle:** all text, icons, colored badges, stat pills, HP bar, stamina pips — placing colored backgrounds in Skia obscures RN overlay Views
- **`MiniCard` is pure RN** (no Skia) — keep it that way for performance in grids and battle hand
- **`React.memo`** must remain on `MiniCard` — it renders inside `FlatList`
- **`useCallback`** must remain on any event handlers passed as props to memoized components
- Run `npx tsc --noEmit` after each step — must pass with zero errors
- **Reanimated → Skia pattern:** The codebase already passes Reanimated `useDerivedValue` outputs directly into Skia `LinearGradient` props (see existing shimmer in `HeroCard.tsx`). No `@shopify/react-native-skia/reanimated` bridge package is needed — continue using this same pattern for all new animations.
- **Collection grid uses `MiniCard` only** (at 38% scale, 3 columns) — `HeroCard` is never rendered in the grid, so adding Skia layers to `HeroCard` has zero impact on collection scroll performance.
- **No `expo-linear-gradient`** — this package is not installed. All RN gradient effects must use the layered `View` approach (lighter shade top half, base color bottom half).

---

## Step 1 — Extend `TYPE_COLORS` in `constants.ts`

Each type currently has a single `primary` color. Add two new fields:

```ts
// In TYPE_COLORS or a new TYPE_META export
{
  primary: string   // existing — e.g. "#FF4D4D"
  bg: string        // deep dark tint for card body — e.g. "#1e0808"
  mid: string       // slightly lighter for art window bg — e.g. "#2a0a0a"
}
```

Values to add per type:

| Type      | bg        | mid       |
|-----------|-----------|-----------|
| Blaster   | `#1e0808` | `#2a0a0a` |
| Magic     | `#110618` | `#1a0828` |
| Psychic   | `#1e0612` | `#2a0818` |
| Shadow    | `#06061a` | `#080828` |
| Tank      | `#060c14` | `#081020` |
| Speedster | `#141000` | `#1a1400` |
| Nature    | `#06120a` | `#081a10` |
| Tech      | `#040c12` | `#050f1a` |
| Cosmic    | `#140a00` | `#1a0e00` |

Also add a `RARITY_META` export:

```ts
export const RARITY_META: Record<string, { color: string; shimmer: boolean }> = {
  Common:    { color: "#9CA3AF", shimmer: false },
  Uncommon:  { color: "#34D399", shimmer: false },
  Rare:      { color: "#60A5FA", shimmer: false },
  Epic:      { color: "#A78BFA", shimmer: true  },
  Legendary: { color: "#FBBF24", shimmer: true  },
}
```

**Verify:** `npx tsc --noEmit` passes.

---

## Step 2 — Noise texture asset

Use a pre-baked PNG — it's simpler and cheaper per frame than a runtime SkSL shader (which would run on every card in CardDetailScreen and battle).

1. Add a 256×256 grayscale fractalNoise PNG to `assets/noise.png` (generate once with a script or source as a static asset).
2. Load it in `HeroCard.tsx` via `useImage(require('../../assets/noise.png'))`.
3. This will be used in Step 3f.

---

## Step 3 — `HeroCard.tsx` Skia layer additions

Add these layers inside the Skia `<Canvas>` in draw order (bottom to top). Each is a new layer drawn before the existing card content.

### 3a. Card body background — type-tinted gradient

Replace the current flat background rect with:

```tsx
<RoundedRect r={18} x={0} y={0} width={W} height={H}>
  <LinearGradient
    start={{ x: 0, y: 0 }}
    end={{ x: W * 0.3, y: H }}
    colors={[tm.mid, "#07070e", "#040408"]}
    positions={[0, 0.52, 1]}
  />
</RoundedRect>
```

### 3b. Top ambient type wash

A soft color from the card's type bleeding in from the top:

```tsx
<RoundedRect r={18} x={0} y={0} width={W} height={90}>
  <LinearGradient
    start={{ x: 0, y: 0 }}
    end={{ x: 0, y: 90 }}
    colors={[tm.primary + "10", "transparent"]}
  />
</RoundedRect>
```

### 3c. Bottom ambient type wash

Same idea from the bottom edge:

```tsx
<RoundedRect r={18} x={0} y={H - 48} width={W} height={48}>
  <LinearGradient
    start={{ x: 0, y: H - 48 }}
    end={{ x: 0, y: H }}
    colors={["transparent", tm.primary + "09"]}
  />
</RoundedRect>
```

### 3d. Gradient border

Draw a rounded rect border with gradient paint — bright at top, dim toward bottom:

```tsx
<RoundedRect r={18} x={0.75} y={0.75} width={W - 1.5} height={H - 1.5} style="stroke" strokeWidth={1.5}>
  <LinearGradient
    start={{ x: W / 2, y: 0 }}
    end={{ x: W / 2, y: H }}
    colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.04)", "rgba(0,0,0,0.5)"]}
    positions={[0, 0.4, 1]}
  />
</RoundedRect>
```

When `isActive`, swap gradient to use `tm.primary + "88"` at top.

### 3e. Top specular edge

A 1.5px line at `y=0` simulating physical card thickness:

```tsx
<Rect x={0} y={0} width={W} height={1.5}>
  <LinearGradient
    start={{ x: 0, y: 0 }}
    end={{ x: W, y: 0 }}
    colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0.16)", "rgba(255,255,255,0.03)"]}
  />
</Rect>
```

### 3f. Noise texture overlay

```tsx
{noiseImage && (
  <Image
    image={noiseImage}
    x={0} y={0} width={W} height={H}
    fit="cover"
    opacity={0.05}
    blendMode="screen"
  />
)}
```

> **Tuning note:** Start at `0.05` opacity. If too visible on device, dial down to `0.04`. The original `0.038` was too subtle and invisible on many screens. Test on both simulator and physical device — OLED panels show it differently than LCD.

### 3g. Art window inset shadow (vignette)

Replace or augment the existing art vignette with a stronger inset shadow. Draw a radial gradient rect over the art window bounds:

```tsx
// After art image is drawn
<Rect x={artX} y={artY} width={artW} height={artH}>
  <RadialGradient
    c={{ x: artX + artW / 2, y: artY + artH * 0.42 }}
    r={artW * 0.65}
    colors={["transparent", "rgba(0,0,0,0.58)"]}
  />
</Rect>
// Bottom art fade
<Rect x={artX} y={artY + artH - 36} width={artW} height={36}>
  <LinearGradient
    start={{ x: 0, y: artY + artH - 36 }}
    end={{ x: 0, y: artY + artH }}
    colors={["transparent", "rgba(4,4,8,0.9)"]}
  />
</Rect>
```

### 3h. Rarity line at top of art window

```tsx
<Rect x={artX} y={artY} width={artW} height={2}>
  <LinearGradient
    start={{ x: artX, y: 0 }}
    end={{ x: artX + artW, y: 0 }}
    colors={["transparent", rc + "bb", rc, rc + "bb", "transparent"]}
    positions={[0, 0.38, 0.5, 0.62, 1]}
  />
</Rect>
```

### 3i. Bottom rarity accent line

```tsx
<Rect x={0} y={H - 2} width={W} height={2}>
  <LinearGradient
    start={{ x: 0, y: 0 }}
    end={{ x: W, y: 0 }}
    colors={["transparent", rc + "88", "transparent"]}
  />
</Rect>
```

**Verify:** `npx tsc --noEmit` passes. Test on simulator — check that RN text overlays are still visible and not obscured by new Skia layers.

---

## Step 4 — Legendary/Epic shimmer animation

Only runs when `card.rarity === 'Legendary' || card.rarity === 'Epic'`.

> **Animation pattern:** This uses the same `useDerivedValue` → Skia `LinearGradient` approach already proven in the existing shimmer code in `HeroCard.tsx`. No bridge package needed.

```tsx
const shimmerX = useSharedValue(-W)

useEffect(() => {
  if (!rm.shimmer) return
  shimmerX.value = withRepeat(
    withTiming(W * 2, { duration: card.rarity === 'Legendary' ? 2600 : 4000, easing: Easing.inOut(Easing.ease) }),
    -1,
    false
  )
}, [card.rarity])

const shimmerGradientX = useDerivedValue(() => shimmerX.value)
```

In the Skia canvas, add a shimmer rect layer:

```tsx
<RoundedRect r={18} x={0} y={0} width={W} height={H}>
  <LinearGradient
    start={{ x: shimmerGradientX.value, y: 0 }}
    end={{ x: shimmerGradientX.value + W * 0.6, y: H }}
    colors={["transparent", rc + "09", rc + "16", rc + "09", "transparent"]}
  />
</RoundedRect>
```

For Legendary, also add an outer glow `View` (RN layer, outside the canvas) that pulses using a separate `useSharedValue` + `withRepeat(withTiming(...))` driving `opacity`.

**Verify:** Shimmer runs smoothly at 60fps on device. Check that it doesn't run on Common/Uncommon/Rare cards.

---

## Step 5 — RN overlay polish (stat pills, bars) + battle prop interface

These stay in the RN overlay layer per the existing architecture. This step also introduces the optional battle props that make the card a self-contained battle HUD.

### 5a. Battle prop interface

Add optional battle props to both `HeroCard` and `MiniCard`:

```ts
interface BattleProps {
  currentHp?: number     // live HP — omit to show maxHp (base stat)
  maxHp?: number         // calculated maxHp = 100 + (defense × 0.5)
  currentStamina?: number // live stamina — omit to show card.stamina (base)
  isActive?: boolean     // true = this card is the active fighter
  hpPct?: number         // 0–1, derived from currentHp/maxHp — drives bar fill + color
}
```

When `currentHp` is **not** provided, HP bar shows full (base stat). When provided, HP bar reflects live battle state. Same logic for stamina. **Battle state never persists** — these props exist only while `BattleScreen` is mounted.

### 5b. Stat pills — lifted appearance

Add to each pill `View`:

```tsx
shadowColor: pillColor,
shadowOffset: { width: 0, height: 3 },
shadowOpacity: 0.35,
shadowRadius: 6,
elevation: 4,  // Android
```

Add a 1px white `View` absolutely positioned at `top: 0, left: 6, right: 6, height: 1` inside each pill with `backgroundColor: 'rgba(255,255,255,0.28)'` for the specular highlight.

Change pill background from flat color to a subtle gradient using a layered `View` approach — a child `View` covering the top half with `backgroundColor: 'rgba(255,255,255,0.12)'` for the lighter shade. Do **not** use `expo-linear-gradient` (not installed).

### 5c. HP bar — inset track + gloss fill (battle-aware)

The HP bar is always visible on the card. Outside battle it shows full. In battle it reflects `currentHp / maxHp`.

Track `View`:

```tsx
backgroundColor: 'rgba(0,0,0,0.4)',
// Simulate inset with inner shadow — RN doesn't support inset shadows natively,
// so use a darker background and a subtle border:
borderWidth: 1,
borderColor: 'rgba(0,0,0,0.5)',
```

Fill `View` — width driven by `hpPct` (defaults to `1.0` outside battle). Add a child `View` at 50% height for gloss:

```tsx
// Inside fill View
<View style={{
  position: 'absolute',
  top: 0, left: 0, right: 0,
  height: '50%',
  backgroundColor: 'rgba(255,255,255,0.18)',
  borderRadius: 99,
}} />
```

Color thresholds: green (`hpPct > 0.5`) → yellow (`0.25–0.5`) → red (`< 0.25`). Outside battle, always green.

### 5d. Stamina pips — glossy filled state (battle-aware)

Pips reflect `currentStamina` when provided, otherwise `card.stamina` (full). Same gloss treatment as HP bar fill — add a small white `View` at 50% height inside each filled pip. Empty pips render as dim outlines.

### 5e. Ability block — inset panel

```tsx
backgroundColor: 'rgba(0,0,0,0.32)',
borderWidth: 1,
borderColor: 'rgba(255,255,255,0.055)',
// Simulate inset:
shadowColor: '#000',
shadowOffset: { width: 0, height: -1 },
shadowOpacity: 0.4,
shadowRadius: 3,
```

### 5f. Card name typography

```tsx
fontSize: 12,
fontWeight: '900',  // Orbitron Black
textShadow not available in RN — use a second Text layer offset by 1px at low opacity for emboss, or rely on the Skia type glow drawn behind the text area
```

Consider drawing a soft type-colored glow rect in Skia directly behind where the card name sits (calculate the y offset from the canvas top).

**Verify:** `npx tsc --noEmit`. Test collection grid — pills should not cause layout shifts. Test in battle — HP bar and stamina pips update in real time as battle progresses.

---

## Step 6 — `MiniCard.tsx` lightweight polish + battle-aware rendering

MiniCard is pure RN, no Skia. It mirrors HeroCard's layout at smaller scale. Two contexts:

- **Collection grid:** 38% scale, static base stats, no battle props. Unchanged.
- **Battle hand:** **55–60% scale** (up from 40%) so HP bar and stamina are legible. Receives battle props for live state.

### 6a. Visual additions (all contexts)

1. **Type color left border:** `borderLeftWidth: 3, borderLeftColor: tm.primary` on the card container
2. **Rarity dot:** a 5px circle `View` in the top-right corner, `backgroundColor: rc`, `borderRadius: 99`
3. **HP bar:** simple 4px height `View` with fill — no gloss needed at this size. Width driven by `hpPct` prop (defaults to `1.0`). Color follows same green/yellow/red thresholds as HeroCard.
4. **Stamina:** show a single number `Text` (e.g. "5/8") instead of individual pips — too small to render pips clearly. In battle, shows `currentStamina / card.stamina`. Outside battle, shows `card.stamina / card.stamina`.

### 6b. Battle hand scale change

Update the battle hand layout in `BattleScreen.tsx` to render MiniCards at **55–60% scale** instead of 40%. This may require adjusting:
- Hand row container width/spacing
- Number of visible cards (should still fit 4–5 cards in the row)
- Scroll behavior if cards overflow

### 6c. Performance constraints

Do **not** add: shimmer, noise, specular edge, ambient wash, shadows on pills. These are invisible at mini scale and hurt `FlatList` performance.

`React.memo` must remain applied. MiniCard accepts the same `BattleProps` interface from Step 5a.

**Verify:** Collection grid (`FlatList`) scrolls smoothly at 38% scale. Battle hand renders at 55–60% with live HP/stamina. `npx tsc --noEmit` passes.

---

## Step 7 — Low HP battle state

Already partially implemented. Audit and strengthen:

- Art image: `opacity` reduced to `0.65` + `grayscale` filter (Skia `ColorMatrix`) when `hpPct <= 0.25`
- Add a pulsing red overlay rect in Skia over the art window bounds — animate its `opacity` using a `useDerivedValue` fed from a Reanimated `useSharedValue` (same pattern as shimmer in Step 4)
- HP bar color transition: green → yellow → red is already driven by `hpPct` thresholds — confirm it animates smoothly as HP drains mid-battle

---

## Step 8 — Active battle state (isActive) — HeroCard as active fighter

The active card on each side of the battle renders as a full `HeroCard` (Skia), not a MiniCard. This gives the active fighter the premium visual treatment — gradients, noise texture, shimmer on Epic/Legendary — while hand cards remain lightweight MiniCards.

**Why this is safe performance-wise:** Only 2 HeroCards render at once (player active + opponent active). PackOpeningScreen already renders HeroCard during reveals with animations and performs fine. This is not a list — no FlatList, no scroll performance concern.

When a card is the active fighter:

- **Render as `HeroCard`** with all Skia layers from Steps 3–4, receiving battle props from Step 5a
- Border gradient swaps to use `tm.primary` (Step 3d)
- Outer glow `View` (RN, outside Skia canvas): `backgroundColor: tm.primary`, `borderRadius`, `opacity` pulsing via Reanimated
- "ACTIVE" badge visible in art window top-right (already exists — verify styling)
- Card scale: 85% via `CardWrapper.tsx` (unchanged)
- Battle animations (lunge, shake, swap, defeat) already run via Reanimated on the card wrapper — verify they compose cleanly with shimmer and low-HP pulse running simultaneously inside the Skia canvas

**Transition:** When a card swaps from hand to active, it visually upgrades from MiniCard to HeroCard. When defeated or swapped out, it returns to MiniCard in the hand (or is removed if KO'd).

---

## Step 9 — Battle screen cleanup + HeroCard/MiniCard wiring

Now that cards carry their own HUD and active cards use HeroCard, refactor `BattleScreen.tsx`:

### 9a. Strip redundant HUD elements

1. **Remove external HP bars** — the card's built-in HP bar replaces these
2. **Remove external stamina displays** — card shows its own pips/count
3. **Remove external stat readouts** — power, defense, speed are on the card
4. **Keep:** attack buttons (Light/Medium/Heavy/Rest), turn log/action feed, Amp meter, battle result overlay, deck/hand layout containers

### 9b. Active card rendering

- **Player active card:** Render as `HeroCard` at 85% scale via `CardWrapper`, passing battle props
- **Opponent active card:** Render as `HeroCard` at 85% scale via `CardWrapper`, passing battle props
- Previously these may have been MiniCards — switch to HeroCard import

### 9c. Hand card rendering

- Hand cards remain `MiniCard` at **55–60% scale** (up from 40%), receiving battle props for live HP/stamina

### 9d. Wire battle props

Pass `currentHp`, `maxHp`, `currentStamina`, `isActive`, and `hpPct` from `useBattle` state into each card:
- Active cards (HeroCard): full battle props
- Hand cards (MiniCard): battle props for HP/stamina state (not `isActive`)

The battle screen becomes a layout shell: card placement, attack controls, and turn feedback. All per-card state lives on the card.

**Verify:** Battle plays through a full match. Active cards render as HeroCard with Skia treatment. Hand cards render as MiniCard at larger scale. Cards reflect live HP/stamina changes. No orphaned UI elements. `npx tsc --noEmit` passes.

---

## Testing Checklist

After all steps complete:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] Common card: flat, no shimmer, correct grey rarity accent
- [ ] Rare card: blue rarity accent, no shimmer
- [ ] Epic card: purple shimmer running, correct speed
- [ ] Legendary card: gold shimmer running faster, outer halo pulsing
- [ ] Active battle card: renders as HeroCard (Skia) with type-colored border, ACTIVE badge, outer glow
- [ ] Active Epic/Legendary in battle: shimmer animation runs alongside battle animations (lunge, shake)
- [ ] Low HP card: greyed art, red pulse overlay, red HP bar
- [ ] Collection grid: smooth scroll at 38% scale, MiniCard `React.memo` intact
- [ ] Battle hand: MiniCard renders at 55–60% scale with live HP/stamina visible
- [ ] Battle HUD: no redundant external HP bars, stamina displays, or stat readouts remain on BattleScreen
- [ ] Battle flow: cards update HP bar and stamina in real time as attacks land
- [ ] Outside battle: cards show full HP bar, full stamina, base stats (no battle residue)
- [ ] God Mode: loads all 200 cards — no performance regression in collection
- [ ] Simulator + physical device: noise texture visible, shimmer smooth at 60fps
- [ ] `npx expo start --clear` — clean boot with no errors

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/data/constants.ts` | Add `bg`, `mid` to type colors; add `RARITY_META` export |
| `assets/noise.png` | New asset (256×256 grayscale noise texture) |
| `src/components/HeroCard.tsx` | Skia layer additions (Steps 3–4); RN overlay polish (Step 5); battle props interface |
| `src/components/MiniCard.tsx` | Lightweight polish (Step 6); battle props interface; battle-aware HP/stamina |
| `src/components/CardWrapper.tsx` | No changes expected |
| `src/screens/BattleScreen.tsx` | Strip redundant HUD elements (Step 9); wire battle props to cards; hand scale 55–60% |
| `src/hooks/useBattle.ts` | May need minor changes to expose per-card battle state for prop passing |

---

## Notes for Claude Code

- Read `PRDs/HeroCards_BattleSystem_v2_PRD.md` if you need battle state context
- The existing card canvas is **300×433px** — all coordinate math uses these dimensions
- `useFont()` is required for any text inside the Skia canvas — do not add card name text to Skia, keep it in the RN overlay
- Emoji cannot render in Skia canvas — the emoji art is already handled as an RN `Text` overlay
- Check `src/context/FontContext.ts` for available Skia font references
- Do not import `ALL_CARDS` — if you need card data for testing, use `gs.cardRoster`
