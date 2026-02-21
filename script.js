const TURN_INTERVAL = 250;
const PASSIVE_TICK_INTERVAL = 1000;
const MAX_OFFLINE_HOURS = 12;
const TILE_SIZE = 32;
const WORLD_WIDTH = 100;
const WORLD_HEIGHT = 100;
const ROOM_MIN_SIZE = 4;
const ROOM_MAX_SIZE = 12;
const MAX_ROOMS = 30;

const CLASS_DEFINITIONS = {
    fighter: {
        name: 'Fighter', role: 'Tank', sprite: '🛡️',
        baseStats: { dmg: 5, atk: 10, arm: 8, def: 12, hp: 120, sp: 0 },
        healthPerLevel: 15, spiritPerLevel: 3,
        skillTree: {}
    },
    barbarian: { name: 'Barbarian', role: 'Physical', sprite: '⚔️', baseStats: { dmg: 10, atk: 12, arm: 5, def: 8, hp: 100, sp: 0 }, healthPerLevel: 14, spiritPerLevel: 4, skillTree: {} },
    rogue: { name: 'Rogue', role: 'Utility', sprite: '🗡️', baseStats: { dmg: 8, atk: 15, arm: 3, def: 10, hp: 70, sp: 0 }, healthPerLevel: 9, spiritPerLevel: 5, skillTree: {} },
    priest: { name: 'Priest', role: 'Healer', sprite: '✝️', baseStats: { dmg: 3, atk: 8, arm: 2, def: 6, hp: 60, sp: 0 }, healthPerLevel: 8, spiritPerLevel: 12, skillTree: {} },
    druid: { name: 'Druid', role: 'Summoner', sprite: '🌿', baseStats: { dmg: 5, atk: 10, arm: 4, def: 8, hp: 80, sp: 0 }, healthPerLevel: 11, spiritPerLevel: 8, skillTree: {} },
    electromancer: { name: 'Electromancer', role: 'Magic DPS', sprite: '⚡', baseStats: { dmg: 15, atk: 18, arm: 1, def: 5, hp: 50, sp: 0 }, healthPerLevel: 6, spiritPerLevel: 14, skillTree: {} },
    pyromancer: { name: 'Pyromancer', role: 'Magic DPS', sprite: '🔥', baseStats: { dmg: 14, atk: 16, arm: 1, def: 5, hp: 50, sp: 0 }, healthPerLevel: 6, spiritPerLevel: 13, skillTree: {} },
    archer: { name: 'Archer', role: 'Physical DPS', sprite: '🏹', baseStats: { dmg: 12, atk: 16, arm: 2, def: 8, hp: 70, sp: 0 }, healthPerLevel: 10, spiritPerLevel: 6, skillTree: {} }
};

const NODE_DEFINITIONS = [
    {
        id: 'goblin_territory',
        name: 'Goblin Territory',
        icon: '🏔️',
        level: 1,
        castle: {
            name: "Goblin King's Lair",
            boss: { name: 'Goblin King', sprite: '👑', stats: { dmg: 8, atk: 15, arm: 5, def: 10, hp: 150 }, goldReward: 200, xpReward: 100 }
        },
        dungeons: [
            { id: 'goblin_cave', name: 'Goblin Cave', icon: '🕳️', level: 1, cost: 100, killRate: 0.5, goldPerKill: 5, xpPerKill: 10 },
            { id: 'goblin_camp', name: 'Goblin Camp', icon: '⛺', level: 2, cost: 150, killRate: 0.4, goldPerKill: 8, xpPerKill: 15 }
        ],
        unlocks: ['wolf_forest']
    },
    {
        id: 'wolf_forest',
        name: 'Wolf Forest',
        icon: '🌲',
        level: 5,
        castle: {
            name: 'Wolf Den',
            boss: { name: 'Alpha Wolf', sprite: '🐺', stats: { dmg: 15, atk: 20, arm: 8, def: 12, hp: 250 }, goldReward: 500, xpReward: 250 }
        },
        dungeons: [
            { id: 'wolf_den', name: 'Wolf Den', icon: '🐺', level: 5, cost: 400, killRate: 0.4, goldPerKill: 12, xpPerKill: 25 },
            { id: 'spider_nest', name: 'Spider Nest', icon: '🕷️', level: 7, cost: 600, killRate: 0.3, goldPerKill: 18, xpPerKill: 35 }
        ],
        unlocks: ['undead_crypts']
    },
    {
        id: 'undead_crypts',
        name: 'Undead Crypts',
        icon: '💀',
        level: 10,
        castle: {
            name: 'Lich Tower',
            boss: { name: 'Ancient Lich', sprite: '💀', stats: { dmg: 25, atk: 30, arm: 10, def: 25, hp: 400 }, goldReward: 1500, xpReward: 600 }
        },
        dungeons: [
            { id: 'skeleton_tombs', name: 'Skeleton Tombs', icon: '⚰️', level: 10, cost: 1200, killRate: 0.3, goldPerKill: 25, xpPerKill: 50 },
            { id: 'zombie_pit', name: 'Zombie Pit', icon: '🧟', level: 12, cost: 1500, killRate: 0.25, goldPerKill: 35, xpPerKill: 70 },
            { id: 'ghost_hall', name: 'Ghost Hall', icon: '👻', level: 14, cost: 2000, killRate: 0.2, goldPerKill: 50, xpPerKill: 90 }
        ],
        unlocks: ['orc_stronghold', 'demon_realm']
    },
    {
        id: 'orc_stronghold',
        name: 'Orc Stronghold',
        icon: '🏰',
        level: 15,
        castle: {
            name: "Orc Warlord's Fortress",
            boss: { name: 'Orc Warlord', sprite: '👹', stats: { dmg: 35, atk: 35, arm: 20, def: 20, hp: 600 }, goldReward: 4000, xpReward: 1200 }
        },
        dungeons: [
            { id: 'orc_barracks', name: 'Orc Barracks', icon: '⚔️', level: 15, cost: 3000, killRate: 0.25, goldPerKill: 50, xpPerKill: 100 },
            { id: 'orc_armory', name: 'Orc Armory', icon: '🛡️', level: 18, cost: 4500, killRate: 0.2, goldPerKill: 75, xpPerKill: 140 }
        ],
        unlocks: ['dragon_peak']
    },
    {
        id: 'demon_realm',
        name: 'Demon Realm',
        icon: '😈',
        level: 18,
        castle: {
            name: 'Demon Portal',
            boss: { name: 'Arch Demon', sprite: '😈', stats: { dmg: 40, atk: 40, arm: 15, def: 30, hp: 700 }, goldReward: 6000, xpReward: 1800 }
        },
        dungeons: [
            { id: 'demon_pit', name: 'Demon Pit', icon: '🔥', level: 18, cost: 5000, killRate: 0.2, goldPerKill: 80, xpPerKill: 150 },
            { id: 'hell_gate', name: 'Hell Gate', icon: '🚪', level: 22, cost: 8000, killRate: 0.15, goldPerKill: 120, xpPerKill: 200 }
        ],
        unlocks: ['dragon_peak']
    },
    {
        id: 'dragon_peak',
        name: 'Dragon Peak',
        icon: '🐉',
        level: 25,
        castle: {
            name: 'Dragon Lair',
            boss: { name: 'Ancient Dragon', sprite: '🐉', stats: { dmg: 60, atk: 50, arm: 30, def: 40, hp: 1200 }, goldReward: 20000, xpReward: 5000 }
        },
        dungeons: [
            { id: 'dragon_nest', name: 'Dragon Nest', icon: '🥚', level: 25, cost: 15000, killRate: 0.15, goldPerKill: 150, xpPerKill: 250 },
            { id: 'treasure_vault', name: 'Treasure Vault', icon: '💎', level: 30, cost: 25000, killRate: 0.1, goldPerKill: 250, xpPerKill: 400 }
        ],
        unlocks: []
    }
];

