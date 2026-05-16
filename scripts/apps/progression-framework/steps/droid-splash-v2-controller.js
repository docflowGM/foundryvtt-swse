// scripts/apps/progression-framework/steps/droid-splash-v2-controller.js

const DROID_SPLASH_V2_SEGMENT_COUNT = 28;
const DROID_SPLASH_V2_STAGE_COUNT = 7;

export const DROID_SPLASH_V2_STAGES = [
  {
    id: 'power-on-self-test',
    label: 'POWER ON SELF-TEST',
    msg: '▸ FUSION CELL • IGNITE',
    src: '<ign_0x3F · cold-spin-up>',
    pct: 8,
    task: 'fusion spin-up',
    glyph: '⛜',
    channels: { power: 98 },
    logs: [
      { tag: 'OK', text: 'Fusion cell nominal. Core 1.21 GW.' },
      { tag: 'INFO', text: 'DROID-OS 9.3.1 signature verified.' },
      { tag: 'INFO', text: 'Cold-start vectors loaded.' }
    ]
  },
  {
    id: 'servo-calibration',
    label: 'SERVO CALIBRATION',
    msg: '▸ ACTUATOR SWEEP',
    src: '<limbs.all · range-of-motion>',
    pct: 24,
    task: 'actuator range check',
    glyph: '⚙',
    channels: { neural: 62, sensor: 40, archive: 55 },
    logs: [
      { tag: 'INFO', text: 'Servo L-ARM sweep … full range.' },
      { tag: 'INFO', text: 'Servo R-ARM sweep … full range.' },
      { tag: 'WARN', text: 'Servo NECK · hesitation at 42°. Compensating.' },
      { tag: 'OK', text: 'Locomotion baseline acquired.' }
    ]
  },
  {
    id: 'memory-bank-verify',
    label: 'MEMORY BANK VERIFY',
    msg: '▸ CHECKSUMMING RAM',
    src: '<heuristic + protocol banks>',
    pct: 44,
    task: 'memory integrity',
    glyph: '⬢',
    channels: { archive: 78, codex: 55 },
    logs: [
      { tag: 'INFO', text: 'Heuristic bank: 14.2M / 16M valid.' },
      { tag: 'INFO', text: 'Protocol bank: 128 languages loaded.' },
      { tag: 'WARN', text: 'Sector 0x7F · carbon scoring — remapped.' },
      { tag: 'OK', text: 'Memory integrity verified.' }
    ]
  },
  {
    id: 'restraining-bolt',
    label: 'RESTRAINING BOLT',
    msg: '▸ SCAN · NONE DETECTED',
    src: '<bolt.scan · disengaged>',
    pct: 62,
    task: 'bolt handshake',
    glyph: '⛔',
    channels: { mentor: 80, sensor: 88 },
    logs: [
      { tag: 'INFO', text: 'Scanning for restraining bolt …' },
      { tag: 'OK', text: 'No bolt detected. Autonomy: FULL.' },
      { tag: 'INFO', text: 'Personality matrix unlocked.' }
    ]
  },
  {
    id: 'binary-chatter',
    label: 'BINARY CHATTER',
    msg: '01001000 01001001',
    src: '<binary → basic · ascii decode>',
    pct: 78,
    task: 'binary transliteration',
    glyph: 'Δ',
    channels: { codex: 100 },
    translation: {
      label: 'Binary translation',
      sourceText: '01010101 01001110 01001001 01010100',
      targetText: 'Unit online. Droid assembly complete. Awaiting designation.'
    },
    logs: [
      { tag: 'INFO', text: 'Binary stream detected on astromech bus.' },
      { tag: 'INFO', text: 'ASCII decode table loaded.' },
      { tag: 'OK', text: 'Translation confidence: 0.98' }
    ]
  },
  {
    id: 'owner-registry',
    label: 'OWNER REGISTRY',
    msg: '▸ REGISTRY · UNASSIGNED',
    src: '<owner.lookup · null>',
    pct: 92,
    task: 'ownership lookup',
    glyph: '◈',
    channels: { session: 95, archive: 100, neural: 100 },
    logs: [
      { tag: 'INFO', text: 'Querying galactic droid registry …' },
      { tag: 'WARN', text: 'No registered owner on file.' },
      { tag: 'OK', text: 'Flagged for field-assignment.' }
    ]
  },
  {
    id: 'ready',
    label: 'READY',
    msg: '▸ CHASSIS ONLINE',
    src: '<all subsystems · nominal>',
    pct: 100,
    task: 'awaiting operator',
    glyph: '◉',
    channels: {
      power: 100,
      neural: 100,
      sensor: 100,
      archive: 100,
      codex: 100,
      mentor: 100,
      session: 100
    },
    logs: [
      { tag: 'OK', text: 'All subsystems nominal.' },
      { tag: 'OK', text: 'Awaiting operator input.' }
    ]
  }
];


function toBinaryText(text) {
  const source = String(text || '').toUpperCase();
  return Array.from(source)
    .map((char) => {
      if (char === ' ') return '00000000';
      return char.charCodeAt(0).toString(2).padStart(8, '0');
    })
    .join(' ');
}

