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

function calculate() {
    let calcType = typeSelect.value;
    let nature = natureSelect.value;
    let selectedSubs = getSelectedSubs();
    let useRealistic = realisticCheckbox.checked;

    if (calcType === '食材型') {
        let pokeValue = pokeSelect.value;
        if (pokeValue && HYBRID_FOOD_MONS_DATA[pokeValue]) {
            let out = computeHybridOutput(pokeValue, selectedSubs, nature, useRealistic);
            let mon = HYBRID_FOOD_MONS_DATA[pokeValue];
            let rivalFood = mon.food_rival;
            let rivalSkill = mon.skill_rival;
            let expertFood = EXPERT_GRAD_DATA[rivalFood];
            let expertSkill = EXPERT_GRAD_DATA[rivalSkill];

            let foodRatio = out.foodCount / expertFood.food;
            let skillRatioNoSleep = out.skillNoSleep / expertSkill.skill;
            let skillRatioSleep = out.skillSleep / expertSkill.skill_sleep;
            let totalNoSleep = foodRatio + skillRatioNoSleep;
            let totalSleep = foodRatio + skillRatioSleep;

            let lines = [];
            lines.push(`类型: 食材型 (${pokeValue}·料理成功S)`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
            lines.push(`M_h: ${out.M_h.toFixed(4)} | M_f: ${out.M_f.toFixed(4)} | M_p: ${out.M_p.toFixed(4)}${useRealistic ? ' (打折)' : ''}`);
            lines.push('');
            lines.push(`食材产出: ${out.foodCount.toFixed(1)} 个 (vs ${rivalFood} ${expertFood.desc} ${expertFood.food}) → ${foodRatio.toFixed(3)}`);
            lines.push(`技能次数 (无损耗): ${out.skillNoSleep.toFixed(2)} 次 (vs ${rivalSkill} ${expertSkill.desc} ${expertSkill.skill}) → ${skillRatioNoSleep.toFixed(3)}`);
            lines.push(`技能次数 (睡眠损耗): ${out.skillSleep.toFixed(2)} 次 (vs ${rivalSkill} ${expertSkill.desc} ${expertSkill.skill_sleep}) → ${skillRatioSleep.toFixed(3)}`);
            lines.push(`<b>综合强度 (无损耗): <span style="color:#2980b9;font-weight:bold;">${totalNoSleep.toFixed(2)} 格</span></b>`);
            lines.push(`<b>综合强度 (有损耗): <span style="color:#27ae60;font-weight:bold;">${totalSleep.toFixed(2)} 格</span></b>`);
            lines.push('');
            lines.push('※ 综合强度 = 食材产出比 + 技能产出比。');
            lines.push('※ 食材产出不受睡眠影响。技能睡眠损耗系数：古月鸟0.8276，老翁龙0.8402。');
            if (useRealistic) lines.push('※ 实战估算已生效，技能概率已打折。');
            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        } else {
            let { speedMult: M_h, foodMult: M_f } = calcMultipliers(selectedSubs, nature, false);
            let hasHelper = selectedSubs.includes('帮手奖励');
            let M_h_team = M_h, M_f_team = M_f;
            if (hasHelper) {
                let teamMults = calcMultipliers(selectedSubs, nature, true);
                M_h_team = teamMults.speedMult;
            }
            let totalSolo = M_h * M_f;
            let totalTeam = M_h_team * M_f_team;
            let improveSolo = (totalSolo - 1) * 100;
            let improveTeam = (totalTeam - 1) * 100;

            let lines = [];
            lines.push(`类型: 食材型 (其他宝可梦)`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'} | 性格: ${nature}`);
            lines.push(`M_h: ${M_h.toFixed(4)} | M_f: ${M_f.toFixed(4)}`);
            lines.push('');
            if (hasHelper) {
                lines.push(`单帮手: <span style="color:#2980b9;font-weight:bold;">${totalSolo.toFixed(4)}</span> (${improveSolo.toFixed(2)}%)`);
                lines.push(`5帮手: <span style="color:#2980b9;font-weight:bold;">${totalTeam.toFixed(4)}</span> (${improveTeam.toFixed(2)}%)`);
            } else {
                lines.push(`总倍率: <span style="color:#2980b9;font-weight:bold;">${totalSolo.toFixed(4)}</span> (${improveSolo.toFixed(2)}%)`);
            }
            lines.push('');
            lines.push('※ 此为通用食材型计算，不包含特定宝可梦数据。');
            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.innerHTML = lines.join('<br>');
            return;
        }
    }

    // 技能型特殊宝可梦（数据待补全）
    if (calcType === '技能型') {
        let pokeValue = pokeSelect.value;
        if (pokeValue && SPECIAL_SKILL_MONS_DATA[pokeValue]) {
            if (SPECIAL_SKILL_MONS_DATA[pokeValue].unfinished) {
                resultBox.innerHTML = `<b>${pokeSelect.options[pokeSelect.selectedIndex].text} 的数据尚未完成，无法计算。</b>`;
                return;
            }
        }
    }

    // 其他类型
    let pokemonName = '';
    if (['传说宝可梦', '幻兽'].includes(calcType)) {
        pokemonName = pokeSelect.value;
    } else if (['能量填充M', '树果遽增'].includes(calcType)) {
        pokemonName = pokeSelect.value;
    }

    let soloResult = compute(calcType, pokemonName, selectedSubs, nature, false, false);
    if (soloResult.total === "数据待补全") {
        resultBox.innerHTML = `<b>${pokeSelect.options[pokeSelect.selectedIndex].text} 的数据尚未完成，无法计算。</b>`;
        return;
    }
    
    let hasHelper = selectedSubs.includes('帮手奖励');
    let teamResult = null;
    if (hasHelper) teamResult = compute(calcType, pokemonName, selectedSubs, nature, true, false);

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

// ========== 捕捉概率计算 ==========
function calculateProbability() {
    let selectedSubs = getSelectedSubs();
    let nature = natureSelect.value;
    let lockGold = parseInt(document.getElementById('lockGold').value);
    let calcType = typeSelect.value;
    let pokeValue = pokeSelect ? pokeSelect.value : null;

    // 副技能稀有度定义
    const GOLD_SKILLS = ["树果S", "帮手奖励", "睡眠EXP奖励", "研究EXP奖励", "活力回复奖励", "梦之碎片奖励", "技能等级M"];
    const BLUE_SKILLS = ["技能等级S", "技概M", "帮M", "食概M", "持有上限L", "持有上限M"];
    const WHITE_SKILLS = ["技概S", "帮S", "食概S", "持有上限S"];

    const WEIGHTS = {};
    GOLD_SKILLS.forEach(s => WEIGHTS[s] = 0.02);
    BLUE_SKILLS.forEach(s => WEIGHTS[s] = 0.055);
    WHITE_SKILLS.forEach(s => WEIGHTS[s] = 0.1325);

    for (let sub of selectedSubs) {
        if (!(sub in WEIGHTS)) {
            alert(`未知副技能: ${sub}`);
            return;
        }
    }

    const targetSkills = selectedSubs.filter(s => s in WEIGHTS);
    if (targetSkills.length > 4) {
        document.getElementById('probResult').innerHTML = `<b>错误：</b>选择的副技能数量超过4个，无法全部出现在前四格。`;
        document.getElementById('probResult').style.display = 'block';
        return;
    }

    const TOTAL_SKILLS = [...GOLD_SKILLS, ...BLUE_SKILLS, ...WHITE_SKILLS];
    let successCount = 0;
    const SIM_COUNT = 1000000;

    for (let i = 0; i < SIM_COUNT; i++) {
        let pool = [...TOTAL_SKILLS];
        let chosen = [];

        for (let g = 0; g < lockGold; g++) {
            let goldPool = GOLD_SKILLS.filter(s => pool.includes(s));
            if (goldPool.length === 0) break;
            let pick = goldPool[Math.floor(Math.random() * goldPool.length)];
            chosen.push(pick);
            pool.splice(pool.indexOf(pick), 1);
        }

        let remainingSlots = 4 - lockGold;
        for (let s = 0; s < remainingSlots; s++) {
            let poolWeight = pool.reduce((sum, skill) => sum + WEIGHTS[skill], 0);
            let rand = Math.random() * poolWeight;
            let cumulative = 0;
            let pickedSkill = pool[pool.length - 1];
            for (let skill of pool) {
                cumulative += WEIGHTS[skill];
                if (rand <= cumulative) {
                    pickedSkill = skill;
                    break;
                }
            }
            chosen.push(pickedSkill);
            pool.splice(pool.indexOf(pickedSkill), 1);
        }

        let foundAll = true;
        for (let ts of targetSkills) {
            if (!chosen.includes(ts)) {
                foundAll = false;
                break;
            }
        }
        if (foundAll) successCount++;
    }

    let prob = (successCount / SIM_COUNT) * 100;
    let foodNote = '';
    // 食材型或特殊双修技能型需乘以 AAA 概率 1/9
    if (calcType === '食材型' || (calcType === '技能型' && pokeValue && SPECIAL_SKILL_MONS_DATA[pokeValue])) {
        prob *= (1/9);
        foodNote = '\n※ 已计入食材组合 AAA 的概率 (1/9)。';
    }
    let oneOver = Math.round(1 / (prob / 100));
    let probResult = `【捕捉概率估算】
副技能: ${selectedSubs.join(', ')}
性格: ${nature}
锁金数: ${lockGold}
近似概率: ${prob.toFixed(5)}% (约 1/${oneOver})
${foodNote}
${selectedSubs.some(s => s.endsWith('S')) ? '※ 若出现S级技能（技概S、帮S等），可使用银瓜子升级至M。' : ''}
※ 计算基于100万次模拟，前四格无放回抽取。`;

    document.getElementById('probResult').innerHTML = probResult.replace(/\n/g, '<br>');
    document.getElementById('probResult').style.display = 'block';
}