const MONSTER_TEMPLATES = {
    goblin: { name: 'Goblin', sprite: '👺', stats: { dmg: 3, atk: 5, arm: 1, def: 3, hp: 20 } },
    wolf: { name: 'Wolf', sprite: '🐺', stats: { dmg: 5, atk: 8, arm: 2, def: 5, hp: 35 } },
    spider: { name: 'Spider', sprite: '🕷️', stats: { dmg: 7, atk: 10, arm: 2, def: 6, hp: 40 } },
    skeleton: { name: 'Skeleton', sprite: '💀', stats: { dmg: 10, atk: 12, arm: 3, def: 8, hp: 50 } },
    zombie: { name: 'Zombie', sprite: '🧟', stats: { dmg: 12, atk: 10, arm: 5, def: 6, hp: 80 } },
    ghost: { name: 'Ghost', sprite: '👻', stats: { dmg: 15, atk: 15, arm: 0, def: 20, hp: 45 } },
    orc: { name: 'Orc', sprite: '👹', stats: { dmg: 18, atk: 14, arm: 8, def: 10, hp: 100 } },
    demon: { name: 'Demon', sprite: '😈', stats: { dmg: 25, atk: 22, arm: 10, def: 15, hp: 150 } },
    dragon: { name: 'Dragon', sprite: '🐉', stats: { dmg: 30, atk: 25, arm: 15, def: 18, hp: 200 } }
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
    { name: 'Item Find Potion', duration: 30, effect: 'itemFind', icon: '📦' },
    { name: 'XP Boost Potion', duration: 30, effect: 'xpBoost', icon: '⭐' },
    { name: 'Invincibility Potion', duration: 15, effect: 'invincible', icon: '🛡️' },
    { name: 'Double Gold', duration: 30, effect: 'doubleGold', icon: '💎' },
    { name: 'Double Drops', duration: 30, effect: 'doubleDrops', icon: '🎁' },
    { name: 'Instant Loot', duration: 20, effect: 'instantLoot', icon: '✋' },
    { name: 'More Monsters', duration: 30, effect: 'moreMonsters', icon: '👹' },
    { name: 'Docile Monsters', duration: 20, effect: 'docileMonsters', icon: '😴' },
    { name: 'Frail Monsters', duration: 30, effect: 'frailMonsters', icon: '🦴' },
    { name: 'Free Spells', duration: 30, effect: 'freeSpells', icon: '🔮' },
    { name: 'Infinite Scrolls', duration: 30, effect: 'infiniteScrolls', icon: '📜' }
];

const ITEM_TYPES = {
    WEAPON: ['Sword', 'Axe', 'Bow', 'Staff', 'Dagger', 'Mace'],
    ARMOR: ['Helmet', 'Chest', 'Legs', 'Boots', 'Gloves'],
    ACCESSORY: ['Ring', 'Amulet', 'Belt', 'Cloak']
};
const ITEM_RARITY = {
    COMMON: { name: 'Common', color: '#999', multiplier: 1 },
    UNCOMMON: { name: 'Uncommon', color: '#4caf50', multiplier: 1.5 },
    RARE: { name: 'Rare', color: '#9c27b0', multiplier: 2 },
    LEGENDARY: { name: 'Legendary', color: '#ff9800', multiplier: 3 }
};

const PRESTIGE_UPGRADES = [
    { id: 'extra_slot', name: 'Extra Character Slot', desc: '+1 party slot', cost: 10, maxLevel: 4 },
    { id: 'cooldown_red', name: 'Swift Skills', desc: '-10% skill cooldowns', cost: 15, maxLevel: 5 },
    { id: 'farm_speed', name: 'Efficient Farms', desc: '+20% farm kill rate', cost: 20, maxLevel: 5 },
    { id: 'gold_bonus', name: 'Golden Touch', desc: '+10% gold earned', cost: 12, maxLevel: 5 },
    { id: 'xp_bonus', name: 'Quick Learner', desc: '+10% XP gained', cost: 12, maxLevel: 5 },
    { id: 'skill_cost', name: 'Natural Talent', desc: '-1 skill point cost (min 1)', cost: 25, maxLevel: 3 }
];

const ACHIEVEMENTS = [
    { id: 'first_blood', name: 'First Blood', desc: 'Defeat your first enemy', req: 1, ap: 1 },
    { id: 'monster_slayer', name: 'Monster Slayer', desc: 'Defeat 100 enemies', req: 100, ap: 5 },
    { id: 'legendary_hunter', name: 'Legendary Hunter', desc: 'Defeat 1000 enemies', req: 1000, ap: 20 },
    { id: 'gold_hoarder', name: 'Gold Hoarder', desc: 'Earn 10,000 gold total', req: 10000, ap: 3 },
    { id: 'wealthy', name: 'Wealthy Adventurer', desc: 'Earn 100,000 gold total', req: 100000, ap: 10 },
    { id: 'castle_conqueror', name: 'Castle Conqueror', desc: 'Beat 3 castle bosses', req: 3, ap: 15 },
    { id: 'farm_master', name: 'Farm Master', desc: 'Own 5 farms', req: 5, ap: 10 },
    { id: 'skill_master', name: 'Skill Master', desc: 'Unlock 20 skill nodes', req: 20, ap: 15 },
    { id: 'first_prestige', name: 'New Beginning', desc: 'Prestige once', req: 1, ap: 25 },
    { id: 'party_five', name: 'Party of Five', desc: 'Recruit 5 characters', req: 5, ap: 10 }
];

function generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}
function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.floor(n).toString();
}
function doesAttackHit(atk, def) {
    const chance = Math.min(0.95, Math.max(0.05, atk / (atk + def)));
    return Math.random() < chance;
}
function calculateDamage(dmg, arm) {
    return Math.max(1, dmg - arm);
}
function xpForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}
function distance(pos1, pos2) {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
}
function findNearest(from, positions) {
    let minDist = Infinity, minIndex = 0;
    positions.forEach((pos, i) => {
        const d = distance(from, pos);
        if (d < minDist) { minDist = d; minIndex = i; }
    });
    return { index: minIndex, distance: minDist };
}

