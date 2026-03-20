#!/usr/bin/env node
// assign-abilities.js — writes ability assignments into cards.ts and pushes to Firestore.
// Run once: node scripts/assign-abilities.js

const fs   = require('fs');
const path = require('path');

// ── Ability assignments (thematic, one per card) ───────────────────────────
// Legendary: Apex Predator, Immunity, Last Stand, Overwhelming Force, Dominate
// Epic:      Unstoppable, Execute, Drain, Second Wind, Overwhelm
// Rare:      Counterstrike, Fortify, Bleed, Intimidate, Momentum
// Uncommon:  Smoke Screen, Adrenaline, Pack Tactics, Adaptable, Rebound
// Common:    Grit, Opportunist, Resilience, Shield Up, Tenacity

const ABILITIES = {
  // ── Legendary ─────────────────────────────────────────────────────────────
  1:  'Immunity',           // Cosmara — reshapes reality, above all laws
  2:  'Dominate',           // Voidlord Kael — devours light, bends dimensions
  3:  'Overwhelming Force', // Solarius — full power of a living star
  4:  'Last Stand',         // Eternix — exists outside time, rewinds fate
  5:  'Apex Predator',      // Omegastrike — one punch collapses mountains

  // ── Epic ──────────────────────────────────────────────────────────────────
  6:  'Drain',              // Psyrena — reads and rewrites minds (mental drain)
  7:  'Second Wind',        // Ironveil — armor never scratched (survives killing blow)
  8:  'Overwhelm',          // Blazeclaw — hypersonic plasma (type advantage ×2)
  9:  'Unstoppable',        // Tyranneous — commands storms (forces of nature)
  10: 'Execute',            // Nullblade — phases through matter, strikes vitals
  11: 'Drain',              // Audio — drains energy through weaponized sound
  12: 'Overwhelm',          // Skyhook — aerial dive-bombing advantage
  13: 'Second Wind',        // Dr. Jimmy — brilliant medic (medical expertise)
  14: 'Unstoppable',        // Seismara — controls tectonic plates
  15: 'Execute',            // Multi Back — bizarre transformation, exploits weak points

  // ── Rare ──────────────────────────────────────────────────────────────────
  16: 'Bleed',              // Cryonix — freezes solid (frostbite DoT)
  17: 'Momentum',           // Thunderjack — outruns lightning, speed builds power
  18: 'Intimidate',         // Railman — military disillusionment, imposing presence
  19: 'Counterstrike',      // Ved — reads minds, anticipates every attack
  20: 'Intimidate',         // Bonecaller — undead army, fear-based aura
  21: 'Momentum',           // Burst — lightning-fast antiheroine
  22: 'Fortify',            // Stonewall Dex — absorbs any impact without flinching
  23: 'Bleed',              // Luminos — photon beams burn through solid steel
  24: 'Counterstrike',      // Mireclaw — predator instincts, parries and returns
  25: 'Momentum',           // Slipstream — speed builds through aerial dives
  26: 'Bleed',              // Rho Patel — nanotech swarm applies ongoing damage
  27: 'Fortify',            // Thornwall — weaponizes healing into stacking defense
  28: 'Counterstrike',      // Shadowmeld — ambushes from absolute darkness
  29: 'Bleed',              // Warpulse — psychic pulses linger and erode
  30: 'Bleed',              // Cinderax — superheats air, ignites and burns
  31: 'Momentum',           // Wind Waver — wind speed compounds with each pass
  32: 'Fortify',            // Ironclad Reva — living metal skeleton reinforces
  33: 'Intimidate',         // Sirocco — desert warrior, scours enemies with sand
  34: 'Counterstrike',      // Neurostrike — instant unconsciousness, reads openings
  35: 'Momentum',           // Cobalt Wing — Mach 2 dive speed compounds
  36: 'Bleed',              // Trailblazer — blazing trail burns pursuing enemies
  37: 'Momentum',           // Gravitas — warps gravity, converts force to momentum
  38: 'Counterstrike',      // Blue Shift — spatial quantum awareness
  39: 'Fortify',            // Brugge — street fighter who takes hits and gets tougher
  40: 'Intimidate',         // The Supplier — shadowy mercenary, unsettling presence
  41: 'Counterstrike',      // Darkmantle — absolute darkness, parries unseen
  42: 'Fortify',            // Lyra Steele — cybernetic arms reinforce on each hit
  43: 'Fortify',            // Ashwarden — draws life force, converts to defense
  44: 'Intimidate',         // Pulsara — EMP disable, fear of total shutdown
  45: 'Intimidate',         // Verdant Fist — channels nature's wrath, imposing

  // ── Uncommon ──────────────────────────────────────────────────────────────
  46: 'Smoke Screen',       // Swiftara — vibrates through objects, hard to track
  47: 'Adaptable',          // Blockade — adjusts stance to any terrain
  48: 'Adrenaline',         // Spark Reyes — bioelectric energy surges when low
  49: 'Rebound',            // Mosskin — heals allies on defeat, nature rebounds
  50: 'Smoke Screen',       // Driftshadow — teleports leaving smoke decoys
  51: 'Adaptable',          // Ironpulse — adapts to any enemy tech mid-battle
  52: 'Adrenaline',         // Razorwing — adrenaline-fueled aggression in dives
  53: 'Adaptable',          // Zephyra — redirects any projectile to suit needs
  54: 'Smoke Screen',       // Mentara — plants false memories, mental misdirection
  55: 'Pack Tactics',       // Graveshift — two thralls coordinate attacks
  56: 'Adaptable',          // Ferrix — literal biological adaptation on demand
  57: 'Rebound',            // Comet Dash — fiery trail empowers next ally
  58: 'Pack Tactics',       // Ironhide — military engineer, tactical coordination
  59: 'Smoke Screen',       // Nova Kwan — disorienting photon bursts
  60: 'Rebound',            // Patchwork — battlefield medic, rallies next card
  61: 'Smoke Screen',       // Umbrix — shadow travel as disorienting misdirection
  62: 'Pack Tactics',       // Gadgetrix — drone swarms coordinate perfectly
  63: 'Adrenaline',         // Miss Skywalker — adrenaline spike in aerial combat
  64: 'Adaptable',          // Tidecaller — water adapts to fill any opening
  65: 'Smoke Screen',       // Mindveil — invisible to all human perception
  66: 'Pack Tactics',       // Rattlebone — tracking bones coordinate en masse
  67: 'Adaptable',          // Prismara — light refracts to exploit any angle
  68: 'Adaptable',          // Scaleshield — scales harden to match incoming force
  69: 'Adaptable',          // Fennix — copies enemy powers, literal adaptability
  70: 'Adrenaline',         // Voltara — EMP shockwave at full running speed
  71: 'Pack Tactics',       // Gravitas (Tech) — coordinates team via physics
  72: 'Rebound',            // Sunlance — focused solar energy rebounds after defeat
  73: 'Rebound',            // Lichen — revives the near-dead, ultimate rebound
  74: 'Smoke Screen',       // Smokeshift — literal smokescreen escape artist
  75: 'Adrenaline',         // Quakefist — shockwaves amplify with low HP desperation
  76: 'Pack Tactics',       // Arachnova — web networks coordinate whole battlefield
  77: 'Adaptable',          // The Cartographer — strategic adaptation to any terrain
  78: 'Adaptable',          // Crystalback — crystal angles deflect any attack type
  79: 'Rebound',            // Psi Ramirez — pain amplification fuels next ally
  80: 'Pack Tactics',       // Ashen Rook — commands skeletal champion as vanguard
  81: 'Adrenaline',         // Wyvera — pressurized steam dive, vicious when cornered
  82: 'Rebound',            // Lumos — full-spectrum blind buys time for next ally
  83: 'Pack Tactics',       // Hacktivist — network hacker, coordinates through comms
  84: 'Smoke Screen',       // Hollowfang — darkness-forged fangs, venom and shadow
  85: 'Rebound',            // Terrashift — reshapes earth to protect next wave
  86: 'Adrenaline',         // Blazefur — flaming coat ignites when cornered
  87: 'Smoke Screen',       // Quicksplit — splitting into two confuses any target
  88: 'Adrenaline',         // Crestwave — surfs self-generated waves, peak aggression
  89: 'Pack Tactics',       // Helixar — bends light to coordinate hidden allies
  90: 'Rebound',            // Ironmoth — metallic dust blinds on defeat, buys time
  91: 'Adaptable',          // Aurora — cosmic energy adapts to any wavelength
  92: 'Smoke Screen',       // Nocturna — full invisibility at sundown
  93: 'Smoke Screen',       // Agent 25 — covert classified operative
  94: 'Pack Tactics',       // Bombardier — repairs team tech, supports the group
  95: 'Adrenaline',         // Surgewolf — electrical surges amplify when desperate
  96: 'Rebound',            // The Alchemist — alchemical formula buffs next card
  97: 'Rebound',            // Vexshot — bounced blasts = momentum passes to next
  98: 'Adrenaline',         // Slipstream — vacuum wake, explosive speed burst
  99: 'Adrenaline',         // Manticore — paralyzing venom intensifies in desperation
  100: 'Pack Tactics',      // Relay — literally a team tactician and relay

  // ── Common ────────────────────────────────────────────────────────────────
  101: 'Shield Up',         // Sir Kravis — knight in gleaming armor, shields first
  102: 'Grit',              // Arcanian — Roman grit, fights through everything
  103: 'Grit',              // Sparks — small shocks, relentless persistence
  104: 'Resilience',        // Balm — closes wounds, healing regenerates every round
  105: 'Resilience',        // Shade — darkness always returns, persistent presence
  106: 'Tenacity',          // Tinker — invents solutions, never stops trying
  107: 'Shield Up',         // Glide — scouts first, defensive positioning
  108: 'Resilience',        // Ripple — water always flows back, inevitable return
  109: 'Tenacity',          // Archivist — accumulated knowledge fuels tenacity
  110: 'Grit',              // Splinter — street fighter, quick reflexes under pressure
  111: 'Tenacity',          // Mira Locke — keeps hacking despite limited tools
  112: 'Shield Up',         // Dustmoth — vision blur creates defensive window
  113: 'Grit',              // Knuckle Ray — bone-cracking reliable haymakers
  114: 'Resilience',        // Brine — slow corrosion, persistent over time
  115: 'Tenacity',          // Flicker — blinks back every time, never stays down
  116: 'Grit',              // Stubborn — name says everything: refuses to fall
  117: 'Opportunist',       // Char — ignites weakened targets with willpower
  118: 'Shield Up',         // Foghorn — sonic blast, defensive range control
  119: 'Tenacity',          // Patchface — changes identity to survive, keeps going
  120: 'Shield Up',         // Spindle — restraints = first line of defense
  121: 'Resilience',        // Murk — darkness disperses and always returns
  122: 'Resilience',        // Wren Okafor — herbal calm, steady field healing
  123: 'Grit',              // Piston — mechanical relentlessness, fights through pain
  124: 'Tenacity',          // Drift — repositions endlessly, never gives up ground
  125: 'Opportunist',       // Waspshot — stinging micro-darts target weakened foes
  126: 'Shield Up',         // Coldsnap — cold slows the first hit that lands
  127: 'Shield Up',         // Lumen — blinding flash absorbs the first attack
  128: 'Resilience',        // Creep — silent persistence, always there
  129: 'Opportunist',       // Harrow — dread demoralizes then gets exploited
  130: 'Grit',              // Bash — no powers, just relentless toughness
  131: 'Resilience',        // Reedwhisper — wild plant healing, nature's recovery
  132: 'Tenacity',          // Kolt — fastest unenhanced human, pure determination
  133: 'Grit',              // Buzzsaw — relentless cutting through anything
  134: 'Shield Up',         // Gust — wind barrier softens the first blow
  135: 'Opportunist',       // Probability Master — calculates when to strike hardest
  136: 'Resilience',        // Plume — light and buoyant, always floats back up
  137: 'Tenacity',          // Sketch — creative persistence, draws new solutions
  138: 'Shield Up',         // Cobble — compact and tough, absorbs first strike
  139: 'Opportunist',       // Singe — flame jets intensify on weakened enemies
  140: 'Shield Up',         // Trapper — hidden snares = first line of defense
  141: 'Opportunist',       // Clatter — rattles distracted, weakened enemies
  142: 'Opportunist',       // Smudge — obscures then exploits the confusion
  143: 'Shield Up',         // Thorn — sharp thorns deflect the first strike
  144: 'Tenacity',          // Amp — keeps disrupting despite everything
  145: 'Grit',              // Bully — no powers, pure willpower and intimidation
  146: 'Tenacity',          // Zipline — always finds a way across any obstacle
  147: 'Resilience',        // Silt — mudslides slow but always return
  148: 'Shield Up',         // Frostfoot — ice patches protect the approach
  149: 'Opportunist',       // Glint — blinds then strikes while foes are disoriented
  150: 'Opportunist',       // Burrow — ambushes from below, exploits blind spots
  151: 'Opportunist',       // Natter — distracts then exploits the lapse
  152: 'Grit',              // Dusk — fights through fading light with grim resolve
  153: 'Grit',              // Wallop — raw powerful swings, classic brawler grit
  154: 'Shield Up',         // Haze — thick obscuring haze, defensive screen
  155: 'Shield Up',         // Spool — wire net entangles, defensive first response
  156: 'Resilience',        // Dazzle — light disperses but always refracts back
  157: 'Tenacity',          // Perch — steady watchful observer, keeps posting up
  158: 'Grit',              // Grasp — unbreakable grip, endures through the pain
  159: 'Opportunist',       // Crackle — electric jolts on weakened opponents
  160: 'Tenacity',          // Wend — weaves through everything, never blocked
  161: 'Tenacity',          // Chip — data-driven persistence, always optimizing
  162: 'Resilience',        // Briar — bramble grows back, wounds re-close
  163: 'Grit',              // Clunk — heavy, slow, nearly impossible to topple
  164: 'Opportunist',       // Swoop — dive-bombs vulnerable targets
  165: 'Opportunist',       // Hex — minor hexes cause fumbles in weakened enemies
  166: 'Resilience',        // Mote — persistent energy motes that slow and return
  167: 'Grit',              // Craw — feral fighting overwhelms trained opponents
  168: 'Resilience',        // Rill — water trickles persistently into every crack
  169: 'Resilience',        // Stitch — surgical speed, patches damage every round
  170: 'Grit',              // Tusk — charges through sheer bulk and willpower
  171: 'Tenacity',          // Smoky — lives to fight another day, always escapes
  172: 'Grit',              // Flint — sparks under pressure, toughness ignites
  173: 'Opportunist',       // Bolt — rapid-fire punches finish off weak targets
  174: 'Opportunist',       // Wraith — whispers exploit psychological weakness
  175: 'Tenacity',          // Pebblethrow — ordinary person, extraordinary will
  176: 'Resilience',        // Mend — minor healing every round, never stops
  177: 'Tenacity',          // Clink — magnetic boots cling on no matter what
  178: 'Opportunist',       // Grim — dread lowers morale, then exploits the gap
  179: 'Shield Up',         // Sable — darkness protects allies, defensive role
  180: 'Shield Up',         // Flare — blinding flare absorbs incoming attention
  181: 'Shield Up',         // Brisk — speed sidesteps the first incoming hit
  182: 'Grit',              // Cob — thick skin, shrugs off blunt trauma
  183: 'Tenacity',          // Snap — counters attacks with stubborn determination
  184: 'Resilience',        // Fern — plant poultices, field healing per round
  185: 'Opportunist',       // Shard — crystal fragments target exposed weak points
  186: 'Shield Up',         // Latch — immobilizes enemy weapons, defensive first
  187: 'Tenacity',          // Morph — adapts tools, always finds another approach
  188: 'Grit',              // Zap — reliable, dependable, gritty close-range fighter
  189: 'Tenacity',          // Dip — ducks away to survive and come back again
  190: 'Resilience',        // Canopy — leaf wings regrow, natural resilience
  191: 'Opportunist',       // Watt — stuns then exploits the stunned opening
  192: 'Resilience',        // Grub — unconventional, keeps patching despite odds
  193: 'Shield Up',         // Snare — trip-wires = first defensive line
  194: 'Opportunist',       // Trickle — water jets target joints and eyes precisely
  195: 'Grit',              // Bristle — wild unpredictable style, fights through pain
  196: 'Opportunist',       // Spook — fear causes fumbles, then gets exploited
  197: 'Shield Up',         // Clamp — special forces, tactical defensive positioning
  198: 'Tenacity',          // Dash — hit-and-run, always comes back for another pass
  199: 'Resilience',        // Smolder — slow-burning persistence, recovers each round
  200: 'Grit',              // Ember — reliable, dependable, gritty to the end
};

