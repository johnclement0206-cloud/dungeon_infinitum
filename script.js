'use strict';

// ============================================================
// Clean Rewrite starts here
// ============================================================

const CFG = {
    TICK_MS: 250,
    REGEN_TICKS: 3,
    HP_REGEN_RATE: 0.008,
    SP_REGEN_RATE: 0.015,
    STUN_TICKS: 20,
    SAVE_INTERVAL: 240,
    UI_UPDATE_INTERVAL: 2,
    TRAVEL_TICKS: 32,
    ROOM_CLEAR_DELAY: 6,
    LOG_MAX: 60,
};

// ===== CHARACTER CLASSES =====
const CLASSES = [
    {
        id: 'fighter', name: 'Fighter',
        desc: 'Well-rounded warrior with high defense and a shield block.',
        baseHP: 120, baseSP: 40,
        baseAtk: 12, baseDef: 12, baseDmg: 10, baseArmor: 5,
        baseCrit: 0.05, baseSpeed: 4,
        abilities: ['shieldBlock'], isRanged: false,
    },
    {
        id: 'ranger', name: 'Ranger',
        desc: 'Attacks from range with a bow. Occasional multi-shot.',
        baseHP: 90, baseSP: 60,
        baseAtk: 14, baseDef: 8, baseDmg: 12, baseArmor: 2,
        baseCrit: 0.08, baseSpeed: 5,
        abilities: ['multiShot'], isRanged: true,
    },
    {
        id: 'rogue', name: 'Rogue',
        desc: 'Vanishes into shadows for devastating backstabs.',
        baseHP: 80, baseSP: 70,
        baseAtk: 16, baseDef: 8, baseDmg: 14, baseArmor: 1,
        baseCrit: 0.20, baseSpeed: 3,
        abilities: ['stealth', 'poisonBlade'], isRanged: false,
    },
    {
        id: 'priest', name: 'Priest',
        desc: 'Heals the party and delivers holy smites.',
        baseHP: 85, baseSP: 100,
        baseAtk: 8, baseDef: 8, baseDmg: 8, baseArmor: 2,
        baseCrit: 0.03, baseSpeed: 5,
        abilities: ['heal', 'holySmite'], isRanged: true,
    },
    {
        id: 'pyromancer', name: 'Pyromancer',
        desc: 'Unleashes devastating fire spells that ignore armor.',
        baseHP: 70, baseSP: 120,
        baseAtk: 10, baseDef: 6, baseDmg: 18, baseArmor: 0,
        baseCrit: 0.10, baseSpeed: 7,
        abilities: ['fireball'], isRanged: true,
    },
    {
        id: 'electromancer', name: 'Electromancer',
        desc: 'Chains lightning between multiple enemies.',
        baseHP: 70, baseSP: 120,
        baseAtk: 10, baseDef: 6, baseDmg: 15, baseArmor: 0,
        baseCrit: 0.12, baseSpeed: 7,
        abilities: ['lightning', 'chainLightning'], isRanged: true,
    },
    {
        id: 'necromancer', name: 'Necromancer',
        desc: 'Summons skeleton minions and drains life.',
        baseHP: 75, baseSP: 110,
        baseAtk: 9, baseDef: 6, baseDmg: 10, baseArmor: 0,
        baseCrit: 0.05, baseSpeed: 8,
        abilities: ['summonSkeleton', 'deathCoil'], isRanged: true,
    },
    {
        id: 'barbarian', name: 'Barbarian',
        desc: 'Rages into battle dealing massive melee damage.',
        baseHP: 150, baseSP: 30,
        baseAtk: 10, baseDef: 8, baseDmg: 16, baseArmor: 3,
        baseCrit: 0.07, baseSpeed: 3,
        abilities: ['rage', 'whirlwind'], isRanged: false,
    },
    {
        id: 'druid', name: 'Druid',
        desc: 'Commands nature and transforms into a bear.',
        baseHP: 95, baseSP: 90,
        baseAtk: 11, baseDef: 10, baseDmg: 12, baseArmor: 3,
        baseCrit: 0.06, baseSpeed: 5,
        abilities: ['entangle', 'heal'], isRanged: false,
    },
    {
        id: 'ninja', name: 'Ninja',
        desc: 'Fastest attacker in the land with brutal crits.',
        baseHP: 75, baseSP: 80,
        baseAtk: 18, baseDef: 10, baseDmg: 13, baseArmor: 1,
        baseCrit: 0.25, baseSpeed: 2,
        abilities: ['stealth', 'poisonBlade'], isRanged: false,
    },
    {
        id: 'chickenKing', name: 'Chicken King',
        desc: 'Somehow incredibly deadly. Nobody knows why.',
        baseHP: 100, baseSP: 50,
        baseAtk: 20, baseDef: 5, baseDmg: 9, baseArmor: 0,
        baseCrit: 0.15, baseSpeed: 1,
        abilities: ['crowCall'], isRanged: false,
    },
];

// ===== MONSTER DATABASE =====
const MONSTER_TEMPLATES = [
    { name: 'Goblin',      tier: 1, hpM: 0.8,  dmgM: 0.8,  xp: 5,   gold: 3   },
    { name: 'Orc',         tier: 1, hpM: 1.0,  dmgM: 1.0,  xp: 8,   gold: 5   },
    { name: 'Skeleton',    tier: 1, hpM: 0.9,  dmgM: 0.9,  xp: 6,   gold: 4   },
    { name: 'Kobold',      tier: 1, hpM: 0.7,  dmgM: 1.1,  xp: 7,   gold: 4   },
    { name: 'Troll',       tier: 2, hpM: 1.5,  dmgM: 1.2,  xp: 15,  gold: 10  },
    { name: 'Dark Mage',   tier: 2, hpM: 0.8,  dmgM: 1.8,  xp: 18,  gold: 12  },
    { name: 'Vampire',     tier: 2, hpM: 1.2,  dmgM: 1.4,  xp: 20,  gold: 15  },
    { name: 'Werewolf',    tier: 2, hpM: 1.3,  dmgM: 1.3,  xp: 17,  gold: 11  },
    { name: 'Golem',       tier: 3, hpM: 2.0,  dmgM: 1.0,  xp: 30,  gold: 20  },
    { name: 'Demon',       tier: 3, hpM: 1.5,  dmgM: 1.6,  xp: 35,  gold: 25  },
    { name: 'Lich',        tier: 3, hpM: 1.2,  dmgM: 2.0,  xp: 40,  gold: 30  },
    { name: 'Harpy',       tier: 3, hpM: 1.0,  dmgM: 1.7,  xp: 32,  gold: 22  },
    { name: 'Dragon',      tier: 4, hpM: 3.0,  dmgM: 2.0,  xp: 80,  gold: 60  },
    { name: 'Titan',       tier: 4, hpM: 3.5,  dmgM: 1.8,  xp: 90,  gold: 70  },
    { name: 'Ancient Dragon', tier: 5, hpM: 5.0, dmgM: 3.0, xp: 200, gold: 150 },
    { name: 'Demon Lord',  tier: 5, hpM: 4.0,  dmgM: 3.5,  xp: 250, gold: 200 },
];

const BOSS_TEMPLATES = [
    { name: 'Dungeon Overlord', hpM: 4.5, dmgM: 2.0, xp: 100,  gold: 80,  isBoss: true },
    { name: 'Ancient Lich',     hpM: 5.0, dmgM: 2.5, xp: 150,  gold: 120, isBoss: true },
    { name: 'Dragon Lord',      hpM: 6.0, dmgM: 3.0, xp: 200,  gold: 180, isBoss: true },
    { name: 'Demon Prince',     hpM: 7.0, dmgM: 3.5, xp: 300,  gold: 250, isBoss: true },
    { name: 'Chaos Titan',      hpM: 10,  dmgM: 4.0, xp: 500,  gold: 400, isBoss: true },
];

