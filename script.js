// ============================================================
// CONSTANTS
// ============================================================
const TURN_INTERVAL = 250;
const PASSIVE_TICK_INTERVAL = 1000;
const MAX_OFFLINE_HOURS = 12;
const TILE_SIZE = 32;
const ROOM_MIN_SIZE = 6;
const ROOM_MAX_SIZE = 12;
const MOVE_SPEED = 0.15;
const ATTACK_RANGE = 1.5;

const CLASS_DEFINITIONS = {
    fighter:   { name: 'Fighter',   role: 'Tank',       sprite: '🛡️', baseStats: { dmg: 6, atk: 10, arm: 10, def: 12, hp: 130 }, healthPerLevel: 16, spiritPerLevel: 3 },
    barbarian: { name: 'Barbarian', role: 'Bruiser',    sprite: '⚔️', baseStats: { dmg: 12, atk: 12, arm: 6, def: 8, hp: 110 }, healthPerLevel: 14, spiritPerLevel: 4 },
    rogue:     { name: 'Rogue',      role: 'Assassin',   sprite: '🗡️', baseStats: { dmg: 9, atk: 16, arm: 4, def: 12, hp: 80 }, healthPerLevel: 9, spiritPerLevel: 5 },
    priest:    { name: 'Priest',     role: 'Healer',     sprite: '✝️', baseStats: { dmg: 4, atk: 8, arm: 3, def: 8, hp: 70 }, healthPerLevel: 8, spiritPerLevel: 14 },
    druid:     { name: 'Druid',      role: 'Summoner',   sprite: '🌿', baseStats: { dmg: 6, atk: 10, arm: 5, def: 9, hp: 90 }, healthPerLevel: 11, spiritPerLevel: 8 },
    electromancer: { name: 'Electromancer', role: 'Mage', sprite: '⚡', baseStats: { dmg: 16, atk: 18, arm: 2, def: 6, hp: 60 }, healthPerLevel: 6, spiritPerLevel: 15 },
    pyromancer: { name: 'Pyromancer', role: 'Mage',      sprite: '🔥', baseStats: { dmg: 15, atk: 16, arm: 2, def: 6, hp: 60 }, healthPerLevel: 6, spiritPerLevel: 14 },
    archer:    { name: 'Archer',     role: 'Ranged',     sprite: '🏹', baseStats: { dmg: 13, atk: 17, arm: 3, def: 9, hp: 75 }, healthPerLevel: 10, spiritPerLevel: 6 }
};

const NODE_DEFINITIONS = [
    { id: 'goblin_territory', name: 'Goblin Territory', icon: '🏔️', level: 1,
      castle: { name: "Goblin King's Lair", boss: { name: 'Goblin King', sprite: '👑', stats: { dmg: 10, atk: 15, arm: 5, def: 10, hp: 200 }, gold: 250, xp: 150 } },
      dungeons: [
          { id: 'goblin_cave', name: 'Goblin Cave', icon: '🕳️', level: 1, cost: 100, killRate: 0.5, goldPerKill: 6, xpPerKill: 12 },
          { id: 'goblin_camp', name: 'Goblin Camp', icon: '⛺', level: 2, cost: 150, killRate: 0.4, goldPerKill: 9, xpPerKill: 18 }
      ],
      unlocks: ['wolf_forest'] },
    { id: 'wolf_forest', name: 'Wolf Forest', icon: '🌲', level: 5,
      castle: { name: 'Wolf Den', boss: { name: 'Alpha Wolf', sprite: '🐺', stats: { dmg: 18, atk: 22, arm: 8, def: 14, hp: 350 }, gold: 600, xp: 300 } },
      dungeons: [
          { id: 'wolf_den', name: 'Wolf Den', icon: '🐺', level: 5, cost: 400, killRate: 0.4, goldPerKill: 15, xpPerKill: 30 },
          { id: 'spider_nest', name: 'Spider Nest', icon: '🕷️', level: 7, cost: 600, killRate: 0.3, goldPerKill: 22, xpPerKill: 45 }
      ],
      unlocks: ['undead_crypts'] },
    { id: 'undead_crypts', name: 'Undead Crypts', icon: '💀', level: 10,
      castle: { name: 'Lich Tower', boss: { name: 'Ancient Lich', sprite: '💀', stats: { dmg: 30, atk: 32, arm: 12, def: 28, hp: 550 }, gold: 1800, xp: 800 } },
      dungeons: [
          { id: 'skeleton_tombs', name: 'Skeleton Tombs', icon: '⚰️', level: 10, cost: 1200, killRate: 0.3, goldPerKill: 30, xpPerKill: 60 },
          { id: 'zombie_pit', name: 'Zombie Pit', icon: '🧟', level: 12, cost: 1500, killRate: 0.25, goldPerKill: 45, xpPerKill: 85 },
          { id: 'ghost_hall', name: 'Ghost Hall', icon: '👻', level: 14, cost: 2000, killRate: 0.2, goldPerKill: 65, xpPerKill: 110 }
      ],
      unlocks: ['orc_stronghold', 'demon_realm'] }
];

const MONSTER_TEMPLATES = {
    goblin: { name: 'Goblin', sprite: '👺', stats: { dmg: 4, atk: 6, arm: 1, def: 4, hp: 25 } },
    wolf:    { name: 'Wolf',   sprite: '🐺', stats: { dmg: 6, atk: 9, arm: 2, def: 6, hp: 40 } },
    spider:  { name: 'Spider', sprite: '🕷️', stats: { dmg: 8, atk: 11, arm: 2, def: 7, hp: 45 } },
    skeleton:{ name: 'Skeleton', sprite: '💀', stats: { dmg: 12, atk: 13, arm: 4, def: 9, hp: 60 } },
    zombie:  { name: 'Zombie', sprite: '🧟', stats: { dmg: 14, atk: 11, arm: 6, def: 7, hp: 100 } },
    ghost:   { name: 'Ghost',  sprite: '👻', stats: { dmg: 18, atk: 16, arm: 0, def: 22, hp: 55 } },
    orc:     { name: 'Orc',    sprite: '👹', stats: { dmg: 22, atk: 15, arm: 9, def: 12, hp: 130 } },
    demon:   { name: 'Demon',  sprite: '😈', stats: { dmg: 30, atk: 24, arm: 12, def: 17, hp: 200 } },
    dragon:  { name: 'Dragon', sprite: '🐉', stats: { dmg: 40, atk: 28, arm: 18, def: 20, hp: 300 } }
};

