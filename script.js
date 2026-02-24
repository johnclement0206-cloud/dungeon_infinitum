'use strict';

// ============================================================
// DUNGEON INFINITUM
// An idle RPG inspired by Clickpocalypse 2
// ============================================================

const CFG = {
    TICK_MS: 250,
    REGEN_TICKS: 3,
    HP_REGEN_RATE: 0.008,
    SP_REGEN_RATE: 0.015,
    STUN_TICKS: 20,
    SAVE_INTERVAL: 60,
    UI_UPDATE_INTERVAL: 2,
    TRAVEL_TICKS: 32,
    ROOM_CLEAR_DELAY: 6,
    LOG_MAX: 60,
};

// ===== ITEM SYSTEM =====
const ITEM_SLOTS = ['weapon','helm','armor','boots','trinket'];

const ITEM_BASE_NAMES = {
    weapon:  ['Sword','Axe','Blade','Staff','Bow','Dagger','Mace','Spear'],
    helm:    ['Helm','Hood','Crown','Circlet','Cap','Coif'],
    armor:   ['Chestplate','Robe','Jerkin','Hauberk','Cuirass','Vest'],
    boots:   ['Boots','Greaves','Sabatons','Treads','Sandals'],
    trinket: ['Ring','Amulet','Pendant','Orb','Talisman','Charm'],
};

const ITEM_PREFIXES = ['Iron','Steel','Dread','Shadow','Storm','Frost','Blazing','Ancient','Void','Cursed'];

const RARITY_NAMES  = ['Common','Uncommon','Rare','Epic'];
const RARITY_COLORS = ['#aaa','#4f8','#88f','#f84'];

// Stat affinity per slot
const SLOT_STATS = {
    weapon:  ['atk','dmg','crit'],
    helm:    ['maxHP','def','maxSP'],
    armor:   ['maxHP','armor','def'],
    boots:   ['speed','def','atk'],
    trinket: ['dmg','crit','maxSP'],
};

function generateItem(dungLevel) {
    const roll = randF() * 100;
    const rarity = roll < 3 ? 3 : roll < 12 ? 2 : roll < 35 ? 1 : 0;

    const slot   = ITEM_SLOTS[randInt(0, ITEM_SLOTS.length - 1)];
    const base   = ITEM_BASE_NAMES[slot][randInt(0, ITEM_BASE_NAMES[slot].length - 1)];
    const name   = rarity > 0 ? ITEM_PREFIXES[randInt(0, ITEM_PREFIXES.length - 1)] + ' ' + base : base;

    const power   = Math.max(1, dungLevel) * (1 + rarity * 0.5);
    const numStats = 1 + rarity;  // common=1, uncommon=2, rare=3, epic=4
    const pool    = [...SLOT_STATS[slot]].sort(() => Math.random() - 0.5).slice(0, numStats);

    const stats = {};
    for (const s of pool) {
        if (s === 'crit')  { stats.crit  = parseFloat((0.01 + rarity * 0.01 + randF() * 0.01).toFixed(3)); }
        else if (s === 'speed') { stats.speed = -(1 + Math.floor(rarity * 0.6)); }  // negative = faster attacks
        else if (s === 'maxHP') { stats.maxHP = Math.max(5,  Math.floor(power * 6  * (0.8 + randF() * 0.4))); }
        else if (s === 'maxSP') { stats.maxSP = Math.max(3,  Math.floor(power * 4  * (0.8 + randF() * 0.4))); }
        else if (s === 'armor') { stats.armor = Math.max(1,  Math.floor(power * 0.5 * (0.8 + randF() * 0.4))); }
        else                    { stats[s]    = Math.max(1,  Math.floor(power * 0.8 * (0.8 + randF() * 0.4))); }
    }

    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name, slot, rarity, level: dungLevel, stats,
    };
}

function applyItemToHero(hero, item, remove = false) {
    const sign = remove ? -1 : 1;
    for (const [s, v] of Object.entries(item.stats)) {
        if (s === 'maxHP') {
            hero.maxHP += sign * v;
            hero.hp = remove ? Math.min(hero.hp, hero.maxHP) : Math.min(hero.hp + v, hero.maxHP);
        } else if (s === 'maxSP') {
            hero.maxSP += sign * v;
            hero.sp = remove ? Math.min(hero.sp, hero.maxSP) : Math.min(hero.sp + v, hero.maxSP);
        } else {
            hero[s] = (hero[s] || 0) + sign * v;
        }
    }
}

window.equipItem = function(heroIdx, itemId) {
    const hero = G.party[heroIdx];
    const item = G.inventory.find(i => i.id === itemId);
    if (!hero || !item) return;

    const old = hero.equipment[item.slot];
    if (old) {
        applyItemToHero(hero, old, true);
        G.inventory.push(old);
    }

    G.inventory.splice(G.inventory.findIndex(i => i.id === itemId), 1);
    hero.equipment[item.slot] = item;
    applyItemToHero(hero, item, false);
    log(`${hero.name} equips [${item.name}]!`, RARITY_COLORS[item.rarity]);
    _itemsDirty = true;
    if (G.activeTab === 'skills') G.skillTreeDirty = true;
};

function autoEquipIfBetter(item) {
    // Find hero that benefits most: either has no item in slot, or our item beats theirs
    let bestHero = -1, bestGain = 0;
    for (let i = 0; i < G.party.length; i++) {
        const hero = G.party[i];
        const old  = hero.equipment[item.slot];
        // Simple score: sum of stats
        const newScore = Object.values(item.stats).reduce((a, b) => a + Math.abs(b), 0);
        const oldScore = old ? Object.values(old.stats).reduce((a, b) => a + Math.abs(b), 0) : 0;
        const gain = newScore - oldScore;
        if (!old || gain > bestGain) { bestHero = i; bestGain = gain; }
    }
    if (bestHero >= 0 && bestGain >= 0) {
        equipItem(bestHero, item.id);
    }
}

function hero_dropItem() {
    if (randF() >= G.upgrades.itemChance + G.researchBonus.itemAdd) return;
    const dung = G.dungeons[G.currentDungeonIdx];
    if (!dung) return;
    const item = generateItem(dung.level);
    G.itemsFound = (G.itemsFound || 0) + 1;
    G.inventory.push(item);
    log(`Found ${RARITY_NAMES[item.rarity]}: ${item.name}!`, RARITY_COLORS[item.rarity]);
    // Trim inventory to 20 items — drop worst
    if (G.inventory.length > 20) G.inventory.shift();
    autoEquipIfBetter(item);
    _itemsDirty = true;
    if (G.activeTab === 'skills') G.skillTreeDirty = true;
}

// ===== SKILL TREES =====
// Each tree has 17 nodes: root → 3 branches → 2 tier2 per branch → notable tier3 → 2 keystones → 1 grand keystone
// Effects: { stat: string, val: number }  stats: maxHP maxSP dmg armor atk def crit
// notable/keystone/grand affect visual size only; all nodes cost 1 skill point

// ===== GLOBAL MASTERY TREE =====
// Costs Adventure Points. Buffs apply to ALL current heroes.
// Grand Keystone "The Fifth" unlocks the 5th party slot.
// SVG canvas: 265×395 — left/centre/right branches, same topology as hero trees.
const GLOBAL_TREE = [
    { id:'root', name:'Shared Resolve',      desc:'A bond forged in fire. All heroes draw strength from each other.',
      x:130,y:40,  req:[],           cost:0,   notable:0, effects:[{s:'maxHP',v:10},{s:'maxSP',v:8}] },
    // Left — Attack Speed
    { id:'l1',   name:'Battle Cadence',      desc:'The party finds a rhythm, attacking with greater coordination.',
      x:60, y:100, req:['root'],     cost:15,  notable:0, effects:[{s:'atk',v:2}] },
    { id:'l2a',  name:'Momentum',            desc:'Each kill feeds into the next attack faster.',
      x:25, y:160, req:['l1'],       cost:15,  notable:0, effects:[{s:'atk',v:2},{s:'def',v:1}] },
    { id:'l2b',  name:'Quickened Reflexes',  desc:'The party\'s attack timing tightens considerably.',
      x:95, y:160, req:['l1'],       cost:15,  notable:0, effects:[{s:'speed',v:-1}] },
    { id:'l3a',  name:'Relentless',          desc:'The party pushes through pain to attack more frequently.',
      x:25, y:222, req:['l2a'],      cost:30,  notable:1, effects:[{s:'atk',v:4}] },
    { id:'l3b',  name:'Blur',                desc:'Movement so swift that enemies lose track of the party.',
      x:95, y:222, req:['l2b'],      cost:30,  notable:1, effects:[{s:'speed',v:-1},{s:'atk',v:2}] },
    { id:'lks',  name:'Temporal Mastery',    desc:'The party operates at a speed that defies natural limits.',
      x:60, y:288, req:['l3a','l3b'],cost:60,  notable:2, effects:[{s:'speed',v:-2},{s:'atk',v:5},{s:'crit',v:0.04}] },
    // Centre — Regen & Spirit
    { id:'c1',   name:'Natural Recovery',    desc:'The party heals from wounds more readily between strikes.',
      x:130,y:100, req:['root'],     cost:15,  notable:0, effects:[{s:'maxHP',v:15}] },
    { id:'c2',   name:'Arcane Wellspring',   desc:'Spirit replenishes faster, enabling more frequent abilities.',
      x:130,y:168, req:['c1'],       cost:15,  notable:0, effects:[{s:'maxSP',v:20}] },
    { id:'c3',   name:'Undying',             desc:'The party refuses to stay down. Bodies mend at an alarming rate.',
      x:130,y:238, req:['c2'],       cost:30,  notable:1, effects:[{s:'maxHP',v:30},{s:'maxSP',v:20}] },
    // Right — Power
    { id:'r1',   name:'Empowered',           desc:'Fighting together amplifies each hero\'s damage output.',
      x:200,y:100, req:['root'],     cost:15,  notable:0, effects:[{s:'dmg',v:3}] },
    { id:'r2a',  name:'Force of Nature',     desc:'Strikes land with weight beyond what muscle alone provides.',
      x:165,y:160, req:['r1'],       cost:15,  notable:0, effects:[{s:'dmg',v:4}] },
    { id:'r2b',  name:'Fortified',           desc:'Collective discipline manifests as physical resilience.',
      x:235,y:160, req:['r1'],       cost:15,  notable:0, effects:[{s:'armor',v:2},{s:'def',v:2}] },
    { id:'r3a',  name:'Unleashed',           desc:'The limiters come off. Every strike is a statement.',
      x:165,y:222, req:['r2a'],      cost:30,  notable:1, effects:[{s:'dmg',v:6},{s:'crit',v:0.03}] },
    { id:'r3b',  name:'Bastion',             desc:'The party becomes a moving fortress.',
      x:235,y:222, req:['r2b'],      cost:30,  notable:1, effects:[{s:'armor',v:4},{s:'maxHP',v:20}] },
    { id:'rks',  name:'Overwhelming Power',  desc:'The combined might of the party becomes a force of nature.',
      x:200,y:288, req:['r3a','r3b'],cost:60,  notable:2, effects:[{s:'dmg',v:10},{s:'armor',v:3},{s:'crit',v:0.05}] },
    // Grand Keystone
    { id:'gk',   name:'The Fifth',           desc:'There is always room for one more. A new hero may join the party.',
      x:130,y:355, req:['lks','c3','rks'], cost:150, notable:3, effects:[] },
];

