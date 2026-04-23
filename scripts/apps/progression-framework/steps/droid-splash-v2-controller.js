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

function buildLogLines(upToStageIndex) {
  const lines = [];
  for (let i = 0; i <= upToStageIndex; i += 1) {
    const stage = DROID_SPLASH_V2_STAGES[i];
    if (!stage) continue;
    for (const entry of stage.logs || []) {
      lines.push({
        time: '00:00:00',
        tag: String(entry.tag || 'INFO'),
        tagClass: `tag-${String(entry.tag || 'INFO').toLowerCase()}`,
        text: entry.text
      });
    }
  }
  return lines.slice(-20);
}

function buildIdentityState(isComplete, sessionId = 'DR-00000') {
  return {
    showIdentity: isComplete,
    identity: {
      badge: '✓ CHASSIS ACTIVE',
      name: 'UNNAMED UNIT',
      sub: 'Awaiting Designation · Degree 01 · Autonomous',
      meta: [
        { key: 'Serial', value: sessionId },
        { key: 'Owner', value: 'NONE' },
        { key: 'Bolt', value: 'OFF' },
        { key: 'Degree', value: '01' }
      ]
    }
  };
}

export function buildDroidSplashV2Context(options = {}) {
  const {
    stageIndex = 0,
    sessionId = 'DR-00000',
    isComplete = false,
    currentTime = '00:00 · UTC'
  } = options;

  const safeStageIndex = Math.max(0, Math.min(DROID_SPLASH_V2_STAGES.length - 1, stageIndex));
  const stage = DROID_SPLASH_V2_STAGES[safeStageIndex];
  const progressPercent = Math.max(0, Math.min(100, Number(stage?.pct) || 0));
  const complete = isComplete || progressPercent >= 100;
  const translation = stage?.translation || null;

  return {
    introVariant: 'droid-v2',
    isComplete: complete,

    bezelLabel: 'CHASSIS-PANEL // MAINT · POST-IN-PROGRESS',
    bezelSerial: 'CHASSIS SN 882-CX-ΛΩ-44179',
    hudTitle: 'DROID ASSEMBLY // COLD BOOT',

    currentTime,
    bootStageTag: safeStageIndex < DROID_SPLASH_V2_STAGES.length - 1 ? 'POST' : 'READY',

    stageLabel: stage?.label || 'READY',
    statusLabel: stage?.label || 'SYSTEM INITIALIZE',
    statusMessage: stage?.msg || '▸ CHASSIS ONLINE',
    statusSource: stage?.src || '<all subsystems · nominal>',
    coreGlyph: stage?.glyph || '◉',

    progressPercent,
    currentTask: stage?.task || 'awaiting operator',
    taskCount: `${safeStageIndex + 1} / ${DROID_SPLASH_V2_STAGE_COUNT}`,
    progressSegments: buildProgressSegments(progressPercent),

    channels: buildChannels(stage),
    logLines: buildLogLines(safeStageIndex),

    isTranslating: Boolean(translation),
    translationLabel: translation?.label || 'Binary translation',
    translationSource: translation?.sourceText || '01010101 01001110 01001001 01010100',
    translationTarget: translation?.targetText || 'Unit online. Droid assembly complete.',
    sourceMode: 'binary',

    continueLabel: 'Register New Unit',
    continueDisabled: !complete,

    ...buildIdentityState(complete, sessionId)
  };
}
