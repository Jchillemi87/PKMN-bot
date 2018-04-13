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
async function useRandom(state) {
    console.error("SOMETHING WENT WRONG, MAKING A RANDOM MOVE");

    console.log("state.forceSwitch: ", state.forceSwitch);
    console.log("state.teamPreview", state.teamPreview);
    try{
        if (state.forceSwitch || state.teamPreview) {
            // our pokemon died :(
            // choose a random one
            console.log("test");
            const possibleMons = state.self.reserve.filter((mon) => {
                if (mon.condition === '0 fnt') return false;
                if (mon.active) return false;
                if (mon.dead) return false;
                if (mon.disabled) return false;
                return true;
            });
    
            const myMon = pickOne(possibleMons);
            console.log("selecting a random switch");
            return new SWITCH(myMon);
        }
    } catch (e){console.log("error in useRandom: ",e);}
    // pick a random move
    try {
        const possibleMoves = state.self.active.moves.filter(move => move.disabled == false);
        const myMove = pickOne(possibleMoves);
        console.log("selecting a random move");
        console.log(myMove);
        return new MOVE(myMove);
    } catch (e) {
        console.log('broke when checking possible moves:', e);
        console.dir(state);
        return null;
    }
};

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
        return new Promise(function(resolve, reject) {
            Model.getData(state).then(function(){
                var model = new Model.model(state);
                model.print();

                try {
                    if (state.forceSwitch || state.teamPreview) {
                        if (model.myBestSwitch !== undefined) {
                            console.log("\nselecting my myBestSwitch[0]: ");
                            console.log(model.myBestSwitch[0].id);
                            console.log("Estimated minMax Damage: ");
                            console.log(model.myBestSwitch[1].id);
                            resolve(new SWITCH(model.myBestSwitch[0].id));
                        } else {
                        	console.log("GOT HERE");
                            resolve(useRandom(state));
                        }
                    } else {
                        if (model.opponentActive) {
                            console.log("\nselecting my myBestDamage[0]: ");
                            console.log(model.myBestDamage[0].id);
                            resolve(new MOVE(model.myBestDamage[0].id));
                        }
                    }
                } catch (e) {
                    console.log("error after getData: ", e);
                    return Promise.reject();
                }
            }).catch(useRandom(state))*/; /////////////**********************WHAT IF WE HAVE NO DAMAGING MOVES?**////////////////////////////////
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