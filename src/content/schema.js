const tex = value => value.replaceAll('§', String.fromCharCode(92));
export const E = (title, given, steps, conclusion) => ({ title, given, steps: steps.map(([equation, reason]) => ({ equation: tex(equation), reason })), conclusion });
export const C = (prompt, options, correct, explanation) => ({ prompt, options, correct, explanation });
export function D(id, prerequisites, objective, explanation, theorem, formula, symbols, derivation, example, check, transfer) {
  return { id, prerequisites, objective, explanation, theorem, formula: tex(formula), symbols, derivation: derivation.map(([equation, reason]) => ({ equation: tex(equation), reason })), example, check, transfer };
}
