(function () {
  "use strict";

  const WORDS = Array.isArray(window.VOCABULARY) ? window.VOCABULARY : [];
  const MEMORY_HOOKS = Array.isArray(window.WORD_MEMORY_HOOKS) ? window.WORD_MEMORY_HOOKS : [];
  const LEARNING_CONTENT = Array.isArray(window.WORD_LEARNING_CONTENT) ? window.WORD_LEARNING_CONTENT : [];
  const WORD_BY_ID = new Map(WORDS.map((word) => [word.id, word]));
  const DB_NAME = "cizhan-vocabulary-v1";
  const DB_VERSION = 2;
  const ENGINE_VERSION = 3;
  const DAY = 86_400_000;
  const HOUR = 3_600_000;
  const MINUTE = 60_000;
  const MAX_EVENTS = 50_000;
  const MAX_RECENT_EVIDENCE = 12;
  const TARGET_RETENTION = 0.9;
  const RECOVERY_KEY = "cizhan-recovery-v2";
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
    recognition: 4,
    recall: 3,
    context: 3,
    spelling: 3,
    discrimination: 2,
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
  const STATUS_LABELS = {
    new: "完全不会",
    unstable: "不稳定",
    learning: "基本掌握",
    mastered: "长期掌握",
  };

  const root = document.getElementById("app");
  let database = null;
  let toastTimer = null;
  let pronunciationAudio = null;
  let persistenceRequested = false;

  const state = {
    page: "today",
    progress: new Map(),
    events: [],
    settings: { ...DEFAULT_SETTINGS },
    profiles: new Map(),
    library: { search: "", filter: "all", page: 1 },
    session: null,
    pausedSession: null,
    mainlineSession: null,
    sideSession: null,
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

  function memoryHookRecord(word) {
    const hook = MEMORY_HOOKS[word.id];
    if (hook && typeof hook === "object") return hook;
    if (typeof hook === "string") return { kind: "专属记忆", text: hook };
    return { kind: "整词场景", text: word.memory || `用 ${word.word} 的完整词形绑定“${word.core}”，不做无依据拆分。` };
  }

  function memoryHook(word) {
    return memoryHookRecord(word).text;
  }

  function memoryHookKind(word) {
    return memoryHookRecord(word).kind;
  }

  function emptyEvidence() {
    return {
      correct: 0,
      wrong: 0,
      unknown: 0,
      avgMs: 0,
      lastAt: 0,
      streak: 0,
      lapses: 0,
      fastCorrect: 0,
      slowCorrect: 0,
      delayedPasses: 0,
      maxDelayHours: 0,
      recent: [],
    };
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
      difficulty: 5,
      stabilityHours: 0,
      lastReviewAt: 0,
      reviewCount: 0,
      unknownCount: 0,
      dynamicConfusions: {},
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
    const normalizedEvidence = Object.fromEntries(Object.keys(TYPE_WEIGHTS).map((type) => {
      const evidence = { ...emptyEvidence(), ...(progress.evidence?.[type] || {}) };
      evidence.recent = Array.isArray(evidence.recent) ? evidence.recent.slice(-MAX_RECENT_EVIDENCE) : [];
      return [type, evidence];
    }));
    return {
      ...base,
      ...progress,
      difficulty: clamp(Number(progress.difficulty) || base.difficulty, 1, 10),
      stabilityHours: Math.max(0, Number(progress.stabilityHours) || Number(progress.intervalHours) || 0),
      reviewCount: Math.max(0, Number(progress.reviewCount) || Number(progress.exposures) || 0),
      unknownCount: Math.max(0, Number(progress.unknownCount) || 0),
      dynamicConfusions: progress.dynamicConfusions && typeof progress.dynamicConfusions === "object"
        ? progress.dynamicConfusions
        : {},
      evidence: normalizedEvidence,
    };
  }

  function defaultWordProfile(word) {
    return WRITING_WORDS.has(word.word) ? "writing" : "reading";
  }

  function wordProfile(word) {
    return state.profiles.get(word.id) || defaultWordProfile(word);
  }

  function hasConfusion(word) {
    return word.confusions.length > 0 || Object.keys(getProgress(word.id).dynamicConfusions || {}).length > 0;
  }

  function typesForWord(word) {
    if (wordProfile(word) === "writing") {
      return Object.keys(WRITING_WEIGHTS).filter((type) => type !== "discrimination" || hasConfusion(word));
    }
    return ["recognition", "context", ...(hasConfusion(word) ? ["discrimination"] : [])];
  }

  function weightsForWord(word) {
    const source = wordProfile(word) === "writing" ? WRITING_WEIGHTS : READING_WEIGHTS;
    const allowed = typesForWord(word);
    const total = allowed.reduce((sum, type) => sum + source[type], 0) || 1;
    return Object.fromEntries(allowed.map((type) => [type, source[type] / total]));
  }

  function speedTarget(type) {
    if (type === "recognition") return 3_200;
    if (type === "discrimination") return 4_500;
    if (type === "context") return 7_500;
    return 9_500;
  }

  function retentionAt(progress, at = Date.now()) {
    if (!progress.lastReviewAt || !progress.stabilityHours) return 0;
    const elapsedHours = Math.max(0, (at - progress.lastReviewAt) / HOUR);
    return clamp(Math.pow(TARGET_RETENTION, elapsedHours / Math.max(0.05, progress.stabilityHours)), 0, 1);
  }

  function evidenceScore(evidence, type) {
    const attempts = evidence.correct + evidence.wrong;
    if (!attempts) return 0;
    const accuracy = (evidence.correct + 0.5) / (attempts + 1);
    const recent = Array.isArray(evidence.recent) ? evidence.recent : [];
    const recentAccuracy = recent.length
      ? recent.filter((item) => item.correct).length / recent.length
      : accuracy;
    const coverage = Math.min(1, attempts / TYPE_REQUIREMENTS[type]);
    const speed = evidence.avgMs ? clamp(speedTarget(type) / evidence.avgMs, 0.52, 1.05) : 0.75;
    const delay = evidence.maxDelayHours >= 72
      ? 1
      : evidence.maxDelayHours >= 24
        ? 0.94
        : evidence.maxDelayHours >= 6
          ? 0.87
          : 0.8;
    return clamp((accuracy * 0.44 + recentAccuracy * 0.36 + speed * 0.2) * coverage * delay, 0, 1);
  }

  function speedPressure(progress, word) {
    const ratios = typesForWord(word).map((type) => {
      const evidence = progress.evidence[type] || emptyEvidence();
      return evidence.correct + evidence.wrong > 0 && evidence.avgMs
        ? evidence.avgMs / speedTarget(type)
        : 0;
    });
    return Math.max(0, ...ratios);
  }

  function calculateMastery(word, progress) {
    const weights = weightsForWord(word);
    let base = 0;
    let testedTypes = 0;
    let readyTypes = 0;
    Object.keys(weights).forEach((type) => {
      const score = evidenceScore(progress.evidence[type] || emptyEvidence(), type);
      base += score * weights[type];
      const evidence = progress.evidence[type] || emptyEvidence();
      if (evidence.correct + evidence.wrong > 0) testedTypes += 1;
      if (score >= 0.68 && evidence.correct >= TYPE_REQUIREMENTS[type]) readyTypes += 1;
    });
    const delayBonus = Math.min(0.08, progress.longPasses * 0.025);
    const lapsePenalty = Math.min(0.2, progress.lapses * 0.022);
    const recentPenalty = Object.values(progress.evidence).some((evidence) =>
      evidence.recent?.slice(-2).some((item) => !item.correct && Date.now() - item.ts < 24 * HOUR)) ? 0.08 : 0;
    const mastery = Math.round(clamp((base + delayBonus - lapsePenalty - recentPenalty) * 100, 0, 100));
    let status = "new";
    if (progress.exposures > 0) status = "unstable";
    const learningTypes = wordProfile(word) === "writing" ? Math.min(3, Object.keys(weights).length) : 2;
    const masteredTypes = Object.keys(weights).length;
    if (mastery >= 45 && testedTypes >= learningTypes && progress.streak >= 2) status = "learning";
    const maxDelay = Math.max(0, ...Object.values(progress.evidence).map((evidence) => evidence.maxDelayHours || 0));
    const delayedProof = progress.firstSeen && Date.now() - progress.firstSeen >= 72 * HOUR && maxDelay >= 72;
    const stableMemory = progress.stabilityHours >= 72 && progress.longPasses >= 2;
    if (mastery >= 80 && readyTypes >= masteredTypes && delayedProof && stableMemory && recentPenalty === 0) status = "mastered";
    return { mastery, status };
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("progress")) db.createObjectStore("progress", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
        let eventStore;
        if (!db.objectStoreNames.contains("events")) {
          eventStore = db.createObjectStore("events", { keyPath: "eventId", autoIncrement: true });
        } else {
          eventStore = request.transaction.objectStore("events");
        }
        if (!eventStore.indexNames.contains("ts")) eventStore.createIndex("ts", "ts");
        if (!eventStore.indexNames.contains("wordId")) eventStore.createIndex("wordId", "id");
        if (!eventStore.indexNames.contains("mode")) eventStore.createIndex("mode", "mode");
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

  function readRecoverySnapshot() {
    try {
      const payload = JSON.parse(window.localStorage?.getItem(RECOVERY_KEY) || "null");
      return payload?.type === "CIZHAN_RECOVERY" && Array.isArray(payload.progress) ? payload : null;
    } catch (_error) {
      return null;
    }
  }

  function writeRecoverySnapshot() {
    try {
      window.localStorage?.setItem(RECOVERY_KEY, JSON.stringify({
        type: "CIZHAN_RECOVERY",
        engineVersion: ENGINE_VERSION,
        savedAt: Date.now(),
        settings: state.settings,
        profiles: [...state.profiles.entries()],
        progress: [...state.progress.values()],
        mainline: state.mainlineSession,
        side: state.sideSession,
      }));
    } catch (_error) {
      // IndexedDB remains authoritative; this mirror is only an eviction fallback.
    }
  }

  function replaceAllData(progressRows, eventRows, metaRows) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(["progress", "events", "meta"], "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error("restore failed"));
      transaction.onabort = () => reject(transaction.error || new Error("restore aborted"));
      const progressStore = transaction.objectStore("progress");
      const eventStore = transaction.objectStore("events");
      const metaStore = transaction.objectStore("meta");
      progressStore.clear();
      eventStore.clear();
      metaStore.clear();
      progressRows.forEach((row) => progressStore.put(row));
      eventRows.forEach((row) => {
        const clean = { ...row };
        delete clean.eventId;
        eventStore.add(clean);
      });
      metaRows.forEach((row) => metaStore.put(row));
    });
  }

  async function loadState() {
    database = await openDatabase();
    const [progressRows, metaRows, eventRows] = await Promise.all([
      getAll("progress"),
      getAll("meta"),
      getAll("events"),
    ]);
    state.progress = new Map(progressRows.map((item) => [item.id, normalizeProgress(item)]));
    const recovery = state.progress.size ? null : readRecoverySnapshot();
    if (recovery) {
      const recoveredRows = recovery.progress
        .filter((item) => WORD_BY_ID.has(Number(item.id)))
        .map((item) => normalizeProgress({ ...item, id: Number(item.id) }));
      state.progress = new Map(recoveredRows.map((item) => [item.id, item]));
      recoveredRows.forEach((item) => put("progress", item).catch(() => {}));
    }
    const settings = metaRows.find((item) => item.key === "settings");
    if (settings?.value || recovery?.settings) state.settings = { ...DEFAULT_SETTINGS, ...(settings?.value || recovery.settings) };
    state.settings.dailyNew = Math.max(1, Math.floor(Number(state.settings.dailyNew) || DEFAULT_SETTINGS.dailyNew));
    state.settings.sessionSize = Math.max(1, Math.floor(Number(state.settings.sessionSize) || DEFAULT_SETTINGS.sessionSize));
    state.settings.autoAudio = true;
    const profiles = metaRows.find((item) => item.key === "profiles");
    state.profiles = new Map(Array.isArray(profiles?.value) ? profiles.value : Array.isArray(recovery?.profiles) ? recovery.profiles : []);
    if (recovery) {
      put("meta", { key: "settings", value: state.settings }).catch(() => {});
      put("meta", { key: "profiles", value: [...state.profiles.entries()] }).catch(() => {});
    }
    const restoreSession = (session) => {
      if (!session || !Array.isArray(session.questions)
        || !session.questions.every((question) => WORD_BY_ID.has(question.wordId))) return null;
      session.index = clamp(Number(session.index) || 0, 0, Math.max(0, session.questions.length - 1));
      session.originalTotal = Number(session.originalTotal)
        || new Set(session.questions.map((question) => question.wordId)).size;
      session.questionStartedAt = Date.now();
      session.engineVersion = Number(session.engineVersion) || 1;
      return session;
    };
    const savedMainline = metaRows.find((item) => item.key === "mainlineSession")?.value || recovery?.mainline;
    const restoredMainline = restoreSession(savedMainline);
    if (restoredMainline && !restoredMainline.finished) state.mainlineSession = restoredMainline;
    const savedSide = metaRows.find((item) => item.key === "sideSession")?.value || recovery?.side;
    const restoredSide = restoreSession(savedSide);
    if (restoredSide && !restoredSide.finished) {
      state.sideSession = restoredSide;
      state.pausedSession = restoredSide;
    }
    const activeSession = metaRows.find((item) => item.key === "activeSession")?.value;
    const restored = restoreSession(activeSession?.session);
    if (restored) {
      if (activeSession.open) state.session = restored;
      if (!state.mainlineSession && isMainlineSession(restored) && !restored.finished) {
        state.mainlineSession = restored;
        put("meta", { key: "mainlineSession", value: restored }).catch(() => {});
      } else if (!isMainlineSession(restored) && !restored.finished) {
        state.sideSession = restored;
        state.pausedSession = restored;
        put("meta", { key: "sideSession", value: restored }).catch(() => {});
      }
    }
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
    }).sort((a, b) => {
      const left = getProgress(a.id);
      const right = getProgress(b.id);
      const leftUrgency = (1 - retentionAt(left, now)) * 100 + left.lapses * 4;
      const rightUrgency = (1 - retentionAt(right, now)) * 100 + right.lapses * 4;
      return rightUrgency - leftUrgency || left.due - right.due;
    });
  }

  function weakRank(word) {
    const progress = getProgress(word.id);
    return (
      (100 - progress.mastery) * 2 +
      progress.lapses * 18 +
      Math.min(20, speedPressure(progress, word) * 10) +
      (1 - retentionAt(progress)) * 45 +
      progress.unknownCount * 5 +
      (progress.revived ? 35 : 0) +
      (hasConfusion(word) ? 8 : 0)
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

  function todayNewGoal() {
    return Math.min(state.settings.dailyNew, todayIntroducedCount() + unstartedWords().length);
  }

  function todayNewRemaining() {
    return Math.min(
      Math.max(0, state.settings.dailyNew - todayIntroducedCount()),
      unstartedWords().length,
    );
  }

  function todayEventIds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return [...new Set(state.events.filter((event) => event.ts >= start.getTime()).map((event) => event.id))];
  }

  function learningContent(word) {
    const content = LEARNING_CONTENT[word.id];
    return content && typeof content === "object"
      ? content
      : { definition: [], examples: [], synonyms: [] };
  }

  function confusionCandidates(word) {
    const progress = getProgress(word.id);
    const dynamic = Object.entries(progress.dynamicConfusions || {})
      .sort(([, left], [, right]) => (right.count || 0) - (left.count || 0))
      .map(([id]) => WORD_BY_ID.get(Number(id)))
      .filter(Boolean);
    const declared = word.confusions.map((candidate) => WORDS.find((item) => item.word === candidate)).filter(Boolean);
    const reverse = WORDS.filter((candidate) => candidate.confusions.includes(word.word));
    return [...dynamic, ...declared, ...reverse].filter(
      (candidate, index, list) => candidate.id !== word.id && list.findIndex((item) => item.id === candidate.id) === index,
    );
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
    const result = confusionCandidates(word).filter(
      (candidate) => (!samePos || !word.pos || candidate.pos === word.pos) && candidate.core !== word.core,
    ).slice(0, count);
    for (let offset = 0; result.length < count && offset < candidates.length; offset += 1) {
      const candidate = candidates[(start + offset * 97) % candidates.length];
      if (!result.some((item) => item.id === candidate.id)) result.push(candidate);
    }
    return result;
  }

  function blankExample(example, word) {
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z])(${escaped})(?=[^a-z]|$)`, "i");
    if (!pattern.test(example)) return "";
    return example.replace(pattern, (_, prefix) => `${prefix}_____`);
  }

  function createQuestion(word, type, strict = false) {
    const distractors = sampleDistractors(word, 5, type !== "recognition");
    const base = {
      id: `${word.id}-${type}-${Math.random().toString(36).slice(2, 8)}`,
      wordId: word.id,
      type,
      repeatCount: 0,
      isRetry: false,
      strict,
      answer: word.word,
      display: word.word,
      phonetic: word.phonetic,
      prompt: "",
      typed: false,
      options: [],
      optionMap: {},
      explanation: "",
      contextKind: "",
    };
    if (type === "recognition") {
      const correct = `${word.pos ? `${word.pos}. ` : ""}${word.core}`;
      const entries = shuffle([
        { value: correct, wordId: word.id },
        ...distractors.slice(0, 5).map((item) => ({ value: `${item.pos ? `${item.pos}. ` : ""}${item.core}`, wordId: item.id })),
      ]);
      base.prompt = "选择最准确的核心含义";
      base.answer = correct;
      base.options = entries.map((entry) => entry.value);
      base.optionMap = Object.fromEntries(entries.map((entry) => [normalizeAnswer(entry.value), entry.wordId]));
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
      const content = learningContent(word);
      const examples = content.examples.map((example) => blankExample(example, word)).filter(Boolean);
      const definition = content.definition[0] || `the word meaning “${word.core}”`;
      base.display = examples.length ? "语境完形" : "英文释义";
      base.phonetic = "";
      base.contextKind = examples.length ? "example" : "definition";
      base.prompt = examples.length
        ? examples[Math.floor(Math.random() * examples.length)]
        : `根据英文释义选词：${definition}`;
      base.explanation = definition;
      const entries = shuffle([{ value: word.word, wordId: word.id }, ...distractors.slice(0, 5).map((item) => ({ value: item.word, wordId: item.id }))]);
      base.options = entries.map((entry) => entry.value);
      base.optionMap = Object.fromEntries(entries.map((entry) => [normalizeAnswer(entry.value), entry.wordId]));
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
    base.prompt = hasConfusion(word) ? "从易混词中选出正确拼写" : "选出与该含义对应的单词";
    const entries = shuffle([{ value: word.word, wordId: word.id }, ...extras.slice(0, 5).map((item) => ({ value: item.word, wordId: item.id }))]);
    base.options = entries.map((entry) => entry.value);
    base.optionMap = Object.fromEntries(entries.map((entry) => [normalizeAnswer(entry.value), entry.wordId]));
    return base;
  }

  function weakestType(progress, word) {
    if (!progress.exposures) return "recognition";
    const types = typesForWord(word);
    return types.sort(
      (a, b) => evidenceScore(progress.evidence[a], a) - evidenceScore(progress.evidence[b], b),
    )[0];
  }

  function slowestType(progress, word) {
    return typesForWord(word).sort((left, right) => {
      const leftEvidence = progress.evidence[left] || emptyEvidence();
      const rightEvidence = progress.evidence[right] || emptyEvidence();
      const leftRatio = leftEvidence.avgMs ? leftEvidence.avgMs / speedTarget(left) : 0;
      const rightRatio = rightEvidence.avgMs ? rightEvidence.avgMs / speedTarget(right) : 0;
      return rightRatio - leftRatio;
    })[0] || "recognition";
  }

  function chooseWords(mode, count) {
    if (mode === "daily-core") {
      const review = dueWords();
      const fresh = unstartedWords().slice(0, todayNewRemaining());
      return [...review, ...fresh].slice(0, count);
    }
    if (mode === "daily-review") {
      return dueWords().slice(0, count);
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
    if (mode === "weak" || mode.startsWith("type:") || mode.startsWith("weak:")) {
      const forcedType = mode.startsWith("type:") ? mode.split(":")[1] : null;
      const weakness = mode.startsWith("weak:") ? mode.split(":")[1] : "";
      const eligible = (word) => {
        const progress = getProgress(word.id);
        if (!progress.exposures) return false;
        if (forcedType && !typesForWord(word).includes(forcedType)) return false;
        if (weakness === "recall") return wordProfile(word) === "writing" && evidenceScore(progress.evidence.recall, "recall") < 0.68;
        if (weakness === "spelling") return wordProfile(word) === "writing" && evidenceScore(progress.evidence.spelling, "spelling") < 0.68;
        if (weakness === "multi") return word.multi && evidenceScore(progress.evidence.context, "context") < 0.68;
        if (weakness === "confusion") return hasConfusion(word)
          && evidenceScore(progress.evidence.discrimination, "discrimination") < 0.72;
        if (weakness === "slow") return speedPressure(progress, word) > 1.25;
        if (weakness === "revived") return progress.lapses > 0 || progress.revived;
        return true;
      };
      return weakWords().filter(eligible).slice(0, count);
    }
    const studiedToday = new Set(todayEventIds());
    const due = dueWords().filter((word) => !studiedToday.has(word.id));
    const dueIds = new Set(due.map((word) => word.id));
    const weak = weakWords().filter((word) => !studiedToday.has(word.id) && !dueIds.has(word.id) && getProgress(word.id).status !== "mastered");
    const newLimit = todayNewRemaining();
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
    if (mode === "weak:recall") return "专项 · 主动提取";
    if (mode === "weak:spelling") return "专项 · 写作拼写";
    if (mode === "weak:multi") return "专项 · 多义语境";
    if (mode === "weak:confusion") return "专项 · 易混猎杀";
    if (mode === "weak:slow") return "专项 · 反应提速";
    if (mode === "weak:revived") return "专项 · 遗忘复活";
    if (mode === "exam") return "今日验收";
    if (mode === "boss") return "Boss Rush";
    if (mode === "random") return "全库随机";
    if (mode.startsWith("type:")) return TYPE_LABELS[mode.split(":")[1]] || "专项训练";
    return "单词训练";
  }

  function isMainlineSession(session) {
    return session?.mode === "daily-core" || session?.mode === "daily-new";
  }

  function mainlineQueueText(session) {
    return `${Math.max(1, session.questions.length - session.index)} 题`;
  }

  function saveSession(open = true) {
    const session = state.session || state.pausedSession;
    const writes = [put("meta", { key: "activeSession", value: session ? { open, session } : null })];
    if (isMainlineSession(session)) {
      state.mainlineSession = session.finished ? null : session;
      writes.push(put("meta", { key: "mainlineSession", value: state.mainlineSession }));
    } else if (session) {
      state.sideSession = session.finished ? null : session;
      state.pausedSession = state.sideSession;
      writes.push(put("meta", { key: "sideSession", value: state.sideSession }));
    }
    return Promise.all(writes).catch(() => {});
  }

  function resumeSession(requestedMode = "") {
    const resumeMainline = (requestedMode === "daily-core" || requestedMode === "daily-new")
      && state.mainlineSession && !state.mainlineSession.finished;
    const target = resumeMainline ? state.mainlineSession : state.sideSession || state.pausedSession;
    if (!target || target.finished) return false;
    state.session = target;
    state.session.questionStartedAt = Date.now();
    saveSession(true);
    render();
    autoPlayCurrentWord();
    return true;
  }

  function safeQuestionType(word, type) {
    if (type === "discrimination" && !hasConfusion(word)) return "context";
    return type;
  }

  function forcedTypeForMode(mode) {
    if (mode.startsWith("type:")) return mode.split(":")[1];
    const mapping = {
      "weak:recall": "recall",
      "weak:spelling": "spelling",
      "weak:multi": "context",
      "weak:confusion": "discrimination",
    };
    return mapping[mode] || "";
  }

  function buildQuestionQueue(selected, mode, forcedWordId = null) {
    const strict = mode === "exam" || mode === "daily-exam" || mode === "boss";
    const forcedType = forcedTypeForMode(mode);
    if (forcedWordId) {
      return typesForWord(selected[0]).map((type) => ({
        ...createQuestion(selected[0], safeQuestionType(selected[0], type), false),
        phase: "diagnosis",
      }));
    }
    if (strict) {
      return selected.map((word, index) => {
        const allowed = typesForWord(word);
        const type = safeQuestionType(word, allowed[index % allowed.length]);
        return { ...createQuestion(word, type, true), phase: "exam" };
      });
    }
    const queue = [];
    const pending = [];
    const releaseDue = () => {
      pending.sort((left, right) => left.dueAt - right.dueAt);
      while (pending.length && pending[0].dueAt <= queue.length) queue.push(pending.shift().question);
    };
    selected.forEach((word, index) => {
      const progress = getProgress(word.id);
      const isFresh = progress.exposures === 0;
      const allowed = typesForWord(word);
      const adaptiveType = mode === "weak:slow" ? slowestType(progress, word) : weakestType(progress, word);
      const primaryType = safeQuestionType(word, forcedType || (isFresh ? "recognition" : adaptiveType));
      queue.push({ ...createQuestion(word, primaryType, false), phase: isFresh ? "first" : "review" });
      if ((mode === "today" || mode === "daily-core" || mode === "daily-new") && isFresh) {
        const followUps = wordProfile(word) === "writing"
          ? ["context", index % 2 ? "spelling" : "recall"]
          : ["context"];
        followUps.forEach((type, followIndex) => {
          pending.push({
            dueAt: queue.length + 6 + (word.id % 5) + followIndex * 12,
            question: { ...createQuestion(word, safeQuestionType(word, type), false), phase: "reinforcement" },
          });
        });
      }
      releaseDue();
    });
    pending.sort((left, right) => left.dueAt - right.dueAt).forEach((item) => queue.push(item.question));
    return queue;
  }

  async function reconcileMainlineTarget() {
    const session = state.mainlineSession;
    if (!session || session.finished) return;
    const planned = new Set(session.plannedWordIds || session.questions.map((question) => question.wordId));
    const unseenPlanned = [...planned].filter((id) => getProgress(id).exposures === 0).length;
    const targetRemaining = todayNewRemaining();
    const needed = Math.max(0, targetRemaining - unseenPlanned);
    if (!needed) return;
    const additions = unstartedWords().filter((word) => !planned.has(word.id)).slice(0, needed);
    if (!additions.length) return;
    session.questions.push(...buildQuestionQueue(additions, "daily-new"));
    session.plannedWordIds = [...planned, ...additions.map((word) => word.id)];
    session.originalTotal += additions.length;
    await put("meta", { key: "mainlineSession", value: session });
    if (state.session?.sessionId === session.sessionId) await saveSession(true);
  }

  function startSession(mode, forcedWordId = null) {
    if ((mode === "daily-core" || mode === "daily-new") && state.mainlineSession && !state.mainlineSession.finished) {
      resumeSession(mode);
      return;
    }
    const todayRemaining = todayNewRemaining();
    const pendingReviews = dueWords().length;
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
    const questions = buildQuestionQueue(selected, mode, forcedWordId);
    if (!questions.length) {
      showToast("当前没有可训练的单词");
      return;
    }
    state.session = {
      mode,
      engineVersion: ENGINE_VERSION,
      sessionId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
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
      originalTotal: new Set(questions.map((question) => question.wordId)).size,
      startMastered: statusCounts().mastered,
      plannedWordIds: selected.map((word) => word.id),
      wordResults: {},
      finished: false,
    };
    if (isMainlineSession(state.session)) state.mainlineSession = state.session;
    else {
      state.sideSession = state.session;
      state.pausedSession = state.session;
    }
    saveSession(true);
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
    const wordResult = session.wordResults?.[String(word.id)] || { attempts: 0, correct: 0, wrong: 0, unknown: 0, types: {} };
    wordResult.attempts += 1;
    wordResult.correct += correct ? 1 : 0;
    wordResult.wrong += correct ? 0 : 1;
    wordResult.unknown += unknown ? 1 : 0;
    wordResult.types[question.type] = correct;
    session.wordResults ||= {};
    session.wordResults[String(word.id)] = wordResult;
    session.feedback = { correct, unknown, responseMs };
    if (!correct && !question.strict && question.repeatCount < 2) {
      const repeat = {
        ...question,
        id: `${question.id}-r${question.repeatCount + 1}`,
        repeatCount: question.repeatCount + 1,
        isRetry: true,
        phase: "retry",
      };
      session.questions.splice(Math.min(session.index + 4, session.questions.length), 0, repeat);
    }
    await recordResult(word, question, correct, responseMs, session.mode, value, unknown);
    await saveSession(true);
    render();
  }

  function confusedWordId(question, selectedValue) {
    const normalized = normalizeAnswer(selectedValue);
    const mapped = Number(question.optionMap?.[normalized]);
    if (mapped && mapped !== question.wordId) return mapped;
    const typedWord = WORDS.find((candidate) => normalizeAnswer(candidate.word) === normalized);
    return typedWord && typedWord.id !== question.wordId ? typedWord.id : 0;
  }

  async function recordResult(word, question, correct, responseMs, mode, selectedValue, unknown) {
    const now = Date.now();
    const previous = getProgress(word.id);
    const progress = structuredClone(previous);
    const priorStatus = progress.status;
    const elapsedHours = progress.lastReviewAt ? Math.max(0, (now - progress.lastReviewAt) / HOUR) : 0;
    const retentionBefore = retentionAt(progress, now);
    const oldStability = Math.max(0.05, Number(progress.stabilityHours) || 0.05);
    progress.firstSeen ||= now;
    progress.lastSeen = now;
    progress.lastReviewAt = now;
    progress.exposures += 1;
    progress.reviewCount += 1;
    progress.unknownCount += unknown ? 1 : 0;
    progress.avgMs = progress.avgMs
      ? Math.round((progress.avgMs * (progress.exposures - 1) + responseMs) / progress.exposures)
      : responseMs;
    const evidence = progress.evidence[question.type] || emptyEvidence();
    const attempts = evidence.correct + evidence.wrong;
    evidence.avgMs = evidence.avgMs ? Math.round((evidence.avgMs * attempts + responseMs) / (attempts + 1)) : responseMs;
    evidence.correct += correct ? 1 : 0;
    evidence.wrong += correct ? 0 : 1;
    evidence.unknown += unknown ? 1 : 0;
    evidence.streak = correct ? evidence.streak + 1 : 0;
    evidence.lapses += correct ? 0 : 1;
    evidence.fastCorrect += correct && responseMs <= speedTarget(question.type) ? 1 : 0;
    evidence.slowCorrect += correct && responseMs > speedTarget(question.type) * 1.6 ? 1 : 0;
    if (elapsedHours >= 20) {
      evidence.maxDelayHours = Math.max(evidence.maxDelayHours || 0, elapsedHours);
      if (correct) evidence.delayedPasses += 1;
    }
    evidence.recent = [...(evidence.recent || []), {
      correct,
      unknown,
      ms: responseMs,
      ts: now,
      delayHours: Math.round(elapsedHours * 10) / 10,
    }].slice(-MAX_RECENT_EVIDENCE);
    evidence.lastAt = now;
    progress.evidence[question.type] = evidence;
    const slow = responseMs > speedTarget(question.type) * 1.6;
    const fast = responseMs <= speedTarget(question.type);
    if (correct) {
      progress.streak += 1;
      if (elapsedHours >= 20) progress.longPasses += 1;
      progress.difficulty = clamp(progress.difficulty - (fast ? 0.18 : slow ? 0.02 : 0.1), 1, 10);
      if (progress.reviewCount === 1) {
        progress.stabilityHours = 1 / 6;
      } else if (elapsedHours < 0.2) {
        progress.stabilityHours = clamp(Math.max(0.5, oldStability * (slow ? 1.35 : 1.9)), 0.5, 8);
      } else {
        const growth = 1.18 + (11 - progress.difficulty) * 0.075 + (1 - retentionBefore) * 1.45;
        const quality = fast ? 1.12 : slow ? 0.76 : 1;
        progress.stabilityHours = clamp(Math.max(oldStability, oldStability * growth * quality), 0.5, 24 * 180);
      }
      progress.intervalHours = clamp(progress.stabilityHours, 1 / 6, 24 * 180);
    } else {
      progress.streak = 0;
      progress.lapses += 1;
      progress.difficulty = clamp(progress.difficulty + (unknown ? 0.85 : 0.65), 1, 10);
      progress.stabilityHours = clamp(oldStability * 0.28, 0.05, 6);
      progress.intervalHours = 0.05;
      if (priorStatus === "mastered") progress.revived = true;
    }
    progress.due = now + progress.intervalHours * HOUR;
    const confusionId = !correct && !unknown ? confusedWordId(question, selectedValue) : 0;
    let confusionPeer = null;
    if (confusionId) {
      const current = progress.dynamicConfusions[String(confusionId)] || { count: 0, lastAt: 0 };
      progress.dynamicConfusions[String(confusionId)] = { count: current.count + 1, lastAt: now };
      confusionPeer = normalizeProgress(structuredClone(getProgress(confusionId)));
      const reverse = confusionPeer.dynamicConfusions[String(word.id)] || { count: 0, lastAt: 0 };
      confusionPeer.dynamicConfusions[String(word.id)] = { count: reverse.count + 1, lastAt: now };
      state.progress.set(confusionId, confusionPeer);
    }
    progress.stubborn = progress.lapses >= 4
      || progress.unknownCount >= 3
      || (progress.exposures >= 8 && speedPressure(progress, word) > 1.55);
    const calculated = calculateMastery(word, progress);
    progress.mastery = calculated.mastery;
    progress.status = calculated.status;
    if (!correct && priorStatus === "mastered") progress.status = "unstable";
    state.progress.set(word.id, progress);
    const event = {
      ts: now,
      id: word.id,
      type: question.type,
      phase: question.phase || "review",
      correct,
      unknown,
      selected: unknown ? "" : String(selectedValue || ""),
      confusionId,
      ms: responseMs,
      delayHours: Math.round(elapsedHours * 10) / 10,
      retentionBefore: Math.round(retentionBefore * 1000) / 1000,
      stabilityHours: Math.round(progress.stabilityHours * 100) / 100,
      mode,
    };
    state.events.push(event);
    state.events = state.events.slice(-MAX_EVENTS);
    await Promise.all([
      put("progress", progress),
      confusionPeer ? put("progress", confusionPeer) : Promise.resolve(),
      addEvent(event),
    ]);
    if (state.events.length % 20 === 0 || priorStatus !== progress.status) writeRecoverySnapshot();
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
    saveSession(true);
    render();
    autoPlayCurrentWord();
  }

  function closeSession(force = false) {
    if (!state.session) return;
    if (!force && !state.session.finished && state.session.index > 0) {
      if (!window.confirm("结束本次训练？当前作答记录已经保存。")) return;
    }
    stopAudio();
    const closingMainline = isMainlineSession(state.session);
    if (!force && !state.session.finished) {
      if (closingMainline) {
        state.mainlineSession = state.session;
        put("meta", { key: "mainlineSession", value: state.mainlineSession }).catch(() => {});
      } else {
        state.sideSession = state.session;
        state.pausedSession = state.session;
        put("meta", { key: "sideSession", value: state.sideSession }).catch(() => {});
      }
      saveSession(false);
    } else {
      put("meta", { key: "activeSession", value: null }).catch(() => {});
      if (closingMainline) {
        state.mainlineSession = null;
        put("meta", { key: "mainlineSession", value: null }).catch(() => {});
      } else {
        state.sideSession = null;
        state.pausedSession = null;
        put("meta", { key: "sideSession", value: null }).catch(() => {});
      }
    }
    state.session = null;
    writeRecoverySnapshot();
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

  function pageHeader(eyebrow, title, note) {
    return `<header class="page-head"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="page-title">${escapeHtml(title)}</h1></div><p class="page-note">${escapeHtml(note)}</p></header>`;
  }

  function renderToday() {
    const counts = statusCounts();
    const remaining = WORDS.length - counts.mastered;
    const todayIds = todayEventIds();
    const due = dueWords().length;
    const weak = weakWords().filter((word) => getProgress(word.id).mastery < 50).length;
    const masteredPercent = WORDS.length ? (counts.mastered / WORDS.length) * 100 : 0;
    const todayStudied = todayIds.length;
    const introducedToday = todayIntroducedCount();
    const todayGoal = todayNewGoal();
    const todayRemaining = todayNewRemaining();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCorrect = state.events.filter((event) => event.ts >= todayStart.getTime() && event.correct).length;
    const resumableMainline = state.mainlineSession && !state.mainlineSession.finished
      ? state.mainlineSession
      : null;
    const sessionRemainingWords = resumableMainline
      ? new Set(resumableMainline.questions.slice(resumableMainline.index).map((question) => question.wordId)).size
      : 0;
    const mainlineDone = due === 0 && todayRemaining === 0 && !resumableMainline;
    const coreCount = resumableMainline ? sessionRemainingWords : due + todayRemaining;
    const tasks = [
      { label: "到期复习", meta: due ? `${due} 词将在本轮复习` : "今日到期内容已完成", done: due === 0 },
      { label: "今日新词", meta: `${introducedToday} / ${todayGoal} 词`, done: todayRemaining === 0 },
      { label: "短时强化", meta: resumableMainline ? `本轮仍有 ${mainlineQueueText(resumableMainline)}，答错词会自动回查` : "新词换题型再提取，答错词自动回查", done: mainlineDone },
    ];
    const pausedSideSession = state.sideSession && !state.sideSession.finished && !isMainlineSession(state.sideSession)
      ? state.sideSession
      : null;
    const mainlineQueueRemaining = resumableMainline
      ? Math.max(1, resumableMainline.questions.length - resumableMainline.index)
      : 0;
    const sideQueueRemaining = pausedSideSession
      ? Math.max(1, pausedSideSession.questions.length - pausedSideSession.index)
      : 0;
    const action = resumableMainline
      ? { action: "resume-session", mode: resumableMainline.mode, label: `继续每日主线 · 剩 ${mainlineQueueRemaining} 题` }
      : !mainlineDone
        ? { action: "start-session", mode: "daily-core", label: `继续每日主线 · 剩 ${coreCount} 词` }
        : { action: "start-session", mode: "today", label: "今日主线完成 · 继续加练" };
    const sideResumeAction = pausedSideSession
      ? `<button class="ghost-button" data-action="resume-session" data-mode="${escapeHtml(pausedSideSession.mode)}">继续${escapeHtml(sessionTitle(pausedSideSession.mode))} · ${sideQueueRemaining} 题</button>`
      : "";
    return `<section class="page today-page">
      ${pageHeader("今日主线", mainlineDone ? "每日单词已完成" : "每日单词", `复习与新词合并学习，目标不是上限`)}
      <div class="today-flow-grid">
        <article class="card daily-mission-card">
          <div class="daily-mission-head"><div><span>主线剩余</span><strong>${coreCount} 词</strong></div><div class="daily-ring" style="--mission:${todayGoal ? Math.min(100, (introducedToday / todayGoal) * 100) : 100}%"><span>${mainlineDone ? "完成" : `${Math.min(100, Math.round((introducedToday / Math.max(1, todayGoal)) * 100))}%`}</span></div></div>
          <div class="daily-task-list">${tasks.map((task, index) => `<div class="daily-task ${task.done ? "done" : "current"}"><span class="daily-task-mark">${task.done ? icon("check", 15) : index + 1}</span><div><strong>${escapeHtml(task.label)}</strong><small>${escapeHtml(task.meta)}</small></div></div>`).join("")}</div>
          <button class="primary-button button-wide daily-main-action" data-action="${action.action}" data-mode="${action.mode}">${escapeHtml(action.label)} ${icon("arrow", 18)}</button>
          <p class="daily-no-cap">一轮会自动包含全部到期复习和剩余新词；完成后仍可无限加练。</p>
        </article>
        <div class="daily-side">
          <article class="card daily-overview-card"><div class="section-kicker">今日进度</div><div class="daily-numbers"><div><strong>${todayGoal}</strong><span>今日目标</span></div><div><strong>${introducedToday}</strong><span>已学新词</span></div><div><strong>${todayStudied}</strong><span>已接触词</span></div><div><strong>${due}</strong><span>待复习</span></div></div></article>
          <article class="card mastery-card"><div><span>自由加练</span><strong>${remaining}</strong><small>个词仍待真正掌握</small></div><div class="hero-progress"><div class="progress-track"><div class="progress-fill" style="width:${masteredPercent.toFixed(2)}%"></div></div><div class="progress-meta"><span>已掌握 ${counts.mastered}</span><span>${masteredPercent.toFixed(1)}%</span></div></div><div class="optional-actions">${sideResumeAction}<button class="ghost-button" data-action="start-session" data-mode="weak">弱点 ${weak}</button><button class="ghost-button" data-action="start-session" data-mode="daily-exam">今日验收</button></div></article>
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
      if (state.library.filter === "confusion") return hasConfusion(word);
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
      discrimination: touched.filter((word) => hasConfusion(word) && evidenceScore(getProgress(word.id).evidence.discrimination, "discrimination") < 0.62).length,
      long: touched.filter((word) => getProgress(word.id).lapses > 0 || getProgress(word.id).revived).length,
      slow: touched.filter((word) => speedPressure(getProgress(word.id), word) > 1.25).length,
    };
  }

  function renderWeakness() {
    const counts = weaknessCounts();
    const resumableSide = state.sideSession && !state.sideSession.finished ? state.sideSession : null;
    const cards = [
      ["weak:recall", "target", "写作提取弱", "只检查写作词的中文 → 英文", counts.recall],
      ["weak:spelling", "keyboard", "写作词拼写", "阅读词不强制默写，输出词精确到字母", counts.spelling],
      ["weak:multi", "layers", "多义与语境", "只抽多义词，用真实例句或英文释义验证", counts.context],
      ["weak:confusion", "eye", "易混词猎杀", "预设易混词与真实错选关系共同决定题目", counts.discrimination],
      ["weak:slow", "timer", "反应速度慢", "答对但提取过慢，也会继续出现", counts.slow],
      ["weak:revived", "flame", "遗忘与复活", "专攻答错过、降级过的旧词", counts.long],
    ];
    return `<section class="page weakness-page">
      ${pageHeader("WEAKNESS", "只打薄弱处", "按记忆证据自动归因")}
      <div class="weak-tools">${resumableSide ? `<button class="primary-button" data-action="resume-session" data-mode="${escapeHtml(resumableSide.mode)}">继续上次专项 · ${Math.max(1, resumableSide.questions.length - resumableSide.index)} 题</button>` : ""}<button class="ghost-button" data-action="start-session" data-mode="random">${icon("shuffle", 16)} 全库随机</button><button class="ghost-button" data-action="start-session" data-mode="exam">${icon("shield", 16)} 今日验收</button><button class="secondary-button" data-action="start-session" data-mode="boss">${icon("flame", 16)} Boss Rush</button></div>
      <div class="weak-grid">
        ${cards.map(([mode, iconName, title, text, count]) => `<button class="weak-card" data-action="start-session" data-mode="${mode}" ${count ? "" : "disabled"}>
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
      const ids = [...new Set(events.map((event) => event.id))];
      const correct = events.filter((event) => event.correct).length;
      days.push({
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        fullLabel: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
        start: date.getTime(),
        ids,
        words: ids.length,
        attempts: events.length,
        correct,
        accuracy: events.length ? Math.round((correct / events.length) * 100) : 0,
        timeMs: events.reduce((sum, event) => sum + Math.min(60_000, Math.max(0, Number(event.ms) || 0)), 0),
      });
    }
    return days;
  }

  function formatStudyTime(milliseconds) {
    const seconds = Math.round(milliseconds / 1000);
    if (seconds < 60) return `${seconds} 秒`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟`;
    return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
  }

  function formatDueAt(timestamp) {
    if (!timestamp) return "尚未进入复习计划";
    const delta = timestamp - Date.now();
    if (delta <= 0) return "现在到期";
    if (delta < HOUR) return `${Math.max(1, Math.round(delta / MINUTE))} 分钟后`;
    if (delta < DAY) return `${Math.max(1, Math.round(delta / HOUR))} 小时后`;
    return `${Math.max(1, Math.round(delta / DAY))} 天后`;
  }

  function renderData() {
    const counts = statusCounts();
    const days = lastSevenDays();
    const max = Math.max(1, ...days.map((day) => day.words));
    const rows = [
      ["完全不会", counts.new, ""],
      ["不稳定", counts.unstable, "amber"],
      ["基本掌握", counts.learning, "blue"],
      ["长期掌握", counts.mastered, "green"],
    ];
    const writingCount = WORDS.filter((word) => wordProfile(word) === "writing").length;
    const today = days.at(-1);
    const todayWords = today.ids.map((id) => WORD_BY_ID.get(id)).filter(Boolean);
    const todayStatus = { new: 0, unstable: 0, learning: 0, mastered: 0 };
    todayWords.forEach((word) => { todayStatus[getProgress(word.id).status] += 1; });
    const todayAverage = todayWords.length
      ? Math.round(todayWords.reduce((sum, word) => sum + getProgress(word.id).mastery, 0) / todayWords.length)
      : 0;
    const introduced = todayWords.filter((word) => getProgress(word.id).firstSeen >= today.start).length;
    const todayRows = [
      ["完全不会", todayStatus.new, "new"],
      ["不稳定", todayStatus.unstable, "unstable"],
      ["基本掌握", todayStatus.learning, "learning"],
      ["长期掌握", todayStatus.mastered, "mastered"],
    ];
    const studiedWords = WORDS.filter((word) => getProgress(word.id).exposures > 0);
    const expectedRetention = studiedWords.length
      ? Math.round(studiedWords.reduce((sum, word) => sum + retentionAt(getProgress(word.id)), 0) / studiedWords.length * 100)
      : 0;
    const dueNow = dueWords().length;
    const dueNextDay = studiedWords.filter((word) => {
      const due = getProgress(word.id).due;
      return due > Date.now() && due <= Date.now() + DAY;
    }).length;
    const stubbornTop = weakWords().filter((word) => getProgress(word.id).stubborn).slice(0, 10);
    const revivedRecent = weakWords().filter((word) => getProgress(word.id).revived).slice(0, 10);
    return `<section class="page data-page">
      ${pageHeader("MEMORY EVIDENCE", "记忆证据", "按真实作答记录词量、时间与掌握变化")}
      <div class="data-grid">
        <article class="card data-card"><h3>掌握分布</h3><div class="distribution-list">${rows.map(([label, value, className]) => `<div class="distribution-row"><span>${label}</span><div class="bar"><span class="${className}" style="width:${(value / WORDS.length) * 100}%"></span></div><strong>${value}</strong></div>`).join("")}</div><div class="profile-summary"><span>阅读词 ${WORDS.length - writingCount}</span><span>写作词 ${writingCount}</span></div></article>
        <article class="card data-card today-evidence"><div class="evidence-title"><h3>今日掌握详情</h3><strong>${todayAverage}%</strong></div><div class="today-evidence-summary"><div><strong>${today.words}</strong><span>学习单词</span></div><div><strong>${introduced}</strong><span>今日新词</span></div><div><strong>${today.accuracy}%</strong><span>作答正确率</span></div><div><strong>${formatStudyTime(today.timeMs)}</strong><span>有效学习时间</span></div></div><div class="today-status-list">${todayRows.map(([label, value, className]) => `<div class="today-status ${className}"><i></i><span>${label}</span><strong>${value} 词</strong></div>`).join("")}</div></article>
        <article class="card data-card seven-day-card"><div class="evidence-title"><h3>最近 7 天学习记录</h3><small>时间为有效作答时间，单题最多计 60 秒</small></div><div class="seven-day-layout"><div class="trend-bars">${days.map((day) => `<div class="trend-day"><strong>${day.words}</strong><div title="${day.words} 词，${formatStudyTime(day.timeMs)}" class="trend-column" style="height:${Math.max(5, (day.words / max) * 100)}%"></div><span>${day.label}</span></div>`).join("")}</div><div class="evidence-table"><div class="evidence-row evidence-head"><span>日期</span><span>单词量</span><span>学习时间</span><span>作答</span><span>正确率</span></div>${days.map((day) => `<div class="evidence-row"><span>${day.fullLabel}</span><strong>${day.words} 词</strong><span>${formatStudyTime(day.timeMs)}</span><span>${day.attempts} 次</span><strong>${day.accuracy}%</strong></div>`).join("")}</div></div></article>
        <div class="data-insight-grid">
          <article class="card data-card memory-health"><div class="evidence-title"><h3>记忆健康度</h3><strong>${expectedRetention}%</strong></div><div class="health-numbers"><div><strong>${dueNow}</strong><span>现在到期</span></div><div><strong>${dueNextDay}</strong><span>24 小时内</span></div><div><strong>${studiedWords.length}</strong><span>已建立证据</span></div><div><strong>${studiedWords.filter((word) => getProgress(word.id).stabilityHours >= 72).length}</strong><span>稳定期 ≥ 72h</span></div></div><p>保持率由每个词的记忆稳定期与距上次作答时间实时估计，不等同于累计正确率。</p></article>
          <article class="card data-card risk-words"><div class="evidence-title"><h3>最需处理的词</h3><small>按遗忘、慢答和近期错误排序</small></div><div class="risk-word-list">${[...stubbornTop, ...revivedRecent].filter((word, index, list) => list.findIndex((item) => item.id === word.id) === index).slice(0, 12).map((word) => { const progress = getProgress(word.id); return `<button data-action="word-detail" data-id="${word.id}"><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.core)}</span><em>${progress.revived ? "复活" : progress.stubborn ? "顽固" : `${progress.mastery}%`}</em></button>`; }).join("") || `<div class="empty-state compact">继续学习后会在这里定位顽固词</div>`}</div></article>
        </div>
        <div class="data-actions">
          <button class="ghost-button" data-action="export-data">${icon("download", 17)} 导出进度</button>
          <button class="ghost-button" data-action="import-data">${icon("upload", 17)} 导入进度</button>
          <input id="import-file" class="sr-only" type="file" accept="application/json,.json" />
          <button class="danger-button" data-action="reset-data">${icon("trash", 17)} 清空进度</button>
          <label class="settings-inline">每日词量 <input data-role="daily-new" type="number" min="1" step="1" value="${state.settings.dailyNew}" /></label>
          <label class="settings-inline compact">专项每轮 <input data-role="session-size" type="number" min="1" step="1" value="${state.settings.sessionSize}" /></label>
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
      ["data", "data", "数据"],
    ];
    return `<aside class="sidebar"><div class="brand"><img src="./icons/icon-192.png" alt=""><div><div class="brand-name">词斩</div><div class="brand-sub">VOCABULARY SLAYER</div></div></div><nav class="nav" aria-label="主导航">${items.map(([page, iconName, label]) => `<button class="nav-button ${state.page === page ? "active" : ""}" data-action="nav" data-page="${page}"><span class="nav-icon">${icon(iconName, 19)}</span><span>${label}</span></button>`).join("")}</nav><div class="sidebar-foot">进度自动保存<br>${WORDS.length} 个易错词</div></aside>`;
  }

  function renderStudy() {
    const session = state.session;
    if (!session) return "";
    if (session.finished) {
      const total = session.correct + session.wrong;
      const rate = total ? Math.round((session.correct / total) * 100) : 0;
      const masteredGain = Math.max(0, statusCounts().mastered - session.startMastered);
      const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000));
      const wordResults = Object.values(session.wordResults || {});
      const touchedWords = wordResults.length || session.originalTotal || 0;
      const unstableWords = wordResults.filter((result) => result.wrong > 0 || result.unknown > 0).length;
      const cleanWords = Math.max(0, touchedWords - unstableWords);
      return `<div class="study-overlay"><div class="study-stage"><div class="study-head"><span></span><div class="study-head-center"><div class="study-title">${escapeHtml(session.title)}</div><div class="study-count">完成</div></div><span></span></div><div class="question-wrap"><article class="session-done"><div class="section-kicker">本轮记忆证据</div><div class="done-score">${rate}%</div><div class="done-label">${touchedWords} 词 · ${total} 次主动作答</div><div class="done-stats"><div><strong>${cleanWords}</strong><span>本轮无错</span></div><div><strong>${unstableWords}</strong><span>继续追杀</span></div><div><strong>${masteredGain}</strong><span>新增长期掌握</span></div></div><p class="done-note">答错词已重新安排短时复测；长期掌握仍需通过跨日延迟验证。</p><button class="primary-button button-wide" data-action="close-session-force">返回 · ${minutes} 分钟</button></article></div><div></div></div></div>`;
    }
    const question = session.questions[session.index];
    const word = WORD_BY_ID.get(question.wordId);
    const originalTotal = session.originalTotal || new Set(session.questions.map((item) => item.wordId)).size;
    const originalReached = new Set(session.questions.slice(0, session.index + 1).map((item) => item.wordId)).size;
    const questionNumber = session.index + 1;
    const progress = (questionNumber / session.questions.length) * 100;
    const feedback = session.feedback;
    const answerArea = session.answered
      ? `<div class="feedback-panel ${feedback.correct ? "good" : "bad"}"><div class="feedback-title">${feedback.correct ? "提取成功" : feedback.unknown ? "已诚实标记不认识" : "已加入短时追杀"}<span>${(feedback.responseMs / 1000).toFixed(1)}s</span></div><button class="${feedback.correct ? "secondary-button" : "primary-button"}" data-action="next-question">下一题 ${icon("arrow", 16)}</button></div>`
      : question.typed
        ? `<form class="type-answer" data-role="answer-form"><input name="answer" placeholder="输入完整英文" autocapitalize="off" autocomplete="off" spellcheck="false" /><button class="primary-button" type="submit">确认</button></form>`
        : question.type === "recognition" && !session.optionRevealed
          ? `<div class="recall-gate"><button class="secondary-button" data-action="reveal-options">想好了 · 查看选项</button><button class="unknown-ready" data-action="answer-option" data-value="__UNKNOWN__">不认识</button></div>`
        : `<div class="options">${question.options.map((option, index) => `<button class="option-button ${question.type === "recognition" ? "" : "word-option"}" data-action="answer-option" data-value="${escapeHtml(option)}"><span class="option-key">${index + 1}</span><span>${escapeHtml(option)}</span></button>`).join("")}<button class="option-button unknown-option" data-action="answer-option" data-value="__UNKNOWN__"><span class="option-key">0</span><span>确实不认识</span></button></div>`;
    const visiblePrompt = question.type === "recognition" && !session.optionRevealed
      ? "先在脑中说出它的核心义，再查看选项"
      : question.prompt;
    const content = learningContent(word);
    const evidenceLine = question.explanation || content.definition[0] || "";
    const exampleLine = content.examples.find((example) => !/^source:/i.test(example)) || "";
    const displayClass = !session.answered && question.type === "context" ? " context-label" : "";
    return `<div class="study-overlay"><div class="study-stage">
      <div class="study-head"><button class="icon-button" data-action="close-session" aria-label="结束训练">${icon("back", 19)}</button><div class="study-head-center"><div class="study-title">${escapeHtml(session.title)}</div><div class="study-count">${question.isRetry || /-r\d+$/.test(question.id) ? "错词回查 · " : ""}${originalReached} / ${originalTotal} 词 · 第 ${questionNumber} / ${session.questions.length} 题</div><div class="study-progress"><span style="width:${progress}%"></span></div></div><button class="icon-button" data-action="speak" data-word="${escapeHtml(word.word)}" aria-label="朗读" ${question.type !== "recognition" && !session.answered ? "disabled" : ""}>${icon("volume", 19)}</button></div>
      <div class="question-wrap"><article class="question-card ${session.answered ? `answered ${feedback.correct ? "good" : "bad"}` : ""}"><span class="question-type">${TYPE_LABELS[question.type]}</span><div class="question-word${displayClass}">${escapeHtml(session.answered ? word.word : question.display)}</div><div class="question-phonetic">${escapeHtml(session.answered ? word.phonetic : question.phonetic)}</div>${session.answered ? `<div class="answer-reveal"><strong>${escapeHtml(word.core)}</strong><span>${escapeHtml(word.meaning)}</span>${evidenceLine ? `<p class="answer-evidence">${escapeHtml(evidenceLine)}</p>` : ""}${exampleLine ? `<p class="answer-example">${escapeHtml(exampleLine)}</p>` : ""}${feedback.correct ? "" : `<div class="memory-hook"><small>${escapeHtml(memoryHookKind(word))}</small><p>${escapeHtml(memoryHook(word))}</p></div>`}</div>` : `<p class="question-prompt">${escapeHtml(visiblePrompt)}</p>`}</article></div>
      <div class="answer-area">${answerArea}</div>
    </div></div>`;
  }

  function renderDetail() {
    if (!state.detailId) return "";
    const word = WORD_BY_ID.get(state.detailId);
    if (!word) return "";
    const progress = getProgress(word.id);
    const profile = wordProfile(word);
    const relevantTypes = typesForWord(word);
    const content = learningContent(word);
    const dynamicConfusionIds = Object.entries(progress.dynamicConfusions || {})
      .sort(([, left], [, right]) => (right.count || 0) - (left.count || 0))
      .map(([id]) => Number(id));
    const confusionItems = [
      ...dynamicConfusionIds.map((id) => WORD_BY_ID.get(id)),
      ...word.confusions.map((name) => WORDS.find((candidate) => candidate.word === name)),
    ].filter(Boolean).filter((candidate, index, list) => list.findIndex((item) => item.id === candidate.id) === index)
      .map((candidate) => ({ name: candidate.word, core: candidate.core }));
    return `<div class="modal-backdrop" data-action="close-detail"><article class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(word.word)} 详情" data-stop>
      <div class="modal-head"><div><div class="word-index">NO. ${String(word.id).padStart(4, "0")} · ${STATUS_LABELS[progress.status]}</div><h2 class="detail-word">${escapeHtml(word.word)}</h2><div class="detail-phonetic">${escapeHtml(word.phonetic)}</div></div><button class="icon-button" data-action="close-detail" aria-label="关闭">${icon("close", 18)}</button></div>
      <div class="profile-switch"><button class="${profile === "reading" ? "active" : ""}" data-action="set-profile" data-profile="reading" data-id="${word.id}"><strong>阅读词</strong><span>看懂即可 · 免默写</span></button><button class="${profile === "writing" ? "active" : ""}" data-action="set-profile" data-profile="writing" data-id="${word.id}"><strong>写作词</strong><span>会用 · 会拼写</span></button></div>
      <div class="detail-core"><small>核心义</small><strong>${escapeHtml(word.core)}</strong></div>
      <div class="detail-memory"><small>${escapeHtml(memoryHookKind(word))}</small><p>${escapeHtml(memoryHook(word))}</p></div>
      <div class="sense-list">${word.senses.map((sense) => `<div class="sense-item"><span class="sense-pos">${escapeHtml(sense.pos || "释义")}</span>${escapeHtml(sense.text)}</div>`).join("")}</div>
      ${content.definition.length || content.examples.length ? `<div class="detail-usage"><small>真实语境证据</small>${content.definition.slice(0, 2).map((definition) => `<p><b>释义</b>${escapeHtml(definition)}</p>`).join("")}${content.examples.slice(0, 2).map((example) => `<p><b>例句</b>${escapeHtml(example)}</p>`).join("")}</div>` : ""}
      ${confusionItems.length ? `<div class="detail-core confusion-core"><small>易混词</small><div class="confusion-list">${confusionItems.map((item) => `<span><strong>${escapeHtml(item.name)}</strong><em>${escapeHtml(item.core)}</em></span>`).join("")}</div></div>` : ""}
      <div class="fingerprint">${relevantTypes.map((type) => `<div class="fingerprint-item"><strong>${Math.round(evidenceScore(progress.evidence[type], type) * 100)}%</strong><span>${TYPE_SHORT[type]}</span></div>`).join("")}</div>
      <div class="schedule-evidence"><span><small>预计保持率</small><strong>${Math.round(retentionAt(progress) * 100)}%</strong></span><span><small>记忆稳定期</small><strong>${progress.stabilityHours >= 24 ? `${Math.round(progress.stabilityHours / 24)} 天` : `${Math.round(progress.stabilityHours * 10) / 10} 小时`}</strong></span><span><small>下次复习</small><strong>${formatDueAt(progress.due)}</strong></span><span><small>遗忘次数</small><strong>${progress.lapses}</strong></span></div>
      <div class="modal-actions"><button class="secondary-button" data-action="start-session" data-mode="word" data-id="${word.id}">${icon("target", 17)} 针对训练</button><button class="ghost-button" data-action="speak" data-word="${escapeHtml(word.word)}">${icon("volume", 17)} 朗读</button></div>
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
      version: 2,
      engineVersion: ENGINE_VERSION,
      exportedAt: new Date().toISOString(),
      vocabularyCount: WORDS.length,
      settings: state.settings,
      profiles: [...state.profiles.entries()],
      progress: [...state.progress.values()],
      events: state.events,
      sessions: {
        mainline: state.mainlineSession,
        side: state.sideSession,
      },
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
      const progressRows = payload.progress
        .filter((progress) => progress && WORD_BY_ID.has(Number(progress.id)))
        .map((progress) => normalizeProgress({ ...progress, id: Number(progress.id) }));
      const eventRows = (Array.isArray(payload.events) ? payload.events : [])
        .filter((event) => WORD_BY_ID.has(Number(event.id)) && Number.isFinite(Number(event.ts)))
        .slice(-MAX_EVENTS)
        .map((event) => ({ ...event, id: Number(event.id), ts: Number(event.ts) }));
      const settings = { ...DEFAULT_SETTINGS, ...(payload.settings || {}) };
      settings.dailyNew = Math.max(1, Math.floor(Number(settings.dailyNew) || DEFAULT_SETTINGS.dailyNew));
      settings.sessionSize = Math.max(1, Math.floor(Number(settings.sessionSize) || DEFAULT_SETTINGS.sessionSize));
      settings.autoAudio = true;
      const profiles = Array.isArray(payload.profiles)
        ? payload.profiles.filter(([id, profile]) => WORD_BY_ID.has(Number(id)) && ["reading", "writing"].includes(profile))
          .map(([id, profile]) => [Number(id), profile])
        : [];
      const validSession = (session) => session && Array.isArray(session.questions)
        && session.questions.every((question) => WORD_BY_ID.has(Number(question.wordId)));
      const mainline = validSession(payload.sessions?.mainline) && !payload.sessions.mainline.finished
        ? payload.sessions.mainline
        : null;
      const side = validSession(payload.sessions?.side) && !payload.sessions.side.finished
        ? payload.sessions.side
        : null;
      await replaceAllData(progressRows, eventRows, [
        { key: "settings", value: settings },
        { key: "profiles", value: profiles },
        { key: "activeSession", value: null },
        { key: "mainlineSession", value: mainline },
        { key: "sideSession", value: side },
      ]);
      state.progress = new Map(progressRows.map((progress) => [progress.id, progress]));
      state.events = eventRows;
      state.settings = settings;
      state.profiles = new Map(profiles);
      state.session = null;
      state.pausedSession = side;
      state.mainlineSession = mainline;
      state.sideSession = side;
      writeRecoverySnapshot();
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
    state.session = null;
    state.pausedSession = null;
    state.mainlineSession = null;
    state.sideSession = null;
    await put("meta", { key: "activeSession", value: null });
    await put("meta", { key: "mainlineSession", value: null });
    await put("meta", { key: "sideSession", value: null });
    try { window.localStorage?.removeItem(RECOVERY_KEY); } catch (_error) {}
    render();
    showToast("学习进度已清空");
  }

  function installedAppMode() {
    return navigator.standalone === true
      || window.matchMedia?.("(display-mode: fullscreen)").matches
      || window.matchMedia?.("(display-mode: standalone)").matches;
  }

  function requestImmersiveFullscreen() {
    if (!installedAppMode() || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    const request = document.documentElement.requestFullscreen({ navigationUI: "hide" });
    request?.catch(() => {});
  }

  function requestPersistentStorage() {
    if (persistenceRequested || !navigator.storage?.persist) return;
    persistenceRequested = true;
    navigator.storage.persisted?.().then((persisted) => {
      if (!persisted) navigator.storage.persist().catch(() => {});
    }).catch(() => {});
  }

  root.addEventListener("click", async (event) => {
    requestImmersiveFullscreen();
    requestPersistentStorage();
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
    } else if (action === "resume-session") {
      state.detailId = null;
      resumeSession(target.dataset.mode || "");
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
      writeRecoverySnapshot();
      render();
    } else if (action === "answer-option") {
      await submitAnswer(target.dataset.value);
    } else if (action === "reveal-options") {
      if (state.session && !state.session.answered) {
        state.session.optionRevealed = true;
        saveSession(true);
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
      await reconcileMainlineTarget();
      writeRecoverySnapshot();
      showToast(`每日词量已设为 ${state.settings.dailyNew}`);
    }
    if (event.target.matches('[data-role="session-size"]')) {
      state.settings.sessionSize = Math.max(1, Math.floor(Number(event.target.value) || 30));
      await put("meta", { key: "settings", value: state.settings });
      writeRecoverySnapshot();
      showToast(`专项每轮已设为 ${state.settings.sessionSize}`);
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

  document.addEventListener?.("visibilitychange", () => {
    if (document.visibilityState === "hidden" && state.session) saveSession(true);
  });

  async function boot() {
    if (WORDS.length !== 1800) {
      root.innerHTML = '<div class="empty-state">词库载入失败</div>';
      return;
    }
    try {
      await loadState();
      const requestedPage = new URLSearchParams(location.search || "").get("page");
      if (["today", "library", "weak", "data"].includes(requestedPage)) state.page = requestedPage;
      render();
      if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
        const register = () => {
          const hadController = Boolean(navigator.serviceWorker.controller);
          let reloading = false;
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!hadController || reloading) return;
            reloading = true;
            location.reload();
          });
          navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then((registration) => registration.update())
            .catch(() => {});
        };
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
