/** GM settings shell surface adapter. */

import { SettingsSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceService.js';

export class GMSettingsSurfaceService {
  static async buildViewModel() {
    return {
      pageTitle: 'GM Holopad Settings',
      pageDescription: 'Shared datapad theme, motion, shell color, and language controls',
      settingsVm: await SettingsSurfaceService.buildViewModel(null, { gm: true, preferActor: false })
    };
  }
}
