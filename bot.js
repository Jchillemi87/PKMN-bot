const Damage = require('leftovers-again/src/game/damage');

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
    var moves;


    try {
        if (attacker.moves) {
            moves = attacker.moves.filter(move => !move.disabled);
        } else if (attacker.seenMoves) {
            moves = attacker.seenMoves;
        } else if (moves === undefined) {
            console.log("attacker: ", +attacker.id + " has no moves; undefined!");
            return;
        }

        //    moves.forEach(function(x) { console.log(x.move); });
        moves.forEach(function(x) {
            if (x === undefined) { console.log("undefined in bestDamage, skipped"); return; }
            if (!attacker.types) { console.log("attacker: " + attacker.id + " has no types"); return; }
            if (!defender.types) { console.log("defender: " + defender.id + " has no types"); return; }
            var damage = Damage.getDamageResult(attacker, defender, x);
            //console.log(damage[0]);
            //console.log(x.id);
            if (damage[0] > highest) {
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

function bestSwitch(state, my, opponenet) {
    if (my === undefined) {
        console.log("'my' is undifined in bestSwitch, skipped");
        return;
    }
    if (opponenet === undefined) {
        console.log("'opp' is undifined in bestSwitch, skipped");
        return;
    }
    var best;
    var minMaxDmg;
    var liveMon = my.filter(mon => !mon.active && !mon.dead);
    liveMon.forEach(function(x) {
        var damage = bestDamage(state, opponenet, x);
        if (!best) {
            best = x;
            minMaxDmg = damage[0];
            return;
        }
        if (damage[0] < minMaxDmg) {
            best = x;
            minMaxDmg = damage[0];
            return;
        }
    });
    return ([best, minMaxDmg]);
}

var myBestDamage, oppBestDamage, myBestSwitch;

async function getData(state) {
    try {
        if (state.self.active === undefined || state.opponent.active === undefined) {
            consoleconsole.log("Opponent or Self KOed");
        } else {
            myBestDamage = bestDamage(state, state.self.active, state.opponent.active)
            oppBestDamage = bestDamage(state, state.opponent.active, state.self.active);
            myBestSwitch = bestSwitch(state, state.self.reserve, state.opponent.active);
        }
    } catch (e) { console.log("error in getData: " + e); }
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
}

/**
 * Terminator
 *
 */
const { MOVE, SWITCH } = require('leftovers-again/src/decisions');

/**
 * Your code is pre-built with a very simple bot that chooses a team, then
 * picks randomly from valid moves on its turn.
 */
function test() {
    var temp;
    console.log("TEST FUNCTION");
    if (state.forceSwitch || state.teamPreview) {
        // our pokemon died :(
        // choose a random one
        const possibleMons = state.self.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            if (mon.dead) return false;
            if (mon.disabled) return false;
            return true;
        });
        const myMon = this.pickOne(possibleMons);
        console.log("selecting a random switch");
        temp = new SWITCH(myMon);
        //return new SWITCH(myMon);
        resolve(temp);
    }
    // pick a random move
    try {
        const possibleMoves = state.self.active.moves.filter(move => !move.disabled);
        const myMove = this.pickOne(possibleMoves);
        console.log("selecting a random move");
        //return new MOVE(myMove);
        temp = new MOVE(myMove);
        resolve(temp);
    } catch (e) {
        console.log('broke when checking possible moves:', e);
        console.dir(state);
        return null;
    }
}

class Terminator {



    /**
     * Here's the main loop of your bot. `state` contains everything about the
     * current state of the game. Please read the documentation for more
     * details.
     *
     * @param  {Object} state The current state of the game.
     *
     * @return {Decision}     A decision object.
     */
    decide(state) {
        if (!state.opponent.active) {
            console.log("Opponent has no active");
            return;
        }
        return new Promise(function(resolve, reject) {
            getData(state).then(() => {
                try {
                    console.log("My Best Move: " + myBestDamage[0].id + ", My Best Switch: " + myBestSwitch[0].id);
                    //console.log("Opponent's Best Move: " + oppBestDamage[0].id);
                    if (state.opponent.active.seenMoves)
                        console.log("Opponent's seenMoves: " + state.opponent.active.seenMoves);
                } catch (e) {
                    if (myBestDamage[0] === undefined) throw ("myBestDamage[0] undefined");
                    if (myBestSwitch[0] === undefined) throw ("myBestSwitch[0] undefined");
                    console.log("error after getData: ", e);
                    return;
                }
            }); /////////////**********************WHAT IF WE HAVE NO DAMAGING MOVES?**////////////////////////////////
            if (state.forceSwitch || state.teamPreview) {
                console.log("selecting my myBestSwitch[0]: ", myBestSwitch[0].id);
                resolve(new SWITCH(myBestSwitch[0]));
            } else {
                console.log("selecting my myBestDamage[0]: ", myBestDamage[0].id);
                resolve(new MOVE(myBestDamage[0]));
            }
        });
    }

    pickOne(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}

module.exports = Terminator;


var promise1 = new Promise(function(res, re) {
    res('Success!');
    re('TEST');
    throw ('throw');
});
/*
promise1.then(function(value) {
  console.log(value);
  // expected output: "Success!"
},function(value){
  console.log(value);
}).catch(function(value) {
  console.log(value);
  // expected output: "Success!"
});
*/