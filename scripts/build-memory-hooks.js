const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const projectRoot = path.resolve(__dirname, "..");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(projectRoot, "data/words.js"), "utf8"), context);
const words = context.window.VOCABULARY;
const evidence = require("./memory-evidence.json");
const wordByName = new Map(words.map((word) => [word.word.toLowerCase(), word]));

// Human-written bridges for words where a raw morpheme match is misleading or
// where the word has a much better one-off story. Mnemonics are explicitly
// separated from etymology; arbitrary visual slicing is forbidden below.
const manual = {
  eccentric: ["词根链", "ec-（向外）+ centr（中心）+ -ic（……的）：偏离中心 → 不合常规 → 古怪的。"],
  stitch: ["词源＋形近", "古英语 stice 原指“刺、扎”；它与 stick 的“尖物刺入”同源。针每刺一下留下一个 stitch（针脚），同时盯住结尾 -tch，别写成 stick。"],
  compatible: ["词根链", "com-（共同）+ pati（承受，和 compassion 同族）+ -able（能够）：能够共同承受、彼此容纳 → 兼容的。"],
  hygiene: ["词源人物", "hygie- 来自希腊健康女神 Hygieia（许癸厄亚）；她掌管健康与清洁，所以 hygiene 就是“卫生、保健”。拼写钉住 hy-gie-ne。"],
  dumb: ["词义沿革", "dumb 最早只表示“哑的、不能说话”，后来才发展出“笨的”。结尾 b 不发音：看到沉默的 b，就先想“哑”，再连到“笨”。"],
  contemplate: ["词义沿革", "拉丁语 contemplari 原指“划定一块区域仔细观察”；从端详、观察进一步变成在脑中反复看 → 思考、考虑。"],
  dare: ["词源＋口令", "dare 来自表示“勇敢面对危险”的古老词根。把它当一句短促口令：DARE?（敢不敢？）→ 挑战、激将。"],
  nuisance: ["词义沿革", "nuisance 在古法语里原指“伤害、损害”，词义后来减弱为“造成烦扰的人或事” → 麻烦、讨厌的东西。"],
  crow: ["拟声钩子", "crow 本来就是模仿乌鸦叫声的词：乌鸦一边 cro(w)-cro(w) 地叫，一边就是 a crow；名词“乌鸦”和动词“啼叫”一起记。"],
  slam: ["拟声钩子", "slam 的短促重音模仿门“砰”地合上；听到这一声就联到“猛关、猛击”，而不是安静地 close。"],
  poultry: ["同族词", "poultry 与 pullet（小母鸡）同族；从一只小鸡扩展到家养鸡鸭等整体 → 家禽。中间固定写 -ultr-，不是 poetry。"],
  carpenter: ["词义沿革", "carpenter 的拉丁祖先 carpentarius 原是“造车的人”；木车由木匠打造，于是职业义固定为“木匠”。"],
  pasture: ["词根场景", "past-/pasc- 表示“喂养”（和 pastor 牧人同族）：让牲畜吃草的地方 → pasture（牧场）。"],
  municipal: ["词根链", "muni- 指公共职责、公共服务，-al 表示“……的”：与城市公共事务有关的 → municipal（市政的）。"],
  catastrophe: ["词根链", "cata-（向下、彻底）+ strophe（转折、翻转）：局势彻底翻转、崩塌 → catastrophe（大灾难）。"],
  scandal: ["词义沿革", "scandal 的希腊词源本指“陷阱、绊脚石”；让人栽跟头并招来非议的事 → 丑闻。"],
  tragedy: ["词源故事", "tragedy 的希腊构词原意是“山羊之歌”（trag- 山羊 + ode 歌），后来专指悲剧表演；用这个独有故事锁定“悲剧”。"],
  agony: ["词根场景", "agon- 原指竞赛、搏斗；人在激烈挣扎中承受的状态 → agony（极度痛苦）。"],
  auditorium: ["词根链", "audi-（听）+ -orium（场所）：坐下来听演讲、音乐的地方 → auditorium（礼堂）。"],
  tenant: ["词根链", "ten-/tain- 表示“握住、持有”；持有并使用一处房产的人 → tenant（房客、承租人）。"],
  venue: ["词根场景", "ven- 表示“来”（compare convene：共同来到）：大家来到并聚集的地点 → venue（场所、会场）。"],
  juvenile: ["词根链", "juven-（年轻、青年）+ -ile（……的）：年轻人的、未成年的 → juvenile。"],
  salute: ["词义沿革", "salut- 原指健康、安全（与 salvation 同族）；见面先祝对方安康，动作便发展为 salute（致敬、敬礼）。"],
  decent: ["词根链", "dec- 在这里来自“合适、相称”，-ent 表性质：举止合宜、达到体面标准 → decent（得体的、不错的）。"],
  tender: ["同形双线", "形容词 tender 来自“柔软、娇嫩”；动词/名词 tender 则可表示正式提出。先用“嫩”锁住最常考核心义，再按词性分线。"],
  slope: ["动作画面", "slope 与 slip/slide 的“向下滑”画面相近：地面让东西顺势滑下去，说明它有坡度 → slope（斜坡、倾斜）。"],
  bizarre: ["拼写钩子", "bizarre 本身拼写就反常：中间双 r、结尾 -arre 都不按常见节奏。把这副“怪拼写”直接绑定到“奇异的、古怪的”。"],
  pneumonia: ["词根＋哑音", "pneumon- 表示“肺”；开头 p 不发音，像病肺吸不出这一声。pneumonia 就是肺部疾病 → 肺炎。"],
};

