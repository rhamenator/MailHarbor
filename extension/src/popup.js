const results = document.querySelector("#results");
const status = document.querySelector("#status");
const mode = document.querySelector("#mode");
const apply = document.querySelector("#apply");
let items = [];

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "Extension request failed.");
  return response.result;
}

async function refreshMode() {
  const state = await send({ type: "status" });
  mode.textContent = state.mode === "connected" ? "Connected mode · changes require selection" : "Mock mode · mailbox untouched";
}

document.querySelector("#connect").addEventListener("click", () => run(async () => {
  await send({ type: "connect" }); await refreshMode(); status.textContent = "Connected. Run a dry review before applying anything.";
}));
document.querySelector("#disconnect").addEventListener("click", () => run(async () => {
  await send({ type: "disconnect" }); await refreshMode(); status.textContent = "Disconnected and returned to mock mode.";
}));
document.querySelector("#dry-run").addEventListener("click", () => run(async () => {
  const result = await send({ type: "dryRun", limit: 20 }); items = result.items; render(); status.textContent = `${items.length} suggestions generated; no labels changed.`;
}));
apply.addEventListener("click", () => run(async () => {
  const selected = [...results.querySelectorAll("input[type=checkbox]:checked")].map(input => {
    const index = Number(input.dataset.index); const select = results.querySelector(`select[data-index="${index}"]`);
    return { messageId: items[index].message.id, label: select.value };
  });
  const result = await send({ type: "apply", items: selected }); status.textContent = `Applied ${result.applied} reviewed label changes.`;
}));

function render() {
  results.replaceChildren();
  items.forEach((item, index) => {
    const card = document.createElement("article"); card.className = "card";
    const label = document.createElement("label");
    const checkbox = document.createElement("input"); checkbox.type = "checkbox"; checkbox.dataset.index = index;
    checkbox.addEventListener("change", updateApply);
    const text = document.createElement("span");
    const subject = document.createElement("strong"); subject.textContent = item.message.subject || "(no subject)";
    const from = document.createElement("span"); from.textContent = item.message.from;
    const explanation = document.createElement("small"); explanation.textContent = `${item.suggestion.label} · ${Math.round(item.suggestion.confidence * 100)}% · ${item.suggestion.explanation}`;
    text.append(subject, from, explanation); label.append(checkbox, text);
    const select = document.createElement("select"); select.dataset.index = index;
    [item.suggestion.label, "Finance", "Engineering", "Security", "Events", "Review"].filter((value, position, values) => values.indexOf(value) === position).forEach(value => {
      const option = document.createElement("option"); option.value = value; option.textContent = value; select.append(option);
    });
    select.addEventListener("change", () => send({ type: "feedback", message: item.message, label: select.value }).then(() => { status.textContent = `Correction learned locally: ${select.value}.`; }));
    card.append(label, select); results.append(card);
  });
  updateApply();
}

function updateApply() { apply.disabled = results.querySelectorAll("input[type=checkbox]:checked").length === 0; }
async function run(action) { try { status.textContent = "Working…"; await action(); } catch (error) { status.textContent = error.message; } }
refreshMode().catch(error => { status.textContent = error.message; });
