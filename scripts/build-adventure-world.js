const fs = require("fs");
const path = require("path");

global.window = {};
require(path.join(__dirname, "../data/words.js"));
require(path.join(__dirname, "../data/adventure.js"));

const words = window.VOCABULARY;
const ARC_SEEDS = [
  {
    title: "北境疫雾", english: "Mist of the North", subtitle: "灰牧场的公告",
    faction: "北境市政厅", artifact: "赤封公告", cast: ["米拉", "商人艾德里安", "伊利安队长"],
    episodeTitles: ["北境公告", "无声礼堂", "污染地窖", "墓园来信", "钟楼审判"],
    locations: ["北境牧场", "东城门", "排水坡", "旧谷仓", "市集广场", "市政议事厅"],
    beats: [
      "河水变黑，米拉从一张被删改的公告开始追查。",
      "救济演说遭人篡改，失窃名单指向市政高层。",
      "地窖水网暴露了人为投毒和活体寄生实验。",
      "墓园里出现写给死者的信，证人名单因此复活。",
      "钟楼审判揭开北境议会掩盖瘟疫的真正代价。",
    ],
  },
  {
    title: "港城暗潮", english: "Undertow of the Harbor", subtitle: "潮汐掩住每一份证词",
    faction: "雾港海关", artifact: "潮汐罗盘", cast: ["米拉", "商人艾德里安", "领航员赛琳"],
    episodeTitles: ["雾港商人", "失踪货单", "海关之夜", "沉船证词", "灯塔共识"],
    locations: ["雾港", "海关码头", "盐仓", "沉没拱廊", "防波堤", "旧灯塔"],
    beats: [
      "一批不存在的货物抵达雾港，收货人却是已经死去的商人。",
      "失踪货单把港口、议会和北境药品连成同一条走私线。",
      "海关封锁全城，米拉必须在涨潮前取得原始航海记录。",
      "沉船幸存者的证词互相矛盾，海底货舱藏着唯一真相。",
      "灯塔下的三方谈判决定港城是否公开整条污染航线。",
    ],
  },
  {
    title: "玻璃议会", english: "The Glass Council", subtitle: "真相必须经受审视",
    faction: "王都审议院", artifact: "透明徽章", cast: ["米拉", "凯尔律师", "沃斯议员"],
    episodeTitles: ["破碎徽章", "律师与王冠", "公开审视", "伪善者", "最后标准"],
    locations: ["玻璃中庭", "王都法庭", "证据长廊", "议会档案馆", "公共论坛", "标准大厅"],
    beats: [
      "一枚破碎徽章把调查带进以透明自居的玻璃议会。",
      "律师凯尔必须在忠于王冠和保护证人之间作出选择。",
      "所有证据接受公开审视，但最关键的一页被合法删除。",
      "口头仁慈的议员被揭露长期资助北境实验。",
      "最终标准不是法律条文，而是谁愿意承担公开真相的后果。",
    ],
  },
  {
    title: "荒原迁徙", english: "Exodus of the Wastes", subtitle: "饥荒迫使人们离开故土",
    faction: "迁徙者营地", artifact: "归乡契约", cast: ["米拉", "朝圣者伊沃", "塞拉守卫"],
    episodeTitles: ["干旱", "朝圣者", "无主小屋", "部落边界", "归乡契约"],
    locations: ["干涸盆地", "朝圣者之路", "无主小屋", "部落边界", "饥荒营地", "归乡山脊"],
    beats: [
      "干旱吞没南部粮仓，迁徙者被迫穿越没有地图的荒原。",
      "朝圣者伊沃掌握一条水路，却拒绝说明它的代价。",
      "无主小屋里的账本证明饥荒并非完全来自天灾。",
      "两个部落在边界对峙，旧仇被幕后势力刻意放大。",
      "归乡契约让流亡者获得土地，也暴露王都新的控制方式。",
    ],
  },
  {
    title: "钢铁之城", english: "City of Iron", subtitle: "机器轰鸣，旧秩序松动",
    faction: "钢城工匠行会", artifact: "第一齿轮", cast: ["米拉", "木工塔林", "布兰工头"],
    episodeTitles: ["齿轮街", "工匠行会", "地下罢工", "炉火宣言", "钢城黎明"],
    locations: ["齿轮街", "行会工坊", "下层铸造厂", "罢工隧道", "炉火法庭", "钢铁尖塔"],
    beats: [
      "齿轮街的机器同时停摆，事故时间精确得不像偶然。",
      "工匠行会分裂为保护工人和维护订单的两派。",
      "地下罢工发现工厂正在制造并不存在于账目的装置。",
      "炉火宣言迫使每个人选择服从、谈判或彻底摧毁生产线。",
      "钢城黎明到来时，第一台机器开始由工人共同管理。",
    ],
  },
  {
    title: "群岛风暴", english: "Tempest Isles", subtitle: "海盗、舰队与一份密令",
    faction: "群岛自由舰队", artifact: "黑帆密令", cast: ["米拉", "海盗鲁克", "莱拉上将"],
    episodeTitles: ["黑帆", "珊瑚航道", "俘虏", "风暴眼", "群岛停战"],
    locations: ["黑帆湾", "珊瑚航道", "囚船甲板", "风暴水道", "舰队锚地", "停战岛"],
    beats: [
      "黑帆海盗劫走王都密令，却主动把一半交给米拉。",
      "珊瑚航道中的沉船标记揭示舰队在秘密运输实验材料。",
      "双方俘虏提供相反版本的战争起因，只有航海日志没有立场。",
      "风暴眼里，两支舰队必须暂时合作才能活着离开。",
      "群岛停战建立在公开密令之上，也让真正的幕后舰队现身。",
    ],
  },
  {
    title: "静默学院", english: "The Silent Academy", subtitle: "知识从来不是中立的",
    faction: "静默学院", artifact: "禁书索引", cast: ["米拉", "奥林院长", "学者奈尔"],
    episodeTitles: ["旧礼堂", "院长档案", "禁书目录", "学说之争", "毕业演说"],
    locations: ["旧礼堂", "院长档案馆", "禁书书架", "学说法庭", "静默实验室", "毕业大厅"],
    beats: [
      "旧礼堂重新响起一段被删除的毕业演说。",
      "院长档案显示学院早已知道污染会跨地区传播。",
      "禁书目录不是为了隐藏危险知识，而是隐藏知识的资助者。",
      "学说之争从课堂延伸到街头，证据被不同阵营重新解释。",
      "毕业演说公开学院罪责，学生决定知识今后属于谁。",
    ],
  },
  {
    title: "赤色荒漠", english: "The Red Desert", subtitle: "每一滴水都有代价",
    faction: "赤沙商队", artifact: "地下泉图", cast: ["米拉", "商人纳西尔", "制图师蕾娅"],
    episodeTitles: ["沙丘商队", "地下泉", "边境法令", "叛徒地图", "绿洲回声"],
    locations: ["赤色沙丘", "商队环营", "地下泉", "边境要塞", "制图师帐篷", "回声绿洲"],
    beats: [
      "沙丘商队运送的不是黄金，而是被各城争夺的净水样本。",
      "地下泉的流向与官方地图完全相反，说明边境被人为制造。",
      "边境法令把取水变成犯罪，引发营地内部冲突。",
      "叛徒地图标记了每处秘密水源，也标记了制图者的家人。",
      "绿洲回声证明水路连接所有旧案，终局之门开始显形。",
    ],
  },
  {
    title: "王都裂痕", english: "Fracture of the Capital", subtitle: "尊严与权力不能同时沉默",
    faction: "王都公民议庭", artifact: "公开证词", cast: ["米拉", "凯尔律师", "艾拉公主"],
    episodeTitles: ["市政大厅", "人口普查", "腐败证据", "公开辩论", "王都裁决"],
    locations: ["市政大厅", "人口普查处", "腐败档案馆", "王家大道", "辩论论坛", "王都裁判庭"],
    beats: [
      "王都市政大厅拒绝承认来自十二地区的共同证据。",
      "人口普查中消失的名字与所有实验受害者一一对应。",
      "腐败证据指向王室内部，但公开它可能让王都立刻陷入混乱。",
      "公开辩论让每个阵营都必须用证据而非口号回答。",
      "王都裁决否定旧王令，公民第一次拥有追问权力。",
    ],
  },
  {
    title: "冰原信标", english: "Beacon of the Icefield", subtitle: "在漫长黑夜里辨认方向",
    faction: "极北巡逻队", artifact: "白夜信标", cast: ["米拉", "伊利安队长", "斥候阿莎"],
    episodeTitles: ["冻土营地", "失联巡逻", "白色威胁", "信标密码", "极昼归来"],
    locations: ["冻土营地", "失联巡逻线", "白色峡谷", "信标密室", "极地站", "午夜山脊"],
    beats: [
      "冻土营地收到来自不存在巡逻队的求救信号。",
      "失联巡逻留下的脚印朝两个方向延伸，内部出现伪装者。",
      "白色威胁不是风雪，而是能抹除记录的实验装置。",
      "信标密码需要过去十篇旅程中的线索共同解开。",
      "极昼归来照亮冰层下的古老运输网，也照亮最终入口。",
    ],
  },
  {
    title: "深林回声", english: "Echoes of the Deepwood", subtitle: "森林记住所有被遗弃的名字",
    faction: "深林守望者", artifact: "林地盟约", cast: ["米拉", "朝圣者伊沃", "游侠维拉"],
    episodeTitles: ["猎人小径", "寄生之森", "古老教义", "兽群迁移", "林地盟约"],
    locations: ["猎人小径", "寄生林地", "教义遗迹", "兽群山谷", "古老树冠", "盟约之树"],
    beats: [
      "猎人小径上的路标使用了受害者名单中的名字。",
      "寄生之森证明北境实验曾在更早的年代发生。",
      "古老教义被后人篡改，用来合理化对森林和部落的占有。",
      "兽群迁移迫使敌对阵营共同保护唯一通道。",
      "林地盟约恢复被删除的历史，为终局提供最后证人。",
    ],
  },
  {
    title: "终局：零之门", english: "Finale: Gate Zero", subtitle: "所有相遇都会在这里回来",
    faction: "十二地联合调查团", artifact: "零之钥", cast: ["米拉", "商人艾德里安", "档案员"],
    episodeTitles: ["宿敌集结", "记忆迷宫", "六十封信", "最后辨认", "零之门"],
    locations: ["宿敌法庭", "记忆迷宫", "六十封信大厅", "最后辨认之门", "零号档案馆", "零之门"],
    beats: [
      "所有未真正掌握的宿敌词在入口前重新出现。",
      "记忆迷宫会利用错误理解改变道路，熟悉感不再足够。",
      "六十封信由过去所有角色写成，拼出档案员的真实身份。",
      "最后辨认要求米拉区分事实、翻译、推断与被制造的记忆。",
      "零之门打开后，十二地共同决定档案永远不能再被一人控制。",
    ],
  },
];