Object.assign(manual, {
  rigorous: ["同族词", "rigorous 先认出 rigor（严格、严密）+ -ous（具有……性质的）：按严格标准执行 → 严谨的。"],
  stun: ["声音画面", "stun 的短音像突然“咚”一下让人停住；把“受重击后一时动不了”的画面绑定到“使震惊、使昏迷”。"],
  envisage: ["构词链", "en-（使进入）+ visage（脸、面貌）：让一个面貌进入脑海、看见尚未发生的画面 → 想象、设想。"],
  acquaint: ["词源链", "acquaint 与 cognition/know 的“认识”概念相连：使某人进入知道的状态 → 使熟悉、使了解。拼写钉住 acqu-。"],
  alleviate: ["词根链", "al-/ad-（使趋向）+ levi（轻，和 levity 同根）+ -ate：把负担变轻 → 减轻、缓和。"],
  dorm: ["同族词", "dorm 是 dormitory 的短形，dorm-/dormit- 表“睡”：供人睡觉居住的地方 → 宿舍。"],
  vapour: ["英美拼写", "vapour 就是“蒸汽”，英式保留 -our；美式写 vapor。把飘散的水汽放在中间的 apo 上，重点区分词尾。"],
  despatch: ["拼写变体", "despatch 是 dispatch 的英式变体，核心都是 dis-（分开送出）+ patch/派送 → 派遣、发送；考试先认 -spatch。"],
  bound: ["动作转义", "bind 是“捆绑”，bound 表示“被约束住”；be bound to do 像被规则绑住只能发生 → 必然、一定。"],
  appal: ["词形联想", "appal 与 pale（苍白）做记忆联想：吓得脸色发白 → 使惊骇。英式 appal 单 l，美式 appall 双 l。"],
  siren: ["神话人物", "Siren 是希腊神话中用歌声诱惑水手的海妖；她发出危险警报般的声音 → siren（汽笛、警报器）。"],
  mill: ["动作画面", "mill 中间的 ill 被两侧 m/l 夹着反复碾；谷物被磨轮来回压碎 → mill（磨坊、磨粉机）。"],
  coherent: ["词根链", "co-（共同）+ haer/hes（黏住，见 adhere、cohesive）+ -ent：各部分黏在一起不散 → 连贯的。"],
  hatch: ["一词一画", "hatch 的 -tch 像蛋壳裂开的声音；小鸡啄破蛋壳出来 → 孵化、孵出。"],
  abdomen: ["医学词形", "abdom-/abdomen 是固定的医学“腹部”词干；看到腹肌训练 abdominal，就反推 abdomen（腹部）。"],
  magnet: ["地名词源", "magnet 来自盛产磁石的 Magnesia 地区；Magnesia stone 能吸铁 → magnet（磁铁）。"],
  ounce: ["计量词源", "ounce 来自拉丁 uncia“十二分之一”；一磅的十六分之一仍是小重量单位。盯住开头 ou-，不要写成 once。"],
  cosy: ["英美拼写", "cosy 是英式拼法，美式写 cozy；把中间 s/z 当作拉链拉上，形成温暖封闭的小空间 → 舒适的。"],
  saddle: ["形状画面", "saddle 中间双 d 像马背两侧垂下的马镫；跨在马背上的座具 → 马鞍。"],
  peep: ["字母画面", "peep 两个 ee 像一双从缝里露出的眼睛；只偷偷看一眼 → peep（偷看、窥视）。"],
  canoe: ["词源实物", "canoe 源自加勒比海原住民的 canoa；词尾独特的 -oe 就像独木舟尖尖的两端 → 独木舟。"],
  pupil: ["双义挂钩", "pupil 既是“小学生”，也可指瞳孔；把老师眼中的小学生和眼睛里的小人影放在一起，固定 pu-pil。"],
  nostalgic: ["词根链", "nost-（返乡）+ alg-（痛，见 neuralgia）+ -ic：想回到过去而产生的隐痛 → 怀旧的。"],
  vice: ["夹具画面", "vice 作为“恶习”像台钳（vise）夹住人不放；用 c/s 区分：vice 是恶习，vise 是夹具。"],
  cricket: ["拟声＋分义", "cricket 的 crick-crick 模仿蟋蟀叫声；板球义另走一线。先用叫声锁住拼写，再按语境判“蟋蟀/板球”。"],
  mould: ["英美拼写", "mould 是英式拼法，美式 mold；模具把材料“定型”，霉菌也形成一层形状。保留英式中间的 u。"],
  cohesive: ["词根链", "co-（共同）+ hes（黏住，见 adhere）+ -ive：成员彼此黏合成整体 → 有凝聚力的、团结的。"],
  lapse: ["词源动作", "laps-/labi 表“滑落”：从应有标准上滑下去一次 → lapse（疏忽、过失）；一段时间滑过去也可指间隔。"],
  pork: ["法英对照", "英语 pig 是活猪，法语来源的 pork 指餐桌上的猪肉；看到 p-or-k 就把猪从农场移到餐盘。"],
  harassment: ["词族链", "harass（骚扰）+ -ment（行为/结果）；双 s 属于词干 harass，不能在加后缀时丢掉 → harassment。"],
  boycott: ["人名故事", "boycott 来自被集体拒绝来往的英国地产代理 Captain Boycott；他的姓直接变成“联合抵制”。"],
  correlate: ["词根链", "cor-/com-（共同、相互）+ relate（联系）：让两件事互相联系 → correlate（相关、相互关联）。"],
  hover: ["动作对照", "hover 不是向前飞，而是停在同一点上方；想象直升机 hover 在空中不落地 → 盘旋、悬停。"],
  handicap: ["短语词源", "handicap 来自旧游戏 hand in cap（手放帽中抽签）；后来表示竞赛中的不利条件，再引申为障碍。"],
  normalization: ["词族链", "normal + -ize（使成为）+ -ation（过程）：使之正常的过程 → 正常化；英式也写 normalisation。"],
  expel: ["词根链", "ex-（向外）+ pel/puls（推）：把人向外推出组织或学校 → expel（开除、驱逐）。"],
  contagious: ["词根链", "con-（共同）+ tag/tact（接触）+ -ious：通过人与人接触传播 → contagious（接触传染的）。"],
  readily: ["词族链", "ready（准备好的、随时可做）+ -ly：已经准备好，所以能立刻、欣然、容易地去做 → readily。"],
  hybrid: ["概念画面", "hybrid 的核心是把两个不同来源接到一起；一半 A、一半 B 的后代或系统 → 杂交的、混合的。"],
  motel: ["混成词", "motel = motor + hotel：专给开车旅行者住的 hotel → 汽车旅馆。两个母词直接解释了用途。"],
  penalty: ["词族链", "penal（刑罚的）+ -ty（状态/结果）：违规后承担的处罚或罚金 → penalty。"],
  botany: ["词根链", "botan- 在希腊语里指植物、草木；研究植物的学科 → botany（植物学）。"],
  plug: ["动作画面", "plug 是塞进孔里的塞子；电源插头也是把凸出的部分塞进插孔 → 插头、塞住。用“塞入”统一多义。"],
  pamphlet: ["词源故事", "pamphlet 来自中世纪流行的小册诗 Pamphilus；篇幅小、便于传阅，词义固定为“小册子”。"],
  earnest: ["语气钩子", "in earnest 表示不是玩笑、而是当真；由“当真”锁定 earnest（认真的、诚恳的）。"],
  cheque: ["英美拼写", "cheque 是英式“支票”，美式写 check；银行把 check 扩写成更法语化的 cheque，盯住结尾 -que。"],
  diagnose: ["词根链", "dia-（分开、透彻）+ gnos（知道、识别）：把症状逐项分开看清并识别疾病 → diagnose（诊断）。"],
  outskirts: ["复合词", "out + skirts（边缘）：像裙边围在城市最外圈的地区 → outskirts（郊区、外围）。"],
  clip: ["动作统一", "clip 的核心动作是快速夹住或剪掉；回形针夹住纸，剪刀 clip 掉一小段 → 夹子、修剪。"],
  slot: ["形状画面", "slot 是细长的开口；硬币沿窄缝滑进去，也可指安排表中的一个时间格 → 窄缝、时段。"],
  reliance: ["词族链", "rely（依靠、信赖）变 y 为 i 再加 -ance（状态）：依靠的状态 → reliance（信赖、依赖）。"],
  descendant: ["词根链", "de-（向下）+ scend（攀爬）+ -ant（人）：沿家谱向下一代走的人 → descendant（后裔）。"],
  stubborn: ["形状联想", "stub 是短而硬的残桩；像树桩一样顶住不动的人 → stubborn（固执的）。中间双 b 要保留。"],
  wreck: ["字母＋场景", "wreck 开头 wr- 中 w 不发音；海难后留下扭坏、不能动的残体 → wreck（残骸、毁坏）。"],
  grey: ["英美拼写", "grey 与 gray 都是灰色；英式常用 grey。用 E = England 记 grey 偏英式，A = America 记 gray 偏美式。"],
  henceforth: ["复合词", "hence（从这里/此时）+ forth（向前）：从此刻向前的全部时间 → henceforth（从今以后）。"],
  expire: ["词根链", "ex-（向外）+ spir（呼吸）：呼出最后一口气 → 死亡；期限走到尽头也就是 expire（到期、失效）。"],
  designate: ["词根链", "de-（明确地）+ sign（标记）+ -ate：给某人或某物做上明确标记 → 指定、命名。"],
  advisable: ["词族链", "advise（建议）去 e + -able（值得/可以）：值得被建议采用的做法 → advisable（明智的、可取的）。"],
  catalog: ["词源链", "cata-（逐项）+ log（列举、记录）：把物品逐项记录下来 → catalog（目录）。"],
  nonsense: ["构词链", "non-（没有）+ sense（意义、道理）：没有意义和道理的话 → nonsense（胡说、废话）。"],
  coronavirus: ["形状词源", "corona 是“王冠”：显微镜下病毒表面的刺突像一圈冠冕，因此叫 coronavirus（冠状病毒）。"],
  archive: ["词义沿革", "archive 源自希腊语表示“政府公文存放处”的词；从存放公文的地点发展为档案、档案馆。"],
  fireplace: ["复合词", "fire（火）+ place（地方）：室内专门生火取暖的位置 → fireplace（壁炉）。"],
  beneath: ["方位画面", "beneath 把 be- 和 neath（下方）整体看；位置被另一物覆盖在其下 → 在……下面。"],
  resemble: ["词源链", "re-（再次、相应）+ sembl（相像，见 similar）：两样东西呈现相似外观 → resemble（像、类似）。"],
  gallon: ["容器词源", "gallon 原先就是液体容器/容量名称；把一个大壶标上 gal-lon，双 l 固定计量单位“加仑”。"],
  thereafter: ["复合词", "there（那件事/那时）+ after（之后）：在那以后 → thereafter（此后）。"],
  altitude: ["词根链", "alt-（高，见 alto）+ -itude（程度/状态）：高度的数值或状态 → altitude（海拔、高度）。"],
  ego: ["原词直记", "ego 在拉丁语里就是“我”；把“我”放得过大就成了自我、自尊甚至自负 → ego。"],
  leaflet: ["词族联想", "leaf（一片叶/一页纸）+ -let（小）：一小片可散发的纸页 → leaflet（传单、小册页）。"],
  blank: ["颜色沿革", "blank 与法语 blanc“白”同源：白纸上什么也没有 → blank（空白的、茫然的）。"],
  lunar: ["词根链", "lun-（月亮，见 luna）+ -ar（……的）：与月球有关的 → lunar（月球的）。"],
  peninsula: ["词根链", "pen-/paene（几乎）+ insula（岛）：几乎是岛、只有一边连着陆地 → peninsula（半岛）。"],
  reckless: ["构词链", "reck（在意、顾及）+ -less（不）：做事不顾后果 → reckless（鲁莽的）。"],
  outstanding: ["空间转义", "out + standing：从一群人中“站出来”、显得高于周围 → outstanding（杰出的）。"],
  commemorate: ["词根链", "com-（共同、加强）+ memor（记忆）+ -ate：共同把某人某事记住 → commemorate（纪念）。"],
  mood: ["同族概念", "mood 与 mind 的古老“心智、精神状态”概念相连；某一时刻心里所处的状态 → 心情。"],
  log: ["航海故事", "船员把测速木块 log 抛入海中并把数据写进 logbook；后来 log 就从木块发展为“记录、日志”。"],
  lawn: ["场景直记", "lawn 专指修剪平整、供人活动的草地；想象割草机沿 lawn 留下整齐平行纹路，锁定“草坪”。"],
  diameter: ["词根链", "dia-（穿过）+ meter（测量）：穿过圆心从一边量到另一边的线 → diameter（直径）。"],
  volt: ["人名单位", "volt 以发明电池的意大利科学家 Alessandro Volta 命名；看到 Volt-a 就锁定电压单位“伏特”。"],
  entitle: ["构词链", "en-（使拥有）+ title（头衔、权利）：给某人一个名分或资格 → entitle（使有权、给标题）。"],
  transistor: ["混成构词", "transistor 由 transfer（传递）+ resistor（电阻器）组合命名：控制并传递电信号的器件 → 晶体管。"],
  frog: ["形状画面", "frog 短而有弹性；把 fr- 当蹲伏前腿、-og 当鼓起的身体，整只青蛙一下跳出 → 蛙。此条是形状联想，不是词源。"],
  glance: ["动作对照", "glance 是目光轻轻擦过，不是停下来 stare；想象眼睛只扫过 gl- 的一道亮光 → 一瞥。"],
  tour: ["词源圆环", "tour 与 turn 同源，最早带有“转一圈”的概念：绕一圈参观再回来 → 旅行、游览。"],
  asset: ["词义沿革", "asset 来自古法语 assez“足够”；足以偿还债务的东西就是可用财产 → asset（资产、有价值的人或物）。"],
  landlady: ["复合词", "land（房产）+ lady（女士）：拥有并出租房屋的女性 → landlady（女房东）。"],
  whisky: ["词源短语", "whisky 来自盖尔语 uisge beatha“生命之水”；把烈酒当作 water of life，锁定威士忌。美式常写 whiskey。"],
  notify: ["词根链", "noti-（知道，见 notice）+ -fy（使成为）：使对方知道 → notify（通知）。"],
  hinge: ["动作画面", "hinge 是门绕着转动的连接点；把中间 in 想成轴销插进去，门便能开合 → 铰链。"],
  christian: ["人名构词", "Christ + -ian（追随者/相关的人）：追随基督的人 → Christian（基督徒、基督教的）。"],
  confidential: ["词根链", "con-（共同）+ fid（信任，见 fidelity）+ -ential：只在彼此信任者之间传递 → confidential（机密的）。"],
  rent: ["场景双义", "rent 作名词是定期交出的“租金”；作动词是付钱换取暂时使用。用“每月交钱换钥匙”统一两义。"],
  practitioner: ["词族链", "practice（实践、从业）变为 practit- + -ioner（从事者）：实际从事某专业的人 → practitioner。"],
  ash: ["燃烧画面", "ash 只有三个字母，像火焰熄灭后只剩轻短的一撮；burn → ash（灰烬）。用完整短词直连场景。"],
  implement: ["词义统一", "implement 的核心是“使计划充实并完成”：动词是实施，名词是完成工作所用的工具；用“落实”统一两义。"],
  equator: ["词根链", "equ-（相等）+ -ator（起作用者/线）：把地球分成相等南北两半的线 → equator（赤道）。"],
  senior: ["词根链", "sen-（年老，见 senate）+ -ior（比较级）：年龄或资历更高的 → senior（年长的、资深的）。"],
  gadget: ["场景联想", "gadget 就是小而巧的工具；想象口袋里一件带按钮的小装置，按一下便完成任务 → 小器具。此条是场景钩子。"],
  rag: ["形近对照", "rag 是破布，rug 是小地毯：a 像破布上的洞，u 像铺在地上的弧面；只用这一个元音区分。"],
  lumber: ["动作分线", "lumber 作名词是木材；沉重木料搬动时步伐笨重，所以动词可指缓慢、笨重地移动。用木料重量统一两义。"],
  culminate: ["词根场景", "culmin- 指顶点、最高处：事情一路上升到顶点并在那里结束 → culminate（达到高潮、以……告终）。"],
  crawl: ["动作画面", "crawl 的 cr- 像身体贴地用力，-awl 拉得很慢；把婴儿四肢着地缓慢前进的完整动作绑定到“爬行”。"],
  pine: ["同形双线", "pine 作名词是松树；作动词表示长久思念、憔悴。用“独自站着的常青松长久等待”串起松树与渴望。"],
  chin: ["部位对照", "chin 是下巴，cheek 是脸颊：chin 更短、更靠下；把末尾 n 当成下巴尖，和 cheek 分开。"],
  extravagant: ["词根链", "extra-（超出）+ vag（漫游、越界）+ -ant：花费越过正常界限 → extravagant（奢侈的、过度的）。"],
  rug: ["形近对照", "rug 是小地毯，rag 是破布：u 像地毯铺出的弧面，a 像破布破洞；只盯中间元音。"],
  clasp: ["动作画面", "clasp 的 cl- 像合拢、-asp 像扣住；两端咔哒合在一起 → 搭扣，也可作“紧握”。"],
  bucket: ["容器画面", "bucket 的 -ket 像提手扣在桶口；抓住上方把手提起一个深容器 → 桶。此条是形状联想。"],
  howl: ["拟声钩子", "howl 拉长读音就像狼“嗷——”地长叫；声音本身直接锁定“嗥叫、嚎叫”。"],
  scatter: ["动作画面", "scatter 中双 t 像两股东西被向左右弹开；从集中一点散到四周 → 撒播、分散。"],
  cheek: ["部位对照", "cheek 是脸颊，chin 是下巴：cheek 两个 ee 像左右两边鼓起的脸颊；用双眼/双颊锁住双 e。"],
  cordial: ["词根场景", "cord-/cor- 表“心”（见 cardiac）：发自内心地热情友好 → cordial（热情友好的、诚恳的）。"],
  genuine: ["词源核心", "genuin- 的历史核心是“天生的、原产的”，不是后来仿造出来的 → genuine（真正的、真品的）。"],
  facilitate: ["词族链", "facile 是“容易的”，facilitate 就是把一件事变得 facile（容易）→ 促进、使便利。"],
  discourse: ["词根画面", "dis-（来回、分开）+ cours（跑）：思想和话语在双方之间来回跑 → discourse（论述、谈话）。"],
  pregnant: ["词源场景", "pregnant 的拉丁核心带有“出生之前、怀着”的概念：孩子尚未出生而在体内 → 怀孕的。"],
  freelance: ["历史画面", "free lance 原指不效忠固定领主、把长矛 lance 出售给任何雇主的佣兵；现代变成自由职业者。"],
  demographic: ["词根链", "demo-（人口、人民）+ graph（记录、描述）+ -ic：描述人口构成的 → demographic（人口统计的）。"],
  precede: ["词根链", "pre-（在前）+ ced/ceed（走）：走在另一件事前面 → precede（先于）。"],
  optional: ["词根链", "opt（选择）+ -ion（选择的结果）+ -al（……的）：可以由你选择的 → optional（可选的）。"],
  recipient: ["词族链", "receive（接收）对应的名词角色是 recipient；共同的 reci-/recei- 提醒你这是“接受者”。"],
  cosmic: ["词根链", "cosm-/kosmos（宇宙、秩序）+ -ic（……的）：与宇宙有关的 → cosmic。"],
  dictation: ["词根链", "dict（说，见 dictate）+ -ation（过程）：一个人说、另一个人按所听写下 → dictation（听写）。"],
  evaluate: ["词族链", "value（价值）前加 e-、后加 -ate 构成动作：判断某事的 value → evaluate（评价、估价）。"],
  commend: ["词义沿革", "commend 最初有“托付、交付照管”之意；把某人郑重托付给众人认可 → 推荐、称赞。"],
  coincide: ["词根链", "co-（共同）+ incid（发生、落到）+ -e：两件事落在同一点或同一时刻 → coincide（同时发生、相符）。"],
  migrate: ["词根链", "migr-（移动、迁移）+ -ate（做）：从一个地区移到另一个地区 → migrate（迁徙）。"],
  vertical: ["词族画面", "vertical 与 vertex（顶点）同族：从脚下直指头顶最高点的方向 → 垂直的。"],
  boundary: ["词族链", "bound 在这里取“界限”义（不是 be bound to 的“必然”）+ -ary：界限所在之处 → boundary（边界）。"],
  pole: ["原义直记", "古英语 pal 就是“桩、杆、柱”；词形演变为 pole，核心物体没有改变 → 杆子。不要和大写 Pole（波兰人）混。"],
  rare: ["词义沿革", "rare 早期有“稀疏、数量少”的意思；数量少到不常遇见 → 稀有的。食物“半熟”是另一条同形义。"],
  shaft: ["形状统一", "shaft 的核心形状是“细长直通的部分”：矛杆、机器轴和电梯井都符合这条形状 → 轴、井。"],
  bull: ["拟声画面", "bull 指成年公牛；想象公牛低沉地 bull 一声并向前顶。名词先锁“公牛”，金融中的 bull market 再由向上顶引申。"],
  cock: ["拟声钩子", "cock 源自模仿公鸡叫声的词；cock-a-doodle-doo 一响就锁定“公鸡”。机械开关等义项来自公鸡抬头的形状。"],
  found: ["词族链", "found 在“创办”义上来自 foundation（地基）：先打地基，再把机构建立起来 → 创办。不要与 find 的过去式 found 混。"],
  digest: ["词根链", "di-/dis-（分开）+ gest（携带、处理）：把食物分解并处理成身体能吸收的部分 → digest（消化）。"],
  alloy: ["动作场景", "alloy 是把不同金属熔在一起形成的新材料；一炉液态金属混合后凝固 → 合金，也可作“掺合”。"],
  disc: ["形状直记", "disc 就是一块扁平圆盘；想象唱片或光盘的圆形轮廓。英式多写 disc，计算机磁盘常见 disk。"],
  refrigerator: ["词族链", "refrigerate（使冷却）+ -or（装置）：持续把食物冷却的装置 → refrigerator（冰箱）。"],
  sensation: ["词根链", "sens-（感觉）+ -ation（过程/结果）：感官受到刺激后产生的体验 → sensation（感觉、轰动）。"],
  remainder: ["词族链", "remain（留下）+ -der（名词结果）：其余部分拿走后仍留下的东西 → remainder（剩余物）。"],
  submarine: ["词根链", "sub-（在下）+ marine（海洋的）：在海面下航行的船 → submarine（潜水艇）。"],
  graph: ["词根直记", "graph- 表“写、画、记录”；把数据画成可读的线条 → graph（图表）。"],
  band: ["动作转义", "band 最初是把东西束在一起的带子；一群乐手也像被一条带子绑成一个整体 → 乐队。"],
  torture: ["词根画面", "tort- 表“扭曲”（见 distort）：把人的身体和意志强行扭曲 → torture（拷问、折磨）。"],
  revolt: ["词根链", "re-（反向、回转）+ volt/volv（转）：从原有统治方向转过去 → revolt（反抗、反叛）。"],
  hedge: ["名动统一", "hedge 是围住土地的树篱；动词就是“用树篱围住”，再引申为给风险加一道边界 → 防范。"],
  audit: ["词根链", "aud- 表“听”（见 audio）：旧时账目由审计者听人逐项念出并核对 → audit（审计）。"],
  disorder: ["构词链", "dis-（打乱、否定）+ order（秩序）：秩序被打乱 → disorder（杂乱、失调）。"],
  mortgage: ["词源故事", "mort-（死）+ gage（抵押品/承诺）：债务还清或房产被收走时，这份承诺才“死” → mortgage（抵押贷款）。"],
  cloak: ["名动统一", "cloak 本是披在外面遮住身体的斗篷；动词就是像披斗篷一样把真相遮住 → 遮盖、掩饰。"],
  veto: ["原句词源", "veto 在拉丁语中就是第一人称“我禁止”；掌权者说出 veto，提案立即被否决 → 否决权。"],
  miracle: ["词根链", "mir- 表“惊奇、观看”（见 admire）+ -acle（事物）：让人看见后惊叹的事 → miracle（奇迹）。"],
  predominant: ["词根链", "pre-（在前）+ domin（主人、支配）+ -ant：像主人一样处在前面并支配全局 → predominant（占主导的、显著的）。"],
  twist: ["动作画面", "twist 的 tw- 提醒“两股”：把两股线相互绕转就会扭紧 → twist（扭、使弯曲）。此条是构形联想。"],
  endeavor: ["短语词源", "endeavor 来自 put oneself in devoir“使自己尽到责任”：全力去完成应做之事 → 努力、尽力。"],
  missionary: ["词族链", "mission（被派出的任务）+ -ary（从事者）：被派出去执行宗教使命的人 → missionary（传教士）。"],
  parade: ["词义沿革", "parade 最初是为展示而准备、列队检阅；队伍公开展示着前进 → parade（游行、阅兵）。"],
  renaissance: ["词根链", "re-（再次）+ naissance（出生）：文化与艺术再次出生 → Renaissance（文艺复兴）。"],
});

