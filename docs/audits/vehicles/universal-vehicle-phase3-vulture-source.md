# Phase 3 — Vulture-class starfighter/walker targeted source review

**Two primary-scanned sources examined:**

- Core Rulebook original PDF SHA256 `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`; printed **p181**, physical PDF **p182**.
- Starships of the Galaxy original PDF SHA256 `e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0`; printed **p78**, physical PDF **p79**.

## Source and identity result

Two distinct books publish their own CL7 Huge starfighter/ground vehicle (walker) entries. The Core heading is **“Vulture” Droid Starfighter** and the SotG heading is **Baktoid Armor Workshop Vulture-class Starfighter**. Each published hybrid is ONE statblock with character-scale flight 16, starship flight 4, walking 6. Neither mobility state generates a second source identity or independent Actor. The Core narrative states switching flight/walk modes consumes a standard action. The SotG printed source independently includes walker speed but any runtime mode transition requires a typed approved consumer.

**Proven correctable SotG staging omission:** the SotG vehicle's printed Fighting Space is **3×3 character squares OR one starship square**. Its Phase2B staged record lacked the 3×3 character-scale dimensions. This checkpoint restores those two source geometry fields and leaves the other 104 SotG records unchanged. These geometry facts do not authorize firing arcs or physical weapons.

## Critical Core provenance discrepancy — NOT YET REPAIRED IN FROZEN CENSUS

The Core printed Vulture heading **starts on p181**, physical PDF p182. The immutable Phase 1 census and Core Phase 2 staging instead report **p180**, physical PDF p181 and normalize its printed title to **Vulture-class Droid Starfighter**. The inspected original physical p181 (printed p180) contains other ships, not the Vulture. The source-statblock text and independent SotG publication are not in doubt; the Core metadata does not match the page.

Do **not** pretend this has been fixed just because the source-review comparison is recorded. The proposed correction is `printedTitle='"Vulture" Droid Starfighter'`, `page=181`, `physicalPage=182`, while preserving the stable key `core-vulture-class-droid-starfighter`. Because the 429 census was deliberately frozen and linked to the old 316-ship authority, apply an explicit audit/provenance reconciliation across Core's Phase 1 ledger, frozen census projection and older ship reference before promoting to Phase 4A. Do not silently rewrite frozen identities, duplicate two mobility Actors, or merge two books.

**Phase 3 global gate:** Source hybrid/dual mode semantics reviewed, but Core provenance mismatch remains **blocking**. All stock attack mounts, arcs, droid control and Foundry runtime remain uncertified; no canonical production imports were authorized.