const SCENE_CLASSES = ["pasture", "gate", "cabin", "barn", "square", "council", "workshop", "auditorium", "backstage", "gallery", "kitchen", "roof", "cellar", "laboratory", "meadow", "vault", "raid"];
const SCENE_LABELS = ["抵达", "搜证", "交涉", "潜入", "推理", "抉择"];
function getWord(id) {
  return words[id - 1];
}

function phrase(word, variant = 0) {
  const token = `[[${word.word}]]`;
  if (word.pos === "n") return [
    `一件标注为“${token}”的证物`,
    `一份围绕 ${token} 展开的记录`,
    `证人口中反复提到的 ${token}`,
  ][variant % 3];
  if (/^v/.test(word.pos)) return [
    `一道要求众人执行 ${token} 的指令`,
    `一项必须 ${token} 才能完成的行动`,
    `嫌疑人试图 ${token} 的痕迹`,
  ][variant % 3];
  if (word.pos === "adj") return [
    `一名被描述为 ${token} 的证人`,
    `一种被记录成 ${token} 的状态`,
    `一道显得异常 ${token} 的痕迹`,
  ][variant % 3];
  if (word.pos === "adv") return `一条要求以 ${token} 的方式行动的批注`;
  return `档案里被单独圈出的词“${token}”`;
}

