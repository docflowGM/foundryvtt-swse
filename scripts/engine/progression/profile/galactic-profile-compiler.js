/**
 * GalacticProfileCompiler — ONE entry point that turns authored profile INTENT into a session-ready draft.
 *
 *   compileProfile(profile, ctx) -> {
 *     ok, blocked[], diagnostics[], open[], draft, deferred, economy, resolved, digest, profileId, revision, subtype
 *   }
 *
 * Contract (see docs/audits/SWSE_Galactic_Profiles_v3_Unification_Audit.md, Part 2 §R.6):
 *  - PURE. No actor writes, no session writes, no input mutation. Safe to call for preview.
 *  - FAIL CLOSED. Any unresolved/ambiguous identity, unknown subtype, subtype mismatch, open ruling block,
 *    unresolved attribute basis, over-budget or un-installable droid yields `blocked[]` and `ok:false`.
 *  - NO RULES LIVE HERE. Every rule decision is delegated to a V2 authority through `ctx.resolvers`
 *    (ClassesRegistry, SpeciesRegistry + publication policy, SkillRegistry, feat/talent registries and
 *    FeatChoiceResolver, FeatGrantEntitlementResolver, item packs) and the droid quote/installation services via
 *    droid-draft-builder. The compiler only orders the calls, re-keys results into the normalized draft shapes
 *    the existing steps write, and records what it could not establish.
 *
 * ctx = {
 *   sessionSubtype: string,                 // the session's subtype, established BEFORE the picker opens
 *   resolvers: GalacticProfileResolvers,    // see galactic-profile-resolvers.js (interface documented there)
 *   settings: { droidConstructionCredits }  // from ProgressionRules in production
 * }
 */
import {
  normalizeClass, normalizeSpecies, normalizeAttributes, normalizeSkills, normalizeFeats, normalizeTalents,
  normalizeLanguages, normalizeBackground
} from '../../../apps/progression-framework/steps/step-normalizers.js';
import { buildDroidDraft } from '../../../domain/droids/droid-draft-builder.js';
import { getPCDroidAllowedHeroicClasses } from '../droids/droid-trait-rules.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const nameKey = v => String(v ?? '').toLowerCase().replace(/\*/g, '').replace(/[^a-z0-9]+/g, '');

