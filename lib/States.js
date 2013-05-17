var Class = require('./Class');

module.exports = Class({
    constructor: function (initialState) {
        this.transit(initialState);
    },
    
    transit: function (nextState) {
        if (typeof(nextState) == 'function') {
            nextState = nextState();
        }
        while (nextState !== this.state) {
            var prevState = this.state;
            if (prevState && typeof(prevState.leave) == 'function') {
                prevState.leave(nextState, this);
            }
            this.state = nextState;
            if (nextState && typeof(nextState.enter) == 'function') {
                nextState = nextState.enter(prevState, this);
            }
        }
        return this;
    },
    
    from: function (currState) {
        return this.state === currState ? this : Object.create({
            transit: function () { return this; },
            from: function () { return this; }
        });
    }
});