function joinPhrases(list) {
  if (list.length <= 1) return list[0] || "缺失的证据";
  if (list.length === 2) return `${list[0]}和${list[1]}`;
  return `${list.slice(0, -1).join("、")}以及${list.at(-1)}`;
}

function distractorsFor(word, count = 4) {
  const same = words.filter((candidate) => candidate.id !== word.id && candidate.pos === word.pos && candidate.core !== word.core);
  const pool = same.length >= count ? same : words.filter((candidate) => candidate.id !== word.id && candidate.core !== word.core);
  const result = [];
  const start = (word.id * 41 + word.word.length * 13) % pool.length;
  for (let offset = 0; result.length < count && offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset * 97) % pool.length];
    if (!result.some((item) => item.id === candidate.id)) result.push(candidate);
  }
  return result;
}

function choicesFor(target, next, gainItem, successText) {
  const candidates = [target, ...distractorsFor(target, 4)].sort((a, b) => ((a.id * 29) % 101) - ((b.id * 29) % 101));
  return [
    ...candidates.map((candidate) => ({
      label: candidate.word,
      correct: candidate.id === target.id,
      testWord: target.id,
      next: candidate.id === target.id ? next : undefined,
      outcome: candidate.id === target.id
        ? successText
        : `${candidate.word} 指向“${candidate.core}”，与当前线索不符。`,
      gainItem: candidate.id === target.id ? gainItem : undefined,
    })),
    {
      label: "暂时无法判断",
      correct: false,
      testWord: target.id,
      outcome: `线索需要的是“${target.core}”。先记下证据，再判断一次。`,
    },
  ];
}

