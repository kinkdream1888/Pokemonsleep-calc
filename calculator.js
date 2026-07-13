// ========== 计算逻辑 ==========
function calcMultipliers(selectedSubs, nature, teamBoost = false) {
    let totalSubSpeed = 0.0;
    let skillAdd = 0.0;
    let foodAdd = 0.0;
    let berryMult = 1;

    for (let sub of selectedSubs) {
        let s = SUB_SKILLS[sub];
        let speedVal = (sub === '帮手奖励') ? (teamBoost ? 0.25 : 0.05) : s.speed;
        totalSubSpeed += speedVal;
        if (s.skill > 1.0) skillAdd += (s.skill - 1.0);
        if (s.food > 1.0) foodAdd += (s.food - 1.0);
        berryMult *= s.berry;
    }

    totalSubSpeed = Math.min(totalSubSpeed, MAX_SUB_SPEED);
    let subSpeedMult = totalSubSpeed < 1 ? 1 / (1 - totalSubSpeed) : 1.0;

    let natureInfo = NATURES[nature];
    let speedMult = subSpeedMult * natureInfo.speed;
    let skillMult = (1.0 + skillAdd) * natureInfo.skill;
    let foodMult = (1.0 + foodAdd) * natureInfo.food;

    return { speedMult, skillMult, foodMult, berryMult };
}

function calculateEnergy(data, M_h, M_p, M_f, berryMult) {
    let p_f = Math.min(data.prob_f * M_f, 1.0);
    let p_berry = 1.0 - p_f;
    let e_b = data.e_b, e_f = data.e_f;
    let skillEnergy = data.e_s_is_berry ? data.e_s * e_b : data.e_s;
    let berryPart = p_berry * berryMult * e_b;
    let foodPart = p_f * e_f;
    let skillPart = data.prob_s * M_p * skillEnergy;
    return M_h * (berryPart + foodPart + skillPart);
}

function compute(calcType, pokemonName, selectedSubs, nature, teamBoost, useRealistic) {
    let { speedMult: M_h, skillMult: M_p, foodMult: M_f, berryMult } = calcMultipliers(selectedSubs, nature, teamBoost);
    if (useRealistic) {
        if (calcType === '技能型') {
            M_p *= SKILL_TYPE_REALISTIC_COEFF;
        } else if (calcType === '能量填充M' || calcType === '树果遽增') {
            let coeff = REALISTIC_COEFF[pokemonName] || DEFAULT_REALISTIC_COEFF;
            M_p *= coeff;
        } else if (calcType === '传说宝可梦' || calcType === '幻兽') {
            let coeff = REALISTIC_COEFF[pokemonName] || DEFAULT_REALISTIC_COEFF;
            M_p *= coeff;
        }
    }
    let total, improve;
    if (calcType === '树果型') {
        let berryBoost = selectedSubs.includes('树果S') ? 1.5 : 1.0;
        total = M_h * berryBoost;
        improve = (total - 1) * 100;
    } else if (calcType === '食材型') {
        total = M_h * M_f;
        improve = (total - 1) * 100;
    } else if (calcType === '技能型') {
        total = M_h * M_p;
        improve = (total - 1) * 100;
    } else if (calcType === '树果遽增' && pokemonName === '谜拟Q') {
        let data = BERRY_BOOST_MONS_DATA['谜拟Q'];
        let baseInterval = data.interval * 0.862 * 0.45;
        let baseHelps = 86400 / baseInterval;

        let dailyHelpsBase = baseHelps * 1.0;
        let skillProbBase = data.prob_s * 1.0;
        let dailySkillBase = dailyHelpsBase * skillProbBase;
        let triggerBase = 1 - Math.pow(1 - data.critRate, dailySkillBase);
        let skillBerriesBase = data.e_s * (dailySkillBase + triggerBase * 2);

        let p_f_base = Math.min(data.prob_f * 1.0, 1.0);
        let berryPartBase = (1 - p_f_base) * 1 * data.e_b;
        let foodPartBase = p_f_base * data.e_f;
        let E_base = (86400 / baseInterval) * (berryPartBase + foodPartBase) + skillBerriesBase * data.e_b;

        let dailyHelpsCfg = baseHelps * M_h;
        let skillProbCfg = data.prob_s * M_p;
        let dailySkillCfg = dailyHelpsCfg * skillProbCfg;
        let triggerCfg = 1 - Math.pow(1 - data.critRate, dailySkillCfg);
        let skillBerriesCfg = data.e_s * (dailySkillCfg + triggerCfg * 2);

        let p_f_cfg = Math.min(data.prob_f * M_f, 1.0);
        let berryPartCfg = (1 - p_f_cfg) * berryMult * data.e_b;
        let foodPartCfg = p_f_cfg * data.e_f;
        let E_config = M_h * (86400 / baseInterval) * (berryPartCfg + foodPartCfg) + skillBerriesCfg * data.e_b;

        total = E_config / E_base;
        improve = (total - 1) * 100;
        return { total: total.toFixed(4), improve: improve.toFixed(2), M_h: M_h.toFixed(4), M_p: M_p.toFixed(4), M_f: M_f.toFixed(4) };

    } else if (calcType === '能量填充M' || calcType === '树果遽增' || calcType === '传说宝可梦' || calcType === '幻兽') {
        let dataObj;
        if (calcType === '能量填充M') dataObj = ENERGY_MONS_DATA[pokemonName];
        else if (calcType === '树果遽增') dataObj = BERRY_BOOST_MONS_DATA[pokemonName];
        else if (calcType === '传说宝可梦') dataObj = LEGENDARY_MONS_DATA[pokemonName];
        else if (calcType === '幻兽') dataObj = PHANTOM_MONS_DATA[pokemonName];
        
        if (dataObj.unfinished) {
            return { total: "数据待补全", improve: 0, M_h: M_h.toFixed(4), M_p: M_p.toFixed(4), M_f: M_f.toFixed(4) };
        }
        
        let data = { ...dataObj };
        if (calcType === '能量填充M') data.e_s_is_berry = false;
        else if (calcType === '树果遽增') data.e_s_is_berry = true;
        else {
            data.e_s_is_berry = data.e_s_is_berry !== undefined ? data.e_s_is_berry : false;
        }
        
        let E_base = calculateEnergy(data, 1.0, 1.0, 1.0, 1);
        let E_config = calculateEnergy(data, M_h, M_p, M_f, berryMult);
        total = E_config / E_base;
        improve = (total - 1) * 100;
    } else { total = 1; improve = 0; }
    return { total: typeof total === 'string' ? total : total.toFixed(4), improve: improve.toFixed ? improve.toFixed(2) : improve, M_h: M_h.toFixed(4), M_p: M_p.toFixed(4), M_f: M_f.toFixed(4) };
}

