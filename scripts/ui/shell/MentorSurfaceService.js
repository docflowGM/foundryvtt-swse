import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { MentorSuggestionVoice } from "/systems/foundryvtt-swse/scripts/mentor/mentor-suggestion-voice.js";
import { MENTORS, resolveMentorPortraitPath } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-dialogues.js";

const DEFAULT_ACCENT = '#7ee7ff';

const MENTOR_ACCENTS = Object.freeze({
  miraj: '#7ee7ff',
  breach: '#ff9a3d',
  'ol-salty': '#f2c879',
  salty: '#f2c879',
  j0n1: '#8ee6ff',
  lead: '#65e6a5',
  dezmin: '#f2f4ff',
  kyber: '#b7f3ff',
  mayu: '#ff71d9',
  'darth-malbada': '#ff4f6d',
  malbada: '#ff4f6d',
  'darth-miedo': '#ff334f',
  miedo: '#ff334f',
  kharjo: '#ffc857',
  kael: '#ffc857',
  axiom: '#9ce8ff',
  riquis: '#95f5c8',
  anchorite: '#95f5c8',
  spark: '#ffe66d',
  kex: '#ffb36b',
  rax: '#ff7a7a',
  vera: '#d494ff',
  venn: '#d494ff',
  urza: '#ff8fb8',
  vel: '#ff8fb8',
  zhen: '#b0ffce',
  marl: '#85d7ff',
  skindar: '#85d7ff'
});

const SURFACE_TOPICS = Object.freeze([
  {
    key: 'who_am_i_becoming',
    title: 'Who am I becoming?',
    icon: '1',
    glyph: '◆',
    description: 'Hear what your choices say about your role and identity.',
    hint: 'Identity read'
  },
  {
    key: 'paths_open',
    title: 'What paths are open to me?',
    icon: '2',
    glyph: '◇',
    description: 'Review possible archetypes and long-term directions.',
    hint: 'Path options'
  },
  {
    key: 'doing_well',
    title: 'What am I doing well?',
    icon: '3',
    glyph: '▲',
    description: 'Ask your mentor what is already working in your build.',
    hint: 'Strengths'
  },
  {
    key: 'doing_wrong',
    title: 'What should I correct?',
    icon: '4',
    glyph: '△',
    description: 'Identify weak points, risks, and missing support choices.',
    hint: 'Warnings'
  },
  {
    key: 'how_should_i_fight',
    title: 'How should I fight?',
    icon: '5',
    glyph: '✦',
    description: 'Get tactical advice for your current combat role.',
    hint: 'Combat doctrine'
  },
  {
    key: 'be_careful',
    title: 'What should I be careful about?',
    icon: '6',
    glyph: '!',
    description: 'Learn what could punish this build at the table.',
    hint: 'Risk check'
  },
  {
    key: 'what_lies_ahead',
    title: 'What lies ahead?',
    icon: '7',
    glyph: '✶',
    description: 'Look ahead to prestige options and future choices.',
    hint: 'Future planning'
  },
  {
    key: 'how_would_you_play',
    title: 'How would you play this character?',
    icon: '8',
    glyph: '☉',
    description: 'Ask your mentor for practical playstyle guidance.',
    hint: 'Play advice'
  },
  {
    key: 'mentor_story',
    title: 'Tell me about yourself.',
    icon: '9',
    glyph: '☰',
    description: 'Hear a story from this mentor and learn who they are.',
    hint: 'Mentor story'
  },
  {
    key: 'l1_survey',
    title: 'Help me find my path.',
    icon: 'S',
    glyph: '?',
    description: 'Answer five mentor questions to bias future suggestions.',
    hint: 'Level 1 survey'
  }
]);

