// scripts/apps/force-alchemy/force-alchemy-state-service.js
// Persistent, non-destructive state ledger for the Force Artifact / Sith Alchemy Workbench.

import {
  FORCE_ALCHEMY_FLAG_SCOPE,
  FORCE_ALCHEMY_FLAG_KEY,
  FORCE_ALCHEMY_RITES,
  FORCE_ALCHEMY_DEFENSES,
  FORCE_ALCHEMY_TEMPLATES,
  FORCE_ALCHEMY_SPECIALIST_TRAITS
} from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";

const DEFAULT_STATE = Object.freeze({
  version: 1,
  activeForceTalisman: null,
  activeDarkSideTalisman: null,
  activeSithTalisman: null,
  focusedForceTalisman: null,
  rapidAlchemy: null,
  sithWeaponSurge: null,
  cooldowns: [],
  projects: []
});

const STATE_KEYS = new Set([
  'activeForceTalisman',
  'activeDarkSideTalisman',
  'activeSithTalisman',
  'focusedForceTalisman',
  'rapidAlchemy',
  'sithWeaponSurge'
]);

const PROJECT_STATE_KEY = 'projects';
const TALISMAN_COOLDOWN_HOURS = 24;

function clone(value) {
  return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value ?? null));
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix = 'fa') {
  const id = foundry?.utils?.randomID?.(10) ?? Math.random().toString(36).slice(2, 12);
  return `${prefix}-${id}`;
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function dateMs(value) {
  const ms = Date.parse(value ?? '');
  return Number.isFinite(ms) ? ms : 0;
}

function getRite(riteId) {
  return FORCE_ALCHEMY_RITES.find(rite => rite.id === riteId) ?? null;
}

function defenseLabel(defenseId) {
  return FORCE_ALCHEMY_DEFENSES.find(defense => defense.id === defenseId)?.label ?? defenseId ?? null;
}

function templateLabel(templateId) {
  return FORCE_ALCHEMY_TEMPLATES.find(template => template.id === templateId)?.name ?? templateId ?? null;
}

function traitLabel(traitId) {
  return Object.values(FORCE_ALCHEMY_SPECIALIST_TRAITS)
    .flat()
    .find(trait => trait.id === traitId)?.name ?? traitId ?? null;
}

function targetNameFromDetail(detail) {
  return detail?.selectedTarget?.name ?? 'Unselected target';
}

function normalizeStateEntry(entry, fallbackRiteId = null) {
  if (!entry || typeof entry !== 'object') return null;
  const rite = getRite(entry.riteId ?? fallbackRiteId);
  const config = entry.config && typeof entry.config === 'object' ? clone(entry.config) : {};
  return {
    id: entry.id ?? randomId('entry'),
    riteId: entry.riteId ?? fallbackRiteId ?? null,
    riteName: entry.riteName ?? rite?.name ?? 'Unknown Rite',
    name: entry.name ?? entry.riteName ?? rite?.name ?? 'Unknown Working',
    targetId: entry.targetId ?? null,
    targetUuid: entry.targetUuid ?? null,
    targetName: entry.targetName ?? 'Unselected target',
    targetKind: entry.targetKind ?? null,
    config,
    configLabel: entry.configLabel ?? buildConfigLabel({ rite, config, entry }),
    resultLabel: entry.resultLabel ?? rite?.resultLabel ?? 'Recorded alchemical state',
    status: entry.status ?? 'staged',
    createdAt: entry.createdAt ?? nowIso(),
    updatedAt: entry.updatedAt ?? entry.createdAt ?? nowIso(),
    appliedAt: entry.appliedAt ?? null,
    effectIds: asArray(entry.effectIds),
    resourceChanges: entry.resourceChanges && typeof entry.resourceChanges === 'object' ? clone(entry.resourceChanges) : null,
    pendingEffects: entry.pendingEffects !== false,
    pendingCosts: entry.pendingCosts !== false,
    source: entry.source ?? 'force-alchemy-workbench'
  };
}

function normalizeProject(project) {
  const entry = normalizeStateEntry(project, project?.riteId);
  if (!entry) return null;
  const requiredUnits = Number(project?.requiredUnits ?? 1);
  const progress = Number(project?.progress ?? 0);
  const unit = project?.unit ?? 'work';
  const ready = progress >= requiredUnits;
  return {
    ...entry,
    status: project?.status ?? (ready ? 'ready' : 'pending'),
    progress: Number.isFinite(progress) ? Math.max(0, progress) : 0,
    requiredUnits: Number.isFinite(requiredUnits) ? Math.max(1, requiredUnits) : 1,
    unit,
    durationLabel: project?.durationLabel ?? `${requiredUnits} ${unit}${requiredUnits === 1 ? '' : 's'}`,
    gmGated: project?.gmGated === true,
    progressLabel: project?.progressLabel ?? `${Math.min(progress, requiredUnits)} / ${requiredUnits} ${unit}${requiredUnits === 1 ? '' : 's'}`,
    completionMode: project?.completionMode ?? 'manual-next-phase'
  };
}

function normalizeCooldown(cooldown) {
  if (!cooldown || typeof cooldown !== 'object') return null;
  const startedAt = cooldown.startedAt ?? cooldown.createdAt ?? nowIso();
  const endsAt = cooldown.endsAt ?? new Date(dateMs(startedAt) + TALISMAN_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const remainingMs = Math.max(0, dateMs(endsAt) - Date.now());
  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  return {
    id: cooldown.id ?? randomId('cooldown'),
    key: cooldown.key ?? null,
    label: cooldown.label ?? 'Talisman cooldown',
    startedAt,
    endsAt,
    hours: remainingHours,
    expired: remainingHours <= 0
  };
}

function buildConfigLabel({ rite, config, entry } = {}) {
  if (entry?.configLabel) return entry.configLabel;
  if (!rite || !config) return null;
  if (rite.configType === 'defense') return defenseLabel(config.defense);
  if (rite.configType === 'force-power') return config.powerName ?? config.powerId ?? null;
  if (rite.configType === 'template') return templateLabel(config.templateId);
  if (rite.configType === 'trait') return traitLabel(config.traitId);
  return null;
}

function normalizeForceAlchemyState(raw = {}) {
  const merged = { ...DEFAULT_STATE, ...(raw && typeof raw === 'object' ? raw : {}) };
  return {
    version: Number(merged.version) || DEFAULT_STATE.version,
    activeForceTalisman: normalizeStateEntry(merged.activeForceTalisman, 'force-talisman'),
    activeDarkSideTalisman: normalizeStateEntry(merged.activeDarkSideTalisman, 'dark-side-talisman'),
    activeSithTalisman: normalizeStateEntry(merged.activeSithTalisman, 'sith-talisman'),
    focusedForceTalisman: normalizeStateEntry(merged.focusedForceTalisman, 'focused-force-talisman'),
    rapidAlchemy: normalizeStateEntry(merged.rapidAlchemy, 'rapid-alchemy'),
    sithWeaponSurge: normalizeStateEntry(merged.sithWeaponSurge, 'sith-weapon-surge'),
    cooldowns: asArray(merged.cooldowns).map(normalizeCooldown).filter(cooldown => cooldown && !cooldown.expired),
    projects: asArray(merged.projects).map(normalizeProject).filter(Boolean)
  };
}

export function getDefaultForceAlchemyState() {
  return clone(DEFAULT_STATE);
}

export function readForceAlchemyState(actor) {
  const raw = actor?.getFlag?.(FORCE_ALCHEMY_FLAG_SCOPE, FORCE_ALCHEMY_FLAG_KEY)
    ?? actor?.flags?.[FORCE_ALCHEMY_FLAG_SCOPE]?.[FORCE_ALCHEMY_FLAG_KEY]
    ?? actor?.flags?.swse?.forceAlchemy
    ?? {};
  return normalizeForceAlchemyState(raw);
}

async function writeForceAlchemyState(actor, nextState) {
  if (!actor?.setFlag) throw new Error('Cannot write Force Alchemy state without an actor document.');
  const normalized = normalizeForceAlchemyState(nextState);
  await actor.setFlag(FORCE_ALCHEMY_FLAG_SCOPE, FORCE_ALCHEMY_FLAG_KEY, normalized);
  return normalized;
}

function extractConfig(detail) {
  const config = clone(detail?.selectedConfig ?? detail?.riteConfig ?? {});
  if (detail?.selectedDefense) {
    config.defense = detail.selectedDefense.id;
    config.defenseLabel = detail.selectedDefense.label;
  }
  if (detail?.selectedPower) {
    config.powerId = detail.selectedPower.id;
    config.powerUuid = detail.selectedPower.uuid ?? null;
    config.powerName = detail.selectedPower.name;
  }
  if (detail?.selectedTemplate) {
    config.templateId = detail.selectedTemplate.id;
    config.templateName = detail.selectedTemplate.name;
  }
  if (detail?.selectedTrait) {
    config.traitId = detail.selectedTrait.id;
    config.traitName = detail.selectedTrait.name;
  }
  return config;
}

function buildEntryFromDetail(detail, options = {}) {
  const rite = detail?.rite;
  const target = detail?.selectedTarget;
  if (!rite) throw new Error('No rite selected.');
  if (!target) throw new Error('No target selected.');

  const config = { ...extractConfig(detail), ...(options.configPatch && typeof options.configPatch === 'object' ? clone(options.configPatch) : {}) };
  return normalizeStateEntry({
    id: randomId('working'),
    riteId: rite.id,
    riteName: rite.name,
    name: rite.name,
    targetId: target.id ?? null,
    targetUuid: target.uuid ?? null,
    targetName: targetNameFromDetail(detail),
    targetKind: target.kind ?? null,
    config,
    resultLabel: rite.resultLabel,
    status: options.status ?? (rite.timing === 'encounter' ? 'encounter-staged' : 'staged'),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    appliedAt: options.appliedAt ?? null,
    effectIds: asArray(options.effectIds),
    resourceChanges: options.resourceChanges && typeof options.resourceChanges === 'object' ? clone(options.resourceChanges) : null,
    pendingEffects: options.pendingEffects ?? true,
    pendingCosts: options.pendingCosts ?? true
  }, rite.id);
}

function getProjectDuration(detail) {
  const riteId = detail?.rite?.id;
  const target = detail?.selectedTarget;
  const note = `${target?.name ?? ''} ${target?.note ?? ''}`.toLowerCase();

  if (riteId === 'sith-amulet') return { requiredUnits: 1, unit: 'week', durationLabel: '1 week' };
  if (riteId === 'sith-weapon' || riteId === 'sith-alchemy-specialist') return { requiredUnits: 1, unit: 'hour', durationLabel: '1 hour' };
  if (riteId === 'sith-armor') {
    if (note.includes('heavy')) return { requiredUnits: 3, unit: 'day', durationLabel: '3 days' };
    if (note.includes('light')) return { requiredUnits: 1, unit: 'day', durationLabel: '1 day' };
    return { requiredUnits: 2, unit: 'day', durationLabel: '2 days' };
  }
  if (riteId === 'cause-mutation') return { requiredUnits: 1, unit: 'CL day', durationLabel: 'modified CL days' };
  return { requiredUnits: 1, unit: 'work unit', durationLabel: '1 work unit' };
}

function buildProjectFromDetail(detail) {
  const entry = buildEntryFromDetail(detail);
  const duration = getProjectDuration(detail);
  return normalizeProject({
    ...entry,
    id: randomId('project'),
    status: 'pending',
    progress: 0,
    requiredUnits: duration.requiredUnits,
    unit: duration.unit,
    durationLabel: duration.durationLabel,
    gmGated: detail?.rite?.gmGated === true,
    completionMode: 'manual-next-phase'
  });
}

function isProjectRite(rite) {
  return rite?.stateKey === PROJECT_STATE_KEY || rite?.timing === 'downtime';
}

function cooldownLabelForSlot(slotKey) {
  if (slotKey === 'activeForceTalisman' || slotKey === 'focusedForceTalisman') return 'Force Talisman';
  if (slotKey === 'activeDarkSideTalisman') return 'Dark Side Talisman';
  if (slotKey === 'activeSithTalisman') return 'Sith Talisman';
  return 'Alchemy working';
}

function shouldCooldown(slotKey) {
  return ['activeForceTalisman', 'activeDarkSideTalisman', 'activeSithTalisman'].includes(slotKey);
}

export async function recordForceAlchemySelection(actor, detail, options = {}) {
  if (!detail?.ready) throw new Error('The selected rite is not ready to record.');
  const rite = detail.rite;
  const current = readForceAlchemyState(actor);
  const next = clone(current);

  if (isProjectRite(rite)) {
    const project = buildProjectFromDetail(detail);
    next.projects = [...asArray(next.projects), project];
    await writeForceAlchemyState(actor, next);
    return { mode: 'project', entry: project, state: readForceAlchemyState(actor) };
  }

  const entry = buildEntryFromDetail(detail, options);
  const stateKey = rite.stateKey;
  if (!STATE_KEYS.has(stateKey)) throw new Error(`Unsupported Force Alchemy state key: ${stateKey}`);
  next[stateKey] = entry;
  await writeForceAlchemyState(actor, next);
  return { mode: 'active', entry, state: readForceAlchemyState(actor) };
}

export async function clearForceAlchemySlot(actor, stateKey) {
  if (!STATE_KEYS.has(stateKey)) throw new Error(`Unsupported Force Alchemy state key: ${stateKey}`);
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  next[stateKey] = null;
  await writeForceAlchemyState(actor, next);
  return readForceAlchemyState(actor);
}

export async function destroyForceAlchemySlot(actor, stateKey) {
  if (!STATE_KEYS.has(stateKey)) throw new Error(`Unsupported Force Alchemy state key: ${stateKey}`);
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  next[stateKey] = null;
  if (shouldCooldown(stateKey)) {
    const startedAt = nowIso();
    const endsAt = new Date(Date.now() + TALISMAN_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    next.cooldowns = [
      ...asArray(next.cooldowns),
      normalizeCooldown({
        id: randomId('cooldown'),
        key: stateKey,
        label: cooldownLabelForSlot(stateKey),
        startedAt,
        endsAt
      })
    ];
  }
  await writeForceAlchemyState(actor, next);
  return readForceAlchemyState(actor);
}


export async function updateForceAlchemySlot(actor, stateKey, patch = {}) {
  if (!STATE_KEYS.has(stateKey)) throw new Error(`Unsupported Force Alchemy state key: ${stateKey}`);
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  const entry = next[stateKey];
  if (!entry) throw new Error(`No Force Alchemy entry exists for ${stateKey}.`);
  next[stateKey] = normalizeStateEntry({
    ...entry,
    ...(patch && typeof patch === 'object' ? clone(patch) : {}),
    updatedAt: nowIso()
  }, entry.riteId);
  await writeForceAlchemyState(actor, next);
  return readForceAlchemyState(actor);
}

export async function cancelForceAlchemyProject(actor, projectId) {
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  next.projects = asArray(next.projects).filter(project => project.id !== projectId);
  await writeForceAlchemyState(actor, next);
  return readForceAlchemyState(actor);
}

export async function advanceForceAlchemyProject(actor, projectId, amount = 1) {
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  next.projects = asArray(next.projects).map(project => {
    if (project.id !== projectId) return project;
    const progress = Math.max(0, Number(project.progress ?? 0) + Number(amount || 0));
    return normalizeProject({
      ...project,
      progress,
      status: progress >= Number(project.requiredUnits ?? 1) ? 'ready' : 'pending',
      updatedAt: nowIso()
    });
  });
  await writeForceAlchemyState(actor, next);
  return readForceAlchemyState(actor);
}


export async function completeForceAlchemyProject(actor, projectId, patch = {}) {
  const current = readForceAlchemyState(actor);
  const next = clone(current);
  const project = asArray(next.projects).find(entry => entry.id === projectId);
  if (!project) throw new Error('No matching Force Alchemy project found.');
  next.projects = asArray(next.projects).filter(entry => entry.id !== projectId);
  const completed = normalizeProject({
    ...project,
    ...(patch && typeof patch === 'object' ? clone(patch) : {}),
    status: 'complete',
    progress: project.requiredUnits,
    completedAt: nowIso(),
    updatedAt: nowIso()
  });
  // Keep the state lean for now: completed item history is represented on the transformed item flags and chat card.
  await writeForceAlchemyState(actor, next);
  return { project: completed, state: readForceAlchemyState(actor) };
}

export const ForceAlchemyStateService = {
  read: readForceAlchemyState,
  recordSelection: recordForceAlchemySelection,
  clearSlot: clearForceAlchemySlot,
  destroySlot: destroyForceAlchemySlot,
  updateSlot: updateForceAlchemySlot,
  cancelProject: cancelForceAlchemyProject,
  advanceProject: advanceForceAlchemyProject,
  completeProject: completeForceAlchemyProject
};

export default ForceAlchemyStateService;
