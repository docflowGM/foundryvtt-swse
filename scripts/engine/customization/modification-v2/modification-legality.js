/**
 * Legality framework -- G3 (pure, fails closed). Per-Item host eligibility can be established ONLY by a registered,
 * named evaluator that returns certified evidence. G3 ships no evaluators, so every answer is `not_established`.
 * A specified host requirement is not an evaluation (generator schema 6.1); a missing, unnamed, unregistered, throwing
 * or malformed evaluator is `not_established`, never "allowed".
 */
export function createLegalityFramework({ evaluators = {} } = {}) {
  const registry = Object.freeze({ ...evaluators });
  return Object.freeze({
    evaluate(typedRecord, host) {
      const notEstablished = (reason) => ({ status: 'not_established', reasons: [reason], evaluator: null, evidence: [] });
      const a = typedRecord?.applicability;
      if (!a || a.hostRequirementsSpecified !== true) return notEstablished('HOST_REQUIREMENTS_NOT_SPECIFIED');
      if (typeof a.hostEvaluator !== 'string' || a.hostEvaluator.length === 0) return notEstablished('HOST_EVALUATOR_NOT_NAMED');
      if (!Object.prototype.hasOwnProperty.call(registry, a.hostEvaluator) || typeof registry[a.hostEvaluator] !== 'function') return notEstablished('HOST_EVALUATOR_NOT_REGISTERED');
      let verdict;
      try {
        verdict = registry[a.hostEvaluator](host, typedRecord);
      } catch (_err) {
        return notEstablished('HOST_EVALUATOR_THREW');
      }
      const ok = verdict && (verdict.verdict === 'legal' || verdict.verdict === 'illegal') && Array.isArray(verdict.evidence) && verdict.evidence.length > 0 && verdict.evidence.every((e) => typeof e === 'string' && e.length > 0);
      if (!ok) return notEstablished('HOST_EVALUATOR_MALFORMED');
      return { status: verdict.verdict, reasons: [], evaluator: a.hostEvaluator, evidence: [...verdict.evidence] };
    }
  });
}
