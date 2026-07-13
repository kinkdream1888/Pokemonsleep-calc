// ========== 捕捉概率计算（基于全量组合遍历与纯理论效率比） ==========

const efficiencyCache = new Map();
const natureList = Object.keys(NATURES);
const allSkills = Object.keys(SUB_SKILLS);
const goldSkills = new Set(['树果S', '帮手奖励', '睡眠EXP奖励', '研究EXP奖励', '活力回复奖励', '梦之碎片奖励', '技能等级M']);

// 有序排列生成
function generatePermutations(skills, len) {
    if (len === 0) return [[]];
    const result = [];
    for (let i = 0; i < skills.length; i++) {
        const remaining = skills.filter((_, idx) => idx !== i);
        const subPerms = generatePermutations(remaining, len - 1);
        for (const sp of subPerms) {
            result.push([skills[i], ...sp]);
        }
    }
    return result;
}

// 计算纯理论效率值，若包含帮手奖励则使用团队满配加成
function calcEfficiencyValue(calcType, pokeName, subs, nature) {
    const useTeam = subs.includes('帮手奖励');
    const result = compute(calcType, pokeName, subs, nature, useTeam, false);
    if (result.total === '数据待补全') return -1;
    return parseFloat(result.total);
}

// 构建缓存
function buildCache(calcType, pokeName, simLevel) {
    const key = `${calcType}|${pokeName}|${simLevel}`;
    if (efficiencyCache.has(key)) return;

    const perms = generatePermutations(allSkills, simLevel);
    const effMatrix = new Array(perms.length);
    for (let i = 0; i < perms.length; i++) {
        effMatrix[i] = new Array(25);
        const subs = perms[i];
        for (let j = 0; j < 25; j++) {
            effMatrix[i][j] = calcEfficiencyValue(calcType, pokeName, subs, natureList[j]);
        }
    }
    efficiencyCache.set(key, { permList: perms, effMatrix });
}

// 主概率计算
function calculateProbability() {
    const probDiv = document.getElementById('probResult');
    const selectedSubs = getSelectedSubs();
    if (selectedSubs.length === 0) {
        probDiv.innerHTML = '※ 请至少选择一个副技能。';
        probDiv.style.display = 'block';
        return;
    }

    const calcType = typeSelect.value;
    const pokeName = (pokeSelect && pokeSelect.value) || '';
    const currentNature = natureSelect.value;
    const lockGold = parseInt(document.getElementById('lockGold').value, 10);
    const simLevel = parseInt(document.getElementById('simLevel').value, 10);

    // 计算当前面板效率（同样启用团队加成若包含帮手奖励）
    const currentTotal = calcEfficiencyValue(calcType, pokeName, selectedSubs, currentNature);
    if (currentTotal < 0) {
        probDiv.innerHTML = '※ 当前宝可梦数据未完成，无法计算概率。';
        probDiv.style.display = 'block';
        return;
    }

    probDiv.innerHTML = '正在计算全量组合，请稍候...';
    probDiv.style.display = 'block';

    setTimeout(() => {
        try {
            buildCache(calcType, pokeName, simLevel);
            const cache = efficiencyCache.get(`${calcType}|${pokeName}|${simLevel}`);
            const { permList, effMatrix } = cache;

            // 筛选符合锁金条件的排列
            const validIndices = [];
            for (let i = 0; i < permList.length; i++) {
                const perm = permList[i];
                let ok = true;
                for (let g = 0; g < lockGold; g++) {
                    if (!goldSkills.has(perm[g])) {
                        ok = false;
                        break;
                    }
                }
                if (ok) validIndices.push(i);
            }

            let betterOrEqual = 0;
            for (const idx of validIndices) {
                const row = effMatrix[idx];
                for (let j = 0; j < 25; j++) {
                    if (row[j] >= currentTotal) betterOrEqual++;
                }
            }

            const totalCombos = validIndices.length * 25;
            const probability = (betterOrEqual / totalCombos) * 100;
            const rankPercent = probability.toFixed(4);

            const subsText = selectedSubs.join(', ');
            const lockText = lockGold > 0 ? ` (锁${lockGold}金)` : '';
            const levelText = simLevel === 4 ? '前4格(70级)' : '前3格(50级)';

            let html = `<strong>【捕捉概率估算】</strong><br>`;
            html += `当前配置: ${subsText} | ${currentNature} | ${levelText}${lockText}<br>`;
            html += `纯理论效率比: <b>${currentTotal.toFixed(4)}</b><br>`;
            if (subsText.includes('帮手奖励')) {
                html += `<span style="color:#2980b9;">※ 帮手奖励已按最大团队加成(25%帮速)评估。</span><br>`;
            }
            html += `有效组合总数: ${totalCombos.toLocaleString()}<br>`;
            html += `不低于当前效率的组合: ${betterOrEqual.toLocaleString()}<br>`;
            html += `<span style="font-size:1.1em;color:#e67e22;">捕捉概率(≥当前): <b>${probability.toFixed(6)}%</b></span><br>`;
            html += `超越组合比例: 排名前 ${rankPercent}%`;

            probDiv.innerHTML = html;
        } catch (e) {
            probDiv.innerHTML = `※ 计算出错: ${e.message}`;
            console.error(e);
        }
    }, 50);
}