const GameState = {
    gold: 100,
    adventurePoints: 0,
    party: [],
    nodes: {},
    currentDungeon: null,
    currentRoomIndex: 0,
    monsters: [],
    loot: [],
    inventory: [],
    scrolls: SCROLLS.map(s => ({ ...s, count: 0 })),
    potions: POTIONS.map(p => ({ ...p, count: 0 })),
    activePotions: [],
    prestigeUpgrades: {},
    achievements: {},
    totalKills: 0,
    totalGoldEarned: 0,
    castleBossesBeaten: 0,
    totalSkillNodesUnlocked: 0,
    itemsFound: 0,
    paused: true,
    showFps: false,
    passiveGoldPerSec: 0,
    passiveXpPerSec: 0,
    passiveKillsPerSec: 0,
    turn: 0,
    lastSaveTime: Date.now(),
    floatingTexts: []
};

class Character {
    constructor(classType, id) {
        const def = CLASS_DEFINITIONS[classType];
        this.id = id;
        this.class = classType;
        this.name = def.name;
        this.sprite = def.sprite;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = xpForLevel(2);
        this.currentHp = def.baseStats.hp;
        this.maxHp = def.baseStats.hp;
        this.baseStats = { ...def.baseStats };
        this.equipment = {};
        this.unlockedSkills = {};
        this.skillPoints = 0;
        this.stunned = 0;
        this.attackCooldown = 0;
        this.position = { x: 0, y: 0 };
        this.stats = { kills: 0, damageDealt: 0, damageReceived: 0, criticalHits: 0 };
        this.healthPerLevel = def.healthPerLevel || 10;
        this.spiritPerLevel = def.spiritPerLevel || 5;
    }

    gainXP(amount) {
        this.xp += amount;
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            this.skillPoints++;
            this.xpToNext = xpForLevel(this.level + 1);
            this.maxHp += this.healthPerLevel;
            this.currentHp = this.maxHp;
            Game.recalculateCharacterStats(this);
        }
    }

    takeDamage(amount) {
        if (GameState.activePotions.some(p => p.effect === 'invincible')) return 0;
        const actual = Math.max(1, amount);
        this.currentHp -= actual;
        this.stats.damageReceived += actual;
        if (this.currentHp <= 0) {
            this.currentHp = 0;
            this.stunned = 20;
        }
        return actual;
    }

    attack(target) {
        if (this.attackCooldown > 0) return null;
        const stats = Game.getTotalStats(this);
        const hitChance = stats.atk / (stats.atk + target.defenseRating);
        if (Math.random() > hitChance) return { hit: false };
        const isCrit = Math.random() < 0.1 + this.level * 0.002;
        let damage = stats.dmg;
        if (!isCrit) damage = calculateDamage(damage, target.armor);
        else { damage *= 1.5; this.stats.criticalHits++; GameState.stats.criticalHits++; }
        const actual = target.takeDamage(damage);
        this.stats.damageDealt += actual;
        GameState.stats.damageDealt += actual;
        this.attackCooldown = 4 - (GameState.prestigeUpgrades.cooldown_red || 0);
        return { hit: true, damage: actual, crit: isCrit };
    }

    update() {
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.stunned > 0) this.stunned--;
        if (GameState.turn % 3 === 0 && !this.stunned) {
            this.currentHp = Math.min(this.maxHp, this.currentHp + 1 + (GameState.prestigeUpgrades.healthRegen || 0));
        }
    }
}

class Monster {
    constructor(level, type = 'goblin') {
        this.id = generateId();
        const template = MONSTER_TEMPLATES[type] || MONSTER_TEMPLATES.goblin;
        this.type = type;
        this.sprite = template.sprite;
        this.level = level;
        this.isBoss = false;
        const mult = Math.pow(1.1, level - 1);
        this.maxHp = Math.floor(template.stats.hp * mult);
        this.currentHp = this.maxHp;
        this.damage = Math.floor(template.stats.dmg * mult);
        this.armor = Math.floor(template.stats.arm * mult);
        this.attackRating = Math.floor(template.stats.atk * mult);
        this.defenseRating = Math.floor(template.stats.def * mult);
        this.xpReward = Math.floor(20 * mult);
        this.position = { x: 0, y: 0 };
        this.attackCooldown = 0;
    }

    makeBoss() {
        this.isBoss = true;
        this.maxHp *= 5;
        this.currentHp = this.maxHp;
        this.damage *= 2;
        this.armor *= 1.5;
        this.xpReward *= 10;
        this.sprite = '💀';
    }

    takeDamage(amount) {
        if (GameState.activePotions.some(p => p.effect === 'docileMonsters')) {
            this.currentHp = 0;
            return this.maxHp;
        }
        if (GameState.activePotions.some(p => p.effect === 'frailMonsters')) amount *= 2;
        const actual = Math.max(1, amount);
        this.currentHp -= actual;
        return actual;
    }

    attack(target) {
        if (this.attackCooldown > 0) return null;
        const hitChance = this.attackRating / (this.attackRating + target.defenseRating);
        if (Math.random() > hitChance) return { hit: false };
        const damage = calculateDamage(this.damage, target.armor);
        const actual = target.takeDamage(damage);
        this.attackCooldown = 5;
        return { hit: true, damage: actual };
    }

    update() {
        if (this.attackCooldown > 0) this.attackCooldown--;
    }
}

const ItemGenerator = {
    generate(level) {
        const rarity = this.determineRarity();
        const typeCategory = randomPick(Object.keys(ITEM_TYPES));
        const type = randomPick(ITEM_TYPES[typeCategory]);
        const mult = Math.pow(1.08, level - 1) * ITEM_RARITY[rarity].multiplier;
        return {
            id: generateId(),
            name: `${ITEM_RARITY[rarity].name} ${type}`,
            type: type,
            rarity: rarity,
            level: level,
            damage: typeCategory === 'WEAPON' ? Math.floor(10 * mult) : 0,
            armor: typeCategory === 'ARMOR' ? Math.floor(5 * mult) : 0,
            attackRating: Math.floor(3 * mult),
            defenseRating: Math.floor(3 * mult),
            health: Math.floor(Math.random() * 20 * mult),
            spirit: Math.floor(Math.random() * 15 * mult),
            value: Math.floor(50 * mult)
        };
    },
    determineRarity() {
        const roll = Math.random();
        if (roll < 0.01) return 'LEGENDARY';
        if (roll < 0.05) return 'RARE';
        if (roll < 0.20) return 'UNCOMMON';
        return 'COMMON';
    }
};

