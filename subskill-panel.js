// ========== 副技能选择面板（V0.1.8.4 顺序多选+反馈修复） ==========
const SUB_SKILLS_GRID = document.getElementById('subSkillGrid');
const MAX_SLOTS = 5;
let selectedSkills = new Array(MAX_SLOTS).fill(null);

function getSelectedSubs() {
    return selectedSkills.filter(s => s !== null);
}

function getSkillCategory(skillName) {
    if (!skillName) return '';
    const skill = SUB_SKILLS[skillName];
    return skill ? skill.category : '';
}

function getSlotLevel(skillName) {
    let index = selectedSkills.indexOf(skillName);
    if (index === -1) return null;
    const levels = [10, 25, 50, 70, 80];
    return levels[index];
}

function renderSubSkillGrid() {
    SUB_SKILLS_GRID.innerHTML = '';
    const levels = [10, 25, 50, 70, 80];
    for (let i = 0; i < MAX_SLOTS; i++) {
        let slot = document.createElement('div');
        slot.className = 'skill-slot';
        if (selectedSkills[i]) {
            slot.textContent = selectedSkills[i];
            slot.classList.add('filled');
            let cat = getSkillCategory(selectedSkills[i]);
            if (cat === 'gold') slot.classList.add('gold');
            else if (cat === 'blue') slot.classList.add('blue');
            else if (cat === 'white') slot.classList.add('white');
            // 已移除角标
        } else {
            slot.textContent = `Lv.${levels[i]}`;
        }
        slot.onclick = () => openSubSkillMenu(i, levels[i]);
        SUB_SKILLS_GRID.appendChild(slot);
    }
}

function openSubSkillMenu(slotIndex, level) {
    let overlay = document.createElement('div');
    overlay.className = 'skill-menu-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) document.body.removeChild(overlay); };

    let menu = document.createElement('div');
    menu.className = 'skill-menu';

    let title = document.createElement('div');
    title.className = 'skill-menu-title';
    title.textContent = `请选择等级：${level} 的副技能`;
    menu.appendChild(title);

    function buildSection(skills, colorClass) {
        let section = document.createElement('div');
        section.className = 'skill-menu-section';
        section.innerHTML = `<b>${colorClass === 'gold' ? '金色' : colorClass === 'blue' ? '蓝色' : '白色'}副技能</b>`;
        let grid = document.createElement('div');
        grid.className = 'skill-menu-grid';
        skills.forEach(skill => {
            let btn = document.createElement('button');
            btn.className = `skill-btn ${colorClass}`;
            btn.setAttribute('data-skill', skill);  // 存储纯净技能名
            btn.style.position = 'relative';
            btn.textContent = skill;
            let badge = document.createElement('span');
            badge.className = 'menu-badge';
            badge.style.display = 'none';
            let slotLevel = getSlotLevel(skill);
            if (slotLevel !== null) {
                badge.textContent = slotLevel;
                badge.style.display = 'inline-block';
                btn.classList.add('selected');
            }
            btn.appendChild(badge);
            btn.onclick = () => {
                let existingIndex = selectedSkills.indexOf(skill);
                if (existingIndex !== -1) {
                    // 取消选择
                    selectedSkills[existingIndex] = null;
                } else {
                    // 优先填入第一个空位，若没有空位则替换当前格子
                    let emptyIndex = selectedSkills.findIndex(s => s === null);
                    if (emptyIndex !== -1) {
                        selectedSkills[emptyIndex] = skill;
                    } else {
                        selectedSkills[slotIndex] = skill;
                    }
                }
                renderSubSkillGrid();
                updateAllMenuBadges(overlay);
                // 如果所有格子都填满了，自动关闭菜单
                if (selectedSkills.every(s => s !== null)) {
                    document.body.removeChild(overlay);
                }
            };
            grid.appendChild(btn);
        });
        section.appendChild(grid);
        menu.appendChild(section);
    }

    buildSection(["树果S", "帮手奖励", "睡眠EXP奖励", "研究EXP奖励", "活力回复奖励", "梦之碎片奖励", "技能等级M"], 'gold');
    buildSection(["技能等级S", "帮M", "技概M", "食概M", "持有上限L", "持有上限M"], 'blue');
    buildSection(["帮S", "技概S", "食概S", "持有上限S"], 'white');

    let footer = document.createElement('div');
    footer.className = 'skill-menu-footer';
    let clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'skill-clear-btn';
    clearAllBtn.textContent = '清空全部';
    clearAllBtn.onclick = () => {
        selectedSkills.fill(null);
        renderSubSkillGrid();
        updateAllMenuBadges(overlay);
    };
    let closeBtn = document.createElement('button');
    closeBtn.className = 'skill-close-btn';
    closeBtn.textContent = '关闭';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    footer.appendChild(clearAllBtn);
    footer.appendChild(closeBtn);
    menu.appendChild(footer);

    overlay.appendChild(menu);
    document.body.appendChild(overlay);
}

function updateAllMenuBadges(overlay) {
    let buttons = overlay.querySelectorAll('.skill-btn');
    buttons.forEach(btn => {
        let skill = btn.getAttribute('data-skill');  // 使用属性获取准确技能名
        if (!skill) return;
        let badge = btn.querySelector('.menu-badge');
        if (!badge) return;
        let slotLevel = getSlotLevel(skill);
        if (slotLevel !== null) {
            badge.textContent = slotLevel;
            badge.style.display = 'inline-block';
            btn.classList.add('selected');
        } else {
            badge.style.display = 'none';
            btn.classList.remove('selected');
        }
    });
}
