import { DejarikEngine } from './dejarik-engine.js';
import { dejarikRulesModeLabel, legalAttackTargets, legalMoveSpaceIds, normalizeDejarikRulesMode } from './dejarik-rules.js';
import { DejarikAi, buildDejarikAiProfile } from './dejarik-ai.js';
import { DEJARIK_PIECES } from './dejarik-pieces.js';

function formatTime(value) { try { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; } catch (_err) { return ''; } }
function playableSeats(session = {}) { return (Array.isArray(session.seats) ? session.seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status)); }
function seatName(session, seatId) { return playableSeats(session).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }

function pieceInitials(label = '') {
  return String(label || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

function detailAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const DEJARIK_RAY_COUNT = 8;
const DEJARIK_RING_BANDS = [
  { ring: 1, inner: 7.6, outer: 18.4, token: 13 },
  { ring: 2, inner: 18.4, outer: 31.2, token: 26 },
  { ring: 3, inner: 31.2, outer: 43.8, token: 38 },
  { ring: 4, inner: 43.8, outer: 49.0, token: 48 }
];
const DEJARIK_HUB_RADIUS = 7.6;
const DEJARIK_OUTER_RADIUS = DEJARIK_RING_BANDS[DEJARIK_RING_BANDS.length - 1].outer;

function clampRing(value) { return Math.max(1, Math.min(DEJARIK_RING_BANDS.length, Number(value || 1))); }
function clampRay(value) { return ((Math.floor(Number(value || 0)) % DEJARIK_RAY_COUNT) + DEJARIK_RAY_COUNT) % DEJARIK_RAY_COUNT; }
function angleForRayBoundary(rayBoundary = 0) { return (-Math.PI / 2) + ((Math.PI * 2) * (rayBoundary / DEJARIK_RAY_COUNT)); }
function pointAt(radius, angle) { return { x: 50 + (Math.cos(angle) * radius), y: 50 + (Math.sin(angle) * radius) }; }
function fmt(value) { return Number(value).toFixed(2); }

function boardSpaceGeometry(space = {}) {
  const ring = clampRing(space.ring);
  const ray = clampRay(space.ray);
  const band = DEJARIK_RING_BANDS[ring - 1] || DEJARIK_RING_BANDS[0];
  const angle = angleForRayBoundary(ray);
  const tokenPoint = pointAt(band.token, angle);
  const start = angleForRayBoundary(ray - 0.5);
  const end = angleForRayBoundary(ray + 0.5);
  const outerA = pointAt(band.outer, start);
  const outerB = pointAt(band.outer, end);
  const innerB = pointAt(band.inner, end);
  const innerA = pointAt(band.inner, start);
  const largeArc = 0;
  const path = [
    `M ${fmt(innerA.x)} ${fmt(innerA.y)}`,
    `L ${fmt(outerA.x)} ${fmt(outerA.y)}`,
    `A ${fmt(band.outer)} ${fmt(band.outer)} 0 ${largeArc} 1 ${fmt(outerB.x)} ${fmt(outerB.y)}`,
    `L ${fmt(innerB.x)} ${fmt(innerB.y)}`,
    `A ${fmt(band.inner)} ${fmt(band.inner)} 0 ${largeArc} 0 ${fmt(innerA.x)} ${fmt(innerA.y)}`,
    'Z'
  ].join(' ');
  return {
    x: Number(tokenPoint.x.toFixed(2)),
    y: Number(tokenPoint.y.toFixed(2)),
    style: `--dej-x: ${tokenPoint.x.toFixed(2)}%; --dej-y: ${tokenPoint.y.toFixed(2)}%;`,
    path,
    parityClass: (ring + ray) % 2 ? 'is-odd' : 'is-even',
    ringClass: `ring-${ring}`,
    rayClass: `ray-${ray}`
  };
}

function spaceCoordinates(space = {}) {
  const geometry = boardSpaceGeometry(space);
  return { x: geometry.x, y: geometry.y, style: geometry.style };
}

function boardRingsVm() {
  return DEJARIK_RING_BANDS.map(band => ({ ring: band.ring, radius: fmt(band.outer) }));
}

function boardRaysVm() {
  return Array.from({ length: DEJARIK_RAY_COUNT }, (_value, ray) => {
    const angle = angleForRayBoundary(ray + 0.5);
    const inner = pointAt(DEJARIK_HUB_RADIUS, angle);
    const outer = pointAt(DEJARIK_OUTER_RADIUS, angle);
    return { ray, x1: fmt(inner.x), y1: fmt(inner.y), x2: fmt(outer.x), y2: fmt(outer.y) };
  });
}

function pieceVm(piece = {}, session, state, viewerSeatId) {
  const isViewerPiece = piece.ownerSeatId === viewerSeatId;
  const attackTargets = legalAttackTargets(state, piece).map(enemy => ({
    id: enemy.id,
    spaceId: enemy.spaceId,
    label: `${enemy.label} (${enemy.hp}/${enemy.maxHp})`
  }));
  const moveSpaceIds = legalMoveSpaceIds(state, piece);
  const moveOptions = moveSpaceIds.map(id => ({ id, label: id }));
  const abilityLabel = piece.abilityLabel || piece.ability || 'Tactic';
  const abilityDescription = piece.abilityDescription || '';
  const hpLabel = `${piece.hp}/${piece.maxHp}`;
  const attackLabel = String(piece.atk ?? piece.attack ?? '—');
  const movementLabel = String(piece.mov ?? piece.movement ?? '—');
  const reachLabel = String(piece.rng ?? '1');
  const detailLine = `HP ${hpLabel} · Attack ${attackLabel} · Movement ${movementLabel} · Reach ${reachLabel} · Ability ${abilityLabel}`;
  const tacticalSummary = `${moveOptions.length} legal move${moveOptions.length === 1 ? '' : 's'} · ${attackTargets.length} attack target${attackTargets.length === 1 ? '' : 's'}`;
  const miniDetail = {
    name: piece.label || 'Unknown Holomonster',
    hp: hpLabel,
    attack: attackLabel,
    movement: movementLabel,
    reach: reachLabel,
    ability: abilityLabel,
    abilityDescription
  };
  const detailJsonAttr = detailAttr(JSON.stringify(miniDetail));
  return {
    ...piece,
    shortLabel: pieceInitials(piece.label),
    image: piece.image || '',
    hasImage: Boolean(piece.image),
    abilityLabel,
    abilityDescription,
    ownerLabel: seatName(session, piece.ownerSeatId),
    hpLabel,
    hpPct: Math.max(0, Math.min(100, Math.round((Number(piece.hp || 0) / Math.max(1, Number(piece.maxHp || 1))) * 100))),
    isViewerPiece,
    isEnemyPiece: Boolean(viewerSeatId && piece.ownerSeatId !== viewerSeatId),
    sessionId: session.id,
    seatId: viewerSeatId,
    defeated: Boolean(piece.defeated),
    wounded: !piece.defeated && Number(piece.hp || 0) <= Math.ceil(Number(piece.maxHp || 1) / 2),
    tokenStateClass: piece.defeated ? 'is-defeated' : (Number(piece.hp || 0) <= Math.ceil(Number(piece.maxHp || 1) / 2) ? 'is-wounded' : 'is-ready'),
    canSelect: isViewerPiece && state.activeSeatId === viewerSeatId && !piece.defeated,
    targetOptions: attackTargets,
    detailLine,
    tacticalSummary,
    attackTargetsAttr: attackTargets.map(target => `${target.spaceId}:${target.id}`).join(' '),
    attackSpacesAttr: attackTargets.map(target => target.spaceId).join(' '),
    detailJsonAttr,
    miniDetail,
    attackLabel,
    movementLabel,
    reachLabel,
    hasTargets: attackTargets.length > 0,
    moveOptions,
    moveSpacesAttr: moveSpaceIds.join(' '),
    hasMoveOptions: moveOptions.length > 0
  };
}


function monsterCatalogVm(state = {}) {
  const selected = new Set((state.draft?.selectedMonsterIds || []).map(String));
  const allowed = new Set((state.draft?.allowedMonsterIds || DEJARIK_PIECES.map(piece => piece.id)).map(String));
  const full = selected.size >= 4;
  return DEJARIK_PIECES.filter(piece => allowed.has(piece.id)).map(piece => ({
    id: piece.id,
    label: piece.label,
    name: piece.label,
    shortLabel: pieceInitials(piece.label),
    hp: piece.hp,
    atk: piece.atk,
    attack: piece.atk,
    mov: piece.mov,
    movement: piece.mov,
    rng: piece.rng,
    reach: piece.rng,
    ability: piece.ability,
    abilityLabel: piece.abilityLabel || piece.ability || 'Tactic',
    abilityDescription: piece.abilityDescription || '',
    selected: selected.has(piece.id),
    disabled: full && !selected.has(piece.id),
    cssClass: `${selected.has(piece.id) ? 'is-selected' : ''} ${full && !selected.has(piece.id) ? 'is-disabled' : ''}`.trim()
  }));
}

export class DejarikViewModel {
  static build({ session, actor, participantId } = {}) {
    const state = DejarikEngine.getState(session);
    const currentSeat = DejarikEngine.findSeatForActor(session, actor, participantId);
    const viewerSeatId = currentSeat?.seatId || null;
    const pieces = Object.values(state.pieces || {}).map(piece => pieceVm(piece, session, state, viewerSeatId));
    return {
      id: session.id,
      title: session.title,
      phase: state.phase,
      statusLabel: state.statusLabel || state.phase,
      message: state.message || '',
      rulesMode: normalizeDejarikRulesMode(state.rulesMode),
      rulesModeLabel: dejarikRulesModeLabel(state.rulesMode),
      actionModel: state.actionModel || 'single-action',
      actionModelLabel: state.actionModel === 'classic-two-action-foundation' ? 'Classic contest foundation' : (state.actionModel === 'move-then-attack' ? 'Move + Attack' : 'Single Action'),
      currentSeatId: viewerSeatId,
      activeSeatLabel: state.activeSeatId ? seatName(session, state.activeSeatId) : '',
      winnerLabel: state.winnerSeatId ? seatName(session, state.winnerSeatId) : '',
      canCancel: Boolean(currentSeat && !['complete', 'cancelled'].includes(state.phase)),
      showDraft: state.phase === 'draft',
      showSetup: state.phase === 'draft',
      showPlaying: state.phase === 'playing',
      showComplete: state.phase === 'complete',
      canRematch: Boolean(currentSeat && state.phase === 'complete'),
      draft: (() => {
        const catalog = monsterCatalogVm(state);
        const selectedMonsterIds = (state.draft?.selectedMonsterIds || []).map(String);
        const selectedMonsterCards = catalog.filter(card => selectedMonsterIds.includes(card.id));
        const requiredCount = Number(state.draft?.requiredCount || 4);
        return {
          requiredCount,
          selectedMonsterIds,
          selectedMonsterCards,
          selectedCount: selectedMonsterIds.length,
          selectedCountLabel: `${selectedMonsterIds.length}/${requiredCount}`,
          canDeploy: Boolean(currentSeat && state.phase === 'draft' && selectedMonsterIds.length === requiredCount),
          monsterCatalog: catalog,
          hasSelected: selectedMonsterIds.length > 0
        };
      })(),
      seats: playableSeats(session).map(seat => {
        const isAi = seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
        const aiProfile = buildDejarikAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium');
        return { seatId: seat.seatId, displayName: seat.displayName, isViewer: seat.seatId === viewerSeatId, isCurrent: seat.seatId === state.activeSeatId, isAi, aiDifficultyLabel: isAi ? DejarikAi.labelForDifficulty(aiProfile.difficulty) : '', aiProfileLabel: isAi ? `${DejarikAi.labelForDifficulty(aiProfile.difficulty)} · ${aiProfile.fairness || 'fair'} · ${aiProfile.personality || 'methodical'}` : '', profession: seat.profession || '', tableFact: seat.tableFact || '' };
      }),
      pieces,
      aiProfiles: playableSeats(session).filter(seat => seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile).map(seat => { const profile = buildDejarikAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium'); return { label: seat.displayName || 'AI Opponent', profileLabel: `${DejarikAi.labelForDifficulty(profile.difficulty)} · ${profile.fairness || 'fair'} · ${profile.personality || 'methodical'}`, profession: seat.profession || '', tableFact: seat.tableFact || '' }; }),
      hasAiProfiles: playableSeats(session).some(seat => seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile),
      viewerPieces: pieces.filter(piece => piece.isViewerPiece && !piece.defeated),
      enemyPieces: pieces.filter(piece => piece.isEnemyPiece),
      hasEnemyPieces: pieces.some(piece => piece.isEnemyPiece),
      canAct: Boolean(viewerSeatId && state.phase === 'playing' && state.activeSeatId === viewerSeatId),
      boardHubRadius: fmt(DEJARIK_HUB_RADIUS),
      boardRings: boardRingsVm(),
      boardRays: boardRaysVm(),
      boardSpaces: (state.board || []).map(space => {
        const geometry = boardSpaceGeometry(space);
        const piece = pieces.find(entry => entry.spaceId === space.id && !entry.defeated) || null;
        return {
          ...space,
          ...geometry,
          piece,
          hasPiece: Boolean(piece),
          hasViewerPiece: Boolean(piece?.isViewerPiece),
          hasEnemyPiece: Boolean(piece?.isEnemyPiece),
          canSelectPiece: Boolean(piece?.canSelect)
        };
      }),
      eventLog: (state.eventLog || []).map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean((state.eventLog || []).length)
    };
  }
}
