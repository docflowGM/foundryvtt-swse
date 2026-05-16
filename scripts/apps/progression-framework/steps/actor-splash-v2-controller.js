/**
 * actor-splash-v2-controller.js
 * Controller/data builder for the actor-only v2 chargen splash.
 * Integrated into the live intro framework and called from intro-step.js.
 *
 * Manages:
 * - Stage progression
 * - Channel diagnostics
 * - Chip bank hotspots
 * - Progress segments and ticks
 * - Translation lifecycle (Aurebesh → English)
 * - Boot log entries
 * - Identity/registration end state
 */

const ACTOR_SPLASH_V2_SEGMENT_COUNT = 40;
const ACTOR_SPLASH_V2_BOOT_SEGMENTS = 8;

export const ACTOR_SPLASH_V2_STAGES = [
  {
    id: 'hardware-warming',
    label: 'HARDWARE WARMING',
    statusLabel: 'HARDWARE WARMING',
    statusMessage: '▸ FIRST-TIME STARTUP',
    statusClass: '',
    statusSource: '&lt;ign_0x3F · factory-default&gt;',
    bootStageTag: 'BOOT',
    bootStageDotClass: 'warn',
    glyph: '◉',
    pct: 8,
    task: 'capacitors charging',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: { power: 98 },
    hotBanks: ['CORE-0', 'CORE-1'],
    logs: [
      { tag: 'OK', text: 'POST complete. 512M addressed.' },
      { tag: 'INFO', text: 'Bootloader VERSA-OS 13.4.2 signed.' },
      { tag: 'INFO', text: 'Thermal budget OK · 38°C.' },
      { tag: 'INFO', text: 'Cold-start vectors loaded.' },
    ],
  },
  {
    id: 'display-calibration',
    label: 'DISPLAY CALIBRATION',
    statusLabel: 'DISPLAY CALIBRATION',
    statusMessage: '▸ PIXEL SWEEP',
    statusClass: '',
    statusSource: '&lt;rgbw bars · ΔE &lt; 1.4&gt;',
    bootStageTag: 'DISPLAY',
    bootStageDotClass: 'warn',
    glyph: '✦',
    pct: 18,
    task: 'display calibration',
    pixelTest: true,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: { display: 88, sensor: 40 },
    hotBanks: ['GPU', 'ISP'],
    logs: [
      { tag: 'INFO', text: 'Backlight ramp · 0 → 280 cd/m².' },
      { tag: 'INFO', text: 'Dead-pixel sweep (1 of 4).' },
      { tag: 'INFO', text: 'Dead-pixel sweep (2 of 4) · no faults.' },
      { tag: 'INFO', text: 'Dead-pixel sweep (4 of 4).' },
      { tag: 'OK', text: 'Color ΔE measured 0.92 — within tol.' },
    ],
  },
  {
    id: 'firmware-handshake',
    label: 'FIRMWARE HANDSHAKE',
    statusLabel: 'FIRMWARE HANDSHAKE',
    statusMessage: '▸ VERSA-OS 13.4.2',
    statusClass: '',
    statusSource: '&lt;sig.ok · kernel.9.121&gt;',
    bootStageTag: 'FW',
    bootStageDotClass: 'warn',
    glyph: '⬡',
    pct: 30,
    task: 'signature verify',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: { neural: 55, display: 95 },
    hotBanks: ['CORE-0', 'CORE-1', 'NPU'],
    logs: [
      { tag: 'INFO', text: 'kernel: verifying signature …' },
      { tag: 'OK', text: 'kernel: signature OK (sha512).' },
      { tag: 'INFO', text: 'firmware: 7.22 loaded (ms_0x3C2).' },
      { tag: 'INFO', text: 'driver: display @ 0xC040.' },
      { tag: 'INFO', text: 'driver: neural-link @ 0xC080.' },
      { tag: 'INFO', text: 'driver: uplink @ 0xC0A0.' },
    ],
  },
  {
    id: 'uplink-discovery',
    label: 'UPLINK DISCOVERY',
    statusLabel: 'UPLINK DISCOVERY',
    statusMessage: '▸ SCANNING FOR BEACON',
    statusClass: '',
    statusSource: '&lt;hs.01 · ORB-7 → HUB&gt;',
    bootStageTag: 'UPLINK',
    bootStageDotClass: 'warn',
    glyph: '◎',
    pct: 42,
    task: 'network discovery',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: { neural: 72, sensor: 68 },
    hotBanks: ['IO', 'NPU'],
    logs: [
      { tag: 'INFO', text: 'Beaconing on 2.4/5/60 GHz …' },
      { tag: 'WARN', text: 'No cached SSID · scanning open.' },
      { tag: 'INFO', text: 'Candidate: ORB-7 · rssi -54 dBm.' },
      { tag: 'INFO', text: 'Candidate: HUB · rssi -72 dBm.' },
      { tag: 'OK', text: 'Uplink acquired · ORB-7 · RTT 42ms.' },
    ],
  },
  {
    id: 'archive-sweep',
    label: 'ARCHIVE SWEEP',
    statusLabel: 'ARCHIVE SWEEP',
    statusMessage: '▸ QUERYING CODEX',
    statusClass: '',
    statusSource: '&lt;q.species · q.class · q.feats&gt;',
    bootStageTag: 'ARCHIVE',
    bootStageDotClass: 'warn',
    glyph: '⬢',
    pct: 58,
    task: 'codex retrieval',
    pixelTest: false,
    glitch: true,
    erroring: true,
    greenWashOn: false,
    bannerText: '✕ ERROR',
    bannerClass: 'err fire',
    channels: { archive: 88, codex: 72 },
    hotBanks: ['RAM-A', 'RAM-B', 'CACHE'],
    logs: [
      { tag: 'INFO', text: 'codex.species: 147 entries cached.' },
      { tag: 'INFO', text: 'codex.classes: 12 entries cached.' },
      { tag: 'WARN', text: 'codex.homebrew: out-of-date · refreshing …' },
      { tag: 'ERR', text: 'codex.homebrew: checksum mismatch (0x4C).' },
      { tag: 'INFO', text: 'Retry 1 of 3 …' },
      { tag: 'INFO', text: 'Retry 2 of 3 …' },
      { tag: 'OK', text: 'Archive integrity verified (recovered).' },
    ],
  },
  {
    id: 'mentor-assign',
    label: 'MENTOR ASSIGN',
    statusLabel: 'MENTOR ASSIGN',
    statusMessage: '▸ PERSONA // OVERSEER',
    statusClass: '',
    statusSource: '&lt;persona.load · overseer.v7&gt;',
    bootStageTag: 'MENTOR',
    bootStageDotClass: 'warn',
    glyph: '◈',
    pct: 70,
    task: 'mentor thread attach',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: { mentor: 80, neural: 90 },
    hotBanks: ['NPU', 'CORE-1'],
    logs: [
      { tag: 'INFO', text: 'Mentor persona OVERSEER instantiated.' },
      { tag: 'INFO', text: 'Voice model: caelan-v3 · 16 kHz.' },
      { tag: 'INFO', text: 'Suggestion engine online.' },
      { tag: 'OK', text: 'Mentor ⇄ chargen channel bound.' },
    ],
  },
  {
    id: 'translation',
    label: 'TRANSLATION',
    statusLabel: 'TRANSLATION',
    statusMessage: '◇◆◈◉○',
    statusClass: '',
    statusSource: '&lt;glyph → basic · aurebesh&gt;',
    bootStageTag: 'TRANSLATE',
    bootStageDotClass: 'warn',
    glyph: 'Δ',
    pct: 84,
    task: 'glyph transliteration',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: true,
    bannerText: '✓ TRANSLATED',
    bannerClass: 'pos fire-pos',
    channels: { sensor: 95, codex: 100 },
    hotBanks: ['NPU', 'GPU'],
    translation: {
      enabled: true,
      aurebeshSourceText: 'WELCOME NEW USER. REGISTRATION PROTOCOLS READY.',
      englishTargetText: 'Welcome, new user. Registration protocols ready.',
      label: 'Aurebesh translation',
    },
    logs: [
      { tag: 'INFO', text: 'Aurebesh stream detected.' },
      { tag: 'INFO', text: 'Substitution matrix loaded (62 glyphs).' },
      { tag: 'INFO', text: 'Lexicon: basic-galactic · v4.' },
      { tag: 'OK', text: 'Translation confidence 0.98.' },
    ],
  },
  {
    id: 'ready',
    label: 'READY',
    statusLabel: 'READY',
    statusMessage: '▸ AWAITING USER',
    statusClass: 'pos',
    statusSource: '&lt;enroll · tap-to-continue&gt;',
    bootStageTag: 'READY',
    bootStageDotClass: '',
    glyph: '◉',
    pct: 100,
    task: 'awaiting user registration',
    pixelTest: false,
    glitch: false,
    erroring: false,
    greenWashOn: false,
    bannerText: '',
    bannerClass: '',
    channels: {
      power: 100,
      display: 100,
      neural: 100,
      sensor: 100,
      archive: 100,
      codex: 100,
      mentor: 100,
      session: 100,
    },
    hotBanks: ['CORE-0', 'CORE-1', 'NPU', 'GPU', 'ISP', 'RAM-A', 'RAM-B', 'CACHE', 'IO'],
    logs: [
      { tag: 'OK', text: 'All subsystems nominal.' },
      { tag: 'OK', text: 'Session channel open · ckpt_0001 written.' },
      { tag: 'INFO', text: 'Display: awaiting touch input.' },
      { tag: 'OK', text: '▸ Awaiting user registration.' },
    ],
  },
];

