import { SWSEV2CharacterLikeSheet } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-like-sheet.js";

/**
 * SWSEV2CharacterSheet — the actor sheet controller for `type: "character"`
 * actors.
 *
 * This class is intentionally near-empty. Every render/context-assembly
 * behavior shared by Character, NPC, and Droid actors lives on
 * SWSEV2CharacterLikeSheet (the ~130-listener chain, activateListeners,
 * combat/inventory/skills/force/abilities UI, and the template-method hooks
 * called by SWSEV2ActorSheetBase). A prior audit found no Character-exclusive
 * behavior: every "Character-looking" method (lightsaber construction,
 * talent dispatch, etc.) is reachable regardless of actor.type because
 * dispatch keys off action-data, not actor.type. NPC-only and Droid-only
 * gated blocks/imports were moved down into SWSEV2NpcSheet and
 * SWSEV2DroidSheet respectively (see npc-actor-sheet.js / droid-actor-sheet.js).
 *
 * IMPORTANT — this class must keep this exact name and stay defined in this
 * exact file: ≥8 other files depend on the literal runtime string
 * 'SWSEV2CharacterSheet' via Foundry's `renderSWSEV2CharacterSheet` hook
 * convention, `constructor.name` checks, `.prototype` patching, or a DOM
 * `id`-prefix selector. See scripts/patches/force-suite-render-guard-hotfix.js,
 * scripts/patches/combat-ui-behavior-hotfix.js,
 * scripts/engine/force/force-suite-runtime-repairs.js,
 * scripts/engine/combat/features/combat-feature-panel-renderer.js,
 * scripts/apps/force-tradition/force-tradition-picker.js,
 * scripts/patches/follower-npc-sheet-parity-hotfix.js,
 * scripts/sheets/v2/character-sheet-diagnostics.js,
 * scripts/sheets/v2/contract-enforcer.js.
 */
export class SWSEV2CharacterSheet extends SWSEV2CharacterLikeSheet {}