const SCROLLS = [
    { name: 'Fire Scroll', damage: 50, icon: '🔥', key: '1' },
    { name: 'Ice Scroll', damage: 40, icon: '❄️', key: '2' },
    { name: 'Lightning Scroll', damage: 60, icon: '⚡', key: '3' },
    { name: 'Poison Scroll', damage: 35, icon: '☠️', key: '4' },
    { name: 'Holy Scroll', damage: 45, icon: '✨', key: '5' },
    { name: 'Death Scroll', damage: 100, icon: '💀', key: '6' }
];

const POTIONS = [
    { name: 'Speed Potion', duration: 30, effect: 'speed', icon: '🏃' },
    { name: 'Strength Potion', duration: 30, effect: 'strength', icon: '💪' },
    { name: 'Gold Find Potion', duration: 30, effect: 'goldFind', icon: '💰' },
    { name: 'Double Gold', duration: 30, effect: 'doubleGold', icon: '💎' },
    { name: 'Double Drops', duration: 30, effect: 'doubleDrops', icon: '🎁' },
    { name: 'Invincibility Potion', duration: 15, effect: 'invincible', icon: '🛡️' },
    { name: 'Docile Monsters', duration: 20, effect: 'docileMonsters', icon: '😴' },
    { name: 'Infinite Scrolls', duration: 30, effect: 'infiniteScrolls', icon: '📜' }
];

const ITEM_TYPES = {
    WEAPON: ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger'],
    ARMOR:  ['Helmet', 'Chest', 'Legs', 'Boots', 'Gloves'],
    ACCESSORY: ['Ring', 'Amulet', 'Belt']
};
const ITEM_RARITY = {
    COMMON:    { name: 'Common',    color: '#9ca3af', mult: 1.0 },
    UNCOMMON:  { name: 'Uncommon',  color: '#22c55e', mult: 1.5 },
    RARE:      { name: 'Rare',      color: '#3b82f6', mult: 2.0 },
    LEGENDARY: { name: 'Legendary', color: '#f59e0b', mult: 3.0 }
};

const PRESTIGE_UPGRADES = [
    { id: 'extra_slot', name: 'Extra Character Slot', desc: '+1 party slot', cost: 10, max: 4 },
    { id: 'cooldown_red', name: 'Swift Skills', desc: '-10% cooldowns', cost: 15, max: 5 },
    { id: 'farm_speed', name: 'Efficient Farms', desc: '+20% farm kill rate', cost: 20, max: 5 },
    { id: 'gold_bonus', name: 'Golden Touch', desc: '+10% gold', cost: 12, max: 5 },
    { id: 'xp_bonus', name: 'Quick Learner', desc: '+10% XP', cost: 12, max: 5 }
];

const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', desc: 'Kill first enemy', req: 1, ap: 1 },
    { id: 'monster_slayer', name: 'Monster Slayer', desc: 'Kill 100 enemies', req: 100, ap: 5 },
    { id: 'legendary_hunter', name: 'Legendary Hunter', desc: 'Kill 1000 enemies', req: 1000, ap: 20 },
    { id: 'gold_hoarder', name: 'Gold Hoarder', desc: 'Earn 10k gold', req: 10000, ap: 3 },
    { id: 'castle_conqueror', name: 'Castle Conqueror', desc: 'Beat 3 bosses', req: 3, ap: 15 },
    { id: 'first_prestige', name: 'New Beginning', desc: 'Prestige once', req: 1, ap: 25 }
];

// ============================================================
// UTILITIES
// ============================================================
function generateId() { return Math.random().toString(36).substr(2, 9); }
function randomRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function formatNumber(n) {
    if (n >= 1e6) return (n/1e6).toFixed(1)+'M';
    if (n >= 1e3) return (n/1e3).toFixed(1)+'K';
    return Math.floor(n).toString();
}
function distance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}
function findNearest(from, positions) {
    let min = Infinity, idx = 0;
    positions.forEach((p, i) => {
        const d = distance(from, p);
        if (d < min) { min = d; idx = i; }
    });
    return { index: idx, distance: min };
}
function xpForLevel(level) { return Math.floor(100 * Math.pow(1.5, level - 1)); }

// ============================================================
// GAME STATE
// ============================================================
const GameState = {
    gold: 100,
    ap: 0,
    party: [],
    partyLocked: false,
    nodes: {},
    currentDungeon: null,
    currentRoomIdx: 0,
    monsters: [],
    loot: [],
    inventory: [],
    scrolls: SCROLLS.map(s => ({ ...s, count: 0 })),
    potions: POTIONS.map(p => ({ ...p, count: 0 })),
    activePotions: [],
    prestige: {},
    achievements: {},
    totalKills: 0,
    totalGold: 0,
    bossesDefeated: 0,
    paused: true,
    showFps: false,
    passive: { kills:0, gold:0, xp:0 },
    turn: 0,
    lastSave: Date.now(),
    floating: []
};

// ============================================================
// CLASSES
// ============================================================
class Character {
    constructor(cls, id) {
        const def = CLASS_DEFINITIONS[cls];
        this.id = id;
        this.class = cls;
        this.name = def.name;
        this.sprite = def.sprite;
        this.level = 1;
        this.xp = 0;
        this.xpNext = xpForLevel(2);
        this.hp = def.baseStats.hp;
        this.maxHp = def.baseStats.hp;
        this.base = { ...def.baseStats };
        this.equipment = {};
        this.skillPoints = 0;
        this.stunned = 0;
        this.cooldown = 0;
        this.pos = { x: 0, y: 0 };
        this.stats = { kills:0, dmgDealt:0, dmgTaken:0, crits:0 };
        this.hpPerLevel = def.healthPerLevel;
    }

    gainXP(amt) {
        this.xp += amt;
        while (this.xp >= this.xpNext) {
            this.xp -= this.xpNext;
            this.level++;
            this.skillPoints++;
            this.xpNext = xpForLevel(this.level + 1);
            this.maxHp += this.hpPerLevel;
            this.hp = this.maxHp;
            Game.recalcStats(this);
        }
    }

    takeDamage(amt) {
        if (GameState.activePotions.some(p => p.effect === 'invincible')) return 0;
        const dmg = Math.max(1, Math.floor(amt));
        this.hp -= dmg;
        this.stats.dmgTaken += dmg;
        if (this.hp <= 0) { this.hp = 0; this.stunned = 20; }
        return dmg;
    }

    attack(target) {
        if (this.cooldown > 0) return null;
        const stats = Game.totalStats(this);
        const hit = Math.random() < stats.atk / (stats.atk + target.defense);
        if (!hit) return { hit: false };
        const crit = Math.random() < 0.05 + this.level * 0.002;
        let dmg = stats.dmg;
        if (!crit) dmg = Math.max(1, dmg - target.armor);
        else { dmg = Math.floor(dmg * 1.5); this.stats.crits++; }
        const dealt = target.takeDamage(dmg);
        this.stats.dmgDealt += dealt;
        this.cooldown = 4 - (GameState.prestige.cooldown_red || 0);
        return { hit: true, dmg: dealt, crit };
    }