function computeHybridOutput(pokemonName, selectedSubs, nature, useRealistic) {
    let mon = HYBRID_FOOD_MONS_DATA[pokemonName];
    let baseInterval = mon.interval * 0.862;
    let actualInterval = baseInterval * 0.45;
    let baseHelps = 86400 / actualInterval;

    let { speedMult: M_h, foodMult: M_f, skillMult: M_p } = calcMultipliers(selectedSubs, nature, false);

    if (useRealistic) {
        let coeff = REALISTIC_COEFF[pokemonName] || 0.92;
        M_p *= coeff;
    }

    let dailyHelps = baseHelps * M_h;
    let foodProb = Math.min(mon.prob_f * M_f, 1.0);
    let foodCount = dailyHelps * foodProb * mon.avg_food;

    let skillProb = mon.prob_s * M_p;
    let skillCountNoSleep = dailyHelps * skillProb;
    let skillCountSleep = skillCountNoSleep * mon.sleep_coef;

    return {
        foodCount, skillNoSleep: skillCountNoSleep, skillSleep: skillCountSleep,
        M_h, M_f, M_p,
    };
}

function helperOverflowAnalysis(selectedSubs, lines) {
    let hasHelper = selectedSubs.includes('帮手奖励');
    if (hasHelper) {
        let baseSpeed = 0.0;
        if (selectedSubs.includes('帮M')) baseSpeed += 0.14;
        if (selectedSubs.includes('帮S')) baseSpeed += 0.07;
        let remaining = MAX_SUB_SPEED - baseSpeed;
        let maxHelpers = Math.floor(remaining / 0.05);
        let text = '※ 帮手奖励团队溢出分析：';
        if (maxHelpers >= 5) text += '即使5个帮手奖励也不会溢出35%上限。';
        else {
            let overflow5 = (baseSpeed + 0.25) - MAX_SUB_SPEED;
            if (overflow5 > 0) text += `5个帮手奖励将溢出${(overflow5*100).toFixed(1)}%帮速（超出${maxHelpers}个后溢出）。`;
            else text += `5个帮手奖励未溢出。`;
        }
        lines.push(text);
    }
}

// ========== 产能计算 ==========
const FOOD_ENERGY_DB = {
    "大葱": 185, "蘑菇": 167, "蛋": 115, "土豆": 124, "苹果": 90,
    "香草": 130, "肠": 103, "牛奶": 98, "蜂蜜": 101, "油": 121,
    "姜": 109, "番茄": 110, "可可": 151, "尾巴": 342, "大豆": 100,
    "玉米": 140, "咖啡": 153, "南瓜": 250, "酪梨": 162
};
const ALL_FOODS = Object.keys(FOOD_ENERGY_DB);

function computeExactAvgFoodEnergy() {
    let totalEnergy = 0;
    let count = 0;
    for (let i = 0; i < ALL_FOODS.length; i++) {
        for (let j = i + 1; j < ALL_FOODS.length; j++) {
            for (let k = j + 1; k < ALL_FOODS.length; k++) {
                totalEnergy += (FOOD_ENERGY_DB[ALL_FOODS[i]] + FOOD_ENERGY_DB[ALL_FOODS[j]] + FOOD_ENERGY_DB[ALL_FOODS[k]]) / 3;
                count++;
            }
        }
    }
    return totalEnergy / count;
}
const EXACT_AVG_FOOD_ENERGY = computeExactAvgFoodEnergy();

