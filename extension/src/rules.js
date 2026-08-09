export const defaultRules = [
  { label: "Finance", terms: ["invoice", "receipt", "billing", "payment"] },
  { label: "Engineering", terms: ["release", "build", "deploy", "pipeline"] },
  { label: "Security", terms: ["security", "sign-in", "password", "alert"] },
  { label: "Events", terms: ["meetup", "invitation", "webinar", "conference"] }
];

export function ruleSuggestion(message, rules = defaultRules) {
  const text = `${message.from} ${message.subject} ${message.snippet}`.toLowerCase();
  const candidates = rules.map(rule => {
    const matched = rule.terms.filter(term => text.includes(term.toLowerCase()));
    return { label: rule.label, matched, score: matched.length / Math.max(rule.terms.length, 1) };
  }).sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));
  const best = candidates[0];
  if (!best || best.matched.length === 0) {
    return { label: "Review", confidence: 0, explanation: "No local rule matched; keep this message in review." };
  }
  return {
    label: best.label,
    confidence: Math.min(0.85, 0.45 + best.score),
    explanation: `Rule matched: ${best.matched.join(", ")}.`
  };
}
