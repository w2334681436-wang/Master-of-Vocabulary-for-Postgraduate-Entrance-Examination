const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "data/words.js"), "utf8"), context);
const words = context.window.VOCABULARY;

const prefixes = [
  ["counter", "反向、对抗"], ["under", "在下、低于"], ["inter", "在……之间"], ["trans", "跨越、转移"],
  ["super", "在上、超出"], ["extra", "在外、额外"], ["micro", "微小"], ["multi", "多"],
  ["retro", "向后、回溯"], ["sub", "在下、次级"], ["over", "过度、在上"], ["post", "在后"],
  ["pre", "在前、预先"], ["pro", "向前、支持"], ["anti", "反对、抵抗"], ["auto", "自己"],
  ["hyper", "过度、超出"], ["hypo", "不足、在下"], ["intra", "在内部"], ["semi", "半"],
  ["tele", "远距离"], ["tri", "三"], ["ultra", "超越"], ["non", "不、非"], ["mis", "错误"],
  ["dis", "分开、不"], ["re", "再次、向后"], ["un", "不、相反"], ["de", "向下、去除"],
  ["ex", "向外、前任"], ["en", "使进入某状态"], ["em", "使进入某状态"], ["bi", "二、双"],
  ["co", "共同"], ["com", "共同、一起"], ["con", "共同、一起"], ["im", "进入、不"],
  ["in", "进入、不"], ["ir", "不"], ["il", "不"], ["fore", "在前"], ["mid", "中间"],
];

const suffixes = [
  ["ization", "……化的过程"], ["isation", "……化的过程"], ["ability", "能够……的性质"],
  ["ibility", "能够……的性质"], ["ology", "……学、研究"], ["ative", "具有……作用的"],
  ["ation", "动作或结果"], ["ition", "动作或结果"], ["ization", "……化"], ["ically", "以……方式"],
  ["escence", "形成某状态"], ["fulness", "充满……的性质"], ["lessness", "缺少……的性质"],
  ["aceous", "具有……特征的"], ["ious", "具有……特征的"], ["eous", "具有……特征的"],
  ["able", "能够……的"], ["ible", "能够……的"], ["ance", "状态、性质"], ["ence", "状态、性质"],
  ["ancy", "状态、性质"], ["ency", "状态、性质"], ["arian", "相关的人或事物"],
  ["ician", "从事……的人"], ["ment", "动作或结果"], ["ness", "性质、状态"], ["ship", "身份、关系"],
  ["tion", "动作或结果"], ["sion", "动作或结果"], ["ture", "动作或结果"], ["sure", "动作或结果"],
  ["ward", "朝……方向"], ["wise", "以……方式"], ["less", "没有……的"], ["ful", "充满……的"],
  ["ical", "与……有关的"], ["arian", "……相关者"], ["ary", "与……有关的"], ["ory", "与……有关的"],
  ["ous", "具有……特征的"], ["ive", "有……倾向或作用的"], ["ant", "做……的人或物"],
  ["ent", "做……的人或具有……性质的"], ["er", "做……的人或物"], ["or", "做……的人或物"],
  ["ist", "从事……的人"], ["ism", "思想、现象"], ["ity", "性质、状态"], ["ty", "性质、状态"],
  ["ize", "使成为"], ["ise", "使成为"], ["ify", "使成为"], ["fy", "使成为"],
  ["ate", "使……、做……"], ["al", "与……有关的"], ["ic", "与……有关的"], ["ly", "以……方式"],
];

const roots = [
  ["anthrop", "人类"], ["chron", "时间"], ["circum", "周围"], ["cogn", "认识"], ["corp", "身体"],
  ["dem", "人民"], ["derm", "皮肤"], ["equ", "相等"], ["fac", "做、制造"], ["fact", "做、事实"],
  ["fect", "做成"], ["fer", "携带、带来"], ["fin", "边界、结束"], ["form", "形状、形成"],
  ["fract", "打破"], ["gen", "产生、种类"], ["geo", "地球、土地"], ["grad", "步、等级"],
  ["graph", "写、记录"], ["ject", "投、掷"], ["jur", "法律、宣誓"], ["liter", "文字"],
  ["loc", "地点"], ["log", "说、学科"], ["magn", "大"], ["manu", "手"], ["med", "中间、治疗"],
  ["mem", "记忆"], ["migr", "迁移"], ["miss", "送出"], ["mit", "送出"], ["mort", "死亡"],
  ["mov", "移动"], ["mot", "移动"], ["norm", "规则、标准"], ["path", "感受、病"], ["ped", "脚、儿童"],
  ["phon", "声音"], ["photo", "光"], ["port", "携带、港口"], ["press", "压"], ["psych", "心理"],
  ["quir", "寻求、询问"], ["quest", "寻求、询问"], ["rupt", "破裂"], ["scrib", "写"], ["script", "写"],
  ["sect", "切"], ["sens", "感觉"], ["sent", "感觉、送"], ["spect", "看"], ["stat", "站立、状态"],
  ["stit", "站立、放置"], ["struct", "建造"], ["tract", "拉、引"], ["vac", "空"], ["ven", "来"],
  ["vent", "来"], ["ver", "真实"], ["vid", "看"], ["vis", "看"], ["voc", "声音、呼唤"],
  ["aud", "听"], ["bio", "生命"], ["capit", "头"], ["ced", "走、让步"], ["ceed", "走、前进"],
  ["cess", "走、前进"], ["cred", "相信"], ["dict", "说"], ["duc", "引导"], ["duct", "引导"],
  ["leg", "法律、选择"], ["pat", "相合、适应"], ["act", "行动"],
];

