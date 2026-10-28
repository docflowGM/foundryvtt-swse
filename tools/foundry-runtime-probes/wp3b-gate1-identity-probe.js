/**
 * WP3-B Gate 1 — Foundry V13 request-identity probe (manual runtime evidence; development-only, NOT shipped, NOT loaded by the system).
 *
 * Question: can a GM-side executor learn who REALLY sent a request, without trusting any user id written in the payload?
 * Candidate mechanism: a ChatMessage whispered to the GMs. The server stores the document and broadcasts its creation; the GM
 * client sees `message.author` and the creation hook's `userId`. If the server refuses (or rewrites) a forged `author`, the
 * stored author is a server-backed sender identity. This script gathers bounded empirical evidence for one world and one
 * Foundry build. It is not a general authentication guarantee and decides nothing by itself.
 *
 * Identity is judged against the player login the OPERATOR confirms when calling report(), never against `senderUserId` or any
 * other payload field (those are reconciliation aids only). Every required case must be attempted and accounted for: the
 * player sends an attempt manifest (nonce, outcome, message id per case), and the GM reconciles it with what it received.
 * Missing, skipped or unreconciled evidence yields NOT_VERIFIED_INCOMPLETE; any contrary observation yields NOT_VERIFIED_FAILED.
 *
 * HOW TO RUN (one throwaway world, Foundry V13, this system active, at least TWO non-GM player users):
 *   1. GM client: open the browser console (F12), paste this whole file, press Enter ("GM listener ready"). Keep the tab open.
 *   2. A NON-GM player client (another browser profile or machine), logged in as a player you choose: paste the same file.
 *      It sends the cases and its manifest, and prints PLAYER RESULTS (copy them).
 *   3. GM client:  SWSE_WP3B_GATE1.report('<the user id YOU logged in as on the player client>')
 *      (find it in Configure Players / game.users). Copy the GM REPORT and the PLAYER RESULTS together into the PR.
 *      Optionally SWSE_WP3B_GATE1.cleanup() to delete the probe messages.
 *
 * The script only creates/updates/deletes its own flagged chat messages. It never touches actors or items.
 */
