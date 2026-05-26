/** GM approvals surface view-model. */

export class GMApprovalsSurfaceService {
  static async buildViewModel(host) {
    await host._loadPendingDroids();
    await host._loadStorePendingApprovals();

    return {
      pageTitle: 'Approvals',
      pageDescription: 'Pending droid and store approvals',
      pendingDroids: host.pendingDroids,
      storeApprovals: host.storeApprovals,
      hasPendingDroids: host.pendingDroids.length > 0,
      hasPendingApprovals: host.storeApprovals.length > 0
    };
  }
}
