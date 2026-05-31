/**
 * NPC Review & Repair Engine
 *
 * Phase 9 foundation: deterministic Play -> Legal Review normalization plus
 * explicit GM approval markers. This engine never silently rebuilds class
 * history, recalculates HP/defenses/BAB, or overwrites source statblocks.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getNpcProfileState } from '/systems/foundryvtt-swse/scripts/actors/npc/npc-mode-adapter.js';
import { NpcLegalReviewEngine } from './NpcLegalReviewEngine.js';

const VERSION = 1;
const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

function getPropertySafe(object, path, fallback = undefined) {
  if (!object || !path) return fallback;
  const getter = globalThis.foundry?.utils?.getProperty;
  if (typeof getter === 'function') {
    const value = getter(object, path);
    return value === undefined ? fallback : value;
  }
  return String(path).split('.').reduce((value, key) => value?.[key], object) ?? fallback;
}

function setPropertySafe(object, path, value) {
  const setter = globalThis.foundry?.utils?.setProperty;
  if (typeof setter === 'function') {
    setter(object, path, value);
    return object;
  }
  const parts = String(path).split('.');
  let target = object;
  while (parts.length > 1) {
    const part = parts.shift();
    target[part] ??= {};
    target = target[part];
  }
  target[parts[0]] = value;
  return object;
}

function asText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.entries(value)
    .map(([key, entry]) => `${key}: ${asText(entry)}`)
    .filter(Boolean)
    .join('\n');
  return String(value);
}

function normalizeKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function titleCase(value) {
  return String(value ?? '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getProgressionSkeleton(actor) {
  const skeleton = getPropertySafe(actor, 'system.npcProfile.progressionSkeleton', null);
  if (!skeleton || typeof skeleton !== 'object') return null;
  return skeleton;
}

function normalizeSkeletonEntries(skeleton) {
  if (!skeleton || typeof skeleton !== 'object') return [];
  const entries = Array.isArray(skeleton.entries) ? skeleton.entries : Object.values(skeleton.entries ?? {});
  return entries
    .map((entry, index) => ({
      order: Number(entry?.order ?? index + 1),
      classId: String(entry?.classId ?? entry?.id ?? normalizeKey(entry?.name ?? 'class')),
      name: String(entry?.name ?? entry?.label ?? titleCase(entry?.classId ?? 'Class')),
      levels: Number(entry?.levels ?? entry?.level ?? 0),
      source: entry?.source ?? skeleton.source ?? null,
      confidence: entry?.confidence ?? null
    }))
    .filter(entry => entry.name && Number.isFinite(entry.levels) && entry.levels > 0)
    .sort((a, b) => a.order - b.order);
}

function buildClassItemProposalFromSkeleton(actor) {
  const skeleton = getProgressionSkeleton(actor);
  const entries = normalizeSkeletonEntries(skeleton);
  if (!skeleton || !entries.length) return null;
  const existingClassItems = Array.from(actor?.items ?? []).filter(item => String(item?.type ?? '').toLowerCase() === 'class');
  const missingEntries = entries.filter(entry => !existingClassItems.some(item => normalizeKey(item?.name) === normalizeKey(entry.name)));
  const path = entries.map(entry => `${entry.name} ${entry.levels}`).join(' → ');
  return {
    id: 'create-class-items-from-skeleton',
    label: 'Create class items from progression skeleton',
    detail: 'A legal-ready progression skeleton exists. Creating class items/history is a GM decision and is not applied by safe normalization.',
    count: missingEntries.length,
    requiresGm: true,
    status: skeleton.status ?? 'unknown',
    statusLabel: titleCase(skeleton.status ?? 'unknown'),
    bucket: skeleton.bucket ?? null,
    totalLevels: Number(skeleton.totalLevels ?? entries.reduce((sum, entry) => sum + entry.levels, 0)),
    nonheroicFirstValid: skeleton.nonheroicFirstValid === true,
    classItemsCreated: skeleton.classItemsCreated === true,
    statblockValuesPreserved: skeleton.statblockValuesPreserved !== false,
    entries,
    missingEntries,
    path
  };
}

function normalizeTraitName(value) {
  return String(value ?? '')
    .trim()
    .replace(/^immune\s*:?\s*/i, '')
    .replace(/^resist(?:ance)?\s*:?\s*/i, '')
    .replace(/\s+/g, ' ');
}

