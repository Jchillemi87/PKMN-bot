const AI = require('@la/ai');
const { MOVE, SWITCH } = require('@la/decisions');
//const Team = require('@la/team');
/**
 * Terminator
 *
 */
const Model = require('./model.js');
const chalk = require('chalk');

const rt = require('./../../Pokemon-Showdown/data/random-teams.js');
const RT = new rt;

var initTeam = RT.randomSet(RT.getTemplate("charizard"));
console.log(initTeam);

function toSmogon(pkmn){
    if(pkmn.nature === undefined){
        pkmn.nature = "Hardy";
    }
    var buf = pkmn.name;
    buf+= " @ " + pkmn.item + '\n';
    buf+= "Ability: " + pkmn.ability + '\n';
    buf+= "Level: " + pkmn.level + '\n';
    buf+= "EVs: " + pkmn.evs.hp + " HP | " + pkmn.evs.atk + " Atk | " + pkmn.evs.def + " Def | " + pkmn.evs.spa + " SpA | " + pkmn.evs.spd + " SpD | " + pkmn.evs.spe + " Spe \n";
    buf+= pkmn.nature + " Nature \n";
    pkmn.moves.forEach(function(x){
        buf+= "- " + x + " \n"
    });
    return buf;
}

console.log(toSmogon(initTeam));

function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Your code is pre-built with a very simple bot that chooses a team, then
 * picks randomly from valid moves on its turn.
 */
function useRandom(state) {
    console.error(chalk.red("SOMETHING WENT WRONG, MAKING A RANDOM MOVE"));

    if (state.forceSwitch || state.teamPreview) {
        // our pokemon died :(
        // choose a random one
        const possibleMons = state.self.reserve.filter((mon) => {
            if (mon.condition === '0 fnt') return false;
            if (mon.active) return false;
            return true;
        });
        const myMon = pickOne(possibleMons);
        return new SWITCH(myMon);
    }
    // pick a random move
    try {
        const possibleMoves = state.self.active.moves.filter(move => !move.disabled);
        const myMove = pickOne(possibleMoves);
        return new MOVE(myMove);
    } catch (e) {
        console.log('broke when checking possible moves:', e);
        console.dir(state);
        return null;
    }
};


async function decide(state) {
    try {
        return new Model.model(state);
    } catch (e) {
        console.log("ERROR in async decide: ", e);
    }
}

class Terminator extends AI {
    /**
     * Here's the main loop of your bot. `state` contains everything about the
     * current state of the game. Please read the documentation for more
     * details.
     *
     * @param  {Object} state The current state of the game.
     *
     * @return {Decision}     A decision object.
     */
    constructor() {
        super();
        this.ctr = -1;
    }

    team() {
        return toSmogon(initTeam);
    }

    decide(state) {
        return decide(state).then(function(model) {
            try {
                console.log("getData: ", model.getData(state));
                console.log("\n");
                if (model.myOffSwitch !== undefined && model.myOffSwitch != null) {
                    console.log(chalk.green("My Best Offensive Switch: "), model.myOffSwitch.id, "Max Damage Done: ", model.myOffSwitch.maxDmg)[0];
                }
                if (state.forceSwitch || state.teamPreview) {
                    if (model.myOffSwitch !== undefined && model.myOffSwitch != null) {
                        console.log(chalk.green("My Best Offensive Switch: "), model.myOffSwitch.id, "Max Damage Done: ", model.myOffSwitch.maxDmg[0]);
                        return new SWITCH(model.myOffSwitch);
                    } else if (model.myDefSwitch !== undefined && model.myDefSwitch.minMaxDmg != null) {
                        console.log("My Best Defensive Switch: ", model.myDefSwitch.id, "Max Damage Taken: ", model.myDefSwitch.minMaxDmg[15]);
                        return new SWITCH(model.myDefSwitch);
                    } else {
                        console.log(chalk.green("BUG?"));
                        return useRandom(state);
                    }
                }

                if (model.myActive.bestDamage !== undefined && model.myActive.bestDamage != null && model.myActive.bestDamage.totalDamage[0] <= model.opponentActive.hp) {
                    if (model.opponentActive.bestDamage !== undefined && model.opponentActive.bestDamage !== undefined && model.opponentActive.bestDamage != null) {
                        console.log("Opponent's Best Damage Move: ", model.opponentActive.bestDamage.id, ": ", model.opponentActive.bestDamage.totalDamage[15]);
                        if (model.myDefSwitch !== undefined && model.myDefSwitch != null && model.myDefSwitch.minMaxDmg[15] && model.opponentActive.bestDamage.totalDamage[0] > model.myDefSwitch.minMaxDmg[15] * 2) {
                            console.log("model.myDefSwitch: ", model.myDefSwitch.id, ": ", model.myDefSwitch.minMaxDmg[15]);
                            return new SWITCH(model.myDefSwitch);
                        }
                    }
                }


                if (model.myActive.bestDamage.id !== undefined && model.myActive.bestDamage != null) {
                    console.log("My Best Damage Move: ", model.myActive.bestDamage.id, ": ", model.myActive.bestDamage.totalDamage[0]);
                    return new MOVE(model.myActive.bestDamage.id);
                }

                return useRandom(state);
            } catch (e) { console.log("ERROR in decide: ", e); }


        }).catch(function(e) {
            console.log("ERROR: ", e);
        });
    }
}

module.exports = Terminator;

/*
var promise1 = new Promise(function(res, re) {
    res('Success!');
    re('TEST');
    throw ('throw');
});

promise1.then(function(value) {
    console.log(value);
    // expected output: "Success!"
}, function(value) {
    console.log(value);
}).catch(function(value) {
    console.log(value);
    // expected output: "Success!"
});*/