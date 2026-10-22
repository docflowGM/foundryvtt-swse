/**
 * Force Point as a TRANSACTION (E4-C1 WP5-C3). Created by SWSERoll.beginForcePointUse after the player confirmed and the bonus was rolled; it spends
 * nothing and posts nothing until told to. It owns no Force Point rule: spending is ActorEngine.spendForcePoints (the one authority) and giving a
 * point back is ActorEngine.gainForcePoints / updateActor.
 *
 *   commit()    spends one Force Point. Resolves true ONLY when the authority reports that a point was actually spent (a result of spent < 1, or a
 *               throw, is a failure). It records what THIS spend took: the normal point and, per bonus entry id, the bonus point (bonus points are
 *               spent first).
 *   rollback()  gives back exactly what this spend took and nothing else: the normal point as a relative gain (clamped to the maximum by the
 *               authority) and the bonus point added back to the CURRENT bonus pool by entry id. It never writes an absolute snapshot, so a Force Point
 *               gained, spent or granted by anything else since the commit is preserved. Only after a successful commit, only once: a rolled-back
 *               transaction is finished (commit/rollback return false), and a rollback that fails part-way does not repeat the part that succeeded.
 *   announce()  posts the "Force Point Used" message and the POST hook, only after a commit. It FINALIZES the use (a completed use is never refunded
 *               afterwards), is once-only per step (a completed step is never repeated, concurrent calls share one run), and never throws: a
 *               presentation failure returns false and is recorded (chatPosted / hookRan / announceError) without touching the spend.
 *
 * Terminal-state precedence (one client): the first of rollback() / announce() / finalize() to be ACCEPTED wins, decided synchronously. An accepted
 * rollback bars finalize/announce/commit (rollbackAccepted); a final use bars rollback. Same-operation calls share one run.
 * Concurrency (one client; Foundry has no compare-and-swap): commit() and rollback() are single-flight — simultaneous callers share one run and one
 * outcome, and a rollback waits for an in-flight commit. state: new -> committing -> committed -> (final) | rolled-back; a commit whose spend threw
 * AFTER the pool visibly changed is 'indeterminate': closed, never repeated, never refunded automatically.
 */
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { ROLL_HOOKS } from "/systems/foundryvtt-swse/scripts/rolls/roll-config.js";

/** Bonus Force Points normalized the way ActorEngine.spendForcePoints reads them, so the entries a spend consumed can be given back by id. */
const bonusEntries = (pool) => {
  if (!pool || typeof pool !== 'object') {return [];}
  if (Array.isArray(pool.entries) && pool.entries.length) {return pool.entries.map((e, i) => ({ ...e, id: String(e?.id ?? `bonus-${i}`), value: Math.max(0, Number(e?.value ?? 0) || 0) }));}
  const v = Math.max(0, Number(pool.value ?? 0) || 0);
  return v > 0 ? [{ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: v, max: v }] : [];
};

