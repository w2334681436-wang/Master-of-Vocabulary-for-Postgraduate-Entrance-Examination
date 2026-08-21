(function () {
  "use strict";

  const arcs = [
    ["北境疫雾", "灰牧场的公告", ["北境公告", "无声礼堂", "污染地窖", "墓园来信", "钟楼审判"]],
    ["港城暗潮", "潮汐掩住每一份证词", ["雾港商人", "失踪货单", "海关之夜", "沉船证词", "灯塔共识"]],
    ["玻璃议会", "真相必须经受审视", ["破碎徽章", "律师与王冠", "公开审视", "伪善者", "最后标准"]],
    ["荒原迁徙", "饥荒迫使人们离开故土", ["干旱", "朝圣者", "无主小屋", "部落边界", "归乡契约"]],
    ["钢铁之城", "机器轰鸣，旧秩序松动", ["齿轮街", "工匠行会", "地下罢工", "炉火宣言", "钢城黎明"]],
    ["群岛风暴", "海盗、舰队与一份密令", ["黑帆", "珊瑚航道", "俘虏", "风暴眼", "群岛停战"]],
    ["静默学院", "知识从来不是中立的", ["旧礼堂", "院长档案", "禁书目录", "学说之争", "毕业演说"]],
    ["赤色荒漠", "每一滴水都有代价", ["沙丘商队", "地下泉", "边境法令", "叛徒地图", "绿洲回声"]],
    ["王都裂痕", "尊严与权力不能同时沉默", ["市政大厅", "人口普查", "腐败证据", "公开辩论", "王都裁决"]],
    ["冰原信标", "在漫长黑夜里辨认方向", ["冻土营地", "失联巡逻", "白色威胁", "信标密码", "极昼归来"]],
    ["深林回声", "森林记住所有被遗弃的名字", ["猎人小径", "寄生之森", "古老教义", "兽群迁移", "林地盟约"]],
    ["终局：零之门", "所有相遇都会在这里回来", ["宿敌集结", "记忆迷宫", "六十封信", "最后辨认", "零之门"]],
  ].map(([title, subtitle, episodeTitles], arcIndex) => ({
    id: `arc-${arcIndex + 1}`,
    number: arcIndex + 1,
    title,
    subtitle,
    episodeTitles,
    startWordId: arcIndex * 150 + 1,
    endWordId: (arcIndex + 1) * 150,
  }));

  const episodes = arcs.flatMap((arc) => arc.episodeTitles.map((title, localIndex) => {
    const number = (arc.number - 1) * 5 + localIndex + 1;
    return {
      id: `episode-${number}`,
      number,
      arcId: arc.id,
      title,
      startWordId: (number - 1) * 30 + 1,
      endWordId: number * 30,
      playable: number <= 3,
    };
  }));

  const chapters = [
    {
      id: "chapter-1",
      episode: 1,
      title: "北境公告",
      subtitle: "The Northern Bulletin",
      summary: "河水在一夜之间变黑。米拉与商人艾德里安沿着市政公告，追查一场被刻意淡化的瘟疫。",
      startNode: "c1-1",
      nodes: [
        {
          id: "c1-1", scene: "pasture", location: "Northern Pasture", speaker: "Mira", mood: "风从牧场掠过，河面泛着不自然的银光。",
          lines: [
            "Beyond the [[pasture]], a [[hygiene]] inspector watched the river [[fluctuate]].",
            "The mayor called the smell a minor [[nuisance]]. Mira shook her head. ‘That was [[dumb]].’",
          ],
          wordIds: [1, 2, 3, 4, 5],
          prompt: "米拉想先确认河水异常。哪一个词表示“上下波动”？",
          choices: [
            { label: "fluctuate", correct: true, testWord: 4, next: "c1-2", outcome: "水位正在反复升降，这不是普通潮汐。" },
            { label: "pasture", correct: false, testWord: 4, outcome: "那是牧场，不是水位的变化。" },
            { label: "hygiene", correct: false, testWord: 4, outcome: "卫生状况值得调查，但它不是这个动作。" },
          ],
        },
        {
          id: "c1-2", scene: "gate", location: "East Gate", speaker: "Adrian · Merchant", mood: "城门紧闭，乌鸦停在新钉的木牌上。",
          lines: [
            "A [[crow]] rose as the gate [[slam]]med shut. Even the [[poultry]] had been driven inside.",
            "Adrian, a local [[carpenter]], pointed at the red [[municipal]] seal.",
          ],
          wordIds: [6, 7, 8, 9, 10],
          prompt: "守卫只接受市政许可。选择带有“市政”含义的通行凭证。",
          choices: [
            { label: "Municipal pass", correct: true, testWord: 10, next: "c1-3", outcome: "红色市政印章亮起，城门开了一道缝。", gainItem: "Municipal Pass" },
            { label: "Carpenter’s note", correct: false, testWord: 10, outcome: "木工的便条没有官方效力。" },
            { label: "Poultry receipt", correct: false, testWord: 10, outcome: "这只是一张家禽收据。" },
          ],
        },
        {
          id: "c1-3", scene: "cabin", location: "Drainage Slope", speaker: "Mira", mood: "排水坡下，小屋里传出断断续续的乐声。",
          lines: [
            "A [[municipal]] pipe ran down the [[slope]] toward a deserted [[cabin]]. Whatever entered it could [[propagate]] through the town.",
            "Inside, a [[duplicate]] key lay beside a recording of the royal [[orchestra]].",
          ],
          wordIds: [10, 11, 12, 13, 14, 15],
          prompt: "污染物会沿管道向全城传播。用哪个行动追踪它？",
          choices: [
            { label: "Trace how it propagates", correct: true, testWord: 12, next: "c1-4", outcome: "你们沿着管道标记出一条通往谷仓的路线。", gainItem: "Duplicate Key" },
            { label: "Listen to the orchestra", correct: false, testWord: 12, outcome: "乐声遮住了线索，却不能解释污染如何扩散。" },
            { label: "Climb the slope and leave", correct: false, testWord: 12, outcome: "离开只会让传播继续。" },
          ],
        },
        {
          id: "c1-4", scene: "barn", location: "Old Barn", speaker: "Adrian · Merchant", mood: "公告被钉在谷仓最高的横梁上，下面是堵塞的排水沟。",
          lines: [
            "Adrian had to [[crane]] his neck to read the [[municipal]] [[bulletin]] above the [[barn]] door.",
            "The missing paragraph would [[intrigue]] any investigator: all records of the northern [[drain]] had been erased.",
          ],
          wordIds: [10, 16, 17, 18, 19, 20],
          prompt: "哪件物品记录了官方公告？",
          choices: [
            { label: "Take the bulletin", correct: true, testWord: 18, next: "c1-5", outcome: "公告背面藏着一串地窖编号。", gainItem: "Northern Bulletin" },
            { label: "Take the drain", correct: false, testWord: 18, outcome: "排水沟是地点，不是记录。" },
            { label: "Take the barn", correct: false, testWord: 18, outcome: "谷仓带不走，也不是书面公告。" },
          ],
        },
        {
          id: "c1-5", scene: "square", location: "Market Square", speaker: "Adrian · Merchant", mood: "市集无人叫卖，白色泡沫正从井口漫出。",
          lines: [
            "An [[attorney]] called the witness a [[coward]], but Mira sensed a [[latent]] fear behind his silence.",
            "Adrian the [[merchant]] knelt beside the [[pasture]] well. A ring of yellow [[foam]] clung to the stone.",
          ],
          wordIds: [1, 21, 22, 23, 24, 25],
          prompt: "要追查井水，应先询问长期在市集活动的人。找谁？",
          choices: [
            { label: "Question the merchant", correct: true, testWord: 24, next: "c1-6", outcome: "艾德里安交出三个月的交易记录。" },
            { label: "Question the foam", correct: false, testWord: 24, outcome: "泡沫是证据，却不能作证。" },
            { label: "Question the latent", correct: false, testWord: 24, outcome: "latent 描述潜在状态，并不是人物身份。" },
          ],
        },
        {
          id: "c1-6", scene: "council", location: "Municipal Chamber", speaker: "Mira", mood: "议事厅里，最后一盏灯照着被封存的病例。",
          lines: [
            "The stolen [[bulletin]] showed that a displaced [[tribe]] had endured months of [[torment]]. The records named the cause: [[plague]].",
            "Mira lowered her voice. The evidence was [[intimate]], almost personal. Everyone in the chamber became [[solemn]].",
          ],
          wordIds: [18, 26, 27, 28, 29, 30],
          prompt: "病例指向一种会蔓延的严重疾病。选择真相。",
          choices: [
            { label: "The plague was concealed", correct: true, testWord: 28, next: "complete", outcome: "第一枚封印破裂：这场瘟疫从来不是意外。" },
            { label: "The tribe was an orchestra", correct: false, testWord: 28, outcome: "部落是受害者，管弦乐队也不是疾病。" },
            { label: "The torment was municipal", correct: false, testWord: 28, outcome: "市政记录掩盖了痛苦，但 municipal 不是病名。" },
          ],
        },
      ],
    },
    {
      id: "chapter-2",
      episode: 2,
      title: "无声礼堂",
      subtitle: "The Silent Auditorium",
      summary: "一场为灾民举办的演说被人篡改。隐藏在礼堂里的窃贼，偷走的并不只是粮票。",
      startNode: "c2-1",
      nodes: [
        {
          id: "c2-1", scene: "workshop", location: "Relief Workshop", speaker: "Mira", mood: "救济工坊里，器械和人群都失去了秩序。",
          lines: [
            "After the [[plague]], a broken [[gadget]] scattered a [[herd]] into the yard. A second [[batch]] of medicine looked [[bizarre]], yet the labels seemed [[decent]].",
          ], wordIds: [28, 31, 32, 33, 34, 35], prompt: "药品分批登记。哪个词表示“一批”？",
          choices: [
            { label: "batch", correct: true, testWord: 33, next: "c2-2", outcome: "第二批药的编号与失窃清单一致。" },
            { label: "herd", correct: false, testWord: 33, outcome: "herd 是兽群。" },
            { label: "gadget", correct: false, testWord: 33, outcome: "gadget 是小器具。" },
          ],
        },
        {
          id: "c2-2", scene: "auditorium", location: "Grand Auditorium", speaker: "Adrian · Merchant", mood: "礼堂幕布垂落，一根被割断的绳索悬在空中。",
          lines: [
            "A [[tender]] note lay beneath an [[exquisite]] mask. Above it, a cut [[cord]] suggested that the accident was a planned [[catastrophe]].",
            "Every [[municipal]] door of the [[auditorium]] was locked from within.",
          ], wordIds: [10, 36, 37, 38, 39, 40], prompt: "需要固定幕布。背包里的哪件东西最合适？",
          choices: [
            { label: "Use the cord", correct: true, testWord: 39, next: "c2-3", outcome: "绳索拉起幕布，露出后墙上的暗门。", gainItem: "Red Cord" },
            { label: "Use the catastrophe", correct: false, testWord: 39, outcome: "catastrophe 是灾难，不是物品。" },
            { label: "Use the auditorium", correct: false, testWord: 39, outcome: "礼堂是你所在的地点。" },
          ],
        },
        {
          id: "c2-3", scene: "backstage", location: "Backstage Archive", speaker: "Mira", mood: "后台档案把慈善演说与屠宰场租约订在了一起。",
          lines: [
            "The speaker’s [[doctrine]] praised mercy, while a bloodstained [[rag]] linked his family to illegal [[slaughter]]. The old [[bulletin]] named the same family.",
            "A frightened [[tenant]] had chosen this [[venue]] to reveal the truth.",
          ], wordIds: [18, 41, 42, 43, 44, 45], prompt: "证人说他只是房客。选择对应身份。",
          choices: [
            { label: "tenant", correct: true, testWord: 44, next: "c2-4", outcome: "房客交出通往包厢的钥匙。", gainItem: "Tenant Key" },
            { label: "doctrine", correct: false, testWord: 44, outcome: "doctrine 是教义。" },
            { label: "venue", correct: false, testWord: 44, outcome: "venue 是活动场所。" },
          ],
        },
        {
          id: "c2-4", scene: "gallery", location: "Upper Gallery", speaker: "Adrian · Merchant", mood: "楼上的少年用布包着一枚旧徽章。",
          lines: [
            "In this [[realm]] of locked doors, one careless [[stroke]] could expose everything. The [[merchant]] found a [[juvenile]] witness keeping the badge [[wrap]]ped in cloth.",
            "Its pattern was [[compatible]] with the duplicate key from the cabin.",
          ], wordIds: [24, 46, 47, 48, 49, 50], prompt: "两件证物的纹样相互匹配。哪个词表达“兼容的”？",
          choices: [
            { label: "compatible", correct: true, testWord: 49, next: "c2-5", outcome: "徽章与钥匙属于同一套市政锁具。" },
            { label: "juvenile", correct: false, testWord: 49, outcome: "juvenile 指青少年。" },
            { label: "stroke", correct: false, testWord: 49, outcome: "stroke 在这里是一下动作。" },
          ],
        },
        {
          id: "c2-5", scene: "kitchen", location: "Relief Kitchen", speaker: "Mira", mood: "厨房的蒸汽里，有人正急促喘息。",
          lines: [
            "A masked [[menace]] began to [[pant]] when the guard offered a [[salute]]. Mira signaled us to [[refrain]] from speaking.",
            "The stolen code was hidden inside a relief [[recipe]].",
          ], wordIds: [51, 52, 53, 54, 55], prompt: "米拉要求暂时克制，不要开口。选择行动。",
          choices: [
            { label: "Refrain from speaking", correct: true, testWord: 54, next: "c2-6", outcome: "脚步声经过，嫌疑人没有发现你们。", gainItem: "Coded Recipe" },
            { label: "Salute loudly", correct: false, testWord: 54, outcome: "敬礼的声响惊动了走廊。" },
            { label: "Pant", correct: false, testWord: 54, outcome: "气喘不能帮助你保持隐蔽。" },
          ],
        },
        {
          id: "c2-6", scene: "roof", location: "Auditorium Roof", speaker: "Mira", mood: "无人机掠过屋顶，把影像投向全城。",
          lines: [
            "The [[burglar]] tried to [[portray]] himself as a hero who had ended the [[plague]] and prevented [[famine]]. A bottle of [[vinegar]] proved otherwise.",
            "Mira launched the recovered [[drone]], and his confession filled every public screen.",
          ], wordIds: [28, 56, 57, 58, 59, 60], prompt: "真正潜入礼堂偷取物品的人是谁？",
          choices: [
            { label: "The burglar", correct: true, testWord: 56, next: "complete", outcome: "谎言被公开。礼堂终于重新响起人声。" },
            { label: "The famine", correct: false, testWord: 56, outcome: "famine 是饥荒。" },
            { label: "The drone", correct: false, testWord: 56, outcome: "无人机记录了证据，但它不是窃贼。" },
          ],
        },
      ],
    },
    {
      id: "chapter-3",
      episode: 3,
      title: "污染地窖",
      subtitle: "The Contaminated Cellar",
      summary: "证据把米拉带回疫病源头。地窖中的水、油脂与香气，共同拼出一场有组织的袭击。",
      startNode: "c3-1",
      nodes: [
        {
          id: "c3-1", scene: "cellar", location: "Lower Cellar", speaker: "Mira", mood: "机器低鸣，缝合过的水袋堆在黑暗里。",
          lines: [
            "A cry of [[agony]] rose above the [[grind]]ing pump. A [[tangle]] of pipes had been [[stitch]]ed into the town’s water line.",
            "Every altered pipe could [[contaminate]] another district and renew the [[plague]].",
          ], wordIds: [28, 61, 62, 63, 64, 65], prompt: "要阻止水源被弄脏，应切断哪个过程？",
          choices: [
            { label: "Stop the contamination", correct: true, testWord: 65, next: "c3-2", outcome: "主阀关闭，黑水停止流向住宅区。" },
            { label: "Continue the grind", correct: false, testWord: 65, outcome: "水泵继续运转只会扩大污染。" },
            { label: "Stitch another pipe", correct: false, testWord: 65, outcome: "再接一根管道会制造新的通路。" },
          ],
        },
        {
          id: "c3-2", scene: "laboratory", location: "Hidden Laboratory", speaker: "Adrian · Merchant", mood: "油层下漂着死去的虫体，账本却写着“净化”。",
          lines: [
            "The [[contaminate]]d liquid contained [[petroleum]] and a living [[parasite]]. Calling it medicine was a [[scandal]] built upon [[tragedy]].",
            "Adrian looked at the false label with [[scorn]].",
          ], wordIds: [65, 66, 67, 68, 69, 70], prompt: "样本里存在依附宿主生存的生物。选择它。",
          choices: [
            { label: "parasite", correct: true, testWord: 69, next: "c3-3", outcome: "显微镜下，寄生体正随着水流繁殖。", gainItem: "Contaminated Sample" },
            { label: "petroleum", correct: false, testWord: 69, outcome: "petroleum 是石油成分。" },
            { label: "scorn", correct: false, testWord: 69, outcome: "scorn 是轻蔑的态度。" },
          ],
        },
        {
          id: "c3-3", scene: "meadow", location: "South Meadow", speaker: "Mira", mood: "草地上搭着临时营地，粗糙的绷带随风摆动。",
          lines: [
            "The [[municipal]] guards demanded our [[surrender]]. Beyond them, the illness was already [[prevalent]] across the [[meadow]].",
            "Their [[coarse]] restraints had caused needless [[torture]].",
          ], wordIds: [10, 71, 72, 73, 74, 75], prompt: "卫兵要求交出武器并放弃抵抗。这个命令是什么？",
          choices: [
            { label: "Surrender", correct: true, testWord: 71, next: "c3-4", outcome: "你们假意投降，趁机进入封锁区。" },
            { label: "Meadow", correct: false, testWord: 71, outcome: "meadow 是草地。" },
            { label: "Prevalent", correct: false, testWord: 71, outcome: "prevalent 表示广泛存在。" },
          ],
        },
        {
          id: "c3-4", scene: "vault", location: "Mosaic Vault", speaker: "Adrian · Merchant", mood: "地毯下的马赛克缺了一块，香味从暗门后渗出。",
          lines: [
            "A torn [[carpet]] covered the entrance to the [[cellar]]. Beside a guard [[booth]], strong [[perfume]] concealed the [[contaminate]]d air.",
            "One tile in the [[mosaic]] could be pressed like a switch.",
          ], wordIds: [65, 76, 77, 78, 79, 80], prompt: "哪一种图案由许多小块拼成，并藏着开关？",
          choices: [
            { label: "Press the mosaic", correct: true, testWord: 80, next: "c3-5", outcome: "马赛克下沉，密室门无声滑开。" },
            { label: "Press the perfume", correct: false, testWord: 80, outcome: "香水掩盖了气味，却不是拼贴图案。" },
            { label: "Press the booth", correct: false, testWord: 80, outcome: "booth 是小隔间。" },
          ],
        },
        {
          id: "c3-5", scene: "vault", location: "Sealed Chamber", speaker: "Mira", mood: "伪装的医师擦去手套上的油脂，身后是仍在运转的装置。",
          lines: [
            "The doctor’s [[disguise]] hid a [[malignant]] purpose. A [[sponge]] soaked with [[grease]] kept the [[contaminate]]d valve moving at [[tremendous]] speed.",
          ], wordIds: [65, 81, 82, 83, 84, 85], prompt: "要让阀门失去润滑，拿走什么？",
          choices: [
            { label: "Remove the greasy sponge", correct: true, testWord: 83, next: "c3-6", outcome: "海绵被抽走，装置开始减速。", gainItem: "Greasy Sponge" },
            { label: "Remove the disguise", correct: false, testWord: 83, outcome: "伪装值得揭穿，但它没有吸收油脂。" },
            { label: "Remove the tremendous", correct: false, testWord: 83, outcome: "tremendous 是程度描述。" },
          ],
        },
        {
          id: "c3-6", scene: "raid", location: "Waterworks Roof", speaker: "Mira", mood: "警钟响起，反抗者越过屋顶，袭击队正从四面逼近。",
          lines: [
            "The town’s [[revolt]] had begun. Mira made a final [[leap]] and placed a [[tribute]] beside the victims’ names.",
            "Adrian hurled a metal [[kettle]] at the alarm before the last [[raid]] reached the roof.",
          ], wordIds: [86, 87, 88, 89, 90], prompt: "敌人即将进行突然袭击。选择对应警报。",
          choices: [
            { label: "RAID", correct: true, testWord: 90, next: "complete", outcome: "警报传遍全城。你们守住了水厂，也揭开了更大的阴谋。" },
            { label: "TRIBUTE", correct: false, testWord: 90, outcome: "tribute 是致敬，不是突袭。" },
            { label: "KETTLE", correct: false, testWord: 90, outcome: "kettle 是水壶。" },
          ],
        },
      ],
    },
  ];

  const chapterById = Object.fromEntries(chapters.map((chapter) => [chapter.id, chapter]));
  const nodeById = Object.fromEntries(chapters.flatMap((chapter) => chapter.nodes.map((node) => [node.id, node])));

  function wordPlan(id) {
    const episode = Math.floor((id - 1) / 30) + 1;
    const arc = Math.floor((id - 1) / 150) + 1;
    return {
      arc,
      episode,
      reinforcementEpisode: Math.min(60, episode + 1),
      delayedEpisode: Math.min(60, episode + 5),
      returnEpisode: Math.min(60, episode + 10),
      playable: episode <= 3,
    };
  }

  window.CIZHAN_ADVENTURE = { arcs, episodes, chapters, chapterById, nodeById, wordPlan };
})();