function stableHash(value) {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export async function compileProfile(profile, ctx = {}) {
  const blocked = [];
  const diagnostics = [];
  const open = [];
  const resolved = {};
  const draft = {};
  let deferred = null;
  let economy = null;
  const block = (code, path, detail) => blocked.push({ code, path, detail });
  const note = (code, path, detail) => diagnostics.push({ code, path, detail });
  const result = () => ({
    ok: blocked.length === 0,
    profileId: profile?.profileId ?? null,
    revision: profile?.revision ?? null,
    subtype: profile?.subtype ?? null,
    blocked, diagnostics, open, resolved, draft, deferred, economy, locks: resolved.locks ?? ['l1-survey'],
    digest: stableHash({ id: profile?.profileId, rev: profile?.revision, st: ctx.sessionSubtype, resolved, settings: ctx.settings ?? null })
  });

  const R = ctx.resolvers;
  if (!profile || typeof profile !== 'object' || !R) { block('INVALID_INPUT', '', 'profile and resolvers are required'); return result(); }

  // ── 1. subtype: strict, exact, established by the creation lane BEFORE the picker ───────────────────────────
  if (!R.subtypeAdapter(profile.subtype)) { block('UNKNOWN_SUBTYPE', 'subtype', String(profile.subtype)); return result(); }
  if (ctx.sessionSubtype !== profile.subtype) {
    block('SUBTYPE_MISMATCH', 'subtype', `session=${ctx.sessionSubtype} profile=${profile.subtype}`);
    return result();
  }
  const c = profile.choices;

  // ── 2. open rulings and structurally unresolved authored values block outright ─────────────────────────────
  for (const rb of c.rulingBlocks || []) block('RULING_BLOCKED', 'choices.rulingBlocks', rb);
  for (const u of c.unresolved || []) block(u.code || 'UNRESOLVED_SELECTION', u.path, String(u.authored));

  // ── 3. class (committed with its full registry `system`, exactly as ClassStep does) ───────────────────────────
  const classModel = await R.class(c.class);
  if (!classModel) block('CLASS_UNRESOLVED', 'choices.class', c.class);
  else {
    resolved.class = classModel.id;
    draft.class = normalizeClass({ classId: classModel.id, sourceId: classModel.sourceId, className: classModel.name, classData: classModel, system: classModel.system });
    if (profile.subtype === 'droid') {
      const allowed = getPCDroidAllowedHeroicClasses();
      if (!allowed.includes(classModel.name)) block('CLASS_NOT_ALLOWED_FOR_DROID', 'choices.class', classModel.name);
    }
  }

  // ── 4. species (droids have none). Multi-publication species need the player's explicit version (SPECIES-RD-001)
  let speciesCtx = null;
  if (profile.subtype !== 'droid') {
    const sp = await R.species(c.species);
    if (sp.status === 'missing') block('SPECIES_UNRESOLVED', 'choices.species', c.species?.name ?? c.species?.sourceId);
    else if (sp.status === 'needsVersion') {
      open.push({ stepId: 'species', reason: 'PUBLICATION_VERSION_REQUIRED' });
      note('SPECIES_VERSION_LEFT_TO_PLAYER', 'choices.species', c.species?.name);
    } else {
      speciesCtx = sp;
      resolved.species = sp.identity?.id ?? c.species.sourceId;
      draft.species = normalizeSpecies({ id: sp.identity?.id ?? c.species.sourceId, name: sp.identity?.name, speciesData: sp.identity?.doc, pendingContext: sp.pendingContext });
      draft.pendingSpeciesContext = sp.pendingContext ?? null;
    }
  }
  let backgroundCtx = null;
  if (c.background && R.backgroundEnabled?.() !== false) {
    const bg = await R.background(c.background);
    if (bg.status === 'missing') block('BACKGROUND_UNRESOLVED', 'choices.background', c.background?.name);
    else {
      backgroundCtx = bg;
      resolved.background = bg.id ?? c.background.sourceId;
      draft.background = normalizeBackground({ backgroundId: bg.id ?? c.background.sourceId, backgroundName: bg.name, ledger: bg.pendingContext?.ledger ?? null, pendingContext: bg.pendingContext ?? null });
      draft.pendingBackgroundContext = bg.pendingContext ?? null;
      draft.backgroundLedger = bg.pendingContext?.ledger ?? null;
    }
  }

  // ── 5. attributes: the basis is never guessed and no number is ever rewritten ───────────────────────────────
  const { basis, base } = c.attributes;
  const cleanBase = Object.fromEntries(ABILITIES.filter(k => base[k] !== undefined).map(k => [k, base[k]]));
  if (basis === 'unresolved') {
    const mods = profile.subtype === 'droid' ? null : (speciesCtx ? R.speciesAbilityMods(speciesCtx) : undefined);
    if (mods === undefined || mods === null) block('ATTRIBUTE_BASIS_UNRESOLVED', 'choices.attributes', 'species ability modifiers unavailable');
    else if (ABILITIES.every(k => !mods[k])) note('ATTRIBUTE_BASIS_MOOT', 'choices.attributes', 'species has no ability modifiers; pre == post');
    else block('ATTRIBUTE_BASIS_UNRESOLVED', 'choices.attributes', 'authored scores may be pre- or post-species; owner must state the basis');
  }
  if (!blocked.some(b => b.code === 'ATTRIBUTE_BASIS_UNRESOLVED')) {
    draft.attributes = normalizeAttributes(cleanBase);
    resolved.attributes = { basis, ...cleanBase };
    note('ATTRIBUTE_GENERATION_UNVERIFIED', 'choices.attributes', 'array legality under the chosen generation method is validated by V2 at finalization');
  }

  // ── 6. skills ────────────────────────────────────────────────────────────────────────────────────────────────
  const goodSkills = [];
  for (const key of c.skills) {
    if (R.skill(key)) goodSkills.push(key); else block('SKILL_UNKNOWN', 'choices.skills', key);
  }
  draft.skills = normalizeSkills(goodSkills);
  resolved.skills = goodSkills;

  // ── 7. feats: identity → (class/species auto-grants are V2's, not selections) → choice ───────────────────────
  const autoGrantKeys = new Set(classModel ? (R.classAutoGrantNames(classModel) || []).map(nameKey) : []);
  const featDrafts = [];
  for (const entry of c.feats) {
    // Class/species auto-grants are V2's: never resolved, validated or committed as a selection.
    if (autoGrantKeys.has(nameKey(entry.name))) {
      note('FEAT_IS_CLASS_AUTOGRANT', 'choices.feats', `${entry.name} is granted by V2; not committed as a selection`);
      continue;
    }
    const f = await R.feat(entry, { draft, classModel, speciesCtx, acceptedFeats: featDrafts });
    if (f.status !== 'resolved') { block(f.status === 'ambiguous' ? 'FEAT_AMBIGUOUS' : 'FEAT_UNRESOLVED', 'choices.feats', entry.name); continue; }
    if (autoGrantKeys.has(nameKey(entry.name)) || autoGrantKeys.has(nameKey(f.doc?.name))) {
      note('FEAT_IS_CLASS_AUTOGRANT', 'choices.feats', `${entry.name} is granted by V2; not committed as a selection`);
      continue;
    }
    // Acquisition legality is V2's (AbilityEngine/PrerequisiteChecker). Never inferred here.
    if (typeof R.prerequisites === 'function') {
      const verdict = await R.prerequisites({ kind: 'feat', id: f.id, doc: f.doc, system: f.system ?? {}, draft, classModel, speciesCtx, acceptedFeats: featDrafts, subtype: profile.subtype });
      if (verdict?.legal === false) { block('FEAT_PREREQUISITES_UNMET', 'choices.feats', `${entry.name}: ${(verdict.missing || []).join('; ') || 'prerequisites not met'}`); continue; }
      for (const u of verdict?.unresolved || []) note('FEAT_PREREQUISITE_ADVISORY', 'choices.feats', `${entry.name}: ${u}`);
    } else note('PREREQUISITES_NOT_EVALUATED', 'choices.feats', `${entry.name}: no acquisition authority supplied`);
    if (f.matchedBy === 'normalizedName') note('FEAT_MATCHED_BY_NORMALIZED_NAME', 'choices.feats', `${entry.name} -> ${f.doc?.name} (V2 registry key normalization; unique)`);
    if (f.choiceVerified === false) note('FEAT_CHOICE_UNVERIFIED', 'choices.feats', `${entry.name}: choice not validated by FeatChoiceResolver in this context`);
    featDrafts.push({ id: f.id, name: f.doc?.name ?? f.name ?? entry.name, pack: 'foundryvtt-swse.feats', type: 'feat', system: f.system ?? {}, source: 'profile' });
  }
  if (typeof R.featEntitlement === 'function' && profile.subtype !== 'nonheroic' && profile.subtype !== 'beast') {
    const allowed = R.featEntitlement({ draft: { ...draft, feats: featDrafts }, subtype: profile.subtype });
    if (Number.isFinite(allowed) && featDrafts.length > allowed) block('FEAT_SLOTS_EXCEEDED', 'choices.feats', `${featDrafts.length} selected feat(s) vs ${allowed} general feat entitlement(s) (V2)`);
    else if (Number.isFinite(allowed)) resolved.featEntitlement = { allowed, selected: featDrafts.length };
  } else if (profile.subtype === 'nonheroic' || profile.subtype === 'beast') {
    note('FEAT_ENTITLEMENT_NOT_EVALUATED', 'choices.feats', 'nonheroic/beast starting-feat entitlements are owned by their V2 subtype steps and are not evaluated at compile');
  }
  draft.feats = normalizeFeats(featDrafts) || [];
  resolved.feats = featDrafts.map(f => f.id);

  // ── 8. talents: published identity + tree access come from the talent authority, never from authored labels ──
  const talentDrafts = [];
  for (const entry of c.talents) {
    const t = await R.talent(entry, classModel);
    if (t.status !== 'resolved') { block(t.status === 'ambiguous' ? 'TALENT_AMBIGUOUS' : 'TALENT_UNRESOLVED', 'choices.talents', entry.name); continue; }
    if (t.access?.allowed !== true) {
      // The class's registered trees do not include this talent's tree. V2's tree authority (Force trees, traditions,
      // droid degree trees) evaluates actor state we do not have yet, so the talent is HELD as authored intent and the
      // normal V2 talent step decides legality. It is never granted here.
      deferred = { ...(deferred || {}), talents: [...(deferred?.talents || []), { id: t.id, name: t.name, treeId: t.treeId ?? null }] };
      note('TALENT_ACCESS_DEFERRED_TO_V2', 'choices.talents', `${entry.name} (${t.access?.tree ?? 'unknown tree'}) is not in ${classModel?.name ?? 'the class'}'s registered trees; held for V2 tree authority`);
      if (!open.some(o => o.reason === 'TALENT_ACCESS_UNVERIFIED')) open.push({ stepId: 'class-talent', reason: 'TALENT_ACCESS_UNVERIFIED' });
      continue;
    }
    if (typeof R.prerequisites === 'function') {
      const verdict = await R.prerequisites({ kind: 'talent', id: t.id, doc: t.doc, system: t.system ?? {}, draft: { ...draft, feats: featDrafts }, classModel, speciesCtx, acceptedFeats: featDrafts, acceptedTalents: talentDrafts, subtype: profile.subtype });
      if (verdict?.legal === false) { block('TALENT_PREREQUISITES_UNMET', 'choices.talents', `${entry.name}: ${(verdict.missing || []).join('; ') || 'prerequisites not met'}`); continue; }
      for (const u of verdict?.unresolved || []) note('TALENT_PREREQUISITE_ADVISORY', 'choices.talents', `${entry.name}: ${u}`);
    } else note('PREREQUISITES_NOT_EVALUATED', 'choices.talents', `${entry.name}: no acquisition authority supplied`);
    talentDrafts.push({ id: t.id, name: t.name, pack: 'foundryvtt-swse.talents', type: 'talent', treeId: t.treeId ?? null, system: t.system ?? {}, source: 'profile' });
  }
  if (typeof R.talentEntitlement === 'function' && c.talents.length) {
    const allowed = R.talentEntitlement({ subtype: profile.subtype });
    if (Number.isFinite(allowed) && c.talents.length > allowed) block('TALENT_SLOTS_EXCEEDED', 'choices.talents', `${c.talents.length} authored talent(s) vs ${allowed} chargen talent entitlement(s) (V2 TalentCadenceEngine)`);
    else if (Number.isFinite(allowed)) resolved.talentEntitlement = { allowed, authored: c.talents.length };
  }
  if (c.talents.length && !talentDrafts.length) note('TALENT_NOT_COMMITTED', 'choices.talents', 'no authored talent could be committed');
  draft.talents = talentDrafts.length ? (normalizeTalents(talentDrafts) || []) : [];
  resolved.talents = talentDrafts.map(t => t.id);

  // ── 9. languages: automatic species/background/Basic grants are re-materialized by V2 ledgers ────────────────
  const automatic = R.automaticLanguages(speciesCtx, backgroundCtx);
  const bonusLanguages = c.languages.filter(l => !automatic.has(nameKey(l)));
  draft.languages = normalizeLanguages(bonusLanguages) || [];

  // ── 10. Force powers: preserved as intent; applied only where V2 says the entitlement legally exists ──────────
  if (c.forcePowers.length) {
    const ent = R.forceEntitlement({ draft, subtype: profile.subtype, classModel, featIds: resolved.feats, featNames: [...autoGrantKeys, ...featDrafts.map(f => nameKey(f.name))], skills: goodSkills, attributes: cleanBase, speciesCtx });
    const powers = [];
    for (const fp of c.forcePowers) {
      const item = await R.forcePower(fp);
      if (item.status !== 'resolved') block('FORCE_POWER_UNRESOLVED', 'choices.forcePowers', fp.name); else powers.push({ id: item.id, name: fp.name });
    }
    if (ent.slots >= powers.length && ent.slots > 0) {
      draft.forcePowers = powers;
      resolved.forcePowers = powers.map(p => p.id);
    } else {
      deferred = { ...(deferred || {}), forcePowers: powers };
      note('FORCE_TRAINING_REQUIRED', 'choices.forcePowers', `authored ${powers.length} power(s); V2 entitlement currently provides ${ent.slots} slot(s). Powers are held as intent, not applied.`);
      open.push({ stepId: 'general-feat', reason: 'FORCE_TRAINING_REQUIRED' });
    }
  }

  // ── 11. droid construction through the V2 quote + installation authorities ───────────────────────────────────
  if (profile.subtype === 'droid') {
    const d = profile.extension?.droid;
    const budget = Number(ctx.settings?.droidConstructionCredits);
    if (!d || !Number.isFinite(budget)) block('DROID_CONTEXT_MISSING', 'extension.droid', 'extension or construction budget unavailable');
    else {
      const built = buildDroidDraft({ degree: d.degree, size: d.size, systems: d.systems, budget });
      if (!built.ok) for (const b of built.blocked) block(b.code, b.path, b.detail);
      else { draft.droid = built.draft; resolved.droid = { total: built.quote.totalCredits, degree: d.degree, size: d.size }; }
    }
  }
  if (profile.subtype === 'beast') note('BEAST_CONTEXT_NOT_APPLIED', 'extension.beast', 'beast mechanics have no canonical V2 draft destination yet; profile blocked by ruling');

  // ── 12. equipment + exact final wallet: draft-only, materialized once by the finalizer ───────────────────────
  const equipment = [];
  for (const e of c.equipment) {
    if (!e.sourceId) { block('ITEM_WITHOUT_ID', 'choices.equipment', e.name); continue; }
    const item = await R.item(e);
    if (item.status !== 'resolved') { block(item.status === 'ambiguous' ? 'ITEM_AMBIGUOUS' : 'ITEM_UNRESOLVED', 'choices.equipment', e.name); continue; }
    equipment.push({ itemId: item.id, pack: item.pack ?? e.pack, name: e.name, qty: e.qty, provenance: 'galactic-profile' });
  }
  economy = {
    schema: 'swse-profile-economy-v1',
    walletMode: 'exactFinalBalance',
    walletCredits: c.wallet.credits,
    walletResolved: true,
    equipment
  };
  resolved.economy = { credits: c.wallet.credits, items: equipment.map(i => `${i.itemId}x${i.qty}`) };

  // ── 13. Steps the profile fully satisfied (persisted with the application; never inferred from array length) ──────
  //   Only what this compile ESTABLISHED through V2 is locked. Entitlement-count-dependent steps (feats, languages,
  //   Force) stay open unless V2 reports the count met; `l1-survey` is always answered by the profile itself.
  const locks = ['l1-survey'];
  if (draft.species) locks.push('species');
  if (draft.class) locks.push('class');
  if (draft.attributes) locks.push('attribute');
  if (draft.background) locks.push('background');
  if (draft.skills && typeof R.skillAllowance === 'function') {
    const allowance = R.skillAllowance(classModel, cleanBase, { draft, speciesCtx });
    if (Number.isFinite(allowance) && allowance === goodSkills.length) locks.push('skills');
    else if (Number.isFinite(allowance)) note('SKILL_COUNT_DIFFERS_FROM_ALLOWANCE', 'choices.skills', `authored ${goodSkills.length}, V2 allowance ${allowance}`);
  }
  if (talentDrafts.length && !deferred?.talents) locks.push('class-talent');
  if (draft.droid) locks.push('droid-builder');
  resolved.locks = locks;

  if (typeof R.openSteps === 'function') open.push(...(await R.openSteps({ profile, draft, open, locks })));
  return result();
}

export const _internals = Object.freeze({ nameKey, stableHash });