const DungeonGenerator = {
    generate(nodeDef) {
        const dungeon = {
            nodeId: nodeDef.id,
            name: nodeDef.name,
            level: nodeDef.level,
            rooms: [],
            currentRoom: 0,
            cleared: false
        };
        nodeDef.dungeons.forEach((d, i) => {
            const room = this.generateRoom(nodeDef.level + d.level, i === nodeDef.dungeons.length - 1 ? false : false);
            room.name = d.name;
            room.icon = d.icon;
            dungeon.rooms.push(room);
        });
        const bossRoom = this.generateRoom(nodeDef.level, true);
        bossRoom.name = nodeDef.castle.name;
        bossRoom.icon = '👑';
        bossRoom.isBoss = true;
        bossRoom.bossDef = nodeDef.castle.boss;
        dungeon.rooms.push(bossRoom);
        return dungeon;
    },

    generateRoom(level, isBoss) {
        const width = randomRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
        const height = randomRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
        const bonusMonsters = GameState.activePotions.some(p => p.effect === 'moreMonsters') ? 5 : 0;
        const numMonsters = isBoss ? 1 : randomRange(2, 8 + bonusMonsters);
        const monsters = [];
        for (let i = 0; i < numMonsters; i++) {
            const type = randomPick(Object.keys(MONSTER_TEMPLATES));
            const monster = new Monster(level, type);
            monster.position = { x: randomRange(1, width - 2), y: randomRange(1, height - 2) };
            monsters.push(monster);
        }
        if (isBoss && monsters.length > 0) monsters[0].makeBoss();
        return {
            width, height,
            monsters,
            loot: [],
            cleared: false,
            hasTreasure: !isBoss && Math.random() < 0.1
        };
    }
};