// ── Patch cards.ts ────────────────────────────────────────────────────────────
const cardsPath = path.join(__dirname, '..', 'src', 'data', 'cards.ts');
const content   = fs.readFileSync(cardsPath, 'utf8');
const match     = content.match(/export const ALL_CARDS[^=]+=\s*(\[[\s\S]*\]);/);
if (!match) { console.error('Could not parse ALL_CARDS'); process.exit(1); }

const cards = eval(match[1]);
cards.forEach(c => {
  if (ABILITIES[c.id]) c.ability = ABILITIES[c.id];
});

// Rebuild the file preserving the interface definition at the top
const interfaceSection = content.slice(0, content.indexOf('export const ALL_CARDS'));
const newContent = interfaceSection +
  'export const ALL_CARDS: Card[] = ' +
  JSON.stringify(cards, null, 2) +
  ';\n';

fs.writeFileSync(cardsPath, newContent, 'utf8');
console.log(`✅ Patched ${cards.length} cards in cards.ts`);
console.log(`   Abilities assigned: ${Object.keys(ABILITIES).length}`);

// ── Push abilities to Firestore ───────────────────────────────────────────────
// Only run if firebase-admin is available
(async () => {
  try {
    const admin = require('firebase-admin');
    let app;
    try { app = admin.initializeApp(); } catch (e) { app = admin.app(); }
    const db = admin.getFirestore(app);
    db.settings({ projectId: 'hero-cards-1f345' });

    console.log('\n🔄 Pushing abilities to Firestore...');
    const entries = Object.entries(ABILITIES);
    const CHUNK = 400;
    for (let i = 0; i < entries.length; i += CHUNK) {
      const batch = db.batch();
      entries.slice(i, i + CHUNK).forEach(([id, ability]) => {
        batch.set(db.collection('cards').doc(id), { ability }, { merge: true });
      });
      await batch.commit();
    }
    console.log('✅ Firestore updated');
    process.exit(0);
  } catch (e) {
    console.log('\n⚠️  Firestore push skipped (firebase-admin not configured).');
    console.log('   cards.ts has been updated. To push to Firestore, run: npm run sync-cards');
  }
})();
