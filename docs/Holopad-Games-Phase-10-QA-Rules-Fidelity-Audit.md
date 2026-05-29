# Holopad Games Phase 10 QA and Rules Fidelity Audit

## Scope

This pass audited the concept-integrated Games surface after Phases 1-9 with two priorities:

1. keep the Phase 1-9 presentation work scoped to the Holopad Games surface, and
2. verify that the production game engines still enforce the rules instead of the concept prototype logic.

No standalone concept globals are used by the production Games app. The production sources remain the existing engines, view models, session store, GM/socket relay, and wager services.

## Static rules-fidelity checks

### Pazaak

Verified:

- main deck is four copies each of 1-10;
- side deck validation requires exactly 10 unique legal side cards;
- opening hand remains 4 random side-deck cards;
- one side card per turn is enforced by the rules helper;
- plus/minus and range cards require explicit choices;
- tiebreaker card wins an otherwise tied safe score;
- filled table detection remains tied to 9 cards without busting;
- the concept duplicate-card side-deck behavior was intentionally not enabled.

### Sabacc

Verified:

- deck remains 62 cards: +1 through +10 and -1 through -10 in three suits, plus two Sylops;
- target is zero;
- regular Nulrhek comparison still prefers positive over negative at equal distance;
- zero-valued regular Sabacc beats ordinary non-zero hands;
- AI does not choose a standalone discard action outside the production draw/trade/market flow;
- special-hand hierarchy is evaluated before regular hand comparison.

Patched:

- `Idiot's Array` detection was unreachable because the old classifier returned early when total was not zero. The named hand is now recognized as a special hand: Sylop + suited +2 and +3.

### Hintaro

Verified:

- players roll four visible Tukar/Kulro symbols;
- Tukar-to-Kulro remains the top ranked outcome;
- Hin cancels Tukar and Taro cancels Kulro through modified symbol counts;
- reroll/keep actions remain production-engine driven.

### Dejarik

Verified:

- production geometry remains 4 rings x 8 rays;
- generated SVG board cells use the production board coordinates;
- movement uses ring/ray adjacency and rejects occupied spaces;
- ranged attacks respect line-of-sight blocking;
- the PNG board is no longer the active board presentation for table highlighting.

## Presentation QA checks

- No direct `Bank`, `PLAYER.credits`, or concept runtime state is used in production game paths.
- No direct `system.credits` mutation was found in Games code paths.
- Concept CSS is scoped under SWSE Games classes rather than using global `.card`, `.btn`, `.tag`, `.log`, `.bubble`, or body-level shell rules.
- A reduced-motion guard was added for the Games surface so card/dice/scan animations do not fight accessibility settings.

## Validation commands run

```text
node scripts/games/tests/games-rules-smoke-tests.mjs
node --check scripts/games/games/sabacc/sabacc-rules.js
node --check scripts/games/tests/games-rules-smoke-tests.mjs
node --check scripts/ui/shell/GamesSurfaceController.js
```

## Remaining runtime checks

These require Foundry runtime and real documents:

- Start and finish one table for each game.
- Confirm Pazaak side-deck tray stays live and legal-only.
- Confirm Sabacc `Idiot's Array` appears as the winning label in an injected/test hand.
- Confirm Hintaro cancellation display matches the roll data.
- Confirm Dejarik SVG move/attack cells submit the expected engine actions.
- Confirm reduced-motion users do not get persistent table animations.
