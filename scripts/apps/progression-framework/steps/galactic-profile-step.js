import { ProgressionStepPlugin } from './step-plugin-base.js';
import { GalacticProfileRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/profile/galactic-profile-registry.js';
import { GalacticProfileService } from '/systems/foundryvtt-swse/scripts/engine/progression/profile/galactic-profile-service.js';
import { getProfileApplication } from '/systems/foundryvtt-swse/scripts/engine/progression/profile/galactic-profile-apply.js';
import { getStepMentorContext, handleAskMentor, setSessionMentorContext } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/mentor-step-integration.js';
import { getMentorForClass, getMentorKey, resolveMentorData } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { localizeMentorTemplateDialogues } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-localization.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

const CLASS_BRIEFS = {
  jedi: 'A disciplined Force-sensitive path built around lightsaber training, intuition, and moral pressure under fire.',
  noble: 'A command and influence path built around social leverage, support talents, and broad skill access.',
  scoundrel: 'A flexible opportunist path built around deception, piloting, tricks, and decisive advantages.',
  scout: 'An exploration and reconnaissance path built around survival, perception, mobility, and field utility.',
  soldier: 'A combat path built around durability, weapon mastery, armor, and clear battlefield roles.',
  nonheroic: 'A fast template path for ordinary galactic roles, followers, and supporting characters.',
};

const NODE_BUSINESS_COPY = {
  species: { icon: 'fa-dna', label: 'Species', detail: 'Resolve species identity or variant work.', blocking: true },
  attribute: { icon: 'fa-chart-bar', label: 'Attributes', detail: 'Resolve ability scores before the build can finalize.', blocking: true },
  class: { icon: 'fa-shield-alt', label: 'Class', detail: 'Resolve class identity or class package work.', blocking: true },
  background: { icon: 'fa-book', label: 'Background', detail: 'Resolve background-origin choices.', blocking: true },
  skills: { icon: 'fa-book-open', label: 'Skills', detail: 'Pick any trained skill slots that the profile did not fill.', blocking: true },
  languages: { icon: 'fa-language', label: 'Languages', detail: 'Pick bonus languages still owed by Intelligence, species, or background rules.', blocking: true },
  'general-feat': { icon: 'fa-star', label: 'General Feat', detail: 'Choose a remaining 1st-level or replacement feat.', blocking: true },
  'class-feat': { icon: 'fa-star-half-stroke', label: 'Class Feat', detail: 'Choose an unresolved class bonus feat.', blocking: true },
  'general-talent': { icon: 'fa-gem', label: 'General Talent', detail: 'Choose an unresolved general talent.', blocking: true },
  'class-talent': { icon: 'fa-certificate', label: 'Class Talent', detail: 'Choose an unresolved class talent.', blocking: true },
  'force-powers': { icon: 'fa-hand-sparkles', label: 'Force Powers', detail: 'Choose Force powers unlocked by Force Training or profile reconciliation.', blocking: true },
  'force-secrets': { icon: 'fa-jedi', label: 'Force Secret', detail: 'Choose a Force secret entitlement.', blocking: true },
  'force-techniques': { icon: 'fa-bolt', label: 'Force Technique', detail: 'Choose a Force technique entitlement.', blocking: true },
  'medical-secrets': { icon: 'fa-kit-medical', label: 'Medical Secret', detail: 'Choose a medical secret entitlement.', blocking: true },
  'starship-maneuvers': { icon: 'fa-jet-fighter', label: 'Starship Maneuvers', detail: 'Choose unresolved starship maneuver training.', blocking: true },
  summary: { icon: 'fa-clipboard-check', label: 'Final Review', detail: 'Confirm name, starting credits, derived stats, and the final manifest.', blocking: true },
};

let TEMPLATE_DIALOGUE_CACHE = null;

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function keySlug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function title(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/(^|\s)\w/g, m => m.toUpperCase());
}
function abilityModifier(score) {
  return Math.floor((Number(score || 10) - 10) / 2);
}
function fmtMod(mod) {
  return `${mod >= 0 ? '+' : ''}${mod}`;
}
function modClass(mod) {
  if (mod > 0) return 'positive';
  if (mod < 0) return 'negative';
  return 'neutral';
}
function classImagePath(className) {
  const clean = String(className || '').replace(/\s*\(Nonheroic\)\s*/i, '').trim();
  return `systems/foundryvtt-swse/assets/class/${clean}.webp`;
}
function profileImagePath(profile) {
  return profile.catalog.imagePath || `systems/foundryvtt-swse/assets/templates/${profile.profileId}.webp`;
}
function formatAbilities(profile) {
  const base = profile.choices.attributes.base;
  return ABILITIES.filter(key => base[key] !== undefined).map(key => {
    const score = Number(base[key]);
    const mod = abilityModifier(score);
    return { key, label: ABILITY_LABELS[key], score, mod: fmtMod(mod), modClass: modClass(mod) };
  });
}
function countLabel(count, singular, plural = `${singular}s`) {
  const n = Number(count || 0);
  return `${n} ${n === 1 ? singular : plural}`;
}
const roleTags = profile => (profile.catalog.roleTags || []).map(t => title(t)).filter(Boolean);
const speciesName = profile => profile.choices.species?.name || (profile.subtype === 'droid' ? 'Droid' : '');
const backgroundName = profile => profile.choices.background?.name || '';
const names = (list, limit = 0) => { const n = (list || []).map(x => x.name).filter(Boolean); return limit > 0 ? n.slice(0, limit) : n; };
const skillNames = (profile, limit = 0) => { const n = (profile.choices.skills || []).map(title); return limit > 0 ? n.slice(0, limit) : n; };

