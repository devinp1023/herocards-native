**PRODUCT REQUIREMENTS DOCUMENT**

**Battle System v2**

Hero Cards · Draft · March 2026

  -------------- --------------------------
  **Status**     Draft --- Pending Review

  **Replaces**   Battle System v1 PRD

  **Goals**      Balance, simplicity,
                 excitement

  **New          Amp the Battlefield,
  features**     Stamina System
  -------------- --------------------------

**1. Overview**

This document defines the redesigned battle system for Hero Cards. The
v1 battle system established a solid foundation but introduced balance
problems --- high-rarity cards dominated overwhelmingly, the 5-category
type system (with 15 subtypes) was difficult to remember, and the damage
formula produced frustrating 1-damage outcomes for lower-rarity cards.

v2 addresses all of these issues while adding two new features --- Amp
the Battlefield and a Stamina System --- that introduce exciting
momentum swings and tactical attack choices.

**2. Goals**

- Every card feels useful --- a Common should never be completely
  helpless against a Legendary

- Type matchups are instantly memorable --- no reference chart needed

- Damage outcomes feel fair and proportional regardless of rarity gap

- New mechanics (Amp, Stamina) add excitement and decision-making
  without slowing the game down

- Abilities remain meaningful and work coherently with the new damage
  system

**3. Type System**

The 5-category system (Melee, Agility, Energy, Intelligence, Magic) is
replaced with 9 standalone types. Every card has exactly one type. There
are no subtypes or groupings --- each type stands on its own with its
own matchup identity.

**The 9 Types**

There are no groups or categories --- each type stands on its own with
its own matchup identity. Every card has exactly one type.

  --------------------------------------------------------------------
  **Type**       **Identity**
  -------------- -----------------------------------------------------
  🔥 Blaster     Ranged energy attacks, fire, lasers, plasma

  🔮 Magic       Spellcasters, sorcerers, mystics, arcane power

  🧠 Psychic     Telepathy, telekinesis, mind control

  👻 Shadow      Stealth, darkness, fear, illusion

  🛡️ Tank        Super strength, armour, invulnerability

  ⚡ Speedster   Super speed, lightning, time manipulation

  🌿 Nature      Earth, water, plants, weather, animals, healing

  ⚙️ Tech        Gadgets, robotics, hacking, powered suits

  ✨ Cosmic      Reality warping, energy absorption, space power
  --------------------------------------------------------------------

**Matchup Rules**

- Three outcomes only --- Super Effective (×2.0), Resisted (×0.5),
  Neutral (×1.0)

- Main cycle (6 types): Blaster → Magic → Psychic → Shadow → Tank →
  Speedster → Blaster. Each type is super effective against the next
  type in the cycle and resisted by it.

- Rival pair: Nature ↔ Tech. They are super effective against each other
  and neutral against all main cycle types.

- Cosmic (Dragon equivalent): resists Blaster, Shadow, Nature, Tech
  (×0.5 incoming). Neutral against Magic, Psychic, Tank, Speedster.
  Super effective only against other Cosmic cards. Note: Speedster →
  Cosmic is ×1.0 (neutral) --- Speedster is not in Cosmic\'s resist
  list. The type chart table may appear to omit this cell due to
  formatting; the value is confirmed ×1.0.

**Full Type Chart**

Attacker (rows) vs Defender (columns):

  --------------------------------------------------------------------------------------------------------------
                **🔥**     **🔮**     **🧠**     **👻**     **🛡️**     **⚡**     **🌿**     **⚙️**     **✨**
  ----------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ---------- ----------
  🔥 Blaster     ×1.0     **×2.0**     ×1.0       ×1.0       ×1.0     **×0.5**     ×1.0       ×1.0     **×0.5**

   🔮 Magic    **×0.5**     ×1.0     **×2.0**     ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0

  🧠 Psychic     ×1.0     **×0.5**     ×1.0     **×2.0**     ×1.0       ×1.0       ×1.0       ×1.0       ×1.0

   👻 Shadow     ×1.0       ×1.0     **×0.5**     ×1.0     **×2.0**     ×1.0       ×1.0       ×1.0     **×0.5**

    🛡️ Tank    **×2.0**     ×1.0       ×1.0     **×0.5**     ×1.0     **×2.0**     ×1.0       ×1.0       ×1.0

      ⚡       **×2.0**     ×1.0       ×1.0       ×1.0     **×0.5**     ×1.0       ×1.0       ×1.0       ×1.0
   Speedster                                                                                          

   🌿 Nature   **×0.5**     ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0     **×2.0**   **×0.5**

    ⚙️ Tech      ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0     **×2.0**     ×1.0     **×0.5**

   ✨ Cosmic     ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0       ×1.0     **×2.0**
  --------------------------------------------------------------------------------------------------------------

  ---------- --------------------------
   **×2.0**  Super Effective

   **×0.5**  Resisted

     ×1.0    Neutral
  ---------- --------------------------

**4. Damage Formula**

  ----------- ----------------------------------------------------------------
   **PROBLEM  The v1 formula (power × multiplier − defense × 0.5) allowed
   SOLVED**   defense to completely cancel out power for lower-rarity cards,
              producing 1-damage outcomes. The new formula caps defense\'s
              contribution as a percentage rather than a raw subtraction,
              guaranteeing every card deals meaningful damage.

  ----------- ----------------------------------------------------------------

**Base Damage Formula**

The complete damage calculation in explicit order of operations:

final damage = max(5, round( (power × 0.4 × typeMultiplier ×
staminaModifier) − (defense × 0.15) ))

Where:

power = attacker\'s Power stat

typeMultiplier = ×2.0 (super effective) \| ×0.5 (resisted) \| ×1.0
(neutral)

staminaModifier = ×0.8 (Light) \| ×1.0 (Medium) \| ×1.5 (Heavy) \| ×0.0
(Rest --- no attack)

defense = defender\'s Defense stat

min result = 5 (no card ever deals less than 5 damage)

  -------------- ----------------------------------------------------------------
    **ORDER OF   Type multiplier and stamina modifier are applied together before
   OPERATIONS**  defense reduction. Ability bonuses (Berserker, Juggernaut,
                 Overwhelm stacks, Momentum etc.) are applied to the power value
                 before the formula runs. Amp effects like Overcharge double the
                 entire final result after the formula completes.

  -------------- ----------------------------------------------------------------

**Stamina Attack Modifiers**

The stamina modifier is baked into the main formula above. It is
multiplied together with the type multiplier before defense reduction
--- not applied separately after.

**HP Formula**

hp = 100 + (defense × 0.5) (rounded)

Unchanged from v1. Defense contributes both to HP pool and to damage
reduction, making high-defense cards durable in two ways --- but neither
is so dominant that they become unkillable.

**Speed & Turn Order**

Speed determines which card attacks first each round for Light and
Medium attacks. The card with the higher Speed stat attacks first. Equal
Speed is resolved by a coin flip each round.

- Light attack: faster card attacks first

- Medium attack: faster card attacks first

- Heavy attack: the Heavy attacker ALWAYS attacks second --- the
  wind-up time of a Heavy attack gives the opponent a guaranteed first
  strike regardless of Speed. Exception: if BOTH cards choose Heavy
  this round, the normal speed check applies (higher Speed attacks
  first; equal Speed resolved by coin flip).

- Rest: no attack, no speed check --- opponent attacks freely

**Design Rationale**

- Defense contributes at most 15% of a card\'s defense stat in damage
  reduction --- a 100-defense card reduces incoming damage by 15 points,
  not 50

- Minimum damage floor of 5 guarantees no card is ever completely
  stonewalled

- A Common card (power \~30) deals roughly 7--12 base damage against a
  Legendary --- not competitive, but never pointless

- A Legendary (power \~95) deals roughly 28--42 base damage ---
  decisively stronger, but not infinitely so

**Example Damage Calculations**

  ------------------------------------------------------
  **Matchup**        **Damage    **Defense   **Final**
                     Calc**      Cut**       
  ------------------ ----------- ----------- -----------
  Common (PWR 30) vs 12 × 1.0 =  −14         5 (floor)
  Legendary (DEF 90) 12                      
  --- neutral                                

  Common (PWR 30) vs 12 × 2.0 =  −14         10
  Legendary (DEF 90) 24                      
  --- super                                  
  effective                                  

  Common (PWR 30) vs 12 × 0.5 =  −14         5 (floor)
  Legendary (DEF 90) 6                       
  --- resisted                               

  Rare (PWR 65) vs   26 × 1.0 =  −10         16
  Rare (DEF 68) ---  26                      
  neutral                                    

  Legendary (PWR 95) 38 × 1.0 =  −5          33
  vs Common (DEF 30) 38                      
  --- neutral                                

  Legendary (PWR 95) 38 × 2.0 ×  −5          109
  super effective +  1.5 = 114               
  heavy attack                               
  ------------------------------------------------------