const DEFAULT_CHANNELS = [
  { id: 'power', label: 'Power', pct: 98, displayValue: '98', stateClass: 'ok' },
  { id: 'display', label: 'Display', pct: 0, displayValue: '00', stateClass: '' },
  { id: 'neural', label: 'Neural', pct: 0, displayValue: '00', stateClass: '' },
  { id: 'sensor', label: 'Sensor', pct: 0, displayValue: '00', stateClass: '' },
  { id: 'archive', label: 'Archive', pct: 12, displayValue: '12', stateClass: 'warn' },
  { id: 'codex', label: 'Codex', pct: 0, displayValue: '00', stateClass: '' },
  { id: 'mentor', label: 'Mentor', pct: 0, displayValue: '00', stateClass: '' },
  { id: 'session', label: 'Session', pct: 0, displayValue: '00', stateClass: '' },
];

const DEFAULT_BANKS = [
  { label: 'CORE-0', style: 'top:6%;left:6%;width:42%;height:24%;' },
  { label: 'CORE-1', style: 'top:6%;left:52%;width:42%;height:24%;' },
  { label: 'NPU', style: 'top:34%;left:6%;width:28%;height:24%;' },
  { label: 'GPU', style: 'top:34%;left:36%;width:28%;height:24%;' },
  { label: 'ISP', style: 'top:34%;left:66%;width:28%;height:24%;' },
  { label: 'RAM-A', style: 'top:62%;left:6%;width:18%;height:32%;' },
  { label: 'RAM-B', style: 'top:62%;left:26%;width:18%;height:32%;' },
  { label: 'CACHE', style: 'top:62%;left:46%;width:22%;height:32%;' },
  { label: 'IO', style: 'top:62%;left:70%;width:24%;height:32%;' },
];

