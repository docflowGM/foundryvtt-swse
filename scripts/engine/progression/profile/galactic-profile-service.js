/**
 * GalacticProfileService — the Foundry-runtime wiring for the unified Galactic Profile pipeline.
 *
 *   registry (catalog / validated profiles)  →  compileProfile (pure)  →  applyCompiledProfile (atomic)  →  shell
 *
 * Everything with logic lives in the pure modules (registry, compiler, resolvers, apply) which are tested offline.
 * This file only assembles the REAL V2 authorities into the resolver dependencies and drives the shell:
 *   ClassesRegistry, SpeciesRegistry (+ publication policy, SPECIES-RD-001), SkillRegistry, FeatChoiceResolver,
 *   FeatGrantEntitlementResolver, ProgressionContentAuthority, ProgressionRules, ProgressionSubtypeAdapterRegistry,
 *   compendium indexes. It adds NO rules. Anything it cannot establish returns an explicit blocked/unresolved result.
 *
 * Foundry-only: exercised by Foundry v13 runtime tests, not by offline Node tests.
 */
import { GalacticProfileRegistry } from './galactic-profile-registry.js';
import { compileProfile } from './galactic-profile-compiler.js';
import { createGalacticProfileResolvers } from './galactic-profile-resolvers.js';
import { applyCompiledProfile, getProfileApplication } from './galactic-profile-apply.js';
import { ProgressionSubtypeAdapterRegistry } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/adapters/progression-subtype-adapter-registry.js';
import { ClassesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js';
import { SpeciesRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js';
import { checkPublicationSelection } from '/systems/foundryvtt-swse/scripts/species/species-publication-selection.js';
import { buildPendingSpeciesContext } from '/systems/foundryvtt-swse/scripts/engine/progression/helpers/build-pending-species-context.js';
import { buildPendingBackgroundContext } from '/systems/foundryvtt-swse/scripts/engine/progression/backgrounds/background-pending-context-builder.js';
import { SkillRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js';
import { FeatRegistry } from '/systems/foundryvtt-swse/scripts/engine/registries/feat-registry.js';
import { AbilityEngine } from '/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js';
import { buildClassGrantLedger, mergeLedgerIntoPending } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-grant-ledger-builder.js';
import { resolveCanonicalSkillKey } from '/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/legacy-prereq-registry.js';
import { getChargenGeneralFeatCount } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/chargen-feat-entitlement.js';
import { TalentCadenceEngine } from '/systems/foundryvtt-swse/scripts/engine/progression/talents/talent-cadence-engine.js';
import { combineDroidAbilityMods } from '/systems/foundryvtt-swse/scripts/engine/progression/droids/droid-trait-rules.js';
import { FeatChoiceResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js';
import { FeatGrantEntitlementResolver } from '/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-grant-entitlement-resolver.js';
import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';
import { ProgressionRules } from '/systems/foundryvtt-swse/scripts/engine/progression/ProgressionRules.js';
import { ChargenRules } from '/systems/foundryvtt-swse/scripts/engine/chargen/ChargenRules.js';
import { ProgressionSession } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-session.js';
import { ActiveStepComputer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/active-step-computer.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const EXCLUDED_OPEN_STEPS = new Set(['intro', 'profile-class', 'profile-archetype', 'profile-review', 'confirm', 'summary']);

/** Canonical compendium documents used for IDENTITY resolution. Cached: pack contents are immutable per world load. */
let _snapshotPromise = null;
async function loadSnapshot() {
  if (!_snapshotPromise) {
    _snapshotPromise = (async () => {
      const keys = Array.from(game.packs.keys()).filter(k => k.startsWith('foundryvtt-swse.'));
      const read = async (matcher, fields = []) => {
        const out = [];
        for (const key of keys.filter(k => matcher.test(k.slice('foundryvtt-swse.'.length)))) {
          const index = await game.packs.get(key).getIndex({ fields });
          for (const e of index) out.push({ _id: e._id, name: e.name, system: e.system ? { treeId: e.system.treeId ?? null, talent_tree: e.system.talent_tree ?? null } : undefined });
        }
        return out;
      };
      return {
        feats: await read(/^feats$/),
        talents: await read(/^talents$/, ['system.treeId', 'system.talent_tree']),
        forcepowers: await read(/^forcepowers$/),
        items: await read(/^(equipment|weapons|armor)/)
      };
    })().catch(err => { _snapshotPromise = null; throw err; });
  }
  return _snapshotPromise;
}

async function ensureAuthorities() {
  if (!ClassesRegistry.isInitialized?.()) await ClassesRegistry.initialize();
  if (!SpeciesRegistry.isInitialized?.()) await SpeciesRegistry.initialize();
  if (SkillRegistry.isBuilt === false) await SkillRegistry.build();
  if (!FeatRegistry.isInitialized?.() && FeatRegistry.count?.() === 0) await FeatRegistry.initialize();
  await ProgressionContentAuthority.initialize?.();
}

function buildDeps(shell, snapshot) {
  const actor = shell.actor;
  const subtype = shell.progressionSession.subtype;
  return {
    adapterRegistry: ProgressionSubtypeAdapterRegistry.getInstance(),
    snapshot,
    // resolveModel accepts the pack document _id (our authored id), the registry id, or a name — getById alone does not.
    classLookup: id => ClassesRegistry.resolveModel(id) ?? null,
    backgroundsEnabled: () => ChargenRules.backgroundsEnabled(),
    // V2 keeps ONE 'Knowledge' skill document but canonical keys per specialization; the canonical resolver is the authority.
    skillExists: key => !!resolveCanonicalSkillKey(key),
    // V2's allowance is class base + INT MODIFIER: use the FINAL Int (base + species/droid modifiers), as the Skills step does.
    skillAllowance: (classModel, base, { draft, speciesCtx } = {}) => {
      const mods = subtype === 'droid'
        ? combineDroidAbilityMods(draft?.droid?.droidDegree, draft?.droid?.droidSize)
        : (speciesCtx ? (speciesCtx?.identity?.doc?.abilityMods ?? speciesCtx?.identity?.abilityMods ?? {}) : {});
      const attributes = { int: { score: Number(base?.int) + (Number(mods.int) || 0) } };
      return Number(ProgressionContentAuthority.getClassSkillAllowance(classModel, attributes, actor));
    },

    async speciesLookup(ref) {
      const entry = SpeciesRegistry.getById?.(ref?.sourceId) || SpeciesRegistry.getByName?.(ref?.name) || null;
      if (!entry) return { status: 'missing' };
      // SPECIES-RD-001: a species with several verified publications is NEVER defaulted; the player chooses.
      if (!checkPublicationSelection(entry, null).ok) return { status: 'needsVersion', identity: entry };
      const pendingContext = await buildPendingSpeciesContext(actor, entry, { source: 'galactic-profile' });
      return { status: 'resolved', identity: pendingContext?.identity ?? entry, pendingContext };
    },
    async backgroundLookup(ref) {
      try {
        const pendingContext = await buildPendingBackgroundContext(ref?.sourceId || ref?.name, { multiMode: false, source: 'galactic-profile' });
        if (!pendingContext) return { status: 'missing' };
        return { status: 'resolved', id: ref.sourceId ?? ref.name, name: ref.name, pendingContext };
      } catch (err) {
        swseLogger.warn('[GalacticProfileService] background unresolved', { ref, error: err?.message });
        return { status: 'missing' };
      }
    },

    /**
     * The pending state V2's feat/talent evaluators read (same shape FeatStep builds): selected class/feats/talents/skills,
     * class-granted feats from the grant ledger, pending species, and pending ability scores incl. species/droid modifiers.
     */
    buildPending({ draft, speciesCtx, acceptedFeats = [], acceptedTalents = [] }) {
      const values = draft.attributes?.values || {};
      const mods = subtype === 'droid'
        ? combineDroidAbilityMods(draft.droid?.droidDegree, draft.droid?.droidSize)
        : (speciesCtx ? (speciesCtx?.identity?.doc?.abilityMods ?? speciesCtx?.identity?.abilityMods ?? {}) : {});
      const finalValues = Object.fromEntries(Object.keys(values).map(k => [k, Number(values[k]) + (Number(mods[k]) || 0)]));
      const base = {
        selectedClass: draft.class || null,
        selectedFeats: acceptedFeats,
        selectedTalents: acceptedTalents,
        selectedSkills: (draft.skills?.trained || []).map(key => ({ key })),
        skillRanks: {},
        grantedFeats: [],
        pendingSpeciesContext: draft.pendingSpeciesContext || null,
        attributes: { values, speciesMods: mods, finalValues }
      };
      const ledger = draft.class ? buildClassGrantLedger(actor, draft.class, base) : null;
      return ledger ? { ...mergeLedgerIntoPending(base, ledger), attributes: base.attributes } : base;
    },

    /**
     * Parameterized feat ("Skill Focus (Mechanics)"): V2's own FeatChoiceResolver on the REGISTRY feat with the pending
     * shape it reads. The authored label must match exactly one V2 option AND validate; otherwise unresolved (fail closed).
     */
    async featChoice(featDoc, label, ctx = {}) {
      try {
        const feat = FeatRegistry.getById(featDoc._id) ?? featDoc;
        const pending = this.buildPending({ draft: ctx.draft || {}, speciesCtx: ctx.speciesCtx, acceptedFeats: ctx.acceptedFeats || [] });
        const options = await FeatChoiceResolver.resolveOptions(actor, feat, { pending });
        const want = String(label).trim().toLowerCase();
        const matches = (Array.isArray(options) ? options : []).filter(o => [o?.label, o?.name, o?.value, o?.id, o?.key].some(v => String(v ?? '').trim().toLowerCase() === want));
        if (matches.length !== 1) return { ok: false, errors: [`choice "${label}" matched ${matches.length} of ${(options || []).length} V2 option(s)`] };
        const selected = matches[0].value ?? matches[0].id ?? matches[0].key;
        const verdict = await FeatChoiceResolver.validateSelectedChoice(actor, feat, selected, { pending });
        if (!verdict?.valid) return { ok: false, errors: verdict?.errors ?? ['choice not legal'] };
        return { ok: true, system: FeatChoiceResolver.buildChoicePatch(feat, selected)?.system ?? { selectedChoice: selected } };
      } catch (err) {
        return { ok: false, errors: [err?.message || String(err)] };
      }
    },

    /**
     * Acquisition legality = V2's AbilityEngine (PrerequisiteChecker) on the REGISTRY-normalized document, evaluated
     * against a pending draft shaped exactly like FeatStep's (selected class/feats/talents/skills, class-granted feats
     * from the grant ledger, pending species, and pending ability scores incl. species/droid modifiers).
     */
    async prerequisites({ kind, id, system, draft, speciesCtx, acceptedFeats = [], acceptedTalents = [] }) {
      try {
        const candidate = kind === 'feat' ? FeatRegistry.getById(id) : (await game.packs.get('foundryvtt-swse.talents')?.getDocument(id))?.toObject?.();
        if (!candidate) return { legal: false, missing: [`${kind} ${id} is not in the canonical registry`], unresolved: [] };
        const pending = this.buildPending({ draft, speciesCtx, acceptedFeats, acceptedTalents });
        const assessed = AbilityEngine.evaluateAcquisition(actor, { ...candidate, type: kind, system: { ...(candidate.system || {}), ...(system || {}) } }, pending);
        return { legal: assessed.legal === true, missing: assessed.missing || [], unresolved: assessed.unresolved || [] };
      } catch (err) {
        return { legal: false, missing: [`acquisition evaluation failed: ${err?.message || err}`], unresolved: [] };   // fail closed
      }
    },
    speciesAbilityModsFor: speciesCtx => speciesCtx?.identity?.doc?.abilityMods ?? speciesCtx?.identity?.abilityMods ?? null,

    // ONE rule each: the Feat step's chargen count and the Talent cadence authority.
    featEntitlement: ({ draft }) => getChargenGeneralFeatCount({ draft, actor, subtype }),
    talentEntitlement: () => TalentCadenceEngine.calculateChargenTalentsRequired(),

    /** V2's own Force Training entitlement, evaluated against a TRANSIENT shell holding only the compiled draft. */
    forceEntitlement({ draft }) {
      try {
        const transient = { actor, progressionSession: { draftSelections: { ...draft }, subtype } };
        return { slots: Number(FeatGrantEntitlementResolver.totalForGrantType(actor, 'forcePowerSlots', { shell: transient })) || 0 };
      } catch (_err) {
        return { slots: 0 };
      }
    },

    /** Steps still active for the compiled draft (excluding steps the profile locks). */
    async openSteps({ draft, locks }) {
      const preview = new ProgressionSession({ actor, mode: 'chargen', subtype });
      for (const [key, value] of Object.entries(draft)) preview.commitSelection('galactic-profile-preview', key, value, { replace: true });
      const computer = new ActiveStepComputer();
      const active = await computer.computeActiveSteps(actor, 'chargen', preview, { subtype });
      const lockSet = new Set(locks || []);
      return active.filter(id => !EXCLUDED_OPEN_STEPS.has(id) && !lockSet.has(id)).map(stepId => ({ stepId, reason: 'PLAYER_CHOICE_OR_CONFIRMATION' }));
    }
  };
}

export class GalacticProfileService {
  /** Compile without touching the session or actor. */
  static async compileForShell(shell, profileId) {
    const session = shell?.progressionSession;
    if (!session || !shell.actor) return { ok: false, blocked: [{ code: 'NO_SESSION', path: '', detail: 'no active progression session' }] };
    await ensureAuthorities();
    const profile = await GalacticProfileRegistry.getProfile(profileId);
    if (!profile) return { ok: false, profileId, blocked: [{ code: 'PROFILE_NOT_FOUND_OR_INVALID', path: 'profileId', detail: String(profileId) }] };
    const resolvers = createGalacticProfileResolvers(buildDeps(shell, await loadSnapshot()));
    return compileProfile(profile, {
      sessionSubtype: session.subtype,
      resolvers,
      settings: { droidConstructionCredits: ProgressionRules.getDroidConstructionCredits() }
    });
  }

  /** Explicit Apply: compile, apply atomically, recompute steps once. Never touches the actor. */
  static async applyForShell(shell, profileId) {
    const compiled = await this.compileForShell(shell, profileId);
    if (!compiled.ok) return { ok: false, code: 'COMPILE_BLOCKED', compiled };
    const result = applyCompiledProfile(shell.progressionSession, compiled);
    if (!result.ok) return { ...result, compiled };
    if (result.changed) {
      shell.progressionSession.profilePickerMode = false;
      shell.progressionSession.profileStepsComplete = true;
      await shell._initializeSteps?.();
      await shell._persistSessionSnapshot?.('galactic-profile-apply');
    }
    return { ...result, compiled, application: getProfileApplication(shell.progressionSession) };
  }
}
