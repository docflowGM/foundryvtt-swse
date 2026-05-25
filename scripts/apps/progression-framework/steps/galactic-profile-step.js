import { ProgressionStepPlugin } from './step-plugin-base.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { TemplateAdapter } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-adapter.js';
import { TemplateValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-validator.js';
import { TemplateTraversalPolicy } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-traversal-policy.js';
import { ActiveStepComputer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/active-step-computer.js';
import { getStepMentorContext, handleAskMentor, setSessionMentorContext } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/steps/mentor-step-integration.js';
import { getMentorForClass, getMentorKey, resolveMentorData } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };
const PROFILE_STEP_IDS = new Set(['profile-class', 'profile-archetype', 'profile-review']);
const REVIEW_EXCLUDED_STEPS = new Set(['intro', 'profile-class', 'profile-archetype', 'profile-review', 'confirm']);

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
function classNameForTemplate(template) {
  return template?.classId?.name || template?.className || 'Unknown';
}
function classKeyForTemplate(template) {
  return slug(classNameForTemplate(template).replace(/\s*\(Nonheroic\)\s*/i, '')) || template?.classId?.id || 'unknown';
}
function classImagePath(className) {
  const clean = String(className || '').replace(/\s*\(Nonheroic\)\s*/i, '').trim();
  return `systems/foundryvtt-swse/assets/class/${clean}.webp`;
}
function templateImagePath(template) {
  if (template?.imagePath) return template.imagePath;
  return `systems/foundryvtt-swse/assets/templates/${template?.id || slug(template?.name)}.webp`;
}
function formatAbilities(template) {
  const scores = template?.abilityScores || template?.abilities || {};
  return ABILITIES.map(key => {
    const score = Number(scores[key] ?? 10);
    const mod = abilityModifier(score);
    return { key, label: ABILITY_LABELS[key], score, mod: fmtMod(mod), modClass: modClass(mod) };
  });
}
function itemName(item) {
  if (typeof item === 'string') return item;
  return item?.displayName || item?.name || item?.label || item?.id || '';
}
function itemNames(items, limit = 0) {
  const names = (Array.isArray(items) ? items : []).map(itemName).filter(Boolean);
  return limit > 0 ? names.slice(0, limit) : names;
}
function countLabel(count, singular, plural = `${singular}s`) {
  const n = Number(count || 0);
  return `${n} ${n === 1 ? singular : plural}`;
}
function roleTags(template) {
  const tags = template?.roleTags || template?.role || [];
  return (Array.isArray(tags) ? tags : [tags]).map(t => title(t)).filter(Boolean);
}
function backgroundName(template) {
  return template?.backgroundId?.name || template?.backgroundName || '';
}
function speciesName(template) {
  return template?.speciesId?.name || template?.species || '';
}
function templateArchetypeName(template) {
  return template?.archetype || template?.name || title(template?.id);
}
function templateDisplayName(template) {
  return template?.name || templateArchetypeName(template);
}
function getShellFromContext(context, fallback = null) {
  if (context?.shell) return context.shell;
  if (context?._shell) return context._shell;
  if (context?.progressionSession || context?.actor) return context;
  return fallback || null;
}
function getProfileState(shell) {
  const session = shell?.progressionSession;
  if (!session) return {};
  session.profileSelection ??= {};
  return session.profileSelection;
}
function groupTemplates(templates) {
  const map = new Map();
  for (const template of templates) {
    const key = classKeyForTemplate(template);
    if (!map.has(key)) {
      const name = classNameForTemplate(template);
      map.set(key, {
        id: key,
        name,
        image: classImagePath(name),
        count: 0,
        templates: [],
        description: CLASS_BRIEFS[key] || `A ${name} profile channel assembled from canonical template packages.`,
      });
    }
    const group = map.get(key);
    group.count += 1;
    group.templates.push(template);
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
    archetypeNames: group.templates.map(templateArchetypeName).filter(Boolean),
    selected,
    dimmed: !selected,
  };
}
async function loadTemplatesForShell(shell) {
  const all = await TemplateRegistry.getAllTemplates();
  const subtype = shell?.progressionSession?.subtype || (shell?.actor?.type === 'droid' ? 'droid' : 'actor');
  return all.filter(t => {
    if (subtype === 'droid') return t.subtype === 'droid';
    if (subtype === 'nonheroic') return t.isNonheroic === true || t.subtype === 'nonheroic';
    return t.isNonheroic !== true && t.subtype !== 'droid' && t.subtype !== 'nonheroic';
  });
}
async function loadTemplateDialogues() {
  if (TEMPLATE_DIALOGUE_CACHE) return TEMPLATE_DIALOGUE_CACHE;
  try {
    const response = await fetch('systems/foundryvtt-swse/data/mentor-template-dialogues.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    TEMPLATE_DIALOGUE_CACHE = await response.json();
  } catch (err) {
    swseLogger.warn('[GalacticProfile] Could not load mentor-template-dialogues.json; falling back to template quotes and step guidance.', { error: err?.message || String(err) });
    TEMPLATE_DIALOGUE_CACHE = { mentors: {} };
  }
  return TEMPLATE_DIALOGUE_CACHE;
}
function findTemplateDialogue(dialogueData, template, phase = 'greeting') {
  if (!dialogueData || !template) return '';
  const mentorKeys = [
    template.mentor,
    classNameForTemplate(template),
    getMentorKey(resolveMentorData(template.mentor || classNameForTemplate(template))),
  ].map(keySlug).filter(Boolean);
  const templateKeys = [
    template.id,
    templateArchetypeName(template),
    templateDisplayName(template),
    `${classKeyForTemplate(template)}_${keySlug(templateArchetypeName(template))}`,
  ].map(keySlug).filter(Boolean);

  for (const [mentorId, mentor] of Object.entries(dialogueData.mentors || {})) {
    if (!mentorKeys.includes(keySlug(mentorId)) && !mentorKeys.includes(keySlug(mentor?.name))) continue;
    const dialogues = mentor?.dialogues || {};
    for (const key of templateKeys) {
      const entry = dialogues[key] || dialogues[key.replace(/^soldier_just_a_dude$/, 'soldier_rifleman')];
      const text = String(entry?.[phase] || '').trim();
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
    mentor,
    mentorId: mentorKey,
    mentorKey,
    className,
    stepId: stepId || shell?.steps?.[shell?.currentStepIndex]?.stepId || null,
    source: 'class-selection',
    confidence: 0.98,
    reason: 'galactic profile class selection',
    fallback: false,
  }, { force: true });
}
function nodeBusiness(nodeId, index = 0) {
  const copy = NODE_BUSINESS_COPY[nodeId] || {};
  return {
    key: nodeId,
    stepId: nodeId,
    icon: copy.icon || 'fa-location-dot',
    label: copy.label || title(nodeId),
    detail: copy.detail || `Resolve ${title(nodeId)} in the normal progression step.`,
    blocking: copy.blocking !== false,
    stepHint: title(nodeId),
    ordinal: String(index + 1).padStart(2, '0'),
  };
}
function summarizeReconciliation(session) {
  const reconciliation = session?.templateReconciliation || {};
  const rows = [];
  const removedClass = Number(reconciliation?.classAutoGrantFeatRemovals?.length || 0);
  const replacedSpecies = Number(reconciliation?.speciesGrantedFeatReplacements?.length || 0);
  const unresolvedFeats = Number(reconciliation?.unresolvedFeatSlots || 0);
  if (removedClass > 0) rows.push(`${removedClass} class auto-grant ${removedClass === 1 ? 'feat was' : 'feats were'} removed from player-choice accounting.`);
  if (replacedSpecies > 0) rows.push(`${replacedSpecies} species-granted ${replacedSpecies === 1 ? 'feat frees' : 'feats free'} replacement choice work.`);
  if (unresolvedFeats > 0) rows.push(`${unresolvedFeats} feat ${unresolvedFeats === 1 ? 'slot remains' : 'slots remain'} open after reconciliation.`);
  return rows;
}
async function previewTemplateSession(shell, template) {
  if (!shell?.actor || !template) return null;
  const preview = await TemplateAdapter.initializeSessionFromTemplate(template, shell.actor, { mode: 'chargen' });
  preview.profileSelection = { ...(shell.progressionSession?.profileSelection || {}), templateId: template.id, classId: classKeyForTemplate(template) };
  preview.profileStepsComplete = true;
  return preview;
}
async function buildRemainingBusiness(shell, template) {
  try {
    const preview = await previewTemplateSession(shell, template);
    if (!preview) return [];
    const computer = new ActiveStepComputer();
    let activeNodeIds = await computer.computeActiveSteps(shell.actor, 'chargen', preview, { subtype: preview.subtype || 'actor' });
    activeNodeIds = TemplateTraversalPolicy.filterActiveStepsForTemplate(activeNodeIds, preview, { skipLocked: true });
    const filtered = activeNodeIds.filter(id => !REVIEW_EXCLUDED_STEPS.has(id));
    return filtered.map((nodeId, index) => nodeBusiness(nodeId, index));
  } catch (err) {
    swseLogger.warn('[GalacticProfile] Failed to compute remaining business preview', { templateId: template?.id, error: err?.message || String(err) });
    return [nodeBusiness('summary', 0)];
  }
}
function firstBlockingBusiness(business = []) {
  return business.find(item => item.blocking)?.stepId || business[0]?.stepId || null;
}
function formatTemplateForCard(template, state, dialogue = '') {
  const className = classNameForTemplate(template);
  const selected = template.id === state.templateId;
  const skills = itemNames(template.trainedSkills, 3);
  const feats = itemNames(template.feats, 3);
  const powers = itemNames(template.forcePowers, 3);
  return {
    id: template.id,
    name: templateDisplayName(template),
    archetype: templateArchetypeName(template),
    className,
    image: templateImagePath(template),
    description: template.description || '',
    quote: dialogue || template.quote || '',
    species: speciesName(template),
    background: backgroundName(template),
    abilities: formatAbilities(template),
    roles: roleTags(template),
    skillsPreview: skills,
    featsPreview: feats,
    powersPreview: powers,
    selected,
  };
}
function formatTemplateReview(template, business = [], dialogue = '', previewSession = null) {
  const abilities = formatAbilities(template);
  return {
    id: template.id,
    name: templateDisplayName(template),
    archetype: templateArchetypeName(template),
    className: classNameForTemplate(template),
    species: speciesName(template),
    background: backgroundName(template),
    image: templateImagePath(template),
    description: template.description || '',
    quote: template.quote || '',
    mentorLine: dialogue || template.notes || '',
    notes: template.notes || '',
    roles: roleTags(template),
    abilities,
    feats: itemNames(template.feats),
    talents: itemNames(template.talents),
    skills: itemNames(template.trainedSkills),
    forcePowers: itemNames(template.forcePowers),
    equipment: itemNames(template.equipment),
    credits: template.credits ?? '',
    openBusiness: business,
    openCount: business.length,
    blockingCount: business.filter(item => item.blocking).length,
    isClean: business.length === 0,
    reconciliationNotes: summarizeReconciliation(previewSession),
  };
}

class GalacticProfileBaseStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._templates = [];
  }

  async _ensureProfileData(contextOrShell = null) {
    const shell = getShellFromContext(contextOrShell, this._shell);
    if (shell) this._shell = shell;
    if (!this._templates.length && this._shell) {
      this._templates = await loadTemplatesForShell(this._shell);
    }
    return this._shell;
  }

  async onStepEnter(shell) {
    await this._ensureProfileData(shell);
    shell.mentor ??= {};
    shell.mentor.askMentorEnabled = true;

    const state = getProfileState(shell);
    const groups = groupTemplates(this._templates);
    if (!state.classId && groups[0]) state.classId = groups[0].id;
    if (!state.templateId && state.classId) {
      const first = groups.find(g => g.id === state.classId)?.templates?.[0];
      if (first) state.templateId = first.id;
    }
    const template = state.templateId ? this._templates.find(t => t.id === state.templateId) : null;
    const className = template ? classNameForTemplate(template) : groups.find(g => g.id === state.classId)?.name;
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
}

export class ProfileClassStep extends GalacticProfileBaseStep {
  async getStepData(context = null) {
    const shell = await this._ensureProfileData(context);
    const state = getProfileState(shell);
    const groups = groupTemplates(this._templates);
    if (!state.classId && groups[0]) state.classId = groups[0].id;
    const selectedGroup = groups.find(g => g.id === state.classId) || groups[0] || null;
    const classes = groups.map((group, index) => formatClassGroup(group, state, index));
    return {
      classes,
      selectedClassId: state.classId,
      selectedClass: selectedGroup ? formatClassGroup(selectedGroup, state, groups.indexOf(selectedGroup)) : null,
      route: { classDone: !!state.classId, archetypeDone: !!state.templateId, reviewDone: false },
    };
  }

  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-class-work-surface.hbs', data: stepData };
  }

  getSelection() {
    const classId = this._shell?.progressionSession?.profileSelection?.classId;
    return { selected: classId ? [classId] : [], count: classId ? 1 : 0, isComplete: !!classId };
  }

  async onDataReady(shell) {
    shell.element?.querySelectorAll?.('[data-profile-class-id]')?.forEach(btn => {
      btn.addEventListener('click', async ev => {
        ev.preventDefault();
        const id = btn.dataset.profileClassId;
        const state = getProfileState(shell);
        state.classId = id;
        state.templateId = null;
        const group = groupTemplates(this._templates).find(g => g.id === id);
        if (group?.templates?.[0]) state.templateId = group.templates[0].id;
        await syncProfileMentor(shell, group?.name, 'profile-class');
        await shell.render();
      });
    });
  }

  _detailsData() {
    const state = getProfileState(this._shell);
    const groups = groupTemplates(this._templates);
    const group = groups.find(g => g.id === state.classId) || groups[0];
    return {
      mode: 'class',
      title: group?.name || 'Profile Class',
      image: group?.image,
      description: group?.description || 'Choose the training channel for this Galactic Profile.',
      tags: [group?.profileCountLabel || countLabel(group?.count || 0, 'profile'), ...(group?.templates || []).map(templateArchetypeName).slice(0, 5)].filter(Boolean),
    };
  }
}

