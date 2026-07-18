import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getActorCustomTalentTrees } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-talent-tree-model.js';
import { getCustomForceTraditions } from '/systems/foundryvtt-swse/scripts/apps/force-tradition/custom-force-tradition-wizard.js';

const SYSTEM_ID = 'foundryvtt-swse';

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function approvalStatus(entry = {}) {
  const status = String(entry?.approvalStatus || entry?.system?.approvalStatus || '').trim().toLowerCase();
  if (status) return status;
  if (entry?.gmApproved === true || entry?.system?.gmApproved === true) return 'approved';
  if (entry?.gmApproved === false || entry?.system?.gmApproved === false) return 'pending';
  return 'pending';
}

function isPending(entry = {}) {
  return approvalStatus(entry) === 'pending';
}

function submittedAt(entry = {}) {
  return Number(entry?.approvalRequestedAt || entry?.system?.approvalRequestedAt || entry?.createdAt || entry?.system?.createdAt || 0) || Date.now();
}

function requesterLabel(entry = {}) {
  const userId = entry?.approvalRequestedBy || entry?.system?.approvalRequestedBy || null;
  if (!userId) return 'Unknown Player';
  return game.users?.get?.(userId)?.name || userId;
}

function actorIsReviewable(actor) {
  return actor && game.user?.isGM;
}

function allReviewableActors() {
  return Array.from(game.actors ?? []).filter(actorIsReviewable);
}

function normalizeId(value = '') {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^custom-tree:/, '')
    .replace(/^custom:/, '')
    .replace(/&/g, ' and ')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function customTalentTreesFromActor(actor) {
  return getActorCustomTalentTrees(actor).map(tree => ({ ...tree, approvalKind: 'custom-talent-tree' }));
}

function customForceTraditionsFromActor(actor) {
  return getCustomForceTraditions(actor).map(tradition => ({ ...tradition, approvalKind: 'custom-force-tradition' }));
}

function pendingCustomTalentsFromActor(actor) {
  const items = actor?.items?.contents || actor?.items || [];
  const itemList = Array.isArray(items) ? items : Array.from(items || []);
  return itemList
    .filter(item => item?.type === 'talent' && item?.system?.isCustom === true && isPending(item))
    .map(item => ({
      id: item.id,
      itemId: item.id,
      uuid: item.uuid,
      name: item.name,
      approvalKind: 'custom-talent',
      approvalStatus: item.system?.approvalStatus || 'pending',
      approvalRequestedAt: item.system?.approvalRequestedAt || null,
      approvalRequestedBy: item.system?.approvalRequestedBy || null,
      gmApproved: item.system?.gmApproved,
      active: item.system?.active,
      system: item.system || {},
      item
    }));
}

function buildKey(actor, kind, id) {
  return `content:${actor.id}:${kind}:${id}`;
}

function displayKind(kind = '') {
  switch (kind) {
    case 'custom-force-tradition': return 'Custom Force Tradition';
    case 'custom-talent-tree': return 'Custom Talent Tree';
    case 'custom-talent': return 'Custom Talent';
    default: return 'Custom Content';
  }
}

function iconForKind(kind = '') {
  switch (kind) {
    case 'custom-force-tradition': return 'fa-solid fa-jedi';
    case 'custom-talent-tree': return 'fa-solid fa-sitemap';
    case 'custom-talent': return 'fa-solid fa-sparkles';
    default: return 'fa-solid fa-clipboard-check';
  }
}

function itemSummary(entry = {}) {
  const description = entry.background || entry.description || entry.system?.benefit || entry.system?.description || '';
  const treeCount = asArray(entry.grantedTalentTrees).length || asArray(entry.nodes).length || 0;
  const customTalentCount = asArray(entry.customTalents).length;
  return { description, treeCount, customTalentCount };
}

export class CustomContentApprovalService {
  static parseKey(key = '') {
    const [prefix, actorId, kind, ...idParts] = String(key || '').split(':');
    if (prefix !== 'content' || !actorId || !kind || !idParts.length) return null;
    return { actorId, kind, id: idParts.join(':') };
  }