// ===== ACHIEVEMENT DEFINITIONS =====
const ACHIEVEMENT_DEFS = [
    { id: 'kills100',       name: '100 Kills',           type: 'kills',            threshold: 100,    reward: 5  },
    { id: 'kills1k',        name: '1,000 Kills',         type: 'kills',            threshold: 1000,   reward: 15 },
    { id: 'kills10k',       name: '10,000 Kills',        type: 'kills',            threshold: 10000,  reward: 50 },
    { id: 'kills100k',      name: '100,000 Kills',       type: 'kills',            threshold: 100000, reward: 150},
    { id: 'dungeon1',       name: 'First Blood',         type: 'dungeonsCleared',  threshold: 1,      reward: 10 },
    { id: 'dungeon10',      name: 'Dungeon Delver',      type: 'dungeonsCleared',  threshold: 10,     reward: 30 },
    { id: 'dungeon25',      name: 'Dungeon Master',      type: 'dungeonsCleared',  threshold: 25,     reward: 80 },
    { id: 'dungeon35',      name: 'World Conqueror',     type: 'dungeonsCleared',  threshold: 35,     reward: 200},
    { id: 'castle1',        name: 'Castle Owner',        type: 'castlesConquered', threshold: 1,      reward: 20 },
    { id: 'castle5',        name: 'Land Baron',          type: 'castlesConquered', threshold: 5,      reward: 60 },
    { id: 'castle15',       name: 'Kingdom Builder',     type: 'castlesConquered', threshold: 15,     reward: 150},
    { id: 'castle35',       name: 'Emperor',             type: 'castlesConquered', threshold: 35,     reward: 500},
    { id: 'gold1k',         name: 'Wealthy',             type: 'goldEarned',       threshold: 1000,   reward: 8  },
    { id: 'gold10k',        name: 'Rich',                type: 'goldEarned',       threshold: 10000,  reward: 25 },
    { id: 'gold100k',       name: 'Filthy Rich',         type: 'goldEarned',       threshold: 100000, reward: 80 },
    { id: 'level10',        name: 'Veteran',             type: 'maxLevel',         threshold: 10,     reward: 15 },
    { id: 'level25',        name: 'Champion',            type: 'maxLevel',         threshold: 25,     reward: 50 },
    { id: 'level50',        name: 'Legend',              type: 'maxLevel',         threshold: 50,     reward: 150},
    { id: 'level100',       name: 'Immortal',            type: 'maxLevel',         threshold: 100,    reward: 400},
    { id: 'minions50',      name: 'Minion Master',       type: 'minionsSummoned',  threshold: 50,     reward: 20 },
    { id: 'minions500',     name: 'Army of Darkness',    type: 'minionsSummoned',  threshold: 500,    reward: 60 },
    { id: 'spells1k',       name: 'Spell Slinger',       type: 'spellsCast',       threshold: 1000,   reward: 30 },
    { id: 'crits500',       name: 'Critical Fiend',      type: 'criticalHits',     threshold: 500,    reward: 25 },
];

// ===== DUNGEON DEFINITIONS =====
const DUNGEON_NAMES = [
    'Goblin Cave','Dark Forest','Ruined Temple','Forgotten Mine','Haunted Crypt',
    'Troll Bridge','Orc Fortress','Vampire Tower','Witch Lair','Dragon Cavern',
    'Demon Gateway','Lich Citadel','Cursed Village','Shadow Realm','Frost Dungeon',
    'Fire Pits','Poison Swamp','Death Valley','Ancient Tomb','Storm Peak',
    'Blood Castle','Chaos Dungeon','Abyss Gate','Nether Keep','Dark Sanctum',
    'Bone Pit','Plague Tower','Sin Citadel','Void Temple','Eternal Dark',
    'Infernal Lair','Soul Prison','Hell Gate','Oblivion Keep','The Final Dungeon',
];

function buildDungeons() {
    return DUNGEON_NAMES.map((name, i) => ({
        id: i,
        name,
        level: Math.max(1, Math.floor(i * 2.5 + 1)),
        rooms: 3 + Math.floor(i / 5),
        cleared: false,
        castlePurchased: false,
        castleCost: Math.floor(100 * Math.pow(1.5, i)),
        farmActive: false,
        farmKillRate: 0,
    }));
}

// ===== MONSTER UPGRADES =====
const UPGRADE_DEFS = [
    {
        id: 'goldChance', name: 'Gold Drop Chance',
        baseCost: 50, costMult: 1.4,
        apply: (u, lv) => { u.goldChance = 0.005 + lv * 0.002; },
        fmt: (u) => `${(u.goldChance * 100).toFixed(2)}%`,
    },
    {
        id: 'maxGold', name: 'Max Gold Per Drop',
        baseCost: 80, costMult: 1.5,
        apply: (u, lv) => { u.maxGold = 20 + lv * 10; },
        fmt: (u) => `${u.maxGold} g`,
    },
    {
        id: 'minGold', name: 'Min Gold Per Drop',
        baseCost: 60, costMult: 1.6,
        apply: (u, lv) => { u.minGold = lv * 2; },
        fmt: (u) => `${u.minGold} g`,
    },
    {
        id: 'itemChance', name: 'Item Drop Chance',
        baseCost: 100, costMult: 1.5,
        apply: (u, lv) => { u.itemChance = 0.009 + lv * 0.003; },
        fmt: (u) => `${(u.itemChance * 100).toFixed(2)}%`,
    },
    {
        id: 'xpBonus', name: 'XP Multiplier',
        baseCost: 200, costMult: 2.0,
        apply: (u, lv) => { u.xpMult = 1.0 + lv * 0.1; },
        fmt: (u) => `${u.xpMult.toFixed(1)}x`,
    },
];

// ===== GAME STATE =====
const G = {
    paused: false,
    tick: 0,
    started: false,
    activeTab: 'game',

    gold: 0,
    kills: 0,
    goldEarned: 0,
    adventurePoints: 0,

    party: [],

    dungeons: [],
    currentDungeonIdx: -1,
    currentRoom: 0,
    traveling: false,
    travelTicks: 0,
    nextDungeonIdx: 0,
    roomDelay: 0,

    monsters: [],
    inCombat: false,

    achievements: {},
    dungeonsCleared: 0,
    castlesConquered: 0,
    minionsSummoned: 0,

    upgrades: {
        goldChance: 0.005, maxGold: 20, minGold: 0,
        itemChance: 0.009, xpMult: 1.0,
    },
    upgradeLevels: {},

    stats: {
        meleeAttacks: 0, rangedAttacks: 0,
        spellsCast: 0, criticalHits: 0, timesStunned: 0,
    },

    combatLog: [],
    settings: { offlineProcessing: true },
};

// ===== UTILITY =====
const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const randF = () => Math.random();

function log(msg, color) {
    G.combatLog.unshift({ msg, color: color || '#FFF' });
    if (G.combatLog.length > CFG.LOG_MAX) G.combatLog.length = CFG.LOG_MAX;
}

function xpForLevel(lv) {
    return Math.floor(100 * lv * Math.pow(1.15, lv - 1));
}

