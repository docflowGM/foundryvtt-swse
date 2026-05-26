/**
 * Holonet Chat Card Integration
 *
 * Posts the v2 Holonet transmission card when a canonical Holonet record is
 * published. The record remains authoritative in Holonet storage; this module
 * only creates a clickable chat projection for recipients.
 */

import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { HolonetStorage } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js";

let registered = false;
const postedRecordIds = new Set();

function shouldPostRecord(record) {
  if (!record) return false;
  const intent = String(record.intent || '').toLowerCase();
  const sourceFamily = String(record.sourceFamily || '').toLowerCase();
  const type = String(record.type || '').toLowerCase();

  // Patch D owns treasury/store/approval receipts; avoid duplicate chat noise here.
  if (intent.includes('transaction') || intent.includes('store') || intent.includes('approval')) return false;
  if (sourceFamily.includes('store') || sourceFamily.includes('approval')) return false;

  return type === 'message'
    || sourceFamily.includes('messenger')
    || sourceFamily.includes('bulletin')
    || sourceFamily.includes('gm')
    || record.metadata?.chatCard === true;
}

function actorForRecord(record) {
  const actorId = record?.recipients?.find?.(r => r?.actorId)?.actorId
    || record?.metadata?.actorId
    || record?.sender?.actorId
    || null;
  return actorId ? game.actors?.get?.(actorId) ?? null : null;
}

async function loadRecord(recordId) {
  if (!recordId) return null;
  if (typeof HolonetStorage.getRecordById === 'function') return HolonetStorage.getRecordById(recordId);
  if (typeof HolonetStorage.getRecord === 'function') return HolonetStorage.getRecord(recordId);
  return null;
}

async function postForRecord(recordId) {
  if (!game.user?.isGM) return;
  if (!recordId || postedRecordIds.has(recordId)) return;

  const record = await loadRecord(recordId);
  if (!shouldPostRecord(record)) return;

  postedRecordIds.add(recordId);
  try {
    await SWSEChat.postHolonetCard({
      record,
      actor: actorForRecord(record),
      flags: { swse: { holonetProjection: true } }
    });
  } catch (err) {
    postedRecordIds.delete(recordId);
    console.warn('[SWSE Chat] Failed to post Holonet chat card:', err);
  }
}

export function registerHolonetChatCards() {
  if (registered) return false;
  registered = true;

  Hooks.on('swseHolonet:recordPublished', payload => {
    const recordId = payload?.recordId || payload?.record?.id || null;
    void postForRecord(recordId);
  });

  return true;
}

export default registerHolonetChatCards;
