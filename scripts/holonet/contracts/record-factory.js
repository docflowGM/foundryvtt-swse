import { RECORD_TYPE } from './enums.js';
import { HolonetRecord } from './holonet-record.js';
import { HolonetMessage } from './holonet-message.js';
import { HolonetEvent } from './holonet-event.js';
import { HolonetNotification } from './holonet-notification.js';
import { HolonetRequest } from './holonet-request.js';
import { HolonetThread } from './holonet-thread.js';

export function hydrateHolonetRecord(data) {
  if (!data) return null;
  const normalized = {
    ...data,
    deliveryStates: data.deliveryStates instanceof Map ? data.deliveryStates : new Map(Object.entries(data.deliveryStates ?? {}))
  };
  switch (data.type) {
    case RECORD_TYPE.MESSAGE:
      return new HolonetMessage(normalized);
    case RECORD_TYPE.EVENT:
      return new HolonetEvent(normalized);
    case RECORD_TYPE.NOTIFICATION:
      return new HolonetNotification(normalized);
    case RECORD_TYPE.REQUEST:
      return new HolonetRequest(normalized);
    default:
      return new HolonetRecord(normalized);
  }
}

export function hydrateHolonetThread(data) {
  if (!data) return null;
  return new HolonetThread(data);
}
