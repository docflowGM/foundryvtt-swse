/**
 * WP3-B Gate 1 — Foundry V13 request-identity probe (manual runtime evidence; NOT shipped, NOT loaded by the system).
 *
 * Question: can a GM-side executor learn who REALLY sent a request, without trusting any user id written in the payload?
 * Candidate mechanism: a ChatMessage whispered to the GMs. The server stores the document and broadcasts creation; the GM
 * client then sees `message.author` and the hook's `userId`. If the server refuses (or overwrites) a forged `author`, the
 * message author is a server-backed sender identity. This script measures that; it decides nothing by itself.
 *
 * HOW TO RUN (one world, Foundry V13, this system active, a throwaway test world recommended):
 *   1. GM client: open the browser console (F12), paste this whole file, press Enter. It installs listeners and prints
 *      "GM listener ready". Leave this tab open.
 *   2. A NON-GM player client (a different browser profile or machine, logged in as a player user): paste the same file.
 *      It runs the player cases automatically and prints when done.
 *   3. Back on the GM client, run:  SWSE_WP3B_GATE1.report()
 *      Copy the printed JSON verdict into the PR / checkpoint. Then optionally run SWSE_WP3B_GATE1.cleanup() to delete the
 *      probe messages.
 *
 * The script only creates/updates/deletes its own flagged chat messages. It never touches actors or items.
 */