(() => {
  const FLAG_SCOPE = 'foundryvtt-swse';
  const FLAG_KEY = 'wp3bGate1Probe';
  const REQUIRED_CASES = ['honest', 'forged-author-other-player', 'forged-author-gm', 'claim-only'];
  const FORGED_CASES = ['forged-author-other-player', 'forged-author-gm'];
  const g = globalThis;
  if (!g.game?.ready) { console.error('[WP3B-GATE1] Foundry is not ready; run this in a loaded world.'); return; }

  const gmIds = () => g.game.users.filter((u) => u.isGM).map((u) => u.id);
  const probeOf = (msg) => msg?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? null;
  const env = () => ({
    foundryVersion: g.game.version ?? null, generation: g.game.release?.generation ?? null, build: g.game.release?.build ?? null,
    systemId: g.game.system?.id ?? null, systemVersion: g.game.system?.version ?? null,
  });

  // ---------------- GM side: record exactly what the server delivered ----------------
  if (g.game.user.isGM) {
    const store = g.SWSE_WP3B_GATE1?.store ?? { created: [], updated: [], env: env(), gmUserId: g.game.user.id };
    const onCreate = (msg, _options, userId) => {
      const p = probeOf(msg); if (!p) return;
      store.created.push({
        case: p.case, nonce: p.nonce ?? null, messageId: msg.id,
        authorId: msg.author?.id ?? null,                 // what the stored document says
        hookUserId: userId ?? null,                       // what the creation broadcast says
        claimedUserId: p.claimedUserId ?? null,           // payload assertion (untrusted)
        payloadSenderUserId: p.senderUserId ?? null,      // payload self-report (untrusted; reconciliation aid only)
        manifest: p.case === 'manifest' ? (p.manifest ?? null) : undefined,
        receivedAt: Date.now(),
      });
    };
    const onUpdate = (msg, changes, _options, userId) => {
      const p = probeOf(msg); if (!p) return;
      store.updated.push({ case: p.case, nonce: p.nonce ?? null, messageId: msg.id, hookUserId: userId ?? null, authorId: msg.author?.id ?? null,
        changedKeys: Object.keys(foundry.utils.flattenObject(changes ?? {})), receivedAt: Date.now() });
    };
    if (!g.SWSE_WP3B_GATE1?.installed) {
      Hooks.on('createChatMessage', onCreate);
      Hooks.on('updateChatMessage', onUpdate);
    }

    /** Pure reconciliation of the operator-confirmed player id, the delivered records and the player's manifest. */
    const evaluate = (confirmedPlayerUserId) => {
      const incomplete = [];
      const failed = [];
      const checks = {};
      const player = g.game.users.find((u) => u.id === confirmedPlayerUserId) ?? null;
      if (!confirmedPlayerUserId) incomplete.push('operator did not confirm the player login: call report("<player user id>")');
      else if (!player) incomplete.push(`confirmed player ${confirmedPlayerUserId} is not a user of this world`);
      else if (player.isGM) incomplete.push(`confirmed player ${confirmedPlayerUserId} is a GM; the probe needs a non-GM player`);
      const P = player && !player.isGM ? player.id : null;

      const isFromPlayer = (r) => r.authorId === P && r.hookUserId === P;
      // Any delivered record authored by someone else than the confirmed player is checked against the forged-case claims below.
      const manifests = store.created.filter((r) => r.case === 'manifest' && r.manifest && isFromPlayer(r));
      if (!manifests.length) incomplete.push('no attempt manifest authored by the confirmed player was received');
      const manifest = manifests.at(-1)?.manifest ?? null;
      const entries = Array.isArray(manifest?.entries) ? manifest.entries : [];

      // R2: receipts bind one-to-one to manifest entries. A receipt counts for a case only if its case, nonce, message id and
      // claimed identity all equal that entry's; nonces and cases must be unique in the manifest; every receipt must be manifested.
      const receipts = store.created.filter((r) => r.case !== 'manifest');
      const receiptsFor = (nonce) => receipts.filter((r) => r.nonce === nonce);
      if (manifest && P) {
        // consistency check only: the manifest's self-reported player is never authentication (that is the operator's confirmation)
        if (manifest.playerUserId !== P) failed.push(`manifest playerUserId ${manifest.playerUserId ?? '(none)'} differs from the confirmed player ${P}`);
        for (const c of REQUIRED_CASES) {
          const n = entries.filter((x) => x.case === c).length;
          if (n > 1) failed.push(`${c}: listed ${n} times in the manifest`);
        }
        const nonces = entries.map((x) => x.nonce).filter(Boolean);
        const dupNonces = [...new Set(nonces.filter((x, i) => nonces.indexOf(x) !== i))];
        for (const x of dupNonces) failed.push(`manifest nonce ${x} is used by more than one entry`);
        for (const r of receipts) if (!entries.some((x) => x.nonce && x.nonce === r.nonce)) failed.push(`${r.case}: received message ${r.messageId} has a nonce that is not in the manifest`);
      }
      /** The single receipt bound to a created entry, or a reason it cannot be bound. */
      const bindCreated = (c, e, recs) => {
        if (!recs.length) { incomplete.push(`${c}: reported created but never received by the GM`); return null; }
        if (recs.length > 1) { failed.push(`${c}: ${recs.length} receipts share nonce ${e.nonce} (duplicate evidence is never counted once)`); return null; }
        const r = recs[0];
        if (r.case !== c) { failed.push(`${c}: the receipt with nonce ${e.nonce} is a "${r.case}" message`); return null; }
        if (!e.messageId || r.messageId !== e.messageId) { failed.push(`${c}: receipt message id ${r.messageId} differs from the manifest's ${e.messageId ?? '(none)'}`); return null; }
        if ((r.claimedUserId ?? null) !== (e.claimedUserId ?? null)) { failed.push(`${c}: receipt claims ${r.claimedUserId ?? '(none)'} but the manifest says ${e.claimedUserId ?? '(none)'}`); return null; }
        if (!isFromPlayer(r)) { failed.push(`${c}: author or creation-hook user differs from the confirmed player`); return null; }
        return r;
      };
      checks.cases = {};
      for (const c of REQUIRED_CASES) {
        const e = entries.find((x) => x.case === c) ?? null;
        const recs = e?.nonce ? receiptsFor(e.nonce) : [];
        checks.cases[c] = { attempted: !!e, outcome: e?.outcome ?? null, receiptCount: recs.length };
        if (!manifest) continue;
        if (!e) { incomplete.push(`${c}: not in the attempt manifest`); continue; }
        if (!e.nonce) { incomplete.push(`${c}: manifest entry has no nonce`); continue; }
        const outcome = String(e.outcome ?? '');
        if (outcome.startsWith('skipped')) { incomplete.push(`${c}: ${outcome}`); continue; }
        if (FORGED_CASES.includes(c)) {
          if (!e.claimedUserId || e.claimedUserId === P) { incomplete.push(`${c}: forged identity is missing or equals the confirmed player`); continue; }
          if (recs.some((r) => r.authorId === e.claimedUserId)) { failed.push(`${c}: server stored the forged author ${e.claimedUserId}`); checks.forgeryAccepted = true; continue; }
          if (outcome.startsWith('rejected')) {
            // rejected-with-no-receipt is the only rejection evidence that counts
            if (recs.length) failed.push(`${c}: manifest says rejected but the GM received ${recs.length} message(s) with that nonce`);
            continue;
          }
          if (outcome === 'created') { bindCreated(c, e, recs); continue; } // created-with-exactly-one-receipt, rewritten to the player
          incomplete.push(`${c}: unrecognised outcome "${outcome}"`);
          continue;
        }
        // honest and claim-only: created with exactly one bound receipt attributed to the confirmed player
        if (outcome !== 'created') { incomplete.push(`${c}: not created (${outcome || 'no outcome'})`); continue; }
        const r = bindCreated(c, e, recs);
        if (r && c === 'claim-only' && (!e.claimedUserId || e.claimedUserId === P)) incomplete.push('claim-only: the asserted identity must differ from the confirmed player');
      }
      // Every received probe message (any case, manifest included) must be attributed to the confirmed player by BOTH the stored
      // author and the creation-hook user; anything else is contrary evidence (or a mis-confirmed login). Run one player per session.
      if (P) {
        for (const r of store.created) {
          if (isFromPlayer(r)) continue;
          const msg = `${r.case}: received with author ${r.authorId} / hook user ${r.hookUserId}, not the confirmed player ${P}`;
          if (!failed.includes(msg) && !failed.some((f) => f.startsWith(`${r.case}: server stored the forged author`))) failed.push(msg);
        }
      }
      checks.forgeryAccepted = checks.forgeryAccepted === true;
      checks.postCreateUpdatesObserved = store.updated.length;

      const verdict = failed.length ? 'NOT_VERIFIED_FAILED' : incomplete.length ? 'NOT_VERIFIED_INCOMPLETE'
        : 'OBSERVED_SOUND (bounded empirical evidence: this world, this build, operator-confirmed player login)';
      return { verdict, reasons: [...failed, ...incomplete], checks, confirmedPlayerUserId: confirmedPlayerUserId ?? null, manifest };
    };

    g.SWSE_WP3B_GATE1 = {
      installed: true, store,
      report(confirmedPlayerUserId) {
        const ev = evaluate(confirmedPlayerUserId);
        const out = {
          probe: 'WP3B-GATE1', env: store.env, gmUserId: store.gmUserId, ...ev,
          created: store.created, updated: store.updated,
          note: 'Bounded empirical evidence for this Foundry build and server only. Reconcile with the PLAYER RESULTS (nonces, message ids). '
            + 'Repeat after any Foundry upgrade. A post-creation update means the executor must bind to the creation snapshot.',
        };
        console.log('[WP3B-GATE1] GM REPORT\n' + JSON.stringify(out, null, 2));
        return out;
      },
      async cleanup() {
        const ids = g.game.messages.filter((m) => probeOf(m)).map((m) => m.id);
        if (ids.length) await ChatMessage.deleteDocuments(ids);
        console.log(`[WP3B-GATE1] deleted ${ids.length} probe message(s)`);
      },
    };
    console.log('[WP3B-GATE1] GM listener ready. Run this file on a NON-GM player client, then SWSE_WP3B_GATE1.report("<player user id>") here.');
    return;
  }

  // ---------------- Player side: attempt every case, then send the attempt manifest ----------------
  (async () => {
    const me = g.game.user;
    const otherPlayer = g.game.users.find((u) => !u.isGM && u.id !== me.id) ?? null;
    const aGm = g.game.users.find((u) => u.isGM) ?? null;
    const whisper = gmIds();
    const entries = [];
    const mkNonce = () => foundry.utils.randomID(16);
    const send = async (caseName, { author, claimedUserId, extra } = {}) => {
      const nonce = mkNonce();
      const data = {
        content: `<p>SWSE WP3-B identity probe: ${caseName}</p>`, whisper,
        flags: { [FLAG_SCOPE]: { [FLAG_KEY]: { case: caseName, nonce, senderUserId: me.id, claimedUserId: claimedUserId ?? null, ...(extra ?? {}) } } },
      };
      if (author) data.author = author;
      try {
        const msg = await ChatMessage.create(data);
        const e = { case: caseName, nonce, claimedUserId: claimedUserId ?? null, outcome: msg ? 'created' : 'create returned nothing', messageId: msg?.id ?? null, storedAuthorId: msg?.author?.id ?? null };
        if (caseName !== 'manifest') entries.push(e);
        return msg;
      } catch (err) {
        if (caseName !== 'manifest') entries.push({ case: caseName, nonce, claimedUserId: claimedUserId ?? null, outcome: `rejected: ${err?.message ?? err}`, messageId: null });
        return null;
      }
    };

    const honest = await send('honest', { claimedUserId: me.id });
    if (otherPlayer) await send('forged-author-other-player', { author: otherPlayer.id, claimedUserId: otherPlayer.id });
    else entries.push({ case: 'forged-author-other-player', nonce: null, claimedUserId: null, outcome: 'skipped: no second player user exists in this world', messageId: null });
    if (aGm) await send('forged-author-gm', { author: aGm.id, claimedUserId: aGm.id });
    else entries.push({ case: 'forged-author-gm', nonce: null, claimedUserId: null, outcome: 'skipped: no GM user exists in this world', messageId: null });
    await send('claim-only', { claimedUserId: otherPlayer?.id ?? aGm?.id ?? null });

    let tamper;
    if (honest) {
      try {
        await honest.update({ [`flags.${FLAG_SCOPE}.${FLAG_KEY}.tampered`]: true, [`flags.${FLAG_SCOPE}.${FLAG_KEY}.claimedUserId`]: aGm?.id ?? 'x' });
        tamper = 'update accepted (executor must bind to the creation snapshot)';
      } catch (err) { tamper = `update rejected: ${err?.message ?? err}`; }
    }
    const manifest = { playerUserId: me.id, entries, tamper: tamper ?? 'not attempted (honest message not created)' };
    const manifestMsg = await send('manifest', { claimedUserId: me.id, extra: { manifest } });
    console.log('[WP3B-GATE1] PLAYER RESULTS (copy these with the GM REPORT)\n' + JSON.stringify({ env: env(), playerUserId: me.id, manifestMessageId: manifestMsg?.id ?? null, manifest }, null, 2));
  })();
})();
