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

// ========== 产能计算辅助函数 ==========
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
    if (!skillData) return { food: 0, energy: 0, details: [] };

    if (mon.skillLabel && mon.skillLabel.includes('食材获取S') && !mon.skillPool) {
        let totalFood = typeof skillData === 'object' ? skillData.food : skillData;
        return {
            food: skillCount * totalFood,
            energy: skillCount * totalFood * EXACT_AVG_FOOD_ENERGY,
            details: [`随机三种食材各${Math.floor(totalFood/3)}个`]
        };
    }

    if (mon.skillPool && mon.skillPool.items) {
        let pool = mon.skillPool;
        let totalFood = typeof skillData === 'object' ? skillData.food : skillData;
        let expectedFood = 0;
        let expectedEnergy = 0;
        let details = [];
        let items = pool.items;
        let probs = pool.itemProbs;
        let multipliers = pool.multipliers || probs.map(() => 1);

        for (let i = 0; i < items.length; i++) {
            let prob = probs[i];
            let mult = multipliers[i];
            let itemEnergy = getFoodEnergy(items[i]);
            expectedFood += totalFood * prob * mult;
            expectedEnergy += totalFood * prob * mult * itemEnergy;
            let label = mult > 1 ? `${items[i]} (x${mult})` : items[i];
            details.push(`${label}: ${(totalFood * prob * mult).toFixed(1)}个`);
        }
        return {
            food: skillCount * expectedFood,
            energy: skillCount * expectedEnergy,
            details: details
        };
    }
    return { food: 0, energy: 0, details: [] };
}

