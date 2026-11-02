# Droid Component KEEP-001 — Core source-mechanical deepening

**Date:** 2026-11-02  
**Branch:** `audit/droid-publication-census-2026-10-29`  
**Baseline before review:** `c8926c4fc050fc1c041e3cdb3acbadf149502779`  
**Evidence:** `data/audits/droids/component-keep-source-facts-core-001.json`

## Scope and verification

Ten previously present Core component/control identities reviewed from the **original rendered Core Rulebook PDF**, printed pp.190–197, with Table 11-5 on pp.194–195. Each record preserves source pages, printed credits, weight/blank, availability, host class, and a scoped rule summary. The existing 92-KEEP identity/presence census is **not** being revalidated or promoted in bulk. `cumulativeSourceFactSets: 37` means 27 earlier source-fact records plus 10 here; it is not 37 complete certificates.

| Identity | Printed pages | Credits | Printed weight | Issue references |
|---|---|---:|---|---|
| Heuristic Processor | 190, 195 | 2000 | 5 kg | No numeric discrepancy |
| Remote Receiver | 191, 195 | -500 | 1 kg | K001-NEGATIVE-COST; K001-EXTERNAL-PREREQ |
| Backup Processor | 191, 195 | 100 | — | K001-UNKNOWN-WEIGHT; K001-EXTERNAL-PREREQ |
| Synchronized Fire Circuits | 191, 195 | 150 | 1 kg | K001-AID-BONUS-PLUS-ONE; K001-EXTERNAL-PREREQ |
| Restraining Bolt | 191, 195 | 5 | — | K001-UNPRINTED-BOLT-WEIGHT; K001-BOLT-ACTION-RULES |
| Droid Caller | 191, 194 | 10 | 0.2 kg | K001-DROID-CALLER-HOST |
| Comlink, Internal | 193, 194 | 250 | 0.1 kg | No numeric discrepancy |
| Vocabulator | 193, 194 | 50 | 0.5 kg | K001-FACTORY-INCLUSION |
| Improved Sensor Package | 195, 196, 197 | 200 | 2.5 kg | K001-SENSOR-RUNTIME-NOT-PROVEN |
| Darkvision | 195, 197 | 150 | 1.5 kg | K001-SENSOR-RUNTIME-NOT-PROVEN |

## Confirmed source-to-code defects

### K001-AID-BONUS-PLUS-ONE: Synchronized Fire Circuits

Core p.191 states that, **when successfully Aiding Another a droid connected to the same Remote Processor**, the circuits provide an **additional +2** to the other droid's result. The ordinary Aid Another bonus is +2, so published total is **+4**. Table 11-5 (p.195) charges **150 credits, 1 kg, Military**.

- Current `DROID_SYSTEMS` (id `synchronized-fire`) says `+5 bonus instead of standard +2`.
- `RAW_OVERLAY['synchronized-fire-circuits']` also says `grants +5 instead of +2` and stores modifier value `5`.
- The source requires a successful aid check and matching remote-controller link. Do **not** fix this by indiscriminately adding +4 to a separate automatic +2 in the actual roll engine; the implementation must resolve replacement/addition exactly once.
- Static source mismatch confirmed, **no combat runtime test executed**.

### K001-NEGATIVE-COST: Remote Receiver

Core Table 11-5 p.195 prints **-500 credits, 1 kg**. Core p.191 makes it a receiver component of a remote-processor-controlled droid lacking an internal processor, not a standalone 500-credit customer refund. `computeDroidPartCost()` in the current authoritative schema uses `Math.max(0, Math.ceil(...))` for cost and therefore cannot return the printed negative construction offset. Correctly model droid build total and cost factor, not an open-ended Garage cash credit. Other remote-controller and receiver ownership must be reconciled.

## Additional open source-mechanical findings

- **Backup Processor:** Core p.191 only grants the last-order-continued behavior after remote link loss. Source weight column is a **dash**, while code has explicit zero. It requires a remote receiver; the external transmitter is not an ordinary installed item on the drone.
- **Restraining Bolt:** Printed **5 credits, dash weight**. Runtime raw `0.1 kg` is not established by Table 11-5. Printed full-round DC10 Mechanics installation/removal; heuristic self-removal standard action DC20 Charisma and DC15 Mechanics, with 24-hour retry restriction after failed Charisma. Affected droid's motor impulse stops without shutting down processor; owner/droid-caller state must be modeled.
- **Droid Caller:** Printed **10 credits, 0.2 kg**, operated as an external **handheld device**. Including it in the raw component data does not mean it should install in a PC droid's `installedSystems`.
- **Vocabulator:** Printed **50 credits, 0.5 kg**, but treated as **standard** when the droid can speak non-Binary languages. Separate purchase from factory-granted access to prevent double debit.
- **Internal Comlink:** Printed **250 credits, 0.1 kg**. Embedded comlink otherwise follows Core's standard comlink mechanics on p.134. Numeric fields align.
- **Improved Sensor Package:** Printed **200 credits, 2.5 kg**; +2 equipment Perception and low-light vision, which ignores darkness concealment but not *total* concealment.
- **Darkvision:** Printed **150 credits, 1.5 kg**, ignores darkness-based concealment including total concealment; does not grant universal concealment bypass.
- **Heuristic Processor:** Printed **2,000 credits, 5 kg**; supports untrained skills, nonproficient weapons with usual -5 penalty, creatively interpreted instructions, and possible behavior-inhibitor workarounds. Code price/weight broadly aligns; mechanics execution needs independent testing.

## Acceptance and architecture constraints

The Droid Garage and V2 sheet use `scripts/data/droid-part-schema.js` over `scripts/data/droid-systems.js`; PC chargen still reads raw definitions directly. Price parity is **not proven**. A negative construction discount must be modeled at an appropriate atomic build/transaction authority, not as independent cash back. The handheld Droid Caller must not accidentally become an installed actor-part. No production code, compendium records, or actors were changed.

Source PDF visual inspection and authoring-time invariants were run. The committed validator may be executed with:

```sh
node tools/audits/droids/verify_component_keep_source_facts_core_001.mjs
```

No Foundry v13 session, CI, complete Node test suite, Store/chargen/Garage quote parity, or direct V2 roll-engine execution is claimed.

## Next

Continue adjacent Core KEEP entries: Basic Processor, ordinary Self-Destruct, Hardened Systems x2-x5, shield SR5/10/15/20, and appendage/locomotion rows. Prioritize size gates, cost factors, printed source numeric rules, and existing layered registry alias/variant handling before migrating. Cross-book coverage beyond Core+SGD remains an independent obligation.