// ===== HERO =====
function createHero(classId, name) {
    const cls = CLASSES.find(c => c.id === classId);
    if (!cls) return null;
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name, classId, className: cls.name,
        level: 1, xp: 0, xpNeeded: xpForLevel(1),

        maxHP: cls.baseHP, hp: cls.baseHP,
        maxSP: cls.baseSP, sp: cls.baseSP,
        atk: cls.baseAtk, def: cls.baseDef,
        dmg: cls.baseDmg, armor: cls.baseArmor,
        crit: cls.baseCrit, speed: cls.baseSpeed,
        isRanged: cls.isRanged,
        abilities: [...cls.abilities],

        cooldown: 0,
        stunTicks: 0,
        stealthed: false,
        rageActive: false,
        abilityCDs: {},

        kills: 0, totalDmg: 0, healing: 0,
        spellsCast: 0, meleeAtks: 0, rangedAtks: 0,
    };
}

// ===== MONSTERS =====
function spawnMonster(template, dungLv, isBoss) {
    const scale = 1 + (dungLv - 1) * 0.3;
    const hp = Math.max(5, Math.floor(30 * template.hpM * scale));
    const dmg = Math.max(1, Math.floor(8 * template.dmgM * scale));
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: template.name + (isBoss ? ' ☠' : ''),
        isBoss: !!isBoss,
        maxHP: hp, hp,
        atk: Math.floor(8 * scale), def: Math.floor(6 * scale),
        dmg, armor: Math.floor(2 * template.hpM * scale),
        crit: 0.05, speed: isBoss ? 3 : 4,
        cooldown: randInt(0, 3),
        stunTicks: 0,
        poison: null,
        xpReward: Math.floor(template.xp * scale * G.upgrades.xpMult),
        goldReward: template.gold,
    };
}

function spawnRoom(dungLv, isLast) {
    if (isLast) {
        const bossIdx = Math.min(BOSS_TEMPLATES.length - 1, Math.floor(dungLv / 7));
        return [spawnMonster(BOSS_TEMPLATES[bossIdx], dungLv, true)];
    }
    const tierCap = Math.min(5, Math.ceil(dungLv / 7));
    const pool = MONSTER_TEMPLATES.filter(m => m.tier <= tierCap);
    const count = randInt(1, 3);
    return Array.from({ length: count }, () => spawnMonster(pool[randInt(0, pool.length - 1)], dungLv, false));
}

// ===== COMBAT CORE =====

// Returns { hit, crit, damage }
function resolveHit(attacker, defender) {
    // Stealth: guaranteed hit, guaranteed crit, double damage
    if (attacker.stealthed) {
        attacker.stealthed = false;
        const dmg = attacker.dmg + randInt(0, attacker.dmg);
        return { hit: true, crit: true, damage: dmg };
    }

    const atkRoll = randInt(0, attacker.atk);
    const defRoll = randInt(0, defender.def);

    if (atkRoll <= defRoll) return { hit: false, crit: false, damage: 0 };

    const isCrit = randF() < attacker.crit;
    let dmg;
    if (isCrit) {
        // Crits bypass armor entirely
        dmg = attacker.dmg + randInt(0, Math.floor(attacker.dmg * 0.5));
    } else {
        dmg = Math.max(1, attacker.dmg - defender.armor + randInt(-2, 2));
    }
    return { hit: true, crit: isCrit, damage: dmg };
}

// Returns true if target is KO'd/killed
function dealDamage(target, amount) {
    // Hero shield block reduces damage by 40%
    if (target.shieldActive) {
        amount = Math.max(1, Math.floor(amount * 0.6));
    }
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp > 0) return false;

    // Heroes get stunned; monsters die
    if (target.maxSP !== undefined) {
        target.stunTicks = CFG.STUN_TICKS;
        target.hp = 0;
        G.stats.timesStunned++;
        log(`${target.name} is STUNNED!`, '#FA0');
    }
    return true;
}

function livingHeroes() {
    return G.party.filter(h => h.hp > 0 && h.stunTicks === 0);
}

function livingMonsters() {
    return G.monsters.filter(m => m.hp > 0);
}

function pickHeroTarget() {
    const valid = livingHeroes().filter(h => !h.stealthed);
    if (!valid.length) return null;
    return valid[randInt(0, valid.length - 1)];
}

function pickMonsterTarget() {
    const alive = livingMonsters();
    if (!alive.length) return null;
    // Target lowest HP%
    return alive.reduce((a, b) => (a.hp / a.maxHP) <= (b.hp / b.maxHP) ? a : b);
}

function heroAttacks(hero) {
    const target = pickMonsterTarget();
    if (!target) return;

    const res = resolveHit(hero, target);

    if (hero.isRanged) { hero.rangedAtks++; G.stats.rangedAttacks++; }
    else { hero.meleeAtks++; G.stats.meleeAttacks++; }

    if (!res.hit) return;

    if (res.crit) {
        G.stats.criticalHits++;
        log(`${hero.name} CRITS ${target.name} for ${res.damage}!`, '#FA0');
    } else {
        log(`${hero.name} hits ${target.name} for ${res.damage}.`, '#8F8');
    }

    hero.totalDmg += res.damage;
    const ko = dealDamage(target, res.damage);
    if (ko) onMonsterDied(target, hero);
}

function monsterAttacks(monster) {
    const target = pickHeroTarget();
    if (!target) return;

    const res = resolveHit(monster, target);
    if (!res.hit) return;

    if (res.crit) {
        log(`${monster.name} CRITS ${target.name} for ${res.damage}!`, '#F44');
    } else {
        log(`${monster.name} hits ${target.name} for ${res.damage}.`, '#FAA');
    }

    dealDamage(target, res.damage);
}

function onMonsterDied(monster, killer) {
    state_removeMonster(monster);

    G.kills++;
    hero_distributeXP(monster.xpReward);
    hero_dropGold(monster);

    if (killer) killer.kills++;
    log(`${monster.name} defeated! +${monster.xpReward} XP`, '#AFF');

    if (livingMonsters().length === 0) onRoomCleared();
}

function state_removeMonster(m) {
    const i = G.monsters.indexOf(m);
    if (i >= 0) G.monsters.splice(i, 1);
}

function hero_distributeXP(total) {
    const share = Math.max(1, Math.floor(total / G.party.length));
    for (const h of G.party) heroGainXP(h, share);
}

function hero_dropGold(monster) {
    if (randF() >= G.upgrades.goldChance) return;
    const gold = randInt(G.upgrades.minGold, G.upgrades.maxGold);
    if (gold <= 0) return;
    G.gold += gold;
    G.goldEarned += gold;
    log(`Found ${gold} gold!`, '#FA0');
}

// ===== ABILITIES =====
function tryAbilities(hero) {
    // Tick cooldowns first
    for (const ab of hero.abilities) {
        if (hero.abilityCDs[ab] > 0) hero.abilityCDs[ab]--;
    }

    for (const ab of hero.abilities) {
        if ((hero.abilityCDs[ab] || 0) > 0) continue;
        if (executeAbility(hero, ab)) return true;
    }
    return false;
}