**5. Round Structure**

Each round follows a strict sequence of steps. Understanding this order
is critical for implementing ability triggers, Amp gain timing, and
damage resolution correctly.

  -------------------------------------------------------------------------
  **Step**   **Phase**            **What Happens**
  ---------- -------------------- -----------------------------------------
  1          Draw Phase           Both player and AI may draw a card as
                                  their action this round (costs their
                                  turn --- no attack). Drawing is only
                                  available if the deck is not empty and
                                  hand size is below 5. Neither side gets
                                  a free automatic draw --- the AI follows
                                  the same draw rules as the player.

  2          Pre-Action Buffs     Passive per-round ability effects trigger
                                  (Resilience HP recovery, Pressure stamina
                                  cost increase, Siege stamina cap
                                  reduction, Amp Drain, Overwhelming Force
                                  tick).

  3          Action Selection     Both player and AI choose their action:
                                  Light / Medium / Heavy / Rest / Swap /
                                  Draw.

  4          Speed Check          For Light and Medium attacks: higher
                                  Speed attacks first; equal Speed is a
                                  coin flip. Heavy attack: the Heavy
                                  attacker always goes second --- the
                                  opponent attacks first regardless of
                                  Speed. Exception: if both cards choose
                                  Heavy, apply the normal speed check.
                                  Rest/Swap/Draw: no attack from that
                                  side.

  5          Damage Calculation   Apply formula: max(5, round((power × 0.4
                                  × typeMultiplier × staminaModifier) −
                                  (defense × 0.15))). Apply active Amp
                                  effects (Overcharge, Equaliser etc.).
                                  Stamina Leech resolves here --- see
                                  Step 6.

  6          On-Hit Effects       Stamina Leech fires when damage is
                                  dealt. The Stamina Leech card drains 1
                                  stamina from the opponent at the moment
                                  its hit lands. If the Stamina Leech
                                  card attacks first (higher speed) and
                                  the drain brings the opponent to 0
                                  stamina, the opponent\'s attack is
                                  cancelled for that round --- they must
                                  Swap or Rest on their next turn. If the
                                  Stamina Leech card attacks second
                                  (lower speed), the drain takes effect
                                  after both attacks resolve and applies
                                  from the next round onward.

  7          On-Damage Triggers   Ability triggers that fire on receiving
                                  damage: Counterstrike (reflect),
                                  Berserker (attack buff), Counterpunch
                                  (Heavy retaliation), Grit (damage
                                  reduction check).

  8          HP Update & Defeat   Apply damage to HP. Check for defeat.
             Check                Second Wind and Last Stand resolve here
                                  --- after all damage is applied.

  9          On-Defeat Triggers   If a card is defeated: Last Effort fires,
                                  Rebound buff applies to next card,
                                  Dominate debuff queues for next opponent
                                  card, Payback burst hit resolves on the
                                  incoming card, Fortify/Apex
                                  Predator/Momentum update on the winning
                                  card.

  10         Card Entry           Defeated card\'s replacement enters.
                                  Entry effects trigger: Smoke Screen,
                                  Adaptable, Bleed (first attack flag set),
                                  Intimidate, Dead Weight, Nullify, Death
                                  Mark. Legendary Lock checked.

  11         Amp Gain             Both sides receive Amp based on actions
                                  taken and damage dealt/received this
                                  round.

  12         Hand Stamina Regen   All cards in hand gain +1 stamina (capped
                                  at their max).

  13         Amp Effect Duration  Active Amp effect round counter
                                  decrements. If it reaches 0, the effect
                                  expires.

  14         Battle End Check     Check if either player has no active card
                                  and no cards to play. If yes, battle
                                  ends. Tie check if both simultaneously.
  -------------------------------------------------------------------------

**6. Stamina System**

Each card has its own independent stamina pool determined by its type.
On your turn, you choose the weight of your attack --- or choose to Rest
and recover stamina. Stamina is per-card and each card retains its own
stamina independently.

**Attack Options**

  ---------------------------------------------------------------------
  **Action**    **Stamina   **Damage          **Notes**
                Cost**      Modifier**        
  ------------- ----------- ----------------- -------------------------
  🥊 Light      1           ×0.8              Safe and sustainable.
                                              Always available as long
                                              as card has any stamina.

  ⚔️ Medium     3           ×1.0              Standard attack. The
                                              balanced default.

  💥 Heavy      5           ×1.5              Powerful but costly.
                                              Opponent always attacks
                                              first this round
                                              regardless of speed.

  😴 Rest       0           No attack         Card does nothing this
                                              round and regens +5
                                              stamina. Opponent gets a
                                              free uncontested attack.
                                              Always available --- even
                                              at full stamina as a
                                              strategic top-up.
  ---------------------------------------------------------------------

  -------- ----------------------------------------------------------------
   **REST  If a card reaches 0 stamina it cannot attack at all --- Rest
   NOTE**  becomes the only option. This creates high-stakes moments where
           a card on empty stamina is completely vulnerable for one round.

  -------- ----------------------------------------------------------------

**Stamina --- Per Card, Independent**

- Every card has its own independent stamina pool. Stamina is never
  shared between cards.

- When a card is swapped to hand it retains whatever stamina it had ---
  e.g. a card swapped out at 5 stamina returns to hand with 5 stamina.

- When a card re-enters battle from hand it brings its current stamina
  --- it does not reset to its max.

**Stamina by Type**

Each card has a fixed stamina value permanently assigned within its
type\'s range. Stamina is a stat like Power, Defense, and Speed --- it
is set once and players learn their cards\' stamina values over time.
The range defines the bounds for assignment, not a per-battle re-roll.

  ---------------------------------------------------------------------
  **Type**       **Stamina     **Reasoning**
                 Range**       
  -------------- ------------- ----------------------------------------
  🛡️ Tank        12--16        Built to endure --- even the weakest
                               Tank outlasts most

  🌿 Nature      10--14        Regenerative and patient --- wide range
                               reflects variety in nature powers

  ⚙️ Tech        10--13        Efficient energy management ---
                               consistent and predictable

  🔮 Magic       9--12         Spell casting varies --- some spells
                               cost far more than others

  🧠 Psychic     8--12         Mental endurance varies hugely between
                               characters

  👻 Shadow      8--11         Precise and calculated but physically
                               limited

  ✨ Cosmic      8--12         Raw power --- stamina is almost an
                               afterthought

  🔥 Blaster     6--10         High output burns through energy fast
                               --- some blast more efficiently than
                               others

  ⚡ Speedster   6--9          Explosive but burns out quickly ---
                               captures sprinters vs marathon runners
  ---------------------------------------------------------------------

**Stamina Regeneration**

  --------------------------------------------------------------------
  **Card Location** **Regen Rate**    **Notes**
  ----------------- ----------------- --------------------------------
  Active --- Rest   +5                Player chooses Rest instead of
  action                              attacking. Opponent gets a free
                                      uncontested attack.

  Active ---        None              No passive regen while fighting.
  attacking                           

  Hand              +1 per round      Passive regen every round, no
                                      action required.

  Deck              None              Cards in the deck do not regen.
                                      Draw them into hand to start
                                      recovering.
  --------------------------------------------------------------------

**Strategic Implications**

- Rest is always a valid option --- even at 8 stamina, topping up to max
  before a heavy attack can be the right play

- A card at 0 stamina is completely vulnerable --- Rest becomes forced,
  giving the opponent a guaranteed free hit

- Smart rotation is rewarded --- a card resting in hand at +1/round can
  return to battle fully recovered

- Spamming heavy attacks drains stamina in 2--3 turns --- knowing when
  to light attack or rest is the core stamina skill

- A Speedster (6--9 stamina) can only land 1 heavy before needing to
  recover --- very different feel to a Tank (12--16) who can chain
  multiple heavies

- The AI tracks stamina for all cards and factors it into swap, rest,
  and attack weight decisions

**7. Amp the Battlefield**

  -------- ----------------------------------------------------------------
   **WHAT  Both player and AI have independent Amp meters (0--100) that
  IS IT**  fill through combat engagement. The same effect is visible to
           both sides --- it\'s a race to 100, but if the current effect
           doesn\'t suit you, you can spend 50 Amp to rotate to the next
           one. First to trigger gets the effect. Strategy comes from
           reading the battlefield and deciding when the right moment is.

  -------- ----------------------------------------------------------------