const SKILL_TREES = {

    fighter: [
        { id:'root', name:'Soldier\'s Creed',      desc:'The foundation of a warrior\'s strength.',          x:290,y:35,  req:[],                effects:[{s:'armor',v:1},{s:'def',v:1}],               notable:0 },
        // Left branch — Shield & Defense
        { id:'l1',   name:'Shield Training',        desc:'Hours spent drilling with a shield.',                x:140,y:100, req:['root'],           effects:[{s:'armor',v:1},{s:'maxHP',v:8}],             notable:0 },
        { id:'l2a',  name:'Iron Guard',             desc:'Your shield arm is now a wall of iron.',            x:70, y:170, req:['l1'],             effects:[{s:'armor',v:2}],                             notable:0 },
        { id:'l2b',  name:'Shield Bash',            desc:'Use your shield offensively.',                      x:210,y:170, req:['l1'],             effects:[{s:'atk',v:2},{s:'def',v:1}],                 notable:0 },
        { id:'l3a',  name:'Bulwark',                desc:'You become an immovable fortification.',            x:70, y:240, req:['l2a'],            effects:[{s:'armor',v:4},{s:'maxHP',v:15}],            notable:1 },
        { id:'l3b',  name:'Counter Strike',         desc:'Every block creates an opening for a riposte.',     x:210,y:240, req:['l2b'],            effects:[{s:'atk',v:3},{s:'dmg',v:3}],                notable:1 },
        { id:'lks',  name:'Iron Fortress',          desc:'Your defence becomes impenetrable.',                x:140,y:315, req:['l3a','l3b'],       effects:[{s:'armor',v:7},{s:'maxHP',v:40},{s:'def',v:3}],notable:2},
        // Center branch — Discipline
        { id:'c1',   name:'Combat Training',        desc:'Rigorous drills sharpen every instinct.',           x:290,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'def',v:2}],                 notable:0 },
        { id:'c2',   name:'War Veteran',            desc:'Scars teach lessons no trainer can.',               x:290,y:180, req:['c1'],             effects:[{s:'maxHP',v:15},{s:'atk',v:1}],              notable:0 },
        { id:'c3',   name:'Indomitable Will',       desc:'Pain is just a reminder you\'re still alive.',     x:290,y:255, req:['c2'],             effects:[{s:'maxHP',v:28},{s:'armor',v:2},{s:'def',v:2}],notable:1},
        // Right branch — Offensive Power
        { id:'r1',   name:'Blade Work',             desc:'Fluid swordsmanship from years of practice.',       x:440,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'r2a',  name:'Power Strike',           desc:'Every swing carries the weight of your fury.',      x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:4}],                               notable:0 },
        { id:'r2b',  name:'Battle Fury',            desc:'Adrenaline sharpens your strikes in the heat of battle.',x:510,y:170,req:['r1'],        effects:[{s:'dmg',v:2},{s:'atk',v:2}],                 notable:0 },
        { id:'r3a',  name:'Savage Blow',            desc:'A strike that leaves even armoured foes reeling.', x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:6},{s:'crit',v:0.03}],             notable:1 },
        { id:'r3b',  name:'Berserker\'s Edge',      desc:'Fury unlocks hidden reservoirs of power.',          x:510,y:240, req:['r2b'],            effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'rks',  name:'Warlord\'s Might',       desc:'The battlefield bends to your will.',               x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:12},{s:'atk',v:6},{s:'crit',v:0.04}],notable:2},
        // Grand Keystone
        { id:'gk',   name:'Champion Eternal',       desc:'You transcend mortal limits. A legend made flesh.', x:290,y:385, req:['lks','c3','rks'],  effects:[{s:'maxHP',v:70},{s:'armor',v:8},{s:'dmg',v:12},{s:'atk',v:5}],notable:3},
    ],

    ranger: [
        { id:'root', name:'Hawk\'s Eye',            desc:'You see what others miss.',                         x:290,y:35,  req:[],                effects:[{s:'atk',v:3}],                               notable:0 },
        // Left — Precision
        { id:'l1',   name:'Eagle Sight',            desc:'Your aim becomes supernaturally accurate.',         x:140,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'crit',v:0.02}],             notable:0 },
        { id:'l2a',  name:'Steady Aim',             desc:'You hold your breath at the crucial moment.',       x:70, y:170, req:['l1'],             effects:[{s:'crit',v:0.03}],                           notable:0 },
        { id:'l2b',  name:'Pinpoint Strike',        desc:'Every arrow finds a gap in the armour.',            x:210,y:170, req:['l1'],             effects:[{s:'atk',v:3},{s:'dmg',v:1}],                 notable:0 },
        { id:'l3a',  name:'Dead Eye',               desc:'Crits come with terrifying frequency.',             x:70, y:240, req:['l2a'],            effects:[{s:'crit',v:0.06},{s:'atk',v:3}],            notable:1 },
        { id:'l3b',  name:'Lethal Precision',       desc:'Your arrows find the exact weak point, always.',    x:210,y:240, req:['l2b'],            effects:[{s:'atk',v:6},{s:'dmg',v:2}],                notable:1 },
        { id:'lks',  name:'One With The Arrow',     desc:'The arrow is merely an extension of your will.',   x:140,y:315, req:['l3a','l3b'],       effects:[{s:'crit',v:0.10},{s:'atk',v:8}],             notable:2 },
        // Center — Agility
        { id:'c1',   name:'Light Step',             desc:'You move as silently as falling snow.',             x:290,y:100, req:['root'],           effects:[{s:'def',v:2},{s:'maxHP',v:5}],               notable:0 },
        { id:'c2',   name:'Wind Runner',            desc:'The wind carries you past incoming blows.',         x:290,y:180, req:['c1'],             effects:[{s:'def',v:3},{s:'maxHP',v:10}],              notable:0 },
        { id:'c3',   name:'Ghost Walk',             desc:'You become difficult to pin down entirely.',        x:290,y:255, req:['c2'],             effects:[{s:'def',v:5},{s:'maxHP',v:20},{s:'armor',v:1}],notable:1},
        // Right — Multi-target
        { id:'r1',   name:'Quick Nock',             desc:'Your draw speed improves dramatically.',            x:440,y:100, req:['root'],           effects:[{s:'dmg',v:2}],                               notable:0 },
        { id:'r2a',  name:'Arrow Barrage',          desc:'Release a rapid burst of arrows.',                  x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'r2b',  name:'Volley Shot',            desc:'You coordinate arrows across multiple targets.',    x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:2},{s:'atk',v:2}],                 notable:0 },
        { id:'r3a',  name:'Storm of Arrows',        desc:'The sky darkens with your projectiles.',            x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:7},{s:'crit',v:0.02}],            notable:1 },
        { id:'r3b',  name:'Hail of Steel',          desc:'Endless volleys keep enemies perpetually suppressed.',x:510,y:240,req:['r2b'],          effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'rks',  name:'Arrow Storm',            desc:'Your volleys become a force of nature.',            x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:13},{s:'atk',v:5},{s:'crit',v:0.04}],notable:2},
        { id:'gk',   name:'The Unseen Death',       desc:'Enemies fall before they know you\'re there.',      x:290,y:385, req:['lks','c3','rks'],  effects:[{s:'crit',v:0.12},{s:'dmg',v:14},{s:'atk',v:8},{s:'maxHP',v:20}],notable:3},
    ],

    rogue: [
        { id:'root', name:'Dark Arts',              desc:'You embrace the shadows as your home.',             x:290,y:35,  req:[],                effects:[{s:'crit',v:0.03}],                           notable:0 },
        // Left — Poison
        { id:'l1',   name:'Toxic Blade',            desc:'Your blades are always coated in something vile.', x:140,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'crit',v:0.01}],             notable:0 },
        { id:'l2a',  name:'Venom',                  desc:'A more concentrated toxin with lasting effects.',   x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'l2b',  name:'Plague Carrier',         desc:'Your very presence spreads sickness.',              x:210,y:170, req:['l1'],             effects:[{s:'dmg',v:2},{s:'atk',v:2}],                 notable:0 },
        { id:'l3a',  name:'Lethal Poison',          desc:'A drop of this kills. More makes it faster.',       x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:6},{s:'crit',v:0.03}],            notable:1 },
        { id:'l3b',  name:'Death by a Thousand Cuts',desc:'Every small wound adds up to something fatal.',   x:210,y:240, req:['l2b'],            effects:[{s:'dmg',v:5},{s:'atk',v:3}],                notable:1 },
        { id:'lks',  name:'Plague Bearer',          desc:'A walking biological weapon.',                      x:140,y:315, req:['l3a','l3b'],       effects:[{s:'dmg',v:12},{s:'crit',v:0.06},{s:'atk',v:4}],notable:2},
        // Center — Shadow
        { id:'c1',   name:'Shadow Step',            desc:'You slip between darkness and light at will.',       x:290,y:100, req:['root'],           effects:[{s:'def',v:2},{s:'atk',v:1}],                 notable:0 },
        { id:'c2',   name:'Marked for Death',       desc:'Once you\'ve chosen your target, it\'s over.',      x:290,y:180, req:['c1'],             effects:[{s:'crit',v:0.04},{s:'dmg',v:2}],             notable:0 },
        { id:'c3',   name:'Assassination Protocol', desc:'You execute targets with ruthless efficiency.',      x:290,y:255, req:['c2'],             effects:[{s:'crit',v:0.06},{s:'dmg',v:4},{s:'atk',v:2}],notable:1},
        // Right — Speed & Blades
        { id:'r1',   name:'Blade Dance',            desc:'Your daggers move in an impossible flurry.',        x:440,y:100, req:['root'],           effects:[{s:'atk',v:3}],                               notable:0 },
        { id:'r2a',  name:'Flurry',                 desc:'Multiple strikes in the time it takes to blink.',   x:370,y:170, req:['r1'],             effects:[{s:'atk',v:3},{s:'dmg',v:1}],                 notable:0 },
        { id:'r2b',  name:'Shadow Strike',          desc:'You attack from impossible angles.',                x:510,y:170, req:['r1'],             effects:[{s:'crit',v:0.03},{s:'dmg',v:2}],             notable:0 },
        { id:'r3a',  name:'Storm of Steel',         desc:'A whirlwind of razor-sharp death.',                 x:370,y:240, req:['r2a'],            effects:[{s:'atk',v:5},{s:'dmg',v:4}],                notable:1 },
        { id:'r3b',  name:'Perfect Technique',      desc:'Every movement is precise, economical, lethal.',    x:510,y:240, req:['r2b'],            effects:[{s:'crit',v:0.06},{s:'atk',v:3},{s:'dmg',v:3}],notable:1},
        { id:'rks',  name:'One Shot, One Kill',     desc:'Why waste effort when one strike suffices?',        x:440,y:315, req:['r3a','r3b'],       effects:[{s:'crit',v:0.12},{s:'atk',v:7},{s:'dmg',v:8}],notable:2},
        { id:'gk',   name:'The Phantom',            desc:'You are not a rogue. You are a ghost with a grudge.',x:290,y:385,req:['lks','c3','rks'],  effects:[{s:'crit',v:0.15},{s:'dmg',v:15},{s:'atk',v:8},{s:'def',v:5}],notable:3},
    ],

    priest: [
        { id:'root', name:'Faith',                  desc:'Your belief grants you strength beyond the physical.',x:290,y:35, req:[],               effects:[{s:'maxSP',v:12}],                            notable:0 },
        // Left — Restoration
        { id:'l1',   name:'Mending',                desc:'Your healing touch grows more effective.',          x:140,y:100, req:['root'],           effects:[{s:'maxSP',v:10},{s:'dmg',v:1}],              notable:0 },
        { id:'l2a',  name:'Greater Heal',           desc:'Your healing spells become substantially more potent.',x:70,y:170, req:['l1'],          effects:[{s:'maxSP',v:12},{s:'maxHP',v:8}],            notable:0 },
        { id:'l2b',  name:'Swift Mending',          desc:'You channel healing faster than the eye can follow.',x:210,y:170, req:['l1'],           effects:[{s:'maxSP',v:8},{s:'atk',v:2}],               notable:0 },
        { id:'l3a',  name:'Divine Renewal',         desc:'A touch of your hand can reverse grievous wounds.', x:70, y:240, req:['l2a'],            effects:[{s:'maxSP',v:18},{s:'maxHP',v:15}],           notable:1 },
        { id:'l3b',  name:'Sanctuary',              desc:'You can call upon the divine to protect a party member.',x:210,y:240,req:['l2b'],        effects:[{s:'maxSP',v:12},{s:'def',v:3}],             notable:1 },
        { id:'lks',  name:'Miracle Worker',         desc:'Even death hesitates at your command.',             x:140,y:315, req:['l3a','l3b'],       effects:[{s:'maxSP',v:30},{s:'maxHP',v:30},{s:'dmg',v:3}],notable:2},
        // Center — Auras
        { id:'c1',   name:'Holy Presence',          desc:'Your divine aura bolsters all who stand beside you.',x:290,y:100, req:['root'],          effects:[{s:'def',v:2},{s:'maxHP',v:8}],               notable:0 },
        { id:'c2',   name:'Fortitude Aura',         desc:'Your aura grants supernatural endurance.',          x:290,y:180, req:['c1'],             effects:[{s:'maxHP',v:18},{s:'armor',v:1}],            notable:0 },
        { id:'c3',   name:'Blessed',                desc:'The party fights with divine favour.',              x:290,y:255, req:['c2'],             effects:[{s:'maxHP',v:25},{s:'def',v:3},{s:'armor',v:2}],notable:1},
        // Right — Holy Damage
        { id:'r1',   name:'Holy Fire',              desc:'Sacred flames burn away the unholy.',               x:440,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'r2a',  name:'Smite',                  desc:'The righteous fury of the gods flows through you.',  x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'r2b',  name:'Exorcism',               desc:'Demons recoil at the name of your deity.',          x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:2},{s:'atk',v:3}],                 notable:0 },
        { id:'r3a',  name:'Judgment',               desc:'No evil escapes divine judgment.',                   x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:6},{s:'crit',v:0.04}],            notable:1 },
        { id:'r3b',  name:'Holy Nova',              desc:'A shockwave of sacred energy radiates from your form.',x:510,y:240,req:['r2b'],          effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'rks',  name:'Wrath of the Divine',    desc:'You channel the fury of the heavens itself.',        x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:14},{s:'crit',v:0.06},{s:'atk',v:4}],notable:2},
        { id:'gk',   name:'Vessel of Light',        desc:'You are no longer merely a conduit. You are the light.',x:290,y:385,req:['lks','c3','rks'],effects:[{s:'maxSP',v:40},{s:'maxHP',v:40},{s:'dmg',v:12},{s:'crit',v:0.06}],notable:3},
    ],

    pyromancer: [
        { id:'root', name:'Inner Flame',            desc:'A fire burns within you, quite literally.',         x:290,y:35,  req:[],                effects:[{s:'dmg',v:2},{s:'maxSP',v:8}],               notable:0 },
        // Left — Combustion / DoT
        { id:'l1',   name:'Ignite',                 desc:'Your spells leave enemies smouldering.',            x:140,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'l2a',  name:'Burn',                   desc:'The fire spreads and deepens on contact.',          x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:4}],                               notable:0 },
        { id:'l2b',  name:'Melt Armour',            desc:'Sustained heat strips away protective layers.',     x:210,y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'atk',v:2}],                 notable:0 },
        { id:'l3a',  name:'Inferno',                desc:'A self-sustaining blaze that cannot be doused.',    x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:7},{s:'crit',v:0.02}],            notable:1 },
        { id:'l3b',  name:'Wildfire',               desc:'Your flames spread faster than thought.',           x:210,y:240, req:['l2b'],            effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'lks',  name:'Living Flame',           desc:'You and fire are now one entity.',                  x:140,y:315, req:['l3a','l3b'],       effects:[{s:'dmg',v:14},{s:'crit',v:0.06},{s:'maxSP',v:15}],notable:2},
        // Center — Efficiency
        { id:'c1',   name:'Focused Channel',        desc:'Less magical waste, more destructive output.',       x:290,y:100, req:['root'],           effects:[{s:'maxSP',v:10},{s:'dmg',v:1}],              notable:0 },
        { id:'c2',   name:'Mana Convergence',       desc:'You reclaim energy from every cast.',                x:290,y:180, req:['c1'],             effects:[{s:'maxSP',v:14},{s:'dmg',v:2}],              notable:0 },
        { id:'c3',   name:'Arcane Efficiency',      desc:'Spells cost less but hit harder.',                  x:290,y:255, req:['c2'],             effects:[{s:'maxSP',v:20},{s:'dmg',v:5},{s:'crit',v:0.02}],notable:1},
        // Right — Explosion
        { id:'r1',   name:'Blast Radius',           desc:'Your explosions engulf a wider area.',              x:440,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'r2a',  name:'Detonation',             desc:'Your fireballs explode with concussive force.',     x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:4},{s:'crit',v:0.02}],             notable:0 },
        { id:'r2b',  name:'Chain Combustion',       desc:'Fire spreads from target to target.',               x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:3},{s:'atk',v:2}],                 notable:0 },
        { id:'r3a',  name:'Pyroclasm',              desc:'A catastrophic firestorm that ignores all resistance.',x:370,y:240,req:['r2a'],           effects:[{s:'dmg',v:8},{s:'crit',v:0.04}],            notable:1 },
        { id:'r3b',  name:'Cascading Explosions',   desc:'Each detonation triggers another.',                 x:510,y:240, req:['r2b'],            effects:[{s:'dmg',v:6},{s:'atk',v:5}],                notable:1 },
        { id:'rks',  name:'Apocalypse Flame',       desc:'The sky itself catches fire.',                      x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:18},{s:'crit',v:0.06},{s:'atk',v:4}],notable:2},
        { id:'gk',   name:'Avatar of Destruction',  desc:'You don\'t cast fire. You are fire.',               x:290,y:385, req:['lks','c3','rks'],  effects:[{s:'dmg',v:22},{s:'crit',v:0.10},{s:'maxSP',v:30},{s:'atk',v:6}],notable:3},
    ],

    electromancer: [
        { id:'root', name:'Static Charge',          desc:'You crackle with barely contained lightning.',      x:290,y:35,  req:[],                effects:[{s:'crit',v:0.02},{s:'dmg',v:2}],             notable:0 },
        // Left — Chain Lightning
        { id:'l1',   name:'Conductor',              desc:'You channel electricity with uncanny efficiency.',   x:140,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'atk',v:2}],                 notable:0 },
        { id:'l2a',  name:'Chain Reaction',         desc:'Bolts leap from one enemy to the next.',            x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'atk',v:1}],                 notable:0 },
        { id:'l2b',  name:'Superconductor',         desc:'Your body conducts power at near-zero resistance.', x:210,y:170, req:['l1'],             effects:[{s:'dmg',v:2},{s:'crit',v:0.03}],             notable:0 },
        { id:'l3a',  name:'Ball Lightning',         desc:'Autonomous globes of plasma drift into enemies.',   x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:6},{s:'atk',v:3}],                notable:1 },
        { id:'l3b',  name:'Arc Flash',              desc:'A violent discharge blinds and damages simultaneously.',x:210,y:240,req:['l2b'],          effects:[{s:'dmg',v:5},{s:'crit',v:0.05}],            notable:1 },
        { id:'lks',  name:'Supercell',              desc:'You summon a localised thunderstorm.',               x:140,y:315, req:['l3a','l3b'],       effects:[{s:'dmg',v:14},{s:'atk',v:6},{s:'crit',v:0.04}],notable:2},
        // Center — Overcharge
        { id:'c1',   name:'Surge',                  desc:'Brief but devastating bursts of power.',            x:290,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'maxSP',v:8}],               notable:0 },
        { id:'c2',   name:'Overcharge',             desc:'You push your output beyond safe limits.',          x:290,y:180, req:['c1'],             effects:[{s:'dmg',v:4},{s:'crit',v:0.02}],             notable:0 },
        { id:'c3',   name:'Discharge',              desc:'A catastrophic release of accumulated energy.',     x:290,y:255, req:['c2'],             effects:[{s:'dmg',v:6},{s:'crit',v:0.04},{s:'atk',v:3}],notable:1},
        // Right — Static & Control
        { id:'r1',   name:'Static Field',           desc:'Enemies in your presence spark and falter.',        x:440,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'def',v:1}],                 notable:0 },
        { id:'r2a',  name:'Grounded',               desc:'You root yourself for maximum power output.',       x:370,y:170, req:['r1'],             effects:[{s:'maxHP',v:10},{s:'armor',v:1}],             notable:0 },
        { id:'r2b',  name:'Magnetise',              desc:'Your lightning bends to seek the nearest target.',  x:510,y:170, req:['r1'],             effects:[{s:'atk',v:3},{s:'dmg',v:1}],                 notable:0 },
        { id:'r3a',  name:'Shock Aura',             desc:'Lightning crackles around you in a constant halo.', x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:5},{s:'armor',v:2},{s:'def',v:2}], notable:1 },
        { id:'r3b',  name:'Thunderclap',            desc:'Your strikes are accompanied by concussive booms.', x:510,y:240, req:['r2b'],            effects:[{s:'atk',v:5},{s:'dmg',v:4}],                notable:1 },
        { id:'rks',  name:'Annihilation',           desc:'Total electrical annihilation. Nothing survives.',   x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:16},{s:'atk',v:7},{s:'crit',v:0.04}],notable:2},
        { id:'gk',   name:'Living Lightning',       desc:'You have transcended flesh and become pure electricity.',x:290,y:385,req:['lks','c3','rks'],effects:[{s:'dmg',v:20},{s:'crit',v:0.12},{s:'atk',v:8},{s:'maxSP',v:25}],notable:3},
    ],

    necromancer: [
        { id:'root', name:'Death Pact',             desc:'You make a deal with death. Death wins either way.',x:290,y:35,  req:[],                effects:[{s:'maxSP',v:10},{s:'dmg',v:2}],               notable:0 },
        // Left — Undead Army
        { id:'l1',   name:'Bone Shards',            desc:'Your minions attack with sharpened bone fragments.', x:140,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'l2a',  name:'Skeletal Army',          desc:'You command more undead than before.',              x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'maxSP',v:8}],               notable:0 },
        { id:'l2b',  name:'Bone Armour',            desc:'Your undead shield you with their own bodies.',     x:210,y:170, req:['l1'],             effects:[{s:'armor',v:2},{s:'maxHP',v:10}],             notable:0 },
        { id:'l3a',  name:'Lich\'s Army',           desc:'Your undead become formidable fighters in their own right.',x:70,y:240,req:['l2a'],      effects:[{s:'dmg',v:7},{s:'atk',v:3}],                notable:1 },
        { id:'l3b',  name:'Death\'s Shield',        desc:'Undead minions absorb damage meant for you.',       x:210,y:240, req:['l2b'],            effects:[{s:'armor',v:4},{s:'maxHP',v:18}],            notable:1 },
        { id:'lks',  name:'Undying Horde',          desc:'Death replenishes your army faster than battle depletes it.',x:140,y:315,req:['l3a','l3b'],effects:[{s:'dmg',v:14},{s:'armor',v:4},{s:'maxSP',v:15}],notable:2},
        // Center — Soul Drain
        { id:'c1',   name:'Life Tap',               desc:'You convert the life force of enemies into power.',  x:290,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'maxSP',v:8}],               notable:0 },
        { id:'c2',   name:'Soul Drain',             desc:'You siphon the very soul from living creatures.',   x:290,y:180, req:['c1'],             effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'c3',   name:'Death\'s Embrace',       desc:'You draw power from the death around you.',         x:290,y:255, req:['c2'],             effects:[{s:'dmg',v:5},{s:'crit',v:0.04},{s:'maxSP',v:12}],notable:1},
        // Right — Curses
        { id:'r1',   name:'Wither',                 desc:'A curse that saps enemy strength over time.',       x:440,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'dmg',v:1}],                 notable:0 },
        { id:'r2a',  name:'Vulnerability',          desc:'Enemies take substantially more damage from all sources.',x:370,y:170,req:['r1'],        effects:[{s:'atk',v:3},{s:'dmg',v:2}],                 notable:0 },
        { id:'r2b',  name:'Doom',                   desc:'A creeping curse that guarantees eventual destruction.',x:510,y:170,req:['r1'],          effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'r3a',  name:'Plague Curse',           desc:'Spreads the curse to every nearby enemy.',          x:370,y:240, req:['r2a'],            effects:[{s:'atk',v:4},{s:'dmg',v:5}],                notable:1 },
        { id:'r3b',  name:'Forbidden Rite',         desc:'A dark ritual that costs life to deal devastating damage.',x:510,y:240,req:['r2b'],      effects:[{s:'dmg',v:7},{s:'crit',v:0.05}],            notable:1 },
        { id:'rks',  name:'Lich Form',              desc:'You shed your mortal coil and become something far worse.',x:440,y:315,req:['r3a','r3b'],effects:[{s:'dmg',v:15},{s:'crit',v:0.07},{s:'maxSP',v:20}],notable:2},
        { id:'gk',   name:'Lord of Death',          desc:'Death is no longer your master. You are its master.',x:290,y:385,req:['lks','c3','rks'],  effects:[{s:'dmg',v:18},{s:'crit',v:0.10},{s:'maxSP',v:40},{s:'armor',v:5}],notable:3},
    ],

    barbarian: [
        { id:'root', name:'Blood Rage',             desc:'Your fury is a weapon sharper than any blade.',     x:290,y:35,  req:[],                effects:[{s:'dmg',v:3},{s:'maxHP',v:10}],               notable:0 },
        // Left — Rage & Fury
        { id:'l1',   name:'Bloodlust',              desc:'Battle makes you stronger, not weaker.',            x:140,y:100, req:['root'],           effects:[{s:'dmg',v:3},{s:'atk',v:1}],                 notable:0 },
        { id:'l2a',  name:'Frenzy',                 desc:'Each kill feeds your berserker hunger.',            x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:4},{s:'crit',v:0.02}],             notable:0 },
        { id:'l2b',  name:'Savage',                 desc:'Civilisation falls away. Only instinct remains.',   x:210,y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'atk',v:3}],                 notable:0 },
        { id:'l3a',  name:'Unstoppable Rage',       desc:'Nothing can slow your advance when blood is up.',   x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:7},{s:'crit',v:0.04}],            notable:1 },
        { id:'l3b',  name:'Berserker\'s Resolve',   desc:'The angrier you get, the more effective you become.',x:210,y:240,req:['l2b'],            effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'lks',  name:'God of War',             desc:'You are not a man. You are a force of elemental destruction.',x:140,y:315,req:['l3a','l3b'],effects:[{s:'dmg',v:18},{s:'atk',v:6},{s:'crit',v:0.06}],notable:2},
        // Center — Endurance
        { id:'c1',   name:'Thick Hide',             desc:'Your skin has callused into natural armour.',        x:290,y:100, req:['root'],           effects:[{s:'armor',v:2},{s:'maxHP',v:12}],             notable:0 },
        { id:'c2',   name:'Iron Will',              desc:'You shrug off blows that would fell lesser men.',    x:290,y:180, req:['c1'],             effects:[{s:'maxHP',v:20},{s:'armor',v:1}],             notable:0 },
        { id:'c3',   name:'Primal Endurance',       desc:'Your body heals at a rate that alarms physicians.', x:290,y:255, req:['c2'],             effects:[{s:'maxHP',v:35},{s:'armor',v:3},{s:'def',v:2}],notable:1},
        // Right — AoE & Whirlwind
        { id:'r1',   name:'Wide Stance',            desc:'Your mighty swings cover more ground.',             x:440,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'def',v:1}],                 notable:0 },
        { id:'r2a',  name:'Cleave',                 desc:'One strike, many targets.',                         x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:3},{s:'atk',v:1}],                 notable:0 },
        { id:'r2b',  name:'Juggernaut',             desc:'You become an unstoppable, devastating force.',      x:510,y:170, req:['r1'],             effects:[{s:'maxHP',v:15},{s:'dmg',v:2}],               notable:0 },
        { id:'r3a',  name:'Rampage',                desc:'You crash through enemies like a battering ram.',   x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:7},{s:'atk',v:3}],                notable:1 },
        { id:'r3b',  name:'Devastating Blow',       desc:'A single swing that can decide the entire battle.', x:510,y:240, req:['r2b'],            effects:[{s:'dmg',v:6},{s:'maxHP',v:20},{s:'crit',v:0.03}],notable:1},
        { id:'rks',  name:'Cataclysm',              desc:'Your attacks are geological events.',               x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:16},{s:'maxHP',v:30},{s:'atk',v:5}],notable:2},
        { id:'gk',   name:'World Breaker',          desc:'Armies have broken against a single man. That man is you.',x:290,y:385,req:['lks','c3','rks'],effects:[{s:'dmg',v:20},{s:'maxHP',v:80},{s:'atk',v:8},{s:'armor',v:5}],notable:3},
    ],

    druid: [
        { id:'root', name:'Nature\'s Bond',         desc:'The wilderness recognises you as its champion.',    x:290,y:35,  req:[],                effects:[{s:'armor',v:1},{s:'maxHP',v:8}],             notable:0 },
        // Left — Beast Form
        { id:'l1',   name:'Primal Instinct',        desc:'Animal cunning sharpens your instincts.',           x:140,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'crit',v:0.02}],             notable:0 },
        { id:'l2a',  name:'Claw Swipe',             desc:'Your attacks take on the ferocity of a wild beast.',x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'atk',v:1}],                 notable:0 },
        { id:'l2b',  name:'Pack Leader',            desc:'Your presence galvanises all nearby allies.',       x:210,y:170, req:['l1'],             effects:[{s:'atk',v:2},{s:'def',v:2}],                 notable:0 },
        { id:'l3a',  name:'Primal Fury',            desc:'You channel the raw, untamed power of a beast.',    x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:6},{s:'atk',v:3},{s:'crit',v:0.02}],notable:1},
        { id:'l3b',  name:'Alpha',                  desc:'You are unquestionably the apex predator.',         x:210,y:240, req:['l2b'],            effects:[{s:'atk',v:4},{s:'dmg',v:4}],                notable:1 },
        { id:'lks',  name:'Ancient Beast',          desc:'The form of a creature from an age before memory.', x:140,y:315, req:['l3a','l3b'],       effects:[{s:'dmg',v:12},{s:'atk',v:6},{s:'maxHP',v:30},{s:'armor',v:3}],notable:2},
        // Center — Nature Healing
        { id:'c1',   name:'Regrowth',               desc:'Your wounds close faster thanks to the life around you.',x:290,y:100,req:['root'],       effects:[{s:'maxHP',v:10},{s:'armor',v:1}],             notable:0 },
        { id:'c2',   name:'Nourish',                desc:'The forest sustains you in ways food cannot.',      x:290,y:180, req:['c1'],             effects:[{s:'maxHP',v:15},{s:'maxSP',v:10}],            notable:0 },
        { id:'c3',   name:'Forest Blessing',        desc:'Nature itself fights alongside you.',               x:290,y:255, req:['c2'],             effects:[{s:'maxHP',v:25},{s:'maxSP',v:14},{s:'armor',v:2}],notable:1},
        // Right — Storm
        { id:'r1',   name:'Gust',                   desc:'You call the wind to unbalance your foes.',         x:440,y:100, req:['root'],           effects:[{s:'dmg',v:2},{s:'def',v:2}],                 notable:0 },
        { id:'r2a',  name:'Tempest',                desc:'A howling storm responds to your call.',            x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'r2b',  name:'Lightning Strike',       desc:'You call raw lightning down from the sky.',         x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:2},{s:'atk',v:3}],                 notable:0 },
        { id:'r3a',  name:'Eye of the Storm',       desc:'You stand calm in the centre of devastation.',      x:370,y:240, req:['r2a'],            effects:[{s:'dmg',v:6},{s:'def',v:3},{s:'crit',v:0.03}],notable:1},
        { id:'r3b',  name:'Cyclone',                desc:'An uncontrollable vortex shreds everything within reach.',x:510,y:240,req:['r2b'],       effects:[{s:'dmg',v:5},{s:'atk',v:4}],                notable:1 },
        { id:'rks',  name:'Maelstrom',              desc:'You summon a world-ending storm.',                   x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:14},{s:'crit',v:0.06},{s:'atk',v:5}],notable:2},
        { id:'gk',   name:'World Tree',             desc:'You become a living conduit for the planet\'s life force.',x:290,y:385,req:['lks','c3','rks'],effects:[{s:'maxHP',v:60},{s:'dmg',v:15},{s:'armor',v:6},{s:'crit',v:0.06}],notable:3},
    ],

    ninja: [
        { id:'root', name:'Ghost Step',             desc:'You leave no footprint, no shadow, no sound.',      x:290,y:35,  req:[],                effects:[{s:'atk',v:2},{s:'def',v:1}],                 notable:0 },
        // Left — Speed
        { id:'l1',   name:'Quickstrike',            desc:'Your hands move faster than the eye can follow.',   x:140,y:100, req:['root'],           effects:[{s:'atk',v:3}],                               notable:0 },
        { id:'l2a',  name:'Flurry',                 desc:'A rapid series of blows lands in the blink of an eye.',x:70,y:170, req:['l1'],           effects:[{s:'atk',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'l2b',  name:'Afterimage',             desc:'You move so fast that enemies attack your afterimage.',x:210,y:170,req:['l1'],            effects:[{s:'atk',v:2},{s:'def',v:3}],                 notable:0 },
        { id:'l3a',  name:'Time Blur',              desc:'Your speed bends the perception of time.',          x:70, y:240, req:['l2a'],            effects:[{s:'atk',v:5},{s:'crit',v:0.04}],            notable:1 },
        { id:'l3b',  name:'Ghost Form',             desc:'You become nearly impossible to hit.',              x:210,y:240, req:['l2b'],            effects:[{s:'def',v:5},{s:'atk',v:3}],                notable:1 },
        { id:'lks',  name:'Absolute Speed',         desc:'You transcend the physical limitations of movement.', x:140,y:315, req:['l3a','l3b'],     effects:[{s:'atk',v:8},{s:'crit',v:0.06},{s:'def',v:4}],notable:2},
        // Center — Shadow Arts
        { id:'c1',   name:'Shadow Cloak',           desc:'Darkness is your shield and your blade.',           x:290,y:100, req:['root'],           effects:[{s:'crit',v:0.03},{s:'def',v:2}],             notable:0 },
        { id:'c2',   name:'Death Mark',             desc:'Once marked, your target cannot escape their fate.', x:290,y:180, req:['c1'],             effects:[{s:'crit',v:0.04},{s:'dmg',v:3}],             notable:0 },
        { id:'c3',   name:'Phantom',                desc:'You exist between life and death, untouchable.',     x:290,y:255, req:['c2'],             effects:[{s:'crit',v:0.06},{s:'dmg',v:4},{s:'def',v:3}],notable:1},
        // Right — Blade Mastery
        { id:'r1',   name:'Edge Mastery',           desc:'Your blade technique is flawless.',                 x:440,y:100, req:['root'],           effects:[{s:'dmg',v:3}],                               notable:0 },
        { id:'r2a',  name:'Thousand Cuts',          desc:'Death by a thousand paper-thin slices.',            x:370,y:170, req:['r1'],             effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'r2b',  name:'Mirror Strike',          desc:'You attack from multiple directions simultaneously.',x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:2},{s:'atk',v:3}],                 notable:0 },
        { id:'r3a',  name:'Blade Storm',            desc:'Your swords weave through the air in a lethal spiral.',x:370,y:240,req:['r2a'],          effects:[{s:'dmg',v:6},{s:'crit',v:0.05}],            notable:1 },
        { id:'r3b',  name:'Perfect Technique',      desc:'Every movement is precise, economical, and lethal.', x:510,y:240, req:['r2b'],            effects:[{s:'dmg',v:5},{s:'atk',v:5}],                notable:1 },
        { id:'rks',  name:'Dance of Death',         desc:'You become an entity of pure martial perfection.',   x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:14},{s:'crit',v:0.08},{s:'atk',v:6}],notable:2},
        { id:'gk',   name:'The Shadow Incarnate',   desc:'You do not cast a shadow. You ARE the shadow.',      x:290,y:385, req:['lks','c3','rks'],  effects:[{s:'crit',v:0.15},{s:'dmg',v:16},{s:'atk',v:10},{s:'def',v:6}],notable:3},
    ],

    chickenKing: [
        { id:'root', name:'Cluck of Authority',     desc:'Somehow, your clucking commands respect.',          x:290,y:35,  req:[],                effects:[{s:'atk',v:3},{s:'maxHP',v:5}],               notable:0 },
        // Left — Royal Flock
        { id:'l1',   name:'Rally the Flock',        desc:'Your allies fight harder in your presence.',        x:140,y:100, req:['root'],           effects:[{s:'atk',v:2},{s:'def',v:1}],                 notable:0 },
        { id:'l2a',  name:'Feather Storm',          desc:'A tornado of razor-sharp feathers.',                x:70, y:170, req:['l1'],             effects:[{s:'dmg',v:3},{s:'atk',v:2}],                 notable:0 },
        { id:'l2b',  name:'Pecking Order',          desc:'There is a hierarchy. You are at the top.',         x:210,y:170, req:['l1'],             effects:[{s:'atk',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'l3a',  name:'King\'s Flock',          desc:'Your followers would die for you. And they will.',  x:70, y:240, req:['l2a'],            effects:[{s:'dmg',v:5},{s:'atk',v:3}],                notable:1 },
        { id:'l3b',  name:'Royal Decree',           desc:'Your word is law. Your law is devastating.',        x:210,y:240, req:['l2b'],            effects:[{s:'atk',v:4},{s:'crit',v:0.04}],            notable:1 },
        { id:'lks',  name:'The Eternal Roost',      desc:'Your dynasty is unkillable.',                       x:140,y:315, req:['l3a','l3b'],       effects:[{s:'atk',v:8},{s:'dmg',v:8},{s:'maxHP',v:30},{s:'crit',v:0.04}],notable:2},
        // Center — Chaos
        { id:'c1',   name:'Battle Cluck',           desc:'A battle cry that would be laughable if it weren\'t so effective.',x:290,y:100,req:['root'],effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],notable:0 },
        { id:'c2',   name:'Chaos Crow',             desc:'Unpredictable. Unstoppable. Poultry.',              x:290,y:180, req:['c1'],             effects:[{s:'dmg',v:4},{s:'crit',v:0.03}],             notable:0 },
        { id:'c3',   name:'Poultry Poltergeist',    desc:'Enemies never know where you\'ll strike next.',     x:290,y:255, req:['c2'],             effects:[{s:'dmg',v:6},{s:'crit',v:0.05},{s:'atk',v:3}],notable:1},
        // Right — Crown Power
        { id:'r1',   name:'Golden Spur',            desc:'Your claws have been gilded and sharpened to a point.',x:440,y:100,req:['root'],          effects:[{s:'dmg',v:3},{s:'crit',v:0.02}],             notable:0 },
        { id:'r2a',  name:'Crown of Feathers',      desc:'An improbable crown that somehow radiates authority.',x:370,y:170,req:['r1'],             effects:[{s:'crit',v:0.03},{s:'atk',v:2}],             notable:0 },
        { id:'r2b',  name:'Sceptre of Clucking',    desc:'A magical weapon shaped like a chicken drumstick.',  x:510,y:170, req:['r1'],             effects:[{s:'dmg',v:4},{s:'atk',v:2}],                 notable:0 },
        { id:'r3a',  name:'Royal Wrath',            desc:'When the Chicken King is angered, kingdoms fall.',   x:370,y:240, req:['r2a'],            effects:[{s:'crit',v:0.05},{s:'dmg',v:4},{s:'atk',v:3}],notable:1},
        { id:'r3b',  name:'Drumstick of Doom',      desc:'An absurdly powerful weapon that defies all reason.', x:510,y:240, req:['r2b'],            effects:[{s:'dmg',v:8},{s:'crit',v:0.03}],            notable:1 },
        { id:'rks',  name:'Apocalyptic Cluck',      desc:'The sound alone brings armies to their knees.',      x:440,y:315, req:['r3a','r3b'],       effects:[{s:'dmg',v:16},{s:'crit',v:0.08},{s:'atk',v:6}],notable:2},
        { id:'gk',   name:'Poultry Supreme',        desc:'Against all logic, the Chicken King becomes the most powerful being in existence.',x:290,y:385,req:['lks','c3','rks'],effects:[{s:'dmg',v:18},{s:'crit',v:0.12},{s:'atk',v:10},{s:'maxHP',v:50}],notable:3},
    ],
};