export class ProfileArchetypeStep extends GalacticProfileBaseStep {
  async getStepData(context = null) {
    const shell = await this._ensureProfileData(context);
    const state = getProfileState(shell);
    const groups = groupTemplates(this._templates);
    if (!state.classId && groups[0]) state.classId = groups[0].id;
    const selectedGroup = groups.find(g => g.id === state.classId) || groups[0] || null;
    const templates = this._templates.filter(t => classKeyForTemplate(t) === state.classId);
    if (!state.templateId && templates[0]) state.templateId = templates[0].id;
    const dialogueData = await loadTemplateDialogues();

    return {
      classes: groups.map((group, index) => formatClassGroup(group, state, index)),
      selectedClassId: state.classId,
      selectedClass: selectedGroup ? formatClassGroup(selectedGroup, state, groups.indexOf(selectedGroup)) : null,
      selectedTemplateId: state.templateId,
      archetypes: templates.map(t => formatTemplateForCard(t, state, findTemplateDialogue(dialogueData, t, 'greeting'))),
      route: { classDone: !!state.classId, archetypeDone: !!state.templateId, reviewDone: false },
    };
  }

  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-archetype-work-surface.hbs', data: stepData };
  }

  getSelection() {
    const templateId = this._shell?.progressionSession?.profileSelection?.templateId;
    return { selected: templateId ? [templateId] : [], count: templateId ? 1 : 0, isComplete: !!templateId };
  }

  async onDataReady(shell) {
    shell.element?.querySelectorAll?.('[data-profile-class-id]')?.forEach(btn => {
      btn.addEventListener('click', async ev => {
        ev.preventDefault();
        const state = getProfileState(shell);
        state.classId = btn.dataset.profileClassId;
        const first = this._templates.find(t => classKeyForTemplate(t) === state.classId);
        state.templateId = first?.id || null;
        await syncProfileMentor(shell, classNameForTemplate(first), 'profile-archetype');
        await shell.render();
      });
    });

    shell.element?.querySelectorAll?.('[data-profile-template-id]')?.forEach(card => {
      card.addEventListener('click', async ev => {
        ev.preventDefault();
        const state = getProfileState(shell);
        state.templateId = card.dataset.profileTemplateId;
        const tpl = this._templates.find(t => t.id === state.templateId);
        if (tpl) {
          state.classId = classKeyForTemplate(tpl);
          await syncProfileMentor(shell, classNameForTemplate(tpl), 'profile-archetype');
        }
        await shell.render();
      });
    });
  }

  _detailsData() {
    const state = getProfileState(this._shell);
    const template = this._templates.find(t => t.id === state.templateId);
    return {
      mode: 'archetype',
      title: template?.name || 'Archetype',
      image: template ? templateImagePath(template) : null,
      description: template?.description || 'Select an archetype package.',
      quote: template?.quote || '',
      abilities: template ? formatAbilities(template) : [],
      tags: template ? [classNameForTemplate(template), speciesName(template), ...roleTags(template)] : [],
    };
  }
}