function calculate() {
    let useRealistic = window.useRealistic || false;
    let calcType = typeSelect.value;
    let nature = natureSelect.value;
    let selectedSubs = getSelectedSubs();
    let pokeValue = pokeSelect ? pokeSelect.value : null;

    let baseMults = calcMultipliers(selectedSubs, nature, false);
    let M_h = baseMults.speedMult;
    let M_p = baseMults.skillMult;
    let M_f = baseMults.foodMult;
    let berryMult = baseMults.berryMult;

    // 实战估算打折
    let M_p_realistic = M_p;
    if (useRealistic) {
        if (calcType === '技能型') {
            M_p_realistic *= SKILL_TYPE_REALISTIC_COEFF;
        } else if (['能量填充M', '树果遽增', '食材型'].includes(calcType)) {
            let coeff = REALISTIC_COEFF[pokeValue] || DEFAULT_REALISTIC_COEFF;
            M_p_realistic *= coeff;
        } else if (['传说宝可梦', '幻兽'].includes(calcType)) {
            let coeff = REALISTIC_COEFF[pokeValue] || DEFAULT_REALISTIC_COEFF;
            M_p_realistic *= coeff;
        }
    }

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
            lines.push(`食材: ${foodProd.count.toFixed(1)}个, 能量: ${foodProd.energy.toFixed(0)}`);
            lines.push(`技能次数: ${skillCount.toFixed(2)}次`);
            lines.push(`技能食材: ${skillProd.food.toFixed(1)}个, 能量: ${skillProd.energy.toFixed(0)}`);
            if (skillProd.details.length > 0) {
                lines.push(`技能明细: ${skillProd.details.join(', ')}`);
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
        let hasHelper = selectedSubs.includes('帮手奖励');
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
            let skillProd = computeSkillProduction(mon, M_h, M_p_realistic, mon.skillLevels.length - 1);
            let skillCount = computeSkillCount(mon, M_h, M_p_realistic);
            let soloResult = compute('食材型', pokeValue, selectedSubs, nature, false, false);
            let hasHelper = selectedSubs.includes('帮手奖励');
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
            lines.push(`食材个数: ${foodProd.count.toFixed(1)}个, 能量: ${foodProd.energy.toFixed(0)}`);

            if (mon.skillLabel && (mon.skillLabel.includes('食材获取S') || mon.skillLabel.includes('食材精选S'))) {
                lines.push('');
                lines.push('【技能产能】');
                lines.push(`技能次数: ${skillCount.toFixed(2)}次`);
                lines.push(`技能食材: ${skillProd.food.toFixed(1)}个, 能量: ${skillProd.energy.toFixed(0)}`);
                if (skillProd.details.length > 0) {
                    lines.push(`技能明细: ${skillProd.details.join(', ')}`);
                }
            } else if (mon.skillLabel && mon.skillLabel.includes('能量填充S')) {
                lines.push('');
                lines.push('【技能产能】');
                lines.push(`技能次数: ${skillCount.toFixed(2)}次, 能量: ${(skillCount * mon.skillLevels[mon.skillLevels.length-1]).toFixed(0)}`);
            }

            // 专家对比
            if (mon.food_rival && mon.skill_rival === '咚咚鼠') {
                let rivalFoodMon = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalSkillMon = SPECIAL_SKILL_MONS_DATA['咚咚鼠'];
                let rivalFood = computeFoodProduction(rivalFoodMon, M_h, M_f);
                let rivalSkillCount = computeSkillCount(rivalSkillMon, M_h, M_p_realistic);
                let foodRatio = foodProd.count / rivalFood.count;
                let skillRatio = skillCount / rivalSkillCount;
                let totalRatio = foodRatio + skillRatio;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`食材比 (vs ${mon.food_rival}): ${foodRatio.toFixed(3)}`);
                lines.push(`技能比 (vs 咚咚鼠): ${skillRatio.toFixed(3)}`);
                lines.push(`综合强度: ${totalRatio.toFixed(2)} 格`);
            } else if (mon.food_rival && !mon.skill_rival) {
                let rivalMon = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalFood = computeFoodProduction(rivalMon, M_h, M_f);
                let foodRatio = foodProd.count / rivalFood.count;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`食材比 (vs ${mon.food_rival}): ${foodRatio.toFixed(3)}`);
            }

            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
        // 纯食材型
        let total = M_h * M_f;
        let improve = (total - 1) * 100;
        let lines = [];
        lines.push(`类型: 食材型 (其他)`);
        lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
        lines.push(`M_h: ${M_h.toFixed(4)} | M_f: ${M_f.toFixed(4)}`);
        lines.push(`总倍率: ${total.toFixed(4)} (${improve.toFixed(2)}%)`);
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
            let hasHelper = selectedSubs.includes('帮手奖励');
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

            lines.push('');
            lines.push('【技能产能】');
            lines.push(`技能次数: ${skillCount.toFixed(2)}次`);
            if (mon.skillLabel && mon.skillLabel.includes('料理成功S')) {
                lines.push(`技能效果: 暴击率+${mon.skillLevels[mon.skillLevels.length-1]}%`);
            } else if (mon.skillLabel && (mon.skillLabel.includes('食材获取S') || mon.skillLabel.includes('食材精选S'))) {
                lines.push(`自身食材: ${foodProd.count.toFixed(1)}个, 能量: ${foodProd.energy.toFixed(0)}`);
                lines.push(`技能食材: ${skillProd.food.toFixed(1)}个, 能量: ${skillProd.energy.toFixed(0)}`);
                if (skillProd.details.length > 0) {
                    lines.push(`技能明细: ${skillProd.details.join(', ')}`);
                }
            } else if (mon.skillLabel && mon.skillLabel.includes('正电·食材获取S')) {
                lines.push(`自身食材: ${foodProd.count.toFixed(1)}个, 能量: ${foodProd.energy.toFixed(0)}`);
                lines.push(`技能食材: ${skillProd.food.toFixed(1)}个, 能量: ${skillProd.energy.toFixed(0)}`);
                lines.push(`额外食材: ${(mon.skillLevels[mon.skillLevels.length-1].bonus * skillCount).toFixed(1)}个`);
            }

            if (mon.food_rival) {
                let rival = EXPERT_FOOD_MONS_DATA[mon.food_rival];
                let rivalFood = computeFoodProduction(rival, M_h, M_f);
                let totalSelfFood = foodProd.count + skillProd.food;
                let ratio = totalSelfFood / rivalFood.count;
                lines.push('');
                lines.push('【专家对比】');
                lines.push(`食材比 (vs ${mon.food_rival}): ${ratio.toFixed(3)}`);
            }

            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
        // 功能型
        let soloResult = compute('技能型', '', selectedSubs, nature, false, false);
        let hasHelper = selectedSubs.includes('帮手奖励');
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

    // ========== 其余类型沿用原逻辑 ==========
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
    
    let hasHelper = selectedSubs.includes('帮手奖励');
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
        lines.push('【实战估算】');
        lines.push(`M_p (打折后): ${realisticSolo.M_p}`);
        if (hasHelper) {
            lines.push(`单帮手: <span style="color:#27ae60;font-weight:bold;">${realisticSolo.total}</span> (${realisticSolo.improve}%)`);
            lines.push(`5帮手: <span style="color:#27ae60;font-weight:bold;">${realisticTeam.total}</span> (${realisticTeam.improve}%)`);
        } else {
            lines.push(`总倍率: <span style="color:#27ae60;font-weight:bold;">${realisticSolo.total}</span> (${realisticSolo.improve}%)`);
        }
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
