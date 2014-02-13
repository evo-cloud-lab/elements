var assert = require('assert'),
    Class  = require('js-class'),
    Try    = require('../lib/Try'),

    States = require('..').States;

describe('States', function () {
    var TestStates = Class(States, {
        constructor: function () {
            States.prototype.constructor.apply(this, arguments);
        },

        'init:state1': function () {
            this.transit('state1');
            return ['state1'];
        },

        'init:state2': function () {
            this.transit('state1');
            return ['state1', 'state2'];
        },

        'state1:state2': function () {
            this.transit('state2');
            return ['state2'];
        },

        transit: function (nextState) {
            process.nextTick(function () {
                this._transit(nextState);
            }.bind(this));
        },

        _transit: function (nextState) {
            this.current = nextState;
        }
    });

    it('simple transition', function (done) {
        var s = new TestStates('init');
        var transits = [];
        s._transit = function (nextState) {
            transits.push(nextState);
            s.current = nextState;
        };
        s.on('done', function () {
            Try.final(function () {
                assert.equal(s.current, 'state1');
                assert.deepEqual(transits, ['state1']);
                assert.equal(s.expectation, null);
            }, done);
        }).setExpectation('state1');
        assert.equal(s.expectation, 'state1');
    });

    it('indirect transition', function (done) {
        var s = new TestStates('init');
        var transits = [];
        s._transit = function (nextState) {
            transits.push(nextState);
            s.current = nextState;
        };
        s.on('done', function () {
            Try.final(function () {
                assert.equal(s.current, 'state2');
                assert.deepEqual(transits, ['state1', 'state2']);
                assert.equal(s.expectation, null);
            }, done);
        }).setExpectation('state2');
        assert.equal(s.expectation, 'state2');
    });

    it('transition failure', function (done) {
        var s = new TestStates('init');
        var transits = [];
        s._transit = function (nextState) {
            if (nextState == 'state2') {
                nextState = 'init';
            }
            transits.push(nextState);
            s.current = nextState;
        };
        s.on('error', function (err) {
            Try.final(function () {
                assert.equal(err.expectation, 'state2');
                assert.equal(err.actual, 'init');
                assert.deepEqual(err.accepts, ['state2']);
                assert.equal(s.current, 'init');
                assert.equal(s.expectation, null);
            }, done);
        }).setExpectation('state2');
        assert.equal(s.expectation, 'state2');
    });

    describe('resolve once', function () {
        var s, transits;

        function multiExpectations(done) {
            s.on('done', function () {
                Try.final(function () {
                    assert.equal(s.current, 'state1');
                    assert.deepEqual(transits, ['state1']);
                    assert.equal(s.expectation, null);
                }, done);
            });
            s.setExpectation('state1');
            s.setExpectation('state2');
            s.setExpectation('state1');
            assert.equal(s.expectation, 'state1');
        }

        function multiStates(done) {
            s.on('done', function () {
                Try.final(function () {
                    assert.equal(s.current, 'state2');
                    assert.deepEqual(transits, ['state2']);
                    assert.equal(s.expectation, null);
                }, done);
            });
            s.setExpectation('state2');
            s.current = 'state1';
            s.current = 'state2';
            s.current = 'init';
            s.current = 'state1';
        }

        describe('async transit', function () {
            beforeEach(function () {
                s = new TestStates('init');
                transits = [];
                s._transit = function (nextState) {
                    transits.push(nextState);
                    s.current = nextState;
                };
            });

            it ('set expectations multiple times', multiExpectations);
            it ('set states multiple times', multiStates);
        });

        describe('sync transit', function () {
            beforeEach(function () {
                s = new TestStates('init');
                transits = [];
                s.transit = function (nextState) {
                    transits.push(nextState);
                    s.current = nextState;
                };
            });

            it ('set expectations multiple times', multiExpectations);
            it ('set states multiple times', multiStates);
        });
    });
});
