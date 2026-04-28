/**
 * MessengerSurfaceService — builds the shell VM for the in-datapad Messenger route.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';

export class MessengerSurfaceService {
  static async buildViewModel(actor, options = {}) {
    return HolonetMessengerService.buildViewModel(actor, options);
  }
}