function reviewIdsFor(episode, sceneIndex) {
  const ids = [];
  if (episode > 1) ids.push((episode - 2) * 30 + sceneIndex * 5 + ((sceneIndex + episode) % 5) + 1);
  if (episode > 5) ids.push((episode - 6) * 30 + sceneIndex * 5 + ((sceneIndex + 2) % 5) + 1);
  return ids.filter((id) => id >= 1 && id <= 1800);
}

function makeMainNode(episode, sceneIndex, chapter, arc) {
  const firstId = (episode - 1) * 30 + sceneIndex * 5 + 1;
  const targetWords = Array.from({ length: 5 }, (_, index) => getWord(firstId + index));
  const reviews = reviewIdsFor(episode, sceneIndex).map(getWord);
  const target = targetWords[(episode + sceneIndex * 2) % 5];
  const next = sceneIndex === 5 ? "complete" : `c${episode}-${sceneIndex + 2}`;
  const gainItem = sceneIndex === 2 ? `${chapter.title} · 关键证物` : sceneIndex === 5 ? arc.artifact : undefined;
  const speaker = arc.cast[(episode + sceneIndex) % arc.cast.length];
  const sceneNarratives = [
    `米拉抵达 ${arc.locations[sceneIndex]} 时，周围没有任何人欢迎她。${chapter.summary}眼前的安静更像有人提前清理过现场。`,
    `调查进入第二阶段。米拉没有立刻追赶离开的身影，而是逐项核对被故意留在 ${arc.locations[sceneIndex]} 的证据。`,
    `${speaker}终于同意开口，但要求米拉先证明自己已经看懂前一处现场。谈话中的每一次停顿，都像在回避一个不能被写进记录的名字。`,
    `夜色盖住 ${arc.locations[sceneIndex]} 后，米拉沿维护通道潜入封锁区。这里保存的并不是普通物品，而是能够改变整章调查方向的原始记录。`,
    `所有零散线索在这一刻被重新摆上桌面。米拉必须区分哪些是事实，哪些只是熟悉感造成的错误联想。`,
    `最后一道门前没有守卫。真正阻止米拉前进的，是一份要求她亲自作出判断的档案；一旦选择，${chapter.title}就会留下无法撤回的结论。`,
  ];
  const lines = [
    sceneNarratives[sceneIndex],
    `现场首先出现了${joinPhrases(targetWords.slice(0, 2).map((word, index) => phrase(word, sceneIndex + index)))}。它们看似无关，却共享同一枚被刮去的编号。`,
    `${speaker}随后补充了${joinPhrases(targetWords.slice(2).map((word, index) => phrase(word, episode + index)))}。米拉把这些内容写进本节档案，没有立刻给出结论。`,
  ];
  if (reviews.length) lines.push(`临近本节结束时，旧案中的${joinPhrases(reviews.map((word, index) => phrase(word, index + 1)))}再次出现。过去认识过的词，必须在新的情境里仍然能够被认出。`);
  return {
    id: `c${episode}-${sceneIndex + 1}`,
    scene: SCENE_CLASSES[(episode + sceneIndex) % SCENE_CLASSES.length],
    sceneLabel: SCENE_LABELS[sceneIndex],
    location: arc.locations[sceneIndex],
    speaker,
    mood: `${chapter.title} · ${SCENE_LABELS[sceneIndex]}`,
    lines,
    wordIds: [...targetWords.map((word) => word.id), ...reviews.map((word) => word.id)],
    newWordIds: targetWords.map((word) => word.id),
    reviewWordIds: reviews.map((word) => word.id),
    prompt: `读完本节后，米拉需要找出能够表达“${target.core}”的词。哪一项与刚才的情境一致？`,
    quest: `${SCENE_LABELS[sceneIndex]} · 找出与“${target.core}”对应的行动或线索`,
    choices: choicesFor(target, next, gainItem, sceneIndex === 5 ? `${chapter.title}的核心证据已经闭合。` : `路线确认，调查转向${arc.locations[Math.min(5, sceneIndex + 1)]}。`),
  };
}