// ===== CHARACTER CLASSES =====
const CLASSES = [
    { id:'fighter',      name:'Fighter',       desc:'Well-rounded warrior with high defense and a shield block.',
      baseHP:120,baseSP:40,  baseAtk:12,baseDef:12,baseDmg:10,baseArmor:5,  baseCrit:0.05,baseSpeed:4, abilities:['shieldBlock'],           isRanged:false },
    { id:'ranger',       name:'Ranger',        desc:'Attacks from range with a bow. Occasional multi-shot.',
      baseHP:90, baseSP:60,  baseAtk:14,baseDef:8, baseDmg:12,baseArmor:2,  baseCrit:0.08,baseSpeed:5, abilities:['multiShot'],             isRanged:true  },
    { id:'rogue',        name:'Rogue',         desc:'Vanishes into shadows for devastating backstabs and poisons.',
      baseHP:80, baseSP:70,  baseAtk:16,baseDef:8, baseDmg:14,baseArmor:1,  baseCrit:0.20,baseSpeed:3, abilities:['stealth','poisonBlade'],  isRanged:false },
    { id:'priest',       name:'Priest',        desc:'Heals the party and delivers holy smites.',
      baseHP:85, baseSP:100, baseAtk:8, baseDef:8, baseDmg:8, baseArmor:2,  baseCrit:0.03,baseSpeed:5, abilities:['heal','holySmite'],       isRanged:true  },
    { id:'pyromancer',   name:'Pyromancer',    desc:'Unleashes devastating fire spells that ignore armour.',
      baseHP:70, baseSP:120, baseAtk:10,baseDef:6, baseDmg:18,baseArmor:0,  baseCrit:0.10,baseSpeed:7, abilities:['fireball'],              isRanged:true  },
    { id:'electromancer',name:'Electromancer', desc:'Chains lightning between multiple enemies.',
      baseHP:70, baseSP:120, baseAtk:10,baseDef:6, baseDmg:15,baseArmor:0,  baseCrit:0.12,baseSpeed:7, abilities:['lightning','chainLightning'],isRanged:true},
    { id:'necromancer',  name:'Necromancer',   desc:'Summons skeleton minions and drains life.',
      baseHP:75, baseSP:110, baseAtk:9, baseDef:6, baseDmg:10,baseArmor:0,  baseCrit:0.05,baseSpeed:8, abilities:['summonSkeleton','deathCoil'],isRanged:true},
    { id:'barbarian',    name:'Barbarian',     desc:'Rages into battle dealing massive melee damage.',
      baseHP:150,baseSP:30,  baseAtk:10,baseDef:8, baseDmg:16,baseArmor:3,  baseCrit:0.07,baseSpeed:3, abilities:['rage','whirlwind'],       isRanged:false },
    { id:'druid',        name:'Druid',         desc:'Commands nature and calls upon storms and beasts.',
      baseHP:95, baseSP:90,  baseAtk:11,baseDef:10,baseDmg:12,baseArmor:3,  baseCrit:0.06,baseSpeed:5, abilities:['entangle','heal'],        isRanged:false },
    { id:'ninja',        name:'Ninja',         desc:'Fastest attacker with brutal crits and shadow techniques.',
      baseHP:75, baseSP:80,  baseAtk:18,baseDef:10,baseDmg:13,baseArmor:1,  baseCrit:0.25,baseSpeed:2, abilities:['stealth','poisonBlade'],  isRanged:false },
    { id:'chickenKing',  name:'Chicken King',  desc:'Somehow incredibly deadly. Nobody knows why.',
      baseHP:100,baseSP:50,  baseAtk:20,baseDef:5, baseDmg:9, baseArmor:0,  baseCrit:0.15,baseSpeed:1, abilities:['crowCall'],              isRanged:false },
];