const languages = {
  "Old English": "古英语", "Middle English": "中古英语", "Anglo-French": "盎格鲁法语",
  "Old French": "古法语", "Middle French": "中古法语", French: "法语",
  "Medieval Latin": "中世纪拉丁语", "Late Latin": "晚期拉丁语", Latin: "拉丁语",
  "Ancient Greek": "古希腊语", Greek: "希腊语", "Old Norse": "古诺斯语",
  "Proto-Germanic": "原始日耳曼语",
};

const englishBits = {
  "out of": "向外", outside: "外部", feed: "喂养", snare: "陷阱", "he-goat": "公山羊",
  above: "在上", over: "超过", root: "根", ground: "地面", Earth: "土地", kind: "种类",
  sort: "种类", scrape: "刮", shave: "削", "in vain": "徒劳", drive: "驱赶", push: "推",
  break: "打破", take: "拿取", hold: "持有", capture: "抓住", hang: "悬挂", weight: "重量",
  pay: "支付", consider: "考虑", do: "做", make: "制造", shape: "塑造", fashion: "塑造",
  face: "表面", run: "跑", course: "路线", go: "走", move: "移动", hearing: "听觉",
  listening: "聆听", sound: "声音", hear: "听", affection: "情感", goad: "刺激",
  rouse: "唤起", excite: "激发", slide: "滑", slip: "滑落", lip: "边缘", lift: "抬起",
  light: "轻", raise: "升起", nounify: "构成名词", burst: "爆裂", blow: "吹", cut: "切",
  kill: "杀", bind: "结合", bottom: "底部", beam: "光束", spoke: "辐条", radiation: "辐射",
  ray: "射线", shine: "发光", stand: "站立", relate: "叙述", tell: "讲述", recall: "回想",
  remember: "记住", beat: "击打", around: "环绕", fall: "落下", stream: "溪流", brook: "小溪",
  mark: "标记", sign: "符号", moon: "月亮", organ: "器官", instrument: "器具", tool: "工具",
  work: "工作", effect: "作用", ship: "船", boat: "舟", life: "生命", live: "生存",
  cast: "投", throw: "投掷", lie: "放置", speak: "说", talk: "交谈", roll: "滚动",
  draw: "拉", pull: "拉", lead: "引导", in: "进入", on: "在上", bring: "带来",
  "cause to Stand": "使站住", "form adjective": "构成形容词", "form noun": "构成名词",
  "form verb": "构成动词", "pertaining to": "与……有关", "relating to": "与……有关",
  "able to": "能够", "capable of": "能够", "full of": "充满", "state of": "……的状态",
  "result of": "……的结果",
};

