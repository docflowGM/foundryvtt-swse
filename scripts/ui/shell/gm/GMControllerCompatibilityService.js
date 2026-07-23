import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { GMSmartFormDropService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-smart-form-drop-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import { FactionIntelBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionIntelBridgeService.js';

function clean(value = '') {
  return String(value ?? '').trim();
}

async function navigate(host, surfaceId, reason = 'gm-compat-navigation') {
  if (typeof host?._navigateTo === 'function') return host._navigateTo(surfaceId);
  host.currentPage = surfaceId;
  return requestShellRender(host, { reason, surfaceId });
}

async function resolveActor({ actorId = '', actorUuid = '' } = {}) {
  const id = clean(actorId);
  if (id) {
    const actor = game.actors?.get?.(id);
    if (actor) return actor;
  }
  const uuid = clean(actorUuid);
  if (uuid && typeof fromUuid === 'function') {
    try {
      const document = await fromUuid(uuid);
      if (document?.documentName === 'Actor' || document?.constructor?.documentName === 'Actor') return document;
      if (document?.actor) return document.actor;
    } catch (_err) {}
  }
  return null;
}

/**
 * Temporary compatibility repairs for controller/service contracts that drifted
 * during the GM Datapad ApplicationV2 extraction. Keep these repairs centralized
 * so page controllers remain usable while the larger controller audit proceeds.
 */
export class GMControllerCompatibilityService {
  static prepare({ surfaceId = '', host = null, controller = null } = {}) {
    if (!host || !controller) return controller;

    if (surfaceId === 'factions') this._repairFactionController(host, controller);
    if (surfaceId === 'jobs') this._repairJobStatusContract(host, controller);
    if (surfaceId === 'locations') this._repairLocationsInitialization(controller);

    return controller;
  }

  static _repairFactionController(host, controller) {
    // The extracted controller called mutateShellOnly(operation, reason), shifting
    // every argument left. The helper therefore saw a string where the mutation
    // callback belongs and silently returned without saving anything.
    controller._mutate = async (operation, reason = 'gm-faction-surface') => {
      if (typeof operation !== 'function') return undefined;
      return mutateShellOnly(host, operation, {
        reason,
        surfaceId: 'factions'
      });
    };

    // The current Dossier template uses data-gm-faction-action, but the extracted
    // controller still listened for older data-gm-faction-job/intel/delete
    // attributes. Restore the current command contract with one delegated handler.
    controller._wireButtons = (pageElement, signal) => {
      pageElement.addEventListener('click', async (event) => {
        const button = event.target?.closest?.('[data-gm-faction-action]');
        if (!button || !pageElement.contains(button)) return;
        event.preventDefault();
        event.stopPropagation();

        const action = clean(button.dataset.gmFactionAction);
        const factionId = clean(button.dataset.factionId);
        const factionName = clean(button.dataset.factionName);
        const contactId = clean(button.dataset.contactId);
        const contactName = clean(button.dataset.contactName);
        const locationId = clean(button.dataset.locationId);
        const issuerFilter = {
          factionId,
          factionName,
          contactId,
          contactName,
          label: [factionName, contactName].filter(Boolean).join(' - ') || factionName || contactName || 'Issuer'
        };

        if (!action) return;

        try {
          switch (action) {
            case 'make-job-faction':
            case 'make-job-contact': {
              const draft = action === 'make-job-contact'
                ? FactionJobBridgeService.buildDraftFromContact(factionId || factionName, contactId || contactName)
                : FactionJobBridgeService.buildDraftFromFaction(factionId || factionName);
              if (!draft) throw new Error('Could not build a contract draft from this dossier.');
              host.patchSurfaceState?.('jobs', { pendingJobDraft: draft, openWizard: true, issuerFilter }, { render: false });
              await navigate(host, 'jobs', 'gm-dossier-make-job');
              ui.notifications?.info?.('Job draft prepared from the selected dossier.');
              return;
            }

            case 'view-jobs-faction':
            case 'view-jobs-contact':
              host.patchSurfaceState?.('jobs', { issuerFilter, pendingJobDraft: null, openWizard: false }, { render: false });
              await navigate(host, 'jobs', 'gm-dossier-view-jobs');
              return;

            case 'create-intel-faction':
            case 'create-intel-contact': {
              const record = action === 'create-intel-contact'
                ? await FactionIntelBridgeService.createDraftFromContact(factionId || factionName, contactId || contactName)
                : await FactionIntelBridgeService.createDraftFromFaction(factionId || factionName);
              if (!record?.id) throw new Error('Could not create an Intel draft from this dossier.');
              host.patchSurfaceState?.('intel', { selectedRecordId: record.id, modal: { type: 'editor', recordId: record.id } }, { render: false });
              await navigate(host, 'intel', 'gm-dossier-create-intel');
              return;
            }

            case 'reveal-faction':
            case 'reveal-contact': {
              const record = action === 'reveal-contact'
                ? await FactionIntelBridgeService.buildContactRevealIntel(factionId || factionName, contactId || contactName)
                : await FactionIntelBridgeService.buildFactionRevealIntel(factionId || factionName);
              if (!record?.id) throw new Error('Could not prepare a player reveal from this dossier.');
              host.patchSurfaceState?.('intel', { selectedRecordId: record.id, modal: { type: 'editor', recordId: record.id } }, { render: false });
              await navigate(host, 'intel', 'gm-dossier-reveal');
              ui.notifications?.info?.('Player-ready reveal Intel prepared. Review and release it from Intel.');
              return;
            }

            case 'view-locations-faction':
            case 'view-locations-contact':
              host.patchSurfaceState?.('locations', {
                search: contactName || factionName,
                selectedLocationId: '',
                modal: null
              }, { render: false });
              await navigate(host, 'locations', 'gm-dossier-view-locations');
              return;

            case 'create-location-faction':
            case 'create-location-contact':
              host.patchSurfaceState?.('locations', {
                modal: {
                  type: 'create',
                  defaults: {
                    name: action === 'create-location-contact' ? `${contactName || 'Contact'} Location` : `${factionName || 'Faction'} Operations Site`,
                    controllingFactionId: factionId,
                    factionIds: factionId ? [factionId] : [],
                    contactIds: contactId ? [contactId] : [],
                    publicSummary: action === 'create-location-contact'
                      ? `A location associated with ${contactName || 'this contact'}.`
                      : `An operating location associated with ${factionName || 'this faction'}.`
                  }
                }
              }, { render: false });
              await navigate(host, 'locations', 'gm-dossier-create-location');
              return;

            case 'open-location':
              if (!locationId) throw new Error('This dossier location has no registry id.');
              host.patchSurfaceState?.('locations', { selectedLocationId: locationId, modal: null }, { render: false });
              await navigate(host, 'locations', 'gm-dossier-open-location');
              return;

            case 'hide-contact': {
              const found = FactionRegistryService.findFactionContact(factionId || factionName, contactId || contactName);
              if (!found?.contact) throw new Error('The selected contact could not be found.');
              await controller._mutate(() => FactionRegistryService.upsertFactionContact(found.faction.id, {
                ...found.contact,
                revealState: 'hidden',
                knownToPlayers: false
              }), 'gm-faction-hide-contact');
              await controller._refresh();
              return;
            }

            case 'promote-contact': {
              const result = await controller._mutate(
                () => FactionRegistryService.promoteFactionContactToActor(factionId || factionName, contactId || contactName),
                'gm-faction-promote-contact'
              );
              if (result?.error) throw new Error(result.error);
              result?.actor?.sheet?.render?.(true);
              ui.notifications?.info?.(result?.created ? 'Contact promoted to a new NPC actor.' : 'Existing linked NPC actor opened.');
              await controller._refresh();
              return;
            }

            case 'open-contact-actor': {
              const actor = await resolveActor({ actorId: button.dataset.actorId, actorUuid: button.dataset.actorUuid });
              if (!actor) throw new Error('The linked contact actor could not be found.');
              actor.sheet?.render?.(true);
              return;
            }

            case 'delete-contact': {
              if (!globalThis.confirm?.(`Delete ${contactName || 'this contact'} from the faction dossier?`)) return;
              await controller._mutate(
                () => FactionRegistryService.deleteFactionContact(factionId || factionName, contactId),
                'gm-faction-delete-contact'
              );
              await controller._refresh();
              return;
            }

            case 'delete-registry': {
              if (!globalThis.confirm?.(`Delete ${factionName || 'this faction'} and its lightweight contact records?`)) return;
              await controller._mutate(() => FactionRegistryService.deleteFaction(factionId), 'gm-faction-delete');
              await controller._refresh();
              return;
            }

            case 'send-contact-message':
              host.patchSurfaceState?.('bulletin', {
                focusedContactId: contactId,
                focusedFactionId: factionId,
                pendingContactName: contactName,
                pendingFactionName: factionName
              }, { render: false });
              await navigate(host, 'bulletin', 'gm-dossier-contact-message');
              ui.notifications?.info?.('Contact selected for GM communications.');
              return;

            default:
              console.warn('[SWSE] Unhandled current Dossier action', { action, factionId, contactId, locationId });
              ui.notifications?.warn?.(`The Dossier action "${action}" is not connected yet.`);
          }
        } catch (error) {
          console.error(`[SWSE] Dossier action failed: ${action}`, error);
          ui.notifications?.error?.(`Dossier action failed: ${error?.message || error}`);
        }
      }, { signal });
    };
  }

  static _repairLocationsInitialization(controller) {
    const originalAttach = controller.attach.bind(controller);
    controller.attach = async (root) => {
      const attached = await originalAttach(root);
      const pageElement = root?.querySelector?.('.gm-datapad-locations');
      if (!pageElement) return false;

      // The Locations template contains the same guided modal and smart document
      // drop zones used by Intel/Factions, but the extracted Locations controller
      // never initialized the shared service.
      GMSmartFormDropService.bind(pageElement, {
        signal: controller._abort?.signal
      });
      return attached === false ? false : true;
    };
  }

  static _repairJobStatusContract(host, controller) {
    // The extracted Job Board controller called a removed public method named
    // transitionJobStatus(). Route the rendered lifecycle controls through the
    // supported Messenger thread-action API instead.
    controller._wireStatusButtons = (pageElement, signal) => {
      pageElement.querySelectorAll('[data-job-status-action], [data-job-transition-action]').forEach((button) => {
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!controller._assertGM?.('change job status')) return;

          const threadId = clean(event.currentTarget?.dataset?.threadId);
          const status = clean(event.currentTarget?.dataset?.status);
          if (!threadId || !status) {
            globalThis.ui?.notifications?.warn?.('This job control is missing its thread or destination status.');
            return;
          }

          const noteSelector = `[data-job-status-note][data-thread-id="${CSS.escape(threadId)}"]`;
          const statusNote = clean(pageElement.querySelector(noteSelector)?.value);
          const allowOverride = event.currentTarget.dataset.jobStatusOverride === 'true';
          const action = allowOverride ? 'override-job-status' : 'set-job-status';

          try {
            event.currentTarget.disabled = true;
            const result = await mutateShellOnly(host, () => HolonetMessengerService.threadAction({
              actor: null,
              threadId,
              action,
              status,
              statusNote,
              allowStatusOverride: allowOverride
            }), {
              reason: allowOverride ? 'gm-job-status-override' : 'gm-job-status-transition',
              surfaceId: 'jobs'
            });

            if (!result) {
              globalThis.ui?.notifications?.warn?.('The job status change did not complete.');
              return;
            }

            host.selectedJobThreadId = threadId;
            await requestShellRender(host, {
              reason: allowOverride ? 'gm-job-status-override-refresh' : 'gm-job-status-transition-refresh',
              surfaceId: 'jobs'
            });
          } catch (error) {
            console.error('[SWSE] GM Job Board status action failed', error);
            globalThis.ui?.notifications?.error?.(`Job status change failed: ${error?.message || error}`);
          } finally {
            if (event.currentTarget?.isConnected) event.currentTarget.disabled = false;
          }
        }, { signal });
      });
    };
  }
}

export default GMControllerCompatibilityService;