// ===== MONSTER DATABASE =====
const MONSTER_TEMPLATES = [
    { name:'Goblin',        tier:1, hpM:0.8,  dmgM:0.8,  xp:5,   gold:3   },
    { name:'Orc',           tier:1, hpM:1.0,  dmgM:1.0,  xp:8,   gold:5   },
    { name:'Skeleton',      tier:1, hpM:0.9,  dmgM:0.9,  xp:6,   gold:4   },
    { name:'Kobold',        tier:1, hpM:0.7,  dmgM:1.1,  xp:7,   gold:4   },
    { name:'Troll',         tier:2, hpM:1.5,  dmgM:1.2,  xp:15,  gold:10  },
    { name:'Dark Mage',     tier:2, hpM:0.8,  dmgM:1.8,  xp:18,  gold:12  },
    { name:'Vampire',       tier:2, hpM:1.2,  dmgM:1.4,  xp:20,  gold:15  },
    { name:'Werewolf',      tier:2, hpM:1.3,  dmgM:1.3,  xp:17,  gold:11  },
    { name:'Golem',         tier:3, hpM:2.0,  dmgM:1.0,  xp:30,  gold:20  },
    { name:'Demon',         tier:3, hpM:1.5,  dmgM:1.6,  xp:35,  gold:25  },
    { name:'Lich',          tier:3, hpM:1.2,  dmgM:2.0,  xp:40,  gold:30  },
    { name:'Harpy',         tier:3, hpM:1.0,  dmgM:1.7,  xp:32,  gold:22  },
    { name:'Dragon',        tier:4, hpM:3.0,  dmgM:2.0,  xp:80,  gold:60  },
    { name:'Titan',         tier:4, hpM:3.5,  dmgM:1.8,  xp:90,  gold:70  },
    { name:'Ancient Dragon',tier:5, hpM:5.0,  dmgM:3.0,  xp:200, gold:150 },
    { name:'Demon Lord',    tier:5, hpM:4.0,  dmgM:3.5,  xp:250, gold:200 },
];

const BOSS_TEMPLATES = [
    { name:'Dungeon Overlord', hpM:4.5, dmgM:2.0, xp:100,  gold:80,  isBoss:true },
    { name:'Ancient Lich',     hpM:5.0, dmgM:2.5, xp:150,  gold:120, isBoss:true },
    { name:'Dragon Lord',      hpM:6.0, dmgM:3.0, xp:200,  gold:180, isBoss:true },
    { name:'Demon Prince',     hpM:7.0, dmgM:3.5, xp:300,  gold:250, isBoss:true },
    { name:'Chaos Titan',      hpM:10,  dmgM:4.0, xp:500,  gold:400, isBoss:true },
];

// ===== ACHIEVEMENT DEFINITIONS =====
const ACHIEVEMENT_DEFS = [
    { id:'kills100',    name:'100 Kills',        type:'kills',           threshold:100,    reward:5   },
    { id:'kills1k',     name:'1,000 Kills',       type:'kills',           threshold:1000,   reward:15  },
    { id:'kills10k',    name:'10,000 Kills',      type:'kills',           threshold:10000,  reward:50  },
    { id:'kills100k',   name:'100,000 Kills',     type:'kills',           threshold:100000, reward:150 },
    { id:'dungeon1',    name:'First Blood',       type:'dungeonsCleared', threshold:1,      reward:10  },
    { id:'dungeon10',   name:'Dungeon Delver',    type:'dungeonsCleared', threshold:10,     reward:30  },
    { id:'dungeon25',   name:'Dungeon Master',    type:'dungeonsCleared', threshold:25,     reward:80  },
    { id:'dungeon35',   name:'World Conqueror',   type:'dungeonsCleared', threshold:35,     reward:200 },
    { id:'castle1',     name:'Castle Owner',      type:'castlesConquered',threshold:1,      reward:20  },
    { id:'castle5',     name:'Land Baron',        type:'castlesConquered',threshold:5,      reward:60  },
    { id:'castle15',    name:'Kingdom Builder',   type:'castlesConquered',threshold:15,     reward:150 },
    { id:'castle35',    name:'Emperor',           type:'castlesConquered',threshold:35,     reward:500 },
    { id:'gold1k',      name:'Wealthy',           type:'goldEarned',      threshold:1000,   reward:8   },
    { id:'gold10k',     name:'Rich',              type:'goldEarned',      threshold:10000,  reward:25  },
    { id:'gold100k',    name:'Filthy Rich',       type:'goldEarned',      threshold:100000, reward:80  },
    { id:'level10',     name:'Veteran',           type:'maxLevel',        threshold:10,     reward:15  },
    { id:'level25',     name:'Champion',          type:'maxLevel',        threshold:25,     reward:50  },
    { id:'level50',     name:'Legend',            type:'maxLevel',        threshold:50,     reward:150 },
    { id:'level100',    name:'Immortal',          type:'maxLevel',        threshold:100,    reward:400 },
    { id:'minions50',   name:'Minion Master',     type:'minionsSummoned', threshold:50,     reward:20  },
    { id:'minions500',  name:'Army of Darkness',  type:'minionsSummoned', threshold:500,    reward:60  },
    { id:'spells1k',    name:'Spell Slinger',     type:'spellsCast',      threshold:1000,   reward:30  },
    { id:'crits500',    name:'Critical Fiend',    type:'criticalHits',    threshold:500,    reward:25  },
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
        id: i, name,
        level: Math.max(1, Math.floor(i * 2.5 + 1)),
        rooms: Math.max(8, 14 + Math.floor(i / 2) + randInt(-2, 2)),
        cleared: false, castlePurchased: false,
        castleCost: Math.floor(500 * Math.pow(1.75, i)),
        farmActive: false, farmKillRate: 0,
    }));
}

// ===== MONSTER UPGRADES =====
const UPGRADE_DEFS = [
    { id:'goldChance', name:'Gold Drop Chance',  baseCost:150,  costMult:1.8,
      apply:(u,lv) => { u.goldChance = 0.20 + lv * 0.04; },  fmt:(u) => `${(u.goldChance*100).toFixed(0)}%` },
    { id:'maxGold',    name:'Max Gold Per Drop', baseCost:250,  costMult:1.9,
      apply:(u,lv) => { u.maxGold = 8 + lv * 7; },           fmt:(u) => `${u.maxGold} g` },
    { id:'minGold',    name:'Min Gold Per Drop', baseCost:180,  costMult:2.0,
      apply:(u,lv) => { u.minGold = 1 + lv * 2; },           fmt:(u) => `${u.minGold} g` },
    { id:'itemChance', name:'Item Drop Chance',  baseCost:400,  costMult:2.2,
      apply:(u,lv) => { u.itemChance = 0.005 + lv * 0.003; },fmt:(u) => `${(u.itemChance*100).toFixed(2)}%` },
    { id:'xpBonus',    name:'XP Multiplier',     baseCost:700,  costMult:2.6,
      apply:(u,lv) => { u.xpMult = 1.0 + lv * 0.15; },      fmt:(u) => `${u.xpMult.toFixed(1)}x` },
    { id:'goldMult',   name:'Gold Multiplier',   baseCost:500,  costMult:2.3,
      apply:(u,lv) => { u.goldMult = 1.0 + lv * 0.2; },     fmt:(u) => `${u.goldMult.toFixed(1)}x` },
];


// ===== KILL MARKET (kills-as-currency sink) =====
// Kills accumulate; every kill = 1 "kill credit". Spending is tracked in G.killsSpent.
// Available credits = G.kills - G.killsSpent.
// Effects apply directly to ALL current heroes (and future recruits via applyAllKillBonusesToHero).
const KILL_MARKET_DEFS = [
    { id:'km_dmg',   name:'Gore Mastery',      icon:'⚔',  desc:'+4 Dmg all heroes',    cost:300,   costMult:2.8, effects:[{s:'dmg',v:4}] },
    { id:'km_atk',   name:'Veteran\'s Edge',   icon:'🗡',  desc:'+3 Atk all heroes',    cost:200,   costMult:2.5, effects:[{s:'atk',v:3}] },
    { id:'km_hp',    name:'Iron Body',          icon:'🛡',  desc:'+30 Max HP all',       cost:600,   costMult:2.8, effects:[{s:'maxHP',v:30}] },
    { id:'km_crit',  name:'Killing Edge',       icon:'💀',  desc:'+2% Crit all heroes',  cost:1500,  costMult:3.2, effects:[{s:'crit',v:0.02}] },
    { id:'km_armor', name:'Battle Scarred',     icon:'🧱',  desc:'+3 Armor all heroes',  cost:2500,  costMult:3.2, effects:[{s:'armor',v:3}] },
    { id:'km_sp',    name:'Soul Channeling',    icon:'✨',  desc:'+35 Max SP all',       cost:4000,  costMult:3.5, effects:[{s:'maxSP',v:35}] },
    { id:'km_def',   name:'Iron Resolve',       icon:'⚙',  desc:'+4 Defense all heroes',cost:6000,  costMult:3.5, effects:[{s:'def',v:4}] },
    { id:'km_farm',  name:'Slaughter Farms',    icon:'🌾',  desc:'+40% farm gold',       cost:10000, costMult:4.0, special:'farmBonus', value:0.4 },
    { id:'km_spd',   name:'Lightning Feet',     icon:'⚡',  desc:'All heroes attack 1 tick faster', cost:20000, costMult:5.0, effects:[{s:'speed',v:-1}] },
];

// ===== ARCANE RESEARCH (AP sink — repeatable purchases) =====
const RESEARCH_DEFS = [
    { id:'rs_hpregen', name:'Fortified Vitality', icon:'💊', desc:'HP regen rate +0.3%/purchase', cost:25,  costMult:2.0, key:'hpRegen',   perLv:0.003 },
    { id:'rs_spregen', name:'Arcane Flow',         icon:'🔵', desc:'SP regen rate +0.3%/purchase', cost:35,  costMult:2.0, key:'spRegen',   perLv:0.003 },
    { id:'rs_xp',      name:'Scholar\'s Blessing', icon:'📖', desc:'+12% XP per purchase',         cost:80,  costMult:2.4, key:'xpMult',   perLv:0.12 },
    { id:'rs_gold',    name:'Treasure Sense',       icon:'💰', desc:'+12% gold per purchase',        cost:60,  costMult:2.3, key:'goldMult', perLv:0.12 },
    { id:'rs_item',    name:'Artificer\'s Touch',   icon:'🎒', desc:'+0.4% item drop/purchase',     cost:120, costMult:2.6, key:'itemAdd',  perLv:0.004 },
    { id:'rs_travel',  name:'Swift Travel',          icon:'🏃', desc:'-4 travel ticks per purchase', cost:180, costMult:3.0, key:'travelReduce', perLv:4 },
];

// ===== MASTERY OVERCHARGE (skill point sink once tree is complete) =====
// When a hero has all 17 nodes and SP remain, each SP spent here cycles through stat boosts.
const MASTERY_CYCLE = [
    {s:'maxHP',v:15},{s:'dmg',v:2},{s:'atk',v:2},{s:'crit',v:0.01},
    {s:'armor',v:2},{s:'def',v:2},{s:'maxSP',v:20},
];

// ===== GAME STATE =====
const G = {
    paused: false, tick: 0, started: false, activeTab: 'game',
    gold: 0, kills: 0, goldEarned: 0, adventurePoints: 0,
    party: [],
    dungeons: [], currentDungeonIdx: -1, currentRoom: 0,
    traveling: false, travelTicks: 0, nextDungeonIdx: 0, roomDelay: 0,
    monsters: [], inCombat: false,
    achievements: {}, dungeonsCleared: 0, castlesConquered: 0, minionsSummoned: 0,
    upgrades: { goldChance:0.20, maxGold:8, minGold:1, itemChance:0.005, xpMult:1.0, goldMult:1.0 },
    upgradeLevels: {},
    killsSpent: 0,              // kills spent in kill market
    killMarketLevels: {},       // how many times each km_ was bought
    killMarketFarmBonus: 1.0,   // accumulated farm bonus from km_farm
    researchLevels: {},         // how many times each rs_ was bought
    researchBonus: { hpRegen:0, spRegen:0, xpMult:0, goldMult:0, itemAdd:0, travelReduce:0 },
    stats: { meleeAttacks:0, rangedAttacks:0, spellsCast:0, criticalHits:0, timesStunned:0 },
    combatLog: [],
    settings: { offlineProcessing: true },
    // Skill tree UI state
    selectedSkillHeroIdx: 0,
    hoveredNode: null,
    skillTreeDirty: false,  // set true when allocation or level-up occurs
    // Global Mastery tree
    globalAllocated: [],
    partyMaxSize: 4,
    inventory: [],
    itemsFound: 0,
};

// ===== UTILITY =====
const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

// Abbreviate large numbers: 1500 → 1.5K, 2300000 → 2.3M, etc.
function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return Math.floor(n).toLocaleString();
}
const randF = () => Math.random();

// Abbreviate large numbers: 1500 → 1.5K, 2400000 → 2.4M
function fmtNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return Math.floor(n).toLocaleString();
}

function log(msg, color) {
    G.combatLog.unshift({ msg, color: color || '#FFF' });
    if (G.combatLog.length > CFG.LOG_MAX) G.combatLog.length = CFG.LOG_MAX;
}

function xpForLevel(lv) {
    return Math.floor(600 * lv * Math.pow(1.18, lv - 1));
}

// ===== HERO =====
function createHero(classId, name) {
    const cls = CLASSES.find(c => c.id === classId);
    if (!cls) return null;
    const hero = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name, classId, className: cls.name,
        level: 1, xp: 0, xpNeeded: xpForLevel(1),
        maxHP: cls.baseHP, hp: cls.baseHP,
        maxSP: cls.baseSP,  sp: cls.baseSP,
        atk: cls.baseAtk,  def: cls.baseDef,
        dmg: cls.baseDmg,  armor: cls.baseArmor,
        crit: cls.baseCrit, speed: cls.baseSpeed,
        isRanged: cls.isRanged,
        abilities: [...cls.abilities],
        cooldown: 0, stunTicks: 0,
        stealthed: false, rageActive: false,
        shieldActive: false, shieldTicks: 0,
        abilityCDs: {},
        kills: 0, totalDmg: 0, healing: 0,
        spellsCast: 0, meleeAtks: 0, rangedAtks: 0,
        // Skill tree
        skillPoints: 0,
        allocatedNodes: [],
        masteryLevel: 0,
        equipment: { weapon:null, helm:null, armor:null, boots:null, trinket:null },
    };
    // Apply any global mastery nodes already purchased
    applyAllGlobalToHero(hero);
    return hero;
}

// ===== SKILL TREE SYSTEM =====

function getTree(hero) {
    return SKILL_TREES[hero.classId] || [];
}

function getNodeState(hero, node) {
    if (hero.allocatedNodes.includes(node.id)) return 'allocated';
    const prereqsMet = node.req.every(r => hero.allocatedNodes.includes(r));
    if (prereqsMet) return 'available';
    return 'locked';
}

function allocateNode(hero, nodeId) {
    if (hero.skillPoints < 1) return false;
    const tree = getTree(hero);
    const node = tree.find(n => n.id === nodeId);
    if (!node) return false;
    if (hero.allocatedNodes.includes(nodeId)) return false;
    const prereqsMet = node.req.every(r => hero.allocatedNodes.includes(r));
    if (!prereqsMet) return false;

    hero.skillPoints--;
    hero.allocatedNodes.push(nodeId);
    G.skillTreeDirty = true;

    // Apply effects permanently to hero stats
    for (const eff of node.effects) {
        if (eff.s === 'maxHP') {
            hero.maxHP += eff.v;
            hero.hp = Math.min(hero.hp + eff.v, hero.maxHP);
        } else if (eff.s === 'maxSP') {
            hero.maxSP += eff.v;
            hero.sp = Math.min(hero.sp + eff.v, hero.maxSP);
        } else {
            hero[eff.s] = (hero[eff.s] || 0) + eff.v;
        }
    }

    const label = node.notable >= 3 ? '★ GRAND KEYSTONE' : node.notable >= 2 ? '◆ Keystone' : node.notable >= 1 ? '● Notable' : 'Node';
    log(`${hero.name} allocates [${node.name}] — ${label}`, '#FA0');
    return true;
}

// ===== GLOBAL MASTERY TREE =====

function getGlobalNodeState(nodeId) {
    if (G.globalAllocated.includes(nodeId)) return 'allocated';
    const node = GLOBAL_TREE.find(n => n.id === nodeId);
    if (!node) return 'locked';
    return node.req.every(r => G.globalAllocated.includes(r)) ? 'available' : 'locked';
}

function allocateGlobalNode(nodeId) {
    const node = GLOBAL_TREE.find(n => n.id === nodeId);
    if (!node || G.globalAllocated.includes(nodeId)) return false;
    if (!node.req.every(r => G.globalAllocated.includes(r))) return false;
    if (G.adventurePoints < node.cost) return false;

    G.adventurePoints -= node.cost;
    G.globalAllocated.push(nodeId);

    for (const h of G.party) applyGlobalNodeToHero(h, node);

    if (nodeId === 'gk') {
        G.partyMaxSize = 5;
        log('★ THE FIFTH unlocked! A 5th hero may now join your party.', '#FA0');
    }
    const label = node.notable >= 3 ? '★ Grand Keystone' : node.notable >= 2 ? '◆ Keystone' : node.notable >= 1 ? '● Notable' : '';
    log(`Global: [${node.name}] ${label} allocated!`, '#8CF');
    return true;
}

function applyGlobalNodeToHero(hero, node) {
    for (const eff of node.effects) {
        if (eff.s === 'maxHP') {
            hero.maxHP += eff.v;
            hero.hp = Math.min(hero.hp + eff.v, hero.maxHP);
        } else if (eff.s === 'maxSP') {
            hero.maxSP += eff.v;
            hero.sp = Math.min(hero.sp + eff.v, hero.maxSP);
        } else {
            hero[eff.s] = (hero[eff.s] || 0) + eff.v;
        }
    }
}

// Apply all currently-allocated global nodes to a newly created hero
function applyAllGlobalToHero(hero) {
    for (const id of G.globalAllocated) {
        const node = GLOBAL_TREE.find(n => n.id === id);
        if (node) applyGlobalNodeToHero(hero, node);
    }
}

