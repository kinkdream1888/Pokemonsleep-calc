// ========== 数据定义 ==========
const ENERGY_MONS_DATA = {
    "电龙":    { prob_f: 0.130, e_f: 152.3, prob_s: 0.047, e_b: 143, e_s: 6858 },
    "树才怪":  { prob_f: 0.217, e_f: 128.9, prob_s: 0.072, e_b: 143, e_s: 6858 },
    "太阳伊布": { prob_f: 0.164, e_f: 114.8, prob_s: 0.044, e_b: 143, e_s: 6858 },
    "音波龙":  { prob_f: 0.195, e_f: 105.4, prob_s: 0.048, e_b: 143, e_s: 6858 },
};
const BERRY_BOOST_MONS_DATA = {
    "蜥蜴王":  { prob_f: 0.107, e_f: 140.5, prob_s: 0.030, e_b: 143, e_s: 50 },
    "勇士雄鹰": { prob_f: 0.121, e_f: 120.7, prob_s: 0.035, e_b: 143, e_s: 50 },
    "谜拟Q":   { prob_f: 0.153, e_f: 105.4, prob_s: 0.035, e_b: 143, e_s: 50 },
};
const LEGENDARY_MONS_DATA = {
    "拉帝欧斯": { 
        displayName: "拉帝欧斯 流星群（树果遽增）",
        prob_f: 0.198, e_f: 128.9, prob_s: 0.030, e_b: 192, e_s: 78, e_s_is_berry: true 
    },
    "克雷色利亚": { 
        displayName: "克雷色利亚 新月祈祷（活力全体疗愈S）",
        unfinished: true 
    },
};
const PHANTOM_MONS_DATA = {
    "达克莱伊": { 
        displayName: "达克莱伊 梦魇（能量填充M）",
        unfinished: true 
    },
};

const HYBRID_FOOD_MONS_DATA = {
    "古月鸟": { 
        interval: 2700, prob_f: 0.165, avg_food: 4.667, prob_s: 0.039,
        food_rival: "毒骷蛙", skill_rival: "咚咚鼠", sleep_coef: 0.8276,
    },
    "老翁龙": { 
        interval: 3500, prob_f: 0.294, avg_food: 4.667, prob_s: 0.046,
        food_rival: "隆隆岩", skill_rival: "咚咚鼠", sleep_coef: 0.8402,
    },
};

const EXPERT_GRAD_DATA = {
    "毒骷蛙": { food: 123.04, desc: "帮M+食概M+性格帮" },
    "隆隆岩": { food: 164.99, desc: "帮M+食概M+性格帮" },
    "咚咚鼠": { skill: 7.23, skill_sleep: 6.34, desc: "帮M+技概M+性格帮" },
};

const REALISTIC_COEFF = {
    "电龙": 0.92, "树才怪": 0.90, "太阳伊布": 0.92, "音波龙": 0.92,
    "蜥蜴王": 0.95, "勇士雄鹰": 0.94, "谜拟Q": 0.94,
    "拉帝欧斯": 0.93, "古月鸟": 0.88, "老翁龙": 0.88,
    // 克雷色利亚、达克莱伊暂用默认
};
const DEFAULT_REALISTIC_COEFF = 0.92;
const SKILL_TYPE_REALISTIC_COEFF = 0.90;

const SUB_SKILLS = {
    "帮M":    { speed: 0.14, skill: 1.0, food: 1.0, berry: 1 },
    "帮S":    { speed: 0.07, skill: 1.0, food: 1.0, berry: 1 },
    "帮手奖励": { speed: 0.05, skill: 1.0, food: 1.0, berry: 1 },
    "技概M":  { speed: 0.0,  skill: 1.36, food: 1.0, berry: 1 },
    "技概S":  { speed: 0.0,  skill: 1.18, food: 1.0, berry: 1 },
    "食概M":  { speed: 0.0,  skill: 1.0,  food: 1.36, berry: 1 },
    "食概S":  { speed: 0.0,  skill: 1.0,  food: 1.18, berry: 1 },
    "树果S":  { speed: 0.0,  skill: 1.0,  food: 1.0,  berry: 2 },
};
const MAX_SUB_SPEED = 0.35;

const NATURES = {
    "坦率":  { speed: 1.0, skill: 1.0, food: 1.0 },
    "怕寂寞": { speed: 1/0.9, skill: 1.0, food: 1.0 },
    "勇敢":  { speed: 1/0.9, skill: 1.0, food: 1.0 },
    "顽皮":  { speed: 1/0.9, skill: 0.8,  food: 1.0 },
    "固执":  { speed: 1/0.9, skill: 1.0,  food: 0.8 },
    "慢吞吞": { speed: 1.0, skill: 1.0, food: 1.2 },
    "冷静":  { speed: 1.0, skill: 1.0, food: 1.2 },
    "内敛":  { speed: 1/1.075, skill: 1.0, food: 1.2 },
    "马虎":  { speed: 1.0, skill: 0.8,  food: 1.2 },
    "自大":  { speed: 1.0, skill: 1.2, food: 1.0 },
    "慎重":  { speed: 1.0, skill: 1.2, food: 0.8 },
    "温顺":  { speed: 1.0, skill: 1.2, food: 1.0 },
    "温和":  { speed: 1/1.075, skill: 1.2, food: 1.0 },
};