    update() {
        if (this.cooldown > 0) this.cooldown--;
        if (this.stunned > 0) this.stunned--;
        if (GameState.turn % 3 === 0 && !this.stunned) {
            this.hp = Math.min(this.maxHp, this.hp + 1 + (GameState.prestige.healthRegen || 0));
        }
    }
}

class Monster {
    constructor(level, type) {
        const t = MONSTER_TEMPLATES[type];
        this.id = generateId();
        this.type = type;
        this.sprite = t.sprite;
        this.level = level;
        this.isBoss = false;
        const mult = Math.pow(1.1, level - 1);
        this.maxHp = Math.floor(t.stats.hp * mult);
        this.hp = this.maxHp;
        this.dmg = Math.floor(t.stats.dmg * mult);
        this.armor = Math.floor(t.stats.arm * mult);
        this.atk = Math.floor(t.stats.atk * mult);
        this.defense = Math.floor(t.stats.def * mult);
        this.xp = Math.floor(20 * mult);
        this.pos = { x:0, y:0 };
        this.cooldown = 0;
    }

    makeBoss() {
        this.isBoss = true;
        this.maxHp *= 5;
        this.hp = this.maxHp;
        this.dmg *= 2;
        this.armor *= 1.5;
        this.xp *= 10;
        this.sprite = '💀';
    }

    takeDamage(amt) {
        if (GameState.activePotions.some(p => p.effect === 'docileMonsters')) {
            this.hp = 0;
            return this.maxHp;
        }
        if (GameState.activePotions.some(p => p.effect === 'frailMonsters')) amt *= 2;
        const dmg = Math.max(1, Math.floor(amt));
        this.hp -= dmg;
        return dmg;
    }

    attack(target) {
        if (this.cooldown > 0) return null;
        const hit = Math.random() < this.atk / (this.atk + target.defense);
        if (!hit) return { hit: false };
        const dmg = Math.max(1, this.dmg - target.armor);
        const dealt = target.takeDamage(dmg);
        this.cooldown = 5;
        return { hit: true, dmg: dealt };
    }

    update() { if (this.cooldown > 0) this.cooldown--; }
}

// ============================================================
// ITEM GENERATOR
// ============================================================
const ItemGen = {
    generate(level) {
        const rarity = this.rollRarity();
        const cat = randomPick(Object.keys(ITEM_TYPES));
        const type = randomPick(ITEM_TYPES[cat]);
        const mult = Math.pow(1.08, level-1) * ITEM_RARITY[rarity].mult;
        return {
            id: generateId(),
            name: `${ITEM_RARITY[rarity].name} ${type}`,
            type, rarity,
            dmg: cat==='WEAPON' ? Math.floor(10*mult) : 0,
            armor: cat==='ARMOR' ? Math.floor(5*mult) : 0,
            atk: Math.floor(3*mult),
            def: Math.floor(3*mult),
            hp: Math.floor(Math.random()*20*mult),
            value: Math.floor(50*mult)
        };
    },
    rollRarity() {
        const r = Math.random();
        if (r < 0.01) return 'LEGENDARY';
        if (r < 0.05) return 'RARE';
        if (r < 0.20) return 'UNCOMMON';
        return 'COMMON';
    }
};

// ============================================================
// DUNGEON GENERATOR
// ============================================================
const DungeonGen = {
    generate(nodeDef) {
        const rooms = [];
        nodeDef.dungeons.forEach(d => {
            rooms.push(this.room(nodeDef.level + d.level, false, d.name, d.icon));
        });
        rooms.push(this.room(nodeDef.level, true, nodeDef.castle.name, '👑', nodeDef.castle.boss));
        return { nodeId: nodeDef.id, name: nodeDef.name, level: nodeDef.level, rooms, currentRoom: 0 };
    },

    room(level, isBoss, name, icon, bossDef) {
        const w = randomRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
        const h = randomRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
        const bonus = GameState.activePotions.some(p => p.effect==='moreMonsters') ? 5 : 0;
        const count = isBoss ? 1 : randomRange(3, 8 + bonus);
        const monsters = [];
        for (let i=0; i<count; i++) {
            const type = randomPick(Object.keys(MONSTER_TEMPLATES));
            const m = new Monster(level, type);
            m.pos = { x: randomRange(2, w-2), y: randomRange(2, h-2) };
            monsters.push(m);
        }
        if (isBoss && monsters.length) {
            monsters[0].makeBoss();
            if (bossDef) {
                monsters[0].hp = bossDef.stats.hp;
                monsters[0].maxHp = bossDef.stats.hp;
                monsters[0].dmg = bossDef.stats.dmg;
                monsters[0].atk = bossDef.stats.atk;
                monsters[0].armor = bossDef.stats.arm;
                monsters[0].defense = bossDef.stats.def;
            }
        }
        return { name, icon, w, h, monsters, loot: [], cleared: false, isBoss };
    }
};