**Independent Amp Meters**

- Player and AI each have their own Amp meter (0--100)

- Both meters fill through the same engagement actions --- the race is
  always live

- The current effect in the pool is the same for both sides and visible
  to both at all times

- The current effect is visible to both players --- the next effect is
  always hidden until it appears

- First to hit 100 can trigger the current effect, or spend 50 Amp to
  randomly switch to a new one

- Switching changes the effect for both sides --- it is a shared pool
  and a tactical move that can deny the AI a favourable effect

- You can spend 50 multiple times in a row to keep switching --- each
  spend costs 50 from your current total

- After triggering: your meter resets to 0, opponent\'s meter stays
  where it is, a new effect is randomly selected

- No decay --- the meter holds at whatever value until triggered or
  spent

**Building Amp**

  ---------------------------------------------------------------------
  **Action**                      **Amp Gained**  **Notes**
  ------------------------------- --------------- ---------------------
  Light attack                    +3              Low commitment, low
                                                  reward

  Medium attack                   +6              Standard engagement

  Heavy attack                    +10             High risk, high Amp
                                                  reward --- rewards
                                                  aggression

  Rest                            +2              Passive, minimal
                                                  contribution

  Draw                            +2              Non-combat, minimal
                                                  contribution

  Swap                            +3              Tactical move, small
                                                  reward

  Taking damage                   +round(damage × Scales with damage
                                  0.3)            received --- a
                                                  20-damage hit gives
                                                  +6, a 50-damage hit
                                                  gives +15

  Defeating an opponent\'s card   +15             Major combat
                                                  milestone

  Ability activation              +4              Active engagement
                                                  bonus
  ---------------------------------------------------------------------

  ------------ ----------------------------------------------------------------
   **PACING**  At a typical rate of medium attacks both ways, each player gains
               roughly 10 Amp per round (6 attack + \~4 from taking damage). A
               full bar takes about 10 rounds --- roughly one full battle.
               Heavy attack spam reaches it in \~5 rounds.

  ------------ ----------------------------------------------------------------

**Triggering Amp**

- When your meter hits 100 you can trigger the current effect on your
  turn --- your meter resets to 0, the effect activates for you, and a
  new effect is randomly selected for both players

- Your opponent\'s meter stays where it is after you trigger --- they
  keep their Amp progress

- The AI triggers automatically when its meter hits 100 and the current
  effect suits its situation

- There is no decay --- meters hold indefinitely until triggered or
  spent on a switch

**Spending Amp to Switch Effects**

- At any time when your meter is at 50 or above, you can spend 50 Amp to
  randomly select a new current effect --- without triggering

- The new effect is randomly chosen from the 5 effects that are NOT the
  current one --- so the same effect never appears twice in a row

- The same effect CAN appear multiple times in a battle --- just never
  back-to-back

- Switching changes the effect for both player and AI --- it is a shared
  pool

- You can spend 50 multiple times in a row to keep rolling: 100 → spend
  → 50 → spend → 0

- The next effect is always hidden --- switching is a calculated gamble,
  not a guaranteed improvement

**Amp Effects**

Both players can see the current effect only --- the next effect is
hidden until it appears. Each effect is highly situational --- the right
moment to trigger depends entirely on the current battle state.

  --------------------------------------------------------------------------------
  **Effect**    **Duration**   **Description**         **Best When**   **Skip
                                                                       When**
  ------------- -------------- ----------------------- --------------- -----------
  ⚡ Overcharge 2 rounds       Your active card deals  Card is healthy Card is low
                               double damage           with full       HP or
                                                       stamina         stamina

  🔄 Type Flip  2 rounds       Your type disadvantage  Stuck in a type You already
                               (×0.5) becomes an       disadvantage    have type
                               advantage (×2.0). No    matchup         advantage
                               effect if neutral or                    
                               already advantaged.                     

  💤 Exhaustion 2 rounds       Opponent\'s active card Opponent is     Opponent is
                               attack costs double     loaded up for a already low
                               stamina for 2 rounds    heavy attack    stamina

  🩹 Field      Instant        Restores 40% of your    Your card is    Your card
  Medic                        active card\'s max HP   critically low  is healthy
                               immediately             HP              --- wasted

  🎯 Lock On    3 rounds       Opponent cannot Swap or Opponent is     Opponent is
                               Draw for 3 rounds ---   rotating to     not
                               locked into their       exploit type    swapping
                               active card             advantages      

  ⚖️ Equaliser  2 rounds       Both cards\' Attack and Facing a        You have
                               Defense are set to the  significantly   the
                               average of the two       stronger card   stronger
                               (using current buffed                   card --- it
                               values, not base stats)                 hurts you
                               for 2 rounds. Speed is
                               unaffected.
  --------------------------------------------------------------------------------

**Strategic Notes**

- The race dynamic means sometimes the smart play is NOT to rush --- if
  the current effect doesn\'t suit you, let your opponent trigger it and
  rotate the pool

- Spending 50 to switch is a calculated gamble --- you lose 50 Amp
  progress, change the effect for both players, but have no guarantee
  the new effect is better

- Taking heavy damage rapidly builds Amp --- a ×2.0 super effective hit
  can give 10--20 Amp in one round, accelerating a comeback

- Heavy attacks build Amp fastest but drain stamina --- aggressive
  players reach Amp sooner but arrive there more vulnerable

- Equaliser is the highest-skill effect --- it actively hurts you if you
  trigger it at the wrong moment, but for a losing player it is a
  legitimate path back

- The AI factors the current effect into its decision to trigger or
  switch --- it will not trigger Equaliser when it has the stronger card

**8. Card Abilities --- Rebalanced for v2**

All 50 abilities are reviewed against the new damage formula, stamina
system, and Amp mechanic. Abilities that were too strong or too weak
under v1 are adjusted. The pool of 10 per rarity and one-ability-per-card
rule remain unchanged.

**Common Abilities**

  ----------------------------------------------------------------------
  **Ability**   **Effect**
  ------------- --------------------------------------------------------
  Grit          Takes 15% reduced damage when HP is below 50%

  Opportunist   Deals 20% bonus damage when attacking an opponent below
                40% HP

  Resilience    Recovers 8 HP at the start of each round

  Shield Up     Reduces damage from the opponent\'s first attack by 30%

  Tenacity      If the player loses a battle with this card in their
                deck, the overall win streak does not reset. One
                protection per battle.

  Steady        Light attacks cost 0 stamina instead of 1 --- Light
                attacks are always free for this card

  Scrapper      Gains +3 Amp whenever this card takes damage

  Last Effort   When this card is defeated, the opponent\'s active card
                loses 10% of its max HP

  Warm Up       This card starts with +3 bonus stamina

  Stubborn      The first time this card takes damage that would bring
                it below 20% HP, that hit is reduced so the card
                survives at exactly 20% HP. Triggers once only.
  ----------------------------------------------------------------------

  -------- ----------------------------------------------------------------
   **EDGE  Last Effort can cause both players\' last cards to die
   CASE**  simultaneously --- e.g. Last Effort chip damage kills the
           opponent\'s last card in the same round the active card is
           defeated. This should result in a Tie. Both players receive loss
           rewards, and the win streak is not broken for either player.
           Implement a Tie result state in the battle engine.

  -------- ----------------------------------------------------------------

**Uncommon Abilities**

  ---------------------------------------------------------------------
  **Ability**    **Effect**
  -------------- ------------------------------------------------------
  Smoke Screen   When this card enters the active spot, the opponent\'s
                 first attack has a 50% chance to miss entirely

  Adrenaline     Gains +20% attack when below 30% HP

  Pack Tactics   +15% damage if at least one other card in your deck
                 shares the same type

  Adaptable      When this card enters the active spot, the first
                 type-advantage attack against it is reduced to neutral
                 (×1.0). This effect resets each time this card
                 re-enters the active spot.

  Rebound        When this card is defeated, the next card you play
                 enters battle with +15% damage for the remainder of
                 the battle

  Heavy Handed   Every Heavy attack this card lands generates +5 bonus
                 Amp on top of the normal Heavy attack Amp gain

  Stamina Leech  When this card deals damage, the opponent\'s active
                 card loses 1 stamina. If this card attacks first
                 (higher speed) and the drain brings the opponent to 0
                 stamina, the opponent\'s attack is cancelled for that
                 round. If this card attacks second, the drain applies
                 from the next round onward.

  Rested and     When this card enters battle from hand at full
  Ready          stamina, its first attack deals 30% bonus damage

  Momentum       Each consecutive opponent card this card defeats,
                 damage increases by 10% (stacks, max +50%)

  Counterpunch   When the opponent uses a Heavy attack against this
                 card, this card automatically deals back 20% of the
                 damage received, regardless of whose turn it is
  ---------------------------------------------------------------------

