/**
 * Phase 3H shared model: pack loading, the Phase 11 vocabulary, and the explicit disposition table for every legacy talent tag.
 * No tag is mapped silently: each legacy tag has ONE disposition and (where it maps) an explicit target.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
export const readJson = rel => JSON.parse(read(rel));
export const parse = t => t.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
export const TALENTS = 'packs/talents.db', HOMEBREW = 'packs/talents-homebrew.db', TREES = 'packs/talent_trees.db';
export const VOCAB_PATH = 'data/canonical/semantic-tag-vocabulary.json';
export const vocabulary = () => readJson(VOCAB_PATH).tags;

// ------------------------------------------------------------------------------------------------------------------
// Legacy tag disposition. Order matters: the first matching rule wins.
// ------------------------------------------------------------------------------------------------------------------
/** Pure spelling/format variants of a Phase 11 tag (no semantic widening). */
export const ALIASES = {
  'dark-side': 'dark_side', 'use-the-force': 'use_the_force', 'use-computer': 'use_computer', 'heavy-weapons': 'heavy_weapon', heavy_weapons: 'heavy_weapon',
  'ally-support': 'ally_support', 'force-power': 'force_power', piloting: 'pilot', 'lightsaber-form': 'lightsaber_form', 'force-training': 'force_training', sniping: 'sniper'
};
/** Role / class-bias vocabulary of the superseded archetype scoring (data/class-archetypes.json tagBias/roleBias). */
export const LEGACY_ROLE_TAGS = new Set(['striker', 'controller', 'defender', 'scout', 'scoundrel', 'soldier', 'jedi', 'noble', 'leader', 'mystic', 'hunter', 'duelist', 'opportunist',
  'veteran', 'warrior', 'commander', 'gunslinger', 'bodyguard', 'brigand', 'provocateur', 'inquisitor', 'outlaw', 'bounty-hunter', 'skills', 'positioning', 'imperial', 'force-adept', 'force-hunter']);
/** Redundant tree / organization / tradition labels (the tree is `system.treeId`). */
export const TREE_LABEL_TAGS = new Set(['jedi-guardian', 'imperial-knight', 'lightsaber-combat', 'bando-gora-captain', 'iron-knight', 'order-of-shasa', 'believer-disciple', 'krath', 'genohardan', 'genoharadan',
  'white-current', 'bothan-spynet', 'spynet', 'elite-droid', 'independent-droid', 'akk-dog', 'vahl', 'tyia', 'unknown-regions', 'galactic-lore', 'master-of-intrigue', 'independent-spirit', 'pathfinder',
  'force-tradition', 'sith-alchemy', 'sith_alchemy', 'beast_companion', 'minion', 'followers', 'follower', 'guardian_spirit', 'search-your-feelings', 'dark_side_mastery', 'infamy', 'battlefield-control',
  'battlefield_control', 'lightsaber_polearm', 'law_enforcement', 'law-enforcement', 'social_network', 'network', 'veteran', 'martial_arts', 'martial', 'imperial']);
export const AUDIT_MARKER = /^(phase-.+|rules-text-verified|backchecked|talent-backcheck-implemented|implemented|implemented_derived_calculator|force_adept_backcheck|runtime|ui_deferred)$/;
export const BOOKKEEPING = new Set(['feat-chain', 'talent-chain', 'feat_chain', 'talent_chain', 'uncategorized_talent']);
/** Automation-boundary / choice / action-type descriptors: executable-adjacent, NOT semantic domain facts. */
export const AUTOMATION_DESCRIPTORS = new Set(['choice_required', 'immediate_choice', 'weapon_choice', 'choice_source_prerequisite', 'no_static_runtime_bonus', 'no_static_defense_bonus', 'no_unconditional_static_bonus',
  'manual_resolution', 'contextual', 'equipped_context', 'forecast_value', 'new_option', 'new_action', 'once-per-encounter', 'ally-trigger', 'swift_action', 'standard_action', 'move_action', 'swift-action',
  'standard-action', 'combat_action', 'combat-action', 'action-economy', 'action_economy', 'talent-action', 'resource_spend', 'force_point_spend', 'resource_recovery', 'resources', 'reaction', 'ui_deferred',
  'scaling', 'miss_rider', 'ally_0hp', 'safe_zone', 'setup', 'reroll', 'delay', 'encounter', 'surprise_round', 'flanked']);
const RUNTIME_PREFIX = /^(tree|category)_/;

export function classifyTag(tag, vocab = vocabulary()) {
  if (vocab.includes(tag)) return { disposition: 'KEEP_CANONICAL', target: tag };
  if (ALIASES[tag]) return { disposition: 'MAP_ALIAS', target: ALIASES[tag] };
  if (RUNTIME_PREFIX.test(tag)) return { disposition: 'NON_SEMANTIC_RUNTIME_METADATA', kind: tag.startsWith('tree_') ? 'TREE_ID_ALIAS' : 'CATEGORY_ALIAS' };
  if (AUDIT_MARKER.test(tag) || BOOKKEEPING.has(tag)) return { disposition: 'REMOVE_OBSOLETE', kind: BOOKKEEPING.has(tag) ? 'BOOKKEEPING' : 'AUDIT_MARKER' };
  if (AUTOMATION_DESCRIPTORS.has(tag)) return { disposition: 'NON_SEMANTIC_RUNTIME_METADATA', kind: 'AUTOMATION_OR_ACTION_DESCRIPTOR' };
  if (LEGACY_ROLE_TAGS.has(tag)) return { disposition: 'LEGACY_ARCHETYPE_SCORING', kind: 'ROLE_OR_CLASS_BIAS' };
  if (TREE_LABEL_TAGS.has(tag)) return { disposition: 'REMOVE_OBSOLETE', kind: 'REDUNDANT_TREE_OR_ORGANIZATION_LABEL' };
  return { disposition: 'UNSUPPORTED', kind: 'NOT_IN_PHASE11_VOCABULARY' };
}
