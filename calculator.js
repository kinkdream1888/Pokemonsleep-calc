// ========== 计算逻辑 ==========
function calcMultipliers(selectedSubs, nature, teamBoost = false) {
    let totalSubSpeed = 0.0, skillMult = 1.0, foodMult = 1.0, berryMult = 1;
    for (let sub of selectedSubs) {
        let s = SUB_SKILLS[sub];
        let speedVal = (sub === '帮手奖励') ? (teamBoost ? 0.25 : 0.05) : s.speed;
        totalSubSpeed += speedVal;
        skillMult *= s.skill;
        foodMult *= s.food;
        berryMult *= s.berry;
    }
    totalSubSpeed = Math.min(totalSubSpeed, MAX_SUB_SPEED);
    let subSpeedMult = totalSubSpeed < 1 ? 1 / (1 - totalSubSpeed) : 1.0;
    let natureInfo = NATURES[nature];
    let speedMult = subSpeedMult * natureInfo.speed;
    skillMult *= natureInfo.skill;
    foodMult *= natureInfo.food;
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
        } else if (calcType === '拉帝欧斯（神兽）') {
            let coeff = REALISTIC_COEFF['拉帝欧斯（神兽）'] || DEFAULT_REALISTIC_COEFF;
            M_p *= coeff;
        }
    }
    let total, improve;
    if (calcType === '树果型') { total = M_h; improve = (total-1)*100; }
    else if (calcType === '食材型') { total = M_h * M_f; improve = (total-1)*100; }
    else if (calcType === '技能型') { total = M_h * M_p; improve = (total-1)*100; }
    else if (calcType === '能量填充M' || calcType === '树果遽增' || calcType === '拉帝欧斯（神兽）') {
        let dataObj;
        if (calcType === '能量填充M') dataObj = ENERGY_MONS_DATA[pokemonName];
        else if (calcType === '树果遽增') dataObj = BERRY_BOOST_MONS_DATA[pokemonName];
        else dataObj = LATIOS_DATA;
        let data = { ...dataObj };
        if (calcType === '能量填充M') data.e_s_is_berry = false;
        else if (calcType === '树果遽增' || calcType === '拉帝欧斯（神兽）') data.e_s_is_berry = true;
        let E_base = calculateEnergy(data, 1.0, 1.0, 1.0, 1);
        let E_config = calculateEnergy(data, M_h, M_p, M_f, berryMult);
        total = E_config / E_base;
        improve = (total-1)*100;
    } else { total = 1; improve = 0; }
    return { total: total.toFixed(4), improve: improve.toFixed(2), M_h: M_h.toFixed(4), M_p: M_p.toFixed(4), M_f: M_f.toFixed(4) };
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

