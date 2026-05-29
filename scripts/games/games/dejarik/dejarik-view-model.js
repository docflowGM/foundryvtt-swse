import { DejarikEngine } from './dejarik-engine.js';
import { legalAttackTargets, legalMoveSpaceIds } from './dejarik-rules.js';
import { DEJARIK_RAYS, DEJARIK_RINGS } from './dejarik-board.js';
import { DejarikAi, buildDejarikAiProfile } from './dejarik-ai.js';

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

const SVG_CENTER = 50;
const SVG_MAX_RADIUS = 47.2;
const SVG_HUB_RADIUS = 8.2;
const SVG_RING_STEP = (SVG_MAX_RADIUS - SVG_HUB_RADIUS) / Math.max(1, DEJARIK_RINGS);

function polarPoint(radius, angleRadians) {
  const x = SVG_CENTER + (Math.cos(angleRadians) * radius);
  const y = SVG_CENTER + (Math.sin(angleRadians) * radius);
  return { x, y, label: `${x.toFixed(2)} ${y.toFixed(2)}` };
}

function rayAngle(ray = 0, offset = 0) {
  const degrees = -90 + (((Number(ray || 0) + offset) * 360) / Math.max(1, DEJARIK_RAYS));
  return (degrees * Math.PI) / 180;
}

function ringBand(ring = 1, radialPad = 0) {
  const index = Math.max(1, Math.min(DEJARIK_RINGS, Number(ring || 1)));
  const inner = SVG_HUB_RADIUS + ((index - 1) * SVG_RING_STEP) + radialPad;
  const outer = SVG_HUB_RADIUS + (index * SVG_RING_STEP) - radialPad;
  return { inner, outer };
}

function spaceCoordinates(space = {}) {
  const ring = Math.max(1, Math.min(DEJARIK_RINGS, Number(space.ring || 1)));
  const ray = Math.max(0, Math.min(DEJARIK_RAYS - 1, Number(space.ray || 0)));
  const { inner, outer } = ringBand(ring, 0);
  const radius = (inner + outer) / 2;
  const angle = rayAngle(ray, 0.5);
  const x = SVG_CENTER + (Math.cos(angle) * radius);
  const y = SVG_CENTER + (Math.sin(angle) * radius);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), style: `--dej-x: ${x.toFixed(2)}%; --dej-y: ${y.toFixed(2)}%;` };
}

function spacePath(space = {}, inset = 0) {
  const ring = Math.max(1, Math.min(DEJARIK_RINGS, Number(space.ring || 1)));
  const ray = Math.max(0, Math.min(DEJARIK_RAYS - 1, Number(space.ray || 0)));
  const rayPad = 0.025 + Number(inset || 0);
  const { inner, outer } = ringBand(ring, 0.35 + (Number(inset || 0) * 5));
  const a0 = rayAngle(ray, rayPad);
  const a1 = rayAngle(ray + 1, -rayPad);
  const innerStart = polarPoint(inner, a0);
  const outerStart = polarPoint(outer, a0);
  const outerEnd = polarPoint(outer, a1);
  const innerEnd = polarPoint(inner, a1);
  return `M ${innerStart.label} L ${outerStart.label} A ${outer.toFixed(2)} ${outer.toFixed(2)} 0 0 1 ${outerEnd.label} L ${innerEnd.label} A ${inner.toFixed(2)} ${inner.toFixed(2)} 0 0 0 ${innerStart.label} Z`;
}

function boardRings() {
  const rings = [];
  for (let ring = 1; ring <= DEJARIK_RINGS; ring += 1) {
    rings.push({ ring, radius: Number((SVG_HUB_RADIUS + (ring * SVG_RING_STEP)).toFixed(2)) });
  }
  return rings;
}

