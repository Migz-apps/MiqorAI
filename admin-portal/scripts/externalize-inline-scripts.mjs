// Post-build step: move every inline <script> in the SPA shell into a hashed
// file under assets/, so the page runs under a `script-src 'self'` CSP without
// per-build hashes (one of the inline blocks embeds a build timestamp).
//
// Classic scripts stay classic and keep their order and attributes, so
// parser-blocking execution order and document.currentScript are unchanged.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const clientDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "client");
const shellPath = join(clientDir, "_shell.html");

if (!existsSync(shellPath)) {
  console.error(`externalize-inline-scripts: ${shellPath} not found (run vite build first)`);
  process.exit(1);
}

// Non-executable data blocks (JSON, import maps) are left inline.
const DATA_TYPES = /^(application\/(ld\+)?json|importmap)$/i;

let html = readFileSync(shellPath, "utf8");
let moved = 0;

html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (whole, attrs, body) => {
  if (/\bsrc\s*=/i.test(attrs) || body.trim() === "") return whole;
  const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1] ?? "";
  if (DATA_TYPES.test(type)) return whole;

  const hash = createHash("sha256").update(body).digest("hex").slice(0, 8);
  const file = `inline-${hash}.js`;
  writeFileSync(join(clientDir, "assets", file), body);
  moved += 1;
  const kept = attrs.trim();
  return `<script${kept ? ` ${kept}` : ""} src="/assets/${file}"></script>`;
});

const remaining = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
  ([, attrs, body]) => !/\bsrc\s*=/i.test(attrs) && body.trim() !== "",
);
if (remaining.length > 0) {
  console.error(
    `externalize-inline-scripts: ${remaining.length} inline script(s) left in the shell`,
  );
  process.exit(1);
}

writeFileSync(shellPath, html);
console.log(`externalize-inline-scripts: moved ${moved} inline script(s) out of _shell.html`);
