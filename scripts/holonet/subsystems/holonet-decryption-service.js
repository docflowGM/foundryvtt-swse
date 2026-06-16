/**
 * Holonet Decryption Service
 *
 * Foundry-safe adaptation of the user's standalone transmission decryption
 * prototype. The standalone draft used browser globals/localStorage; this module
 * stores puzzle state on the Secret Note metadata that already lives in the
 * Holonet record, so player attempts persist through the GM socket path.
 */

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const GLYPHS = [
  '<path d="M6 4v16M6 4h11M6 12h8"/><circle cx="18" cy="19" r="1.6"/>',
  '<path d="M5 5h14l-7 9zM12 14v6"/>',
  '<path d="M6 4v16M6 4h8a5 5 0 0 1 0 10H6"/>',
  '<path d="M4 12h16M8 6l-4 6 4 6M16 6l4 6-4 6"/>',
  '<path d="M6 4v16M6 4h12v9H6"/><circle cx="15" cy="18" r="1.6"/>',
  '<path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"/>',
  '<path d="M5 6h14M5 12h14M5 18h14M12 6v12"/>',
  '<path d="M5 5l14 14M19 5L5 19"/><circle cx="12" cy="12" r="3.2"/>',
  '<path d="M12 4v16"/><circle cx="12" cy="8" r="3"/><path d="M7 20h10"/>',
  '<path d="M5 4l7 8-7 8M19 4l-7 8 7 8"/>',
  '<path d="M6 5v14h12M6 12h9"/><circle cx="17" cy="6" r="1.6"/>',
  '<path d="M12 3l8 6-8 12-8-12z"/><path d="M12 9v8"/>',
  '<path d="M4 6l8 4 8-4M4 6v12l8 4 8-4V6"/>',
  '<path d="M6 4v16M18 4v16M6 9l12 6M6 15l12-6"/>',
  '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16"/>',
  '<path d="M5 19l7-15 7 15M8 13h8"/>',
  '<path d="M6 6h12v12H6zM6 6l12 12"/>',
  '<path d="M12 4v16M6 7l6-3 6 3M6 17l6 3 6-3"/><circle cx="12" cy="12" r="2.4"/>',
  '<path d="M5 5c8 0 8 14 0 14M19 5c-8 0-8 14 0 14"/>',
  '<path d="M4 9h16M9 4v16M15 4v16"/>',
  '<path d="M12 3l9 18H3z"/><circle cx="12" cy="15" r="1.8"/>',
  '<path d="M5 5l7 7 7-7M12 12v8"/><path d="M8 20h8"/>',
  '<path d="M5 4v16h14M19 4L9 14"/>',
  '<path d="M6 6l6 6 6-6M6 18l6-6 6 6"/>',
  '<path d="M12 4a8 8 0 1 0 0 16 5 5 0 0 1 0-10 3 3 0 0 0 0 6"/>',
  '<path d="M4 4h7v7H4zM13 13h7v7h-7zM11 4h2v16M4 11h16"/>'
];

const SKILL_LABELS = Object.freeze({
  useComputer: 'Use Computer',
  mechanics: 'Mechanics',
  knowledgeTechnology: 'Knowledge (Technology)',
  gatherInformation: 'Gather Information',
  perception: 'Perception',
  useTheForce: 'Use the Force',
  intelligence: 'Intelligence Check'
});

const DEFAULT_SKILLS = ['useComputer', 'mechanics', 'knowledgeTechnology'];

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 18);
}

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanNumber(value, fallback = 0, min = -999, max = 999) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function clamp01(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function clonePlain(value, fallback = {}) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value ?? fallback);
  } catch (_err) {
    // Fall through to JSON clone.
  }
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (_err) {
    return fallback;
  }
}