const Game = {
    init() {
        this.loadGame();
        NODE_DEFINITIONS.forEach((node, i) => {
            if (!GameState.nodes[node.id]) {
                GameState.nodes[node.id] = {
                    unlocked: i === 0,
                    castleBeaten: false,
                    dungeons: {}
                };
                node.dungeons.forEach(d => GameState.nodes[node.id].dungeons[d.id] = { owned: false, active: false });
            }
        });
        ACHIEVEMENTS.forEach(a => {
            if (!GameState.achievements[a.id]) GameState.achievements[a.id] = { progress: 0, completed: false };
        });
        PRESTIGE_UPGRADES.forEach(u => {
            if (!GameState.prestigeUpgrades[u.id]) GameState.prestigeUpgrades[u.id] = 0;
        });
        if (GameState.party.length === 0) this.addCharacter('fighter');
        const offline = this.calculateOffline();
        if (offline.gold > 0) {
            GameState.gold += offline.gold;
            UI.showOfflineBonus(offline.gold, offline.kills);
        }
        this.recalculatePassiveIncome();
        this.saveGame();
        this.enterFirstDungeon();
    },

    enterFirstDungeon() {
        const firstNode = NODE_DEFINITIONS.find(n => GameState.nodes[n.id].unlocked);
        if (firstNode) this.enterDungeon(firstNode.id);
    },

    enterDungeon(nodeId) {
        if (GameState.currentDungeon) return;
        const nodeDef = NODE_DEFINITIONS.find(n => n.id === nodeId);
        if (!nodeDef) return;
        GameState.currentDungeon = DungeonGenerator.generate(nodeDef);
        GameState.currentRoomIndex = 0;
        this.loadRoom();
        GameState.party.forEach((char, i) => {
            char.position = { x: 2 + i, y: 2 };
        });
        GameState.paused = false;
        UI.addCombatLog(`Entering ${nodeDef.name}`, 'info');
    },

    loadRoom() {
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIndex];
        if (!room) return;
        GameState.monsters = room.monsters;
        GameState.loot = room.loot;
    },

    addCharacter(className) {
        const maxParty = 4 + (GameState.prestigeUpgrades.extra_slot || 0);
        if (GameState.party.length >= maxParty) return false;
        const char = new Character(className, generateId());
        GameState.party.push(char);
        this.updateAchievement('party_five', GameState.party.length);
        return true;
    },

    removeCharacter(id) {
        if (GameState.party.length <= 1) return;
        GameState.party = GameState.party.filter(c => c.id !== id);
    },

    getTotalStats(char) {
        const base = { ...char.baseStats };
        Object.values(char.equipment).forEach(item => {
            if (item) {
                base.dmg += item.damage || 0;
                base.atk += item.attackRating || 0;
                base.arm += item.armor || 0;
                base.def += item.defenseRating || 0;
                base.hp += item.health || 0;
            }
        });
        return base;
    },

    recalculateCharacterStats(char) {
        const def = CLASS_DEFINITIONS[char.class];
        const base = { ...def.baseStats };
        base.dmg += Math.floor((char.level - 1) * 0.5);
        base.atk += (char.level - 1);
        base.arm += Math.floor((char.level - 1) * 0.3);
        base.def += Math.floor((char.level - 1) * 0.5);
        base.hp += (char.level - 1) * 5;
        char.baseStats = base;
        char.maxHp = base.hp;
    },

    canUnlockSkillNode(char, nodeId) { return { canUnlock: true, cost: 1 }; },
    unlockSkillNode(charId, nodeId) { },

    updateTurn() {
        if (GameState.paused || !GameState.currentDungeon) return;
        GameState.turn++;

        GameState.activePotions = GameState.activePotions.filter(p => {
            p.remaining--;
            if (p.remaining <= 0) return false;
            return true;
        });

        GameState.party.forEach(char => {
            if (!char.stunned) {
                char.update();
                this.updateCharacterAI(char);
            }
        });

        GameState.monsters.forEach(monster => {
            monster.update();
            this.updateMonsterAI(monster);
        });

        const dead = GameState.monsters.filter(m => m.currentHp <= 0);
        dead.forEach(mon => this.onMonsterKilled(mon));
        GameState.monsters = GameState.monsters.filter(m => m.currentHp > 0);

        if (GameState.monsters.length === 0) {
            this.onRoomCleared();
        }

        this.collectNearbyLoot();

        UI.renderGameView();
    },

    updateCharacterAI(char) {
        if (GameState.monsters.length === 0) return;
        const monsterPositions = GameState.monsters.map(m => m.position);
        const nearest = findNearest(char.position, monsterPositions);
        const monster = GameState.monsters[nearest.index];
        if (nearest.distance < 1.5) {
            const result = char.attack(monster);
            if (result && result.hit) {
                UI.addFloatingText(monster.position, result.damage, result.crit);
            }
        } else {
            const dx = monster.position.x - char.position.x;
            const dy = monster.position.y - char.position.y;
            const dist = nearest.distance;
            const speed = 0.1 * (1 + (GameState.prestigeUpgrades.walkSpeed || 0) * 0.1);
            char.position.x += (dx / dist) * speed;
            char.position.y += (dy / dist) * speed;
        }
    },

    updateMonsterAI(monster) {
        if (GameState.activePotions.some(p => p.effect === 'docileMonsters')) return;
        const aliveChars = GameState.party.filter(c => !c.stunned && c.currentHp > 0);
        if (aliveChars.length === 0) return;
        const charPositions = aliveChars.map(c => c.position);
        const nearest = findNearest(monster.position, charPositions);
        const target = aliveChars[nearest.index];
        if (nearest.distance < 1.5) {
            const result = monster.attack(target);
            if (result && result.hit) {
                UI.addFloatingText(target.position, result.damage, false);
            }
        } else {
            const dx = target.position.x - monster.position.x;
            const dy = target.position.y - monster.position.y;
            const dist = nearest.distance;
            const speed = 0.05;
            monster.position.x += (dx / dist) * speed;
            monster.position.y += (dy / dist) * speed;
        }
    },

    onMonsterKilled(monster) {
        GameState.totalKills++;
        GameState.adventurePoints++;
        this.updateAchievement('first_blood', 1);
        this.updateAchievement('monster_slayer', GameState.totalKills);
        const xpPerChar = Math.floor(monster.xpReward / GameState.party.length);
        GameState.party.forEach(c => c.gainXP(xpPerChar));
        const goldMult = GameState.activePotions.some(p => p.effect === 'doubleGold') ? 2 : 1;
        const gold = randomRange(5, 20) * goldMult;
        GameState.gold += gold;
        GameState.totalGoldEarned += gold;
        if (Math.random() < 0.2) {
            const item = ItemGenerator.generate(monster.level);
            GameState.loot.push({ type: 'item', item, position: { ...monster.position } });
        }
        if (Math.random() < 0.05) {
            const idx = Math.floor(Math.random() * SCROLLS.length);
            GameState.loot.push({ type: 'scroll', scrollIdx: idx, position: { ...monster.position } });
        }
        if (Math.random() < 0.03) {
            const idx = Math.floor(Math.random() * POTIONS.length);
            GameState.loot.push({ type: 'potion', potionIdx: idx, position: { ...monster.position } });
        }
    },

    onRoomCleared() {
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIndex];
        room.cleared = true;
        UI.addCombatLog('Room cleared!', 'success');
        if (GameState.currentRoomIndex + 1 < GameState.currentDungeon.rooms.length) {
            GameState.currentRoomIndex++;
            this.loadRoom();
            UI.addCombatLog(`Entering room ${GameState.currentRoomIndex + 1}`, 'info');
        } else {
            const nodeId = GameState.currentDungeon.nodeId;
            GameState.nodes[nodeId].castleBeaten = true;
            GameState.castleBossesBeaten++;
            this.updateAchievement('castle_conqueror', GameState.castleBossesBeaten);
            const nodeDef = NODE_DEFINITIONS.find(n => n.id === nodeId);
            nodeDef.unlocks.forEach(nextId => {
                if (GameState.nodes[nextId]) GameState.nodes[nextId].unlocked = true;
            });
            UI.addCombatLog('Dungeon conquered! New areas unlocked!', 'special');
            GameState.currentDungeon = null;
            const nextNode = NODE_DEFINITIONS.find(n => GameState.nodes[n.id].unlocked && !GameState.nodes[n.id].castleBeaten);
            if (nextNode) this.enterDungeon(nextNode.id);
        }
    },

    collectNearbyLoot() {
        GameState.party.forEach(char => {
            GameState.loot = GameState.loot.filter(loot => {
                const dist = distance(char.position, loot.position);
                if (dist < 0.5) {
                    if (loot.type === 'item') {
                        char.inventory.push(loot.item);
                        this.autoEquipItem(char, loot.item);
                    } else if (loot.type === 'scroll') {
                        GameState.scrolls[loot.scrollIdx].count++;
                    } else if (loot.type === 'potion') {
                        GameState.potions[loot.potionIdx].count++;
                    }
                    return false;
                }
                return true;
            });
        });
    },

    autoEquipItem(char, item) {
        const slot = this.getEquipSlot(item);
        if (!slot) return;
        const current = char.equipment[slot];
        if (!current || this.isItemBetter(item, current)) {
            char.equipment[slot] = item;
            char.inventory = char.inventory.filter(i => i.id !== item.id);
            this.recalculateCharacterStats(char);
        }
    },

    getEquipSlot(item) {
        if (item.type.includes('Sword') || item.type.includes('Axe')) return 'weapon';
        if (item.type.includes('Helmet')) return 'helmet';
        if (item.type.includes('Chest')) return 'chest';
        if (item.type.includes('Legs')) return 'legs';
        if (item.type.includes('Boots')) return 'boots';
        if (item.type.includes('Gloves')) return 'gloves';
        if (item.type.includes('Ring')) return 'ring1';
        if (item.type.includes('Amulet')) return 'amulet';
        return null;
    },

    isItemBetter(item1, item2) {
        const score = i => (i.damage||0) + (i.armor||0) + (i.attackRating||0) + (i.defenseRating||0) + (i.health||0)/5;
        return score(item1) > score(item2);
    },

    useScroll(index) {
        const scroll = GameState.scrolls[index];
        if (!scroll || scroll.count <= 0) return;
        if (!GameState.activePotions.some(p => p.effect === 'infiniteScrolls')) scroll.count--;
        GameState.monsters.forEach(m => {
            m.takeDamage(scroll.damage);
            UI.addFloatingText(m.position, scroll.damage, false);
        });
        UI.addCombatLog(`Used ${scroll.name}!`, 'info');
    },

    usePotion(index) {
        const potion = GameState.potions[index];
        if (!potion || potion.count <= 0) return;
        potion.count--;
        const durationBonus = 1 + (GameState.prestigeUpgrades.potionDuration || 0) * 0.15;
        const duration = Math.floor(potion.duration * durationBonus);
        GameState.activePotions.push({ ...potion, remaining: duration });
        UI.addCombatLog(`Activated ${potion.name}!`, 'info');
    },

    purchaseFarm(nodeId, dungeonId) {
        const node = NODE_DEFINITIONS.find(n => n.id === nodeId);
        const dungeon = node.dungeons.find(d => d.id === dungeonId);
        const ns = GameState.nodes[nodeId];
        if (!ns.castleBeaten || ns.dungeons[dungeonId].owned || GameState.gold < dungeon.cost) return false;
        GameState.gold -= dungeon.cost;
        ns.dungeons[dungeonId].owned = true;
        this.recalculatePassiveIncome();
        return true;
    },

    toggleFarm(nodeId, dungeonId) {
        const ns = GameState.nodes[nodeId];
        ns.dungeons[dungeonId].active = !ns.dungeons[dungeonId].active;
        this.recalculatePassiveIncome();
    },

    recalculatePassiveIncome() {
        let kills = 0, gold = 0, xp = 0;
        NODE_DEFINITIONS.forEach(node => {
            const ns = GameState.nodes[node.id];
            if (!ns.castleBeaten) return;
            node.dungeons.forEach(d => {
                const ds = ns.dungeons[d.id];
                if (ds.owned && ds.active) {
                    const rateMult = 1 + (GameState.prestigeUpgrades.farm_speed || 0) * 0.2;
                    const k = d.killRate * rateMult;
                    kills += k;
                    gold += k * d.goldPerKill;
                    xp += k * d.xpPerKill;
                }
            });
        });
        GameState.passiveKillsPerSec = kills;
        GameState.passiveGoldPerSec = gold;
        GameState.passiveXpPerSec = xp;
    },

    processPassiveIncome() {
        if (GameState.passiveKillsPerSec <= 0) return;
        const elapsed = PASSIVE_TICK_INTERVAL / 1000;
        const gold = Math.floor(GameState.passiveGoldPerSec * elapsed);
        const xp = Math.floor(GameState.passiveXpPerSec * elapsed);
        GameState.gold += gold;
        GameState.totalGoldEarned += gold;
        GameState.party.forEach(c => c.gainXP(Math.floor(xp / GameState.party.length)));
    },

    updateAchievement(id, progress) {
        const ach = GameState.achievements[id];
        if (!ach || ach.completed) return;
        ach.progress = Math.max(ach.progress, progress);
        const def = ACHIEVEMENTS.find(a => a.id === id);
        if (ach.progress >= def.req) {
            ach.completed = true;
            GameState.adventurePoints += def.ap;
        }
    },

    calculateOffline() {
        const elapsed = Date.now() - GameState.lastSaveTime;
        const max = MAX_OFFLINE_HOURS * 60 * 60 * 1000;
        const effective = Math.min(elapsed, max);
        const seconds = Math.floor(effective / 1000);
        if (seconds <= 0) return { gold: 0, kills: 0 };
        const gold = Math.floor(GameState.passiveGoldPerSec * seconds * 0.5);
        const kills = Math.floor(GameState.passiveKillsPerSec * seconds * 0.5);
        return { gold, kills };
    },

    saveGame() {
        GameState.lastSaveTime = Date.now();
        localStorage.setItem('dungeonInfinitum', JSON.stringify(GameState));
    },

    loadGame() {
        const saved = localStorage.getItem('dungeonInfinitum');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(GameState, data);
            GameState.party = GameState.party.map(c => {
                const ch = new Character(c.class, c.id);
                Object.assign(ch, c);
                return ch;
            });
        }
    },

    exportSave() {
        const save = JSON.stringify(GameState);
        const b64 = btoa(save);
        navigator.clipboard.writeText(b64);
        UI.showExportModal(b64);
    },

    importSave() {
        const input = document.getElementById('import-input');
        try {
            const data = JSON.parse(atob(input.value));
            Object.assign(GameState, data);
            GameState.party = GameState.party.map(c => {
                const ch = new Character(c.class, c.id);
                Object.assign(ch, c);
                return ch;
            });
            UI.hideModal('char-modal');
            UI.renderAll();
        } catch (e) { alert('Invalid save'); }
    }
};