function executeAbility(hero, ab) {
    switch (ab) {
        case 'heal': {
            const hurt = G.party
                .filter(h => h.hp < h.maxHP * 0.85 && h.stunTicks === 0)
                .sort((a, b) => a.hp / a.maxHP - b.hp / b.maxHP)[0];
            if (!hurt || hero.sp < 20) return false;
            const amt = Math.floor(hero.maxSP * 0.3 + hero.dmg * 2);
            hurt.hp = Math.min(hurt.maxHP, hurt.hp + amt);
            hero.healing += amt;
            hero.sp -= 20;
            hero.abilityCDs.heal = 12;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            log(`${hero.name} heals ${hurt.name} for ${amt}.`, '#4F4');
            return true;
        }

        case 'stealth': {
            if (hero.stealthed || hero.sp < 15) return false;
            hero.stealthed = true;
            hero.sp -= 15;
            hero.abilityCDs.stealth = 20;
            log(`${hero.name} vanishes into shadow.`, '#AAF');
            return true;
        }

        case 'poisonBlade': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 10 || t.poison) return false;
            t.poison = { dmg: Math.max(1, Math.floor(hero.dmg * 0.3)), ticks: 8 };
            hero.sp -= 10;
            hero.abilityCDs.poisonBlade = 8;
            log(`${hero.name} poisons ${t.name}!`, '#8F4');
            return false; // doesn't consume attack slot
        }

        case 'fireball': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 25) return false;
            const dmg = Math.floor(hero.dmg * 2 + randInt(0, hero.dmg));
            hero.sp -= 25;
            hero.abilityCDs.fireball = 16;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} launches Fireball at ${t.name} for ${dmg}!`, '#F84');
            if (ko) onMonsterDied(t, hero);
            return true;
        }

        case 'lightning': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 20) return false;
            const dmg = Math.floor(hero.dmg * 1.8 + randInt(0, hero.dmg));
            hero.sp -= 20;
            hero.abilityCDs.lightning = 14;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} zaps ${t.name} with Lightning for ${dmg}!`, '#8CF');
            if (ko) onMonsterDied(t, hero);
            return true;
        }

        case 'chainLightning': {
            const targets = livingMonsters();
            if (!targets.length || hero.sp < 35) return false;
            hero.sp -= 35;
            hero.abilityCDs.chainLightning = 24;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            let baseDmg = Math.floor(hero.dmg * 1.5);
            const hit = targets.slice(0, 3);
            log(`${hero.name} chains Lightning through ${hit.length} enemies!`, '#8CF');
            for (const t of hit) {
                const ko = dealDamage(t, baseDmg);
                hero.totalDmg += baseDmg;
                if (ko) onMonsterDied(t, hero);
                baseDmg = Math.floor(baseDmg * 0.6); // chain falloff
                if (livingMonsters().length === 0) break;
            }
            return true;
        }

        case 'summonSkeleton': {
            if (hero.sp < 30) return false;
            const t = pickMonsterTarget();
            if (!t) return false;
            hero.sp -= 30;
            hero.abilityCDs.summonSkeleton = 30;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            G.minionsSummoned++;
            const dmg = Math.max(1, Math.floor(hero.dmg * 0.8));
            hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} summons a Skeleton that strikes ${t.name} for ${dmg}!`, '#AAF');
            if (ko) onMonsterDied(t, hero);
            return true;
        }

        case 'deathCoil': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 20) return false;
            const dmg = Math.floor(hero.dmg * 1.5);
            const heal = Math.floor(dmg * 0.5);
            hero.sp -= 20;
            hero.abilityCDs.deathCoil = 12;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            hero.hp = Math.min(hero.maxHP, hero.hp + heal);
            hero.healing += heal;
            log(`${hero.name} fires Death Coil at ${t.name} for ${dmg}, drains ${heal} HP.`, '#A8F');
            if (ko) onMonsterDied(t, hero);
            return true;
        }

        case 'holySmite': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 15) return false;
            const dmg = Math.floor(hero.dmg * 1.5);
            hero.sp -= 15;
            hero.abilityCDs.holySmite = 10;
            hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} smites ${t.name} with holy light for ${dmg}!`, '#FF8');
            if (ko) onMonsterDied(t, hero);
            return true;
        }

        case 'rage': {
            if (hero.rageActive || hero.sp < 10) return false;
            hero.rageActive = true;
            hero.dmg = Math.floor(hero.dmg * 1.5);
            hero.atk = Math.floor(hero.atk * 1.3);
            hero.sp -= 10;
            hero.abilityCDs.rage = 40;
            log(`${hero.name} enters a RAGE!`, '#F44');
            return false; // costs no attack turn
        }

        case 'whirlwind': {
            const targets = livingMonsters();
            if (!targets.length || hero.sp < 20) return false;
            hero.sp -= 20;
            hero.abilityCDs.whirlwind = 20;
            hero.cooldown = hero.speed;
            const hit = targets.slice(0, 4);
            const dmg = Math.floor(hero.dmg * 0.7);
            log(`${hero.name} WHIRLS through ${hit.length} enemies for ${dmg} each!`, '#F84');
            for (const t of hit) {
                hero.totalDmg += dmg;
                const ko = dealDamage(t, dmg);
                if (ko) onMonsterDied(t, hero);
                if (livingMonsters().length === 0) break;
            }
            return true;
        }

        case 'entangle': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 15) return false;
            t.cooldown = Math.max(t.cooldown, 8); // roots monster
            hero.sp -= 15;
            hero.abilityCDs.entangle = 15;
            log(`${hero.name} entangles ${t.name} in roots!`, '#4F8');
            return false;
        }

        case 'multiShot': {
            const targets = livingMonsters();
            if (targets.length < 2 || hero.sp < 15) return false;
            hero.sp -= 15;
            hero.abilityCDs.multiShot = 12;
            hero.cooldown = hero.speed;
            hero.rangedAtks++;
            G.stats.rangedAttacks++;
            const hit = targets.slice(0, 3);
            log(`${hero.name} fires Multi-Shot at ${hit.length} targets!`, '#8CF');
            for (const t of hit) {
                const res = resolveHit(hero, t);
                if (res.hit) {
                    hero.totalDmg += res.damage;
                    const ko = dealDamage(t, res.damage);
                    if (ko) onMonsterDied(t, hero);
                    if (livingMonsters().length === 0) break;
                }
            }
            return true;
        }

        case 'shieldBlock': {
            if (hero.sp < 10 || hero.shieldActive) return false;
            hero.shieldActive = true;
            hero.shieldTicks = 5;
            hero.sp -= 10;
            hero.abilityCDs.shieldBlock = 12;
            log(`${hero.name} raises shield!`, '#88F');
            return false;
        }

        case 'crowCall': {
            // Buff all party members' attack speed for a few ticks
            if (hero.sp < 12) return false;
            hero.sp -= 12;
            hero.abilityCDs.crowCall = 18;
            for (const h of livingHeroes()) {
                h.cooldown = Math.max(0, h.cooldown - 2);
            }
            log(`${hero.name} crows! Party attacks faster!`, '#FF4');
            return false;
        }

        default:
            return false;
    }
}

// ===== COMBAT TICK =====
function combatTick() {
    if (!G.inCombat) return;

    for (const hero of G.party) {
        if (hero.stunTicks > 0) {
            hero.stunTicks--;
            if (hero.stunTicks === 0) {
                hero.hp = Math.max(1, Math.floor(hero.maxHP * 0.2));
                log(`${hero.name} recovers from stun.`, '#AFF');
            }
            continue;
        }
        if (hero.cooldown > 0) { hero.cooldown--; continue; }
        if (!livingMonsters().length) continue;

        const usedAbility = tryAbilities(hero);
        if (!usedAbility) {
            heroAttacks(hero);
            hero.cooldown = hero.speed;
        }
    }

    // Monster turns (iterate copy to avoid mutation issues mid-loop)
    if (!G.inCombat) return;
    for (const monster of [...livingMonsters()]) {
        if (monster.stunTicks > 0) { monster.stunTicks--; continue; }
        if (monster.cooldown > 0) { monster.cooldown--; continue; }

        monsterAttacks(monster);
        monster.cooldown = monster.speed;
    }

    // Tick poison
    for (const m of [...G.monsters]) {
        if (!m.poison) continue;
        m.poison.ticks--;
        const ko = dealDamage(m, m.poison.dmg);
        if (ko) onMonsterDied(m, null);
        if (m.poison && m.poison.ticks <= 0) m.poison = null;
    }

    // Defeat check
    if (G.party.length > 0 && G.party.every(h => h.stunTicks > 0 || h.hp <= 0)) {
        onPartyDefeated();
    }
}