function sideWordIds(episode, eventIndex, nodeIndex) {
  const start = (episode - 1) * 30;
  const localBase = eventIndex === 0 ? nodeIndex * 5 : 20 + nodeIndex * 5;
  const local = Array.from({ length: 5 }, (_, index) => start + ((localBase + index) % 30) + 1);
  if (episode > 1) local.push((episode - 2) * 30 + eventIndex * 10 + nodeIndex * 5 + 1);
  if (episode > 5) local.push((episode - 6) * 30 + eventIndex * 10 + nodeIndex * 5 + 2);
  return [...new Set(local)].filter((id) => id >= 1 && id <= 1800);
}

function makeSideEvent(episode, eventIndex, chapter, arc) {
  const suffix = eventIndex === 0 ? "a" : "b";
  const title = eventIndex === 0 ? `${chapter.title} · 遗失档案` : `${chapter.title} · 夜间回声`;
  const reward = eventIndex === 0 ? `${chapter.title}证词残页` : `${chapter.title}巡夜徽记`;
  const nodes = [0, 1].map((nodeIndex) => {
    const ids = sideWordIds(episode, eventIndex, nodeIndex);
    const selectedWords = ids.slice(0, 5).map(getWord);
    const reviews = ids.slice(5).map(getWord);
    const target = selectedWords[(episode + eventIndex + nodeIndex) % selectedWords.length];
    const next = nodeIndex === 1 ? "complete" : `s${episode}${suffix}-2`;
    const lines = [
      `${arc.cast[(episode + nodeIndex + 1) % arc.cast.length]}在主线调查结束后叫住了米拉。这条线索不会改变公开结论，却能解释某些证物为何会出现在错误的位置。`,
      `支线档案重新提到了${joinPhrases(selectedWords.slice(0, 2).map((word, index) => phrase(word, index + eventIndex)))}。米拉发现，同一个词在不同人物口中可能指向完全不同的情境。`,
      `继续追查后，她又找到${joinPhrases(selectedWords.slice(2).map((word, index) => phrase(word, index + nodeIndex)))}。这些内容被单独装订，等待本节末尾统一复核。`,
    ];
    if (reviews.length) lines.push(`一份延迟送达的旧报告还带回了${joinPhrases(reviews.map((word) => phrase(word, 2)))}。它们已经不是首次出现，翻译提示也不会永远保留。`);
    return {
      id: `s${episode}${suffix}-${nodeIndex + 1}`,
      scene: SCENE_CLASSES[(episode + eventIndex * 4 + nodeIndex + 7) % SCENE_CLASSES.length],
      sceneLabel: nodeIndex === 0 ? "支线搜证" : "支线结论",
      location: arc.locations[(eventIndex * 3 + nodeIndex + 1) % arc.locations.length],
      speaker: arc.cast[(episode + nodeIndex + 1) % arc.cast.length],
      mood: eventIndex === 0 ? "被遗漏的证词仍在等待一个愿意读完它的人。" : "夜色让旧线索以不同的方式重新出现。",
      lines,
      wordIds: ids,
      newWordIds: [],
      reviewWordIds: ids,
      prompt: `本节支线结束前，需要用一个词概括“${target.core}”。根据刚才的正文选择正确记录。`,
      quest: `${title} · ${nodeIndex === 0 ? "找回线索" : "完成复核"}`,
      choices: choicesFor(target, next, nodeIndex === 1 ? reward : undefined, nodeIndex === 1 ? `${title}已经完成。` : "残页指向了下一处夜间线索。"),
    };
  });
  return {
    id: `side-${episode}-${suffix}`,
    chapterId: chapter.id,
    episode,
    title,
    subtitle: eventIndex === 0 ? "遗失档案" : "夜间回声",
    summary: eventIndex === 0 ? "追回主线中被遗漏的证词，并让本章词汇在新语境中再次出现。" : "沿夜间路线复核旧线索，触发跨章延迟重现。",
    reward,
    startNode: nodes[0].id,
    nodes,
  };
}