const UI = {
    activeTab: 'party',
    selectedChar: null,
    fps: 0,
    lastFpsTime: 0,
    fpsFrames: 0,
    canvas: document.getElementById('mainCanvas'),
    ctx: document.getElementById('mainCanvas').getContext('2d'),
    minimapCtx: document.getElementById('minimapCanvas').getContext('2d'),
    floatingTexts: [],

    init() {
        document.getElementById('fps-toggle').onclick = () => {
            GameState.showFps = !GameState.showFps;
            document.getElementById('fps-toggle').textContent = GameState.showFps ? 'Hide FPS' : 'Show FPS';
        };
        document.getElementById('pause-btn').onclick = () => {
            GameState.paused = !GameState.paused;
            this.updatePauseButton();
        };
        this.renderTabs();
        this.renderAll();
        document.addEventListener('keydown', e => {
            if (e.key >= '1' && e.key <= '6') {
                Game.useScroll(parseInt(e.key) - 1);
            }
        });
    },

    renderTabs() {
        const tabs = ['party', 'skills', 'equipment', 'pack', 'prestige', 'achievements'];
        const container = document.getElementById('tab-buttons');
        container.innerHTML = tabs.map(t => 
            `<button class="tab-btn ${this.activeTab === t ? 'active' : ''}" onclick="UI.setTab('${t}')">${
                t.charAt(0).toUpperCase() + t.slice(1)
            }</button>`
        ).join('');
    },

    setTab(tab) {
        this.activeTab = tab;
        this.renderTabs();
        this.renderTabContent();
    },

    updatePauseButton() {
        const btn = document.getElementById('pause-btn');
        btn.textContent = GameState.paused ? '▶ Play' : '⏸ Pause';
        btn.className = `btn ${GameState.paused ? 'btn-play' : 'btn-pause'}`;
    },

    renderAll() {
        this.renderResources();
        this.renderPassiveStats();
        this.renderNodePanel();
        this.renderFarmPanel();
        this.renderGameView();
        this.renderTabContent();
        this.updatePauseButton();
    },

    renderResources() {
        document.getElementById('resources').innerHTML = `
            <div class="resource-item"><span>Gold:</span><span class="resource-value">${formatNumber(GameState.gold)}</span></div>
            <div class="resource-item"><span>Adventure Points:</span><span class="resource-value">${GameState.adventurePoints}</span></div>
            <div class="resource-item"><span>Total Kills:</span><span class="resource-value">${formatNumber(GameState.totalKills)}</span></div>
            <div class="resource-item"><span>Castles Beaten:</span><span class="resource-value">${GameState.castleBossesBeaten}/${NODE_DEFINITIONS.length}</span></div>
        `;
    },

    renderPassiveStats() {
        document.getElementById('passive-stats').innerHTML = `
            <div class="passive-item"><span>⚡ Kills/sec:</span><span>${(GameState.passiveKillsPerSec || 0).toFixed(2)}</span></div>
            <div class="passive-item"><span>💰 Gold/sec:</span><span>${formatNumber(Math.floor(GameState.passiveGoldPerSec || 0))}</span></div>
            <div class="passive-item"><span>✨ XP/sec:</span><span>${formatNumber(Math.floor(GameState.passiveXpPerSec || 0))}</span></div>
        `;
    },

    renderNodePanel() {
        const container = document.getElementById('node-panel');
        let html = '';
        NODE_DEFINITIONS.forEach(node => {
            const ns = GameState.nodes[node.id];
            if (!ns.unlocked) return;
            const statusClass = ns.castleBeaten ? 'completed' : 'available';
            const statusText = ns.castleBeaten ? '✓ Conquered' : '⚔️ Available';
            html += `
                <div class="castle-panel">
                    <div class="castle-header">
                        <span class="castle-name">${node.icon} ${node.name}</span>
                        <span class="castle-status ${statusClass}">${statusText}</span>
                    </div>
                    ${!ns.castleBeaten ? `
                        <button class="castle-btn" onclick="Game.enterDungeon('${node.id}'); UI.renderAll();"
                            ${GameState.currentDungeon ? 'disabled' : ''}>
                            ⚔️ Enter Dungeon
                        </button>
                    ` : '<p style="font-size:0.75rem;color:#22c55e;">Dungeon cleared!</p>'}
                </div>
            `;
        });
        container.innerHTML = html || '<div class="panel"><p style="color:#94a3b8;">No nodes unlocked yet.</p></div>';
    },

    renderFarmPanel() {
        const container = document.getElementById('farm-panel');
        let html = '<div class="farm-panel"><div class="farm-header"><span class="farm-title">🌾 Farms</span></div>';
        let hasFarms = false;
        NODE_DEFINITIONS.forEach(node => {
            const ns = GameState.nodes[node.id];
            if (!ns.castleBeaten) return;
            node.dungeons.forEach(d => {
                const ds = ns.dungeons[d.id];
                if (!ds.owned) {
                    html += `
                        <div class="farm-item">
                            <span class="farm-icon">${d.icon}</span>
                            <div class="farm-info">
                                <span class="farm-name">${d.name}</span>
                                <span class="farm-stats">Lv.${d.level} | ${d.killRate}/s kills</span>
                            </div>
                            <button class="farm-btn" onclick="Game.purchaseFarm('${node.id}', '${d.id}'); UI.renderAll();" ${GameState.gold < d.cost ? 'disabled' : ''}>
                                ${formatNumber(d.cost)}g
                            </button>
                        </div>
                    `;
                } else {
                    hasFarms = true;
                    html += `
                        <div class="farm-item">
                            <span class="farm-icon">${d.icon}</span>
                            <div class="farm-info">
                                <span class="farm-name">${d.name}</span>
                                <span class="farm-stats">Lv.${d.level} | ${d.killRate}/s | ${d.goldPerKill}g/kill</span>
                            </div>
                            <button class="farm-btn ${ds.active ? 'deactivate' : ''}" onclick="Game.toggleFarm('${node.id}', '${d.id}'); UI.renderAll();">
                                ${ds.active ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    `;
                }
            });
        });
        if (!hasFarms) html += '<p style="font-size:0.75rem;color:#94a3b8;">Beat castle bosses to unlock farms!</p>';
        html += '</div>';
        container.innerHTML = html;
    },

    renderGameView() {
        if (!GameState.currentDungeon) {
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText('Select a dungeon from left panel', 200, 300);
            return;
        }
        const room = GameState.currentDungeon.rooms[GameState.currentRoomIndex];
        if (!room) return;

        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(50, 50, room.width * TILE_SIZE, room.height * TILE_SIZE);
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, 50, room.width * TILE_SIZE, room.height * TILE_SIZE);

        GameState.monsters.forEach(m => {
            const x = 50 + m.position.x * TILE_SIZE;
            const y = 50 + m.position.y * TILE_SIZE;
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(m.sprite, x, y);
            const percent = m.currentHp / m.maxHp;
            this.ctx.fillStyle = '#c62828';
            this.ctx.fillRect(x, y + 25, 30 * percent, 3);
        });

        GameState.loot.forEach(l => {
            const x = 50 + l.position.x * TILE_SIZE;
            const y = 50 + l.position.y * TILE_SIZE;
            this.ctx.font = '20px sans-serif';
            if (l.type === 'item') this.ctx.fillText('📦', x, y);
            else if (l.type === 'scroll') this.ctx.fillText('📜', x, y);
            else if (l.type === 'potion') this.ctx.fillText('🧪', x, y);
        });

        GameState.party.forEach(c => {
            const x = 50 + c.position.x * TILE_SIZE;
            const y = 50 + c.position.y * TILE_SIZE;
            this.ctx.font = '24px sans-serif';
            this.ctx.fillText(c.sprite, x, y);
            const percent = c.currentHp / c.maxHp;
            this.ctx.fillStyle = c.stunned ? '#666' : '#22c55e';
            this.ctx.fillRect(x, y + 25, 30 * percent, 3);
        });

        this.floatingTexts = this.floatingTexts.filter(f => {
            f.life--;
            if (f.life <= 0) return false;
            this.ctx.font = f.crit ? 'bold 18px sans-serif' : '14px sans-serif';
            this.ctx.fillStyle = f.crit ? '#ff9800' : '#f44336';
            const x = 50 + f.pos.x * TILE_SIZE;
            const y = 50 + f.pos.y * TILE_SIZE - (20 - f.life * 2);
            this.ctx.fillText(f.text, x, y);
            return true;
        });

        this.renderMinimap();
        document.getElementById('dungeon-name').textContent = GameState.currentDungeon.name;
        document.getElementById('room-info').textContent = `Room ${GameState.currentRoomIndex+1}/${GameState.currentDungeon.rooms.length}`;
        document.getElementById('monster-count').textContent = `Monsters: ${GameState.monsters.length}`;
    },

    renderMinimap() {
        if (!GameState.currentDungeon) return;
        const mm = this.minimapCtx;
        mm.fillStyle = '#0f172a';
        mm.fillRect(0, 0, 150, 150);
        const rooms = GameState.currentDungeon.rooms;
        rooms.forEach((room, i) => {
            const color = i === GameState.currentRoomIndex ? '#22c55e' : (room.cleared ? '#3b82f6' : '#475569');
            mm.fillStyle = color;
            mm.fillRect(10 + (i % 5) * 28, 10 + Math.floor(i / 5) * 28, 20, 20);
        });
    },

    addFloatingText(pos, text, crit) {
        this.floatingTexts.push({ pos, text, crit, life: 20 });
    },

    addCombatLog(msg, type = 'normal') {
        const log = document.getElementById('combat-log');
        const entry = document.createElement('div');
        entry.className = 'log-entry' + (type === 'special' ? ' log-special' : '');
        entry.textContent = msg;
        log.appendChild(entry);
        if (log.children.length > 8) log.removeChild(log.firstChild);
    },

    renderTabContent() {
        const container = document.getElementById('tab-content');
        switch (this.activeTab) {
            case 'party': container.innerHTML = this.renderPartyTab(); break;
            case 'skills': container.innerHTML = this.renderSkillsTab(); break;
            case 'equipment': container.innerHTML = this.renderEquipmentTab(); break;
            case 'pack': container.innerHTML = this.renderPackTab(); break;
            case 'prestige': container.innerHTML = this.renderPrestigeTab(); break;
            case 'achievements': container.innerHTML = this.renderAchievementsTab(); break;
        }
    },

    renderPartyTab() {
        const maxParty = 4 + (GameState.prestigeUpgrades.extra_slot || 0);
        const selected = GameState.party.find(c => c.id === this.selectedChar);
        let html = `
            <div class="party-header">
                <h3>Party (${GameState.party.length}/${maxParty})</h3>
                <button class="add-btn" onclick="UI.showCharModal()" ${GameState.party.length >= maxParty ? 'disabled' : ''}>+ Add</button>
            </div>
            <div class="party-list">
                ${GameState.party.map(c => `
                    <div class="party-member ${this.selectedChar === c.id ? 'selected' : ''}" onclick="UI.selectChar('${c.id}')">
                        <span class="party-sprite">${c.sprite}</span>
                        <div class="party-info">
                            <span class="party-name">${c.name}</span>
                            <span class="party-level">Lv.${c.level}</span>
                        </div>
                        ${GameState.party.length > 1 ? `<button class="remove-btn" onclick="event.stopPropagation(); Game.removeCharacter('${c.id}'); UI.renderAll();">×</button>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        if (selected) {
            const xpPercent = (selected.xp / selected.xpToNext) * 100;
            html += `
                <div class="char-details">
                    <h4>${selected.name} - Lv.${selected.level}</h4>
                    <div class="xp-bar">
                        <div class="xp-fill" style="width:${xpPercent}%"></div>
                        <div class="xp-text">${selected.xp}/${selected.xpToNext}</div>
                    </div>
                    <div class="skill-points">Skill Points: ${selected.skillPoints}</div>
                </div>
            `;
        }
        return html;
    },

    renderSkillsTab() {
        return '<p>Skill tree coming soon</p>';
    },

    renderEquipmentTab() {
        const selected = GameState.party.find(c => c.id === this.selectedChar);
        if (!selected) return '<p>Select a character from Party tab</p>';
        const stats = Game.getTotalStats(selected);
        let html = `
            <h4>${selected.name}</h4>
            <div style="font-size:0.75rem;color:#94a3b8;">DMG:${stats.dmg} ATK:${stats.atk} ARM:${stats.arm} DEF:${stats.def} HP:${stats.hp}</div>
            <div class="equipment-grid">
                ${Object.entries(selected.equipment).map(([slot, item]) => `
                    <div class="equipment-slot">
                        <span class="slot-label">${slot}</span>
                        ${item ? `<div class="equipped-item" style="border-color:${item.rarity === 'LEGENDARY' ? '#ff9800' : '#999'}">
                            <span class="item-name">${item.name}</span>
                            <div class="item-stats">...</div>
                        </div>` : '<div class="empty-slot">Empty</div>'}
                    </div>
                `).join('')}
            </div>
            <h4>Inventory</h4>
            <div class="inventory-grid">
                ${selected.inventory.map(item => `
                    <div class="inventory-item">
                        <span>${item.name}</span>
                        <button class="equip-btn" onclick="Game.autoEquipItem(UI.selectedChar, item)">Equip</button>
                    </div>
                `).join('')}
            </div>
        `;
        return html;
    },

    renderPackTab() {
        let html = '<h3>Pack</h3>';
        if (GameState.activePotions.length) {
            html += '<div class="active-section">' + GameState.activePotions.map(p => 
                `<div class="active-potion">${p.name}: ${p.remaining}s</div>`
            ).join('') + '</div>';
        }
        html += '<h4>Scrolls</h4>';
        GameState.scrolls.forEach((s, i) => {
            html += `<div class="consumable-item">
                <span class="consumable-name">${s.name} (${s.count})</span>
                <button class="use-btn" onclick="Game.useScroll(${i})">Use</button>
            </div>`;
        });
        html += '<h4>Potions</h4>';
        GameState.potions.forEach((p, i) => {
            html += `<div class="consumable-item">
                <span class="consumable-name">${p.name} (${p.count})</span>
                <button class="use-btn" onclick="Game.usePotion(${i})">Use</button>
            </div>`;
        });
        return html;
    },

    renderPrestigeTab() {
        const apEarned = Math.floor(GameState.totalGoldEarned / 10000) + Math.floor(GameState.totalKills / 100);
        let html = `
            <div class="ap-display">
                <span>Adventure Points: ${GameState.adventurePoints}</span>
                <span>Potential AP: +${apEarned}</span>
            </div>
        `;
        PRESTIGE_UPGRADES.forEach(u => {
            const level = GameState.prestigeUpgrades[u.id] || 0;
            html += `
                <div class="prestige-upgrade">
                    <div>
                        <span style="font-weight:bold;">${u.name} (${level}/${u.maxLevel})</span>
                        <span style="font-size:0.75rem;color:#94a3b8;">${u.desc}</span>
                    </div>
                    <button class="farm-btn" onclick="Game.purchasePrestigeUpgrade('${u.id}'); UI.renderAll();"
                        ${GameState.adventurePoints < u.cost || level >= u.maxLevel ? 'disabled' : ''}>
                        ${u.cost} AP
                    </button>
                </div>
            `;
        });
        html += `
            <button class="prestige-btn" onclick="if(confirm('Prestige?')) Game.prestige(); UI.renderAll();" ${apEarned<1?'disabled':''}>
                🔄 Prestige (+${apEarned} AP)
            </button>
            <p class="prestige-warning">Resets everything except AP and upgrades!</p>
        `;
        return html;
    },

    renderAchievementsTab() {
        let html = '<h3>Achievements</h3>';
        ACHIEVEMENTS.forEach(a => {
            const ach = GameState.achievements[a.id] || { progress: 0, completed: false };
            const percent = Math.min(100, (ach.progress / a.req) * 100);
            html += `
                <div class="achievement-item ${ach.completed ? 'completed' : ''}">
                    <span class="achievement-name">${ach.completed ? '✓' : '○'} ${a.name}</span>
                    <div class="achievement-progress">
                        <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
                        <span>${Math.min(ach.progress, a.req)}/${a.req}</span>
                        <span class="ap-reward">+${a.ap} AP</span>
                    </div>
                </div>
            `;
        });
        return html;
    },

    selectChar(id) {
        this.selectedChar = this.selectedChar === id ? null : id;
        this.renderAll();
    },

    showCharModal() {
        const modal = document.getElementById('char-modal');
        const list = document.getElementById('class-list');
        const maxParty = 4 + (GameState.prestigeUpgrades.extra_slot || 0);
        list.innerHTML = Object.entries(CLASS_DEFINITIONS).map(([key, def]) => `
            <button class="class-btn" onclick="Game.addCharacter('${key}'); UI.hideModal('char-modal'); UI.renderAll();"
                ${GameState.party.length >= maxParty ? 'disabled' : ''}>
                <span class="class-sprite">${def.sprite}</span>
                <span class="class-name">${def.name}</span>
                <span class="class-role">${def.role}</span>
            </button>
        `).join('');
        modal.classList.add('show');
    },

    showExportModal(data) {
        document.getElementById('export-area').value = data;
        document.getElementById('export-msg').textContent = 'Save copied!';
        document.getElementById('export-modal').classList.add('show');
    },

    hideModal(id) {
        document.getElementById(id).classList.remove('show');
    },

    showOfflineBonus(gold, kills) {
        const el = document.getElementById('offline-bonus');
        if (el) el.innerHTML = `💰 While away: +${formatNumber(gold)} gold, +${formatNumber(kills)} kills!`;
    },

    updateFps(timestamp) {
        if (!GameState.showFps) return;
        this.fpsFrames++;
        if (timestamp - this.lastFpsTime >= 1000) {
            this.fps = this.fpsFrames;
            this.fpsFrames = 0;
            this.lastFpsTime = timestamp;
            document.getElementById('fps-display').textContent = `FPS: ${this.fps}`;
        }
    }
};

let lastTurnTime = 0;
let lastPassiveTime = 0;

function gameLoop(timestamp) {
    UI.updateFps(timestamp);

    if (!GameState.paused && GameState.currentDungeon) {
        if (timestamp - lastTurnTime >= TURN_INTERVAL) {
            Game.updateTurn();
            UI.renderGameView();
            lastTurnTime = timestamp;
        }
    } else {
        lastTurnTime = timestamp;
    }

    if (timestamp - lastPassiveTime >= PASSIVE_TICK_INTERVAL) {
        Game.processPassiveIncome();
        UI.renderResources();
        UI.renderPassiveStats();
        lastPassiveTime = timestamp;
    }

    requestAnimationFrame(gameLoop);
}

window.onload = () => {
    Game.init();
    UI.init();
    lastPassiveTime = performance.now();
    requestAnimationFrame(gameLoop);
    setInterval(() => Game.saveGame(), 30000);
};

window.onbeforeunload = () => Game.saveGame();