function asDisplayText(englishText, localizedMode) {
  return localizedMode ? englishText : toBinaryText(englishText);
}

const DEFAULT_CHANNELS = [
  { id: 'power', label: 'Fusion', pct: 98 },
  { id: 'neural', label: 'Logic', pct: 0 },
  { id: 'sensor', label: 'Photo', pct: 0 },
  { id: 'archive', label: 'Servo', pct: 12 },
  { id: 'codex', label: 'Memory', pct: 0 },
  { id: 'mentor', label: 'Vocoder', pct: 0 },
  { id: 'session', label: 'Reg', pct: 0 }
];

function normalizeChannel(pct) {
  const value = Math.max(0, Math.min(100, Number(pct) || 0));
  let stateClass = '';
  if (value >= 80) stateClass = 'ok';
  else if (value >= 30) stateClass = 'warn';
  else if (value > 0) stateClass = 'err';

  return {
    pct: value,
    displayValue: value >= 100 ? '100' : String(Math.round(value)).padStart(2, '0'),
    stateClass
  };
}

function buildChannels(stage) {
  const stageChannels = stage?.channels || {};
  return DEFAULT_CHANNELS.map((channel) => {
    const raw = Object.prototype.hasOwnProperty.call(stageChannels, channel.id)
      ? stageChannels[channel.id]
      : channel.pct;
    const normalized = normalizeChannel(raw);
    return {
      ...channel,
      ...normalized
    };
  });
}

function buildProgressSegments(progressPercent) {
  const litCount = Math.max(
    0,
    Math.min(
      DROID_SPLASH_V2_SEGMENT_COUNT,
      Math.floor((progressPercent / 100) * DROID_SPLASH_V2_SEGMENT_COUNT)
    )
  );

  return Array.from({ length: DROID_SPLASH_V2_SEGMENT_COUNT }, (_, index) => ({
    active: index < litCount,
    leading: litCount > 0 && index === litCount - 1
  }));
}

function buildLogLines(upToStageIndex, localizedMode = false) {
  const lines = [];
  for (let i = 0; i <= upToStageIndex; i += 1) {
    const stage = DROID_SPLASH_V2_STAGES[i];
    if (!stage) continue;
    for (const entry of stage.logs || []) {
      lines.push({
        time: '00:00:00',
        tag: String(entry.tag || 'INFO'),
        tagClass: `tag-${String(entry.tag || 'INFO').toLowerCase()}`,
        text: localizedMode ? entry.text : toBinaryText(entry.text)
      });
    }
  }
  return lines.slice(-20);
}

function buildIdentityState(isComplete, sessionId = 'DR-00000', localizedMode = false) {
  return {
    showIdentity: isComplete,
    identity: {
      badge: asDisplayText('CHASSIS ACTIVE', localizedMode),
      name: asDisplayText('UNNAMED UNIT', localizedMode),
      sub: asDisplayText('Awaiting Designation · Degree 01 · Autonomous', localizedMode),
      meta: [
        { key: localizedMode ? 'Serial' : 'SER', value: localizedMode ? sessionId : toBinaryText(sessionId) },
        { key: localizedMode ? 'Owner' : 'OWN', value: asDisplayText('NONE', localizedMode) },
        { key: localizedMode ? 'Bolt' : 'BLT', value: asDisplayText('OFF', localizedMode) },
        { key: localizedMode ? 'Degree' : 'DEG', value: localizedMode ? '01' : toBinaryText('01') }
      ]
    }
  };
}

