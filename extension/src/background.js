import { classify, messageText } from "./classifier.js";
import { applyLabel, connect, disconnect, listMessages } from "./gmail.js";
import { learnPersonal } from "./ml.js";
import { mockMessages } from "./mock-mailbox.js";
import { defaultRules } from "./rules.js";

const defaults = { mode: "mock", rules: defaultRules, modelJson: "", personalThreshold: 0.58 };

async function settings() {
  return { ...defaults, ...(await chrome.storage.local.get(defaults)) };
}

async function suggestions(messages) {
  const state = await settings();
  return Promise.all(messages.map(async message => ({ message, suggestion: await classify(message, state) })));
}

async function handle(request) {
  switch (request.type) {
    case "status": {
      const state = await settings();
      return { mode: state.mode };
    }
    case "connect":
      await connect(true);
      await chrome.storage.local.set({ mode: "connected" });
      return { mode: "connected" };
    case "disconnect":
      await disconnect();
      await chrome.storage.local.set({ mode: "mock" });
      return { mode: "mock" };
    case "dryRun": {
      const state = await settings();
      const messages = state.mode === "connected" ? await listMessages(request.limit || 20) : mockMessages;
      return { mode: state.mode, items: await suggestions(messages) };
    }
    case "apply": {
      const state = await settings();
      if (state.mode !== "connected") throw new Error("Mock mode never changes a mailbox.");
      const selected = Array.isArray(request.items) ? request.items : [];
      if (selected.length === 0) throw new Error("Select at least one reviewed suggestion.");
      for (const item of selected) await applyLabel(item.messageId, item.label);
      return { applied: selected.length };
    }
    case "feedback": {
      const state = await settings();
      const modelJson = await learnPersonal(messageText(request.message), request.label, state.modelJson);
      await chrome.storage.local.set({ modelJson });
      return { learned: true };
    }
    case "saveRules":
      await chrome.storage.local.set({ rules: request.rules, personalThreshold: request.personalThreshold });
      return { saved: true };
    default:
      throw new Error(`Unknown request: ${request.type}`);
  }
}

chrome.runtime.onMessage.addListener((request, _sender, respond) => {
  handle(request).then(result => respond({ ok: true, result })).catch(error => respond({ ok: false, error: error.message }));
  return true;
});
