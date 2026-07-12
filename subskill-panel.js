// ========== 副技能选择面板（V0.1.8.2 连续点选版） ==========
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
            // 等级角标
            let badge = document.createElement('span');
            badge.className = 'level-badge';
            badge.textContent = levels[i];
            slot.appendChild(badge);
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
    title.textContent = '选择副技能（可连续点选，自动填充空位）';
    menu.appendChild(title);

    const GOLD_SKILLS = ["树果S", "帮手奖励", "睡眠EXP奖励", "研究EXP奖励", "活力回复奖励", "梦之碎片奖励", "技能等级M"];
    let goldSection = document.createElement('div');
    goldSection.className = 'skill-menu-section';
    goldSection.innerHTML = '<b>金色副技能</b>';
    let goldGrid = document.createElement('div');
    goldGrid.className = 'skill-menu-grid';
    GOLD_SKILLS.forEach(skill => {
        let btn = document.createElement('button');
        btn.className = 'skill-btn gold';
        btn.textContent = skill;
        btn.disabled = selectedSkills.includes(skill);
        btn.onclick = () => {
            let emptyIndex = selectedSkills.findIndex(s => s === null);
            if (emptyIndex !== -1) {
                selectedSkills[emptyIndex] = skill;
                renderSubSkillGrid();
                if (selectedSkills.every(s => s !== null)) {
                    document.body.removeChild(overlay);
                }
            }
        };
        goldGrid.appendChild(btn);
    });
    goldSection.appendChild(goldGrid);
    menu.appendChild(goldSection);

    const BLUE_SKILLS = ["技能等级S", "帮M", "技概M", "食概M", "持有上限L", "持有上限M"];
    let blueSection = document.createElement('div');
    blueSection.className = 'skill-menu-section';
    blueSection.innerHTML = '<b>蓝色副技能</b>';
    let blueGrid = document.createElement('div');
    blueGrid.className = 'skill-menu-grid';
    BLUE_SKILLS.forEach(skill => {
        let btn = document.createElement('button');
        btn.className = 'skill-btn blue';
        btn.textContent = skill;
        btn.disabled = selectedSkills.includes(skill);
        btn.onclick = () => {
            let emptyIndex = selectedSkills.findIndex(s => s === null);
            if (emptyIndex !== -1) {
                selectedSkills[emptyIndex] = skill;
                renderSubSkillGrid();
                if (selectedSkills.every(s => s !== null)) {
                    document.body.removeChild(overlay);
                }
            }
        };
        blueGrid.appendChild(btn);
    });
    blueSection.appendChild(blueGrid);
    menu.appendChild(blueSection);

    const WHITE_SKILLS = ["帮S", "技概S", "食概S", "持有上限S"];
    let whiteSection = document.createElement('div');
    whiteSection.className = 'skill-menu-section';
    whiteSection.innerHTML = '<b>白色副技能</b>';
    let whiteGrid = document.createElement('div');
    whiteGrid.className = 'skill-menu-grid';
    WHITE_SKILLS.forEach(skill => {
        let btn = document.createElement('button');
        btn.className = 'skill-btn white';
        btn.textContent = skill;
        btn.disabled = selectedSkills.includes(skill);
        btn.onclick = () => {
            let emptyIndex = selectedSkills.findIndex(s => s === null);
            if (emptyIndex !== -1) {
                selectedSkills[emptyIndex] = skill;
                renderSubSkillGrid();
                if (selectedSkills.every(s => s !== null)) {
                    document.body.removeChild(overlay);
                }
            }
        };
        whiteGrid.appendChild(btn);
    });
    whiteSection.appendChild(whiteGrid);
    menu.appendChild(whiteSection);

    let footer = document.createElement('div');
    footer.className = 'skill-menu-footer';
    let clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'skill-clear-btn';
    clearAllBtn.textContent = '清空全部';
    clearAllBtn.onclick = () => {
        selectedSkills.fill(null);
        renderSubSkillGrid();
        document.body.removeChild(overlay);
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
