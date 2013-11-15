/** @fileoverview
 * @description Satisefy expection
 */
var Class = require('js-class');

/** @class
 * @description State difference handling
 * The class defines a set of rules for handling
 * difference between current state and expected state
 */
var States = Class(process.EventEmitter, {
    constructor: function (initialState) {
        this._currentState = initialState;
    },

    get current () {
        return this._currentState;
    },

    get expectation () {
        return this._expectation;
    },

    set current (state) {
        if (this._currentState != state) {
            var previous = this._currentState;
            this._currentState = state;
            this.emit('state', state, previous, this);
            this._resolve();
        }
    },

    setExpectation: function (expectation) {
        if (this._expectation != expectation) {
            this._expectation = expectation;
            delete this._validStates;
            this._resolve();
            return true;
        }
        return false;
    },

    _resolve: function () {
        if (this._expectation == null) {
            return;
        }

        if (this._expectation == this._currentState) {
            this._clear();
            this.emit('done', this._currentState, this);
            return;
        }

        // if invalid state received, resolving fails
        if (this._validStates &&
            this._validStates.indexOf(this._currentState) < 0) {
            var err = new Error('Resolving failed');
            err.expectation = this._expectation;
            err.actual  = this._currentState;
            err.accepts = this._validStates;
            this._clear();
            this.emit('error', err, this);
            return;
        }

        var fn = this[this._currentState + ':' + this._expectation];
        if (typeof(fn) == 'function') {
            this._validStates = fn.call(this, this._expectation, this._currentState);
        }
    },

    _clear: function () {
        delete this._expectation;
        delete this._validStates;
    }
});

module.exports = States;
