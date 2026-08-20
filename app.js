(function () {
  "use strict";

  const WORDS = Array.isArray(window.VOCABULARY) ? window.VOCABULARY : [];
  const WORD_BY_ID = new Map(WORDS.map((word) => [word.id, word]));
  const DB_NAME = "cizhan-vocabulary-v1";
  const DB_VERSION = 1;
  const DAY = 86_400_000;
  const HOUR = 3_600_000;
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
  const TYPE_WEIGHTS = {
    recognition: 0.16,
    recall: 0.25,
    context: 0.2,
    spelling: 0.24,
    discrimination: 0.15,
  };
  const DEFAULT_SETTINGS = { dailyNew: 20, sessionSize: 30, autoAudio: false };
  const STATUS_LABELS = {
    new: "完全不会",
    unstable: "不稳定",
    learning: "基本掌握",
    mastered: "长期掌握",
  };

  const root = document.getElementById("app");
  let database = null;
  let toastTimer = null;

  const state = {
    page: "today",
    progress: new Map(),
    events: [],
    settings: { ...DEFAULT_SETTINGS },
    library: { search: "", filter: "all", page: 1 },
    session: null,
    detailId: null,
    toast: "",
    ready: false,
  };

  const ICONS = {
    today: '<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/>',
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

  function evidenceScore(evidence, type) {
    const attempts = evidence.correct + evidence.wrong;
    if (!attempts) return 0;
    const accuracy = evidence.correct / attempts;
    const coverage = Math.min(1, attempts / TYPE_REQUIREMENTS[type]);
    const speed = evidence.avgMs ? clamp(1.14 - evidence.avgMs / 22000, 0.7, 1.08) : 0.9;
    return accuracy * coverage * speed;
  }

  function calculateMastery(progress) {
    let base = 0;
    let testedTypes = 0;
    Object.keys(TYPE_WEIGHTS).forEach((type) => {
      const score = evidenceScore(progress.evidence[type] || emptyEvidence(), type);
      base += score * TYPE_WEIGHTS[type];
      if ((progress.evidence[type]?.correct || 0) + (progress.evidence[type]?.wrong || 0) > 0) testedTypes += 1;
    });
    const delayBonus = Math.min(0.12, progress.longPasses * 0.06);
    const lapsePenalty = Math.min(0.18, progress.lapses * 0.025);
    const mastery = Math.round(clamp((base + delayBonus - lapsePenalty) * 100, 0, 100));
    let status = "new";
    if (progress.exposures > 0) status = "unstable";
    if (mastery >= 48 && testedTypes >= 3 && progress.streak >= 2) status = "learning";
    const survived72Hours = progress.firstSeen && Date.now() - progress.firstSeen >= 72 * HOUR;
    if (mastery >= 82 && testedTypes >= 4 && progress.longPasses >= 2 && survived72Hours) status = "mastered";
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
    state.progress = new Map(progressRows.map((item) => [item.id, item]));
    const settings = metaRows.find((item) => item.key === "settings");
    if (settings?.value) state.settings = { ...DEFAULT_SETTINGS, ...settings.value };
    state.events = eventRows.sort((a, b) => a.ts - b.ts).slice(-1600);
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
    return WORDS.filter((word) => state.progress.has(word.id)).sort((a, b) => weakRank(b) - weakRank(a));
  }

  function unstartedWords() {
    return WORDS.filter((word) => !state.progress.has(word.id));
  }

  function todayEventIds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return [...new Set(state.events.filter((event) => event.ts >= start.getTime()).map((event) => event.id))];
  }

  function sampleDistractors(word, count, samePos = true) {
    const candidates = WORDS.filter(
      (candidate) =>
        candidate.id !== word.id &&
        (!samePos || !word.pos || candidate.pos === word.pos) &&
        candidate.core !== word.core,
    );
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
        ...distractors.slice(0, 3).map((item) => `${item.pos ? `${item.pos}. ` : ""}${item.core}`),
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
      base.options = shuffle([word.word, ...distractors.slice(0, 3).map((item) => item.word)]);
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
    base.options = shuffle([word.word, ...extras.slice(0, 3).map((item) => item.word)]);
    return base;
  }

  function weakestType(progress, word) {
    if (!progress.exposures) return "recognition";
    const types = Object.keys(TYPE_WEIGHTS).filter((type) => type !== "discrimination" || word.confusions.length);
    return types.sort(
      (a, b) => evidenceScore(progress.evidence[a], a) - evidenceScore(progress.evidence[b], b),
    )[0];
  }

  function chooseWords(mode, count) {
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
      const ranked = weakWords();
      return [...ranked, ...unstartedWords()].slice(0, count);
    }
    const due = dueWords();
    const dueIds = new Set(due.map((word) => word.id));
    const weak = weakWords().filter((word) => !dueIds.has(word.id) && getProgress(word.id).status !== "mastered");
    const newLimit = Math.min(state.settings.dailyNew, Math.max(5, Math.ceil(count * 0.55)));
    const fresh = unstartedWords().slice(0, newLimit);
    const combined = [...due, ...weak.slice(0, Math.ceil(count * 0.2)), ...fresh];
    const seen = new Set();
    return combined.filter((word) => !seen.has(word.id) && seen.add(word.id)).slice(0, count);
  }

  function sessionTitle(mode) {
    if (mode === "today") return "今日歼灭";
    if (mode === "weak") return "5 分钟弱点";
    if (mode === "exam") return "今日验收";
    if (mode === "boss") return "Boss Rush";
    if (mode === "random") return "全库随机";
    if (mode.startsWith("type:")) return TYPE_LABELS[mode.split(":")[1]] || "专项训练";
    return "单词训练";
  }

  function startSession(mode, forcedWordId = null) {
    const count = mode === "weak" ? 20 : mode === "boss" ? 50 : mode === "exam" ? 30 : state.settings.sessionSize;
    let selected = forcedWordId ? [WORD_BY_ID.get(forcedWordId)].filter(Boolean) : chooseWords(mode, count);
    if (mode === "random") selected = shuffle(WORDS).slice(0, count);
    const forcedType = mode.startsWith("type:") ? mode.split(":")[1] : null;
    const strict = mode === "exam" || mode === "boss";
    let questions = forcedWordId
      ? Object.keys(TYPE_WEIGHTS).map((type) => createQuestion(selected[0], type, false))
      : selected.map((word, index) => {
          const type = forcedType || (strict ? Object.keys(TYPE_WEIGHTS)[index % 5] : weakestType(getProgress(word.id), word));
          const safeType = type === "discrimination" && !word.confusions.length ? "context" : type;
          return createQuestion(word, safeType, strict);
        });
    if (mode === "today" && !forcedWordId) {
      const fresh = selected.filter((word) => !state.progress.has(word.id)).slice(0, 8);
      fresh.forEach((word, index) => {
        const followUp = createQuestion(word, index % 2 ? "recall" : "context", false);
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
      selected: "",
      feedback: null,
      startedAt: Date.now(),
      questionStartedAt: Date.now(),
      startMastered: statusCounts().mastered,
      finished: false,
    };
    render();
  }

  async function submitAnswer(value) {
    const session = state.session;
    if (!session || session.answered || session.finished) return;
    const question = session.questions[session.index];
    const word = WORD_BY_ID.get(question.wordId);
    const responseMs = Math.max(180, Date.now() - session.questionStartedAt);
    const correct = normalizeAnswer(value) === normalizeAnswer(question.answer);
    session.answered = true;
    session.selected = value;
    session.correct += correct ? 1 : 0;
    session.wrong += correct ? 0 : 1;
    session.feedback = { correct, responseMs };
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
    const calculated = calculateMastery(progress);
    progress.mastery = calculated.mastery;
    progress.status = calculated.status;
    if (!correct && priorStatus === "mastered") progress.status = "unstable";
    state.progress.set(word.id, progress);
    const event = { ts: now, id: word.id, type, correct, ms: responseMs, mode };
    state.events.push(event);
    state.events = state.events.slice(-1600);
    await Promise.all([put("progress", progress), addEvent(event)]);
  }

  function nextQuestion() {
    const session = state.session;
    if (!session || !session.answered) return;
    session.index += 1;
    session.answered = false;
    session.selected = "";
    session.feedback = null;
    session.questionStartedAt = Date.now();
    if (session.index >= session.questions.length) session.finished = true;
    render();
  }

  function closeSession(force = false) {
    if (!state.session) return;
    if (!force && !state.session.finished && state.session.index > 0) {
      if (!window.confirm("结束本次训练？当前作答记录已经保存。")) return;
    }
    state.session = null;
    render();
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) {
      showToast("当前浏览器未提供朗读语音");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
  }

  function pageHeader(eyebrow, title, note) {
    return `<header class="page-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="page-title">${escapeHtml(title)}</h1></div><p class="page-note">${escapeHtml(note)}</p></header>`;
  }

  function renderToday() {
    const counts = statusCounts();
    const remaining = WORDS.length - counts.mastered;
    const due = dueWords().length;
    const weak = weakWords().filter((word) => getProgress(word.id).mastery < 50).length;
    const masteredPercent = WORDS.length ? (counts.mastered / WORDS.length) * 100 : 0;
    const todayIds = todayEventIds();
    const todayCorrect = state.events.filter((event) => todayIds.includes(event.id) && event.correct).length;
    return `<section class="page today-page">
      ${pageHeader("TODAY", "今天，只清该清的词", `${WORDS.length} 词已完整载入`)}
      <div class="today-grid">
        <article class="card hero-card">
          <div>
            <div class="remaining-label">待歼灭易错词</div>
            <div class="remaining-number ${remaining === 0 ? "zero" : ""}">${remaining}</div>
            <div class="hero-progress">
              <div class="progress-track"><div class="progress-fill" style="width:${masteredPercent.toFixed(2)}%"></div></div>
              <div class="progress-meta"><span>真正掌握 ${counts.mastered}</span><span>${masteredPercent.toFixed(1)}%</span></div>
            </div>
          </div>
          <button class="primary-button button-wide" data-action="start-session" data-mode="today">开始今日歼灭 ${icon("arrow", 18)}</button>
        </article>
        <div class="side-stack">
          <article class="card pressure-card">
            <div class="section-kicker">今日节奏</div>
            <div class="pressure-row">
              <div class="pressure-item"><span class="pressure-value">${due}</span><span class="pressure-name">到期复习</span></div>
              <div class="pressure-item"><span class="pressure-value">${state.settings.dailyNew}</span><span class="pressure-name">新词上限</span></div>
              <div class="pressure-item"><span class="pressure-value">${weak}</span><span class="pressure-name">薄弱词</span></div>
            </div>
          </article>
          <article class="card quick-card">
            <div class="section-kicker">短时追杀</div>
            <h2 class="quick-title">不想完整学，也别断档</h2>
            <p class="quick-text">只抽当前最值得复习的词，集中攻击拼写、主动回忆和最近错误。</p>
            <div class="quick-actions">
              <button class="secondary-button" data-action="start-session" data-mode="weak">${icon("bolt", 17)} 5 分钟极速弱点</button>
              <button class="ghost-button" data-action="start-session" data-mode="exam">今日验收</button>
            </div>
          </article>
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

  function filterWords() {
    const query = normalizeAnswer(state.library.search);
    return WORDS.filter((word) => {
      const progress = getProgress(word.id);
      const matchesQuery = !query || word.word.includes(query) || word.meaning.includes(state.library.search.trim());
      if (!matchesQuery) return false;
      if (state.library.filter === "all") return true;
      if (state.library.filter === "confusion") return word.confusions.length > 0;
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
            <div class="word-index">NO. ${String(word.id).padStart(4, "0")} · ${escapeHtml(word.phonetic)}</div>
            <p class="word-meaning">${escapeHtml(word.meaning)}</p>
          </button>`;
        }).join("")}</div>` : `<div class="empty-state">没有符合条件的单词</div>`}
      </div>
      <div class="pager"><span>${filtered.length ? `${start + 1}-${Math.min(start + pageSize, filtered.length)} / ${filtered.length}` : "0 个单词"}</span><div class="pager-buttons"><button data-action="library-page" data-delta="-1" ${state.library.page <= 1 ? "disabled" : ""}>${icon("back", 17)}</button><button data-action="library-page" data-delta="1" ${state.library.page >= pages ? "disabled" : ""}>${icon("arrow", 17)}</button></div></div>
    </section>`;
  }

  function weaknessCounts() {
    const touched = WORDS.filter((word) => state.progress.has(word.id));
    const typeWeak = (type) => touched.filter((word) => evidenceScore(getProgress(word.id).evidence[type], type) < 0.55).length;
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
      ["recall", "target", "主动回忆弱", "中文出现时，英文提取不够稳定", counts.recall],
      ["spelling", "keyboard", "拼写薄弱", "完整输入，清掉形似但写不出的词", counts.spelling],
      ["context", "layers", "多义与语境", "不只认一个中文，追踪不同义项", counts.context],
      ["discrimination", "eye", "易混词猎杀", "把形近、音近词放在一起强制区分", counts.discrimination],
      ["recognition", "timer", "反应速度慢", "答对但想太久，也会继续出现", counts.slow],
      ["context", "flame", "遗忘与复活", "专攻答错过、降级过的旧词", counts.long],
    ];
    return `<section class="page weakness-page">
      ${pageHeader("WEAKNESS", "只打薄弱处", "按记忆证据自动归因")}
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
    return `<section class="page data-page">
      ${pageHeader("EVIDENCE", "记忆证据", "掌握度来自真实作答")}
      <div class="data-grid">
        <article class="card data-card"><h3>掌握分布</h3><div class="distribution-list">${rows.map(([label, value, className]) => `<div class="distribution-row"><span>${label}</span><div class="bar"><span class="${className}" style="width:${(value / WORDS.length) * 100}%"></span></div><strong>${value}</strong></div>`).join("")}</div></article>
        <article class="card data-card"><h3>最近 7 天作答</h3><div class="trend-bars">${days.map((day) => `<div class="trend-day"><div title="${day.count} 次作答，答对 ${day.correct}" class="trend-column" style="height:${Math.max(5, (day.count / max) * 100)}%"></div><span>${day.label}</span></div>`).join("")}</div></article>
        <div class="data-actions">
          <button class="ghost-button" data-action="export-data">${icon("download", 17)} 导出进度</button>
          <button class="ghost-button" data-action="import-data">${icon("upload", 17)} 导入进度</button>
          <input id="import-file" class="sr-only" type="file" accept="application/json,.json" />
          <button class="danger-button" data-action="reset-data">${icon("trash", 17)} 清空进度</button>
          <label class="settings-inline">每日新词上限 <input data-role="daily-new" type="number" min="5" max="100" step="5" value="${state.settings.dailyNew}" /></label>
        </div>
      </div>
    </section>`;
  }

  function renderPage() {
    if (state.page === "library") return renderLibrary();
    if (state.page === "weak") return renderWeakness();
    if (state.page === "test") return renderTests();
    if (state.page === "data") return renderData();
    return renderToday();
  }

  function renderSidebar() {
    const items = [
      ["today", "today", "今日"],
      ["library", "library", "词库"],
      ["weak", "weak", "弱点"],
      ["test", "test", "测试"],
      ["data", "data", "数据"],
    ];
    return `<aside class="sidebar"><div class="brand"><img src="./icons/icon-192.png" alt=""><div><div class="brand-name">词斩</div><div class="brand-sub">VOCABULARY SLAYER</div></div></div><nav class="nav" aria-label="主导航">${items.map(([page, iconName, label]) => `<button class="nav-button ${state.page === page ? "active" : ""}" data-action="nav" data-page="${page}"><span class="nav-icon">${icon(iconName, 19)}</span><span>${label}</span></button>`).join("")}</nav><div class="sidebar-foot">本轮进度自动保存<br>${WORDS.length} 个易错词</div></aside>`;
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
      ? `<div class="feedback-panel ${feedback.correct ? "good" : "bad"}"><div><div class="feedback-title">${feedback.correct ? "提取成功" : "已加入短时追杀"} · ${(feedback.responseMs / 1000).toFixed(1)}s</div><div class="feedback-answer"><strong>${escapeHtml(word.word)}</strong> ${escapeHtml(word.phonetic)} · ${escapeHtml(word.meaning)}</div></div><button class="${feedback.correct ? "secondary-button" : "primary-button"}" data-action="next-question">下一题 ${icon("arrow", 16)}</button></div>`
      : question.typed
        ? `<form class="type-answer" data-role="answer-form"><input name="answer" placeholder="输入完整英文" autocapitalize="off" autocomplete="off" spellcheck="false" /><button class="primary-button" type="submit">确认</button></form>`
        : `<div class="options">${question.options.map((option, index) => `<button class="option-button" data-action="answer-option" data-value="${escapeHtml(option)}"><span class="option-key">${index + 1}</span><span>${escapeHtml(option)}</span></button>`).join("")}</div>`;
    return `<div class="study-overlay"><div class="study-stage">
      <div class="study-head"><button class="icon-button" data-action="close-session" aria-label="结束训练">${icon("back", 19)}</button><div class="study-head-center"><div class="study-title">${escapeHtml(session.title)}</div><div class="study-count">${session.index + 1} / ${session.questions.length}</div><div class="study-progress"><span style="width:${progress}%"></span></div></div><button class="icon-button" data-action="speak" data-word="${escapeHtml(word.word)}" aria-label="朗读" ${question.type !== "recognition" && !session.answered ? "disabled" : ""}>${icon("volume", 19)}</button></div>
      <div class="question-wrap"><article class="question-card"><span class="question-type">${TYPE_LABELS[question.type]}</span><div class="question-word">${escapeHtml(question.display)}</div><div class="question-phonetic">${escapeHtml(question.phonetic)}</div><p class="question-prompt">${escapeHtml(question.prompt)}</p></article></div>
      <div>${answerArea}</div>
    </div></div>`;
  }

  function renderDetail() {
    if (!state.detailId) return "";
    const word = WORD_BY_ID.get(state.detailId);
    if (!word) return "";
    const progress = getProgress(word.id);
    return `<div class="modal-backdrop" data-action="close-detail"><article class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(word.word)} 详情" data-stop>
      <div class="modal-head"><div><div class="word-index">NO. ${String(word.id).padStart(4, "0")} · ${STATUS_LABELS[progress.status]}</div><h2 class="detail-word">${escapeHtml(word.word)}</h2><div class="detail-phonetic">${escapeHtml(word.phonetic)}</div></div><button class="icon-button" data-action="close-detail" aria-label="关闭">${icon("close", 18)}</button></div>
      <div class="detail-core"><small>核心义</small><strong>${escapeHtml(word.core)}</strong></div>
      <p class="detail-memory">${escapeHtml(word.memory)}</p>
      <div class="sense-list">${word.senses.map((sense) => `<div class="sense-item"><span class="sense-pos">${escapeHtml(sense.pos || "释义")}</span>${escapeHtml(sense.text)}</div>`).join("")}</div>
      ${word.confusions.length ? `<div class="detail-core"><small>易混词</small><strong>${word.confusions.map(escapeHtml).join(" · ")}</strong></div>` : ""}
      <div class="fingerprint">${Object.keys(TYPE_WEIGHTS).map((type) => `<div class="fingerprint-item"><strong>${Math.round(evidenceScore(progress.evidence[type], type) * 100)}%</strong><span>${TYPE_SHORT[type]}</span></div>`).join("")}</div>
      <div class="modal-actions"><button class="secondary-button" data-action="start-session" data-mode="word" data-id="${word.id}">${icon("target", 17)} 五维诊断</button><button class="ghost-button" data-action="speak" data-word="${escapeHtml(word.word)}">${icon("volume", 17)} 朗读</button></div>
    </article></div>`;
  }

  function renderToast() {
    return state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : "";
  }

  function render() {
    if (!state.ready) return;
    root.innerHTML = `<div class="app-shell">${renderSidebar()}<main class="main">${renderPage()}</main></div>${renderStudy()}${renderDetail()}${renderToast()}`;
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
      state.events = Array.isArray(payload.events) ? payload.events.slice(-1600) : [];
      for (const event of state.events) await addEvent(event);
      state.settings = { ...DEFAULT_SETTINGS, ...(payload.settings || {}) };
      await put("meta", { key: "settings", value: state.settings });
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
    render();
    showToast("学习进度已清空");
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
    } else if (action === "answer-option") {
      await submitAnswer(target.dataset.value);
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
      state.settings.dailyNew = clamp(Number(event.target.value) || 20, 5, 100);
      await put("meta", { key: "settings", value: state.settings });
      showToast("每日新词上限已保存");
    }
  });

  window.addEventListener("keydown", (event) => {
    const session = state.session;
    if (event.key === "Escape") {
      if (state.detailId) {
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
    if (!session.answered && !question.typed && /^[1-4]$/.test(event.key)) {
      const option = question.options[Number(event.key) - 1];
      if (option) submitAnswer(option);
    }
  });

  async function boot() {
    if (WORDS.length !== 1800) {
      root.innerHTML = '<div class="empty-state">词库载入失败</div>';
      return;
    }
    try {
      await loadState();
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

  boot();
})();