function getShellFromContext(context, fallback = null) {
  if (context?.shell) return context.shell;
  if (context?._shell) return context._shell;
  if (context?.progressionSession || context?.actor) return context;
  return fallback || null;
}
/** Picker-local focus state. Choosing is an explicit click; nothing is ever pre-selected. */
function getProfileState(shell) {
  const session = shell?.progressionSession;
  if (!session) return {};
  session.profileSelection ??= {};
  return session.profileSelection;
}
function sessionSubtype(shell) {
  return shell?.progressionSession?.subtype || null;
}
/** Browse-card model built from a generated catalog entry (no full-profile load until Review). */
function toCardProfile(entry) {
  const pv = entry.preview || {};
  return {
    profileId: entry.profileId,
    revision: entry.revision,
    subtype: entry.subtype,
    catalog: { name: entry.name, archetype: entry.archetype, description: entry.description, quote: entry.quote, imagePath: entry.imagePath,
      mentorKey: entry.mentorKey, dialogueKey: entry.dialogueKey, roleTags: entry.roleTags || [], classKey: entry.classKey, className: entry.className },
    choices: {
      species: pv.species ? { name: pv.species } : null,
      background: pv.background ? { name: pv.background } : null,
      attributes: { base: pv.abilities || {} },
      skills: pv.skills || [], feats: (pv.feats || []).map(name => ({ name })), talents: [], forcePowers: (pv.powers || []).map(name => ({ name })), equipment: []
    }
  };
}
/** Profiles offered = EXACT session subtype only. The creation lane establishes the subtype before the picker opens. */
async function loadForShell(shell) {
  const subtype = sessionSubtype(shell);
  if (!subtype) return { subtype: null, profiles: [] };
  const entries = await GalacticProfileRegistry.listCatalog({ subtype });
  return { subtype, profiles: entries.map(toCardProfile) };
}
function groupProfiles(profiles) {
  const map = new Map();
  for (const profile of profiles) {
    const key = profile.catalog.classKey;
    if (!map.has(key)) {
      const name = String(profile.catalog.className || title(key)).replace(/\s*\(Nonheroic\)\s*/i, '');
      map.set(key, { id: key, name, image: classImagePath(name), count: 0, profiles: [], description: CLASS_BRIEFS[key] || `A ${name} profile channel.` });
    }
    const group = map.get(key); group.count += 1; group.profiles.push(profile);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function formatClassGroup(group, state, index = 0) {
  const selected = group.id === state.classId;
  return {
    id: group.id,
    index: String(index + 1).padStart(2, '0'),
    name: group.name,
    image: group.image,
    count: group.count,
    description: group.description,
    profileCountLabel: countLabel(group.count, 'profile'),
    archetypeNames: group.profiles.map(p => p.catalog.archetype).filter(Boolean),
    selected,
    dimmed: !!state.classId && !selected,
  };
}
async function loadProfileDialogues() {
  if (TEMPLATE_DIALOGUE_CACHE) return TEMPLATE_DIALOGUE_CACHE;
  try {
    const response = await fetch('systems/foundryvtt-swse/data/mentor-template-dialogues.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    TEMPLATE_DIALOGUE_CACHE = localizeMentorTemplateDialogues(await response.json());
  } catch (err) {
    // A failed fetch is NOT cached: the next call retries (fallback dialogue is used meanwhile).
    swseLogger.warn('[GalacticProfile] Could not load mentor-template-dialogues.json; using profile quotes.', { error: err?.message || String(err) });
    return { mentors: {} };
  }
  return TEMPLATE_DIALOGUE_CACHE;
}
function findProfileDialogue(dialogueData, profile, phase = 'greeting') {
  if (!dialogueData || !profile) return '';
  const mentorKeys = [profile.catalog.mentorKey, profile.catalog.className, getMentorKey(resolveMentorData(profile.catalog.mentorKey || profile.catalog.className))].map(keySlug).filter(Boolean);
  const profileKeys = [profile.catalog.dialogueKey, profile.profileId, profile.catalog.archetype, profile.catalog.name].map(keySlug).filter(Boolean);
  for (const [mentorId, mentor] of Object.entries(dialogueData.mentors || {})) {
    if (!mentorKeys.includes(keySlug(mentorId)) && !mentorKeys.includes(keySlug(mentor?.name))) continue;
    const dialogues = mentor?.dialogues || {};
    for (const key of profileKeys) {
      const text = String(dialogues[key]?.[phase] || '').trim();
      if (text) return text;
    }
  }
  return '';
}
async function syncProfileMentor(shell, className, stepId = null) {
  if (!shell || !className) return null;
  const mentor = getMentorForClass(className) || resolveMentorData(className);
  const mentorKey = getMentorKey(mentor || className);
  return setSessionMentorContext(shell, {
    mentor, mentorId: mentorKey, mentorKey, className,
    stepId: stepId || shell?.steps?.[shell?.currentStepIndex]?.stepId || null,
    source: 'class-selection', confidence: 0.98, reason: 'galactic profile class selection', fallback: false,
  }, { force: true });
}
function nodeBusiness(entry, index = 0) {
  const nodeId = entry.stepId;
  const copy = NODE_BUSINESS_COPY[nodeId] || {};
  return {
    key: nodeId,
    stepId: nodeId,
    icon: copy.icon || 'fa-location-dot',
    label: copy.label || title(nodeId),
    detail: copy.detail || `Resolve ${title(nodeId)} in the normal progression step.`,
    blocking: copy.blocking !== false,
    reason: entry.reason || null,
    ordinal: String(index + 1).padStart(2, '0'),
  };
}
const REASON_COPY = {
  FORCE_TRAINING_REQUIRED: 'This profile lists Force powers, but Force Training is not legally in the build yet. Choose it (and its powers) here.',
  TALENT_ACCESS_UNVERIFIED: 'The authored talent is held until the talent step confirms the class can use its tree.',
  PUBLICATION_VERSION_REQUIRED: 'This species has several published versions. Choose one explicitly.',
};
const BLOCK_COPY = {
  ATTRIBUTE_BASIS_UNRESOLVED: 'The authored ability scores have not been confirmed as base or post-species values.',
  RULING_BLOCKED: 'An open rules ruling prevents applying this profile.',
  SKILL_KEY_UNRESOLVED: 'A listed skill does not exist in this ruleset.',
  ITEM_WITHOUT_ID: 'A listed item has no canonical identity.',
  ITEM_UNRESOLVED: 'A listed item could not be found in the canonical item data.',
  SPECIES_UNRESOLVED: 'The listed species is not in the canonical species data.',
  BACKGROUND_UNRESOLVED: 'The listed background is not in the canonical background data.',
  FEAT_UNRESOLVED: 'A listed feat could not be matched to a canonical feat.',
  FEAT_AMBIGUOUS: 'A listed feat matches more than one canonical feat.',
  TALENT_UNRESOLVED: 'A listed talent could not be matched to a canonical talent.',
  TALENT_AMBIGUOUS: 'A listed talent matches more than one canonical talent.',
  SUBTYPE_MISMATCH: 'This profile is for a different kind of character than the one being created.',
  UNKNOWN_SUBTYPE: 'This profile has an unknown character type.',
};
function describeBlocked(blocked = []) {
  return blocked.map(b => ({ code: b.code, text: BLOCK_COPY[b.code] || 'This profile cannot be applied yet.', detail: b.detail }));
}

function formatProfileForCard(profile, state, dialogue = '') {
  return {
    id: profile.profileId,
    name: profile.catalog.name,
    archetype: profile.catalog.archetype,
    className: profile.catalog.className,
    image: profileImagePath(profile),
    description: profile.catalog.description || '',
    quote: dialogue || profile.catalog.quote || '',
    species: speciesName(profile),
    background: backgroundName(profile),
    abilities: formatAbilities(profile),
    roles: roleTags(profile),
    skillsPreview: skillNames(profile, 3),
    featsPreview: names(profile.choices.feats, 3),
    powersPreview: names(profile.choices.forcePowers, 3),
    selected: profile.profileId === state.templateId,
    // Derived display projection for the gallery search box only. It never drives legal
    // eligibility, source identity or canonical entitlement routing.
    searchText: [
      profile.catalog.archetype,
      profile.catalog.name,
      profile.catalog.className,
      profile.catalog.description,
      speciesName(profile),
      backgroundName(profile),
      ...roleTags(profile),
    ].filter(Boolean).join(' ').toLocaleLowerCase(),
  };
}

function formatProfileReview(profile, compiled, dialogue, application) {
  const business = (compiled?.open || []).map(nodeBusiness);
  const isApplied = !!application && application.profileId === profile.profileId && application.revision === profile.revision && application.digest === compiled?.digest;
  const notes = [];
  for (const o of compiled?.open || []) if (REASON_COPY[o.reason]) notes.push(REASON_COPY[o.reason]);
  for (const d of compiled?.diagnostics || []) if (d.code === 'FEAT_IS_CLASS_AUTOGRANT') notes.push(d.detail);
  const wallet = compiled?.economy?.walletCredits ?? profile.choices.wallet.credits;
  return {
    id: profile.profileId,
    name: profile.catalog.name,
    archetype: profile.catalog.archetype,
    className: profile.catalog.className,
    species: speciesName(profile),
    background: backgroundName(profile),
    image: profileImagePath(profile),
    description: profile.catalog.description || '',
    quote: profile.catalog.quote || '',
    mentorLine: dialogue || '',
    roles: roleTags(profile),
    abilities: formatAbilities(profile),
    feats: names(profile.choices.feats),
    talents: names(profile.choices.talents),
    skills: skillNames(profile),
    forcePowers: names(profile.choices.forcePowers),
    equipment: (profile.choices.equipment || []).map(e => (e.qty > 1 ? `${e.name} ×${e.qty}` : e.name)),
    credits: `${wallet.toLocaleString?.() ?? wallet} (final balance)`,
    openBusiness: business,
    openCount: business.length,
    blockingCount: business.filter(b => b.blocking).length,
    isClean: !!compiled?.ok && business.length === 0,
    reconciliationNotes: notes,
    blocked: describeBlocked(compiled?.blocked),
    canApply: !!compiled?.ok,
    isApplied,
    applyLabel: isApplied ? 'Profile Applied' : 'Apply Profile',
  };
}

class GalacticProfileBaseStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._profiles = [];
    this._preloadPromise = null;
  }

  /** Warm the lightweight catalog only (~40 KB). Never enters the step and never chooses or applies a profile. */
  preload(shell) {
    if (!this._preloadPromise) {
      this._preloadPromise = this._ensureProfileData(shell).catch(error => {
        this._preloadPromise = null;
        throw error;
      });
    }
    return this._preloadPromise;
  }

  async _ensureProfileData(contextOrShell = null) {
    const shell = getShellFromContext(contextOrShell, this._shell);
    if (shell) this._shell = shell;
    if (!this._profiles.length && this._shell) {
      this._profiles = (await loadForShell(this._shell)).profiles;
    }
    return this._shell;
  }

  async onStepEnter(shell) {
    // Reuse the in-flight splash warmup rather than refetching profiles.
    await this.preload(shell);
    shell.mentor ??= {};
    shell.mentor.askMentorEnabled = true;
    // Mentor follows an EXPLICIT choice only; entering the step selects nothing.
    const state = getProfileState(shell);
    const selected = state.templateId ? this._profiles.find(p => p.profileId === state.templateId) : null;
    const className = selected?.catalog.className ?? groupProfiles(this._profiles).find(g => g.id === state.classId)?.name;
    if (className) await syncProfileMentor(shell, className, this.descriptor?.stepId);
  }

  getUtilityBarConfig() { return { mode: 'minimal' }; }
  getUtilityBarMode() { return 'minimal'; }
  getMentorMode() { return 'contextual'; }
  async onAskMentor(shell) { await handleAskMentor(shell?.actor ?? null, this.descriptor?.stepId || 'profile-review', shell); }
  getBlockingIssues() { return this.getSelection().isComplete ? [] : ['Choose a Galactic Profile option before continuing.']; }
  getWarnings() { return []; }
  getRemainingPicks() { return []; }
  validate() { return { isValid: this.getSelection().isComplete, errors: [], warnings: [] }; }
  async renderDetailsPanel(focusedItem, shell = null) {
    await this._ensureProfileData(shell);
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/galactic-profile-details.hbs', data: this._detailsData(focusedItem) };
  }
  _detailsData() { return {}; }
  getMentorContext(shell) {
    return getStepMentorContext(shell?.actor ?? null, this.descriptor?.stepId || 'profile-review', '', shell ?? this._shell);
  }

  async _selectProfile(shell, profileId, phase = this.descriptor?.stepId || 'profile-archetype') {
    await this._ensureProfileData(shell);
    const profile = this._profiles.find(p => p.profileId === String(profileId || '').trim());
    if (!profile) return false;
    const state = getProfileState(shell);
    state.templateId = profile.profileId;
    state.classId = profile.catalog.classKey;
    await syncProfileMentor(shell, profile.catalog.className, phase);
    await shell?.requestRender?.({ preserveScroll: true, reason: 'galactic-profile-select-template', structural: true });
    return true;
  }

  async handleAction(action, event, target, shell) {
    if (action === 'profile-select-template') {
      event?.preventDefault?.(); event?.stopPropagation?.();
      return this._selectProfile(shell, target?.dataset?.profileTemplateId, this.descriptor?.stepId || 'profile-archetype');
    }
    return false;
  }
}

export class ProfileArchetypeStep extends GalacticProfileBaseStep {
  constructor(descriptor) {
    super(descriptor);
    this._gallerySearch = '';
  }

  async getStepData(context = null) {
    const shell = await this._ensureProfileData(context);
    const state = getProfileState(shell);
    const groups = groupProfiles(this._profiles);
    const requestedBrowseClass = String(state.browseClassId || 'all');
    const browseClassId = requestedBrowseClass === 'all' || groups.some(g => g.id === requestedBrowseClass)
      ? requestedBrowseClass : 'all';
    const browseGroup = groups.find(g => g.id === browseClassId) || null;
    const visibleProfiles = browseGroup ? browseGroup.profiles : this._profiles;
    const selectedProfile = this._profiles.find(p => p.profileId === state.templateId) || null;
    const dialogueData = await loadProfileDialogues();
    const toCard = p => formatProfileForCard(p, state, findProfileDialogue(dialogueData, p, 'greeting'));

    return {
      classes: groups.map((group, index) => ({
        ...formatClassGroup(group, state, index),
        browsing: group.id === browseClassId,
      })),
      browseClassId,
      allClassesBrowsing: browseClassId === 'all',
      browseLabel: browseGroup?.name || 'All Classes',
      allProfileCount: this._profiles.length,
      totalProfiles: visibleProfiles.length,
      selectedTemplateId: state.templateId ?? null,
      selectedPreview: selectedProfile ? toCard(selectedProfile) : null,
      archetypes: visibleProfiles.map(toCard),
      gallerySearch: this._gallerySearch,
      route: {
        classDone: !!state.classId,
        archetypeDone: !!state.templateId,
        reviewDone: false,
      },
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-archetype-work-surface.hbs',
      data: stepData,
    };
  }

  getSelection() {
    const id = this._shell?.progressionSession?.profileSelection?.templateId;
    return { selected: id ? [id] : [], count: id ? 1 : 0, isComplete: !!id };
  }

  getBlockingIssues() {
    return this.getSelection().isComplete ? [] : ['Choose a Galactic Profile before continuing.'];
  }

  /**
   * Gallery filter only. Browsing a class never commits or clears a profile: the existing
   * profile selection stays until a different profile is explicitly chosen.
   */
  async _setBrowseClass(shell, classId) {
    await this._ensureProfileData(shell);
    const id = String(classId || '').trim().toLowerCase();
    const allowed = id === 'all' || groupProfiles(this._profiles).some(g => g.id === id);
    if (!allowed) return false;
    const state = getProfileState(shell);
    if ((state.browseClassId || 'all') === id) return true;
    state.browseClassId = id;
    await shell?.requestRender?.({
      preserveScroll: true,
      reason: 'galactic-profile-browse-class',
      structural: true,
    });
    return true;
  }

  async onDataReady(shell) {
    const root = shell?.element?.querySelector?.('.prog-galactic-profile--archetype');
    const input = root?.querySelector?.('[data-profile-gallery-search]');
    if (!input) return;

    // Filters existing DOM cards only: no compiler/registry request, no selection change.
    const applySearch = () => {
      const query = String(input.value || '').trim().toLocaleLowerCase();
      const cards = [...root.querySelectorAll('[data-profile-template-id]')];
      let visible = 0;
      for (const card of cards) {
        const searchable = String(card.dataset.profileSearchText || '').toLocaleLowerCase();
        const show = !query || searchable.includes(query);
        card.hidden = !show;
        if (show) visible += 1;
      }
      const count = root.querySelector('[data-profile-gallery-results]');
      if (count) count.textContent = `${visible} ${visible === 1 ? 'profile' : 'profiles'} found`;
      const empty = root.querySelector('[data-profile-gallery-empty]');
      // A genuinely empty catalogue has its own message; this one is for searches only.
      if (empty) empty.hidden = visible > 0 || cards.length === 0;
    };

    input.value = this._gallerySearch || '';
    if (input.dataset.profileSearchBound !== 'true') {
      input.dataset.profileSearchBound = 'true';
      input.addEventListener('input', () => {
        this._gallerySearch = input.value;
        applySearch();
      });
    }
    applySearch();
  }

  async handleAction(action, event, target, shell) {
    if (action === 'profile-filter-class') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      return this._setBrowseClass(shell, target?.dataset?.profileClassId);
    }
    return super.handleAction(action, event, target, shell);
  }

  _detailsData() {
    const state = getProfileState(this._shell);
    const profile = this._profiles.find(p => p.profileId === state.templateId);
    return {
      mode: 'archetype',
      title: profile?.catalog.name || 'Choose a Profile',
      image: profile ? profileImagePath(profile) : null,
      description: profile?.catalog.description || 'Browse illustrated profiles, then select one.',
      quote: profile?.catalog.quote || '',
      abilities: profile ? formatAbilities(profile) : [],
      tags: profile ? [profile.catalog.className, speciesName(profile), ...roleTags(profile)].filter(Boolean) : [],
    };
  }
}

