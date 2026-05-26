/** GM command dashboard/home surface view-model. */

export class GMDashboardSurfaceService {
  static async buildViewModel(host) {
    const badgeCounts = await host._getHomeBadgeCounts();

    return {
      pageTitle: 'GM Command Dashboard',
      pageDescription: 'Master control for store, rules, approvals, and party management',
      badgeCounts,
      dashboardTone: 'command'
    };
  }
}
