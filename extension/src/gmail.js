const API_ROOT = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function connect(interactive = true) {
  return chrome.identity.getAuthToken({ interactive });
}

export async function disconnect() {
  const { token } = await chrome.identity.getAuthToken({ interactive: false }).catch(() => ({ token: null }));
  if (!token) return;
  await chrome.identity.removeCachedAuthToken({ token });
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => undefined);
}

async function api(path, options = {}) {
  const { token } = await connect(options.interactive ?? false);
  if (!token) throw new Error("Mailbox connection is not authorized.");
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gmail API ${response.status}: ${detail}`);
  }
  return response.status === 204 ? null : response.json();
}

export async function listMessages(maxResults = 20) {
  const list = await api(`/messages?maxResults=${Math.min(maxResults, 50)}&q=${encodeURIComponent("newer_than:14d -in:trash")}`);
  return Promise.all((list.messages || []).map(async item => {
    const detail = await api(`/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`);
    const headers = Object.fromEntries((detail.payload?.headers || []).map(header => [header.name.toLowerCase(), header.value]));
    return { id: item.id, from: headers.from || "", subject: headers.subject || "", snippet: detail.snippet || "" };
  }));
}

export async function ensureLabel(name) {
  const labels = await api("/labels");
  const existing = (labels.labels || []).find(label => label.name === name);
  if (existing) return existing.id;
  const created = await api("/labels", {
    method: "POST",
    body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" })
  });
  return created.id;
}

export async function applyLabel(messageId, labelName) {
  const labelId = await ensureLabel(labelName);
  await api(`/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId], removeLabelIds: [] })
  });
}
