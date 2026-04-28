/**
 * Approvals Source Adapter
 *
 * Export seam for approval/request events into Holonet
 * Does NOT modify approval system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetRequest } from '../contracts/holonet-request.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class ApprovalsSource {
  static sourceFamily = SOURCE_FAMILY.APPROVALS;

  /**
   * Create an approval request
   *
   * @param {Object} data
   * @returns {HolonetRequest}
   */
  static createApprovalRequest(data) {
    const request = new HolonetRequest({
      sourceFamily: this.sourceFamily,
      sourceId: data.approvalId,
      intent: INTENT_TYPE.SYSTEM_APPROVAL_RESOLVED,
      requestType: data.requestType ?? 'approval', // 'approval', 'review', 'decision'
      sender: HolonetSender.fromActor(data.requesterActorId, data.requesterActorName),
      audience: HolonetAudience.gmOnly(),
      requester: data.requesterActorId,
      reviewer: data.reviewerActorId,
      requestedAction: data.requestedAction ?? 'approve',
      title: data.title ?? 'Approval Request',
      body: data.body ?? '',
      deadline: data.deadline,
      metadata: data.metadata ?? {}
    });

    return request;
  }

  /**
   * Create an approval decision notification
   */
  static createApprovalDecision(data) {
    const request = new HolonetRequest({
      sourceFamily: this.sourceFamily,
      sourceId: data.approvalId,
      intent: INTENT_TYPE.SYSTEM_APPROVAL_RESOLVED,
      requestType: 'approval',
      sender: HolonetSender.system('Approvals'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `Approval ${data.decision}`,
      body: data.body ?? '',
      decision: data.decision, // 'approved', 'denied'
      decidedBy: data.decidedBy,
      decidedAt: data.decidedAt,
      decisionNotes: data.decisionNotes,
      metadata: data.metadata ?? {}
    });

    return request;
  }

  /**
   * Initialize approvals source
   */
  static async initialize() {
    console.log('[Holonet] Approvals source initialized (skeleton)');
    // Future: hook into approval completion/decision
  }
}