function getFoodEnergy(foodName) {
    return FOOD_ENERGY_DB[foodName] || EXACT_AVG_FOOD_ENERGY;
}

function getBaseHelps(mon) {
    if (!mon.interval) return 0;
    let baseInterval = mon.interval * 0.862 * 0.45;
    return 86400 / baseInterval;
}

function computeBerryProduction(mon, M_h, berryMult) {
    let dailyHelps = getBaseHelps(mon) * M_h;
    let berryCount = dailyHelps * (mon.berry_count || 2) * berryMult;
    let berryEnergy = berryCount * mon.e_b;
    return { count: berryCount, energy: berryEnergy };
}

function computeFoodProduction(mon, M_h, M_f) {
    let dailyHelps = getBaseHelps(mon) * M_h;
    let foodProb = Math.min(mon.prob_f * M_f, 1.0);
    let avgFood = mon.avg_food || 4.667;
    let foodCount = dailyHelps * foodProb * avgFood;
    let foodEnergy = foodCount * (mon.e_f / avgFood);
    return { count: foodCount, energy: foodEnergy };
}

function computeSkillCount(mon, M_h, M_p) {
    let dailyHelps = getBaseHelps(mon) * M_h;
    let skillProb = mon.prob_s * M_p;
    return dailyHelps * skillProb;
}

