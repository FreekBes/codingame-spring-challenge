function getDistance(x1, y1, x2, y2) {
    const a = x2 - x1;
    const b = y2 - y1;
    return (Math.sqrt(a * a + b * b));
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

    getDistanceTo(posOrEntity) {
        return (getDistance(this.x, this.y, posOrEntity.x, posOrEntity.y));
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
    constructor(base, inputs, heroNum) {
        super(inputs);

        this.focusMonsterId = -1;
        this.heroNum = heroNum;
        this.defendBase = base;
        switch (heroNum) {
            default: this.origFocus = getPositionBasedOnBase(base, 1200, 1200); break;
            case 1: this.origFocus = getPositionBasedOnBase(base, 4200, 1400); break;
            case 2: this.origFocus = getPositionBasedOnBase(base, 1400, 4200); break;
        }
        this.focusCoords = this.origFocus.clone();
    }

    moveTo(x, y) {
        console.log('MOVE ' + x + ' ' + y);
    }
    
    wait() {
        console.log('WAIT');
    }
    
    wind(x, y) {
        console.log('SPELL WIND ' + x + ' ' + y);
    }

    setFocusOnCoords(x, y) {
        this.focusCoords.x = x;
        this.focusCoords.y = y;
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

    get isAtFocusPoint() {
        return (this.getDistanceTo(this.focusCoords) == 0);
    }

    findClosestTarget(targets) {
        const targetsNum = targets.length;
        const dists = new Array(targetsNum);
        for (let i = 0; i < targetsNum; i++) {
            dists[i] = this.getDistanceTo(targets[i]);
        }
        const smallestDist = Math.min.apply(null, dists);
        return [targets[dists.indexOf(smallestDist)], smallestDist];
    }

    findFocusPoint(targets) {
        const distanceFromDefence = this.getDistanceTo(this.origFocus);
        
        // target existing target
        if (this.hasFocusMonster) {
            const focusedMonster = getEntityById(targets, this.focusMonsterId);
            if (focusedMonster && (this.heroNum != 0 || distanceFromDefence < 1000)) {
                this.setFocusOnMonster(focusedMonster);
                if (focusedMonster.isCriticallyInBaseCamp(this.defendBase) && this.getDistanceTo(focusedMonster) < 1280)
                    return (2);
                return (1);
            }
            else
                this.clearFocusOnMonster();
        }

        if (targets.length > 0 && (this.heroNum != 0 || distanceFromDefence < 1000)) {
            // find a critically close to base camp target
            for (const target of targets) {
                if (target.isCriticallyInBaseCamp(this.defendBase)) {
                    this.setFocusOnMonster(target);
                    return (1);
                }
            }

            // find a close by target
            const closestTarget = this.findClosestTarget(targets);
            if (closestTarget[1] < 2000) {
                this.setFocusOnMonster(closestTarget[0]);
                return (1);
            }

            // find a next target
            if (targets.length > this.heroNum) {
                this.setFocusOnMonster(targets[this.heroNum]);
                return (1);
            }
        }
        // go to default position
        this.setFocusOnCoords(this.origFocus.x, this.origFocus.y);
        return (0);
    }

    moveToFocusPoint() {
        this.moveTo(this.focusCoords.x, this.focusCoords.y);
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
        return (this.threatFor == 1 && dist > 5000 && dist < 9000);
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
            if (heroes[heroNum])
                heroes[heroNum].update(inputs);
            else
                heroes[heroNum] = new Hero(bases[0], inputs, heroNum);
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
        if (entity.type == 0 && (entity.isInBaseCamp(bases[0]) || entity.isNearBaseCamp(bases[0])))
            targets.push(entity);
    }

    for (const hero of heroes) {
        const action = hero.findFocusPoint(targets);
        switch (action) {
            default:
            case 0:
            case 1:
                if (!hero.isAtFocusPoint)    
                    hero.moveToFocusPoint();
                else
                    hero.wait();
                break;
            case 2:
                if (bases[0].mana > 10)
                    hero.wind(bases[1].x, bases[1].y);
                else
                    hero.moveToFocusPoint();
                break;
        }
    }
}
