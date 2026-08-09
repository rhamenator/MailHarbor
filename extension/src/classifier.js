import { predictPersonal } from "./ml.js";
import { defaultRules, ruleSuggestion } from "./rules.js";

export function messageText(message) {
  return `${message.from}\n${message.subject}\n${message.snippet}`;
}

export async function classify(message, settings) {
  const rule = ruleSuggestion(message, settings.rules || defaultRules);
  const personal = await predictPersonal(messageText(message), settings.modelJson || "");
  if (personal.confidence >= (settings.personalThreshold ?? 0.58)) {
    return { ...personal, source: "personal model" };
  }
  return { ...rule, source: "local rule" };
}
