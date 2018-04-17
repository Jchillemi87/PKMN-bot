const Damage = require('leftovers-again/src/game/damage');
const express = require('express');
const util = require('leftovers-again/src/pokeutil.js');

const app = express();

var test = [];

app.all('/', (req, res) => res.send(test));

app.listen(3000, () => console.log('Example app listening on port 3000!'))

var temp;

module.exports.model = class model {

    constructor(state) {
        this.self = state.self;
        this.opponent = state.opponent;

        temp = state.self.reserve.filter(mon => mon.active);
        this.myActive = state.self.active;

        temp = state.opponent.reserve.filter(mon => mon.active);
        this.opponentActive = state.opponent.active;

        this.myTeam = state.self.reserve;
        this.opponentTeam = state.opponent.reserve;

        temp = state.self.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            if (mon.dead) return false;
            if (mon.disabled) return false;
            return true;
        });
        this.myRemaining = temp;

        temp = state.opponent.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            if (mon.dead) return false;
            if (mon.disabled) return false;
            return true;
        });
        this.opponentRemaining = temp;

        if (this.myActive && this.opponentActive) {
            console.log("\nGetting My Best Damage Move");
            this.myBestDamage = bestDamage(state, this.myActive, this.opponentActive);
            console.log("\nGetting Opponent's Best Damage Move");
            this.oppBestDamage = bestDamage(state, this.opponentActive, this.myActive);
            console.log("\nAfter Best Damages");
        }
        this.myBestSwitch = [null, null];
        if (this.myRemaining.length > 0) {
            this.myBestSwitch = bestSwitch(state, this.myRemaining, this.opponentActive);
        }
    }
    print(model) {
        test.push("My Active: ", this.myActive, "\n");
        test.push("Opponent's Active: ", this.opponentActive, "\n");

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
	console.log("typeof attacker: ", attacker.id);
    if (attacker.id === undefined || attacker == null) {
        console.log("'attacker' undefined in bestDamage, skipped");
        return [null, null];
    }

    console.log("typeof defender: ", defender.id);

    if (defender.id === undefined || defender == null) {
        console.log("'defender' undefined in bestDamage, skipped");
        return [null, null];
    }


    var highest = 0;
    var move;
    var moves = [];


    try {
        if (attacker.moves) {

            if (typeof attacker.volatileStatus === undefined && attacker.volatileStatus.filter(x => { if (x == "lockedmove") return true; }) && attacker.prevMoves.length > 0) {
                console.log("attacker.volatileStatus: ", attacker.volatileStatus);

                console.log(attacker.volatileStatus.filter(x => { if (x == "lockedmove") return true; }));
                console.log(attacker.prevMoves.length > 0);
                moves = util.researchMoveById(attacker.prevMoves[0]);
            } else {
                moves = attacker.moves;
            }
        } else if (attacker.seenMoves) {

            //moves = attacker.seenMoves;
            attacker.seenMoves.forEach(function(x) {
                moves.push(util.researchMoveById(x));
            });

        } else if (!Array.isArray(moves) || !moves.length) { //Check if the array is defined and if it has length

            console.log("attacker: ", +attacker.id + " has no moves: undefined!");
            return [null, null];
        }
        console.log("MOVES: ", moves.length);
        moves = moves.filter(move => {
            if (move.disabled == true) return false;
            else return true;
        });
        console.log("MOVES: ", moves.length);
        moves.forEach(function(x) {
            console.log("MOVE: ", x.id);
        });

        if (!Array.isArray(moves) || !moves.length) { /*console.log("ERROR in bestDamage, Skipping. moves:", moves);*/ return [null, null]; }

        moves.forEach(function(x) {
            
            if (!attacker.types) {
                console.log("attacker: " + attacker.id + " has no types, attempting to fix.");
                util.researchPokemonById(attacker.id).types.forEach(function(x, i) {
                    attacker.types[i] = x;
                });
            }

            if (!defender.types) {
                console.log("defender: " + defender.id + " has no types, attempting to fix.");
                util.researchPokemonById(defender.id).types.forEach(function(x, i) {
                    defender.types[i] = x;
                });
            }

            var damage = Damage.getDamageResult(attacker, defender, x);
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

    console.log("opp ID: ", opponent.id);
    //console.log("Seen Opp Moves?: ", Array.isArray(opponent.seenMoves));
    console.log("opponent.seenMoves.length: ", opponent.seenMoves.length);

    if (opponent.seenMoves.length == 0) {
        console.log("No Best Switch Found");
        return [null, null];
    }

    var best = null;
    var minMaxDmg = null;
    var damage = [null, null];

    my.forEach(function(x) {
        console.log("testing: ", x.id, " vs ", opponent.id);
        var damage = bestDamage(state, opponent, x);
        console.log("damage: ",damage);
        if (typeof damage !== undefined) {
            console.log(damage);
            if (damage[1] == 0) {
                return null;
            } //non damaging move?}
            else {
                //console.log("damage:", damage);
                console.log("Testing Move:", damage[0].id);
                console.log(x.id, "estimate of damage taken: ", damage[1], " - from:", damage[0].id);
                if (best == null) {
                    console.log(x.id);
                    best = x;
                    minMaxDmg = damage[1];
                } else if (damage[1] < minMaxDmg) {
                    best = x;
                    minMaxDmg = damage[1];
                }
            }
        }
        console.log("test02");
    });

    if (best != null) {
        console.log("best: ", best.id);
        return ([best, minMaxDmg]);
    } else {
        return [null, 0];
    }
}

/*
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
*/