// ===== MONSTERS =====
function spawnMonster(template, dungLv, isBoss) {
    const scale = 1 + (dungLv - 1) * 0.3;
    const hp  = Math.max(5,  Math.floor(30 * template.hpM  * scale));
    const dmg = Math.max(1,  Math.floor(8  * template.dmgM * scale));
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: template.name + (isBoss ? ' ☠' : ''),
        isBoss: !!isBoss,
        maxHP: hp, hp,
        atk: Math.floor(8 * scale), def: Math.floor(6 * scale),
        dmg, armor: Math.floor(2 * template.hpM * scale),
        crit: 0.05, speed: isBoss ? 3 : 4,
        cooldown: randInt(0, 3),
        stunTicks: 0, poison: null,
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
function resolveHit(attacker, defender) {
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
        dmg = attacker.dmg + randInt(0, Math.floor(attacker.dmg * 0.5));
    } else {
        dmg = Math.max(1, attacker.dmg - defender.armor + randInt(-2, 2));
    }
    return { hit: true, crit: isCrit, damage: dmg };
}

function dealDamage(target, amount) {
    if (target.shieldActive) amount = Math.max(1, Math.floor(amount * 0.6));
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp > 0) return false;

    if (target.maxSP !== undefined) {
        // Hero — stun instead of die
        target.stunTicks = CFG.STUN_TICKS;
        target.hp = 0;
        G.stats.timesStunned++;
        log(`${target.name} is STUNNED!`, '#FA0');
    }
    return true;
}

function livingHeroes()   { return G.party.filter(h => h.hp > 0 && h.stunTicks === 0); }
function livingMonsters() { return G.monsters.filter(m => m.hp > 0); }

function pickHeroTarget() {
    const valid = livingHeroes().filter(h => !h.stealthed);
    if (!valid.length) return null;
    return valid[randInt(0, valid.length - 1)];
}

function pickMonsterTarget() {
    const alive = livingMonsters();
    if (!alive.length) return null;
    return alive.reduce((a, b) => (a.hp / a.maxHP) <= (b.hp / b.maxHP) ? a : b);
}

function heroAttacks(hero) {
    const target = pickMonsterTarget();
    if (!target) return;
    const res = resolveHit(hero, target);
    if (hero.isRanged) { hero.rangedAtks++; G.stats.rangedAttacks++; }
    else               { hero.meleeAtks++;  G.stats.meleeAttacks++;  }
    if (!res.hit) return;
    if (res.crit) { G.stats.criticalHits++; log(`${hero.name} CRITS ${target.name} for ${res.damage}!`, '#FF4'); }
    else          { log(`${hero.name} hits ${target.name} for ${res.damage}.`, '#DDD'); }
    hero.totalDmg += res.damage;
    const ko = dealDamage(target, res.damage);
    if (ko) onMonsterDied(target, hero);
}

function monsterAttacks(monster) {
    const target = pickHeroTarget();
    if (!target) return;
    const res = resolveHit(monster, target);
    if (!res.hit) return;
    log(`${monster.name} hits ${target.name} for ${res.damage}.`, '#F88');
    dealDamage(target, res.damage);
}

function onMonsterDied(m, killer) {
    G.kills++;
    if (killer) { killer.kills++; }
    G.inCombat = livingMonsters().length > 0;
    hero_distributeXP(m.xpReward);
    hero_dropGold(m);
    hero_dropItem();
    log(`${m.name} defeated!`, '#8AF');
    if (!G.inCombat) onRoomCleared();
}

function hero_distributeXP(total) {
    const base = Math.max(1, Math.floor(total / G.party.length));
    for (const h of G.party) {
        // ±30% variance per hero so XP bars feel individual
        const variance = 0.7 + randF() * 0.6;
        heroGainXP(h, Math.max(1, Math.floor(base * variance * (1 + G.researchBonus.xpMult))));
    }
}

function hero_dropGold(monster) {
    if (randF() >= G.upgrades.goldChance) return;
    let gold = randInt(G.upgrades.minGold, G.upgrades.maxGold);
    gold = Math.floor(gold * (G.upgrades.goldMult || 1) * (1 + G.researchBonus.goldMult));
    if (gold <= 0) return;
    G.gold += gold;
    G.goldEarned += gold;
    log(`Found ${gold} gold!`, '#FA0');
}