function splitListText(text) {
  return String(text ?? '')
    .split(/[;,]|\band\b/i)
    .map(entry => normalizeTraitName(entry))
    .filter(Boolean);
}

function rawImport(actor) {
  return actor?.flags?.swse?.import?.raw
    ?? actor?.flags?.['foundryvtt-swse']?.import?.raw
    ?? actor?.system?.import?.raw
    ?? null;
}

function beastData(actor) {
  return actor?.flags?.swse?.beastData
    ?? actor?.flags?.['foundryvtt-swse']?.beastData
    ?? actor?.system?.beastData
    ?? null;
}

function actorPack(actor) {
  return String(actor?.pack ?? actor?.flags?.swse?.import?.pack ?? actor?.flags?.swse?.sourcePack ?? '').toLowerCase();
}

function readRawValue(actor, labels = []) {
  const raw = rawImport(actor);
  if (!raw || typeof raw !== 'object') return '';
  const normalizedLabels = labels.map(normalizeKey);
  for (const [key, value] of Object.entries(raw)) {
    if (normalizedLabels.includes(normalizeKey(key))) return asText(value);
  }
  return '';
}

function compactObject(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== ''));
}

function inferSourceLabel(actor) {
  const pack = actorPack(actor);
  if (pack.includes('heroic')) return 'Heroic NPC Compendium';
  if (pack.includes('nonheroic')) return 'Nonheroic NPC Compendium';
  if (pack.includes('beast')) return 'Beast Compendium';
  if (rawImport(actor)) return 'Imported Statblock';
  return 'Manual NPC';
}