const prefixes = [
  ["counter", "反向、对抗"], ["under", "在下、不足"], ["inter", "在……之间"],
  ["trans", "跨越、转移"], ["super", "在上、超出"], ["extra", "在外、额外"],
  ["micro", "微小"], ["multi", "多"], ["retro", "向后、回溯"], ["sub", "在下、次级"],
  ["over", "过度、在上"], ["post", "在后"], ["pre", "在前、预先"], ["anti", "反对"],
  ["auto", "自己"], ["hyper", "过度"], ["hypo", "不足、在下"], ["intra", "在内部"],
  ["semi", "半"], ["tele", "远距离"], ["tri", "三"], ["non", "不、非"], ["mis", "错误"],
  ["dis", "分开、否定"], ["re", "再次、向后"], ["un", "不、相反"], ["de", "向下、去除"],
  ["ex", "向外、前任"], ["en", "使进入"], ["em", "使进入"], ["bi", "二、双"],
  ["co", "共同"], ["com", "共同"], ["con", "共同"], ["im", "进入、否定"],
  ["in", "进入、否定"], ["ir", "不"], ["il", "不"], ["pro", "向前、支持"],
];

const suffixes = [
  ["ization", "……化的过程"], ["ability", "能够……的性质"], ["ibility", "能够……的性质"],
  ["ology", "……学、研究"], ["ation", "动作或结果"], ["ition", "动作或结果"],
  ["escence", "形成某状态"], ["fulness", "充满……的性质"], ["lessness", "缺少……的性质"],
  ["able", "能够……的"], ["ible", "能够……的"], ["ance", "状态、性质"], ["ence", "状态、性质"],
  ["arian", "相关的人或事物"], ["ician", "从事……的人"], ["ment", "动作或结果"],
  ["ness", "性质、状态"], ["ship", "身份、关系"], ["tion", "动作或结果"],
  ["sion", "动作或结果"], ["ward", "朝……方向"], ["less", "没有……的"],
  ["ful", "充满……的"], ["ical", "与……有关的"], ["ary", "与……有关的"],
  ["ory", "与……有关的"], ["ous", "具有……特征的"], ["ive", "有……倾向或作用的"],
  ["ant", "做……的人或物"], ["ent", "具有……性质的"], ["ist", "从事……的人"],
  ["ism", "思想、现象"], ["ity", "性质、状态"], ["ize", "使成为"], ["ify", "使成为"],
  ["ate", "使……、做……"], ["al", "与……有关的"], ["ic", "与……有关的"],
];