// ===== ABILITIES =====
function tryAbilities(hero) {
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
                .sort((a,b) => a.hp/a.maxHP - b.hp/b.maxHP)[0];
            if (!hurt || hero.sp < 20) return false;
            const amt = Math.floor(hero.maxSP * 0.3 + hero.dmg * 2);
            hurt.hp = Math.min(hurt.maxHP, hurt.hp + amt);
            hero.healing += amt; hero.sp -= 20;
            hero.abilityCDs.heal = 12; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            log(`${hero.name} heals ${hurt.name} for ${amt}.`, '#4F4');
            return true;
        }
        case 'stealth': {
            if (hero.stealthed || hero.sp < 15) return false;
            hero.stealthed = true; hero.sp -= 15;
            hero.abilityCDs.stealth = 20;
            log(`${hero.name} vanishes into shadow.`, '#AAF');
            return true;
        }
        case 'poisonBlade': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 10 || t.poison) return false;
            t.poison = { dmg: Math.max(1, Math.floor(hero.dmg * 0.3)), ticks: 8 };
            hero.sp -= 10; hero.abilityCDs.poisonBlade = 8;
            log(`${hero.name} poisons ${t.name}!`, '#8F4');
            return false;
        }
        case 'fireball': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 25) return false;
            const dmg = Math.floor(hero.dmg * 2 + randInt(0, hero.dmg));
            hero.sp -= 25; hero.abilityCDs.fireball = 16; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++; hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} launches Fireball at ${t.name} for ${dmg}!`, '#F84');
            if (ko) onMonsterDied(t, hero);
            return true;
        }
        case 'lightning': {
            const t = pickMonsterTarget();
            if (!t || hero.sp < 20) return false;
            const dmg = Math.floor(hero.dmg * 1.8 + randInt(0, hero.dmg));
            hero.sp -= 20; hero.abilityCDs.lightning = 14; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++; hero.totalDmg += dmg;
            const ko = dealDamage(t, dmg);
            log(`${hero.name} zaps ${t.name} with Lightning for ${dmg}!`, '#8CF');
            if (ko) onMonsterDied(t, hero);
            return true;
        }
        case 'chainLightning': {
            const targets = livingMonsters();
            if (!targets.length || hero.sp < 35) return false;
            hero.sp -= 35; hero.abilityCDs.chainLightning = 24; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++;
            let baseDmg = Math.floor(hero.dmg * 1.5);
            const hit = targets.slice(0, 3);
            log(`${hero.name} chains Lightning through ${hit.length} enemies!`, '#8CF');
            for (const t of hit) {
                const ko = dealDamage(t, baseDmg);
                hero.totalDmg += baseDmg;
                if (ko) onMonsterDied(t, hero);
                baseDmg = Math.floor(baseDmg * 0.6);
                if (livingMonsters().length === 0) break;
            }
            return true;
        }
        case 'summonSkeleton': {
            if (hero.sp < 30) return false;
            const t = pickMonsterTarget();
            if (!t) return false;
            hero.sp -= 30; hero.abilityCDs.summonSkeleton = 30; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++; G.minionsSummoned++;
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
            hero.sp -= 20; hero.abilityCDs.deathCoil = 12; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++; hero.totalDmg += dmg;
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
            hero.sp -= 15; hero.abilityCDs.holySmite = 10; hero.cooldown = hero.speed;
            G.stats.spellsCast++; hero.spellsCast++; hero.totalDmg += dmg;
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
            hero.sp -= 10; hero.abilityCDs.rage = 40;
            log(`${hero.name} enters a RAGE!`, '#F44');
            return false;
        }
        case 'whirlwind': {
            const targets = livingMonsters();
            if (!targets.length || hero.sp < 20) return false;
            hero.sp -= 20; hero.abilityCDs.whirlwind = 20; hero.cooldown = hero.speed;
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
            t.cooldown = Math.max(t.cooldown, 8);
            hero.sp -= 15; hero.abilityCDs.entangle = 15;
            log(`${hero.name} entangles ${t.name} in roots!`, '#4F8');
            return false;
        }
        case 'multiShot': {
            const targets = livingMonsters();
            if (targets.length < 2 || hero.sp < 15) return false;
            hero.sp -= 15; hero.abilityCDs.multiShot = 12; hero.cooldown = hero.speed;
            hero.rangedAtks++; G.stats.rangedAttacks++;
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
            hero.shieldActive = true; hero.shieldTicks = 5;
            hero.sp -= 10; hero.abilityCDs.shieldBlock = 12;
            log(`${hero.name} raises shield!`, '#88F');
            return false;
        }
        case 'crowCall': {
            if (hero.sp < 12) return false;
            hero.sp -= 12; hero.abilityCDs.crowCall = 18;
            for (const h of livingHeroes()) h.cooldown = Math.max(0, h.cooldown - 2);
            log(`${hero.name} crows! Party attacks faster!`, '#FF4');
            return false;
        }
        default: return false;
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
        if (!usedAbility) { heroAttacks(hero); hero.cooldown = hero.speed; }
    }

    if (!G.inCombat) return;

    for (const monster of [...livingMonsters()]) {
        if (monster.stunTicks > 0) { monster.stunTicks--; continue; }
        if (monster.cooldown > 0)  { monster.cooldown--; continue; }
        monsterAttacks(monster);
        monster.cooldown = monster.speed;
    }

    // Poison tick
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
    for (const h of G.party) { h.hp = Math.max(1, Math.floor(h.maxHP * 0.3)); h.stunTicks = 0; }
    G.traveling = true;
    G.travelTicks = CFG.TRAVEL_TICKS;
    G.nextDungeonIdx = G.currentDungeonIdx;
}

// ===== REGEN =====
function regenTick() {
    for (const h of G.party) {
        if (h.stunTicks > 0) continue;
        h.hp = Math.min(h.maxHP, h.hp + Math.max(1, Math.floor(h.maxHP * (CFG.HP_REGEN_RATE + G.researchBonus.hpRegen))));
        h.sp = Math.min(h.maxSP, h.sp + Math.max(1, Math.floor(h.maxSP * (CFG.SP_REGEN_RATE + G.researchBonus.spRegen))));
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
    hero.maxHP  = Math.floor(hero.maxHP * 1.08);
    hero.hp     = hero.maxHP;
    hero.maxSP  = Math.floor(hero.maxSP * 1.06);
    hero.sp     = hero.maxSP;
    hero.dmg    = Math.floor(hero.dmg * 1.05 + 0.5);
    hero.armor  = Math.floor(hero.armor + 0.3);
    hero.atk    = Math.floor(hero.atk + 0.5);
    hero.def    = Math.floor(hero.def + 0.4);
    hero.skillPoints++;
    G.skillTreeDirty = true;
    log(`${hero.name} reached level ${hero.level}! (+1 Skill Point)`, '#FF4');
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
        if (G.dungeonsCleared >= G.dungeons.length) {
            log('=== ALL DUNGEONS CLEARED — DUNGEON INFINITUM CONQUERED! ===', '#FA0');
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
    d.farmActive = true;
    d.farmKillRate = Math.max(1, Math.floor(d.level * 0.5));
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
        const gold = Math.floor(d.farmKillRate * d.level * G.upgrades.goldChance * G.upgrades.maxGold * 0.5 * (G.upgrades.goldMult||1) * (G.killMarketFarmBonus||1) * (1+G.researchBonus.goldMult));
        G.gold += gold;
        G.goldEarned += gold;
    }
}

// ===== MONSTER UPGRADES =====
function upgradeLevel(id) { return G.upgradeLevels[id] || 0; }
function upgradeCost(def) { return Math.floor(def.baseCost * Math.pow(def.costMult, upgradeLevel(def.id))); }

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

// ===== KILL MARKET =====
function kmAvailable() { return G.kills - G.killsSpent; }
function kmLevel(id) { return G.killMarketLevels[id] || 0; }
function kmCost(def) { return Math.floor(def.cost * Math.pow(def.costMult, kmLevel(def.id))); }

window.buyKillMarket = function(id) {
    const def = KILL_MARKET_DEFS.find(d => d.id === id);
    if (!def) return;
    const cost = kmCost(def);
    if (kmAvailable() < cost) { log('Not enough kills!', '#F44'); return; }
    G.killsSpent += cost;
    G.killMarketLevels[id] = (G.killMarketLevels[id] || 0) + 1;

    if (def.special === 'farmBonus') {
        G.killMarketFarmBonus = 1 + KILL_MARKET_DEFS
            .filter(d => d.special === 'farmBonus')
            .reduce((s, d) => s + (G.killMarketLevels[d.id] || 0) * d.value, 0);
    } else if (def.effects) {
        for (const eff of def.effects) {
            for (const h of G.party) {
                if (eff.s === 'maxHP') { h.maxHP += eff.v; h.hp = Math.min(h.hp + eff.v, h.maxHP); }
                else if (eff.s === 'maxSP') { h.maxSP += eff.v; h.sp = Math.min(h.sp + eff.v, h.maxSP); }
                else h[eff.s] = (h[eff.s] || 0) + eff.v;
            }
        }
    }
    log(`Kill Market: ${def.name} purchased!`, '#f84');
};

// Apply all accumulated Kill Market effects to a freshly recruited hero
function applyKillMarketToHero(hero) {
    for (const def of KILL_MARKET_DEFS) {
        if (!def.effects) continue;
        const lv = G.killMarketLevels[def.id] || 0;
        for (let i = 0; i < lv; i++) {
            for (const eff of def.effects) {
                if (eff.s === 'maxHP') { hero.maxHP += eff.v; hero.hp = Math.min(hero.hp + eff.v, hero.maxHP); }
                else if (eff.s === 'maxSP') { hero.maxSP += eff.v; hero.sp = Math.min(hero.sp + eff.v, hero.maxSP); }
                else hero[eff.s] = (hero[eff.s] || 0) + eff.v;
            }
        }
    }
}

// ===== ARCANE RESEARCH =====
function rsCost(def) { return Math.floor(def.cost * Math.pow(def.costMult, G.researchLevels[def.id] || 0)); }

function recalcResearchBonus() {
    G.researchBonus = { hpRegen:0, spRegen:0, xpMult:0, goldMult:0, itemAdd:0, travelReduce:0 };
    for (const def of RESEARCH_DEFS) {
        const lv = G.researchLevels[def.id] || 0;
        if (lv) G.researchBonus[def.key] += lv * def.perLv;
    }
}

window.buyResearch = function(id) {
    const def = RESEARCH_DEFS.find(d => d.id === id);
    if (!def) return;
    const cost = rsCost(def);
    if (G.adventurePoints < cost) { log('Not enough AP!', '#F44'); return; }
    G.adventurePoints -= cost;
    G.researchLevels[id] = (G.researchLevels[id] || 0) + 1;
    recalcResearchBonus();
    log(`Arcane Research: ${def.name} Lv.${G.researchLevels[id]}!`, '#8cf');
};

// ===== MASTERY OVERCHARGE (skill point sink) =====
window.heroMastery = function(heroIdx) {
    const hero = G.party[heroIdx];
    if (!hero || hero.skillPoints < 1 || hero.allocatedNodes.length < 17) return;
    hero.skillPoints--;
    const bonus = MASTERY_CYCLE[(hero.masteryLevel || 0) % MASTERY_CYCLE.length];
    if (bonus.s === 'maxHP') { hero.maxHP += bonus.v; hero.hp = Math.min(hero.hp + bonus.v, hero.maxHP); }
    else if (bonus.s === 'maxSP') { hero.maxSP += bonus.v; hero.sp = Math.min(hero.sp + bonus.v, hero.maxSP); }
    else hero[bonus.s] = +(( (hero[bonus.s] || 0) + bonus.v).toFixed(3));
    hero.masteryLevel = (hero.masteryLevel || 0) + 1;
    const statName = {maxHP:'Max HP',maxSP:'Max SP',atk:'Attack',def:'Defense',dmg:'Damage',armor:'Armor',crit:'Crit'}[bonus.s] || bonus.s;
    const valStr = bonus.s === 'crit' ? `+${(bonus.v*100).toFixed(0)}%` : `+${bonus.v}`;
    log(`${hero.name} Mastery Lv.${hero.masteryLevel}: ${valStr} ${statName}!`, '#fa0');
    G.skillTreeDirty = true;
};

// ===== EXPORT / IMPORT SAVE =====
window.exportSave = function() {
    saveGame();
    const raw = localStorage.getItem('di_save') || '';
    const encoded = btoa(raw);
    el('exportTextarea').value = encoded;
    el('exportTextarea').select();
    try { document.execCommand('copy'); log('Save copied to clipboard!', '#8f8'); } catch(e) {}
};

window.importSave = function() {
    const encoded = el('exportTextarea').value.trim();
    if (!encoded) return;
    try {
        const raw = atob(encoded);
        JSON.parse(raw);  // validate JSON
        localStorage.setItem('di_save', raw);
        log('Save imported — reloading…', '#8f8');
        setTimeout(() => location.reload(), 800);
    } catch(e) { log('Invalid save data!', '#f44'); }
};

// ===== ACHIEVEMENTS =====
function checkAchievements(type, value) {
    for (const def of ACHIEVEMENT_DEFS) {
        if (def.type !== type || G.achievements[def.id]) continue;
        if (value >= def.threshold) {
            G.achievements[def.id] = true;
            G.adventurePoints += def.reward;
            log(`ACHIEVEMENT UNLOCKED: ${def.name}! +${def.reward} AP`, '#FA0');
        }
    }
}

function checkAllAchievements() {
    checkAchievements('kills',           G.kills);
    checkAchievements('dungeonsCleared', G.dungeonsCleared);
    checkAchievements('castlesConquered',G.castlesConquered);
    checkAchievements('goldEarned',      G.goldEarned);
    checkAchievements('minionsSummoned', G.minionsSummoned);
    checkAchievements('spellsCast',      G.stats.spellsCast);
    checkAchievements('criticalHits',    G.stats.criticalHits);
    if (G.party.length) {
        checkAchievements('maxLevel', Math.max(...G.party.map(h => h.level)));
    }
}

// ===== SAVE / LOAD =====
function saveGame() {
    try {
        localStorage.setItem('di_save', JSON.stringify({
            v: 5,
            gold: G.gold, kills: G.kills, killsSpent: G.killsSpent, goldEarned: G.goldEarned,
            ap: G.adventurePoints,
            dungeonsCleared: G.dungeonsCleared,
            castlesConquered: G.castlesConquered,
            minionsSummoned: G.minionsSummoned,
            achievements: G.achievements,
            stats: G.stats,
            globalAllocated: G.globalAllocated,
            partyMaxSize: G.partyMaxSize,
            inventory: G.inventory,
            itemsFound: G.itemsFound,
            dungeons: G.dungeons.map(d => ({
                id: d.id, cleared: d.cleared, rooms: d.rooms,
                castlePurchased: d.castlePurchased, farmActive: d.farmActive,
            })),
            upgradeLevels: G.upgradeLevels,
            killMarketLevels: G.killMarketLevels,
            killMarketFarmBonus: G.killMarketFarmBonus,
            researchLevels: G.researchLevels,
            party: G.party.map(h => ({
                id: h.id, name: h.name, classId: h.classId,
                level: h.level, xp: h.xp, xpNeeded: h.xpNeeded,
                maxHP: h.maxHP, hp: h.hp, maxSP: h.maxSP, sp: h.sp,
                atk: h.atk, def: h.def, dmg: h.dmg, armor: h.armor,
                crit: h.crit, speed: h.speed,
                kills: h.kills, totalDmg: h.totalDmg, healing: h.healing,
                skillPoints: h.skillPoints, allocatedNodes: h.allocatedNodes,
                masteryLevel: h.masteryLevel || 0,
                equipment: h.equipment,
            })),
            ts: Date.now(),
        }));
        const ind = el('autosaveIndicator');
        if (ind) { ind.style.opacity = '1'; clearTimeout(ind._t); ind._t = setTimeout(() => ind.style.opacity = '0', 2000); }
    } catch(e) { console.error('Save failed', e); }
}

function loadSave() {
    try {
        const raw = localStorage.getItem('di_save');
        if (!raw) return false;
        const s = JSON.parse(raw);
        if (!s || (s.v !== 4 && s.v !== 5)) return false;

        G.gold            = s.gold            || 0;
        G.kills           = s.kills           || 0;
        G.killsSpent      = s.killsSpent      || 0;
        G.goldEarned      = s.goldEarned      || 0;
        G.adventurePoints = s.ap              || 0;
        G.dungeonsCleared = s.dungeonsCleared || 0;
        G.castlesConquered= s.castlesConquered|| 0;
        G.minionsSummoned = s.minionsSummoned || 0;
        G.achievements    = s.achievements    || {};
        G.stats           = Object.assign(G.stats, s.stats || {});
        G.globalAllocated = s.globalAllocated || [];
        G.partyMaxSize    = s.partyMaxSize    || 4;
        G.inventory       = s.inventory       || [];
        G.itemsFound      = s.itemsFound      || 0;

        if (s.dungeons) {
            for (const ds of s.dungeons) {
                const d = G.dungeons.find(x => x.id === ds.id);
                if (!d) continue;
                d.cleared = ds.cleared;
                if (ds.rooms) d.rooms = ds.rooms;
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

        if (s.killMarketLevels) {
            G.killMarketLevels = s.killMarketLevels;
            G.killMarketFarmBonus = s.killMarketFarmBonus || 1;
        }

        if (s.researchLevels) {
            G.researchLevels = s.researchLevels;
            recalcResearchBonus();
        }

        // Offline farm income (max 8 hours)
        if (G.settings.offlineProcessing && s.ts) {
            const ticks = Math.min(Math.floor((Date.now() - s.ts) / CFG.TICK_MS), 115200);
            if (ticks > 60) {
                let totalKills = 0, totalGold = 0;
                for (const d of G.dungeons) {
                    if (!d.farmActive) continue;
                    totalKills += d.farmKillRate * ticks;
                    totalGold  += Math.floor(d.farmKillRate * ticks * d.level * G.upgrades.goldChance * G.upgrades.maxGold * 0.5 * (G.upgrades.goldMult||1) * (G.killMarketFarmBonus||1) * (1 + G.researchBonus.goldMult));
                }
                G.kills       += totalKills;
                G.gold        += totalGold;
                G.goldEarned  += totalGold;
                if (totalKills > 0) log(`Offline: +${Math.floor(totalKills).toLocaleString()} kills, +${totalGold.toLocaleString()} gold from farms.`, '#8AF');
            }
        }

        // Restore party
        if (s.party && s.party.length > 0) {
            G.party = [];
            for (const sp of s.party) {
                const cls = CLASSES.find(c => c.id === sp.classId);
                if (!cls) continue;
                G.party.push({
                    id: sp.id,
                    name: sp.name, classId: sp.classId, className: cls.name,
                    level: sp.level, xp: sp.xp, xpNeeded: sp.xpNeeded,
                    maxHP: sp.maxHP, hp: Math.min(sp.hp, sp.maxHP),
                    maxSP: sp.maxSP, sp: Math.min(sp.sp, sp.maxSP),
                    atk: sp.atk, def: sp.def, dmg: sp.dmg, armor: sp.armor,
                    crit: sp.crit, speed: sp.speed !== undefined ? sp.speed : cls.baseSpeed,
                    isRanged: cls.isRanged,
                    abilities: [...cls.abilities],
                    cooldown: 0, stunTicks: 0,
                    stealthed: false, rageActive: false,
                    shieldActive: false, shieldTicks: 0,
                    abilityCDs: {},
                    kills: sp.kills || 0, totalDmg: sp.totalDmg || 0, healing: sp.healing || 0,
                    spellsCast: 0, meleeAtks: 0, rangedAtks: 0,
                    skillPoints: sp.skillPoints || 0,
                    allocatedNodes: sp.allocatedNodes || [],
                    masteryLevel: sp.masteryLevel || 0,
                    equipment: sp.equipment || { weapon:null, helm:null, armor:null, boots:null, trinket:null },
                });
            }
        }

        return true;
    } catch(e) { console.error('Load failed', e); return false; }
}

// ===== UI UTILITIES =====
const el = (id) => document.getElementById(id);
const setHTML = (id, html) => { const e = el(id); if (e) e.innerHTML = html; };

function showTab(tabId) {
    document.querySelectorAll('.tabContainer').forEach(e => e.style.display = 'none');
    document.querySelectorAll('#gameTabMenu li').forEach(e => e.className = '');
    const tab = el(tabId + 'TabContent');
    if (tab) tab.style.display = '';
    const li = el('tab_' + tabId);
    if (li) li.className = 'selectedTab';
    G.activeTab = tabId;
    if (tabId === 'upgrades')      { buildUpgradesTab(); updateMonsterUpgradesUI(); updateKillMarketUI(); updateResearchUI(); }
    if (tabId === 'dungeons')      updateDungeonsUI();
    if (tabId === 'achievements')  updateAchievementsUI();
    if (tabId === 'stats')         updateStatsUI();
    if (tabId === 'skills')        { G.skillTreeDirty = true; updateSkillsUI(); G.skillTreeDirty = false; }
}

function updateUI() {
    setHTML('goldAmountCell',  Math.floor(G.gold).toLocaleString());
    setHTML('killsCountCell',  G.kills.toLocaleString());
    setHTML('expCell',         G.adventurePoints.toLocaleString());
    updatePartyBars();
    updateCombatLog();
    updateEncounterPanel();
    updateGlobalTreeUI();
    updateItemsUI();
    updateSideUpgradesUI();
    if (G.activeTab === 'skills' && G.skillTreeDirty) { updateSkillsUI(); G.skillTreeDirty = false; }
    else if (G.activeTab === 'skills') {
        // Refresh just the stats panel (not the SVG) every tick for live values
        const hero = G.party[G.selectedSkillHeroIdx];
        const sp = el('skillStatsPanel');
        if (hero && sp) sp.innerHTML = buildHeroStatsHTML(hero);
    }
    if (G.activeTab === 'upgrades') { updateKillMarketUI(); updateResearchUI(); }
}

function updatePartyBars() {
    for (let i = 0; i < 5; i++) {
        const h = G.party[i];
        const panel = el('gameTabAdventurerInfo' + i);
        if (!panel) continue;
        if (!h) { panel.style.display = 'none'; continue; }
        panel.style.display = '';

        const hpPct = Math.round((h.hp / h.maxHP) * 100);
        const spPct = Math.round((h.sp / h.maxSP) * 100);
        const xpPct = Math.round((h.xp / h.xpNeeded) * 100);
        const hpColor = hpPct > 50 ? '#4c4' : hpPct > 25 ? '#fa0' : '#f44';

        let tag = '';
        if      (h.stunTicks > 0) tag = `<span class="heroTag stunTag">STUN</span>`;
        else if (h.stealthed)     tag = `<span class="heroTag stealthTag">STEALTH</span>`;
        else if (h.rageActive)    tag = `<span class="heroTag rageTag">RAGE</span>`;
        const spBadge = h.skillPoints > 0 ? `<span class="heroTag" style="background:#1a1500;color:#fa0">+${h.skillPoints} SP</span>` : '';

        panel.innerHTML = `
            <div class="heroRow">
                <span class="heroName">${h.name}</span>
                <span class="heroClass">${h.className} Lv.${h.level}</span>
                ${tag}${spBadge}
            </div>
            <div class="statBars">
                <div class="barWrap"><div class="barFill" style="width:${hpPct}%;background:${hpColor}"></div><span class="barLabel">${h.hp}/${h.maxHP} HP</span></div>
                <div class="barWrap"><div class="barFill" style="width:${spPct}%;background:#44a"></div><span class="barLabel">${h.sp}/${h.maxSP} SP</span></div>
                <div class="barWrap"><div class="barFill" style="width:${xpPct}%;background:#664"></div><span class="barLabel">XP ${xpPct}%</span></div>
            </div>`;
    }
}

function updateCombatLog() {
    const logEl = el('combatLog');
    if (!logEl) return;
    logEl.innerHTML = G.combatLog.slice(0, 40)
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
        const summary = G.monsters.filter(m => m.hp > 0).map(m => `${m.name} (${m.hp}/${m.maxHP})`).join(' · ');
        panel.innerHTML = `<div class="${cls}">${dung.name} – Room ${G.currentRoom + 1}/${dung.rooms} › ${summary}</div>`;
    } else if (dung) {
        panel.style.display = '';
        panel.innerHTML = `<div class="encounterNotificationDiv">${dung.name} — Cleared</div>`;
    } else {
        panel.style.display = 'none';
    }
}

let _sideDirtyKey = '';

function updateSideUpgradesUI() {
    const availKills = G.kills - G.killsSpent;
    const farmKey = G.dungeons.filter(d => d.cleared && !d.castlePurchased).length;
    const key = `${Math.floor(G.gold)}|${Math.floor(availKills)}|${farmKey}`;
    if (key === _sideDirtyKey) return;
    _sideDirtyKey = key;

    // Gold upgrades
    const upPanel = el('sideUpgradesPanel');
    if (upPanel) {
        upPanel.innerHTML = '';
        for (const def of UPGRADE_DEFS) {
            const cost = upgradeCost(def);
            const lv   = upgradeLevel(def.id);
            const can  = G.gold >= cost;
            const btn  = document.createElement('div');
            btn.className = can ? 'sideUpgradeBtn can' : 'sideUpgradeBtn';
            btn.innerHTML = `<span>${def.name} <span style="color:#444">Lv.${lv}</span></span><span style="color:${can?'#fa0':'#444'}">${fmtNum(cost)}g</span>`;
            if (can) btn.onclick = () => { buyUpgrade(def.id); _sideDirtyKey = ''; };
            upPanel.appendChild(btn);
        }
    }

    // Kill Market
    const kmPanel = el('sideKillMarketPanel');
    if (kmPanel) {
        kmPanel.innerHTML = '';
        const availLn = document.createElement('div');
        availLn.style.cssText = 'font-size:9px;color:#555;padding:2px 4px;';
        availLn.textContent = `Available: ${fmtNum(availKills)} kills`;
        kmPanel.appendChild(availLn);
        for (const def of KILL_MARKET_DEFS) {
            const cost = kmCost(def);
            const lv   = kmLevel(def.id);
            const can  = availKills >= cost;
            const btn  = document.createElement('div');
            btn.className = can ? 'sideUpgradeBtn can' : 'sideUpgradeBtn';
            btn.innerHTML = `<span>${def.icon} ${def.name} <span style="color:#444">Lv.${lv}</span></span><span style="color:${can?'#f84':'#444'}">${fmtNum(cost)}☠</span>`;
            if (can) btn.onclick = () => { buyKillMarket(def.id); _sideDirtyKey = ''; };
            kmPanel.appendChild(btn);
        }
    }

    // Castles & Farms
    const farmPanel = el('sideFarmsPanel');
    if (farmPanel) {
        farmPanel.innerHTML = '';
        let any = false;
        for (const d of G.dungeons) {
            if (!d.cleared) continue;
            any = true;
            const row = document.createElement('div');
            row.style.cssText = 'padding:2px 4px;font-size:10px;border-bottom:1px solid #111;display:flex;justify-content:space-between;align-items:center;';
            if (d.farmActive) {
                row.innerHTML = `<span style="color:#888">${d.name}</span><span style="color:#4fa">⚡ +${d.farmKillRate}/tick</span>`;
            } else if (d.castlePurchased) {
                row.innerHTML = `<span style="color:#888">${d.name}</span><span style="color:#555">🏰 farm…</span>`;
            } else {
                const can = G.gold >= d.castleCost;
                const castleBtn = document.createElement('span');
                castleBtn.className = can ? 'sideSmallBtn' : 'sideSmallBtnDim';
                castleBtn.textContent = `🏰 ${fmtNum(d.castleCost)}g`;
                if (can) castleBtn.onclick = () => { buyCastle(d.id); _sideDirtyKey = ''; };
                const nm = document.createElement('span');
                nm.style.color = '#888';
                nm.textContent = d.name;
                row.appendChild(nm);
                row.appendChild(castleBtn);
            }
            farmPanel.appendChild(row);
        }
        if (!any) {
            farmPanel.innerHTML = '<div style="font-size:10px;color:#333;padding:4px;">Clear dungeons to unlock castles.</div>';
        }
    }
}

function updateMonsterUpgradesUI() {
    const container = el('monsterUpgradeButtonsContainer');
    if (!container) return;
    container.innerHTML = '';
    for (const def of UPGRADE_DEFS) {
        const cost = upgradeCost(def);
        const lv   = upgradeLevel(def.id);
        const canAfford = G.gold >= cost;
        const btn = document.createElement('div');
        btn.className = canAfford ? 'upgradeButton' : 'disabledUpgradeButton';
        btn.style.marginBottom = '3px';
        btn.textContent = `${def.name} (Lv.${lv}) — ${fmtNum(cost)}g`;
        if (canAfford) btn.onclick = () => buyUpgrade(def.id);
        container.appendChild(btn);
    }
    setHTML('goldDropChance', (G.upgrades.goldChance * 100).toFixed(0) + '%');
    setHTML('maxGoldPerDrop', G.upgrades.maxGold + ' g');
    setHTML('minGoldPerDrop', G.upgrades.minGold + ' g');
    setHTML('itemDropChance', (G.upgrades.itemChance * 100).toFixed(2) + '%');
    setHTML('goldMultVal', (G.upgrades.goldMult || 1).toFixed(1) + 'x');
    setHTML('killCountPanel', G.kills.toLocaleString());
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
            const can = G.gold >= d.castleCost;
            castlePart = `<span class="${can ? 'upgradeButton' : 'disabledUpgradeButton'}" style="cursor:${can ? 'pointer' : 'default'}" onclick="buyCastle(${d.id})">Buy Castle (${fmtNum(d.castleCost)}g)</span>`;
        }
        let farmPart = '';
        if (d.farmActive) {
            farmPart = `<span style="color:#4fa">⚡ Farm +${d.farmKillRate}/tick</span>`;
        } else if (d.castlePurchased) {
            farmPart = `<span style="color:#555;font-size:10px">(farm starting)</span>`;
        }
        div.innerHTML = `
            <span style="color:#aaa;min-width:22px;display:inline-block">${d.id + 1}.</span>
            <b>${d.name}</b> <span style="color:#888">(Lv.${d.level}, ${d.rooms} rooms)</span>
            &nbsp;${clearBadge} &nbsp;${castlePart} &nbsp;${farmPart}`;
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
        div.innerHTML = `<span style="color:${unlocked ? '#fa0' : '#888'}">${unlocked ? '★' : '☆'}</span> <b>${def.name}</b> <span style="color:#aaa;font-size:11px;margin-left:5px">+${def.reward} AP</span>`;
        container.appendChild(div);
    }
    const header = document.createElement('div');
    header.style.cssText = 'padding:5px;color:#aaa;border-bottom:1px solid #2b2b32;margin-bottom:5px;';
    header.textContent = `Unlocked: ${unlockedCount} / ${ACHIEVEMENT_DEFS.length}`;
    container.insertBefore(header, container.firstChild);
}

// ===== KILL MARKET UI =====
let _kmLastKills = -1;
function updateKillMarketUI() {
    const availEl = el('killMarketAvail');
    const btnsEl  = el('killMarketButtons');
    if (!btnsEl) return;
    const marks = Math.floor(G.kills / 100) - Math.floor(G.killsSpent / 100);  // marks from unspent
    const avail = G.kills - G.killsSpent;
    const sameKills = (G.kills === _kmLastKills);
    if (sameKills && btnsEl.children.length === KILL_MARKET_DEFS.length) return;
    _kmLastKills = G.kills;

    if (availEl) availEl.textContent = `Available kills: ${avail.toLocaleString()} (${Math.floor(avail/100)} marks unspent)`;
    btnsEl.innerHTML = '';
    for (const def of KILL_MARKET_DEFS) {
        const cost = kmCost(def);
        const lv = kmLevel(def.id);
        const can = avail >= cost;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1a1a24;';
        div.innerHTML = `
            <span style="font-size:12px;">${def.icon} ${def.name} <span style="color:#555;font-size:10px;">Lv.${lv}</span></span>
            <span>
                <span style="color:#888;font-size:10px;margin-right:4px;">${def.desc}</span>
                <span class="${can ? 'upgradeButton' : 'disabledUpgradeButton'}"
                    onclick="${can ? `buyKillMarket('${def.id}');updateKillMarketUI();` : ''}"
                    style="cursor:${can?'pointer':'default'}">⚔ ${fmtNum(cost)}</span>
            </span>`;
        btnsEl.appendChild(div);
    }
}

// ===== ARCANE RESEARCH UI =====
let _researchLastAP = -1;
function updateResearchUI() {
    const btnsEl = el('arcaneResearchButtons');
    if (!btnsEl) return;
    if (G.adventurePoints === _researchLastAP && btnsEl.children.length === RESEARCH_DEFS.length) return;
    _researchLastAP = G.adventurePoints;
    btnsEl.innerHTML = '';
    for (const def of RESEARCH_DEFS) {
        const cost = rsCost(def);
        const lv = G.researchLevels[def.id] || 0;
        const can = G.adventurePoints >= cost;
        const div = document.createElement('div');
        div.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1a1a24;';
        div.innerHTML = `
            <span style="font-size:12px;">${def.icon} ${def.name} <span style="color:#555;font-size:10px;">Lv.${lv}</span></span>
            <span>
                <span style="color:#888;font-size:10px;margin-right:4px;">${def.desc}</span>
                <span class="${can ? 'upgradeButton' : 'disabledUpgradeButton'}"
                    onclick="${can ? `buyResearch('${def.id}');updateResearchUI();` : ''}"
                    style="cursor:${can?'pointer':'default'}">🔮 ${fmtNum(cost)} AP</span>
            </span>`;
        btnsEl.appendChild(div);
    }
}

function updateStatsUI() {
    const container = el('statsContainer');
    if (!container) return;
    const row = (label, val) => `<tr><td>${label}</td><td style="text-align:right">${typeof val === 'number' ? val.toLocaleString() : val}</td></tr>`;
    container.innerHTML = `
    <table class="statsTable">
        ${row('Total Kills', G.kills)}
        ${row('Kills Available', G.kills - G.killsSpent)}
        ${row('Gold Earned', G.goldEarned)}
        ${row('Items Found', G.itemsFound || 0)}
        ${row('Dungeons Cleared', G.dungeonsCleared)}
        ${row('Castles Conquered', G.castlesConquered)}
        ${row('Adventure Points', G.adventurePoints)}
        ${row('Melee Attacks', G.stats.meleeAttacks)}
        ${row('Ranged Attacks', G.stats.rangedAttacks)}
        ${row('Spells Cast', G.stats.spellsCast)}
        ${row('Critical Hits', G.stats.criticalHits)}
        ${row('Times Stunned', G.stats.timesStunned)}
        ${row('Minions Summoned', G.minionsSummoned)}
    </table>
    <div style="color:#444;font-size:10px;margin-top:6px;">Hero stats and equipment are shown in the Characters tab.</div>
    <div style="margin-top:14px;border-top:1px solid #2b2b32;padding-top:10px;">
        <div class="sectionTitle" style="margin-bottom:8px;">💾 Save / Export</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span class="upgradeButton" onclick="saveGame();log('Saved!','#8f8')">Save Now</span>
            <span class="upgradeButton" onclick="exportSave()">Export Save</span>
            <span class="upgradeButton" onclick="importSave()">Import Save</span>
        </div>
        <textarea id="exportTextarea" spellcheck="false"
            style="width:100%;height:70px;background:#0a0a10;color:#6cf;border:1px solid #2b2b32;font-size:9px;font-family:monospace;padding:4px;box-sizing:border-box;resize:none;"
            placeholder="Paste exported save here to import…"></textarea>
    </div>`;
}

// ===== ITEMS UI =====

function updateItemsUI() {
    if (!_itemsDirty) return;
    _itemsDirty = false;
    const panel = el('sideItemsPanel');
    if (!panel) return;
    panel.innerHTML = '';

    // Equipped items per hero (compact view)
    for (let hi = 0; hi < G.party.length; hi++) {
        const hero = G.party[hi];
        const equippedCount = ITEM_SLOTS.filter(s => hero.equipment[s]).length;
        if (!equippedCount && G.inventory.length === 0) continue;
        const row = document.createElement('div');
        row.style.cssText = 'padding:2px 4px;border-bottom:1px solid #1a1a24;font-size:10px;';
        const slots = ITEM_SLOTS.map(s => {
            const item = hero.equipment[s];
            const icon = {weapon:'⚔',helm:'🪖',armor:'🛡',boots:'👢',trinket:'💍'}[s];
            return item
                ? `<span title="${item.name}" style="color:${RARITY_COLORS[item.rarity]};cursor:default">${icon}</span>`
                : `<span style="color:#333">${icon}</span>`;
        }).join(' ');
        row.innerHTML = `<span style="color:#888">${hero.name}:</span> ${slots}`;
        panel.appendChild(row);
    }

    if (G.inventory.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#444;font-size:10px;padding:6px 4px;text-align:center;font-style:italic;';
        empty.textContent = 'No items in inventory';
        panel.appendChild(empty);
        return;
    }

    const invTitle = document.createElement('div');
    invTitle.style.cssText = 'font-size:10px;color:#555;padding:3px 4px 2px;border-bottom:1px solid #1a1a24;';
    invTitle.textContent = `Inventory (${G.inventory.length})`;
    panel.appendChild(invTitle);

    for (const item of G.inventory) {
        const row = document.createElement('div');
        row.className = 'itemRow';
        row.style.cssText = `border-left:2px solid ${RARITY_COLORS[item.rarity]};`;

        const statsStr = Object.entries(item.stats)
            .map(([s,v]) => `+${s==='crit'?(v*100).toFixed(1)+'%':v} ${s}`)
            .join(' · ');

        row.innerHTML = `
            <div class="itemName" style="color:${RARITY_COLORS[item.rarity]}">${item.name}</div>
            <div class="itemStats">${statsStr}</div>
            <div class="itemEquipRow">
                ${G.party.map((h, i) => `<span class="itemEquipBtn" onclick="equipItem(${i},'${item.id}')">${h.name}</span>`).join('')}
            </div>`;
        panel.appendChild(row);
    }
}

// ===== GLOBAL MASTERY TREE UI =====
const SVG_NS = 'http://www.w3.org/2000/svg';

let _globalTreeLastAP = -1;  // avoid expensive SVG rebuild every tick
let _itemsDirty = true;

function updateGlobalTreeUI() {
    const container = el('globalTreeContainer');
    if (!container) return;
    if (G.adventurePoints === _globalTreeLastAP) return;
    _globalTreeLastAP = G.adventurePoints;

    // Update AP label
    const apLabel = el('globalApLabel');
    if (apLabel) apLabel.textContent = `${G.adventurePoints} AP available`;

    container.innerHTML = '';
    container.appendChild(buildGlobalSVG());

    // 5th hero recruit button
    const recruitArea = el('globalRecruitArea');
    if (recruitArea) {
        recruitArea.innerHTML = '';
        if (G.partyMaxSize >= 5) {
            const btn = document.createElement('div');
            btn.style.cssText = 'padding:5px 14px;text-align:center;font-size:11px;cursor:pointer;';
            if (G.party.length < 5) {
                btn.className = 'upgradeButton';
                btn.textContent = '+ Recruit 5th Hero';
                btn.onclick = openRecruitModal;
            } else {
                btn.className = 'disabledUpgradeButton';
                btn.textContent = '★ Full Party (5/5)';
            }
            recruitArea.appendChild(btn);
        }
    }
}

function buildGlobalSVG() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', 264);
    svg.setAttribute('height', 390);
    svg.style.cssText = 'display:block;background:#07070f;margin:0 auto;';

    // Edges
    for (const node of GLOBAL_TREE) {
        for (const reqId of node.req) {
            const parent = GLOBAL_TREE.find(n => n.id === reqId);
            if (!parent) continue;
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', parent.x); line.setAttribute('y1', parent.y);
            line.setAttribute('x2', node.x);   line.setAttribute('y2', node.y);
            const bothAlloc = G.globalAllocated.includes(reqId) && G.globalAllocated.includes(node.id);
            line.setAttribute('class', 'sk-edge' + (bothAlloc ? ' allocated' : ''));
            svg.appendChild(line);
        }
    }

    // Nodes
    for (const node of GLOBAL_TREE) {
        const state = getGlobalNodeState(node.id);
        const r = node.notable >= 3 ? 20 : node.notable >= 2 ? 16 : node.notable >= 1 ? 13 : 10;

        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', [
            'sk-node', `sk-node-${state}`,
            node.notable >= 1 ? 'sk-node-notable' : '',
            node.notable >= 2 ? 'sk-node-keystone' : '',
            node.notable >= 3 ? 'sk-node-grand' : '',
        ].join(' ').trim());
        g.setAttribute('transform', `translate(${node.x},${node.y})`);
        g.style.cursor = (state === 'available' && G.adventurePoints >= node.cost) ? 'pointer' : 'default';

        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('r', r);
        if (node.notable >= 3) circle.setAttribute('stroke', '#f84');

        const iconText = node.notable >= 3 ? '★' : node.notable >= 2 ? '◆' : node.notable >= 1 ? '●' : node.name.slice(0, 1);
        const iconEl = document.createElementNS(SVG_NS, 'text');
        iconEl.setAttribute('dy', node.notable >= 1 ? '-3' : '0');
        iconEl.setAttribute('font-size', r >= 16 ? '11' : '8');
        iconEl.setAttribute('pointer-events', 'none');
        iconEl.textContent = iconText;

        const labelEl = document.createElementNS(SVG_NS, 'text');
        labelEl.setAttribute('dy', r + 10);
        labelEl.setAttribute('font-size', '8');
        labelEl.setAttribute('text-anchor', 'middle');
        labelEl.setAttribute('fill', state === 'allocated' ? '#8cf' : state === 'available' ? '#8cf8' : '#3336');
        labelEl.setAttribute('pointer-events', 'none');
        labelEl.textContent = node.name.length > 13 ? node.name.slice(0, 11) + '…' : node.name;

        g.appendChild(circle);
        g.appendChild(iconEl);
        g.appendChild(labelEl);

        g.addEventListener('mouseenter', (e) => showGlobalNodeTooltip(node, state, e));
        g.addEventListener('mousemove',  (e) => moveTooltip(e));
        g.addEventListener('mouseleave', hideTooltip);
        if (state === 'available') {
            g.addEventListener('click', () => {
                if (allocateGlobalNode(node.id)) {
                    _globalTreeLastAP = -1;  // force rebuild
                    updateGlobalTreeUI();
                    updatePartyBars();
                    hideTooltip();
                }
            });
        }

        svg.appendChild(g);
    }
    return svg;
}

function showGlobalNodeTooltip(node, state, mouseEvt) {
    const tt = getOrCreateTooltip();
    const tierLabel = node.notable >= 3 ? '★ Grand Keystone'
                    : node.notable >= 2 ? '◆ Keystone'
                    : node.notable >= 1 ? '● Notable' : '';

    const effHtml = node.id === 'gk'
        ? '<span class="tt-eff-item">Unlocks the <b>5th party slot</b></span>'
        : fmtEffects(node.effects) + ' <span style="color:#8cf;font-size:10px">(all heroes)</span>';

    let statusHtml = '';
    if (state === 'allocated') {
        statusHtml = `<div class="tt-status tt-allocated">✓ Allocated</div>`;
    } else if (state === 'available') {
        const costStr = node.cost === 0 ? 'Free' : `${node.cost} AP`;
        const canAfford = G.adventurePoints >= node.cost;
        statusHtml = canAfford
            ? `<div class="tt-status tt-available">Click to Allocate · ${costStr}</div>`
            : `<div class="tt-status tt-nopts">Need ${node.cost} AP (have ${G.adventurePoints})</div>`;
    } else {
        const missingNames = node.req
            .filter(r => !G.globalAllocated.includes(r))
            .map(r => { const n = GLOBAL_TREE.find(x => x.id === r); return n ? n.name : r; });
        statusHtml = `<div class="tt-status tt-locked">Requires: ${missingNames.join(', ')}</div>`;
    }

    tt.innerHTML = `
        <div class="tt-header">
            <span class="tt-name">${node.name}</span>
            ${tierLabel ? `<span class="tt-tier">${tierLabel}</span>` : ''}
        </div>
        <div class="tt-desc">${node.desc}</div>
        ${effHtml ? `<div class="tt-effects">${effHtml}</div>` : ''}
        ${statusHtml}`;

    tt.style.display = 'block';
    positionTooltip(tt, mouseEvt);
}

// Compute total bonus from all equipped items for one hero
function getEquipmentBonus(hero) {
    const bonus = {};
    for (const slot of ITEM_SLOTS) {
        const item = hero.equipment[slot];
        if (!item) continue;
        for (const [s, v] of Object.entries(item.stats)) {
            bonus[s] = (bonus[s] || 0) + v;
        }
    }
    return bonus;
}

function buildHeroStatsHTML(hero) {
    const bonus = getEquipmentBonus(hero);
    const statNames = { maxHP:'Max HP', maxSP:'Max SP', atk:'Attack', def:'Defense', dmg:'Damage', armor:'Armor', crit:'Crit', speed:'Speed' };
    const fmt = (s, v) => s === 'crit' ? (v * 100).toFixed(1) + '%' : String(v);
    const fmtBonus = (s, v) => s === 'crit' ? `+${(v * 100).toFixed(1)}%` : `+${v}`;

    let rows = '';
    for (const [s, label] of Object.entries(statNames)) {
        const total = hero[s] !== undefined ? hero[s] : 0;
        const b = bonus[s] || 0;
        const base = s === 'crit' ? parseFloat((total - b).toFixed(3)) : total - b;
        const bonusStr = b ? `<td class="charStatBonus">${fmtBonus(s, b)}</td><td style="color:#8af">${fmt(s, total)}</td>` : `<td></td><td style="color:#8af">${fmt(s, total)}</td>`;
        rows += `<tr><td style="color:#888;">${label}</td><td style="color:#ccc;">${fmt(s, base)}</td>${bonusStr}</tr>`;
    }

    // Equipment slots
    const slotIcons = { weapon:'⚔', helm:'🪖', armor:'🛡', boots:'👢', trinket:'💍' };
    let equipRows = '';
    for (const slot of ITEM_SLOTS) {
        const item = hero.equipment[slot];
        const icon = slotIcons[slot];
        if (item) {
            const statsStr = Object.entries(item.stats).map(([s,v]) => fmtBonus(s,v)+' '+s).join(' · ');
            equipRows += `<div class="charEquipSlot">
                <span class="charEquipIcon">${icon}</span>
                <span class="charEquipName" style="color:${RARITY_COLORS[item.rarity]}" title="${statsStr}">${item.name}</span>
            </div>`;
        } else {
            equipRows += `<div class="charEquipSlot">
                <span class="charEquipIcon">${icon}</span>
                <span class="charEquipEmpty">${slot}</span>
            </div>`;
        }
    }

    const heroIdx = G.party.indexOf(hero);

    const spText = hero.skillPoints > 0
        ? `<span style="color:#fa0">⬟ ${hero.skillPoints} skill point${hero.skillPoints !== 1 ? 's' : ''} available</span>`
        : `<span style="color:#444">${hero.allocatedNodes.length}/17 nodes</span>`;

    // Mastery overcharge button: only when tree is complete and SP are available
    const treeComplete = hero.allocatedNodes.length >= 17;
    const nextMastery = treeComplete ? MASTERY_CYCLE[(hero.masteryLevel || 0) % MASTERY_CYCLE.length] : null;
    const masteryBtn = (treeComplete && hero.skillPoints > 0 && heroIdx >= 0)
        ? `<div style="margin-top:4px;"><span class="upgradeButton" onclick="heroMastery(${heroIdx})" title="Cycle: ${MASTERY_CYCLE.map(m=>m.s).join('→')}">
            ✦ Mastery Lv.${(hero.masteryLevel||0)+1} — ${nextMastery ? (nextMastery.s==='crit'?`+${(nextMastery.v*100).toFixed(0)}% crit`:`+${nextMastery.v} ${nextMastery.s}`) : ''} (1 SP)
           </span></div>`
        : (treeComplete ? `<div style="font-size:10px;color:#444;margin-top:3px;">Mastery Lv.${hero.masteryLevel||0} — need SP to continue</div>` : '');

    return `
        <div style="font-weight:bold;font-size:12px;color:#fa0;margin-bottom:2px;">${hero.name}</div>
        <div style="color:#8af;font-size:10px;margin-bottom:4px;">${hero.className} · Level ${hero.level}</div>
        <div style="font-size:10px;margin-bottom:2px;">${spText}</div>
        ${masteryBtn}
        <div style="font-size:10px;color:#555;letter-spacing:1px;margin-bottom:3px;border-bottom:1px solid #1a1a24;padding-bottom:2px;margin-top:6px;">STATS</div>
        <table class="charStatTable">
            <tr><th style="text-align:left;color:#444;font-weight:normal;">Stat</th><th style="color:#444;font-weight:normal;">Base</th><th style="color:#4f8;font-weight:normal;">+Item</th><th style="color:#8af;font-weight:normal;">Total</th></tr>
            ${rows}
        </table>
        <div style="font-size:10px;color:#555;letter-spacing:1px;margin-bottom:4px;border-bottom:1px solid #1a1a24;padding-bottom:2px;margin-top:6px;">EQUIPMENT</div>
        ${equipRows}`;
}

// ===== SKILL TREE UI (per-hero) =====

function updateSkillsUI() {
    const wrap = el('skillTreeWrap');
    const selector = el('skillHeroSelector');
    if (!wrap || !selector) return;

    selector.innerHTML = '';
    G.party.forEach((h, i) => {
        const btn = document.createElement('div');
        btn.className = 'skillHeroBtn' + (i === G.selectedSkillHeroIdx ? ' active' : '');
        const spLabel = h.skillPoints > 0 ? ` [${h.skillPoints} SP]` : '';
        btn.textContent = `${h.name}${spLabel}`;
        btn.onclick = () => { G.selectedSkillHeroIdx = i; updateSkillsUI(); };
        selector.appendChild(btn);
    });

    const hero = G.party[G.selectedSkillHeroIdx];
    if (!hero) {
        wrap.innerHTML = '<div style="padding:20px;color:#555">No hero selected.</div>';
        const sp = el('skillStatsPanel');
        if (sp) sp.innerHTML = '';
        return;
    }

    // Left panel: hero stats + equipment
    const statsPanel = el('skillStatsPanel');
    if (statsPanel) statsPanel.innerHTML = buildHeroStatsHTML(hero);

    // Right panel: skill tree SVG
    wrap.innerHTML = '';
    wrap.appendChild(buildSkillSVG(hero));
}

function buildSkillSVG(hero) {
    const tree = getTree(hero);
    const W = 590, H = 440;

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('class', 'skillTreeSVG');
    svg.style.background = '#070710';

    // Draw edges first
    for (const node of tree) {
        for (const reqId of node.req) {
            const parent = tree.find(n => n.id === reqId);
            if (!parent) continue;
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', parent.x);
            line.setAttribute('y1', parent.y);
            line.setAttribute('x2', node.x);
            line.setAttribute('y2', node.y);
            const parentAlloc = hero.allocatedNodes.includes(reqId);
            const nodeAlloc   = hero.allocatedNodes.includes(node.id);
            line.setAttribute('class', 'sk-edge' + (parentAlloc && nodeAlloc ? ' allocated' : ''));
            svg.appendChild(line);
        }
    }

    // Draw nodes
    for (const node of tree) {
        const state = getNodeState(hero, node);
        // Radius based on tier
        const r = node.notable >= 3 ? 26 : node.notable >= 2 ? 22 : node.notable >= 1 ? 19 : 15;

        const g = document.createElementNS(SVG_NS, 'g');
        g.setAttribute('class', `sk-node sk-node-${state}${node.notable >= 1 ? ' sk-node-notable' : ''}${node.notable >= 2 ? ' sk-node-keystone' : ''}${node.notable >= 3 ? ' sk-node-grand' : ''}`);
        g.setAttribute('cursor', state === 'locked' ? 'default' : 'pointer');
        g.setAttribute('transform', `translate(${node.x},${node.y})`);

        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('r', r);

        // Inner icon for notable/keystone
        let iconText = '';
        if (node.notable >= 3)     { circle.setAttribute('stroke', '#f84'); iconText = '★'; }
        else if (node.notable >= 2) { iconText = '◆'; }
        else if (node.notable >= 1) { iconText = '●'; }

        const text = document.createElementNS(SVG_NS, 'text');
        text.setAttribute('dy', node.notable >= 1 ? '-4' : '0');
        text.textContent = iconText || (node.notable === 0 ? node.name.slice(0, 1) : '');

        // Sub label for notable nodes
        const label = document.createElementNS(SVG_NS, 'text');
        label.setAttribute('dy', r + 12);
        label.setAttribute('font-size', '9');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', state === 'allocated' ? '#fa0' : state === 'available' ? '#fa06' : '#3336');
        label.textContent = node.name.length > 16 ? node.name.slice(0, 14) + '…' : node.name;

        g.appendChild(circle);
        g.appendChild(text);
        g.appendChild(label);

        // Hover: floating tooltip
        g.addEventListener('mouseenter', (e) => showNodeTooltip(hero, node, state, e));
        g.addEventListener('mousemove',  (e) => moveTooltip(e));
        g.addEventListener('mouseleave', hideTooltip);

        // Click: allocate
        if (state === 'available') {
            g.addEventListener('click', () => {
                if (allocateNode(hero, node.id)) {
                    // Dirty flag already set in allocateNode; rebuild now
                    updateSkillsUI();
                    updatePartyBars();
                }
            });
        }

        svg.appendChild(g);
    }

    return svg;
}

function fmtEffects(effects) {
    if (!effects || !effects.length) return '';
    const names = { maxHP:'Max HP', maxSP:'Max SP', dmg:'Damage', armor:'Armor', atk:'Attack', def:'Defense', crit:'Crit', speed:'Speed' };
    return effects.map(e => {
        const val = e.s === 'crit'  ? `+${(e.v * 100).toFixed(0)}%`
                  : e.s === 'speed' ? `${e.v > 0 ? '+' : ''}${e.v} ticks`
                  : `+${e.v}`;
        return `<span class="tt-eff-item">${val} <b>${names[e.s] || e.s}</b></span>`;
    }).join('');
}

function getOrCreateTooltip() {
    let tt = el('skillTooltip');
    if (!tt) {
        tt = document.createElement('div');
        tt.id = 'skillTooltip';
        tt.style.cssText = [
            'position:fixed','z-index:9999','display:none','pointer-events:none',
            'background:#0d0d1a','border:1px solid #3a3a5a','border-radius:4px',
            'padding:10px 12px','max-width:240px','font-size:12px','line-height:1.5',
            'box-shadow:0 4px 18px rgba(0,0,0,0.7)',
        ].join(';');
        document.body.appendChild(tt);
    }
    return tt;
}

function showNodeTooltip(hero, node, state, mouseEvt) {
    const tt = getOrCreateTooltip();
    const tierLabel = node.notable >= 3 ? '★ Grand Keystone'
                    : node.notable >= 2 ? '◆ Keystone'
                    : node.notable >= 1 ? '● Notable' : '';
    const effHtml = fmtEffects(node.effects);

    let statusHtml = '';
    if (state === 'allocated') {
        statusHtml = `<div class="tt-status tt-allocated">✓ Allocated</div>`;
    } else if (state === 'available') {
        if (hero.skillPoints > 0) {
            statusHtml = `<div class="tt-status tt-available">Click to Allocate · 1 Skill Point</div>`;
        } else {
            statusHtml = `<div class="tt-status tt-nopts">No Skill Points Available</div>`;
        }
    } else {
        const missingNames = node.req
            .filter(r => !hero.allocatedNodes.includes(r))
            .map(r => { const n = getTree(hero).find(x => x.id === r); return n ? n.name : r; });
        statusHtml = `<div class="tt-status tt-locked">Requires: ${missingNames.join(', ')}</div>`;
    }

    tt.innerHTML = `
        <div class="tt-header">
            <span class="tt-name">${node.name}</span>
            ${tierLabel ? `<span class="tt-tier">${tierLabel}</span>` : ''}
        </div>
        <div class="tt-desc">${node.desc}</div>
        ${effHtml ? `<div class="tt-effects">${effHtml}</div>` : ''}
        ${statusHtml}`;

    tt.style.display = 'block';
    positionTooltip(tt, mouseEvt);
}

function positionTooltip(tt, e) {
    const pad = 14;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    // Clamp to viewport after measuring
    requestAnimationFrame(() => {
        const w = tt.offsetWidth, h = tt.offsetHeight;
        if (x + w + pad > window.innerWidth)  x = e.clientX - w - pad;
        if (y + h + pad > window.innerHeight) y = e.clientY - h - pad;
        tt.style.left = Math.max(0, x) + 'px';
        tt.style.top  = Math.max(0, y) + 'px';
    });
}

function moveTooltip(e) {
    const tt = el('skillTooltip');
    if (tt && tt.style.display !== 'none') positionTooltip(tt, e);
}

function hideTooltip() {
    const tt = el('skillTooltip');
    if (tt) tt.style.display = 'none';
}

// ===== PARTY CREATION =====
function openRecruitModal() {
    let modal = el('recruitModal');
    if (modal) { modal.style.display = 'flex'; return; }

    modal = document.createElement('div');
    modal.id = 'recruitModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);display:flex;align-items:center;justify-content:center;z-index:9998;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#0b0b12;border:1px solid #3AA5E6;padding:16px;width:400px;max-height:78vh;overflow-y:auto;';

    const title = document.createElement('div');
    title.style.cssText = 'font-weight:bold;font-size:14px;color:#fa0;margin-bottom:10px;';
    title.textContent = '★ Recruit Your 5th Hero';
    box.appendChild(title);

    const nameWrap = document.createElement('div');
    nameWrap.style.cssText = 'margin-bottom:8px;';
    nameWrap.innerHTML = `<input id="recruitName" type="text" placeholder="Hero name..." style="background:#111;color:#fff;border:1px solid #3AA5E6;padding:4px;width:180px;">`;
    box.appendChild(nameWrap);

    let chosen = null;
    const classList = document.createElement('div');
    for (const cls of CLASSES) {
        const row = document.createElement('div');
        row.style.cssText = 'padding:5px;margin:2px 0;border:1px solid #2b2b32;cursor:pointer;font-size:12px;';
        row.innerHTML = `<b>${cls.name}</b> <span style="color:#8cf;font-size:10px">${cls.isRanged ? '🏹' : '⚔️'}</span> <span style="color:#888">${cls.desc}</span>`;
        row.onclick = () => {
            classList.querySelectorAll('div').forEach(d => { d.style.background = ''; });
            row.style.background = '#1a1500';
            chosen = cls.id;
        };
        classList.appendChild(row);
    }
    box.appendChild(classList);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;margin-top:10px;';

    const recruitBtn = document.createElement('div');
    recruitBtn.className = 'upgradeButton';
    recruitBtn.style.cssText = 'padding:6px 14px;cursor:pointer;';
    recruitBtn.textContent = 'Recruit';
    recruitBtn.onclick = () => {
        const heroName = el('recruitName').value.trim();
        if (!chosen || !heroName) return;
        const h = createHero(chosen, heroName);
        if (h) {
            G.party.push(h);
            log(`${heroName} joins the party!`, '#FA0');
        }
        modal.style.display = 'none';
        updatePartyBars();
        _globalTreeLastAP = -1;
        updateGlobalTreeUI();
    };

    const cancelBtn = document.createElement('div');
    cancelBtn.className = 'upgradeButton';
    cancelBtn.style.cssText = 'padding:6px 14px;cursor:pointer;color:#f84;';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => { modal.style.display = 'none'; };

    btnRow.appendChild(recruitBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);
}

function buildPartyCreation() {
    const container = el('partyCreationTabContent');
    container.innerHTML = '';

    const intro = document.createElement('div');
    intro.className = 'partyCreationIntroductionPanel';
    intro.innerHTML = `
        <div class="sectionTitle" style="font-size:14px">⚔ DUNGEON INFINITUM ⚔</div>
        <p style="font-size:13px;margin:5px 0">Assemble your party and descend into infinite dungeons. Each hero has a unique skill tree — invest skill points on level-up to forge your legend.</p>`;
    container.appendChild(intro);

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;top:112px;left:0;right:0;bottom:60px;display:flex;gap:4px;padding:3px;';

    const leftPanel  = document.createElement('div');
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
                    id="removeBtn_${i}">✕</div>`;
            rp.appendChild(row);

            const inp = el(`nameInput_${i}`);
            inp.oninput = () => {
                selected[i].name = inp.value.trim();
                const valid = selected.length > 0 && selected.every(x => x.name.length > 0);
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

    // Build class list
    leftPanel.innerHTML = `<div style="font-weight:bold;padding:6px;border-bottom:1px solid #2b2b32">Choose Classes (up to 4)</div>`;
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
            if (h) { applyKillMarketToHero(h); G.party.push(h); }
        }
        launchGame();
    };

    wrap.appendChild(leftPanel);
    wrap.appendChild(rightPanel);
    container.appendChild(wrap);
    container.appendChild(startBtn);
    refresh();
}

