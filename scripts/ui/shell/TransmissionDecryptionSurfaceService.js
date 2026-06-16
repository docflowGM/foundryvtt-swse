import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function actorForSurface(actor = null) {
  return actor ?? game.user?.character ?? null;
}

/**
 * View-model builder for the shell-hosted Transmission Decryption surface.
 *
 * This is deliberately a presentation adapter over HolonetIntelService. It does
 * not own Intel, lockbox rewards, credits, or item creation. The player shell
 * gets a full-screen codebreaker without replacing the Holopad shell host.
 */
export class TransmissionDecryptionSurfaceService {
  static async buildViewModel(actor = null, options = {}) {
    const shellActor = actorForSurface(actor);
    const intelId = cleanString(options.intelId || options.recordId || options.id);
    let record = intelId ? await HolonetIntelService.getIntelById(intelId) : null;

    if (record && game.user?.isGM && !record.metadata?.decryptionPayload?.enabled) {
      await HolonetIntelService.ensureDecryptionPayload(record.id, { encrypted: true });
      record = await HolonetIntelService.getIntelById(record.id);
    }

    const intel = HolonetIntelService.getIntelMetadata(record);
    const decryption = HolonetIntelService.getIntelDecryptionView(record, {
      actor: shellActor,
      isGm: game.user?.isGM === true
    });
    const lockbox = HolonetIntelService.getIntelLockboxView(record);
    const hasPayload = Boolean(decryption?.enabled);
    const title = decryption?.title || intel?.title || 'Encrypted Transmission';

    return {
      id: 'transmission-decryption',
      title: 'Transmission Decryption',
      recordId: record?.id || '',
      intelId: intel?.id || record?.id || intelId,
      subtitle: intel?.classification || 'restricted',
      mode: game.user?.isGM ? 'gm' : 'player',
      isGm: game.user?.isGM === true,
      isPlayerMode: game.user?.isGM !== true,
      actorId: shellActor?.id || '',
      actorName: shellActor?.name || game.user?.name || 'Unknown Operator',
      hasRecord: Boolean(record && intel),
      hasPayload,
      intel,
      decryption,
      lockbox,
      canClaimLockbox: Boolean(lockbox?.claimable && shellActor?.id),
      canForceOpen: Boolean(game.user?.isGM && hasPayload),
      lastRequestId: cleanString(options.lastRequestId),
      expanded: options.expanded === true || options.expanded === 'true'
    };
  }
}

export default TransmissionDecryptionSurfaceService;