function normalizeChannelPct(pct) {
  const safePct = Math.max(0, Math.min(100, Number(pct) || 0));
  if (safePct >= 80) return { pct: safePct, stateClass: 'ok' };
  if (safePct >= 30) return { pct: safePct, stateClass: 'warn' };
  if (safePct > 0) return { pct: safePct, stateClass: 'err' };
  return { pct: safePct, stateClass: '' };
}

function buildChannels(stage) {
  const stageChannels = stage?.channels || {};
  return DEFAULT_CHANNELS.map((channel) => {
    const rawPct = Object.prototype.hasOwnProperty.call(stageChannels, channel.id)
      ? stageChannels[channel.id]
      : channel.pct;
    const normalized = normalizeChannelPct(rawPct);
    return {
      ...channel,
      pct: normalized.pct,
      stateClass: normalized.stateClass,
      displayValue: normalized.pct >= 100 ? '100' : String(Math.round(normalized.pct)).padStart(2, '0'),
    };
  });
}

function buildChipBanks(stage) {
  const hotBanks = new Set(stage?.hotBanks || []);
  return DEFAULT_BANKS.map((bank) => ({
    ...bank,
    hot: hotBanks.has(bank.label),
    err: stage?.erroring === true && bank.label === 'CACHE',
  }));
}

