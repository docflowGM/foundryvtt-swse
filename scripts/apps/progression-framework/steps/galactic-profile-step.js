import { ProgressionStepPlugin } from './step-plugin-base.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { TemplateAdapter } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-adapter.js';
import { TemplateValidator } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-validator.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA' };

function slug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
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
function groupTemplates(templates) {
  const map = new Map();
  for (const template of templates) {
    const key = classKeyForTemplate(template);
    if (!map.has(key)) {
      const name = classNameForTemplate(template);
      map.set(key, { id: key, name, image: classImagePath(name), count: 0, templates: [] });
    }
    const group = map.get(key);
    group.count += 1;
    group.templates.push(template);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function getProfileState(shell) {
  shell.progressionSession.profileSelection ??= {};
  return shell.progressionSession.profileSelection;
}
async function loadTemplatesForShell(shell) {
  const all = await TemplateRegistry.getAllTemplates();
  const subtype = shell?.progressionSession?.subtype || (shell?.actor?.type === 'droid' ? 'droid' : 'actor');
  return all.filter(t => {
    if (subtype === 'droid') return t.subtype === 'droid';
    if (subtype === 'nonheroic') return t.isNonheroic === true || t.subtype === 'nonheroic';
    return t.isNonheroic !== true && t.subtype !== 'droid';
  });
}

class GalacticProfileBaseStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._templates = [];
  }
  async onStepEnter(shell) {
    this._shell = shell;
    this._templates = await loadTemplatesForShell(shell);
    shell.mentor.askMentorEnabled = true;
  }
  getUtilityBarConfig() { return { mode: 'minimal' }; }
  getUtilityBarMode() { return 'minimal'; }
  getMentorMode() { return 'contextual'; }
  async onAskMentor() {}
  getBlockingIssues() { return this.getSelection().isComplete ? [] : ['Choose a Galactic Profile option before continuing.']; }
  getWarnings() { return []; }
  getRemainingPicks() { return []; }
  validate() { return { isValid: this.getSelection().isComplete, errors: [], warnings: [] }; }
  renderDetailsPanel(focusedItem) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/galactic-profile-details.hbs', data: this._detailsData(focusedItem) };
  }
  _detailsData() { return {}; }
}

export class ProfileClassStep extends GalacticProfileBaseStep {
  async getStepData() {
    const state = getProfileState(this._shell);
    const classes = groupTemplates(this._templates).map(group => ({ ...group, selected: group.id === state.classId }));
    if (!state.classId && classes[0]) state.classId = classes[0].id;
    return { classes, selectedClassId: state.classId };
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
        await shell.render();
      });
    });
  }
  _detailsData() {
    const state = getProfileState(this._shell);
    const group = groupTemplates(this._templates).find(g => g.id === state.classId) || groupTemplates(this._templates)[0];
    return { mode: 'class', title: group?.name || 'Profile Class', image: group?.image, description: 'Choose the training channel for this Galactic Profile. Archetypes in the next step inherit this class foundation.', tags: [`${group?.count || 0} archetypes`] };
  }
  getMentorContext() { return 'Choose the class channel that best matches the character fantasy. The next step narrows that class into a specific archetype.'; }
}

export class ProfileArchetypeStep extends GalacticProfileBaseStep {
  async getStepData() {
    const state = getProfileState(this._shell);
    const classes = groupTemplates(this._templates).map(group => ({ ...group, selected: group.id === state.classId }));
    if (!state.classId && classes[0]) state.classId = classes[0].id;
    const templates = this._templates.filter(t => classKeyForTemplate(t) === state.classId);
    if (!state.templateId && templates[0]) state.templateId = templates[0].id;
    return {
      classes,
      selectedClassId: state.classId,
      selectedTemplateId: state.templateId,
      archetypes: templates.map(t => ({
        id: t.id,
        name: t.name || t.archetype || title(t.id),
        archetype: t.archetype || t.name || title(t.id),
        className: classNameForTemplate(t),
        image: templateImagePath(t),
        description: t.description || '',
        quote: t.quote || '',
        abilities: formatAbilities(t),
        selected: t.id === state.templateId,
      })),
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
        await shell.render();
      });
    });
    shell.element?.querySelectorAll?.('[data-profile-template-id]')?.forEach(card => {
      card.addEventListener('click', async ev => {
        ev.preventDefault();
        const state = getProfileState(shell);
        state.templateId = card.dataset.profileTemplateId;
        const tpl = this._templates.find(t => t.id === state.templateId);
        if (tpl) state.classId = classKeyForTemplate(tpl);
        await shell.render();
      });
    });
  }
  _detailsData() {
    const state = getProfileState(this._shell);
    const template = this._templates.find(t => t.id === state.templateId);
    return { mode: 'archetype', title: template?.name || 'Archetype', image: template ? templateImagePath(template) : null, description: template?.description || 'Select an archetype package.', quote: template?.quote || '', abilities: template ? formatAbilities(template) : [], tags: [classNameForTemplate(template), template?.speciesId?.name].filter(Boolean) };
  }
  getMentorContext() { return 'Choose the archetype package. The image is the profile; hover it to reveal the embedded summary, quote, and attribute spread.'; }
}