export class ProfileReviewStep extends GalacticProfileBaseStep {
  async getStepData(context = null) {
    const shell = await this._ensureProfileData(context);
    const state = getProfileState(shell);
    const template = this._templates.find(t => t.id === state.templateId) || null;
    if (!template) return { template: null, characterName: state.characterName || '' };

    await syncProfileMentor(shell, classNameForTemplate(template), 'profile-review');
    const dialogueData = await loadTemplateDialogues();
    const preview = await previewTemplateSession(shell, template).catch(err => {
      swseLogger.warn('[GalacticProfile] Review preview session failed', { templateId: template.id, error: err?.message || String(err) });
      return null;
    });
    const business = await buildRemainingBusiness(shell, template);
    const confirmation = findTemplateDialogue(dialogueData, template, 'confirmation');
    const review = formatTemplateReview(template, business, confirmation, preview);
    review.characterName = state.characterName || '';
    review.nextTargetStepId = firstBlockingBusiness(business) || 'summary';

    return {
      template: review,
      characterName: state.characterName || '',
      route: { classDone: !!state.classId, archetypeDone: !!state.templateId, reviewDone: true },
    };
  }

  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-review-work-surface.hbs', data: stepData };
  }

  getSelection() {
    const templateId = this._shell?.progressionSession?.profileSelection?.templateId;
    return { selected: templateId ? [templateId] : [], count: templateId ? 1 : 0, isComplete: !!templateId };
  }

  async onStepExit(shell) {
    await this._applyTemplateToSession(shell);
  }

  async onDataReady(shell) {
    const nameInput = shell.element?.querySelector?.('[data-profile-character-name]');
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        const state = getProfileState(shell);
        state.characterName = String(nameInput.value || '').trim();
      });
      nameInput.addEventListener('change', async () => {
        const state = getProfileState(shell);
        state.characterName = String(nameInput.value || '').trim();
        await shell._persistSessionSnapshot?.('profile-review-name');
      });
    }

    shell.element?.querySelectorAll?.('[data-profile-business-target]')?.forEach(row => {
      row.addEventListener('click', async ev => {
        ev.preventDefault();
        const targetStepId = row.dataset.profileBusinessTarget;
        await this._applyTemplateToSession(shell, { targetStepId, activateTarget: true });
      });
    });
  }

  async _applyTemplateToSession(shell, options = {}) {
    const { targetStepId = null, activateTarget = false } = options;
    const state = getProfileState(shell);
    const templateId = state.templateId;
    if (!templateId) return false;

    const beforeTemplateId = shell?.progressionSession?.templateId;
    let nextSession = null;

    if (shell.progressionSession?.templateId === templateId && shell.progressionSession?.profileStepsComplete === true) {
      nextSession = shell.progressionSession;
      if (state.characterName) {
        nextSession.draftSelections ??= {};
        nextSession.draftSelections.survey = {
          ...(nextSession.draftSelections.survey || {}),
          characterName: state.characterName,
        };
      }
    } else {
      const template = await TemplateRegistry.getTemplate(templateId);
      if (!template) return false;
      nextSession = await TemplateAdapter.initializeSessionFromTemplate(template, shell.actor, { mode: 'chargen' });
      const validation = await TemplateValidator.validateTemplateSelections(nextSession, shell.actor);
      if (!validation.valid) {
        ui?.notifications?.warn?.(`Profile "${template.name}" has validation issues. Any remaining choices will stay in progression.`);
      }
      nextSession.profileSelection = { ...(state || {}), templateId, classId: classKeyForTemplate(template) };
      nextSession.profileStepsComplete = true;
      if (state.characterName) {
        nextSession.draftSelections.survey = {
          ...(nextSession.draftSelections.survey || {}),
          characterName: state.characterName,
        };
      }
      shell.progressionSession = nextSession;
      shell._registerPersistenceHook?.();
      shell._syncLegacyCommittedSelectionsFromSession?.();
      swseLogger.log('[GalacticProfile] Applied profile to progression session', { templateId });
    }

    if (shell?.progressionSession?.templateId && shell.progressionSession.templateId !== beforeTemplateId) {
      shell._targetStepId = activateTarget ? (targetStepId || null) : null;
      if (!activateTarget) shell.currentStepIndex = 0;
      await shell._initializeSteps?.();
      if (!activateTarget) {
        shell.currentStepIndex = 0;
        shell.progressionSession.currentStepId = shell.steps?.[0]?.stepId || 'intro';
      }
    }

    if (activateTarget) {
      const preferred = targetStepId || firstBlockingBusiness(await this._currentRemainingBusiness(shell));
      const targetIndex = shell.steps?.findIndex?.(d => d.stepId === preferred) ?? -1;
      const fallbackIndex = shell.steps?.findIndex?.(d => !PROFILE_STEP_IDS.has(d.stepId) && d.stepId !== 'intro') ?? 0;
      const index = targetIndex >= 0 ? targetIndex : Math.max(0, fallbackIndex);
      if (Number.isInteger(index) && index >= 0) {
        await shell._activateStep?.(index, { source: 'galactic-profile-business', restoreIndex: shell.currentStepIndex });
      }
      await shell._persistSessionSnapshot?.(shell.progressionSession.currentStepId || 'galactic-profile-business');
      shell.render?.();
    } else {
      await shell._persistSessionSnapshot?.('galactic-profile');
    }

    return true;
  }

  async _currentRemainingBusiness(shell) {
    const templateId = shell?.progressionSession?.profileSelection?.templateId || shell?.progressionSession?.templateId;
    const template = this._templates.find(t => t.id === templateId) || await TemplateRegistry.getTemplate(templateId);
    if (!template) return [];
    return buildRemainingBusiness(shell, template);
  }

  _detailsData() {
    const state = getProfileState(this._shell);
    const template = this._templates.find(t => t.id === state.templateId);
    return {
      mode: 'review',
      title: template?.name || 'Profile Review',
      image: template ? templateImagePath(template) : null,
      description: 'Review the package. Applying it seeds the normal progression session and routes only unresolved choices back onto the track.',
      quote: template?.quote || '',
      abilities: template ? formatAbilities(template) : [],
      tags: template ? [classNameForTemplate(template), speciesName(template), 'Open assignments calculated from progression rules'] : [],
    };
  }
}