// ============================================================
// GAME LOGIC
// ============================================================
const Game = {
    init() {
        this.load();
        // init nodes
        NODE_DEFINITIONS.forEach((n,i) => {
            if (!GameState.nodes[n.id]) {
                GameState.nodes[n.id] = { unlocked: i===0, beaten: false, dungeons: {} };
                n.dungeons.forEach(d => GameState.nodes[n.id].dungeons[d.id] = { owned: false, active: false });
            }
        });
        ACHIEVEMENTS.forEach(a => { if (!GameState.achievements[a.id]) GameState.achievements[a.id] = { prog:0, done:false }; });
        PRESTIGE_UPGRADES.forEach(u => { if (!GameState.prestige[u.id]) GameState.prestige[u.id] = 0; });

        if (!GameState.party.length && !GameState.partyLocked) UI.showCharModal();
        else if (GameState.party.length) GameState.partyLocked = true;

        const off = this.offlineGains();
        if (off.gold || off.kills) {
            GameState.gold += off.gold;
            GameState.totalGold += off.gold;
            UI.showBanner(off.gold, off.kills);
        }
        this.recalcPassive();
        this.save();
        this.enterFirst();
    },

    enterFirst() {
        const first = NODE_DEFINITIONS.find(n => GameState.nodes[n.id].unlocked);
        if (first) this.enterDungeon(first.id);
    },

    enterDungeon(nodeId) {
        if (GameState.currentDungeon) return;
        const def = NODE_DEFINITIONS.find(n => n.id === nodeId);
        if (!def) return;
        GameState.currentDungeon = DungeonGen.generate(def);
        GameState.currentRoomIdx = 0;
        this.loadRoom();
        GameState.party.forEach((c,i) => c.pos = { x: 2 + i*0.5, y: 2 });
        GameState.paused = false;
        UI.log(`Entering ${def.name}`, 'info');
    },

    loadRoom() {
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIdx];
        if (!room) return;
        GameState.monsters = room.monsters.map(m => {
            const nm = new Monster(m.level, m.type);
            Object.assign(nm, m);
            return nm;
        });
        GameState.loot = room.loot.slice();
    },

    recalcStats(char) {
        const def = CLASS_DEFINITIONS[char.class];
        const base = { ...def.baseStats };
        base.dmg += Math.floor((char.level-1)*0.5);
        base.atk += char.level-1;
        base.arm += Math.floor((char.level-1)*0.3);
        base.def += Math.floor((char.level-1)*0.5);
        base.hp += (char.level-1)*5;
        char.base = base;
        char.maxHp = base.hp;
        if (char.hp > char.maxHp) char.hp = char.maxHp;
    },

    totalStats(char) {
        const s = { ...char.base };
        Object.values(char.equipment).forEach(e => {
            if (e) {
                s.dmg += e.dmg || 0;
                s.atk += e.atk || 0;
                s.arm += e.armor || 0;
                s.def += e.def || 0;
                s.hp += e.hp || 0;
            }
        });
        return s;
    },

    addCharacter(cls) {
        if (GameState.partyLocked) return false;
        const max = 4 + (GameState.prestige.extra_slot || 0);
        if (GameState.party.length >= max) return false;
        GameState.party.push(new Character(cls, generateId()));
        this.updateAchievement('party_five', GameState.party.length);
        return true;
    },

    removeCharacter(id) {
        if (GameState.partyLocked || GameState.party.length <= 1) return;
        GameState.party = GameState.party.filter(c => c.id !== id);
    },

    startWithSelectedParty() {
        if (UI.selectedClasses.length !== 4) return;
        GameState.party = UI.selectedClasses.map(cls => new Character(cls, generateId()));
        GameState.partyLocked = true;
        UI.hideModal('char-modal');
        this.enterFirst();
        this.save();
        UI.renderAll();
    },

    // ========== TURN UPDATE ==========
    updateTurn() {
        if (GameState.paused || !GameState.currentDungeon) return;
        GameState.turn++;

        // update potions
        GameState.activePotions = GameState.activePotions.filter(p => { p.remaining--; return p.remaining > 0; });

        // characters
        GameState.party.forEach(c => {
            if (!c.stunned) {
                c.update();
                this.charAI(c);
            }
        });

        // monsters
        GameState.monsters.forEach(m => {
            m.update();
            this.monsterAI(m);
        });

        // remove dead monsters
        const dead = GameState.monsters.filter(m => m.hp <= 0);
        dead.forEach(m => this.killMonster(m));
        GameState.monsters = GameState.monsters.filter(m => m.hp > 0);

        // check room clear
        if (GameState.monsters.length === 0) this.roomCleared();

        // auto loot
        this.collectLoot();

        UI.renderGameView();
    },

    charAI(c) {
        if (GameState.monsters.length === 0) return;
        const targets = GameState.monsters.map(m => m.pos);
        const nearest = findNearest(c.pos, targets);
        const mon = GameState.monsters[nearest.index];
        if (nearest.distance < ATTACK_RANGE) {
            const res = c.attack(mon);
            if (res?.hit) UI.floating(mon.pos, res.dmg, res.crit);
        } else {
            // move toward
            const dx = mon.pos.x - c.pos.x;
            const dy = mon.pos.y - c.pos.y;
            const dist = nearest.distance;
            const spd = MOVE_SPEED * (GameState.activePotions.some(p => p.effect==='speed') ? 1.5 : 1);
            c.pos.x += (dx / dist) * spd;
            c.pos.y += (dy / dist) * spd;
            // keep in room
            const room = GameState.currentDungeon.rooms[GameState.currentRoomIdx];
            c.pos.x = Math.max(1, Math.min(room.w-1, c.pos.x));
            c.pos.y = Math.max(1, Math.min(room.h-1, c.pos.y));
        }
    },

    monsterAI(m) {
        if (GameState.activePotions.some(p => p.effect==='docileMonsters')) return;
        const alive = GameState.party.filter(c => !c.stunned && c.hp > 0);
        if (!alive.length) return;
        const targets = alive.map(c => c.pos);
        const nearest = findNearest(m.pos, targets);
        const target = alive[nearest.index];
        if (nearest.distance < ATTACK_RANGE) {
            const res = m.attack(target);
            if (res?.hit) UI.floating(target.pos, res.dmg, false);
        } else {
            const dx = target.pos.x - m.pos.x;
            const dy = target.pos.y - m.pos.y;
            const dist = nearest.distance;
            m.pos.x += (dx / dist) * MOVE_SPEED * 0.7;
            m.pos.y += (dy / dist) * MOVE_SPEED * 0.7;
            const room = GameState.currentDungeon.rooms[GameState.currentRoomIdx];
            m.pos.x = Math.max(1, Math.min(room.w-1, m.pos.x));
            m.pos.y = Math.max(1, Math.min(room.h-1, m.pos.y));
        }
    },

    killMonster(m) {
        GameState.totalKills++;
        GameState.ap++;
        this.updateAchievement('first_blood', 1);
        this.updateAchievement('monster_slayer', GameState.totalKills);

        const xpShare = Math.floor(m.xp / GameState.party.length);
        GameState.party.forEach(c => c.gainXP(xpShare));

        const goldMult = GameState.activePotions.some(p => p.effect==='doubleGold') ? 2 : 1;
        const gold = randomRange(5, 15) * goldMult;
        GameState.gold += gold;
        GameState.totalGold += gold;

        if (Math.random() < 0.25) {
            const item = ItemGen.generate(m.level);
            GameState.loot.push({ type: 'item', item, pos: { ...m.pos } });
        }
        if (Math.random() < 0.07) {
            const idx = Math.floor(Math.random() * SCROLLS.length);
            GameState.loot.push({ type: 'scroll', idx, pos: { ...m.pos } });
        }
        if (Math.random() < 0.05) {
            const idx = Math.floor(Math.random() * POTIONS.length);
            GameState.loot.push({ type: 'potion', idx, pos: { ...m.pos } });
        }

        if (m.isBoss) {
            GameState.bossesDefeated++;
            this.updateAchievement('castle_conqueror', GameState.bossesDefeated);
            const nodeId = GameState.currentDungeon.nodeId;
            GameState.nodes[nodeId].beaten = true;
            const def = NODE_DEFINITIONS.find(n => n.id === nodeId);
            def.unlocks.forEach(id => { if (GameState.nodes[id]) GameState.nodes[id].unlocked = true; });
        }
    },

    roomCleared() {
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIdx];
        room.cleared = true;
        UI.log('Room cleared!', 'success');
        if (GameState.currentRoomIdx + 1 < GameState.currentDungeon.rooms.length) {
            GameState.currentRoomIdx++;
            this.loadRoom();
            UI.log(`Entering room ${GameState.currentRoomIdx+1}`, 'info');
        } else {
            UI.log('Dungeon conquered!', 'special');
            GameState.currentDungeon = null;
            const next = NODE_DEFINITIONS.find(n => GameState.nodes[n.id].unlocked && !GameState.nodes[n.id].beaten);
            if (next) this.enterDungeon(next.id);
        }
    },

    collectLoot() {
        GameState.party.forEach(c => {
            GameState.loot = GameState.loot.filter(l => {
                if (distance(c.pos, l.pos) < 0.5) {
                    if (l.type === 'item') {
                        c.inventory = c.inventory || [];
                        c.inventory.push(l.item);
                        this.autoEquip(c, l.item);
                    } else if (l.type === 'scroll') GameState.scrolls[l.idx].count++;
                    else if (l.type === 'potion') GameState.potions[l.idx].count++;
                    return false;
                }
                return true;
            });
        });
    },

    autoEquip(c, item) {
        const slot = this.slotFor(item);
        if (!slot) return;
        const cur = c.equipment[slot];
        if (!cur || this.itemScore(item) > this.itemScore(cur)) {
            c.equipment[slot] = item;
            c.inventory = c.inventory.filter(i => i.id !== item.id);
            this.recalcStats(c);
        }
    },

    slotFor(item) {
        if (item.type.includes('Sword')||item.type.includes('Axe')) return 'weapon';
        if (item.type.includes('Helmet')) return 'helm';
        if (item.type.includes('Chest')) return 'chest';
        if (item.type.includes('Legs')) return 'legs';
        if (item.type.includes('Boots')) return 'boots';
        if (item.type.includes('Gloves')) return 'gloves';
        if (item.type.includes('Ring')) return 'ring1';
        if (item.type.includes('Amulet')) return 'amulet';
        return null;
    },

    itemScore(i) { return (i.dmg||0) + (i.atk||0) + (i.armor||0) + (i.def||0) + (i.hp||0)/5; },

    useScroll(idx) {
        const s = GameState.scrolls[idx];
        if (!s || s.count <= 0) return;
        if (!GameState.activePotions.some(p => p.effect==='infiniteScrolls')) s.count--;
        GameState.monsters.forEach(m => {
            m.takeDamage(s.damage);
            UI.floating(m.pos, s.damage, false);
        });
        UI.log(`Used ${s.name}!`, 'info');
    },

    usePotion(idx) {
        const p = GameState.potions[idx];
        if (!p || p.count <= 0) return;
        p.count--;
        const dur = p.duration * (1 + (GameState.prestige.potionDuration||0)*0.15);
        GameState.activePotions.push({ ...p, remaining: Math.floor(dur) });
        UI.log(`Activated ${p.name}!`, 'info');
    },

    purchaseFarm(nodeId, dunId) {
        const node = NODE_DEFINITIONS.find(n => n.id === nodeId);
        const dun = node.dungeons.find(d => d.id === dunId);
        const ns = GameState.nodes[nodeId];
        if (!ns.beaten || ns.dungeons[dunId].owned || GameState.gold < dun.cost) return false;
        GameState.gold -= dun.cost;
        ns.dungeons[dunId].owned = true;
        this.recalcPassive();
        return true;
    },

    toggleFarm(nodeId, dunId) {
        const ns = GameState.nodes[nodeId];
        ns.dungeons[dunId].active = !ns.dungeons[dunId].active;
        this.recalcPassive();
    },

    recalcPassive() {
        let kills=0, gold=0, xp=0;
        NODE_DEFINITIONS.forEach(node => {
            const ns = GameState.nodes[node.id];
            if (!ns.beaten) return;
            node.dungeons.forEach(d => {
                const ds = ns.dungeons[d.id];
                if (ds.owned && ds.active) {
                    const mult = 1 + (GameState.prestige.farm_speed||0)*0.2;
                    const k = d.killRate * mult;
                    kills += k;
                    gold += k * d.goldPerKill;
                    xp += k * d.xpPerKill;
                }
            });
        });
        GameState.passive = { kills, gold, xp };
    },

    processPassive() {
        const sec = PASSIVE_TICK_INTERVAL / 1000;
        const gold = Math.floor(GameState.passive.gold * sec);
        const xp = Math.floor(GameState.passive.xp * sec);
        if (gold) GameState.gold += gold;
        if (xp) GameState.party.forEach(c => c.gainXP(Math.floor(xp / GameState.party.length)));
    },

    offlineGains() {
        const elapsed = Date.now() - GameState.lastSave;
        const max = MAX_OFFLINE_HOURS * 3600000;
        const sec = Math.floor(Math.min(elapsed, max) / 1000);
        if (sec <= 0) return { gold:0, kills:0 };
        const gold = Math.floor(GameState.passive.gold * sec * 0.5);
        const kills = Math.floor(GameState.passive.kills * sec * 0.5);
        return { gold, kills };
    },

    updateAchievement(id, prog) {
        const a = GameState.achievements[id];
        if (!a || a.done) return;
        a.prog = Math.max(a.prog, prog);
        const def = ACHIEVEMENTS.find(x => x.id === id);
        if (a.prog >= def.req) {
            a.done = true;
            GameState.ap += def.ap;
        }
    },

    prestige() {
        const savedAP = GameState.ap;
        const savedPrestige = { ...GameState.prestige };
        const savedCount = (GameState.prestigeCount || 0) + 1;
        // reset
        GameState.gold = 100;
        GameState.ap = savedAP;
        GameState.party = [];
        GameState.partyLocked = false;
        GameState.nodes = {};
        NODE_DEFINITIONS.forEach((n,i) => {
            GameState.nodes[n.id] = { unlocked: i===0, beaten: false, dungeons: {} };
            n.dungeons.forEach(d => GameState.nodes[n.id].dungeons[d.id] = { owned: false, active: false });
        });
        GameState.inventory = [];
        GameState.scrolls = SCROLLS.map(s => ({ ...s, count: 0 }));
        GameState.potions = POTIONS.map(p => ({ ...p, count: 0 }));
        GameState.totalKills = 0;
        GameState.totalGold = 0;
        GameState.bossesDefeated = 0;
        GameState.currentDungeon = null;
        GameState.activePotions = [];
        GameState.prestigeCount = savedCount;
        GameState.prestige = savedPrestige;
        this.recalcPassive();
        this.save();
        UI.showCharModal();
    },

    save() {
        GameState.lastSave = Date.now();
        localStorage.setItem('dungeonInfinitum', JSON.stringify(GameState));
    },

    load() {
        const saved = localStorage.getItem('dungeonInfinitum');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(GameState, data);
            GameState.party = GameState.party.map(c => {
                const nc = new Character(c.class, c.id);
                Object.assign(nc, c);
                return nc;
            });
        }
    },

    exportSave() {
        const b64 = btoa(JSON.stringify(GameState));
        navigator.clipboard.writeText(b64);
        UI.showExportModal(b64);
    },

    importSave() {
        const inp = document.getElementById('import-input');
        try {
            const data = JSON.parse(atob(inp.value));
            Object.assign(GameState, data);
            GameState.party = GameState.party.map(c => {
                const nc = new Character(c.class, c.id);
                Object.assign(nc, c);
                return nc;
            });
            UI.hideModal('char-modal');
            UI.renderAll();
        } catch { alert('Invalid save'); }
    },

    deleteAllData() {
        localStorage.removeItem('dungeonInfinitum');
        location.reload();
    }
};

