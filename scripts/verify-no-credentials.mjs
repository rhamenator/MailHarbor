import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const ignored = new Set([".git", "node_modules", "target"]);
const suspiciousNames = [/client_secret.*\.json/i, /credentials.*\.json/i, /token.*\.json/i, /\.pem$/i, /\.p12$/i];
const suspiciousContent = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /"refresh_token"\s*:/, /"client_secret"\s*:\s*"(?!REPLACE_)/];
const textExtensions = new Set([".js", ".mjs", ".json", ".md", ".html", ".css", ".toml", ".rs", ".yml", ".yaml"]);
const failures = [];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    const display = relative(root, path);
    if (entry.isDirectory()) { await visit(path); continue; }
    if (suspiciousNames.some(pattern => pattern.test(entry.name))) failures.push(`${display}: credential-like filename`);
    if (!textExtensions.has(extname(entry.name))) continue;
    const content = await readFile(path, "utf8");
    if (suspiciousContent.some(pattern => pattern.test(content))) failures.push(`${display}: credential-like content`);
  }
}

await visit(root);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("No credential files or token/private-key patterns found.");
