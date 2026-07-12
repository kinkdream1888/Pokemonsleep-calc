// ========== 捕捉概率计算（V0.1.8 智能版） ==========
function calculateProbability() {
    let selectedSubs = getSelectedSubs();
    if (selectedSubs.length === 0) {
        document.getElementById('probResult').innerHTML = '※ 请至少选择一个副技能。';
        document.getElementById('probResult').style.display = 'block';
        return;
    }

    let lockGold = parseInt(document.getElementById('lockGold').value);
    let simSlots = parseInt(document.getElementById('simLevel').value);
    let calcType = typeSelect.value;
    let pokeValue = pokeSelect ? pokeSelect.value : null;

    if (calcType === '幻兽') {
        document.getElementById('probResult').innerHTML = '※ 幻兽副技能需使用灵感种子刷新，因此暂时无法计算';
        document.getElementById('probResult').style.display = 'block';
        return;
    }

    // 自动计算更优性格概率
    let currentNature = natureSelect.value;
    let currentNatureInfo = NATURES[currentNature];
    let betterCount = 0;
    for (let n of Object.keys(NATURES)) {
        let info = NATURES[n];
        let currentTotal, natureTotal;
        if (calcType === '树果型') {
            currentTotal = currentNatureInfo.speed;
            natureTotal = info.speed;
        } else if (calcType === '食材型') {
            currentTotal = currentNatureInfo.speed * currentNatureInfo.food;
            natureTotal = info.speed * info.food;
        } else {
            currentTotal = currentNatureInfo.speed * currentNatureInfo.skill;
            natureTotal = info.speed * info.skill;
        }
        if (natureTotal >= currentTotal) betterCount++;
    }
    let natureProb = betterCount / 25;

    const GOLD_SKILLS = ["树果S", "帮手奖励", "睡眠EXP奖励", "研究EXP奖励", "活力回复奖励", "梦之碎片奖励", "技能等级M"];
    const BLUE_SKILLS = ["技能等级S", "技概M", "帮M", "食概M", "持有上限L", "持有上限M"];
    const WHITE_SKILLS = ["技概S", "帮S", "食概S", "持有上限S"];

    const WEIGHTS = {};
    GOLD_SKILLS.forEach(s => WEIGHTS[s] = 0.02);
    BLUE_SKILLS.forEach(s => WEIGHTS[s] = 0.055);
    WHITE_SKILLS.forEach(s => WEIGHTS[s] = 0.1325);

    for (let sub of selectedSubs) {
        if (!(sub in WEIGHTS)) { alert(`未知副技能: ${sub}`); return; }
    }

    const targetSkills = selectedSubs.filter(s => s in WEIGHTS);
    if (targetSkills.length > simSlots) {
        document.getElementById('probResult').innerHTML = `<b>错误：</b>目标技能数超过可用格数（${simSlots}格）。`;
        document.getElementById('probResult').style.display = 'block';
        return;
    }

    const TOTAL_SKILLS = [...GOLD_SKILLS, ...BLUE_SKILLS, ...WHITE_SKILLS];
    let successCount = 0;
    const SIM_COUNT = 1000000;

    for (let i = 0; i < SIM_COUNT; i++) {
        let pool = [...TOTAL_SKILLS];
        let chosen = [];

        for (let g = 0; g < Math.min(lockGold, simSlots); g++) {
            let goldPool = GOLD_SKILLS.filter(s => pool.includes(s));
            if (goldPool.length === 0) break;
            let pick = goldPool[Math.floor(Math.random() * goldPool.length)];
            chosen.push(pick);
            pool.splice(pool.indexOf(pick), 1);
        }

        let remainingSlots = simSlots - chosen.length;
        for (let s = 0; s < remainingSlots; s++) {
            let poolWeight = pool.reduce((sum, skill) => sum + WEIGHTS[skill], 0);
            let rand = Math.random() * poolWeight;
            let cumulative = 0;
            let pickedSkill = pool[pool.length - 1];
            for (let skill of pool) {
                cumulative += WEIGHTS[skill];
                if (rand <= cumulative) { pickedSkill = skill; break; }
            }
            chosen.push(pickedSkill);
            pool.splice(pool.indexOf(pickedSkill), 1);
        }

        // 至少包含所有目标技能
        let foundAll = true;
        for (let ts of targetSkills) {
            if (!chosen.includes(ts)) { foundAll = false; break; }
        }
        if (foundAll) successCount++;
    }

    let prob = (successCount / SIM_COUNT) * 100 * natureProb;
    let foodNote = '';
    if (calcType === '食材型' || (calcType === '技能型' && pokeValue && SPECIAL_SKILL_MONS_DATA[pokeValue])) {
        prob *= (1/9);
        foodNote = '\n※ 已计入食材组合 AAA 的概率 (1/9)。';
    }
    let oneOver = Math.round(1 / (prob / 100));
    let resultText = `【捕捉概率估算】
副技能: ${selectedSubs.join(', ')}
性格条件: 基于 ${currentNature}，更优性格共 ${betterCount} 个 (概率 ${natureProb.toFixed(4)})
模拟等级: ${simSlots === 3 ? '50级（前3格）' : '70级（前4格）'}
锁金数: ${lockGold}
近似概率: ${prob.toFixed(6)}% (约 1/${oneOver})
${foodNote}
${selectedSubs.some(s => s.endsWith('S')) ? '※ 若出现S级技能，可使用银瓜子升级至M。' : ''}
※ 基于100万次模拟，前${simSlots}格无放回抽取。
※ 概率表示“至少包含”指定副技能组合，并涵盖所有更优性格的出货率。`;

    document.getElementById('probResult').innerHTML = resultText.replace(/\n/g, '<br>');
    document.getElementById('probResult').style.display = 'block';
}