**Rare Abilities**

  ----------------------------------------------------------------------
  **Ability**     **Effect**
  --------------- ------------------------------------------------------
  Bleed           The first attack after this card enters the active
                  spot applies a DoT dealing 8% of the opponent\'s max
                  HP per round for 3 rounds

  Intimidate      When this card enters the active spot, reduces the
                  opponent\'s active card attack by 15% for 3 rounds

  Fortify         Gains 8% damage reduction each time it defeats an
                  opponent\'s card (stacks, max 40%)

  Amp Siphon      When this card deals damage, steal 3 Amp from the
                  opponent and add it to your own meter

  Dead Weight     When this card enters the active spot, the opponent\'s
                  active card loses 20% of its current stamina

  Payback         Each round this card takes damage without defeating
                  the opponent, it stores 10% of damage received. When
                  it finally defeats an opponent\'s card, it deals all
                  stored damage to the next card the opponent plays in a
                  single hit.

  Amp Shield      When your Amp meter is above 50, this card takes 20%
                  reduced damage

  Counterstrike   25% chance each round to reflect half the damage
                  received back to the attacker

  Type Bully      When this card has a type advantage, Heavy attacks
                  cost 2 less stamina

  Pressure        Each round this card is active, the opponent\'s active
                  card costs +1 stamina for Medium attacks (stacks up to
                  +3). Resets when this card leaves the active spot.
  ----------------------------------------------------------------------

**Epic Abilities**

  --------------------------------------------------------------------
  **Ability**   **Effect**
  ------------- ------------------------------------------------------
  Second Wind   Once per battle, when this card would be defeated, it
                survives at 20% HP instead

  Execute       Deals double damage to opponents below 25% HP

  Drain         Heals for 25% of all damage dealt each round

  Unstoppable   When this card enters the active spot, its first 3
                attacks ignore type disadvantage

  Overwhelm     When this card has type advantage, each consecutive
                round it stays active its damage increases by 20%.
                Resets to zero when this card leaves the active spot,
                including if it re-enters later in the battle.

  Amp Surge     When this card triggers Amp, gain an additional 25 Amp
                immediately after the meter resets

  Stamina       When this card defeats an opponent\'s card, it steals
  Vampire       all of that card\'s remaining stamina

  Berserker     Each round this card takes damage, its attack
                permanently increases by 8% for the rest of the battle
                (stacks, max +80%)

  Death Mark    When this card enters the active spot, the opponent\'s
                active card is marked (shown with a visible
                indicator). The mark follows that card even if it is
                swapped out. If the marked card is defeated at any
                point, your next card enters battle with full stamina.

  Riposte       When this card chooses Rest, it does not take a free
                hit from the opponent that round --- and if the
                opponent attacks anyway, deals back 50% of the damage
                it would have received
  --------------------------------------------------------------------

**Legendary Abilities**

  ---------------------------------------------------------------------
  **Ability**    **Effect**
  -------------- ------------------------------------------------------
  Apex Predator  Each time this card defeats an opponent\'s card, all
                 its stats increase by 8%

  Immunity       Blocks all debuffs applied to this card including
                 Bleed, Intimidate, Dead Weight, Pressure, and type
                 disadvantage

  Last Stand     When this card is reduced to 0 HP for the first time,
                 it survives at 1 HP and gains +50% attack for the rest
                 of the battle

  Overwhelming   Deals bonus damage equal to 10% of the opponent\'s max
  Force          HP each round, ignoring defense. This bonus damage is
                 capped at 30 per round.

  Dominate       After this card defeats an opponent\'s card, the very
                 next card the opponent plays has its attack reduced by
                 25% for 3 rounds

  Amp Drain      Each round this card is active, drain 5 Amp from the
                 opponent\'s meter and add it to yours

  Juggernaut     Each consecutive round this card attacks, it gains
                 +10% damage. Drawing a card does not reset this.
                 Resets if it Rests or Swaps out.

  Nullify        When this card enters the active spot, the opponent\'s
                 active card loses its ability for 5 rounds

  Siege          Each round this card is active, the opponent\'s active
                 card\'s stamina cap is reduced by 1. This only lowers
                 the ceiling --- it does not drain current stamina
                 directly. The stamina cap can never be reduced below 3
                 by this effect. Resets when this card leaves the
                 active spot.

  The Floor is   When your Amp meter hits 100, this card deals 20%
  Yours          bonus damage until you trigger Amp
  ---------------------------------------------------------------------

**Ability Interaction Rules**

The following rules define how abilities interact with each other and
with the game\'s core systems. These are implementation rules and are
not shown to players.

**General Rules**

- Each card has exactly one ability. No card can have more than one.

- Immunity blocks all debuffs applied to this card by the opponent ---
  Bleed, Intimidate, Dead Weight, Pressure, Siege, Dominate, Nullify,
  and type disadvantage. It does not block self-applied buffs such as
  Berserker (which is triggered by taking damage, not applied by the
  opponent).

- Drain heals based on damage this card deals directly. It does not
  trigger from reflected Counterstrike damage received by the opponent.

- Second Wind resolves after all incoming damage from the opponent is
  fully calculated --- Execute\'s double damage check and Berserker\'s
  accumulated bonus both apply before Second Wind triggers.

- Pack Tactics checks deck composition at the moment the deck is
  assembled. The +15% bonus applies for the full battle if the condition
  is met at that point, regardless of what happens to other cards during
  the battle.

- All debuffs (Bleed, Intimidate, Dominate, Pressure) persist for the
  rest of their duration even after the card that applied them is
  defeated.

- Last Effort can cause both players\' last cards to die simultaneously.
  This is a Tie. Both players receive loss rewards and neither player\'s
  win streak is broken.

**Entry Effects**

- Entry effects (Smoke Screen, Adaptable, Bleed, Intimidate, Dead
  Weight) trigger each time a card enters the active spot, including
  when it re-enters after being swapped back in.

- If a card with an entry ability is Nullified and the 5 rounds expire
  while the card is still active, the ability does not re-trigger
  mid-battle. It only fires again the next time the card enters the
  active spot.

- Adaptable resets each time the card re-enters the active spot --- the
  type-advantage protection is restored on each new entry.

**Stamina Interactions**

- Siege reduces the stamina cap, not current stamina. If a card has 8
  current stamina and Siege reduces the cap to 7, the card\'s current
  stamina is immediately reduced to 7 to match the new cap.

- Siege and Dead Weight are independent effects and stack --- Siege
  lowers the cap over time, Dead Weight drains current stamina on entry.

- Stamina Leech triggers once per round when this card deals damage,
  draining 1 stamina from the opponent at the moment the hit lands. If
  this card attacks first (higher speed) and the drain brings the
  opponent to 0 stamina, the opponent\'s attack is cancelled for that
  round. If this card attacks second, the drain applies from the next
  round onward. Players must proactively manage their stamina when
  facing a Stamina Leech card --- being at 1 stamina against a faster
  Stamina Leech card means the next hit will force a Rest.

- Stamina Vampire steals all remaining stamina from the defeated card,
  not capped by the receiving card\'s maximum --- if stolen stamina
  would exceed max, it is capped at the card\'s max stamina.

**Amp Interactions**

- Amp Drain cannot reduce the opponent\'s Amp below 0. If the opponent
  has 3 Amp and Amp Drain triggers, only 3 Amp is transferred.

- Amp Siphon triggers once per round when this card deals damage,
  stealing 3 Amp per hit.

- Amp Surge fires after the Amp meter resets to 0 following a trigger
  --- the 25 bonus Amp is added after the reset, not before.

- Amp Drain and Amp Surge together create an accelerated Amp loop. This
  is intentional but should be monitored during playtesting for balance.

**Damage & Combat**

- Payback stores damage across multiple rounds and releases it as a
  single hit when this card defeats an opponent. This hit is treated as
  normal damage for the purposes of triggering other effects on the
  receiving card (e.g. Counterstrike, Berserker). It does not trigger
  Bleed since Payback and Bleed cannot exist on the same card.

- Warm Up grants +3 bonus stamina at battle start. This can exceed the
  card\'s normal stamina maximum --- a Speedster with max 6 stamina
  starts at 9. The card\'s stamina cap is not raised permanently; normal
  regen and stamina gain elsewhere are still capped at the card\'s base
  max. Only the Warm Up starting bonus may exceed it.

