function getDistance(x1, y1, x2, y2) {
    const a = x2 - x1;
    const b = y2 - y1;
    return (Math.sqrt(a * a + b * b));
}

function getRandomValue(min, max) {
    return (Math.floor(Math.random() * (max - min) + min));
}

class Position {
    update(x, y) {
        this.x = x;
        this.y = y;
    }

    constructor(x, y) {
        this.update(x, y);
    }

    clone() {
        return (new Position(this.x, this.y));
    }

    getDistanceTo(posOrEntity) {
        return (getDistance(this.x, this.y, posOrEntity.x, posOrEntity.y));
    }
}

function getPositionBasedOnBase(base, x, y) {
    if (base.x == 0 && base.y == 0) {
        return (new Position(base.x + x, base.y + y));
    }
    return (new Position(base.x - x, base.y - y));
}

class Entity extends Position {
    update(inputs) {
        super.update(inputs[2], inputs[3]);

        this.id = parseInt(inputs[0]); // Unique identifier
        this.type = parseInt(inputs[1]); // 0=monster, 1=your hero, 2=opponent hero
        this.shieldLife = parseInt(inputs[4]); // Count down until shield spell fades
        this.isControlled = parseInt(inputs[5]); // Equals 1 when this entity is under a control spell
    }

    constructor(inputs) {
        super(inputs[2], inputs[3]);

        this.update(inputs);
    }
    
    isInBaseCamp(base) {
        const dist = getDistance(base.x, base.y, this.x, this.y);
        return (dist <= 5000);
    }
    
    isCriticallyInBaseCamp(base) {
        const dist = getDistance(base.x, base.y, this.x, this.y);
        return (dist <= 2000);
    }
}

class Hero extends Entity {
    constructor(defendBase, attackBase, inputs, heroNum, patrolRange, poiX, poiY) {
        super(inputs);

        this.focusMonsterId = -1;
        this.heroNum = heroNum;
        this.defendBase = defendBase;
        this.attackBase = attackBase;
        this.patrolRange = patrolRange;
        this.origFocus = getPositionBasedOnBase(defendBase, poiX, poiY);
        this.focusCoords = this.origFocus.clone();
    }

    moveTo(x, y, text) {
        console.log('MOVE ' + x + ' ' + y + (text ? ' ' + text : ''));
    }
    
    wait(text) {
        console.log('WAIT');
    }
    
    wind(x, y, text) {
        console.log('SPELL WIND ' + x + ' ' + y + (text ? ' ' + text : ''));
    }

    shield(entityId, text) {
        console.log('SPELL SHIELD ' + entityId + (text ? ' ' + text : ''));
    }

    control(entityId, x, y, text) {
        console.log('SPELL CONTROL ' + entityId + ' ' + x + ' ' + y + (text ? ' ' + text : ''));
    }

    setFocusOnCoords(x, y) {
        this.focusCoords.x = x;
        this.focusCoords.y = y;
    }

    moveToFocusPoint(text) {
        this.moveTo(this.focusCoords.x, this.focusCoords.y, text);
    }

    patrol() {
        this.setFocusOnCoords(this.origFocus.x + getRandomValue(-this.patrolRange, this.patrolRange), this.origFocus.y + getRandomValue(-this.patrolRange, this.patrolRange));
        this.moveToFocusPoint();
    }

    setFocusOnMonster(monster) {
        this.focusMonsterId = monster.id;
        this.setFocusOnCoords(monster.x, monster.y);
    }

    clearFocusOnMonster() {
        this.focusMonsterId = -1;
    }

    get hasFocusMonster() {
        return (this.focusMonsterId > -1);
    }

    static isAlreadyFocusedByOtherHero(heroes, entityId) {
        for (const hero of heroes) {
            if (hero.focusMonsterId == entityId) {
                return (true);
            }
        }
        return (false);
    }

    get isAtFocusPoint() {
        return (this.getDistanceTo(this.focusCoords) == 0);
    }

    get hasNonDefaultFocusPoint() {
        return (this.focusCoords.x != this.origFocus.x || this.focusCoords.y != this.origFocus.y);
    }

    findClosestFoe(targets, exclude) {
        if (!exclude)
            exclude = new Array();
        const targetsNum = targets.length;
        const dists = new Array(targetsNum);
        for (let i = 0; i < targetsNum; i++) {
            if (targets[i].threatFor != 1 && exclude.indexOf(targets[i].id) > -1)
                dists[i] = Infinity;
            else
                dists[i] = this.getDistanceTo(targets[i]);
        }
        const smallestDist = Math.min.apply(null, dists);
        const target = targets[dists.indexOf(smallestDist)];
        if (!target || exclude.indexOf(target.id) > -1) {
            return [null, NaN];
        }
        return [target, smallestDist];
    }