function computeSkillProduction(mon, M_h, M_p, level) {
    let skillCount = computeSkillCount(mon, M_h, M_p);
    let skillData = mon.skillLevels[level];
    let foodMap = {};
    if (!skillData) return { food: 0, energy: 0, details: [], foodMap: {}, perSkillDetail: '' };

    let totalFood, perSkillDetail = '', totalDetails = [];
    let isFoodGetS = mon.skillLabel && (mon.skillLabel.includes('食材获取S') || mon.skillLabel.includes('礼物·食材获取S') || mon.skillLabel.includes('料理辅助S')) && !mon.skillPool;
    let isFoodSelectS = mon.skillPool && mon.skillPool.items;
    let isCookSuccessS = mon.skillLabel && (mon.skillLabel.includes('料理成功S') || mon.skillLabel.includes('料理辅助S'));
    let isHeracross = mon.skillLabel && mon.skillLabel.includes('健美·料理辅助S');

    // 料理成功S（咚咚鼠、古月鸟、老翁龙等单纯加暴击，无食材）
    if (isCookSuccessS && !isFoodGetS && !isFoodSelectS) {
        let critValue = typeof skillData === 'object' ? (skillData.critRate || skillData) : skillData;
        if (typeof skillData === 'number') critValue = skillData;
        else if (typeof skillData === 'object' && skillData.food) critValue = skillData.critRate;
        let displayCrit = critValue < 1 ? (critValue * 100) : critValue;
        perSkillDetail = `料理漂亮成功的机率会提升${displayCrit}%`;
        let totalCritIncrease = skillCount * displayCrit;
        totalDetails.push(`漂亮成功率共提升${totalCritIncrease.toFixed(1)}%`);
        return { food: 0, energy: 0, details: totalDetails, foodMap, perSkillDetail };
    }

    // 赫拉克罗斯（食材+暴击）
    if (isHeracross) {
        totalFood = typeof skillData === 'object' ? skillData.food : skillData;
        let critRate = typeof skillData === 'object' ? skillData.critRate : 0;
        let displayCrit = critRate < 1 ? (critRate * 100).toFixed(0) : critRate;
        perSkillDetail = `随机获得${totalFood}个食材，并且料理漂亮成功的机率会提升${displayCrit}%`;
        let baseFood = skillCount * totalFood;
        let baseEnergy = baseFood * EXACT_AVG_FOOD_ENERGY;
        let totalCritIncrease = skillCount * critRate * 100;
        totalDetails.push(`获得食材${baseFood.toFixed(1)}个`);
        totalDetails.push(`漂亮成功率共提升${totalCritIncrease.toFixed(1)}%`);
        return { food: baseFood, energy: baseEnergy, details: totalDetails, foodMap, perSkillDetail };
    }

    // 普通食材获取S（水伊布、信使鸟、正电/颤弦、请假王等）
    if (isFoodGetS) {
        totalFood = typeof skillData === 'object' ? skillData.food : skillData;
        let desc = `随机获得${totalFood}个食材`;

        if (mon.skillLabel && mon.skillLabel.includes('礼物·食材获取S')) {
            let critRate = typeof skillData === 'object' && skillData.critRate ? skillData.critRate : 0;
            desc += `，有时额外获得4个糖果`;
        }
        if (typeof skillData === 'object' && skillData.bonus) {
            let bonusItem = mon.foodName;
            let bonusPerSkill = skillData.bonus;
            desc += `。满足特定条件时，会额外获得${bonusPerSkill}个${bonusItem}`;
        }
        perSkillDetail = desc;

        let baseFood = skillCount * totalFood;
        let baseEnergy = baseFood * EXACT_AVG_FOOD_ENERGY;
        let extraBonusFood = 0, extraBonusEnergy = 0;
        let bonusDesc = '';

        if (typeof skillData === 'object' && skillData.bonus) {
            let bonusItem = mon.foodName;
            let bonusCount = skillData.bonus * skillCount;
            extraBonusFood = bonusCount;
            extraBonusEnergy = bonusCount * getFoodEnergy(bonusItem);
            foodMap[bonusItem] = bonusCount;
            bonusDesc = `, 额外获得: ${bonusItem} ${bonusCount.toFixed(1)}个`;
        }

        let totalFoodOutput = baseFood + extraBonusFood;
        let totalEnergy = baseEnergy + extraBonusEnergy;
        totalDetails.push(`获得食材${totalFoodOutput.toFixed(1)}个${bonusDesc}`);

        if (mon.skillLabel && mon.skillLabel.includes('礼物·食材获取S')) {
            let critRate = typeof skillData === 'object' && skillData.critRate ? skillData.critRate : 0;
            let candyCount = skillCount * critRate * 4;
            totalDetails.push(`获得糖果${candyCount.toFixed(1)}个`);
        }

        return { food: totalFoodOutput, energy: totalEnergy, details: totalDetails, foodMap, perSkillDetail };
    }

    // 食材精选S（穿山王、岩殿居蟹、乌鸦头头、蝶结萌虻、大嘴娃等）
    if (isFoodSelectS) {
        let pool = mon.skillPool;
        totalFood = typeof skillData === 'object' ? skillData.food : skillData;
        if (mon.skillLabel && mon.skillLabel.includes('怪力钳')) {
            perSkillDetail = `从特定食材中随机获得18个其中1种食材（有时获得36个）`;
        } else {
            perSkillDetail = `从特定食材中随机获得${totalFood}个其中1种食材`;
        }

        let expectedFood = 0, expectedEnergy = 0;
        let items = pool.items, probs = pool.itemProbs;
        let multipliers = pool.multipliers || probs.map(() => 1);

        let foodDetails = [];
        for (let i = 0; i < items.length; i++) {
            let prob = probs[i], mult = multipliers[i];
            let itemEnergy = getFoodEnergy(items[i]);
            let perSkillCount = totalFood * prob * mult;
            expectedFood += perSkillCount;
            expectedEnergy += perSkillCount * itemEnergy;
            let totalItemCount = perSkillCount * skillCount;
            foodMap[items[i]] = (foodMap[items[i]] || 0) + totalItemCount;
            foodDetails.push(`${items[i]}: ${totalItemCount.toFixed(1)}个`);
        }
        totalDetails = foodDetails;

        if (mon.skillLabel && mon.skillLabel.includes('超幸运') && typeof skillData === 'object' && skillData.shard4000) {
            let dreamProbs = mon.skillPool.dreamShardProbs || [0.112, 0.028];
            let shardLow = skillData.shard4000 * skillCount * dreamProbs[0];
            let shardHigh = skillData.shard20000 ? skillData.shard20000 * skillCount * dreamProbs[1] : 0;
            let totalShards = shardLow + shardHigh;
            totalDetails.push(`梦之碎片: 约${totalShards.toFixed(0)}`);
        }

        return {
            food: skillCount * expectedFood,
            energy: skillCount * expectedEnergy,
            details: totalDetails,
            foodMap,
            perSkillDetail
        };
    }
    
    // 帮手加速（雷公、炎帝、水君）
    if (mon.skillType === 'helperBoost') {
        let boostTimes = typeof skillData === 'number' ? skillData : (skillData.boost || 11);
        perSkillDetail = `让全队立刻完成55次帮忙（自身获得${boostTimes}次帮忙）`;
        // 计算 boostTimes 次帮忙的树果和食材
        let p_f = Math.min(mon.prob_f * 1.0, 1.0);
        let avgFoodCount = mon.avg_food || 2.333;
        let berryCountPerHelp = (mon.berry_count || 1);
        let totalBerry = boostTimes * (1 - p_f) * berryCountPerHelp;
        let totalFoodCount = boostTimes * p_f * avgFoodCount;
        let totalEnergy = totalBerry * mon.e_b + totalFoodCount * (mon.e_f / avgFoodCount);
        totalDetails.push(`获得树果${totalBerry.toFixed(1)}个, 能量${(totalBerry * mon.e_b).toFixed(0)}`);
        totalDetails.push(`获得食材${totalFoodCount.toFixed(1)}个${mon.foodName || '食材'}, 能量${(totalFoodCount * (mon.e_f / avgFoodCount)).toFixed(0)}`);
        return { food: totalFoodCount, energy: totalEnergy, details: totalDetails, foodMap, perSkillDetail };
    }
    // 其他（能量填充等，包含能量填充M、树果遽增、传说、幻兽技能产出）
    // 需要返回技能能量等，用于实际能量输出
    if (mon.e_s !== undefined && !isFoodGetS && !isFoodSelectS && !isCookSuccessS) {
        let isBerrySkill = mon.e_s_is_berry || false;
        let skillEnergy = isBerrySkill ? (mon.e_s * mon.e_b * skillCount) : (mon.e_s * skillCount);
        let skillCountFormatted = skillCount.toFixed(2);
        if (mon.skillLabel && mon.skillLabel.includes('能量填充M')) {
            perSkillDetail = `能量填充M，单次获得${mon.e_s}能量`;
            totalDetails.push(`获得${skillEnergy.toFixed(0)}能量`);
            return { food: 0, energy: skillEnergy, details: totalDetails, foodMap, perSkillDetail };
        } else if (mon.skillLabel && mon.skillLabel.includes('树果遽增')) {
            let berriesGained = mon.e_s * skillCount;
            let energyGained = berriesGained * mon.e_b;
            perSkillDetail = `让树果遽增，单次获得${mon.e_s}个树果`;
            totalDetails.push(`获得${berriesGained.toFixed(1)}个树果, 能量: ${energyGained.toFixed(0)}`);
            return { food: 0, energy: energyGained, details: totalDetails, foodMap, perSkillDetail };
        } else if (mon.skillLabel && mon.skillLabel.includes('新月祈祷')) {
            let berriesGained = mon.e_s * skillCount;
            let energyGained = berriesGained * mon.e_b;
            perSkillDetail = `获得${mon.e_s}个树果，并回复全体11点活力`;
            totalDetails.push(`获得${berriesGained.toFixed(1)}个树果, 能量: ${energyGained.toFixed(0)}，回复活力${ (11 * skillCount).toFixed(1) }点`);
            return { food: 0, energy: energyGained, details: totalDetails, foodMap, perSkillDetail };
        } else if (mon.skillLabel && mon.skillLabel.includes('梦魇')) {
            let energyGained = mon.e_s * skillCount;
            perSkillDetail = `梦魇·能量填充M，单次获得${mon.e_s}能量，减少自身5点活力`;
            totalDetails.push(`获得${energyGained.toFixed(0)}能量，减少活力${ (5 * skillCount).toFixed(1) }点`);
            return { food: 0, energy: energyGained, details: totalDetails, foodMap, perSkillDetail };
        } else {
            // 通用树果遽增 (拉帝欧斯等)
            let berriesGained = mon.e_s * skillCount;
            let energyGained = berriesGained * mon.e_b;
            perSkillDetail = `获得${mon.e_s}个树果`;
            totalDetails.push(`获得${berriesGained.toFixed(1)}个树果, 能量: ${energyGained.toFixed(0)}`);
            return { food: 0, energy: energyGained, details: totalDetails, foodMap, perSkillDetail };
        }
    }

    return { food: 0, energy: 0, details: [], foodMap: {}, perSkillDetail: '' };
}
function calculate() {
    let useRealistic = window.useRealistic || false;
    let calcType = typeSelect.value, nature = natureSelect.value;
    let selectedSubs = getSelectedSubs().slice(0, 4);
    let pokeValue = pokeSelect ? pokeSelect.value : null;

    let baseMults = calcMultipliers(selectedSubs, nature, false);
    let M_h = baseMults.speedMult, M_f = baseMults.foodMult, M_p = baseMults.skillMult, berryMult = baseMults.berryMult;

    let M_p_realistic = M_p;
    if (useRealistic) {
        if (calcType === '技能型') {
            M_p_realistic *= SKILL_TYPE_REALISTIC_COEFF;
        } else if (calcType === '树果型' && pokeValue && SPECIAL_BERRY_MONS_DATA[pokeValue]) {
            M_p_realistic *= (REALISTIC_COEFF[pokeValue] || DEFAULT_REALISTIC_COEFF);
        } else if (['能量填充M', '树果遽增', '食材型'].includes(calcType)) {
            M_p_realistic *= (REALISTIC_COEFF[pokeValue] || DEFAULT_REALISTIC_COEFF);
        } else if (['传说宝可梦', '幻兽'].includes(calcType)) {
            M_p_realistic *= (REALISTIC_COEFF[pokeValue] || DEFAULT_REALISTIC_COEFF);
        }
    }

    let hasHelper = selectedSubs.includes('帮手奖励');

    // ========== 树果型 ==========
    if (calcType === '树果型') {
        if (pokeValue && SPECIAL_BERRY_MONS_DATA[pokeValue]) {
            let mon = SPECIAL_BERRY_MONS_DATA[pokeValue];
            let lines = [];
            lines.push(`类型: 树果型 (${pokeValue})`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
            lines.push(`M_h: ${M_h.toFixed(4)} | M_f: ${M_f.toFixed(4)} | M_p: ${M_p.toFixed(4)}`);

            let berryBoost = selectedSubs.includes('树果S') ? 1.5 : 1.0;
            let total = M_h * berryBoost;
            lines.push('');
            lines.push('【满包模式】');
            lines.push(`树果倍率: <span style="color:#2980b9;font-weight:bold;">${total.toFixed(4)}</span> (${((total-1)*100).toFixed(2)}%)`);

            let berryProd = computeBerryProduction(mon, M_h, berryMult);
            let foodProd = computeFoodProduction(mon, M_h, M_f);
            let skillProd = computeSkillProduction(mon, M_h, M_p_realistic, 6);
            let skillCount = computeSkillCount(mon, M_h, M_p_realistic);
            let totalEnergy = berryProd.energy + foodProd.energy + skillProd.energy;
            lines.push('');
            lines.push('【无限持有模式】');
            lines.push(`树果: ${berryProd.count.toFixed(1)}个, 能量: ${berryProd.energy.toFixed(0)}`);
            let foodName = mon.foodName ? mon.foodName : '';
            lines.push(`食材: ${foodProd.count.toFixed(1)}个${foodName}, 能量: ${foodProd.energy.toFixed(0)}`);
            lines.push(`技能次数: ${skillCount.toFixed(2)}次`);
            if (skillProd.perSkillDetail) {
                lines.push(`技能效果: ${skillProd.perSkillDetail}`);
            }
            if (skillProd.details.length > 0) {
                lines.push(`技能产出: ${skillProd.details.join(', ')}`);
            }
            lines.push(`总能量: ${totalEnergy.toFixed(0)}`);

            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
        // 通用树果型
        let berryBoost = selectedSubs.includes('树果S') ? 1.5 : 1.0;
        let total = M_h * berryBoost;
        let soloResult = compute('树果型', '', selectedSubs, nature, false, false);
        let teamResult = hasHelper ? compute('树果型', '', selectedSubs, nature, true, false) : null;
        let lines = [];
        lines.push(`类型: 树果型 (通用树果型)`);
        lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
        lines.push(`M_h: ${M_h.toFixed(4)}`);
        lines.push('');
        lines.push('【理论倍率】');
        if (hasHelper) {
            lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
            lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
        } else {
            lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${total.toFixed(4)}</span> (${((total-1)*100).toFixed(2)}%)`);
        }
        helperOverflowAnalysis(selectedSubs, lines);
        resultBox.innerHTML = lines.join('<br>');
        return;
    }

    // ========== 食材型 ==========
    if (calcType === '食材型') {
        let mon = null;
        if (pokeValue && HYBRID_FOOD_MONS_DATA[pokeValue]) mon = HYBRID_FOOD_MONS_DATA[pokeValue];
        else if (pokeValue && EXPERT_FOOD_MONS_DATA[pokeValue]) mon = EXPERT_FOOD_MONS_DATA[pokeValue];
        if (mon) {
            let foodProd = computeFoodProduction(mon, M_h, M_f);
            let skillCount = computeSkillCount(mon, M_h, M_p_realistic);
            let skillProd = computeSkillProduction(mon, M_h, M_p_realistic, mon.skillLevels.length - 1);
            let soloResult = compute('食材型', pokeValue, selectedSubs, nature, false, false);
            let teamResult = hasHelper ? compute('食材型', pokeValue, selectedSubs, nature, true, false) : null;

            let lines = [];
            lines.push(`类型: 食材型 (${pokeValue})`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
            lines.push(`M_h: ${M_h.toFixed(4)} | M_f: ${M_f.toFixed(4)} | M_p: ${M_p.toFixed(4)}`);
            lines.push('');

            lines.push('【理论倍率】');
            if (hasHelper) {
                lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
                lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
            } else {
                lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
            }

            lines.push('');
            lines.push('【基础产能】');
            let foodName = mon.foodName || '食材';
            lines.push(`食材: ${foodProd.count.toFixed(1)}个${foodName}, 能量: ${foodProd.energy.toFixed(0)}`);

            // 技能产能
            if (skillProd.perSkillDetail) {
                lines.push('');
                lines.push('【技能产能】');
                lines.push(`技能次数: ${skillCount.toFixed(2)}次`);
                lines.push(`技能效果: ${skillProd.perSkillDetail}`);
                if (skillProd.details.length > 0) {
                    lines.push(`技能产出: ${skillProd.details.join(', ')}`);
                }
            }
            // 未实装技能提示
            if (mon.unfinished || (mon.skillLevels && mon.skillLevels.length === 0)) {
                lines.push('');
                lines.push('※ 该宝可梦的主技能尚未实装，产能计算暂不支持。');
            }
            // 专家对比
            if (mon.food_rival && mon.skill_rival === '咚咚鼠') {
                let rivalFoodMon = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalSkillMon = SPECIAL_SKILL_MONS_DATA['咚咚鼠'];
                let rivalFood = computeFoodProduction(rivalFoodMon, M_h, M_f);
                let rivalSkillCount = computeSkillCount(rivalSkillMon, M_h, M_p_realistic);
                let foodRatio = foodProd.count / rivalFood.count;
                let skillRatio = skillCount / rivalSkillCount;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`食材比 (vs ${mon.food_rival}): ${foodRatio.toFixed(3)}`);
                lines.push(`技能比 (vs 咚咚鼠): ${skillRatio.toFixed(3)}`);
                lines.push(`综合强度: ${(foodRatio + skillRatio).toFixed(2)} 格`);
            } else if (mon.food_rival && !mon.skill_rival) {
                let rivalMon = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalFood = computeFoodProduction(rivalMon, M_h, M_f);
                let skillMatchedFood = (mon.foodName && skillProd.foodMap) ? (skillProd.foodMap[mon.foodName] || 0) : 0;
                let totalSelf = foodProd.count + skillMatchedFood;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`自身食材(${mon.foodName}): ${foodProd.count.toFixed(1)}个`);
                if (skillMatchedFood > 0) {
                    lines.push(`技能产出匹配食材(${mon.foodName}): ${skillMatchedFood.toFixed(1)}个`);
                }
                lines.push(`合计同类食材: ${totalSelf.toFixed(1)}个`);
                lines.push(`专家(${mon.food_rival})食材: ${rivalFood.count.toFixed(1)}个`);
                lines.push(`食材比: ${(totalSelf / rivalFood.count).toFixed(3)}`);
            }

            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
        // 纯食材型（通用）
        let soloResult = compute('食材型', '', selectedSubs, nature, false, false);
        let teamResult = hasHelper ? compute('食材型', '', selectedSubs, nature, true, false) : null;
        let lines = [];
        lines.push(`类型: 食材型 (其他)`);
        lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
        lines.push(`M_h: ${M_h.toFixed(4)} | M_f: ${M_f.toFixed(4)}`);
        lines.push('');
        if (hasHelper) {
            lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
            lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
        } else {
            lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
        }
        helperOverflowAnalysis(selectedSubs, lines);
        resultBox.innerHTML = lines.join('<br>');
        return;
    }

    // ========== 技能型 ==========
    if (calcType === '技能型') {
        if (pokeValue && SPECIAL_SKILL_MONS_DATA[pokeValue]) {
            let mon = SPECIAL_SKILL_MONS_DATA[pokeValue];
            if (mon.unfinished) {
                resultBox.innerHTML = `<b>${pokeValue} 的数据尚未完成，无法计算。</b>`;
                return;
            }
            let skillCount = computeSkillCount(mon, M_h, M_p_realistic);
            let foodProd = computeFoodProduction(mon, M_h, M_f);
            let skillProd = computeSkillProduction(mon, M_h, M_p_realistic, mon.skillLevels.length - 1);
            let soloResult = compute('技能型', pokeValue, selectedSubs, nature, false, false);
            let teamResult = hasHelper ? compute('技能型', pokeValue, selectedSubs, nature, true, false) : null;

            let lines = [];
            lines.push(`类型: 技能型 (${pokeValue})`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
            lines.push(`M_h: ${M_h.toFixed(4)} | M_p: ${M_p.toFixed(4)} | M_f: ${M_f.toFixed(4)}`);
            lines.push('');
            lines.push('【理论倍率】');
            if (hasHelper) {
                lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
                lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
            } else {
                lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
            }

            // 基础产能（自身食材）
            let hasOwnFood = mon.prob_f > 0 && mon.foodName;
            if (hasOwnFood) {
                lines.push('');
                lines.push('【基础产能】');
                lines.push(`食材: ${foodProd.count.toFixed(1)}个${mon.foodName}, 能量: ${foodProd.energy.toFixed(0)}`);
            }

            lines.push('');
            lines.push('【技能产能】');
            lines.push(`技能次数: ${skillCount.toFixed(2)}次`);

            if (skillProd.perSkillDetail) {
                lines.push(`技能效果: ${skillProd.perSkillDetail}`);
            }
            if (skillProd.details.length > 0) {
                lines.push(`技能产出: ${skillProd.details.join(', ')}`);
            }

            // 专家对比
            if (mon.food_rival) {
                let rival = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalFood = computeFoodProduction(rival, M_h, M_f);
                let skillMatchedFood = (mon.foodName && skillProd.foodMap) ? (skillProd.foodMap[mon.foodName] || 0) : 0;
                let totalSelf = foodProd.count + skillMatchedFood;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`自身食材(${mon.foodName}): ${foodProd.count.toFixed(1)}个`);
                if (skillMatchedFood > 0) {
                    lines.push(`技能产出匹配食材(${mon.foodName}): ${skillMatchedFood.toFixed(1)}个`);
                }
                lines.push(`合计同类食材: ${totalSelf.toFixed(1)}个`);
                lines.push(`专家(${mon.food_rival})食材: ${rivalFood.count.toFixed(1)}个`);
                lines.push(`食材比: ${(totalSelf / rivalFood.count).toFixed(3)}`);
            }
            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
        // 功能型（咚咚鼠等纯料理成功S）
        let soloResult = compute('技能型', '', selectedSubs, nature, false, false);
        let teamResult = hasHelper ? compute('技能型', '', selectedSubs, nature, true, false) : null;
        let lines = [];
        lines.push(`类型: 技能型 (功能型)`);
        lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
        lines.push(`M_h: ${M_h.toFixed(4)} | M_p: ${M_p.toFixed(4)} | M_f: ${M_f.toFixed(4)}`);
        lines.push('');
        lines.push('【理论倍率】');
        if (hasHelper) {
            lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
            lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
        } else {
            lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
        }
        helperOverflowAnalysis(selectedSubs, lines);
        resultBox.innerHTML = lines.join('<br>');
        return;
    }

    // ========== 其余类型（能量填充M、树果遽增、传说宝可梦、幻兽） ==========
    let pokemonName = '';
    if (['传说宝可梦', '幻兽'].includes(calcType)) {
        pokemonName = pokeSelect.value;
    } else if (['能量填充M', '树果遽增'].includes(calcType)) {
        pokemonName = pokeSelect.value;
    }

    let soloResult = compute(calcType, pokemonName, selectedSubs, nature, false, useRealistic);
    if (soloResult.total === "数据待补全") {
        resultBox.innerHTML = `<b>${pokeSelect.options[pokeSelect.selectedIndex].text} 的数据尚未完成，无法计算。</b>`;
        return;
    }
    
    let teamResult = null;
    if (hasHelper) teamResult = compute(calcType, pokemonName, selectedSubs, nature, true, useRealistic);

    let lines = [];
    let typeLabel = calcType;
    if (pokemonName) typeLabel += ` (${pokeSelect.options[pokeSelect.selectedIndex].text})`;
    lines.push(`类型: ${typeLabel}`);
    lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
    lines.push(`M_h: ${soloResult.M_h} | M_p: ${soloResult.M_p} | M_f: ${soloResult.M_f}`);
    lines.push('');

    lines.push('【理论倍率】');
    if (hasHelper) {
        lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
        lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${teamResult.total}</span> (${teamResult.improve}%)`);
    } else {
        lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${soloResult.total}</span> (${soloResult.improve}%)`);
    }

    if (useRealistic && (['技能型', '能量填充M', '树果遽增', '传说宝可梦', '幻兽'].includes(calcType))) {
        let realisticSolo = compute(calcType, pokemonName, selectedSubs, nature, false, true);
        let realisticTeam = null;
        if (hasHelper) realisticTeam = compute(calcType, pokemonName, selectedSubs, nature, true, true);
        lines.push('');
        lines.push('【实战预估】');
        lines.push(`M_p (实际损耗): ${realisticSolo.M_p}`);
        if (hasHelper) {
            lines.push(`单帮手: <span style="color:#27ae60;font-weight:bold;">${realisticSolo.total}</span> (${realisticSolo.improve}%)`);
            lines.push(`5帮手: <span style="color:#27ae60;font-weight:bold;">${realisticTeam.total}</span> (${realisticTeam.improve}%)`);
        } else {
            lines.push(`总倍率: <span style="color:#27ae60;font-weight:bold;">${realisticSolo.total}</span> (${realisticSolo.improve}%)`);
        }
    }

    // ========== 实际能量输出（能量填充M、树果遽增、传说、幻兽） ==========
    let dataObj = null;
    if (calcType === '能量填充M') dataObj = ENERGY_MONS_DATA[pokemonName];
    else if (calcType === '树果遽增') dataObj = BERRY_BOOST_MONS_DATA[pokemonName];
    else if (calcType === '传说宝可梦') dataObj = LEGENDARY_MONS_DATA[pokemonName];
    else if (calcType === '幻兽') dataObj = PHANTOM_MONS_DATA[pokemonName];

    if (dataObj && !dataObj.unfinished) {
        lines.push('');
        lines.push('【实际能量】');
        outputActualEnergy(dataObj, M_h, M_f, M_p_realistic, berryMult, lines);
    }

    lines.push('');
    helperOverflowAnalysis(selectedSubs, lines);

    if (['能量填充M', '树果遽增', '传说宝可梦', '幻兽'].includes(calcType)) {
        lines.push('※ 基准为纯白板（无树果S），树果S为可选副技能。');
        lines.push('※ 技能就绪待机损耗可能导致实际能量比理论值低约2~4%。');
    }
    if (calcType === '技能型') lines.push('※ 技能就绪待机损耗可能导致实际技能次数比理论值低约2~4%。');
    if (['能量填充M', '树果遽增', '传说宝可梦', '幻兽', '技能型'].includes(calcType))
        lines.push('※ 睡眠期间技能若无人收取，实际产出可能低于理论值。');
    if (calcType === '传说宝可梦' && pokemonName === '拉帝欧斯')
        lines.push('※ 神兽：技能受同属性队友影响，计算基于最大加成（78树果）。');

    resultBox.innerHTML = lines.join('<br>');
}

// 辅助函数：实际能量输出（被 calculate 调用）
function outputActualEnergy(mon, M_h, M_f, M_p_realistic, berryMult, lines) {
    let berryProd = computeBerryProduction(mon, M_h, berryMult);
    lines.push(`树果: ${berryProd.count.toFixed(1)}个, 能量: ${berryProd.energy.toFixed(0)}`);

    let foodProd = computeFoodProduction(mon, M_h, M_f);
    let foodName = mon.foodName || '食材';
    lines.push(`食材: ${foodProd.count.toFixed(1)}个${foodName}, 能量: ${foodProd.energy.toFixed(0)}`);

    let skillCount = computeSkillCount(mon, M_h, M_p_realistic);
    lines.push(`技能次数: ${skillCount.toFixed(2)}次`);

    let skillProd = computeSkillProduction(mon, M_h, M_p_realistic, mon.skillLevels.length - 1);
    if (skillProd.perSkillDetail) {
        lines.push(`技能效果: ${skillProd.perSkillDetail}`);
    }
    if (skillProd.details.length > 0) {
        lines.push(`技能产出: ${skillProd.details.join(', ')}`);
    }

    let totalEnergy = berryProd.energy + foodProd.energy + (skillProd.energy || 0);
    lines.push(`总能量: ${totalEnergy.toFixed(0)}`);
}