function onPartyDefeated() {
    log('=== Party defeated — retreating... ===', '#F44');
    G.inCombat = false;
    G.monsters = [];
    G.currentRoom = 0;
    for (const h of G.party) {
        h.hp = Math.max(1, Math.floor(h.maxHP * 0.3));
        h.stunTicks = 0;
    }
    G.traveling = true;
    G.travelTicks = CFG.TRAVEL_TICKS;
    G.nextDungeonIdx = G.currentDungeonIdx;
}

// ===== REGEN =====
function regenTick() {
    for (const h of G.party) {
        if (h.stunTicks > 0) continue;
        h.hp = Math.min(h.maxHP, h.hp + Math.max(1, Math.floor(h.maxHP * CFG.HP_REGEN_RATE)));
        h.sp = Math.min(h.maxSP, h.sp + Math.max(1, Math.floor(h.maxSP * CFG.SP_REGEN_RATE)));

        // Tick down shield block
        if (h.shieldActive) {
            h.shieldTicks--;
            if (h.shieldTicks <= 0) h.shieldActive = false;
        }
    }
}

// ===== LEVELING =====
function heroGainXP(hero, amt) {
    hero.xp += amt;
    while (hero.xp >= hero.xpNeeded) {
        hero.xp -= hero.xpNeeded;
        hero.level++;
        hero.xpNeeded = xpForLevel(hero.level);
        heroLevelUp(hero);
    }
}

function heroLevelUp(hero) {
    hero.maxHP = Math.floor(hero.maxHP * 1.08);
    hero.hp = hero.maxHP;
    hero.maxSP = Math.floor(hero.maxSP * 1.06);
    hero.sp = hero.maxSP;
    hero.dmg  = Math.floor(hero.dmg * 1.05 + 0.5);
    hero.armor = Math.floor(hero.armor + 0.3);
    hero.atk  = Math.floor(hero.atk + 0.5);
    hero.def  = Math.floor(hero.def + 0.4);
    log(`${hero.name} reached level ${hero.level}!`, '#FF4');
    checkAchievements('maxLevel', Math.max(...G.party.map(h => h.level)));
}

// ===== DUNGEON / MAP =====
function onRoomCleared() {
    const dung = G.dungeons[G.currentDungeonIdx];
    if (!dung) return;
    const isLast = G.currentRoom >= dung.rooms - 1;
    if (isLast) {
        onDungeonCleared(dung);
    } else {
        G.currentRoom++;
        G.inCombat = false;
        G.roomDelay = CFG.ROOM_CLEAR_DELAY;
        log(`Room ${G.currentRoom} cleared! Moving ahead...`, '#8AF');
    }
}

function onDungeonCleared(dung) {
    if (!dung.cleared) {
        dung.cleared = true;
        G.dungeonsCleared++;
        G.adventurePoints += 10;
        log(`=== DUNGEON CLEARED: ${dung.name} ===`, '#3AF');
        log(`Castle available for ${dung.castleCost.toLocaleString()} gold.`, '#FA0');
        checkAchievements('dungeonsCleared', G.dungeonsCleared);

        // Check win condition
        if (G.dungeonsCleared >= G.dungeons.length) {
            log('=== ALL DUNGEONS CLEARED — You have won CLICKPOCALYPSE II! ===', '#FA0');
        }
    }
    G.inCombat = false;
    G.currentRoom = 0;
    nextDungeon();
}

function nextDungeon() {
    const uncleared = G.dungeons.filter(d => !d.cleared);
    const idx = uncleared.length > 0
        ? uncleared[0].id
        : (G.currentDungeonIdx + 1) % G.dungeons.length;

    if (idx !== G.currentDungeonIdx) {
        G.traveling = true;
        G.travelTicks = CFG.TRAVEL_TICKS;
        G.nextDungeonIdx = idx;
        log(`Traveling to ${G.dungeons[idx].name}...`, '#8AF');
    } else {
        enterDungeon(G.currentDungeonIdx);
    }
}

function enterDungeon(idx) {
    G.currentDungeonIdx = idx;
    G.currentRoom = 0;
    G.traveling = false;
    G.roomDelay = 0;
    const d = G.dungeons[idx];
    log(`=== Entering ${d.name} (Level ${d.level}) ===`, '#8CF');
    enterRoom();
}

function enterRoom() {
    const d = G.dungeons[G.currentDungeonIdx];
    if (!d) return;
    const isLast = G.currentRoom >= d.rooms - 1;
    G.monsters = spawnRoom(d.level, isLast);
    G.inCombat = true;
    const names = G.monsters.map(m => m.name).join(', ');
    log(`Room ${G.currentRoom + 1}/${d.rooms}: ${names}`, '#FFF');
}

// ===== CASTLE & FARM =====
window.buyCastle = function(idx) {
    const d = G.dungeons[idx];
    if (!d || !d.cleared || d.castlePurchased) return;
    if (G.gold < d.castleCost) { log('Not enough gold!', '#F44'); return; }
    G.gold -= d.castleCost;
    d.castlePurchased = true;
    G.castlesConquered++;
    G.adventurePoints += 20;
    log(`Castle conquered in ${d.name}! +20 AP`, '#FA0');
    checkAchievements('castlesConquered', G.castlesConquered);
    updateDungeonsUI();
};

window.activateFarm = function(idx) {
    const d = G.dungeons[idx];
    if (!d || !d.castlePurchased || d.farmActive) return;
    d.farmActive = true;
    d.farmKillRate = Math.max(1, Math.floor(d.level * 0.5));
    log(`Farm activated in ${d.name}! +${d.farmKillRate} kills/tick`, '#4FA');
    updateDungeonsUI();
};

function farmTick() {
    for (const d of G.dungeons) {
        if (!d.farmActive) continue;
        G.kills += d.farmKillRate;
        const gold = Math.floor(d.farmKillRate * d.level * G.upgrades.goldChance * G.upgrades.maxGold * 0.5);
        G.gold += gold;
        G.goldEarned += gold;
    }
}

// ===== MONSTER UPGRADES =====
function upgradeLevel(id) { return G.upgradeLevels[id] || 0; }

function upgradeCost(def) {
    return Math.floor(def.baseCost * Math.pow(def.costMult, upgradeLevel(def.id)));
}

window.buyUpgrade = function(id) {
    const def = UPGRADE_DEFS.find(d => d.id === id);
    if (!def) return;
    const cost = upgradeCost(def);
    if (G.gold < cost) return;
    G.gold -= cost;
    G.upgradeLevels[id] = upgradeLevel(id) + 1;
    def.apply(G.upgrades, G.upgradeLevels[id]);
    updateMonsterUpgradesUI();
};

// ===== ACHIEVEMENTS =====
function checkAchievements(type, value) {
    for (const def of ACHIEVEMENT_DEFS) {
        if (def.type !== type) continue;
        if (G.achievements[def.id]) continue;
        if (value >= def.threshold) {
            G.achievements[def.id] = true;
            G.adventurePoints += def.reward;
            log(`ACHIEVEMENT UNLOCKED: ${def.name}! +${def.reward} AP`, '#FA0');
        }
    }
}