const familiarChunks = [
  ["work", "工作"], ["hand", "手"], ["head", "头"], ["heart", "心"], ["house", "房屋"],
  ["land", "土地"], ["water", "水"], ["fire", "火"], ["light", "光"], ["book", "书"], ["board", "板"],
  ["room", "房间"], ["ship", "船"], ["door", "门"], ["foot", "脚"], ["ball", "球"], ["line", "线"],
  ["mark", "标记"], ["side", "侧面"], ["back", "后面"], ["ground", "地面"], ["stone", "石头"],
  ["field", "田野"], ["school", "学校"], ["child", "孩子"], ["man", "人"], ["woman", "女人"],
  ["air", "空气"], ["art", "艺术"], ["care", "照料"], ["press", "按压"], ["port", "港口"],
];

function longestMatch(list, word, predicate) {
  return list
    .filter(([part]) => predicate(part))
    .sort((a, b) => b[0].length - a[0].length)[0] || null;
}

function splitVisual(word) {
  if (word.length <= 5) return [word.slice(0, 2), word.slice(2)].filter(Boolean);
  if (word.length <= 8) return [word.slice(0, 3), word.slice(3)].filter(Boolean);
  const first = Math.ceil(word.length / 3);
  const second = Math.ceil((word.length - first) / 2) + first;
  return [word.slice(0, first), word.slice(first, second), word.slice(second)].filter(Boolean);
}

function differenceCue(word, candidate) {
  let left = 0;
  while (left < word.length && left < candidate.length && word[left] === candidate[left]) left += 1;
  let right = 0;
  while (right < word.length - left && right < candidate.length - left
    && word[word.length - 1 - right] === candidate[candidate.length - 1 - right]) right += 1;
  const target = word.slice(left, Math.max(left + 1, word.length - right));
  const other = candidate.slice(left, Math.max(left + 1, candidate.length - right));
  return `与 ${candidate} 对照时，重点核对 ${target || "完整拼写"} ↔ ${other || "完整拼写"}`;
}

function specificMemory(memory) {
  if (!memory) return "";
  if (/作为第一提取点|先抓住|同时核对核心义/.test(memory)) return "";
  return memory.replace(/[。；]+$/, "");
}

function buildHook(word) {
  const lower = word.word.toLowerCase();
  const prefix = longestMatch(prefixes, lower, (part) => lower.startsWith(part) && lower.length - part.length >= 4);
  const suffix = longestMatch(suffixes, lower, (part) => lower.endsWith(part) && lower.length - part.length >= 3);
  const root = longestMatch(roots, lower, (part) => {
    const rootStart = lower.indexOf(part);
    const followsPrefix = prefix
      ? rootStart >= prefix[0].length - 1 && rootStart <= prefix[0].length + 1
      : rootStart === 0;
    return (prefix || suffix) && rootStart >= 0 && followsPrefix
    && (!prefix || rootStart + part.length > prefix[0].length)
    && (!suffix || lower.indexOf(part) < lower.length - suffix[0].length);
  });
  const familiar = longestMatch(familiarChunks, lower, (part) => lower.includes(part) && part.length >= 3);
  const parts = [];
  if (prefix) parts.push(`${prefix[0]}-（${prefix[1]}）`);
  if (root && (!prefix || root[0] !== prefix[0])) parts.push(`${root[0]}（${root[1]}）`);
  if (suffix && (!root || suffix[0] !== root[0])) parts.push(`-${suffix[0]}（${suffix[1]}）`);

  let hook;
  if (root && parts.length >= 2) {
    hook = `抓住 ${parts.join(" + ")} 的词形骨架，把整词 ${lower} 锁定为“${word.core}”`;
  } else if (root) {
    hook = `先认出中间的 ${root[0]}（${root[1]}），再看完整词形 ${lower}，把它固定到“${word.core}”`;
  } else if (familiar) {
    hook = `先圈出熟悉字块 ${familiar[0]}（${familiar[1]}），再补齐前后字母，把 ${lower} 整体绑定到“${word.core}”`;
  } else {
    const chunks = splitVisual(lower);
    hook = `把词形分成 ${chunks.join(" · ")} 三秒扫一遍；记住开头 “${lower.slice(0, Math.min(3, lower.length))}” 和结尾 “${lower.slice(-Math.min(3, lower.length))}”，整词只回忆“${word.core}”`;
  }

  if (word.confusions?.length) {
    const closest = [...word.confusions].sort((a, b) => Math.abs(a.length - lower.length) - Math.abs(b.length - lower.length))[0];
    hook += `；${differenceCue(lower, closest)}`;
  }
  const manual = specificMemory(word.memory);
  if (manual) hook += `；义项抓手：${manual}`;
  return `${hook}。`;
}

if (!Array.isArray(words) || words.length !== 1800) throw new Error(`Expected 1800 words, received ${words?.length}`);
const hooks = [null, ...words.map(buildHook)];
if (hooks.slice(1).some((hook) => typeof hook !== "string" || hook.length < 25)) throw new Error("Memory hook validation failed");

const output = `/* Generated, fixed word-shape memory hooks for all 1800 entries. */\nwindow.WORD_MEMORY_HOOKS=${JSON.stringify(hooks)};\n`;
fs.writeFileSync(path.join(projectRoot, "data/memory-hooks.js"), output);
console.log(`Generated ${hooks.length - 1} memory hooks.`);
