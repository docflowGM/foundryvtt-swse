# Phase 3 additive provenance amendment — Core Vulture

**Original source:** `Star Wars Saga Edition.pdf` SHA256 `509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9`, visually re-rendered and inspected. The original heading is **“Vulture” Droid Starfighter**, on printed **p. 181**, physical **PDF p. 182**. The historical census says `Vulture-class Droid Starfighter`, printed p. 180 and physical p. 181; that is an original audit provenance mistake, not a source-published alternative.

**Policy:** preserve `core-vulture-class-droid-starfighter` as the same publication key. Do not rewrite the original 316-ship historical record, Phase 1 book ledger or frozen 429-row census. They are provenance evidence of earlier work. Instead, add an auditable append-only correction in `swse-universal-phase3-vulture-provenance-amendment.json`.

The pure function `resolveUniversalVehicleProvenance` produces exact corrected views for Phase 1 Core ledger, global Phase 1 census, Phase 2 Core staged record and older 316-ship authority. It verifies the original key, book, PDF SHA and incorrect former values before replacing only the title/page and supporting source-notes. Unknown source versions fail closed. The function leaves all 428 other census records, combat mechanics, source attack groups, and the original source files untouched.

**Phase 4A requirement:** Every canonical-vehicle builder consuming the old Core Vulture source MUST apply this approved effective projection. Never regenerate a production row from the old raw 180/181 provenance without correction. The separate Starships of the Galaxy Vulture claim on p. 78 remains independent; dual walker/flight modes do not create a second Actor for either publication.

This commit only adds the audited amendment and its deterministic resolver/tests. It does not itself approve Phase 3 global gate, canonical SSOT, compendium migration, V2 import semantics or weapon executable trust. A separate gate-acceptance commit must follow successful exact-head CI.
