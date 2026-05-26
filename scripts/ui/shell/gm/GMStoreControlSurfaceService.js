/** GM store governance surface view-model. */

import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';

export class GMStoreControlSurfaceService {
  static async buildViewModel(host) {
    await host._loadStoreTransactionHistory();
    await host._loadStorePendingSales();
    await host._loadStorePendingApprovals();

    const storeOpen = SettingsHelper.getSafe('storeOpen', true);
    const buyModifier = SettingsHelper.getSafe('globalBuyModifier', 0);
    const autoAcceptSelling = SettingsHelper.getSafe('autoAcceptItemSales', false);
    const autoSalePercent = SettingsHelper.getSafe('automaticSalePercentage', 50);
    const disallowAutoSellNoPrice = SettingsHelper.getSafe('disallowAutoSellNoPrice', true);

    const visibleRarities = SettingsHelper.getObject('visibleRarities', {
      common: true,
      uncommon: true,
      rare: false,
      restricted: false,
      illegal: false
    });

    const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {
      weapons: true,
      armor: true,
      gear: true,
      droids: true,
      vehicles: true
    });

    const blacklistedItems = SettingsHelper.getArray('blacklistedItems', []);

    return {
      pageTitle: 'Store Control',
      pageDescription: 'Store governance and approvals',
      transactions: host.transactions,
      pendingSales: host.pendingSales,
      pendingApprovals: host.storeApprovals,
      storeOpen,
      buyModifier,
      autoAcceptSelling,
      autoSalePercent,
      disallowAutoSellNoPrice,
      visibleRarities,
      visibleTypes,
      blacklistedItems,
      actors: game.actors.filter((actor) => actor.isOwner).map((actor) => ({ id: actor.id, name: actor.name })),
      currentTab: host.currentTab
    };
  }
}