function cleanMeaning(value) {
  const pieces = String(value || "")
    .replace(/[；,，/]+/g, ";")
    .split(";")
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => englishBits[piece] || piece)
    .filter((piece) => !/[A-Za-z]/.test(piece));
  return [...new Set(pieces)].slice(0, 3).join("、");
}

function cleanGloss(value) {
  const cleaned = cleanMeaning(value) || String(value || "").trim();
  if (!cleaned || /[A-Za-z]{4}/.test(cleaned) || cleaned.length > 46 || /愿你|乌鸦脚长/.test(cleaned)) return "";
  return cleaned.replace(/([、，])\1+/g, "$1").replace(/(.{1,5})(、\1)+/g, "$1");
}

function editDistance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

function differenceCue(target, other) {
  let left = 0;
  while (left < target.length && left < other.length && target[left] === other[left]) left += 1;
  let right = 0;
  while (right < target.length - left && right < other.length - left
    && target[target.length - 1 - right] === other[other.length - 1 - right]) right += 1;
  const a = target.slice(left, Math.max(left + 1, target.length - right)) || target;
  const b = other.slice(left, Math.max(left + 1, other.length - right)) || other;
  return `${a} ↔ ${b}`;
}

function confusionHook(word) {
  const candidates = (word.confusions || [])
    .map((name) => ({ name, record: wordByName.get(name.toLowerCase()) }))
    .filter((item) => item.record)
    .sort((a, b) => editDistance(word.word, a.name) - editDistance(word.word, b.name));
  if (!candidates.length) return null;
  const other = candidates[0];
  return ["形近对照", `${word.word} 是“${word.core}”，${other.name} 是“${other.record.core}”；把差异位 ${differenceCue(word.word, other.name)} 当成判别开关，先判义再落字母。`];
}