const SURVEY_QUESTIONS = Object.freeze([
  {
    id: 'force',
    prompt: 'When the galaxy pushes back, what do you reach for first?',
    choices: [
      { text: 'The Force. I want the unseen current on my side.', scores: { force: 2, conviction: 1 } },
      { text: 'My weapon. Problems end when threats stop moving.', scores: { aggression: 2, independence: 1 } },
      { text: 'My crew. A plan is stronger when everyone has a role.', scores: { leadership: 2, conviction: 1 } },
      { text: 'My instincts. I adapt faster than the problem can change.', scores: { independence: 2, aggression: 1 } }
    ]
  },
  {
    id: 'approach',
    prompt: 'A dangerous enemy stands between you and the objective. What is your first instinct?',
    choices: [
      { text: 'Study them, then strike only when the opening is real.', scores: { independence: 1, conviction: 1 } },
      { text: 'Hit hard before they can set the terms of the fight.', scores: { aggression: 2 } },
      { text: 'Rally allies and control the battlefield.', scores: { leadership: 2 } },
      { text: 'Turn their fear, anger, or doubt against them.', scores: { force: 1, aggression: 1, independence: 1 } }
    ]
  },
  {
    id: 'command',
    prompt: 'People look to you when the mission starts to fail. What do you give them?',
    choices: [
      { text: 'Orders. Clear, fast, and impossible to misunderstand.', scores: { leadership: 2, conviction: 1 } },
      { text: 'Hope. Someone has to remind them why this matters.', scores: { conviction: 2, leadership: 1 } },
      { text: 'Space. I work best when nobody slows me down.', scores: { independence: 2 } },
      { text: 'Results. Success teaches louder than speeches.', scores: { aggression: 1, independence: 1 } }
    ]
  },
  {
    id: 'morality',
    prompt: 'Power asks a price. Which price are you most willing to pay?',
    choices: [
      { text: 'Discipline. I will master myself first.', scores: { conviction: 2, force: 1 } },
      { text: 'Reputation. Let them fear me if fear keeps them alive.', scores: { aggression: 2 } },
      { text: 'Responsibility. If I lead, I carry the consequences.', scores: { leadership: 2, conviction: 1 } },
      { text: 'Isolation. Some roads can only be walked alone.', scores: { independence: 2 } }
    ]
  },
  {
    id: 'future',
    prompt: 'At the end of your training, what should others say about you?',
    choices: [
      { text: 'They changed the battle before it began.', scores: { leadership: 1, force: 1, conviction: 1 } },
      { text: 'They were the most dangerous person in the room.', scores: { aggression: 2, independence: 1 } },
      { text: 'They held the line when everyone else broke.', scores: { conviction: 2, leadership: 1 } },
      { text: 'They went where no one else could follow.', scores: { independence: 2, force: 1 } }
    ]
  }
]);

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['"`.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(value) {
  const text = String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  return text || '';
}

