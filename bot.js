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
    try{
        return new Model.model(state);}
        catch(e){
            console.log("ERROR in async decide: ",e);
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
        return decide(state).then(function(model) {
try{
            if (model.myDefSwitch !== undefined && model.myDefSwitch[0] != null) {
                console.log("My Best Defensive Switch: ", model.myDefSwitch[0].id, "Max Damage Taken: ", model.myDefSwitch[1]);
                if (state.forceSwitch || state.teamPreview) {
                    if (model.myDefSwitch[0] != null) { return new SWITCH(model.myDefSwitch[0]); } else { return useRandom(state); }
                }
            }

            if (model.opponent.bestDamage !== undefined && model.opponent.bestDamage[0] !== undefined && model.opponent.bestDamage[0] != null) {
                console.log("Opponent's Best Damage Move: ", model.opponent.bestDamage[0].id, ": ", model.opponent.bestDamage[1]);
                //console.log("model.myDefSwitch[0]: ",model.myDefSwitch);
                if(model.myDefSwitch[1] && model.opponent.bestDamage[1] > model.myDefSwitch[1]*2){
                    { return new SWITCH(model.myDefSwitch[0]); }
                }
            }


            if (model.myBestDamage !== undefined && model.myBestDamage[0] != null) {
                console.log("My Best Damage Move: ", model.myBestDamage[0].id, ": ", model.myBestDamage[1]);
                return new MOVE(model.myBestDamage[0].id);
            }

            return useRandom(state);}
             catch (e) {console.log("ERROR in decide: ",e);}


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