function buildProgressSegments(progressPercent) {
  const litCount = Math.max(0, Math.min(ACTOR_SPLASH_V2_SEGMENT_COUNT, Math.floor((progressPercent / 100) * ACTOR_SPLASH_V2_SEGMENT_COUNT)));
  return Array.from({ length: ACTOR_SPLASH_V2_SEGMENT_COUNT }, (_, index) => ({
    active: index < litCount,
    leading: litCount > 0 && index === litCount - 1,
  }));
}

function buildProgressTicks() {
  return Array.from({ length: 11 }, (_, index) => {
    const value = index * 10;
    return {
      label: value === 0 ? '00' : String(value),
      major: value % 20 === 0,
    };
  });
}

function buildLogLines(upToStageIndex) {
  const logLines = [];
  for (let i = 0; i <= upToStageIndex; i += 1) {
    const stage = ACTOR_SPLASH_V2_STAGES[i];
    if (!stage) continue;
    for (const entry of stage.logs || []) {
      logLines.push({
        time: '00:00:00',
        tag: String(entry.tag || 'INFO').padEnd(4, ' '),
        tagClass: `tag-${String(entry.tag || 'INFO').toLowerCase()}`,
        text: entry.text,
      });
    }
  }
  return logLines.slice(-16);
}

function buildIdentityState(isComplete, sessionId) {
  return {
    showIdentity: isComplete,
    showRegister: isComplete,
    identity: {
      badge: '▸ AWAITING USER REGISTRATION',
      name: 'UNREGISTERED DEVICE',
      sub: 'First-time setup · Tap screen to enroll',
      meta: [
        { key: 'Session', value: sessionId || 'NEW-00000' },
        { key: 'Mentor', value: 'STANDBY' },
        { key: 'Archive', value: 'LIVE' },
        { key: 'Cert', value: 'GAMMA' },
      ],
    },
    registerMessage: '▸ Awaiting user registration',
    registerCta: 'Tap to enroll',
  };
}

function formatEta(stageIndex) {
  const remainingStages = Math.max(0, ACTOR_SPLASH_V2_BOOT_SEGMENTS - (stageIndex + 1));
  const seconds = Math.max(0, remainingStages * 2);
  return `0:${String(seconds).padStart(2, '0')}`;
}