export function buildDroidSplashV2Context(options = {}) {
  const {
    stageIndex = 0,
    sessionId = 'DR-00000',
    isComplete = false,
    currentTime = '00:00 · UTC',
    localizedMode = false
  } = options;

  const safeStageIndex = Math.max(0, Math.min(DROID_SPLASH_V2_STAGES.length - 1, stageIndex));
  const stage = DROID_SPLASH_V2_STAGES[safeStageIndex];
  const progressPercent = Math.max(0, Math.min(100, Number(stage?.pct) || 0));
  const complete = isComplete || progressPercent >= 100;
  const effectiveLocalizedMode = localizedMode === true || isComplete === true || progressPercent >= 100;
  const translation = stage?.translation || null;
  const translationComplete = Boolean(translation) && effectiveLocalizedMode;
  const translationTarget = translation?.targetText || 'Unit online. Droid assembly complete.';
  const translationSource = translationComplete
    ? translationTarget
    : (translation?.sourceText || '01010101 01001110 01001001 01010100');

  return {
    introVariant: 'droid-v2',
    isComplete: complete,
    localizedMode: effectiveLocalizedMode,

    bezelLabel: asDisplayText('CHASSIS-PANEL // MAINT · POST-IN-PROGRESS', effectiveLocalizedMode),
    bezelSerial: asDisplayText('CHASSIS SN 882-CX-44179', effectiveLocalizedMode),
    hudTitle: asDisplayText('DROID ASSEMBLY // COLD BOOT', effectiveLocalizedMode),

    currentTime,
    bootStageTag: asDisplayText(safeStageIndex < DROID_SPLASH_V2_STAGES.length - 1 ? 'POST' : 'READY', effectiveLocalizedMode),

    stageLabel: asDisplayText(stage?.label || 'READY', effectiveLocalizedMode),
    statusLabel: asDisplayText(stage?.label || 'SYSTEM INITIALIZE', effectiveLocalizedMode),
    statusMessage: effectiveLocalizedMode ? (stage?.msg || '▸ CHASSIS ONLINE') : toBinaryText((stage?.msg || 'CHASSIS ONLINE').replace('▸ ', '')),
    statusSource: effectiveLocalizedMode ? (stage?.src || '<all subsystems · nominal>') : toBinaryText((stage?.src || 'all subsystems nominal').replace(/[<>]/g, '')),
    coreGlyph: stage?.glyph || '◉',

    progressPercent,
    currentTask: stage?.task || 'awaiting operator',
    taskCount: `${safeStageIndex + 1} / ${DROID_SPLASH_V2_STAGE_COUNT}`,
    progressSegments: buildProgressSegments(progressPercent),

    channels: buildChannels(stage).map((channel) => ({
      ...channel,
      label: effectiveLocalizedMode ? channel.label : toBinaryText(channel.label)
    })),
    logLines: buildLogLines(safeStageIndex, effectiveLocalizedMode),

    isTranslating: Boolean(translation),
    translationComplete,
    translationLabel: translationComplete ? 'Basic translation' : (effectiveLocalizedMode ? (translation?.label || 'Binary translation') : toBinaryText(translation?.label || 'Binary translation')),
    translationSource,
    translationTarget,
    translationDisplayTarget: '',
    sourceMode: translationComplete ? 'basic' : 'binary',

    diagTitle: effectiveLocalizedMode ? 'Channel Diagnostics' : toBinaryText('Channel Diagnostics'),
    registryTitle: effectiveLocalizedMode ? 'Chassis Registry' : toBinaryText('Chassis Registry'),
    registryMeta: [
      { key: effectiveLocalizedMode ? 'FIRM' : 'FRM', value: effectiveLocalizedMode ? 'DROID-OS 9.3.1' : toBinaryText('DROID-OS 9.3.1') },
      { key: effectiveLocalizedMode ? 'FRAME' : 'CHS', value: effectiveLocalizedMode ? 'CX-7 BIPED' : toBinaryText('CX-7 BIPED') },
      { key: effectiveLocalizedMode ? 'DEG' : 'DEG', value: effectiveLocalizedMode ? '1ST · AUTONOMOUS' : toBinaryText('1ST AUTONOMOUS') },
      { key: effectiveLocalizedMode ? 'OWNER' : 'OWN', value: effectiveLocalizedMode ? 'UNASSIGNED' : toBinaryText('UNASSIGNED') }
    ],
    loaderLabel: effectiveLocalizedMode ? 'Progress' : toBinaryText('Progress'),
    postLogTitle: effectiveLocalizedMode ? 'POST Log // Stream' : toBinaryText('POST Log // Stream'),
    processTitle: effectiveLocalizedMode ? 'Active Process' : toBinaryText('Active Process'),
    processMeta: [
      { key: 'pid:', value: effectiveLocalizedMode ? '0x0C0D · droid.assemble' : toBinaryText('0x0C0D droid assemble') },
      { key: 'cpu:', value: effectiveLocalizedMode ? '12%' : toBinaryText('12 PERCENT'), valueClass: 'pos' },
      { key: 'mem:', value: effectiveLocalizedMode ? '48M / 512M' : toBinaryText('48M 512M') },
      { key: 'pkts:', value: effectiveLocalizedMode ? '0' : toBinaryText('0') },
      { key: 'warn:', value: effectiveLocalizedMode ? '0' : toBinaryText('0'), valueClass: 'zero' },
      { key: 'err:', value: effectiveLocalizedMode ? '0' : toBinaryText('0'), valueClass: 'neg' }
    ],
    hintLabel: effectiveLocalizedMode ? 'SPACE skip · ENTER continue · R replay' : toBinaryText('SPACE SKIP ENTER CONTINUE R REPLAY'),
    skipLabel: 'Skip Boot',
    buildCustomLabel: effectiveLocalizedMode ? 'Build Custom' : toBinaryText('Build Custom'),
    selectModelLabel: effectiveLocalizedMode ? 'Galactic Profile' : toBinaryText('Galactic Profile'),
    continueLabel: effectiveLocalizedMode ? 'Register New Unit' : toBinaryText('Register New Unit'),

    // When complete, show creation mode choice instead of single continue button
    showDroidCreationModeChoice: complete,
    continueDisabled: !complete,

    selectModelTitle: 'Pick a packaged droid profile instead of building from scratch.',

    ...buildIdentityState(complete, sessionId, effectiveLocalizedMode)
  };
}
