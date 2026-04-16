import { SWSEDialogV2 } from '/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { getSurveyDefinition, getSurveyDefinitionForActor } from './registry.js';

function mergeLayer(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + Number(value || 0);
  }
}

function buildArchetypeScores(definition, answers) {
  const scores = {};
  const selected = Object.values(answers || {});
  for (const answer of selected) {
    const hint = answer?.archetypeHint;
    if (hint) scores[hint] = (scores[hint] || 0) + 3;
  }
  for (const archetype of definition?.archetypes || []) {
    for (const answer of selected) {
      const biasLayers = answer?.biasLayers || {};
      let score = 0;
      for (const [key, value] of Object.entries(archetype.mechanicalBias || {})) {
        score += (biasLayers.mechanicalBias?.[key] || 0) * Number(value || 0);
      }
      for (const [key, value] of Object.entries(archetype.roleBias || {})) {
        score += (biasLayers.roleBias?.[key] || 0) * Number(value || 0);
      }
      for (const [key, value] of Object.entries(archetype.attributeBias || {})) {
        const attrKey = ['str','dex','con','int','wis','cha'].includes(key)
          ? ({str:'strength',dex:'dexterity',con:'constitution',int:'intelligence',wis:'wisdom',cha:'charisma'})[key]
          : key;
        score += (biasLayers.attributeBias?.[attrKey] || 0) * Number(value || 0);
      }
      scores[archetype.id] = (scores[archetype.id] || 0) + score;
    }
  }
  return Object.entries(scores)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,3)
    .map(([id, score]) => ({ id, score, archetype: definition?.archetypes?.find?.((entry)=>entry.id===id) || null }));
}

export function getSurveyResponses(actor) {
  return actor?.system?.swse?.surveyResponses || null;
}

export function hasSurveyBeenCompleted(actor, classNameOrId = null) {
  const classId = getSurveyDefinition(classNameOrId)?.classId || getSurveyDefinitionForActor(actor)?.classId;
  const responses = getSurveyResponses(actor) || {};
  if (!classId) return Boolean(responses.completed);
  return Boolean(responses[classId]?.completed);
}

export function convertSurveyAnswersToBias(surveyAnswers) {
  const biasLayers = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const answer of Object.values(surveyAnswers || {})) {
    mergeLayer(biasLayers.mechanicalBias, answer?.biasLayers?.mechanicalBias || {});
    mergeLayer(biasLayers.roleBias, answer?.biasLayers?.roleBias || {});
    mergeLayer(biasLayers.attributeBias, answer?.biasLayers?.attributeBias || {});
  }
  return biasLayers;
}

export function processSurveyAnswers(surveyAnswers, definition = null) {
  const out = {};
  const scores = definition ? buildArchetypeScores(definition, surveyAnswers) : [];
  for (const answer of Object.values(surveyAnswers || {})) {
    for (const [key, value] of Object.entries(answer?.biases || {})) {
      if (typeof value === 'number') out[key] = (out[key] || 0) + value;
      else if (value) out[key] = value;
    }
  }
  if (scores[0]?.archetype?.name) {
    out.archetypeTarget = scores[0].archetype.name;
    out.archetypeId = scores[0].id;
  }
  return out;
}

export function buildSurveyStepData(definition, answers = {}) {
  return {
    surveyId: definition?.surveyId || null,
    surveyType: definition?.surveyType || 'l1',
    classDisplayName: definition?.classDisplayName || null,
    mentor: definition?.mentor || null,
    questions: (definition?.questions || []).map((question) => ({
      ...question,
      selected: answers?.[question.id]?.id || null
    })),
    topMatches: buildArchetypeScores(definition, answers)
  };
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderSurveyDialog(definition) {
  const sections = (definition?.questions || []).map((question) => {
    const options = (question.options || []).map((option) => `
      <label class="swse-mentor-survey__option">
        <input type="radio" name="${escapeHtml(question.id)}" value="${escapeHtml(option.id)}">
        <span class="swse-mentor-survey__label">${escapeHtml(option.label)}</span>
        <span class="swse-mentor-survey__hint">${escapeHtml(option.hint || '')}</span>
      </label>`).join('');
    return `
      <section class="swse-mentor-survey__question">
        <h3>${escapeHtml(question.text)}</h3>
        <div class="swse-mentor-survey__options">${options}</div>
      </section>`;
  }).join('');
  return `
    <div class="swse-mentor-survey">
      <div class="swse-mentor-survey__intro">
        <strong>${escapeHtml(definition?.mentor?.name || 'Mentor')}</strong>
        <p>${escapeHtml(definition?.mentor?.classGuidance || definition?.mentor?.summaryGuidance || 'Answer honestly so I can guide you well.')}</p>
      </div>
      ${sections}
    </div>`;
}

function collectDialogAnswers(html, definition) {
  const root = html?.get?.(0) || html?.[0] || null;
  if (!root) return null;
  const answers = {};
  for (const question of definition?.questions || []) {
    const chosen = root.querySelector(`input[name="${CSS.escape(question.id)}"]:checked`);
    if (!chosen) continue;
    const option = question.options.find((entry) => entry.id === chosen.value);
    if (option) answers[question.id] = option;
  }
  return answers;
}

export class MentorSurvey {
  static hasSurveyBeenCompleted(actor, classNameOrId = null) {
    return hasSurveyBeenCompleted(actor, classNameOrId);
  }

  static async showSurvey(actor, classNameOrId = null) {
    const definition = getSurveyDefinition(classNameOrId) || getSurveyDefinitionForActor(actor);
    if (!definition) return null;
    const content = renderSurveyDialog(definition);
    const result = await SWSEDialogV2.wait({
      title: `${definition.mentor?.name || 'Mentor'}: ${definition.classDisplayName} Survey`,
      content,
      buttons: {
        submit: { label: 'Commit Intent', callback: (html) => collectDialogAnswers(html, definition) },
        skip: { label: 'Skip For Now', callback: () => null }
      },
      default: 'submit'
    }, { width: 720 });
    return result;
  }
}

export { getSurveyDefinition, getSurveyDefinitionForActor, buildArchetypeScores };