export function buildActorSplashV2Context(options = {}) {
  const {
    stageIndex = 0,
    currentTime = '00:00 · UTC',
    localizedMode = false,
    glitchFire = false,
    sessionId = 'NEW-00000',
    isComplete = false,
  } = options;

  const safeStageIndex = Math.max(0, Math.min(ACTOR_SPLASH_V2_STAGES.length - 1, stageIndex));
  const stage = ACTOR_SPLASH_V2_STAGES[safeStageIndex];
  const progressPercent = Math.max(0, Math.min(100, Number(stage?.pct) || 0));
  const effectiveLocalizedMode = localizedMode === true || isComplete === true || progressPercent >= 100;
  const identityState = buildIdentityState(isComplete || progressPercent >= 100, sessionId);
  const lastTranslation = ACTOR_SPLASH_V2_STAGES.find((entry) => entry?.translation)?.translation || null;
  const translation = stage?.translation || ((effectiveLocalizedMode || safeStageIndex >= 6) ? lastTranslation : null);
  const translationComplete = Boolean(translation) && effectiveLocalizedMode;
  const translationTarget = translation?.englishTargetText || 'Welcome, new user. Registration protocols ready.';
  const translationSource = translationComplete
    ? ''
    : (translation?.aurebeshSourceText || 'WELCOME NEW USER. REGISTRATION PROTOCOLS READY.');

  return {
    introVariant: 'actor-v2',
    localizedMode: effectiveLocalizedMode,
    isComplete: isComplete || progressPercent >= 100,
    erroring: stage?.erroring === true,
    succeeding: stage?.greenWashOn === true,
    glitchFire: glitchFire || stage?.glitch === true,
    greenWashOn: stage?.greenWashOn === true,
    pixelTestOn: stage?.pixelTest === true,

    bezelLabel: 'DATAPAD // MK-VII · NEURAL-LINK READY',
    bezelSerial: 'SN 4471-THX-00827',
    bezelCertification: 'CEC-ID 3T · CLASS-B · DO NOT OPEN',
    bezelManufacturer: 'VERSA',

    showManufacturerCard: safeStageIndex === 0 && !isComplete,
    manufacturerTag: 'Versa Industries · A SubSpace Company',
    manufacturerLogo: 'VERSA',
    manufacturerVersion: 'VERSA-OS 13.4.2 · KERNEL 9.121 · FIRMWARE 7.22',
    manufacturerSubtag: 'First-time startup · please wait',

    hudTitle: 'PROGRESSION ENGINE // INIT',
    currentTime,
    signalBars: [{}, {}, {}, {}],
    batteryCells: [{}, {}, {}, {}, { empty: true }],
    bootStageTag: stage?.bootStageTag || 'BOOT',
    bootStageDotClass: stage?.bootStageDotClass || 'warn',

    channels: buildChannels(stage),
    capacitorPct: Math.max(0, Math.min(100, 10 + safeStageIndex * 12)),
    capacitorLabel: `${String(Math.max(0, Math.min(100, 10 + safeStageIndex * 12))).padStart(2, '0')}%`,
    chipBanks: buildChipBanks(stage),

    stageIndex: `${String(safeStageIndex + 1).padStart(2, '0')}/${String(ACTOR_SPLASH_V2_BOOT_SEGMENTS).padStart(2, '0')}`,
    stageName: stage?.label || 'BOOT',
    stageGlyph: stage?.glyph || '◉',
    progressPercent,
    progressSegments: buildProgressSegments(progressPercent),
    progressTicks: buildProgressTicks(),
    etaLabel: formatEta(safeStageIndex),
    currentTask: stage?.task || 'awaiting power',
    taskProgress: Math.max(0, Math.min(100, ((progressPercent % 12.5) / 12.5) * 100)),
    taskCount: `${safeStageIndex + 1} / ${ACTOR_SPLASH_V2_BOOT_SEGMENTS}`,
    coreGlyph: stage?.glyph || '◉',

    statusLabel: stage?.statusLabel || 'BOOT',
    statusMessage: stage?.statusMessage || '▸ FIRST-TIME STARTUP',
    statusClass: stage?.statusClass || '',
    statusSource: stage?.statusSource || '&lt;ign_0x3F · factory-default&gt;',

    isTranslating: Boolean(translation),
    translationComplete,
    translationLabel: translationComplete ? 'Basic translation' : 'Aurebesh translation',
    translationSource,
    translationTarget,
    translationDisplayTarget: translationComplete ? translationTarget : '',
    sourceMode: translationComplete ? 'basic' : 'aurebesh',

    logLines: buildLogLines(safeStageIndex),
    promptText: progressPercent >= 100 ? 'register --new-user' : 'tail -f /var/log/boot',
    rttLabel: safeStageIndex >= 3 ? '42 ms' : '—',
    thread: {
      tid: '0x7FF3 · chargen.init',
      cpu: `${12 + safeStageIndex * 6}%`,
      mem: `${48 + safeStageIndex * 10}M / 512M`,
      pkts: String((safeStageIndex + 1) * 6),
      warn: String(buildLogLines(safeStageIndex).filter((line) => line.tag.trim() === 'WARN').length),
      err: String(buildLogLines(safeStageIndex).filter((line) => line.tag.trim() === 'ERR').length),
    },

    ...identityState,
    bannerText: stage?.bannerText || '',
    bannerClass: stage?.bannerClass || '',
    skipLabel: 'Skip Boot',
    showGalacticProfile: true,
    galacticProfileLabel: 'Galactic Profile',
    galacticProfileTitle: 'Pick a packaged galactic profile instead of building from scratch.',
    continueLabel: isComplete || progressPercent >= 100 ? 'Begin Registration' : 'Begin Registration',
  };
}
