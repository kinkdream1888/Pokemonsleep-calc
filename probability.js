// ========== 智能捕捉概率计算（基于效率比遍历组合） ==========
function calculateProbability() {
    let selectedSubs = getSelectedSubs();
    if (selectedSubs.length === 0) {
        document.getElementById('probResult').innerHTML = '※ 请至少选择一个副技能。';
        document.getElementById('probResult').style.display = 'block';
        return;
    }
    let calcType = typeSelect.value;
    let pokeValue = pokeSelect ? pokeSelect.value : null;
    let nature = natureSelect.value;
    let currentTotal = getCurrentEfficiency(calcType, pokeValue, selectedSubs, nature);

    const allSkills = Object.keys(SUB_SKILLS);
    let betterCount = 0;
    let totalCombos = 0;

    // 遍历所有4副技能组合
    for (let i = 0; i < allSkills.length; i++) {
        for (let j = i + 1; j < allSkills.length; j++) {
            for (let k = j + 1; k < allSkills.length; k++) {
                for (let l = k + 1; l < allSkills.length; l++) {
                    let combo = [allSkills[i], allSkills[j], allSkills[k], allSkills[l]];
                    let comboTotal = getCurrentEfficiency(calcType, pokeValue, combo, nature);
                    if (comboTotal >= currentTotal) betterCount++;
                    totalCombos++;
                }
            }
        }
    }

    // 性格概率：所有不低于当前性格的效率比的性格
    let currentNatureInfo = NATURES[nature];
    let betterNatureCount = 0;
    for (let nat of Object.keys(NATURES)) {
        let info = NATURES[nat];
        let natureTotal;
        if (calcType === '树果型') natureTotal = info.speed;
        else if (calcType === '食材型') natureTotal = info.speed * info.food;
        else natureTotal = info.speed * info.skill;
        let currentNatureTotal;
        if (calcType === '树果型') currentNatureTotal = currentNatureInfo.speed;
        else if (calcType === '食材型') currentNatureTotal = currentNatureInfo.speed * currentNatureInfo.food;
        else currentNatureTotal = currentNatureInfo.speed * currentNatureInfo.skill;
        if (natureTotal >= currentNatureTotal) betterNatureCount++;
    }

    let prob = (betterCount / totalCombos) * (betterNatureCount / 25) * 100;
    let resultText = `【捕捉概率估算】\n目标配置: ${selectedSubs.join(', ')}\n更优副技能组合: ${betterCount}/${totalCombos}\n更优性格: ${betterNatureCount}/25\n近似概率: ${prob.toFixed(6)}%`;

    document.getElementById('probResult').innerHTML = resultText.replace(/\n/g, '<br>');
    document.getElementById('probResult').style.display = 'block';
}

function getCurrentEfficiency(calcType, pokeName, subs, nature) {
    let { speedMult, skillMult, foodMult, berryMult } = calcMultipliers(subs, nature, false);
    if (calcType === '树果型') return speedMult * (subs.includes('树果S') ? 1.5 : 1.0);
    if (calcType === '食材型') return speedMult * foodMult;
    if (calcType === '技能型') return speedMult * skillMult;
    return speedMult * skillMult; // 默认综合
}