function getNested(obj, path, fallback = undefined) {
  try {
    return foundry.utils.getProperty(obj, path) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function mentorAccent(mentorEntry) {
  const mentor = mentorEntry?.mentor || mentorEntry || {};
  const candidates = [
    mentorEntry?.key,
    mentor?.mentorKey,
    mentor?.id,
    mentor?.name,
    mentor?.title
  ].map(normalizeKey).filter(Boolean);

  for (const key of candidates) {
    if (MENTOR_ACCENTS[key]) return MENTOR_ACCENTS[key];
    const segment = key.split('-').find(part => MENTOR_ACCENTS[part]);
    if (segment) return MENTOR_ACCENTS[segment];
  }
  return DEFAULT_ACCENT;
}

function getMentorClassLabel(entry) {
  return entry?.unlockedBy || entry?.className || entry?.mentor?.className || entry?.key || 'Mentor';
}

function normalizeSurveyAnswers(answers = []) {
  return Array.isArray(answers) ? answers.filter(answer => answer && typeof answer === 'object') : [];
}

function totalSurveyScores(answers = []) {
  const scores = { force: 0, aggression: 0, leadership: 0, conviction: 0, independence: 0 };
  for (const answer of normalizeSurveyAnswers(answers)) {
    for (const [key, value] of Object.entries(answer.scores || {})) {
      scores[key] = (scores[key] || 0) + (Number(value) || 0);
    }
  }
  return scores;
}

function surveyArchetype(scores = {}) {
  const ordered = Object.entries(scores).sort((a, b) => (b[1] || 0) - (a[1] || 0));
  const primary = ordered[0]?.[0] || 'conviction';
  const secondary = ordered[1]?.[0] || 'independence';
  const labels = {
    force: 'Force Adept',
    aggression: 'Striker',
    leadership: 'Commander',
    conviction: 'Guardian',
    independence: 'Operative'
  };
  const blurbs = {
    force: 'You listen for the current beneath the battle. Force powers, perception, and restraint should matter in your suggestions.',
    aggression: 'You solve danger by ending it quickly. Damage, initiative, and aggressive combat choices should rise in your suggestions.',
    leadership: 'You think in teams and missions. Talents, feats, and skills that help allies should rise in your suggestions.',
    conviction: 'You want a line that does not break. Defense, endurance, discipline, and moral clarity should matter in your suggestions.',
    independence: 'You work best with room to improvise. Mobility, stealth, utility, and flexible self-sufficiency should matter in your suggestions.'
  };
  return {
    primary,
    secondary,
    name: labels[primary] || 'Free Agent',
    secondaryName: labels[secondary] || 'Wildcard',
    description: blurbs[primary] || blurbs.conviction
  };
}

function buildBiases(scores = {}) {
  return {
    forceAffinity: scores.force || 0,
    aggression: scores.aggression || 0,
    leadership: scores.leadership || 0,
    conviction: scores.conviction || 0,
    independence: scores.independence || 0,
    roleHints: {
      force: scores.force || 0,
      striker: scores.aggression || 0,
      leader: scores.leadership || 0,
      defender: scores.conviction || 0,
      scout: scores.independence || 0
    }
  };
}

function normalizeSuggestionRows(suggestions = []) {
  if (!Array.isArray(suggestions)) return [];
  return suggestions.slice(0, 5).map((entry, index) => {
    if (typeof entry === 'string') {
      return { index, title: entry, subtitle: '', score: null };
    }
    const title = entry?.title || entry?.name || entry?.label || entry?.itemName || entry?.id || `Suggestion ${index + 1}`;
    const subtitle = entry?.reason || entry?.description || entry?.summary || entry?.type || '';
    const rawScore = entry?.score ?? entry?.confidence ?? entry?.rank ?? null;
    const score = rawScore == null ? null : String(rawScore);
    return { index, title, subtitle, score };
  });
}

function normalizeReasonRows(reasons = []) {
  if (!Array.isArray(reasons)) return [];
  return reasons.slice(0, 5).map((entry, index) => {
    if (typeof entry === 'string') return { index, text: entry };
    return { index, text: entry?.text || entry?.reason || entry?.label || entry?.id || '' };
  }).filter(row => row.text);
}

export class MentorSurfaceService {
  static getSurveyQuestions() {
    return SURVEY_QUESTIONS.map((question, questionIndex) => ({
      ...question,
      index: questionIndex,
      choices: question.choices.map((choice, choiceIndex) => ({ ...choice, index: choiceIndex }))
    }));
  }

  static scoreSurveyAnswers(answers = []) {
    const scores = totalSurveyScores(answers);
    const archetype = surveyArchetype(scores);
    return {
      scores,
      archetype,
      biases: buildBiases(scores),
      completedAt: new Date().toISOString()
    };
  }

  static async buildViewModel(actor, options = {}) {
    const dialog = new MentorChatDialog(actor, {});
    const unlockedMentors = (dialog._getUnlockedMentors?.() || []).map(entry => this._decorateMentorEntry(entry));
    const selectedMentorKey = options.showRoster
      ? null
      : (options.selectedMentorKey || (options.topicKey ? unlockedMentors[0]?.key : null) || null);
    const selectedMentor = unlockedMentors.find((entry) => entry.key === selectedMentorKey) || null;

    let topics = [];
    let currentTopic = null;
    let currentResponse = null;
    let survey = this._buildSurveyState(actor, options);

    if (selectedMentor) {
      dialog.selectedMentor = selectedMentor;
      topics = this._buildTopics();
      const topicKey = options.topicKey || null;
      currentTopic = topics.find((topic) => topic.key === topicKey) || null;

      if (options.committedPath) {
        currentResponse = this._buildPathCommitResponse(selectedMentor, options.committedPath);
      } else if (currentTopic?.key === 'l1_survey') {
        currentResponse = this._buildSurveyResponse(selectedMentor, survey);
      } else if (currentTopic) {
        dialog.currentTopic = currentTopic;
        dialog.currentResponse = {};
        const response = await dialog._generateTopicResponse(currentTopic);
        currentResponse = this._decorateResponse({
          ...response,
          availablePaths: dialog.currentResponse?.availablePaths || response?.availablePaths || []
        }, currentTopic, selectedMentor);
      } else {
        currentResponse = this._decorateResponse({
          introduction: this._getMentorIntroduction(selectedMentor),
          advice: 'Choose a topic. Ask carefully; the answer may shape your training.',
          suggestions: [],
          reasonTexts: [],
          availablePaths: []
        }, null, selectedMentor);
      }
    }

    const accent = mentorAccent(selectedMentor);

    return {
      id: 'mentor',
      title: 'Mentor Dialogue',
      actorName: actor?.name || '',
      hasMentors: unlockedMentors.length > 0,
      unlockedMentors,
      selectedMentorKey,
      selectedMentor,
      selectedMentorAccent: accent,
      topics,
      currentTopic,
      currentResponse,
      survey,
      surveyCompleted: Boolean(survey.completed),
      committedPath: options.committedPath || null,
      showRoster: Boolean(options.showRoster || !selectedMentor),
      topicsOpen: Boolean(options.topicsOpen ?? (!options.topicKey && !options.committedPath)),
      keyboardHint: '[1-6] choose · [Space] skip · [Esc] topics'
    };
  }

  static _decorateMentorEntry(entry) {
    const mentor = entry?.mentor || {};
    const accent = mentorAccent(entry);
    const portrait = resolveMentorPortraitPath(mentor.portrait);
    return {
      ...entry,
      mentor: {
        ...mentor,
        portrait,
        displayTitle: mentor.title || getMentorClassLabel(entry)
      },
      accent,
      cssAccent: accent,
      classLabel: getMentorClassLabel(entry),
      normalizedKey: normalizeKey(entry?.key || mentor?.name)
    };
  }

  static _buildTopics() {
    return SURFACE_TOPICS.map((topic, index) => ({
      ...topic,
      index: index + 1,
      numericShortcut: index < 9 ? String(index + 1) : 'S'
    }));
  }

  static _decorateResponse(response = {}, topic = null, selectedMentor = null) {
    const intro = response.introduction || '';
    const advice = response.advice || '';
    const lines = [intro, advice].filter(Boolean);
    const dialogueHtml = lines.join('<br><br>');
    const dialogueTextPlain = stripHtml(dialogueHtml) || this._getMentorIntroduction(selectedMentor);
    return {
      introduction: intro,
      advice,
      dialogueHtml,
      dialogueTextPlain,
      suggestions: normalizeSuggestionRows(response.suggestions || []),
      reasonTexts: normalizeReasonRows(response.reasonTexts || []),
      availablePaths: response.availablePaths || [],
      pathSelected: response.pathSelected || null,
      topicTitle: topic?.title || 'Greeting'
    };
  }

  static _buildSurveyState(actor, options = {}) {
    const stored = getNested(actor, 'system.swse.mentorSurfaceSurvey', {}) || {};
    const optionAnswers = normalizeSurveyAnswers(options.surveyAnswers);
    const storedAnswers = normalizeSurveyAnswers(stored.answers);
    const hasOptionAnswers = Array.isArray(options.surveyAnswers);
    const answers = options.resetSurvey ? [] : (hasOptionAnswers ? optionAnswers : storedAnswers);
    const questions = this.getSurveyQuestions();
    const requestedIndex = Number(options.surveyIndex ?? answers.length ?? 0);
    const index = Math.max(0, Math.min(questions.length - 1, Number.isFinite(requestedIndex) ? requestedIndex : 0));
    const completed = Boolean(stored.completed || getNested(actor, 'system.swse.mentorSurveyCompleted', false)) || answers.length >= questions.length;
    const score = this.scoreSurveyAnswers(answers);
    return {
      questions,
      answers,
      index,
      currentQuestion: questions[index] || null,
      total: questions.length,
      completed,
      progress: Math.min(questions.length, answers.length),
      scores: stored.scores || score.scores,
      archetype: stored.archetype || score.archetype,
      pips: questions.map((question, pipIndex) => ({ index: pipIndex, done: pipIndex < answers.length }))
    };
  }

  static _buildSurveyResponse(selectedMentor, survey) {
    const mentorName = selectedMentor?.mentor?.name || 'Your mentor';
    if (survey.completed || survey.answers.length >= survey.total) {
      const score = this.scoreSurveyAnswers(survey.answers);
      return this._decorateResponse({
        introduction: `${mentorName} studies your answers and gives a slow nod.`,
        advice: `Your answers point toward the **${score.archetype.name}** path, with a secondary pull toward **${score.archetype.secondaryName}**. ${score.archetype.description}`,
        reasonTexts: Object.entries(score.scores).map(([key, value]) => ({ key, text: `${key}: ${value}` })),
        availablePaths: []
      }, { title: 'Survey Complete' }, selectedMentor);
    }

    const question = survey.currentQuestion;
    return this._decorateResponse({
      introduction: `${mentorName} leans forward. Question ${survey.index + 1} of ${survey.total}.`,
      advice: question?.prompt || 'Answer honestly. The point is not obedience; it is direction.',
      reasonTexts: [],
      availablePaths: []
    }, { title: 'Mentor Survey' }, selectedMentor);
  }

  static _buildPathCommitResponse(selectedMentor, pathName) {
    const mentorName = selectedMentor?.mentor?.name || 'Your mentor';
    return this._decorateResponse({
      introduction: `${mentorName} receives your commitment without ceremony.`,
      advice: `Then that is the road you will walk: **${pathName}**. I will remember this choice when I guide your training, and I expect your future decisions to prove it was more than words.`,
      suggestions: [],
      reasonTexts: [{ text: `Committed path: ${pathName}` }],
      availablePaths: [],
      pathSelected: pathName
    }, { title: 'Path Committed' }, selectedMentor);
  }

  static _getMentorIntroduction(selectedMentor) {
    const mentorName = selectedMentor?.mentor?.name || selectedMentor?.mentor?.title || '';
    const voiceData = MentorSuggestionVoice.SUGGESTION_VOICES?.[mentorName];
    const lines = voiceData?.introduction || [];
    if (Array.isArray(lines) && lines.length) return lines[0];
    return `${selectedMentor?.mentor?.name || 'Mentor'} is ready to guide you.`;
  }
}
