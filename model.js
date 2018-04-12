const express = require('express')
const app = express()

var test = [];

app.all('/', (req, res) => res.send(test));

app.listen(3000, () => console.log('Example app listening on port 3000!'))

var temp;

module.exports.model = class model {
    constructor(state) {
        this.self = state.self;
        this.opponent = state.opponent;
        temp = state.self.reserve.filter((mon) => { if (mon.active) return true; })
        this.myActive = temp;
        this.opponentActive = state.opponent.reserve.filter((mon) => { if (mon.active) return true; });

        this.myTeam = state.self.reserve;
        this.opponentTeam = state.opponent.reserve;

        this.myRemaining = state.self.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            if (mon.dead) return false;
            if (mon.disabled) return false;
            return true;
        });

        this.opponentRemaining = state.opponent.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            if (mon.dead) return false;
            if (mon.disabled) return false;
            return true;
        });

        this.myBestDamage = bestDamage(state, this.myActive, this.opponentActive);
        /*        this.oppBestDamage = bestDamage(state, this.opponentActive, this.myActive);;
                
                this.myBestSwitch = bestSwitch(state, this.myRemaining, this.opponentActive);
            */

        console.log(Object.getOwnPropertyNames(this.myActive));
        console.log(typeof this.myActive[0].id);
    }
    print(model) {
        test.push("My Active: ", this.myActive, "\n");
        //        test.push("Opponent's Active: ",this.opponentActive, "\n");
    }
};

//HP = ((Base * 2 + IV + EV/4) * Level / 100) + Level + 10 **MAX IS BLISSY AT 714**
function calcHP(mon, ev = 84, iv = 31) {
    //console.log(mon.baseStats.hp + " " + ev + " " + iv + " " + mon.level);
    return ((((mon.baseStats.hp * 2) + iv + (ev / 4)) * mon.level) / 100) + mon.level + 10;
}

function getModifiedStat(stat, mod) {
    return mod > 0 ? Math.floor(stat * (2 + mod) / 2) :
        mod < 0 ? Math.floor(stat * 2 / (2 - mod)) :
        stat;
}

function getFinalSpeed(pokemon, weather) {
    var boostedSpeed;
    try {
        if (!pokemon.boosts) { boostedSpeed = 0; } else {
            //console.log("BOOSTED:"+pokemon.boosts.spe);
            boostedSpeed = pokemon.boosts.spe;
            var speed = getModifiedStat(pokemon.baseStats.spe, boostedSpeed);
            if (pokemon.item === 'Choice Scarf') {
                speed = Math.floor(speed * 1.5);
            } else if (pokemon.item === 'Macho Brace' || pokemon.item === 'Iron Ball') {
                speed = Math.floor(speed / 2);
            }
            if ((pokemon.ability === 'Chlorophyll' && weather.indexOf('Sun') !== -1) ||
                (pokemon.ability === 'Sand Rush' && weather === 'Sand') ||
                (pokemon.ability === 'Swift Swim' && weather.indexOf('Rain') !== -1)) {
                speed *= 2;
            }
        }
        return speed;
    } catch (e) {
        console.log("error in getFinalSpeed", e);
        console.dir(state);
    }
}
/**TODO: Check if we can KO without any chance to miss,
          Maybe return TURNS TO KILL instead
*/
function bestDamage(state, attacker, defender) {
    if (attacker === undefined) {
        console.log("'attacker' undifined in bestDamage, skipped");
        return;
    }

    if (defender === undefined) {
        console.log("'defender' undifined in bestDamage, skipped");
        return;
    }


    var highest = 0;
    var move;
    var moves = [];


    try {
        if (attacker.moves) {
            moves = attacker.moves.filter(move => !move.disabled);
        } else if (attacker.seenMoves) {
            //moves = attacker.seenMoves;
            attacker.seenMoves.forEach(function(x) {
                moves.push(util.researchMoveById(x));
            });

        } else if (!Array.isArray(moves) || !moves.length) { //Check if the array is defined and if it has length
            console.log("attacker: ", +attacker.id + " has no moves: undefined!");
            return;
        }

        console.log("attacker: " + attacker.id + " has no types, attempting to fix.");
        util.researchPokemonById(attacker.id).types.forEach(function(x, i) {
            attacker.types[i] = x;
        });
        //    moves.forEach(function(x) { console.log(x.move); });
        if (!Array.isArray(moves) || !moves.length) { console.log("ERROR in bestDamage, Skipping. moves:", moves); return; }
        moves.forEach(function(x) {
            util.researchPokemonById(attacker.id);
            if (!attacker.types) {

            }
            if (!defender.types) {
                console.log("defender: " + defender.id + " has no types, attempting to fix.");
            }
            var damage = Damage.getDamageResult(attacker, defender, x);
            /*console.log("damage: ", damage);
            console.log("damage[0]: " , damage);
            console.log("x.id: ", x.id);*/
            if (damage[0] > highest && damage[0] > 0) {
                console.log("damage[0]: ", damage[0]);
                highest = damage[0];
                move = x;
            }
        });
        return [move, highest];
    } catch (e) {
        console.log('Caught ERROR IN bestDamage():', e);
        console.dir(state);
    }
}

