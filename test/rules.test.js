import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ruleSuggestion } from "../extension/src/rules.js";

test("rules explain the matched local terms", () => {
  const result = ruleSuggestion({ from: "billing@example.test", subject: "Invoice ready", snippet: "Payment receipt" });
  assert.equal(result.label, "Finance");
  assert.match(result.explanation, /invoice|payment|receipt/);
});

test("unmatched messages remain in review", () => {
  const result = ruleSuggestion({ from: "person@example.test", subject: "Hello", snippet: "A general note" });
  assert.equal(result.label, "Review");
  assert.equal(result.confidence, 0);
});

test("manifest requests only the required Gmail host and modify scope", async () => {
  const manifest = JSON.parse(await readFile(new URL("../extension/manifest.json", import.meta.url)));
  assert.deepEqual(manifest.host_permissions, ["https://gmail.googleapis.com/*"]);
  assert.deepEqual(manifest.oauth2.scopes, ["https://www.googleapis.com/auth/gmail.modify"]);
  assert.equal(manifest.permissions.includes("tabs"), false);
  assert.match(manifest.oauth2.client_id, /^REPLACE_WITH_/);
});