export function createForcePointTransaction({ actor, result, formula, reason = '', roll = null }) {
  let commitRun = null;
  let rollbackRun = null;
  let announceRun = null;
  const poolNow = () => ({ normal: Number(actor.system?.forcePoints?.value ?? 0), bonus: bonusEntries(actor.getFlag?.('swse', 'bonusForcePoints')).reduce((n, e) => n + e.value, 0) });
  const tx = {
    result,
    formula,
    state: 'new',
    committed: false,
    closed: false,
    final: false,    // the use is complete: it can no longer be refunded
    rollbackAccepted: false,   // a rollback was accepted for execution: nothing may finalize, announce or re-claim the commitment
    spentNormal: 0,
    gaveBonus: [],   // [{ entry, amount }] — what this spend took from each bonus entry
    shown: null,
    chatPosted: false,
    hookRan: false,
    announced: false,
    announceError: null,
    commit() {
      if (tx.closed || tx.rollbackAccepted) {return Promise.resolve(false);}
      if (tx.committed) {return Promise.resolve(true);}
      commitRun ??= tx._commit().finally(() => { commitRun = null; });
      return commitRun;
    },
    async _commit() {
      tx.state = 'committing';
      const pool = actor.system.forcePoints ?? {};
      const beforeBonus = bonusEntries(actor.getFlag?.('swse', 'bonusForcePoints'));
      const before = poolNow();
      tx.shown = { remaining: Math.max(0, (pool.value ?? 0) - 1), max: pool.max ?? 0 };   // (use calculated value instead of stale reference)
      let spent;
      try {
        const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
        spent = await ActorEngine.spendForcePoints(actor, 1);   // PHASE 3: Route through ActorEngine
      } catch (err) {
        console.error('Failed to spend Force Point:', err);
        const after = poolNow();
        if (after.normal !== before.normal || after.bonus !== before.bonus) {
          // The spend threw after the pool visibly changed: it may or may not have fully applied. Not success, not repeatable, not auto-refunded.
          tx.state = 'indeterminate'; tx.closed = true;
          ui.notifications.error('A Force Point spend could not be confirmed. Check the Force Point pool before spending again.');
        } else {
          tx.state = 'new';
          ui.notifications.error('Failed to spend Force Point. Please try again.');
        }
        return false;
      }
      if (!(Number(spent?.spent) >= 1)) {   // the authority spent nothing (e.g. no Force Point left): the use is not paid for
        tx.state = 'new';
        ui.notifications.error('No Force Point could be spent.');
        return false;
      }
      const afterBonus = bonusEntries(actor.getFlag?.('swse', 'bonusForcePoints'));
      tx.gaveBonus = beforeBonus
        .map((e) => ({ entry: e, amount: e.value - (afterBonus.find((x) => x.id === e.id)?.value ?? 0) }))
        .filter((x) => x.amount > 0);
      const bonusTaken = tx.gaveBonus.reduce((n, x) => n + x.amount, 0);
      tx.spentNormal = Math.max(0, Number.isFinite(spent?.normalSpent) ? spent.normalSpent : (Number(spent?.spent) || 0) - bonusTaken);
      tx.committed = true;
      tx.state = 'committed';
      return true;
    },
    /** Marks a committed use as complete (no later refund). announce() does this itself. */
    finalize() {
      if (!tx.committed || tx.closed || tx.rollbackAccepted) {return false;}
      tx.final = true;
      return true;
    },
    rollback() {
      if (rollbackRun) {return rollbackRun;}
      if (tx.closed || tx.final || !(tx.committed || commitRun)) {return Promise.resolve(false);}
      tx.rollbackAccepted = true;   // synchronously, before the first await: from here no competing call can finalize, announce or re-claim the spend
      rollbackRun = (async () => {
        try {
          if (commitRun) {await commitRun.catch(() => false);}   // never refund while the spend is still being decided
          if (!tx.committed || tx.closed) {return false;}
          return await tx._rollback();
        } finally {
          // Nothing was spent (the commit failed): the claim lapses. Otherwise it stays — a refund that was attempted and failed part-way is never
          // announced or finalized as a completed use; it may only be retried.
          if (!tx.committed && !tx.closed) {tx.rollbackAccepted = false;}
        }
      })().finally(() => { rollbackRun = null; });
      return rollbackRun;
    },
    async _rollback() {
      try {
        const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
        if (tx.spentNormal > 0) {
          await ActorEngine.gainForcePoints(actor, tx.spentNormal);
          tx.spentNormal = 0;   // done: a retry after a later failure must not give it back twice
        }
        if (tx.gaveBonus.length) {
          const poolNow = actor.getFlag?.('swse', 'bonusForcePoints') ?? {};
          const entries = bonusEntries(poolNow);
          for (const { entry, amount } of tx.gaveBonus) {
            const here = entries.find((e) => e.id === entry.id);
            if (here) {here.value += amount;}
            else {entries.push({ ...entry, value: amount });}
          }
          const value = entries.reduce((n, e) => n + e.value, 0);
          const max = entries.reduce((n, e) => n + Math.max(0, Number(e.max ?? e.value) || 0), 0);
          await ActorEngine.updateActor(actor, { 'flags.swse.bonusForcePoints': { ...poolNow, value, max: Math.max(value, max), sources: [...new Set(entries.map((e) => e.source).filter(Boolean))], entries } });
          tx.gaveBonus = [];
        }
        tx.committed = false;
        tx.closed = true;
        tx.state = 'rolled-back';
        return true;
      } catch (err) {
        console.error('Failed to restore Force Point after a refused attack:', err);
        ui.notifications.error('A Force Point was spent for an attack that did not happen and could not be restored automatically. Please correct it by hand.');
        return false;
      }
    },
    announce() {
      if (!tx.committed || tx.closed || tx.rollbackAccepted) {return Promise.resolve(false);}
      tx.final = true;   // synchronously: from here a refund is refused
      if (tx.announced) {return Promise.resolve(true);}
      announceRun ??= tx._announce().finally(() => { announceRun = null; });
      return announceRun;
    },
    async _announce() {
      tx.announceError = null;
      if (!tx.chatPosted) {
        try {
          const message = await createChatMessage({
            speaker: ChatMessage.getSpeaker({ actor }),
            content: `
          <div class="swse-forcepoint-roll">
            <h3>Force Point Used</h3>
            <p>Rolled: ${formula}</p>
            <p>Result Applied: <strong>+${result}</strong></p>
            <p>FP Remaining: ${tx.shown.remaining}/${tx.shown.max}</p>
          </div>
        `
          });
          if (message) {tx.chatPosted = true;}   // createChatMessage resolves null (it does not throw) when the message was not created
          else {tx.announceError = new Error('chat message was not created');}
        } catch (err) { tx.announceError = err; }
      }
      if (!tx.hookRan) {
        try {
          Hooks.callAll(ROLL_HOOKS.POST_FORCE_POINT, actor, { roll, result, reason });   // Post-roll hook
          tx.hookRan = true;
        } catch (err) { tx.announceError = err; }
      }
      if (tx.chatPosted && tx.hookRan) {
        tx.announced = true;
        return true;
      }
      console.error('Force Point announcement failed:', tx.announceError);
      ui.notifications.warn('The Force Point was spent and applied, but its chat message or follow-up hook failed.');
      return false;
    }
  };
  return tx;
}