const arcs = ARC_SEEDS.map((seed, arcIndex) => ({
  id: `arc-${arcIndex + 1}`,
  number: arcIndex + 1,
  title: seed.title,
  english: seed.english,
  subtitle: seed.subtitle,
  faction: seed.faction,
  artifact: seed.artifact,
  cast: seed.cast,
  locations: seed.locations,
  episodeTitles: seed.episodeTitles,
  startWordId: arcIndex * 150 + 1,
  endWordId: (arcIndex + 1) * 150,
}));

const episodes = [];
const chapters = [];

for (let episode = 1; episode <= 60; episode += 1) {
  const arcIndex = Math.floor((episode - 1) / 5);
  const localIndex = (episode - 1) % 5;
  const arc = ARC_SEEDS[arcIndex];
  const title = arc.episodeTitles[localIndex];
  const chapter = {
    id: `chapter-${episode}`,
    arcId: `arc-${arcIndex + 1}`,
    episode,
    title,
    subtitle: `${arc.title} · 第 ${localIndex + 1} 份档案`,
    summary: arc.beats[localIndex],
    quest: `追查“${title}”并取得${arc.artifact}的第 ${localIndex + 1} 段线索。`,
    reward: localIndex === 4 ? arc.artifact : `${title}档案章`,
    startNode: `c${episode}-1`,
  };
  chapter.sideEvents = [0, 1].map((eventIndex) => makeSideEvent(episode, eventIndex, chapter, arc));
  chapter.nodes = Array.from({ length: 6 }, (_, sceneIndex) => makeMainNode(episode, sceneIndex, chapter, arc));
  chapters.push(chapter);
  episodes.push({
    id: `episode-${episode}`,
    number: episode,
    arcId: chapter.arcId,
    title,
    subtitle: chapter.subtitle,
    summary: chapter.summary,
    startWordId: (episode - 1) * 30 + 1,
    endWordId: episode * 30,
    playable: true,
  });
}

const wordPlans = [null];
const nemesisEvents = [null];
for (const word of words) {
  const episode = Math.floor((word.id - 1) / 30) + 1;
  const scene = Math.floor(((word.id - 1) % 30) / 5) + 1;
  const reinforcementEpisode = Math.min(60, episode + 1);
  const delayedEpisode = Math.min(60, episode + 5);
  const returnEpisode = Math.min(60, episode + 10);
  wordPlans[word.id] = {
    wordId: word.id,
    arc: Math.floor((word.id - 1) / 150) + 1,
    episode,
    scene,
    reinforcementEpisode,
    delayedEpisode,
    returnEpisode,
    encounters: [
      { kind: "main", episode, scene, role: "首次登场" },
      { kind: "side", episode, event: word.id % 2 ? "遗失档案" : "夜间回声", role: "情境强化" },
      { kind: "main", episode: reinforcementEpisode, scene: ((scene + 1) % 6) + 1, role: "短期复现" },
      { kind: "side", episode: delayedEpisode, event: "夜间回声", role: "延迟复现" },
      { kind: "main", episode: returnEpisode, scene: ((scene + 3) % 6) + 1, role: "跨篇回归" },
      { kind: "nemesis", episode: 60, role: "宿敌验证" },
    ],
  };
  const arc = ARC_SEEDS[Math.floor((word.id - 1) / 150)];
  nemesisEvents[word.id] = {
    wordId: word.id,
    title: `${word.word} · 记忆宿敌`,
    location: arc.locations[(word.id + 3) % arc.locations.length],
    text: `档案把一路上与 ${phrase(word, word.id)} 有关的错误全部重新拼合。只有在没有固定翻译提示时仍能认出它，才算真正击败这名宿敌。`,
    cue: word.core,
    reward: `${word.word} 宿敌印记`,
  };
}