- Scrapper gains +3 Amp per damage event, not per round. If the card
  takes multiple hits in a single round (e.g. primary attack plus a
  Counterstrike reflect or Counterpunch retaliation), each hit triggers
  +3 Amp independently.

- Counterpunch and Riposte are always on different cards since each card
  has only one ability. They do not interact with each other.

- Berserker\'s attack bonus is self-applied and is not blocked by
  Immunity. The +8% per round stacks to a maximum of +80%.

- Overwhelming Force\'s 10% max HP bonus damage is capped at 30 per
  round. It is calculated after the type multiplier and stamina modifier
  but is not subject to defense reduction.

- Overwhelm\'s damage increase resets to zero when the card leaves the
  active spot, including if it re-enters later in the same battle. The
  stack does not persist between entries.

- Juggernaut\'s damage bonus is not reset by the Draw action. Only Rest
  and Swap reset it.

- Overcharge (Amp effect) doubles all damage dealt. It applies to the
  final damage value after all other multipliers --- type multiplier,
  stamina modifier, and ability bonuses (Overwhelm stack, Berserker
  stack, Juggernaut stack) are all calculated first, then Overcharge
  doubles the result.

- Type Flip (Amp effect) converts a ×0.5 disadvantage to ×2.0 advantage.
  While Type Flip is active, Overwhelm does activate since the card
  technically has type advantage. The Overwhelm stack begins from zero
  on the first round of Type Flip.

**Death Mark**

- The mark applied by Death Mark follows the marked card even if it is
  swapped to hand. The mark is visible to both players at all times.

- If the marked card is Nullified, the mark still persists --- Nullify
  only removes the card\'s ability, not effects applied to it by other
  cards.

- If the Death Mark card is defeated before the marked card, the mark
  remains on the opponent\'s card. The reward (next card enters with
  full stamina) still triggers if the marked card is later defeated.

**Nullify**

- Nullify removes the opponent\'s active card\'s ability for 5 rounds.
  Passive abilities stop triggering. Entry effects do not re-trigger for
  the duration.

- If the Nullified card is swapped out and back in during the 5 rounds,
  the ability remains suppressed for the remainder of the 5 rounds ---
  the counter does not reset on re-entry.

- After 5 rounds, the ability is restored. If the card re-enters the
  active spot after restoration, entry effects trigger normally.

**9. Legendary Lock Rule**

To prevent Legendary cards from dominating battles from the opening
round, a Legendary Lock rule is in effect. This applies to both the
player and the AI.

**The Rule**

- A Legendary card cannot be played into the active spot until the
  player or AI has defeated at least 3 of the opponent\'s cards in the
  current battle

- A battle cannot begin with a Legendary card in the active spot --- the
  opening card must be Common, Uncommon, Rare, or Epic

- Legendary cards may be held in hand before the lock is lifted --- they
  just cannot be played until the condition is met

- Once 3 opponent cards have been defeated, the lock is permanently
  lifted for the rest of that battle

**Edge Cases**

- If a player\'s only remaining cards are Legendary and the lock has not
  been lifted, those cards cannot be played --- the battle is lost at
  that point

- The lock applies independently to each player --- a player who has
  defeated 3 opponent cards can play their Legendary even if the
  opponent has not yet defeated 3

- Intentionally fielding weaker cards early to absorb defeats while
  keeping Legendaries in hand is a valid strategic approach. The lock is
  a minimum threshold, not a punishment for losing.

- The AI follows the same rule and will not play a Legendary card until
  it has defeated 3 of the player\'s cards

  ---------- ----------------------------------------------------------------
   **DESIGN  This rule ensures that Legendary cards feel like a reward earned
    NOTE**   through battle performance rather than a guaranteed opening
             weapon. It also prevents a dominant early Legendary from
             shutting down the opponent before they have a chance to build
             Amp, apply debuffs, or establish type matchups.

  ---------- ----------------------------------------------------------------

**10. AI Behaviour**

The AI operates under the same rules as the player in every respect ---
it has stamina, builds Amp, chooses attack weights, can Rest, Draw, and
Swap, and is subject to the Legendary Lock rule. The AI is not
omniscient --- it makes decisions based on observable battle state, not
hidden information such as the player\'s hand or deck order.

**Core Principle**

  ---------- ----------------------------------------------------------------
   **DESIGN  The AI should feel like a competent opponent that makes
    GOAL**   recognisably smart decisions --- not a random number generator,
             but not a perfect chess engine either. Players should be able to
             anticipate AI behaviour after a few battles and feel rewarded
             for outplaying it.

  ---------- ----------------------------------------------------------------

**Attack Weight Decision**

Each round the AI evaluates its current stamina and HP situation before
choosing an attack weight:

  --------------------------------------------------------------------
  **Condition**     **AI Behaviour**
  ----------------- --------------------------------------------------
  Stamina ≥ 5 AND   Prefers Heavy attack --- healthy card with enough
  HP \> 50%         stamina to commit

  Stamina ≥ 3 AND   Uses Medium attack --- standard engagement
  HP \> 30%         

  Stamina \< 3 OR   Uses Light attack --- conserving stamina or
  HP \< 30%         protecting a low-HP card

  Stamina = 0       Chooses Rest --- no choice but to recover

  Stamina ≤ 2 AND   May Swap instead of attacking --- brings in a
  hand card has     fresh card
  high stamina      
  --------------------------------------------------------------------

**Rest Decision**

The AI uses Rest strategically rather than only as a last resort:

- Rests when stamina is at 3 or below AND the opponent\'s active card is
  also low HP --- calculating it can survive one more hit and come back
  swinging

- Rests when the opponent\'s active card has the Riposte ability ---
  avoids attacking into a Riposte trap

- Never Rests when the opponent\'s card is below 25% HP and the AI has
  Execute --- always attacks to execute the kill

- Avoids Resting if its current HP is critically low and a swap would be
  safer

**Swap Decision**

The AI evaluates whether swapping is better than attacking each round
using a 3-priority decision tree:

- Priority 1 --- Swap if the active card has type disadvantage AND a
  hand card has type advantage over the opponent\'s active card

- Priority 2 --- Swap if the active card\'s HP is below 35% AND a hand
  card has significantly higher HP

- Priority 3 --- Swap if the active card has 2 or less stamina AND a
  hand card has full or near-full stamina (benefiting from hand regen)

- The AI does not swap if Lock On is active --- it recognises the swap
  is blocked and chooses the best available attack instead

**Draw Decision**

The AI draws as an action (costs its turn, no attack) under the same
rules as the player --- only when its hand is below 5 cards and the
deck is not empty. The AI prioritises drawing when its hand is at 2
cards or fewer and it has no strong attack option that round. It does
not draw if it has a high-value attack opportunity (e.g. opponent is
low HP and AI can finish the kill).

**Stamina Management**

- The AI tracks the stamina of every card in its hand and factors regen
  into swap decisions --- it knows a card that has been in hand for 4
  rounds is likely near full stamina

- The AI never uses a Heavy attack if doing so would leave the active
  card at 0 stamina with no kill --- it avoids being left vulnerable

- When the Exhaustion Amp effect is active, the AI switches to Light
  attacks to conserve stamina against the doubled cost

- The AI is aware of Stamina Leech on the opponent\'s card. If the
  opponent\'s active card has Stamina Leech and the AI\'s active card
  has 1 stamina remaining, the AI proactively Swaps to a card with
  higher stamina or Rests rather than attacking into a forced drain. If
  no swap is available and Rest would leave it more vulnerable, the AI
  accepts the forced Rest on the following round rather than wasting
  an attack at 0 stamina.

**Amp Meter Management**

The AI treats the Amp meter as a strategic resource, not just a meter to
fill and dump:

- The AI evaluates the current Amp effect before triggering --- it will
  not trigger Equaliser if its active card has higher stats than the
  opponent\'s

- The AI will spend 50 Amp to switch effects if the current effect is
  clearly unfavourable (e.g. Field Medic when both cards are at full HP)

- The AI prioritises Heavy attacks when its Amp meter is below 50 and
  the current effect is favourable --- it wants to reach 100 before the
  player

- The AI will not trigger Amp if the opponent\'s card is about to be
  defeated --- it saves the trigger for the next card matchup where the
  effect is more impactful

- The AI recognises when the player has The Floor is Yours active and
  attempts to trigger Amp quickly to remove the player\'s bonus damage

