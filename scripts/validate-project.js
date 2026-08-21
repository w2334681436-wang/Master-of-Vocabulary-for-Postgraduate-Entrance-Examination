const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
for (const file of ["data/words.js", "data/memory-hooks.js", "data/learning-content.js"]) {
  vm.runInNewContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const words = context.window.VOCABULARY;
const hooks = context.window.WORD_MEMORY_HOOKS;
const learning = context.window.WORD_LEARNING_CONTENT;
const meta = context.window.WORD_LEARNING_CONTENT_META;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(Array.isArray(words) && words.length === 1800, "Vocabulary must contain exactly 1800 words");
assert(Array.isArray(hooks) && hooks.length === 1801, "Every word must have a memory hook");
assert(Array.isArray(learning) && learning.length === 1801, "Every word must have a learning record");

const names = new Set();
const hookTexts = new Set();
for (const [index, word] of words.entries()) {
  assert(word.id === index + 1, `Non-contiguous word id at ${word.word}`);
  assert(word.word && word.core && word.meaning, `Incomplete vocabulary record at id ${word.id}`);
  assert(!names.has(word.word), `Duplicate word: ${word.word}`);
  names.add(word.word);
  const hook = hooks[word.id];
  assert(hook?.kind && hook?.text?.length >= 20, `Missing memory hook: ${word.word}`);
  assert(!hookTexts.has(hook.text), `Duplicate memory hook: ${word.word}`);
  hookTexts.add(hook.text);
  assert(!/这个词的早期用法|词义基本没走样|沿着“|三秒扫一遍/.test(hook.text), `Unreliable mnemonic: ${word.word}`);
  assert(learning[word.id]?.definition?.length, `Missing English definition: ${word.word}`);
}

for (const word of words) {
  for (const candidate of word.confusions || []) {
    assert(names.has(candidate), `Unknown confusion target: ${word.word} -> ${candidate}`);
  }
}

assert(meta?.coverage?.definitions === 1800, "Learning-content coverage metadata is stale");

const serviceWorker = fs.readFileSync(path.join(root, "sw.js"), "utf8");
const coreMatch = serviceWorker.match(/const CORE = \[(.*?)\];/s);
assert(coreMatch, "Service worker CORE list missing");
const core = vm.runInNewContext(`[${coreMatch[1]}]`);
for (const asset of core) {
  if (["/", "./"].includes(asset)) continue;
  assert(fs.existsSync(path.join(root, asset.replace(/^\.\//, ""))), `Offline asset missing: ${asset}`);
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
assert(manifest.display === "fullscreen", "PWA must prefer fullscreen display");
assert(manifest.icons?.some((icon) => icon.sizes === "192x192"), "PWA 192 icon missing");
assert(manifest.icons?.some((icon) => icon.sizes === "512x512"), "PWA 512 icon missing");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const asset of ["manifest.webmanifest", "data/words.js", "data/memory-hooks.js", "data/learning-content.js", "app.js"]) {
  assert(html.includes(asset), `index.html does not load ${asset}`);
}

const basis = hooks.slice(1).reduce((result, hook) => {
  result[hook.basis] = (result[hook.basis] || 0) + 1;
  return result;
}, {});
console.log(JSON.stringify({ words: words.length, definitions: meta.coverage.definitions, examples: meta.coverage.examples, hooks: basis, offlineAssets: core.length }));