function spellingHook(word) {
  const lower = word.word.toLowerCase();
  const doubled = lower.match(/([a-z])\1/);
  const rare = lower.match(/(ght|tch|dge|ph|rh|wr|kn|mn|ps|qu|tion|sion|eau|ough)/);
  if (doubled) return ["拼写定位", `${word.word} 的专属落点是双写 ${doubled[0]}；把这对字母当成“${word.core}”画面的两枚钉子，回忆时必须一起写出。`];
  if (rare) return ["拼写定位", `${word.word} 中最有辨识度的是 ${rare[0]}；看到这组字母就触发核心义“${word.core}”，其余字母按完整词形补齐。`];
  const frame = `${lower.slice(0, 2)}…${lower.slice(-2)}`;
  return ["整词场景", `${word.word} 没有可靠的可拆词根，不硬拆。用完整外框 ${frame} 绑定“${word.core}”，并在脑中放进一个具体的“${word.core}”场景。`];
}

function affixParts(lower, roots) {
  if (!roots.length) return [];
  const parts = [];
  const prefix = [...prefixes].sort((a, b) => b[0].length - a[0].length)
    .find(([form]) => lower.startsWith(form) && !roots.some((root) => root.form.startsWith(form)));
  const suffix = [...suffixes].sort((a, b) => b[0].length - a[0].length)
    .find(([form]) => lower.endsWith(form) && !roots.some((root) => root.form.endsWith(form)));
  if (prefix && lower.length - prefix[0].length >= 4) parts.push({ form: `${prefix[0]}-`, meaning: prefix[1], index: 0 });
  roots.forEach((root) => parts.push({ form: root.form, meaning: root.meaning, index: lower.indexOf(root.form) }));
  if (suffix && lower.length - suffix[0].length >= 3) parts.push({ form: `-${suffix[0]}`, meaning: suffix[1], index: lower.length - suffix[0].length });
  return parts.sort((a, b) => a.index - b.index)
    .filter((part, index, all) => !all.slice(0, index).some((seen) => seen.index === part.index && seen.form.length >= part.form.length));
}