  static getPendingRequests() {
    const requests = [];
    for (const actor of allReviewableActors()) {
      for (const tradition of customForceTraditionsFromActor(actor).filter(isPending)) {
        requests.push(this._requestFromEntry(actor, tradition, 'custom-force-tradition'));
      }
      for (const tree of customTalentTreesFromActor(actor).filter(isPending)) {
        requests.push(this._requestFromEntry(actor, tree, 'custom-talent-tree'));
      }
      for (const talent of pendingCustomTalentsFromActor(actor)) {
        requests.push(this._requestFromEntry(actor, talent, 'custom-talent'));
      }
    }
    return requests.sort((left, right) => Number(left.submittedAt || 0) - Number(right.submittedAt || 0));
  }

  static countPending() {
    return this.getPendingRequests().length;
  }

  static _requestFromEntry(actor, entry, kind) {
    const id = normalizeId(entry.id || entry.itemId || entry.name);
    const submitted = submittedAt(entry);
    const summary = itemSummary(entry);
    const kindLabel = displayKind(kind);
    return {
      key: buildKey(actor, kind, id),
      sourceType: 'custom-content',
      actorId: actor.id,
      itemId: entry.itemId || null,
      customContentKind: kind,
      customContentId: id,
      type: kind,
      typeLabel: `${kindLabel} Review`,
      title: entry.name || entry.label || kindLabel,
      subtitle: `${actor.name} · ${requesterLabel(entry)} · ${approvalStatus(entry)}`,
      ownerLabel: actor.name,
      costLabel: 'No credits',
      submittedAt: submitted,
      submittedLabel: new Date(submitted).toLocaleString(),
      icon: iconForKind(kind),
      tone: 'custom-content',
      entry,
      categories: [
        {
          id: 'identity',
          label: 'Custom Content',
          icon: iconForKind(kind),
          rows: [
            { label: 'Name', value: entry.name || entry.label || 'Unnamed', editable: false },
            { label: 'Type', value: kindLabel, editable: false },
            { label: 'Actor', value: actor.name, editable: false },
            { label: 'Requested By', value: requesterLabel(entry), editable: false },
            { label: 'Status', value: approvalStatus(entry), editable: false }
          ]
        },
        {
          id: 'details',
          label: 'Review Details',
          icon: 'fa-solid fa-clipboard-list',
          rows: [
            { label: 'Summary', value: summary.description || 'No description provided.', editable: false, wide: true },
            ...(kind === 'custom-force-tradition' ? [
              { label: 'Granted Trees', value: String(summary.treeCount || 0), editable: false },
              { label: 'Custom Talents', value: String(summary.customTalentCount || 0), editable: false }
            ] : []),
            ...(kind === 'custom-talent-tree' ? [
              { label: 'Nodes', value: String(asArray(entry.nodes).length), editable: false },
              { label: 'Granted By', value: asArray(entry.grantedByTraditions).join(', ') || 'Manual / actor-local', editable: false, wide: true }
            ] : []),
            ...(kind === 'custom-talent' ? [
              { label: 'Tree', value: entry.system?.talentTree || entry.system?.tree || 'Custom', editable: false },
              { label: 'Prerequisites', value: entry.system?.prerequisites || entry.system?.prerequisite || 'None listed', editable: false, wide: true }
            ] : [])
          ]
        }
      ],
      warnings: [
        ...(summary.description ? [] : ['No description or benefit text was provided.']),
        ...(kind === 'custom-talent-tree' && !asArray(entry.nodes).length ? ['This custom tree has no talent nodes yet.'] : []),
        ...(kind === 'custom-force-tradition' && !asArray(entry.grantedTalentTrees).length ? ['This custom tradition grants no talent trees yet.'] : [])
      ]
    };
  }