- When the AI has Amp Drain active, it factors the drain rate into its
  timing --- it knows the longer it waits, the more Amp it has stolen

**Ability Awareness**

The AI is aware of its own card\'s ability and factors it into
decisions:

  --------------------------------------------------------------------
  **Ability**    **AI Behaviour**
  -------------- -----------------------------------------------------
  Bleed          Always attacks on entry to trigger Bleed before doing
                 anything else

  Rested and     Only swaps this card in when it has confirmed full
  Ready          stamina in hand

  Juggernaut     Avoids Resting and Swapping once the stack is above
                 30% --- committed to the chain

  Berserker      More willing to take damage when HP is above 50% ---
                 farming the attack bonus

  Second Wind    More aggressive when HP is low --- knows it has a
                 safety net

  Last Stand     Does not flee on low HP --- stays active knowing the
                 first death triggers the attack bonus

  Overwhelm      Prioritises staying active when it has type advantage
                 --- never swaps out while the stack is building

  Riposte        Chooses Rest strategically when the opponent is
                 likely to attack --- baiting the 50% return

  Payback        Stays in the active spot longer than normal ---
                 farming stored damage before the kill

  Amp Surge      Prioritises reaching 100 Amp as quickly as possible
                 using Heavy attacks
  --------------------------------------------------------------------

**Legendary Lock Awareness**

- The AI tracks its own kill count and knows when the Legendary Lock is
  about to be lifted

- When the AI has 2 kills and a Legendary in hand, it prioritises
  securing the 3rd kill before swapping

- The AI never attempts to play a Legendary card while the lock is
  active --- it selects the next best available card instead. If the
  AI\'s only remaining cards are Legendary and the lock has not been
  lifted, the AI loses the battle immediately --- the same rule that
  applies to the player.

**11. New Achievements**

The following achievements are added to the existing 52-achievement pool
to cover new v2 mechanics. All follow the existing Tier I--V structure
with escalating thresholds. Achievements that already exist in v1
(Battle Victor, Giant Killer, Win Streak, Champion, Battles Fought) are
unchanged.

**Type Mastery**

Rewards players who learn and exploit the type system.

  --------------------------------------------------------------------------
  **Achievement**      **Tier I** **Tier     **Tier     **Tier     **Tier
                                  II**       III**      IV**       V**
  -------------------- ---------- ---------- ---------- ---------- ---------
  Type Advantage (wins 1          10         50         150        300
  with ×2.0 matchup)                                               

  Cosmic Clash (win a  1          5          15         40         100
  battle where your
  active card is
  Cosmic AND the
  opponent\'s active
  card is Cosmic at
  the moment of the
  final kill)                                                          

  Against All Odds     1          10         35         100        250
  (win with type                                                   
  disadvantage)                                                    
  --------------------------------------------------------------------------

**Stamina Mastery**

Rewards players who use stamina mechanics strategically.

  --------------------------------------------------------------------------
  **Achievement**      **Tier I** **Tier     **Tier     **Tier     **Tier
                                  II**       III**      IV**       V**
  -------------------- ---------- ---------- ---------- ---------- ---------
  Heavy Hitter         1          15         50         150        400
  (defeats with Heavy                                              
  attacks)                                                         

  Iron Will (wins a    1          5          20         60         150
  battle with a card                                               
  that reached 0                                                   
  stamina)                                                         

  Well Rested (cards   1          15         50         150        350
  that won a round                                                 
  after entering from                                              
  hand at full                                                     
  stamina)                                                         
  --------------------------------------------------------------------------

**Amp Mastery**

Rewards players who build and use the Amp meter effectively.

  --------------------------------------------------------------------------
  **Achievement**      **Tier I** **Tier     **Tier     **Tier     **Tier
                                  II**       III**      IV**       V**
  -------------------- ---------- ---------- ---------- ---------- ---------
  Amped Up (Amp        1          10         50         200        500
  triggers across all                                              
  battles)                                                         

  Photo Finish         1          5          20         75         200
  (triggered Amp while                                             
  opponent had ≥ 80                                                
  Amp)                                                             

  Battlefield Control  1          ---        ---        ---        ---
  (triggered all 6 Amp
  effects in a single
  battle)                                                    

  The Switcher (spent  1          10         30         75         150
  50 Amp to switch                                                 
  effects)                                                         
  --------------------------------------------------------------------------

**Ability Mastery**

Rewards players whose cards\' abilities activate in meaningful ways.

  --------------------------------------------------------------------------
  **Achievement**      **Tier I** **Tier     **Tier     **Tier     **Tier
                                  II**       III**      IV**       V**
  -------------------- ---------- ---------- ---------- ---------- ---------
  Ability Activated    1          50         200        500        1000
  (total ability                                                   
  activations)                                                     

  Second Chance        1          5          20         60         150
  (survived a killing                                              
  blow via Second Wind                                             
  or Last Stand)                                                   

  Executioner (kills   1          15         50         150        400
  landed while                                                     
  opponent was below                                               
  25% HP via Execute)                                              

  Unstoppable Force    1          5          20         60         150
  (wins with a                                                     
  Juggernaut card that                                             
  reached +50% or more                                             
  damage)                                                          
  --------------------------------------------------------------------------

**Legendary Lock**

Rewards players who earn and use Legendary cards in battle.

  --------------------------------------------------------------------------
  **Achievement**      **Tier I** **Tier     **Tier     **Tier     **Tier
                                  II**       III**      IV**       V**
  -------------------- ---------- ---------- ---------- ---------- ---------
  Legendary Unleashed  1          10         50         150        400
  (played a Legendary                                              
  card after lifting                                               
  the lock)                                                        

  Lock Breaker         1          15         75         250        600
  (defeated 3 opponent                                             
  cards to lift the                                                
  Legendary Lock)                                                  

  Legendary Victor     1          10         50         200        500
  (won a battle using                                              
  a Legendary card)                                                
  --------------------------------------------------------------------------

**Special Achievements**

One-of-a-kind achievements that reward exceptional or unusual play. All
are Tier I only --- earned once.

  --------------------------------------------------------------------
  **Achievement**      **Condition**
  -------------------- -----------------------------------------------
  Perfect Battle       Win a battle without any of your cards ever
                       reaching 0 stamina

  The Comeback         Win a battle with your last remaining card
                       --- hand and deck both empty, active card is
                       all you have left

  Survivor             Win a battle where your last card survived at 1
                       HP (Last Stand triggered on the winning card)

  Amp Race             Trigger Amp in the same round the opponent\'s
                       Amp meter also hit 100

  Tie Breaker          Play a battle that ends in a Tie
  --------------------------------------------------------------------

**New Daily Quests**

The following quests are added to the existing daily quest pool. They
are distributed across Easy, Medium, and Hard difficulty tiers and
compete equally with existing quests for the 3 daily slots (1 Easy, 1
Medium, 1 Hard).

  ----------------------------------------------------------------------
  **Tier**   **Quest**                  **Condition**
  ---------- -------------------------- --------------------------------
  Easy       Type Advantage             Win 1 battle where your active
                                        card had a type advantage at the
                                        moment of the final kill

  Easy       Stamina Saver              Complete a battle with any card
                                        that still has 8 or more stamina
                                        remaining

  Easy       Get Amped                  Reach 100 Amp in any battle
                                        (trigger not required)

  Easy       Heavy Day                  Land 3 Heavy attacks in a single
                                        battle

  Medium     Amp Triggered              Successfully trigger Amp in a
                                        battle

  Medium     Lock Broken                Defeat 3 opponent cards in a
                                        single battle to lift the
                                        Legendary Lock

  Medium     Type Tourist               Deal the final kill with 3
                                        different card types across your
                                        battles today

  Medium     Rest and Destroy           Defeat an opponent\'s card in the
                                        round immediately after using Rest

  Medium     Ability Trigger            Have 5 ability activations
                                        across your battles today

  Hard       Champion (Tier 5)          Win a Tier 5 Champion difficulty
                                        battle

  Hard       Amp Effect Collector       Trigger or experience 3
                                        different Amp effects today

  Hard       Legendary Victor           Win a battle using a Legendary
                                        card (lock must be lifted first)

  Hard       Against the Odds           Win a battle where your opening
                                        card had a type disadvantage

  Hard       Stamina Zero               Win a battle after any of your
                                        cards reached 0 stamina during
                                        the fight
  ----------------------------------------------------------------------

**12. Open Questions**

The following design decisions are pending owner input before this PRD
is finalised.

