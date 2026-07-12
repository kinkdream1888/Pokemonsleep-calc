// ========== 数据定义 ==========
const ENERGY_MONS_DATA = {
    "电龙":    { prob_f: 0.130, e_f: 536.7, prob_s: 0.047, e_b: 137, e_s: 6858,
                 skillLevels: [880, 1251, 1726, 2383, 3290, 4546, 6858], element: "电",
                 skillLabel: "能量填充M" },
    "树才怪":  { prob_f: 0.217, e_f: 466.7, prob_s: 0.072, e_b: 165, e_s: 6858,
                 skillLevels: [880, 1251, 1726, 2383, 3290, 4546, 6858], element: "岩石",
                 skillLabel: "能量填充M" },
    "太阳伊布": { prob_f: 0.164, e_f: 228.7, prob_s: 0.044, e_b: 143, e_s: 6858,
                 skillLevels: [880, 1251, 1726, 2383, 3290, 4546, 6858], element: "超能力",
                 skillLabel: "能量填充M" },
    "音波龙":  { prob_f: 0.195, e_f: 420.0, prob_s: 0.048, e_b: 192, e_s: 6858,
                 skillLevels: [880, 1251, 1726, 2383, 3290, 4546, 6858], element: "龙",
                 skillLabel: "能量填充M" },
};
const BERRY_BOOST_MONS_DATA = {
    "蜥蜴王":  { prob_f: 0.107, e_f: 471.3, prob_s: 0.030, e_b: 165, e_s: 50,
                 skillLevels: [15, 22, 29, 36, 43, 50], element: "草",
                 skillLabel: "树果遽增", interval: 2300 },
    "勇士雄鹰": { prob_f: 0.121, e_f: 466.7, prob_s: 0.035, e_b: 132, e_s: 50,
                 skillLevels: [15, 22, 29, 36, 43, 50], element: "飞行",
                 skillLabel: "树果遽增", interval: 2400 },
    "谜拟Q":   { prob_f: 0.153, e_f: 357.0, prob_s: 0.035, e_b: 143, e_s: 41,
                 skillLevels: [12, 18, 23, 29, 35, 41], element: "幽灵",
                 skillLabel: "画皮（树果遽增）", interval: 2500,
                 critRate: 0.185, critMultiplier: 3 },
};
const LEGENDARY_MONS_DATA = {
    "拉帝欧斯": { prob_f: 0.198, e_f: 256.6, prob_s: 0.030, e_b: 192, e_s: 78, e_s_is_berry: true,
                 skillLevels: [28, 41, 53, 65, 73, 78], skillLabel: "流星群（树果遽增）", pity: 63, element: "龙" },
    "克雷色利亚": { prob_f: 0.239, e_f: 254.3, prob_s: 0.041, e_b: 143, e_s: 68, e_s_is_berry: true,
                 skillLevels: [22, 31, 40, 49, 58, 68], skillLabel: "新月祈祷（活力全体疗愈S）", pity: 62, element: "超能力" },
    "雷公": { unfinished: true, skillLabel: "帮手加速", element: "电" },
    "炎帝": { unfinished: true, skillLabel: "帮手加速", element: "火" },
    "水君": { unfinished: true, skillLabel: "帮手加速", element: "水" },
};
const PHANTOM_MONS_DATA = {
    "达克莱伊": { prob_f: 0.192, e_f: 459.0, prob_s: 0.03345, e_b: 170, e_s: 18515, e_s_is_berry: false,
                 skillLevels: [2620, 3753, 5178, 7149, 9870, 13638, 18515],
                 skillLabel: "梦魇（能量填充M）", pity: 49, sleep_coef: 0.951, realistic_coef: 0.86,
                 berry_count: 2, food_dist: [2,3,4], element: "恶" },
};
const HYBRID_FOOD_MONS_DATA = {
    "古月鸟": { interval: 2700, prob_f: 0.165, avg_food: 4.667, prob_s: 0.039,
                 food_rival: "毒骷蛙", skill_rival: "咚咚鼠", sleep_coef: 0.8276,
                 skillLabel: "料理成功S", e_f: 564.7, e_b: 132, skillLevels: [4, 5, 6, 7, 8, 10], element: "飞行" },
    "老翁龙": { interval: 3500, prob_f: 0.294, avg_food: 4.667, prob_s: 0.046,
                 food_rival: "隆隆岩", skill_rival: "咚咚鼠", sleep_coef: 0.8402,
                 skillLabel: "料理成功S", e_f: 466.7, e_b: 192, skillLevels: [4, 5, 6, 7, 8, 10], element: "龙" },
    "大嘴娃": { unfinished: true, dropType: 1, skillLabel: "怪力钳（食材精选S）", element: "妖精" },
    "蝶结萌虻": { unfinished: true, dropType: 3, skillLabel: "食材精选S", element: "妖精" },
};
const SPECIAL_SKILL_MONS_DATA = {
    "穿山王": { unfinished: true, dropType: 1, skillLabel: "食材精选S", element: "地面" },
    "岩殿居蟹": { unfinished: true, dropType: 2, skillLabel: "食材精选S", element: "岩石" },
    "乌鸦头头": { unfinished: true, skillLabel: "超幸运（食材精选S）", element: "飞行" },
};

const EXPERT_GRAD_DATA = { /* 保持不变 */ };
const REALISTIC_COEFF = { /* 保持不变 */ };
const DEFAULT_REALISTIC_COEFF = 0.92;
const SKILL_TYPE_REALISTIC_COEFF = 0.90;
const SUB_SKILLS = { /* 保持不变 */ };
const MAX_SUB_SPEED = 0.35;
const NATURES = { /* 你之前整理的完整25个性格 */ };
