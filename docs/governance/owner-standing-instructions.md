# Owner standing instructions (SWSE Foundry V13 / V2)

Version-controlled restatement of the project owner's standing implementation policy. It complements `CLAUDE.md` (which holds the rules-adjudication boundary) and is the durable source for the Level A invariants A-02, A-10, A-14…A-18 in `docs/architecture/v2-contracts/A-global-invariants.md`. Recorded 2026-11-25 from the owner's instructions; it does not change any published SWSE rule.

## Working method
- Inspect the current repo first; identify the authoritative system before editing. Prefer the smallest change that solves the problem; no new frameworks, duplicate managers, parallel ledgers/registries, speculative layers.
- Route old behavior into the current authority instead of building another service. Deprecated-but-referenced: reroute first, delete later. When removing a legacy system, remove the whole surface (JS, templates, styles, assets, settings, hooks, globals, launchers, preloads, manifest entries, misleading docs).
- Surgical changes; do not change unrelated behavior, game rules, actor data shape, or compendium data unless the task is that.

## Authorities
| Area | Authority |
|---|---|
| Actor and owned-item mutation | `ActorEngine`. Avoid direct `actor.update/setFlag/unsetFlag` and owned `item.update`; allowed only for world items, non-actor targets or documented Foundry-only exceptions, each with an explanatory code comment. |
| Credits, store, trades | `TransactionEngine` is the single source of truth; no parallel ledgers; a failed part fails the whole trade (credits, item transfer, approval, rollback atomic where possible). |
| Customization | `ItemCustomizationWorkbench`, `CustomizationWorkflow`, `UpgradeSlotEngine`, `UpgradeService`, `CustomizationBayApp`, droid/vehicle customization engines, lightsaber workbench. Old per-item modification apps stay retired. |
| Progression | `ProgressionShell`, `ChargenShell`, `LevelupShell`, progression framework steps/services. Temporary choices live in session/draft state; finalization commits through the finalizer/mutation path. |
| Actor UX | Unified V2 shell (`SWSEV2CharacterSheet` direction for character, droid, npc, vehicle). No new standalone actor sheets. |
| Floating UI | Holopad/Shell Host replaces older floating UIs (old Action Palette, standalone store, combat action browser, chargen/level-up apps are retirement candidates). |

## Performance and caching
UI-only state (tab, expanded card, filter, wizard page) must not require actor updates or full rerenders. Cache display/derived work only, each with an explicit invalidation key; never cache permissions, GM authority, credits, HP truth, damage/roll results, combat turn economy or live documents.

## Legacy classification
A active authority · B deprecated but referenced (reroute) · C deprecated and unreferenced (deletion candidate) · D compatibility wrapper (delete after imports reroute) · E macro/global utility (ask before deleting) · F runtime-risk feature (needs runtime validation).

## Asset and data cleanup
Before deleting an asset: grep exact path and filename, CSS `url()`, HBS `src`, JS path construction, registries/manifests, `system.json`, packs/data. Do not delete by folder name. For data/pack pruning, measure size impact and identify consumers first; never remove source/filter/migration/link keys blindly.

## SWSE rules integrity (not to be violated by implementation)
No D&D critical confirmation; lightsabers ignore DR by default; weapon damage includes one-half heroic level unless excluded; Force powers do not add one-half level unless a house rule enables it; poison/Force/elemental damage are special exclusions; droids cannot benefit from organic resting; Nonheroic is not normally a player class; beast/follower leveling is granted by talents/features. Uncertain rules are documented, not silently automated.

## Validation and delivery
After changes run the applicable validators (`node --check`, `tools/validate-partials.mjs`, `tools/validate-data.js`, `system.json` parse). Final reports list summary, files changed, systems affected, validation run, warnings, intentionally unchanged items and follow-ups. Runtime-risky areas (combat turn economy, reactions, damage application, trade/store, credits, active effects, permissions, migrations, compendium shape, vehicle import, Force power cost, progression finalization) require focused validation before broad change.
