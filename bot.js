const Model = require('./model.js');

/**
 * Terminator
 *
 */
const { MOVE, SWITCH } = require('leftovers-again/src/decisions');

function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Your code is pre-built with a very simple bot that chooses a team, then
 * picks randomly from valid moves on its turn.
 */
function useRandom(state) {
    console.error("SOMETHING WENT WRONG, MAKING A RANDOM MOVE");

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
    return new Model.model(state);
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
        return decide(state).then(function(model) {

            if (typeof model.myBestSwitch !== undefined && model.myBestSwitch[0] != null) {
                console.log("My Best Switch: ", model.myBestSwitch[0].id, "Max Damage Taken: ", model.myBestSwitch[1]);
                if (state.forceSwitch || state.teamPreview) {
                    if (model.myBestSwitch[0] != null) { return new SWITCH(model.myBestSwitch[0]); } else { return useRandom(state); }
                }
            }

            if (typeof model.oppBestDamage !== undefined && typeof model.oppBestDamage[0] !== undefined && model.oppBestDamage[0] != null) {
                console.log("Opponent's Best Damage Move: ", model.oppBestDamage[0].id, ": ", model.oppBestDamage[1]);
            }


            if (typeof model.myBestDamage !== undefined && model.myBestDamage[0] != null) {
                console.log("My Best Damage Move: ", model.myBestDamage[0].id, ": ", model.myBestDamage[1]);
                return new MOVE(model.myBestDamage[0].id);
            }

            return useRandom(state);


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