function helperOverflowAnalysis(selectedSubs, outputLines) {
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
        outputLines.push(text);
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
            lines.push(`类型: 食材型 (双修)`);
            lines.push(`宝可梦: ${pokeValue}`);
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'}`);
            lines.push(`性格: ${nature}`);
            lines.push(`帮速倍率 (M_h): ${out.M_h.toFixed(4)}`);
            lines.push(`食材概率倍率 (M_f): ${out.M_f.toFixed(4)}`);
            lines.push(`技能概率倍率 (M_p): ${out.M_p.toFixed(4)}${useRealistic ? ' (已打折)' : ''}`);
            lines.push('');
            lines.push(`【动态产出与效率对比】`);
            lines.push(`食材个数: ${out.foodCount.toFixed(1)} (vs ${rivalFood} ${expertFood.desc} ${expertFood.food}) → ${foodRatio.toFixed(3)}`);
            lines.push(`技能次数 (无损耗): ${out.skillNoSleep.toFixed(2)} (vs ${rivalSkill} ${expertSkill.desc} ${expertSkill.skill}) → ${skillRatioNoSleep.toFixed(3)}`);
            lines.push(`技能次数 (睡眠损耗): ${out.skillSleep.toFixed(2)} (vs ${rivalSkill} ${expertSkill.desc} ${expertSkill.skill_sleep}) → ${skillRatioSleep.toFixed(3)}`);
            lines.push(`综合强度 (无损耗): ${totalNoSleep.toFixed(2)} 格`);
            lines.push(`综合强度 (有损耗): ${totalSleep.toFixed(2)} 格`);
            lines.push('');
            lines.push('※ 综合强度 = 食材产出比 + 技能产出比，表示一个队伍格子发挥了约 X 倍的价值。');
            lines.push('※ 食材产出不受睡眠影响。技能睡眠损耗系数：古月鸟0.8276，老翁龙0.8402。');
            lines.push('※ 睡眠损耗数据已包含保底。');
            if (useRealistic) lines.push('※ 实战估算已生效，技能概率已打折。');
            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.textContent = lines.join('\n');
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
            lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'}`);
            lines.push(`性格: ${nature}`);
            lines.push(`帮速倍率 (M_h): ${M_h.toFixed(4)}`);
            lines.push(`食材概率倍率 (M_f): ${M_f.toFixed(4)}`);
            lines.push('');
            if (hasHelper) {
                lines.push('【理论倍率】');
                lines.push(`单帮手: ${totalSolo.toFixed(4)} (${improveSolo.toFixed(2)}%)`);
                lines.push(`5帮手: ${totalTeam.toFixed(4)} (${improveTeam.toFixed(2)}%)`);
            } else {
                lines.push(`总倍率: ${totalSolo.toFixed(4)} (${improveSolo.toFixed(2)}%)`);
            }
            lines.push('');
            lines.push('※ 此为通用食材型计算，不包含特定宝可梦数据。');
            helperOverflowAnalysis(selectedSubs, lines);
            resultBox.textContent = lines.join('\n');
            return;
        }
    }

    // 其他类型
    let pokemonName = '';
    if (calcType === '拉帝欧斯（神兽）') {
        pokemonName = '拉帝欧斯（神兽）';
    } else if (['能量填充M', '树果遽增'].includes(calcType)) {
        pokemonName = pokeSelect.value;
    }

    // 理论倍率（永远不打折）
    let soloResult = compute(calcType, pokemonName, selectedSubs, nature, false, false);
    let hasHelper = selectedSubs.includes('帮手奖励');
    let teamResult = null;
    if (hasHelper) teamResult = compute(calcType, pokemonName, selectedSubs, nature, true, false);

    let lines = [];
    lines.push(`类型: ${calcType}`);
    if (pokemonName) lines.push(`宝可梦: ${pokemonName}`);
    lines.push(`副技能: ${selectedSubs.length ? selectedSubs.join(', ') : '无'}`);
    lines.push(`性格: ${nature}`);
    lines.push(`帮速倍率 (M_h): ${soloResult.M_h}`);
    lines.push(`技能概率倍率 (M_p): ${soloResult.M_p}`);
    lines.push(`食材概率倍率 (M_f): ${soloResult.M_f}`);
    lines.push('');

    lines.push('【理论倍率】');
    if (hasHelper) {
        lines.push(`单帮手: ${soloResult.total} (${soloResult.improve}%)`);
        lines.push(`5帮手: ${teamResult.total} (${teamResult.improve}%)`);
    } else {
        lines.push(`总倍率: ${soloResult.total} (${soloResult.improve}%)`);
    }

    if (useRealistic && (['技能型', '能量填充M', '树果遽增', '拉帝欧斯（神兽）'].includes(calcType))) {
        // 实战估算（打折）
        let realisticSolo = compute(calcType, pokemonName, selectedSubs, nature, false, true);
        let realisticTeam = null;
        if (hasHelper) realisticTeam = compute(calcType, pokemonName, selectedSubs, nature, true, true);
        lines.push('');
        lines.push('【实战估算】');
        lines.push(`技能概率倍率 (打折后): ${realisticSolo.M_p}`);
        if (hasHelper) {
            lines.push(`单帮手: ${realisticSolo.total} (${realisticSolo.improve}%)`);
            lines.push(`5帮手: ${realisticTeam.total} (${realisticTeam.improve}%)`);
        } else {
            lines.push(`总倍率: ${realisticSolo.total} (${realisticSolo.improve}%)`);
        }
    }

    helperOverflowAnalysis(selectedSubs, lines);

    if (calcType === '能量填充M' || calcType === '树果遽增' || calcType === '拉帝欧斯（神兽）') {
        lines.push('※ 基准为纯白板（无树果S），树果S为可选副技能。');
        lines.push('※ 技能就绪待机可能导致实际能量比理论值低约2~4%。');
    }
    if (calcType === '技能型') lines.push('※ 技能就绪待机可能导致实际技能次数略低于理论值。');
    if (['能量填充M', '树果遽增', '拉帝欧斯（神兽）', '技能型'].includes(calcType))
        lines.push('※ 睡眠期间技能若无人收取，实际产出可能低于理论值。');
    if (calcType === '拉帝欧斯（神兽）')
        lines.push('※ 神兽：技能受同属性队友影响，计算基于最大加成（78树果）。');

    resultBox.textContent = lines.join('\n');
}