function rootHook(word, record) {
  const roots = (record.r || [])
    .map(([form, loc, meaning]) => ({ form, loc, meaning: cleanMeaning(meaning) }))
    .filter((root) => root.form.length >= 2 && root.meaning && word.word.includes(root.form));
  const parts = affixParts(word.word, roots);
  if (parts.length < 2) return null;
  return ["词根链", `${parts.map((part) => `${part.form}（${part.meaning}）`).join(" + ")} → ${word.core}。`];
}

function historyHook(word, record) {
  if (!record.h) return null;
  const [language, form, rawGloss] = record.h;
  const gloss = cleanGloss(rawGloss);
  if (!gloss) return null;
  const source = form ? `${languages[language] || language || "早期形式"} ${form}` : "这个词的早期用法";
  if (gloss === word.core || gloss.includes(word.core) || word.core.includes(gloss)) {
    return ["词义沿革", `${source} 原本就表示“${gloss}”；词义基本没走样，用这条原义直接锁定 ${word.word}。`];
  }
  return ["词义沿革", `${source} 原指“${gloss}”，沿着“${gloss} → ${word.core}”的变化记住 ${word.word}。`];
}

function familyHook(word, record) {
  const allowed = new Set([
    "resemblance:resemble", "deceit:deceive", "spectacular:spectacle", "boundary:bound",
    "transit:transient", "instantaneous:instant", "saucer:sauce", "underlying:underlie",
    "capture:captive", "adventure:venture",
  ]);
  const related = (record.x || [])
    .map((name) => wordByName.get(String(name).toLowerCase()))
    .filter((item) => item && item.word !== word.word && allowed.has(`${word.word}:${item.word}`))
    .sort((a, b) => editDistance(word.word, a.word) - editDistance(word.word, b.word))[0];
  if (!related) return null;
  return ["同族挂钩", `${word.word} 可与 ${related.word}（${related.core}）放在同一词族里对照；保留共同词形，同时把 ${word.word} 单独落到“${word.core}”。`];
}