function checkAllAchievements() {
    checkAchievements('kills', G.kills);
    checkAchievements('dungeonsCleared', G.dungeonsCleared);
    checkAchievements('castlesConquered', G.castlesConquered);
    checkAchievements('goldEarned', G.goldEarned);
    checkAchievements('minionsSummoned', G.minionsSummoned);
    checkAchievements('spellsCast', G.stats.spellsCast);
    checkAchievements('criticalHits', G.stats.criticalHits);
    if (G.party.length) {
        checkAchievements('maxLevel', Math.max(...G.party.map(h => h.level)));
    }
}

// ===== SAVE / LOAD =====
function saveGame() {
    try {
        localStorage.setItem('cp2_save', JSON.stringify({
            v: 2,
            gold: G.gold, kills: G.kills, goldEarned: G.goldEarned,
            ap: G.adventurePoints,
            dungeonsCleared: G.dungeonsCleared,
            castlesConquered: G.castlesConquered,
            minionsSummoned: G.minionsSummoned,
            achievements: G.achievements,
            stats: G.stats,
            dungeons: G.dungeons.map(d => ({
                id: d.id, cleared: d.cleared,
                castlePurchased: d.castlePurchased, farmActive: d.farmActive,
            })),
            upgradeLevels: G.upgradeLevels,
            party: G.party.map(h => ({
                id: h.id, name: h.name, classId: h.classId,
                level: h.level, xp: h.xp, xpNeeded: h.xpNeeded,
                maxHP: h.maxHP, hp: h.hp, maxSP: h.maxSP, sp: h.sp,
                atk: h.atk, def: h.def, dmg: h.dmg, armor: h.armor,
                kills: h.kills, totalDmg: h.totalDmg, healing: h.healing,
            })),
            ts: Date.now(),
        }));
    } catch(e) { console.error('Save failed', e); }
}