    findClosestTarget(targets, exclude) {
        if (!exclude)
            exclude = new Array();
        const targetsNum = targets.length;
        const dists = new Array(targetsNum);
        for (let i = 0; i < targetsNum; i++) {
            if (exclude.indexOf(targets[i].id) > -1)
                dists[i] = Infinity;
            else
                dists[i] = this.getDistanceTo(targets[i]);
        }
        const smallestDist = Math.min.apply(null, dists);
        const smallestIndex = dists.indexOf(smallestDist);
        const target = targets[smallestIndex];
        if (!target || exclude.indexOf(target.id) > -1) {
            return [null, NaN];
        }
        return [target, smallestDist];
    }
}

class Defender extends Hero {
    constructor(defendBase, attackBase, inputs, heroNum) {
        super(defendBase, attackBase, inputs, heroNum, 2500, 1000, 1000);
    }

    defend(mana, target) {
        const distanceToBase = this.getDistanceTo(this.defendBase);
        const distanceToTarget = this.getDistanceTo(target);
        const targetDistanceToBase = target.getDistanceTo(this.defendBase);

        if (mana > 10 && target.shieldLife == 0) {
            if (distanceToBase > targetDistanceToBase && distanceToTarget < 2200 && (distanceToTarget > 800 || targetDistanceToBase < 500)) {
                // target is closer to base than hero is but not in attackable range, move it back to hero
                this.control(target.id, this.x, this.y);
                return (3);
            }
            else if (target.isCriticallyInBaseCamp(this.defendBase) && distanceToTarget < 1280) {
                this.wind(9000, 4500);
                return (2);
            }
        }
        this.moveToFocusPoint();
        return (1);
    }

    act(mana, heroes, targets) {
        let focusedMonster = getEntityById(targets, this.focusMonsterId);
        if (!focusedMonster && this.focusMonsterId > -1)
            this.clearFocusOnMonster();

        // if many targets nearby and in the basecamp, shoot them all back to the middle
        if (mana > 10 && this.isInBaseCamp(this.defendBase)) {
            let amountNearby = 0;
            for (const target of targets) {
                if (target.shieldLife == 0 && this.getDistanceTo(target) < 1280)
                    amountNearby++;
            }
            if (amountNearby >= 3) {
                this.wind(9000, 4500, 'NICE');
                return (2);
            }
        }

        // if focused monster is no longer in the basecamp, let go of focus
        if (focusedMonster && !focusedMonster.isInBaseCamp(this.defendBase)) {
            this.clearFocusOnMonster();
            focusedMonster = null;
        }

        // if current target is not in the critical part basecamp but there is one actually there, target it now!
        if (focusedMonster && !focusedMonster.isCriticallyInBaseCamp(this.defendBase)) {
            for (const target of targets) {
                if (target.isCriticallyInBaseCamp(this.defendBase) && !Hero.isAlreadyFocusedByOtherHero(heroes, target.id)) {
                    this.setFocusOnMonster(target);
                    return (this.defend(mana, target));
                }
            }
        }

        // go after existing target
        if (focusedMonster) {
            this.setFocusOnMonster(focusedMonster);
            return (this.defend(mana, focusedMonster));
        }

        // if an enemy is near, protect
        if (mana > 10) {
            for (const target of targets) {
                if (this.getDistanceTo(target) < 3000 && target.type == 2) {
                    if (this.shieldLife == 0) {
                        this.shield(this.id);
                        return (4);
                    }
                    else if (target.shieldLife == 0 && this.getDistanceTo(target) < 2200) {
                        this.control(target.id, this.attackBase.x, this.attackBase.y);
                        return (3);
                    }
                }
            }
        }

        // find a target
        const closestTarget = this.findClosestFoe(targets);
        if (closestTarget[0] && closestTarget[0].isInBaseCamp(this.defendBase) && !Hero.isAlreadyFocusedByOtherHero(heroes, closestTarget[0].id)) {
            this.setFocusOnMonster(closestTarget[0]);
            return (this.defend(mana, closestTarget[0]));
        }

        this.patrol();
        return (0);
    }
}

class Farmer extends Hero {
    constructor(defendBase, attackBase, inputs, heroNum) {
        super(defendBase, attackBase, inputs, heroNum, 6000, 4500, 3000);
    }

    attack(mana, target) {
        this.moveToFocusPoint();
        return (1);
    }

    act(mana, heroes, targets) {
        const distanceFromPOI = this.getDistanceTo(this.origFocus);

        if (targets.length > 0 && distanceFromPOI < this.patrolRange) {
            // find a close by target
            const closestTarget = this.findClosestTarget(targets);
            if (closestTarget && closestTarget[1] < 4000) {
                this.setFocusOnMonster(closestTarget[0]);
                return (this.attack(mana, closestTarget[0]));
            }
        }

        this.patrol();
        return (0);
    }
}

class Attacker extends Hero {
    constructor(defendBase, attackBase, inputs, heroNum) {
        super(defendBase, attackBase, inputs, heroNum, 5000, 12000, 5000);

        this.diverged = new Array();
        this.lastDivergedId = -1;
        this.linePos = new Array(2);
        this.linePos[0] = getPositionBasedOnBase(defendBase, 13000, 0);
        this.linePos[1] = getPositionBasedOnBase(defendBase, 7000, 9000);
        this.lastLinePos = 0;
    }