function buildHook(word) {
  if (manual[word.word]) return { kind: manual[word.word][0], text: manual[word.word][1], basis: "manual" };
  const record = evidence[word.word] || {};
  const root = rootHook(word, record);
  const history = historyHook(word, record);
  const family = familyHook(word, record);
  const confusion = confusionHook(word);
  const selected = history || root || confusion || family || spellingHook(word);
  const basis = history === selected ? "history" : root === selected ? "morpheme"
    : family === selected ? "family" : confusion === selected ? "confusion" : "spelling";
  return { kind: selected[0], text: selected[1], basis };
}

if (!Array.isArray(words) || words.length !== 1800) throw new Error(`Expected 1800 words, received ${words?.length}`);
const hooks = [null, ...words.map(buildHook)];
const banned = /把词形分成|三秒扫一遍|记住开头|整词只回忆|先抓住.+再按词性/;
for (let index = 1; index < hooks.length; index += 1) {
  const hook = hooks[index];
  if (!hook || !hook.kind || !hook.text || hook.text.length < 20 || banned.test(hook.text)) {
    throw new Error(`Memory hook validation failed for ${words[index - 1].word}`);
  }
}
const counts = hooks.slice(1).reduce((result, hook) => {
  result[hook.basis] = (result[hook.basis] || 0) + 1;
  return result;
}, {});
const output = `/* Generated from word-specific morphology, word history, families and spelling evidence. */\nwindow.WORD_MEMORY_HOOKS=${JSON.stringify(hooks)};\n`;
fs.writeFileSync(path.join(projectRoot, "data/memory-hooks.js"), output);
console.log(`Generated ${hooks.length - 1} word-specific hooks: ${JSON.stringify(counts)}`);
