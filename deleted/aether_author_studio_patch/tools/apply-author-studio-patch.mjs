#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const payloadRoot = path.join(packageRoot, "payload");
const repoRoot = path.resolve(process.argv.find(arg => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]) || process.cwd());
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");
const quiet = process.argv.includes("--quiet");

const markerCssStart = "/* === Aether Author Studio patch styles";
const scriptTag = '  <script src="js/subscription/author-studio.js"></script>';
const authorStudioSrc = path.join(payloadRoot, "js/subscription/author-studio.js");
const authorStudioDest = path.join(repoRoot, "js/subscription/author-studio.js");
const cssSrc = path.join(payloadRoot, "styles/author-studio.css");
const stylesDest = path.join(repoRoot, "styles.css");
const indexDest = path.join(repoRoot, "index.html");
const homeViewDest = path.join(repoRoot, "js/subscription/views/home-library.js");
const monolithDest = path.join(repoRoot, "js/subscription/aether-app.js");

const changes = [];
function log(message){ if (!quiet) console.log(message); }
function exists(file){ return fs.existsSync(file); }
function read(file){ return fs.readFileSync(file, "utf8"); }
function write(file, content){
  if (dryRun) { changes.push({ file, action:"would-write" }); return; }
  fs.mkdirSync(path.dirname(file), { recursive:true });
  fs.writeFileSync(file, content);
  changes.push({ file, action:"write" });
}
function copy(src, dest){
  const content = read(src);
  if (exists(dest) && read(dest) === content) {
    changes.push({ file:dest, action:"unchanged" });
    return;
  }
  write(dest, content);
}
function patchFile(file, patcher, label){
  if (!exists(file)) throw new Error(`Missing required file: ${path.relative(repoRoot, file)}`);
  const before = read(file);
  const after = patcher(before);
  if (after === before) {
    changes.push({ file, action:`unchanged:${label}` });
    return;
  }
  write(file, after);
}
function ensureSplitTarget(){
  const router = path.join(repoRoot, "js/subscription/router.js");
  const events = path.join(repoRoot, "js/subscription/events.js");
  const studioPreview = path.join(repoRoot, "js/subscription/views/studio-preview.js");
  if (exists(router) && exists(events) && exists(studioPreview)) return;
  if (exists(monolithDest)) {
    const app = read(monolithDest);
    if (app.includes("(function ()") && app.includes("const VIEWS = {}")) {
      throw new Error([
        "This patch targets the split subscription reader produced by the aether-app refactor.",
        "Your repo still appears to have the old IIFE monolith, where VIEWS/router/events are private.",
        "Apply the monolith split first, then run this patch. Use --force only if you have manually exposed VIEWS, parseHash, studioTop, afterRender, and handleAct as globals."
      ].join("\n"));
    }
  }
  if (!force) {
    throw new Error([
      "Could not find the split subscription files this patch expects:",
      "  js/subscription/router.js",
      "  js/subscription/events.js",
      "  js/subscription/views/studio-preview.js",
      "Run with --force only if you know your script order exposes the required globals."
    ].join("\n"));
  }
}
function patchIndex(html){
  if (html.includes('js/subscription/author-studio.js')) return html;
  const anchor = '  <script src="js/subscription/aether-app.js"></script>';
  if (!html.includes(anchor)) throw new Error("Could not find aether-app.js script tag in index.html");
  return html.replace(anchor, `${scriptTag}\n${anchor}`);
}
function patchHomeButton(src){
  let out = src;
  out = out.replace(/data-nav="\/studio\/access">(\$\{I\.overview\}|\$\{ic\("overview"\)\}|[^<]*)Author Studio/g, match => match.replace('data-nav="/studio/access"', 'data-nav="/studio/write"'));
  out = out.replace(/data-nav="\/studio\/access"/g, 'data-nav="/studio/write"');
  return out;
}
function appendCss(src){
  const patch = read(cssSrc).trimEnd() + "\n";
  if (src.includes(markerCssStart)) return src;
  return src.replace(/\s*$/, "\n\n") + patch;
}

function main(){
  log(`Aether Author Studio patch`);
  log(`Repo root: ${repoRoot}`);
  ensureSplitTarget();
  copy(authorStudioSrc, authorStudioDest);
  patchFile(indexDest, patchIndex, "index-script-tag");
  if (exists(homeViewDest)) patchFile(homeViewDest, patchHomeButton, "home-author-studio-button");
  if (exists(stylesDest)) patchFile(stylesDest, appendCss, "append-css");
  else write(stylesDest, read(cssSrc));
  log(dryRun ? "\nDry run complete. Planned changes:" : "\nPatch complete. Changed files:");
  for (const c of changes) log(`- ${path.relative(repoRoot, c.file)} [${c.action}]`);
  log("\nRecommended validation:");
  log("  node --check js/subscription/author-studio.js");
  log("  node --check js/subscription/router.js js/subscription/events.js js/subscription/aether-app.js");
  log("  Open index.html, sign in as admin, then use the homepage Author Studio button or #/studio/write.");
}

try { main(); }
catch (err) {
  console.error(`\nPatch failed:\n${err.message}`);
  process.exit(1);
}
