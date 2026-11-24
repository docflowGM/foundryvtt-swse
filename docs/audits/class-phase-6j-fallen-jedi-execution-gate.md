# Class Phase 6J - Sith Apprentice Fallen Jedi execution gate

**Date:** 2026-11-07  
**Branch:** `feat/class-force-6j-fallen-jedi-execution-gate`  
**Base:** `b360a2fc0f626b83152453d4c0a5d5f70abe2216`  
**Status:** Targeted runtime entry-point integration. **NOT LIVE FOUNDRY V13 CERTIFIED.**

## Source and requirement

*Star Wars Saga Edition Core Rulebook*, printed **p. 224**, Sith Apprentice / Fallen Jedi: a Jedi who becomes a Sith Apprentice retains Jedi class features, including known Force powers, **except** Force powers with the **[Light Side] descriptor**, which the character may no longer use.

This is **not** a license to remove known powers from an actor, rewrite class levels, or treat a character's general Force alignment as a power's descriptor. The existing Sith Apprentice ownership source is `packs/classes.db` (record `1ba03b2d00245906`, checked against the actual pack). This is the same ID already present in the Phase 6H access resolver, not an invented replacement.

## Exact implementation

- Added pure `isExplicitLightSideForcePower(power)` and `resolveFallenJediForcePowerAccess(actor,power)` to the existing `apex-class-feature-access.js` authority.
- Requires a genuine owned class Item with positive Sith Apprentice level. A similarly named feat, spoofed item name or Sith Lord alone does not activate this restriction.
- Descriptors come only from explicit power metadata: `lightSideOption`, `descriptor`, `descriptors`, `tags`, `keywords`, or `discipline`. The current canonical Force-power JSON uses `light-side` and `light_side` tags. Arbitrary power names/descriptions are **not** evidence of a descriptor.
- `ForceExecutor.activateForce` blocks *use* before setting `discarded`; recovering a retained power is unaffected.
- `ForceExecutor.executeForcePower` blocks before the Use the Force roll, Force Point consumption, or power state mutation. It returns an existing executor error result, not a fabricated roll.
- Ownership (not positive current Sith DSP gate) controls this **prohibition**: a reduction of DSP does not silently reauthorize Light Side Force powers merely because some Sith *benefits* are suspended. This conservative restriction should be checked in independent source review; if disputed, do not silently reverse it.
- Retains existing `Embrace the Dark Side` behavior unchanged.

## Tests and known boundaries

`tests/class-phase-6j-fallen-jedi-execution.test.mjs` covers actual class-pack identity, wrong class/feat, tag alternatives, non-descriptor text, catalog examples, low DSP handling, and pre-mutation entry-point order in both executor methods.

**The test file includes structural ordering assertions**; these alone are not live execution tests. Full repository CI and Foundry scene acceptance are required.

Potential alternate dispatch (Force-suite patches, custom macros, direct outcomes and future grant pathways) still requires a read-only closure audit. The current `ForceExecutor` entry points are gated, but **all-power-path certification is NOT claimed**. Do not patch unverified alternate callers by broad monkey-patching.

### Live Foundry v13 acceptance (not yet executed)

1. Create a Jedi with a real tagged Light Side power; advance into Sith Apprentice and confirm level ownership.
2. Attempt activation and rich roll via UI and direct documented executor call. Both refuse before dice, spending, chat effect, or discard mutation.
3. Check power remains known and may be recovered if previously legitimately discarded.
4. Check neutral/dark-side powers remain usable, non-Sith owner unaffected, and no false positives from thematic power titles.
5. Lower the Sith Apprentice's DSP below Wisdom and verify the prohibition still holds under the documented conservative policy. Independent source adjudication should be recorded.
6. Test alternate Force card, regimen, immediate repeat, and direct-outcome pathways; report any bypass separately.
7. Confirm `Embrace the Dark Side` still behaves as before, and test scene reload and actor Item serialization.

**Stop point:** PR is REVIEW ONLY until exact-head CI, review and live acceptance prove the intended behavior.