function bestSwitch(state, my, opponent) {
    if (my === undefined) {
        console.log("'my' is undefined in bestSwitch, skipped");
        return;
    }
    if (opponent === undefined) {
        console.log("'opp' is undefined in bestSwitch, skipped");
        return;
    } else {
        console.log("opp ID: ", opponent.id);
        console.log("Seen Opp Moves?: ", Array.isArray(opponent.seenMoves));
        console.log("How many seen moves?: ", opponent.seenMoves.length);
    }

    if (opponent.seenMoves.length == 0) {
        console.log("opponent.seenMoves.length == 0: ", opponent.seenMoves.length == 0);
        console.log("No Best Switch Found");
        return undefined;
    }

    var best;
    var minMaxDmg;
    //    console.log(my);
    var liveMon = my.filter((mon) => {
        if (mon.condition === '0 fnt') return false;
        if (mon.active) return false;
        if (mon.dead) return false;
        if (mon.disabled) return false;
        return true;
    });

    //        console.log("liveMon",liveMon[0].id);

    if (!Array.isArray(liveMon) || !liveMon.length) {
        console.log(!Array.isArray(liveMon));
        console.log(!liveMon.length);
        console.log("No PKMN to Switch to");
    } else {
        console.log(!Array.isArray(liveMon));
        console.log(!liveMon.length);
        liveMon.forEach(function(x) {
            var damage = bestDamage(state, opponent, x);
            console.log("Testing Move:", damage[0].id);
            console.log(x.id, "estimate of damage taken: ", damage[1], " - from:", damage[0].id);
            if (!best) {
                console.log(x.id);
                best = x;
                minMaxDmg = damage[0];
            } else if (damage[1] < minMaxDmg) {
                best = x;
                minMaxDmg = damage[0];
            }
        });
    };
    console.log("best: ", best.id);
    return ([best, minMaxDmg]);
}

function getBestDamages(state) {
    console.log("Finding My Best Move");
    try {
        if (state.self.active) {
            myBestDamage = bestDamage(state, state.self.active, state.opponent.active);
            if (typeof myBestDamage !== undefined)
                console.log("My Best Move Found: ", myBestDamage[0].id);
        } else { myBestDamage = undefined; }

        if (Array.isArray(state.opponent.active.seenMoves) && state.opponent.active.seenMoves.length) {
            console.log("Finding Opponent's Best Move");
            oppBestDamage = bestDamage(state, state.opponent.active, state.self.active);
            if (Array.isArray(oppBestDamage) && oppBestDamage.length > 0)
                console.log("Opponent's Move Found: ", oppBestDamage[0].id);
            else
                console.log("oppBestDamage[0].id", oppBestDamage[0].id);
        }
    } catch (e) { console.log(e); }
}

module.exports.getData = async function getData(state, model) {
    /*    try {
            console.log("\nGetting Best Damage Moves");
            getBestDamages(state);
            //        }
        } catch (e) { console.log("error in getData - getBestDamages:" + e); }
        try {
            console.log("\nGetting My Best Switch");
            myBestSwitch = bestSwitch(state, state.self.reserve, state.opponent.active);

        } catch (e) {
            console.log("error in getData - bestSwitch:" + e);
        }
    */
}

/*
    var data = [
        //TODO: My Active PKMN Value,
        state.self.active.hp,
        state.self.active.statuses,
        await getFinalSpeed(state.self.active) > await getFinalSpeed(state.opponent.active),
        //TODO: Active Opponent Value,
        calcHP(state.opponent.active),
        state.opponent.active.statuses,
        myBestDamage[0], //TODO: Only Check best move if we are not in a Forced Switched State
        myBestDamage[1],
        //TODO: non damage moves for my opponent and I + Accuracy
        //TODO: opponent's best switch
        myBestSwitch[0],
        myBestSwitch[1],

        state.weather,
    ];*/