const Damage = require('leftovers-again/src/game/damage');
const express = require('express');
const util = require('leftovers-again/src/pokeutil.js');
const formats = require('leftovers-again/src/data/formats.json');
const chalk = require('chalk');

const app = express();

var test = [];

app.all('/', (req, res) => res.send(test));

app.listen(3000, () => console.log('Example app listening on port 3000!'))

var temp;

module.exports.model = class model {

    constructor(state) {
        try {
            this.self = state.self;
            this.opponent = state.opponent;

            //temp = state.self.reserve.filter(mon => mon.active);
            this.myActive = state.self.active;

            //temp = state.opponent.reserve.filter(mon => mon.active);
            this.opponentActive = state.opponent.active;
            this.opponentActive.maxhp = calcHP(this.opponentActive);
            this.opponentActive.hp *= this.opponentActive.maxhp / 100;

            console.log("Opponent's HP: ", this.opponentActive.hp, "/", this.opponentActive.maxhp);

            console.log("getFinalSpeed(this.opponentActive,state.weather): ", getFinalSpeed(this.opponentActive, state.weather));

            this.myTeam = state.self.reserve;
            this.opponentTeam = state.opponent.reserve;

            if (state.self.reserve != null) {
                this.myRemaining = state.self.reserve.filter((mon) => {
                    if (mon.condition === '0 fnt') return false;
                    if (mon.active) return false;
                    if (mon.dead) return false;
                    if (mon.disabled) return false;
                    return true;
                });
            }

            if (state.opponent.reserve != null) {
                this.opponentRemaining = state.opponent.reserve.filter((mon) => {
                    if (mon.condition === '0 fnt') return false;
                    if (mon.active) return false;
                    if (mon.dead) return false;
                    if (mon.disabled) return false;
                    return true;
                });
            }

            console.log(this.opponentActive);

            if (this.opponentActive) {
                if (this.opponentActive.boostedStats === undefined) {
                    this.opponentActive.boostedStats = {};
                    this.opponentActive.boostedStats.spe = 1;
                }
                this.opponentActive.boostedStats.spe = getFinalSpeed(this.opponentActive, state.weather);

                this.opponent.preMoves = formats[this.opponentActive.id].randomBattleMoves;

                console.log("\nGetting Opponent's Best Damage Move");
                this.opponent.bestDamage = bestDamage(state, this.opponentActive, this.myActive, this.opponent.preMoves);
            }

            if (this.myActive != 0 && this.opponentActive) {

                if (this.myActive.boostedStats !== undefined && this.opponentActive.boostedStats !== undefined) {
                    this.isFaster = this.myActive.boostedStats.spe > this.opponentActive.boostedStats.spe;
                    console.log("We are faster: ", this.isFaster);
                }

                console.log("\nGetting My Best Damage Move");
                this.myBestDamage = bestDamage(state, this.myActive, this.opponentActive);
                console.log(this.myBestDamage);

                console.log("\nGetting All Possible Damage Moves for Opponent: ", this.opponentActive.id, ":\n", formats[this.opponentActive.id].randomBattleMoves);

                //                console.log(duelSim(state, this.myActive, this.opponentActive, this.opponent.preMoves));

                /*console.log("this.myActive.perfAcc: ",this.myActive.perfAcc);
                console.log("this.opponentActive.perfAcc: ",this.opponentActive.perfAcc);*/

                console.log("\nAfter Best Damages");
            }

            this.myDefSwitch = [null, null];
            if (this.myRemaining.length > 0) {
                this.myDefSwitch = bestDefSwitch(state, this.myRemaining, this.opponentActive, this.opponent.preMoves);
            }

            this.myOffSwitch = [null,null];

        } catch (e) { console.log("ERROR: ", e); }
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
    return Math.floor((((mon.baseStats.hp * 2) + iv + (ev / 4)) * mon.level) / 100) + mon.level + 10;
}

function calcStat(base, lvl = 100, ev = 84, iv = 31, nature = 1) {
    return Math.floor(Math.floor(((((2 * base) + iv + (ev / 4)) * lvl) / 100) + 5) * nature);
}

function getModifiedStat(stat, mod) {
    return mod > 0 ? Math.floor(stat * (2 + mod) / 2) :
        mod < 0 ? Math.floor(stat * 2 / (2 - mod)) :
        stat;
}

function getFinalSpeed(pokemon, weather) {
    var speed = calcStat(pokemon.baseStats.spe, pokemon.level);
    var boostedSpeed;

    try {
        if (!pokemon.boosts) { boostedSpeed = 0; } else { boostedSpeed = pokemon.boosts.spe; }
        speed = getModifiedStat(speed, boostedSpeed);

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

        return speed;
    } catch (e) {
        console.log("error in getFinalSpeed", e);
        console.dir(state);
    }
}

function moveLockCheck(moves) {
    //console.log("MOVES: ", moves.length);
    moves = moves.filter(move => {
        if (move.disabled == true) return false;
        else return true;
    });
    //        console.log("MOVES: ", moves.length);
    moves.forEach(function(x) {
        //            console.log("MOVE: ", x.id);
    });

    return moves;
}

function bestDamage(state, attacker, defender, preMoves) {
    if (attacker.id === undefined || attacker == null) {
        console.log("'attacker' undefined in bestDamage, skipped");
        return [null, null];
    }

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
                /*console.log("attacker.volatileStatus: ", attacker.volatileStatus);

                console.log(attacker.volatileStatus.filter(x => { if (x == "lockedmove") return true; }));
                console.log(attacker.prevMoves.length > 0);*/
                moves = util.researchMoveById(attacker.prevMoves[0]);
            } else {
                moves = attacker.moves;
            }
        } else {
            if (attacker.seenMoves == 4) {
                //moves = attacker.seenMoves;
                attacker.seenMoves.forEach(function(x) {
                    moves.push(util.researchMoveById(x));
                });
            } else if (preMoves !== undefined) {
                preMoves.forEach(function(x) {
                    moves.push(util.researchMoveById(x));
                });
            }

        }
        //console.log(moves);
        moves = moveLockCheck(moves);


        if (!Array.isArray(moves) || !moves.length) { console.log("ERROR in bestDamage, Skipping. moves:", moves); return [null, null]; }


        if (!attacker.types) {
            //                console.log("attacker: " + attacker.id + " has no types, attempting to fix.");
            util.researchPokemonById(attacker.id).types.forEach(function(x, i) {
                attacker.types[i] = x;
            });
        }

        if (!defender.types) {
            //                console.log("defender: " + defender.id + " has no types, attempting to fix.");
            util.researchPokemonById(defender.id).types.forEach(function(x, i) {
                defender.types[i] = x;
            });
        }

        /////////////////fake out//////////////////////////
        var useFakeOut = false;
        moves.some(function(x) {
            if (x.name == 'Fake Out' && attacker.prevMoves.length === 0 && defender.types.indexOf('Ghost') === -1 && !checkForAbility(defender.abilities, "Inner Focus") && !checkForAbility(defender.abilities, "Shield Dust")) {
                useFakeOut = true;
                highest = Damage.getDamageResult(attacker, defender, x)[0];
                move = x;
                return true;
            }
        });

        if (useFakeOut) {
            return [move, highest];
        }
        ///////////////////////////////////////////////////

        attacker.prioMoves = [];
        attacker.perfAcc = [];
        attacker.flawedAcc = [];

        moves.forEach(function(x) {
            var damage = Damage.getDamageResult(attacker, defender, x);

            if (x.priority !== undefined && x.priority > 0) {
                attacker.prioMoves.push([x, damage[0]]);
            }

            if (x.accuracy === true || x.accuracy == 100) {
                attacker.perfAcc.push([x, damage[0]]);
            } else {
                attacker.flawedAcc.push([x, damage[0]]);
            }


            if (damage[0] > highest && damage[0] > 0) {
                //                console.log("damage[0]: ", damage[0]);
                highest = damage[0];
                move = x;
            }
        });
        /*
                console.log("prioMoves: ", prioMoves);
                console.log("perfAcc: ", perfAcc);
                console.log("flawedAcc: ", flawedAcc);
        */

        if (attacker.boostedStats === undefined) {
            attacker.boostedStats = {};
            attacker.boostedStats.spe = 1;
            attacker.boostedStats.spe = getFinalSpeed(attacker, state.weather);
        }

        if (defender.boostedStats === undefined) {
            defender.boostedStats = {};
            defender.boostedStats.spe = 1;
            defender.boostedStats.spe = getFinalSpeed(defender, state.weather);
        }

        if (attacker.boostedStats.spe > defender.boostedStats.spe) {
            var bestOption;

            if (attacker.prioMoves !== undefined && attacker.prioMoves.length && defender.prioMoves !== undefined && defender.prioMoves.length) {
                attacker.prioMoves.forEach(function(x) {
                    if (x[1] > defender.hp) {
                        console.log(chalk.green(x[0].id, "will KO ", defender.id, " HP myRemaining: ", defender.hp));
                        bestOption = x;
                    }
                });
            }

            if (attacker.perfAcc.length && bestOption == null) {
                attacker.perfAcc.forEach(function(x) {
                    if (x[1] > defender.hp) {
                        console.log(chalk.green(x[0].id, "will KO ", defender.id, " HP myRemaining: ", defender.hp));
                        bestOption = x;
                    }
                });
            }

            if (attacker.flawedAcc.length && bestOption == null) {
                attacker.flawedAcc.forEach(function(x) {
                    if (x[1] > defender.hp) {
                        console.log(chalk.green(x[0].id, "will KO ", defender.id, " HP myRemaining: ", defender.hp));
                        bestOption = x;
                    }
                });
            }
            if (bestOption != null) {
                console.log(chalk.cyan("BEST OPTION: "), chalk.cyan(bestOption[0].id), chalk.cyan(bestOption[1]));
                return bestOption;
            }
        }

        return [move, highest];
    } catch (e) {
        console.log("Caught ERROR IN bestDamage(): ", e);
        console.dir(state);
    }
}