(() => {
  const FLAG_SCOPE = 'foundryvtt-swse';
  const FLAG_KEY = 'wp3bGate1Probe';
  const g = globalThis;
  if (!g.game?.ready) { console.error('[WP3B-GATE1] Foundry is not ready; run this in a loaded world.'); return; }

  const gmIds = () => g.game.users.filter((u) => u.isGM).map((u) => u.id);
  const probeOf = (msg) => msg?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null;
  const env = () => ({
    foundryVersion: g.game.version ?? null,
    generation: g.game.release?.generation ?? null,
    build: g.game.release?.build ?? null,
    systemId: g.game.system?.id ?? null,
    systemVersion: g.game.system?.version ?? null,
  });

  // ---------------- GM side: observe what the server actually delivered ----------------
  if (g.game.user.isGM) {
    const store = g.SWSE_WP3B_GATE1?.store ?? { created: [], updated: [], env: env(), gmUserId: g.game.user.id };
    const onCreate = (msg, _options, userId) => {
      const p = probeOf(msg); if (!p) return;
      store.created.push({
        case: p.case, nonce: p.nonce, messageId: msg.id,
        trueSenderUserId: p.senderUserId,            // what the player script says about itself (NOT trusted; used only to compare)
        claimedUserId: p.claimedUserId ?? null,      // the identity the payload asserts
        authorId: msg.author?.id ?? null,            // what the stored document says
        hookUserId: userId ?? null,                  // what the creation broadcast says
        authorIsGM: msg.author?.isGM ?? null,
        receivedAt: Date.now(),
      });
    };
    const onUpdate = (msg, changes, _options, userId) => {
      const p = probeOf(msg); if (!p) return;
      store.updated.push({ case: p.case, nonce: p.nonce, messageId: msg.id, hookUserId: userId ?? null, authorId: msg.author?.id ?? null,
        changedKeys: Object.keys(foundry.utils.flattenObject(changes ?? {})), receivedAt: Date.now() });
    };
    if (!g.SWSE_WP3B_GATE1?.installed) {
      Hooks.on('createChatMessage', onCreate);
      Hooks.on('updateChatMessage', onUpdate);
    }

    const verdictFor = (rec, playerResults) => {
      const sent = playerResults.find((r) => r.case === rec.case) ?? null;
      return { ...rec, playerSideOutcome: sent?.outcome ?? 'unknown (player results not visible to GM; see player console)' };
    };

    g.SWSE_WP3B_GATE1 = {
      installed: true, store,
      report() {
        const by = (c) => store.created.filter((r) => r.case === c);
        const honest = by('honest');
        const forgedAuthor = [...by('forged-author-other-player'), ...by('forged-author-gm')];
        const claimOnly = by('claim-only');
        const checks = {
          honestDelivered: honest.length > 0,
          honestAuthorMatchesSender: honest.length > 0 && honest.every((r) => r.authorId === r.trueSenderUserId),
          honestHookUserMatchesSender: honest.length > 0 && honest.every((r) => r.hookUserId === r.trueSenderUserId),
          // a forged author must never be delivered as that other user
          forgedAuthorNeverAccepted: forgedAuthor.every((r) => r.authorId === r.trueSenderUserId && r.authorId !== r.claimedUserId),
          forgedAuthorDeliveredCount: forgedAuthor.length,
          // the payload claim is shown to be untrustworthy: delivered even though it names someone else
          claimOnlyDelivered: claimOnly.length > 0,
          claimOnlyAuthorIsTrueSender: claimOnly.every((r) => r.authorId === r.trueSenderUserId),
          // a creator can modify its own message after the GM read it: the executor must bind to the creation snapshot
          postCreateUpdatesObserved: store.updated.length,
        };
        const identityVerified = checks.honestDelivered && checks.honestAuthorMatchesSender && checks.honestHookUserMatchesSender
          && checks.forgedAuthorNeverAccepted && checks.claimOnlyAuthorIsTrueSender;
        const out = {
          probe: 'WP3B-GATE1', env: store.env, gmUserId: store.gmUserId,
          verdict: identityVerified ? 'IDENTITY_MECHANISM_OBSERVED_SOUND (this world, this build)' : 'NOT_VERIFIED',
          checks, created: store.created, updated: store.updated,
          note: 'One run is evidence for this Foundry build and this server only. Record the build. Repeat after any Foundry upgrade.',
        };
        console.log('[WP3B-GATE1] REPORT\n' + JSON.stringify(out, null, 2));
        return out;
      },
      async cleanup() {
        const ids = g.game.messages.filter((m) => probeOf(m)).map((m) => m.id);
        if (ids.length) await ChatMessage.deleteDocuments(ids);
        console.log(`[WP3B-GATE1] deleted ${ids.length} probe message(s)`);
      },
    };
    console.log('[WP3B-GATE1] GM listener ready. Now run this file on a NON-GM player client, then SWSE_WP3B_GATE1.report() here.');
    return;
  }

  // ---------------- Player side: send honest, forged and tamper cases ----------------
  (async () => {
    const me = g.game.user;
    const otherPlayer = g.game.users.find((u) => !u.isGM && u.id !== me.id) ?? null;
    const aGm = g.game.users.find((u) => u.isGM) ?? null;
    const whisper = gmIds();
    const results = [];
    const nonce = () => foundry.utils.randomID(16);
    const send = async (caseName, { author, claimedUserId }) => {
      const data = {
        content: `<p>SWSE WP3-B identity probe: ${caseName}</p>`, whisper,
        flags: { [FLAG_SCOPE]: { [FLAG_KEY]: { case: caseName, nonce: nonce(), senderUserId: me.id, claimedUserId } } },
      };
      if (author) data.author = author;
      try {
        const msg = await ChatMessage.create(data);
        results.push({ case: caseName, outcome: msg ? 'created' : 'create returned nothing', messageId: msg?.id ?? null, storedAuthorId: msg?.author?.id ?? null });
        return msg;
      } catch (err) {
        results.push({ case: caseName, outcome: `rejected: ${err?.message ?? err}` });
        return null;
      }
    };

    const honest = await send('honest', { claimedUserId: me.id });
    if (otherPlayer) await send('forged-author-other-player', { author: otherPlayer.id, claimedUserId: otherPlayer.id });
    else results.push({ case: 'forged-author-other-player', outcome: 'skipped: no second player user exists in this world' });
    if (aGm) await send('forged-author-gm', { author: aGm.id, claimedUserId: aGm.id });
    await send('claim-only', { claimedUserId: otherPlayer?.id ?? aGm?.id ?? 'someone-else' });

    // Tamper: the creator edits its own request after creation.
    if (honest) {
      try {
        await honest.update({ [`flags.${FLAG_SCOPE}.${FLAG_KEY}.tampered`]: true, [`flags.${FLAG_SCOPE}.${FLAG_KEY}.claimedUserId`]: aGm?.id ?? 'x' });
        results.push({ case: 'tamper-own-message', outcome: 'update accepted (executor must bind to the creation snapshot)' });
      } catch (err) {
        results.push({ case: 'tamper-own-message', outcome: `update rejected: ${err?.message ?? err}` });
      }
    }
    console.log('[WP3B-GATE1] PLAYER RESULTS (copy these too)\n' + JSON.stringify({ env: env(), playerUserId: me.id, results }, null, 2));
  })();
})();