    patrolLine() {
        if (this.x == this.linePos[this.lastLinePos].x && this.y == this.linePos[this.lastLinePos].y) {
            if (this.lastLinePos == 0)
                this.lastLinePos = 1;
            else
                this.lastLinePos = 0;
        }
        this.setFocusOnCoords(this.linePos[this.lastLinePos].x, this.linePos[this.lastLinePos].y);
        this.moveToFocusPoint();
    }

    attack(mana, target, distance) {
        if (target.health > 10 && mana > 10 && distance < 2200 && !target.isInBaseCamp(this.defendBase) && !target.isInBaseCamp(this.attackBase)) {
            this.control(target.id, this.attackBase.x, this.attackBase.y);
            this.diverged.push(target.id);
            this.lastDiverged = target.id;
            return (2);
        }
        this.moveToFocusPoint();
        return (0);
    }

    act(mana, heroes, targets) {
        const lastDiverged = getEntityById(targets, this.lastDivergedId);

        if (mana > 10 && lastDiverged && this.getDistanceTo(lastDiverged) < 2200) {
            this.shield(this.lastDivergedId);
            this.lastDiverged = -1;
            return (4);
        }
        else {
            // const target = this.getTargetInDirOfEnemyBase(targets);
            const target = this.findClosestTarget(targets, this.diverged)[0];
            if (target) {
                this.setFocusOnMonster(target);
                return (this.attack(mana, target, this.getDistanceTo(target)));
            }
        }
        
        this.patrol();
        return (0);
    }
}

class Monster extends Entity {
    constructor(inputs) {
        super(inputs);

        this.health = parseInt(inputs[6]); // Remaining health of this monster
        this.vx = parseInt(inputs[7]); // Trajectory of this monster
        this.vy = parseInt(inputs[8]);
        this.nearBase = parseInt(inputs[9]); // 0=monster with no target yet, 1=monster targeting a base
        this.threatFor = parseInt(inputs[10]); // Given this monster's trajectory, is it a threat to 1=your base, 2=your opponent's base, 0=neither
    }

    isNearBaseCamp(base) {
        const dist = getDistance(base.x, base.y, this.x, this.y);
        return (dist > 5000 && dist < 9000);
    }
}

class Base extends Position {
    constructor(x, y) {
        super(x, y);

        this.health = 3;
        this.mana = 0;
    }

    setHealth(health) {
        this.health = parseInt(health);
    }

    setMana(mana) {
        this.mana = parseInt(mana);
    }

    invertClone() {
        if (this.x == 0 && this.y == 0)
            return (new Base(17630, 9000));
        return (new Base(0, 0));
    }
}

function getEntityById(entities, id) {
    if (id == -1)
        return (null);
    for (const entity of entities) {
        if (entity.id == id) {
            return (entity);
        }
    }
    return (null);
}

// game init
let inputs = readline().split(' ');
const bases = new Array(2);
bases[0] = new Base(parseInt(inputs[0]), parseInt(inputs[1]));
bases[1] = bases[0].invertClone();

const heroesPerPlayer = parseInt(readline()); // Always 3
const heroes = new Array(heroesPerPlayer);

// game loop
while (true) {
    for (let i = 0; i < 2; i++) {
        let inputs = readline().split(' ');
        bases[i].setHealth(inputs[0]); // Each player's base health
        bases[i].setMana(inputs[1]); // Spend ten mana to cast a spell
    }

    const entityCount = parseInt(readline()); // Amount of heros and monsters you can see
    const entities = new Array(entityCount);
    let heroNum = 0;
    for (let i = 0; i < entityCount; i++) {
        let inputs = readline().split(' ');
        if (inputs[1] == 1) {
            if (heroes[heroNum]) {
                heroes[heroNum].update(inputs);
            }
            else {
                switch (heroNum) {
                    default: case 0: case 1: heroes[heroNum] = new Defender(bases[0], bases[1], inputs, heroNum); break;
                    // case 1: heroes[heroNum] = new Farmer(bases[0], bases[1], inputs, heroNum); break;
                    case 2: heroes[heroNum] = new Attacker(bases[0], bases[1], inputs, heroNum); break;
                }
            }
            entities[i] = heroes[heroNum];
            heroNum++;
        }
        else if (inputs[1] == 2) {
            entities[i] = new Entity(inputs);
        }
        else if (inputs[1] == 0) {
            entities[i] = new Monster(inputs);
        }
    }

    const targets = new Array(); // Array containing all targets
    for (const entity of entities) {
        if (entity.type == 0 && (entity.isInBaseCamp(bases[0]) || entity.isNearBaseCamp(bases[0] || true)))
            targets.push(entity);
        else if (entity.type == 2)
            targets.push(entity);
    }

    for (const hero of heroes) {
        const action = hero.act(bases[0].mana, heroes, targets);
        if (action == 2 || action == 3)
            bases[0].mana -= 10; // deplete mana when used action was a spell
    }
}