**Resolved Decisions**

  --------------------------------------------------------------------
  **Decision**            **Answer**
  ----------------------- --------------------------------------------
  Amp trigger             Independent meters --- player and AI each
                          have their own. Shared effect pool creates a
                          race. AI triggers automatically when meter
                          is full and effect suits the situation.

  Stamina carry-over      Per card, independent. Each card retains its
                          stamina when swapped. Hand cards regen
                          +1/round. Active card regens only via Rest
                          (+5). Deck cards do not regen.

  Include all systems?    Yes --- Stamina, Amp, new damage formula,
                          and abilities all included in v2.

  Amp effect selection    Random from the 5 non-current effects on
                          each trigger or switch. Same effect can
                          appear multiple times in a battle but never
                          back-to-back.

  Amp next effect         Current effect visible to both players. Next
  visibility              effect always hidden.

  Legendary Lock          3 opponent cards must be defeated before a
                          Legendary can be played. No Legendary as the
                          opening card.

  Tie result              Both players receive loss rewards. Neither
                          player\'s win streak is broken. Triggered
                          when both players\' last cards die
                          simultaneously.

  Type system             9 standalone types. Main cycle of 6 +
                          Nature/Tech rival pair + Cosmic Dragon
                          equivalent. Three outcomes: ×2.0, ×0.5,
                          ×1.0.

  Minimum damage floor    5 damage minimum --- no card can be
                          completely stonewalled.

  Overwhelm ability       Each consecutive round with type advantage,
                          damage increases by 20%. Resets on leaving
                          active spot.
  --------------------------------------------------------------------

**Resolved Decisions --- Additional**

  --------------------------------------------------------------------
  **Decision**            **Answer**
  ----------------------- --------------------------------------------
  Card subtype labels     No longer relevant --- all 200 cards are
                          randomly re-assigned one of the 9 battle types
                          via script. The type chart covers all matchups.
                          No subtype mapping needed. Distribution rules:
                          the 8 main types (Blaster, Magic, Psychic,
                          Shadow, Tank, Speedster, Nature, Tech) each
                          receive approximately 23 cards. Cosmic receives
                          approximately 16 cards to keep it rarer.
                          Assignment is random within these distribution
                          targets. The old assign-v2-types-stamina.js
                          script should be deleted and rewritten from
                          scratch during implementation.

  Type icons              MaterialCommunityIcons names for each type:
  (MaterialCommunityIcons) Blaster: pistol | Magic: star-four-points |
                          Psychic: brain | Shadow: eye-off |
                          Tank: shield-half-full | Speedster: lightning-bolt |
                          Nature: leaf | Tech: robot | Cosmic: creation

  Type colors             Hex colors for each type:
                          Blaster: #FF5722 | Magic: #9C27B0 |
                          Psychic: #E91E63 | Shadow: #546E7A |
                          Tank: #78909C | Speedster: #FFC107 |
                          Nature: #4CAF50 | Tech: #00BCD4 |
                          Cosmic: #5C35CC

  Stamina value --- fixed Fixed permanently per card. Stamina is a new
  or re-rolled?           stat, assigned once within the card\'s type
                          range. Players learn their cards\' stamina
                          values over time.

  Ability assignment      All 200 cards are re-assigned abilities from
                          the new v2 50-ability pool. v1 assignments are
                          discarded entirely. Assignment is random within
                          rarity tier --- every card in a tier has an
                          equal chance of any ability in that tier\'s
                          pool. Assignment happens once via a script and
                          is permanent.

  Does a Tie count toward Yes --- a Tie is a completed battle and
  daily battle limit?     counts toward the 10-battle daily limit.
  --------------------------------------------------------------------

**Still Open**

No open questions remaining. All decisions resolved.

**Resolved Decisions --- AI Deck Compositions**

  --------------------------------------------------------------------
  **Tier**   **Composition**
  ---------- ---------------------------------------------------------
  1 Rookie   10 Common

  2 Scrapper 6 Common, 4 Uncommon

  3 Fighter  3 Common, 4 Uncommon, 3 Rare

  4 Elite    2 Common, 3 Uncommon, 3 Rare, 2 Epic

  5 Champion 1 Uncommon, 3 Rare, 4 Epic, 2 Legendary
  --------------------------------------------------------------------

  Decks are randomly generated within these rarity distributions using
  buildAiDeck(). Type synergy is not factored in --- higher tiers
  simply have better rarity distributions. The Legendary Lock rule
  applies to the AI the same as the player.

**13. Summary of Changes from v1**

  --------------------------------------------------------------------
  **Area**             **v1**                  **v2**
  -------------------- ----------------------- -----------------------
  Type system          5 categories (15        9 standalone types,
                       subtypes), linear       main cycle + rival
                       cycle, 3 multipliers    pair + Cosmic, 3
                                               outcomes only (×2.0 /
                                               ×0.5 / ×1.0)

  Damage formula       power × multiplier −    power × 0.4 ×
                       defense × 0.5, min 1    typeMultiplier −
                                               defense × 0.15, min 5

  Minimum damage       1 (frequent             5 (always meaningful)
                       frustration)            

  Attack types         One attack per turn     Light / Medium / Heavy
                                               / Rest (stamina cost)

  Stamina              Not present             Per type (range 6--16),
                                               fixed per card as a
                                               stat, independent per
                                               card, Rest action (+5),
                                               hand regen (+1/round)

  Amp mechanic         Not present             Independent meters
                                               (0--100), shared effect
                                               pool, situational
                                               effects, spend 50 to
                                               switch, damage-scaled
                                               gain

  Abilities            5 per rarity tier (25   10 per rarity tier (50
                       total)                  total), redesigned for
                                               new mechanics

  Legendary Lock       Not present             Must defeat 3 opponent
                                               cards before playing a
                                               Legendary. No Legendary
                                               as opening card.

  Fortify ability      +8 flat defense per     +8% damage reduction
                       kill, no cap            per kill, 40% cap

  Immunity ability     Blocks debuffs          Blocks debuffs + type
                                               disadvantage

  Overwhelm ability    Type advantage ×2.0     +20% damage per
                       instead of ×1.5         consecutive round with
                                               type advantage

  AI behaviour         Basic 3-priority card   Full decision tree
                       selection               covering attack weight,
                                               stamina, Amp, ability
                                               awareness, Legendary
                                               Lock

  Tie result           Not defined             Both players receive
                                               loss rewards, streak
                                               not broken, counts
                                               toward daily battle
                                               limit
  --------------------------------------------------------------------

**14. Implementation Plan**

The battle system v2 is broken into 6 incremental sprints. Each sprint
produces a fully working, testable state --- nothing is left in a broken
or partially-implemented condition at the end of a sprint. Sprints build
on each other and can be paused between sessions.

**Sprint 1 --- Type System & Damage Formula**

  ---------- ----------------------------------------------------------------
   **GOAL**  Replace the v1 type engine with the new 9-type system and
             updated damage formula. All battles use the new matchup chart
             and damage calculations. Nothing else changes yet.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Delete scripts/assign-v2-types-stamina.js and rewrite from scratch

  Write and run type assignment script --- randomly assign one of the
  9 types to all 200 cards within the defined distribution targets
  (each main type ~23 cards, Cosmic ~16 cards). Old type field is
  discarded.

  Replace BATTLE_TYPE_MAP with 9-type system (Blaster, Magic,
  Psychic, Shadow, Tank, Speedster, Nature, Tech, Cosmic)

  Implement full type chart --- main cycle (×2.0 / ×0.5), Nature↔Tech
  rival pair, Cosmic resistances (see Section 3)

  Update TYPE_COLORS in constants.ts with the 9 new type hex values
  (see Section 12 resolved decisions)

  Update type icon mappings to MaterialCommunityIcons names for all 9
  types (see Section 12 resolved decisions)

  Update damage formula: base = power × 0.4 × typeMultiplier −
  defense × 0.15, minimum 5

  Update battle engine unit tests to verify new matchup outcomes and
  damage floors

  Verify: Common vs Legendary never produces less than 5 damage

  CMS: update the type dropdown to show the 9 new battle types instead
  of the old 15 subtypes
  -------------------------------------------------------------------

