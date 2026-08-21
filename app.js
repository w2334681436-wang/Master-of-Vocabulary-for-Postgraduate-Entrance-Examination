(function () {
  "use strict";

  const WORDS = Array.isArray(window.VOCABULARY) ? window.VOCABULARY : [];
  const ADVENTURE = window.CIZHAN_ADVENTURE || { arcs: [], episodes: [], chapters: [], chapterById: {}, nodeById: {}, wordPlan: () => ({}) };
  const WORD_BY_ID = new Map(WORDS.map((word) => [word.id, word]));
  const DB_NAME = "cizhan-vocabulary-v1";
  const DB_VERSION = 1;
  const DAY = 86_400_000;
  const HOUR = 3_600_000;
  const MAX_EVENTS = 50_000;
  const TYPE_LABELS = {
    recognition: "阅读识义",
    recall: "主动回忆",
    context: "语境完形",
    spelling: "完整拼写",
    discrimination: "易混辨析",
  };
  const TYPE_SHORT = {
    recognition: "识义",
    recall: "回忆",
    context: "语境",
    spelling: "拼写",
    discrimination: "辨析",
  };
  const TYPE_REQUIREMENTS = {
    recognition: 3,
    recall: 2,
    context: 2,
    spelling: 2,
    discrimination: 1,
  };
  const TYPE_WEIGHTS = { recognition: 0.16, recall: 0.25, context: 0.2, spelling: 0.24, discrimination: 0.15 };
  const READING_WEIGHTS = { recognition: 0.48, context: 0.4, discrimination: 0.12 };
  const WRITING_WEIGHTS = { recognition: 0.12, recall: 0.27, context: 0.17, spelling: 0.31, discrimination: 0.13 };
  const WRITING_WORDS = new Set(`
    fluctuate municipal propagate duplicate intimate solemn catastrophe doctrine prevalent salient consensus criterion scrutiny
    culminate dignity prosperous rigorous scenario appraisal denounce envisage turmoil strenuous depict alleviate quarantine
    hypocrisy custody resemblance metropolitan imperative reassure metaphor convene reluctant robust rigid frustrate repel
    protest concede coalition propaganda fracture strive absurd versatile volatile eminent facilitate coherent excerpt
    temperament speculate obligation escalate nourish legacy ascertain audit solidarity discern adhere conspicuous prosecute
    culprit accuse intrinsic overt furnish extravagant redundant omit contingent endorse negligible exempt resolute articulate
    domestic capable stimulate elaborate allegiance cohesive rhetoric stereotype commodity perpetual integral discourse
    eligible homogeneous discrepancy concise compassion assimilate rebellion augment symmetry portfolio retrospect summit
    virtue indignation tangible correlate credential correspondent disposition empirical reciprocal preclude bolster recession
    devise hierarchy amplify competent intelligible normalization hospitality demographic embark inaugurate parliament
    exaggerate contagious conceive surge concession feasible implicit acquisition cumulative compel boundary spontaneous
    vulnerable query optional anticipate perspective transient withhold aesthetic perceive enterprise candidate elicit deduce
    assurance convention stipulate sustain contradict correspondence reliance deficit intervene external amend proposition
    subordinate conversion cultivate tentative flaw conscientious dilemma insight manipulate fabricate extract proclaim
    narrative deviate momentum memorandum designate irony manifest advisable complement transcend charter temporal civil
    statute ambiguous conscious convey coordinate abide declare mediate definite dispose evoke evaluate exclude execute exploit
    verbal underlying simulate impose monetary curriculum prudent casualty overlook substitute proposal thesis representative
    simultaneous signify repression expenditure scheme illuminate viable essence ecology setback debate suppress synthesis
    trait mentor appropriate assess assign substantial rectify coincide outlook comprise budget corporation critic orientation
    probe inferior emergency equivalent valid exact guarantee testimony faculty predominant conspiracy equality examine
    formal asset priority inevitable detail judge democratic legitimate liberal notable endeavor construct deteriorate
    composition quantify consultant radical superficial commercial liability phenomenon applicable deliberate pursue remedy
    persist induce specialize resist implement finite distinct secondary formulate sequence attach severe
  `.trim().split(/\s+/));
  const DEFAULT_SETTINGS = { dailyNew: 20, sessionSize: 30, autoAudio: true };
  const DEFAULT_ADVENTURE_STATE = {
    chapterId: "chapter-1",
    chapterNodes: {},
    sideNodes: {},
    activeSideId: null,
    completed: [],
    completedSide: [],
    inventory: [],
    seenNodes: [],
    correct: 0,
    wrong: 0,
  };
  const STATUS_LABELS = {
    new: "完全不会",
    unstable: "不稳定",
    learning: "基本掌握",
    mastered: "长期掌握",
  };

  const root = document.getElementById("app");
  let database = null;
  let toastTimer = null;
  let installPrompt = null;
  let pronunciationAudio = null;

  const state = {
    page: "today",
    progress: new Map(),
    events: [],
    settings: { ...DEFAULT_SETTINGS },
    profiles: new Map(),
    library: { search: "", filter: "all", page: 1 },
    session: null,
    adventure: { ...DEFAULT_ADVENTURE_STATE },
    adventureOpen: false,
    adventureOutcome: null,
    adventureGlossId: null,
    adventureFinished: null,
    adventureArcId: "arc-1",
    adventurePreviewChapterId: "chapter-1",
    installAvailable: false,
    detailId: null,
    toast: "",
    ready: false,
  };

  const ICONS = {
    today: '<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/>',
    adventure: '<path d="M5 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H5z"/><path d="M19 4h-3a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h3z"/><path d="m16 9 2 2-2 2"/>',
    library: '<path d="M4 4h6v16H4zM14 4h6v16h-6z"/><path d="M7 8h0M17 8h0"/>',
    weak: '<path d="M12 3v9l5 3"/><circle cx="12" cy="12" r="9"/><path d="m17 6 2-2"/>',
    test: '<path d="M7 3h10v4H7z"/><path d="M5 5h14v16H5z"/><path d="m8 13 2 2 5-5"/>',
    data: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    bolt: '<path d="m13 2-8 12h7l-1 8 8-12h-7z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="m15 9 5-5"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 2.6 8 7 10 4.4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
    flame: '<path d="M13 3s1 4-2 6c-2 1.4-3 3-3 5a4 4 0 0 0 8 0c0-2-1-4-3-5 1 4-1 5-2 5"/>',
    keyboard: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h0M11 9h0M15 9h0M7 13h0M11 13h0M15 13h2M8 17h8"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 13V9M9 2h6M17 5l2-2"/>',
    shuffle: '<path d="M4 7h3c5 0 5 10 10 10h3"/><path d="m17 14 3 3-3 3M4 17h3c1.5 0 2.6-.8 3.5-2M14 7c.8 0 1.8 0 3 0h3"/><path d="m17 4 3 3-3 3"/>',
    volume: '<path d="M5 10v4h4l4 4V6l-4 4z"/><path d="M16 9c1 .8 1.5 1.8 1.5 3S17 14.2 16 15M18.5 6.5a8 8 0 0 1 0 11"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h0"/>',
    map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
    bag: '<path d="M5 8h14l1 13H4z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    install: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 20h14"/>',
    branch: '<path d="M6 3v12a4 4 0 0 0 4 4h8"/><circle cx="6" cy="3" r="2"/><circle cx="18" cy="19" r="2"/><path d="M6 9h7a4 4 0 0 1 4 4v1"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/>',
  };

  function icon(name, size = 20) {
    return `<span class="icon" aria-hidden="true"><svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.info}</svg></span>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const target = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, " ");
  }

  function emptyEvidence() {
    return { correct: 0, wrong: 0, avgMs: 0, lastAt: 0 };
  }

  function emptyProgress(id) {
    return {
      id,
      status: "new",
      mastery: 0,
      exposures: 0,
      firstSeen: 0,
      lastSeen: 0,
      due: 0,
      intervalHours: 0,
      streak: 0,
      lapses: 0,
      longPasses: 0,
      revived: false,
      stubborn: false,
      avgMs: 0,
      story: { exposures: 0, hints: 0, correct: 0, wrong: 0, lastAt: 0, nodes: [] },
      evidence: {
        recognition: emptyEvidence(),
        recall: emptyEvidence(),
        context: emptyEvidence(),
        spelling: emptyEvidence(),
        discrimination: emptyEvidence(),
      },
    };
  }

  function getProgress(id) {
    return state.progress.get(id) || emptyProgress(id);
  }

  function normalizeProgress(progress) {
    const base = emptyProgress(progress.id);
    return {
      ...base,
      ...progress,
      story: { ...base.story, ...(progress.story || {}) },
      evidence: Object.fromEntries(Object.keys(TYPE_WEIGHTS).map((type) => [
        type,
        { ...emptyEvidence(), ...(progress.evidence?.[type] || {}) },
      ])),
    };
  }

  function defaultWordProfile(word) {
    return WRITING_WORDS.has(word.word) ? "writing" : "reading";
  }

  function wordProfile(word) {
    return state.profiles.get(word.id) || defaultWordProfile(word);
  }

  function typesForWord(word) {
    if (wordProfile(word) === "writing") {
      return Object.keys(WRITING_WEIGHTS).filter((type) => type !== "discrimination" || word.confusions.length);
    }
    return ["recognition", "context", ...(word.confusions.length ? ["discrimination"] : [])];
  }

  function weightsForWord(word) {
    const source = wordProfile(word) === "writing" ? WRITING_WEIGHTS : READING_WEIGHTS;
    const allowed = typesForWord(word);
    const total = allowed.reduce((sum, type) => sum + source[type], 0) || 1;
    return Object.fromEntries(allowed.map((type) => [type, source[type] / total]));
  }

  function evidenceScore(evidence, type) {
    const attempts = evidence.correct + evidence.wrong;
    if (!attempts) return 0;
    const accuracy = evidence.correct / attempts;
    const coverage = Math.min(1, attempts / TYPE_REQUIREMENTS[type]);
    const speed = evidence.avgMs ? clamp(1.14 - evidence.avgMs / 22000, 0.7, 1.08) : 0.9;
    return accuracy * coverage * speed;
  }

  function calculateMastery(word, progress) {
    const weights = weightsForWord(word);
    let base = 0;
    let testedTypes = 0;
    Object.keys(weights).forEach((type) => {
      const score = evidenceScore(progress.evidence[type] || emptyEvidence(), type);
      base += score * weights[type];
      if ((progress.evidence[type]?.correct || 0) + (progress.evidence[type]?.wrong || 0) > 0) testedTypes += 1;
    });
    const delayBonus = Math.min(0.12, progress.longPasses * 0.06);
    const lapsePenalty = Math.min(0.18, progress.lapses * 0.025);
    const mastery = Math.round(clamp((base + delayBonus - lapsePenalty) * 100, 0, 100));
    let status = "new";
    if (progress.exposures > 0) status = "unstable";
    const learningTypes = wordProfile(word) === "writing" ? Math.min(3, Object.keys(weights).length) : 2;
    const masteredTypes = wordProfile(word) === "writing" ? Math.min(4, Object.keys(weights).length) : 2;
    if (mastery >= 48 && testedTypes >= learningTypes && progress.streak >= 2) status = "learning";
    const survived72Hours = progress.firstSeen && Date.now() - progress.firstSeen >= 72 * HOUR;
    if (mastery >= 82 && testedTypes >= masteredTypes && progress.longPasses >= 2 && survived72Hours) status = "mastered";
    return { mastery, status };
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
        if (!db.objectStoreNames.contains("events")) {
          const store = db.createObjectStore("events", { keyPath: "eventId", autoIncrement: true });
          store.createIndex("ts", "ts");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(storeName) {
    const transaction = database.transaction(storeName, "readonly");
    return requestPromise(transaction.objectStore(storeName).getAll());
  }

  async function put(storeName, value) {
    const transaction = database.transaction(storeName, "readwrite");
    return requestPromise(transaction.objectStore(storeName).put(value));
  }

  async function addEvent(value) {
    const transaction = database.transaction("events", "readwrite");
    return requestPromise(transaction.objectStore("events").add(value));
  }

  async function clearStore(storeName) {
    const transaction = database.transaction(storeName, "readwrite");
    return requestPromise(transaction.objectStore(storeName).clear());
  }

  async function loadState() {
    database = await openDatabase();
    const [progressRows, metaRows, eventRows] = await Promise.all([
      getAll("progress"),
      getAll("meta"),
      getAll("events"),
    ]);
    state.progress = new Map(progressRows.map((item) => [item.id, normalizeProgress(item)]));
    const settings = metaRows.find((item) => item.key === "settings");
    if (settings?.value) state.settings = { ...DEFAULT_SETTINGS, ...settings.value };
    state.settings.dailyNew = Math.max(1, Math.floor(Number(state.settings.dailyNew) || DEFAULT_SETTINGS.dailyNew));
    state.settings.sessionSize = Math.max(1, Math.floor(Number(state.settings.sessionSize) || DEFAULT_SETTINGS.sessionSize));
    state.settings.autoAudio = true;
    const profiles = metaRows.find((item) => item.key === "profiles");
    state.profiles = new Map(Array.isArray(profiles?.value) ? profiles.value : []);
    const adventure = metaRows.find((item) => item.key === "adventure");
    if (adventure?.value) state.adventure = { ...DEFAULT_ADVENTURE_STATE, ...adventure.value };
    state.adventure.chapterNodes ||= {};
    state.adventure.sideNodes ||= {};
    state.adventure.completed = Array.isArray(state.adventure.completed) ? state.adventure.completed : [];
    state.adventure.completedSide = Array.isArray(state.adventure.completedSide) ? state.adventure.completedSide : [];
    state.adventure.inventory = Array.isArray(state.adventure.inventory) ? state.adventure.inventory : [];
    state.adventure.seenNodes = Array.isArray(state.adventure.seenNodes) ? state.adventure.seenNodes : [];
    const activeChapter = ADVENTURE.chapterById[state.adventure.chapterId] || ADVENTURE.chapters[0];
    state.adventureArcId = activeChapter?.arcId || "arc-1";
    state.adventurePreviewChapterId = activeChapter?.id || "chapter-1";
    state.events = eventRows.sort((a, b) => a.ts - b.ts).slice(-MAX_EVENTS);
    state.progress.forEach((progress, id) => {
      const word = WORD_BY_ID.get(id);
      if (!word || !progress.exposures) return;
      const calculated = calculateMastery(word, progress);
      progress.mastery = calculated.mastery;
      progress.status = calculated.status;
    });
    state.ready = true;
  }

  function statusCounts() {
    const counts = { new: 0, unstable: 0, learning: 0, mastered: 0 };
    WORDS.forEach((word) => {
      const status = getProgress(word.id).status || "new";
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }

  function dueWords() {
    const now = Date.now();
    return WORDS.filter((word) => {
      const progress = state.progress.get(word.id);
      return progress && progress.exposures > 0 && progress.due <= now;
    }).sort((a, b) => getProgress(a.id).due - getProgress(b.id).due);
  }

  function weakRank(word) {
    const progress = getProgress(word.id);
    return (
      (100 - progress.mastery) * 2 +
      progress.lapses * 18 +
      Math.min(20, progress.avgMs / 800) +
      (progress.revived ? 35 : 0) +
      (word.confusions.length ? 8 : 0)
    );
  }

  function weakWords() {
    return WORDS.filter((word) => getProgress(word.id).exposures > 0).sort((a, b) => weakRank(b) - weakRank(a));
  }

  function unstartedWords() {
    return WORDS.filter((word) => getProgress(word.id).exposures === 0);
  }

  function todayIntroducedCount() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return WORDS.filter((word) => getProgress(word.id).firstSeen >= start.getTime()).length;
  }

  function todayEventIds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return [...new Set(state.events.filter((event) => event.ts >= start.getTime()).map((event) => event.id))];
  }

  function sampleDistractors(word, count, samePos = true) {
    let candidates = WORDS.filter(
      (candidate) =>
        candidate.id !== word.id &&
        (!samePos || !word.pos || candidate.pos === word.pos) &&
        candidate.core !== word.core,
    );
    if (candidates.length < count) {
      const existing = new Set(candidates.map((candidate) => candidate.id));
      candidates = [...candidates, ...WORDS.filter((candidate) =>
        candidate.id !== word.id && !existing.has(candidate.id) && candidate.core !== word.core,
      )];
    }
    const start = (word.id * 37 + word.word.length * 11) % Math.max(1, candidates.length);
    const result = [];
    for (let offset = 0; result.length < count && offset < candidates.length; offset += 1) {
      const candidate = candidates[(start + offset * 97) % candidates.length];
      if (!result.some((item) => item.id === candidate.id)) result.push(candidate);
    }
    return result;
  }

  function contextStem(word, cue) {
    if (/^v/.test(word.pos)) {
      return `The passage needs a verb meaning “${cue}”: The new policy may _____ the situation.`;
    }
    if (word.pos === "adj") {
      return `The passage needs an adjective meaning “${cue}”: The author describes the change as _____.`;
    }
    if (word.pos === "adv") {
      return `The blank should express “${cue}”: The process happened _____.`;
    }
    return `The blank should mean “${cue}”: The study focuses on the idea of _____.`;
  }

  function createQuestion(word, type, strict = false) {
    const distractors = sampleDistractors(word, 5, type !== "recognition");
    const base = {
      id: `${word.id}-${type}-${Math.random().toString(36).slice(2, 8)}`,
      wordId: word.id,
      type,
      repeatCount: 0,
      strict,
      answer: word.word,
      display: word.word,
      phonetic: word.phonetic,
      prompt: "",
      typed: false,
      options: [],
    };
    if (type === "recognition") {
      const correct = `${word.pos ? `${word.pos}. ` : ""}${word.core}`;
      base.prompt = "选择最准确的核心含义";
      base.answer = correct;
      base.options = shuffle([
        correct,
        ...distractors.slice(0, 5).map((item) => `${item.pos ? `${item.pos}. ` : ""}${item.core}`),
      ]);
      return base;
    }
    if (type === "recall") {
      base.display = word.core;
      base.phonetic = "";
      base.prompt = "根据核心义，完整写出英文单词";
      base.typed = true;
      return base;
    }
    if (type === "spelling") {
      base.display = word.phonetic || `${word.word.length} 个字母`;
      base.phonetic = "";
      base.prompt = `完整拼写：${word.core}`;
      base.typed = true;
      return base;
    }
    if (type === "context") {
      const sense = word.senses[Math.floor(Math.random() * word.senses.length)] || { text: word.core };
      const cue = sense.text.length > 34 ? word.core : sense.text;
      base.display = "_____";
      base.phonetic = "";
      base.prompt = contextStem(word, cue);
      base.options = shuffle([word.word, ...distractors.slice(0, 5).map((item) => item.word)]);
      return base;
    }
    const confusionWords = word.confusions
      .map((candidate) => WORDS.find((item) => item.word === candidate))
      .filter(Boolean);
    const extras = [...confusionWords, ...distractors].filter(
      (candidate, index, list) => candidate.id !== word.id && list.findIndex((item) => item.id === candidate.id) === index,
    );
    base.display = word.core;
    base.phonetic = "";
    base.prompt = word.confusions.length ? "从易混词中选出正确拼写" : "选出与该含义对应的单词";
    base.options = shuffle([word.word, ...extras.slice(0, 5).map((item) => item.word)]);
    return base;
  }

  function weakestType(progress, word) {
    if (!progress.exposures) return "recognition";
    const types = typesForWord(word);
    return types.sort(
      (a, b) => evidenceScore(progress.evidence[a], a) - evidenceScore(progress.evidence[b], b),
    )[0];
  }

  function chooseWords(mode, count) {
    if (mode === "daily-core") {
      const studiedToday = new Set(todayEventIds());
      const review = dueWords().filter((word) => !studiedToday.has(word.id));
      const fresh = unstartedWords().slice(0, Math.max(0, state.settings.dailyNew - todayIntroducedCount()));
      return [...review, ...fresh].slice(0, count);
    }
    if (mode === "daily-review") {
      const studiedToday = new Set(todayEventIds());
      return dueWords().filter((word) => !studiedToday.has(word.id)).slice(0, count);
    }
    if (mode === "daily-new") return unstartedWords().slice(0, count);
    if (mode === "daily-exam") {
      const ids = todayEventIds();
      const touched = ids.map((id) => WORD_BY_ID.get(id)).filter(Boolean);
      return [...touched, ...weakWords().filter((word) => !ids.includes(word.id))].slice(0, count);
    }
    if (mode === "boss") {
      const ranked = weakWords();
      const head = ranked.slice(0, Math.ceil(count * 0.65));
      const rest = shuffle(WORDS.filter((word) => !head.some((item) => item.id === word.id))).slice(
        0,
        count - head.length,
      );
      return [...head, ...rest].slice(0, count);
    }
    if (mode === "exam") {
      const ids = todayEventIds();
      const touched = ids.map((id) => WORD_BY_ID.get(id)).filter(Boolean);
      const fallback = [...dueWords(), ...weakWords(), ...unstartedWords()];
      return [...touched, ...fallback.filter((word) => !ids.includes(word.id))].slice(0, count);
    }
    if (mode === "weak" || mode.startsWith("type:")) {
      const forcedType = mode.startsWith("type:") ? mode.split(":")[1] : null;
      const eligible = (word) => !forcedType || typesForWord(word).includes(forcedType);
      const ranked = weakWords().filter(eligible);
      return [...ranked, ...unstartedWords().filter(eligible)].slice(0, count);
    }
    const studiedToday = new Set(todayEventIds());
    const due = dueWords().filter((word) => !studiedToday.has(word.id));
    const dueIds = new Set(due.map((word) => word.id));
    const weak = weakWords().filter((word) => !studiedToday.has(word.id) && !dueIds.has(word.id) && getProgress(word.id).status !== "mastered");
    const newLimit = Math.max(0, state.settings.dailyNew - todayIntroducedCount());
    const dueHead = due.slice(0, Math.min(due.length, Math.ceil(count * 0.65)));
    const fresh = unstartedWords().slice(0, Math.min(newLimit, Math.max(0, count - dueHead.length)));
    const combined = [...dueHead, ...fresh, ...due.slice(dueHead.length), ...weak];
    const seen = new Set();
    return combined.filter((word) => !seen.has(word.id) && seen.add(word.id)).slice(0, count);
  }

  function sessionTitle(mode) {
    if (mode === "daily-core") return "今日主线 · 每日单词";
    if (mode === "today") return "今日歼灭";
    if (mode === "daily-review") return "今日任务 · 到期复习";
    if (mode === "daily-new") return "今日任务 · 学习新词";
    if (mode === "daily-exam") return "今日任务 · 今日验收";
    if (mode === "weak") return "5 分钟弱点";
    if (mode === "exam") return "今日验收";
    if (mode === "boss") return "Boss Rush";
    if (mode === "random") return "全库随机";
    if (mode.startsWith("type:")) return TYPE_LABELS[mode.split(":")[1]] || "专项训练";
    return "单词训练";
  }

  function startSession(mode, forcedWordId = null) {
    const todayRemaining = Math.max(0, state.settings.dailyNew - todayIntroducedCount());
    const reviewedToday = new Set(todayEventIds());
    const pendingReviews = dueWords().filter((word) => !reviewedToday.has(word.id)).length;
    const count = mode === "daily-core"
      ? pendingReviews + todayRemaining
      : mode === "daily-review"
      ? pendingReviews
      : mode === "daily-new"
        ? todayRemaining
        : mode === "daily-exam"
          ? Math.min(30, Math.max(10, todayEventIds().length))
          : mode === "today"
            ? state.settings.sessionSize
      : mode === "weak"
        ? Math.min(20, state.settings.sessionSize)
        : mode === "boss"
          ? 50
          : mode === "exam"
            ? 30
            : state.settings.sessionSize;
    let selected = forcedWordId ? [WORD_BY_ID.get(forcedWordId)].filter(Boolean) : chooseWords(mode, count);
    if (mode === "random") selected = shuffle(WORDS).slice(0, count);
    const forcedType = mode.startsWith("type:") ? mode.split(":")[1] : null;
    const strict = mode === "exam" || mode === "daily-exam" || mode === "boss";
    let questions = forcedWordId
      ? typesForWord(selected[0]).map((type) => createQuestion(selected[0], type, false))
      : selected.map((word, index) => {
          const allowed = typesForWord(word);
          const type = forcedType || (strict ? allowed[index % allowed.length] : weakestType(getProgress(word.id), word));
          const safeType = type === "discrimination" && !word.confusions.length ? "context" : type;
          return createQuestion(word, safeType, strict);
        });
    if ((mode === "today" || mode === "daily-core" || mode === "daily-new") && !forcedWordId) {
      const fresh = selected.filter((word) => !getProgress(word.id).exposures).slice(0, 8);
      fresh.forEach((word, index) => {
        const allowed = typesForWord(word);
        const followUpType = allowed.includes("recall") && index % 2 ? "recall" : "context";
        const followUp = createQuestion(word, followUpType, false);
        const insertAt = Math.min(questions.length, 5 + index * 4);
        questions.splice(insertAt, 0, followUp);
      });
    }
    if (!questions.length) {
      showToast("当前没有可训练的单词");
      return;
    }
    state.session = {
      mode,
      title: forcedWordId ? `${WORD_BY_ID.get(forcedWordId).word} · 五维诊断` : sessionTitle(mode),
      questions,
      index: 0,
      correct: 0,
      wrong: 0,
      answered: false,
      optionRevealed: false,
      selected: "",
      feedback: null,
      startedAt: Date.now(),
      questionStartedAt: Date.now(),
      startMastered: statusCounts().mastered,
      finished: false,
    };
    render();
    autoPlayCurrentWord();
  }

  async function submitAnswer(value) {
    const session = state.session;
    if (!session || session.answered || session.finished) return;
    const question = session.questions[session.index];
    const word = WORD_BY_ID.get(question.wordId);
    const responseMs = Math.max(180, Date.now() - session.questionStartedAt);
    const unknown = value === "__UNKNOWN__";
    const correct = !unknown && normalizeAnswer(value) === normalizeAnswer(question.answer);
    session.answered = true;
    session.selected = value;
    session.correct += correct ? 1 : 0;
    session.wrong += correct ? 0 : 1;
    session.feedback = { correct, unknown, responseMs };
    if (!correct && !question.strict && question.repeatCount < 2) {
      const repeat = { ...question, id: `${question.id}-r${question.repeatCount + 1}`, repeatCount: question.repeatCount + 1 };
      session.questions.splice(Math.min(session.index + 4, session.questions.length), 0, repeat);
    }
    await recordResult(word, question.type, correct, responseMs, session.mode);
    render();
  }

  async function recordResult(word, type, correct, responseMs, mode) {
    const now = Date.now();
    const previous = getProgress(word.id);
    const progress = structuredClone(previous);
    const priorStatus = progress.status;
    const priorInterval = progress.intervalHours || 0;
    progress.firstSeen ||= now;
    progress.lastSeen = now;
    progress.exposures += 1;
    progress.avgMs = progress.avgMs
      ? Math.round((progress.avgMs * (progress.exposures - 1) + responseMs) / progress.exposures)
      : responseMs;
    const evidence = progress.evidence[type] || emptyEvidence();
    const attempts = evidence.correct + evidence.wrong;
    evidence.avgMs = evidence.avgMs ? Math.round((evidence.avgMs * attempts + responseMs) / (attempts + 1)) : responseMs;
    evidence.correct += correct ? 1 : 0;
    evidence.wrong += correct ? 0 : 1;
    evidence.lastAt = now;
    progress.evidence[type] = evidence;
    if (correct) {
      progress.streak += 1;
      if (priorInterval >= 20) progress.longPasses += 1;
      if (progress.exposures === 1) progress.intervalHours = 1 / 6;
      else if (progress.exposures <= 3) progress.intervalHours = 6;
      else progress.intervalHours = clamp(Math.max(24, priorInterval * (1.55 + Math.min(0.6, progress.streak * 0.05))), 24, 24 * 90);
    } else {
      progress.streak = 0;
      progress.lapses += 1;
      progress.intervalHours = 0.05;
      if (priorStatus === "mastered") progress.revived = true;
    }
    progress.due = now + progress.intervalHours * HOUR;
    progress.stubborn = progress.lapses >= 4 || (progress.exposures >= 8 && progress.avgMs > 5500);
    const calculated = calculateMastery(word, progress);
    progress.mastery = calculated.mastery;
    progress.status = calculated.status;
    if (!correct && priorStatus === "mastered") progress.status = "unstable";
    state.progress.set(word.id, progress);
    const event = { ts: now, id: word.id, type, correct, ms: responseMs, mode };
    state.events.push(event);
    state.events = state.events.slice(-MAX_EVENTS);
    await Promise.all([put("progress", progress), addEvent(event)]);
  }

  function nextQuestion() {
    const session = state.session;
    if (!session || !session.answered) return;
    session.index += 1;
    session.answered = false;
    session.optionRevealed = false;
    session.selected = "";
    session.feedback = null;
    session.questionStartedAt = Date.now();
    if (session.index >= session.questions.length) session.finished = true;
    render();
    autoPlayCurrentWord();
  }

  function closeSession(force = false) {
    if (!state.session) return;
    if (!force && !state.session.finished && state.session.index > 0) {
      if (!window.confirm("结束本次训练？当前作答记录已经保存。")) return;
    }
    stopAudio();
    state.session = null;
    render();
  }

  function stopAudio() {
    if (pronunciationAudio) {
      pronunciationAudio._cancelled = true;
      pronunciationAudio.pause();
      pronunciationAudio = null;
    }
    window.speechSynthesis?.cancel();
  }

  function localSpeak(text, lang = "en-US") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = lang.startsWith("en") ? 0.84 : 0.92;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /^en-(US|GB)$/i.test(voice.lang) && /natural|premium|enhanced|microsoft|google/i.test(voice.name))
      || voices.find((voice) => /^en-(US|GB)/i.test(voice.lang))
      || voices.find((voice) => /^en/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  }

  function playPronunciation(word) {
    if (!/^[a-z][a-z-]*$/i.test(String(word || ""))) return;
    stopAudio();
    let fellBack = false;
    const fallback = () => {
      if (fellBack || audio._cancelled) return;
      fellBack = true;
      pronunciationAudio = null;
      localSpeak(word, "en-US");
    };
    const audio = new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`);
    pronunciationAudio = audio;
    audio.preload = "auto";
    audio.addEventListener("ended", () => {
      if (pronunciationAudio === audio) pronunciationAudio = null;
    }, { once: true });
    audio.addEventListener("error", fallback, { once: true });
    const attempt = audio.play();
    if (attempt?.catch) attempt.catch(fallback);
  }

  function autoPlayCurrentWord() {
    const session = state.session;
    if (!session || session.finished || !state.settings.autoAudio) return;
    const question = session.questions[session.index];
    if (!question || question.type !== "recognition" || question.typed) return;
    const word = WORD_BY_ID.get(question.wordId);
    if (word) playPronunciation(word.word);
  }

  function speak(text) {
    if (!text) return;
    if (/^[a-z][a-z-]*$/i.test(text)) {
      playPronunciation(text);
      return;
    }
    if (!("speechSynthesis" in window)) {
      showToast("当前浏览器未提供朗读语音");
      return;
    }
    localSpeak(text, /[\u3400-\u9fff]/.test(text) ? "zh-CN" : "en-US");
  }

  function chapterUnlocked(chapter) {
    if (!chapter || chapter.episode === 1) return true;
    const previous = ADVENTURE.chapters.find((item) => item.episode === chapter.episode - 1);
    return !previous || state.adventure.completed.includes(previous.id);
  }

  function currentAdventureSequence() {
    if (state.adventure.activeSideId) return ADVENTURE.sideById?.[state.adventure.activeSideId] || null;
    return ADVENTURE.chapterById[state.adventure.chapterId] || ADVENTURE.chapters[0];
  }

  function currentAdventureNodeId(sequence = currentAdventureSequence()) {
    if (!sequence) return null;
    return state.adventure.activeSideId
      ? (state.adventure.sideNodes[state.adventure.activeSideId] || sequence.startNode)
      : (state.adventure.chapterNodes[state.adventure.chapterId] || sequence.startNode);
  }

  function sideEventUnlocked(sideEvent) {
    const chapter = ADVENTURE.chapterById[sideEvent?.chapterId];
    if (!chapter || !chapterUnlocked(chapter)) return false;
    if (state.adventure.completed.includes(chapter.id)) return true;
    const nodeId = state.adventure.chapterNodes[chapter.id];
    const nodeIndex = chapter.nodes.findIndex((node) => node.id === nodeId);
    return nodeIndex >= 2;
  }

  async function saveAdventure() {
    await put("meta", { key: "adventure", value: state.adventure });
  }

  async function recordStoryNode(node) {
    if (!node || state.adventure.seenNodes.includes(node.id)) return;
    const now = Date.now();
    state.adventure.seenNodes = [...state.adventure.seenNodes, node.id];
    await Promise.all(node.wordIds.map(async (id) => {
      const progress = normalizeProgress(structuredClone(getProgress(id)));
      progress.story.exposures += 1;
      progress.story.lastAt = now;
      progress.story.nodes = [...new Set([...progress.story.nodes, node.id])];
      state.progress.set(id, progress);
      await put("progress", progress);
    }));
    await saveAdventure();
  }

  async function enterAdventureNode(nodeId) {
    const node = ADVENTURE.nodeById[nodeId];
    if (!node) return;
    if (state.adventure.activeSideId) {
      state.adventure.sideNodes = { ...state.adventure.sideNodes, [state.adventure.activeSideId]: nodeId };
    } else {
      state.adventure.chapterNodes = { ...state.adventure.chapterNodes, [state.adventure.chapterId]: nodeId };
    }
    state.adventureOutcome = null;
    state.adventureGlossId = null;
    await recordStoryNode(node);
    await saveAdventure();
    render();
  }

  async function startAdventure(chapterId) {
    const chapter = ADVENTURE.chapterById[chapterId] || ADVENTURE.chapters[0];
    if (!chapterUnlocked(chapter)) {
      showToast("前方道路仍被迷雾封锁");
      return;
    }
    state.adventure.chapterId = chapter.id;
    state.adventure.activeSideId = null;
    state.adventureArcId = chapter.arcId || `arc-${Math.ceil(chapter.episode / 5)}`;
    state.adventurePreviewChapterId = chapter.id;
    state.adventureOpen = true;
    state.adventureFinished = null;
    state.adventureOutcome = null;
    const saved = state.adventure.chapterNodes[chapter.id];
    const nodeId = state.adventure.completed.includes(chapter.id) ? chapter.startNode : (saved || chapter.startNode);
    await enterAdventureNode(nodeId);
  }

  async function startSideEvent(sideId) {
    const sideEvent = ADVENTURE.sideById?.[sideId];
    if (!sideEvent || !sideEventUnlocked(sideEvent)) {
      showToast("先推进本章主线，支线才会显现");
      return;
    }
    const chapter = ADVENTURE.chapterById[sideEvent.chapterId];
    state.adventure.chapterId = chapter.id;
    state.adventure.activeSideId = sideEvent.id;
    state.adventureArcId = chapter.arcId;
    state.adventurePreviewChapterId = chapter.id;
    state.adventureOpen = true;
    state.adventureFinished = null;
    state.adventureOutcome = null;
    const nodeId = state.adventure.completedSide.includes(sideEvent.id)
      ? sideEvent.startNode
      : (state.adventure.sideNodes[sideEvent.id] || sideEvent.startNode);
    await enterAdventureNode(nodeId);
  }

  async function chooseAdventure(optionIndex) {
    if (state.adventureOutcome) return;
    const nodeId = currentAdventureNodeId();
    const node = ADVENTURE.nodeById[nodeId];
    const option = node?.choices?.[optionIndex];
    if (!option) return;
    const correct = option.correct !== false;
    const word = WORD_BY_ID.get(option.testWord);
    if (word) {
      await recordResult(word, "context", correct, 2600, "adventure");
      const progress = normalizeProgress(structuredClone(getProgress(word.id)));
      progress.story[correct ? "correct" : "wrong"] += 1;
      state.progress.set(word.id, progress);
      await put("progress", progress);
    }
    state.adventure[correct ? "correct" : "wrong"] += 1;
    if (correct && option.gainItem && !state.adventure.inventory.includes(option.gainItem)) {
      state.adventure.inventory = [...state.adventure.inventory, option.gainItem];
    }
    state.adventureOutcome = {
      correct,
      text: option.outcome,
      next: correct ? option.next : null,
    };
    await saveAdventure();
    render();
  }

  async function continueAdventure() {
    const outcome = state.adventureOutcome;
    if (!outcome) return;
    if (!outcome.correct || !outcome.next) {
      state.adventureOutcome = null;
      render();
      return;
    }
    if (outcome.next !== "complete") {
      await enterAdventureNode(outcome.next);
      return;
    }
    if (state.adventure.activeSideId) {
      const sideId = state.adventure.activeSideId;
      if (!state.adventure.completedSide.includes(sideId)) {
        state.adventure.completedSide = [...state.adventure.completedSide, sideId];
      }
      const sideEvent = ADVENTURE.sideById[sideId];
      if (sideEvent?.reward && !state.adventure.inventory.includes(sideEvent.reward)) {
        state.adventure.inventory = [...state.adventure.inventory, sideEvent.reward];
      }
      state.adventureFinished = `side:${sideId}`;
      state.adventureOutcome = null;
      await saveAdventure();
      render();
      return;
    }
    const chapterId = state.adventure.chapterId;
    if (!state.adventure.completed.includes(chapterId)) {
      state.adventure.completed = [...state.adventure.completed, chapterId];
    }
    const currentIndex = ADVENTURE.chapters.findIndex((chapter) => chapter.id === chapterId);
    const nextChapter = ADVENTURE.chapters[currentIndex + 1];
    if (nextChapter) {
      state.adventure.chapterId = nextChapter.id;
      state.adventurePreviewChapterId = nextChapter.id;
      state.adventureArcId = nextChapter.arcId;
    }
    state.adventureFinished = `main:${chapterId}`;
    state.adventureOutcome = null;
    await saveAdventure();
    render();
  }

  function startNemesis(wordId) {
    const word = WORD_BY_ID.get(Number(wordId));
    if (!word) return;
    startSession("word", word.id);
    if (state.session) {
      state.session.title = `宿敌追猎 · ${word.word}`;
      render();
    }
  }

  async function revealStoryWord(id) {
    const word = WORD_BY_ID.get(id);
    if (!word) return;
    const progress = normalizeProgress(structuredClone(getProgress(id)));
    progress.story.hints += 1;
    progress.story.lastAt = Date.now();
    state.progress.set(id, progress);
    state.adventureGlossId = id;
    await put("progress", progress);
    render();
  }

  function renderStoryText(text) {
    const tokenPattern = /\[\[([a-z-]+)\]\]/gi;
    let cursor = 0;
    let html = "";
    for (const match of text.matchAll(tokenPattern)) {
      html += escapeHtml(text.slice(cursor, match.index));
      const word = WORDS.find((item) => item.word.toLowerCase() === match[1].toLowerCase());
      if (!word) html += escapeHtml(match[1]);
      else {
        const encounters = getProgress(word.id).story?.exposures || 0;
        const level = encounters <= 1 ? "shown" : encounters === 2 ? "fading" : "hidden";
        html += `<button class="story-word ${level}" data-action="story-word" data-id="${word.id}"><span>${escapeHtml(match[1])}</span>${level === "hidden" ? "" : `<em>${escapeHtml(word.core)}</em>`}</button>`;
      }
      cursor = match.index + match[0].length;
    }
    return html + escapeHtml(text.slice(cursor));
  }

  function pageHeader(eyebrow, title, note) {
    return `<header class="page-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="page-title">${escapeHtml(title)}</h1></div><p class="page-note">${escapeHtml(note)}</p></header>`;
  }

  function renderToday() {
    const counts = statusCounts();
    const remaining = WORDS.length - counts.mastered;
    const todayIds = todayEventIds();
    const reviewedToday = new Set(todayIds);
    const due = dueWords().filter((word) => !reviewedToday.has(word.id)).length;
    const weak = weakWords().filter((word) => getProgress(word.id).mastery < 50).length;
    const masteredPercent = WORDS.length ? (counts.mastered / WORDS.length) * 100 : 0;
    const todayStudied = todayIds.length;
    const introducedToday = todayIntroducedCount();
    const todayRemaining = Math.max(0, state.settings.dailyNew - introducedToday);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCorrect = state.events.filter((event) => event.ts >= todayStart.getTime() && event.correct).length;
    const mainlineDone = due === 0 && todayRemaining === 0;
    const coreCount = due + todayRemaining;
    const tasks = [
      { label: "到期复习", meta: due ? `${due} 词将在本轮复习` : "今日到期内容已完成", done: due === 0 },
      { label: "今日新词", meta: `${introducedToday} / ${state.settings.dailyNew} 词`, done: todayRemaining === 0 },
      { label: "错词回查", meta: "答错后自动插回本轮，不用另开任务", done: mainlineDone },
    ];
    const action = mainlineDone
      ? { mode: "today", label: "今日主线完成 · 继续加练" }
      : { mode: "daily-core", label: `一键开始今日主线 · ${coreCount} 词` };
    return `<section class="page today-page">
      ${pageHeader("今日主线", mainlineDone ? "每日单词已完成" : "每日单词", `复习与新词合并学习，目标不是上限`)}
      <div class="today-flow-grid">
        <article class="card daily-mission-card">
          <div class="daily-mission-head"><div><span>主线剩余</span><strong>${coreCount} 词</strong></div><div class="daily-ring" style="--mission:${state.settings.dailyNew ? Math.min(100, (introducedToday / state.settings.dailyNew) * 100) : 100}%"><span>${mainlineDone ? "完成" : `${Math.min(100, Math.round((introducedToday / Math.max(1, state.settings.dailyNew)) * 100))}%`}</span></div></div>
          <div class="daily-task-list">${tasks.map((task, index) => `<div class="daily-task ${task.done ? "done" : "current"}"><span class="daily-task-mark">${task.done ? icon("check", 15) : index + 1}</span><div><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.meta)}</small></div></div>`).join("")}</div>
          <button class="primary-button button-wide daily-main-action" data-action="start-session" data-mode="${action.mode}">${escapeHtml(action.label)} ${icon("arrow", 18)}</button>
          <p class="daily-no-cap">一轮会自动包含全部到期复习和剩余新词；完成后仍可无限加练。</p>
        </article>
        <div class="daily-side">
          <article class="card daily-overview-card"><div class="section-kicker">今日进度</div><div class="daily-numbers"><div><strong>${state.settings.dailyNew}</strong><span>今日目标</span></div><div><strong>${introducedToday}</strong><span>已学新词</span></div><div><strong>${todayStudied}</strong><span>已接触词</span></div><div><strong>${due}</strong><span>待复习</span></div></div></article>
          <article class="card mastery-card"><div><span>自由加练</span><strong>${remaining}</strong><small>个词仍待真正掌握</small></div><div class="hero-progress"><div class="progress-track"><div class="progress-fill" style="width:${masteredPercent.toFixed(2)}%"></div></div><div class="progress-meta"><span>已掌握 ${counts.mastered}</span><span>${masteredPercent.toFixed(1)}%</span></div></div><div class="optional-actions"><button class="ghost-button" data-action="start-session" data-mode="weak">弱点 ${weak}</button><button class="ghost-button" data-action="start-session" data-mode="daily-exam">今日验收</button><button class="ghost-button" data-action="nav" data-page="adventure">剧情冒险</button></div></article>
        </div>
        <article class="card status-strip">
          <div class="status-cell"><strong>${counts.new}</strong><span>完全不会</span></div>
          <div class="status-cell"><strong>${counts.unstable}</strong><span>不稳定</span></div>
          <div class="status-cell"><strong>${counts.learning}</strong><span>基本掌握</span></div>
          <div class="status-cell"><strong>${counts.mastered}</strong><span>长期掌握 · 今日答对 ${todayCorrect}</span></div>
        </article>
      </div>
    </section>`;
  }

  function renderAdventure() {
    const stats = ADVENTURE.stats || { chapters: ADVENTURE.chapters.length, totalScenes: 0, plannedWords: WORDS.length };
    const selectedArc = ADVENTURE.arcs.find((arc) => arc.id === state.adventureArcId) || ADVENTURE.arcs[0];
    const arcChapters = ADVENTURE.chapters.filter((chapter) => chapter.arcId === selectedArc.id);
    let active = ADVENTURE.chapterById[state.adventurePreviewChapterId];
    if (!active || active.arcId !== selectedArc.id) active = arcChapters[0];
    const currentNodeId = state.adventure.chapterNodes[active.id] || active.startNode;
    const currentIndex = Math.max(0, active.nodes.findIndex((node) => node.id === currentNodeId));
    const encounters = [...state.progress.values()].reduce((sum, progress) => sum + (progress.story?.exposures || 0), 0);
    const sideEvents = active.sideEvents || [];
    const nemesisWord = weakWords().find((word) => getProgress(word.id).lapses >= 2)
      || WORDS.find((word) => getProgress(word.id).story?.exposures >= 3 && getProgress(word.id).mastery < 50);
    const nemesis = nemesisWord ? ADVENTURE.nemesisEvents?.[nemesisWord.id] : null;
    const completedInArc = arcChapters.filter((chapter) => state.adventure.completed.includes(chapter.id)).length;
    return `<section class="page adventure-page">
      ${pageHeader("冒险", "剧情冒险", `${stats.chapters} 章 · ${stats.totalScenes} 场景 · ${encounters} 次单词相遇`)}
      <div class="adventure-home">
        <article class="adventure-hero scene-${escapeHtml(active.nodes[currentIndex]?.scene || "pasture")}">
          <div class="adventure-hero-shade"></div>
          <div class="adventure-hero-copy">
            <div class="story-index">第 ${selectedArc.number} 篇 · 第 ${String(active.episode).padStart(2, "0")} 章</div>
            <h2>${escapeHtml(active.title)}</h2>
            <p class="story-en">${escapeHtml(active.subtitle)}</p>
            <p>${escapeHtml(active.summary)}</p>
            <div class="story-progress-line"><span style="width:${((currentIndex + (state.adventure.completed.includes(active.id) ? 1 : 0)) / active.nodes.length) * 100}%"></span></div>
            <div class="adventure-hero-actions"><button class="primary-button" data-action="start-adventure" data-chapter="${active.id}">${icon("adventure", 18)} ${state.adventure.completed.includes(active.id) ? "再次进入" : chapterUnlocked(active) ? (currentIndex ? "继续调查" : "进入故事") : "查看封锁"}</button><span>${escapeHtml(active.quest || "沿主线继续调查")}</span></div>
          </div>
        </article>
        <div class="chapter-stack">
          <div class="chapter-stack-head"><span>${escapeHtml(selectedArc.subtitle)}</span><strong>${completedInArc} / ${arcChapters.length}</strong></div>
          ${arcChapters.map((chapter) => {
            const unlocked = chapterUnlocked(chapter);
            const done = state.adventure.completed.includes(chapter.id);
            const nodeId = state.adventure.chapterNodes[chapter.id] || chapter.startNode;
            const nodeIndex = Math.max(0, chapter.nodes.findIndex((node) => node.id === nodeId));
            return `<button class="chapter-card ${active.id === chapter.id ? "active" : ""} ${unlocked ? "" : "locked"}" data-action="select-chapter" data-chapter="${chapter.id}">
              <span class="chapter-number">${String(chapter.episode).padStart(2, "0")}</span>
              <span><strong>${escapeHtml(chapter.title)}</strong><small>${done ? "已完成" : unlocked ? `${nodeIndex + 1} / ${chapter.nodes.length}` : "迷雾封锁"}</small></span>
              ${icon(done ? "check" : "arrow", 17)}
            </button>`;
          }).join("")}
          <div class="side-quest-list"><div class="side-quest-title">${icon("branch", 15)} 本章支线</div>${sideEvents.map((side) => {
            const unlocked = sideEventUnlocked(side);
            const done = state.adventure.completedSide.includes(side.id);
            return `<button class="side-quest-card ${unlocked ? "" : "locked"}" data-action="start-side" data-side="${side.id}"><span>${done ? icon("check", 15) : icon("compass", 15)}</span><span><strong>${escapeHtml(side.title.replace(`${active.title} · `, ""))}</strong><small>${done ? "已完成" : unlocked ? side.summary : "推进主线后显现"}</small></span></button>`;
          }).join("")}</div>
        </div>
        <div class="adventure-extras">
          <article class="inventory-card"><span>${icon("bag", 18)} 旅途物品</span><strong>${state.adventure.inventory.length || "—"}</strong><small>${state.adventure.inventory.slice(-3).map(escapeHtml).join(" · ") || "关键证物会留在这里"}</small></article>
          <article class="world-stat-card"><span>世界进度</span><strong>${state.adventure.completed.length} / ${stats.chapters}</strong><small>${state.adventure.completedSide.length} 条支线完成</small></article>
          ${nemesis ? `<button class="nemesis-card" data-action="start-nemesis" data-id="${nemesis.wordId}"><span>${icon("flame", 18)} 记忆宿敌</span><strong>${escapeHtml(nemesis.title)}</strong><small>${escapeHtml(nemesis.location)} · ${escapeHtml(nemesis.cue)}</small></button>` : `<article class="nemesis-card dormant"><span>${icon("shield", 18)} 记忆宿敌</span><strong>宿敌尚未现身</strong><small>反复答错的词会在这里形成专属追猎</small></article>`}
        </div>
        <div class="world-strip">
          ${ADVENTURE.arcs.map((arc) => {
            const chapters = ADVENTURE.chapters.filter((chapter) => chapter.arcId === arc.id);
            const arcDone = chapters.filter((chapter) => state.adventure.completed.includes(chapter.id)).length;
            return `<button class="world-arc ${arc.id === selectedArc.id ? "awake" : ""}" data-action="select-arc" data-arc="${arc.id}"><span>${String(arc.number).padStart(2, "0")}</span><strong>${escapeHtml(arc.title)}</strong><small>${arcDone} / 5 · ${arc.startWordId}–${arc.endWordId}</small></button>`;
          }).join("")}
        </div>
      </div>
    </section>`;
  }

  function renderAdventurePlayer() {
    if (!state.adventureOpen) return "";
    const chapter = ADVENTURE.chapterById[state.adventure.chapterId] || ADVENTURE.chapters[0];
    if (state.adventureFinished) {
      const [kind, id] = state.adventureFinished.split(":");
      const finished = kind === "side" ? ADVENTURE.sideById[id] : ADVENTURE.chapterById[id];
      const finishedChapter = kind === "side" ? ADVENTURE.chapterById[finished.chapterId] : finished;
      const nextChapter = kind === "main" ? ADVENTURE.chapters.find((item) => item.episode === finished.episode + 1) : null;
      const coreWords = new Set(finished.nodes.flatMap((node) => node.newWordIds?.length ? node.newWordIds : node.wordIds));
      return `<div class="adventure-overlay novel-overlay"><div class="adventure-finish scene-${escapeHtml(finished.nodes.at(-1).scene)}"><div class="finish-panel"><div class="section-kicker">${kind === "side" ? "支线完结" : "本章完结"}</div><h2>${escapeHtml(finished.title)}</h2><p>${escapeHtml(finished.summary)}</p><div class="done-stats"><div><strong>${coreWords.size}</strong><span>${kind === "side" ? "复现词" : "核心词登场"}</span></div><div><strong>${state.adventure.correct}</strong><span>情境判断正确</span></div><div><strong>${state.adventure.inventory.length}</strong><span>旅途物品</span></div></div><div class="modal-actions">${nextChapter ? `<button class="primary-button" data-action="start-adventure" data-chapter="${nextChapter.id}">进入 ${escapeHtml(nextChapter.title)} ${icon("arrow", 17)}</button>` : ""}<button class="ghost-button" data-action="close-adventure">返回 ${escapeHtml(finishedChapter.title)}</button></div></div></div></div>`;
    }
    const sequence = currentAdventureSequence() || chapter;
    const nodeId = currentAdventureNodeId(sequence);
    const node = ADVENTURE.nodeById[nodeId] || sequence.nodes[0];
    const nodeIndex = Math.max(0, sequence.nodes.findIndex((item) => item.id === node.id));
    const gloss = WORD_BY_ID.get(state.adventureGlossId);
    return `<div class="adventure-overlay novel-overlay">
      <article class="novel-reader">
        <header class="novel-head">
          <button class="novel-back" data-action="close-adventure" aria-label="返回章节">${icon("back", 19)}</button>
          <div class="novel-head-progress"><span>${state.adventure.activeSideId ? "支线档案" : `第 ${String(chapter.episode).padStart(2, "0")} 章`} · 第 ${nodeIndex + 1} 节 / ${sequence.nodes.length}</span><div class="story-progress-line"><span style="width:${((nodeIndex + 1) / sequence.nodes.length) * 100}%"></span></div></div>
          <div class="inventory-mini">${icon("bag", 17)} ${state.adventure.inventory.length}</div>
        </header>
        <main class="novel-scroll">
          <div class="novel-column">
            <header class="novel-title-block">
              <span>${escapeHtml(node.location)} · ${escapeHtml(node.sceneLabel)}</span>
              <h1>${escapeHtml(sequence.title)}</h1>
              <p>${escapeHtml(node.mood)}</p>
            </header>
            <div class="novel-speaker"><span>${escapeHtml(node.speaker)}</span><button data-action="speak" data-word="${escapeHtml(node.lines.map((line) => line.replace(/\[\[|\]\]/g, "")).join(" "))}" aria-label="朗读本节">${icon("volume", 16)} 朗读</button></div>
            <div class="novel-body">${node.lines.map((line) => `<p>${renderStoryText(line)}</p>`).join("")}</div>
            ${gloss ? `<aside class="novel-gloss"><button data-action="close-story-word" aria-label="关闭释义">${icon("close", 14)}</button><div><strong>${escapeHtml(gloss.word)}</strong><span>${escapeHtml(gloss.phonetic)}</span></div><em>${escapeHtml(gloss.core)}</em><small>${wordProfile(gloss) === "writing" ? "写作词 · 需要会写" : "阅读词 · 理解即可"}</small></aside>` : ""}
            <section class="novel-question">
              <div class="novel-question-label"><span>本节问题</span><small>${escapeHtml(node.quest || "完成判断后继续")}</small></div>
              <h2>${escapeHtml(node.prompt)}</h2>
              ${state.adventureOutcome
                ? `<div class="novel-outcome ${state.adventureOutcome.correct ? "correct" : "wrong"}"><p>${escapeHtml(state.adventureOutcome.text)}</p><button class="${state.adventureOutcome.correct ? "secondary-button" : "primary-button"}" data-action="continue-adventure">${state.adventureOutcome.correct ? "翻到下一节" : "重新判断"} ${icon("arrow", 16)}</button></div>`
                : `<div class="novel-choices">${node.choices.map((choice, index) => `<button data-action="adventure-choice" data-index="${index}"><span>${index + 1}</span><strong>${escapeHtml(choice.label)}</strong></button>`).join("")}</div>`}
            </section>
            <nav class="novel-route" aria-label="章节进度">${sequence.nodes.map((routeNode, index) => `<span class="${index < nodeIndex ? "done" : index === nodeIndex ? "current" : ""}"><i>${index < nodeIndex ? "✓" : index + 1}</i><small>${escapeHtml(routeNode.sceneLabel || `第 ${index + 1} 节`)}</small></span>`).join("")}</nav>
          </div>
        </main>
      </article>
    </div>`;
  }

  function filterWords() {
    const query = normalizeAnswer(state.library.search);
    return WORDS.filter((word) => {
      const progress = getProgress(word.id);
      const matchesQuery = !query || word.word.includes(query) || word.meaning.includes(state.library.search.trim());
      if (!matchesQuery) return false;
      if (state.library.filter === "all") return true;
      if (state.library.filter === "confusion") return word.confusions.length > 0;
      if (state.library.filter === "reading" || state.library.filter === "writing") return wordProfile(word) === state.library.filter;
      if (state.library.filter === "stubborn") return progress.stubborn;
      if (state.library.filter === "revived") return progress.revived;
      return progress.status === state.library.filter;
    });
  }

  function renderLibrary() {
    const pageSize = 24;
    const filtered = filterWords();
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    state.library.page = clamp(state.library.page, 1, pages);
    const start = (state.library.page - 1) * pageSize;
    const visible = filtered.slice(start, start + pageSize);
    const filters = [
      ["all", "全部"],
      ["new", "不会"],
      ["unstable", "不稳定"],
      ["learning", "学习中"],
      ["mastered", "已掌握"],
      ["reading", "阅读词"],
      ["writing", "写作词"],
      ["confusion", "易混"],
      ["stubborn", "顽固"],
      ["revived", "复活"],
    ];
    return `<section class="page library-page">
      ${pageHeader("VOCABULARY", "词库", `共 ${filtered.length} 个结果`)}
      <div class="toolbar">
        <label class="search-box">${icon("search", 18)}<span class="sr-only">搜索词库</span><input data-role="library-search" value="${escapeHtml(state.library.search)}" placeholder="搜索单词或释义" autocomplete="off" /></label>
        ${filters.map(([value, label]) => `<button class="filter-chip ${state.library.filter === value ? "active" : ""}" data-action="library-filter" data-filter="${value}">${label}</button>`).join("")}
      </div>
      <div class="library-panel">
        ${visible.length ? `<div class="word-grid">${visible.map((word) => {
          const progress = getProgress(word.id);
          return `<button class="word-card" data-action="word-detail" data-id="${word.id}">
            <div class="word-card-head"><span class="word-name">${escapeHtml(word.word)}</span><span class="status-dot ${progress.status}" title="${STATUS_LABELS[progress.status]}"></span></div>
            <div class="word-index">NO. ${String(word.id).padStart(4, "0")} · ${wordProfile(word) === "writing" ? "写作" : "阅读"} · ${escapeHtml(word.phonetic)}</div>
            <p class="word-meaning">${escapeHtml(word.meaning)}</p>
          </button>`;
        }).join("")}</div>` : `<div class="empty-state">没有符合条件的单词</div>`}
      </div>
      <div class="pager"><span>${filtered.length ? `${start + 1}-${Math.min(start + pageSize, filtered.length)} / ${filtered.length}` : "0 个单词"}</span><div class="pager-buttons"><button data-action="library-page" data-delta="-1" ${state.library.page <= 1 ? "disabled" : ""}>${icon("back", 17)}</button><button data-action="library-page" data-delta="1" ${state.library.page >= pages ? "disabled" : ""}>${icon("arrow", 17)}</button></div></div>
    </section>`;
  }

  function weaknessCounts() {
    const touched = WORDS.filter((word) => getProgress(word.id).exposures > 0);
    const typeWeak = (type) => touched.filter((word) => typesForWord(word).includes(type) && evidenceScore(getProgress(word.id).evidence[type], type) < 0.55).length;
    return {
      recall: typeWeak("recall"),
      spelling: typeWeak("spelling"),
      context: touched.filter((word) => word.multi && evidenceScore(getProgress(word.id).evidence.context, "context") < 0.55).length,
      discrimination: touched.filter((word) => word.confusions.length && evidenceScore(getProgress(word.id).evidence.discrimination, "discrimination") < 0.62).length,
      long: touched.filter((word) => getProgress(word.id).lapses > 0 || getProgress(word.id).revived).length,
      slow: touched.filter((word) => getProgress(word.id).avgMs > 4500).length,
    };
  }

  function renderWeakness() {
    const counts = weaknessCounts();
    const cards = [
      ["recall", "target", "写作提取弱", "只检查写作词的中文 → 英文", counts.recall],
      ["spelling", "keyboard", "写作词拼写", "阅读词不强制默写，输出词精确到字母", counts.spelling],
      ["context", "layers", "多义与语境", "不只认一个中文，追踪不同义项", counts.context],
      ["discrimination", "eye", "易混词猎杀", "把形近、音近词放在一起强制区分", counts.discrimination],
      ["recognition", "timer", "反应速度慢", "答对但想太久，也会继续出现", counts.slow],
      ["context", "flame", "遗忘与复活", "专攻答错过、降级过的旧词", counts.long],
    ];
    return `<section class="page weakness-page">
      ${pageHeader("WEAKNESS", "只打薄弱处", "按记忆证据自动归因")}
      <div class="weak-tools"><button class="ghost-button" data-action="start-session" data-mode="random">${icon("shuffle", 16)} 全库随机</button><button class="ghost-button" data-action="start-session" data-mode="exam">${icon("shield", 16)} 今日验收</button><button class="secondary-button" data-action="start-session" data-mode="boss">${icon("flame", 16)} Boss Rush</button></div>
      <div class="weak-grid">
        ${cards.map(([type, iconName, title, text, count]) => `<button class="weak-card" data-action="start-session" data-mode="type:${type}">
          <span class="weak-count">${count}</span><span class="weak-icon">${icon(iconName, 20)}</span><h3>${title}</h3><p>${text}</p>
        </button>`).join("")}
      </div>
    </section>`;
  }

  function renderTests() {
    const cards = [
      ["random", "shuffle", "全库随机", "跨越 1800 词，随机混合五种题型"],
      ["type:recognition", "eye", "阅读识义", "看到英文，快速锁定核心含义"],
      ["type:recall", "target", "中文 → 英文", "强制主动提取，不靠熟悉感"],
      ["type:spelling", "keyboard", "完整拼写", "音标与含义给出后完整输入"],
      ["type:discrimination", "layers", "易混辨析", "形近词成组出现，专门消除混淆"],
      ["boss", "flame", "Boss Rush", "50 题连续极限测试，优先抽最危险的词"],
    ];
    return `<section class="page tests-page">
      ${pageHeader("TEST", "测试场", "不给熟悉感钻空子")}
      <div class="test-grid">
        ${cards.map(([mode, iconName, title, text]) => `<button class="test-card" data-action="start-session" data-mode="${mode}"><span class="test-icon">${icon(iconName, 20)}</span><h3>${title}</h3><p>${text}</p></button>`).join("")}
      </div>
    </section>`;
  }

  function lastSevenDays() {
    const days = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const next = date.getTime() + DAY;
      const events = state.events.filter((event) => event.ts >= date.getTime() && event.ts < next);
      days.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        count: events.length,
        correct: events.filter((event) => event.correct).length,
      });
    }
    return days;
  }

  function renderData() {
    const counts = statusCounts();
    const days = lastSevenDays();
    const max = Math.max(1, ...days.map((day) => day.count));
    const rows = [
      ["完全不会", counts.new, ""],
      ["不稳定", counts.unstable, "amber"],
      ["基本掌握", counts.learning, "blue"],
      ["长期掌握", counts.mastered, "green"],
    ];
    const writingCount = WORDS.filter((word) => wordProfile(word) === "writing").length;
    return `<section class="page data-page">
      ${pageHeader("EVIDENCE", "记忆证据", "掌握度来自真实作答")}
      <div class="data-grid">
        <article class="card data-card"><h3>掌握分布</h3><div class="distribution-list">${rows.map(([label, value, className]) => `<div class="distribution-row"><span>${label}</span><div class="bar"><span class="${className}" style="width:${(value / WORDS.length) * 100}%"></span></div><strong>${value}</strong></div>`).join("")}</div><div class="profile-summary"><span>阅读词 ${WORDS.length - writingCount}</span><span>写作词 ${writingCount}</span></div></article>
        <article class="card data-card"><h3>最近 7 天作答</h3><div class="trend-bars">${days.map((day) => `<div class="trend-day"><div title="${day.count} 次作答，答对 ${day.correct}" class="trend-column" style="height:${Math.max(5, (day.count / max) * 100)}%"></div><span>${day.label}</span></div>`).join("")}</div></article>
        <div class="data-actions">
          <button class="ghost-button" data-action="export-data">${icon("download", 17)} 导出进度</button>
          <button class="ghost-button" data-action="import-data">${icon("upload", 17)} 导入进度</button>
          <input id="import-file" class="sr-only" type="file" accept="application/json,.json" />
          <button class="ghost-button" data-action="install-app">${icon("install", 17)} 安装到本机</button>
          <button class="danger-button" data-action="reset-data">${icon("trash", 17)} 清空进度</button>
          <label class="settings-inline">每日词量 <input data-role="daily-new" type="number" min="1" step="1" value="${state.settings.dailyNew}" /></label>
          <label class="settings-inline compact">专项每轮 <input data-role="session-size" type="number" min="1" step="1" value="${state.settings.sessionSize}" /></label>
        </div>
      </div>
    </section>`;
  }

  function renderPage() {
    if (state.page === "adventure") return renderAdventure();
    if (state.page === "library") return renderLibrary();
    if (state.page === "weak") return renderWeakness();
    if (state.page === "test") return renderTests();
    if (state.page === "data") return renderData();
    return renderToday();
  }

  function renderSidebar() {
    const items = [
      ["today", "today", "今日"],
      ["adventure", "adventure", "冒险"],
      ["library", "library", "词库"],
      ["weak", "weak", "弱点"],
      ["data", "data", "数据"],
    ];
    return `<aside class="sidebar"><div class="brand"><img src="./icons/icon-192.png" alt=""><div><div class="brand-name">词斩</div><div class="brand-sub">VOCABULARY SLAYER</div></div>${state.installAvailable ? `<button class="app-install-shortcut" data-action="install-app" aria-label="安装词斩" title="安装词斩">${icon("install", 19)}</button>` : ""}</div><nav class="nav" aria-label="主导航">${items.map(([page, iconName, label]) => `<button class="nav-button ${state.page === page ? "active" : ""}" data-action="nav" data-page="${page}"><span class="nav-icon">${icon(iconName, 19)}</span><span>${label}</span></button>`).join("")}</nav><div class="sidebar-foot">${state.installAvailable ? `<button class="sidebar-install" data-action="install-app">${icon("install", 15)} 安装词斩</button>` : ""}进度自动保存<br>${WORDS.length} 个易错词</div></aside>`;
  }

  function renderStudy() {
    const session = state.session;
    if (!session) return "";
    if (session.finished) {
      const total = session.correct + session.wrong;
      const rate = total ? Math.round((session.correct / total) * 100) : 0;
      const masteredGain = Math.max(0, statusCounts().mastered - session.startMastered);
      const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
      return `<div class="study-overlay"><div class="study-stage"><div class="study-head"><span></span><div class="study-head-center"><div class="study-title">${escapeHtml(session.title)}</div><div class="study-count">完成</div></div><span></span></div><div class="question-wrap"><article class="session-done"><div class="section-kicker">本轮验收</div><div class="done-score">${rate}%</div><div class="done-label">真实作答正确率</div><div class="done-stats"><div><strong>${session.correct}</strong><span>答对</span></div><div><strong>${session.wrong}</strong><span>待追杀</span></div><div><strong>${masteredGain}</strong><span>新增长期掌握</span></div></div><button class="primary-button button-wide" data-action="close-session-force">返回 · ${minutes} 分钟</button></article></div><div></div></div></div>`;
    }
    const question = session.questions[session.index];
    const word = WORD_BY_ID.get(question.wordId);
    const progress = ((session.index + (session.answered ? 1 : 0)) / session.questions.length) * 100;
    const feedback = session.feedback;
    const answerArea = session.answered
      ? `<div class="feedback-panel ${feedback.correct ? "good" : "bad"}"><div class="feedback-title">${feedback.correct ? "提取成功" : feedback.unknown ? "已诚实标记不认识" : "已加入短时追杀"}<span>${(feedback.responseMs / 1000).toFixed(1)}s</span></div><button class="${feedback.correct ? "secondary-button" : "primary-button"}" data-action="next-question">下一题 ${icon("arrow", 16)}</button></div>`
      : question.typed
        ? `<form class="type-answer" data-role="answer-form"><input name="answer" placeholder="输入完整英文" autocapitalize="off" autocomplete="off" spellcheck="false" /><button class="primary-button" type="submit">确认</button></form>`
        : question.type === "recognition" && !session.optionRevealed
          ? `<div class="recall-gate"><button class="secondary-button" data-action="reveal-options">想好了 · 查看选项</button><button class="unknown-ready" data-action="answer-option" data-value="__UNKNOWN__">不认识</button></div>`
        : `<div class="options">${question.options.map((option, index) => `<button class="option-button" data-action="answer-option" data-value="${escapeHtml(option)}"><span class="option-key">${index + 1}</span><span>${escapeHtml(option)}</span></button>`).join("")}<button class="option-button unknown-option" data-action="answer-option" data-value="__UNKNOWN__"><span class="option-key">0</span><span>确实不认识</span></button></div>`;
    const visiblePrompt = question.type === "recognition" && !session.optionRevealed
      ? "先在脑中说出它的核心义，再查看选项"
      : question.prompt;
    return `<div class="study-overlay"><div class="study-stage">
      <div class="study-head"><button class="icon-button" data-action="close-session" aria-label="结束训练">${icon("back", 19)}</button><div class="study-head-center"><div class="study-title">${escapeHtml(session.title)}</div><div class="study-count">${session.index + 1} / ${session.questions.length}</div><div class="study-progress"><span style="width:${progress}%"></span></div></div><button class="icon-button" data-action="speak" data-word="${escapeHtml(word.word)}" aria-label="朗读" ${question.type !== "recognition" && !session.answered ? "disabled" : ""}>${icon("volume", 19)}</button></div>
      <div class="question-wrap"><article class="question-card ${session.answered ? `answered ${feedback.correct ? "good" : "bad"}` : ""}"><span class="question-type">${TYPE_LABELS[question.type]}</span><div class="question-word">${escapeHtml(session.answered ? word.word : question.display)}</div><div class="question-phonetic">${escapeHtml(session.answered ? word.phonetic : question.phonetic)}</div>${session.answered ? `<div class="answer-reveal"><strong>${escapeHtml(word.core)}</strong><span>${escapeHtml(word.meaning)}</span></div>` : `<p class="question-prompt">${escapeHtml(visiblePrompt)}</p>`}</article></div>
      <div>${answerArea}</div>
    </div></div>`;
  }

  function renderDetail() {
    if (!state.detailId) return "";
    const word = WORD_BY_ID.get(state.detailId);
    if (!word) return "";
    const progress = getProgress(word.id);
    const profile = wordProfile(word);
    const plan = ADVENTURE.wordPlan(word.id);
    const relevantTypes = typesForWord(word);
    const confusionItems = word.confusions.map((name) => ({
      name,
      core: WORDS.find((candidate) => candidate.word === name)?.core || "释义未收录",
    }));
    return `<div class="modal-backdrop" data-action="close-detail"><article class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(word.word)} 详情" data-stop>
      <div class="modal-head"><div><div class="word-index">NO. ${String(word.id).padStart(4, "0")} · ${STATUS_LABELS[progress.status]}</div><h2 class="detail-word">${escapeHtml(word.word)}</h2><div class="detail-phonetic">${escapeHtml(word.phonetic)}</div></div><button class="icon-button" data-action="close-detail" aria-label="关闭">${icon("close", 18)}</button></div>
      <div class="profile-switch"><button class="${profile === "reading" ? "active" : ""}" data-action="set-profile" data-profile="reading" data-id="${word.id}"><strong>阅读词</strong><span>看懂即可 · 免默写</span></button><button class="${profile === "writing" ? "active" : ""}" data-action="set-profile" data-profile="writing" data-id="${word.id}"><strong>写作词</strong><span>会用 · 会拼写</span></button></div>
      <div class="detail-core"><small>核心义</small><strong>${escapeHtml(word.core)}</strong></div>
      <p class="detail-memory">${escapeHtml(word.memory)}</p>
      <div class="sense-list">${word.senses.map((sense) => `<div class="sense-item"><span class="sense-pos">${escapeHtml(sense.pos || "释义")}</span>${escapeHtml(sense.text)}</div>`).join("")}</div>
      ${confusionItems.length ? `<div class="detail-core confusion-core"><small>易混词</small><div class="confusion-list">${confusionItems.map((item) => `<span><strong>${escapeHtml(item.name)}</strong><em>${escapeHtml(item.core)}</em></span>`).join("")}</div></div>` : ""}
      <div class="story-record"><span>${icon("adventure", 16)} 剧情登场</span><strong>${progress.story.exposures} 次相遇 · 第 ${plan.episode} 章首次 · 第 ${plan.delayedEpisode} 章延迟重现</strong></div>
      <div class="fingerprint">${relevantTypes.map((type) => `<div class="fingerprint-item"><strong>${Math.round(evidenceScore(progress.evidence[type], type) * 100)}%</strong><span>${TYPE_SHORT[type]}</span></div>`).join("")}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="start-session" data-mode="word" data-id="${word.id}">${icon("target", 17)} 针对训练</button><button class="ghost-button" data-action="speak" data-word="${escapeHtml(word.word)}">${icon("volume", 17)} 朗读</button></div>
    </article></div>`;
  }

  function renderToast() {
    return state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : "";
  }

  function render() {
    if (!state.ready) return;
    root.innerHTML = `<div class="app-shell">${renderSidebar()}<main class="main">${renderPage()}</main></div>${renderStudy()}${renderAdventurePlayer()}${renderDetail()}${renderToast()}`;
    if (state.session && !state.session.answered && !state.session.finished && state.session.questions[state.session.index]?.typed) {
      setTimeout(() => root.querySelector('[data-role="answer-form"] input')?.focus(), 20);
    }
  }

  function showToast(message) {
    state.toast = message;
    render();
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      state.toast = "";
      render();
    }, 2300);
  }

  async function exportData() {
    const payload = {
      type: "CIZHAN_BACKUP",
      version: 1,
      exportedAt: new Date().toISOString(),
      vocabularyCount: WORDS.length,
      settings: state.settings,
      profiles: [...state.profiles.entries()],
      adventure: state.adventure,
      progress: [...state.progress.values()],
      events: state.events,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `词斩进度_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("学习进度已导出");
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload.type !== "CIZHAN_BACKUP" || !Array.isArray(payload.progress)) throw new Error("invalid");
      if (!window.confirm("导入将覆盖当前学习进度，继续吗？")) return;
      await Promise.all([clearStore("progress"), clearStore("events")]);
      state.progress.clear();
      for (const progress of payload.progress) {
        if (!WORD_BY_ID.has(progress.id)) continue;
        state.progress.set(progress.id, progress);
        await put("progress", progress);
      }
      state.events = Array.isArray(payload.events) ? payload.events.slice(-MAX_EVENTS) : [];
      for (const event of state.events) await addEvent(event);
      state.settings = { ...DEFAULT_SETTINGS, ...(payload.settings || {}) };
      state.profiles = new Map(Array.isArray(payload.profiles) ? payload.profiles : []);
      state.adventure = { ...DEFAULT_ADVENTURE_STATE, ...(payload.adventure || {}) };
      await put("meta", { key: "settings", value: state.settings });
      await put("meta", { key: "profiles", value: [...state.profiles.entries()] });
      await put("meta", { key: "adventure", value: state.adventure });
      showToast("进度已恢复");
    } catch (error) {
      showToast("文件无法识别，请选择词斩备份");
    }
  }

  async function resetData() {
    if (!window.confirm("清空全部学习进度？1800 词原始词库不会删除。")) return;
    await Promise.all([clearStore("progress"), clearStore("events")]);
    state.progress.clear();
    state.events = [];
    state.adventure = { ...DEFAULT_ADVENTURE_STATE, chapterNodes: {}, completed: [], inventory: [], seenNodes: [] };
    await put("meta", { key: "adventure", value: state.adventure });
    render();
    showToast("学习进度已清空");
  }

  async function installApp() {
    if (!installPrompt) {
      if (window.matchMedia?.("(display-mode: standalone)").matches) showToast("词斩已安装到本机");
      else showToast("可从 Chrome 地址栏右侧安装词斩");
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    state.installAvailable = false;
    render();
  }

  root.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "nav") {
      state.page = target.dataset.page;
      state.detailId = null;
      render();
    } else if (action === "start-session") {
      state.detailId = null;
      startSession(target.dataset.mode || "today", Number(target.dataset.id) || null);
    } else if (action === "start-adventure") {
      await startAdventure(target.dataset.chapter);
    } else if (action === "start-side") {
      await startSideEvent(target.dataset.side);
    } else if (action === "start-nemesis") {
      startNemesis(target.dataset.id);
    } else if (action === "select-arc") {
      state.adventureArcId = target.dataset.arc;
      const firstChapter = ADVENTURE.chapters.find((chapter) => chapter.arcId === state.adventureArcId);
      if (firstChapter) state.adventurePreviewChapterId = firstChapter.id;
      render();
    } else if (action === "select-chapter") {
      state.adventurePreviewChapterId = target.dataset.chapter;
      render();
    } else if (action === "close-adventure") {
      const activeChapter = ADVENTURE.chapterById[state.adventure.chapterId];
      state.adventureOpen = false;
      state.adventureFinished = null;
      state.adventureGlossId = null;
      state.adventure.activeSideId = null;
      if (activeChapter) {
        state.adventureArcId = activeChapter.arcId;
        state.adventurePreviewChapterId = activeChapter.id;
      }
      await saveAdventure();
      render();
    } else if (action === "adventure-choice") {
      await chooseAdventure(Number(target.dataset.index));
    } else if (action === "continue-adventure") {
      await continueAdventure();
    } else if (action === "story-word") {
      await revealStoryWord(Number(target.dataset.id));
    } else if (action === "close-story-word") {
      state.adventureGlossId = null;
      render();
    } else if (action === "set-profile") {
      const id = Number(target.dataset.id);
      const word = WORD_BY_ID.get(id);
      if (!word) return;
      state.profiles.set(id, target.dataset.profile === "writing" ? "writing" : "reading");
      const progress = getProgress(id);
      if (progress.exposures) {
        const calculated = calculateMastery(word, progress);
        progress.mastery = calculated.mastery;
        progress.status = calculated.status;
        state.progress.set(id, progress);
        await put("progress", progress);
      }
      await put("meta", { key: "profiles", value: [...state.profiles.entries()] });
      render();
    } else if (action === "answer-option") {
      await submitAnswer(target.dataset.value);
    } else if (action === "reveal-options") {
      if (state.session && !state.session.answered) {
        state.session.optionRevealed = true;
        render();
      }
    } else if (action === "next-question") {
      nextQuestion();
    } else if (action === "close-session") {
      closeSession(false);
    } else if (action === "close-session-force") {
      closeSession(true);
    } else if (action === "word-detail") {
      state.detailId = Number(target.dataset.id);
      render();
    } else if (action === "close-detail") {
      if (event.target.closest("[data-stop]") && !event.target.closest("button[data-action='close-detail']")) return;
      state.detailId = null;
      render();
    } else if (action === "library-filter") {
      state.library.filter = target.dataset.filter;
      state.library.page = 1;
      render();
    } else if (action === "library-page") {
      state.library.page += Number(target.dataset.delta);
      render();
    } else if (action === "speak") {
      speak(target.dataset.word);
    } else if (action === "export-data") {
      await exportData();
    } else if (action === "import-data") {
      document.getElementById("import-file")?.click();
    } else if (action === "reset-data") {
      await resetData();
    } else if (action === "install-app") {
      await installApp();
    }
  });

  root.addEventListener("submit", async (event) => {
    if (!event.target.matches('[data-role="answer-form"]')) return;
    event.preventDefault();
    const data = new FormData(event.target);
    const answer = data.get("answer");
    if (!normalizeAnswer(answer)) return;
    await submitAnswer(answer);
  });

  root.addEventListener("input", (event) => {
    if (event.target.matches('[data-role="library-search"]')) {
      state.library.search = event.target.value;
      state.library.page = 1;
      window.clearTimeout(event.target._searchTimer);
      event.target._searchTimer = window.setTimeout(render, 130);
    }
  });

  root.addEventListener("change", async (event) => {
    if (event.target.id === "import-file" && event.target.files?.[0]) {
      await importData(event.target.files[0]);
    }
    if (event.target.matches('[data-role="daily-new"]')) {
      state.settings.dailyNew = Math.max(1, Math.floor(Number(event.target.value) || 20));
      await put("meta", { key: "settings", value: state.settings });
      showToast(`每日词量已设为 ${state.settings.dailyNew}`);
    }
    if (event.target.matches('[data-role="session-size"]')) {
      state.settings.sessionSize = Math.max(1, Math.floor(Number(event.target.value) || 30));
      await put("meta", { key: "settings", value: state.settings });
      showToast(`专项每轮已设为 ${state.settings.sessionSize}`);
    }
  });

  window.addEventListener("keydown", (event) => {
    const session = state.session;
    if (event.key === "Escape") {
      if (state.adventureOpen) {
        state.adventureOpen = false;
        state.adventureFinished = null;
        state.adventure.activeSideId = null;
        saveAdventure().catch(() => {});
        render();
      } else if (state.detailId) {
        state.detailId = null;
        render();
      } else if (session) closeSession(false);
      return;
    }
    if (!session || session.finished) return;
    if (session.answered && event.key === "Enter") {
      event.preventDefault();
      nextQuestion();
      return;
    }
    const question = session.questions[session.index];
    if (!session.answered && question.type === "recognition" && !session.optionRevealed && event.key === "Enter") {
      event.preventDefault();
      session.optionRevealed = true;
      render();
    } else if (!session.answered && !question.typed && (question.type !== "recognition" || session.optionRevealed) && /^[1-6]$/.test(event.key)) {
      const option = question.options[Number(event.key) - 1];
      if (option) submitAnswer(option);
    } else if (!session.answered && !question.typed && event.key === "0") {
      submitAnswer("__UNKNOWN__");
    }
  });

  async function boot() {
    if (WORDS.length !== 1800) {
      root.innerHTML = '<div class="empty-state">词库载入失败</div>';
      return;
    }
    try {
      await loadState();
      const requestedPage = new URLSearchParams(location.search || "").get("page");
      if (["today", "adventure", "library", "weak", "data"].includes(requestedPage)) state.page = requestedPage;
      render();
      if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        const register = () => navigator.serviceWorker.register("./sw.js").catch(() => {});
        if (document.readyState === "complete") register();
        else window.addEventListener("load", register, { once: true });
      }
    } catch (error) {
      console.error(error);
      root.innerHTML = '<div class="empty-state">本地数据初始化失败，请刷新后重试</div>';
    }
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    state.installAvailable = true;
    if (state.ready) render();
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    state.installAvailable = false;
    if (state.ready) render();
  });

  boot();
})();