function boardRays() {
  const rays = [];
  for (let ray = 0; ray < DEJARIK_RAYS; ray += 1) {
    const a = rayAngle(ray, 0);
    const start = polarPoint(SVG_HUB_RADIUS, a);
    const end = polarPoint(SVG_MAX_RADIUS + 1.4, a);
    rays.push({ ray, x1: start.x.toFixed(2), y1: start.y.toFixed(2), x2: end.x.toFixed(2), y2: end.y.toFixed(2) });
  }
  return rays;
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
  return {
    ...piece,
    shortLabel: pieceInitials(piece.label),
    image: piece.image || '',
    hasImage: Boolean(piece.image),
    abilityLabel: piece.abilityLabel || piece.ability || 'Tactic',
    abilityDescription: piece.abilityDescription || '',
    ownerLabel: seatName(session, piece.ownerSeatId),
    hpLabel: `${piece.hp}/${piece.maxHp}`,
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
    detailLine: `HP ${piece.hp}/${piece.maxHp} · ATK ${piece.atk} · RNG ${piece.rng} · MOV ${piece.mov}`,
    tacticalSummary: `${moveOptions.length} legal move${moveOptions.length === 1 ? '' : 's'} · ${attackTargets.length} attack target${attackTargets.length === 1 ? '' : 's'}`,
    attackTargetsAttr: attackTargets.map(target => `${target.spaceId}:${target.id}`).join(' '),
    attackSpacesAttr: attackTargets.map(target => target.spaceId).join(' '),
    hasTargets: attackTargets.length > 0,
    moveOptions,
    moveSpacesAttr: moveSpaceIds.join(' '),
    hasMoveOptions: moveOptions.length > 0
  };
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
      actionModel: state.actionModel || 'single-action',
      actionModelLabel: state.actionModel === 'move-then-attack' ? 'Move + Attack' : 'Single Action',
      currentSeatId: viewerSeatId,
      activeSeatLabel: state.activeSeatId ? seatName(session, state.activeSeatId) : '',
      winnerLabel: state.winnerSeatId ? seatName(session, state.winnerSeatId) : '',
      canCancel: Boolean(currentSeat && !['complete', 'cancelled'].includes(state.phase)),
      showPlaying: state.phase === 'playing',
      showComplete: state.phase === 'complete',
      canRematch: Boolean(currentSeat && state.phase === 'complete'),
      seats: playableSeats(session).map(seat => {
        const isAi = seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
        const aiProfile = buildDejarikAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium');
        return { seatId: seat.seatId, displayName: seat.displayName, isViewer: seat.seatId === viewerSeatId, isCurrent: seat.seatId === state.activeSeatId, isAi, aiDifficultyLabel: isAi ? DejarikAi.labelForDifficulty(aiProfile.difficulty) : '', aiProfileLabel: isAi ? `${DejarikAi.labelForDifficulty(aiProfile.difficulty)} · ${aiProfile.fairness || 'fair'} · ${aiProfile.personality || 'methodical'}` : '', profession: seat.profession || '', tableFact: seat.tableFact || '' };
      }),
      pieces,
      aiProfiles: playableSeats(session).filter(seat => seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile).map(seat => { const profile = buildDejarikAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium'); return { label: seat.displayName || 'AI Opponent', profileLabel: `${DejarikAi.labelForDifficulty(profile.difficulty)} · ${profile.fairness || 'fair'} · ${profile.personality || 'methodical'}`, profession: seat.profession || '', tableFact: seat.tableFact || '' }; }),
      hasAiProfiles: playableSeats(session).some(seat => seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile),
      viewerPieces: pieces.filter(piece => piece.isViewerPiece && !piece.defeated),
      canAct: Boolean(viewerSeatId && state.phase === 'playing' && state.activeSeatId === viewerSeatId),
      boardRings: boardRings(),
      boardRays: boardRays(),
      boardHubRadius: SVG_HUB_RADIUS,
      boardSpaces: (state.board || []).map(space => {
        const coords = spaceCoordinates(space);
        const piece = pieces.find(entry => entry.spaceId === space.id && !entry.defeated) || null;
        const parity = (Number(space.ring || 0) + Number(space.ray || 0)) % 2 ? 'is-odd' : 'is-even';
        return {
          ...space,
          ...coords,
          path: spacePath(space),
          highlightPath: spacePath(space, 0.01),
          parityClass: parity,
          ringClass: `ring-${space.ring}`,
          rayClass: `ray-${space.ray}`,
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