function buildUpgradesTab() {
    const tab = el('upgradesTabContent');
    if (!tab || el('upgradesTabBuilt')) return;
    tab.innerHTML = '';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;overflow:hidden;';

    // Left: Monster Upgrades + Kill Market
    const left = document.createElement('div');
    left.className = 'upgradesLeft';
    left.style.cssText += 'overflow-y:auto;';

    left.innerHTML = `
        <div class="sectionTitle" style="margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #2b2b32;">Monster Upgrades</div>
        <div id="monsterUpgradeButtonsContainer"></div>
        <div style="font-size:10px;color:#555;margin-top:8px;margin-bottom:3px;letter-spacing:1px;">CURRENT VALUES</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
            <tr><td style="color:#aaa;">Gold drop chance</td><td id="goldDropChance" style="text-align:right;color:#fa0;">-</td></tr>
            <tr><td style="color:#aaa;">Max gold / drop</td><td id="maxGoldPerDrop" style="text-align:right;color:#fa0;">-</td></tr>
            <tr><td style="color:#aaa;">Min gold / drop</td><td id="minGoldPerDrop" style="text-align:right;color:#fa0;">-</td></tr>
            <tr><td style="color:#aaa;">Item drop chance</td><td id="itemDropChance" style="text-align:right;color:#fa0;">-</td></tr>
            <tr><td style="color:#aaa;">Gold multiplier</td><td id="goldMultVal" style="text-align:right;color:#fa0;">-</td></tr>
        </table>
        <div class="sectionTitle" style="margin-top:12px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #2b2b32;">☠ Kill Market</div>
        <div style="font-size:10px;color:#888;margin-bottom:6px;">Spend kills (100 kills = 1 mark) on permanent party bonuses.</div>
        <div id="killMarketAvail" style="font-size:11px;color:#f84;margin-bottom:6px;"></div>
        <div id="killMarketButtons"></div>`;

    // Right: Global Mastery + Arcane Research
    const right = document.createElement('div');
    right.className = 'upgradesRight';
    right.innerHTML = `
        <div class="sectionTitle" style="margin-bottom:2px;">⬡ Global Mastery</div>
        <div style="font-size:10px;color:#555;margin-bottom:6px;">Spend AP to permanently buff all heroes</div>
        <div id="globalApLabel" style="font-size:12px;color:#8cf;margin-bottom:6px;"></div>
        <div id="globalTreeContainer"></div>
        <div id="globalRecruitArea" style="margin-top:6px;"></div>
        <div class="sectionTitle" style="margin-top:14px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #2b2b32;">🔮 Arcane Research</div>
        <div style="font-size:10px;color:#888;margin-bottom:6px;">Spend AP on repeatable passive bonuses.</div>
        <div id="arcaneResearchButtons"></div>`;

    wrap.appendChild(left);
    wrap.appendChild(right);
    tab.appendChild(wrap);

    const marker = document.createElement('div');
    marker.id = 'upgradesTabBuilt';
    marker.style.display = 'none';
    tab.appendChild(marker);

    _globalTreeLastAP = -1;
    _kmLastKills = -1;
    _researchLastAP = -1;
}


