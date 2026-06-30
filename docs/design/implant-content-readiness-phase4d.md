# Implant Content Readiness - Phase 4D

Phase 4D adds content-side guardrails for the implant/cybernetics implementation. Phase 4A added the rules engine, Phase 4B added visibility, and Phase 4C added the non-droid Gear tab implant panel plus Cybernetic Surgery policy. Phase 4D makes the data taxonomy explicit so future equipment imports and hand-authored items do not accidentally classify every cybernetic as a KOTOR-style implant.

## Design rule

Implant penalties are narrow and explicit.

An item should trigger implant rules only when both of these are true:

1. The item is explicitly tagged or flagged as an Implant.
2. The item is active, installed, integrated, equipped, or otherwise rules-active.

Cybernetic prostheses, cybernetic enhancements, biotech, and droid systems do not count as implants by default.

## New data files

```text
data/implants/implant-reference-catalog.json
data/implants/sample-implant-items.json
data/cybernetics/implant-tagging-policy.json
```

These files are intentionally metadata/reference data. They do not auto-create items and do not import compendium content.

## Why this phase exists

The implementation now has enough UI to tag an item as an implant, but future data imports could still create rules drift if they infer implant state from vague names such as "cybernetic arm", "bio-implant", or "droid integrated system". Phase 4D prevents that by documenting and auditing the taxonomy.

## Classification policy

| Category | Counts as Implant by default? | Notes |
| --- | --- | --- |
| KOTOR-style Implant | Yes, only when explicitly tagged | Uses Implant Training penalty suppression rules. |
| Cybernetic prosthesis | No | Medical/prosthetic category, not automatically an implant. |
| Cybernetic enhancement | No | May have its own item effects, but not implant penalties by default. |
| Bio-implant / biotech | No | Source-specific; GM may explicitly tag if it should use implant penalty rules. |
| Droid system | No | Droid equipment is not organic implant logic. |

## Runtime authority

Runtime detection remains centralized in:

```text
scripts/engine/implants/ImplantRules.js
```

The new data files should not be used to create a second rules engine. They are labels, samples, and policy references only.

## Cybernetic Surgery remains manual

Cybernetic Surgery is still a procedure reference, not a passive automation source. Installation, removal, cost, time, tools, checks, and consequences remain GM/player handled. The implant panel helps manage item state after adjudication; it does not replace the surgery rules.
