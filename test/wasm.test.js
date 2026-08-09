import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import init, { empty_model, learn, predict } from "../extension/wasm/mail_harbor_ml.js";

test("compiled WebAssembly learns and explains a personal correction", async () => {
  const bytes = await readFile(new URL("../extension/wasm/mail_harbor_ml_bg.wasm", import.meta.url));
  await init({ module_or_path: bytes });
  let model = empty_model();
  model = learn("invoice receipt payment", "Finance", model);
  model = learn("build release deployment", "Engineering", model);
  const result = JSON.parse(predict("payment receipt", model));
  assert.equal(result.label, "Finance");
  assert.ok(result.confidence > 0.5);
  assert.match(result.explanation, /receipt|payment/);
});
