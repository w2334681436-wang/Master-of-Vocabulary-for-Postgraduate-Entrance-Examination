#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "data/words.js"), "utf8"), context);
const words = context.window.VOCABULARY;

const rootArg = process.argv.find((arg) => arg.startsWith("--ewn-root="));
const ewnRoot = rootArg
  ? path.resolve(rootArg.slice("--ewn-root=".length))
  : process.env.EWN_ROOT
    ? path.resolve(process.env.EWN_ROOT)
    : "";
const yamlRoot = path.join(ewnRoot, "src", "yaml");

if (!ewnRoot || !fs.existsSync(yamlRoot)) {
  console.error("Usage: node scripts/build-learning-content.js --ewn-root=/path/to/english-wordnet");
  process.exit(1);
}

const normalizeKey = (value) => String(value || "").trim().toLowerCase();
const unquote = (value) => {
  const text = String(value || "").trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  return text;
};

function topLevelBlocks(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const blocks = new Map();
  let key = "";
  let buffer = [];
  const flush = () => {
    if (key) blocks.set(normalizeKey(unquote(key)), buffer);
  };
  for (const line of lines) {
    const match = line.match(/^([^\s][^:]*(?::[^:]*)?):\s*$/);
    if (match) {
      flush();
      key = match[1];
      buffer = [];
    } else if (key) {
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}

function parseList(block, key, indent = 2) {
  const values = [];
  const heading = `${" ".repeat(indent)}${key}:`;
  for (let index = 0; index < block.length; index += 1) {
    if (block[index] !== heading) continue;
    for (let cursor = index + 1; cursor < block.length; cursor += 1) {
      const line = block[cursor];
      const itemMatch = line.match(new RegExp(`^${" ".repeat(indent)}- (.*)$`));
      if (itemMatch) {
        values.push(unquote(itemMatch[1]));
        continue;
      }
      const continuation = line.match(new RegExp(`^${" ".repeat(indent + 2)}([^ ].*)$`));
      if (continuation && values.length) {
        values[values.length - 1] += ` ${unquote(continuation[1])}`;
        continue;
      }
      if (line.trim()) break;
    }
  }
  return values.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function parseEntry(block) {
  const byPos = new Map();
  let currentPos = "";
  for (let index = 0; index < block.length; index += 1) {
    const line = block[index];
    const posMatch = line.match(/^  ([nvars]):\s*$/);
    if (posMatch) {
      currentPos = posMatch[1];
      if (!byPos.has(currentPos)) byPos.set(currentPos, { synsets: [], examples: [] });
      continue;
    }
    if (!currentPos) continue;
    const synsetMatch = line.match(/^      synset:\s+(.+)$/);
    if (synsetMatch) byPos.get(currentPos).synsets.push(unquote(synsetMatch[1]));
    if (line === "      sent:") {
      for (let cursor = index + 1; cursor < block.length; cursor += 1) {
        const exampleMatch = block[cursor].match(/^      - (.*)$/);
        if (!exampleMatch) break;
        byPos.get(currentPos).examples.push(unquote(exampleMatch[1]));
      }
    }
  }
  return byPos;
}

const entryFiles = fs.readdirSync(yamlRoot).filter((name) => /^entries-.*\.yaml$/.test(name));
const entries = new Map();
for (const fileName of entryFiles) {
  for (const [key, block] of topLevelBlocks(path.join(yamlRoot, fileName))) {
    entries.set(key, parseEntry(block));
  }
}

const wantedSynsets = new Set();
for (const word of words) {
  const entry = entries.get(normalizeKey(word.word));
  if (!entry) continue;
  for (const record of entry.values()) record.synsets.forEach((id) => wantedSynsets.add(id));
}

const synsets = new Map();
const synsetFiles = fs.readdirSync(yamlRoot).filter((name) => /^(noun|verb|adj|adv)\..*\.yaml$/.test(name));
for (const fileName of synsetFiles) {
  for (const [key, block] of topLevelBlocks(path.join(yamlRoot, fileName))) {
    if (!wantedSynsets.has(key)) continue;
    synsets.set(key, {
      definitions: parseList(block, "definition"),
      examples: parseList(block, "example"),
      members: parseList(block, "members"),
    });
  }
}

function preferredPos(word) {
  const raw = String(word.pos || "").toLowerCase();
  if (raw.startsWith("v")) return ["v", "n", "a", "s", "r"];
  if (raw.startsWith("adj")) return ["a", "s", "n", "v", "r"];
  if (raw.startsWith("adv")) return ["r", "a", "s", "n", "v"];
  return ["n", "v", "a", "s", "r"];
}

function unique(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanExample(value) {
  return String(value || "")
    .replace(/^source:\s+.*?\s+text:\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const records = [null];
const coverage = { entries: 0, definitions: 0, examples: 0, clozeExamples: 0 };
const manualContent = {
  albeit: {
    definition: ["although; even though"],
    examples: ["Albeit difficult, the task was worth attempting."],
    synonyms: ["although"],
  },
  versus: {
    definition: ["against, or in contrast with"],
    examples: ["The debate compares individual freedom versus public safety."],
    synonyms: ["against"],
  },
  shall: {
    definition: ["used to express the future, determination, or obligation"],
    examples: ["We shall return to this question later."],
    synonyms: ["will"],
  },
};
for (const word of words) {
  const entry = entries.get(normalizeKey(word.word));
  const ordered = [];
  if (entry) {
    coverage.entries += 1;
    for (const pos of preferredPos(word)) {
      if (entry.has(pos)) ordered.push([pos, entry.get(pos)]);
    }
    for (const pair of entry.entries()) {
      if (!ordered.some(([pos]) => pos === pair[0])) ordered.push(pair);
    }
  }
  const definitions = [];
  const examples = [];
  const synonyms = [];
  for (const [, record] of ordered) {
    examples.push(...record.examples);
    for (const synsetId of record.synsets) {
      const synset = synsets.get(synsetId);
      if (!synset) continue;
      definitions.push(...synset.definitions);
      examples.push(...synset.examples.map(cleanExample));
      synonyms.push(...synset.members.filter((member) => normalizeKey(member) !== normalizeKey(word.word)));
    }
  }
  const result = manualContent[word.word] || {
    definition: unique(definitions).slice(0, 3),
    examples: unique(examples.map(cleanExample)).slice(0, 4),
    synonyms: unique(synonyms).slice(0, 6),
  };
  if (result.definition.length) coverage.definitions += 1;
  if (result.examples.length) coverage.examples += 1;
  if (result.examples.some((example) => new RegExp(`(^|[^a-z])${word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(example))) {
    coverage.clozeExamples += 1;
  }
  records[word.id] = result;
}

const output = `window.WORD_LEARNING_CONTENT = ${JSON.stringify(records)};\nwindow.WORD_LEARNING_CONTENT_META = ${JSON.stringify({
  source: "Open English WordNet",
  revision: "d94538ad0df3d7a4c77837bde6af69d7a6592c32",
  coverage,
})};\n`;
fs.writeFileSync(path.join(projectRoot, "data/learning-content.js"), output);
console.log(JSON.stringify(coverage));
