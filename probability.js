// ========== 捕捉概率计算（基于全量组合遍历与纯理论效率比） ==========

// 缓存结构：Map<key, { permList: 副技能排列数组, effMatrix: number[][] }>
// key = `${calcType}|${pokeName}|${simLevel}`
// permList: 每个元素是长度为simLevel的副技能名数组
// effMatrix: permList.length x 25 的二维数组，effMatrix[i][j] 为 permList[i] 搭配 natureList[j] 的效率比数值
const efficiencyCache = new Map();
const natureList = Object.keys(NATURES); // 25种性格的固定顺序
const allSkills = Object.keys(SUB_SKILLS); // 17种副技能
const goldSkills = new Set(['树果S', '帮手奖励', '睡眠EXP奖励', '研究EXP奖励', '活力回复奖励', '梦之碎片奖励', '技能等级M']);

/**
 * 生成有序排列（从 skills 中选 len 个不重复的技能）
 */
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

/**
 * 计算单个配置的效率比数值（纯理论，无实战/团队）
 */
function calcEfficiencyValue(calcType, pokeName, subs, nature) {
    // 直接调用 compute 并解析 total，注意 compute 可能返回 total 为字符串
    const result = compute(calcType, pokeName, subs, nature, false, false);
    if (result.total === '数据待补全') return -1; // 无效标记
    return parseFloat(result.total);
}

/**
 * 构建指定宝可梦/模拟等级的缓存
 */
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
    efficiencyCache.set(key, { permList: perms, effMatrix: effMatrix });
}

/**
 * 主概率计算函数
 */
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
    const simLevel = parseInt(document.getElementById('simLevel').value, 10); // 3 或 4

    // 计算当前面板效率比
    const currentTotal = calcEfficiencyValue(calcType, pokeName, selectedSubs, currentNature);
    if (currentTotal < 0) {
        probDiv.innerHTML = '※ 当前宝可梦数据未完成，无法计算概率。';
        probDiv.style.display = 'block';
        return;
    }

    // 显示加载状态
    probDiv.innerHTML = '正在计算全量组合，请稍候...';
    probDiv.style.display = 'block';

    // 异步计算，避免阻塞UI
    setTimeout(() => {
        try {
            // 建立缓存（如果尚未建立）
            buildCache(calcType, pokeName, simLevel);
            const cache = efficiencyCache.get(`${calcType}|${pokeName}|${simLevel}`);
            const { permList, effMatrix } = cache;

            // 根据锁金筛选排列索引
            const validIndices = [];
            for (let i = 0; i < permList.length; i++) {
                const perm = permList[i];
                let goldOk = true;
                for (let g = 0; g < lockGold; g++) {
                    if (!goldSkills.has(perm[g])) {
                        goldOk = false;
                        break;
                    }
                }
                if (goldOk) validIndices.push(i);
            }

            // 统计不低于当前效率的组合数
            let betterOrEqual = 0;
            for (const idx of validIndices) {
                const row = effMatrix[idx];
                for (let j = 0; j < 25; j++) {
                    if (row[j] >= currentTotal) betterOrEqual++;
                }
            }

            const totalCombos = validIndices.length * 25;
            const probability = (betterOrEqual / totalCombos) * 100;
            const rankPercent = ((betterOrEqual / totalCombos) * 100).toFixed(4);

            // 格式化输出
            const natureText = currentNature;
            const subsText = selectedSubs.join(', ');
            const lockGoldText = lockGold > 0 ? ` (锁${lockGold}金)` : '';
            const levelText = simLevel === 4 ? '前4格(70级)' : '前3格(50级)';

            let html = `<strong>【捕捉概率估算】</strong><br>`;
            html += `当前配置: ${subsText} | ${natureText} | ${levelText}${lockGoldText}<br>`;
            html += `纯理论效率比: <b>${currentTotal.toFixed(4)}</b><br>`;
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
