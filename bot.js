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
        var model = new Model.model(state);
        if (state.forceSwitch || state.teamPreview) {
            // our pokemon died :(
            // choose a random one
            const possibleMons = state.self.reserve.filter((mon) => {
                if (mon.condition === '0 fnt') return false;
                if (mon.active) return false;
                return true;
            });
            const myMon = this.pickOne(possibleMons);
            return new SWITCH(myMon);
        }
        // pick a random move
        try {
            return new MOVE(model.myBestDamage[0].id);
        } catch (e) {
            const possibleMoves = state.self.active.moves.filter(move => !move.disabled);
            const myMove = this.pickOne(possibleMoves);
            console.log('broke when checking possible moves:', e);
            console.dir(state);
            return null;
        }
    }

    pickOne(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
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