function loadSave() {
    try {
        const raw = localStorage.getItem('cp2_save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s || s.v !== 2) return false;

        G.gold = s.gold || 0;
        G.kills = s.kills || 0;
        G.goldEarned = s.goldEarned || 0;
        G.adventurePoints = s.ap || 0;
        G.dungeonsCleared = s.dungeonsCleared || 0;
        G.castlesConquered = s.castlesConquered || 0;
        G.minionsSummoned = s.minionsSummoned || 0;
        G.achievements = s.achievements || {};
        G.stats = Object.assign(G.stats, s.stats || {});

        if (s.dungeons) {
            for (const ds of s.dungeons) {
                const d = G.dungeons.find(x => x.id === ds.id);
                if (!d) continue;
                d.cleared = ds.cleared;
                d.castlePurchased = ds.castlePurchased;
                d.farmActive = ds.farmActive;
                if (d.farmActive) d.farmKillRate = Math.max(1, Math.floor(d.level * 0.5));
            }
        }

        if (s.upgradeLevels) {
            G.upgradeLevels = s.upgradeLevels;
            for (const def of UPGRADE_DEFS) {
                const lv = G.upgradeLevels[def.id] || 0;
                if (lv > 0) def.apply(G.upgrades, lv);
            }
        }

        // Offline farm income (max 2 hrs)
        if (G.settings.offlineProcessing && s.ts) {
            const ticks = Math.min(Math.floor((Date.now() - s.ts) / CFG.TICK_MS), 28800);
            if (ticks > 60) {
                let totalKills = 0, totalGold = 0;
                for (const d of G.dungeons) {
                    if (!d.farmActive) continue;
                    totalKills += d.farmKillRate * ticks;
                    totalGold += Math.floor(d.farmKillRate * ticks * d.level * G.upgrades.goldChance * G.upgrades.maxGold * 0.5);
                }
                G.kills += totalKills;
                G.gold += totalGold;
                G.goldEarned += totalGold;
                if (totalKills > 0) log(`Offline: +${totalKills} kills, +${totalGold} gold from farms.`, '#8AF');
            }
        }

        return true;
    } catch(e) { console.error('Load failed', e); return false; }
}

// ===== UI =====
function el(id) { return document.getElementById(id); }
function setHTML(id, html) { const e = el(id); if (e) e.innerHTML = html; }

function showTab(tabId) {
    document.querySelectorAll('.tabContainer').forEach(e => e.style.display = 'none');
    document.querySelectorAll('#gameTabMenu li').forEach(e => e.className = '');

    const tab = el(tabId + 'TabContent');
    if (tab) tab.style.display = '';
    const li = el('tab_' + tabId);
    if (li) li.className = 'selectedTab';

    G.activeTab = tabId;
    if (tabId === 'monsters') updateMonsterUpgradesUI();
    if (tabId === 'dungeons') updateDungeonsUI();
    if (tabId === 'achievements') updateAchievementsUI();
    if (tabId === 'stats') updateStatsUI();
}

function updateUI() {
    setHTML('goldAmountCell', Math.floor(G.gold).toLocaleString());
    setHTML('killsCountCell', G.kills.toLocaleString());
    setHTML('expCell', G.adventurePoints.toLocaleString());
    updatePartyBars();
    updateCombatLog();
    updateEncounterPanel();
}

function updatePartyBars() {
    for (let i = 0; i < 5; i++) {
        const h = G.party[i];
        const panel = el('gameTabAdventurerInfo' + i);
        if (!panel) continue;
        if (!h) { panel.innerHTML = ''; continue; }

        const hpPct = Math.round((h.hp / h.maxHP) * 100);
        const spPct = Math.round((h.sp / h.maxSP) * 100);
        const hpColor = hpPct > 50 ? '#4c4' : hpPct > 25 ? '#fa0' : '#f44';
        const xpPct = Math.round((h.xp / h.xpNeeded) * 100);

        let tag = '';
        if (h.stunTicks > 0) tag = `<span class="heroTag stunTag">STUN</span>`;
        else if (h.stealthed) tag = `<span class="heroTag stealthTag">STEALTH</span>`;
        else if (h.rageActive) tag = `<span class="heroTag rageTag">RAGE</span>`;

        panel.innerHTML = `
            <div class="heroRow">
                <span class="heroName">${h.name}</span>
                <span class="heroClass">${h.className} Lv.${h.level}</span>
                ${tag}
            </div>
            <div class="statBars">
                <div class="barWrap"><div class="barFill" style="width:${hpPct}%;background:${hpColor}"></div><span class="barLabel">${h.hp}/${h.maxHP} HP</span></div>
                <div class="barWrap"><div class="barFill" style="width:${spPct}%;background:#44a"></div><span class="barLabel">${h.sp}/${h.maxSP} SP</span></div>
                <div class="barWrap"><div class="barFill" style="width:${xpPct}%;background:#664"></div><span class="barLabel">XP ${xpPct}%</span></div>
            </div>`;
    }
}

function updateCombatLog() {
    const el2 = el('combatLog');
    if (!el2) return;
    el2.innerHTML = G.combatLog.slice(0, 40)
        .map(e => `<div style="color:${e.color}">${e.msg}</div>`)
        .join('');
}

function updateEncounterPanel() {
    const panel = el('encounterNotificationPanel');
    if (!panel) return;
    const dung = G.dungeons[G.currentDungeonIdx];

    if (G.traveling) {
        panel.style.display = '';
        panel.innerHTML = `<div class="encounterNotificationDiv">Traveling to ${G.dungeons[G.nextDungeonIdx]?.name || '...'}...</div>`;
    } else if (G.inCombat && dung) {
        panel.style.display = '';
        const isBoss = G.monsters.some(m => m.isBoss);
        const cls = isBoss ? 'bossEncounterNotificationDiv' : 'encounterNotificationDiv';
        const summary = G.monsters.filter(m => m.hp > 0)
            .map(m => `${m.name} (${m.hp}/${m.maxHP})`)
            .join(' · ');
        panel.innerHTML = `<div class="${cls}">${dung.name} – Room ${G.currentRoom + 1}/${dung.rooms} › ${summary}</div>`;
    } else if (dung) {
        panel.style.display = '';
        panel.innerHTML = `<div class="encounterNotificationDiv">${dung.name} — Cleared</div>`;
    } else {
        panel.style.display = 'none';
    }
}

function updateMonsterUpgradesUI() {
    const container = el('monsterUpgradeButtonsContainer');
    if (!container) return;
    container.innerHTML = '';

    for (const def of UPGRADE_DEFS) {
        const cost = upgradeCost(def);
        const lv = upgradeLevel(def.id);
        const canAfford = G.gold >= cost;
        const btn = document.createElement('div');
        btn.className = canAfford ? 'upgradeButton' : 'disabledUpgradeButton';
        btn.style.marginBottom = '3px';
        btn.textContent = `${def.name} (Lv.${lv}) — ${cost.toLocaleString()} g`;
        if (canAfford) btn.onclick = () => buyUpgrade(def.id);
        container.appendChild(btn);
    }

    setHTML('goldDropChance',  (G.upgrades.goldChance * 100).toFixed(2) + '%');
    setHTML('maxGoldPerDrop',  G.upgrades.maxGold + ' g');
    setHTML('minGoldPerDrop',  G.upgrades.minGold + ' g');
    setHTML('itemDropChance',  (G.upgrades.itemChance * 100).toFixed(2) + '%');
    setHTML('killCountPanel',  G.kills.toLocaleString());
}

function updateDungeonsUI() {
    const container = el('dungeonListContainer');
    if (!container) return;
    container.innerHTML = '';

    for (const d of G.dungeons) {
        const div = document.createElement('div');
        div.className = 'dungeonEntry';

        const clearBadge = d.cleared
            ? `<span style="color:#4c4">✓ Cleared</span>`
            : `<span style="color:#888">Not Cleared</span>`;

        let castlePart = '';
        if (d.castlePurchased) {
            castlePart = `<span style="color:#fa0">🏰 Castle Owned</span>`;
        } else if (d.cleared) {
            const canAfford = G.gold >= d.castleCost;
            castlePart = `<span class="${canAfford ? 'upgradeButton' : 'disabledUpgradeButton'}" 
                style="cursor:${canAfford ? 'pointer' : 'default'}"
                onclick="buyCastle(${d.id})">Buy Castle (${d.castleCost.toLocaleString()} g)</span>`;
        }

        let farmPart = '';
        if (d.farmActive) {
            farmPart = `<span style="color:#4fa">Farm Active (+${d.farmKillRate} kills/tick)</span>`;
        } else if (d.castlePurchased) {
            farmPart = `<span class="upgradeButton" style="cursor:pointer" onclick="activateFarm(${d.id})">Start Farm</span>`;
        }

        div.innerHTML = `
            <span style="color:#aaa;min-width:22px;display:inline-block">${d.id + 1}.</span>
            <b>${d.name}</b> <span style="color:#888">(Lv.${d.level}, ${d.rooms} rooms)</span>
            &nbsp;${clearBadge}
            &nbsp;${castlePart}
            &nbsp;${farmPart}
        `;
        container.appendChild(div);
    }
}

function updateAchievementsUI() {
    const container = el('achievementsContainer');
    if (!container) return;
    container.innerHTML = '';

    let unlockedCount = 0;
    for (const def of ACHIEVEMENT_DEFS) {
        const unlocked = !!G.achievements[def.id];
        if (unlocked) unlockedCount++;
        const div = document.createElement('div');
        div.className = 'achievementEntry' + (unlocked ? ' achievementUnlocked' : '');
        div.innerHTML = `
            <span style="color:${unlocked ? '#fa0' : '#888'}">${unlocked ? '★' : '☆'}</span>
            <b>${def.name}</b>
            <span style="color:#aaa;font-size:11px;margin-left:5px">+${def.reward} AP</span>
        `;
        container.appendChild(div);
    }

    const header = document.createElement('div');
    header.style.cssText = 'padding:5px;color:#aaa;border-bottom:1px solid #2b2b32;margin-bottom:5px;';
    header.textContent = `Unlocked: ${unlockedCount} / ${ACHIEVEMENT_DEFS.length}`;
    container.insertBefore(header, container.firstChild);
}

function updateStatsUI() {
    const container = el('statsContainer');
    if (!container) return;

    const row = (label, val) => `<tr><td>${label}</td><td style="text-align:right">${typeof val === 'number' ? val.toLocaleString() : val}</td></tr>`;
    let html = `<table class="statsTable">
        ${row('Total Kills', G.kills)}
        ${row('Gold Earned', G.goldEarned)}
        ${row('Dungeons Cleared', G.dungeonsCleared)}
        ${row('Castles Conquered', G.castlesConquered)}
        ${row('Adventure Points', G.adventurePoints)}
        ${row('Melee Attacks', G.stats.meleeAttacks)}
        ${row('Ranged Attacks', G.stats.rangedAttacks)}
        ${row('Spells Cast', G.stats.spellsCast)}
        ${row('Critical Hits', G.stats.criticalHits)}
        ${row('Times Stunned', G.stats.timesStunned)}
        ${row('Minions Summoned', G.minionsSummoned)}
    </table>`;

    if (G.party.length) {
        html += '<br><div class="sectionTitle">Hero Stats</div>';
        for (const h of G.party) {
            html += `
            <div class="heroStatBlock">
                <b>${h.name}</b> the ${h.className} — Level ${h.level}
                <table class="statsTable">
                    ${row('Max HP', h.maxHP)} ${row('Max SP', h.maxSP)}
                    ${row('Attack', h.atk)} ${row('Defense', h.def)}
                    ${row('Damage', h.dmg)} ${row('Armor', h.armor)}
                    ${row('Crit Chance', (h.crit * 100).toFixed(0) + '%')}
                    ${row('Kills', h.kills)} ${row('Damage Dealt', h.totalDmg)}
                    ${h.healing ? row('Healing Done', h.healing) : ''}
                </table>
            </div>`;
        }
    }

    container.innerHTML = html;
}

// ===== PARTY CREATION =====
function buildPartyCreation() {
    const container = el('partyCreationTabContent');
    container.innerHTML = '';

    const intro = document.createElement('div');
    intro.className = 'partyCreationIntroductionPanel';
    intro.innerHTML = `
        <div class="sectionTitle" style="font-size:14px">The land of Infinitum needs you!</div>
        <p style="font-size:13px;margin:5px 0">All dungeons have been overrun with cruel monsters that just plain need killing.
        Select your brave champions and murder every last one of them.</p>`;
    container.appendChild(intro);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;top:112px;left:0;right:0;bottom:60px;display:flex;gap:4px;padding:3px;';

    const leftPanel = document.createElement('div');
    leftPanel.style.cssText = 'flex:1;overflow-y:auto;border:1px solid #2b2b32;';

    const rightPanel = document.createElement('div');
    rightPanel.id = 'selectedPartyPanel';
    rightPanel.style.cssText = 'flex:1;overflow-y:auto;border:1px solid #2b2b32;';

    const startBtn = document.createElement('div');
    startBtn.id = 'partyStartBtn';
    startBtn.className = 'disabledUpgradeButton';
    startBtn.style.cssText = 'position:absolute;bottom:3px;left:3px;right:3px;padding:12px;text-align:center;font-size:14px;';
    startBtn.textContent = 'Select Your Party to Begin';

    const selected = [];

    function refresh() {
        const rp = el('selectedPartyPanel');
        rp.innerHTML = `<div style="font-weight:bold;padding:6px;border-bottom:1px solid #2b2b32">Selected Party (${selected.length}/4)</div>`;

        selected.forEach((s, i) => {
            const cls = CLASSES.find(c => c.id === s.classId);
            const row = document.createElement('div');
            row.style.cssText = 'border:1px solid #3a5;margin:4px;padding:6px;position:relative;';
            row.innerHTML = `
                <b>${cls.name}</b><br>
                <input type="text" placeholder="Name your hero..." value="${s.name}"
                    style="background:#111;color:#fff;border:1px solid #3AA5E6;padding:2px;margin-top:4px;width:160px;"
                    id="nameInput_${i}">
                <div style="position:absolute;top:4px;right:4px;cursor:pointer;border:1px solid #3AA5E6;padding:2px 5px;background:#0b0b12;"
                    id="removeBtn_${i}">X</div>`;
            rp.appendChild(row);

            // Bind events after append
            const inp = el(`nameInput_${i}`);
            inp.oninput = () => {
                selected[i].name = inp.value.trim();
                const valid = selected.length > 0 && selected.every(s => s.name.length > 0);
                const btn = el('partyStartBtn');
                if (btn) {
                    btn.className = valid ? 'upgradeButton' : 'disabledUpgradeButton';
                    btn.style.cursor = valid ? 'pointer' : 'default';
                    btn.textContent = valid ? 'Begin the Adventure!' : 'Name all heroes to continue';
                }
            };
            el(`removeBtn_${i}`).onclick = () => { selected.splice(i, 1); refresh(); };
        });

        const valid = selected.length > 0 && selected.every(s => s.name.length > 0);
        const btn = el('partyStartBtn');
        if (btn) {
            btn.className = valid ? 'upgradeButton' : 'disabledUpgradeButton';
            btn.style.cursor = valid ? 'pointer' : 'default';
            btn.textContent = valid ? 'Begin the Adventure!' : 'Name all heroes to continue';
        }
    }

    // Build class selection
    leftPanel.innerHTML = `<div style="font-weight:bold;padding:6px;border-bottom:1px solid #2b2b32">Choose Classes</div>`;
    for (const cls of CLASSES) {
        const row = document.createElement('div');
        row.className = 'characterSelectionButton';
        row.style.cssText = 'margin:4px;padding:6px;cursor:pointer;';
        row.innerHTML = `
            <div><b>${cls.name}</b> <span style="color:#8cf;font-size:10px">${cls.isRanged ? '🏹 Ranged' : '⚔️ Melee'}</span></div>
            <div style="color:#aaa;font-size:11px;margin-top:2px">${cls.desc}</div>
            <div style="color:#888;font-size:10px;margin-top:3px">HP:${cls.baseHP} SP:${cls.baseSP} DMG:${cls.baseDmg} ARM:${cls.baseArmor} CRIT:${Math.round(cls.baseCrit*100)}%</div>`;
        row.onclick = () => {
            if (selected.length >= 4) return;
            selected.push({ classId: cls.id, name: cls.name });
            refresh();
        };
        leftPanel.appendChild(row);
    }

    startBtn.onclick = () => {
        const valid = selected.filter(s => s.name.trim().length > 0);
        if (!valid.length) return;
        for (const s of valid) {
            const h = createHero(s.classId, s.name.trim());
            if (h) G.party.push(h);
        }
        launchGame();
    };

    wrap.appendChild(leftPanel);
    wrap.appendChild(rightPanel);
    container.appendChild(wrap);
    container.appendChild(startBtn);
    refresh();
}

// ===== GAME START =====
function launchGame() {
    G.started = true;
    G.dungeons = buildDungeons();
    loadSave();

    el('partyCreationTabContent').style.display = 'none';
    el('gameTabContent').style.display = '';

    buildGameTabs();
    showTab('game');
    nextDungeon();
    startLoop();
    log('Your adventure begins!', '#FA0');
}

function buildGameTabs() {
    const menu = el('gameTabMenu');
    menu.innerHTML = '';
    const ul = document.createElement('ul');
    const tabs = [
        ['game', 'Game'], ['monsters', 'Monsters'],
        ['dungeons', 'Dungeons'], ['achievements', 'Achievements'],
        ['stats', 'Stats'], ['info', 'Info'],
    ];
    for (const [id, label] of tabs) {
        const li = document.createElement('li');
        li.id = 'tab_' + id;
        const a = document.createElement('a');
        a.textContent = label;
        a.href = '#';
        a.onclick = (e) => { e.preventDefault(); showTab(id); };
        li.appendChild(a);
        ul.appendChild(li);
    }
    menu.appendChild(ul);
}

// ===== GAME LOOP =====
let loopId = null;

function startLoop() {
    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, CFG.TICK_MS);
}

