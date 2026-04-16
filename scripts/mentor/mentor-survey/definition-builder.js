import { MENTORS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

const CORE_CLASS_IDS = new Set(["jedi", "scout", "scoundrel", "noble", "soldier"]);

function deepClone(value) {
  return value ? JSON.parse(JSON.stringify(value)) : value;
}

function normalizeAttributeKey(key) {
  const map = { str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' };
  return map[key] || key;
}

function titleCaseKey(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\w/g, (m) => m.toUpperCase());
}

function getMentorVoiceProfile(mentor, classDisplayName) {
  const name = String(mentor?.name || '').toLowerCase();
  const title = String(mentor?.title || '').toLowerCase();
  if (name.includes('salty')) return 'pirate';
  if (name.includes('miraj')) return 'jedi';
  if (name.includes('lead')) return 'soldier';
  if (title.includes('commander') || title.includes('officer') || classDisplayName === 'Officer') return 'commander';
  if (title.includes('lord') || title.includes('kingpin') || title.includes('crime')) return 'schemer';
  if (title.includes('master') || title.includes('adept') || title.includes('disciple')) return 'sage';
  return 'mentor';
}

function line(profile, mentorName, variants) {
  const fallback = variants.mentor;
  return (variants[profile] || fallback || '').replaceAll('{mentor}', mentorName);
}

function topKeys(objects, limit = 4, banned = new Set()) {
  const scores = new Map();
  for (const obj of objects || []) {
    for (const [key, value] of Object.entries(obj || {})) {
      if (banned.has(key)) continue;
      scores.set(key, (scores.get(key) || 0) + Number(value || 0));
    }
  }
  return Array.from(scores.entries()).sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([key]) => key);
}

function mergeBiasLayers(archetypes, scalar = 1) {
  const out = { mechanicalBias: {}, roleBias: {}, attributeBias: {} };
  for (const archetype of archetypes || []) {
    for (const layer of ['mechanicalBias','roleBias','attributeBias']) {
      for (const [key, value] of Object.entries(archetype?.[layer] || {})) {
        const normalizedKey = layer === 'attributeBias' ? normalizeAttributeKey(key) : key;
        out[layer][normalizedKey] = (out[layer][normalizedKey] || 0) + (Number(value || 0) * scalar);
      }
    }
  }
  return out;
}

function findBestArchetypesByKey(archetypes, layer, key, limit = 3) {
  return [...(archetypes || [])]
    .filter((entry) => Number(entry?.[layer]?.[key] || 0) > 0)
    .sort((a, b) => Number(b?.[layer]?.[key] || 0) - Number(a?.[layer]?.[key] || 0))
    .slice(0, limit);
}

