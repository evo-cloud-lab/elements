/** @fileoverview
 * @description Satisefy expection
 */
var Class = require('js-class'),
    DelayedJob = require('./DelayedJob'),
    Errors     = require('./Errors');

/** @class
 * @description State difference handling
 * The class defines a set of rules for handling
 * difference between current state and expected state
 */
var States = Class(process.EventEmitter, {
    constructor: function (initialState) {
        this._currentState = initialState;
        this._resolveJob = new DelayedJob(this._resolveFn.bind(this));
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
        this._expectation != null && this._resolveJob.reschedule();
    },

    _resolveFn: function (done) {
        if (this._expectation == null) {
            done();
            return;
        }

        if (this._currentState == this._expectation) {
            this._clear();
            this.emit('done', this._currentState, this);
            done();
            return;
        }

        // if invalid state received, resolving fails
        if (this._validStates &&
            this._validStates.indexOf(this._currentState) < 0) {
            var err = Errors.badState(this._currentState, this._expectation, {
                accepts: this._validStates
            });
            this._clear();
            this.emit('error', err, this);
            done();
            return;
        }

        var fn = this[this._currentState + ':' + this._expectation];
        if (typeof(fn) == 'function') {
            if (fn.length > 2) {
                fn.call(this, this._expectation, this._currentState, function (err, states) {
                    if (err) {
                        this._clear();
                        this.emit('error', err, this);
                    } else {
                        this._validStates = states;
                        this._resolve();
                    }
                    done();
                }.bind(this));
            } else {
                this._validStates = fn.call(this, this._expectation, this._currentState);
                this._resolve();
                done();
            }
        }
    },

    _clear: function () {
        delete this._expectation;
        delete this._validStates;
    }
});

module.exports = States;
