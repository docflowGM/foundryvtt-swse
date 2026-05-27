import { DejarikEngine } from './dejarik-engine.js';
import { legalAttackTargets, legalMoveSpaceIds } from './dejarik-rules.js';
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

function spaceCoordinates(space = {}) {
  const ring = Math.max(1, Math.min(4, Number(space.ring || 1)));
  const ray = Math.max(0, Math.min(7, Number(space.ray || 0)));
  const radiusByRing = [0, 13, 26, 38, 48];
  const angle = (-Math.PI / 2) + ((Math.PI * 2) * (ray / 8));
  const radius = radiusByRing[ring] || 48;
  const x = 50 + (Math.cos(angle) * radius);
  const y = 50 + (Math.sin(angle) * radius);
  return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), style: `--dej-x: ${x.toFixed(2)}%; --dej-y: ${y.toFixed(2)}%;` };
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
        return { seatId: seat.seatId, displayName: seat.displayName, isViewer: seat.seatId === viewerSeatId, isCurrent: seat.seatId === state.activeSeatId, isAi, aiDifficultyLabel: isAi ? DejarikAi.labelForDifficulty(aiProfile.difficulty) : '', profession: seat.profession || '', tableFact: seat.tableFact || '' };
      }),
      pieces,
      viewerPieces: pieces.filter(piece => piece.isViewerPiece && !piece.defeated),
      canAct: Boolean(viewerSeatId && state.phase === 'playing' && state.activeSeatId === viewerSeatId),
      boardSpaces: (state.board || []).map(space => {
        const coords = spaceCoordinates(space);
        const piece = pieces.find(entry => entry.spaceId === space.id && !entry.defeated) || null;
        return {
          ...space,
          ...coords,
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