function uniqueById(entries) {
  const seen = new Set();
  return (entries || []).filter((entry) => {
    const id = entry?.id || entry?.name;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function buildQuestionText(kind, profile, mentorName, classDisplayName, primaryTerm) {
  const prompts = {
    path: {
      mentor: '"When this path is tested, what do you want {className} to look like in your hands?"',
      jedi: '"When the Force answers you, what sort of {className} do you mean to become?"',
      soldier: '"When the shooting starts, what kind of {className} are you determined to be?"',
      pirate: '"So then, matey — what sort of {className} are ye aiming to become when the blasters start barking?"',
      commander: '"Before we go further, tell me what kind of {className} you intend to be when pressure mounts."',
      sage: '"Name the shape of mastery you seek on the {className} path."',
      schemer: '"Tell me which version of this path best suits the power you plan to claim."'
    },
    role: {
      mentor: '"When your allies look your way, what should they rely on you to do first?"',
      jedi: '"When others turn to you in the storm, what do you believe they should feel from you first?"',
      soldier: '"When your squad needs you, what job do you own without hesitation?"',
      pirate: '"When the crew shouts your name, what trouble are ye there to solve first?"',
      commander: '"When the team leans on you, what responsibility do you claim without wavering?"',
      sage: '"When your companions depend on you, what discipline must define your response?"',
      schemer: '"When the room shifts, what advantage should everyone know you can seize?"'
    },
    mechanics: {
      mentor: '"Which discipline of this path do you want honed to a razor?"',
      jedi: '"Which discipline calls for the most training from you now?"',
      soldier: '"Which battlefield discipline are you drilling until it becomes instinct?"',
      pirate: '"Which trick o’ the trade are ye sharpening until it cuts clean every time?"',
      commander: '"Which specialty do you intend to refine until it becomes doctrine?"',
      sage: '"Which discipline must you cultivate until it answers without thought?"',
      schemer: '"Which edge do you mean to sharpen until no rival can ignore it?"'
    },
    attribute: {
      mentor: '"What trait must sit at the heart of this path if it is going to hold?"',
      jedi: '"What quality within you must lead, if the rest is to remain in balance?"',
      soldier: '"What personal edge keeps this build standing when the pressure turns ugly?"',
      pirate: '"What part of you keeps this whole enterprise afloat when luck turns sour?"',
      commander: '"What quality in you must remain strongest if this path is to succeed?"',
      sage: '"What inner strength must anchor the discipline you are building?"',
      schemer: '"What quality makes you dangerous enough to carry this path to the end?"'
    },
    legacy: {
      mentor: '"And when this build is finished, what story should it tell about you?"',
      jedi: '"When your path is remembered, what truth should others speak of it?"',
      soldier: '"At the end of the campaign, what should people say your build was made to do?"',
      pirate: '"When the smoke clears, what sort of legend are ye hoping this path leaves behind?"',
      commander: '"When your choices have all compounded, what identity should this build carry?"',
      sage: '"When the path is complete, what truth should remain at its center?"',
      schemer: '"When the dust settles, what reputation should this path have earned you?"'
    }
  };
  const raw = line(profile, mentorName, prompts[kind] || prompts.path)
    .replaceAll('{className}', classDisplayName)
    .replaceAll('{primaryTerm}', primaryTerm || titleCaseKey(primaryTerm));
  return `${mentorName} asks: ${raw}`;
}

function optionFromArchetype(archetype, classDisplayName, scalar = 0.22) {
  return {
    id: `arch_${archetype.id}`,
    label: `${archetype.name} — ${archetype.notes || `A defining ${classDisplayName} path.`}`,
    hint: archetype.notes || '',
    archetypeHint: archetype.id,
    biasLayers: mergeBiasLayers([archetype], scalar),
    biases: { archetype: archetype.id }
  };
}

function optionFromCluster(id, label, hint, archetypes, layerKey, scalar = 0.16) {
  return {
    id,
    label,
    hint,
    archetypeHint: archetypes?.[0]?.id || null,
    clusterKey: layerKey,
    biasLayers: mergeBiasLayers(archetypes, scalar),
    biases: { cluster: layerKey }
  };
}

function makeQuestions({ classId, classDisplayName, archetypes, mentor }) {
  const profile = getMentorVoiceProfile(mentor, classDisplayName);
  const topArchetypes = uniqueById(archetypes).slice(0, 4);
  const roleKeys = topKeys(archetypes.map((a) => a.roleBias), 4, new Set(['support']));
  const mechKeys = topKeys(archetypes.map((a) => a.mechanicalBias), 4);
  const attrKeys = topKeys(archetypes.map((a) => a.attributeBias), 4);
  const questionSet = [];

  questionSet.push({
    id: `${classId}_path`,
    text: buildQuestionText('path', profile, mentor.name, classDisplayName),
    options: [
      ...topArchetypes.map((a) => optionFromArchetype(a, classDisplayName, 0.22)),
      { id: `${classId}_path_uncertain`, label: 'I am still feeling out the shape of this path.', hint: 'Keep the guidance broad for now.', biasLayers: { mechanicalBias: {}, roleBias: {}, attributeBias: {} }, biases: {} }
    ]
  });

  questionSet.push({
    id: `${classId}_role`,
    text: buildQuestionText('role', profile, mentor.name, classDisplayName),
    options: roleKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'roleBias', key, 3);
      return optionFromCluster(`${classId}_role_${key}`, `${titleCaseKey(key)} — ${reps[0]?.notes || `Lean into the ${titleCaseKey(key).toLowerCase()} side of ${classDisplayName}.`}`, reps[0]?.name || '', reps, key, 0.16);
    })
  });

  questionSet.push({
    id: `${classId}_discipline`,
    text: buildQuestionText('mechanics', profile, mentor.name, classDisplayName),
    options: mechKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'mechanicalBias', key, 3);
      return optionFromCluster(`${classId}_discipline_${key}`, `${titleCaseKey(key)} — ${reps[0]?.name || titleCaseKey(key)}`, reps[0]?.notes || `Push ${titleCaseKey(key).toLowerCase()} harder than the rest.`, reps, key, 0.15);
    })
  });

  questionSet.push({
    id: `${classId}_instinct`,
    text: buildQuestionText('attribute', profile, mentor.name, classDisplayName),
    options: attrKeys.map((key) => {
      const reps = findBestArchetypesByKey(archetypes, 'attributeBias', key, 3);
      return optionFromCluster(`${classId}_instinct_${key}`, `${titleCaseKey(normalizeAttributeKey(key))} — ${reps[0]?.name || classDisplayName}`, reps[0]?.notes || `Let ${titleCaseKey(normalizeAttributeKey(key)).toLowerCase()} carry this path.`, reps, key, 0.14);
    })
  });

  questionSet.push({
    id: `${classId}_legacy`,
    text: buildQuestionText('legacy', profile, mentor.name, classDisplayName),
    options: topArchetypes.map((a) => ({
      id: `${classId}_legacy_${a.id}`,
      label: `${a.name} — ${a.notes || `Finish as a ${a.name.toLowerCase()}.`}`,
      hint: a.notes || '',
      archetypeHint: a.id,
      biasLayers: mergeBiasLayers([a], 0.20),
      biases: { archetype: a.id, commitment: 1 }
    }))
  });

  return questionSet.filter((q) => q.options?.length);
}

export function buildSurveyDefinition(source) {
  const mentor = MENTORS[source.mentorKey] || MENTORS[source.displayName] || MENTORS.Scoundrel;
  const archetypes = deepClone(source.archetypes || []).map((entry) => ({
    ...entry,
    id: entry.id || entry.slug || entry.name?.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  }));
  const surveyType = CORE_CLASS_IDS.has(source.classId) ? 'l1' : 'prestige';
  return {
    surveyId: source.surveyId,
    surveyType,
    classId: source.classId,
    classDisplayName: source.displayName,
    mentorKey: source.mentorKey,
    mentor,
    archetypes,
    questions: makeQuestions({ classId: source.classId, classDisplayName: source.displayName, archetypes, mentor })
  };
}
