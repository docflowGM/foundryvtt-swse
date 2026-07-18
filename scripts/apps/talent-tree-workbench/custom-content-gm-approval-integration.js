import { GMApprovalsSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalsSurfaceService.js';
import { GMApprovalOperationsService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalOperationsService.js';
import { CustomContentApprovalService } from '/systems/foundryvtt-swse/scripts/apps/talent-tree-workbench/custom-content-approval-service.js';

const PATCH_FLAG = Symbol.for('swse.customContentGmApprovalIntegration.v1');

function queueCounts(requests = []) {
  return {
    total: requests.length,
    traditions: requests.filter(request => request.customContentKind === 'custom-force-tradition').length,
    trees: requests.filter(request => request.customContentKind === 'custom-talent-tree').length,
    talents: requests.filter(request => request.customContentKind === 'custom-talent').length
  };
}

function mergeQueueCounts(base = {}, customRequests = []) {
  const custom = queueCounts(customRequests);
  return {
    ...(base || {}),
    total: Number(base?.total ?? 0) + custom.total,
    customContent: custom.total,
    customTraditions: custom.traditions,
    customTalentTrees: custom.trees,
    customTalents: custom.talents
  };
}

function patchApprovalSurface() {
  const original = GMApprovalsSurfaceService.buildViewModel;
  GMApprovalsSurfaceService.buildViewModel = async function customContentApprovalBuildViewModel(host) {
    const vm = await original.call(this, host);
    const customRequests = CustomContentApprovalService.getPendingRequests();
    if (!customRequests.length) return vm;

    const approvalRequests = [...(vm.approvalRequests || []), ...customRequests];
    if (!approvalRequests.some(request => request.key === host.selectedApprovalKey)) {
      host.selectedApprovalKey = approvalRequests[0]?.key ?? null;
      host.approvalEditMode = false;
      host.approvalDenyMode = false;
    }

    const selectedApproval = approvalRequests.find(request => request.key === host.selectedApprovalKey) || approvalRequests[0] || null;
    return {
      ...vm,
      pageDescription: 'Review game settlements, asset purchases, faction suggestions, and player-created custom Force traditions, talent trees, or talents.',
      approvalRequests,
      selectedApproval,
      hasApprovalRequests: approvalRequests.length > 0,
      approvalQueueCounts: mergeQueueCounts(vm.approvalQueueCounts, customRequests)
    };
  };
}

function patchApprovalOperations() {
  const originalParse = GMApprovalOperationsService.parseApprovalKey;
  GMApprovalOperationsService.parseApprovalKey = function customContentParseApprovalKey(key) {
    const parsed = CustomContentApprovalService.parseKey(key);
    if (parsed) return { kind: 'content', ...parsed };
    return originalParse.call(this, key);
  };

  const originalApprove = GMApprovalOperationsService.approveRequest;
  GMApprovalOperationsService.approveRequest = async function customContentApproveRequest(host, key, options = {}) {
    const parsed = CustomContentApprovalService.parseKey(key);
    if (!parsed) return originalApprove.call(this, host, key, options);
    const result = await CustomContentApprovalService.approve(key, { reason: options?.reason || '' });
    host.selectedApprovalKey = null;
    host.approvalEditMode = false;
    host.approvalDenyMode = false;
    await host.requestSurfaceRender?.({ reason: 'custom-content-approval-approved', surfaceId: 'approvals' });
    return result;
  };

  const originalDeny = GMApprovalOperationsService.denyRequest;
  GMApprovalOperationsService.denyRequest = async function customContentDenyRequest(host, key, reason = '') {
    const parsed = CustomContentApprovalService.parseKey(key);
    if (!parsed) return originalDeny.call(this, host, key, reason);
    const result = await CustomContentApprovalService.deny(key, { reason });
    host.selectedApprovalKey = null;
    host.approvalEditMode = false;
    host.approvalDenyMode = false;
    await host.requestSurfaceRender?.({ reason: 'custom-content-approval-denied', surfaceId: 'approvals' });
    return result;
  };

  const originalFinalize = GMApprovalOperationsService.finalizeWithEdits;
  GMApprovalOperationsService.finalizeWithEdits = async function customContentFinalizeWithEdits(host, key, formData) {
    const parsed = CustomContentApprovalService.parseKey(key);
    if (!parsed) return originalFinalize.call(this, host, key, formData);
    const data = formData ? new FormData(formData) : new FormData();
    const reason = String(data.get('metadata.gmNotes') || data.get('denialReason') || '').trim();
    return this.approveRequest(host, key, { reason });
  };
}

export function registerCustomContentGmApprovalIntegration() {
  if (globalThis[PATCH_FLAG]) return false;
  globalThis[PATCH_FLAG] = true;
  patchApprovalSurface();
  patchApprovalOperations();

  globalThis.SWSE ??= {};
  globalThis.SWSE.customContentApprovals = CustomContentApprovalService;
  return true;
}

export default registerCustomContentGmApprovalIntegration;