function tick() {
    if (G.paused) return;
    G.tick++;

    if (G.traveling) {
        G.travelTicks--;
        if (G.travelTicks <= 0) enterDungeon(G.nextDungeonIdx);
    } else if (G.roomDelay > 0) {
        G.roomDelay--;
        if (G.roomDelay === 0) enterRoom();
    } else {
        combatTick();
    }

    if (G.tick % CFG.REGEN_TICKS === 0) regenTick();
    if (G.tick % 4 === 0) farmTick();
    if (G.tick % CFG.UI_UPDATE_INTERVAL === 0) updateUI();
    if (G.tick % 20 === 0) checkAllAchievements();
    if (G.tick % CFG.SAVE_INTERVAL === 0) saveGame();
}

// ===== ENTRY POINT =====
window.Game = {
    onLoad() {
        el('pauseButton').onclick = () => {
            G.paused = !G.paused;
            el('pauseButton').textContent = G.paused ? 'Resume' : 'Pause';
        };

        // Pre-build tab containers in HTML that need dynamic content
        const dungeonsTab = el('dungeonsTabContent');
        if (dungeonsTab && !el('dungeonListContainer')) {
            dungeonsTab.innerHTML = `
                <div style="position:absolute;inset:0;overflow-y:auto;padding:5px;">
                    <div class="sectionTitle" style="padding:5px;margin-bottom:5px">Dungeons & Castles</div>
                    <div id="dungeonListContainer"></div>
                </div>`;
        }

        const achieveTab = el('achievementsTabContent');
        if (achieveTab && !el('achievementsContainer')) {
            achieveTab.innerHTML = `
                <div style="position:absolute;inset:0;overflow-y:auto;padding:5px;">
                    <div id="achievementsContainer"></div>
                </div>`;
        }

        const statsTab = el('statsTabContent');
        if (statsTab && !el('statsContainer')) {
            statsTab.innerHTML = `
                <div style="position:absolute;inset:0;overflow-y:auto;padding:5px;">
                    <div id="statsContainer"></div>
                </div>`;
        }

        // Build combat log in game tab
        const gameTab = el('gameTabContent');
        if (gameTab && !el('combatLog')) {
            const logDiv = document.createElement('div');
            logDiv.style.cssText = 'position:absolute;top:3px;left:3px;width:730px;height:400px;border:1px solid #2b2b32;overflow-y:auto;padding:4px;font-size:11px;';
            logDiv.id = 'combatLog';
            gameTab.appendChild(logDiv);
        }

        buildPartyCreation();
    }
};