function parseClassCandidates(actor) {
  const text = [
    actor?.system?.className,
    actor?.system?.class,
    readRawValue(actor, ['Class Levels', 'Nonheroic Level', 'Levels'])
  ].map(asText).filter(Boolean).join(' / ');

  if (!text.trim()) return [];

  const cleaned = text
    .replace(/\b(tiny|small|medium|large|huge|gargantuan|colossal)\b/ig, '')
    .replace(/\b(human|bothan|rodian|wookiee|twilek|twilek|trandoshan|zabrak|duros|mon calamari)\b/ig, '')
    .replace(/\s+/g, ' ')
    .trim();

  const candidates = [];
  const regex = /([A-Za-z][A-Za-z\s'-]*?)\s+(\d{1,2})(?=\s*(?:\/|,|;|$))/g;
  let match;
  while ((match = regex.exec(`${cleaned} /`)) !== null) {
    const name = match[1].replace(/\s+/g, ' ').trim();
    const levels = Number(match[2]);
    if (!name || !Number.isFinite(levels)) continue;
    candidates.push({
      name,
      normalized: normalizeKey(name),
      levels,
      confidence: name.toLowerCase().includes('nonheroic') ? 'high' : 'medium',
      source: text
    });
  }
  return candidates;
}

function parseAttackCandidates(actor) {
  const sources = [
    { label: 'Melee', text: readRawValue(actor, ['Melee Weapons', 'Melee']) },
    { label: 'Ranged', text: readRawValue(actor, ['Ranged Weapons', 'Ranged']) },
    { label: 'Beast', text: asText(beastData(actor)?.melee ?? beastData(actor)?.attacks ?? '') }
  ].filter(source => source.text);

  const candidates = [];
  const attackRegex = /([^;+\n()]+?)\s*\+(-?\d+)\s*\(([^)]+)\)/g;
  for (const source of sources) {
    let match;
    while ((match = attackRegex.exec(source.text)) !== null) {
      candidates.push({
        name: match[1].replace(/^\s*(melee|ranged)\s*:?\s*/i, '').trim(),
        mode: source.label.toLowerCase(),
        attackBonus: Number(match[2]),
        damage: match[3].trim(),
        source: source.text,
        confidence: /\d+d\d+/i.test(match[3]) ? 'high' : 'medium'
      });
    }
  }
  return candidates;
}

function parseTraitCandidates(actor) {
  const immuneText = readRawValue(actor, ['Immune', 'Immunities']);
  const resistText = readRawValue(actor, ['Resist', 'Resistances', 'Damage Reduction']);
  const immunities = splitListText(immuneText).map(label => ({ label, key: normalizeKey(label), source: immuneText }));
  const resistances = splitListText(resistText).map(label => ({ label, key: normalizeKey(label), source: resistText }));
  return { immunities, resistances };
}

function buildSafeUpdate(actor, profileState) {
  const existingProfile = actor?.system?.npcProfile ?? {};
  const review = NpcLegalReviewEngine.buildReport(actor);
  const traits = parseTraitCandidates(actor);
  const classCandidates = parseClassCandidates(actor);
  const attackCandidates = parseAttackCandidates(actor);
  const classItemProposal = buildClassItemProposalFromSkeleton(actor);
  const now = new Date().toISOString();

  const profileUpdate = {
    ...existingProfile,
    kind: existingProfile.kind || profileState.kind || 'standard',
    mode: existingProfile.mode || profileState.mode || 'play',
    sourceAuthority: existingProfile.sourceAuthority || profileState.sourceAuthority || 'statblock',
    legalProfile: existingProfile.legalProfile || profileState.legalProfile || 'standard',
    legalState: existingProfile.legalState || review.legalState || 'unchecked',
    importMode: existingProfile.importMode || (profileState.sourceAuthority === 'statblock' ? 'play' : undefined),
    sourceLabel: existingProfile.sourceLabel || inferSourceLabel(actor),
    legalReview: {
      ...(existingProfile.legalReview ?? {}),
      lastReviewedAt: now,
      lastReviewState: review.legalState,
      tablePlayable: review.tablePlayable === true,
      progressionLegal: review.progressionLegal === true,
      summary: review.summary
    },
    normalization: {
      ...(existingProfile.normalization ?? {}),
      version: VERSION,
      lastNormalizedAt: now,
      source: 'npc-review-repair',
      inferred: profileState.profileMissing === true,
      safeOnly: true
    },
    repair: {
      ...(existingProfile.repair ?? {}),
      version: VERSION,
      lastScannedAt: now,
      classCandidates,
      attackCandidates,
      traitCandidates: traits,
      classItemProposal,
      note: 'Review & Repair stores candidates only. GM approval is required before rebuilding class history, recalculating stats, or converting raw attacks into items.'
    }
  };

  const update = {
    'system.npcProfile': compactObject(profileUpdate)
  };

  if (profileState.sourceAuthority === 'statblock') {
    update['system.npcProfile.overrides'] = {
      ...(existingProfile.overrides ?? {}),
      hp: true,
      defenses: true,
      bab: true,
      attacks: true,
      source: 'statblock-authority'
    };
  }

  if (traits.immunities.length > 0) {
    update['system.traits.immunities'] = traits.immunities.map(entry => entry.key);
    update['system.npcProfile.repair.structuredImmunities'] = traits.immunities;
  }
  if (traits.resistances.length > 0) {
    update['system.traits.resistances'] = traits.resistances.map(entry => entry.key);
    update['system.npcProfile.repair.structuredResistances'] = traits.resistances;
  }

  for (const key of ABILITIES) {
    const attr = actor?.system?.attributes?.[key] ?? {};
    const ability = actor?.system?.abilities?.[key] ?? {};
    const base = attr.base ?? attr.value ?? ability.score ?? ability.value;
    if (base !== undefined && ability.score === undefined) {
      update[`system.abilities.${key}.score`] = base;
    }
  }

  return { update, review, traits, classCandidates, attackCandidates, classItemProposal };
}

function countUpdatePaths(update) {
  return Object.keys(update || {}).length;
}

export class NpcReviewRepairEngine {
  static buildPlan(actor) {
    const profileState = getNpcProfileState(actor);
    const { update, review, traits, classCandidates, attackCandidates, classItemProposal } = buildSafeUpdate(actor, profileState);
    const safeFixes = [];
    const proposals = [];

    if (profileState.profileMissing || !actor?.system?.npcProfile?.kind) {
      safeFixes.push({ id: 'profile-metadata', label: 'Write NPC profile metadata', detail: 'Adds kind, mode, source authority, legal profile, and Play Mode/source labels.' });
    }
    if (profileState.sourceAuthority === 'statblock') {
      safeFixes.push({ id: 'statblock-overrides', label: 'Protect statblock authority', detail: 'Marks HP, defenses, BAB, and attacks as statblock-authoritative so repair does not overwrite them.' });
    }
    if (traits.immunities.length || traits.resistances.length) {
      safeFixes.push({ id: 'structure-traits', label: 'Structure obvious traits', detail: 'Copies obvious raw immunities/resistances into structured trait keys while preserving raw text.' });
    }
    const abilityMirrorCount = ABILITIES.filter(key => {
      const attr = actor?.system?.attributes?.[key] ?? {};
      const ability = actor?.system?.abilities?.[key] ?? {};
      return (attr.base ?? attr.value ?? ability.value) !== undefined && ability.score === undefined;
    }).length;
    if (abilityMirrorCount) {
      safeFixes.push({ id: 'ability-mirrors', label: 'Mirror readable abilities', detail: `Adds ${abilityMirrorCount} compatibility ability score mirror(s) without changing canonical attribute values.` });
    }

    if (classCandidates.length) {
      proposals.push({ id: 'class-candidates', label: 'Class/progression text candidate', detail: 'Clear class/level text was detected. Creating class items/history still requires GM approval.', count: classCandidates.length, requiresGm: true });
    }
    if (classItemProposal?.entries?.length && !classItemProposal.classItemsCreated) {
      proposals.push(classItemProposal);
    }
    if (attackCandidates.length) {
      proposals.push({ id: 'attack-candidates', label: 'Attack profile candidate', detail: 'Raw attack lines can be converted into item/profile attacks later with GM approval.', count: attackCandidates.length, requiresGm: true });
    }
    if (review?.summary?.warn || review?.summary?.error) {
      proposals.push({ id: 'gm-approval', label: 'GM approval with overrides', detail: 'Mark remaining Legal Review warnings as accepted for table play without declaring the NPC progression-legal.', count: (review.summary.warn ?? 0) + (review.summary.error ?? 0), requiresGm: true });
    }

    return {
      version: VERSION,
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? 'NPC',
      profile: profileState,
      safeFixes,
      proposals,
      progressionSkeleton: review?.progressionSkeleton ?? null,
      classItemProposal,
      canProposeClassItems: Boolean(classItemProposal?.entries?.length && !classItemProposal.classItemsCreated),
      safeUpdatePathCount: countUpdatePaths(update),
      canApplySafeFixes: countUpdatePaths(update) > 0,
      canMarkGmApproved: Boolean(review?.summary?.warn || review?.summary?.error),
      note: 'Review & Repair applies deterministic normalization only. Class item creation from skeletons, HP/defense recalculation, Force legality repair, and attack item conversion remain GM-confirmed proposals.'
    };
  }

  static async applySafeFixes(actor, { userId = game?.user?.id ?? null } = {}) {
    if (!actor) throw new Error('NPC Review & Repair requires an actor.');
    const profileState = getNpcProfileState(actor);
    const { update } = buildSafeUpdate(actor, profileState);
    if (!countUpdatePaths(update)) return { applied: false, updateCount: 0 };

    update['system.npcProfile.repair.appliedBy'] = userId;
    update['system.npcProfile.repair.appliedAt'] = new Date().toISOString();

    await ActorEngine.updateActor(actor, update, {
      source: 'npc-review-repair-safe-normalize',
      render: false,
      suppressAppRefresh: true,
      meta: { guardKey: `npc-review-repair:${actor.id}` }
    });

    return { applied: true, updateCount: countUpdatePaths(update) };
  }

  static async markGmApproved(actor, { userId = game?.user?.id ?? null } = {}) {
    if (!actor) throw new Error('NPC Review & Repair requires an actor.');
    const review = NpcLegalReviewEngine.buildReport(actor);
    const now = new Date().toISOString();
    const update = {
      'system.npcProfile.legalState': 'gm-approved-with-overrides',
      'system.npcProfile.mode': actor?.system?.npcProfile?.mode || 'play',
      'system.npcProfile.sourceAuthority': actor?.system?.npcProfile?.sourceAuthority || getNpcProfileState(actor).sourceAuthority || 'statblock',
      'system.npcProfile.legalReview.gmApproved': true,
      'system.npcProfile.legalReview.gmApprovedAt': now,
      'system.npcProfile.legalReview.gmApprovedBy': userId,
      'system.npcProfile.legalReview.approvedReviewState': review.legalState,
      'system.npcProfile.legalReview.approvedSummary': review.summary
    };

    await ActorEngine.updateActor(actor, update, {
      source: 'npc-review-repair-gm-approve',
      render: false,
      suppressAppRefresh: true,
      meta: { guardKey: `npc-review-approve:${actor.id}` }
    });

    return { approved: true };
  }
}

export default NpcReviewRepairEngine;
