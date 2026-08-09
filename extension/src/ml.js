let modulePromise;

async function moduleInstance() {
  modulePromise ??= import("../wasm/mail_harbor_ml.js").then(async module => {
    await module.default({ module_or_path: chrome.runtime.getURL("wasm/mail_harbor_ml_bg.wasm") });
    return module;
  });
  return modulePromise;
}

export async function predictPersonal(text, modelJson) {
  const module = await moduleInstance();
  return JSON.parse(module.predict(text, modelJson || module.empty_model()));
}

export async function learnPersonal(text, label, modelJson) {
  const module = await moduleInstance();
  return module.learn(text, label, modelJson || module.empty_model());
}