function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function glyphHtml(index) {
  const inner = GLYPHS[Math.abs(cleanNumber(index, 0, 0, GLYPHS.length - 1)) % GLYPHS.length] ?? GLYPHS[0];
  return `<svg class="dx-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function seedFrom(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function levelParams(level) {
  const L = Math.max(1, Math.min(35, cleanNumber(level, 12, 1, 35)));
  const t = (L - 1) / 34;
  const mode = L < 6 ? 'caesar' : 'sub';
  return {
    level: L,
    mode,
    glyphs: L >= 10,
    transpose: L >= 24,
    transposeKey: L >= 24 ? (3 + (L % 5)) : 0,
    preRevealFrac: Math.max(0, 0.8 - (t * 0.8)),
    dc: Math.round(10 + (t * 25)),
    label: L <= 5 ? 'Trivial cipher' : L <= 12 ? 'Standard encryption' : L <= 22 ? 'Military-grade' : L <= 30 ? 'Sith / Imperial cipher' : 'Black-vault encryption'
  };
}

function buildKey(opts, rng) {
  const map = {};
  const mode = cleanString(opts.mode, 'sub');
  if (mode === 'caesar') {
    const shift = ((cleanNumber(opts.shift, 3, -25, 25) % 26) + 26) % 26;
    ALPHA.forEach((plain, i) => { map[plain] = ALPHA[(i + shift) % 26]; });
    return map;
  }
  const cipher = shuffle(ALPHA.slice(), rng);
  ALPHA.forEach((plain, i) => { map[plain] = cipher[i]; });
  return map;
}

function inverseMap(map) {
  const out = {};
  Object.entries(map).forEach(([plain, cipher]) => { out[cipher] = plain; });
  return out;
}

function transposeWord(word, key) {
  if (!key || word.length < 3) return { text: word, order: word.split('').map((_, i) => i) };
  const cols = Math.max(2, (key % (word.length - 1)) + 2);
  const rows = Math.ceil(word.length / cols);
  let text = '';
  const order = [];
  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const idx = (r * cols) + c;
      if (idx < word.length) {
        text += word[idx];
        order.push(idx);
      }
    }
  }
  return { text, order };
}

function encrypt(plaintext, options = {}) {
  const level = cleanNumber(options.level, 12, 1, 35);
  const params = levelParams(level);
  const mode = cleanString(options.mode, params.mode);
  const seed = cleanString(options.seed, `SWSE-${String(plaintext || '').length}-${level}-${mode}-${options.shift ?? ''}`);
  const rng = mulberry32(seedFrom(seed));
  const key = buildKey({ mode, shift: options.shift ?? 3 }, rng);
  const inverse = inverseMap(key);
  const useGlyphs = options.glyphs ?? params.glyphs;
  const doTranspose = options.transpose ?? params.transpose;
  const transposeKey = cleanNumber(options.transposeKey ?? params.transposeKey, params.transposeKey, 0, 25);
  const glyphMap = {};
  const glyphIndexes = shuffle([...Array(GLYPHS.length).keys()], rng);
  ALPHA.forEach((c, i) => { glyphMap[c] = glyphIndexes[i % glyphIndexes.length]; });

  const upper = cleanString(plaintext).toUpperCase();
  const words = upper.split(/(\s+|[^A-Z\s]+)/).filter(Boolean);
  const tokens = words.map((word) => {
    if (!/[A-Z]/.test(word)) return { type: 'sep', text: word };
    let cipher = word.split('').map(ch => key[ch] || ch).join('');
    let order = cipher.split('').map((_, i) => i);
    if (doTranspose) {
      const transposed = transposeWord(cipher, transposeKey);
      cipher = transposed.text;
      order = transposed.order;
    }
    return {
      type: 'word',
      cells: cipher.split('').map((cipherLetter, idx) => ({
        cipher: cipherLetter,
        glyph: useGlyphs ? glyphMap[cipherLetter] : null,
        plain: inverse[cipherLetter] || cipherLetter,
        origIndex: order[idx]
      }))
    };
  });
  const solution = {};
  Object.entries(key).forEach(([plain, cipher]) => { solution[cipher] = plain; });
  return { plaintext: upper, seed, level, mode, useGlyphs, doTranspose, transposeKey, key, solution, tokens, glyphMap };
}

function distinctCipherLetters(payload) {
  const seen = new Set();
  for (const token of payload?.tokens ?? []) {
    if (token?.type !== 'word') continue;
    for (const cell of token.cells ?? []) if (cell.cipher) seen.add(cell.cipher);
  }
  return [...seen];
}

function frequencyOfUnknown(payload, knownSet) {
  const freq = {};
  for (const token of payload?.tokens ?? []) {
    if (token?.type !== 'word') continue;
    for (const cell of token.cells ?? []) {
      if (!cell?.cipher || knownSet.has(cell.cipher)) continue;
      freq[cell.cipher] = (freq[cell.cipher] || 0) + 1;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1]);
}

function isSolved(payload) {
  if (!payload?.enabled) return false;
  const known = new Set(payload.knownCipherLetters ?? []);
  const distinct = distinctCipherLetters(payload);
  return Boolean(payload.structuralDone !== false && distinct.length && distinct.every(letter => known.has(letter)));
}

function isFailed(payload) {
  if (!payload?.enabled || !payload.failEnabled) return false;
  if (payload.failType === 'trace') return cleanNumber(payload.trace, 0, 0, 100) >= cleanNumber(payload.traceMax, 10, 1, 100);
  return cleanNumber(payload.attemptsUsed, 0, 0, 100) >= cleanNumber(payload.attempts, 6, 1, 100);
}

function actorSkillMod(actor, skillKey) {
  const key = cleanString(skillKey);
  if (!actor || !key) return 0;
  const derived = actor.system?.derived?.skills?.[key]?.total;
  if (Number.isFinite(Number(derived))) return Number(derived);
  const direct = actor.system?.skills?.[key]?.total ?? actor.system?.skills?.[key]?.value;
  if (Number.isFinite(Number(direct))) return Number(direct);
  if (key === 'intelligence') {
    const mod = actor.system?.abilities?.int?.mod ?? actor.system?.attributes?.int?.mod ?? actor.system?.abilities?.int?.modifier;
    if (Number.isFinite(Number(mod))) return Number(mod);
  }
  return 0;
}

function normalizeSkills(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',');
  const clean = raw.map(part => cleanString(part)).filter(Boolean);
  return clean.length ? Array.from(new Set(clean)) : [...DEFAULT_SKILLS];
}

function decryptedText(payload) {
  return cleanString(payload?.plaintext || payload?.fullBody || payload?.body);
}

export class HolonetDecryptionService {
  static get glyphs() { return GLYPHS; }
  static get skillLabels() { return SKILL_LABELS; }

  static levelParams(level) { return levelParams(level); }

  static buildPayload({ title = '', body = '', fullBody = '', redactedBody = '', publicBody = '', level = 12, mode = '', shift = 3, glyphs = null, transpose = null, dc = null, preRevealFrac = null, failEnabled = true, failType = 'attempts', attempts = 6, traceMax = 10, skills = null, sourceIntelId = '', linkedFactionId = '', linkedContactId = '', lockbox = null } = {}) {
    const plaintext = cleanString(fullBody || body || publicBody || redactedBody);
    if (!plaintext) return null;
    const params = levelParams(level);
    const config = {
      level: params.level,
      mode: cleanString(mode, params.mode),
      shift: cleanNumber(shift, 3, -25, 25),
      glyphs: glyphs ?? params.glyphs,
      transpose: transpose ?? params.transpose,
      transposeKey: params.transposeKey,
      seed: `SWSE-DEC-${randomId()}-${plaintext.length}-${params.level}`
    };
    const puzzle = encrypt(plaintext, config);
    const distinct = distinctCipherLetters(puzzle);
    const nReveal = Math.round(distinct.length * clamp01(preRevealFrac, params.preRevealFrac));
    const rng = mulberry32(seedFrom(`${config.seed}-pre`));
    const knownCipherLetters = shuffle(distinct.slice(), rng).slice(0, nReveal);
    const encryptedPreview = puzzle.tokens.map(token => {
      if (token.type === 'sep') return token.text;
      return token.cells.map(cell => puzzle.useGlyphs ? `#${cell.glyph}` : cell.cipher).join('');
    }).join('');
    return {
      enabled: true,
      version: 1,
      id: randomId(),
      title: cleanString(title, 'Encrypted Transmission'),
      plaintext: puzzle.plaintext,
      encryptedPreview,
      level: params.level,
      levelLabel: params.label,
      dc: cleanNumber(dc ?? params.dc, params.dc, 0, 100),
      mode: puzzle.mode,
      useGlyphs: Boolean(puzzle.useGlyphs),
      transpose: Boolean(puzzle.doTranspose),
      transposeKey: puzzle.transposeKey,
      seed: puzzle.seed,
      tokens: puzzle.tokens,
      solution: puzzle.solution,
      glyphMap: puzzle.glyphMap,
      knownCipherLetters,
      guesses: {},
      attemptsUsed: 0,
      trace: 0,
      structuralDone: !puzzle.doTranspose,
      solved: false,
      failed: false,
      failEnabled: Boolean(failEnabled),
      failType: cleanString(failType) === 'trace' ? 'trace' : 'attempts',
      attempts: cleanNumber(attempts, 6, 1, 30),
      traceMax: cleanNumber(traceMax, 10, 1, 30),
      skills: normalizeSkills(skills),
      sourceIntelId: cleanString(sourceIntelId),
      linkedFactionId: cleanString(linkedFactionId),
      linkedContactId: cleanString(linkedContactId),
      lockbox: lockbox && typeof lockbox === 'object' ? clonePlain(lockbox, null) : null,
      log: [],
      createdAt: nowIso(),
      solvedAt: null,
      failedAt: null,
      lastAttemptAt: null,
      lastAttemptByUserId: null
    };
  }

  static clonePayload(payload) {
    return clonePlain(payload, null);
  }

  static toViewModel(payload = null, { actor = null, isGm = false } = {}) {
    if (!payload?.enabled) return null;
    const known = new Set(payload.knownCipherLetters ?? []);
    const distinct = distinctCipherLetters(payload);
    const cracked = distinct.filter(letter => known.has(letter)).length;
    const percent = distinct.length ? Math.round((cracked / distinct.length) * 100) : 0;
    const solved = Boolean(payload.solved || isSolved(payload));
    const failed = Boolean(payload.failed || isFailed(payload));
    const locked = !solved && !failed;
    const frequency = frequencyOfUnknown(payload, known).slice(0, 10).map(([letter, count]) => ({
      cipher: letter,
      glyphHtml: payload.useGlyphs ? glyphHtml(payload.glyphMap?.[letter] ?? 0) : escapeHtml(letter),
      count
    }));
    const tokens = (payload.tokens ?? []).map((token, tokenIndex) => {
      if (token?.type === 'sep') return { type: 'sep', text: token.text === ' ' ? '' : token.text, isBreak: /\n/.test(token.text || '') };
      return {
        type: 'word',
        tokenIndex,
        cells: (token.cells ?? []).map((cell, cellIndex) => {
          const revealed = known.has(cell.cipher) || solved || isGm;
          return {
            key: `${tokenIndex}-${cellIndex}`,
            cipher: cell.cipher,
            glyphHtml: payload.useGlyphs ? glyphHtml(cell.glyph ?? payload.glyphMap?.[cell.cipher] ?? 0) : escapeHtml(cell.cipher),
            plain: revealed ? escapeHtml(cell.plain) : '',
            isKnown: revealed
          };
        })
      };
    });
    const skills = normalizeSkills(payload.skills).map(key => ({
      key,
      label: SKILL_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
      mod: actorSkillMod(actor, key),
      disabled: !locked
    }));
    const remaining = payload.failType === 'trace'
      ? Math.max(0, cleanNumber(payload.traceMax, 10, 1, 100) - cleanNumber(payload.trace, 0, 0, 100))
      : Math.max(0, cleanNumber(payload.attempts, 6, 1, 100) - cleanNumber(payload.attemptsUsed, 0, 0, 100));
    return {
      enabled: true,
      id: payload.id,
      title: cleanString(payload.title, 'Encrypted Transmission'),
      level: cleanNumber(payload.level, 12, 1, 35),
      levelLabel: cleanString(payload.levelLabel, levelParams(payload.level).label),
      dc: cleanNumber(payload.dc, 15, 0, 100),
      percent,
      cracked,
      total: distinct.length,
      solved,
      failed,
      locked,
      useGlyphs: Boolean(payload.useGlyphs),
      transpose: Boolean(payload.transpose),
      structuralDone: payload.structuralDone !== false,
      encryptedPreview: cleanString(payload.encryptedPreview),
      tokens,
      frequency,
      skills,
      failEnabled: Boolean(payload.failEnabled),
      failType: cleanString(payload.failType, 'attempts'),
      attemptsUsed: cleanNumber(payload.attemptsUsed, 0, 0, 100),
      attempts: cleanNumber(payload.attempts, 6, 1, 100),
      trace: cleanNumber(payload.trace, 0, 0, 100),
      traceMax: cleanNumber(payload.traceMax, 10, 1, 100),
      remaining,
      log: (payload.log ?? []).slice(0, 8).map(entry => ({
        text: cleanString(entry.text),
        cls: cleanString(entry.cls, 'info'),
        createdAt: cleanString(entry.createdAt)
      })),
      decryptedText: solved || isGm ? decryptedText(payload) : '',
      canAttempt: locked,
      canForceOpen: isGm
    };
  }

  static attempt(payload = null, { actor = null, skillKey = 'useComputer', requesterId = null } = {}) {
    const next = this.clonePayload(payload);
    if (!next?.enabled) return { ok: false, payload: next, reason: 'missing-puzzle' };
    if (next.solved || isSolved(next)) {
      next.solved = true;
      return { ok: true, payload: next, alreadySolved: true };
    }
    if (next.failed || isFailed(next)) {
      next.failed = true;
      return { ok: false, payload: next, failed: true, reason: 'failed' };
    }
    const skill = cleanString(skillKey, 'useComputer');
    const mod = actorSkillMod(actor, skill);
    const die = 1 + Math.floor(Math.random() * 20);
    const total = die + mod;
    const dc = cleanNumber(next.dc, 15, 0, 100);
    const margin = total - dc;
    const known = new Set(next.knownCipherLetters ?? []);
    const logEntry = { cls: 'info', text: '', createdAt: nowIso() };
    let revealed = [];

    if (margin >= 0) {
      if (next.transpose && next.structuralDone === false) {
        next.structuralDone = true;
        logEntry.cls = 'ok';
        logEntry.text = `${SKILL_LABELS[skill] || skill}: ${die}+${mod}=${total} vs DC ${dc}. Datastream realigned.`;
      } else {
        const revealCount = margin >= 10 ? 2 : 1;
        const queue = frequencyOfUnknown(next, known).map(([letter]) => letter);
        for (let i = 0; i < revealCount && i < queue.length; i += 1) {
          known.add(queue[i]);
          revealed.push(next.solution?.[queue[i]] || queue[i]);
        }
        next.knownCipherLetters = [...known];
        logEntry.cls = 'ok';
        logEntry.text = `${SKILL_LABELS[skill] || skill}: ${die}+${mod}=${total} vs DC ${dc}. Cracked ${revealed.join(', ') || 'signal noise'}.`;
      }
    } else {
      if (next.failEnabled) {
        if (next.failType === 'trace') next.trace = cleanNumber(next.trace, 0, 0, 100) + 1;
        else next.attemptsUsed = cleanNumber(next.attemptsUsed, 0, 0, 100) + 1;
      }
      logEntry.cls = 'fail';
      logEntry.text = `${SKILL_LABELS[skill] || skill}: ${die}+${mod}=${total} vs DC ${dc}. Decryption failed.`;
    }

    next.log = [logEntry, ...(next.log ?? [])].slice(0, 30);
    next.lastAttemptAt = nowIso();
    next.lastAttemptByUserId = cleanString(requesterId ?? globalThis.game?.user?.id);
    if (isSolved(next)) {
      next.solved = true;
      next.solvedAt = nowIso();
      next.log.unshift({ cls: 'ok', text: 'Transmission fully decrypted.', createdAt: nowIso() });
    } else if (isFailed(next)) {
      next.failed = true;
      next.failedAt = nowIso();
      next.log.unshift({ cls: 'fail', text: 'Encryption lockout triggered.', createdAt: nowIso() });
    }
    return { ok: true, payload: next, die, total, margin, revealed, solved: next.solved, failed: next.failed };
  }
}