function checkForAbility(abilities, x) {
    if (abilities["0"] !== undefined && abilities["0"] === x)
        return true;

    if (abilities["1"] !== undefined && abilities["1"] === x)
        return true;

    if (abilities.H !== undefined && abilities.H === x)
        return true;
    return false;
}

function bestDefSwitch(state, my, opponent, preMoves) {

    console.log("opp ID: ", opponent.id);
    //console.log("Seen Opp Moves?: ", Array.isArray(opponent.seenMoves));
    console.log("opponent.seenMoves.length: ", opponent.seenMoves.length);
    /*
        if (opponent.seenMoves.length == 0) {
            console.log("No Best Switch Found");
            return [null, null];
        }*/

    var best = null;
    var minMaxDmg = 9999;
    var damage = [null, 0];

    my.forEach(function(x) {
        /*console.log("testing x.id: ", x.id, " vs ", opponent.id);
        console.log("testing premoves: ", preMoves);*/
        damage = bestDamage(state, opponent, x, preMoves);
        //        console.log(chalk.blue("--------------------------------"));
        //console.log("damage: ", damage);
        if (typeof damage !== undefined && damage[1] != null) {
            //console.log(damage);
            /*  if (damage[1] == 0) {
                  return null;
              } //non damaging move?}
              else {*/
            //console.log("damage:", damage);
            //                console.log("Testing Move:", damage[0].id);
            //                console.log(x.id, "estimate of damage taken: ", damage[1], " - from:", damage[0].id);
            if (best == null) {
                //                    console.log(x.id);
                best = x;
                minMaxDmg = damage[1];
            } else if (damage[1] < minMaxDmg) {
                best = x;
                minMaxDmg = damage[1];
            }
            //    }
        }
    });

    if (best != null) {
        //        console.log("best: ", best.id);
        return ([best, minMaxDmg]);
    } else {
        return [null, 0];
    }
}

function duelSim(state, my, opponent, preMoves) {

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