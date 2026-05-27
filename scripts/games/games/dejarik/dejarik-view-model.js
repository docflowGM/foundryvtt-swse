import { DejarikEngine } from './dejarik-engine.js';
import { canAttackPiece, canMovePiece } from './dejarik-rules.js';

function formatTime(value) { try { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; } catch (_err) { return ''; } }
function playableSeats(session = {}) { return (Array.isArray(session.seats) ? session.seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status)); }
function seatName(session, seatId) { return playableSeats(session).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }

function pieceVm(piece = {}, session, state, viewerSeatId) {
  const isViewerPiece = piece.ownerSeatId === viewerSeatId;
  const enemies = Object.values(state.pieces || {}).filter(other => other.ownerSeatId !== piece.ownerSeatId && !other.defeated);
  return {
    ...piece,
    ownerLabel: seatName(session, piece.ownerSeatId),
    hpLabel: `${piece.hp}/${piece.maxHp}`,
    isViewerPiece,
    sessionId: session.id,
    seatId: viewerSeatId,
    defeated: Boolean(piece.defeated),
    canSelect: isViewerPiece && state.activeSeatId === viewerSeatId && !piece.defeated,
    targetOptions: enemies.filter(enemy => canAttackPiece(piece, enemy).ok).map(enemy => ({ id: enemy.id, label: `${enemy.label} (${enemy.hp}/${enemy.maxHp})` })),
    hasTargets: enemies.some(enemy => canAttackPiece(piece, enemy).ok),
    moveOptions: (state.board || []).filter(space => canMovePiece(state, piece, space.id).ok).slice(0, 12).map(space => ({ id: space.id, label: space.id })),
    hasMoveOptions: (state.board || []).some(space => canMovePiece(state, piece, space.id).ok)
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
      currentSeatId: viewerSeatId,
      activeSeatLabel: state.activeSeatId ? seatName(session, state.activeSeatId) : '',
      winnerLabel: state.winnerSeatId ? seatName(session, state.winnerSeatId) : '',
      canCancel: Boolean(currentSeat && !['complete', 'cancelled'].includes(state.phase)),
      showPlaying: state.phase === 'playing',
      showComplete: state.phase === 'complete',
      seats: playableSeats(session).map(seat => ({ seatId: seat.seatId, displayName: seat.displayName, isViewer: seat.seatId === viewerSeatId, isCurrent: seat.seatId === state.activeSeatId, isAi: seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile, profession: seat.profession || '', tableFact: seat.tableFact || '' })),
      pieces,
      viewerPieces: pieces.filter(piece => piece.isViewerPiece && !piece.defeated),
      canAct: Boolean(viewerSeatId && state.phase === 'playing' && state.activeSeatId === viewerSeatId),
      boardSpaces: (state.board || []).map(space => ({ ...space, piece: pieces.find(piece => piece.spaceId === space.id && !piece.defeated) || null })),
      eventLog: (state.eventLog || []).map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean((state.eventLog || []).length)
    };
  }
}
