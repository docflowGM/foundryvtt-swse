/**
 * Officer Share Talent acquisition authority.
 * Core Rulebook pp. 221–222: at each even Officer level choose a DIFFERENT
 * already-owned talent from Influence, Inspiration, Commando or Military Tactics.
 * This is not an ordinary talent grant and it is immutable after finalization.
 *
 * Only canonical TalentDB IDs and TalentTreeDB membership may authorize a pick.
 * Display names, an unverified embedded _id or a user-supplied tree label alone
 * are not sufficient authority.
 */
import { isPermanentOfficerTalentItem } from './officer-owned-talent-identity.js';

export const OFFICER_SHARE_TREE_NAMES = Object.freeze([
  'Influence', 'Inspiration', 'Commando', 'Military Tactics',
]);

export const OFFICER_SHARED_TALENTS_FLAG = 'flags.swse.classFeatures.officer.sharedTalents';

const normalized = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function embeddedTalentSourceId(item) {
  const source = String(item?.flags?.core?.sourceId || item?.system?.sourceId || '').trim();
  const match = source.match(/^(?:Compendium\.)?foundryvtt-swse\.talents(?:\.Item)?\.([A-Za-z0-9_-]+)$/i);
  if (match) return match[1];
  const explicit = item?.system?.talentSourceId || item?.system?.canonicalId;
  return typeof explicit === 'string' && explicit.trim() ? explicit.trim() : null;
}

function actorItems(actor) {
  if (Array.isArray(actor?.items)) return actor.items;
  if (typeof actor?.items?.contents !== 'undefined') return Array.from(actor.items.contents);
  if (actor?.items && typeof actor.items[Symbol.iterator] === 'function') return Array.from(actor.items);
  return [];
}

export function persistedOfficerShareTalents(actor) {
  const list = actor?.flags?.swse?.classFeatures?.officer?.sharedTalents || [];
  return Array.isArray(list) ? list : [];
}

/** Distinct canonical options that are in actor inventory AND eligible published trees. */
export function eligibleOfficerShareTalents(actor, talentDB, treeDB) {
  if (!talentDB?.isBuilt || !treeDB?.isBuilt) return [];
  const trees = new Map((treeDB.all?.() || []).map(tree => [String(tree.id), tree]));
  const allowed = new Set(OFFICER_SHARE_TREE_NAMES.map(normalized));
  const found = new Map();
  for (const item of actorItems(actor)) {
    if (!isPermanentOfficerTalentItem(item)) continue;
    const id = embeddedTalentSourceId(item);
    if (!id) continue;
    const canonical = talentDB.get?.(id);
    if (!canonical || !canonical.name) continue;
    const treeIds = treeDB.getTreeIdsForTalentId?.(id) || [];
    const sourceTree = treeIds
      .map(treeId => trees.get(String(treeId)))
      .find(tree => tree && allowed.has(normalized(tree.name)));
    if (!sourceTree) continue;
    if (!found.has(id)) found.set(id, {
      talentId: id,
      talentName: canonical.name,
      treeId: String(sourceTree.id),
      treeName: sourceTree.name,
    });
  }
  return [...found.values()].sort((a,b) => a.talentName.localeCompare(b.talentName) || a.talentId.localeCompare(b.talentId));
}

/** Validate at BOTH UI commit and finalization. Do not trust draft display fields. */
export function resolveOfficerShareTalentChoice({ actor, choice, officerLevel, talentDB, treeDB }) {
  const errors = [];
  if (!Number.isInteger(officerLevel) || officerLevel < 2 || officerLevel > 10 || officerLevel % 2) {
    errors.push('Share Talent requires an even Officer class level between 2 and 10');
  }
  const canonicalId = String(choice?.talentId || '').trim();
  if (!canonicalId) errors.push('Select a canonical talent identity');
  const prior = persistedOfficerShareTalents(actor);
  if (prior.some(x => x.officerLevel === officerLevel)) {
    errors.push('The Share Talent choice at this Officer level is already permanent');
  }
  if (prior.some(x => x.talentId === canonicalId) && canonicalId) {
    errors.push('Each Share Talent selection must be a different talent');
  }
  const matching = eligibleOfficerShareTalents(actor, talentDB, treeDB)
    .find(x => x.talentId === canonicalId);
  if (!matching) errors.push('Talent is not a canonically owned member of an eligible Officer tree');
  if (errors.length) return { valid: false, errors, selection: null };
  return {
    valid: true,
    errors: [],
    selection: {
      officerLevel,
      talentId: matching.talentId,
      talentName: matching.talentName,
      treeId: matching.treeId,
      treeName: matching.treeName,
    },
  };
}
