# SWSE Droid Components — KEEP-008 unique-identity coverage and armor

**Audit date:** 2026-11-02. **Branch:** `audit/droid-publication-census-2026-10-29`. Source: supplied Core Rulebook pp.189,195–196, SGD pp.54,56, PDF pages printed+1 (rendered and visually reviewed). Current authority: Phase 0-3H, 92 KEEP identities.

## Corrected baseline versus reviewed source packets

A direct name comparison against Sprint 001 and KEEP-001 through KEEP-007 machine JSON returns **74 direct identity names** plus **two explicit aliases**: Internal Comlink → Comlink, Internal; High-Speed Cutting Torch and Welder → High-Speed Cutting Torch and Welding System. **Self-Destruct System was described in a prior KEEP-002 Markdown checkpoint but never added to the final 9-record machine packet**. This matters: treating documentation discussion as structured source fact would overclaim coverage.

**Sixteen** identities therefore lacked source-fact records. KEEP-008 adds **13 armor identities**, Stationary, Concealed Item, and Self-Destruct System. The new JSON ledger `data/audits/droids/component-keep-source-facts-coverage-008.json` maps **each of the 92 baseline KEEP identities** to a specific source-fact packet and recorded label. All 92 now have at least one reviewed fact record. **None is fully mechanically certified.**

## Printed built-in armor

Core Rulebook **Table 11-6, printed p.196** and SGD **Table 3-1, printed p.54**.

| Armor identity | Class | Credits | Reflex armor | Max Dex | Weight kg | Availability |
|---|---|---:|---:|---:|---:|---|
| Plasteel Shell | light | 400×CF | +2 | +5 | 2×CF | - |
| Quadanium Shell | light | 900×CF | +3 | +4 | 3×CF | - |
| Durasteel Shell | light | 1600×CF | +4 | +4 | 8×CF | - |
| Quadanium Plating | light | 2500×CF | +5 | +3 | 10×CF | Licensed |
| Durasteel Plating | light | 3600×CF | +6 | +3 | 12×CF | Licensed |
| Quadanium Battle Armor | medium | 4900×CF | +7 | +3 | 7×CF | Restricted |
| Duranium Plating | medium | 6400×CF | +8 | +2 | 16×CF | Restricted |
| Durasteel Battle Armor | medium | 9600×CF | +8 | +3 | 8×CF | Restricted |
| Mandalorian Steel Shell | heavy | 8100×CF | +9 | +3 | 9×CF | Military, Rare |
| Duranium Battle Armor | heavy | 10000×CF | +10 | +2 | 10×CF | Military |
| Neutronium Plating | heavy | 12100×CF | +11 | +1 | 20×CF | Military |
| Duravlex Shell | light | 1000×CF | +4 | +3 | 10×CF | Licensed |
| Crystadurium Plating | heavy | 50000×CF | +10 | +2 | 30×CF | Military, Rare |

CF means **published droid size cost factor** from Core p.187. All raw armor base numerical fields match the printed tables at formula level, *not* necessarily the actual purchase price/weight: the current shared part-schema size-factor table disagrees with printed factors for **seven of nine droid sizes**. Do not patch those 13 rows with local workarounds.

**Core armor rules:** built-in armor bonus does not stack with worn armor bonus, built-in armor does not slow ordinary movement, and nonproficient wearers suffer the armor check penalty (light -2, medium -5, heavy -10) on **attack rolls** and Acrobatics, Climb, Endurance, Initiative, Jump, Stealth and Swim. Appropriate Armor Proficiency removes those penalties. Heavy armor caps running at **3× speed**.

**SGD special effects:** Crystadurium Plating reduces damage from **blaster attacks by 1 per damage die**, not universal damage resistance. Duravlex Shell grants **+10 equipment Fortitude against fire and extreme heat**, not +10 universal Fortitude.

## Remaining three distinct source reviews

**Stationary** (Core p.189) is a droid without a locomotion system that cannot leave its fixed location. Raw code represents it with zero cost/weight, but this is not printed proof of a separately purchased zero-cost installed component.

**Concealed Item** (SGD p.56) uses a selected item and body/head/appendage housing. Fully concealed items are not detectable by visual examination alone; when partially visible a concealed weapon gets **+5 Stealth**, relevant weapon size modifier, and **+10 Deception** for disguising that item. Deploying a fully hidden weapon requires a **swift action** with normal draw rules. Price depends on selected item plus relevant appendage/compartment and a printed doubling mechanism subject to GM adjustments; exact multiplication grouping is not certified, so no fixed price is authorized. Registry is overlay-only and lacks price/weight.

**Self-Destruct System** (Core pp.195–196) costs **maximum blast damage ×20 credits**, weight **maximum blast damage ×0.1 kg**, Restricted. Damage: Small 4d6, Medium 6d6, Large 8d6, Huge 10d6, Gargantuan+ 20d6. Tiny and smaller give no collateral damage. +5 area attack; 2-square radius per 4d6, minimum 2. Droid is destroyed, nonrepairable; Medium example is **720 credits and 3.6kg**. Overlay-only registry has no printed price/weight fields and may default to zero.

## Status, integrity, next phase

Frozen published identity authority remains **Core 55 + SGD 67 = 122 identities; 92 KEEP**, plus 7 EDIT, 23 ADD and five repo-only entries. Source-fact review coverage of KEEP is now **92/92**, not a claim that 122 source-mechanically certified products exist. Cumulative source-fact record tally becomes **115**, including repeated variant rows and ADD reviews; it must not be treated as distinct identity count.

**Zero complete mechanical certifications, production changes, cross-application parity certifications, or Foundry runtime certifications.** Exact evidence in `data/audits/droids/component-keep-source-facts-armor-and-uncovered-008.json`. The frozen October identity baseline is unchanged.

Structural verifier: `node tools/audits/droids/verify_component_keep_008_identity_coverage.mjs`. Next: stop counting raw rows as progress; classify all 122 by *complete mechanical fields*, test source ambiguity, evaluate cross-book new identities, then authorize implementation via a separate migration with explicit app parity fixtures. No component placed into `packs/equipment.db`.
