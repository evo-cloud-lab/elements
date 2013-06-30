/** @fileoverview
 * The framework to define a state machine
 */

var Class = require('js-class');

// Internal wrapper class over state
var State = Class({
    constructor: function (name, state) {
        this.name = name;
        this.state = state;
        ['enter', 'leave', 'process'].forEach(function (method) {
            this[method] = typeof(state[method]) == 'function' ?
                function () {
                    state[method].apply(state, arguments);
                } : function () { };
        }, this);
        this.rules = [];
    },
        
    addCondition: function (condition) {
        if (this._rule) {
            throw new Error('Last rule incomplete');
        }
        var rule = { };
        if (typeof(condition) == 'string') {
            rule.filter = function (transition) {
                return transition == condition;
            };
        } else if (condition instanceof RegExp) {
            rule.filter = function (transition) {
                return transition.match(condition);
            }
        } else if (typeof(condition) == 'function') {
            rule.filter = condition;
        } else if (Array.isArray(condition)) {
            rule.filter = function (transition) {
                return condition.indexOf(transition) >= 0;
            }
        } else {
            throw new Error('Invalid condition');
        }
        this._rule = rule;
    },
    
    addTarget: function (target) {
        if (!this._rule) {
            throw new Error('Not defining a rule');
        }
        this._rule.target = target;
        this.rules.push(this._rule);
        delete this._rule;
    },
    
    applyTransition: function (transition) {
        var target;
        this.rules.some(function (rule) {
            var r = rule.filter(transition);
            r && (target = rule.target);
            return r;
        });
        return target;
    },
    
    complete: function () {
        if (this._rule) {
            throw new Error('Rule incomplete');
        }
    }
});
    
/** @class
 * @description Define a state machine and transits from states
 */
var StateMachine = Class(process.EventEmitter, {
    constructor: function () {
        this._states = {};
    },
    
    /** @function
     * @description Define a new state
     */
    state: function (name, state) {
        if (typeof(name) != 'string') {
            throw new Error('Invalid name ' + name);
        }
        if (!state) {
            throw new Error('State expected');
        }
        
        if (!this.initialState) {
            this.initialState = name;
        }
        if (this._define) {
            this._define.complete();
        }
        this._define = this._states[name] = new State(name, state);
        return this;
    },
    
    /** @function
     * @description Define a transition condition
     */
    when: function (condition) {
        this._def().addCondition(condition);
        return this;
    },
    
    /** @function
     * @description Default rule
     */
    fallback: function (stateName) {
        var def = this._def();
        def.addCondition(function () { return true; });
        def.addTarget(stateName);
        return this;
    },
    
    /** @function
     * @description Define a transition target
     */
    to: function (stateName) {
        this._def().addTarget(stateName);
        return this;
    },
    
    /** @function
     * @description Define a general error state
     */
    error: function (stateName) {
        this.errorState = stateName;
        return this;
    },
    
    /** @function
     * @description Declare the initial state
     */
    init: function (stateName) {
        this.initialState = stateName;
        return this;
    },

    /** @function
     * @description Get defined state by name
     */
    getState: function (stateName) {
        var state = this._states[stateName];
        return state && state.state;
    },
    
    /** @field
     * @description Get current state
     */
    get current() {
        return this._current && this._current.state;
    },

    /** @field
     * @description Get current state name
     */
    get currentName() {
        return this._current && this._current.name;        
    },
    
    /** @function
     * @description Start the state machine
     *
     * All the parameters will be passed as arguments of "enter".
     */
    start: function () {
        if (!this._define) {
            throw new Error('Already started');
        }
        this._define.complete();
        delete this._define;    // stop definition
        
        // create a wrapped init state
        var stateName = this.initialState;
        this._current = {
            applyTransition: function () { return stateName; },
            leave: function () { }
        };
        var args = [].slice.call(arguments);
        args.unshift('start');
        return this.transit.apply(this, args);
    },
    
    /** @function
     * @description Process in current state and apply transition when possible
     */
    process: function () {
        var current = this._currState();
        var args = [].slice.call(arguments);
        args.unshift(this.transit.bind(this));
        try {
            current.process.apply(current, args);
        } catch (err) {
            this.transit(err);
        }
        return this;
    },

    /** @function
     * @description Apply transition according to rules
     */
    transit: function () {
        var args = [].slice.call(arguments), asyncTransit = false;
        while (args) {
            var transition = args[0];
            if (!transition) {
                throw new Error('Invalid transition');
            } else if (transition instanceof Error) {    // fix arguments if it is an error
                transition = 'error';
                args.unshift(transition);
            }
            var current = this._currState();
            var stateName = current.applyTransition(transition);            
            if (!stateName && transition == 'error') {   // find the general error state
                stateName = this.errorState;
                if (!stateName) {                   // error path not defined
                    throw args[1];                  // this is the Error object
                }
            }
            if (!stateName) {                       // transition not found
                throw new Error('Undefined transition for ' + transition);
            }
            
            var nextState = this._state(stateName);
            current = this._current;
            current.leave(stateName);
            var nextArgs = args;
            args = undefined;       // clear args for auto-transition from "enter"
            nextArgs[0] = function () {
                if (asyncTransit) {
                    this.transit.apply(this, arguments);
                } else {            // if called synchronously, set args to continue loop
                    args = [].slice.call(arguments);
                }
            }.bind(this);
            this._current = nextState;
            nextState.enter.apply(nextState, nextArgs);
            this.emit('transit', current.name, nextState.name, this);
        }
        asyncTransit = true;
        return this;
    },
    
    _def: function () {
        if (!this._define) {
            throw new Error('Not defining a state');
        }
        return this._define;
    },
    
    _currState: function () {
        if (!this._current) {
            throw new Error('Not started');
        }
        return this._current;
    },
    
    _state: function (stateName) {
        var state = this._states[stateName];
        if (!state) {
            throw new Error('Invalid state ' + stateName);
        }
        return state;
    }
});

module.exports = StateMachine;