export class ProfileReviewStep extends GalacticProfileBaseStep {
  constructor(descriptor) {
    super(descriptor);
    this._compiledCache = null;   // { key, compiled } — ONE compile per (profile, revision, session state) reused by review, open steps and Apply
  }

  async _compiled(shell, profile) {
    const app = getProfileApplication(shell.progressionSession);
    const key = `${profile.profileId}@${profile.revision}|${shell.progressionSession.subtype}|${app?.digest ?? ''}`;
    if (this._compiledCache?.key === key) return this._compiledCache.compiled;
    const compiled = await GalacticProfileService.compileForShell(shell, profile.profileId);
    this._compiledCache = { key, compiled };
    return compiled;
  }

  async getStepData(context = null) {
    const shell = await this._ensureProfileData(context);
    const state = getProfileState(shell);
    const profile = state.templateId ? await GalacticProfileRegistry.getProfile(state.templateId) : null;
    if (!profile || profile.subtype !== sessionSubtype(shell)) return { template: null, characterName: state.characterName || '' };
    await syncProfileMentor(shell, profile.catalog.className, 'profile-review');
    const dialogueData = await loadProfileDialogues();
    const compiled = await this._compiled(shell, profile).catch(err => {
      swseLogger.warn('[GalacticProfile] Review compile failed', { profileId: profile.profileId, error: err?.message || String(err) });
      return { ok: false, blocked: [{ code: 'COMPILE_ERROR', detail: err?.message || String(err) }], open: [], diagnostics: [] };
    });
    const review = formatProfileReview(profile, compiled, findProfileDialogue(dialogueData, profile, 'confirmation'), getProfileApplication(shell.progressionSession));
    review.characterName = state.characterName || '';
    review.nextTargetStepId = review.openBusiness.find(b => b.blocking)?.stepId || review.openBusiness[0]?.stepId || 'summary';
    return { template: review, characterName: state.characterName || '', route: { classDone: !!state.classId, archetypeDone: !!state.templateId, reviewDone: review.isApplied } };
  }

  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-review-work-surface.hbs', data: stepData };
  }

  getSelection() {
    const state = this._shell?.progressionSession?.profileSelection;
    return { selected: state?.templateId ? [state.templateId] : [], count: state?.templateId ? 1 : 0, isComplete: !!state?.templateId };
  }

  /** Next is allowed only once THIS profile has been explicitly applied. */
  getBlockingIssues() {
    const session = this._shell?.progressionSession;
    const chosen = session?.profileSelection?.templateId;
    const app = getProfileApplication(session);
    if (!chosen) return ['Choose a Galactic Profile option before continuing.'];
    if (!app || app.profileId !== chosen) return ['Apply the profile to continue.'];
    return [];
  }
  validate() { const issues = this.getBlockingIssues(); return { isValid: issues.length === 0, errors: issues, warnings: [] }; }

  // NOTE: no onStepExit. Back / Close / Next never apply a profile; only the explicit Apply action does.

  async onDataReady(shell) {
    const nameInput = shell.element?.querySelector?.('[data-profile-character-name]');
    if (nameInput && nameInput.dataset.profileBound !== 'true') {
      nameInput.dataset.profileBound = 'true';
      const commitName = async persist => {
        const name = String(nameInput.value || '').trim();
        getProfileState(shell).characterName = name;
        if (persist) {
          shell.progressionSession.commitSelection('galactic-profile-name', 'survey', { ...(shell.progressionSession.draftSelections.survey || {}), characterName: name });
          await shell._persistSessionSnapshot?.('profile-review-name');
        }
      };
      nameInput.addEventListener('input', () => commitName(false));
      nameInput.addEventListener('change', () => commitName(true));
    }
  }

  async handleAction(action, event, target, shell) {
    if (action === 'profile-apply') {
      event?.preventDefault?.(); event?.stopPropagation?.();
      return this._applyProfile(shell);
    }
    if (action === 'profile-resolve') {
      event?.preventDefault?.(); event?.stopPropagation?.();
      return this._goToStep(shell, target?.dataset?.profileBusinessTarget);
    }
    return super.handleAction(action, event, target, shell);
  }

  /** The ONE explicit Apply: compile → atomic apply → steps recomputed once. Never touches the actor. */
  async _applyProfile(shell) {
    if (this._applying) return false;
    this._applying = true;
    try {
      const state = getProfileState(shell);
      if (!state.templateId) return false;
      const result = await GalacticProfileService.applyForShell(shell, state.templateId);
      this._compiledCache = null;
      if (!result.ok) {
        ui?.notifications?.warn?.(result.code === 'COMPILE_BLOCKED' ? 'This profile cannot be applied yet. See the reasons on the review page.' : `Profile not applied (${result.code}).`);
        await shell?.requestRender?.({ preserveScroll: true, reason: 'galactic-profile-apply-blocked', structural: true });
        return false;
      }
      const note = [];
      if (result.kept?.length) note.push(`kept your edits to: ${result.kept.join(', ')}`);
      if (result.replaced?.length) note.push(`replaced: ${result.replaced.map(r => r.key).join(', ')}`);
      if (note.length) ui?.notifications?.info?.(`Profile applied — ${note.join('; ')}.`);
      const target = (result.application?.open || []).find(o => NODE_BUSINESS_COPY[o.stepId]?.blocking !== false)?.stepId || (result.application?.open || [])[0]?.stepId || null;
      await this._goToStep(shell, target);
      return true;
    } finally {
      this._applying = false;
    }
  }

  async _goToStep(shell, stepId) {
    const preferred = stepId || 'summary';
    const index = shell.steps?.findIndex?.(d => d.stepId === preferred) ?? -1;
    const fallback = shell.steps?.findIndex?.(d => !['intro', 'profile-archetype', 'profile-review'].includes(d.stepId)) ?? 0;
    const target = index >= 0 ? index : Math.max(0, fallback);
    await shell._activateStep?.(target, { source: 'galactic-profile-business', restoreIndex: shell.currentStepIndex });
    await shell._persistSessionSnapshot?.(shell.progressionSession.currentStepId || 'galactic-profile-business');
    shell.requestRender?.({ preserveScroll: false, reason: 'galactic-profile-business-activate', structural: true });
    return true;
  }

  _detailsData() {
    const state = getProfileState(this._shell);
    const profile = this._profiles.find(p => p.profileId === state.templateId);
    return {
      mode: 'review',
      title: profile?.catalog.name || 'Profile Review',
      image: profile ? profileImagePath(profile) : null,
      description: 'Review the package. Apply Profile fills your character draft; nothing is created until you confirm at the end.',
      quote: profile?.catalog.quote || '',
      abilities: profile ? formatAbilities(profile) : [],
      tags: profile ? [profile.catalog.className, speciesName(profile), 'Open assignments come from the rules engine'].filter(Boolean) : [],
    };
  }
}