export class ProfileReviewStep extends GalacticProfileBaseStep {
  async getStepData() {
    const state = getProfileState(this._shell);
    const template = this._templates.find(t => t.id === state.templateId) || null;
    return { template: template ? this._formatTemplate(template) : null };
  }
  renderWorkSurface(stepData) {
    return { template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/galactic-profile-review-work-surface.hbs', data: stepData };
  }
  getSelection() {
    const templateId = this._shell?.progressionSession?.profileSelection?.templateId;
    return { selected: templateId ? [templateId] : [], count: templateId ? 1 : 0, isComplete: !!templateId };
  }
  async onStepExit(shell) {
    const beforeTemplateId = shell?.progressionSession?.templateId;
    await this._applyTemplateToSession(shell);
    if (shell?.progressionSession?.templateId && shell.progressionSession.templateId !== beforeTemplateId) {
      await shell._initializeSteps?.();
      shell.currentStepIndex = 0;
      shell.progressionSession.currentStepId = shell.steps?.[0]?.stepId || 'intro';
    }
  }
  async onDataReady(_shell) {}
  async _applyTemplateToSession(shell) {
    const templateId = shell?.progressionSession?.profileSelection?.templateId;
    if (!templateId || shell.progressionSession?.templateId === templateId) return;
    const template = await TemplateRegistry.getTemplate(templateId);
    if (!template) return;
    const nextSession = await TemplateAdapter.initializeSessionFromTemplate(template, shell.actor, { mode: 'chargen' });
    const validation = await TemplateValidator.validateTemplateSelections(nextSession, shell.actor);
    if (!validation.valid) {
      ui?.notifications?.warn?.(`Profile "${template.name}" has validation issues. Any remaining choices will stay in progression.`);
    }
    nextSession.profileSelection = { ...(shell.progressionSession?.profileSelection || {}), templateId, classId: classKeyForTemplate(template) };
    nextSession.profileStepsComplete = true;
    shell.progressionSession = nextSession;
    shell._registerPersistenceHook?.();
    shell._syncLegacyCommittedSelectionsFromSession?.();
    await shell._persistSessionSnapshot?.('galactic-profile');
    swseLogger.log('[GalacticProfile] Applied profile to progression session', { templateId });
  }
  _formatTemplate(template) {
    return { id: template.id, name: template.name, archetype: template.archetype, className: classNameForTemplate(template), species: template.speciesId?.name, image: templateImagePath(template), description: template.description, quote: template.quote, abilities: formatAbilities(template), feats: (template.feats || []).map(f => f.name || f.id || f), talents: (template.talents || []).map(t => t.name || t.id || t), skills: (template.trainedSkills || []).map(s => s.name || s.id || s) };
  }
  _detailsData() {
    const state = getProfileState(this._shell);
    const template = this._templates.find(t => t.id === state.templateId);
    return { mode: 'review', title: template?.name || 'Profile Review', image: template ? templateImagePath(template) : null, description: 'Review the package. Confirming seeds the normal progression session and leaves only unresolved choices in the remaining track.', quote: template?.quote || '', abilities: template ? formatAbilities(template) : [], tags: [classNameForTemplate(template), template?.speciesId?.name].filter(Boolean) };
  }
  getMentorContext() { return 'Review the selected Galactic Profile. After this, the player continues through normal progression only where remaining choices are still needed.'; }
}
