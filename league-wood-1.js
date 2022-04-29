var inputs = readline().split(' ');
const baseX = parseInt(inputs[0]); // The corner of the map representing your base
const baseY = parseInt(inputs[1]);

const heroesPerPlayer = parseInt(readline()); // Always 3
let heroFocus = new Array(heroesPerPlayer); // Define the focus per hero
heroFocus.fill(-1);

class Entity {
    constructor(inputs) {
        this.id = parseInt(inputs[0]); // Unique identifier
        this.type = parseInt(inputs[1]); // 0=monster, 1=your hero, 2=opponent hero
        this.x = parseInt(inputs[2]); // Position of this entity
        this.y = parseInt(inputs[3]);
        this.shieldLife = parseInt(inputs[4]); // Count down until shield spell fades
        this.isControlled = parseInt(inputs[5]); // Equals 1 when this entity is under a control spell

        // everything from here is for monsters only
        this.health = parseInt(inputs[6]); // Remaining health of this monster
        this.vx = parseInt(inputs[7]); // Trajectory of this monster
        this.vy = parseInt(inputs[8]);
        this.nearBase = parseInt(inputs[9]); // 0=monster with no target yet, 1=monster targeting a base
        this.threatFor = parseInt(inputs[10]); // Given this monster's trajectory, is it a threat to 1=your base, 2=your opponent's base, 0=neither
    }
}

function getDistance(x1, y1, x2, y2) {
    const a = x2 - x1;
    const b = y2 - y1;
    return (Math.sqrt(a * a + b * b));
}

function moveTo(x, y) {
    console.log('MOVE ' + x + ' ' + y);
}

function wait() {
    console.log('WAIT');
}

function spell(params) {
    console.log('SPELL ' + params);
}

function getEntityById(entities, id) {
    for (const entity in entities) {
        if (entity.id == id) {
            return (entity);
        }
    }
    return (null);
}

function getFocusPoint(targets, id) {
    if (heroFocus[id] > -1) { // if hero is focused on a target
        const focusedOn = getEntityById(targets, heroFocus[id]);
        if (focusedOn)
            return [focusedOn.x + focusedOn.vx, focusedOn.y + focusedOn.vy]; // return the position of this target as focus point
        else
            heroFocus[id] = -1; // if target is no longer there, reset the focus to nothing and continue
    }
    if (targets.length > id) { // focus only on an entity if there are more or equal targets as the id of the hero
        heroFocus[id] = targets[id].id; // set focus for this hero
        return [targets[id].x, targets[id].y]; // return position of the target
    }

    // if no target was found, return to a predefined position based on the hero id
    const middle = 2800;
    const sideLeft = 3800;
    const sideRight = 1200;
    if (baseX == 0 && baseY == 0) {
        if (id == 0)
            return [baseX + middle, baseY + middle];
        if (id == 1)
            return [baseX + sideRight, baseY + sideLeft];
        return [baseX + sideLeft, baseY + sideRight];
    }
    else {
        if (id == 0)
            return [baseX - middle, baseY - middle];
        if (id == 1)
            return [baseX - sideRight, baseY - sideLeft];
        return [baseX - sideLeft, baseY - sideRight];
    }
}

function isInBaseCamp(entity) {
    const dist = getDistance(baseX, baseY, entity.x, entity.y);
    return (dist <= 5000);
}

function isNearBaseCamp(entity) {
    const dist = getDistance(baseX, baseY, entity.x, entity.y);
    return (entity.threatFor == 1 && dist > 5000 && dist < 9000);
}

// game loop
while (true) {
    for (let i = 0; i < 2; i++) {
        var inputs = readline().split(' ');
        const health = parseInt(inputs[0]); // Each player's base health
        const mana = parseInt(inputs[1]); // Ignore in the first league; Spend ten mana to cast a spell
    }

    const entityCount = parseInt(readline()); // Amount of heros and monsters you can see
    const entities = new Array(entityCount);
    for (let i = 0; i < entityCount; i++) {
        var inputs = readline().split(' ');
        entities[i] = new Entity(inputs);
    }

    const targets = new Array(); // Array containing all targets
    for (let i = 0; i < entityCount; i++) {
        if (entities[i].type == 0 && (isInBaseCamp(entities[i]) || isNearBaseCamp(entities[i])))
        targets.push(entities[i]);
    }

    for (let i = 0; i < heroesPerPlayer; i++) {
        const focusPoint = getFocusPoint(targets, i);
        moveTo(focusPoint[0], focusPoint[1]);
    }
}