const characters = [...new Set(ARC_SEEDS.flatMap((arc) => arc.cast))].map((name, index) => ({
  id: `character-${index + 1}`,
  name,
  firstArc: ARC_SEEDS.findIndex((arc) => arc.cast.includes(name)) + 1,
  role: name.includes("米拉") ? "调查者与固定同伴" : name.includes("艾德里安") ? "北境商人与长期伙伴" : "地区关键人物",
}));

const stats = {
  arcs: 12,
  chapters: 60,
  mainScenes: 360,
  sideEvents: 120,
  sideScenes: 240,
  totalScenes: 600,
  plannedWords: 1800,
};

const partsDirectory = path.join(__dirname, "../data/adventure-world-parts");
fs.mkdirSync(partsDirectory, { recursive: true });
for (let arcIndex = 0; arcIndex < arcs.length; arcIndex += 1) {
  const arcNumber = arcIndex + 1;
  const firstWordId = arcIndex * 150 + 1;
  const lastWordId = firstWordId + 149;
  const part = {
    arc: arcs[arcIndex],
    episodes: episodes.filter((episode) => episode.arcId === `arc-${arcNumber}`),
    chapters: chapters.filter((chapter) => chapter.arcId === `arc-${arcNumber}`),
    wordPlans: wordPlans.slice(firstWordId, lastWordId + 1),
    nemesisEvents: nemesisEvents.slice(firstWordId, lastWordId + 1),
  };
  const filename = `arc-${String(arcNumber).padStart(2, "0")}.js`;
  const partOutput = `(function(){\nwindow.CIZHAN_WORLD_PARTS=window.CIZHAN_WORLD_PARTS||[];\nwindow.CIZHAN_WORLD_PARTS.push(${JSON.stringify(part)});\n})();\n`;
  fs.writeFileSync(path.join(partsDirectory, filename), partOutput);
}

const output = `(function(){
"use strict";
const BASE=window.CIZHAN_ADVENTURE;
const parts=window.CIZHAN_WORLD_PARTS||[];
const arcs=parts.map((part)=>part.arc);
const episodes=parts.flatMap((part)=>part.episodes);
const chapters=parts.flatMap((part)=>part.chapters);
const wordPlans=[null];
const nemesisEvents=[null];
parts.forEach((part)=>{
 part.wordPlans.forEach((plan)=>{wordPlans[plan.wordId]=plan;});
 part.nemesisEvents.forEach((event)=>{nemesisEvents[event.wordId]=event;});
});
const sideEvents=chapters.flatMap((chapter)=>chapter.sideEvents||[]);
const nodeById=Object.fromEntries(chapters.flatMap((chapter)=>[...(chapter.nodes||[]),...(chapter.sideEvents||[]).flatMap((event)=>event.nodes||[])].map((node)=>[node.id,node])));
window.CIZHAN_ADVENTURE=Object.assign({},BASE,{arcs,episodes,chapters,chapterById:Object.fromEntries(chapters.map((chapter)=>[chapter.id,chapter])),nodeById,sideEvents,sideById:Object.fromEntries(sideEvents.map((event)=>[event.id,event])),characters:${JSON.stringify(characters, null, 1)},wordPlans,nemesisEvents,stats:${JSON.stringify(stats)},wordPlan(id){return wordPlans[id]||{};}});
delete window.CIZHAN_WORLD_PARTS;
})();
`;

fs.writeFileSync(path.join(__dirname, "../data/adventure-world.js"), output);
console.log(JSON.stringify(stats));
