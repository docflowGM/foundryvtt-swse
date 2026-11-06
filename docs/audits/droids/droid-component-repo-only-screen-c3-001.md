# Droid Component C3 — Five repository-only candidate source screens

**Date:** 2026-11-02. **Audit-only.**  
**Packet:** `data/audits/droids/component-repo-only-source-screen-c3-001.json`.  
**Evidence:** visually inspected Core droid processor/appendage/accessory/self-destruct pages (printed pp.188–196) and SGD add-on/accessory pages (printed pp.52–64). Consolidated *All Books* TXT keyword searches were used only to find candidate matches, not as proof that a rule does not exist.

## Findings

The five repo-only candidates from the frozen 35-entry queue have been **screened**, not proven globally absent across all fourteen official books. The current Core/SGD source tables do not establish those five exact **priced, independent** general droid-component identities. All five retain `deletionAuthorized=false`. The original source census classification is preserved, and live production files are untouched.

| Existing ID | Current code definition | Published overlap in reviewed books | Safe disposition |
|---|---|---|---|
| `military` | Military Processor, 5,000 credits, 10 kg | Core distinguishes Basic/Heuristic/Remote processors; no printed Military Processor priced choice here | Preserve pending owner/processor and restriction audit |
| `manipulator-arm` | Manipulator Arm, 150 credits, 2 kg | Hand/Tool/Claw/Instrument/Probe are published appendage types; stock-model arm descriptions aren't new priced systems | Potential alias only after physical host proof |
| `repulsor-lift` | Repulsor Lift, 300 credits, 3 kg, Restricted | Hovering/Flying locomotion is published; generic repulsorlift tech is not a priced standalone upgrade | Potential locomotion remap only |
| `self-repair-kit` | Self-Repair Kit, 200 credits, 1.5 kg | Laminanium plating and Droid Oil Bath have separate printed effects, no free generic repair kit inferred | Keep pending references and mechanical effect search |
| `miniaturized-self-destruct-system` | Overlay-only virtual self-destruct weapon (two-size increase) | Core prints ordinary Self-Destruct System, but exact miniaturized variant pricing/identity not established | **Do not delete**: active V2 sheet/chat/hotfix consumers |

## Important runtime authority dependency

The production `scripts/data/droid-part-schema.js` provides the virtual self-destruct profiles. The V2 sheet, virtual weapon hotfix, and chat interaction bridge import its `getSelfDestructDamage()`; the miniaturized profile is part of those paths.

A **separate** prerequisite-compatibility file, `scripts/domain/droids/droid-part-schema.js`, contains another `getSelfDestructDamage()` that applies a two-size shift **and** reads from a pre-shifted miniaturized table. That means static calls can disagree (Medium droid: compatibility table resolves Huge to 20d6, while the main authority's Medium miniaturized profile is 10d6). This is a **static compatibility discrepancy requiring caller review**, not proof that Foundry currently applies doubled size shifts. Fixing it belongs to the approved runtime consolidation, not source evidence work.

The same current Garage source contains a primary-processor classifier explicitly referencing `military-processor`. Removing the `military` definition before rewriting that predicate and checking saved actor identities would be unsafe.

## Boundaries and next acceptance

None of these five can be deleted by this audit. The consolidated OCR corpus has generic references to manipulator arms and repulsorlift, but no individually verified canonical priced identities matching the current convenience rows. An OCR no-hit is **not a negative PDF certificate**.

Next meaningful phase: check other sourcebooks for new genuinely purchasable droid systems; distinguish common stock-model component nomenclature from independently purchasable parts, then develop a controlled migration with backward-reference scanning and deterministic prices. All five status entries are **PENDING_WIDER_SOURCE_AND_DEPENDENCY_ADJUDICATION**, no production changes or Foundry certifications.

**Authoring-time invariant check passed** (five unique candidates, zero deletions approved). Local Node, CI and Foundry tests were not run for this packet.