function launchGame(fromSave) {
    G.started = true;
    // G.dungeons already built by onLoad before this is called

    el('partyCreationTabContent').style.display = 'none';
    el('gameTabContent').style.display = '';

    buildGameTabs();
    showTab('game');
    log('Your adventure into the infinite begins!', '#FA0');
    nextDungeon();
    startLoop();
}

function buildGameTabs() {
    const menu = el('gameTabMenu');
    menu.innerHTML = '';
    const ul = document.createElement('ul');
    const tabs = [
        ['game', 'Game'], ['skills', 'Characters'], ['upgrades', 'Upgrades'],
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

    if (G.tick % CFG.REGEN_TICKS === 0)       regenTick();
    if (G.tick % 4 === 0)                      farmTick();
    if (G.tick % CFG.UI_UPDATE_INTERVAL === 0) updateUI();
    if (G.tick % 20 === 0)                     checkAllAchievements();
    if (G.tick % CFG.SAVE_INTERVAL === 0)      saveGame();
}

// ===== ENTRY POINT =====
window.Game = {
    onLoad() {
        el('pauseButton').onclick = () => {
            G.paused = !G.paused;
            el('pauseButton').textContent = G.paused ? 'Resume' : 'Pause';
        };

        // Pre-build scrollable tab containers
        const dungeonsTab = el('dungeonsTabContent');
        if (dungeonsTab && !el('dungeonListContainer')) {
            dungeonsTab.innerHTML = `<div style="position:absolute;inset:0;overflow-y:auto;padding:5px;">
                <div class="sectionTitle" style="padding:5px;margin-bottom:5px">Dungeons &amp; Castles</div>
                <div id="dungeonListContainer"></div></div>`;
        }

        const achieveTab = el('achievementsTabContent');
        if (achieveTab && !el('achievementsContainer')) {
            achieveTab.innerHTML = `<div style="position:absolute;inset:0;overflow-y:auto;padding:5px;"><div id="achievementsContainer"></div></div>`;
        }

        const statsTab = el('statsTabContent');
        if (statsTab && !el('statsContainer')) {
            statsTab.innerHTML = `<div style="position:absolute;inset:0;overflow-y:auto;padding:5px;"><div id="statsContainer"></div></div>`;
        }

        // Characters tab — hero selector + left stats panel + right skill tree
        const skillsTab = el('skillsTabContent');
        if (skillsTab) {
            skillsTab.innerHTML = `
                <div class="skillHeroSelector" id="skillHeroSelector"></div>
                <div class="skillContentRow" id="skillContentRow">
                    <div class="skillStatsPanel" id="skillStatsPanel"></div>
                    <div class="skillTreeWrap" id="skillTreeWrap"></div>
                </div>`;
        }

        // Combat log — shorter to give room to party bars
        const gameTab = el('gameTabContent');
        if (gameTab && !el('combatLog')) {
            const logDiv = document.createElement('div');
            logDiv.style.cssText = 'position:absolute;top:3px;left:3px;width:730px;height:205px;border:1px solid #2b2b32;overflow-y:auto;padding:4px;font-size:11px;';
            logDiv.id = 'combatLog';
            gameTab.appendChild(logDiv);
        }

        // Right panel: upgrades + kill market + farms
        const rightPanelUpgrades = el('gameTabRightPanelUpgradeButtonContainer');
        if (rightPanelUpgrades && !el('sideUpgradesPanel')) {
            rightPanelUpgrades.innerHTML = '';
            rightPanelUpgrades.style.overflowY = 'auto';

            const mkSection = (label) => {
                const hdr = document.createElement('div');
                hdr.style.cssText = 'font-size:9px;color:#555;padding:4px 4px 2px;letter-spacing:1px;border-bottom:1px solid #1a1a24;';
                hdr.textContent = label;
                rightPanelUpgrades.appendChild(hdr);
            };

            mkSection('▲ GOLD UPGRADES');
            const upPanel = document.createElement('div');
            upPanel.id = 'sideUpgradesPanel';
            rightPanelUpgrades.appendChild(upPanel);

            mkSection('☠ KILL MARKET');
            const kmPanel = document.createElement('div');
            kmPanel.id = 'sideKillMarketPanel';
            rightPanelUpgrades.appendChild(kmPanel);

            mkSection('🏰 CASTLES & FARMS');
            const farmPanel = document.createElement('div');
            farmPanel.id = 'sideFarmsPanel';
            rightPanelUpgrades.appendChild(farmPanel);
        }

        // Attempt to resume from a previous save before showing party creation
        G.dungeons = buildDungeons();
        const hasSave = loadSave();
        if (hasSave && G.party.length > 0) {
            // Valid save — skip party creation and resume the game
            G.started = true;
            el('partyCreationTabContent').style.display = 'none';
            el('gameTabContent').style.display = '';
            buildGameTabs();
            showTab('game');
            log('Welcome back! Your adventure continues...', '#FA0');
            nextDungeon();
            startLoop();
        } else {
            // No save — show party creation screen
            buildPartyCreation();
        }
    }
};