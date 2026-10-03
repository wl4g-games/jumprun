import { ENGLISH_QUESTION_BANK } from "./question-bank.en.js";

const question = (id, subject, prompt, options, answer, explanation) => Object.freeze({
  id,
  subject,
  prompt,
  options: Object.freeze(options),
  answer,
  explanation
});

export const QUESTION_BANK = Object.freeze([
  question("cn-01", "语文", "“春风又绿江南岸”中，“绿”字最妙的地方是什么？", ["说明江岸本来是绿色", "把颜色写成动作，写出春天到来的变化", "与“红”字押韵", "说明诗人喜欢绿色"], 1, "“绿”在这里活用为动词，让人看见春风吹过、江南渐绿的过程。"),
  question("cn-02", "语文", "“纸上得来终觉浅，绝知此事要躬行”最适合提醒我们什么？", ["读书没有用", "只要动手，不必思考", "知识要通过实践加深理解", "纸张太薄，不宜记录"], 2, "读书与实践并不冲突；诗句强调亲身实践能让理解更深。"),
  question("cn-03", "语文", "成语“釜底抽薪”讲的是哪一种解决问题的思路？", ["暂时掩盖现象", "找到并消除根本原因", "增加更多资源", "等待问题自行消失"], 1, "抽掉锅底的柴，水就不会继续沸腾，比喻从根源上解决问题。"),
  question("cn-04", "语文", "散文集《朝花夕拾》的作者是谁？", ["鲁迅", "老舍", "冰心", "朱自清"], 0, "《朝花夕拾》是鲁迅回忆童年、求学等经历的散文集。"),
  question("cn-05", "语文", "把“我断定他大概已经到家了”改得更准确，应选哪一句？", ["我断定他已经到家了", "我断定他大概可能到家了", "我估计他一定已经到家了", "我绝对猜测他到家了"], 0, "“断定”表示确定，与“大概”矛盾；删去“大概”后语意一致。"),
  question("cn-06", "语文", "“但愿人长久，千里共婵娟”中的“婵娟”指什么？", ["桂花", "月亮", "书信", "故乡"], 1, "这里的“婵娟”指美好的月亮，表达相隔千里仍共享月光的祝愿。"),
  question("cn-07", "语文", "“这座桥长约1200米，主跨径600米”主要使用了哪种说明方法？", ["打比方", "列数字", "作比较", "讲故事"], 1, "具体数字能准确说明桥的长度和跨度。"),
  question("cn-08", "语文", "“山重水复疑无路，柳暗花明又一村”常用来形容什么？", ["景色始终没有变化", "陷入困境后出现新的转机", "旅行一定会迷路", "村庄都建在柳树旁"], 1, "诗句既写景，也常比喻在看似无路时迎来希望和转机。"),
  question("cn-09", "语文", "下面哪一句标点使用正确？", ["老师问：“你准备好了吗？”", "老师问，“你准备好了吗”？", "老师问：“你准备好了吗”。", "老师问；“你准备好了吗？”"], 0, "提示语后用冒号，完整问句的问号放在引号内。"),
  question("cn-10", "语文", "“不以规矩，不能成方圆”中的“规矩”原本是什么？", ["两种画图工具", "两部古代法律", "两种乐器", "两位工匠的名字"], 0, "“规”用来画圆，“矩”用来画方，后来引申为规则与标准。"),
  question("cn-11", "语文", "贴春联时，上联末字通常是仄声，下联末字通常是什么声？", ["轻声", "儿化音", "平声", "必须同声"], 2, "传统对联常讲究“仄起平收”，下联末字通常用平声。"),
  question("cn-12", "语文", "“路旁的小树向我们招手”使用了哪种修辞？", ["排比", "拟人", "夸张", "反问"], 1, "“招手”是人的动作，句子把小树写得像人一样。"),
  question("cn-13", "语文", "“胸有成竹”最接近下面哪种状态？", ["行动前已有完整构思", "遇事完全凭运气", "只会模仿别人", "做完后才开始计划"], 0, "它来自画竹的故事，比喻做事前已经有成熟的计划。"),
  question("cn-14", "语文", "“己所不欲，勿施于人”体现的核心想法是什么？", ["凡事只考虑自己", "用同理心尊重他人", "别人必须服从自己", "不与任何人来往"], 1, "自己不愿承受的事，也不要强加给别人，是换位思考与尊重。"),
  question("cn-15", "语文", "“海内存知己，天涯若比邻”表达了怎样的友情？", ["朋友必须天天见面", "真挚友情不受距离阻隔", "远方没有真正朋友", "只有邻居能成为朋友"], 1, "即使远隔天涯，知心朋友也仿佛近在身边。"),
  question("cn-16", "语文", "下面哪一句最简洁，没有重复表达？", ["他忍不住不禁笑了起来", "这件事大约需要三小时左右", "我们必须及时解决问题", "我亲眼目睹看见了比赛"], 2, "其余三句分别存在“忍不住/不禁”“大约/左右”“目睹/看见”的重复。"),
  question("cn-17", "语文", "“一鼓作气，再而衰，三而竭”提醒我们做事要怎样？", ["抓住时机，保持旺盛劲头", "每件事必须做三次", "越拖延效果越好", "只靠声音鼓舞自己"], 0, "气势会随反复拖延而减弱，因此应抓住好时机一气呵成。"),
  question("cn-18", "语文", "“亡羊补牢”给人的主要启示是什么？", ["损失发生后不必处理", "发现问题及时补救仍有价值", "羊圈越大越安全", "错误只能提前避免"], 1, "犯错或受损后及时查因补救，可以防止更大的损失。"),
  question("cn-19", "语文", "下面哪一句主要陈述事实，而不是表达观点？", ["这部电影是今年最好看的", "珠穆朗玛峰海拔超过八千米", "夏天比冬天可爱多了", "蓝色是最舒服的颜色"], 1, "海拔可以测量验证；其余句子都带有个人评价。"),
  question("cn-20", "语文", "小林观察到：清晨牵牛花开放，中午花瓣合拢；连续三天都是如此。他最合理的下一步是什么？", ["立刻断定所有花都这样", "记录光照、温度等条件继续观察", "把三天记录删掉", "只挑符合想法的数据"], 1, "继续记录相关条件，才能寻找规律并避免由少量观察过早下结论。"),

  question("ma-01", "数学", "一件120元的书包打八折，实际要付多少元？", ["24元", "96元", "100元", "108元"], 1, "八折就是原价的80%，120×0.8＝96。"),
  question("ma-02", "数学", "地图比例尺是1∶100000，图上3厘米代表实际多远？", ["300米", "3千米", "30千米", "300千米"], 1, "3厘米×100000＝300000厘米＝3千米。"),
  question("ma-03", "数学", "骑行者前30分钟行了9千米，保持同样速度，2小时可行多少千米？", ["18千米", "27千米", "36千米", "45千米"], 2, "2小时包含4个30分钟，所以路程是9×4＝36千米。"),
  question("ma-04", "数学", "水壶里有3/4升水，喝掉其中的1/3，还剩多少升？", ["1/4升", "1/2升", "2/3升", "3/4升"], 1, "喝掉的是3/4×1/3＝1/4升，剩3/4－1/4＝1/2升。"),
  question("ma-05", "数学", "直径为10厘米的圆，取π≈3.14，它的面积是多少？", ["31.4平方厘米", "62.8平方厘米", "78.5平方厘米", "314平方厘米"], 2, "半径是5厘米，面积为3.14×5²＝78.5平方厘米。"),
  question("ma-06", "数学", "掷一枚普通六面骰子，掷出质数的概率是多少？", ["1/6", "1/3", "1/2", "2/3"], 2, "1到6中的质数是2、3、5，共3个，概率是3/6＝1/2。"),
  question("ma-07", "数学", "四次测量值为8、9、9、14，它们的平均数是多少？", ["9", "10", "11", "12"], 1, "总和40除以4，平均数是10；14也会拉高平均数。"),
  question("ma-08", "数学", "解方程：3x＋5＝20，x等于多少？", ["3", "5", "8", "15"], 1, "先减5得3x＝15，再除以3得x＝5。"),
  question("ma-09", "数学", "清晨气温为－3℃，中午升高8℃，中午是多少℃？", ["－11℃", "－5℃", "5℃", "11℃"], 2, "－3＋8＝5，所以中午是5℃。"),
  question("ma-10", "数学", "三角形两个内角分别是48°和67°，第三个角是多少？", ["55°", "65°", "75°", "115°"], 1, "三角形内角和180°，第三角是180－48－67＝65°。"),
  question("ma-11", "数学", "12和18的最小公倍数是多少？", ["6", "24", "36", "72"], 2, "12＝2²×3，18＝2×3²，最小公倍数是2²×3²＝36。"),
  question("ma-12", "数学", "数列2、6、12、20、30的下一个数是多少？", ["36", "40", "42", "44"], 2, "相邻差依次为4、6、8、10，下一次加12，得到42。"),
  question("ma-13", "数学", "甲单独6小时完成任务，乙单独3小时完成。两人合作需要多久？", ["1小时", "2小时", "3小时", "4.5小时"], 1, "每小时合做1/6＋1/3＝1/2项任务，所以2小时完成。"),
  question("ma-14", "数学", "某班40人中有14人步行上学，步行人数占全班多少？", ["25%", "30%", "35%", "40%"], 2, "14÷40＝0.35＝35%。"),
  question("ma-15", "数学", "棱长4厘米的正方体，体积是多少？", ["16立方厘米", "32立方厘米", "48立方厘米", "64立方厘米"], 3, "正方体体积是棱长的三次方：4³＝64。"),
  question("ma-16", "数学", "点A(－2, 3)向右平移5个单位后坐标是什么？", ["(－7, 3)", "(3, 3)", "(－2, 8)", "(5, 3)"], 1, "向右只增加横坐标：－2＋5＝3，纵坐标不变。"),
  question("ma-17", "数学", "做4人份果汁需要6个橙子，按相同比例做10人份需要几个？", ["12个", "15个", "16个", "24个"], 1, "每人份需要6÷4＝1.5个，10人份需要15个。"),
  question("ma-18", "数学", "把500元存一年，年利率2%（不计复利），一年利息是多少？", ["2元", "5元", "10元", "20元"], 2, "利息＝本金×利率＝500×2%＝10元。"),
  question("ma-19", "数学", "数据2、3、3、4、20中，哪个统计量更能代表多数数据的水平？", ["平均数6.4", "中位数3", "最大值20", "极差18"], 1, "20是离群值，会拉高平均数；中位数3更接近多数数据。"),
  question("ma-20", "数学", "直角三角形两条直角边长3和4，斜边长多少？", ["5", "6", "7", "12"], 0, "根据勾股定理，3²＋4²＝25＝5²。"),

  question("en-01", "英语", "Choose the correct word: I have lived here ___ three years.", ["since", "for", "from", "at"], 1, "“For” is used with a length of time; “since” is used with a starting point."),
  question("en-02", "英语", "Which sentence is correct?", ["There are less apples today.", "There are fewer apples today.", "There is fewer water today.", "There are little apples today."], 1, "Use “fewer” with countable plural nouns such as apples."),
  question("en-03", "英语", "At a new club, a game helps everyone “break the ice”. What does it do?", ["It makes the room colder.", "It helps people start talking comfortably.", "It breaks a real block of ice.", "It ends the meeting."], 1, "“Break the ice” means to make a first social situation feel more relaxed."),
  question("en-04", "英语", "A sign says “Keep off the grass.” What should you do?", ["Water the grass.", "Do not walk on the grass.", "Cut the grass.", "Sit on the grass."], 1, "“Keep off” means stay away from or do not step onto something."),
  question("en-05", "英语", "Choose the best sentence for an unfinished experience.", ["I visit Beijing twice.", "I visited Beijing tomorrow.", "I have visited Beijing twice.", "I am visit Beijing twice."], 2, "The present perfect describes life experience without a finished past time."),
  question("en-06", "英语", "Which word is closest in meaning to “tiny”?", ["huge", "very small", "noisy", "ancient"], 1, "“Tiny” means extremely small."),
  question("en-07", "英语", "The prefix “re-” in “recycle” and “rewrite” usually means what?", ["again", "before", "without", "under"], 0, "“Re-” commonly means again or back, as in rewrite—write again."),
  question("en-08", "英语", "Complete the sentence: A train is usually ___ than a bicycle.", ["fast", "fastest", "faster", "more fast"], 2, "Use the comparative form “faster” when comparing two things."),
  question("en-09", "英语", "Complete the real future condition: If it rains tomorrow, we ___ indoors.", ["stayed", "stay yesterday", "will stay", "would stayed"], 2, "In a likely future condition, use present tense after “if” and “will” in the result."),
  question("en-10", "英语", "Choose the correct word: The students put ___ books on the shelf.", ["there", "their", "they're", "them"], 1, "“Their” is the possessive form showing the books belong to the students."),
  question("en-11", "英语", "Mia took an umbrella, although the sky was clear. Later, dark clouds arrived. What can we infer?", ["Mia checked the forecast or expected rain.", "Mia dislikes umbrellas.", "It was already raining at first.", "The umbrella caused the clouds."], 0, "Taking an umbrella before clouds arrive suggests she expected possible rain."),
  question("en-12", "英语", "What does “You mustn't touch that wire” mean?", ["You do not need to touch it.", "You are not allowed to touch it.", "You touched it yesterday.", "You should touch it carefully."], 1, "“Mustn't” expresses prohibition, not a lack of necessity."),
  question("en-13", "英语", "Which is the most polite request?", ["Give me your ruler.", "You give ruler now.", "Could I borrow your ruler, please?", "I want that ruler."], 2, "“Could I…please?” is a polite way to ask permission."),
  question("en-14", "英语", "A curious student is someone who…", ["never asks questions", "wants to learn and know more", "is always tired", "already knows everything"], 1, "“Curious” describes a strong wish to discover or understand things."),
  question("en-15", "英语", "What is the past tense of “teach”?", ["teached", "taught", "teach", "thought"], 1, "“Teach” is irregular: teach—taught—taught."),
  question("en-16", "英语", "Choose the correct sentence.", ["The news are surprising.", "The news is surprising.", "The news be surprising.", "The news were surprise."], 1, "“News” ends in -s but is treated as an uncountable singular noun."),
  question("en-17", "英语", "If you “look up” a new word, what do you do?", ["Look toward the ceiling.", "Search for its meaning in a reference.", "Write it upside down.", "Forget it immediately."], 1, "To “look up” information is to search for it in a dictionary or another source."),
  question("en-18", "英语", "Where does “usually” best go?", ["Lena walks usually to school.", "Usually Lena walks to school always.", "Lena usually walks to school.", "Lena walks to usually school."], 2, "An adverb of frequency normally comes before the main verb."),
  question("en-19", "英语", "Choose the best connector: ___ the puzzle was difficult, Kai kept trying.", ["Because", "Although", "So", "Unless"], 1, "“Although” introduces a contrast between difficulty and continued effort."),
  question("en-20", "英语", "Which email subject is clearest for asking a teacher about Monday's science homework?", ["Hello", "Important!!!", "Question about Monday's science homework", "Read this"], 2, "A useful subject line briefly and specifically tells the reader what the email is about."),

  question("ge-01", "地理", "地球上昼夜交替主要是由什么造成的？", ["地球自转", "地球公转", "月球公转", "太阳自转"], 0, "地球约24小时自转一周，不同地区依次朝向和背向太阳。"),
  question("ge-02", "地理", "地球四季变化的主要原因是什么？", ["地球每天自转", "地轴倾斜且地球绕太阳公转", "地球与月球距离变化", "太阳每天升落"], 1, "地轴倾斜使各地在公转过程中获得的太阳高度与昼长发生周期变化。"),
  question("ge-03", "地理", "在等高线地形图上，等高线越密集通常表示什么？", ["坡度越陡", "地势越平", "一定有河流", "海拔一定低"], 0, "相同水平距离内高度变化越大，等高线越密，坡度也越陡。"),
  question("ge-04", "地理", "许多早期城市为什么形成在河流附近？", ["河边永远没有灾害", "便于取水、灌溉和运输", "河边一定更寒冷", "那里没有野生动物"], 1, "河流能提供生活生产用水、肥沃冲积土和交通条件，但也可能有洪水风险。"),
  question("ge-05", "地理", "夏季风从海洋吹向陆地时，常给沿海地区带来什么？", ["较多水汽和降水", "永久冰冻", "极昼现象", "地震活动"], 0, "海洋上蒸发的水汽被风带到陆地，遇到抬升冷却后容易形成降水。"),
  question("ge-06", "地理", "通常情况下，同一时刻越向东，地方时会怎样？", ["越早", "越晚", "完全相同", "随机变化"], 0, "地球自西向东转，东边的地区更早迎来太阳，因此地方时通常更早。"),
  question("ge-07", "地理", "其他条件相近时，从赤道向两极气温总体下降，主要因为？", ["纬度越高获得的太阳能量越分散", "两极离月球更近", "赤道海拔最高", "高纬度没有空气"], 0, "高纬度太阳高度较低，同样能量分布在更大面积，穿过大气的路径也更长。"),
  question("ge-08", "地理", "板块交界地带为什么常发生地震？", ["云层在那里相撞", "板块运动积累并突然释放能量", "海水每天涨落", "太阳光更强"], 1, "板块挤压、张裂或错动时应力积累，岩层突然破裂会释放地震波。"),
  question("ge-09", "地理", "沙漠中的绿洲能发展农业，最关键的自然条件通常是什么？", ["稳定水源", "昼夜一样长", "没有风", "遍地黑土"], 0, "在极干旱环境中，地下水、泉水或河流提供的水是绿洲农业的关键。"),
  question("ge-10", "地理", "保护热带雨林除了保护动物，还能带来什么重要作用？", ["增加荒漠面积", "储存碳并调节水循环", "让全球停止刮风", "消除所有病虫害"], 1, "森林能固定大量碳、蒸腾水分、保持土壤并支持复杂生态系统。"),
  question("ge-11", "地理", "中国地势总体“西高东低”，对许多大河流向有什么影响？", ["多由东向西流", "多由西向东流", "全部流向北方", "河流不会入海"], 1, "地表水受重力影响从高处流向低处，所以许多大河自西向东入海。"),
  question("ge-12", "地理", "秦岭—淮河一线常被看作中国哪两大区域的重要分界？", ["南方与北方", "东部与西部", "季风区与所有非季风区", "沿海与内陆"], 0, "它附近与1月0℃等温线、800毫米年等降水量线大致相近，是南北方重要界线。"),
  question("ge-13", "地理", "青藏高原纬度不算特别高却气候寒冷，主要因为？", ["距海太近", "海拔很高", "森林太多", "昼夜不交替"], 1, "对流层中海拔越高气温通常越低，青藏高原平均海拔超过4000米。"),
  question("ge-14", "地理", "城市中心夜间常比郊区暖，这种“热岛效应”与什么有关？", ["建筑路面储热且绿地较少", "城市离太阳更近", "郊区没有空气", "城市自转更快"], 0, "混凝土和沥青易吸热储热，植被少、废热多也会加强城市热岛。"),
  question("ge-15", "地理", "海洋潮汐最主要受哪个天体的引力影响？", ["火星", "月球", "金星", "北极星"], 1, "月球离地球近，它的引力差是地球潮汐的主要来源，太阳也有影响。"),
  question("ge-16", "地理", "晴朗白天的海边，近地面风常从海面吹向陆地，原因是？", ["陆地升温快，热空气上升", "海水突然消失", "月球把风拉向岸边", "陆地比海洋冷得慢"], 0, "白天陆地升温较快，近地面气压相对低，较凉的海风便吹向陆地。"),
  question("ge-17", "地理", "在河流上游大量种树、保护湿地，可能给下游带来什么好处？", ["减少水土流失并调蓄洪水", "让河流立即干涸", "增加泥沙淤积", "使海水变甜"], 0, "植被和湿地能拦截泥沙、减缓径流，让一部分雨水缓慢释放。"),
  question("ge-18", "地理", "日照强、晴天多的高原或荒漠地区，更适合重点开发哪种能源？", ["太阳能", "潮汐能", "木柴", "泥炭"], 0, "丰富而稳定的太阳辐射适合建设光伏或光热设施。"),
  question("ge-19", "地理", "比例尺1∶50000的地图上，两地相距4厘米，实际距离是多少？", ["200米", "2千米", "20千米", "200千米"], 1, "4×50000＝200000厘米＝2千米。"),
  question("ge-20", "地理", "北斗卫星导航系统最直接能帮助我们做什么？", ["测量体温", "确定位置并规划路线", "预测所有地震", "改变天气"], 1, "卫星导航通过测距计算位置，可用于导航、测绘、授时等。"),

  question("ph-01", "物理", "汽车突然刹车时，人会向前倾。安全带主要防止哪种现象带来的伤害？", ["惯性", "浮力", "蒸发", "折射"], 0, "人体会因惯性保持原来的运动状态，安全带提供力使人随车减速。"),
  question("ph-02", "物理", "运动鞋底做出凹凸花纹，主要目的是什么？", ["减小重力", "增大摩擦", "增加质量", "降低气温"], 1, "花纹能改善接触并排开水，通常可增大鞋底与地面的摩擦。"),
  question("ph-03", "物理", "雪地鞋做得又宽又大，为什么不容易陷进雪里？", ["减小受力面积", "增大对雪的压强", "增大受力面积，减小压强", "让人的重力消失"], 2, "压力近似不变时，受力面积增大，压强会减小。"),
  question("ph-04", "物理", "钢铁制成的轮船能浮在水面，关键原因是什么？", ["钢铁不受重力", "船的中空结构使平均密度小，并排开足够多的水", "海水没有质量", "发动机一直向上推"], 1, "中空船体让整体平均密度降低，排水产生的浮力可平衡重力。"),
  question("ph-05", "物理", "如果把正在响的闹钟放进逐渐抽成真空的罩子，声音会怎样？", ["越来越清楚", "越来越弱", "音调无限升高", "完全不变"], 1, "声音传播需要介质；空气越来越少，传到罩外的声音就越来越弱。"),
  question("ph-06", "物理", "我们能在平面镜中看到自己，主要利用了光的什么规律？", ["反射", "蒸发", "惯性", "磁化"], 0, "来自人的光在镜面反射后进入眼睛，形成镜中虚像。"),
  question("ph-07", "物理", "筷子斜插入水中，看起来像“折断”了，这是因为？", ["光从水进入空气时发生折射", "筷子真的变弯", "水产生磁场", "光只沿曲线传播"], 0, "光在水和空气中的传播方向发生改变，眼睛按直线反推位置而产生错觉。"),
  question("ph-08", "物理", "两只相同灯泡串联在电池上，取下一只后，另一只通常会怎样？", ["更亮", "继续一样亮", "熄灭", "变成电池"], 2, "串联电路只有一条电流路径，取下一只会使电路断开。"),
  question("ph-09", "物理", "家庭照明灯通常采用并联，主要好处是什么？", ["一盏灯关闭时其他灯仍能工作", "所有灯只能同时开关", "电线可以完全不用", "灯泡不会消耗电能"], 0, "并联各支路相对独立，一条支路断开不会切断其他支路。"),
  question("ph-10", "物理", "电费账单中的“千瓦时（kWh）”是什么单位？", ["功率", "电能", "电流", "电压"], 1, "千瓦时＝功率×时间，是电能单位，1 kWh俗称1度电。"),
  question("ph-11", "物理", "跷跷板一边的人更重，怎样更容易保持平衡？", ["重的人靠近支点", "重的人远离支点", "两人都站到同一边", "去掉支点"], 0, "杠杆平衡与力和力臂的乘积有关，较大的力配较短的力臂。"),
  question("ph-12", "物理", "金属瓶盖拧不开时，用热水淋瓶盖往往更容易打开，主要因为？", ["金属受热膨胀", "热水让重力消失", "玻璃立刻缩小很多", "热水产生磁力"], 0, "瓶盖受热后会略微膨胀，内径增大，通常更容易拧开。"),
  question("ph-13", "物理", "热汤里的金属勺柄会慢慢变热，主要是哪种传热方式？", ["热传导", "光的反射", "声音传播", "机械运动"], 0, "热量沿金属从温度高的一端传向温度低的一端，这是热传导。"),
  question("ph-14", "物理", "运动后皮肤上的汗蒸发，会让人觉得凉快，为什么？", ["蒸发从皮肤吸收热量", "汗让体温计失效", "水没有温度", "空气停止运动"], 0, "能量较高的水分子离开液面时带走热量，皮肤温度因而下降。"),
  question("ph-15", "物理", "在水中加盐后，原本沉底的鸡蛋可能浮起，主要因为？", ["鸡蛋质量突然消失", "盐水密度增大，浮力变大", "盐水不受重力", "鸡蛋变成空心"], 1, "盐溶解后水的密度增加，同体积排开液体的重力更大，浮力增大。"),
  question("ph-16", "物理", "使用定滑轮升旗，最明显的好处是什么？", ["省一半的力", "改变用力方向", "让旗子没有重力", "不用绳子"], 1, "理想定滑轮不省力，但能改变力的方向，让人向下拉绳升旗。"),
  question("ph-17", "物理", "把两块条形磁铁的N极互相靠近，会怎样？", ["互相排斥", "互相吸引", "都失去磁性", "一定发光"], 0, "同名磁极相斥，异名磁极相吸。"),
  question("ph-18", "物理", "小车10秒走了50米，它的平均速度是多少？", ["0.2米/秒", "5米/秒", "40米/秒", "500米/秒"], 1, "平均速度＝路程÷时间＝50÷10＝5米/秒。"),
  question("ph-19", "物理", "过山车不启动发动机从高处下滑时，最主要的能量变化是什么？", ["重力势能转化为动能", "动能全部变成质量", "声能变成重力", "能量凭空产生"], 0, "高度降低时重力势能减少，速度增加使动能增大，同时有少量能量因摩擦转为内能。"),
  question("ph-20", "物理", "手电筒亮起时，主要能量转化过程是什么？", ["电池的化学能→电能→光能和内能", "光能→化学能→重力势能", "声能→电能", "能量没有转化"], 0, "电池把化学能转成电能，灯再把电能转化为光能和一部分内能。")
]);

export const QUESTION_SUBJECTS = Object.freeze(["语文", "数学", "英语", "地理", "物理"]);
const ENGLISH_QUESTIONS_BY_ID = new Map(ENGLISH_QUESTION_BANK.map((item) => [item.id, item]));

export function localizeQuestion(item, language) {
  if (language !== "en") return item;
  return ENGLISH_QUESTIONS_BY_ID.get(item.id) || item;
}

export function shuffledQuestions(random = Math.random) {
  const items = [...QUESTION_BANK];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