// ============================================================
// UI
// ============================================================
const UI = {
    activeTab: 'party',
    selectedChar: null,
    selectedClasses: [],
    fps: 0,
    fpsFrames: 0,
    lastFps: 0,
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d'),
    miniCtx: document.getElementById('minimapCanvas').getContext('2d'),
    floating: [],

    init() {
        document.getElementById('fps-toggle').onclick = () => {
            GameState.showFps = !GameState.showFps;
            document.getElementById('fps-toggle').textContent = GameState.showFps ? 'Hide FPS' : 'Show FPS';
        };
        document.getElementById('pause-btn').onclick = () => {
            GameState.paused = !GameState.paused;
            this.updatePause();
        };
        this.renderTabs();
        this.renderAll();
        document.addEventListener('keydown', e => {
            if (e.key >= '1' && e.key <= '6') Game.useScroll(parseInt(e.key)-1);
        });
    },

    renderTabs() {
        const tabs = ['party', 'skills', 'equipment', 'pack', 'prestige', 'achievements', 'settings'];
        const html = tabs.map(t => `<button class="tab-btn ${this.activeTab===t?'active':''}" onclick="UI.setTab('${t}')">${t}</button>`).join('');
        document.getElementById('tab-buttons').innerHTML = html;
    },

    setTab(t) { this.activeTab = t; this.renderTabs(); this.renderTab(); },

    updatePause() {
        const btn = document.getElementById('pause-btn');
        btn.textContent = GameState.paused ? '▶ Play' : '⏸ Pause';
        btn.className = `btn ${GameState.paused ? 'btn-play' : 'btn-pause'}`;
    },

    renderAll() {
        this.renderResources();
        this.renderPassive();
        this.renderNodes();
        this.renderFarms();
        this.renderGame();
        this.renderTab();
        this.updatePause();
    },

    renderResources() {
        document.getElementById('resources').innerHTML = `
            <div class="resource-item"><span>Gold</span><span class="resource-value">${formatNumber(GameState.gold)}</span></div>
            <div class="resource-item"><span>Adventure Points</span><span class="resource-value">${GameState.ap}</span></div>
            <div class="resource-item"><span>Kills</span><span class="resource-value">${formatNumber(GameState.totalKills)}</span></div>
            <div class="resource-item"><span>Bosses</span><span class="resource-value">${GameState.bossesDefeated}/${NODE_DEFINITIONS.length}</span></div>
        `;
    },

    renderPassive() {
        document.getElementById('passive-stats').innerHTML = `
            <div class="passive-item"><span>⚡ Kills/s</span><span>${GameState.passive.kills.toFixed(2)}</span></div>
            <div class="passive-item"><span>💰 Gold/s</span><span>${formatNumber(GameState.passive.gold)}</span></div>
            <div class="passive-item"><span>✨ XP/s</span><span>${formatNumber(GameState.passive.xp)}</span></div>
        `;
    },

    renderNodes() {
        let html = '';
        NODE_DEFINITIONS.forEach(n => {
            const ns = GameState.nodes[n.id];
            if (!ns?.unlocked) return;
            const status = ns.beaten ? 'completed' : 'available';
            const text = ns.beaten ? '✓ Conquered' : '⚔️ Available';
            html += `
                <div class="castle-panel">
                    <div class="castle-header">
                        <span class="castle-name">${n.icon} ${n.name}</span>
                        <span class="castle-status ${status}">${text}</span>
                    </div>
                    ${!ns.beaten ? `
                        <button class="castle-btn" onclick="Game.enterDungeon('${n.id}'); UI.renderAll();" ${GameState.currentDungeon?'disabled':''}>
                            ⚔️ Enter
                        </button>
                    ` : '<p style="font-size:0.8rem;color:#22c55e;">Cleared</p>'}
                </div>
            `;
        });
        document.getElementById('node-panel').innerHTML = html || '<p>No regions unlocked.</p>';
    },

    renderFarms() {
        let html = '', any = false;
        NODE_DEFINITIONS.forEach(n => {
            const ns = GameState.nodes[n.id];
            if (!ns?.beaten) return;
            n.dungeons.forEach(d => {
                const ds = ns.dungeons[d.id];
                if (!ds.owned) {
                    html += `
                        <div class="farm-item">
                            <span class="farm-icon">${d.icon}</span>
                            <div class="farm-info">
                                <div class="farm-name">${d.name}</div>
                                <div class="farm-stats">Lv.${d.level} | ${d.killRate}/s | ${d.goldPerKill}g</div>
                            </div>
                            <button class="farm-btn" onclick="Game.purchaseFarm('${n.id}','${d.id}');UI.renderAll();" ${GameState.gold<d.cost?'disabled':''}>
                                ${formatNumber(d.cost)}g
                            </button>
                        </div>
                    `;
                } else {
                    any = true;
                    html += `
                        <div class="farm-item">
                            <span class="farm-icon">${d.icon}</span>
                            <div class="farm-info">
                                <div class="farm-name">${d.name}</div>
                                <div class="farm-stats">${d.killRate}/s | ${d.goldPerKill}g</div>
                            </div>
                            <button class="farm-btn ${ds.active?'deactivate':''}" onclick="Game.toggleFarm('${n.id}','${d.id}');UI.renderAll();">
                                ${ds.active ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    `;
                }
            });
        });
        if (!any) html += '<p style="color:#94a3b8;">Beat bosses to unlock farms.</p>';
        document.getElementById('farm-panel').innerHTML = html;
    },

    renderGame() {
        if (!GameState.currentDungeon) {
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(0,0,800,600);
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText('Select a dungeon', 250,300);
            return;
        }
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIdx];
        if (!room) return;

        // draw room
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(50,50, room.w*TILE_SIZE, room.h*TILE_SIZE);
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50,50, room.w*TILE_SIZE, room.h*TILE_SIZE);

        // monsters
        GameState.monsters.forEach(m => {
            const x = 50 + m.pos.x * TILE_SIZE;
            const y = 50 + m.pos.y * TILE_SIZE;
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(m.sprite, x, y);
            const pct = m.hp / m.maxHp;
            this.ctx.fillStyle = '#c62828';
            this.ctx.fillRect(x, y+25, 30 * pct, 3);
        });

        // loot
        GameState.loot.forEach(l => {
            const x = 50 + l.pos.x * TILE_SIZE;
            const y = 50 + l.pos.y * TILE_SIZE;
            this.ctx.font = '20px sans-serif';
            if (l.type === 'item') this.ctx.fillText('📦', x, y);
            else if (l.type === 'scroll') this.ctx.fillText('📜', x, y);
            else if (l.type === 'potion') this.ctx.fillText('🧪', x, y);
        });

        // party
        GameState.party.forEach(c => {
            const x = 50 + c.pos.x * TILE_SIZE;
            const y = 50 + c.pos.y * TILE_SIZE;
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(c.sprite, x, y);
            const pct = c.hp / c.maxHp;
            this.ctx.fillStyle = c.stunned ? '#666' : '#22c55e';
            this.ctx.fillRect(x, y+25, 30 * pct, 3);
        });

        // floating texts
        this.floating = this.floating.filter(f => {
            f.life--;
            if (f.life <=0) return false;
            this.ctx.font = f.crit ? 'bold 18px sans-serif' : '14px sans-serif';
            this.ctx.fillStyle = f.crit ? '#ff9800' : '#f44336';
            const x = 50 + f.pos.x * TILE_SIZE;
            const y = 50 + f.pos.y * TILE_SIZE - (20 - f.life*2);
            this.ctx.fillText(f.dmg, x, y);
            return true;
        });

        // minimap
        this.miniCtx.fillStyle = '#0f172a';
        this.miniCtx.fillRect(0,0,150,150);
        GameState.currentDungeon.rooms.forEach((r,i) => {
            const col = i===GameState.currentRoomIdx ? '#22c55e' : (r.cleared ? '#3b82f6' : '#475569');
            this.miniCtx.fillStyle = col;
            this.miniCtx.fillRect(10 + (i%5)*28, 10 + Math.floor(i/5)*28, 20, 20);
        });

        document.getElementById('dungeon-name').textContent = GameState.currentDungeon.name;
        document.getElementById('room-info').textContent = `Room ${GameState.currentRoomIdx+1}/${GameState.currentDungeon.rooms.length}`;
        document.getElementById('monster-count').textContent = `Monsters: ${GameState.monsters.length}`;
    },

    floating(pos, dmg, crit) { this.floating.push({ pos, dmg, crit, life: 20 }); },

    log(msg, type) {
        const log = document.getElementById('combat-log');
        const e = document.createElement('div');
        e.textContent = msg;
        e.style.color = type==='special' ? '#a855f7' : '#94a3b8';
        log.appendChild(e);
        if (log.children.length > 8) log.removeChild(log.firstChild);
    },

    renderTab() {
        const c = document.getElementById('tab-content');
        if (this.activeTab === 'party') c.innerHTML = this.partyTab();
        else if (this.activeTab === 'skills') c.innerHTML = '<p>Skill tree coming soon</p>';
        else if (this.activeTab === 'equipment') c.innerHTML = this.equipTab();
        else if (this.activeTab === 'pack') c.innerHTML = this.packTab();
        else if (this.activeTab === 'prestige') c.innerHTML = this.prestigeTab();
        else if (this.activeTab === 'achievements') c.innerHTML = this.achievementsTab();
        else if (this.activeTab === 'settings') c.innerHTML = this.settingsTab();
    },

    partyTab() {
        const max = 4 + (GameState.prestige.extra_slot || 0);
        const sel = GameState.party.find(c => c.id === this.selectedChar);
        let html = `
            <div class="party-header">
                <h3>Party (${GameState.party.length}/${max})</h3>
                <button class="add-btn" onclick="UI.showCharModal()" ${GameState.partyLocked||GameState.party.length>=max?'disabled':''}>+ Add</button>
            </div>
            <div class="party-list">
                ${GameState.party.map(c => `
                    <div class="party-member ${this.selectedChar===c.id?'selected':''}" onclick="UI.selectChar('${c.id}')">
                        <span class="party-sprite">${c.sprite}</span>
                        <div class="party-info">
                            <div class="party-name">${c.name}</div>
                            <div class="party-level">Lv.${c.level}</div>
                        </div>
                        ${GameState.party.length>1 && !GameState.partyLocked ? `<button class="remove-btn" onclick="event.stopPropagation(); Game.removeCharacter('${c.id}'); UI.renderAll();">×</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        if (sel) {
            const pct = (sel.xp / sel.xpNext) * 100;
            html += `
                <div class="char-details">
                    <h4>${sel.name} Lv.${sel.level}</h4>
                    <div class="xp-bar">
                        <div class="xp-fill" style="width:${pct}%"></div>
                        <div class="xp-text">${sel.xp}/${sel.xpNext}</div>
                    </div>
                    <div class="skill-points">Skill Points: ${sel.skillPoints}</div>
                </div>
            `;
        }
        return html;
    },

    equipTab() {
        const sel = GameState.party.find(c => c.id === this.selectedChar);
        if (!sel) return '<p>Select a character in Party tab.</p>';
        const stats = Game.totalStats(sel);
        let html = `<h4>${sel.name}</h4><div style="font-size:0.8rem;color:#94a3b8;">DMG:${stats.dmg} ATK:${stats.atk} ARM:${stats.arm} DEF:${stats.def} HP:${stats.hp}</div>`;
        html += '<div class="equipment-grid">';
        for (let slot in sel.equipment) {
            const item = sel.equipment[slot];
            html += `<div class="equipment-slot"><span class="slot-label">${slot}</span>`;
            if (item) html += `<div class="equipped-item" style="border-color:${ITEM_RARITY[item.rarity]?.color||'#999'}">${item.name}</div>`;
            else html += '<div class="empty-slot">Empty</div>';
            html += '</div>';
        }
        html += '</div><h4>Inventory</h4><div class="inventory-grid">';
        (sel.inventory || []).forEach(item => {
            html += `<div class="inventory-item"><span>${item.name}</span><button class="equip-btn" onclick="Game.autoEquip(UI.selectedChar, item)">Equip</button></div>`;
        });
        html += '</div>';
        return html;
    },

    packTab() {
        let html = '<h3>Pack</h3>';
        if (GameState.activePotions.length) {
            html += '<div class="active-section">' + GameState.activePotions.map(p => `<div>${p.name}: ${p.remaining}s</div>`).join('') + '</div>';
        }
        html += '<h4>Scrolls</h4>';
        GameState.scrolls.forEach((s,i) => {
            html += `<div class="consumable-item"><span>${s.name} (${s.count})</span><button class="use-btn" onclick="Game.useScroll(${i})">Use</button></div>`;
        });
        html += '<h4>Potions</h4>';
        GameState.potions.forEach((p,i) => {
            html += `<div class="consumable-item"><span>${p.name} (${p.count})</span><button class="use-btn" onclick="Game.usePotion(${i})">Use</button></div>`;
        });
        return html;
    },

    prestigeTab() {
        const potential = Math.floor(GameState.totalGold/10000) + Math.floor(GameState.totalKills/100);
        let html = `<div class="ap-display"><span>AP: ${GameState.ap}</span><span>Potential: +${potential}</span></div>`;
        PRESTIGE_UPGRADES.forEach(u => {
            const lvl = GameState.prestige[u.id] || 0;
            html += `
                <div class="prestige-upgrade">
                    <div><strong>${u.name}</strong> (${lvl}/${u.max})<br><small>${u.desc}</small></div>
                    <button class="farm-btn" onclick="Game.purchasePrestigeUpgrade('${u.id}');UI.renderAll();" ${GameState.ap<u.cost||lvl>=u.max?'disabled':''}>${u.cost} AP</button>
                </div>
            `;
        });
        html += `<button class="prestige-btn" onclick="if(confirm('Prestige?')) Game.prestige();UI.renderAll();" ${potential<1?'disabled':''}>🔄 Prestige (+${potential} AP)</button>`;
        return html;
    },

    achievementsTab() {
        let html = '<h3>Achievements</h3>';
        ACHIEVEMENTS.forEach(a => {
            const ach = GameState.achievements[a.id] || { prog:0, done:false };
            const pct = Math.min(100, (ach.prog / a.req) * 100);
            html += `
                <div class="achievement-item ${ach.done?'completed':''}">
                    <div class="achievement-name">${ach.done?'✓':'○'} ${a.name}</div>
                    <div class="achievement-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                        <span>${Math.min(ach.prog,a.req)}/${a.req}</span>
                        <span class="ap-reward">+${a.ap}</span>
                    </div>
                </div>
            `;
        });
        return html;
    },

    settingsTab() {
        return `
            <h3>Settings</h3>
            <div class="settings-section">
                <button class="settings-btn" onclick="Game.saveGame()">💾 Save Game</button>
                <button class="settings-btn" onclick="Game.exportSave()">📤 Export Save</button>
                <button class="settings-btn" onclick="UI.showImportModal()">📥 Import Save</button>
                <button class="settings-btn danger" onclick="UI.showDeleteModal()">🗑️ Delete All Data</button>
            </div>
            <div class="stat"><span>Last Saved:</span><span>${new Date(GameState.lastSave).toLocaleString()}</span></div>
        `;
    },

    selectChar(id) { this.selectedChar = this.selectedChar===id ? null : id; this.renderAll(); },

    showCharModal() {
        const modal = document.getElementById('char-modal');
        const list = document.getElementById('class-list');
        this.selectedClasses = [];
        list.innerHTML = Object.entries(CLASS_DEFINITIONS).map(([k,def]) => `
            <div class="class-btn" onclick="UI.toggleClass('${k}')" id="btn-${k}">
                <span class="class-sprite">${def.sprite}</span>
                <span class="class-name">${def.name}</span>
                <span class="class-role">${def.role}</span>
            </div>
        `).join('');
        document.getElementById('selected-count').textContent = 'Selected: 0/4';
        document.getElementById('start-game-btn').disabled = true;
        modal.classList.add('show');
    },

    toggleClass(k) {
        const idx = this.selectedClasses.indexOf(k);
        const btn = document.getElementById(`btn-${k}`);
        if (idx === -1) {
            if (this.selectedClasses.length < 4) {
                this.selectedClasses.push(k);
                btn.style.background = '#22c55e33';
            }
        } else {
            this.selectedClasses.splice(idx, 1);
            btn.style.background = '';
        }
        document.getElementById('selected-count').textContent = `Selected: ${this.selectedClasses.length}/4`;
        document.getElementById('start-game-btn').disabled = this.selectedClasses.length !== 4;
    },

    showImportModal() {
        document.getElementById('import-input').value = '';
        document.getElementById('char-modal').classList.add('show');
    },

    showDeleteModal() { document.getElementById('delete-modal').classList.add('show'); },

    showExportModal(data) {
        document.getElementById('export-area').value = data;
        document.getElementById('export-msg').textContent = 'Save copied!';
        document.getElementById('export-modal').classList.add('show');
    },

    hideModal(id) { document.getElementById(id).classList.remove('show'); },

    showBanner(gold, kills) {
        const b = document.getElementById('offline-banner');
        b.textContent = `💰 While away: +${formatNumber(gold)} gold, +${kills} kills!`;
        b.style.display = 'block';
        setTimeout(() => b.style.display = 'none', 5000);
    },

    updateFps(ts) {
        if (!GameState.showFps) return;
        this.fpsFrames++;
        if (ts - this.lastFps >= 1000) {
            this.fps = this.fpsFrames;
            this.fpsFrames = 0;
            this.lastFps = ts;
            document.getElementById('fps-display').textContent = `FPS: ${this.fps}`;
        }
    }
};

// ============================================================
// GAME LOOP
// ============================================================
let lastTurn = 0, lastPassive = 0;

function loop(ts) {
    UI.updateFps(ts);

    if (!GameState.paused && GameState.currentDungeon) {
        if (ts - lastTurn >= TURN_INTERVAL) {
            Game.updateTurn();
            UI.renderGame();
            lastTurn = ts;
        }
    } else lastTurn = ts;

    if (ts - lastPassive >= PASSIVE_TICK_INTERVAL) {
        Game.processPassive();
        UI.renderResources();
        UI.renderPassive();
        lastPassive = ts;
    }

    requestAnimationFrame(loop);
}

window.onload = () => {
    Game.init();
    UI.init();
    lastPassive = performance.now();
    requestAnimationFrame(loop);
    setInterval(() => Game.save(), 30000);
};

window.onbeforeunload = () => Game.save();