  static async approve(key, { reason = '' } = {}) {
    return this._setApprovalState(key, 'approved', { reason });
  }

  static async deny(key, { reason = '' } = {}) {
    return this._setApprovalState(key, 'declined', { reason });
  }

  static async _setApprovalState(key, status, { reason = '' } = {}) {
    const parsed = this.parseKey(key);
    if (!parsed) {
      ui?.notifications?.error?.('Invalid custom content approval key.');
      return false;
    }
    const actor = game.actors?.get?.(parsed.actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor for custom content approval could not be found.');
      return false;
    }
    if (parsed.kind === 'custom-force-tradition') return this._setCustomForceTradition(actor, parsed.id, status, reason);
    if (parsed.kind === 'custom-talent-tree') return this._setCustomTalentTree(actor, parsed.id, status, reason);
    if (parsed.kind === 'custom-talent') return this._setCustomTalent(actor, parsed.id, status, reason);
    ui?.notifications?.error?.('Unknown custom content approval type.');
    return false;
  }

  static _reviewFields(status, reason = '') {
    const approved = status === 'approved';
    return {
      approvalStatus: status,
      gmApproved: approved,
      active: approved,
      approvalReviewedAt: Date.now(),
      approvalReviewedBy: game.user?.id || null,
      approvalReviewedByName: game.user?.name || 'GM',
      approvalReason: String(reason || '').trim()
    };
  }

  static _updateEntryList(list = [], id, status, reason = '') {
    const target = normalizeId(id);
    let changed = false;
    const next = asArray(list).map(entry => {
      if (!entry || typeof entry !== 'object') return entry;
      const entryId = normalizeId(entry.id || entry.value || entry.key || entry.name);
      if (entryId !== target) return entry;
      changed = true;
      return { ...entry, ...this._reviewFields(status, reason) };
    });
    return { changed, next };
  }

  static async _setCustomForceTradition(actor, id, status, reason = '') {
    const update = {};
    const paths = [
      'system.customForceTraditions',
      'system.progression.customForceTraditions',
      `flags.${SYSTEM_ID}.customForceTraditions`,
      'flags.swse.customForceTraditions'
    ];
    for (const path of paths) {
      const current = foundry.utils.getProperty(actor, path);
      const { changed, next } = this._updateEntryList(current, id, status, reason);
      if (changed) update[path] = next;
    }
    if (!Object.keys(update).length) return false;
    await ActorEngine.updateActor(actor, update, { source: 'CustomContentApprovalService.forceTradition' });
    ui?.notifications?.info?.(`Custom Force tradition ${status}.`);
    return true;
  }

  static async _setCustomTalentTree(actor, id, status, reason = '') {
    const update = {};
    const paths = [
      'system.customTalentTrees',
      'system.progression.customTalentTrees',
      `flags.${SYSTEM_ID}.customTalentTrees`,
      'flags.swse.customTalentTrees'
    ];
    for (const path of paths) {
      const current = foundry.utils.getProperty(actor, path);
      const { changed, next } = this._updateEntryList(current, id, status, reason);
      if (changed) update[path] = next;
    }
    if (!Object.keys(update).length) return false;
    await ActorEngine.updateActor(actor, update, { source: 'CustomContentApprovalService.customTalentTree' });
    ui?.notifications?.info?.(`Custom talent tree ${status}.`);
    return true;
  }

  static async _setCustomTalent(actor, id, status, reason = '') {
    const target = normalizeId(id);
    const item = Array.from(actor.items ?? []).find(candidate => normalizeId(candidate.id || candidate.name) === target && candidate.type === 'talent');
    if (!item) {
      ui?.notifications?.error?.('Custom talent item could not be found.');
      return false;
    }
    const fields = this._reviewFields(status, reason);
    await item.update(Object.fromEntries(Object.entries(fields).map(([key, value]) => [`system.${key}`, value])));
    ui?.notifications?.info?.(`Custom talent ${status}.`);
    return true;
  }
}

export default CustomContentApprovalService;