**Sprint 2 --- Stamina System**

  ---------- ----------------------------------------------------------------
   **GOAL**  Add stamina as a new card stat and introduce Light, Medium,
             Heavy, and Rest as attack options. The battle UI shows stamina
             bars and attack choice buttons.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Add stamina field to all 200 cards --- randomly assigned within
  type range (Tank 12--16, Speedster 6--9, etc.)

  Implement per-card independent stamina tracking --- cards retain
  stamina when swapped, reset only on defeat

  Implement stamina regen: hand cards +1/round, active card no
  passive regen, Rest action +5

  Add attack weight selection to battle UI: Light (×0.8, cost 1),
  Medium (×1.0, cost 3), Heavy (×1.5, cost 5), Rest (+5 stamina, no
  attack)

  Heavy attack rule: the Heavy attacker always goes second (opponent
  attacks first regardless of Speed). Exception: if both cards choose
  Heavy, normal speed check applies.

  Stamina bar displayed for active card and hand cards in battle UI

  AI attack weight decision logic implemented (see Section 9)

  Fix AI draw behaviour --- AI draws as an action (costs its turn),
  not a free automatic draw each round. AI follows the same draw
  rules as the player (see Section 5 Draw Phase and Section 10 Draw
  Decision)

  If stamina = 0, only Rest is available --- attack buttons disabled

  CMS: add stamina field to card editor --- viewable and editable per
  card
  -------------------------------------------------------------------

**Sprint 3 --- Amp the Battlefield**

  ---------- ----------------------------------------------------------------
   **GOAL**  Add the Amp meter to both sides. The player can see the current
             effect, trigger it at 100, or spend 50 to switch. The AI builds
             and manages its own Amp meter independently.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Add independent Amp meters (0--100) for player and AI

  Implement all Amp gain events: Light (+3), Medium (+6), Heavy
  (+10), Rest (+2), Draw (+2), Swap (+3), taking damage (×0.3),
  defeating a card (+15), ability activation (+4)

  Implement all 6 Amp effects: Overcharge, Type Flip, Exhaustion,
  Field Medic, Lock On, Equaliser

  Random effect selection on trigger/switch --- always from the 5
  non-current effects, never back-to-back

  Trigger button appears when player Amp hits 100. Spend 50 button
  appears when Amp ≥ 50.

  Current effect displayed to both players. Next effect hidden.

  AI Amp decision logic implemented (see Section 9)

  Active Amp effects displayed visually during their duration (round
  counter shown)
  -------------------------------------------------------------------

**Sprint 4a --- Abilities (Common & Uncommon)**

  ---------- ----------------------------------------------------------------
   **GOAL**  Run the ability assignment script and implement all 20 Common
             and Uncommon abilities in the battle engine. End of sprint: all
             200 cards have abilities assigned and the 20 simpler abilities
             are fully live.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Write and run ability assignment script --- randomly assign one
  ability per card within its rarity tier from the v2 50-ability
  pool. All 200 cards receive a permanent ability. v1 assignments
  discarded.

  Implement all 10 Common abilities in battle engine: Grit,
  Opportunist, Resilience, Shield Up, Tenacity, Steady, Scrapper,
  Last Effort, Warm Up, Stubborn

  Implement all 10 Uncommon abilities in battle engine: Smoke Screen,
  Adrenaline, Pack Tactics, Adaptable, Rebound, Heavy Handed, Stamina
  Leech, Rested and Ready, Momentum, Counterpunch

  Ability callout displayed in battle UI when an ability activates

  Ability icon and name shown on each card in battle hand and active
  spot
  -------------------------------------------------------------------

**Sprint 4b --- Abilities (Rare, Epic & Legendary)**

  ---------- ----------------------------------------------------------------
   **GOAL**  Implement all 30 Rare, Epic, and Legendary abilities. Implement
             all Ability Interaction Rules. Wire in AI ability awareness.
             End of sprint: all 50 abilities fully live with correct
             interaction handling.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Implement all 10 Rare abilities in battle engine: Bleed, Intimidate,
  Fortify, Amp Siphon, Dead Weight, Payback, Amp Shield, Counterstrike,
  Type Bully, Pressure

  Implement all 10 Epic abilities in battle engine: Second Wind,
  Execute, Drain, Unstoppable, Overwhelm, Amp Surge, Stamina Vampire,
  Berserker, Death Mark, Riposte

  Implement all 10 Legendary abilities in battle engine: Apex Predator,
  Immunity, Last Stand, Overwhelming Force, Dominate, Amp Drain,
  Juggernaut, Nullify, Siege, The Floor is Yours

  Implement all Ability Interaction Rules (Section 8) --- Immunity
  scope, Nullify counter, Death Mark persistence, Scrapper per-hit
  Amp, Warm Up stamina overflow, etc.

  AI ability awareness logic implemented for all 10 ability-specific
  behaviours (see Section 10)

  CMS updated to allow ability editing per card
  -------------------------------------------------------------------

**Sprint 5 --- Legendary Lock & AI Deck Update**

  ---------- ----------------------------------------------------------------
   **GOAL**  Implement the Legendary Lock rule and update all 5 AI difficulty
             tier decks to the v2 compositions defined in Section 12.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Implement Legendary Lock: track kill count per battle, block
  Legendary play until 3 kills reached

  Block Legendary as opening card --- deck builder prevents it and
  battle engine enforces it

  If AI\'s only remaining cards are Legendary and lock is not lifted,
  AI loses immediately --- same rule as player

  Legendary cards in hand shown as locked with a counter displaying
  kills needed

  Update AI deck compositions to the resolved v2 distributions:
  Rookie (10C), Scrapper (6C/4U), Fighter (3C/4U/3R),
  Elite (2C/3U/3R/2E), Champion (1U/3R/4E/2L)

  AI Legendary Lock awareness --- prioritises securing 3rd kill
  before playing Legendary from hand

  Tie result state implemented --- both players\' last cards dying
  simultaneously triggers Tie screen

  Tie rewards distributed: loss rewards for both, win streak
  preserved, counts toward daily battle limit
  -------------------------------------------------------------------

**Sprint 6 --- Integration, Balance & Polish**

  ---------- ----------------------------------------------------------------
   **GOAL**  Wire everything into the existing game systems --- Firestore
             persistence, achievements, daily quests, rewards. Playtest for
             balance and fix any issues that emerge.

  ---------- ----------------------------------------------------------------

  -------------------------------------------------------------------
  **Deliverables**
  -------------------------------------------------------------------
  Update Firestore schema to store stamina and ability fields on card
  documents

  Battle rewards updated to v2 tier values (Rookie 50/100 through
  Champion 600/500)

  Win streak x2 credits bonus at 3+ consecutive wins implemented

  Existing battle achievements updated to work with v2 --- Giant
  Killer, Battle Victor, Win Streak, Champion, Battles Fought

  Implement all 19 new v2 achievements (Section 11): Type Mastery (3),
  Stamina Mastery (3), Amp Mastery (4 --- including Photo Finish
  renamed from Opportunist), Ability Mastery (4), Legendary Lock (3),
  Special Achievements (5)

  Daily quest pool updated with all 13 new v2 battle quests added to
  existing Easy/Medium/Hard rotation (Section 11)

  Cooldowns --- Legendary and Epic cards on 1-hour cooldown after
  battle use

  God Mode bypasses all cooldowns and Legendary Lock for testing

  Balance playtest: verify Overwhelming Force cap, Berserker cap, Amp
  Drain + Amp Surge loop, Payback accumulation

  Fix any edge cases surfaced during playtesting

  CMS: run npm run sync-cards to pull updated Firestore card data
  (with v2 types, stamina, abilities) into cards.ts, then rebuild and
  redeploy the CMS so DEFAULT_CARDS reflects the latest data

  Update CLAUDE.md to document v2 battle system for future sessions
  -------------------------------------------------------------------

**Sprint Summary**

  ---------------------------------------------------------------------------
  **Sprint**   **Focus**           **Key Deliverable**     **Complexity**
  ------------ ------------------- ----------------------- ------------------
  1            Type System &       9-type chart + new      Low --- engine
               Damage              formula + type/icon     only, no UI
                                   colors live

  2            Stamina System      Attack weight buttons + Medium ---
                                   stamina bars + AI draw  engine + UI
                                   fix

  3            Amp the             Amp meters, 6 effects,  Medium-High ---
               Battlefield         trigger/switch UI       new UI component

  4a           Abilities           Assignment script run + Medium --- engine
               (Common/Uncommon)   20 abilities live       + UI callouts

  4b           Abilities           30 abilities + all      High --- complex
               (Rare/Epic/         interaction rules +     interactions +
               Legendary)          AI awareness            AI awareness

  5            Legendary Lock +    Lock enforced, AI       Low-Medium ---
               AI Decks            decks updated, Tie      rule logic
                                   state live

  6            Integration &       Full wiring + 19 new    Medium --- broad
               Polish              achievements + 13 new   scope
                                   quests + balance fixes
  ---------------------------------------------------------------------------
